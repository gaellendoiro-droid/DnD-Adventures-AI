/**
 * @fileOverview NarrativeTurnManager - Orquestador del flujo narrativo (fuera de combate)
 * 
 * Este módulo encapsula toda la lógica de un turno narrativo, incluyendo:
 * 1. Gestión de movimiento y cambio de ubicación
 * 2. Reacciones de compañeros previas a la narración
 * 3. Filtrado de contexto (enemigos muertos)
 * 4. Generación de narración del DM
 * 5. Reacciones de compañeros posteriores a la narración
 * 
 * IMPORTANTE: Esta es una refactorización estructural. La lógica se ha movido 
 * desde game-coordinator.ts SIN MODIFICACIONES funcionales para preservar 
 * el comportamiento exacto.
 */

import { log } from '@/lib/logger';
import type { GameMessage, Character } from '@/lib/types';
import { markdownToHtml } from '../markdown-to-html';
import { narrativeExpert } from '../narrative-manager';
import { processCompanionReactions } from './companion-reaction-manager';
import { isEntityOutOfCombat } from '@/lib/game/entity-status-utils';
import { formatMessageForTranscript } from '@/lib/utils/transcript-formatter';
import { NavigationManager } from './navigation-manager';
import { GameState } from '@/ai/flows/schemas';
import { ExplorationManager } from './exploration-manager';
import { CombatTriggerManager, CombatTriggerResult } from './combat-trigger-manager';

/**
 * Input para procesar un turno narrativo
 */
export interface NarrativeTurnInput {
    playerAction: string;
    interpretation: {
        actionType?: string;
        targetId?: string | null;
    };
    party: Character[];
    currentLocationId: string;
    adventureData: any;
    conversationHistory: GameMessage[];
    enemiesByLocation?: Record<string, any[]>;
    enemies?: any[];
    explorationState?: any; // ExplorationState
    openDoors?: Record<string, boolean>; // Map of "locationId:direction" -> isOpen
}

/**
 * Output de un turno narrativo
 */
export interface NarrativeTurnOutput {
    messages: Omit<GameMessage, 'id' | 'timestamp'>[];
    debugLogs: string[];
    nextLocationId: string | null;
    updatedParty: Character[];
    updatedWorldTime?: {
        day: number;
        hour: number;
        minute: number;
    };
    updatedExplorationState?: any; // ExplorationState
    combatTriggerResult?: CombatTriggerResult;
    updatedOpenDoors?: Record<string, boolean>; // Updated door states
}

/**
 * Ejecuta un turno narrativo completo.
 * 
 * @param input - Datos necesarios para el turno
 * @returns Resultado del turno (mensajes, logs, estado)
 */
