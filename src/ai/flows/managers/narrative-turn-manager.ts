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
import { CombatTriggerEvaluator, CombatTriggerResult } from '@/lib/combat/trigger/combat-trigger-evaluator';
import { EnemyStateManager } from '@/lib/game/enemy-state-manager';
import { InteractionHandler, InteractionResult } from './interaction-handler';
import { ExplorationContextBuilder, ExplorationContextResult } from './exploration-context-builder';

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
    let currentLocationEnemies = EnemyStateManager.getEnemiesForLocation(
        locationId,
        enemiesByLocation,
        enemies
    );
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
            currentLocationEnemies = EnemyStateManager.getEnemiesForLocation(
                locationId,
                enemiesByLocation,
                enemies
            );
        } else if (movementResult.status === 'already_here' || (movementResult.error && movementResult.error.includes('Ya estás en'))) {
            // Player tried to move to current location - just describe current location
            // Don't add movement narration, just continue with normal narration
            systemFeedback = movementResult.error;
            localLog(`Movement skipped: Player already at location.`);
            // Keep interpretation.actionType as-is; rely on systemFeedback and prompt to avoid false travel narration
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

    // Initialize updatedOpenDoors early so we can use it for connection updates
    let updatedOpenDoors = input.openDoors ? { ...input.openDoors } : {};

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

    // Determine previous location if we just moved to avoid describing the path we came from
    const cameFromLocationId = (interpretation.actionType === 'move' && newLocationId)
        ? currentLocationId // The location we started the turn at
        : null;

    // Build exploration context using ExplorationContextBuilder
    const explorationContextResult: ExplorationContextResult = ExplorationContextBuilder.build({
        gameState: currentGameState,
        locationData: finalLocationData,
        party,
        worldTime: updatedWorldTime,
        initialWorldTime: adventureData.settings?.initialWorldTime,
        adventureData,
        cameFromLocationId,
        openDoors: input.openDoors,
        enemiesByLocation: input.enemiesByLocation,
        enemies: input.enemies,
    });

    // Update currentGameState with the updated exploration state
    currentGameState = explorationContextResult.updatedGameState;
    const detectedHazards = explorationContextResult.detectedHazards;
    const explorationContext = explorationContextResult.context;
    const resolvedEntities = explorationContext.presentEntities;

    // Log detected hazards
    if (detectedHazards.length > 0) {
        localLog(`Hazards detected: ${detectedHazards.map(h => h.id).join(', ')}`);
    }

    // --- COMBAT TRIGGER CHECK ---
    // Check if the new situation triggers combat (Ambush, Proximity, etc.)
    let combatTrigger = CombatTriggerEvaluator.evaluateExploration({
        location: finalLocationData,
        detectedHazards: detectedHazards.map(h => h.id),
        visibleEntities: resolvedEntities,
        // TODO: Pass stealth check result from ActionInterpreter if available
    });

    // Check for Interaction Triggers (Mimics) and Door Opening
    if (!combatTrigger.shouldStartCombat && interpretation.actionType === 'interact' && interpretation.targetId) {
        localLog(`Checking interaction trigger for targetId: "${interpretation.targetId}"`);
        
        // Process interaction using InteractionHandler
        const interactionResult: InteractionResult = await InteractionHandler.processInteraction({
            playerAction,
            targetId: interpretation.targetId,
            actionType: interpretation.actionType,
            locationData: finalLocationData,
            currentLocationId: locationId,
            currentOpenDoors: updatedOpenDoors,
            resolvedEntities,
        });

        // Update door states
        updatedOpenDoors = interactionResult.updatedOpenDoors;

        // Update connections in filteredLocationData if a door was opened
        if (interactionResult.systemFeedback?.includes('Door opened successfully')) {
            InteractionHandler.updateConnectionsForOpenDoors(
                filteredLocationData,
                locationId,
                updatedOpenDoors
            );
        }

        // Use system feedback from interaction handler
        if (interactionResult.systemFeedback) {
            systemFeedback = interactionResult.systemFeedback;
        }

        // Check if interaction triggered combat
        if (interactionResult.combatTrigger?.shouldStartCombat) {
            localLog(`Interaction Combat Triggered: ${interactionResult.combatTrigger.reason} - ${interactionResult.combatTrigger.message}`);
            combatTrigger = interactionResult.combatTrigger;
        } else {
            localLog(`No combat trigger for interaction with "${interactionResult.actualTargetId}"`);
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

    // If movement ocurrió y se llegó a una nueva sala, marca la puerta usada como abierta (ida y vuelta)
    if (cameFromLocationId && locationId && cameFromLocationId !== locationId) {
        const dirs = ['norte','sur','este','oeste','noreste','noroeste','sureste','suroeste','arriba','abajo'];
        const reverseMap: Record<string, string> = {
            norte: 'sur',
            sur: 'norte',
            este: 'oeste',
            oeste: 'este',
            noreste: 'suroeste',
            noroeste: 'sureste',
            sureste: 'noroeste',
            suroeste: 'noreste',
            arriba: 'abajo',
            abajo: 'arriba',
        };
        // Find direction used from previous location to this one
        const fromLocation = adventureData.locations.find((l: any) => l.id === cameFromLocationId);
        const conn = fromLocation?.connections?.find((c: any) => c.targetId === locationId);
        if (conn?.direction) {
            const forwardKey = `${cameFromLocationId}:${conn.direction}`;
            updatedOpenDoors[forwardKey] = true;
            const reverseDir = reverseMap[conn.direction];
            if (reverseDir) {
                const backKey = `${locationId}:${reverseDir}`;
                updatedOpenDoors[backKey] = true;
            }
        }
    }

    // Reflejar openDoors en el locationContext filtrado para que la narración describa puertas abiertas
    // Esto debe hacerse DESPUÉS de todas las actualizaciones de updatedOpenDoors (movimiento, interacciones)
    if (filteredLocationData.connections) {
        filteredLocationData.connections = filteredLocationData.connections.map((conn: any) => {
            const doorKey = `${locationId}:${conn.direction}`;
            const isDoorOpen = updatedOpenDoors[doorKey] === true;
            if (isDoorOpen) {
                // Si la puerta está abierta, forzar isOpen: true y visibility: 'open' para que el DM la describa como abierta
                return { 
                    ...conn, 
                    isOpen: true, 
                    visibility: 'open' // Forzar visibility a 'open' para que sea visible en la narración
                };
            }
            // Si no está abierta, mantener el estado original (puede ser isOpen: false o undefined)
            return conn;
        });
        
        // Log para debugging
        const openDoorsCount = Object.keys(updatedOpenDoors).filter(k => updatedOpenDoors[k] === true).length;
        const updatedConnections = filteredLocationData.connections.filter((c: any) => c.isOpen === true);
        localLog(`Updated connections: ${openDoorsCount} open doors in state, ${updatedConnections.length} connections marked as isOpen:true for location ${locationId}`);
        if (updatedConnections.length > 0) {
            localLog(`Open connections: ${updatedConnections.map((c: any) => `${c.direction}->${c.targetId}`).join(', ')}`);
        }
    }

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
