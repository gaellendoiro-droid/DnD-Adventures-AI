/**
 * @fileOverview A Genkit tool that manages a full round or turn of combat.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { enemyTacticianTool } from './enemy-tactician';
import { companionTacticianTool } from './companion-tactician';
import type { GameMessage, DiceRoll, Combatant } from '@/lib/types';
import { diceRollerTool } from './dice-roller';
import { getAdventureData } from '@/app/game-state-actions';
import { GameStateSchema, ActionInterpreterOutputSchema } from '@/ai/flows/schemas';
import { narrativeExpert } from '../flows/narrative-expert';
import { markdownToHtml } from '../flows/markdown-to-html';
import { log } from '@/lib/logger';
import {
    generateDifferentiatedNames,
    normalizeNameForMatching,
    escapeRegex,
    replaceOrdinalReferences,
    getVisualName,
} from '@/lib/combat/monster-name-manager';
import {
    normalizeMonsterName,
    parseHitPoints,
    parseArmorClass,
    getMonsterStatsFromDndApi,
} from '@/lib/combat/monster-stats-parser';
import { resolveEnemyId } from '@/lib/combat/target-resolver';
import {
    getHpStatus,
    validateAndClampHP,
    isUnconsciousOrDead,
    checkEndOfCombat,
} from './combat/combat-validators';
import { processAICombatantRolls, updateRollNotationWithModifiers } from './combat/dice-roll-processor';
import { combatNarrationExpertTool } from './combat/combat-narration-expert';

export const CombatManagerInputSchema = GameStateSchema.extend({
  interpretedAction: ActionInterpreterOutputSchema.optional(),
  locationContext: z.any().optional(),
  combatantIds: z.array(z.string()).optional(),
});

/**
 * Duplicates damage dice for critical hits according to D&D 5e rules.
 * In D&D 5e, a critical hit doubles the damage dice, but not the modifier.
 * 
 * @param damageDie - The damage die notation (e.g., "1d8", "2d6")
 * @param damageMod - The damage modifier
 * @param isCritical - Whether this is a critical hit
 * @returns The damage roll notation (e.g., "2d8+3" for a critical with 1d8+3)
 * 
 * @example
 * getCriticalDamageNotation("1d8", 3, true) // Returns "2d8+3"
 * getCriticalDamageNotation("1d8", 3, false) // Returns "1d8+3"
 * getCriticalDamageNotation("2d6", 2, true) // Returns "4d6+2"
 */
export const getCriticalDamageNotation = (damageDie: string, damageMod: number, isCritical: boolean): string => {
    // Parse the damage die notation (e.g., "1d8" -> {numDice: 1, dieType: 8})
    const diceMatch = damageDie.match(/^(\d+)d(\d+)$/);
    
    if (!diceMatch) {
        log.warn('Invalid damage die format, using as-is', {
            module: 'CombatManager',
            damageDie,
        });
        // Fallback: return original notation
        return `${damageDie}+${damageMod}`;
    }
    
    const numDice = parseInt(diceMatch[1], 10);
    const dieType = diceMatch[2];
    
    // In D&D 5e, critical hits double the number of dice, not the modifier
    const finalNumDice = isCritical ? numDice * 2 : numDice;
    
    return `${finalNumDice}d${dieType}+${damageMod}`;
};

const formatMessageForTranscript = (msg: Partial<GameMessage>): string => {
    const senderName = msg.senderName || msg.sender;
    const content = msg.originalContent || msg.content;
    if (senderName && content) {
        return `${senderName}: ${content}`;
    }
    return '';
};






export const CombatManagerOutputSchema = z.object({
    messages: z.array(z.any()),
    diceRolls: z.array(z.any()).optional(),
    updatedParty: z.array(z.any()).optional(),
    updatedEnemies: z.array(z.any()).optional(),
    nextLocationId: z.string().optional().nullable(),
    inCombat: z.boolean(),
    initiativeOrder: z.array(z.any()).optional(),
    enemies: z.array(z.any()).optional(),
    debugLogs: z.array(z.string()).optional(),
    turnIndex: z.number().optional(),
    hasMoreAITurns: z.boolean().optional(),
    // Nuevos campos para comunicación explícita de qué turno se procesó
    lastProcessedTurnWasAI: z.boolean().optional(), // true si el último turno procesado fue de IA/Enemy
    lastProcessedTurnIndex: z.number().optional(),  // índice del turno que se acaba de procesar
    playerActionCompleted: z.boolean().optional(),  // true si el jugador ya completó su acción en este turno
});


