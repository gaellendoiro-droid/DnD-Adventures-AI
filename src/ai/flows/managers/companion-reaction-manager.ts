/**
 * @fileOverview CompanionReactionManager - Gestiona las reacciones de compañeros en flujos narrativos
 * 
 * Este módulo encapsula toda la lógica de generación de reacciones de compañeros,
 * tanto antes como después de la narración del DM.
 * 
 * IMPORTANTE: Esta es una refactorización estructural. La lógica y los prompts
 * se han movido desde game-coordinator.ts SIN MODIFICACIONES para preservar
 * el comportamiento exacto de las IAs.
 */

import { companionExpertTool } from '../../tools/companion-expert';
import type { Character, GameMessage } from '@/lib/types';
import { log } from '@/lib/logger';
import { canEntityReact } from '@/lib/game/entity-status-utils';
import { EventManager } from '@/lib/game/event-manager';

/**
 * Timing de las reacciones de compañeros
 */
export type ReactionTiming = 'before_dm' | 'after_dm';

// Probabilities for reactions (moved from prompt to code to save API calls)
const PROBABILITY_BEFORE_DM = 0.15;
const PROBABILITY_AFTER_DM = 0.25;

/**
 * Input para procesar reacciones de compañeros
 */
export interface CompanionReactionInput {
    party: Character[];
    playerAction: string;
    interpretation: {
        actionType?: string;
        targetId?: string | null;
    };
    inCombat: boolean;
    timing: ReactionTiming;
    isAdventureStart?: boolean;
    dmNarration?: string; // Solo para 'after_dm'
    chatHistory?: string; // Historial de chat formateado
    excludeCharacters?: string[]; // New: Deduplication
    locationContext?: string;
    presentEntities?: any[];
    activeEffects?: string[];
    skillCheckResult?: any;
    worldState?: any;
    currentLocationId?: string;
    turnNumber?: number;
}

/**
 * Output de las reacciones procesadas
 */
export interface CompanionReactionOutput {
    messages: Omit<GameMessage, 'id' | 'timestamp'>[];
    debugLogs: string[];
}

/**
 * Output de un evento de reacción en streaming
 */
export interface CompanionReactionStreamEvent {
    type: 'reaction';
    character: string;
    message: GameMessage;
}

export interface CompanionReactionLogEvent {
    type: 'log';
    message: string;
}

export type CompanionReactionYield = CompanionReactionStreamEvent | CompanionReactionLogEvent;

/**
 * Procesa las reacciones de compañeros en modo Streaming (Generador).
 * Yields reaction events as they happen.
 */
