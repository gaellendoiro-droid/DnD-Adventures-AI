/**
 * @fileOverview Combat Action Processor
 * Handles processing of combat actions (attacks, spells, items, etc.)
 * Extracted from combat-manager.ts to improve modularity and testability.
 */

import { log } from '@/lib/logger';
import type { Character, InventoryItem } from '@/lib/types';
import type { Combatant, DiceRoll } from '@/lib/types';
import { resolveEnemyId } from '@/lib/combat/target-resolver';
import { getVisualName } from '@/lib/combat/monster-name-manager';
import type { CombatantState } from '@/lib/combat/rules-engine';
import {
    applyDamage,
    validateAndClampHP,
    getCriticalDamageNotation,
    checkEndOfCombat,
} from '@/lib/combat/rules-engine';

// --- Types ---

export interface AttackContext {
    attacker: Combatant;
    targetId: string;
    playerAction: string;
    initiativeOrder: Combatant[];
    party: Character[];
    enemies: any[]; // Using any[] to match CombatManager's flexible enemy type
    locationContext?: any;
    diceRollerTool: (input: any) => Promise<any>;
    combatNarrationExpertTool: (input: any) => Promise<any>;
    updateRollNotationWithModifiers: (roll: any, character: Character, isAttackRoll: boolean) => void;
    localLog: (message: string) => void;
}

export interface AttackResult {
    success: boolean;
    messages: Array<{ sender: string; content: string; originalContent?: string }>;
    diceRolls: DiceRoll[];
    updatedParty: Character[];
    updatedEnemies: any[];
    combatEnded: boolean;
    endReason?: string;
    error?: string;
}

// --- Combat Action Processor ---