export const combatManagerTool = ai.defineTool(
    {
      name: 'combatManagerTool',
      description: 'Manages a sequence of turns in combat, starting from the current turn, until it is a human player\'s turn again or combat ends. It also handles the initiation of combat.',
      inputSchema: CombatManagerInputSchema,
      outputSchema: CombatManagerOutputSchema,
    },
    async (input) => {
        const { playerAction, inCombat, locationId, interpretedAction, locationContext, conversationHistory, combatantIds, party, initiativeOrder } = input;
        let { turnIndex } = input;
        
        const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
        const diceRolls: Omit<DiceRoll, 'id' | 'timestamp'>[] = [];
        const debugLogs: string[] = [];
        let updatedEnemies = [...(input.enemies || [])];
        let updatedParty = [...(input.party || [])];

        const localLog = (message: string) => {
            debugLogs.push(`CombatManager: ${message}`);
        };

        if (inCombat) {
            localLog("Continuing existing combat...");
            if (!initiativeOrder || turnIndex === undefined) {
                throw new Error("Combat in progress, but initiativeOrder or turnIndex is missing.");
            }

            let currentTurnIndex = turnIndex;
            let activeCombatant = initiativeOrder[currentTurnIndex];
            
            localLog(`[DEBUG] Received turnIndex: ${currentTurnIndex}, activeCombatant: ${activeCombatant?.characterName || 'Unknown'} (${activeCombatant?.controlledBy || 'Unknown'})`);
            localLog(`[DEBUG] Initiative order: ${initiativeOrder.map((c, i) => `[${i}]${c.characterName}(${c.controlledBy})`).join(', ')}`);
            
            // Issue #54: If it's the player's turn and they're unconscious/dead, show message and pause
            // Issue #81: If "continue_turn" is received, advance the turn to prevent infinite loop
            if (activeCombatant && activeCombatant.controlledBy === 'Player') {
                const playerData = updatedParty.find(p => p.id === activeCombatant.id);
                if (playerData && isUnconsciousOrDead(playerData)) {
                    log.info('Player turn detected but player is unconscious/dead', {
                        module: 'CombatManager',
                        player: activeCombatant.characterName,
                        hp: playerData.hp.current,
                        isDead: playerData.isDead,
                    });
                    
                    // Show message about player being unconscious/dead
                    const statusMessage = playerData.isDead === true 
                        ? `${activeCombatant.characterName} está muerto y no puede actuar.`
                        : `${activeCombatant.characterName} está inconsciente y no puede actuar.`;
                    
                    messages.push({
                        sender: 'DM',
                        content: statusMessage
                    });
                    
                    // Issue #81: If "continue_turn" action is received, advance the turn to prevent infinite loop
                    // Otherwise, pause and wait for manual button press
                    if (interpretedAction && interpretedAction.actionType === 'continue_turn') {
                        localLog(`Player ${activeCombatant.characterName} is ${playerData.isDead ? 'dead' : 'unconscious'}. Advancing turn due to continue_turn action.`);
                        
                        // Advance to next turn
                        const processedTurnIndex = currentTurnIndex;
                        const previousCombatant = activeCombatant.characterName;
                        currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
                        activeCombatant = initiativeOrder[currentTurnIndex];
                        
                        log.info('Advanced from unconscious player turn to next turn', {
                            module: 'CombatManager',
                            fromIndex: processedTurnIndex,
                            toIndex: currentTurnIndex,
                            fromCombatant: previousCombatant,
                            toCombatant: activeCombatant?.characterName || 'Unknown',
                            toControlledBy: activeCombatant?.controlledBy,
                        });
                        
                        // Issue #81: Return immediately after showing message to separate it from next turn's messages
                        // The next turn will be processed in the next call (frontend will auto-send 'continuar turno' if hasMoreAITurns is true)
                        const nextTurnPlayerData = activeCombatant?.controlledBy === 'Player' 
                            ? updatedParty.find(p => p.id === activeCombatant.id) 
                            : null;
                        const hasMoreAITurns = activeCombatant && 
                            (activeCombatant.controlledBy === 'AI' || 
                            (activeCombatant.controlledBy === 'Player' && nextTurnPlayerData && isUnconsciousOrDead(nextTurnPlayerData)));
                        
                        return {
                            messages,
                            diceRolls,
                            inCombat: true,
                            debugLogs,
                            turnIndex: currentTurnIndex, // Now pointing to next turn
                            initiativeOrder,
                            updatedParty,
                            updatedEnemies,
                            hasMoreAITurns, // Indicates if the next turn should auto-process
                            lastProcessedTurnWasAI: true, // We just processed a skipped turn
                            lastProcessedTurnIndex: processedTurnIndex, // The turn we just skipped
                        };
                    } else {
                    localLog(`Player ${activeCombatant.characterName} is ${playerData.isDead ? 'dead' : 'unconscious'}. Waiting for pass turn button.`);
                    
                    // Return immediately with hasMoreAITurns: true to show "Pasar turno" buttons
                    // The player must press the button to advance to the next turn
                    return {
                        messages,
                        diceRolls,
                        inCombat: true,
                        debugLogs,
                        turnIndex: currentTurnIndex, // Keep on player's turn
                        initiativeOrder,
                        updatedParty,
                        updatedEnemies,
                        hasMoreAITurns: true, // Show "Pasar turno" buttons
                        lastProcessedTurnWasAI: true, // Treat like an AI turn (pause and wait)
                        lastProcessedTurnIndex: currentTurnIndex, // The turn we just "processed"
                    };
                    }
                }
            }
            
            // Handle "continue turn" action (step-by-step combat)
            if (interpretedAction && interpretedAction.actionType === 'continue_turn') {
                log.info('Continue turn action detected in combat', {
                    module: 'CombatManager',
                    currentTurnIndex,
                    activeCombatant: activeCombatant?.characterName || 'Unknown',
                    activeCombatantControlledBy: activeCombatant?.controlledBy,
                    initiativeOrderLength: initiativeOrder.length,
                });
                localLog(`[DEBUG] Continue turn detected. Current: index=${currentTurnIndex}, combatant=${activeCombatant?.characterName} (${activeCombatant?.controlledBy})`);
                // If it's currently the player's turn, advance to next turn
                if (activeCombatant && activeCombatant.controlledBy === 'Player') {
                    const previousIndex = currentTurnIndex;
                    const previousCombatant = activeCombatant.characterName;
                    currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
                    activeCombatant = initiativeOrder[currentTurnIndex];
                    log.info('Advanced from player turn to next turn', {
                        module: 'CombatManager',
                        fromIndex: previousIndex,
                        toIndex: currentTurnIndex,
                        fromCombatant: previousCombatant,
                        toCombatant: activeCombatant?.characterName || 'Unknown',
                        toControlledBy: activeCombatant?.controlledBy,
                    });
                    localLog(`[DEBUG] Advancing from ${previousIndex} (${previousCombatant}) to ${currentTurnIndex} (${activeCombatant?.characterName})`);
                    
                    // After advancing, check if the next combatant is dead/unconscious
                    // If so, we'll handle it in the regular flow below (showing message and pausing)
                } else {
                    localLog(`[DEBUG] NOT advancing (combatant is ${activeCombatant?.controlledBy}, not Player). Will process this turn.`);
                }
                // Don't process player action, just continue to next turn (which will be processed below if it's AI)
            }
            
            // If it's the player's turn, process their action first
            let playerTurnAdvanced = false;
            if (activeCombatant && activeCombatant.controlledBy === 'Player' && interpretedAction && interpretedAction.actionType !== 'continue_turn') {
                localLog(`Processing player turn for ${activeCombatant.characterName} at index ${currentTurnIndex}...`);
                
                // Process player action (attack, spell, etc.)
                if (interpretedAction.actionType === 'attack') {
                    // If no targetId specified, try to infer it (Issue #23)
                    let targetIdToUse = interpretedAction.targetId;
                    
                    if (!targetIdToUse) {
                        // Filter only alive enemies
                        const aliveEnemies = updatedEnemies.filter(e => e.hp.current > 0);
                        
                        log.debug('Player attack without explicit target - inferring target', {
                            module: 'CombatManager',
                            player: activeCombatant.characterName,
                            aliveEnemiesCount: aliveEnemies.length,
                        });
                        
                        if (aliveEnemies.length === 1) {
                            // Only one enemy alive: auto-select it
                            targetIdToUse = aliveEnemies[0].uniqueId;
                            const autoSelectedName = getVisualName(targetIdToUse || '', initiativeOrder, updatedEnemies);
                            
                            localLog(`Auto-selected single enemy target: ${autoSelectedName} (${targetIdToUse})`);
                            log.info('Auto-selected single enemy as target', {
                                module: 'CombatManager',
                                player: activeCombatant.characterName,
                                target: autoSelectedName,
                                targetId: targetIdToUse,
                            });
                            
                            // Add a brief DM message to clarify the auto-selection
                            messages.push({
                                sender: 'DM',
                                content: `${activeCombatant.characterName} ataca a ${autoSelectedName}.`
                            });
                        } else if (aliveEnemies.length > 1) {
                            // Multiple enemies: ask for clarification
                            // Don't list specific enemies to avoid restricting player choices
                            // (they might want to attack a companion, NPC, or object)
                            const clarificationMessage = `No has especificado un objetivo. ¿A quién o qué quieres atacar?`;
                            
                            localLog(`Multiple enemies present, asking player for clarification`);
                            log.info('Player attack without target - multiple enemies, asking for clarification', {
                                module: 'CombatManager',
                                player: activeCombatant.characterName,
                                enemiesCount: aliveEnemies.length,
                            });
                            
                            messages.push({
                                sender: 'DM',
                                content: clarificationMessage
                            });
                            
                            // Do NOT advance turn - wait for player's next action
                            return {
                                messages,
                                diceRolls,
                                inCombat: true,
                                debugLogs,
                                turnIndex: currentTurnIndex, // Keep same turn index
                                initiativeOrder,
                                updatedParty,
                                updatedEnemies,
                                lastProcessedTurnWasAI: false,
                                lastProcessedTurnIndex: currentTurnIndex, // Still on same turn
                            };
                        } else {
                            // No enemies alive
                            localLog('Player tried to attack but no enemies are alive');
                            messages.push({
                                sender: 'DM',
                                content: `No hay enemigos vivos para atacar.`
                            });
                            
                            // Advance turn normally
                            currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
                            activeCombatant = initiativeOrder[currentTurnIndex];
                            playerTurnAdvanced = true;
                            
                            // Continue to AI turns processing
                            // (don't return early, let the code flow to the AI turns loop)
                        }
                    }
                    
                    // Only proceed with attack if we have a valid target
                    if (targetIdToUse) {
                        // Resolve targetId (can be visual name or uniqueId)
                        const resolved = resolveEnemyId(targetIdToUse, updatedEnemies, initiativeOrder, updatedParty);
                    
                    // Handle ambiguity: if multiple enemies match, ask the player
                    if (resolved.ambiguous) {
                        const baseName = targetIdToUse.split(/\s+\d+$/)[0] || targetIdToUse;
                        const clarificationMessage = `Hay múltiples ${baseName}. ¿A cuál te refieres? ${resolved.matches.join(' o ')}`;
                        const { html } = await markdownToHtml({ markdown: clarificationMessage });
                        messages.push({ sender: 'DM', content: html, originalContent: clarificationMessage });
                        
                        // Do NOT process the action, do NOT advance turn - wait for player's next action
                        localLog(`Target ambiguous for player action. Asking for clarification.`);
                        
                        // Return early with just the clarification message
                        return {
                            messages,
                            diceRolls,
                            inCombat: true,
                            debugLogs,
                            turnIndex: currentTurnIndex, // Keep same turn index
                            initiativeOrder,
                            updatedParty,
                            updatedEnemies,
                            lastProcessedTurnWasAI: false,
                            lastProcessedTurnIndex: currentTurnIndex, // Still on same turn
                        };
                    }
                    
                    // Use resolved uniqueId to find target
                    const resolvedTargetId = resolved.uniqueId || interpretedAction.targetId;
                    const target = [...updatedParty, ...updatedEnemies].find(
                        c => c.id === resolvedTargetId || (c as any).uniqueId === resolvedTargetId
                    );
                    
                    if (target) {
                        // Get visual name for target
                        const targetVisualName = getVisualName(
                            (target as any).uniqueId || target.id,
                            initiativeOrder,
                            updatedEnemies
                        );
                        
                        localLog(`Player ${activeCombatant.characterName} attacks ${targetVisualName}`);
                        
                        // Get player character data to determine attack and damage modifiers
                        const playerChar = updatedParty.find(p => p.id === activeCombatant.id);
                        if (!playerChar) {
                            localLog(`ERROR: Player character not found in party: ${activeCombatant.id}`);
                        } else {
                            try {
                                // Get proficiency bonus from character sheet (default to +2 if not set)
                                const proficiencyBonus = playerChar.proficiencyBonus ?? 2;
                                
                                // Determine attack modifier (use Strength or Dexterity, whichever is higher)
                                const strMod = playerChar.abilityModifiers?.fuerza || 0;
                                const dexMod = playerChar.abilityModifiers?.destreza || 0;
                                const abilityMod = Math.max(strMod, dexMod);
                                
                                // Attack modifier = ability modifier + proficiency bonus
                                const attackMod = abilityMod + proficiencyBonus;
                                
                                // Determine damage modifier (only ability mod, no proficiency bonus for damage)
                                const damageMod = abilityMod;
                                
                                // Determine damage die (default to 1d8 for a standard weapon like a longsword)
                                // TODO: In the future, read this from the player's equipped weapon
                                const damageDie = '1d8';
                                
                                log.debug('Player attack modifiers', {
                                    module: 'CombatManager',
                                    player: activeCombatant.characterName,
                                    proficiencyBonus,
                                    strMod,
                                    dexMod,
                                    abilityMod,
                                    attackMod,
                                    damageMod,
                                    damageDie,
                                });
                                
                                // Generate attack roll with breakdown of modifiers
                                const attackRollResult = await diceRollerTool({
                                    rollNotation: `1d20+${attackMod}`,
                                    description: `Tirada de ataque de ${activeCombatant.characterName}`,
                                    roller: activeCombatant.characterName,
                                });
                                
                                // Update roll notation with individual modifiers
                                updateRollNotationWithModifiers(attackRollResult, playerChar, true);
                                
                                // Validate target AC
                                let finalTargetAC: number;
                                if (target.ac === undefined || target.ac === null) {
                                    log.warn('Attack roll processed but target AC is missing', {
                                        module: 'CombatManager',
                                        targetId: target.id,
                                        targetName: targetVisualName,
                                        roller: activeCombatant.characterName,
                                    });
                                    finalTargetAC = 10;
                                } else {
                                    const targetAC = typeof target.ac === 'number' ? target.ac : parseInt(String(target.ac), 10);
                                    if (isNaN(targetAC)) {
                                        log.warn('Target AC is not a valid number, using default', {
                                            module: 'CombatManager',
                                            targetId: target.id,
                                            targetAC: target.ac,
                                        });
                                        finalTargetAC = 10;
                                    } else {
                                        finalTargetAC = targetAC;
                                    }
                                }
                                
                                const attackHit = attackRollResult.totalResult >= finalTargetAC;
                                
                                // Declare damageRollResult outside the if block so it's accessible for narration generation
                                let damageRollResult: any = null;
                                
                                // Update attack roll with combat information
                                const updatedAttackRoll = {
                                    ...attackRollResult,
                                    targetName: targetVisualName,
                                    targetAC: finalTargetAC,
                                    attackHit: attackHit,
                                    outcome: attackHit ? (attackRollResult.outcome === 'crit' ? 'crit' : 'success') : (attackRollResult.outcome === 'pifia' ? 'pifia' : 'fail'),
                                };
                                diceRolls.push(updatedAttackRoll);
                                
                                log.debug('Player attack roll processed', {
                                    module: 'CombatManager',
                                    roller: activeCombatant.characterName,
                                    targetName: targetVisualName,
                                    targetAC: finalTargetAC,
                                    attackHit: attackHit,
                                    outcome: updatedAttackRoll.outcome,
                                    rollTotal: attackRollResult.totalResult,
                                });
                                
                                // Generate DM narration for attack
                                if (attackHit) {
                                    const isCritical = attackRollResult.outcome === 'crit';
                                    
                                    if (isCritical) {
                                        messages.push({
                                            sender: 'DM',
                                            content: `¡${activeCombatant.characterName} ataca a ${targetVisualName} con un golpe crítico!`
                                        });
                                    } else {
                                        messages.push({
                                            sender: 'DM',
                                            content: `${activeCombatant.characterName} ataca a ${targetVisualName} y acierta (${attackRollResult.totalResult} vs AC ${finalTargetAC}).`
                                        });
                                    }
                                    
                                    // Generate damage roll (only if attack hit)
                                    // Use getCriticalDamageNotation to double dice on critical hits (Issue #50)
                                    const damageNotation = getCriticalDamageNotation(damageDie, damageMod, isCritical);
                                    damageRollResult = await diceRollerTool({
                                        rollNotation: damageNotation,
                                        description: `Tirada de daño${isCritical ? ' (crítico)' : ''} de ${activeCombatant.characterName}`,
                                        roller: activeCombatant.characterName,
                                    });
                                    
                                    // Update roll notation with individual modifiers (damage doesn't include proficiency)
                                    updateRollNotationWithModifiers(damageRollResult, playerChar, false);
                                    
                                    // Validate damage is positive
                                    if (damageRollResult.totalResult <= 0) {
                                        log.warn('Damage roll resulted in non-positive damage', {
                                            module: 'CombatManager',
                                            damage: damageRollResult.totalResult,
                                            roller: activeCombatant.characterName,
                                        });
                                        messages.push({
                                            sender: 'DM',
                                            content: `${activeCombatant.characterName} intenta hacer daño a ${targetVisualName}, pero no causa ningún daño.`
                                        });
                                    } else {
                                        // Apply damage to target
                                        const targetIsEnemy = updatedEnemies.some(e => (e as any).uniqueId === (target as any).uniqueId);
                                        const previousHP = targetIsEnemy
                                            ? updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)?.hp.current
                                            : updatedParty.find(p => p.id === target.id)?.hp.current;
                                        
                                        const damage = damageRollResult.totalResult;
                                        
                                        if (targetIsEnemy) {
                                            // Para enemigos, mantener comportamiento actual
                                            updatedEnemies = updatedEnemies.map(e => {
                                                if ((e as any).uniqueId === (target as any).uniqueId) {
                                                    const updated = { ...e, hp: { ...e.hp, current: Math.max(0, e.hp.current - damage) } };
                                                    return validateAndClampHP(updated);
                                                }
                                                return e;
                                            });
                                        } else {
                                            // Para jugador/compañeros: aplicar regla de muerte masiva D&D 5e
                                            updatedParty = updatedParty.map(p => {
                                                if (p.id === target.id) {
                                                    const targetHP = p.hp.current;
                                                    const targetHPMax = p.hp.max;
                                                    
                                                    // Regla de muerte masiva: daño restante (después de llegar a 0) >= hpMax
                                                    // Fórmula: daño restante = damage - hp.current
                                                    const remainingDamage = damage - targetHP;
                                                    
                                                    if (remainingDamage >= targetHPMax) {
                                                        // Muerte instantánea
                                                        messages.push({
                                                            sender: 'DM',
                                                            content: `${p.name} ha recibido un golpe devastador y muere instantáneamente.`,
                                                        });
                                                        const updated = { 
                                                            ...p, 
                                                            hp: { current: 0, max: targetHPMax },
                                                            isDead: true 
                                                        };
                                                        return validateAndClampHP(updated);
                                                    } else {
                                                        // Daño normal: puede llegar a 0 (inconsciente) pero no muere
                                                        const newHP = Math.max(0, targetHP - damage);
                                                        
                                                        if (newHP === 0 && targetHP > 0) {
                                                            // Acaba de caer inconsciente
                                                            messages.push({
                                                                sender: 'DM',
                                                                content: `${p.name} cae inconsciente.`,
                                                            });
                                                        }
                                                        
                                                        const updated = { 
                                                            ...p, 
                                                            hp: { current: newHP, max: targetHPMax },
                                                            isDead: false
                                                        };
                                                        return validateAndClampHP(updated);
                                                    }
                                                }
                                                return p;
                                            });
                                        }
                                        
                                        const newHP = targetIsEnemy
                                            ? updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)?.hp.current
                                            : updatedParty.find(p => p.id === target.id)?.hp.current;
                                        
                                        // Update damage roll with combat information
                                        const updatedDamageRoll = {
                                            ...damageRollResult,
                                            targetName: targetVisualName,
                                            damageDealt: damageRollResult.totalResult,
                                        };
                                        diceRolls.push(updatedDamageRoll);
                                        
                                        // Generate damage message
                                        const damageMessage = `${activeCombatant.characterName} ha hecho ${damageRollResult.totalResult} puntos de daño a ${targetVisualName}${previousHP !== undefined && newHP !== undefined ? ` (${previousHP} → ${newHP} HP)` : ''}.`;
                                        messages.push({
                                            sender: 'DM',
                                            content: damageMessage
                                        });
                                        
                                        log.debug('Player damage applied', {
                                            module: 'CombatManager',
                                            target: targetVisualName,
                                            damage: damageRollResult.totalResult,
                                            previousHP,
                                            newHP,
                                        });
                                        
                                        // Issue #51: Check if target was defeated or knocked unconscious
                                        if (newHP !== undefined && newHP <= 0) {
                                            // Get updated target to check isDead status
                                            const updatedTarget = targetIsEnemy
                                                ? updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)
                                                : updatedParty.find(p => p.id === target.id);
                                            
                                            const targetIsDead = updatedTarget?.isDead === true;
                                            
                                            if (!targetIsEnemy && updatedTarget) {
                                                // For players/companions: distinguish between death and unconsciousness
                                                if (targetIsDead) {
                                                    // Target died (massive damage)
                                            messages.push({
                                                sender: 'DM',
                                                content: `¡${activeCombatant.characterName} ha matado a ${targetVisualName}!`
                                            });
                                            localLog(`${activeCombatant.characterName} killed ${targetVisualName}!`);
                                                } else if (newHP === 0 && previousHP !== undefined && previousHP > 0) {
                                                    // Target just fell unconscious (not dead)
                                                    messages.push({
                                                        sender: 'DM',
                                                        content: `¡${activeCombatant.characterName} ha dejado inconsciente a ${targetVisualName}!`
                                                    });
                                                    localLog(`${activeCombatant.characterName} knocked ${targetVisualName} unconscious!`);
                                                }
                                                // If previousHP === 0 and targetIsDead === false, target was already unconscious
                                                // and didn't die from massive damage - no additional message needed
                                            } else {
                                                // For enemies: they die directly at HP 0 (no unconsciousness concept)
                                                messages.push({
                                                    sender: 'DM',
                                                    content: `¡${activeCombatant.characterName} ha matado a ${targetVisualName}!`
                                                });
                                                localLog(`${activeCombatant.characterName} killed ${targetVisualName}!`);
                                            }
                                        }
                                    }
                                } else {
                                    // Attack missed
                                    if (attackRollResult.outcome === 'pifia') {
                                        messages.push({
                                            sender: 'DM',
                                            content: `¡${activeCombatant.characterName} falla estrepitosamente al atacar a ${targetVisualName}! (Pifia: ${attackRollResult.totalResult} vs AC ${finalTargetAC})`
                                        });
                                    } else {
                                        messages.push({
                                            sender: 'DM',
                                            content: `${activeCombatant.characterName} ataca a ${targetVisualName}, pero falla (${attackRollResult.totalResult} vs AC ${finalTargetAC}).`
                                        });
                                    }
                                    log.debug('Player attack missed', {
                                        module: 'CombatManager',
                                        rollTotal: attackRollResult.totalResult,
                                        targetAC: finalTargetAC,
                                        isPifia: attackRollResult.outcome === 'pifia',
                                    });
                                }
                                
                                // Issue #79: Generate descriptive combat narration for player's action
                                try {
                                    // Determine attack result for narration
                                    let narrativeAttackResult: 'hit' | 'miss' | 'critical' | 'fumble';
                                    if (attackRollResult.outcome === 'crit') {
                                        narrativeAttackResult = 'critical';
                                    } else if (attackRollResult.outcome === 'pifia') {
                                        narrativeAttackResult = 'fumble';
                                    } else if (attackHit) {
                                        narrativeAttackResult = 'hit';
                                    } else {
                                        narrativeAttackResult = 'miss';
                                    }
                                    
                                    // Prepare narration input
                                    const narrationInput: any = {
                                        narrationType: 'resolution',
                                        attackerName: activeCombatant.characterName,
                                        targetName: targetVisualName,
                                        playerAction: playerAction,
                                        attackResult: narrativeAttackResult,
                                    };
                                    
                                    // Add damage and HP information if attack hit
                                    if (attackHit && damageRollResult && damageRollResult.totalResult > 0) {
                                        const targetIsEnemy = updatedEnemies.some(e => (e as any).uniqueId === (target as any).uniqueId);
                                        const previousHP = targetIsEnemy
                                            ? updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)?.hp.current
                                            : updatedParty.find(p => p.id === target.id)?.hp.current;
                                        const newHP = targetIsEnemy
                                            ? updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)?.hp.current
                                            : updatedParty.find(p => p.id === target.id)?.hp.current;
                                        
                                        narrationInput.damageDealt = damageRollResult.totalResult;
                                        narrationInput.targetPreviousHP = previousHP;
                                        narrationInput.targetNewHP = newHP;
                                        
                                        // Check if target was killed or knocked out
                                        if (newHP !== undefined && newHP <= 0) {
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
                                    localLog(`Generating combat narration for ${activeCombatant.characterName}'s action...`);
                                    const narrationResult = await combatNarrationExpertTool(narrationInput);
                                    
                                    if (narrationResult.debugLogs) {
                                        narrationResult.debugLogs.forEach(log => debugLogs.push(log));
                                    }
                                    
                                    if (narrationResult.narration) {
                                        // Add narration as a DM message
                                        messages.push({
                                            sender: 'DM',
                                            content: narrationResult.narration
                                        });
                                        localLog(`Combat narration generated: ${narrationResult.narration.substring(0, 100)}...`);
                                    }
                                } catch (narrationError) {
                                    // If narration generation fails, log it but don't break combat flow
                                    log.warn('Failed to generate combat narration', {
                                        module: 'CombatManager',
                                        error: narrationError instanceof Error ? narrationError.message : String(narrationError),
                                        player: activeCombatant.characterName,
                                        target: targetVisualName,
                                    });
                                    localLog(`Warning: Combat narration generation failed: ${narrationError}`);
                                }
                                
                            } catch (error) {
                                log.error('Error processing player attack', {
                                    module: 'CombatManager',
                                    error: error instanceof Error ? error.message : String(error),
                                    player: activeCombatant.characterName,
                                    target: targetVisualName,
                                });
                                messages.push({
                                    sender: 'DM',
                                    content: `Hubo un error al procesar el ataque de ${activeCombatant.characterName}.`
                                });
                            }
                        }
                    } else {
                        localLog(`Target not found for player action: ${targetIdToUse} (resolved: ${resolvedTargetId})`);
                        messages.push({
                            sender: 'DM',
                            content: `No puedes encontrar ese objetivo.`
                        });
                    }
                    
                    // Check if combat has ended after player action
                    const endOfCombatCheck = checkEndOfCombat(updatedParty, updatedEnemies);
                    if (endOfCombatCheck.combatEnded) {
                        localLog(`Combat ended after player action: ${endOfCombatCheck.reason}`);
                        messages.push({
                            sender: 'DM',
                            content: endOfCombatCheck.reason || 'El combate ha terminado.'
                        });
                        return {
                            messages,
                            diceRolls,
                            inCombat: false,
                            debugLogs,
                            turnIndex: 0,
                            initiativeOrder: [],
                            enemies: [],
                            updatedParty,
                            updatedEnemies,
                            hasMoreAITurns: false,
                            lastProcessedTurnWasAI: false,
                            lastProcessedTurnIndex: currentTurnIndex,
                        };
                    }
                    
                    // Issue #80: After processing player action, DO NOT advance turn yet
                    // The turn will advance when user explicitly clicks "Pasar turno"
                    // We return immediately to show messages and buttons
                    localLog(`Player action completed. Waiting for user to advance turn.`);
                    
                    return {
                        messages,
                        diceRolls,
                        inCombat: true,
                        debugLogs,
                        turnIndex: currentTurnIndex, // Still player's turn
                        initiativeOrder,
                        updatedParty,
                        updatedEnemies,
                        hasMoreAITurns: false, // Player's turn - buttons should appear but not auto-advance
                        lastProcessedTurnWasAI: false, // Player action was processed
                        lastProcessedTurnIndex: currentTurnIndex, // Current turn was just processed
                        playerActionCompleted: true, // NEW: Signal that player has acted this turn
                    };
                    }
                }
            }
            
            // Issue #54: Process ONE AI turn OR player unconscious turn (if applicable)
            let combatHasEnded = false;
            // Check if we should process this turn automatically (AI turn or player unconscious)
            const shouldProcessTurn = activeCombatant && 
                (activeCombatant.controlledBy === 'AI' || 
                (activeCombatant.controlledBy === 'Player' && 
                    isUnconsciousOrDead(updatedParty.find(p => p.id === activeCombatant.id))));
            
            if(shouldProcessTurn && !combatHasEnded) {
                const isPlayerUnconscious = activeCombatant.controlledBy === 'Player';
                localLog(`Processing turn for ${isPlayerUnconscious ? 'unconscious player' : 'AI combatant'} ${activeCombatant.characterName} at index ${currentTurnIndex}...`);
                
                // Check if active combatant is dead or unconscious - skip their turn if so
                const isCompanion = updatedParty.some(p => p.id === activeCombatant.id);
                const activeCombatantData = isCompanion 
                    ? updatedParty.find(p => p.id === activeCombatant.id)
                    : updatedEnemies.find(e => (e as any).uniqueId === activeCombatant.id);
                
                if (activeCombatantData && isUnconsciousOrDead(activeCombatantData)) {
                    log.debug('Skipping turn for dead/unconscious combatant', {
                        module: 'CombatManager',
                        combatant: activeCombatant.characterName,
                        hp: activeCombatantData.hp.current,
                        isDead: activeCombatantData.isDead,
                        isCompanion: isCompanion,
                    });
                    
                    // Mensaje apropiado según estado y tipo de combatiente
                    // Enemigos: mueren directamente al llegar a HP 0 (no quedan inconscientes)
                    // Personajes del grupo: pueden quedar inconscientes (isDead = false) o muertos (isDead = true)
                    let statusMessage: string;
                    if (isCompanion) {
                        // Personaje del grupo: distinguir entre muerto e inconsciente
                        statusMessage = activeCombatantData.isDead === true 
                            ? `${activeCombatant.characterName} está muerto y no puede actuar.`
                            : `${activeCombatant.characterName} está inconsciente y no puede actuar.`;
                    } else {
                        // Enemigo: si HP <= 0, está muerto (no tienen concepto de inconsciencia)
                        statusMessage = `${activeCombatant.characterName} está muerto y no puede actuar.`;
                    }
                    
                    messages.push({
                        sender: 'DM',
                        content: statusMessage
                    });
                    
                    // Advance to next turn
                    currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
                    activeCombatant = initiativeOrder[currentTurnIndex];
                    
                    // Issue #54: Check if next turn should be processed automatically (AI or player unconscious)
                    const nextTurnPlayerData = activeCombatant?.controlledBy === 'Player' 
                        ? updatedParty.find(p => p.id === activeCombatant.id) 
                        : null;
                    const hasMoreAITurns = activeCombatant && 
                        (activeCombatant.controlledBy === 'AI' || 
                        (activeCombatant.controlledBy === 'Player' && nextTurnPlayerData && isUnconsciousOrDead(nextTurnPlayerData))) 
                        && !combatHasEnded;
                    
                    // Calculate which turn was just processed (skipped due to dead/unconscious)
                    const processedTurnIndex = (currentTurnIndex - 1 + initiativeOrder.length) % initiativeOrder.length;
                    
                    // Return immediately (don't continue loop)
                    return {
                        messages,
                        diceRolls,
                        inCombat: true,
                        debugLogs,
                        turnIndex: currentTurnIndex,
                        initiativeOrder,
                        updatedParty,
                        updatedEnemies,
                        hasMoreAITurns,
                        lastProcessedTurnWasAI: true,
                        lastProcessedTurnIndex: processedTurnIndex,
                    };
                }
                let tacticianResponse;

                // Get visual names for enemies to pass to tacticians
                const enemyVisualNames = new Map<string, string>();
                for (const enemy of updatedEnemies) {
                    const visualName = getVisualName(enemy.uniqueId, initiativeOrder, updatedEnemies);
                    enemyVisualNames.set(enemy.uniqueId, visualName);
                    log.debug(`Enemy mapping: uniqueId=${enemy.uniqueId}, originalName="${enemy.name}", visualName="${visualName}"`, {
                        module: 'CombatManager',
                        action: 'getVisualNames',
                    });
                }

                // Filter out dead combatants before passing to tactician (Issue #18)
                const aliveParty = updatedParty.filter(p => p.hp.current > 0);
                const aliveEnemies = updatedEnemies.filter(e => e.hp.current > 0);
                
                log.debug('Filtering dead combatants for tactician', {
                    module: 'CombatManager',
                    activeCombatant: activeCombatant.characterName,
                    totalParty: updatedParty.length,
                    aliveParty: aliveParty.length,
                    totalEnemies: updatedEnemies.length,
                    aliveEnemies: aliveEnemies.length,
                });

                const baseTacticianInput = {
                    activeCombatant: activeCombatant.characterName,
                    party: aliveParty,
                    enemies: aliveEnemies.map(e => ({ 
                        name: enemyVisualNames.get(e.uniqueId) || e.name, // Use visual name
                        id: e.uniqueId, 
                        hp: getHpStatus(e.hp.current, e.hp.max) 
                    })),
                    locationDescription: locationContext?.description || "An unknown battlefield",
                    conversationHistory: conversationHistory.map(formatMessageForTranscript).join('\n'),
                    availableSpells: isCompanion ? (activeCombatant.spells || []) : []
                };

                if (isCompanion) {
                    localLog(`Invoking CompanionTacticianTool for ${activeCombatant.characterName}.`);
                    tacticianResponse = await companionTacticianTool(baseTacticianInput);
                } else {
                    localLog(`Invoking EnemyTacticianTool for ${activeCombatant.characterName}.`);
                    tacticianResponse = await enemyTacticianTool(baseTacticianInput);
                }

                const { narration, targetId, diceRolls: requestedRolls } = tacticianResponse;

                localLog(`Tactician for ${activeCombatant.characterName} decided action targeting ${targetId || 'no one'}.`);

                if (narration) {
                    // Post-process narration to replace enemy IDs/names with visual names
                    // IMPORTANT: Process in reverse order (longest names first) to avoid multiple replacements
                    let processedNarration = narration;
                    
                    // FIRST: Replace ordinal references (e.g., "primer goblin" -> "Goblin 1")
                    processedNarration = replaceOrdinalReferences(processedNarration, updatedEnemies, enemyVisualNames);
                    
                    // Sort enemies by visual name length (longest first) to avoid replacing "Goblin 2" with "Goblin 1 2"
                    const enemiesSorted = [...updatedEnemies].sort((a, b) => {
                        const nameA = enemyVisualNames.get(a.uniqueId) || a.name;
                        const nameB = enemyVisualNames.get(b.uniqueId) || b.name;
                        return nameB.length - nameA.length; // Longest first
                    });
                    
                    for (const enemy of enemiesSorted) {
                        const visualName = enemyVisualNames.get(enemy.uniqueId) || enemy.name;
                        const originalName = enemy.name;
                        
                        // Log for debugging
                        if (originalName !== visualName) {
                            log.debug(`Post-processing narration: ${originalName} -> ${visualName} (uniqueId: ${enemy.uniqueId})`, {
                                module: 'CombatManager',
                                action: 'postProcessNarration',
                            });
                        }
                        
                        // Replace uniqueId references first (e.g., "goblin-1", "goblin-2")
                        const beforeUniqueId = processedNarration;
                        processedNarration = processedNarration.replace(
                            new RegExp(`\\b${enemy.uniqueId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
                            visualName
                        );
                        if (beforeUniqueId !== processedNarration) {
                            log.debug(`Replaced uniqueId ${enemy.uniqueId} with ${visualName}`, {
                                module: 'CombatManager',
                                action: 'postProcessNarration',
                            });
                        }
                        
                        // Replace original name references ONLY if:
                        // 1. The visual name is different from the original name
                        // 2. The original name is NOT already part of a visual name (e.g., don't replace "Goblin" in "Goblin 2")
                        // 3. Check if the FULL visual name (with number) is already present (case-insensitive)
                        //    BUT allow replacement if it's just the base name without number
                        const visualNameLower = visualName.toLowerCase();
                        const narrationLower = processedNarration.toLowerCase();
                        
                        // Check if the full visual name (e.g., "goblin 1") is present
                        const hasFullVisualName = new RegExp(`\\b${escapeRegex(visualNameLower)}\\b`).test(narrationLower);
                        const hasBaseNameWithNumber = new RegExp(`\\b${escapeRegex(originalName.toLowerCase())}\\s+\\d+\\b`).test(narrationLower);
                        
                        // Only skip if the FULL visual name is present, OR if the base name is already followed by a number
                        const shouldSkip = hasFullVisualName || hasBaseNameWithNumber;
                        
                        if (originalName !== visualName && 
                            !visualName.startsWith(originalName + ' ') &&
                            !shouldSkip) {
                            // Only replace if it's a standalone word and NOT followed by a number (which would indicate it's already a visual name)
                            // Use negative lookahead to avoid replacing "Goblin" in "Goblin 2"
                            // Make it case-insensitive to catch "goblin" (lowercase) and "Goblin" (capitalized)
                            const beforeName = processedNarration;
                            processedNarration = processedNarration.replace(
                                new RegExp(`\\b${escapeRegex(originalName)}(?!\\s+\\d)`, 'gi'),
                                visualName
                            );
                            if (beforeName !== processedNarration) {
                                log.debug(`Replaced name "${originalName}" with "${visualName}"`, {
                                    module: 'CombatManager',
                                    action: 'postProcessNarration',
                                });
                            }
                                } else {
                            if (originalName !== visualName) {
                                log.debug(`Skipped replacing "${originalName}" -> "${visualName}": already present or would create duplicate`, {
                                    module: 'CombatManager',
                                    action: 'postProcessNarration',
                                    hasFullVisualName,
                                    hasBaseNameWithNumber,
                                });
                            }
                        }
                    }
                    
                    log.debug(`Final processed narration: ${processedNarration.substring(0, 100)}...`, {
                        module: 'CombatManager',
                        action: 'postProcessNarration',
                    });
                    messages.push({ sender: 'DM', content: processedNarration });
                }

                if (targetId && requestedRolls && requestedRolls.length > 0) {
                    // Resolve targetId (can be visual name or uniqueId)
                    const resolved = resolveEnemyId(targetId, updatedEnemies, initiativeOrder, updatedParty);
                    
                    // For AI, if ambiguous, choose the first match (or could use tactical logic)
                    let resolvedTargetId = resolved.uniqueId;
                    if (resolved.ambiguous && resolved.matches.length > 0) {
                        // Choose first match (could be improved with tactical logic)
                        const firstMatchName = resolved.matches[0];
                        const firstMatchCombatant = initiativeOrder.find(c => c.characterName === firstMatchName);
                        resolvedTargetId = firstMatchCombatant?.id || null;
                        localLog(`AI target ambiguous, choosing first match: ${firstMatchName} (${resolvedTargetId})`);
                    }
                    
                    // Use resolved uniqueId to find target
                    const finalTargetId = resolvedTargetId || targetId;
                    const target = [...updatedParty, ...updatedEnemies].find(
                        c => c.id === finalTargetId || (c as any).uniqueId === finalTargetId
                    );

                    if (target) {
                        // Process AI combatant rolls using centralized function (resolves Issue #21)
                        const rollsResult = await processAICombatantRolls({
                            activeCombatant,
                            requestedRolls,
                            target,
                            updatedParty,
                            updatedEnemies,
                            newInitiativeOrder: initiativeOrder,
                            localLog,
                        });
                        
                        // Extract results
                        diceRolls.push(...rollsResult.diceRolls);
                        messages.push(...rollsResult.messages);
                        updatedParty = rollsResult.updatedParty;
                        updatedEnemies = rollsResult.updatedEnemies;
                        combatHasEnded = rollsResult.combatEnded;
                        
                        // Double-check combat end status after updating enemies
                        if (!combatHasEnded) {
                            const endOfCombatCheck = checkEndOfCombat(updatedParty, updatedEnemies);
                            if (endOfCombatCheck.combatEnded) {
                                localLog(`Combat ended detected after AI turn: ${endOfCombatCheck.reason}`);
                                combatHasEnded = true;
                                if (!messages.some(m => m.content?.includes('Victoria') || m.content?.includes('derrotados'))) {
                                    messages.push({
                                        sender: 'DM',
                                        content: endOfCombatCheck.reason || 'El combate ha terminado.'
                                    });
                                }
                            }
                        }
                    } else { localLog(`Could not find target combatant with id: "${targetId}"`); }
                } else if (!targetId) { localLog('Action had no targetId.'); }
                
                // Only advance turn if combat hasn't ended
                if (!combatHasEnded) {
                currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
                activeCombatant = initiativeOrder[currentTurnIndex];
            }
            
                // If combat ended during this turn, return final state
                if (combatHasEnded) {
                    // The AI turn that just finished caused the combat to end
                    return {
                        messages,
                        diceRolls,
                        inCombat: false,
                        debugLogs,
                        turnIndex: 0,
                        initiativeOrder: [],
                        enemies: [],
                        updatedParty,
                        updatedEnemies,
                        lastProcessedTurnWasAI: true,
                        lastProcessedTurnIndex: currentTurnIndex, // The turn that ended combat
                    };
                }
                
                // Issue #54: Check if next turn should be processed automatically (AI or player unconscious)
                const nextTurnPlayerData = activeCombatant?.controlledBy === 'Player' 
                    ? updatedParty.find(p => p.id === activeCombatant.id) 
                    : null;
                const hasMoreAITurns = activeCombatant && 
                    (activeCombatant.controlledBy === 'AI' || 
                    (activeCombatant.controlledBy === 'Player' && nextTurnPlayerData && isUnconsciousOrDead(nextTurnPlayerData))) 
                    && !combatHasEnded;
                
                log.info('AI turn processed - determining hasMoreAITurns', {
                    module: 'CombatManager',
                    currentTurnIndex,
                    nextCombatant: activeCombatant?.characterName || 'Unknown',
                    nextControlledBy: activeCombatant?.controlledBy,
                    hasMoreAITurns,
                    combatHasEnded,
                });
                
                localLog(`AI turn processed. Next combatant: ${activeCombatant?.characterName} (hasMoreAITurns: ${hasMoreAITurns})`);
                
                // Calculate which turn was just processed (it's the previous one before advancing)
                const processedTurnIndex = (currentTurnIndex - 1 + initiativeOrder.length) % initiativeOrder.length;
                
                // Return immediately after processing ONE AI turn
                log.info('Returning combat result after AI turn', {
                    module: 'CombatManager',
                    turnIndex: currentTurnIndex,
                    processedTurnIndex,
                    hasMoreAITurns,
                    messagesCount: messages.length,
                    diceRollsCount: diceRolls.length,
                    nextCombatant: activeCombatant?.characterName || 'Unknown',
                });
                
                localLog(`[DEBUG] Returning after AI turn. turnIndex=${currentTurnIndex} (${activeCombatant?.characterName}), lastProcessedTurnIndex=${processedTurnIndex}, hasMoreAITurns=${hasMoreAITurns}`);
                return {
                    messages,
                    diceRolls,
                    inCombat: true,
                    debugLogs,
                    turnIndex: currentTurnIndex,
                    initiativeOrder,
                    updatedParty,
                    updatedEnemies,
                    hasMoreAITurns,
                    lastProcessedTurnWasAI: true,
                    lastProcessedTurnIndex: processedTurnIndex,
                };
            }
            
            // If it's not an AI's turn (i.e., player's turn), return without processing
            const playerCombatant = initiativeOrder.find(c => c.controlledBy === 'Player');
            localLog(`Player's turn. Control ceded to player ${playerCombatant?.characterName} at index ${currentTurnIndex}.`);
            
            // The last processed turn was the player's turn (no AI turn was processed in this response)
            const processedTurnIndex = (currentTurnIndex - 1 + initiativeOrder.length) % initiativeOrder.length;
            
            return { 
                messages, 
                diceRolls, 
                inCombat: true, 
                debugLogs, 
                turnIndex: currentTurnIndex, 
                initiativeOrder, 
                updatedParty, 
                updatedEnemies,
                hasMoreAITurns: false,
                lastProcessedTurnWasAI: false,
                lastProcessedTurnIndex: processedTurnIndex,
            };
        }
        
        // --- Combat Initiation Logic (remains the same) ---
        localLog("Initiating new combat sequence.");
        if (!combatantIds || !interpretedAction || !locationContext || !party) throw new Error("Combat initiation requires combatantIds, interpretedAction, locationContext, and party data.");
        const adventureData = await getAdventureData();
        const allEntities = adventureData.entities;
        const combatantData: any[] = [];
        for (const id of combatantIds) {
            let found = party.find(p => p.id === id);
            if (found) {
                // Issue #27: Verificar HP antes de incluir en combate
                if (found.hp && found.hp.current > 0) {
                    combatantData.push({ ...found, entityType: 'player', name: found.name, controlledBy: found.controlledBy });
                } else {
                    log.debug('Skipping dead party member in combat initiation', {
                        module: 'CombatManager',
                        characterName: found.name,
                        hp: found.hp?.current || 0,
                    });
                }
                continue;
            }
            found = allEntities.find((e: any) => e.id === id);
            if (found) {
                // Issue #27: Verificar si el enemigo ya existe en updatedEnemies y está muerto
                // Si no existe en updatedEnemies, asumir vivo (nuevo enemigo)
                const existingEnemy = updatedEnemies.find((e: any) => e.id === id || (e as any).uniqueId === id);
                if (!existingEnemy || (existingEnemy.hp && existingEnemy.hp.current > 0)) {
                    combatantData.push({ ...found, entityType: 'monster', name: found.name, controlledBy: 'AI' });
                } else {
                    log.debug('Skipping dead enemy in combat initiation', {
                        module: 'CombatManager',
                        enemyId: id,
                        hp: existingEnemy.hp?.current || 0,
                    });
                }
            } else {
                log.warn('Combatant ID not found in entities', {
                    module: 'CombatManager',
                    combatantId: id,
                    availableEntityIds: allEntities.map((e: any) => e.id),
                });
            }
        }
        const hostileEntities = combatantData.filter(c => c.entityType === 'monster');
        if (hostileEntities.length === 0) {
            messages.push({ sender: 'DM', content: "Atacas fervientemente al aire, pero no parece haber ninguna amenaza real a la vista." });
            return { messages, inCombat: false, debugLogs };
        }
        messages.push({ sender: 'System', content: `¡Comienza el Combate!` });
        // Generate uniqueIds for enemies based on their base name (extract from id if it has dashes)
        // This ensures consistent uniqueIds like "goblin-1", "goblin-2", "orco-1" (1-indexed to match visual names)
        // Group enemies by base name and number them within each group
        const enemyGroups = new Map<string, number>(); // Map<baseName, currentIndex>
        const initialEnemies = hostileEntities.map((e: any) => {
            // Extract base name from id (remove any existing numeric suffix)
            // e.g., "goblin-2" -> "goblin", "goblin" -> "goblin", "orco-1" -> "orco"
            const baseId = e.id.split('-').slice(0, -1).join('-') || e.id.split('-')[0] || e.id;
            
            // Get or initialize the index for this base name (start at 1 to match visual numbering)
            const currentIndex = enemyGroups.get(baseId) || 1;
            enemyGroups.set(baseId, currentIndex + 1);
            
            const uniqueId = `${baseId}-${currentIndex}`;
            return { ...e, uniqueId };
        });
        const combatantsForInit = [ ...combatantData.filter(c => c.entityType === 'player'), ...initialEnemies.map(e => ({...e, id: e.uniqueId })) ];
        const initiativeRolls: any[] = [];
        // Generate differentiated names BEFORE initiative rolls so we can use them in dice rolls
        const differentiatedNames = generateDifferentiatedNames(initialEnemies);
        
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
            diceRolls.push(roll);
            const combatantType = combatant.entityType === 'player' ? 'ally' : 'enemy';
            initiativeRolls.push({ id: combatant.id, name: combatant.name, total: roll.totalResult, type: combatantType, controlledBy: combatant.controlledBy });
        }
        initiativeRolls.sort((a, b) => b.total - a.total);
        
        // Differentiated names already generated above, reuse them
        
        // Create initiativeOrder with differentiated names for enemies
        const newInitiativeOrder: Combatant[] = initiativeRolls.map(r => {
            // Check if this is an enemy (has uniqueId pattern)
            const isEnemy = /^[^-]+-\d+$/.test(r.id);
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
            
            return {
                id: r.id,
                characterName: displayName,
                total: r.total,
                type: r.type as any,
                controlledBy: r.controlledBy as any
            };
        });
        
        // Initialize enemies array for combat processing
        // If hp or ac are missing, fetch from D&D API
        updatedEnemies = [];
        for (const enemy of initialEnemies) {
            let hpValue: number | undefined;
            let hpMax: number | undefined;
            let ac = enemy.ac;
            
            // Handle hp: can be a number or an object { current: number, max: number }
            if (enemy.hp !== undefined && enemy.hp !== null) {
                if (typeof enemy.hp === 'number') {
                    // HP is a single number, use it for both current and max
                    hpValue = enemy.hp;
                    hpMax = enemy.hp;
                } else if (typeof enemy.hp === 'object' && 'current' in enemy.hp && 'max' in enemy.hp) {
                    // HP is an object with current and max
                    hpValue = typeof enemy.hp.current === 'number' ? enemy.hp.current : undefined;
                    hpMax = typeof enemy.hp.max === 'number' ? enemy.hp.max : undefined;
                }
            }
            
            // If hp or ac are missing, try to fetch from D&D API
            if (hpValue === undefined || hpMax === undefined || ac === undefined || ac === null) {
                localLog(`Enemy ${enemy.name} missing hp or ac, fetching from D&D API...`);
                const stats = await getMonsterStatsFromDndApi(enemy.name);
                
                if (stats) {
                    // Use fetched stats if we don't have them
                    hpValue = hpValue !== undefined ? hpValue : stats.hp;
                    hpMax = hpMax !== undefined ? hpMax : stats.hp;
                    ac = ac !== undefined && ac !== null ? ac : stats.ac;
                    localLog(`Fetched stats for ${enemy.name}: HP=${hpMax}, AC=${ac}`);
                } else {
                    // Use defaults if API lookup fails
                    hpValue = hpValue !== undefined ? hpValue : 10;
                    hpMax = hpMax !== undefined ? hpMax : 10;
                    ac = ac !== undefined && ac !== null ? ac : 10;
                    localLog(`Using default stats for ${enemy.name}: HP=${hpMax}, AC=${ac}`);
                }
            }
            
            // Ensure we have valid values (should always be true at this point, but double-check)
            if (hpValue === undefined || hpMax === undefined) {
                log.warn('Enemy HP still undefined after all attempts, using defaults', {
                    module: 'CombatManager',
                    enemyName: enemy.name,
                    enemyId: enemy.id,
                });
                hpValue = 10;
                hpMax = 10;
            }
            
            if (ac === undefined || ac === null) {
                log.warn('Enemy AC still undefined after all attempts, using default', {
                    module: 'CombatManager',
                    enemyName: enemy.name,
                    enemyId: enemy.id,
                });
                ac = 10;
            }
            
            // Create enemy with validated HP
            // IMPORTANT: Use uniqueId as id to maintain consistency with initiativeOrder
            // The original id from JSON is preserved in adventureId for target resolution
            const newEnemy = {
                uniqueId: enemy.uniqueId,
                id: enemy.uniqueId, // Use uniqueId as id to match initiativeOrder
                adventureId: enemy.id, // Preserve original adventure entity ID
                name: enemy.name,
                color: '#ef4444',
                hp: { current: hpValue, max: hpMax },
                ac: ac,
            };
            
            // Validate and clamp HP before adding to array
            const validatedEnemy = validateAndClampHP(newEnemy);
            updatedEnemies.push(validatedEnemy);
        }
        
        // Generate narrative BEFORE processing combat turns (so it appears first in the chat)
        // Limit conversation history to last 5 messages for combat initiation context
        const recentHistory = conversationHistory.slice(-5);
        const historyTranscript = recentHistory.map(formatMessageForTranscript).join('\n');
        
        // Build combat context for narrative expert
        const combatContext = {
            initiativeOrder: newInitiativeOrder.map((c, idx) => ({
                position: idx + 1,
                name: c.characterName,
                controlledBy: c.controlledBy,
                type: c.type
            })),
            allies: updatedParty.map(p => ({
                name: p.name,
                hp: `${p.hp.current}/${p.hp.max}`,
                controlledBy: p.controlledBy || 'Player'
            })),
            enemies: updatedEnemies.map(e => {
                const visualName = differentiatedNames.get(e.uniqueId) || e.name;
                return {
                    name: visualName,
                    hp: `${e.hp.current}/${e.hp.max}`,
                    controlledBy: 'AI'
                };
            })
        };
        
        const narrativeResult = await narrativeExpert({ 
            playerAction, 
            locationId, 
            locationContext: JSON.stringify(locationContext), 
            conversationHistory: historyTranscript, 
            interpretedAction: JSON.stringify(interpretedAction),
            phase: 'combat_initiation',
            combatContext: JSON.stringify(combatContext)
        });
        if (narrativeResult.debugLogs) narrativeResult.debugLogs.forEach(log => debugLogs.push(log));
        if (narrativeResult.dmNarration) {
            // Post-process narration to replace enemy IDs/names with visual names
            // IMPORTANT: Process in reverse order (longest names first) to avoid multiple replacements
            let processedNarration = narrativeResult.dmNarration;
            const differentiatedNames = generateDifferentiatedNames(updatedEnemies);
            
            // FIRST: Replace ordinal references (e.g., "primer goblin" -> "Goblin 1")
            processedNarration = replaceOrdinalReferences(processedNarration, updatedEnemies, differentiatedNames);
            
            // Sort enemies by visual name length (longest first) to avoid replacing "Goblin 2" with "Goblin 1 2"
            const enemiesSorted = [...updatedEnemies].sort((a, b) => {
                const nameA = differentiatedNames.get(a.uniqueId) || a.name;
                const nameB = differentiatedNames.get(b.uniqueId) || b.name;
                return nameB.length - nameA.length; // Longest first
            });
            
            for (const enemy of enemiesSorted) {
                const visualName = differentiatedNames.get(enemy.uniqueId) || enemy.name;
                const originalName = enemy.name;
                
                // Log for debugging
                if (originalName !== visualName) {
                    log.debug(`Post-processing DM narration: ${originalName} -> ${visualName} (uniqueId: ${enemy.uniqueId})`, {
                        module: 'CombatManager',
                        action: 'postProcessDmNarration',
                    });
                }
                
                // Replace uniqueId references first (e.g., "goblin-0", "goblin-1")
                const beforeUniqueId = processedNarration;
                processedNarration = processedNarration.replace(
                    new RegExp(`\\b${enemy.uniqueId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
                    visualName
                );
                if (beforeUniqueId !== processedNarration) {
                    log.debug(`Replaced uniqueId ${enemy.uniqueId} with ${visualName} in DM narration`, {
                        module: 'CombatManager',
                        action: 'postProcessDmNarration',
                    });
                }
                
                // Replace original name references ONLY if:
                // 1. The visual name is different from the original name
                // 2. The original name is NOT already part of a visual name (e.g., don't replace "Goblin" in "Goblin 2")
                // 3. Check if the FULL visual name (with number) is already present (case-insensitive)
                //    BUT allow replacement if it's just the base name without number
                const visualNameLower = visualName.toLowerCase();
                const narrationLower = processedNarration.toLowerCase();
                
                // Check if the full visual name (e.g., "goblin 1") is present
                // We need to be smart: if we see "goblin 1" (with number), don't replace "goblin" standalone
                // But if we only see "goblin" (without number), we should replace it
                const hasFullVisualName = new RegExp(`\\b${escapeRegex(visualNameLower)}\\b`).test(narrationLower);
                const hasBaseNameWithNumber = new RegExp(`\\b${escapeRegex(originalName.toLowerCase())}\\s+\\d+\\b`).test(narrationLower);
                
                // Only skip if the FULL visual name is present, OR if the base name is already followed by a number
                const shouldSkip = hasFullVisualName || hasBaseNameWithNumber;
                
                if (originalName !== visualName && 
                    !visualName.startsWith(originalName + ' ') &&
                    !shouldSkip) {
                    // Only replace if it's a standalone word and NOT followed by a number (which would indicate it's already a visual name)
                    // Use negative lookahead to avoid replacing "Goblin" in "Goblin 2"
                    // Make it case-insensitive to catch "goblin" (lowercase) and "Goblin" (capitalized)
                    const beforeName = processedNarration;
                    processedNarration = processedNarration.replace(
                        new RegExp(`\\b${escapeRegex(originalName)}(?!\\s+\\d)`, 'gi'),
                        visualName
                    );
                    if (beforeName !== processedNarration) {
                        log.debug(`Replaced name "${originalName}" with "${visualName}" in DM narration`, {
                            module: 'CombatManager',
                            action: 'postProcessDmNarration',
                        });
                    }
                } else {
                    if (originalName !== visualName) {
                        log.debug(`Skipped replacing "${originalName}" -> "${visualName}" in DM narration: already present or would create duplicate`, {
                            module: 'CombatManager',
                            action: 'postProcessDmNarration',
                            hasFullVisualName,
                            hasBaseNameWithNumber,
                            narrationSample: processedNarration.substring(0, 100),
                        });
                    }
                }
            }
            
            log.debug(`Final processed DM narration: ${processedNarration.substring(0, 100)}...`, {
                module: 'CombatManager',
                action: 'postProcessDmNarration',
            });
            const { html } = await markdownToHtml({ markdown: processedNarration });
            messages.push({ sender: 'DM', content: html, originalContent: processedNarration });
        }
        
        // Process AI turns automatically if the first combatant is an AI
        let currentTurnIndex = 0;
        let activeCombatant = newInitiativeOrder[currentTurnIndex];
        
        localLog(`Combat initiated. First combatant: ${activeCombatant.characterName} (controlled by: ${activeCombatant.controlledBy})`);
        
        // Process ONE AI turn (if first combatant is AI)
        let combatHasEnded = false;
        if(activeCombatant && activeCombatant.controlledBy === 'AI' && !combatHasEnded) {
            localLog(`Processing turn for AI combatant ${activeCombatant.characterName} at index ${currentTurnIndex}...`);
            
            const isCompanion = updatedParty.some(p => p.id === activeCombatant.id);
            
            // Issue #27: Check if active combatant is dead/unconscious - skip their turn if so
            const activeCombatantDataInit = isCompanion 
                ? updatedParty.find(p => p.id === activeCombatant.id)
                : updatedEnemies.find(e => (e as any).uniqueId === activeCombatant.id);
            
            if (activeCombatantDataInit && isUnconsciousOrDead(activeCombatantDataInit)) {
                log.debug('Skipping turn for dead/unconscious combatant (init)', {
                    module: 'CombatManager',
                    combatant: activeCombatant.characterName,
                    hp: activeCombatantDataInit.hp.current,
                    isDead: activeCombatantDataInit.isDead,
                    isCompanion: isCompanion,
                });
                
                // Mensaje apropiado según estado y tipo de combatiente
                // Enemigos: mueren directamente al llegar a HP 0 (no quedan inconscientes)
                // Personajes del grupo: pueden quedar inconscientes (isDead = false) o muertos (isDead = true)
                let statusMessage: string;
                if (isCompanion) {
                    // Personaje del grupo: distinguir entre muerto e inconsciente
                    statusMessage = activeCombatantDataInit.isDead === true 
                    ? `${activeCombatant.characterName} está muerto y no puede actuar.`
                    : `${activeCombatant.characterName} está inconsciente y no puede actuar.`;
                } else {
                    // Enemigo: si HP <= 0, está muerto (no tienen concepto de inconsciencia)
                    statusMessage = `${activeCombatant.characterName} está muerto y no puede actuar.`;
                }
                
                messages.push({
                    sender: 'DM',
                    content: statusMessage
                });
                
                // Advance to next turn
                currentTurnIndex = (currentTurnIndex + 1) % newInitiativeOrder.length;
                activeCombatant = newInitiativeOrder[currentTurnIndex];
                
                // Issue #54: Check if next turn should be processed automatically (AI or player unconscious)
                const nextTurnPlayerDataInit = activeCombatant?.controlledBy === 'Player' 
                    ? updatedParty.find(p => p.id === activeCombatant.id) 
                    : null;
                const hasMoreAITurns = activeCombatant && 
                    (activeCombatant.controlledBy === 'AI' || 
                    (activeCombatant.controlledBy === 'Player' && nextTurnPlayerDataInit && isUnconsciousOrDead(nextTurnPlayerDataInit))) 
                    && !combatHasEnded;
                
                // Calculate which turn was just processed (skipped due to dead/unconscious)
                const processedTurnIndex = (currentTurnIndex - 1 + newInitiativeOrder.length) % newInitiativeOrder.length;
                
                // Return immediately (don't continue loop)
                return {
                    messages,
                    diceRolls,
                    inCombat: true,
                    initiativeOrder: newInitiativeOrder,
                    turnIndex: currentTurnIndex,
                    enemies: updatedEnemies,
                    debugLogs,
                    updatedParty,
                    hasMoreAITurns,
                    lastProcessedTurnWasAI: true,
                    lastProcessedTurnIndex: processedTurnIndex,
                };
            }
            
            let tacticianResponse;

            // Get visual names for enemies to pass to tacticians
            const enemyVisualNamesInit = new Map<string, string>();
            for (const enemy of updatedEnemies) {
                const visualName = getVisualName(enemy.uniqueId, newInitiativeOrder, updatedEnemies);
                enemyVisualNamesInit.set(enemy.uniqueId, visualName);
                log.debug(`Enemy mapping (init): uniqueId=${enemy.uniqueId}, originalName="${enemy.name}", visualName="${visualName}"`, {
                    module: 'CombatManager',
                    action: 'getVisualNamesInit',
                });
            }

            // Filter out dead combatants before passing to tactician (Issue #18)
            const alivePartyInit = updatedParty.filter(p => p.hp.current > 0);
            const aliveEnemiesInit = updatedEnemies.filter(e => e.hp.current > 0);
            
            log.debug('Filtering dead combatants for tactician (init)', {
                module: 'CombatManager',
                activeCombatant: activeCombatant.characterName,
                totalParty: updatedParty.length,
                aliveParty: alivePartyInit.length,
                totalEnemies: updatedEnemies.length,
                aliveEnemies: aliveEnemiesInit.length,
            });
            
            const baseTacticianInput = {
                activeCombatant: activeCombatant.characterName,
                party: alivePartyInit,
                enemies: aliveEnemiesInit.map(e => ({ 
                    name: enemyVisualNamesInit.get(e.uniqueId) || e.name, // Use visual name
                    id: e.uniqueId, 
                    hp: getHpStatus(e.hp.current, e.hp.max) 
                })),
                locationDescription: locationContext?.description || "An unknown battlefield",
                conversationHistory: conversationHistory.map(formatMessageForTranscript).join('\n'),
                availableSpells: isCompanion ? (activeCombatant.spells || []) : []
            };

            if (isCompanion) {
                localLog(`Invoking CompanionTacticianTool for ${activeCombatant.characterName}.`);
                tacticianResponse = await companionTacticianTool(baseTacticianInput);
            } else {
                localLog(`Invoking EnemyTacticianTool for ${activeCombatant.characterName}.`);
                tacticianResponse = await enemyTacticianTool(baseTacticianInput);
            }

            const { narration, targetId, diceRolls: requestedRolls } = tacticianResponse;

            localLog(`Tactician for ${activeCombatant.characterName} decided action targeting ${targetId || 'no one'}.`);

            if (narration) {
                // Post-process narration to replace enemy IDs/names with visual names
                // IMPORTANT: Process in reverse order (longest names first) to avoid multiple replacements
                let processedNarration = narration;
                
                // FIRST: Replace ordinal references (e.g., "primer goblin" -> "Goblin 1")
                processedNarration = replaceOrdinalReferences(processedNarration, updatedEnemies, enemyVisualNamesInit);
                
                // Sort enemies by visual name length (longest first) to avoid replacing "Goblin 2" with "Goblin 1 2"
                const enemiesSorted = [...updatedEnemies].sort((a, b) => {
                    const nameA = enemyVisualNamesInit.get(a.uniqueId) || a.name;
                    const nameB = enemyVisualNamesInit.get(b.uniqueId) || b.name;
                    return nameB.length - nameA.length; // Longest first
                });
                
                for (const enemy of enemiesSorted) {
                    const visualName = enemyVisualNamesInit.get(enemy.uniqueId) || enemy.name;
                    
                    // Replace uniqueId references first (e.g., "goblin-0", "goblin-1")
                    processedNarration = processedNarration.replace(
                        new RegExp(`\\b${enemy.uniqueId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
                        visualName
                    );
                    
                    // Replace original name references ONLY if:
                    // 1. The visual name is different from the original name
                    // 2. The original name is NOT already part of a visual name (e.g., don't replace "Goblin" in "Goblin 2")
                    // 3. Check if the FULL visual name (with number) is already present (case-insensitive)
                    //    BUT allow replacement if it's just the base name without number
                    const visualNameLower = visualName.toLowerCase();
                    const narrationLower = processedNarration.toLowerCase();
                    
                    // Check if the full visual name (e.g., "goblin 1") is present
                    const hasFullVisualName = new RegExp(`\\b${escapeRegex(visualNameLower)}\\b`).test(narrationLower);
                    const hasBaseNameWithNumber = new RegExp(`\\b${escapeRegex(enemy.name.toLowerCase())}\\s+\\d+\\b`).test(narrationLower);
                    
                    // Only skip if the FULL visual name is present, OR if the base name is already followed by a number
                    const shouldSkip = hasFullVisualName || hasBaseNameWithNumber;
                    
                    if (enemy.name !== visualName && 
                        !visualName.startsWith(enemy.name + ' ') &&
                        !shouldSkip) {
                        // Only replace if it's a standalone word and NOT followed by a number (which would indicate it's already a visual name)
                        // Use negative lookahead to avoid replacing "Goblin" in "Goblin 2"
                        // Make it case-insensitive to catch "goblin" (lowercase) and "Goblin" (capitalized)
                        const beforeName = processedNarration;
                        processedNarration = processedNarration.replace(
                            new RegExp(`\\b${escapeRegex(enemy.name)}(?!\\s+\\d)`, 'gi'),
                            visualName
                        );
                        if (beforeName !== processedNarration) {
                            log.debug(`Replaced name "${enemy.name}" with "${visualName}"`, {
                                module: 'CombatManager',
                                action: 'postProcessNarrationInit',
                            });
                        }
                    } else {
                        if (enemy.name !== visualName) {
                            log.debug(`Skipped replacing "${enemy.name}" -> "${visualName}": already present or would create duplicate`, {
                                module: 'CombatManager',
                                action: 'postProcessNarrationInit',
                                hasFullVisualName,
                                hasBaseNameWithNumber,
                            });
                        }
                    }
                }
                messages.push({ sender: 'DM', content: processedNarration });
            }

            if (targetId && requestedRolls && requestedRolls.length > 0) {
                // Resolve targetId (can be visual name or uniqueId)
                const resolved = resolveEnemyId(targetId, updatedEnemies, newInitiativeOrder, updatedParty);
                
                // For AI, if ambiguous, choose the first match (or could use tactical logic)
                let resolvedTargetId = resolved.uniqueId;
                if (resolved.ambiguous && resolved.matches.length > 0) {
                    // Choose first match (could be improved with tactical logic)
                    const firstMatchName = resolved.matches[0];
                    const firstMatchCombatant = newInitiativeOrder.find(c => c.characterName === firstMatchName);
                    resolvedTargetId = firstMatchCombatant?.id || null;
                    localLog(`AI target ambiguous, choosing first match: ${firstMatchName} (${resolvedTargetId})`);
                }
                
                // Use resolved uniqueId to find target
                const finalTargetId = resolvedTargetId || targetId;
                const target = [...updatedParty, ...updatedEnemies].find(
                    c => c.id === finalTargetId || (c as any).uniqueId === finalTargetId
                );

                if (target) {
                    // Process AI combatant rolls using centralized function (resolves Issue #21)
                    const rollsResult = await processAICombatantRolls({
                        activeCombatant,
                        requestedRolls,
                        target,
                        updatedParty,
                        updatedEnemies,
                        newInitiativeOrder,
                        localLog,
                    });
                    
                    // Extract results
                    diceRolls.push(...rollsResult.diceRolls);
                    messages.push(...rollsResult.messages);
                    updatedParty = rollsResult.updatedParty;
                    updatedEnemies = rollsResult.updatedEnemies;
                    combatHasEnded = rollsResult.combatEnded;
                    
                    // Double-check combat end status after updating enemies
                    if (!combatHasEnded) {
                        const endOfCombatCheck = checkEndOfCombat(updatedParty, updatedEnemies);
                        if (endOfCombatCheck.combatEnded) {
                            localLog(`Combat ended detected after initial AI turn: ${endOfCombatCheck.reason}`);
                            combatHasEnded = true;
                            if (!messages.some(m => m.content?.includes('Victoria') || m.content?.includes('derrotados'))) {
                                messages.push({
                                    sender: 'DM',
                                    content: endOfCombatCheck.reason || 'El combate ha terminado.'
                                });
                            }
                        }
                    }
                } else { localLog(`Could not find target combatant with id: "${targetId}"`); }
            } else if (!targetId) { localLog('Action had no targetId.'); }
            
            // Only advance turn if combat hasn't ended
            if (!combatHasEnded) {
                currentTurnIndex = (currentTurnIndex + 1) % newInitiativeOrder.length;
                activeCombatant = newInitiativeOrder[currentTurnIndex];
            }
            
            // If combat ended during this turn, return final state
            if (combatHasEnded) {
                // The initial AI turn that just finished caused the combat to end
                return {
                    messages,
                    diceRolls,
                    inCombat: false,
                    debugLogs,
                    turnIndex: 0,
                    initiativeOrder: [],
                    enemies: [],
                    updatedParty,
                    updatedEnemies,
                    lastProcessedTurnWasAI: true,
                    lastProcessedTurnIndex: currentTurnIndex, // The turn that ended combat
                };
            }
            
            // Issue #54: Check if next turn should be processed automatically (AI or player unconscious)
            const nextTurnPlayerDataInitial = activeCombatant?.controlledBy === 'Player' 
                ? updatedParty.find(p => p.id === activeCombatant.id) 
                : null;
            const hasMoreAITurns = activeCombatant && 
                (activeCombatant.controlledBy === 'AI' || 
                (activeCombatant.controlledBy === 'Player' && nextTurnPlayerDataInitial && isUnconsciousOrDead(nextTurnPlayerDataInitial))) 
                && !combatHasEnded;
            
            log.info('Initial AI turn processed - determining hasMoreAITurns', {
                module: 'CombatManager',
                currentTurnIndex,
                nextCombatant: activeCombatant?.characterName || 'Unknown',
                nextControlledBy: activeCombatant?.controlledBy,
                hasMoreAITurns,
                combatHasEnded,
            });
            
            localLog(`Initial AI turn processed. Next combatant: ${activeCombatant?.characterName} (hasMoreAITurns: ${hasMoreAITurns})`);
            
            // Calculate which turn was just processed (it's the previous one before advancing)
            const processedTurnIndex = (currentTurnIndex - 1 + newInitiativeOrder.length) % newInitiativeOrder.length;
            
            // Return immediately after processing ONE AI turn
            log.info('Returning combat result after initial AI turn', {
                module: 'CombatManager',
                turnIndex: currentTurnIndex,
                processedTurnIndex,
                hasMoreAITurns,
                messagesCount: messages.length,
                diceRollsCount: diceRolls.length,
                nextCombatant: activeCombatant?.characterName || 'Unknown',
            });
            
            return {
                messages,
                diceRolls,
                inCombat: true,
                initiativeOrder: newInitiativeOrder,
                turnIndex: currentTurnIndex,
                enemies: updatedEnemies,
                debugLogs,
                updatedParty,
                hasMoreAITurns,
                lastProcessedTurnWasAI: true,
                lastProcessedTurnIndex: processedTurnIndex,
            };
        }
        
        // If first combatant is not AI (i.e., player goes first), return without processing
        const playerCombatant = newInitiativeOrder.find(c => c.controlledBy === 'Player');
        localLog(`Combat initiated. Player goes first: ${playerCombatant?.characterName} at index ${currentTurnIndex}.`);
        
        const finalResult = {
            messages,
            diceRolls,
            inCombat: true,
            initiativeOrder: newInitiativeOrder,
            turnIndex: currentTurnIndex,
            enemies: updatedEnemies,
            debugLogs,
            updatedParty,
            hasMoreAITurns: false,
            lastProcessedTurnWasAI: false,
            lastProcessedTurnIndex: undefined, // Combat just started, no turn was processed yet
        };
        localLog(`Data being returned: ${JSON.stringify({ messages: finalResult.messages?.length, diceRolls: finalResult.diceRolls?.length, initiativeOrder: finalResult.initiativeOrder?.map(c => c.characterName), inCombat: finalResult.inCombat, turnIndex: finalResult.turnIndex, hasMoreAITurns: finalResult.hasMoreAITurns })}`);
        return finalResult;
    }
);
