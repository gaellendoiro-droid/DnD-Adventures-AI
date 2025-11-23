/**
 * @fileOverview Combat Action Resolver
 * Centralizes the logic for resolving combat actions (attacks, spells, etc.) into dice rolls.
 * This ensures consistency between Player and AI calculations, using the "Single Source of Truth" (stats).
 */

import { log } from '@/lib/logger';
import type { Character } from '@/lib/types';
import type { EnemyWithStats } from './initialization/types';
import { normalizeQuery } from '@/lib/dnd-api-client';

export interface DiceRollRequest {
    rollNotation: string;
    description: string;
    roller: string;
    attackType?: 'attack_roll' | 'damage_roll' | 'saving_throw' | 'healing';
    attributeUsed?: 'FUE' | 'DES' | 'CON' | 'INT' | 'SAB' | 'CAR';
    attackRange?: 'melee' | 'ranged';
}

export interface ResolutionResult {
    success: boolean;
    diceRollRequests: DiceRollRequest[];
    error?: string;
    actionDescription?: string;
}

export class CombatActionResolver {
    /**
     * Extracts weapon properties from available data sources.
     * Priority: 1) attacks[].properties, 2) description parsing, 3) name heuristics (fallback)
     */
    private static getWeaponProperties(
        weaponName: string,
        attacks?: Array<{ name: string; properties?: string[] }>,
        description?: string
    ): { isRanged: boolean; isFinesse: boolean } {
        // 1. Try to find in attacks array with explicit properties (Structured Data)
        if (attacks && attacks.length > 0) {
            const attack = attacks.find(a => 
                a.name.toLowerCase() === weaponName.toLowerCase() ||
                a.name.toLowerCase().includes(weaponName.toLowerCase())
            );
            
            if (attack?.properties) {
                const props = attack.properties.map(p => p.toLowerCase());
                return {
                    isRanged: props.some(p => p.includes('munición') || p.includes('ammunition') || p.includes('distancia') || p.includes('range') || p.includes('lanzadiza') || p.includes('thrown')),
                    isFinesse: props.some(p => p.includes('sutil') || p.includes('finesse'))
                };
            }
        }

        // 2. Parse description if available (Text Parsing)
        if (description) {
            const desc = description.toLowerCase();
            
            // Check for keywords in description (e.g. "Propiedades: Sutil, Alcance")
            // Also checks D&D API format: "Ranged Weapon Attack:"
            const isRanged = desc.includes('alcance') || 
                           desc.includes('rango') || 
                           desc.includes('range') || 
                           desc.includes('distancia') ||
                           desc.includes('ranged weapon attack');
                           
            const isFinesse = desc.includes('sutil') || 
                            desc.includes('finesse');
            
            // If we found clear indicators, return them. 
            // If not, fall through to heuristics to be safe (e.g. description might be flavor text only)
            if (isRanged || isFinesse) {
                return { isRanged, isFinesse };
            }
        }

        // 3. Fallback: name-based heuristics (Safety Net)
        // Only used if no data/description provided conclusive info
        const name = weaponName.toLowerCase();
        return {
            isRanged: name.includes('arco') || 
                     name.includes('ballesta') || 
                     name.includes('crossbow') || 
                     name.includes('bow') ||
                     name.includes('dardo') ||
                     name.includes('dart') ||
                     name.includes('honda') ||
                     name.includes('sling'),
            isFinesse: name.includes('cimitarra') || 
                      name.includes('scimitar') ||
                      name.includes('daga') || 
                      name.includes('dagger') ||
                      name.includes('estoque') || 
                      name.includes('rapier') ||
                      name.includes('espada corta') || 
                      name.includes('shortsword') ||
                      name.includes('látigo') ||
                      name.includes('whip')
        };
    }

    /**
     * Determines which attribute to use for an attack based on weapon properties.
     * Common to all combatants (player, enemy, companion).
     */
    private static determineWeaponAttribute(
        weaponName: string,
        strMod: number,
        dexMod: number,
        attacks?: Array<{ name: string; properties?: string[] }>,
        description?: string
    ): { attributeUsed: 'FUE' | 'DES'; attackRange: 'melee' | 'ranged' } {
        const { isRanged, isFinesse } = this.getWeaponProperties(
            weaponName,
            attacks,
            description
        );

        let attributeUsed: 'FUE' | 'DES' = 'FUE';
        
        if (isRanged) {
            attributeUsed = 'DES';
        } else if (isFinesse) {
            // For finesse weapons, use the higher modifier
            attributeUsed = dexMod >= strMod ? 'DES' : 'FUE';
        }

        const attackRange: 'melee' | 'ranged' = isRanged ? 'ranged' : 'melee';

        return { attributeUsed, attackRange };
    }

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
        let weapon = null;
        
