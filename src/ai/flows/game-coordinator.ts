
'use server';
/**
 * @fileOverview The central AI coordinator for the D&D game.
 * This flow is the main entry point for all player actions.
 * It now enforces a strict, logical order of operations and message assembly.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { oocAssistant } from './ooc-assistant';
import type { GameMessage } from '@/lib/types';
import { markdownToHtml } from './markdown-to-html';
import { narrativeExpert } from './narrative-manager';
import { getAdventureData } from '@/app/game-state-actions';
import { processCompanionReactions } from './managers/companion-reaction-manager';
import { executeNarrativeTurn } from './managers/narrative-turn-manager';
import { areAllEntitiesOutOfCombat, areAllEntitiesDead, isEntityOutOfCombat } from '@/lib/game/entity-status-utils';
import { formatMessageForTranscript } from '@/lib/utils/transcript-formatter';
import { actionInterpreter } from './action-interpreter';
import { GameStateSchema, GameCoordinatorOutputSchema, type GameState, type GameCoordinatorOutput } from '@/ai/flows/schemas';
import { combatManagerTool } from '../tools/combat-manager';
import { combatInitiationExpertTool } from '../tools/combat-initiation-expert';
import { CombatTriggerManager } from './managers/combat-trigger-manager';
import { log } from '@/lib/logger';



export const gameCoordinatorFlow = ai.defineFlow(
    {
        name: 'gameCoordinatorFlow',
        inputSchema: GameStateSchema,
        outputSchema: GameCoordinatorOutputSchema,
    },
    async (input) => {
        const { playerAction, inCombat, conversationHistory, party, turnIndex = 0 } = input;
        let { locationId } = input;

        // Get enemies for current location from enemiesByLocation, fallback to enemies for backward compatibility
        let currentLocationEnemies = input.enemiesByLocation?.[locationId] || input.enemies || [];

        const debugLogs: string[] = [];
        const localLog = (message: string) => {
            log.gameCoordinator(message, { action: playerAction, inCombat, turnIndex });
            debugLogs.push(message);
        };

        log.gameCoordinator('Received action', {
            action: playerAction,
            inCombat,
            turnIndex,
            locationId,
            partySize: party.length,
        });
        localLog(`GameCoordinator: Received action: "${playerAction}". InCombat: ${inCombat}. TurnIndex: ${turnIndex}.`);

        // Issue #27 & #54: Verificar muerte del jugador y game over
        // SOLO detener el combate si TODOS los miembros del grupo están muertos/inconscientes
        const allDead = areAllEntitiesOutOfCombat(party);
        if (allDead) {
            // Distinguish between all unconscious and all dead
            const allDeadFlag = areAllEntitiesDead(party);
            const gameOverMessage = allDeadFlag
                ? '¡Game Over! Todos los miembros del grupo han muerto en combate. Vuestro viaje termina aquí, pero vuestra historia será recordada. La aventura ha terminado.'
                : '¡Game Over! Todos los miembros del grupo han caído inconscientes. Sin nadie que pueda ayudarlos, vuestro viaje termina aquí. La aventura ha terminado.';

            log.gameCoordinator('Game over: All party members dead/unconscious', {
                partySize: party.length,
                allDead: allDeadFlag,
            });
            return {
                messages: [{
                    sender: 'DM',
                    content: gameOverMessage,
                }],
                debugLogs: [...debugLogs, `Game over: All party members are ${allDeadFlag ? 'dead' : 'unconscious'}`],
                updatedParty: party,
                inCombat: false,
                turnIndex: 0,
            };
        }

        // Issue #54: Si el jugador está inconsciente pero hay compañeros vivos, 
        // NO detener el flujo. El combat-manager.ts se encargará de mostrar el mensaje
        // y permitir que los compañeros continúen el combate.

        const adventureData = await getAdventureData();
        if (!adventureData) {
            log.error('Failed to load adventure data', { module: 'GameCoordinator' });
            throw new Error("Failed to load adventure data.");
        }

        log.debug('Looking up location in adventure data', {
            module: 'GameCoordinator',
            locationId,
            adventureId: adventureData.adventureId || 'unknown',
            totalLocations: adventureData.locations?.length || 0,
        });

        const currentLocationData = adventureData.locations.find((l: any) => l.id === locationId);

        if (!currentLocationData) {
            const availableLocations = adventureData.locations?.map((l: any) => l.id) || [];
            log.error('Location not found in adventure data', {
                module: 'GameCoordinator',
                locationId,
                adventureId: adventureData.adventureId || 'unknown',
                availableLocations,
            });
            throw new Error(`Location "${locationId}" not found in adventure data. Available locations: ${availableLocations.join(', ') || 'none'}`);
        }

        log.debug('Location found in adventure data', {
            module: 'GameCoordinator',
            locationId,
            locationTitle: currentLocationData.title || 'unknown',
        });

        // Log openDoors state for debugging
        if (input.openDoors && Object.keys(input.openDoors).length > 0) {
            log.debug('Open doors state received', {
                module: 'GameCoordinator',
                openDoors: input.openDoors,
            });
        }

        // Check if this is a "continue turn" action (step-by-step combat)
        const isContinueTurn = playerAction.toLowerCase().includes('continuar') ||
            playerAction.toLowerCase().includes('pasar turno') ||
            playerAction.toLowerCase().includes('siguiente turno');

        let interpretation;
        let interpreterLogs: string[] = [];

        if (inCombat && isContinueTurn) {
            // Special case: continue turn action in combat (no need to interpret)
            const currentCombatant = input.initiativeOrder?.[turnIndex]?.characterName || 'Unknown';
            log.gameCoordinator('Continue turn action detected', {
                action: playerAction,
                currentTurnIndex: turnIndex,
                currentCombatant,
                initiativeOrderLength: input.initiativeOrder?.length,
            });
            localLog("GameCoordinator: Continue turn action detected. Skipping interpretation.");
            interpretation = {
                actionType: 'continue_turn' as const,
                targetId: null,
            };
        } else {
            log.gameCoordinator('Interpreting player action', { action: playerAction });
            localLog("GameCoordinator: Interpreting player action...");

            // Generate transcript for context
            const historyTranscript = conversationHistory.map(formatMessageForTranscript).join('\n');

            // Context Enrichment: Add implicit destinations for Hubs
            const enrichedLocationData = { ...currentLocationData };
            if (currentLocationData.regionId) {
                const implicitDestinations = adventureData.locations
                    .filter((l: any) => l.regionId === currentLocationData.regionId && l.id !== currentLocationData.id)
                    .map((l: any) => ({
                        id: l.id,
                        name: l.name || l.title,
                        type: 'implicit_hub_connection'
                    }));

                if (implicitDestinations.length > 0) {
                    (enrichedLocationData as any).implicitDestinations = implicitDestinations;
                    localLog(`Context Enrichment: Added ${implicitDestinations.length} implicit destinations from region "${currentLocationData.regionId}"`);
                }
            }

            const result = await actionInterpreter({
                playerAction,
                locationContext: JSON.stringify(enrichedLocationData),
                party: party,
                updatedEnemies: currentLocationEnemies, // Issue #27: Pass enemies to filter dead ones
                conversationHistory: historyTranscript,
            });
            interpretation = result.interpretation;
            interpreterLogs = result.debugLogs;
        }

        if (inCombat) {
            const currentCombatant = input.initiativeOrder?.[turnIndex]?.characterName || 'Unknown';
            log.gameCoordinator('Processing combat turn', {
                turnIndex,
                actionType: interpretation.actionType,
                currentCombatant,
                isContinueTurn: interpretation.actionType === 'continue_turn',
            });
            const combatResult = await combatManagerTool({
                ...input,
                interpretedAction: interpretation,
                locationContext: currentLocationData,
            });

            // Log combat result details
            const resultCombatant = combatResult.initiativeOrder?.[combatResult.turnIndex || 0]?.characterName || 'Unknown';
            log.gameCoordinator('Combat turn processed', {
                turnIndexChange: {
                    from: turnIndex,
                    to: combatResult.turnIndex,
                    previousCombatant: currentCombatant,
                    resultCombatant,
                },
                hasMoreAITurns: combatResult.hasMoreAITurns,
                messagesCount: combatResult.messages?.length || 0,
                diceRollsCount: combatResult.diceRolls?.length || 0,
            });

            return { ...combatResult, debugLogs: debugLogs };
        }
        interpreterLogs.forEach(localLog);

        log.gameCoordinator('Action interpreted', {
            actionType: interpretation.actionType,
            targetId: interpretation.targetId,
        });

        // Issue #27 (Punto 1): Verificar si el jugador intenta interactuar con un personaje muerto/inconsciente
        if (interpretation.actionType === 'interact' && interpretation.targetId) {
            // Verificar compañeros/jugador
            const targetCompanion = party.find(p => p.name === interpretation.targetId);
            if (targetCompanion) {
                if (targetCompanion.isDead === true) {
                    // Muerte real
                    log.gameCoordinator('Player tried to interact with dead companion', {
                        target: interpretation.targetId,
                        hp: targetCompanion.hp.current,
                        isDead: true,
                    });
                    return {
                        messages: [{
                            sender: 'DM',
                            content: `${targetCompanion.name} está muerto y no puede responder.`,
                        }],
                        debugLogs: [...debugLogs, `Player tried to interact with dead companion: ${interpretation.targetId}`],
                        updatedParty: party,
                        inCombat: inCombat,
                        turnIndex: turnIndex,
                    };
                } else if (targetCompanion.hp && targetCompanion.hp.current <= 0) {
                    // Inconsciente
                    log.gameCoordinator('Player tried to interact with unconscious companion', {
                        target: interpretation.targetId,
                        hp: targetCompanion.hp.current,
                        isDead: false,
                    });
                    return {
                        messages: [{
                            sender: 'DM',
                            content: `${targetCompanion.name} está inconsciente y no puede responder. Necesita ser estabilizado o curado antes de poder interactuar.`,
                        }],
                        debugLogs: [...debugLogs, `Player tried to interact with unconscious companion: ${interpretation.targetId}`],
                        updatedParty: party,
                        inCombat: inCombat,
                        turnIndex: turnIndex,
                    };
                }
            }

            // Verificar enemigos muertos
            if (currentLocationData?.entitiesPresent && currentLocationEnemies.length > 0) {
                const targetEnemy = currentLocationEnemies.find(e =>
                    e.id === interpretation.targetId ||
                    (e as any).uniqueId === interpretation.targetId ||
                    e.name === interpretation.targetId
                );
                if (targetEnemy && targetEnemy.hp && targetEnemy.hp.current <= 0) {
                    log.gameCoordinator('Player tried to interact with dead enemy', {
                        target: interpretation.targetId,
                        hp: targetEnemy.hp.current,
                    });
                    return {
                        messages: [{
                            sender: 'DM',
                            content: `${targetEnemy.name} está muerto y no puede responder. Su cadáver yace inmóvil.`,
                        }],
                        debugLogs: [...debugLogs, `Player tried to interact with dead enemy: ${interpretation.targetId}`],
                        updatedParty: party,
                        inCombat: inCombat,
                        turnIndex: turnIndex,
                    };
                }
            }
        }

        const historyTranscript = conversationHistory.map(formatMessageForTranscript).join('\n');

        if (interpretation.actionType === 'ooc') {
            const oocResult = await oocAssistant({ playerQuery: playerAction.substring(2).trim(), conversationHistory: historyTranscript });
            return { messages: [{ sender: 'DM', content: `(OOC) ${oocResult.dmReply}` }], debugLogs, inCombat: false };
        }

        if (interpretation.actionType === 'attack') {
            // Evaluate if this is a player surprise attack (attacking from outside combat)
            const playerActionTrigger = CombatTriggerManager.evaluatePlayerAction({
                actionType: interpretation.actionType,
                targetId: interpretation.targetId || undefined,
                isCombatAction: true
            });

            if (playerActionTrigger.surpriseSide === 'player') {
                log.gameCoordinator('Player Surprise Attack detected', { 
                    targetId: interpretation.targetId,
                    reason: playerActionTrigger.reason 
                });
                localLog(`GameCoordinator: Player surprise attack! Target: ${interpretation.targetId}`);
            } else {
                log.gameCoordinator('Initiating combat', { targetId: interpretation.targetId });
                localLog("GameCoordinator: Action is 'attack'. Initiating combat...");
            }

            const initiationResult = await combatInitiationExpertTool({
                playerAction,
                locationId,
                targetId: interpretation.targetId || '',
                locationContext: currentLocationData,
                party,
                updatedEnemies: currentLocationEnemies, // Issue #27: Pass enemies to filter dead ones
            });

            log.gameCoordinator('Combat initiated', {
                combatantIds: initiationResult.combatantIds?.length || 0,
                surpriseSide: playerActionTrigger.surpriseSide,
            });

            // FIXED: Pass all required properties to the combatManagerTool for initiation.
            const combatResult = await combatManagerTool({
                ...input,
                inCombat: false, // Explicitly set inCombat to false for initiation.
                turnIndex: 0,
                combatantIds: initiationResult.combatantIds,
                interpretedAction: interpretation, // This was missing.
                locationContext: currentLocationData, // This was missing.
                surpriseSide: playerActionTrigger.surpriseSide, // Pass surprise side to mark surprised combatants
            });
            return { ...combatResult, debugLogs: debugLogs };
        }

        // Execute narrative turn (outside of combat)
        const narrativeResult = await executeNarrativeTurn({
            playerAction,
            interpretation,
            party,
            currentLocationId: locationId,
            adventureData,
            conversationHistory,
            enemiesByLocation: input.enemiesByLocation,
            enemies: input.enemies,
            explorationState: input.exploration, // Pass current exploration state
            openDoors: input.openDoors // Pass current door states
        });

        // Merge logs
        narrativeResult.debugLogs.forEach(localLog);

        // --- DYNAMIC COMBAT TRIGGER HANDLING ---
        if (narrativeResult.combatTriggerResult && narrativeResult.combatTriggerResult.shouldStartCombat) {
            const trigger = narrativeResult.combatTriggerResult;
            log.gameCoordinator('Dynamic Combat Triggered', { reason: trigger.reason, surprise: trigger.surpriseSide });
            localLog(`GameCoordinator: Dynamic Combat Triggered! Reason: ${trigger.reason}`);

            // 1. Identify Enemies
            // CRITICAL FIX: Use enemies from the COMBAT location (current or new)
            let combatLocationId = locationId;
            let combatLocationData = currentLocationData;
            
            // Check if we moved to a new location
            if (narrativeResult.nextLocationId && narrativeResult.nextLocationId !== locationId) {
                combatLocationId = narrativeResult.nextLocationId;
                combatLocationData = adventureData.locations.find((l: any) => l.id === combatLocationId) || currentLocationData;
                localLog(`Dynamic Combat: Switching context to new location ${combatLocationId}.`);
            }
            
            // Get enemies ONLY for the combat location (not fallback to all enemies)
            let combatEnemies = input.enemiesByLocation?.[combatLocationId] || [];

            // Fallback: Load from adventureData if not in state
            if (combatEnemies.length === 0 && combatLocationData.entitiesPresent) {
                combatEnemies = combatLocationData.entitiesPresent.map((id: string) =>
                    adventureData.entities?.find((e: any) => e.id === id)
                ).filter((e: any) => e);
                localLog(`Dynamic Combat: Loaded ${combatEnemies.length} enemies from adventure data for location ${combatLocationId}`);
            }

            // Normalize entities loaded from JSON (convert stats.hp to hp: {current, max})
            combatEnemies = combatEnemies.map((entity: any) => {
                if (entity.stats?.hp && !entity.hp) {
                    return {
                        ...entity,
                        hp: { current: entity.stats.hp, max: entity.stats.hp },
                        ac: entity.stats.ac
                    };
                }
                return entity;
            });
            
            localLog(`Dynamic Combat: Found ${combatEnemies.length} enemies for location ${combatLocationId}`);
            

            // 3. Filter enemies to include ONLY visible ones AND the triggering entity (if any)
            let filteredCombatEnemies: any[] = [];
            
            if (combatEnemies.length > 0) {
                // If there's a specific triggering entity (e.g. mimic), we MUST include it and reveal it
                if (trigger.triggeringEntityId) {
                    const triggeringEnemy = combatEnemies.find((e: any) => e.id === trigger.triggeringEntityId);
                    if (triggeringEnemy) {
                        // Reveal the hidden enemy
                        // Create a copy to modify
                        const revealedEnemy = { ...triggeringEnemy, disposition: 'hostile', status: 'active' };
                        filteredCombatEnemies.push(revealedEnemy);
                        localLog(`Dynamic Combat: Revealed hidden enemy ${revealedEnemy.name} (${revealedEnemy.id})`);
                    } else {
                        localLog(`Dynamic Combat: WARNING - Triggering entity ${trigger.triggeringEntityId} not found in combatEnemies list.`);
                    }
                }

                // Add other visible/hostile enemies
                const otherEnemies = combatEnemies.filter((e: any) => {
                    // Skip if it's the triggering entity (already added)
                    if (trigger.triggeringEntityId && e.id === trigger.triggeringEntityId) return false;
                    
                    // Filter hidden enemies
                    const isHidden = e.disposition === 'hidden' || e.status === 'hidden';
                    return !isHidden;
                });
                
                filteredCombatEnemies = [...filteredCombatEnemies, ...otherEnemies];
                localLog(`Dynamic Combat: Included ${otherEnemies.length} other visible enemies.`);
            }

            const enemyIds = filteredCombatEnemies.map((e: any) => e.id || (e as any).uniqueId);
            const partyIds = party.map(p => p.id);
            const allCombatantIds = [...partyIds, ...enemyIds];

            // Update combatEnemies with the filtered list for initialization context if needed
            // But combatManagerTool might reload them from IDs. 
            // IMPORTANT: If we modified the 'disposition' of the mimic, we need to pass this updated state.
            // However, combatManagerTool usually re-fetches or uses passed enemies. 
            // We should pass 'updatedEnemies' to combatManagerTool if possible, or ensure EnemyValidator respects the IDs.
            
            // Issue: combatManagerTool / EnemyValidator re-fetches enemies from adventureData by ID if not provided.
            // If it re-fetches, it will get the "hidden" version again.
            // We need to pass the *revealed* enemies to combatManagerTool.
            
            // 2. Add Trigger Message
            if (trigger.message) {
                narrativeResult.messages.push({
                    sender: 'DM',
                    content: `**${trigger.message}**`
                });
            }

            // Prepare updated enemies map with revealed enemies
            const updatedEnemiesByLocation = {
                ...(input.enemiesByLocation || {}),
                [combatLocationId]: filteredCombatEnemies
            };

            // 3. Initialize Combat
            const combatResult = await combatManagerTool({
                ...input,
                inCombat: false,
                turnIndex: 0,
                combatantIds: allCombatantIds,
                enemiesByLocation: updatedEnemiesByLocation, // Pass updated enemies (revealed mimic)
                interpretedAction: { actionType: 'attack', targetId: 'dynamic_trigger' },
                locationContext: combatLocationData,
                surpriseSide: trigger.surpriseSide, // Pass surprise side for ambushes, mimics, etc.
            });

            // 4. Merge Results
            // IMPORTANT: Use combatLocationId as nextLocationId since we moved before combat started
            return {
                ...combatResult,
                messages: [...narrativeResult.messages, ...(combatResult.messages || [])],
                debugLogs: [...debugLogs, ...narrativeResult.debugLogs],
                updatedExplorationState: narrativeResult.updatedExplorationState,
                updatedOpenDoors: narrativeResult.updatedOpenDoors,
                nextLocationId: combatLocationId, // Preserve the location we moved to before combat
            };
        }

        return {
            messages: narrativeResult.messages,
            debugLogs,
            updatedParty: narrativeResult.updatedParty,
            nextLocationId: narrativeResult.nextLocationId,
            inCombat: false,
            turnIndex: 0,
            updatedWorldTime: narrativeResult.updatedWorldTime,
            updatedExplorationState: narrativeResult.updatedExplorationState, // Return updated state
            updatedOpenDoors: narrativeResult.updatedOpenDoors // Return updated door states
        };
    }
);

export async function gameCoordinator(input: GameState): Promise<GameCoordinatorOutput> {
    return gameCoordinatorFlow(input);
}
