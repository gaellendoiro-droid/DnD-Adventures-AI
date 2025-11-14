/**
 * @fileOverview Monster Stats Parser
 * Handles parsing and fetching of monster statistics from D&D 5e API.
 * Provides caching functionality to optimize repeated requests.
 * 
 * This module is part of the Fase 1.2 refactorization.
 */

import { log } from '@/lib/logger';

/**
 * Normalizes a Spanish monster name to English for D&D API lookup.
 * Removes accents, converts to lowercase, and maps common Spanish names to English.
 * 
 * @param name Monster name in Spanish
 * @returns Normalized English name for API lookup
 */
export function normalizeMonsterName(name: string): string {
    // Remove accents and convert to lowercase
    let normalized = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .trim();
    
    // Common Spanish to English mappings for monsters
    const spanishToEnglishMap: Record<string, string> = {
        'mantícora': 'manticore',
        'manticora': 'manticore',
        'orco': 'orc',
        'goblin': 'goblin',
        'dragón': 'dragon',
        'dragon': 'dragon',
        'troll': 'troll',
        'ogro': 'ogre',
        'zombi': 'zombie',
        'zombie': 'zombie',
        'esqueleto': 'skeleton',
        'vampiro': 'vampire',
    };
    
    // Check if we have a direct mapping
    if (spanishToEnglishMap[normalized]) {
        return spanishToEnglishMap[normalized];
    }
    
    // Try to find a partial match
    for (const [spanish, english] of Object.entries(spanishToEnglishMap)) {
        if (normalized.includes(spanish) || spanish.includes(normalized)) {
            return english;
        }
    }
    
    // If no mapping found, return the normalized query (without accents)
    return normalized;
}

/**
 * Parses hit_points from D&D API format (e.g., "7d8+14" or 45) to a number.
 * If it's a dice notation, calculates the average (rounded down).
 * 
 * @param hitPoints HP value from D&D API (can be number or dice notation string)
 * @returns Calculated HP as a number
 */
export function parseHitPoints(hitPoints: any): number {
    if (typeof hitPoints === 'number') {
        return hitPoints;
    }
    
    if (typeof hitPoints === 'string') {
        // Try to parse dice notation like "7d8+14"
        const diceMatch = hitPoints.match(/(\d+)d(\d+)([+-]\d+)?/);
        if (diceMatch) {
            const diceCount = parseInt(diceMatch[1], 10);
            const diceSize = parseInt(diceMatch[2], 10);
            const modifier = diceMatch[3] ? parseInt(diceMatch[3], 10) : 0;
            // Calculate average: (diceCount * (diceSize + 1) / 2) + modifier
            const average = Math.floor((diceCount * (diceSize + 1)) / 2) + modifier;
            return average;
        }
        
        // Try to parse as plain number
        const num = parseInt(hitPoints, 10);
        if (!isNaN(num)) {
            return num;
        }
    }
    
    // Default fallback
    return 10;
}

/**
 * Parses armor_class from D&D API format (can be number or array of objects).
 * 
 * @param armorClass AC value from D&D API (can be number, array, or object)
 * @returns Parsed AC as a number
 */
export function parseArmorClass(armorClass: any): number {
    if (typeof armorClass === 'number') {
        return armorClass;
    }
    
    if (Array.isArray(armorClass) && armorClass.length > 0) {
        // If it's an array, take the first value (usually the base AC)
        const first = armorClass[0];
        if (typeof first === 'number') {
            return first;
        }
        if (typeof first === 'object' && first.value !== undefined) {
            return typeof first.value === 'number' ? first.value : 10;
        }
    }
    
    // Default fallback
    return 10;
}

// Cache for monster stats to avoid repeated API calls
const monsterStatsCache: Map<string, { hp: number; ac: number }> = new Map();

// Cache for pending promises to avoid duplicate simultaneous calls
const pendingRequests: Map<string, Promise<{ hp: number; ac: number } | null>> = new Map();

/**
 * Fetches monster stats (HP and AC) from the D&D 5e API.
 * Uses a cache to avoid repeated calls for the same monster.
 * Also uses a pending requests cache to avoid duplicate simultaneous calls.
 * Returns null if the monster is not found or if there's an error.
 * 
 * @param monsterName Name of the monster to fetch stats for
 * @returns Object with hp and ac properties, or null if not found
 */
export async function getMonsterStatsFromDndApi(monsterName: string): Promise<{ hp: number; ac: number } | null> {
    // Check cache first
    const cacheKey = normalizeMonsterName(monsterName).toLowerCase();
    if (monsterStatsCache.has(cacheKey)) {
        const cached = monsterStatsCache.get(cacheKey)!;
        log.debug('Monster stats retrieved from cache', {
            module: 'MonsterStatsParser',
            monsterName,
            hp: cached.hp,
            ac: cached.ac,
        });
        return cached;
    }
    
    // Check if there's already a pending request for this monster
    if (pendingRequests.has(cacheKey)) {
        log.debug('Waiting for pending request for monster stats', {
            module: 'MonsterStatsParser',
            monsterName,
        });
        return await pendingRequests.get(cacheKey)!;
    }
    
    // Create a new request and cache the promise
    const requestPromise = (async () => {
        const baseUrl = 'https://www.dnd5eapi.co/api';
        const normalizedName = normalizeMonsterName(monsterName);
        const formattedName = normalizedName.toLowerCase().replace(/\s+/g, '-');
        
        try {
            log.debug('Fetching monster stats from D&D API', {
                module: 'MonsterStatsParser',
                originalName: monsterName,
                normalizedName,
                formattedName,
            });
            
            const response = await fetch(`${baseUrl}/monsters/${formattedName}`, {
                headers: { 'Accept': 'application/json' },
            });
            
            if (!response.ok) {
                log.warn('Monster not found in D&D API', {
                    module: 'MonsterStatsParser',
                    monsterName,
                    statusCode: response.status,
                });
                
                // Cache the failure to avoid repeated requests
                monsterStatsCache.set(cacheKey, { hp: 10, ac: 10 }); // Default values
                pendingRequests.delete(cacheKey);
                return { hp: 10, ac: 10 }; // Return defaults instead of null
            }
            
            const data = await response.json();
            
            // Parse HP
            const hp = parseHitPoints(data.hit_points);
            
            // Parse AC
            const ac = parseArmorClass(data.armor_class);
            
            const stats = { hp, ac };
            
            // Cache the result
            monsterStatsCache.set(cacheKey, stats);
            
            log.debug('Monster stats fetched successfully', {
                module: 'MonsterStatsParser',
                monsterName,
                hp,
                ac,
            });
            
            // Clean up pending requests
            pendingRequests.delete(cacheKey);
            
            return stats;
        } catch (error) {
            log.error('Error fetching monster stats from D&D API', {
                module: 'MonsterStatsParser',
                monsterName,
                error: error instanceof Error ? error.message : String(error),
            });
            
            // Cache default values to avoid repeated failed requests
            const defaultStats = { hp: 10, ac: 10 };
            monsterStatsCache.set(cacheKey, defaultStats);
            
            // Clean up pending requests
            pendingRequests.delete(cacheKey);
            
            return defaultStats; // Return defaults instead of null
        }
    })();
    
    // Store the promise in pending requests
    pendingRequests.set(cacheKey, requestPromise);
    
    return await requestPromise;
}

