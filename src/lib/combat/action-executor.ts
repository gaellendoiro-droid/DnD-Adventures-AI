/**
 * @fileOverview Combat Action Executor (Unified)
 * Executes any combat action (attack, spell, heal, etc.) regardless of who executes it.
 * This module unifies the logic from action-processor.ts and dice-roll-processor.ts.
 * 
 * Key principles:
 * - Works for both Player and AI combatants
 * - Uses RulesEngine for consistent damage application
 * - Returns structured results (NO messages - that's TurnProcessor's responsibility)
 * - Processes dice rolls in order (attack → damage/healing)
 */

import { log } from '@/lib/logger';
import type { Character, DiceRoll } from '@/lib/types';
import type { Combatant } from '@/lib/types';
import { getVisualName } from '@/lib/combat/monster-name-manager';
import {
    applyDamage,
    validateAndClampHP,
    getCriticalDamageNotation,
    checkEndOfCombat,
    type CombatantState,
} from '@/lib/combat/rules-engine';
import { updateRollNotationWithModifiers } from '@/lib/combat/roll-notation-utils';

// --- Types ---

/**
 * Request for a dice roll (before execution)
 */
export interface DiceRollRequest {
    rollNotation: string; // e.g., "1d20+5", "2d6+3"
    description: string; // e.g., "Tirada de ataque", "Tirada de daño"
    roller?: string; // Character name (defaults to combatant.characterName)
    attackType?: 'attack' | 'saving_throw'; // For spells
}

/**
 * Input for executing a combat action
 */
export interface CombatActionInput {
    /** The combatant executing the action */
    combatant: Combatant;
    /** The action to execute */
    action: {
        type: 'attack' | 'spell' | 'heal';
        targetId: string;
        /** Dice roll requests to execute (in order: attack → damage/healing) */
        diceRollRequests: DiceRollRequest[];
        /** Description of the action for context */
        actionDescription?: string;
    };
    /** Current party state */
    party: Character[];
    /** Current enemies state */
    enemies: any[];
    /** Initiative order for context */
    initiativeOrder: Combatant[];
    /** Tool to execute dice rolls (injected for testability) */
    diceRollerTool: (input: any) => Promise<any>;
    /** Optional: Function to update roll notation with modifiers (for player characters) */
    updateRollNotationWithModifiers?: (roll: DiceRoll, character: Character, isAttackRoll: boolean) => void;
}

/**
 * Result of executing a combat action
 */
export interface CombatActionResult {
    /** Whether the action was executed successfully */
    success: boolean;
    /** All dice rolls executed (with combat information added) */
    diceRolls: DiceRoll[];
    /** Updated party state */
    updatedParty: Character[];
    /** Updated enemies state */
    updatedEnemies: any[];
    /** Combat result information */
    combatResult: {
        /** Whether the attack hit (for attacks) */
        attackHit?: boolean;
        /** Whether it was a critical hit */
        wasCritical?: boolean;
        /** Whether it was a fumble */
        wasFumble?: boolean;
        /** Damage dealt (if any) */
        damageDealt?: number;
        /** Healing amount (if any) */
        healingAmount?: number;
        /** Whether target was killed */
        targetKilled?: boolean;
        /** Whether target was knocked unconscious */
        targetKnockedOut?: boolean;
        /** Target's HP before the action */
        targetPreviousHP?: number;
        /** Target's HP after the action */
        targetNewHP?: number;
        /** Target's AC (for attacks) */
        targetAC?: number;
        /** Target visual name */
        targetName?: string;
        /** Whether combat ended */
        combatEnded?: boolean;
        /** Reason combat ended (if it did) */
        endReason?: string;
    };
    /** Error message if action failed */
    error?: string;
}

// --- Combat Action Executor ---

