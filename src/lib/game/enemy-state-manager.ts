/**
 * @fileOverview EnemyStateManager
 * Centralizes all logic for managing enemy state by location.
 * 
 * This module provides a single source of truth for:
 * - Getting enemies for a specific location
 * - Revealing hidden enemies (mimics, ambushes)
 * - Filtering visible/alive enemies
 * - Normalizing enemy stats from JSON format
 */

/**
 * Gets enemies for a specific location.
 * Single point of resolution (eliminates scattered fallbacks).
 * 
 * Priority:
 * 1. enemiesByLocation[locationId] (if exists)
 * 2. fallbackEnemies (if provided)
 * 3. Empty array
 * 
 * @param locationId - The location ID to get enemies for
 * @param enemiesByLocation - Map of locationId -> enemies array
 * @param fallbackEnemies - Fallback enemies array (for backward compatibility)
 * @returns Array of enemies for the location
 */
export function getEnemiesForLocation(
    locationId: string,
    enemiesByLocation?: Record<string, any[]>,
    fallbackEnemies?: any[]
): any[] {
    // Priority 1: Check enemiesByLocation map
    if (enemiesByLocation && enemiesByLocation[locationId]) {
        return enemiesByLocation[locationId];
    }

    // Priority 2: Fallback to global enemies array (backward compatibility)
    if (fallbackEnemies && fallbackEnemies.length > 0) {
        return fallbackEnemies;
    }

    // Priority 3: No enemies found
    return [];
}

/**
 * Reveals a hidden enemy (mimic, ambush, etc.)
 * Changes disposition: 'hidden' → 'hostile' and status: 'hidden' → 'active'
 * 
 * @param enemy - The enemy to reveal
 * @returns A new enemy object with revealed state
 */
export function revealHiddenEnemy(enemy: any): any {
    return {
        ...enemy,
        disposition: 'hostile',
        status: 'active',
    };
}

/**
 * Filters only visible enemies (excludes hidden ones).
 * 
 * @param enemies - Array of enemies to filter
 * @returns Array of visible enemies
 */
export function filterVisibleEnemies(enemies: any[]): any[] {
    return enemies.filter(e => {
        // Exclude enemies with hidden disposition
        if (e.disposition === 'hidden') {
            return false;
        }
        
        // Exclude enemies with hidden status
        if (e.status === 'hidden') {
            return false;
        }
        
        return true;
    });
}

/**
 * Normalizes enemy stats loaded from JSON.
 * Converts stats.hp → hp: { current, max } and stats.ac → ac
 * 
 * This is needed because JSON adventures may have:
 * - `stats: { hp: 58, ac: 12 }`
 * But the combat system expects:
 * - `hp: { current: 58, max: 58 }` and `ac: 12` at root level
 * 
 * @param enemy - Enemy entity from JSON
 * @returns Normalized enemy with proper hp/ac structure
 */
export function normalizeEnemyStats(enemy: any): any {
    // If already normalized, return as-is
    if (enemy.hp && typeof enemy.hp === 'object' && enemy.hp.current !== undefined) {
        return enemy;
    }

    // If has stats.hp, normalize it
    if (enemy.stats?.hp !== undefined) {
        const hpValue = typeof enemy.stats.hp === 'number' ? enemy.stats.hp : parseInt(String(enemy.stats.hp), 10);
        const normalizedHp = isNaN(hpValue) ? { current: 10, max: 10 } : { current: hpValue, max: hpValue };

        return {
            ...enemy,
            hp: normalizedHp,
            ac: enemy.stats.ac !== undefined ? enemy.stats.ac : enemy.ac,
        };
    }

    // If no stats.hp but has hp as number, convert to object
    if (typeof enemy.hp === 'number') {
        return {
            ...enemy,
            hp: { current: enemy.hp, max: enemy.hp },
        };
    }

    // If no hp at all, add default
    if (!enemy.hp) {
        return {
            ...enemy,
            hp: { current: 10, max: 10 },
        };
    }

    // Already in correct format or unknown format, return as-is
    return enemy;
}

/**
 * Filters alive enemies from a list.
 * 
 * @param enemies - Array of enemies to filter
 * @returns Array of enemies with hp.current > 0
 */
export function filterAliveEnemies(enemies: any[]): any[] {
    return enemies.filter(e => {
        // Check if enemy has hp structure
        if (e.hp && typeof e.hp === 'object' && e.hp.current !== undefined) {
            return e.hp.current > 0;
        }
        
        // Fallback: if hp is a number
        if (typeof e.hp === 'number') {
            return e.hp > 0;
        }
        
        // If no hp info, assume alive (safety)
        return true;
    });
}

/**
 * EnemyStateManager - Static class with utility functions for enemy state management.
 */
export class EnemyStateManager {
    static getEnemiesForLocation = getEnemiesForLocation;
    static revealHiddenEnemy = revealHiddenEnemy;
    static filterVisibleEnemies = filterVisibleEnemies;
    static normalizeEnemyStats = normalizeEnemyStats;
    static filterAliveEnemies = filterAliveEnemies;
}

