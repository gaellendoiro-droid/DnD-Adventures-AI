import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { log } from '@/lib/logger';

interface TTSCacheConfig {
    text: string;
    voiceId: string;
    modelId?: string;
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
}

interface TTSCacheEntry {
    audioDataUri: string;
    createdAt: number;
    lastAccessed: number;
    size: number;
}

interface TTSCacheStats {
    hits: number;
    misses: number;
    memoryEntries: number;
    diskEntries: number;
    totalSize: number;
}

class TTSCache {
    private memoryCache: Map<string, TTSCacheEntry>;
    private cacheDir: string;
    private maxMemoryEntries: number = 50;
    private maxDiskSize: number = 100 * 1024 * 1024; // 100MB
    private stats: TTSCacheStats = {
        hits: 0,
        misses: 0,
        memoryEntries: 0,
        diskEntries: 0,
        totalSize: 0
    };
    private initialized: boolean = false;

    constructor() {
        this.memoryCache = new Map();
        this.cacheDir = path.join(process.cwd(), 'node_modules', '.cache', 'tts');
    }

    private async init() {
        if (this.initialized) return;
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
            this.initialized = true;
        } catch (error) {
            log.error('Error inicializando directorio de caché TTS', { error });
        }
    }

    private generateKey(config: TTSCacheConfig): string {
        const normalizedText = config.text.trim().toLowerCase();
        const dataToHash = JSON.stringify({
            text: normalizedText,
            voiceId: config.voiceId,
            modelId: config.modelId,
            stability: config.stability,
            similarityBoost: config.similarityBoost,
            style: config.style,
            useSpeakerBoost: config.useSpeakerBoost
        });
        return crypto.createHash('sha256').update(dataToHash).digest('hex');
    }

    async get(config: TTSCacheConfig): Promise<string | null> {
        await this.init();
        const key = this.generateKey(config);

        // 1. Check Memory
        if (this.memoryCache.has(key)) {
            const entry = this.memoryCache.get(key)!;
            entry.lastAccessed = Date.now();
            // Re-insert to update LRU position (Map preserves insertion order)
            this.memoryCache.delete(key);
            this.memoryCache.set(key, entry);

            this.stats.hits++;
            log.debug('TTS Cache Hit (Memory)', { key: key.substring(0, 8) });
            return entry.audioDataUri;
        }

        // 2. Check Disk
        const filePath = path.join(this.cacheDir, `${key}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const entry: TTSCacheEntry = JSON.parse(data);

            // Update stats and memory cache
            entry.lastAccessed = Date.now();
            this.addToMemory(key, entry);

            // Update disk timestamp asynchronously
            this.saveToDisk(key, entry).catch(err =>
                log.warn('Error actualizando timestamp en disco', { key, error: err })
            );

            this.stats.hits++;
            log.debug('TTS Cache Hit (Disk)', { key: key.substring(0, 8) });
            return entry.audioDataUri;
        } catch (error) {
            // File not found or corrupt
            this.stats.misses++;
            return null;
        }
    }

    async set(config: TTSCacheConfig, audioDataUri: string): Promise<void> {
        await this.init();
        const key = this.generateKey(config);
        const size = Buffer.byteLength(audioDataUri);

        const entry: TTSCacheEntry = {
            audioDataUri,
            createdAt: Date.now(),
            lastAccessed: Date.now(),
            size
        };

        this.addToMemory(key, entry);
        await this.saveToDisk(key, entry);
        await this.pruneDisk();
    }

    private addToMemory(key: string, entry: TTSCacheEntry) {
        if (this.memoryCache.size >= this.maxMemoryEntries) {
            const firstKey = this.memoryCache.keys().next().value;
            if (firstKey) this.memoryCache.delete(firstKey);
        }
        this.memoryCache.set(key, entry);
        this.stats.memoryEntries = this.memoryCache.size;
    }

    private async saveToDisk(key: string, entry: TTSCacheEntry) {
        const filePath = path.join(this.cacheDir, `${key}.json`);
        try {
            await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
        } catch (error) {
            log.error('Error escribiendo en caché TTS', { key, error });
        }
    }

    private async pruneDisk() {
        // Implementación simple de limpieza basada en tamaño total
        // En una implementación real, esto debería ser más robusto y quizás ejecutarse periódicamente
        // en lugar de en cada escritura para no bloquear.
        // Por ahora, dejaremos que el sistema operativo maneje el espacio o implementaremos
        // una limpieza básica si el directorio crece demasiado.
    }

    getStats(): TTSCacheStats {
        return {
            ...this.stats,
            diskEntries: 0, // Implementar conteo real si es necesario
            totalSize: 0 // Implementar cálculo real si es necesario
        };
    }
}

export const ttsCache = new TTSCache();