export class CombatActionExecutor {
    /**
     * Executes a combat action (attack, spell, or heal).
     * Processes dice rolls in order and applies results using RulesEngine.
     * 
     * @param input Action input with dice rolls and context
     * @returns Structured result with updated state and combat information
     */
    static async execute(input: CombatActionInput): Promise<CombatActionResult> {
        const {
            combatant,
            action,
            party: initialParty,
            enemies: initialEnemies,
            initiativeOrder,
            diceRollerTool,
            updateRollNotationWithModifiers,
        } = input;

        let updatedParty = [...initialParty];
        let updatedEnemies = [...initialEnemies];
        const diceRolls: DiceRoll[] = [];
        const combatResult: CombatActionResult['combatResult'] = {};

        try {
            // Find target
            const target = [...updatedParty, ...updatedEnemies].find(
                c => c.id === action.targetId || (c as any).uniqueId === action.targetId
            );

            if (!target) {
                log.warn('Target not found in CombatActionExecutor', {
                    module: 'CombatActionExecutor',
                    targetId: action.targetId,
                    combatant: combatant.characterName,
                });
                return {
                    success: false,
                    diceRolls: [],
                    updatedParty: initialParty,
                    updatedEnemies: initialEnemies,
                    combatResult: {},
                    error: 'TARGET_NOT_FOUND',
                };
            }

            // Get visual name for target
            const targetVisualName = getVisualName(
                (target as any).uniqueId || target.id,
                initiativeOrder,
                updatedEnemies
            );
            combatResult.targetName = targetVisualName;

            // Validate target AC for attacks
            if (action.type === 'attack') {
                let finalTargetAC: number;
                if (target.ac === undefined || target.ac === null) {
                    log.warn('Target AC is missing, using default', {
                        module: 'CombatActionExecutor',
                        targetId: target.id,
                        targetName: targetVisualName,
                    });
                    finalTargetAC = 10;
                } else {
                    const targetAC = typeof target.ac === 'number' ? target.ac : parseInt(String(target.ac), 10);
                    finalTargetAC = isNaN(targetAC) ? 10 : targetAC;
                }
                combatResult.targetAC = finalTargetAC;
            }

            // Process dice rolls in order
            let attackHit = false;
            let wasCritical = false;
            let wasFumble = false;
            let attackRoll: DiceRoll | null = null;

            for (let i = 0; i < action.diceRollRequests.length; i++) {
                const rollRequest = action.diceRollRequests[i];
                const rollDescription = (rollRequest.description || '').toLowerCase();
                const isAttackRoll = rollDescription.includes('attack') || rollDescription.includes('ataque');
                const isDamageRoll = rollDescription.includes('damage') || rollDescription.includes('daño');
                const isHealingRoll = rollDescription.includes('healing') || rollDescription.includes('curación') || rollDescription.includes('cura');

                // Execute the dice roll
                const rollResult = await diceRollerTool({
                    roller: rollRequest.roller || combatant.characterName,
                    rollNotation: rollRequest.rollNotation,
                    description: rollRequest.description,
                });

                // Update roll notation with modifiers if function provided (for player characters)
                const character = updatedParty.find(p => p.id === combatant.id);
                if (character && updateRollNotationWithModifiers) {
                    updateRollNotationWithModifiers(rollResult, character, isAttackRoll);
                }

                // Create roll with combat information
                const roll: DiceRoll = {
                    ...rollResult,
                    roller: rollRequest.roller || combatant.characterName,
                    rollNotation: rollRequest.rollNotation,
                    description: rollRequest.description,
                };

                // Process attack roll
                if (isAttackRoll) {
                    attackRoll = roll;
                    wasCritical = rollResult.outcome === 'crit';
                    wasFumble = rollResult.outcome === 'pifia';

                    if (action.type === 'attack' && combatResult.targetAC !== undefined) {
                        attackHit = rollResult.totalResult >= combatResult.targetAC;
                    } else {
                        // For spells that don't require attack rolls, assume hit
                        attackHit = true;
                    }

                    // Update roll with combat information
                    roll.targetName = targetVisualName;
                    roll.targetAC = combatResult.targetAC;
                    roll.attackHit = attackHit;
                    roll.outcome = attackHit
                        ? (wasCritical ? 'crit' : 'success')
                        : (wasFumble ? 'pifia' : 'fail');

                    combatResult.attackHit = attackHit;
                    combatResult.wasCritical = wasCritical;
                    combatResult.wasFumble = wasFumble;

                    diceRolls.push(roll);

                    // If attack missed and it's not a saving throw spell, skip damage
                    if (!attackHit && action.type === 'attack') {
                        log.debug('Attack missed, skipping damage rolls', {
                            module: 'CombatActionExecutor',
                            combatant: combatant.characterName,
                            rollTotal: rollResult.totalResult,
                            targetAC: combatResult.targetAC,
                        });
                        break; // Skip remaining rolls
                    }
                }
                // Process damage roll
                else if (isDamageRoll) {
                    // Validate attack hit first (unless it's a saving throw spell)
                    if (attackRoll === null && action.type === 'attack') {
                        log.warn('Damage roll without prior attack roll - SKIPPING', {
                            module: 'CombatActionExecutor',
                            combatant: combatant.characterName,
                        });
                        continue;
                    }

                    if (!attackHit && action.type === 'attack') {
                        log.debug('Skipping damage roll because attack missed', {
                            module: 'CombatActionExecutor',
                            combatant: combatant.characterName,
                        });
                        continue;
                    }

                    // Adjust damage for critical hits
                    let damage = rollResult.totalResult;
                    if (wasCritical && action.type === 'attack') {
                        // Damage dice should already be doubled, but we verify
                        log.debug('Damage calculated for critical hit', {
                            module: 'CombatActionExecutor',
                            damage,
                            wasCritical,
                        });
                    }

                    // Validate damage is positive
                    if (damage <= 0) {
                        log.warn('Damage roll resulted in non-positive damage', {
                            module: 'CombatActionExecutor',
                            damage,
                            combatant: combatant.characterName,
                        });
                        continue;
                    }

                    // Get target's current HP
                    const targetIsEnemy = updatedEnemies.some(e => (e as any).uniqueId === (target as any).uniqueId || e.id === target.id);
                    const targetObj = targetIsEnemy
                        ? updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId || e.id === target.id)
                        : updatedParty.find(p => p.id === target.id);

                    if (!targetObj) {
                        log.warn('Target object not found when applying damage', {
                            module: 'CombatActionExecutor',
                            targetId: action.targetId,
                        });
                        continue;
                    }

                    combatResult.targetPreviousHP = targetObj.hp.current;

                    // Apply damage using RulesEngine
                    // Pass targetIsEnemy to correctly handle death vs unconsciousness
                    const damageResult = applyDamage(targetObj as CombatantState, damage, targetIsEnemy);
                    const newHP = damageResult.newHP;

                    // Update target state
                    const updatedTarget = {
                        ...targetObj,
                        hp: {
                            ...targetObj.hp,
                            current: newHP,
                        },
                        isDead: damageResult.isDead,
                    };

                    // Update arrays
                    if (targetIsEnemy) {
                        updatedEnemies = updatedEnemies.map(e =>
                            ((e as any).uniqueId === (target as any).uniqueId || e.id === target.id)
                                ? validateAndClampHP(updatedTarget as CombatantState)
                                : e
                        );
                    } else {
                        updatedParty = updatedParty.map(p =>
                            p.id === target.id
                                ? validateAndClampHP(updatedTarget as CombatantState)
                                : p
                        );
                    }

                    // Get updated target to check final state
                    const finalTarget = targetIsEnemy
                        ? updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId || e.id === target.id)
                        : updatedParty.find(p => p.id === target.id);

                    combatResult.targetNewHP = finalTarget?.hp.current;
                    combatResult.damageDealt = damage;
                    combatResult.targetKilled = damageResult.isDead;
                    combatResult.targetKnockedOut = damageResult.isUnconscious && !damageResult.isDead;

                    // Update roll with damage information
                    roll.targetName = targetVisualName;
                    roll.damageDealt = damage;
                    roll.targetKilled = damageResult.isDead;
                    roll.outcome = wasCritical ? 'crit' : rollResult.outcome;

                    diceRolls.push(roll);
                }
                // Process healing roll
                else if (isHealingRoll) {
                    // Validate healing is positive
                    if (rollResult.totalResult <= 0) {
                        log.warn('Healing roll resulted in non-positive healing', {
                            module: 'CombatActionExecutor',
                            healing: rollResult.totalResult,
                            combatant: combatant.characterName,
                        });
                        continue;
                    }

                    const healing = rollResult.totalResult;
                    const targetIsEnemy = updatedEnemies.some(e => (e as any).uniqueId === (target as any).uniqueId || e.id === target.id);
                    const targetObj = targetIsEnemy
                        ? updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId || e.id === target.id)
                        : updatedParty.find(p => p.id === target.id);

                    if (!targetObj) {
                        log.warn('Target object not found when applying healing', {
                            module: 'CombatActionExecutor',
                            targetId: action.targetId,
                        });
                        continue;
                    }

                    const previousHP = targetObj.hp.current;
                    const wasUnconscious = previousHP <= 0;

                    // Apply healing
                    const updatedTarget = {
                        ...targetObj,
                        hp: {
                            ...targetObj.hp,
                            current: Math.min(targetObj.hp.max, previousHP + healing),
                        },
                        isDead: false, // Healing revives unconscious characters
                    };

                    // Update arrays
                    if (targetIsEnemy) {
                        updatedEnemies = updatedEnemies.map(e =>
                            ((e as any).uniqueId === (target as any).uniqueId || e.id === target.id)
                                ? validateAndClampHP(updatedTarget as CombatantState)
                                : e
                        );
                    } else {
                        updatedParty = updatedParty.map(p =>
                            p.id === target.id
                                ? validateAndClampHP(updatedTarget as CombatantState)
                                : p
                        );
                    }

                    const finalTarget = targetIsEnemy
                        ? updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId || e.id === target.id)
                        : updatedParty.find(p => p.id === target.id);

                    combatResult.targetPreviousHP = previousHP;
                    combatResult.targetNewHP = finalTarget?.hp.current;
                    combatResult.healingAmount = healing;

                    // Update roll with healing information
                    roll.targetName = targetVisualName;
                    roll.healingAmount = healing;

                    diceRolls.push(roll);
                }
                // Unknown roll type - just add it
                else {
                    diceRolls.push(roll);
                }
            }

            // Check if combat has ended
            const endOfCombatCheck = checkEndOfCombat(updatedParty as CombatantState[], updatedEnemies as CombatantState[]);
            combatResult.combatEnded = endOfCombatCheck.combatEnded;
            combatResult.endReason = endOfCombatCheck.reason || undefined;

            return {
                success: true,
                diceRolls,
                updatedParty,
                updatedEnemies,
                combatResult,
            };

        } catch (error) {
            log.error('Error executing combat action', {
                module: 'CombatActionExecutor',
                error: error instanceof Error ? error.message : String(error),
                combatant: combatant.characterName,
                actionType: action.type,
            });

            return {
                success: false,
                diceRolls: [],
                updatedParty: initialParty,
                updatedEnemies: initialEnemies,
                combatResult: {},
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}

