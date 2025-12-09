/**
 * @fileOverview Monster Stats Parser
 * Handles parsing and transformation of monster statistics from D&D 5e API.
 * 
 * This module uses the unified D&D API client (dnd-api-client.ts) for all API calls.
 * It focuses solely on parsing/transforming raw API responses into MonsterStats format.
 * 
 * This module is part of the Fase 1.2 refactorization and Issue #125 unification.
 */

import { log } from '@/lib/logger';
import { fetchResource, normalizeQuery } from '@/lib/dnd-api-client';
import { DataService } from '@/lib/data-service';

/**
 * Normalizes a Spanish monster name to English for D&D API lookup.
 * 
 * @deprecated This function is kept for backward compatibility.
 * Use normalizeQuery from @/lib/dnd-api-client instead.
 * 
 * @param name Monster name in Spanish
 * @returns Normalized English name for API lookup
 */
export function normalizeMonsterName(name: string): string {
    return normalizeQuery(name);
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

/**
 * Parses raw D&D API monster data into MonsterStats format.
 * 
 * @param data Raw monster data from D&D API
 * @returns Parsed MonsterStats object
 */
function parseMonsterDataToStats(data: any): MonsterStats {
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

    return {
        hp,
        ac,
        abilityScores,
        abilityModifiers,
        proficiencyBonus,
        actions
    };
}

/**
 * Default stats to return when a monster is not found or there's an error.
 */
const DEFAULT_STATS: MonsterStats = {
    hp: 10,
    ac: 10,
    abilityScores: { fuerza: 10, destreza: 10, constitución: 10, inteligencia: 10, sabiduría: 10, carisma: 10 },
    abilityModifiers: { fuerza: 0, destreza: 0, constitución: 0, inteligencia: 0, sabiduría: 0, carisma: 0 },
    proficiencyBonus: 2,
    actions: []
};

/**
 * Maps local DB monster data to Combat System MonsterStats.
 */
function mapLocalMonsterToStats(local: any): MonsterStats {
    // Map stats (str -> fuerza)
    const abilityScores = {
        fuerza: local.stats.str,
        destreza: local.stats.dex,
        constitución: local.stats.con,
        inteligencia: local.stats.int,
        sabiduría: local.stats.wis,
        carisma: local.stats.cha
    };

    // Calculate modifiers
    const abilityModifiers = {
        fuerza: getAbilityModifier(abilityScores.fuerza),
        destreza: getAbilityModifier(abilityScores.destreza),
        constitución: getAbilityModifier(abilityScores.constitución),
        inteligencia: getAbilityModifier(abilityScores.inteligencia),
        sabiduría: getAbilityModifier(abilityScores.sabiduría),
        carisma: getAbilityModifier(abilityScores.carisma),
    };

    const proficiencyBonus = parseProficiencyBonus({
        proficiency_bonus: local.proficiency_bonus,
        challenge_rating: local.cr
    });

    // Map actions
    // Open5e actions format is compatible with our parseActions expectation
    // or we can pass them directly if they are already structured.
    // Local DB 'actions' are raw JSON from Open5e.
    const actions = parseActions({ actions: local.actions });

    return {
        hp: local.hp,
        ac: local.ac,
        abilityScores,
        abilityModifiers,
        proficiencyBonus,
        actions
    };
}



/**
 * Fetches monster stats (HP, AC, Abilities, Actions).
 * Priority:
 * 1. Local SQLite DB (DataService)
 * 2. External D&D 5e API (dnd-api-client)
 */
export async function getMonsterStatsFromDndApi(monsterName: string): Promise<MonsterStats | null> {
    try {
        log.debug('Fetching monster stats...', {
            module: 'MonsterStatsParser',
            monsterName,
        });

        // 1. Try Local DB
        const localMonster = await DataService.getMonster(monsterName);
        if (localMonster) {
            log.debug('✅ Monster found in Local SQLite DB', {
                module: 'MonsterStatsParser',
                monsterName,
                source: localMonster.source
            });
            return mapLocalMonsterToStats(localMonster);
        }

        log.debug('Monster not in Local DB, trying External API...', { module: 'MonsterStatsParser', monsterName });

        // 2. Try External API
        // Use unified client to fetch resource (includes cache, retries, error handling)
        const data = await fetchResource('monsters', monsterName);

        // If resource not found, return null
        if (!data) {
            log.warn('Monster not found in D&D API', {
                module: 'MonsterStatsParser',
                monsterName,
            });
            return null;
        }

        // Parse the raw API data into MonsterStats format
        const stats = parseMonsterDataToStats(data);

        log.debug('Monster stats fetched from API and parsed successfully', {
            module: 'MonsterStatsParser',
            monsterName,
            hp: stats.hp,
            ac: stats.ac,
            actionsCount: stats.actions.length
        });

        return stats;
    } catch (error) {
        log.error('Error fetching monster stats', {
            module: 'MonsterStatsParser',
            monsterName,
            error: error instanceof Error ? error.message : String(error),
        });

        // Return null on error (client already handles retries and caching)
        return null;
    }
}

