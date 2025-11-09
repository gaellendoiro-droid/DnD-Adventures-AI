
'use server';
/**
 * @fileOverview The central AI coordinator for the D&D game.
 * This flow is the main entry point for all player actions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { oocAssistant } from './ooc-assistant';
import type { GameMessage, Combatant } from '@/lib/types';
import { markdownToHtml } from './markdown-to-html';
import { narrativeExpert } from './narrative-expert';
import { getAdventureData } from '@/app/game-state-actions';
import { companionExpertTool } from '../tools/companion-expert';
import { actionInterpreter } from './action-interpreter';
import { GameCoordinatorInputSchema, GameCoordinatorOutputSchema, type GameCoordinatorInput, type GameCoordinatorOutput } from './schemas';
import { combatManagerTool } from '../tools/combat-manager';
import { updatePartyDataForTools } from '../tools/character-lookup';


export const gameCoordinatorFlow = ai.defineFlow(
  {
    name: 'gameCoordinatorFlow',
    inputSchema: GameCoordinatorInputSchema,
    outputSchema: GameCoordinatorOutputSchema,
  },
  async (input) => {
    const { playerAction, inCombat, conversationHistory, party } = input;
    let { locationId } = input;
    
    // HACK: Update the in-memory data for the character lookup tool.
    // In a real app, this would be a database or a proper state management system.
    updatePartyDataForTools(party);
    
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
        localLog("GameCoordinator: Combat turn received. Delegating to Combat Manager...");
        const combatResult = await combatManagerTool(input);
        const logSummary = {
            messages: combatResult.messages?.length,
            diceRolls: combatResult.diceRolls?.length,
            updatedParty: combatResult.updatedParty?.length,
            inCombat: combatResult.inCombat,
            nextLocationId: combatResult.nextLocationId,
        }
        localLog(`GameCoordinator: Received result from combatManager: ${JSON.stringify(logSummary, null, 2)}`);
        return { ...combatResult, debugLogs: [...debugLogs, ...(combatResult.debugLogs || [])] };
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
        return { messages, debugLogs, inCombat: false };
    }
    
    if (interpretation.actionType === 'attack') {
        localLog(`GameCoordinator: Attack action interpreted. Delegating to Combat Manager to initiate combat.`);
        
        // Pass the full context to the combat manager, which will handle initiation.
        const combatResult = await combatManagerTool({
            ...input,
            interpretedAction: interpretation,
            locationContext: currentLocationData,
        });

        const logSummary = {
            messages: combatResult.messages?.length,
            diceRolls: combatResult.diceRolls?.length,
            updatedParty: combatResult.updatedParty?.length,
            inCombat: combatResult.inCombat,
            nextLocationId: combatResult.nextLocationId,
        }
        localLog(`GameCoordinator: Received result from combatManager: ${JSON.stringify(logSummary, null, 2)}`);
        return { ...combatResult, debugLogs: [...debugLogs, ...(combatResult.debugLogs || [])] };
    }

    let skipCompanions = false;
    let newLocationId: string | null = null;
    let finalLocationData = currentLocationData;
    let narrativeAction = interpretation;

    // Smart logic for companion interaction vs. information request
    const isInfoRequestToCompanion = interpretation.actionType === 'interact' && partySummary.some(p => p.name === interpretation.targetId);

    if (isInfoRequestToCompanion) {
        localLog(`GameCoordinator: Detected info request to companion '${interpretation.targetId}'. Re-interpreting for environment interaction.`);
        const tempInterpreterResult = await actionInterpreter({
            playerAction: playerAction,
            locationContext: JSON.stringify(locationContextForInterpreter),
        });
        interpreterLogs.forEach(localLog);
        
        if (tempInterpreterResult.interpretation.actionType !== 'narrate' && tempInterpreterResult.interpretation.actionType !== 'interact') {
             narrativeAction = tempInterpreterResult.interpretation;
             localLog(`GameCoordinator: Overriding action. New interpretation: ${JSON.stringify(narrativeAction)}`);
        }
    }

    if (narrativeAction.actionType === 'move' && narrativeAction.targetId) {
        localLog(`GameCoordinator: Movement interpreted to '${narrativeAction.targetId}'. Updating location.`);
        newLocationId = narrativeAction.targetId;
        locationId = newLocationId;
        finalLocationData = adventureData.locations.find((l: any) => l.id === locationId);
        if (!finalLocationData) {
            localLog(`GameCoordinator: CRITICAL - Failed to find location data for new locationId '${locationId}'.`);
            throw new Error(`Could not find data for location: ${locationId}. The adventure file might be missing this entry.`);
        }
    }
    
    localLog("GameCoordinator: START Narrative Generation.");
    
    const narrativeInput = {
        playerAction: input.playerAction,
        locationId: locationId,
        locationContext: JSON.stringify(finalLocationData),
        conversationHistory: input.conversationHistory,
        interpretedAction: JSON.stringify(narrativeAction),
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
    
    if (!skipCompanions) {
        let accumulatedHistoryForCompanions = messages.map(m => `DM: ${m.originalContent || m.content}`).join('\n');
        
        localLog("GameCoordinator: START Companion Reactions.");
        for (const character of party) {
            if (character.controlledBy === 'AI') {
                localLog(`GameCoordinator: Processing reaction for AI companion: ${character.name}.`);
                
                const isTargeted = interpretation.actionType === 'interact' && interpretation.targetId === character.name;
                const companionContext = `Player action: "${playerAction}"\n${isTargeted ? `(The player is talking directly to ${character.name})` : ''}\n${accumulatedHistoryForCompanions}`;

                const companionResult = await companionExpertTool({
                    characterName: character.name,
                    context: companionContext,
                    inCombat: inCombat,
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

    let updatedParty = input.party;
    
    localLog(`GameCoordinator: Turn finished. Final location: ${locationId}. InCombat: false.`);
    return {
        messages,
        debugLogs,
        updatedParty,
        nextLocationId: newLocationId,
        inCombat: false, // Ensure this is false for non-combat turns
    };
  }
);


export async function gameCoordinator(input: GameCoordinatorInput): Promise<GameCoordinatorOutput> {
    return gameCoordinatorFlow(input);
}
