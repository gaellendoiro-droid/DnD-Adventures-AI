/**
 * @fileOverview Dice Roll Processor
 * Handles processing of dice rolls for AI combatants (enemies and companions).
 * This module centralizes roll processing logic that was previously duplicated
 * between normal turns and combat initiation.
 * 
 * This module is part of the Fase 2.1 refactorization and resolves Issue #21.
 */

import type { GameMessage, DiceRoll, Combatant } from '@/lib/types';
import { log } from '@/lib/logger';
import { diceRollerTool } from '../dice-roller';
import { getVisualName } from '@/lib/combat/monster-name-manager';
import {
    getHpStatus,
    validateAndClampHP,
    isUnconsciousOrDead,
    checkEndOfCombat,
} from './combat-validators';

/**
 * Duplicates damage dice for critical hits according to D&D 5e rules.
 * In D&D 5e, a critical hit doubles the damage dice, but not the modifier.
 * 
 * @param rollNotation - The damage roll notation (e.g., "1d8+2", "2d6+3")
 * @param isCritical - Whether this is a critical hit
 * @returns The modified damage roll notation (e.g., "2d8+2" for a critical with 1d8+2)
 * 
 * @example
 * getCriticalDamageNotation("1d8+3", true) // Returns "2d8+3"
 * getCriticalDamageNotation("1d8+3", false) // Returns "1d8+3"
 * getCriticalDamageNotation("2d6+2", true) // Returns "4d6+2"
 */
export function getCriticalDamageNotation(rollNotation: string, isCritical: boolean): string {
    if (!isCritical) {
        return rollNotation;
    }
    
    // Parse the damage roll notation (e.g., "1d8+2" -> {numDice: 1, dieType: 8, modifier: 2})
    // Also supports notation without modifier (e.g., "1d8" -> {numDice: 1, dieType: 8, modifier: 0})
    const diceMatch = rollNotation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    
    if (!diceMatch) {
        log.warn('Invalid damage roll notation for critical, using as-is', {
            module: 'DiceRollProcessor',
            rollNotation,
        });
        // Fallback: return original notation
        return rollNotation;
    }
    
    const numDice = parseInt(diceMatch[1], 10);
    const dieType = diceMatch[2];
    const modifier = diceMatch[3] || '';
    
    // In D&D 5e, critical hits double the number of dice, not the modifier
    const finalNumDice = numDice * 2;
    
    return `${finalNumDice}d${dieType}${modifier}`;
}

/**
 * Updates a dice roll's notation to show individual modifiers instead of a single sum.
 * This function works for player characters, companions, and enemies.
 * 
 * @param roll - The dice roll to update (will be modified in place)
 * @param character - Character data with abilityModifiers and proficiencyBonus
 * @param isAttackRoll - Whether this is an attack roll (includes proficiency bonus) or damage roll (doesn't)
 */
export function updateRollNotationWithModifiers(
    roll: DiceRoll,
    character: any,
    isAttackRoll: boolean = false
): void {
    if (!character || !character.abilityModifiers || character.proficiencyBonus === undefined) {
        return; // Can't update without character data
    }
    
    const strMod = character.abilityModifiers.fuerza || 0;
    const dexMod = character.abilityModifiers.destreza || 0;
    const abilityMod = Math.max(strMod, dexMod);
    const proficiencyBonus = character.proficiencyBonus ?? 2;
    
    // Parse the original rollNotation to extract base dice (e.g., "1d20" or "1d8")
    const diceMatch = roll.rollNotation.match(/^(\d+d\d+)/);
    if (!diceMatch) {
        return; // Can't parse, return as-is
    }
    
    const baseDice = diceMatch[1];
    const modifiers: Array<{ value: number; label: string }> = [];
    
    if (isAttackRoll) {
        // Attack roll: ability modifier + proficiency bonus
        modifiers.push(
            { value: abilityMod, label: abilityMod === strMod ? 'FUE' : 'DES' },
            { value: proficiencyBonus, label: 'BC' }
        );
        
        const abilityStr = abilityMod >= 0 ? `+${abilityMod}` : `${abilityMod}`;
        const profStr = proficiencyBonus >= 0 ? `+${proficiencyBonus}` : `${proficiencyBonus}`;
        roll.rollNotation = `${baseDice}${abilityStr}${profStr}`;
    } else {
        // Damage roll: only ability modifier (no proficiency)
        if (abilityMod !== 0) {
            modifiers.push({ value: abilityMod, label: abilityMod === strMod ? 'FUE' : 'DES' });
            const abilityStr = abilityMod >= 0 ? `+${abilityMod}` : `${abilityMod}`;
            roll.rollNotation = `${baseDice}${abilityStr}`;
        }
    }
    
    roll.modifiers = modifiers;
}

