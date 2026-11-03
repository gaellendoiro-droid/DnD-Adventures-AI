import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import path from 'path';
import fs from 'fs';
import { log } from '@/lib/logger';

interface CacheSchema {
    uris: Record<string, string>;
    names: Record<string, string>;
    lastValidated?: string;
}

export class RulebookManager {
    private static CACHE_PATH = path.join(process.cwd(), 'knowledge', 'file-api-cache.json');
    private static SOURCE_DIR = path.join(process.cwd(), 'knowledge', 'source_books');
    
    // Semáforo de concurrencia simple para evitar subir el mismo archivo en paralelo
    private static uploadPromises: Record<string, Promise<string> | null> = {};

    // Mapeo de archivos locales requeridos y su nombre de visualización
    private static REQUIRED_MANUALS: Record<string, string> = {
        'Manual_Jugador.pdf': 'Manual del Jugador D&D 5e',
        'Manual_Monstruos_part1.pdf': 'Manual de Monstruos Parte 1',
        'Manual_Monstruos_part2.pdf': 'Manual de Monstruos Parte 2'
    };

    // URIs predeterminadas de fallback histórico (por si no hay archivos locales)
    private static DEFAULT_URIS: Record<string, string> = {
        'Manual_Jugador.pdf': 'https://generativelanguage.googleapis.com/v1beta/files/7ji2goimrnvb',
        'Manual_Monstruos_part1.pdf': 'https://generativelanguage.googleapis.com/v1beta/files/41odl5mikhz8',
        'Manual_Monstruos_part2.pdf': 'https://generativelanguage.googleapis.com/v1beta/files/re3mt0rgvvi6'
    };

    /**
     * Carga la caché de archivos desde disco.
     */
    private static loadCache(): CacheSchema {
        try {
            if (fs.existsSync(this.CACHE_PATH)) {
                const content = fs.readFileSync(this.CACHE_PATH, 'utf-8');
                return JSON.parse(content);
            }
        } catch (error) {
            log.error('Error al cargar caché de manuales', { module: 'RulebookManager' }, error instanceof Error ? error : new Error(String(error)));
        }
        return { uris: {}, names: {} };
    }

