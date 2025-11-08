
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

    let newLocationId: string | null = null;
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
    }
    
    localLog("GameCoordinator: START Narrative Generation.");
    
    const partySummary = input.party.map(c => ({
        id: c.id,
        name: c.name,
        race: c.race,
        class: c.class,
        sex: c.sex,
        personality: c.personality,
        controlledBy: c.controlledBy,
    }));
    
    const narrativeInput = {
        playerAction: input.playerAction,
        partySummary: partySummary,
        locationId: locationId,
        locationContext: JSON.stringify(finalLocationData),
        conversationHistory: input.conversationHistory,
        log: localLog,
        interpretedAction: JSON.stringify(interpretation),
    };
    
    localLog(`GameCoordinator: Calling NarrativeExpert for location '${locationId}'...`);
    const narrativeResult = await narrativeExpert(narrativeInput);
    (narrativeResult.debugLogs || []).forEach(localLog);

    let accumulatedHistoryForCompanions = "";

    if (narrativeResult.dmNarration) {
        localLog("GameCoordinator: Converting DM narration to HTML...");
        const { html } = await markdownToHtml({ markdown: narrativeResult.dmNarration });
        localLog("GameCoordinator: HTML conversion complete.");
        messages.push({
            sender: 'DM',
            content: html,
            originalContent: narrativeResult.dmNarration,
        });
        accumulatedHistoryForCompanions = narrativeResult.dmNarration;
    }

    localLog("GameCoordinator: END Narrative Generation.");
    
    localLog("GameCoordinator: START Companion Reactions.");
    const aiCompanions = party.filter(p => p.controlledBy === 'AI');
    localLog(`GameCoordinator: Checking for reactions from ${aiCompanions.length} AI companions.`);
    
    for (const companion of aiCompanions) {
        const companionSummary = partySummary.find(p => p.id === companion.id)!;
        localLog(`GameCoordinator: Calling CompanionExpert for ${companion.name}.`);
        
        const companionContext = `The player just did this: "${playerAction}"\n\nThe Dungeon Master described the result as: "${accumulatedHistoryForCompanions}"`;
        
        const companionResult = await companionExpertTool({
            characterSummary: companionSummary,
            context: companionContext,
            inCombat: false,
            partySummary: partySummary,
        });

        if (companionResult.action) {
            localLog(`GameCoordinator: ${companion.name} reacts: "${companionResult.action}"`);
            messages.push({
                sender: 'Character',
                senderName: companion.name,
                characterColor: companion.color,
                content: companionResult.action,
            });
            accumulatedHistoryForCompanions += `\n${companion.name}: ${companionResult.action}`;
        }
    }
    localLog("GameCoordinator: END Companion Reactions.");


    let updatedParty = input.party;
    if (narrativeResult.updatedCharacterStats) {
        const player = input.party.find(c => c.controlledBy === 'Player');
        if(player) {
            try {
                const updates = JSON.parse(narrativeResult.updatedCharacterStats);
                updatedParty = input.party.map(c => c.id === player.id ? { ...c, ...updates } : c);
            } catch (e) {
                console.warn("Invalid JSON in updatedCharacterStats, ignoring.", narrativeResult.updatedCharacterStats);
                localLog("GameCoordinator: WARNING - NarrativeExpert returned invalid JSON for updatedCharacterStats.");
            }
        }
    }
    
    localLog(`GameCoordinator: Turn finished successfully. Final location: ${locationId}`);
    return {
        messages,
        debugLogs,
        updatedParty,
        nextLocationId: newLocationId,
    };
  }
);


export async function gameCoordinator(input: GameCoordinatorInput): Promise<GameCoordinatorOutput> {
    return gameCoordinatorFlow(input);
}
