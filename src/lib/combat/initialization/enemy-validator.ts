/**
 * @fileOverview Enemy Validator module
 * Handles validation of combatants and fetching of enemy stats.
 */

import { log } from '@/lib/logger';
import type { Character } from '@/lib/types';
import { getAdventureData } from '@/app/game-state-actions';
import {
    getMonsterStatsFromDndApi,
} from '@/lib/combat/monster-stats-parser';
import {
    validateAndClampHP,
} from '@/lib/combat/rules-engine';
import type { EnemyWithStats } from './types';

export class EnemyValidator {
    /**
     * Validates combatant IDs and separates them into party members and hostile entities.
     * Filters out dead combatants.
     */
    static async validateCombatants(
        combatantIds: string[],
        party: Character[],
        existingEnemies: any[],
        localLog: (msg: string) => void
    ): Promise<{ validCombatants: any[], hostileEntities: any[] }> {
        const adventureData = await getAdventureData();
        const allEntities = adventureData.entities;
        const combatantData: any[] = [];

        for (const id of combatantIds) {
            let found = party.find(p => p.id === id);
            if (found) {
                // Check HP before including in combat
                if (found.hp && found.hp.current > 0) {
                    combatantData.push({ ...found, entityType: 'player', name: found.name, controlledBy: found.controlledBy });
                } else {
                    log.debug('Skipping dead party member in combat initiation', {
                        module: 'CombatInitializer',
                        characterName: found.name,
                        hp: found.hp?.current || 0,
                    });
                }
                continue;
            }

            found = allEntities.find((e: any) => e.id === id);
            if (found) {
                // Check if enemy already exists and is dead
                const existingEnemy = existingEnemies.find((e: any) => e.id === id || (e as any).uniqueId === id);
                if (!existingEnemy || (existingEnemy.hp && existingEnemy.hp.current > 0)) {
                    combatantData.push({ ...found, entityType: 'monster', name: found.name, controlledBy: 'AI' });
                } else {
                    log.debug('Skipping dead enemy in combat initiation', {
                        module: 'CombatInitializer',
                        enemyId: id,
                        hp: existingEnemy.hp?.current || 0,
                    });
                }
            } else {
                log.warn('Combatant ID not found in entities', {
                    module: 'CombatInitializer',
                    combatantId: id,
                    availableEntityIds: allEntities.map((e: any) => e.id),
                });
            }
        }

        const hostileEntities = combatantData.filter(c => c.entityType === 'monster');
        return { validCombatants: combatantData, hostileEntities };
    }

    /**
     * Fetches stats for enemies from D&D API if missing, and generates unique IDs.
     */
    static async fetchAndValidateEnemyStats(
        hostileEntities: any[],
        localLog: (msg: string) => void
    ): Promise<EnemyWithStats[]> {
        // Generate uniqueIds for enemies based on their base name
        const enemyGroups = new Map<string, number>(); // Map<baseName, currentIndex>

        const initialEnemies = hostileEntities.map((e: any) => {
            // Extract base name from id (remove any existing numeric suffix)
            const baseId = e.id.split('-').slice(0, -1).join('-') || e.id.split('-')[0] || e.id;

            // Get or initialize the index for this base name (start at 1)
            const currentIndex = enemyGroups.get(baseId) || 1;
            enemyGroups.set(baseId, currentIndex + 1);

            const uniqueId = `${baseId}-${currentIndex}`;
            return { ...e, uniqueId };
        });

        const updatedEnemies: EnemyWithStats[] = [];

        for (const enemy of initialEnemies) {
            let hpValue: number | undefined;
            let hpMax: number | undefined;
            let ac = enemy.ac;

            // Handle hp: can be a number or an object { current: number, max: number }
            if (enemy.hp !== undefined && enemy.hp !== null) {
                if (typeof enemy.hp === 'number') {
                    hpValue = enemy.hp;
                    hpMax = enemy.hp;
                } else if (typeof enemy.hp === 'object' && 'current' in enemy.hp && 'max' in enemy.hp) {
                    hpValue = typeof enemy.hp.current === 'number' ? enemy.hp.current : undefined;
                    hpMax = typeof enemy.hp.max === 'number' ? enemy.hp.max : undefined;
                }
            }

            // If hp or ac are missing, try to fetch from D&D API
            // Also fetch full stats for robust roll system
            let fullStats: any = null;

            if (hpValue === undefined || hpMax === undefined || ac === undefined || ac === null) {
                localLog(`Enemy ${enemy.name} missing stats, fetching...`);
                const stats = await getMonsterStatsFromDndApi(enemy.name);

                if (stats) {
                    hpValue = hpValue !== undefined ? hpValue : stats.hp;
                    hpMax = hpMax !== undefined ? hpMax : stats.hp;
                    ac = ac !== undefined && ac !== null ? ac : stats.ac;
                    fullStats = stats;
                    const abilitiesCount = stats.abilityScores ? Object.keys(stats.abilityScores).length : 0;
                    localLog(`Fetched stats for ${enemy.name}: HP=${hpMax}, AC=${ac}, Actions=${stats.actions?.length || 0}, Abilities=${abilitiesCount}, ProfBonus=${stats.proficiencyBonus || 'N/A'}`);
                } else {
                    hpValue = hpValue !== undefined ? hpValue : 10;
                    hpMax = hpMax !== undefined ? hpMax : 10;
                    ac = ac !== undefined && ac !== null ? ac : 10;
                    localLog(`Using default stats for ${enemy.name}: HP=${hpMax}, AC=${ac}`);
                }
            } else {
                // Even if we have HP/AC, we might want full stats for the new system
                // We'll fetch them asynchronously to not block if we already have basic stats
                // For now, we'll just fetch them if we don't have them
                const stats = await getMonsterStatsFromDndApi(enemy.name);
                if (stats) {
                    fullStats = stats;
                }
            }

            // Ensure we have valid values
            if (hpValue === undefined || hpMax === undefined) {
                log.warn('Enemy HP still undefined after all attempts, using defaults', {
                    module: 'CombatInitializer',
                    enemyName: enemy.name,
                    enemyId: enemy.id,
                });
                hpValue = 10;
                hpMax = 10;
            }

            if (ac === undefined || ac === null) {
                log.warn('Enemy AC still undefined after all attempts, using default', {
                    module: 'CombatInitializer',
                    enemyName: enemy.name,
                    enemyId: enemy.id,
                });
                ac = 10;
            }

            const newEnemy = {
                uniqueId: enemy.uniqueId,
                id: enemy.uniqueId, // Use uniqueId as id to match initiativeOrder
                adventureId: enemy.id, // Preserve original adventure entity ID
                name: enemy.name,
                color: '#ef4444',
                hp: { current: hpValue, max: hpMax },
                ac: ac,
                // Add full stats for robust roll system
                abilityScores: fullStats?.abilityScores,
                abilityModifiers: fullStats?.abilityModifiers,
                proficiencyBonus: fullStats?.proficiencyBonus,
                actions: fullStats?.actions,
            };

            const validatedEnemy = validateAndClampHP(newEnemy);
            updatedEnemies.push(validatedEnemy as EnemyWithStats);
        }

        return updatedEnemies;
    }
}
