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

/**
 * Parses ability scores from D&D API data.
 */
function parseAbilityScores(data: any): { fuerza: number; destreza: number; constitución: number; inteligencia: number; sabiduría: number; carisma: number } {
    return {
        fuerza: data.strength || 10,
        destreza: data.dexterity || 10,
        constitución: data.constitution || 10,
        inteligencia: data.intelligence || 10,
        sabiduría: data.wisdom || 10,
        carisma: data.charisma || 10,
    };
}

/**
 * Calculates ability modifier from score.
 * Formula: floor((score - 10) / 2)
 */
export function getAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

/**
 * Parses or calculates proficiency bonus.
 */
function parseProficiencyBonus(data: any): number {
    if (data.proficiency_bonus) {
        return data.proficiency_bonus;
    }

    // Calculate from Challenge Rating if missing
    const cr = data.challenge_rating || 0;
    if (cr < 5) return 2;
    if (cr < 9) return 3;
    if (cr < 13) return 4;
    if (cr < 17) return 5;
    return 6;
}

/**
 * Parses actions to a simplified format.
 */
function parseActions(data: any): any[] {
    if (!data.actions || !Array.isArray(data.actions)) {
        return [];
    }

    return data.actions.map((action: any) => ({
        name: action.name,
        desc: action.desc,
        attack_bonus: action.attack_bonus,
        damage: action.damage, // Array of damage objects
    }));
}

export interface MonsterStats {
    hp: number;
    ac: number;
    abilityScores: {
        fuerza: number;
        destreza: number;
        constitución: number;
        inteligencia: number;
        sabiduría: number;
        carisma: number;
    };
    abilityModifiers: {
        fuerza: number;
        destreza: number;
        constitución: number;
        inteligencia: number;
        sabiduría: number;
        carisma: number;
    };
    proficiencyBonus: number;
    actions: any[];
}

// Cache for monster stats to avoid repeated API calls
const monsterStatsCache: Map<string, MonsterStats> = new Map();

// Cache for pending promises to avoid duplicate simultaneous calls
const pendingRequests: Map<string, Promise<MonsterStats | null>> = new Map();

/**
 * Fetches monster stats (HP, AC, Abilities, Actions) from the D&D 5e API.
 * Uses a cache to avoid repeated calls for the same monster.
 * Also uses a pending requests cache to avoid duplicate simultaneous calls.
 * Returns null if the monster is not found or if there's an error.
 * 
 * @param monsterName Name of the monster to fetch stats for
 * @returns Object with monster stats, or null if not found
 */
export async function getMonsterStatsFromDndApi(monsterName: string): Promise<MonsterStats | null> {
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

        // Default stats in case of failure
        const defaultStats: MonsterStats = {
            hp: 10,
            ac: 10,
            abilityScores: { fuerza: 10, destreza: 10, constitución: 10, inteligencia: 10, sabiduría: 10, carisma: 10 },
            abilityModifiers: { fuerza: 0, destreza: 0, constitución: 0, inteligencia: 0, sabiduría: 0, carisma: 0 },
            proficiencyBonus: 2,
            actions: []
        };

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
                monsterStatsCache.set(cacheKey, defaultStats);
                pendingRequests.delete(cacheKey);
                return defaultStats;
            }

            const data = await response.json();

            // Parse HP
            const hp = parseHitPoints(data.hit_points);

            // Parse AC
            const ac = parseArmorClass(data.armor_class);

            // Parse Ability Scores
            const abilityScores = parseAbilityScores(data);
            const abilityModifiers = {
                fuerza: getAbilityModifier(abilityScores.fuerza),
                destreza: getAbilityModifier(abilityScores.destreza),
                constitución: getAbilityModifier(abilityScores.constitución),
                inteligencia: getAbilityModifier(abilityScores.inteligencia),
                sabiduría: getAbilityModifier(abilityScores.sabiduría),
                carisma: getAbilityModifier(abilityScores.carisma),
            };

            // Parse Proficiency Bonus
            const proficiencyBonus = parseProficiencyBonus(data);

            // Parse Actions
            const actions = parseActions(data);

            const stats: MonsterStats = {
                hp,
                ac,
                abilityScores,
                abilityModifiers,
                proficiencyBonus,
                actions
            };

            // Cache the result
            monsterStatsCache.set(cacheKey, stats);

            log.debug('Monster stats fetched successfully', {
                module: 'MonsterStatsParser',
                monsterName,
                hp,
                ac,
                actionsCount: actions.length
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
            monsterStatsCache.set(cacheKey, defaultStats);

            // Clean up pending requests
            pendingRequests.delete(cacheKey);

            return defaultStats;
        }
    })();

    // Store the promise in pending requests
    pendingRequests.set(cacheKey, requestPromise);

    return await requestPromise;
}

