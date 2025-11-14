
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
import { narrativeExpert } from './narrative-expert';
import { getAdventureData } from '@/app/game-state-actions';
import { companionExpertTool } from '../tools/companion-expert';
import { actionInterpreter } from './action-interpreter';
import { GameStateSchema, GameCoordinatorOutputSchema, type GameState, type GameCoordinatorOutput } from '@/ai/flows/schemas';
import { combatManagerTool } from '../tools/combat-manager';
import { combatInitiationExpertTool } from '../tools/combat-initiation-expert';
import { log } from '@/lib/logger';

const formatMessageForTranscript = (msg: Partial<GameMessage>): string => {
    if (msg.sender === 'Player') return `${msg.senderName || 'Player'}: ${msg.content}`;
    if (msg.sender === 'DM') return `Dungeon Master: ${msg.originalContent || msg.content}`;
    if (msg.sender === 'Character' && msg.senderName) return `${msg.senderName}: ${msg.originalContent || msg.content}`;
    return '';
};

export const gameCoordinatorFlow = ai.defineFlow(
  {
    name: 'gameCoordinatorFlow',
    inputSchema: GameStateSchema,
    outputSchema: GameCoordinatorOutputSchema,
  },
  async (input) => {
    const { playerAction, inCombat, conversationHistory, party, turnIndex } = input;
    let { locationId } = input;
    
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
    
    // Issue #27: Verificar muerte del jugador y game over
    const player = party.find(p => p.controlledBy === 'Player') || party[0];
    if (player && player.hp && (player.hp.current <= 0 || player.isDead === true)) {
        // Verificar si todos están muertos o inconscientes (incluye isDead)
        const allDead = party.every(p => p.hp && (p.hp.current <= 0 || p.isDead === true));
        if (allDead) {
            log.gameCoordinator('Game over: All party members dead/unconscious', { partySize: party.length });
            return {
                messages: [{
                    sender: 'DM',
                    content: 'Todos los miembros del grupo han caído en combate. Vuestro viaje termina aquí, pero vuestra historia será recordada. La aventura ha terminado.',
                }],
                debugLogs: [...debugLogs, 'Game over: All party members are dead/unconscious'],
                updatedParty: party,
                inCombat: false,
                turnIndex: 0,
            };
        }
        
        // Mensaje específico según estado del jugador
        const statusMessage = player.isDead === true
            ? `${player.name} ha muerto. La aventura no puede continuar sin ti.`
            : `${player.name} está inconsciente y no puede actuar. Los compañeros deben estabilizarte o curarte antes de que puedas continuar.`;
        
        log.gameCoordinator('Player is dead/unconscious', { 
            player: player.name, 
            hp: player.hp.current,
            isDead: player.isDead === true,
        });
        return {
            messages: [{
                sender: 'DM',
                content: statusMessage,
            }],
            debugLogs: [...debugLogs, `Player ${player.name} is ${player.isDead ? 'dead' : 'unconscious'}`],
            updatedParty: party,
            inCombat: inCombat,
            turnIndex: turnIndex,
        };
    }
    
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
    
    log.gameCoordinator('Interpreting player action', { action: playerAction });
    localLog("GameCoordinator: Interpreting player action...");
    const { interpretation, debugLogs: interpreterLogs } = await actionInterpreter({
        playerAction,
        locationContext: JSON.stringify(currentLocationData),
        party: party,
        updatedEnemies: input.enemies, // Issue #27: Pass enemies to filter dead ones
    });
    
    if (inCombat) {
        log.gameCoordinator('Processing combat turn', { turnIndex, actionType: interpretation.actionType });
        const combatResult = await combatManagerTool({
            ...input,
            interpretedAction: interpretation,
            locationContext: currentLocationData,
        });
        return { ...combatResult, debugLogs: [...debugLogs, ...(combatResult.debugLogs || [])] };
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
        if (currentLocationData?.entitiesPresent && input.enemies) {
            const targetEnemy = input.enemies.find(e => 
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
        return { messages: [{ sender: 'DM', content: `(OOC) ${oocResult.dmReply}`}], debugLogs, inCombat: false };
    }
    
    if (interpretation.actionType === 'attack') {
        log.gameCoordinator('Initiating combat', { targetId: interpretation.targetId });
        localLog("GameCoordinator: Action is 'attack'. Initiating combat...");
        const initiationResult = await combatInitiationExpertTool({ 
            playerAction, 
            locationId, 
            targetId: interpretation.targetId || '', 
            locationContext: currentLocationData, 
            party,
            updatedEnemies: input.enemies, // Issue #27: Pass enemies to filter dead ones
        });
        
        log.gameCoordinator('Combat initiated', { 
          combatantIds: initiationResult.combatantIds?.length || 0,
        });
        
        // FIXED: Pass all required properties to the combatManagerTool for initiation.
        const combatResult = await combatManagerTool({
            ...input,
            inCombat: false, // Explicitly set inCombat to false for initiation.
            turnIndex: 0,
            combatantIds: initiationResult.combatantIds,
            interpretedAction: interpretation, // This was missing.
            locationContext: currentLocationData, // This was missing.
        });
        return { ...combatResult, debugLogs: [...debugLogs, ...(combatResult.debugLogs || [])] };
    }

    let messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];

    // Check if this is the start of an adventure (empty conversation history and action is about starting)
    const isAdventureStart = conversationHistory.length === 0 && 
        (playerAction.toLowerCase().includes('comenzar') || 
         playerAction.toLowerCase().includes('empezar') || 
         playerAction.toLowerCase().includes('iniciar'));

    let newLocationId: string | null = null;
    let finalLocationData = currentLocationData;
    if (interpretation.actionType === 'move' && interpretation.targetId) {
        newLocationId = interpretation.targetId;
        locationId = newLocationId;
        log.gameCoordinator('Player moving to new location', { 
          from: input.locationId,
          to: newLocationId,
        });
        finalLocationData = adventureData.locations.find((l: any) => l.id === locationId);
        if (!finalLocationData) {
          log.error('Location not found', { 
            module: 'GameCoordinator',
            locationId,
          });
          throw new Error(`Could not find data for location: ${locationId}.`);
        }
    }
    
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
            if (character.controlledBy === 'AI' && character.hp.current > 0 && character.isDead !== true) {
                const isTargeted = interpretation.actionType === 'interact' && interpretation.targetId === character.name;
                const companionContext = `The player just proposed/said: "${playerAction}"${isTargeted ? `\n\n(You are being directly addressed.)` : ''}`;
                
                const companionResult = await companionExpertTool({
                    party: party,
                    characterName: character.name,
                    context: companionContext,
                    inCombat: inCombat,
                    reactionTiming: 'before_dm',
                });
                
                if (companionResult.action && companionResult.action.trim() !== '') {
                    log.gameCoordinator('Companion reacted (before DM)', { 
                      character: character.name,
                      action: companionResult.action.substring(0, 50) + '...',
                    });
                    localLog(`${character.name} reacted before DM: "${companionResult.action}"`);
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
    
    // Generate DM narration AFTER companion reactions to player's proposal
    log.gameCoordinator('Generating DM narration', { 
      actionType: interpretation.actionType,
      isAdventureStart,
    });
    localLog("GameCoordinator: Generating DM narration...");
    const historyForNarrator = [...conversationHistory, ...messages]; 
    const narrativeHistoryTranscript = historyForNarrator.map(formatMessageForTranscript).join('\n');

    const narrativeInput = {
        playerAction,
        locationId,
        locationContext: JSON.stringify(finalLocationData),
        conversationHistory: narrativeHistoryTranscript,
        interpretedAction: JSON.stringify(interpretation),
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

    // Generate companion reactions AFTER DM narration (and skip on adventure start)
    if (!isAdventureStart) {
        log.gameCoordinator('Generating companion reactions (after DM)', { partySize: party.length });
        localLog("GameCoordinator: Generating companion reactions after DM narration...");
        for (const character of party) {
            // Issue #26/#27: Skip dead/unconscious companions - they cannot react
            if (character.controlledBy === 'AI' && character.hp.current > 0 && character.isDead !== true) {
                const isTargeted = interpretation.actionType === 'interact' && interpretation.targetId === character.name;
                // Include DM narration in context so companions react to the CURRENT SITUATION, not just the player's original action
                const dmNarrationContext = narrativeResult.dmNarration 
                    ? `\n\nDM narration (what just happened):\n"${narrativeResult.dmNarration}"` 
                    : '';
                const companionContext = `The player's action was: "${playerAction}"${dmNarrationContext}${isTargeted ? `\n\n(You are being directly addressed.)` : ''}`;
                
                const companionResult = await companionExpertTool({
                    party: party,
                    characterName: character.name,
                    context: companionContext,
                    inCombat: inCombat,
                    reactionTiming: 'after_dm',
                });
                
                if (companionResult.action && companionResult.action.trim() !== '') {
                    log.gameCoordinator('Companion reacted (after DM)', { 
                      character: character.name,
                      action: companionResult.action.substring(0, 50) + '...',
                    });
                    localLog(`${character.name} reacted after DM: "${companionResult.action}"`);
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
    
    const finalInCombat = false;
    log.gameCoordinator('Turn finished', {
      messagesCount: messages.length,
      locationId,
      inCombat: finalInCombat,
    });
    localLog(`GameCoordinator: Turn finished. Final location: ${locationId}. InCombat: ${finalInCombat}. Returning ${messages.length} messages.`);
    
    return {
        messages,
        debugLogs,
        updatedParty: party,
        nextLocationId: newLocationId,
        inCombat: finalInCombat,
        turnIndex: 0,
    };
  }
);

export async function gameCoordinator(input: GameState): Promise<GameCoordinatorOutput> {
    return gameCoordinatorFlow(input);
}
