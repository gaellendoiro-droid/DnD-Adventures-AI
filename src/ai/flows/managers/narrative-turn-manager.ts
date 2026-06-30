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
import { skillCheckExpert } from '../experts/skill-check-expert';
import { resolveSkillCheck } from '@/lib/skills/skill-check-resolver';
import { DiceRoll } from '@/lib/types';
import { GameRulesEngine } from '@/lib/game/rules/rules-engine';
import { WorldStateManager } from '@/lib/game/world-state-manager';
import { EventDispatcher } from '@/lib/game/events/event-dispatcher';
import { NavigationSystem } from '@/lib/game/systems/navigation-system';
import { InteractionSystem } from '@/lib/game/systems/interaction-system';
import { SkillCheckSystem } from '@/lib/game/systems/skill-check-system';
import { CombatSystem } from '@/lib/game/systems/combat-system';
import { StatsSystem } from '@/lib/game/systems/stats-system';
import { SystemContext } from '@/lib/game/systems/system-types';


/**
 * Input para procesar un turno narrativo
 */
export interface NarrativeTurnInput {
    playerAction: string;
    interpretation: {
        actionType?: string;
        targetId?: string | null;
        stealthIntent?: boolean; // New architectural field
        activatedEffects?: string[]; // New: spells/effects activated this turn
        overrideSkill?: string;
        overrideDC?: number;
        assignedCompanion?: string | null;
        recipient?: string | null;
    };
    party: Character[];
    currentLocationId: string;
    adventureData: any;
    conversationHistory: GameMessage[];
    enemiesByLocation?: Record<string, any[]>;
    enemies?: any[];
    explorationState?: any; // ExplorationState
    openDoors?: Record<string, boolean>; // Map of "locationId:direction" -> isOpen
    worldState?: any; // New: persisted world state
    selectedCharacterName?: string;
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
    diceRolls?: DiceRoll[]; // New: Rolls generated during the turn
    updatedWorldState?: any; // New: updated world state
}

// Import the streaming companion processor
import { processCompanionReactionsStreaming, CompanionReactionYield } from './companion-reaction-manager';

/**
 * Narrative Stream Step Definition
 */
export interface NarrativeStreamStep {
    type: 'logic_update' | 'dm_narration' | 'companion_reaction' | 'debug';
    data?: any; // For state updates
    content?: string; // For text
    character?: string; // For companion name
    originalContent?: string;
    message?: GameMessage; // Structured message
}

/**
 * Ejecuta un turno narrativo en modo Stream.
 * Yields steps as they happen.
 */
