/**
 * @fileOverview Initiative Generator module
 * Handles initiative rolls and turn order generation.
 */

import type { Combatant, DiceRoll } from '@/lib/types';
import {
    generateDifferentiatedNames,
} from '@/lib/combat/monster-name-manager';
import type { EnemyWithStats } from './types';
import { SurpriseManager } from '@/lib/combat/surprise-manager';

export class InitiativeGenerator {
    /**
     * Generates initiative rolls for all combatants.
     */
    static async generateInitiativeRolls(
        validCombatants: any[],
        initialEnemies: EnemyWithStats[],
        diceRollerTool: (input: any) => Promise<any>,
        localLog: (msg: string) => void
    ): Promise<{
        initiativeRolls: any[],
        initiativeDiceRolls: DiceRoll[],
        differentiatedNames: Map<string, string>
    }> {
        const initiativeRolls: any[] = [];
        const initiativeDiceRolls: DiceRoll[] = [];

        // Generate differentiated names BEFORE initiative rolls so we can use them in dice rolls
        const differentiatedNames = generateDifferentiatedNames(initialEnemies);

        // Combine players and enemies for initiative
        // Note: validCombatants contains players, initialEnemies contains enemies with stats
        // We need to match them correctly.
        // Actually, validCombatants contains BOTH players and enemies from the validation step,
        // but initialEnemies has the updated stats and uniqueIds for enemies.

        // Let's rebuild the list for initiative:
        // 1. Players from validCombatants
        const players = validCombatants.filter(c => c.entityType === 'player');
        // 2. Enemies from initialEnemies (which have uniqueIds)
        const enemies = initialEnemies.map(e => ({
            ...e,
            entityType: 'monster',
            controlledBy: 'AI'
        }));

        const combatantsForInit = [...players, ...enemies];

        for (const combatant of combatantsForInit) {
            let dexModifier = combatant.abilityModifiers?.destreza ?? Math.floor(((combatant.abilityScores?.destreza ?? combatant.stats?.dexterity ?? 10) - 10) / 2);
            const rollNotation = `1d20${dexModifier >= 0 ? `+${dexModifier}` : `${dexModifier}`}`;

            // Use differentiated name for enemies in dice rolls
            let rollerName = combatant.name;
            if (combatant.entityType === 'monster' && combatant.uniqueId) {
                const visualName = differentiatedNames.get(combatant.uniqueId);
                if (visualName) {
                    rollerName = visualName;
                }
            }

            const roll = await diceRollerTool({ roller: rollerName, rollNotation, description: 'Iniciativa' });
            initiativeDiceRolls.push(roll);

            const combatantType = combatant.entityType === 'player' ? 'ally' : 'enemy';
            initiativeRolls.push({
                id: combatant.id, // This is uniqueId for enemies
                name: combatant.name,
                total: roll.totalResult,
                type: combatantType,
                controlledBy: combatant.controlledBy
            });
        }

        // Sort by total (descending)
        initiativeRolls.sort((a, b) => b.total - a.total);

        return { initiativeRolls, initiativeDiceRolls, differentiatedNames };
    }

    /**
     * Creates the final initiative order array with visual names.
     * Marks combatants as surprised based on surpriseSide using SurpriseManager.
     */
    static createInitiativeOrder(
        initiativeRolls: any[],
        differentiatedNames: Map<string, string>,
        localLog: (msg: string) => void,
        surpriseSide?: 'player' | 'enemy'
    ): Combatant[] {
        // First, create all combatants
        const combatants = initiativeRolls.map(r => {
            // Check if this is an enemy by type (enemies have type: 'enemy', players/companions have type: 'ally')
            const isEnemy = r.type === 'enemy';
            let displayName = r.name;

            if (isEnemy) {
                // Use differentiated name - should always be available for enemies
                const visualName = differentiatedNames.get(r.id);
                if (visualName) {
                    displayName = visualName;
                } else {
                    // Fallback: if not found, log warning but use original name
                    localLog(`Warning: Differentiated name not found for enemy ${r.id}, using original name ${r.name}`);
                }
            }

            // Create combatant
            const combatant: Combatant = {
                id: r.id,
                characterName: displayName,
                total: r.total,
                type: r.type as any,
                controlledBy: r.controlledBy as any,
            };

            return combatant;
        });

        // Then, mark combatants as surprised using SurpriseManager
        if (surpriseSide) {
            const markedCombatants = SurpriseManager.markCombatantsSurprised(combatants, surpriseSide);
            
            // Log surprise status for debugging
            markedCombatants.forEach(c => {
                if (c.isSurprised) {
                    localLog(`Marking ${c.characterName} (id=${c.id}) as SURPRISED (surpriseSide=${surpriseSide})`);
                }
            });
            
            return markedCombatants;
        }

        return combatants;
    }
}