        if (weaponQuery.toLowerCase() === 'ataque') {
            // When no weapon specified, use the first weapon from attacks array
            // This ensures we use the "primary" weapon (usually melee, like Mandoble)
            if (player.attacks && player.attacks.length > 0) {
                const primaryAttack = player.attacks[0];
                weapon = player.inventory.find((item: any) =>
                    item.name.toLowerCase() === primaryAttack.name.toLowerCase() ||
                    item.name.toLowerCase().includes(primaryAttack.name.toLowerCase()) ||
                    primaryAttack.name.toLowerCase().includes(item.name.toLowerCase())
                );
                
                if (weapon) {
                    log.debug('Using primary weapon from attacks array', {
                        module: 'CombatActionResolver',
                        primaryAttackName: primaryAttack.name,
                        weaponFound: weapon.name,
                    });
                }
            }
            
            // Fallback: if no attacks array or no match, use keyword-based search
            // Prioritize melee weapons over ranged
            if (!weapon) {
                weapon = player.inventory.find((item: any) =>
                    item.name.toLowerCase().includes('espada') ||
                    item.name.toLowerCase().includes('mandoble') ||
                    item.name.toLowerCase().includes('hacha') ||
                    item.name.toLowerCase().includes('daga') ||
                    item.name.toLowerCase().includes('maza') ||
                    item.name.toLowerCase().includes('bastón')
                );
                
                // Only use ranged weapons if no melee weapon found
                if (!weapon) {
                    weapon = player.inventory.find((item: any) =>
                        item.name.toLowerCase().includes('arco') ||
                        item.name.toLowerCase().includes('ballesta')
                    );
                }
            }
        } else {
            // Specific weapon requested - search normally
            weapon = player.inventory.find((item: any) =>
                item.name.toLowerCase().includes(weaponQuery.toLowerCase())
            );
        }

        if (!weapon && weaponQuery.toLowerCase() !== 'ataque') {
            return { success: false, diceRollRequests: [], error: `No tienes el arma "${weaponQuery}".` };
        }

        const actualWeaponName = weapon?.name || 'Ataque desarmado';

        // 2. Determine Ability Modifier (STR vs DEX) - USING DATA-DRIVEN APPROACH
        const strMod = player.abilityModifiers?.fuerza || 0;
        const dexMod = player.abilityModifiers?.destreza || 0;
        
        const { attributeUsed, attackRange } = this.determineWeaponAttribute(
            actualWeaponName,
            strMod,
            dexMod,
            player.attacks, // Pass explicit attacks array from Character
            weapon?.description // Pass inventory description
        );