export class CombatActionProcessor {
    /**
     * Processes a player attack action.
     * Handles target resolution, attack rolls, damage application, and narration.
     */
    static async processPlayerAttack(context: AttackContext): Promise<AttackResult> {
        const {
            attacker,
            targetId,
            playerAction,
            initiativeOrder,
            party,
            enemies,
            locationContext,
            diceRollerTool,
            combatNarrationExpertTool,
            updateRollNotationWithModifiers,
            localLog,
        } = context;

        const messages: Array<{ sender: string; content: string; originalContent?: string }> = [];
        const diceRolls: DiceRoll[] = [];
        let updatedParty = [...party];
        let updatedEnemies = [...enemies];

        try {
            // Resolve targetId (can be visual name or uniqueId)
            const resolved = resolveEnemyId(targetId, updatedEnemies, initiativeOrder, updatedParty);

            // Handle ambiguity
            if (resolved.ambiguous) {
                const baseName = targetId.split(/\s+\d+$/)[0] || targetId;
                const clarificationMessage = `Hay múltiples ${baseName}. ¿A cuál te refieres? ${resolved.matches.join(' o ')}`;
                return {
                    success: false,
                    messages: [{ sender: 'DM', content: clarificationMessage }],
                    diceRolls: [],
                    updatedParty,
                    updatedEnemies,
                    combatEnded: false,
                    error: 'TARGET_AMBIGUOUS',
                };
            }

            // Use resolved uniqueId to find target
            const resolvedTargetId = resolved.uniqueId || targetId;
            const target = [...updatedParty, ...updatedEnemies].find(
                c => c.id === resolvedTargetId || (c as any).uniqueId === resolvedTargetId
            );

            if (!target) {
                localLog(`Target not found: ${targetId} (resolved: ${resolvedTargetId})`);
                return {
                    success: false,
                    messages: [{ sender: 'DM', content: 'No puedes encontrar ese objetivo.' }],
                    diceRolls: [],
                    updatedParty,
                    updatedEnemies,
                    combatEnded: false,
                    error: 'TARGET_NOT_FOUND',
                };
            }

            // Get visual name for target
            const targetVisualName = getVisualName(
                (target as any).uniqueId || target.id,
                initiativeOrder,
                updatedEnemies
            );

            localLog(`Player ${attacker.characterName} attacks ${targetVisualName}`);

            // Get player character data
            const playerChar = updatedParty.find(p => p.id === attacker.id);
            if (!playerChar) {
                localLog(`ERROR: Player character not found in party: ${attacker.id}`);
                return {
                    success: false,
                    messages: [{ sender: 'DM', content: 'Hubo un error al procesar el ataque.' }],
                    diceRolls: [],
                    updatedParty,
                    updatedEnemies,
                    combatEnded: false,
                    error: 'PLAYER_NOT_FOUND',
                };
            }

            // Calculate attack modifiers
            const proficiencyBonus = playerChar.proficiencyBonus ?? 2;
            const strMod = playerChar.abilityModifiers?.fuerza || 0;
            const dexMod = playerChar.abilityModifiers?.destreza || 0;
            const abilityMod = Math.max(strMod, dexMod);
            const attackMod = abilityMod + proficiencyBonus;
            const damageMod = abilityMod;

            // Determine weapon and damage die
            const weapon = playerChar.inventory.find((item: InventoryItem) =>
                item.description?.toLowerCase().includes('daño') ||
                item.name.toLowerCase().includes('espada') ||
                item.name.toLowerCase().includes('mandoble') ||
                item.name.toLowerCase().includes('maza') ||
                item.name.toLowerCase().includes('daga') ||
                item.name.toLowerCase().includes('bastón') ||
                item.name.toLowerCase().includes('arco')
            );

            const weaponName = weapon?.name || 'su arma';
            const damageDie = weapon?.description?.match(/(\d+d\d+)/)?.[0] || '1d8';

            log.debug('Player attack modifiers', {
                module: 'CombatActionProcessor',
                player: attacker.characterName,
                proficiencyBonus,
                strMod,
                dexMod,
                abilityMod,
                attackMod,
                damageMod,
                damageDie,
            });

            // Generate attack roll
            const attackRollResult = await diceRollerTool({
                rollNotation: `1d20+${attackMod}`,
                description: `Tirada de ataque con ${weaponName}`,
                roller: attacker.characterName,
            });

            updateRollNotationWithModifiers(attackRollResult, playerChar, true);

            // Validate target AC
            let finalTargetAC: number;
            if (target.ac === undefined || target.ac === null) {
                log.warn('Attack roll processed but target AC is missing', {
                    module: 'CombatActionProcessor',
                    targetId: target.id,
                    targetName: targetVisualName,
                    roller: attacker.characterName,
                });
                finalTargetAC = 10;
            } else {
                const targetAC = typeof target.ac === 'number' ? target.ac : parseInt(String(target.ac), 10);
                if (isNaN(targetAC)) {
                    log.warn('Target AC is not a valid number, using default', {
                        module: 'CombatActionProcessor',
                        targetId: target.id,
                        targetAC: target.ac,
                    });
                    finalTargetAC = 10;
                } else {
                    finalTargetAC = targetAC;
                }
            }

            const attackHit = attackRollResult.totalResult >= finalTargetAC;
            const isCritical = attackRollResult.outcome === 'crit';
            const isFumble = attackRollResult.outcome === 'pifia';

            // Update attack roll with combat information
            const updatedAttackRoll = {
                ...attackRollResult,
                targetName: targetVisualName,
                targetAC: finalTargetAC,
                attackHit: attackHit,
                outcome: attackHit ? (isCritical ? 'crit' : 'success') : (isFumble ? 'pifia' : 'fail'),
            };
            diceRolls.push(updatedAttackRoll);

            log.debug('Player attack roll processed', {
                module: 'CombatActionProcessor',
                roller: attacker.characterName,
                targetName: targetVisualName,
                targetAC: finalTargetAC,
                attackHit: attackHit,
                outcome: updatedAttackRoll.outcome,
                rollTotal: attackRollResult.totalResult,
            });

            // Declare damage roll result for later use
            let damageRollResult: any = null;
            let targetWasKilled = false;
            let previousHP: number | undefined;
            let newHP: number | undefined;

            if (attackHit) {
                // Technical messages will be replaced by descriptive narration
                // No need to generate technical hit messages here

                // Generate damage roll
                const damageNotation = getCriticalDamageNotation(damageDie, damageMod, isCritical);
                damageRollResult = await diceRollerTool({
                    rollNotation: damageNotation,
                    description: `Tirada de daño con ${weaponName}${isCritical ? ' (crítico)' : ''}`,
                    roller: attacker.characterName,
                });

                updateRollNotationWithModifiers(damageRollResult, playerChar, false);

                // Validate damage is positive
                if (damageRollResult.totalResult <= 0) {
                    log.warn('Damage roll resulted in non-positive damage', {
                        module: 'CombatActionProcessor',
                        damage: damageRollResult.totalResult,
                        roller: attacker.characterName,
                    });
                    messages.push({
                        sender: 'DM',
                        content: `${attacker.characterName} intenta hacer daño a ${targetVisualName}, pero no causa ningún daño.`
                    });
                } else {
                    // Apply damage to target
                    const targetIsEnemy = updatedEnemies.some(e => (e as any).uniqueId === (target as any).uniqueId);
                    const targetObj = targetIsEnemy
                        ? updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)
                        : updatedParty.find(p => p.id === target.id);

                    previousHP = targetObj?.hp.current;
                    newHP = previousHP;

                    if (targetObj) {
                        const damage = damageRollResult.totalResult;

                        // Apply damage using Rules Engine
                        const damageResult = applyDamage(targetObj, damage);
                        newHP = damageResult.newHP;

                        // Update target state
                        const updatedTarget = {
                            ...targetObj,
                            hp: {
                                ...targetObj.hp,
                                current: damageResult.newHP
                            },
                            isDead: damageResult.isDead
                        };

                        // Update arrays
                        if (targetIsEnemy) {
                            updatedEnemies = updatedEnemies.map(e =>
                                (e as any).uniqueId === (target as any).uniqueId ? validateAndClampHP(updatedTarget) : e
                            );
                        } else {
                            updatedParty = updatedParty.map(p =>
                                p.id === target.id ? validateAndClampHP(updatedTarget) : p
                            );
                        }

                        // Status information will be integrated into resolution narration
                        // No separate status messages needed - combat-narration-expert will handle it
                        if (damageResult.isDead && targetIsEnemy) {
                            targetWasKilled = true;
                            // Death status will be integrated into resolution narration by combat-narration-expert
                            localLog(`${attacker.characterName} killed ${targetVisualName}!`);
                        }
                        // Note: isMassiveDamage and isUnconscious status will be passed to narration expert for context
                    }

                    // Technical damage messages will be replaced by descriptive narration
                    // No need to generate technical damage messages here
                }

                // Update damage roll with combat information
                const updatedDamageRoll = {
                    ...damageRollResult,
                    targetName: targetVisualName,
                    damageDealt: damageRollResult.totalResult,
                    targetKilled: targetWasKilled,
                    outcome: isCritical ? 'crit' : damageRollResult.outcome,
                };
                diceRolls.push(updatedDamageRoll);
            } else {
                // Attack missed - technical messages will be replaced by descriptive narration
                // No need to generate technical miss messages here
                log.debug('Player attack missed', {
                    module: 'CombatActionProcessor',
                    rollTotal: attackRollResult.totalResult,
                    targetAC: finalTargetAC,
                    isPifia: isFumble,
                });
            }

            // Generate descriptive combat narration
            try {
                let narrativeAttackResult: 'hit' | 'miss' | 'critical' | 'fumble';
                if (isCritical) {
                    narrativeAttackResult = 'critical';
                } else if (isFumble) {
                    narrativeAttackResult = 'fumble';
                } else if (attackHit) {
                    narrativeAttackResult = 'hit';
                } else {
                    narrativeAttackResult = 'miss';
                }

                // Prepare narration input
                const narrationInput: any = {
                    attackerName: attacker.characterName,
                    targetName: targetVisualName,
                    actionDescription: playerAction, // Use player action as action description
                    playerAction: playerAction,
                    attackResult: narrativeAttackResult,
                };

                // Add damage and HP information if attack hit
                if (attackHit && damageRollResult && damageRollResult.totalResult > 0) {
                    const targetIsEnemy = updatedEnemies.some(e => (e as any).uniqueId === (target as any).uniqueId);
                    const currentHP = targetIsEnemy
                        ? updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)?.hp.current
                        : updatedParty.find(p => p.id === target.id)?.hp.current;

                    narrationInput.damageDealt = damageRollResult.totalResult;
                    narrationInput.targetPreviousHP = previousHP;
                    narrationInput.targetNewHP = currentHP;

                    // Check if target was killed or knocked out
                    if (currentHP !== undefined && currentHP <= 0) {
                        const updatedTarget = targetIsEnemy
                            ? updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)
                            : updatedParty.find(p => p.id === target.id);

                        const targetIsDead = updatedTarget?.isDead === true;

                        if (targetIsEnemy || targetIsDead) {
                            narrationInput.targetKilled = true;
                        } else {
                            narrationInput.targetKnockedOut = true;
                        }
                    }
                }

