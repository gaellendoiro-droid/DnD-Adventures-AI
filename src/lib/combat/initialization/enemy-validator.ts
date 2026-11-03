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

        localLog(`EnemyValidator: Processing ${combatantIds.length} combatant IDs: ${JSON.stringify(combatantIds)}`);
        localLog(`EnemyValidator: Party has ${party.length} members: ${JSON.stringify(party.map(p => ({ id: p.id, name: p.name, hp: p.hp })))}`);

        const cleanWords = (s: string) => s.toLowerCase().trim().split(/[\s_-]+/).filter(Boolean);
        const matchWord = (w1: string, w2: string) => {
            if (w1 === w2) return true;
            if (w1.startsWith(w2) || w2.startsWith(w1)) return true;
            if (w1.length >= 6 && w2.length >= 6) {
                return w1.substring(0, 6) === w2.substring(0, 6);
            }
            return false;
        };
        const matchEntity = (searchId: string, entityId: string, entityName?: string) => {
            const searchWords = cleanWords(searchId);
            const idWords = cleanWords(entityId);
            const nameWords = entityName ? cleanWords(entityName) : [];

            const idMatchCount = searchWords.filter(sw => idWords.some(iw => matchWord(sw, iw))).length;
            const nameMatchCount = nameWords.length > 0
                ? searchWords.filter(sw => nameWords.some(nw => matchWord(sw, nw))).length
                : 0;

            const minIdWords = Math.min(searchWords.length, idWords.length);
            const minNameWords = nameWords.length > 0 ? Math.min(searchWords.length, nameWords.length) : Infinity;

            return idMatchCount >= minIdWords || nameMatchCount >= minNameWords;
        };

        for (const id of combatantIds) {
            let found = party.find(p => matchEntity(id, p.id, p.name));

            if (found) {
                // Check HP before including in combat
                const hpCurrent = typeof (found as any).hp === 'number'
                    ? (found as any).hp
                    : (found as any).hp?.current;
                if (hpCurrent !== undefined && hpCurrent > 0) {
                    localLog(`EnemyValidator: Adding party member ${found.name} (id=${found.id}, hp=${hpCurrent})`);
                    combatantData.push({ ...found, entityType: 'player', name: found.name, controlledBy: found.controlledBy });
                } else {
                    log.debug('Skipping dead party member in combat initiation', {
                        module: 'CombatInitializer',
                        characterName: found.name,
                        hp: hpCurrent || 0,
                    });
                }
                continue;
            }

            found = allEntities.find((e: any) => matchEntity(id, e.id, e.name));

            if (found) {
                const enemyHpCurrent = typeof (found as any).hp === 'number'
                    ? (found as any).hp
                    : (found as any).hp?.current;

                // Check if enemy already exists and is dead (using real found.id)
                const existingEnemy = existingEnemies.find((e: any) => 
                    e.id === found!.id || 
                    (e as any).uniqueId === found!.id ||
                    e.id === id ||
                    (e as any).uniqueId === id
                );

                // Defensivo: Si el enemigo está en el estado pero no tiene hp.current, asumimos que está vivo
                const isExistingEnemyDead = existingEnemy && 
                    existingEnemy.hp && 
                    (typeof existingEnemy.hp === 'number' 
                        ? existingEnemy.hp <= 0 
                        : (existingEnemy.hp.current !== undefined && existingEnemy.hp.current <= 0));

                if (enemyHpCurrent !== undefined && enemyHpCurrent <= 0) {
                    log.debug('Skipping dead enemy from adventure data', {
                        module: 'CombatInitializer',
                        enemyId: found.id,
                        hp: enemyHpCurrent,
                    });
                } else if (!existingEnemy || !isExistingEnemyDead) {
                    combatantData.push({ ...found, entityType: 'monster', name: found.name, controlledBy: 'AI' });
                } else {
                    log.debug('Skipping dead enemy in combat initiation', {
                        module: 'CombatInitializer',
                        enemyId: found.id,
                        hp: typeof existingEnemy.hp === 'number' ? existingEnemy.hp : (existingEnemy.hp?.current || 0),
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
            // Prefer explicit adventure stats (stats.hp / stats.ac) over any defaults
            const statsBlock = (enemy as any).stats || {};
            const statsOverrides = (enemy as any).statsOverrides || {};
            const explicitAbilityScores =
                (enemy as any).abilityScores ||
                statsOverrides.abilityScores ||
                statsBlock.abilityScores;
            const explicitAbilityModifiers =
                (enemy as any).abilityModifiers ||
                statsOverrides.abilityModifiers ||
                statsBlock.abilityModifiers;
            const explicitProficiencyBonus =
                (enemy as any).proficiencyBonus ??
                statsOverrides.proficiencyBonus ??
                statsBlock.proficiencyBonus;
            const explicitActions =
                (enemy as any).actions ||
                statsOverrides.actions ||
                statsBlock.actions;
            let hpValue: number | undefined =
                enemy.hp?.current ??
                (typeof enemy.hp === 'number' ? enemy.hp : undefined) ??
                (typeof statsBlock.hp === 'number' ? statsBlock.hp : undefined);
            let hpMax: number | undefined =
                enemy.hp?.max ??
                (typeof enemy.hp === 'number' ? enemy.hp : undefined) ??
                (typeof statsBlock.hp === 'number' ? statsBlock.hp : undefined);
            let ac =
                enemy.ac ??
                (typeof statsBlock.ac === 'number' ? statsBlock.ac : undefined);

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
                    // Only fill missing fields; never override explicit adventure stats
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
                adventureId: enemy.adventureId || enemy.id, // Preserve original adventure entity ID
                name: enemy.name,
                color: '#ef4444',
                hp: { current: hpValue, max: hpMax },
                ac: ac,
                // Add full stats for robust roll system
                abilityScores: explicitAbilityScores || fullStats?.abilityScores,
                abilityModifiers: explicitAbilityModifiers || fullStats?.abilityModifiers,
                proficiencyBonus: explicitProficiencyBonus ?? fullStats?.proficiencyBonus,
                actions: (Array.isArray(explicitActions) && explicitActions.length > 0) ? explicitActions : fullStats?.actions,
            };

            const validatedEnemy = validateAndClampHP(newEnemy);
            updatedEnemies.push(validatedEnemy as EnemyWithStats);
        }

        return updatedEnemies;
    }
}