export async function* processCompanionReactionsStreaming(
    input: CompanionReactionInput
): AsyncGenerator<CompanionReactionYield, void, unknown> {
    const { party, playerAction, interpretation, inCombat, timing, isAdventureStart = false, dmNarration, chatHistory, excludeCharacters = [], activeEffects = [], skillCheckResult, worldState, currentLocationId, turnNumber } = input;

    let adjacentLocationIds: string[] = [];
    if (input.locationContext) {
        try {
            const locData = JSON.parse(input.locationContext);
            if (locData.connections) {
                adjacentLocationIds = locData.connections
                    .map((c: any) => c.targetId)
                    .filter(Boolean);
            }
        } catch (e) {
            // Ignorar error
        }
    }

    let recentMemoryContext = '';
    if (worldState && currentLocationId) {
        const turnNum = turnNumber ?? (chatHistory ? chatHistory.split('\n').length : 0);
        const relevantEvents = EventManager.getRelevantEvents(
            worldState,
            turnNum,
            currentLocationId,
            adjacentLocationIds
        );
        const formattedEvents = EventManager.formatForPrompt(relevantEvents, turnNum);
        if (formattedEvents) {
            recentMemoryContext = `\n\n[RECENT MEMORY]\n${formattedEvents}`;
        }
    }

    let dynamicHistory = chatHistory || '';

    if (timing === 'before_dm') {
        const significantActions = ['move', 'attack', 'interact'];
        if (!isAdventureStart && significantActions.includes(interpretation.actionType || '')) {
            yield { type: 'log', message: "GameCoordinator: Generating companion reactions before DM narration..." };

            // We iterate sequentially to yield sequentially.
            // Note: If we want PARALLEL fetching but SEQUENTIAL yielding, we'd need Promise.all and then iterate results.
            // BUT, for streaming "as soon as available", parallel fetching is harder to coordinate with 'yield'.
            // Actually, we can start all promises and then `for await` them? No, that waits for order.
            // For now, let's keep it sequential to ensure order of reactions (or simple parallel if order doesn't matter).
            // Given "A reacts, then B reacts to A", sequential is actually PREFERRED for causality in future phases.
            // Current implementation is sequential loop.

            for (const character of party) {
                if (canEntityReact(character)) {
                    if (character.controlledBy === 'Player') {
                        yield { type: 'log', message: `CRITICAL: Skipping reaction for Player character ${character.name} (canEntityReact returned true)` };
                        continue;
                    }

                    if (excludeCharacters.includes(character.name)) {
                        yield { type: 'log', message: `Skipping duplicate reaction for ${character.name} (already reacted)` };
                        continue;
                    }

                    const isTargeted = interpretation.actionType === 'interact' &&
                        (interpretation.targetId === character.name || interpretation.targetId === 'Party' || interpretation.targetId === 'Group');

                    // Boost probability if directly addressed or sticking to a plan
                    const probability = isTargeted ? 1.0 : PROBABILITY_BEFORE_DM;

                    if (Math.random() > probability) {
                        yield { type: 'log', message: `Skipping reaction for ${character.name} (probability check failed)` };
                        continue;
                    }

                    const companionContext = `The player just proposed/said: "${playerAction}"${isTargeted ? `\n\n(You are being directly addressed.)` : ''}${recentMemoryContext}`;

                    const companionResult = await companionExpertTool({
                        party: party,
                        characterName: character.name,
                        context: companionContext,
                        inCombat: inCombat,
                        reactionTiming: 'before_dm',
                        chatHistory: dynamicHistory,
                        locationContext: input.locationContext,
                        presentEntities: input.presentEntities,
                        activeEffects: activeEffects,
                        skillCheckResult: skillCheckResult,
                    });

                    if (companionResult.action && companionResult.action.trim() !== '') {
                        yield { type: 'log', message: `${character.name} reacted before DM: "${companionResult.action}"` };
                        dynamicHistory += `\n${character.name}: "${companionResult.action}"`;
                        yield {
                            type: 'reaction',
                            character: character.name,
                            message: {
                                id: `reaction-${Date.now()}-${character.name}`, // Temp ID
                                sender: 'Character',
                                senderName: character.name,
                                characterColor: character.color,
                                content: companionResult.action,
                                originalContent: companionResult.action,
                                timestamp: new Date().toLocaleTimeString()
                            }
                        };
                    }
                }
            }
        }
    } else if (timing === 'after_dm') {
        if (!isAdventureStart) {
            yield { type: 'log', message: "GameCoordinator: Generating companion reactions after DM narration..." };

            for (const character of party) {
                if (canEntityReact(character)) {
                    if (character.controlledBy === 'Player') {
                        yield { type: 'log', message: `CRITICAL: Skipping reaction for Player character ${character.name} (canEntityReact returned true)` };
                        continue;
                    }

                    if (excludeCharacters.includes(character.name)) {
                        yield { type: 'log', message: `Skipping duplicate reaction for ${character.name} (already reacted)` };
                        continue;
                    }

                    if (Math.random() > PROBABILITY_AFTER_DM) {
                        yield { type: 'log', message: `Skipping reaction for ${character.name} (probability check failed)` };
                        continue;
                    }

                    const isTargeted = interpretation.actionType === 'interact' && interpretation.targetId === character.name;
                    const dmNarrationContext = dmNarration
                        ? `\n\nDM narration (what just happened):\n"${dmNarration}"`
                        : '';
                    const companionContext = `The player's action was: "${playerAction}"${dmNarrationContext}${isTargeted ? `\n\n(You are being directly addressed.)` : ''}${recentMemoryContext}`;

                    const companionResult = await companionExpertTool({
                        party: party,
                        characterName: character.name,
                        context: companionContext,
                        inCombat: inCombat,
                        reactionTiming: 'after_dm',
                        chatHistory: dynamicHistory,
                        locationContext: input.locationContext,
                        presentEntities: input.presentEntities,
                        activeEffects: activeEffects,
                        skillCheckResult: skillCheckResult,
                    });

                    if (companionResult.action && companionResult.action.trim() !== '') {
                        yield { type: 'log', message: `${character.name} reacted after DM: "${companionResult.action}"` };
                        dynamicHistory += `\n${character.name}: "${companionResult.action}"`;
                        yield {
                            type: 'reaction',
                            character: character.name,
                            message: {
                                id: `reaction-${Date.now()}-${character.name}`,
                                sender: 'Character',
                                senderName: character.name,
                                characterColor: character.color,
                                content: companionResult.action,
                                originalContent: companionResult.action,
                                timestamp: new Date().toLocaleTimeString()
                            }
                        };
                    }
                }
            }
        } else {
            yield { type: 'log', message: "GameCoordinator: Skipping companion reactions because this is the start of the adventure." };
        }
    }
}

