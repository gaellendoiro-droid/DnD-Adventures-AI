/**
 * @fileOverview Combat Action Resolver
 * Centralizes the logic for resolving combat actions (attacks, spells, etc.) into dice rolls.
 * This ensures consistency between Player and AI calculations, using the "Single Source of Truth" (stats).
 */

import { log } from '@/lib/logger';
import type { Character } from '@/lib/types';
import type { EnemyWithStats } from './initialization/types';

export interface DiceRollRequest {
    rollNotation: string;
    description: string;
    roller: string;
    attackType?: 'attack_roll' | 'damage_roll' | 'saving_throw' | 'healing';
}

export interface ResolutionResult {
    success: boolean;
    diceRollRequests: DiceRollRequest[];
    error?: string;
    actionDescription?: string;
}

export class CombatActionResolver {
    /**
     * Resolves a physical attack into dice roll requests.
     * Calculates bonuses based on stats (Ability + Proficiency).
     * @param rollerName - Optional visual name of the roller (e.g., "Goblin 1"). If not provided, uses combatant.name
     */
    static resolveAttack(
        combatant: Character | EnemyWithStats,
        weaponName: string,
        targetName: string = 'objetivo',
        rollerName?: string
    ): ResolutionResult {
        try {
            const isPlayer = (combatant as any).inventory !== undefined;

            if (isPlayer) {
                return this.resolvePlayerAttack(combatant as Character, weaponName, targetName, rollerName);
            } else {
                return this.resolveEnemyAttack(combatant as EnemyWithStats, weaponName, targetName, rollerName);
            }
        } catch (error) {
            log.error('Error resolving attack', {
                module: 'CombatActionResolver',
                combatant: combatant.name,
                weapon: weaponName,
                error: error instanceof Error ? error.message : String(error),
            });
            return { success: false, diceRollRequests: [], error: 'Error resolving attack' };
        }
    }

    /**
     * Resolves an attack for a Player Character.
     * Uses inventory and calculated stats.
     */
    private static resolvePlayerAttack(
        player: Character,
        weaponQuery: string,
        targetName: string,
        rollerName?: string
    ): ResolutionResult {
        // 1. Find weapon in inventory
        const weapon = player.inventory.find((item: any) =>
            item.name.toLowerCase().includes(weaponQuery.toLowerCase()) ||
            (weaponQuery.toLowerCase() === 'ataque' && (
                item.name.toLowerCase().includes('espada') ||
                item.name.toLowerCase().includes('hacha') ||
                item.name.toLowerCase().includes('arco') ||
                item.name.toLowerCase().includes('daga') ||
                item.name.toLowerCase().includes('maza') ||
                item.name.toLowerCase().includes('bastón')
            ))
        );

        if (!weapon && weaponQuery.toLowerCase() !== 'ataque') {
            return { success: false, diceRollRequests: [], error: `No tienes el arma "${weaponQuery}".` };
        }

        const actualWeaponName = weapon?.name || 'Ataque desarmado';

        // 2. Determine Ability Modifier (STR vs DEX)
        // Simplified logic: Finesse/Ranged uses DEX, otherwise STR
        // TODO: Check weapon properties for Finesse
        const isRanged = actualWeaponName.toLowerCase().includes('arco') || actualWeaponName.toLowerCase().includes('ballesta');
        const isFinesse = actualWeaponName.toLowerCase().includes('daga') || actualWeaponName.toLowerCase().includes('estoque');

        const strMod = player.abilityModifiers?.fuerza || 0;
        const dexMod = player.abilityModifiers?.destreza || 0;

        let abilityMod = strMod;
        if (isRanged) {
            abilityMod = dexMod;
        } else if (isFinesse) {
            abilityMod = Math.max(strMod, dexMod);
        }

        // 3. Calculate Bonuses
        const proficiencyBonus = player.proficiencyBonus || 2;
        // Assuming proficiency with the weapon for now
        const attackBonus = abilityMod + proficiencyBonus;
        const damageBonus = abilityMod;

        // 4. Determine Damage Dice
        // Extract from description or default
        const damageDieMatch = weapon?.description?.match(/(\d+d\d+)/);
        const damageDie = damageDieMatch ? damageDieMatch[0] : '1d4'; // Default for unarmed/improvised

        // 5. Create Dice Requests
        const diceRollRequests: DiceRollRequest[] = [
            {
                rollNotation: `1d20+${attackBonus}`,
                description: `Ataque con ${actualWeaponName} a ${targetName}`,
                roller: player.name,
                attackType: 'attack_roll'
            },
            {
                rollNotation: `${damageDie}+${damageBonus}`,
                description: `Daño de ${actualWeaponName}`,
                roller: player.name,
                attackType: 'damage_roll'
            }
        ];

        return {
            success: true,
            diceRollRequests,
            actionDescription: `${player.name} ataca a ${targetName} con ${actualWeaponName}.`
        };
    }

