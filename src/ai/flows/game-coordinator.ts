
'use server';
/**
 * @fileOverview The central AI coordinator for the D&D game.
 * This flow is the main entry point for all player actions.
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
import { GameCoordinatorInputSchema, GameCoordinatorOutputSchema, type GameCoordinatorInput, type GameCoordinatorOutput } from './schemas';


export const gameCoordinatorFlow = ai.defineFlow(
  {
    name: 'gameCoordinatorFlow',
    inputSchema: GameCoordinatorInputSchema,
    outputSchema: GameCoordinatorOutputSchema,
  },
  async (input) => {
    const { playerAction, inCombat, conversationHistory, party } = input;
    let { locationId } = input;
    
    const debugLogs: string[] = [];
    const localLog = (message: string) => {
        console.log(message);
        debugLogs.push(message);
    };
    
    localLog(`GameCoordinator: Received action: "${playerAction}". InCombat: ${inCombat}. Location: ${locationId}.`);
    
    const adventureData = await getAdventureData();
    if (!adventureData) {
        throw new Error("Failed to load adventure data.");
    }
    
    const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
    
    const partySummary = input.party.map(c => ({
        id: c.id,
        name: c.name,
        race: c.race,
        class: c.class,
        sex: c.sex,
        personality: c.personality,
        controlledBy: c.controlledBy,
    }));

    if (inCombat) {
        localLog("GameCoordinator: Combat mode detected, but not implemented. Passing through.");
    }

    const currentLocationData = adventureData.locations.find((l: any) => l.id === locationId);
    
    const locationContextForInterpreter = {
        id: currentLocationData.id,
        title: currentLocationData.title,
        exits: currentLocationData.exits,
        interactables: currentLocationData.interactables,
        entitiesPresent: currentLocationData.entitiesPresent,
    };

    localLog("GameCoordinator: Calling ActionInterpreter...");
    const { interpretation, debugLogs: interpreterLogs } = await actionInterpreter({
        playerAction,
        partySummary,
        locationContext: JSON.stringify(locationContextForInterpreter),
    });
    interpreterLogs.forEach(localLog);
    
    if (interpretation.actionType === 'ooc') {
        localLog("GameCoordinator: OOC query detected. Calling OOC Assistant...");
        const oocResult = await oocAssistant({
            playerQuery: playerAction.substring(2).trim(),
            conversationHistory,
        });
        (oocResult.debugLogs || []).forEach(localLog);
        messages.push({ sender: 'DM', content: `(OOC) ${oocResult.dmReply}`});
        return { messages, debugLogs };
    }

    let skipCompanions = false;
    let newLocationId: string | null = null;
    
    // If it's an interaction with a companion, we skip the main narrative expert for now
    // and go straight to the companion reactions.
    if (interpretation.actionType === 'interact' && party.some(p => p.name === interpretation.targetId)) {
        localLog(`GameCoordinator: Direct interaction with companion '${interpretation.targetId}' detected. Skipping narrative expert.`);
    } else {
        let finalLocationData = currentLocationData;

        // Handle movement BEFORE calling the narrative expert
        if (interpretation.actionType === 'move' && interpretation.targetId) {
            localLog(`GameCoordinator: Movement interpreted to '${interpretation.targetId}'. Updating location.`);
            newLocationId = interpretation.targetId;
            locationId = newLocationId; // Update locationId for the current turn's context
            finalLocationData = adventureData.locations.find((l: any) => l.id === locationId);
            if (!finalLocationData) {
                localLog(`GameCoordinator: CRITICAL - Failed to find location data for new locationId '${locationId}'.`);
                throw new Error(`Could not find data for location: ${locationId}. The adventure file might be missing this entry.`);
            }
            skipCompanions = true; // Companions will react on the next turn, in the new location.
        }
        
        localLog("GameCoordinator: START Narrative Generation.");
        
        const narrativeInput = {
            playerAction: input.playerAction,
            partySummary: partySummary,
            locationId: locationId,
            locationContext: JSON.stringify(finalLocationData),
            conversationHistory: input.conversationHistory,
            interpretedAction: JSON.stringify(interpretation),
        };
        
        localLog(`GameCoordinator: Calling NarrativeExpert for location '${locationId}'...`);
        const narrativeResult = await narrativeExpert(narrativeInput);
        (narrativeResult.debugLogs || []).forEach(localLog);

        if (narrativeResult.dmNarration) {
            localLog("GameCoordinator: Converting DM narration to HTML...");
            const { html } = await markdownToHtml({ markdown: narrativeResult.dmNarration });
            localLog("GameCoordinator: HTML conversion complete.");
            messages.push({
                sender: 'DM',
                content: html,
                originalContent: narrativeResult.dmNarration,
            });
        }

        localLog("GameCoordinator: END Narrative Generation.");
    }
    
    if (!skipCompanions) {
        let accumulatedHistoryForCompanions = messages.map(m => `DM: ${m.originalContent || m.content}`).join('\n');
        
        localLog("GameCoordinator: START Companion Reactions.");
        for (const character of party) {
            if (character.controlledBy === 'AI') {
                localLog(`GameCoordinator: Processing reaction for AI companion: ${character.name}.`);
                
                // If the interaction was directed at this character, make it explicit in the context.
                const isTargeted = interpretation.actionType === 'interact' && interpretation.targetId === character.name;
                const companionContext = `Player action: "${playerAction}"\n${isTargeted ? `(The player is talking directly to ${character.name})` : ''}\n${accumulatedHistoryForCompanions}`;

                const companionResult = await companionExpertTool({
                    characterSummary: {
                        id: character.id,
                        name: character.name,
                        race: character.race,
                        class: character.class,
                        sex: character.sex,
                        personality: character.personality,
                        controlledBy: "AI",
                    },
                    context: companionContext,
                    inCombat: inCombat,
                    partySummary: partySummary,
                });
                
                if (companionResult.action) {
                    messages.push({
                        sender: 'Character',
                        senderName: character.name,
                        characterColor: character.color,
                        content: companionResult.action,
                    });
                    accumulatedHistoryForCompanions += `\n${character.name}: ${companionResult.action}`;
                } else {
                    localLog(`GameCoordinator: ${character.name} had no reaction.`);
                }
            }
        }
        localLog("GameCoordinator: END Companion Reactions.");
    }

    // This part for updating stats from narrativeExpert is tricky. We'll leave it for now.
    let updatedParty = input.party;
    
    localLog(`GameCoordinator: Turn finished successfully. Final location: ${locationId}. In Combat: ${inCombat}`);
    return {
        messages,
        debugLogs,
        updatedParty,
        nextLocationId: newLocationId
    };
  }
);


export async function gameCoordinator(input: GameCoordinatorInput): Promise<GameCoordinatorOutput> {
    return gameCoordinatorFlow(input);
}