/**
 * Result of processing AI combatant rolls
 */
export interface ProcessAICombatantRollsResult {
    diceRolls: DiceRoll[];
    messages: GameMessage[];
    updatedParty: any[];
    updatedEnemies: any[];
    combatEnded: boolean;
}

/**
 * Parameters for processing AI combatant rolls
 */
export interface ProcessAICombatantRollsParams {
    activeCombatant: Combatant;
    requestedRolls: any[];
    target: any;
    updatedParty: any[];
    updatedEnemies: any[];
    newInitiativeOrder: Combatant[];
    localLog: (message: string) => void;
    diceRoller?: typeof diceRollerTool; // Inyección de dependencia opcional
}

/**
 * Processes all dice rolls for an AI combatant (enemy or companion).
 * Handles attack, damage, and healing rolls with proper validation and sequencing.
 * 
 * This function centralizes roll processing logic that was previously duplicated
 * in normal turns and combat initiation (Issue #21).
 * 
 * @param params Processing parameters
 * @returns Result with updated rolls, messages, party, enemies, and combat status
 */
export async function processAICombatantRolls(
    params: ProcessAICombatantRollsParams
): Promise<ProcessAICombatantRollsResult> {
    const {
        activeCombatant,
        requestedRolls,
        target,
        updatedParty: initialParty,
        updatedEnemies: initialEnemies,
        newInitiativeOrder,
        localLog,
        diceRoller = diceRollerTool, // Usar el inyectado o el original
    } = params;

    let updatedParty = initialParty;
    let updatedEnemies = initialEnemies;
    const diceRolls: DiceRoll[] = [];
    const messages: GameMessage[] = [];
    let combatEnded = false;

    // Get visual name for target
    const targetVisualName = getVisualName(
        (target as any).uniqueId || target.id,
        newInitiativeOrder,
        updatedEnemies
    );

    localLog(`Found target: ${targetVisualName}`);

    // Track attack result to ensure damage only applies if attack hits
    let attackHit = false;
    let attackRoll: any = null;
    let wasCritical = false;

    // Log what rolls the tactician requested
    log.debug('Processing rolls for AI combatant', {
        module: 'DiceRollProcessor',
        combatant: activeCombatant.characterName,
        rollsCount: requestedRolls.length,
        rollDescriptions: requestedRolls.map((r: any) => r.description),
    });

    // Process rolls in order: attack first, then damage/healing
    for (const rollRequest of requestedRolls) {
        try {
            // Check if this is a damage roll and if previous attack was critical
            const rollDescription = (rollRequest.description || '').toLowerCase();
            const isDamageRoll = rollDescription.includes('damage') || rollDescription.includes('daño');
            
            // Adjust damage dice for critical hits (Issue #50)
            let adjustedRollNotation = rollRequest.rollNotation;
            if (isDamageRoll && wasCritical) {
                adjustedRollNotation = getCriticalDamageNotation(rollRequest.rollNotation, true);
                log.debug('Adjusted damage roll for critical hit', {
                    module: 'DiceRollProcessor',
                    original: rollRequest.rollNotation,
                    adjusted: adjustedRollNotation,
                });
            }
            
            // Make the actual dice roll using the injected roller
            const rollResult = await diceRoller({
                roller: rollRequest.roller,
                rollNotation: adjustedRollNotation,
                description: rollRequest.description,
            });
            
            // Store the adjusted notation if it was modified for critical
            const roll: DiceRoll = {
                ...rollResult,
                roller: rollRequest.roller,
                rollNotation: adjustedRollNotation,
                description: isDamageRoll && wasCritical 
                    ? `${rollRequest.description} (crítico)`
                    : rollRequest.description,
                // Set outcome to 'crit' for critical damage rolls
                outcome: isDamageRoll && wasCritical ? 'crit' : rollResult.outcome,
            };
            
            // Try to find character data for companions to update notation with modifiers
            const isAttackRoll = rollDescription.includes('attack') || rollDescription.includes('ataque');
            const companionChar = initialParty.find(p => p.id === activeCombatant.id);
            if (companionChar) {
                // This is a companion, update notation with modifiers
                updateRollNotationWithModifiers(roll, companionChar, isAttackRoll);
            }
            // Note: For enemies, we don't have structured character data with abilityModifiers/proficiencyBonus,
            // so we can't break down modifiers. The AI should generate the correct notation, but if not, it will show as-is
            
            diceRolls.push(roll);

            // Extract attackType from rollData (provided by AI tactician)
            const attackType = (rollRequest as any).attackType;

            // Fallback to keyword detection if attackType is not provided (for backward compatibility)
            const isSavingThrowFromKeywords =
                rollDescription.includes('saving') ||
                rollDescription.includes('salvación') ||
                rollDescription.includes('save') ||
                rollDescription.includes('salvacion');

            // Determine if this is a saving throw spell (prefer explicit attackType, fallback to keywords)
            const isSavingThrow = attackType === 'saving_throw' || (!attackType && isSavingThrowFromKeywords);

            log.debug('Processing individual roll', {
                module: 'DiceRollProcessor',
                combatant: activeCombatant.characterName,
                description: roll.description,
                attackType: attackType || 'not specified',
                isAttack: rollDescription.includes('attack') || rollDescription.includes('ataque'),
                isDamage: rollDescription.includes('damage') || rollDescription.includes('daño'),
                isHealing:
                    rollDescription.includes('healing') ||
                    rollDescription.includes('curación') ||
                    rollDescription.includes('cura'),
                isSavingThrow: isSavingThrow,
            });

            // Process attack roll (check both English and Spanish)
            if (rollDescription.includes('attack') || rollDescription.includes('ataque')) {
                attackRoll = roll;

                // Validate target AC exists
                let finalTargetAC: number;
                if (target.ac === undefined || target.ac === null) {
                    log.warn('Attack roll processed but target AC is missing', {
                        module: 'DiceRollProcessor',
                        targetId: target.id,
                        targetName: targetVisualName,
                        roller: activeCombatant.characterName,
                    });
                    // Use default AC if missing
                    finalTargetAC = 10;
                } else {
                    // Validate AC is a number
                    const targetAC = typeof target.ac === 'number' ? target.ac : parseInt(String(target.ac), 10);
                    if (isNaN(targetAC)) {
                        log.warn('Target AC is not a valid number, using default', {
                            module: 'DiceRollProcessor',
                            targetId: target.id,
                            targetAC: target.ac,
                        });
                        finalTargetAC = 10;
                    } else {
                        finalTargetAC = targetAC;
                    }
                }

                attackHit = roll.totalResult >= finalTargetAC;
                
                // Check for critical hit (Issue #50)
                wasCritical = attackHit && roll.outcome === 'crit';

                // Update roll with combat information
                const rollIndex = diceRolls.length - 1;
                const updatedRoll = {
                    ...roll,
                    targetName: targetVisualName,
                    targetAC: finalTargetAC,
                    attackHit: attackHit,
                    outcome: attackHit
                        ? roll.outcome === 'crit'
                            ? 'crit'
                            : 'success'
                        : roll.outcome === 'pifia'
                        ? 'pifia'
                        : 'fail',
                };
                diceRolls[rollIndex] = updatedRoll;

                log.debug('Updated attack roll with combat information', {
                    module: 'DiceRollProcessor',
                    roller: activeCombatant.characterName,
                    targetName: targetVisualName,
                    targetAC: finalTargetAC,
                    attackHit: attackHit,
                    outcome: updatedRoll.outcome,
                    rollTotal: roll.totalResult,
                    wasCritical: wasCritical,
                });

                if (attackHit) {
                    // Check for crit
                    if (wasCritical) {
                        messages.push({
                            sender: 'DM',
                            content: `¡${activeCombatant.characterName} ataca a ${targetVisualName} con un golpe crítico!`,
                        });
                    } else {
                        messages.push({
                            sender: 'DM',
                            content: `${activeCombatant.characterName} ataca a ${targetVisualName} y acierta (${roll.totalResult} vs AC ${finalTargetAC}).`,
                        });
                    }
                    log.debug('Attack hit', {
                        module: 'DiceRollProcessor',
                        rollTotal: roll.totalResult,
                        targetAC: finalTargetAC,
                        isCrit: roll.outcome === 'crit',
                    });
                } else {
                    // Check for pifia
                    if (roll.outcome === 'pifia') {
                        messages.push({
                            sender: 'DM',
                            content: `¡${activeCombatant.characterName} falla estrepitosamente al atacar a ${targetVisualName}! (Pifia: ${roll.totalResult} vs AC ${finalTargetAC})`,
                        });
                    } else {
                        messages.push({
                            sender: 'DM',
                            content: `${activeCombatant.characterName} ataca a ${targetVisualName}, pero falla (${roll.totalResult} vs AC ${finalTargetAC}).`,
                        });
                    }
                    log.debug('Attack missed', {
                        module: 'DiceRollProcessor',
                        rollTotal: roll.totalResult,
                        targetAC: finalTargetAC,
                        isPifia: roll.outcome === 'pifia',
                    });
                }

                // If attack missed, skip damage rolls
                if (!attackHit) {
                    log.debug('Attack missed, skipping damage rolls', {
                        module: 'DiceRollProcessor',
                    });
                    break; // No damage if attack misses
                }
            }
            // Process damage roll (only if attack hit or it's a saving throw spell)
            else if (rollDescription.includes('damage') || rollDescription.includes('daño')) {
                // Determine if this is a saving throw spell using attackType (preferred) or keywords (fallback)
                const isSavingThrowSpell = isSavingThrow;

                // Validate that attack hit first (unless it's a saving throw spell)
                if (attackRoll === null && !isSavingThrowSpell) {
                    log.warn('Damage roll without prior attack roll - SKIPPING', {
                        module: 'DiceRollProcessor',
                        roller: activeCombatant.characterName,
                        rollDescription: roll.description,
                        attackType: attackType || 'not specified',
                    });
                    // Remove the invalid roll from the array
                    diceRolls.pop();
                    continue; // Skip damage if there was no attack roll
                }

                if (!attackHit && !isSavingThrowSpell) {
                    log.debug('Skipping damage roll because attack missed', {
                        module: 'DiceRollProcessor',
                        roller: activeCombatant.characterName,
                        attackTotal: attackRoll?.totalResult,
                        targetAC: target.ac,
                    });
                    // Remove the invalid roll from the array
                    diceRolls.pop();
                    continue; // Skip damage if attack didn't hit
                }

                // Log if this is a saving throw spell
                if (isSavingThrowSpell) {
                    log.debug('Processing saving throw spell damage', {
                        module: 'DiceRollProcessor',
                        roller: activeCombatant.characterName,
                        targetName: targetVisualName,
                        damage: roll.totalResult,
                        attackType: attackType,
                    });
                }

                // Validate damage is positive
                if (roll.totalResult <= 0) {
                    log.warn('Damage roll resulted in non-positive damage', {
                        module: 'DiceRollProcessor',
                        damage: roll.totalResult,
                        roller: activeCombatant.characterName,
                    });
                    messages.push({
                        sender: 'DM',
                        content: `${activeCombatant.characterName} intenta hacer daño a ${targetVisualName}, pero no causa ningún daño.`,
                    });
                    continue;
                }

                const targetIsPlayer = updatedParty.some((p) => p.id === target.id);
                const previousHP = targetIsPlayer
                    ? updatedParty.find((p) => p.id === target.id)?.hp.current
                    : updatedEnemies.find((e: any) => e.uniqueId === (target as any).uniqueId)?.hp.current;

                const damage = roll.totalResult;

                // Flag to track massive damage death for message ordering
                let massiveDamageDeath = false;

                if (targetIsPlayer) {
                    // Para jugador/compañeros: aplicar regla de muerte masiva D&D 5e
                    updatedParty = updatedParty.map((p) => {
                        if (p.id === target.id) {
                            const targetHP = p.hp.current;
                            const targetHPMax = p.hp.max;

                            // Regla de muerte masiva: daño restante (después de llegar a 0) >= hpMax
                            // Fórmula: daño restante = damage - hp.current
                            const remainingDamage = damage - targetHP;

                            if (remainingDamage >= targetHPMax) {
                                // Muerte instantánea - guardamos flag para mensaje posterior
                                massiveDamageDeath = true;
                                const updated = {
                                    ...p,
                                    hp: { current: 0, max: targetHPMax },
                                    isDead: true,
                                };
                                return validateAndClampHP(updated);
                            } else {
                                // Daño normal: puede llegar a 0 (inconsciente) pero no muere
                                const newHP = Math.max(0, targetHP - damage);

                                const updated = {
                                    ...p,
                                    hp: { current: newHP, max: targetHPMax },
                                    isDead: false,
                                };
                                return validateAndClampHP(updated);
                            }
                        }
                        return p;
                    });
                } else {
                    // Para enemigos, mantener comportamiento actual
                    updatedEnemies = updatedEnemies.map((e) => {
                        if ((e as any).uniqueId === (target as any).uniqueId) {
                            const updated = { ...e, hp: { ...e.hp, current: Math.max(0, e.hp.current - damage) } };
                            return validateAndClampHP(updated);
                        }
                        return e;
                    });
                }

                const newHP = targetIsPlayer
                    ? updatedParty.find((p) => p.id === target.id)?.hp.current
                    : updatedEnemies.find((e: any) => e.uniqueId === (target as any).uniqueId)?.hp.current;

                // Check if target was killed by this damage
                const targetKilled = newHP !== undefined && newHP <= 0;

                // Update roll with damage information
                const rollIndex = diceRolls.length - 1;
                diceRolls[rollIndex] = {
                    ...roll,
                    targetName: targetVisualName,
                    damageDealt: roll.totalResult,
                    targetKilled: targetKilled,
                };

                messages.push({
                    sender: 'DM',
                    content: `${activeCombatant.characterName} ha hecho ${roll.totalResult} puntos de daño a ${targetVisualName}${
                        previousHP !== undefined && newHP !== undefined ? ` (${previousHP} → ${newHP} HP)` : ''
                    }.`,
                });

                log.debug('Damage applied', {
                    module: 'DiceRollProcessor',
                    target: targetVisualName,
                    damage: roll.totalResult,
                    previousHP,
                    newHP,
                    targetKilled,
                });

                // Check if target was defeated or knocked unconscious
                if (targetKilled) {
                    // Get updated target to check isDead status
                    const updatedTarget = targetIsPlayer
                        ? updatedParty.find((p) => p.id === target.id)
                        : updatedEnemies.find((e: any) => (e as any).uniqueId === (target as any).uniqueId);
                    
                    const targetIsDead = updatedTarget?.isDead === true;
                    
                    if (targetIsPlayer && updatedTarget) {
                        // For players/companions: distinguish between death and unconsciousness
                        // Players/companions can fall unconscious (isDead = false) or die (isDead = true via massive damage)
                        if (targetIsDead) {
                            // Add massive damage death message if applicable (AFTER damage message, BEFORE kill message)
                            if (massiveDamageDeath) {
                                messages.push({
                                    sender: 'DM',
                                    content: `${targetVisualName} ha recibido un golpe devastador y muere instantáneamente.`,
                                });
                            }
                            messages.push({
                                sender: 'DM',
                                content: `¡${activeCombatant.characterName} ha matado a ${targetVisualName}!`,
                            });
                            localLog(`${activeCombatant.characterName} killed ${targetVisualName}!`);
                        } else if (newHP === 0 && previousHP !== undefined && previousHP > 0) {
                            // Target just fell unconscious (not dead) - only for players/companions
                            messages.push({
                                sender: 'DM',
                                content: `¡${activeCombatant.characterName} ha dejado inconsciente a ${targetVisualName}!`,
                            });
                            messages.push({
                                sender: 'DM',
                                content: `${targetVisualName} cae inconsciente.`,
                            });
                            localLog(`${activeCombatant.characterName} knocked ${targetVisualName} unconscious!`);
                        }
                    } else {
                        // For enemies: they die directly at HP 0 (no unconsciousness concept)
                        // Enemies don't have the isDead field or it's not used - they simply die when HP <= 0
                        messages.push({
                            sender: 'DM',
                            content: `¡${activeCombatant.characterName} ha matado a ${targetVisualName}!`,
                        });
                        localLog(`${activeCombatant.characterName} killed ${targetVisualName}!`);
                    }
                }

                // Check if combat has ended after applying damage
                localLog('checkEndOfCombat: Checking for end of combat...');
                const combatCheck = checkEndOfCombat(updatedParty, updatedEnemies);
                if (combatCheck.combatEnded) {
                    localLog(`checkEndOfCombat: End of combat detected! [Razón: ${combatCheck.reason}]`);
                    if (combatCheck.reason === 'Todos los enemigos derrotados') {
                        messages.push({ sender: 'DM', content: '¡Victoria! Todos los enemigos han sido derrotados.' });
                    } else if (combatCheck.reason === 'Todos los aliados inconscientes') {
                        messages.push({ 
                            sender: 'DM', 
                            content: '¡Game Over! Todos los miembros del grupo han caído inconscientes. Sin nadie que pueda ayudarlos, vuestro viaje termina aquí. La aventura ha terminado.' 
                        });
                    } else if (combatCheck.reason === 'Todos los aliados muertos') {
                        messages.push({ 
                            sender: 'DM', 
                            content: '¡Game Over! Todos los miembros del grupo han muerto en combate. Vuestro viaje termina aquí, pero vuestra historia será recordada. La aventura ha terminado.' 
                        });
                    }
                    // Mark combat as ended and break out of the roll loop
                    combatEnded = true;
                    break;
                }
            }
            // Process healing roll
            else if (
                rollDescription.includes('healing') ||
                rollDescription.includes('curación') ||
                rollDescription.includes('cura')
            ) {
                // Validate healing is positive
                if (roll.totalResult <= 0) {
                    log.warn('Healing roll resulted in non-positive healing', {
                        module: 'DiceRollProcessor',
                        healing: roll.totalResult,
                        roller: activeCombatant.characterName,
                    });
                    messages.push({
                        sender: 'DM',
                        content: `${activeCombatant.characterName} intenta curar a ${targetVisualName}, pero no tiene efecto.`,
                    });
                    continue;
                }

                const targetIsPlayer = updatedParty.some((p) => p.id === target.id);
                if (targetIsPlayer) {
                    const previousHP = updatedParty.find((p) => p.id === target.id)?.hp.current;
                    const wasUnconscious = previousHP !== undefined && previousHP <= 0;

                    updatedParty = updatedParty.map((p) => {
                        if (p.id === target.id) {
                            const updated = {
                                ...p,
                                hp: { ...p.hp, current: Math.min(p.hp.max, p.hp.current + roll.totalResult) },
                                isDead: false, // Curación revive personajes inconscientes
                            };
                            return validateAndClampHP(updated);
                        }
                        return p;
                    });
                    const newHP = updatedParty.find((p) => p.id === target.id)?.hp.current;

                    // Update roll with healing information
                    const rollIndex = diceRolls.length - 1;
                    diceRolls[rollIndex] = {
                        ...roll,
                        targetName: targetVisualName,
                        healingAmount: roll.totalResult,
                    };

                    // Narrativa de revivencia si el personaje estaba inconsciente
                    if (wasUnconscious && newHP !== undefined && newHP > 0) {
                        messages.push({
                            sender: 'DM',
                            content: `${targetVisualName} recupera la consciencia gracias a la curación recibida.`,
                        });
                    }

                    messages.push({
                        sender: 'DM',
                        content: `${targetVisualName} es curado por ${roll.totalResult} puntos${
                            previousHP !== undefined && newHP !== undefined ? ` (${previousHP} → ${newHP} HP)` : ''
                        }.`,
                    });

                    log.debug('Healing applied', {
                        module: 'DiceRollProcessor',
                        target: targetVisualName,
                        healing: roll.totalResult,
                        previousHP,
                        newHP,
                    });
                } else {
                    // Healing enemies is possible but less common
                    const previousHP = updatedEnemies.find((e: any) => e.uniqueId === (target as any).uniqueId)?.hp
                        .current;
                    updatedEnemies = updatedEnemies.map((e) => {
                        if ((e as any).uniqueId === (target as any).uniqueId) {
                            const updated = {
                                ...e,
                                hp: { ...e.hp, current: Math.min(e.hp.max, e.hp.current + roll.totalResult) },
                            };
                            return validateAndClampHP(updated);
                        }
                        return e;
                    });
                    const newHP = updatedEnemies.find((e: any) => e.uniqueId === (target as any).uniqueId)?.hp.current;

                    // Update roll with healing information
                    const rollIndex = diceRolls.length - 1;
                    diceRolls[rollIndex] = {
                        ...roll,
                        targetName: targetVisualName,
                        healingAmount: roll.totalResult,
                    };

                    messages.push({
                        sender: 'DM',
                        content: `${targetVisualName} es curado por ${roll.totalResult} puntos${
                            previousHP !== undefined && newHP !== undefined ? ` (${previousHP} → ${newHP} HP)` : ''
                        }.`,
                    });

                    log.debug('Healing applied to enemy', {
                        module: 'DiceRollProcessor',
                        target: targetVisualName,
                        healing: roll.totalResult,
                        previousHP,
                        newHP,
                    });
                }
            }
        } catch (error) {
            log.error('Error processing dice roll', {
                module: 'DiceRollProcessor',
                error: error instanceof Error ? error.message : String(error),
                rollRequest,
            });
            messages.push({
                sender: 'DM',
                content: `Error al procesar la tirada de ${activeCombatant.characterName}.`,
            });
        }
    }

    return {
        diceRolls,
        messages,
        updatedParty,
        updatedEnemies,
        combatEnded,
    };
}

