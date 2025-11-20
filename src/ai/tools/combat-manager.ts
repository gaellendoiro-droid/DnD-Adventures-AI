/**
 * @fileOverview A Genkit tool that manages a full round or turn of combat.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { enemyTacticianTool } from './enemy-tactician';
import { companionTacticianTool } from './companion-tactician';
import type { GameMessage, DiceRoll, Combatant } from '@/lib/types';
import { diceRollerTool } from './dice-roller';

import { GameStateSchema, ActionInterpreterOutputSchema } from '@/ai/flows/schemas';
// narrativeExpert and markdownToHtml are lazy-loaded when combat starts (see line ~814)
import { log } from '@/lib/logger';
import {
    generateDifferentiatedNames,
    normalizeNameForMatching,
    escapeRegex,
    replaceOrdinalReferences,
    getVisualName,
} from '@/lib/combat/monster-name-manager';

import { resolveEnemyId } from '@/lib/combat/target-resolver';
import {
    getHpStatus,
    validateAndClampHP,
    isUnconsciousOrDead,
    checkEndOfCombat,
    applyDamage,
    getCriticalDamageNotation,
} from '@/lib/combat/rules-engine';
import { processAICombatantRolls, updateRollNotationWithModifiers } from './combat/dice-roll-processor';
import { combatNarrationExpertTool } from './combat/combat-narration-expert';
import { CombatTurnManager } from '@/lib/combat/turn-manager';
import { CombatActionProcessor } from '@/lib/combat/action-processor';
import { CombatInitializer } from '@/lib/combat/combat-initializer';

/**
 * Dependencies interface for Dependency Injection in combatManagerTool.
 * Allows mocking dependencies in tests while maintaining backward compatibility.
 */
export interface CombatManagerDependencies {
    diceRollerTool: typeof diceRollerTool;
    enemyTacticianTool: typeof enemyTacticianTool;
    companionTacticianTool: typeof companionTacticianTool;
    combatNarrationExpertTool: typeof combatNarrationExpertTool;
    processAICombatantRolls: typeof processAICombatantRolls;
    updateRollNotationWithModifiers: typeof updateRollNotationWithModifiers;
    // Lazy-loaded dependencies (loaded dynamically during combat initialization)
    narrativeExpert?: any;
    markdownToHtml?: any;
}

export const CombatManagerInputSchema = GameStateSchema.extend({
    interpretedAction: ActionInterpreterOutputSchema.optional(),
    locationContext: z.any().optional(),
    combatantIds: z.array(z.string()).optional(),
});

/**
 * Creates a special DiceRoll for combat end messages (victory/defeat).
 * 
 * @param reason - The reason for combat end (e.g., "Todos los enemigos derrotados")
 * @returns A DiceRoll object with outcome 'victory' or 'defeat'
 */
function createCombatEndDiceRoll(reason: string): DiceRoll {
    const isVictory = reason.includes('enemigos derrotados');
    return {
        id: `combat-end-${Date.now()}-${Math.random()}`,
        roller: 'DM',
        rollNotation: '',
        individualRolls: [],
        totalResult: 0,
        outcome: isVictory ? 'victory' : 'defeat',
        timestamp: new Date(),
        description: reason || 'El combate ha finalizado.',
    };
}

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


/**
 * Core combat manager logic with Dependency Injection support.
 * This function contains all the combat management logic and accepts dependencies as parameters.
 * 
 * @param input - The combat manager input (game state, player action, etc.)
 * @param dependencies - Optional dependencies for DI (defaults to real implementations)
 * @returns Combat manager output (messages, dice rolls, updated state, etc.)
 */
