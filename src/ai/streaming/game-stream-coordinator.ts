
import { createEvent } from '@/lib/streaming/protocol';
import { GameStreamEvent } from '@/lib/streaming/types';
import { GameState } from '@/ai/flows/schemas';
import { actionInterpreter } from '@/ai/flows/action-interpreter';
import { narrativeManagerStream } from './narrative-manager-stream';
import { executeNarrativeTurn, executeNarrativeTurnStreaming } from '@/ai/flows/managers/narrative-turn-manager';
import { combatManagerTool } from '@/ai/tools/combat-manager';
import { getAdventureData } from '@/app/game-state-actions';
import { log } from '@/lib/logger';
import { EnemyStateManager } from '@/lib/game/enemy-state-manager';
import { areAllEntitiesOutOfCombat, areAllEntitiesDead } from '@/lib/game/entity-status-utils';
import { formatMessageForTranscript } from '@/lib/utils/transcript-formatter';
import { oocAssistant } from '@/ai/flows/ooc-assistant';
import { CombatInitiationService } from '@/lib/combat/combat-initiation-service';
import { combatInitiationExpertTool } from '@/ai/tools/combat-initiation-expert';
import { WorldStateManager } from '@/lib/game/world-state-manager';

/**
 * Helper generator to stream text with pacing.
 */
async function* streamText(text: string, role: string) {
    for (const char of text) {
        yield createEvent('token', { role: role as any, content: char });
    }
}

/**
 * The Streaming Coordinator orchestrates the game loop using Generators.
 * It yields events progressively to the client.
 */
