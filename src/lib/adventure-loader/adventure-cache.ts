
import { ParsedAdventure } from './adventure-parser';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface CacheEntry {
    data: ParsedAdventure;
    hash: string;
    timestamp: number;
}

export class AdventureCache {
    // Singleton instance
    private static instance: AdventureCache;

    private cache: Map<string, CacheEntry> = new Map();
    private pendingParses: Map<string, Promise<ParsedAdventure>> = new Map();
    private cacheDir: string;

    private constructor() {
        // Use a persistent cache directory
        // Try node_modules/.cache first, fallback to tmp
        const projectRoot = process.cwd();
        const nodeModulesCache = path.join(projectRoot, 'node_modules', '.cache', 'dnd-adventures');

        try {
            if (!fs.existsSync(nodeModulesCache)) {
                fs.mkdirSync(nodeModulesCache, { recursive: true });
            }
            this.cacheDir = nodeModulesCache;
        } catch (e) {
            // Fallback to temp dir if we can't write to node_modules
            this.cacheDir = path.join(os.tmpdir(), 'dnd-adventures-cache');
            if (!fs.existsSync(this.cacheDir)) {
                fs.mkdirSync(this.cacheDir, { recursive: true });
            }
        }
    }

    public static getInstance(): AdventureCache {
        if (!AdventureCache.instance) {
            AdventureCache.instance = new AdventureCache();
        }
        return AdventureCache.instance;
    }

    // Generar hash del contenido JSON
    generateHash(jsonContent: string): string {
        return crypto.createHash('sha256').update(jsonContent).digest('hex');
    }

    // Generar clave de caché
    private getCacheKey(hash: string): string {
        return `adventure:${hash}`;
    }

    private getFilePath(hash: string): string {
        return path.join(this.cacheDir, `${hash}.json`);
    }

    // Obtener del caché
    get(hash: string): ParsedAdventure | null {
        const key = this.getCacheKey(hash);

        // 1. Check Memory Cache
        const entry = this.cache.get(key);
        if (entry) {
            // Verificar expiración (1 hora)
            const maxAge = 3600000; // 1 hora
            if (Date.now() - entry.timestamp <= maxAge) {
                return entry.data;
            }
            this.cache.delete(key);
        }

        // 2. Check File System Cache
        try {
            const filePath = this.getFilePath(hash);
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const diskEntry: CacheEntry = JSON.parse(fileContent);

                // Check expiration for disk cache too (maybe longer? let's keep it same for now)
                const maxAge = 3600000 * 24; // 24 hours for disk cache
                if (Date.now() - diskEntry.timestamp <= maxAge) {
                    // Rehydrate memory cache
                    this.cache.set(key, diskEntry);
                    return diskEntry.data;
                } else {
                    // Clean up expired file
                    fs.unlinkSync(filePath);
                }
            }
        } catch (error) {
            console.warn(`Failed to read cache file for hash ${hash}:`, error);
        }

        return null;
    }

    // Guardar en caché
    set(hash: string, data: ParsedAdventure): void {
        const key = this.getCacheKey(hash);
        const entry: CacheEntry = {
            data,
            hash,
            timestamp: Date.now(),
        };

        // 1. Save to Memory
        this.cache.set(key, entry);

        // 2. Save to Disk
        try {
            const filePath = this.getFilePath(hash);
            fs.writeFileSync(filePath, JSON.stringify(entry), 'utf-8');
        } catch (error) {
            console.warn(`Failed to write cache file for hash ${hash}:`, error);
        }
    }

    // Limpiar caché expirado
    clearExpired(maxAge: number = 3600000): void {
        const now = Date.now();

        // Clear Memory
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > maxAge) {
                this.cache.delete(key);
            }
        }

        // Clear Disk (Optional, maybe run periodically)
        try {
            const files = fs.readdirSync(this.cacheDir);
            for (const file of files) {
                if (!file.endsWith('.json')) continue;

                const filePath = path.join(this.cacheDir, file);
                try {
                    const stats = fs.statSync(filePath);
                    // If file is older than 24 hours (using mtime as proxy for simplicity)
                    if (now - stats.mtimeMs > 3600000 * 24) {
                        fs.unlinkSync(filePath);
                    }
                } catch (e) {
                    // Ignore errors for individual files
                }
            }
        } catch (e) {
            console.warn('Failed to clear expired disk cache:', e);
        }
    }

    // Verificar si hay parseo pendiente
    getPending(hash: string): Promise<ParsedAdventure> | null {
        const key = this.getCacheKey(hash);
        return this.pendingParses.get(key) || null;
    }

    // Registrar parseo pendiente
    setPending(hash: string, promise: Promise<ParsedAdventure>): void {
        const key = this.getCacheKey(hash);
        this.pendingParses.set(key, promise);
        promise.finally(() => {
            this.pendingParses.delete(key);
        });
    }

    // --- Active Adventure Persistence ---

    private getActiveAdventureFilePath(): string {
        return path.join(this.cacheDir, 'active_adventure_data.json');
    }

    saveActiveAdventure(data: any): void {
        try {
            const filePath = this.getActiveAdventureFilePath();
            fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
        } catch (error) {
            console.warn('Failed to save active adventure data:', error);
        }
    }

    loadActiveAdventure(): any | null {
        try {
            const filePath = this.getActiveAdventureFilePath();
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                return JSON.parse(content);
            }
        } catch (error) {
            console.warn('Failed to load active adventure data:', error);
        }
        return null;
    }
}

export const adventureCache = AdventureCache.getInstance();