export async function* executeNarrativeTurnStreaming(
    input: NarrativeTurnInput
): AsyncGenerator<NarrativeStreamStep, NarrativeTurnOutput, unknown> {
    const {
        playerAction,
        interpretation,
        party: initialParty,
        currentLocationId,
        adventureData,
        conversationHistory,
        enemiesByLocation,
        enemies,
        worldState,
        selectedCharacterName
    } = input;

    // Si la IA no ha asignado un compañero específico para la acción, se asume el personaje seleccionado en el frontend
    if (!interpretation.assignedCompanion && selectedCharacterName) {
        interpretation.assignedCompanion = selectedCharacterName;
    }

    let party = [...initialParty];

    const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
    const debugLogs: string[] = [];
    const localLog = (message: string) => {
        debugLogs.push(message);
    };

    // Process worldState and activatedEffects
    let updatedWorldState = worldState ? JSON.parse(JSON.stringify(worldState)) : undefined;
    let updatedOpenDoors = input.openDoors ? { ...input.openDoors } : {};
    
    // Ejecutar el motor de reglas de exploración
    const rulesEngineResult = GameRulesEngine.evaluate({
        playerAction,
        interpretation,
        party,
        currentLocationId: currentLocationId,
        adventureData,
        worldState: updatedWorldState,
        conversationHistory,
        openDoors: updatedOpenDoors
    });

    const rulesEngineEvents: any[] = [];
    let systemFeedback: string | undefined = undefined;
    let pendingEffects: string[] = [];
    let pendingWorldStateFlags: Record<string, any> = {};

    if (rulesEngineResult.intercepted) {
        systemFeedback = rulesEngineResult.systemFeedback;
        updatedWorldState = rulesEngineResult.updatedWorldState;
        if ((rulesEngineResult as any).updatedOpenDoors) {
            updatedOpenDoors = (rulesEngineResult as any).updatedOpenDoors;
        }
        if ((rulesEngineResult as any).events) {
            rulesEngineEvents.push(...(rulesEngineResult as any).events);
        }
        if (rulesEngineResult.updatedParty) {
            party = rulesEngineResult.updatedParty;
            yield {
                type: 'logic_update',
                data: {
                    updatedParty: party
                }
            };
        }
        Object.assign(interpretation, rulesEngineResult.interpretation);
        if (rulesEngineResult.pendingEffects) {
            pendingEffects = rulesEngineResult.pendingEffects;
        }
        if (rulesEngineResult.pendingWorldStateFlags) {
            pendingWorldStateFlags = rulesEngineResult.pendingWorldStateFlags;
        }
        localLog(`Rules Engine Intercepted action. System Feedback: "${systemFeedback}"`);
    } else {
        if (interpretation.activatedEffects && interpretation.activatedEffects.length > 0) {
            if (!updatedWorldState) {
                updatedWorldState = { globalFlags: {} };
            }
            if (!updatedWorldState.globalFlags) {
                updatedWorldState.globalFlags = {};
            }
            for (const effect of interpretation.activatedEffects) {
                updatedWorldState.globalFlags[effect] = true;
                localLog(`Activated spell/effect: ${effect}`);
            }
        }
    }

    const activeEffects: string[] = [];
    if (updatedWorldState?.globalFlags) {
        for (const [key, value] of Object.entries(updatedWorldState.globalFlags)) {
            if (value === true) {
                activeEffects.push(key);
            }
        }
    }

    // Yield initial Logic Update for WorldState (e.g. if an effect was activated)
    if (interpretation.activatedEffects && interpretation.activatedEffects.length > 0 && interpretation.actionType !== 'skill_check') {
        yield {
            type: 'logic_update',
            data: {
                worldState: updatedWorldState
            }
        };
    }


    // 1. Check Adventure Start
    const isAdventureStart = conversationHistory.length === 0 &&
        (playerAction.toLowerCase().includes('comenzar') ||
            playerAction.toLowerCase().includes('empezar') ||
            playerAction.toLowerCase().includes('iniciar'));

    // 2. Logic Phase: Event-Driven Processing
    const generatedDiceRolls: DiceRoll[] = [];
    let updatedWorldTime = input.explorationState?.worldTime;

    // Inicializar despachador de eventos con los sistemas de reglas
    const dispatcher = new EventDispatcher(conversationHistory.length, [
        new NavigationSystem(),
        new InteractionSystem(),
        new SkillCheckSystem(),
        new CombatSystem(),
        new StatsSystem(),
    ]);

    // Traducir interpretación inicial a eventos de intención
    const actionType = interpretation.actionType;
    const targetId = interpretation.targetId;
    const stealthIntent = interpretation.stealthIntent;
    const assignedCompanion = interpretation.assignedCompanion;
    const recipient = interpretation.recipient;

    // Formatear historial para los sistemas que lo necesiten
    const trimmedHistoryText = conversationHistory.slice(-6).map(formatMessageForTranscript).join('\n');

    if (actionType === 'move' && targetId) {
        dispatcher.enqueue({
            type: 'MoveAttempted',
            payload: { toLocationId: targetId, stealthIntent: !!stealthIntent, assignedCompanion }
        });
    } else if (actionType === 'interact' && targetId) {
        dispatcher.enqueue({
            type: 'InteractAttempted',
            payload: { targetId, assignedCompanion, playerAction }
        });
    } else if (actionType === 'attack' && targetId) {
        dispatcher.enqueue({
            type: 'AttackAttempted',
            payload: { targetId, assignedCompanion }
        });
    } else if (actionType === 'skill_check') {
        dispatcher.enqueue({
            type: 'SkillCheckAttempted',
            payload: {
                skill: interpretation.overrideSkill || undefined,
                dc: interpretation.overrideDC || undefined,
                assignedCompanion,
                playerAction,
                conversationHistory: trimmedHistoryText,
                pendingEffects,
                pendingWorldStateFlags
            }
        });
    } else if (actionType === 'drop' && targetId) {
        dispatcher.enqueue({
            type: 'ItemDropAttempted',
            payload: { itemId: targetId, quantity: 1, assignedCompanion }
        });
    } else if (actionType === 'give' && targetId && recipient) {
        dispatcher.enqueue({
            type: 'ItemGiveAttempted',
            payload: { itemId: targetId, quantity: 1, recipient, assignedCompanion }
        });
    } else if (actionType === 'ooc') {
        dispatcher.enqueue({
            type: 'OocDeclared',
            payload: { text: playerAction }
        });
    }

    // Inicializar el contexto mutable para el bucle de despacho
    const initialWorldState = updatedWorldState || { locations: {}, globalFlags: {}, recentEvents: [] };
    if (!initialWorldState.worldTime) {
        initialWorldState.worldTime = updatedWorldTime || { day: 1, hour: 8, minute: 0 };
    }

    const systemContext: Omit<SystemContext, 'enqueue'> = {
        worldState: initialWorldState,
        party,
        openDoors: updatedOpenDoors,
        currentLocationId: currentLocationId,
        adventureData,
        explorationState: input.explorationState || {},
        diceRolls: generatedDiceRolls,
    };

    const logicUpdates: any[] = [];
    const onDispatcherStep = (step: any) => {
        logicUpdates.push(step);
    };

    // Procesar la cola de eventos
    const dispatchResult = await dispatcher.dispatch(systemContext, onDispatcherStep);

    // Yield updates collected during dispatcher run
    for (const step of logicUpdates) {
        yield step;
    }

    // Sincronizar variables locales con el resultado del despacho
    party = systemContext.party;
    updatedOpenDoors = systemContext.openDoors;
    const locationId = systemContext.currentLocationId;
    const newLocationId = (locationId !== currentLocationId) ? locationId : null;
    updatedWorldState = systemContext.worldState;
    updatedWorldTime = systemContext.worldState.worldTime;
    if (systemContext.systemFeedback) {
        systemFeedback = systemContext.systemFeedback;
    }

    // Extraer combatTrigger
    const combatTrigger = systemContext.explorationState?.combatTriggerResult || { shouldStartCombat: false };
    if (combatTrigger.shouldStartCombat) {
        log.gameCoordinator('Injecting Combat Trigger into Stream', { reason: combatTrigger.reason });
        yield {
            type: 'logic_update',
            data: {
                combatTriggerResult: combatTrigger
            }
        };
    }

    // Extraer resultados de tiradas de dados
    const skillCheckResolvedEvent = dispatchResult.processedEvents.find(e => e.type === 'SkillCheckResolved');
    let skillCheckResultData: any = undefined;
    if (skillCheckResolvedEvent && skillCheckResolvedEvent.type === 'SkillCheckResolved') {
        const payload = skillCheckResolvedEvent.payload;
        skillCheckResultData = {
            skill: payload.skill,
            dc: payload.dc,
            isSuccess: payload.isSuccess,
            rollTotal: payload.rollTotal,
            isCriticalSuccess: payload.isCriticalSuccess || false,
            isCriticalFailure: payload.isCriticalFailure || false,
            reasoning: payload.reasoning,
            characterName: payload.characterName,
        };
    }

    let finalLocationData = adventureData.locations.find((l: any) => l.id === locationId);
    if (updatedWorldState) {
        try {
            const effectiveContext = WorldStateManager.getEffectiveLocationContext(adventureData, updatedWorldState, locationId);
            finalLocationData = effectiveContext.location;
        } catch (err: any) {
            log.error('Failed to get effective location context after event processing', { error: err.message });
        }
    }

    let currentLocationEnemies = EnemyStateManager.getEnemiesForLocation(
        locationId,
        enemiesByLocation,
        enemies
    );

    const filteredLocationData = finalLocationData ? JSON.parse(JSON.stringify(finalLocationData)) : { id: locationId, entitiesPresent: [] };
    const deadEntities: string[] = [];

    // Filtra los enemigos muertos de las entidades presentes
    if (filteredLocationData.entitiesPresent && currentLocationEnemies.length > 0) {
        const enemiesToMatch = [...currentLocationEnemies];
        filteredLocationData.entitiesPresent = filteredLocationData.entitiesPresent.filter((entityId: string) => {
            const enemyIndex = enemiesToMatch.findIndex((e: any) =>
                e.id === entityId ||
                (e as any).uniqueId === entityId ||
                (e as any).adventureId === entityId
            );

            if (enemyIndex !== -1) {
                const enemy = enemiesToMatch[enemyIndex];
                enemiesToMatch.splice(enemyIndex, 1);

                const isDead = enemy && (enemy.status === 'dead' || enemy.hp <= 0);

                if (isDead) {
                    deadEntities.push(enemy.name || enemy.id || 'Unknown enemy');
                    return false;
                }
            }
            return true;
        });
    }

    // Re-evaluar contexto de exploración con el nuevo estado
    const cameFromLocationId = (interpretation.actionType === 'move' && newLocationId) ? currentLocationId : null;
    const currentGameState = {
        playerAction, party, locationId, inCombat: false, conversationHistory, exploration: input.explorationState
    };
    const explorationContextResult = ExplorationContextBuilder.build({
        gameState: currentGameState as any,
        locationData: finalLocationData,
        party,
        worldTime: updatedWorldTime,
        initialWorldTime: adventureData.settings?.initialWorldTime,
        adventureData,
        cameFromLocationId,
        openDoors: updatedOpenDoors,
        enemiesByLocation: input.enemiesByLocation,
        enemies: input.enemies,
    });

    const detectedHazards = explorationContextResult.detectedHazards;
    const resolvedEntities = explorationContextResult.context.presentEntities;
    const explorationContext = explorationContextResult.context;

    // Actualizar la lista de efectos activos tras la ejecución de los sistemas
    activeEffects.length = 0;
    if (updatedWorldState?.globalFlags) {
        for (const [key, value] of Object.entries(updatedWorldState.globalFlags)) {
            if (value === true) {
                activeEffects.push(key);
            }
        }
    }

    // 3. Companion Reactions (Before DM)
    const recentHistory = conversationHistory.slice(-6).map(formatMessageForTranscript).join('\n');
    let dynamicRecentHistory = recentHistory;
    const reactedCompanions = new Set<string>();

    const beforeDmStream = processCompanionReactionsStreaming({
        party,
        playerAction,
        interpretation,
        inCombat: false,
        timing: 'before_dm',
        isAdventureStart,
        chatHistory: dynamicRecentHistory,
        excludeCharacters: selectedCharacterName ? [selectedCharacterName] : [],
        locationContext: JSON.stringify(explorationContext),
        presentEntities: resolvedEntities,
        activeEffects,
        worldState: updatedWorldState,
        currentLocationId: locationId,
        turnNumber: conversationHistory.length
    });

    for await (const event of beforeDmStream) {
        if (event.type === 'reaction') {
            reactedCompanions.add(event.message.senderName || '');
            yield { type: 'companion_reaction', message: event.message };
            messages.push(event.message);
            dynamicRecentHistory += `\n${formatMessageForTranscript(event.message)}`;
        } else if (event.type === 'log') {
            localLog(event.message);
        }
    }


    // Start DM Narration Generation
    yield { type: 'debug', content: 'Generating DM Content...' };

    // El filtrado de enemigos muertos ya se realizó anteriormente

    // Update connections on filtered data before sending to AI
    if (filteredLocationData.connections) {
        filteredLocationData.connections = filteredLocationData.connections.map((conn: any) => {
            const doorKey = `${locationId}:${conn.direction}`;
            if (updatedOpenDoors[doorKey] === true) {
                return { ...conn, isOpen: true, visibility: 'open' };
            }
            return conn;
        });
    }

    // --- FIX: Detect Pure Social Interaction ---
    // If companions reacted AND no location change AND action is interaction -> Suppress DM
    const isSocialTurn = (interpretation.actionType === 'interact' &&
        (interpretation.targetId === 'Party' || interpretation.targetId === 'Group' || party.some(p => p.name === interpretation.targetId)));

    const shouldSuppressDM = (isSocialTurn && !newLocationId && !combatTrigger.shouldStartCombat) || combatTrigger.shouldStartCombat;

    // Sincronizar en caliente los interactuables de la localización con el worldState dinámico
    if (filteredLocationData.interactables && updatedWorldState) {
        const locState = WorldStateManager.getLocationState(updatedWorldState, locationId);
        filteredLocationData.interactables = filteredLocationData.interactables.map((interactable: any) => {
            const mutatedInteractable = { ...interactable };
            const stateInWorld = locState.interactables?.[interactable.id];
            if (stateInWorld) {
                if (stateInWorld.state) mutatedInteractable.state = stateInWorld.state;
                if (stateInWorld.items) mutatedInteractable.items = stateInWorld.items;
            }
            return mutatedInteractable;
        });
    }

    // Generar System Notes para consistencia de contenedores e inventario
    let systemNotes = "";
    if (filteredLocationData.interactables && updatedWorldState) {
        filteredLocationData.interactables.forEach((interactable: any) => {
            const isContainer = interactable.type === 'container' || 
                                interactable.id?.toLowerCase().includes('cofre') || 
                                interactable.name?.toLowerCase().includes('cofre') ||
                                interactable.id?.toLowerCase().includes('baul') ||
                                interactable.name?.toLowerCase().includes('baul');
            if (isContainer) {
                const containerItems = interactable.items ?? [];
                const containerState = interactable.state ?? 'closed';
                
                if (containerItems.length > 0) {
                    const itemsNames = containerItems.map((itemId: string) => {
                        const itemDef = adventureData.items?.find((it: any) => it.id === itemId);
                        return itemDef?.name || itemId;
                    }).join(', ');
                    systemNotes += `\n[System State: El contenedor '${interactable.name || interactable.id}' NO está vacío (estado: ${containerState}). Todavía contiene: ${itemsNames}. Asegúrate de que tu narración refleje esto y no lo describa como vacío.]`;
                } else if (containerState === 'looted') {
                    systemNotes += `\n[System State: El contenedor '${interactable.name || interactable.id}' está completamente vacío y saqueado (looted).]`;
                }
            }
        });
    }

    if (filteredLocationData.droppedItems && filteredLocationData.droppedItems.length > 0) {
        const droppedNames = filteredLocationData.droppedItems.map((it: any) => `${it.name} (x${it.quantity})`).join(', ');
        systemNotes += `\n[System State: Hay objetos tirados en el suelo de esta sala: ${droppedNames}.]`;
    }

    let finalHistory = conversationHistory.slice(-6).map(formatMessageForTranscript).join('\n');
    if (systemNotes) {
        finalHistory += `\n${systemNotes}`;
    }

    // Formatear Hechos del Sistema para el Narrador (Hito 5)
    const allEvents = [...rulesEngineEvents, ...dispatchResult.processedEvents];
    const eventsLogText = allEvents
        .filter(e => !e.type.endsWith('Attempted') && e.type !== 'OocDeclared')
        .map(e => {
            switch (e.type) {
                case 'PlayerMoved':
                    return `- El grupo se desplazó de la localización '${e.payload.fromLocationId}' a '${e.payload.toLocationId}'.`;
                case 'DoorOpened': {
                    const { direction, method, keyName } = e.payload;
                    if (method === 'key' && keyName) {
                        return `- Se abrió la puerta en dirección '${direction}' usando la llave '${keyName}'.`;
                    }
                    if (method === 'lockpick') {
                        return `- Se abrió la puerta en dirección '${direction}' forzando con éxito la cerradura (Ganzúas).`;
                    }
                    if (method === 'force') {
                        return `- Se abrió la puerta en dirección '${direction}' derribándola por la fuerza.`;
                    }
                    return `- Se abrió la puerta en dirección '${direction}'.`;
                }
                case 'DoorClosed':
                    return `- Se cerró la puerta en dirección '${e.payload.direction}'.`;
                case 'ItemCollected':
                    return `- ${e.payload.characterName} recogió el objeto '${e.payload.itemName}' (cantidad: ${e.payload.quantity}).`;
                case 'TrapTriggered':
                    return `- ¡Se activó una trampa! ID: '${e.payload.hazardId}'.`;
                case 'DamageApplied':
                    return `- ${e.payload.targetName} recibió ${e.payload.amount} puntos de daño.`;
                case 'HealApplied':
                    return `- ${e.payload.targetName} recuperó ${e.payload.amount} puntos de vida.`;
                case 'SkillCheckResolved':
                    return `- Se resolvió una tirada de ${e.payload.skill} (CD ${e.payload.dc}) por ${e.payload.characterName}. Resultado total: ${e.payload.rollTotal} (${e.payload.isSuccess ? 'ÉXITO' : 'FALLO'}).`;
                case 'CombatTriggered':
                    return `- ¡Estalló el combate debido a: ${e.payload.reason}!`;
                case 'CharacterDied':
                    return `- ${e.payload.characterName} ha caído en combate.`;
                case 'EnemyDied':
                    return `- El enemigo '${e.payload.enemyName}' ha sido derrotado.`;
                default:
                    return `- Evento: ${e.type}`;
            }
        }).join('\n');

    const narrativeInput = {
        phase: (isAdventureStart ? 'combat_initiation' : 'normal') as 'combat_initiation' | 'normal',
        playerAction,
        locationId,
        locationContext: JSON.stringify(filteredLocationData),
        conversationHistory: finalHistory,
        interpretedAction: JSON.stringify(interpretation),
        deadEntities: deadEntities.length > 0 ? deadEntities.join(', ') : undefined,
        isKeyMoment: (newLocationId !== null && newLocationId !== currentLocationId) || interpretation.actionType === 'rest',
        systemFeedback: systemFeedback,
        explorationContext: explorationContext,
        adventureLore: adventureData.adventureLore ? JSON.stringify(adventureData.adventureLore) : undefined,
        // Hint for the Expert
        isSocialTurn: shouldSuppressDM,
        activeEffects,
        skillCheckResult: skillCheckResultData,
        party,
        eventsLog: eventsLogText
    };

    let narrativeResult: any = { dmNarration: "", debugLogs: [] };

    // FIX: Completely SKIP DM AI call if it's a pure social turn with companions
    if (shouldSuppressDM) {
        localLog("NarrativeTurnManager: Skipping DM Narration (Social Turn suppression active)");
        // narrativeResult remains empty, effectively silencing the DM
    } else {
        // Call AI (Blocking 5s)
        narrativeResult = await narrativeExpert(narrativeInput);
    }

    (narrativeResult.debugLogs || []).forEach(localLog);

    if (narrativeResult.dmNarration) {
        const { html } = await markdownToHtml({ markdown: narrativeResult.dmNarration });
        const dmMessage = {
            sender: 'DM' as const,
            content: html,
            originalContent: narrativeResult.dmNarration,
        };
        messages.push(dmMessage);
        // Actualizar dynamicRecentHistory con la narración del DM
        dynamicRecentHistory += `\n${formatMessageForTranscript(dmMessage)}`;

        // Yield DM Narration!
        yield {
            type: 'dm_narration',
            content: narrativeResult.dmNarration,
            originalContent: narrativeResult.dmNarration // Keep raw markdown for logic
        };
    }

    // 5. Companion Reactions (After DM)
    // Stream!
    const afterDmStream = processCompanionReactionsStreaming({
        party,
        playerAction,
        interpretation,
        inCombat: false,
        timing: 'after_dm',
        isAdventureStart,
        dmNarration: narrativeResult.dmNarration,
        chatHistory: dynamicRecentHistory, // Pass updated history
        excludeCharacters: [...Array.from(reactedCompanions), ...(selectedCharacterName ? [selectedCharacterName] : [])], // Pass exclusion list and selected companion
        locationContext: JSON.stringify(explorationContext),
        presentEntities: resolvedEntities,
        activeEffects,
        skillCheckResult: skillCheckResultData,
        worldState: updatedWorldState,
        currentLocationId: locationId,
        turnNumber: conversationHistory.length
    });

    for await (const event of afterDmStream) {
        if (event.type === 'reaction') {
            yield { type: 'companion_reaction', message: event.message };
            messages.push(event.message);
        } else if (event.type === 'log') {
            localLog(event.message);
        }
    }

    // Return final Output for completeness (though streaming consumers might ignore some of it)
    return {
        messages,
        debugLogs,
        nextLocationId: newLocationId,
        updatedParty: party,
        updatedWorldTime: updatedWorldTime,
        updatedExplorationState: currentGameState.exploration,
        combatTriggerResult: combatTrigger.shouldStartCombat ? combatTrigger : undefined,
        updatedOpenDoors: Object.keys(updatedOpenDoors).length > 0 ? updatedOpenDoors : undefined,
        diceRolls: generatedDiceRolls.length > 0 ? generatedDiceRolls : undefined,
        updatedWorldState
    };
}

/**
 * Ejecuta un turno narrativo completo.
 * 
 * @param input - Datos necesarios para el turno
 * @returns Resultado del turno (mensajes, logs, estado)
 */
/**
 * Ejecuta un turno narrativo completo (versión síncrona/no-streaming).
 * Consume el generador executeNarrativeTurnStreaming hasta completarlo
 * y devuelve el valor de retorno final.
 */
export async function executeNarrativeTurn(input: NarrativeTurnInput): Promise<NarrativeTurnOutput> {
    const generator = executeNarrativeTurnStreaming(input);
    let result = await generator.next();
    while (!result.done) {
        result = await generator.next();
    }
    return result.value as NarrativeTurnOutput;
}