                // Add location context if available
                if (locationContext && typeof locationContext === 'object') {
                    narrationInput.locationDescription = (locationContext as any).description || '';
                }

                // Generate combat narration
                localLog(`Generating combat narration for ${attacker.characterName}'s action...`);
                const narrationResult = await combatNarrationExpertTool(narrationInput);

                if (narrationResult.narration) {
                    messages.push({
                        sender: 'DM',
                        content: narrationResult.narration
                    });
                    localLog(`Combat narration generated: ${narrationResult.narration.substring(0, 100)}...`);
                }
            } catch (narrationError) {
                // If narration generation fails, log it but don't break combat flow
                log.warn('Failed to generate combat narration', {
                    module: 'CombatActionProcessor',
                    error: narrationError instanceof Error ? narrationError.message : String(narrationError),
                    player: attacker.characterName,
                    target: targetVisualName,
                });
                localLog(`Warning: Combat narration generation failed: ${narrationError}`);
            }

            // Check if combat has ended
            const endOfCombatCheck = checkEndOfCombat(updatedParty, updatedEnemies);

            return {
                success: true,
                messages,
                diceRolls,
                updatedParty,
                updatedEnemies,
                combatEnded: endOfCombatCheck.combatEnded,
                endReason: endOfCombatCheck.reason || undefined,
            };

        } catch (error) {
            log.error('Error processing player attack', {
                module: 'CombatActionProcessor',
                error: error instanceof Error ? error.message : String(error),
                player: attacker.characterName,
                target: targetId,
            });

            return {
                success: false,
                messages: [{ sender: 'DM', content: `Hubo un error al procesar el ataque de ${attacker.characterName}.` }],
                diceRolls: [],
                updatedParty: party,
                updatedEnemies: enemies,
                combatEnded: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