/**
 * Procesa las reacciones de compañeros según el timing especificado.
 * 
 * Esta función encapsula la lógica exacta que estaba en game-coordinator.ts,
 * incluyendo:
 * - Filtrado de compañeros vivos/conscientes
 * - Construcción de contextos para cada compañero
 * - Llamadas al companionExpertTool
 * - Ensamblaje de mensajes
 * 
 * @param input - Parámetros para generar reacciones
 * @returns Mensajes generados y logs de debug
 */
export async function processCompanionReactions(
    input: CompanionReactionInput
): Promise<CompanionReactionOutput> {
    const { party, playerAction, interpretation, inCombat, timing, isAdventureStart = false, dmNarration, chatHistory, activeEffects = [], skillCheckResult, worldState, currentLocationId, turnNumber } = input;
    // ... (rest of original function) ...

    let adjacentLocationIds: string[] = [];
    if (input.locationContext) {
        try {
            const locData = JSON.parse(input.locationContext);
            if (locData.connections) {
                adjacentLocationIds = locData.connections
                    .map((c: any) => c.targetId)
                    .filter(Boolean);
            }
        } catch (e) {
            // Ignorar error
        }
    }

    let recentMemoryContext = '';
    if (worldState && currentLocationId) {
        const turnNum = turnNumber ?? (chatHistory ? chatHistory.split('\n').length : 0);
        const relevantEvents = EventManager.getRelevantEvents(
            worldState,
            turnNum,
            currentLocationId,
            adjacentLocationIds
        );
        const formattedEvents = EventManager.formatForPrompt(relevantEvents, turnNum);
        if (formattedEvents) {
            recentMemoryContext = `\n\n[RECENT MEMORY]\n${formattedEvents}`;
        }
    }

    const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
    const debugLogs: string[] = [];

    const localLog = (message: string) => debugLogs.push(message);

    // LÓGICA EXACTA MOVIDA DESDE game-coordinator.ts (líneas 324-364 y 428-469)
    let dynamicHistory = chatHistory || '';

    if (timing === 'before_dm') {
        // Generate companion reactions BEFORE DM narration (optional, selective reactions to player's proposal)
        // Skip on adventure start and only for significant actions
        const significantActions = ['move', 'attack', 'interact'];
        if (!isAdventureStart && significantActions.includes(interpretation.actionType || '')) {
            log.gameCoordinator('Generating companion reactions (before DM)', {
                partySize: party.length,
                actionType: interpretation.actionType,
            });
            localLog("GameCoordinator: Generating companion reactions before DM narration...");

            for (const character of party) {
                // Issue #26/#27: Skip dead/unconscious companions - they cannot react
                if (canEntityReact(character)) {
                    const isTargeted = interpretation.actionType === 'interact' &&
                        (interpretation.targetId === character.name || interpretation.targetId === 'Party' || interpretation.targetId === 'Group');

                    const probability = isTargeted ? 1.0 : PROBABILITY_BEFORE_DM;

                    // Optimization: Probability check in code to avoid unnecessary API calls
                    if (Math.random() > probability) {
                        localLog(`Skipping reaction for ${character.name} (probability check failed)`);
                        continue;
                    }

                    const companionContext = `The player just proposed/said: "${playerAction}"${isTargeted ? `\n\n(You are being directly addressed.)` : ''}${recentMemoryContext}`;

                    const companionResult = await companionExpertTool({
                        party: party,
                        characterName: character.name,
                        context: companionContext,
                        inCombat: inCombat,
                        reactionTiming: 'before_dm',
                        chatHistory: dynamicHistory,
                        locationContext: input.locationContext,
                        presentEntities: input.presentEntities,
                        activeEffects: activeEffects,
                        skillCheckResult: skillCheckResult,
                    });

                    if (companionResult.action && companionResult.action.trim() !== '') {
                        log.gameCoordinator('Companion reacted (before DM)', {
                            character: character.name,
                            action: companionResult.action.substring(0, 50) + '...',
                        });
                        localLog(`${character.name} reacted before DM: "${companionResult.action}"`);
                        dynamicHistory += `\n${character.name}: "${companionResult.action}"`;
                        messages.push({
                            sender: 'Character',
                            senderName: character.name,
                            characterColor: character.color,
                            content: companionResult.action,
                            originalContent: companionResult.action,
                        });
                    }
                }
            }
        }
    } else if (timing === 'after_dm') {
        // Generate companion reactions AFTER DM narration (and skip on adventure start)
        if (!isAdventureStart) {
            log.gameCoordinator('Generating companion reactions (after DM)', { partySize: party.length });
            localLog("GameCoordinator: Generating companion reactions after DM narration...");
            for (const character of party) {
                // Issue #26/#27: Skip dead/unconscious companions - they cannot react
                if (canEntityReact(character)) {
                    // Optimization: Probability check in code to avoid unnecessary API calls
                    if (Math.random() > PROBABILITY_AFTER_DM) {
                        localLog(`Skipping reaction for ${character.name} (probability check failed)`);
                        continue;
                    }

                    const isTargeted = interpretation.actionType === 'interact' && interpretation.targetId === character.name;
                    // Include DM narration in context so companions react to the CURRENT SITUATION, not just the player's original action
                    const dmNarrationContext = dmNarration
                        ? `\n\nDM narration (what just happened):\n"${dmNarration}"`
                        : '';
                    const companionContext = `The player's action was: "${playerAction}"${dmNarrationContext}${isTargeted ? `\n\n(You are being directly addressed.)` : ''}${recentMemoryContext}`;

                    const companionResult = await companionExpertTool({
                        party: party,
                        characterName: character.name,
                        context: companionContext,
                        inCombat: inCombat,
                        reactionTiming: 'after_dm',
                        chatHistory: dynamicHistory,
                        locationContext: input.locationContext,
                        presentEntities: input.presentEntities,
                        activeEffects: activeEffects,
                        skillCheckResult: skillCheckResult,
                    });

                    if (companionResult.action && companionResult.action.trim() !== '') {
                        log.gameCoordinator('Companion reacted (after DM)', {
                            character: character.name,
                            action: companionResult.action.substring(0, 50) + '...',
                        });
                        localLog(`${character.name} reacted after DM: "${companionResult.action}"`);
                        dynamicHistory += `\n${character.name}: "${companionResult.action}"`;
                        messages.push({
                            sender: 'Character',
                            senderName: character.name,
                            characterColor: character.color,
                            content: companionResult.action,
                            originalContent: companionResult.action,
                        });
                    }
                }
            }
        } else {
            log.gameCoordinator('Skipping companion reactions (adventure start)', { partySize: party.length });
            localLog("GameCoordinator: Skipping companion reactions because this is the start of the adventure.");
        }
    }

    return { messages, debugLogs };
}