export async function executeCombatManager(
    input: z.infer<typeof CombatManagerInputSchema>,
    dependencies?: Partial<CombatManagerDependencies>
) {
    // Merge provided dependencies with defaults
    const deps: CombatManagerDependencies = {
        diceRollerTool,
        enemyTacticianTool,
        companionTacticianTool,
        combatNarrationExpertTool,
        processAICombatantRolls,
        updateRollNotationWithModifiers,
        ...dependencies, // Override with provided dependencies (for testing)
    };
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
                if (CombatTurnManager.shouldSkipTurn(activeCombatant, updatedParty, updatedEnemies)) {
                    const playerData = updatedParty.find(p => p.id === activeCombatant.id);
                    if (playerData) {
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
                            currentTurnIndex = CombatTurnManager.nextTurnIndex(currentTurnIndex, initiativeOrder.length);
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
                            const hasMoreAITurns = CombatTurnManager.hasMoreAITurns(activeCombatant, updatedParty, updatedEnemies, false);

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
                    currentTurnIndex = CombatTurnManager.nextTurnIndex(currentTurnIndex, initiativeOrder.length);
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
                                turnIndex: currentTurnIndex,
                                initiativeOrder,
                                updatedParty,
                                updatedEnemies,
                                lastProcessedTurnWasAI: false,
                                lastProcessedTurnIndex: currentTurnIndex,
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
                        }
                    }

                    // Only proceed with attack if we have a valid target
                    if (targetIdToUse) {
                        // Process the attack using CombatActionProcessor
                        const attackResult = await CombatActionProcessor.processPlayerAttack({
                            attacker: activeCombatant,
                            targetId: targetIdToUse,
                            playerAction,
                            initiativeOrder,
                            party: updatedParty,
                            enemies: updatedEnemies,
                            locationContext,
                            diceRollerTool: deps.diceRollerTool,
                            combatNarrationExpertTool: deps.combatNarrationExpertTool,
                            updateRollNotationWithModifiers: deps.updateRollNotationWithModifiers,
                            localLog,
                        });

                        // Handle the result
                        if (!attackResult.success) {
                            // Target not found or ambiguous
                            messages.push(...attackResult.messages.map(m => ({ ...m, sender: m.sender as 'DM' })));
                            diceRolls.push(...attackResult.diceRolls);

                            // For ambiguous or invalid targets, return without advancing turn
                            if (attackResult.error === 'TARGET_AMBIGUOUS' || attackResult.error === 'TARGET_NOT_FOUND') {
                                return {
                                    messages,
                                    diceRolls,
                                    inCombat: true,
                                    debugLogs,
                                    turnIndex: currentTurnIndex,
                                    initiativeOrder,
                                    updatedParty,
                                    updatedEnemies,
                                    lastProcessedTurnWasAI: false,
                                    lastProcessedTurnIndex: currentTurnIndex,
                                };
                            }
                        }

                        // Successful attack - update state
                        messages.push(...attackResult.messages.map(m => ({ ...m, sender: m.sender as 'DM' })));
                        diceRolls.push(...attackResult.diceRolls);
                        updatedParty = attackResult.updatedParty;
                        updatedEnemies = attackResult.updatedEnemies;

                        // Check if combat has ended
                        if (attackResult.combatEnded) {
                            localLog(`Combat ended after player action: ${attackResult.endReason}`);
                            messages.push({
                                sender: 'DM',
                                content: attackResult.endReason || 'El combate ha terminado.'
                            });
                            // Issue #101: Add victory/defeat message to dice rolls panel
                            const combatEndRoll = createCombatEndDiceRoll(attackResult.endReason || 'El combate ha terminado.');
                            diceRolls.push(combatEndRoll);
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
                        localLog(`Player action completed. Waiting for user to advance turn.`);

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
                            lastProcessedTurnIndex: currentTurnIndex,
                            playerActionCompleted: true,
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
                        updatedParty.some(p => p.id === activeCombatant.id && isUnconsciousOrDead(p))));

            if (shouldProcessTurn && !combatHasEnded) {
                const isPlayerUnconscious = activeCombatant.controlledBy === 'Player';
                localLog(`Processing turn for ${isPlayerUnconscious ? 'unconscious player' : 'AI combatant'} ${activeCombatant.characterName} at index ${currentTurnIndex}...`);

                // Check if active combatant is dead or unconscious - skip their turn if so
                const isCompanion = updatedParty.some(p => p.id === activeCombatant.id);

                if (CombatTurnManager.shouldSkipTurn(activeCombatant, updatedParty, updatedEnemies)) {
                    const activeCombatantData = isCompanion
                        ? updatedParty.find(p => p.id === activeCombatant.id)
                        : updatedEnemies.find(e => (e as any).uniqueId === activeCombatant.id);

                    if (activeCombatantData) {
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
                        currentTurnIndex = CombatTurnManager.nextTurnIndex(currentTurnIndex, initiativeOrder.length);
                        activeCombatant = initiativeOrder[currentTurnIndex];

                        // Issue #54: Check if next turn should be processed automatically (AI or player unconscious)
                        const hasMoreAITurns = CombatTurnManager.hasMoreAITurns(activeCombatant, updatedParty, updatedEnemies, combatHasEnded);

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

                // Get full character data for companions to access their inventory and spells
                const activeCombatantFullData = isCompanion
                    ? aliveParty.find(p => p.id === activeCombatant.id)
                    : null;

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
                    availableSpells: activeCombatantFullData?.spells || [],
                    inventory: activeCombatantFullData?.inventory || []
                };

                if (isCompanion) {
                    localLog(`Invoking CompanionTacticianTool for ${activeCombatant.characterName}.`);
                    tacticianResponse = await deps.companionTacticianTool(baseTacticianInput);
                } else {
                    localLog(`Invoking EnemyTacticianTool for ${activeCombatant.characterName}.`);
                    tacticianResponse = await deps.enemyTacticianTool(baseTacticianInput);
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
                        const rollsResult = await deps.processAICombatantRolls({
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
                                if (!messages.some(m => String(m.content || '').includes('Victoria') || String(m.content || '').includes('derrotados'))) {
                                    messages.push({
                                        sender: 'DM',
                                        content: endOfCombatCheck.reason || 'El combate ha terminado.'
                                    });
                                    // Issue #101: Add victory/defeat message to dice rolls panel
                                    const combatEndRoll = createCombatEndDiceRoll(endOfCombatCheck.reason || 'El combate ha terminado.');
                                    diceRolls.push(combatEndRoll);
                                }
                            }
                        }
                    } else { localLog(`Could not find target combatant with id: "${targetId}"`); }
                } else if (!targetId) { localLog('Action had no targetId.'); }

                // Only advance turn if combat hasn't ended
                if (!combatHasEnded) {
                    currentTurnIndex = CombatTurnManager.nextTurnIndex(currentTurnIndex, initiativeOrder.length);
                    activeCombatant = initiativeOrder[currentTurnIndex];
                }

                // If combat ended during this turn, return final state
                if (combatHasEnded) {
                    // The AI turn that just finished caused the combat to end
                    // Issue #101: Ensure victory/defeat message is in dice rolls (may have been added above)
                    if (!diceRolls.some(r => r.outcome === 'victory' || r.outcome === 'defeat')) {
                        const endOfCombatCheck = checkEndOfCombat(updatedParty, updatedEnemies);
                        if (endOfCombatCheck.combatEnded) {
                            const combatEndRoll = createCombatEndDiceRoll(endOfCombatCheck.reason || 'El combate ha terminado.');
                            diceRolls.push(combatEndRoll);
                        }
                    }
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
                // Issue #54: Check if next turn should be processed automatically (AI or player unconscious)
                const hasMoreAITurns = CombatTurnManager.hasMoreAITurns(activeCombatant, updatedParty, updatedEnemies, combatHasEnded);

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
        } else {
            // Initiation logic
            localLog("Initiating combat via CombatInitializer...");

            // Lazy load heavy dependencies for initiation (if not provided via DI)
            const narrativeExpertToUse = deps.narrativeExpert || (await import('@/ai/flows/narrative-manager')).narrativeExpert;
            const markdownToHtmlToUse = deps.markdownToHtml || (await import('@/ai/flows/markdown-to-html')).markdownToHtml;

            const initResult = await CombatInitializer.initializeCombat({
                combatantIds: combatantIds || [],
                party,
                existingEnemies: updatedEnemies,
                locationContext,
                conversationHistory,
                playerAction,
                interpretedAction,
                locationId,
                diceRollerTool: deps.diceRollerTool,
                narrativeExpert: narrativeExpertToUse,
                markdownToHtml: markdownToHtmlToUse,
                processAICombatantRolls: deps.processAICombatantRolls,
                enemyTacticianTool: deps.enemyTacticianTool,
                companionTacticianTool: deps.companionTacticianTool,
                createCombatEndDiceRoll,
                localLog,
            });

            if (initResult.success) {
                // If first turn was processed (AI went first), use firstTurnData values
                if (initResult.firstTurnData) {
                    return {
                        messages: initResult.messages,
                        diceRolls: initResult.diceRolls,
                        updatedParty: initResult.updatedParty,
                        updatedEnemies: initResult.enemies,
                        inCombat: !initResult.firstTurnData.combatEnded,
                        initiativeOrder: initResult.initiativeOrder,
                        enemies: initResult.firstTurnData.combatEnded ? [] : initResult.enemies,
                        debugLogs: [...debugLogs, ...(initResult.debugLogs || [])],
                        turnIndex: initResult.firstTurnData.turnIndex,
                        hasMoreAITurns: initResult.firstTurnData.hasMoreAITurns,
                        lastProcessedTurnWasAI: initResult.firstTurnData.lastProcessedTurnWasAI,
                        lastProcessedTurnIndex: initResult.firstTurnData.lastProcessedTurnIndex,
                    };
                } else {
                    // Player goes first, no AI turn was processed
                    return {
                        messages: initResult.messages,
                        diceRolls: initResult.diceRolls,
                        updatedParty: initResult.updatedParty,
                        updatedEnemies: initResult.enemies,
                        inCombat: true,
                        initiativeOrder: initResult.initiativeOrder,
                        enemies: initResult.enemies,
                        debugLogs: [...debugLogs, ...(initResult.debugLogs || [])],
                        turnIndex: 0,
                        hasMoreAITurns: false, // Player starts
                        lastProcessedTurnWasAI: false,
                    };
                }
            } else {
                return {
                    messages: initResult.messages,
                    diceRolls: initResult.diceRolls,
                    updatedParty: initResult.updatedParty,
                    updatedEnemies: initResult.enemies,
                    inCombat: false,
                    debugLogs: [...debugLogs, ...(initResult.debugLogs || [])],
                    enemies: [],
                    initiativeOrder: [],
                };
            }
        }
    }

/**
 * Genkit tool wrapper for combatManagerTool.
 * This is the actual tool registered with Genkit that delegates to executeCombatManager.
 * Uses default dependencies (real implementations) unless overridden via executeCombatManager.
 */
export const combatManagerTool = ai.defineTool(
    {
        name: 'combatManagerTool',
        description: 'Manages a sequence of turns in combat, starting from the current turn, until it is a human player\'s turn again or combat ends. It also handles the initiation of combat.',
        inputSchema: CombatManagerInputSchema,
        outputSchema: CombatManagerOutputSchema,
    },
    async (input) => {
        // Call the core function with default dependencies
        return executeCombatManager(input);
    }
);