export async function* gameStreamCoordinator(
    input: GameState
): AsyncGenerator<GameStreamEvent, void, unknown> {
    const { playerAction, party, locationId, conversationHistory = [] } = input;
    let currentGameState = { ...input }; // Mutable copy for state tracking

    try {
        yield createEvent('debug', { message: 'Coordinator started' });

        // 0. Load Adventure Data
        const adventureData = await getAdventureData();
        if (!adventureData) {
            yield createEvent('error', { code: 'DATA_ERROR', message: 'Failed to load adventure data', isFatal: true });
            return;
        }

        // Fallback seguro si la localización guardada ya no existe en la aventura actual (ej: por renombrado o regeneración)
        let activeLocationId = locationId;
        let currentLocationData = adventureData.locations.find((l: any) => l.id === activeLocationId);
        if (!currentLocationData) {
            const fallbackId = adventureData.settings?.startingLocationId || adventureData.locations[0]?.id;
            log.warn(`Location ${activeLocationId} not found in adventure locations. Falling back to startingLocationId ${fallbackId}`, {
                module: 'GameStreamCoordinator',
                locationId: activeLocationId,
                fallbackId
            });
            if (fallbackId) {
                activeLocationId = fallbackId;
                currentLocationData = adventureData.locations.find((l: any) => l.id === activeLocationId);
                // Forzar la actualización del estado del juego en el cliente
                yield createEvent('state_delta', {
                    updateType: 'merge',
                    data: { locationId: activeLocationId }
                });
            }
        }

        // 1. Check Game Over (Blocking Check)
        const allDead = areAllEntitiesOutOfCombat(party);
        if (allDead) {
            const allDeadFlag = areAllEntitiesDead(party);
            const msg = allDeadFlag
                ? '¡Game Over! Todos han muerto...'
                : '¡Game Over! Todos han caído inconscientes...';

            yield* streamText(msg, 'dm');

            // Send finalized message via state_delta
            yield createEvent('state_delta', {
                updateType: 'merge',
                data: {
                    messages: [{
                        id: `msg-gameover-${Date.now()}`,
                        sender: 'System',
                        content: msg,
                        timestamp: new Date().toLocaleTimeString()
                    }]
                }
            });

            yield createEvent('stream_done', { turnIndex: 0 });
            return;
        }

        // 1.5. Interpret Action & OOC Handling (Unified)
        yield createEvent('debug', { message: 'Interpreting Action...' });

        const historyTranscript = conversationHistory.slice(-6).map(formatMessageForTranscript).join('\n');
        let currentLocationEnemies = EnemyStateManager.getEnemiesForLocation(
            activeLocationId,
            input.enemiesByLocation,
            input.enemies
        );
        currentLocationData = adventureData.locations.find((l: any) => l.id === activeLocationId);

        let enrichedLocationData = { ...currentLocationData };
        if (input.worldState) {
            try {
                const effectiveContext = WorldStateManager.getEffectiveLocationContext(adventureData, input.worldState, activeLocationId);
                enrichedLocationData = effectiveContext.location;
                if (effectiveContext.enemies && effectiveContext.enemies.length > 0) {
                    const existingIds = new Set(currentLocationEnemies.map((e: any) => e.id));
                    for (const effEnemy of effectiveContext.enemies) {
                        if (effEnemy?.id && !existingIds.has(effEnemy.id)) {
                            currentLocationEnemies.push(effEnemy);
                        }
                    }
                }
            } catch (err: any) {
                log.error('Failed to get effective location context in gameStreamCoordinator', { error: err.message });
            }
        }
        if (currentLocationData?.regionId) {
            const implicitDestinations = adventureData.locations
                .filter((l: any) => l.regionId === currentLocationData.regionId && l.id !== currentLocationData.id)
                .map((l: any) => ({
                    id: l.id,
                    name: l.name || l.title,
                    type: 'implicit_hub_connection'
                }));

            if (implicitDestinations.length > 0) {
                (enrichedLocationData as any).implicitDestinations = implicitDestinations;
            }
        }

        const interpretationResult = await actionInterpreter({
            playerAction,
            locationContext: JSON.stringify(enrichedLocationData),
            party: party.map(p => ({ ...p, id: (p as any).id || p.name })), // Slim party
            updatedEnemies: currentLocationEnemies,
            conversationHistory: historyTranscript
        });

        const { interpretation } = interpretationResult;
        yield createEvent('debug', { message: `Action: ${interpretation.actionType}` });

        // Handle OOC
        if (interpretation.actionType === 'ooc') {
            const oocResult = await oocAssistant({
                playerQuery: playerAction.substring(2).trim(),
                conversationHistory: historyTranscript
            });
            const content = typeof oocResult === 'string' ? oocResult : oocResult.dmReply;

            yield* streamText(content, 'system');

            // Send finalized message via state_delta
            yield createEvent('state_delta', {
                updateType: 'merge',
                data: {
                    messages: [{
                        id: `msg-ooc-${Date.now()}`,
                        sender: 'System',
                        senderName: 'DM',
                        content: content,
                        timestamp: new Date().toLocaleTimeString()
                    }]
                }
            });

            yield createEvent('stream_done', {});
            return;
        }

        // 2. Combat Mode
        if (input.inCombat) {
            yield createEvent('debug', { message: 'Processing Combat Turn...' });

            // Delegate to legacy Manager (Blocking) - Safe
            // We use 'yield*' to delegate? No, combatManagerTool is not a generator.
            // We await it, then stream the result.

            // Note: combatManagerTool might take time. We should ideally emit a 'thinking' event?
            // "Tool Start" for combat calculator?
            yield createEvent('tool_start', { tool: 'combat_manager', input: { action: playerAction } });

            const combatResult = await combatManagerTool({
                ...input,
                interpretedAction: interpretation,
                locationId: activeLocationId,
                locationContext: adventureData.locations.find((l: any) => l.id === activeLocationId)
            });

            yield createEvent('tool_end', { tool: 'combat_manager', result: 'Turn Processed' });

            // Stream Messages with Pacing
            if (combatResult.messages) {
                for (const msg of combatResult.messages) {
                    const contentToStream = ((msg as any).originalContent || msg.content) as string;

                    yield* streamText(contentToStream, (msg.sender || 'dm').toLowerCase());
                    yield createEvent('token', { role: 'dm', content: '\n\n' });
                }
            }


            // State Update
            yield createEvent('state_delta', {
                updateType: 'merge',
                data: {
                    inCombat: combatResult.inCombat,
                    turnIndex: combatResult.turnIndex,
                    initiativeOrder: combatResult.initiativeOrder,
                    party: combatResult.updatedParty,
                    enemies: combatResult.updatedEnemies,
                    enemiesByLocation: combatResult.updatedEnemiesByLocation || input.enemiesByLocation,
                    diceRolls: combatResult.diceRolls, // Send new rolls
                    messages: combatResult.messages, // Send structured messages
                    phase: combatResult.phase,
                    lastProcessedTurnWasAI: combatResult.lastProcessedTurnWasAI,
                    lastProcessedTurnIndex: combatResult.lastProcessedTurnIndex,
                    playerActionCompleted: combatResult.playerActionCompleted,
                    worldState: combatResult.worldState
                }
            });

            yield createEvent('stream_done', {
                turnIndex: combatResult.turnIndex
            });
            return;
        }

        // C. Attack / Combat Initiation Check
        if (interpretation.actionType === 'attack') {
            // ... logic from game-coordinator ...
            // Check Surprise
            const playerActionTrigger = CombatInitiationService.evaluatePlayerAction(
                interpretation.actionType,
                interpretation.targetId || undefined
            );

            // Prepare Initiation
            const initiationResult = await combatInitiationExpertTool({
                playerAction,
                locationId: activeLocationId,
                targetId: interpretation.targetId || '',
                locationContext: currentLocationData,
                party,
                updatedEnemies: currentLocationEnemies,
            });

            const partyIds = party.map(p => (p as any).id);
            let combatantIds = initiationResult.combatantIds || [];
            combatantIds = CombatInitiationService.enrichCombatantsWithSmartNPCs(
                combatantIds,
                currentLocationData.entitiesPresent,
                adventureData,
                playerAction,
                interpretation.targetId || ''
            );
            const hasOpponents = combatantIds.some(id => !partyIds.includes(id));

            if (hasOpponents) {
                yield createEvent('debug', { message: 'Combat Initiated!' });
                // Start Combat (Blocking)
                const combatResult = await combatManagerTool({
                    ...input,
                    inCombat: false,
                    turnIndex: 0,
                    combatantIds: combatantIds,
                    interpretedAction: interpretation,
                    locationContext: currentLocationData,
                    surpriseSide: playerActionTrigger.surpriseSide,
                });

                // Stream output with Pacing
                if (combatResult.messages) {
                    for (const m of combatResult.messages) {
                        yield* streamText(m.content + '\n', 'dm');
                    }
                }

                 yield createEvent('state_delta', {
                    updateType: 'merge',
                    data: {
                        inCombat: true,
                        combatantIds: combatantIds,
                        initiativeOrder: combatResult.initiativeOrder,
                        turnIndex: combatResult.turnIndex ?? 0,
                        party: combatResult.updatedParty,
                        enemies: combatResult.updatedEnemies,
                        enemiesByLocation: combatResult.updatedEnemiesByLocation || input.enemiesByLocation,
                        diceRolls: combatResult.diceRolls,
                        messages: combatResult.messages, // Send structured messages
                        phase: combatResult.phase,
                        lastProcessedTurnWasAI: combatResult.lastProcessedTurnWasAI,
                        lastProcessedTurnIndex: combatResult.lastProcessedTurnIndex,
                        playerActionCompleted: combatResult.playerActionCompleted,
                        worldState: combatResult.worldState
                    }
                });
                yield createEvent('stream_done', { turnIndex: combatResult.turnIndex ?? 0 });
                return;
            }
        }

        // D. Narrative Turn (Hybrid Strategy)
        // If action is simple interaction, we try True Streaming.
        // Otherwise (Movement, Skill Check, Rest, Inventory), we use Safe Fallback.

        // D. Narrative Turn (Streaming Strategy)
        yield createEvent('tool_start', { tool: 'world_sim', input: {} });

        const selectedId = (input as any).selectedCharacterId;
        const selectedChar = selectedId ? party.find((p: any) => p.id?.toString().trim() === selectedId.toString().trim()) : undefined;
        const selectedCharacterName = selectedChar?.name;

        // Use the new Streaming Generator
        const narrativeStream = executeNarrativeTurnStreaming({
            playerAction,
            interpretation: interpretation,
            party,
            currentLocationId: activeLocationId,
            adventureData,
            conversationHistory: conversationHistory,
            enemiesByLocation: input.enemiesByLocation,
            enemies: input.enemies,
            explorationState: input.exploration,
            openDoors: input.openDoors,
            worldState: input.worldState,
            selectedCharacterName: selectedCharacterName
        } as any);

        // Track accumulated data for final state update if needed, though we yield incrementally now.
        let finalNarrativeOutput: any = {};

        // activeLocationId ya está definida arriba
        let activeLocationContext = currentLocationData;

        let result = await narrativeStream.next();
        while (!result.done) {
            const step = result.value;
            switch (step.type) {
                case 'logic_update':
                    // Immediate State Update (Movement, Time, Rolls)
                    if (step.data) {
                        yield createEvent('state_delta', {
                            updateType: 'merge',
                            data: step.data
                        });

                        // UPDATE LOCAL LOCATION CONTEXT IF MOVED
                        if (step.data.locationId && step.data.locationId !== activeLocationId) {
                            activeLocationId = step.data.locationId;
                            const newContext = adventureData.locations.find((l: any) => l.id === activeLocationId);
                            if (newContext) {
                                activeLocationContext = newContext;
                                // We don't log here to avoid spam, but the state_delta already informed the client
                            }
                        }

                        // CHECK FOR COMBAT TRIGGER
                        if (step.data.combatTriggerResult && step.data.combatTriggerResult.shouldStartCombat) {
                            const trigger = step.data.combatTriggerResult;
                            yield createEvent('debug', { message: `Combat Auto-Triggered: ${trigger.reason}` });

                            // Prepare Initiation using the AI Expert to determine participants dynamically (100% adventure-generic)
                            const initiationResult = await combatInitiationExpertTool({
                                playerAction,
                                locationId: activeLocationId,
                                targetId: trigger.triggeringEntityId || '',
                                locationContext: activeLocationContext,
                                party: input.party,
                                updatedEnemies: currentLocationEnemies,
                            });

                             const partyIds = input.party.map((p: any) => p.id);
                             let combatantIds = initiationResult.combatantIds || [];
                             combatantIds = CombatInitiationService.enrichCombatantsWithSmartNPCs(
                                 combatantIds,
                                 activeLocationContext.entitiesPresent,
                                 adventureData,
                                 playerAction,
                                 trigger.triggeringEntityId || '',
                                 trigger,
                                 trigger.triggeringEntityId
                             );
                             const hasOpponents = combatantIds.some(id => !partyIds.includes(id));
                            if (!hasOpponents && activeLocationContext && activeLocationContext.entitiesPresent) {
                                const localEnemies = activeLocationContext.entitiesPresent.filter((id: string) => {
                                    if (partyIds.includes(id)) return false;
                                    const entity = adventureData.entities?.find((e: any) => e.id === id);
                                    if (!entity) return false;

                                    // Permitir enemigos y monstruos por defecto
                                    if (entity.type === 'enemy' || entity.type === 'monster') return true;

                                    // Criterio inteligente para NPCs
                                    if (entity.type === 'npc') {
                                        const targetId = interpretation?.targetId;
                                        const triggeringIds = trigger?.triggeringEntityIds || [];
                                        const triggeringId = trigger?.triggeringEntityId;

                                        const isTarget = targetId ? (
                                            targetId === entity.id ||
                                            targetId.toLowerCase().includes(entity.id.toLowerCase()) ||
                                            entity.id.toLowerCase().includes(targetId.toLowerCase()) ||
                                            (entity.name && (
                                                targetId.toLowerCase().includes(entity.name.toLowerCase()) ||
                                                entity.name.toLowerCase().includes(targetId.toLowerCase())
                                            ))
                                        ) : false;

                                        const isTrigger = (triggeringId && triggeringId === entity.id) ||
                                                         triggeringIds.includes(entity.id);

                                        const playerActionLower = playerAction?.toLowerCase() || '';
                                        const triggerMsgLower = trigger?.message?.toLowerCase() || '';
                                        const entityNameLower = entity.name?.toLowerCase() || '';
                                        const entityIdLower = entity.id?.toLowerCase() || '';

                                        const isMentionedInPlayerAction = playerActionLower && (
                                            (entityNameLower && playerActionLower.includes(entityNameLower)) ||
                                            playerActionLower.includes(entityIdLower)
                                        );

                                        const isMentionedInTriggerMsg = triggerMsgLower && (
                                            (entityNameLower && triggerMsgLower.includes(entityNameLower)) ||
                                            triggerMsgLower.includes(entityIdLower)
                                        );

                                        return !!(isTarget || isTrigger || isMentionedInPlayerAction || isMentionedInTriggerMsg);
                                    }

                                    return false;
                                });
                                combatantIds = [...partyIds, ...localEnemies];
                            }


                            console.log(`Debug Coordinator: Starting Combat with IDs: ${JSON.stringify(combatantIds)}`);
                            console.log(`Debug Coordinator: Party IDs from input: ${JSON.stringify(partyIds)}`);

                            const combatResult = await combatManagerTool({
                                ...input,
                                locationId: activeLocationId,
                                locationContext: activeLocationContext,
                                inCombat: false, // Starting combat
                                turnIndex: 0,
                                combatantIds: combatantIds, // Pass both Party and Triggering Entity
                                interpretedAction: interpretation,
                                surpriseSide: trigger.surpriseSide,
                            });

                            // Stream output from Combat Initiation
                            if (combatResult.messages) {
                                for (const m of combatResult.messages) {
                                    yield* streamText(m.content + '\n', 'dm');
                                }
                            }

                            yield createEvent('state_delta', {
                                updateType: 'merge',
                                data: {
                                    inCombat: true,
                                    combatantIds: combatResult.combatantIds,
                                    initiativeOrder: combatResult.initiativeOrder,
                                    turnIndex: combatResult.turnIndex ?? 0,
                                    party: combatResult.updatedParty,
                                    enemies: combatResult.updatedEnemies,
                                    enemiesByLocation: combatResult.updatedEnemiesByLocation || input.enemiesByLocation,
                                    diceRolls: combatResult.diceRolls,
                                    messages: combatResult.messages,
                                    phase: combatResult.phase,
                                    lastProcessedTurnWasAI: combatResult.lastProcessedTurnWasAI,
                                    lastProcessedTurnIndex: combatResult.lastProcessedTurnIndex,
                                    playerActionCompleted: combatResult.playerActionCompleted,
                                    worldState: combatResult.worldState
                                }
                            });
 
                            // Stop narrative stream?
                            // Usually yes, combat interrupting narrative is standard.
                            // But we are in a loop consuming narrativeStream.
                            // We should probably return after handling combat.
                            yield createEvent('stream_done', { turnIndex: combatResult.turnIndex ?? 0 });
                            return;
                        }
                    }
                    break;
                case 'dm_narration':
                    // Stream DM Text immediately
                    if (step.content) {
                        yield* streamText(step.content, 'dm');
                        yield createEvent('token', { role: 'dm', content: '\n\n' });
                        // We also send the structured message via state_delta for persistence/UI consistency
                        // logic_update might have handled it? No, explicit message event.

                        yield createEvent('state_delta', {
                            updateType: 'merge',
                            data: {
                                messages: [{
                                    id: `msg-dm-${Date.now()}`,
                                    sender: 'DM',
                                    content: step.content, // Raw text or HTML? 
                                    // Note: MarkdownToHtml happens in manager, so step.content is likely HTML-ready or raw.
                                    // In manager we did: content: html. 
                                    // So use step.content.
                                    timestamp: new Date().toLocaleTimeString()
                                }]
                            }
                        });
                    }
                    break;
                case 'companion_reaction':
                    // Stream Companion Text
                    if (step.message && step.message.content) {
                        // FIX: Do NOT stream text for companions to avoid "Red Box" ghosting default styling.
                        // The message will pop in instantly via state_delta below.
                        // yield* streamText(companionContent, (step.message.senderName || 'companion').toLowerCase());
                        // yield createEvent('token', { role: 'assistant', content: '\n\n' }); // Generic role for break

                        // Send structured message
                        yield createEvent('state_delta', {
                            updateType: 'merge',
                            data: {
                                messages: [step.message]
                            }
                        });
                    }
                    break;
                case 'debug':
                    yield createEvent('debug', { message: step.content || '' });
                    break;
            }
            result = await narrativeStream.next();
        }

        // Final State Sync (Optional, but good for safety if generator returns a value)
        const finalOutput = result.value;
        if (finalOutput) {
            yield createEvent('state_delta', {
                updateType: 'merge',
                data: {
                    updatedParty: finalOutput.updatedParty,
                    nextLocationId: finalOutput.nextLocationId,
                    updatedOpenDoors: finalOutput.updatedOpenDoors,
                    worldState: finalOutput.updatedWorldState
                }
            });
        }

        yield createEvent('tool_end', { tool: 'world_sim', result: 'Stream Finished' });
        yield createEvent('stream_done', {});

    } catch (error: any) {
        log.error('StreamCoordinator Failed', error);
        yield createEvent('error', {
            code: 'COORDINATOR_ERROR',
            message: error.message || 'Unknown error in coordinator',
            isFatal: true
        });
    }
}