    /**
     * Guarda la caché de archivos en disco.
     */
    private static saveCache(cache: CacheSchema): void {
        try {
            const dir = path.dirname(this.CACHE_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
        } catch (error) {
            log.error('Error al guardar caché de manuales', { module: 'RulebookManager' }, error instanceof Error ? error : new Error(String(error)));
        }
    }

    /**
     * Extrae el ID del archivo a partir de su URI de la File API.
     * Ejemplo: https://generativelanguage.googleapis.com/v1beta/files/7ji2goimrnvb -> files/7ji2goimrnvb
     */
    private static getFileNameFromUri(uri: string): string {
        const fileId = uri.substring(uri.lastIndexOf('/') + 1);
        return `files/${fileId}`;
    }

    /**
     * Valida si un archivo sigue existiendo y está activo en la File API.
     */
    private static async validateFile(fileManager: GoogleAIFileManager, fileName: string): Promise<boolean> {
        try {
            const file = await fileManager.getFile(fileName);
            return file.state === FileState.ACTIVE;
        } catch (error: any) {
            // Un error 404 o 403 indica que el archivo no existe o ha expirado
            log.warn(`Archivo no disponible en File API: ${fileName}`, { 
                module: 'RulebookManager', 
                status: error.status, 
                message: error.message 
            });
            return false;
        }
    }

    /**
     * Inicia el proceso de subida de un manual en PDF a la File API.
     */
    private static async uploadManual(fileManager: GoogleAIFileManager, filename: string, displayName: string): Promise<string> {
        // Si ya hay un proceso de subida en marcha para este archivo, devolver su promesa
        if (this.uploadPromises[filename]) {
            log.info(`Esperando subida en curso para: ${filename}`, { module: 'RulebookManager' });
            return this.uploadPromises[filename]!;
        }

        const filePath = path.join(this.SOURCE_DIR, filename);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Archivo manual local no encontrado: ${filePath}`);
        }

        const uploadPromise = (async () => {
            log.info(`Iniciando subida automática a Gemini File API: ${filename}`, { module: 'RulebookManager' });
            
            const uploadResult = await fileManager.uploadFile(filePath, {
                mimeType: 'application/pdf',
                displayName: displayName
            });

            const fileIdName = uploadResult.file.name; // files/xxxx
            const fileUri = uploadResult.file.uri;

            log.info(`Subida iniciada para ${filename}. Esperando procesamiento de Gemini...`, { 
                module: 'RulebookManager', 
                uri: fileUri 
            });

            // Esperar a que pase de PROCESSING a ACTIVE
            let file = await fileManager.getFile(fileIdName);
            let attempts = 0;
            while (file.state === FileState.PROCESSING && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                file = await fileManager.getFile(fileIdName);
                attempts++;
            }

            if (file.state === FileState.FAILED) {
                throw new Error(`El procesamiento del archivo falló en la API de Google: ${filename}`);
            }

            log.info(`Manual procesado y activo: ${filename}`, { module: 'RulebookManager', uri: fileUri });
            return fileUri;
        })();

        this.uploadPromises[filename] = uploadPromise;

        try {
            const uri = await uploadPromise;
            return uri;
        } finally {
            this.uploadPromises[filename] = null;
        }
    }

    /**
     * Obtiene las URIs activas y válidas de todos los manuales requeridos.
     * Si alguna ha caducado, la resube automáticamente en segundo plano.
     */
    public static async getOrUploadManuals(apiKey: string): Promise<string[]> {
        const fileManager = new GoogleAIFileManager(apiKey);
        const cache = this.loadCache();
        const activeUris: string[] = [];
        let cacheUpdated = false;

        log.info('Validando estado de la Biblioteca Arcana...', { module: 'RulebookManager' });

        for (const [filename, displayName] of Object.entries(this.REQUIRED_MANUALS)) {
            // 1. Intentar obtener de la variable de entorno o caché
            let currentUri = process.env.GOOGLE_GENAI_MANUAL_URI?.split(',')
                .map(u => u.trim())
                .find(u => u.includes(filename)) 
                || cache.uris[filename] 
                || this.DEFAULT_URIS[filename];

            let currentName = cache.names[filename] || this.getFileNameFromUri(currentUri);
            let isValid = false;

            // 2. Validar accesibilidad del archivo
            if (currentUri) {
                isValid = await this.validateFile(fileManager, currentName);
            }

            // 3. Si no es válido, intentar subir el archivo local
            if (!isValid) {
                try {
                    log.warn(`URI caducada o inaccesible para ${filename}. Procediendo a resubida automática...`, { 
                        module: 'RulebookManager' 
                    });
                    const newUri = await this.uploadManual(fileManager, filename, displayName);
                    
                    cache.uris[filename] = newUri;
                    cache.names[filename] = this.getFileNameFromUri(newUri);
                    currentUri = newUri;
                    cacheUpdated = true;
                } catch (uploadError: any) {
                    log.error(`Fallo crítico al resubir manual ${filename}`, { module: 'RulebookManager' }, uploadError);
                    // Fallback al URI predeterminado histórico como último recurso
                    if (!currentUri) {
                        currentUri = this.DEFAULT_URIS[filename];
                    }
                }
            }

            if (currentUri) {
                activeUris.push(currentUri);
            }
        }

        // Guardar caché si ha habido cambios
        if (cacheUpdated) {
            cache.lastValidated = new Date().toISOString();
            this.saveCache(cache);
        }

        log.info(`Biblioteca Arcana lista con ${activeUris.length} volúmenes activos.`, { 
            module: 'RulebookManager',
            uris: activeUris 
        });

        return activeUris;
    }
}