        const abilityMod = attributeUsed === 'DES' ? dexMod : strMod;

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
                attackType: 'attack_roll',
                attributeUsed: attributeUsed,
                attackRange: attackRange
            },
            {
                rollNotation: `${damageDie}+${damageBonus}`,
                description: `Daño de ${actualWeaponName}`,
                roller: player.name,
                attackType: 'damage_roll',
                attributeUsed: attributeUsed,
                attackRange: attackRange
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
            // Normalize the weapon query (Spanish → English, remove accents, etc.)
            const normalizedQuery = normalizeQuery(weaponQuery);
            
            log.debug('Resolving enemy attack - searching for action', {
                module: 'CombatActionResolver',
                enemy: enemy.name,
                weaponQuery,
                normalizedQuery,
                availableActions: enemy.actions.map((a: any) => ({
                    name: a.name,
                    normalized: normalizeQuery(a.name),
                    attack_bonus: a.attack_bonus,
                })),
            });
            
            // Try to find match using normalized comparison
            // Normalize both sides for better matching (handles Spanish→English translation)
            action = enemy.actions.find((a: any) => {
                const normalizedActionName = normalizeQuery(a.name);
                
                // Extract just the weapon name from action name
                // Action names from D&D API might be like "Scimitar", "Scimitar Attack", 
                // "Melee Weapon Attack: Scimitar", etc.
                // We want to match just the weapon name part
                const actionNameWords = normalizedActionName.split(/\s+/);
                const queryWords = normalizedQuery.split(/\s+/);
                
                // Check if any word from the query matches any word from the action name
                // This handles cases like "cimitarra" matching "Scimitar Attack"
                const wordMatch = queryWords.some(qWord => 
                    actionNameWords.some(aWord => 
                        aWord.includes(qWord) || qWord.includes(aWord)
                    )
                );
                
                // Also check full string matching (bidirectional)
                const fullMatch = normalizedActionName.includes(normalizedQuery) || 
                                 normalizedQuery.includes(normalizedActionName);
                
                const matches = wordMatch || fullMatch;
                
                if (matches) {
                    log.debug('Action match found', {
                        module: 'CombatActionResolver',
                        actionName: a.name,
                        normalizedActionName,
                        weaponQuery,
                        normalizedQuery,
                        matchType: wordMatch ? 'word' : 'full',
                    });
                }
                
                return matches;
            });

            // If not found and query is generic "ataque" or "attack", use the first attack action
            if (!action && (normalizedQuery === 'ataque' || normalizedQuery === 'attack')) {
                // Look for actions that have an attack bonus
                action = enemy.actions.find((a: any) => a.attack_bonus !== undefined);
                if (action) {
                    log.debug('Using first attack action as fallback', {
                        module: 'CombatActionResolver',
                        actionName: action.name,
                    });
                }
            }
            
            if (!action) {
                log.warn('No action found for enemy attack', {
                    module: 'CombatActionResolver',
                    enemy: enemy.name,
                    weaponQuery,
                    normalizedQuery,
                    availableActions: enemy.actions.map((a: any) => ({
                        name: a.name,
                        normalized: normalizeQuery(a.name),
                        attack_bonus: a.attack_bonus,
                    })),
                });
            }
        }

        // Fallback: If no actions data, use basic logic (improvised)
        if (!action) {
            // If we don't have action data, we fall back to basic stats if available
            // This handles the case where API data might be missing or incomplete
            const strMod = enemy.abilityModifiers?.fuerza || 0;
            const profBonus = enemy.proficiencyBonus || 2;
            const attackBonus = strMod + profBonus;
            // Default to FUE for melee attacks
            const attributeUsed: 'FUE' | 'DES' = 'FUE';
            const attackRange: 'melee' | 'ranged' = 'melee'; // Default to melee for basic attacks

            return {
                success: true,
                diceRollRequests: [
                    {
                        rollNotation: `1d20+${attackBonus}`,
                        description: `Ataque básico a ${targetName}`,
                        roller: rollerName || enemy.name,
                        attackType: 'attack_roll',
                        attributeUsed: attributeUsed,
                        attackRange: attackRange
                    },
                    {
                        rollNotation: `1d4+${strMod}`,
                        description: `Daño básico`,
                        roller: rollerName || enemy.name,
                        attackType: 'damage_roll',
                        attributeUsed: attributeUsed,
                        attackRange: attackRange
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

        // 3. Determine attribute used - USING DATA-DRIVEN APPROACH
        const weaponName = action.name;
        const strMod = enemy.abilityModifiers?.fuerza || 0;
        const dexMod = enemy.abilityModifiers?.destreza || 0;
        
        const { attributeUsed, attackRange } = this.determineWeaponAttribute(
            weaponName,
            strMod,
            dexMod,
            undefined, // Enemies don't usually have the structured 'attacks' array like players
            action.desc // Use the D&D API action description!
        );

        // 4. Create Dice Requests
        // Use the original weaponQuery (in Spanish) for display, not action.name (in English)
        // This ensures the UI shows "Cimitarra" instead of "Scimitar"
        // Capitalize first letter for better display
        const displayWeaponName = weaponQuery !== 'ataque' 
            ? weaponQuery.charAt(0).toUpperCase() + weaponQuery.slice(1).toLowerCase()
            : action.name;
        
        const diceRollRequests: DiceRollRequest[] = [
            {
                rollNotation: `1d20+${attackBonus}`,
                description: `Ataque con ${displayWeaponName} a ${targetName}`,
                roller: rollerName || enemy.name,
                attackType: 'attack_roll',
                attributeUsed: attributeUsed,
                attackRange: attackRange
            },
            {
                rollNotation: damageNotation, // API usually includes the bonus in the string (e.g. "1d6+2")
                description: `Daño de ${displayWeaponName}`,
                roller: rollerName || enemy.name,
                attackType: 'damage_roll',
                attributeUsed: attributeUsed,
                attackRange: attackRange
            }
        ];

        return {
            success: true,
            diceRollRequests,
            actionDescription: `${enemy.name} usa ${action.name} contra ${targetName}.`
        };
    }
}