    /**
     * Resolves an attack for an Enemy/NPC.
     * Uses the 'actions' array from the D&D API stats.
     */
    private static resolveEnemyAttack(
        enemy: EnemyWithStats,
        weaponQuery: string,
        targetName: string,
        rollerName?: string
    ): ResolutionResult {
        // 1. Find action in enemy stats
        let action = null;

        if (enemy.actions && enemy.actions.length > 0) {
            // Try to find exact match or partial match
            action = enemy.actions.find((a: any) => a.name.toLowerCase().includes(weaponQuery.toLowerCase()));

            // If not found and query is generic "ataque", use the first attack action
            if (!action && weaponQuery.toLowerCase() === 'ataque') {
                // Look for actions that have an attack bonus
                action = enemy.actions.find((a: any) => a.attack_bonus !== undefined);
            }
        }

        // Fallback: If no actions data, use basic logic (improvised)
        if (!action) {
            // If we don't have action data, we fall back to basic stats if available
            // This handles the case where API data might be missing or incomplete
            const strMod = enemy.abilityModifiers?.fuerza || 0;
            const profBonus = enemy.proficiencyBonus || 2;
            const attackBonus = strMod + profBonus;

            return {
                success: true,
                diceRollRequests: [
                    {
                        rollNotation: `1d20+${attackBonus}`,
                        description: `Ataque básico a ${targetName}`,
                        roller: rollerName || enemy.name,
                        attackType: 'attack_roll'
                    },
                    {
                        rollNotation: `1d4+${strMod}`,
                        description: `Daño básico`,
                        roller: rollerName || enemy.name,
                        attackType: 'damage_roll'
                    }
                ],
                actionDescription: `${enemy.name} realiza un ataque básico a ${targetName}.`
            };
        }

        // 2. Extract Data from Action
        const attackBonus = action.attack_bonus || 0;

        // Parse damage from action (API format is usually array of damage objects)
        // Example: [{"damage_type": {"name": "Slashing"}, "damage_dice": "1d6+2"}]
        // Or sometimes simplified in our parser
        let damageNotation = '1d4';
        let damageBonus = 0; // Usually included in the dice notation from API (e.g., "1d6+2")

        if (action.damage && Array.isArray(action.damage) && action.damage.length > 0) {
            const dmg = action.damage[0];
            if (dmg.damage_dice) {
                damageNotation = dmg.damage_dice;
            } else if (typeof dmg === 'string') {
                // Our parser might have simplified it? Let's check parser logic later.
                // For now assume standard API structure or string
                damageNotation = dmg;
            }
        }

        // 3. Create Dice Requests
        const diceRollRequests: DiceRollRequest[] = [
            {
                rollNotation: `1d20+${attackBonus}`,
                description: `Ataque con ${action.name} a ${targetName}`,
                roller: rollerName || enemy.name,
                attackType: 'attack_roll'
            },
            {
                rollNotation: damageNotation, // API usually includes the bonus in the string (e.g. "1d6+2")
                description: `Daño de ${action.name}`,
                roller: rollerName || enemy.name,
                attackType: 'damage_roll'
            }
        ];

        return {
            success: true,
            diceRollRequests,
            actionDescription: `${enemy.name} usa ${action.name} contra ${targetName}.`
        };
    }
}
