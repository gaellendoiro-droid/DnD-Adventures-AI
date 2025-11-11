
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
        console.log(message);
        debugLogs.push(message);
    };
    
    localLog(`GameCoordinator: Received action: "${playerAction}". InCombat: ${inCombat}. TurnIndex: ${turnIndex}.`);
    
    const adventureData = await getAdventureData();
    if (!adventureData) throw new Error("Failed to load adventure data.");
    
    if (inCombat) {
        const combatResult = await combatManagerTool(input);
        return { ...combatResult, debugLogs: [...debugLogs, ...(combatResult.debugLogs || [])] };
    }

    const currentLocationData = adventureData.locations.find((l: any) => l.id === locationId);
    
    localLog("GameCoordinator: Interpreting player action...");
    const { interpretation, debugLogs: interpreterLogs } = await actionInterpreter({
        playerAction,
        locationContext: JSON.stringify(currentLocationData),
        party: party,
    });
    interpreterLogs.forEach(localLog);
    
    const historyTranscript = conversationHistory.map(formatMessageForTranscript).join('\n');

    if (interpretation.actionType === 'ooc') {
        const oocResult = await oocAssistant({ playerQuery: playerAction.substring(2).trim(), conversationHistory: historyTranscript });
        return { messages: [{ sender: 'DM', content: `(OOC) ${oocResult.dmReply}`}], debugLogs, inCombat: false };
    }
    
    if (interpretation.actionType === 'attack') {
        localLog("GameCoordinator: Action is 'attack'. Initiating combat...");
        const initiationResult = await combatInitiationExpertTool({ playerAction, locationId, targetId: interpretation.targetId || '', locationContext: currentLocationData, party });
        
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

    localLog("GameCoordinator: Generating companion reactions...");
    for (const character of party) {
        if (character.controlledBy === 'AI') {
            const isTargeted = interpretation.actionType === 'interact' && interpretation.targetId === character.name;
            const companionContext = `The player's action is: "${playerAction}"\n${isTargeted ? `(You are being directly addressed.)` : ''}`;
            
            const companionResult = await companionExpertTool({
                party: party,
                characterName: character.name,
                context: companionContext,
                inCombat: inCombat,
            });
            
            if (companionResult.action) {
                localLog(`${character.name} reacted: "${companionResult.action}"`);
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

    let newLocationId: string | null = null;
    let finalLocationData = currentLocationData;
    if (interpretation.actionType === 'move' && interpretation.targetId) {
        newLocationId = interpretation.targetId;
        locationId = newLocationId;
        finalLocationData = adventureData.locations.find((l: any) => l.id === locationId);
        if (!finalLocationData) throw new Error(`Could not find data for location: ${locationId}.`);
    }
    
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
    
    const finalInCombat = false;
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