export async function executeNarrativeTurn(input: NarrativeTurnInput): Promise<NarrativeTurnOutput> {
    const {
        playerAction,
        interpretation,
        party,
        currentLocationId,
        adventureData,
        conversationHistory,
        enemiesByLocation,
        enemies
    } = input;

    const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
    const debugLogs: string[] = [];
    const localLog = (message: string) => debugLogs.push(message);

    // 1. Check if this is the start of an adventure
    const isAdventureStart = conversationHistory.length === 0 &&
        (playerAction.toLowerCase().includes('comenzar') ||
            playerAction.toLowerCase().includes('empezar') ||
            playerAction.toLowerCase().includes('iniciar'));

    // 2. Handle movement and location context
    let locationId = currentLocationId;
    let newLocationId: string | null = null;
    let finalLocationData = adventureData.locations.find((l: any) => l.id === locationId);
    let currentLocationEnemies = enemiesByLocation?.[locationId] || enemies || [];
    let updatedWorldTime = undefined;
    let systemFeedback: string | undefined = undefined;
    let movementNarration: string | undefined = undefined; // Store movement narration to add after companion reactions

    if (interpretation.actionType === 'move' && interpretation.targetId) {
        // Construct a temporary GameState for NavigationManager
        const tempGameState: GameState = {
            playerAction,
            party,
            locationId: currentLocationId,
            inCombat: false,
            conversationHistory: conversationHistory,
            openDoors: input.openDoors, // Pass door states for validation
        };

        const movementResult = await NavigationManager.resolveMovement(
            tempGameState,
            interpretation.targetId,
            adventureData
        );

        if (movementResult.success && movementResult.newLocationId) {
            newLocationId = movementResult.newLocationId;
            locationId = newLocationId;

            log.gameCoordinator('Player moving to new location', {
                from: currentLocationId,
                to: newLocationId,
                narration: movementResult.narration
            });

            // Store movement narration to add after companion reactions (before DM)
            movementNarration = movementResult.narration;

            // Update Time
            if (movementResult.timePassed) {
                const newState = NavigationManager.updateWorldTime(tempGameState, movementResult.timePassed);
                updatedWorldTime = newState.worldTime;
                localLog(`Time passed: ${movementResult.timePassed.minutes}m. New time: Day ${updatedWorldTime?.day}, ${updatedWorldTime?.hour}:${updatedWorldTime?.minute}`);
            }

            finalLocationData = adventureData.locations.find((l: any) => l.id === locationId);
            if (!finalLocationData) {
                log.error('Location not found', {
                    module: 'NarrativeTurnManager',
                    locationId,
                });
                throw new Error(`Could not find data for location: ${locationId}.`);
            }
            // Update currentLocationEnemies for the new location
            currentLocationEnemies = enemiesByLocation?.[locationId] || enemies || [];
        } else {
            // Movement failed
            localLog(`Movement failed: ${movementResult.error}`);
            systemFeedback = `Movement failed: ${movementResult.error || "No puedes ir allí."}`;
            // We do NOT push the error message directly to 'messages' here.
            // Instead, we pass 'systemFeedback' to the NarrativeExpert (DM) so it can weave the failure into the narration.
            // This prevents double messaging and allows for more immersive failure descriptions.

            /* 
            messages.push({
                sender: 'DM',
                content: movementResult.error || "No puedes ir allí."
            });
            */
            // Don't change location
        }
    }

    // Prepare chat history for companions (last 10 messages)
    const recentHistory = conversationHistory.slice(-10).map(formatMessageForTranscript).join('\n');

    // 3. Generate companion reactions BEFORE DM narration
    const beforeDmReactions = await processCompanionReactions({
        party,
        playerAction,
        interpretation,
        inCombat: false,
        timing: 'before_dm',
        isAdventureStart,
        chatHistory: recentHistory,
    });
    beforeDmReactions.debugLogs.forEach(localLog);
    messages.push(...beforeDmReactions.messages);

    // Add movement narration after companion reactions (before DM narration)
    if (movementNarration) {
        messages.push({
            sender: 'DM',
            content: movementNarration
        });
    }

    // 4. Generate DM narration
    log.gameCoordinator('Generating DM narration', {
        actionType: interpretation.actionType,
        isAdventureStart,
    });
    localLog("NarrativeTurnManager: Generating DM narration...");

    const historyForNarrator = [...conversationHistory, ...messages];
    const narrativeHistoryTranscript = historyForNarrator.map(formatMessageForTranscript).join('\n');

    // Filter out dead enemies from entitiesPresent before passing to narrative expert
    const filteredLocationData = { ...finalLocationData };
    const deadEntities: string[] = []; // Track defeated enemies for context

    if (filteredLocationData.entitiesPresent && currentLocationEnemies.length > 0) {
        filteredLocationData.entitiesPresent = filteredLocationData.entitiesPresent.filter((entityId: string) => {
            const enemy = currentLocationEnemies.find((e: any) =>
                e.id === entityId ||
                (e as any).uniqueId === entityId ||
                (e as any).adventureId === entityId
            );

            const isDead = enemy && isEntityOutOfCombat(enemy);

            if (isDead) {
                // Collect names of dead enemies for explicit context
                deadEntities.push(enemy.name || enemy.id || 'Unknown enemy');
                return false; // Remove from active entities list
            }

            // Include entity if it's not an enemy, or if it's an enemy that's still alive
            return !enemy || !isDead;
        });
        log.gameCoordinator('Filtered dead enemies from location context', {
            originalCount: finalLocationData.entitiesPresent?.length || 0,
            filteredCount: filteredLocationData.entitiesPresent.length,
            deadEntities: deadEntities.length > 0 ? deadEntities : undefined,
        });
    }

    // Detect Key Moments for Dynamic Narration Length
    const isLocationChange = newLocationId !== null && newLocationId !== currentLocationId;
    const hasDeadEntities = deadEntities.length > 0;
    const isRestAction = interpretation.actionType === 'rest';

    const isKeyMoment = isLocationChange || hasDeadEntities || isRestAction;

    if (isKeyMoment) {
        localLog(`Key Moment Detected: LocationChange=${isLocationChange}, DeadEntities=${hasDeadEntities}, Rest=${isRestAction}`);
    }

    // --- EXPLORATION LOGIC START ---
    let currentGameState: GameState = {
        playerAction,
        party,
        locationId,
        inCombat: false,
        conversationHistory,
        exploration: input.explorationState
    };

    // Capture previous visit state BEFORE updating it
    const previousVisitState = currentGameState.exploration?.knownLocations[locationId]?.status || 'unknown';

    // 1. Update Fog of War
    // Calculate total minutes for timestamp
    const currentTotalMinutes = updatedWorldTime
        ? (updatedWorldTime.day * 1440 + updatedWorldTime.hour * 60 + updatedWorldTime.minute)
        : (adventureData.settings?.initialWorldTime?.day || 1) * 1440 + 480; // Default 8:00 AM

    currentGameState = ExplorationManager.updateExplorationState(
        currentGameState,
        finalLocationData,
        currentTotalMinutes
    );

    // 2. Passive Perception Check
    const detectedHazards = ExplorationManager.checkPassivePerception(currentGameState, finalLocationData, party);

    // 3. Active Search (To-Do: Infer from playerAction if it's a search)
    // For now, we rely on passive.

    // 4. Mark discovered hazards
    if (detectedHazards.length > 0) {
        currentGameState = ExplorationManager.markHazardsAsDiscovered(currentGameState, locationId, detectedHazards);
        localLog(`Hazards detected: ${detectedHazards.map(h => h.id).join(', ')}`);
    }

    // 5. Calculate Visible Connections for Context
    const visibleConnections: string[] = [];

    // Determine previous location if we just moved to avoid describing the path we came from
    const cameFromLocationId = (interpretation.actionType === 'move' && newLocationId)
        ? currentLocationId // The location we started the turn at
        : null;

    if (finalLocationData.connections) {
        const knownLocs = currentGameState.exploration?.knownLocations || {};
        for (const conn of finalLocationData.connections) {
            if (conn.visibility === 'open') {
                // Skip the connection we just came from to focus narration on new paths
                if (cameFromLocationId && conn.targetId === cameFromLocationId) {
                    continue;
                }

                const targetLoc = adventureData.locations.find((l: any) => l.id === conn.targetId);
                if (targetLoc) {
                    visibleConnections.push(`To ${conn.direction || 'unknown'}: ${targetLoc.description.substring(0, 100)}...`);
                }
            }
        }
    }

    // Resolve entities for context
    const resolvedEntities = (filteredLocationData.entitiesPresent || [])
        .map((entityId: string) => {
            const entity = adventureData.entities?.find((e: any) => e.id === entityId);
            // FIX: Pass full entity properties (including disposition/status) so CombatTriggerManager can filter hidden ones
            return entity ? { ...entity } : null;
        })
        .filter((e: any) => e !== null);

    const explorationContext = {
        mode: finalLocationData.explorationMode || 'safe',
        lightLevel: finalLocationData.lightLevel || 'bright',
        visitState: previousVisitState,
        detectedHazards: detectedHazards,
        visibleConnections: visibleConnections,
        presentEntities: resolvedEntities
    };

    // --- COMBAT TRIGGER CHECK ---
    // Check if the new situation triggers combat (Ambush, Proximity, etc.)
    let combatTrigger = CombatTriggerManager.evaluateExploration({
        location: finalLocationData,
        detectedHazards: detectedHazards.map(h => h.id),
        visibleEntities: resolvedEntities,
        // TODO: Pass stealth check result from ActionInterpreter if available
    });

    // Check for Interaction Triggers (Mimics) and Door Opening
    let updatedOpenDoors = input.openDoors ? { ...input.openDoors } : {};
    
    if (!combatTrigger.shouldStartCombat && interpretation.actionType === 'interact' && interpretation.targetId) {
        localLog(`Checking interaction trigger for targetId: "${interpretation.targetId}"`);
        
        // Also check interactables to map name/action to ID
        let actualTargetId = interpretation.targetId;
        let matchedInteractable: any = null;
        if (finalLocationData.interactables) {
            matchedInteractable = finalLocationData.interactables.find((i: any) => {
                const targetLower = interpretation.targetId?.toLowerCase() || '';
                const interactableName = i.name?.toLowerCase() || '';
                const interactableId = i.id?.toLowerCase() || '';
                
                // Check if targetId matches interactable name, id, or any interaction action
                return targetLower.includes(interactableId) ||
                       interactableId.includes(targetLower) ||
                       targetLower.includes(interactableName) ||
                       interactableName.includes(targetLower) ||
                       i.interactions?.some((ia: any) => 
                           targetLower.includes(ia.action?.toLowerCase() || '')
                       );
            });
            
            if (matchedInteractable) {
                actualTargetId = matchedInteractable.id;
                localLog(`Mapped interaction target "${interpretation.targetId}" to interactable ID: "${actualTargetId}"`);
            }
        }
        
        // Check if this is a door interaction that should open it
        if (matchedInteractable) {
            const actionLower = playerAction.toLowerCase();
            const openActions = ['abrir', 'open', 'abre', 'abrimos', 'abro'];
            const isOpenAction = openActions.some(action => actionLower.includes(action));
            
            if (isOpenAction) {
                // Find the connection that matches this door
                // Door interactables should have an ID that matches a connection direction or targetId
                const doorId = matchedInteractable.id.toLowerCase();
                const matchingConnection = finalLocationData.connections?.find((conn: any) => {
                    const connDirection = conn.direction?.toLowerCase();
                    const connTarget = conn.targetId?.toLowerCase();
                    return doorId.includes(connDirection || '') || 
                           doorId.includes(connTarget || '') ||
                           (connDirection && doorId.includes(connDirection)) ||
                           (connTarget && doorId.includes(connTarget));
                });
                
                if (matchingConnection && matchingConnection.direction) {
                    const doorKey = `${currentLocationId}:${matchingConnection.direction}`;
                    updatedOpenDoors[doorKey] = true;
                    localLog(`Door opened: ${doorKey}`);
                } else {
                    // Try to match by checking if interactable name/ID contains direction
                    const directions = ['norte', 'sur', 'este', 'oeste', 'noreste', 'noroeste', 'sureste', 'suroeste', 'arriba', 'abajo'];
                    for (const dir of directions) {
                        if (doorId.includes(dir)) {
                            const doorKey = `${currentLocationId}:${dir}`;
                            updatedOpenDoors[doorKey] = true;
                            localLog(`Door opened (by direction match): ${doorKey}`);
                            break;
                        }
                    }
                }
            }
        }
        
        const interactionTrigger = CombatTriggerManager.evaluateInteraction({
            targetId: actualTargetId,
            locationHazards: finalLocationData.hazards
        });

        if (interactionTrigger.shouldStartCombat) {
            localLog(`Interaction Combat Triggered: ${interactionTrigger.reason} - ${interactionTrigger.message}`);
            combatTrigger = interactionTrigger;
        } else {
            localLog(`No combat trigger for interaction with "${actualTargetId}"`);
        }
    }

    if (combatTrigger.shouldStartCombat) {
        localLog(`Combat Triggered: ${combatTrigger.reason} - ${combatTrigger.message}`);
        // We continue to generate the narration (Room Description) so the player knows where they are,
        // but we will return the trigger so GameCoordinator can start combat immediately after.

        // Prevent spoilers: If it's an ambush, don't describe the enemies in the room description
        if (combatTrigger.reason === 'ambush') {
            explorationContext.presentEntities = [];
        }
    }
    // --- EXPLORATION LOGIC END ---

    const narrativeInput = {
        phase: (isAdventureStart ? 'combat_initiation' : 'normal') as 'combat_initiation' | 'normal', // Legacy support
        playerAction,
        locationId,
        locationContext: JSON.stringify(filteredLocationData),
        conversationHistory: narrativeHistoryTranscript,
        interpretedAction: JSON.stringify(interpretation),
        // Pass explicit list of dead entities so the AI knows to describe them as corpses
        deadEntities: deadEntities.length > 0 ? deadEntities.join(', ') : undefined,
        isKeyMoment: isKeyMoment,
        systemFeedback: systemFeedback,
        explorationContext: explorationContext // Pass the new context
    };

    const narrativeResult = await narrativeExpert(narrativeInput);
    (narrativeResult.debugLogs || []).forEach(localLog);

    if (narrativeResult.dmNarration) {
        const { html } = await markdownToHtml({ markdown: narrativeResult.dmNarration });
        messages.push({
            sender: 'DM',
            content: html,
            originalContent: narrativeResult.dmNarration,
        });
    }

    // 5. Generate companion reactions AFTER DM narration
    const afterDmReactions = await processCompanionReactions({
        party,
        playerAction,
        interpretation,
        inCombat: false,
        timing: 'after_dm',
        isAdventureStart,
        dmNarration: narrativeResult.dmNarration,
        chatHistory: recentHistory,
    });
    afterDmReactions.debugLogs.forEach(localLog);
    messages.push(...afterDmReactions.messages);

    log.gameCoordinator('Narrative turn finished', {
        messagesCount: messages.length,
        locationId,
    });
    localLog(`NarrativeTurnManager: Turn finished. Final location: ${locationId}. Returning ${messages.length} messages.`);

    return {
        messages,
        debugLogs,
        nextLocationId: newLocationId,
        updatedParty: party,
        updatedWorldTime: updatedWorldTime,
        updatedExplorationState: currentGameState.exploration, // Return updated state
        combatTriggerResult: combatTrigger.shouldStartCombat ? combatTrigger : undefined,
        updatedOpenDoors: Object.keys(updatedOpenDoors).length > 0 ? updatedOpenDoors : undefined
    };
}
