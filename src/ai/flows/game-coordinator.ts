
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
import { diceRollerTool } from '../tools/dice-roller';
import { adventureLookupTool } from '../tools/adventure-lookup';


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
        localLog("GameCoordinator: Combat mode detected. Combat logic to be implemented.");
        // Future: Call combat manager tool here
        return { messages, debugLogs };
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
        return { messages, debugLogs, inCombat: false };
    }
    
    // HANDLE ATTACK AND COMBAT INITIATION
    if (interpretation.actionType === 'attack') {
        localLog(`GameCoordinator: Attack action interpreted against target '${interpretation.targetId}'. Initiating combat sequence.`);
        
        const enemiesInLocation = (currentLocationData.entitiesPresent || [])
            .map((entityId: string) => adventureData.entities.find((e:any) => e.id === entityId))
            .filter((e: any) => e); // Filter out any nulls

        if (enemiesInLocation.length === 0) {
            messages.push({ sender: 'DM', content: "Atacas al aire, ya que no hay enemigos presentes." });
            return { messages, debugLogs, inCombat: false };
        }
        
        localLog(`GameCoordinator: Found ${enemiesInLocation.length} potential enemies in location.`);

        messages.push({ sender: 'System', content: `¡Comienza el Combate!`});

        const combatants: { id: string, name: string, type: 'player' | 'npc', dex: number }[] = [];
        
        party.forEach(p => {
            combatants.push({ id: p.id, name: p.name, type: 'player', dex: p.abilityScores.destreza });
        });
        
        enemiesInLocation.forEach((e: any, index: number) => {
            // HACK: We need a way to get monster stats, especially dexterity. We'll have to use a tool or hardcode for now.
            // For now, we'll assign a random dexterity for initiative purposes.
             combatants.push({ id: `${e.id}-${index}`, name: e.name, type: 'npc', dex: 10 }); // Placeholder DEX
             localLog(`GameCoordinator: Added enemy '${e.name}' to combatants list.`);
        });
        
        const initiativeRolls: { id: string, name: string, total: number, type: 'player' | 'npc' }[] = [];
        
        for (const combatant of combatants) {
            const dexModifier = Math.floor((combatant.dex - 10) / 2);
            const roll = await diceRollerTool({ roller: combatant.name, rollNotation: `1d20+${dexModifier}`, description: 'Iniciativa' });
            initiativeRolls.push({ id: combatant.id, name: combatant.name, total: roll.totalResult, type: combatant.type });
        }
        
        initiativeRolls.sort((a, b) => b.total - a.total);
        const initiativeOrder: Combatant[] = initiativeRolls.map(r => ({ id: r.id, characterName: r.name, total: r.total, type: r.type }));
        
        localLog(`GameCoordinator: Initiative order determined: ${JSON.stringify(initiativeOrder.map(c => c.characterName))}`);
        
        // Let's also include the narrative of the first attack
        const narrativeResult = await narrativeExpert({
             playerAction: input.playerAction,
             partySummary: partySummary,
             locationId: locationId,
             locationContext: JSON.stringify(currentLocationData),
             conversationHistory: input.conversationHistory,
             interpretedAction: JSON.stringify(interpretation),
        });
        (narrativeResult.debugLogs || []).forEach(localLog);
        if (narrativeResult.dmNarration) {
            const { html } = await markdownToHtml({ markdown: narrativeResult.dmNarration });
            messages.push({ sender: 'DM', content: html, originalContent: narrativeResult.dmNarration });
        }

        return {
            messages,
            debugLogs,
            inCombat: true,
            initiativeOrder: initiativeOrder,
            enemies: enemiesInLocation.map((e: any, index: number) => ({...e, id: `${e.id}-${index}`})), // Give unique IDs
        };
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
            partySummary: [], 
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
        partySummary: partySummary,
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

    let updatedParty = input.party;
    
    localLog(`GameCoordinator: Turn finished successfully. Final location: ${locationId}.`);
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

    