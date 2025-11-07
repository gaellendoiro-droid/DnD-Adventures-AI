
'use server';
/**
 * @fileOverview The central AI coordinator for the D&D game.
 * This flow is the main entry point for all player actions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { oocAssistant } from './ooc-assistant';
import { combatManagerTool } from '../tools/combat-manager';
import type { GameMessage, DiceRoll, InitiativeRoll } from '@/lib/types';
import { markdownToHtml } from './markdown-to-html';
import { narrativeExpert } from './narrative-expert';
import { getAdventureData } from '@/app/game-state-actions';
import { CharacterSummarySchema } from '@/lib/schemas';
import { companionExpertTool } from '../tools/companion-expert';
import { actionInterpreter } from './action-interpreter';

// Schemas for the action interpreter, moved here to avoid 'use server' export issues.
export const ActionInterpreterInputSchema = z.object({
  playerAction: z.string().describe('The action taken by the player.'),
  locationContext: z.string().describe('A JSON string with the full data of the current location, including its exits, interactable objects and entities present.'),
});
export type ActionInterpreterInput = z.infer<typeof ActionInterpreterInputSchema>;

export const ActionInterpreterOutputSchema = z.object({
  actionType: z.enum(['move', 'interact', 'attack', 'narrate', 'ooc']).describe("The interpreted type of the player's action."),
  targetId: z.string().optional().nullable().describe("The ID of the target for the action. For 'move', it's the destination ID. For 'attack', the entity ID. For 'interact', it's the specific interaction action name (e.g., 'Leer Misión de la Colina del Resentimiento')."),
});
export type ActionInterpreterOutput = z.infer<typeof ActionInterpreterOutputSchema>;


// Schemas for the main coordinator flow
const GameCoordinatorInputSchema = z.object({
  playerAction: z.string(),
  party: z.array(z.any()), // Using any to avoid circular dependencies with Character type
  locationId: z.string(),
  inCombat: z.boolean(),
  initiativeOrder: z.array(z.any()),
  enemies: z.array(z.any()),
  turnIndex: z.number(),
  conversationHistory: z.string(),
});

const GameCoordinatorOutputSchema = z.object({
  messages: z.array(z.any()).optional(),
  diceRolls: z.array(z.any()).optional(),
  updatedParty: z.array(z.any()).optional(),
  updatedEnemies: z.array(z.any()).optional(),
  nextLocationId: z.string().optional().nullable(),
  startCombat: z.boolean().optional(),
  endCombat: z.boolean().optional(),
  nextTurnIndex: z.number().optional(),
  error: z.string().optional(),
  debugLogs: z.array(z.string()).optional(),
  // New fields for combat start
  initiativeOrder: z.array(z.any()).optional(),
  enemies: z.array(z.any()).optional(),
});

export type GameCoordinatorInput = z.infer<typeof GameCoordinatorInputSchema>;
export type GameCoordinatorOutput = z.infer<typeof GameCoordinatorOutputSchema>;


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
        debugLogs.push(message);
    };
    
    localLog(`GameCoordinator: Received action: "${playerAction}". InCombat: ${inCombat}. Location: ${locationId}.`);
    
    const adventureData = await getAdventureData();
    if (!adventureData) {
        throw new Error("Failed to load adventure data.");
    }
    
    const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
    
    // 1. Handle Combat mode
    if (inCombat) {
        const locationData = adventureData.locations.find((l: any) => l.id === locationId);
        localLog("GameCoordinator: Combat mode detected. Calling Combat Manager Tool...");
        const combatResult = await combatManagerTool({
            ...input,
            locationDescription: locationData?.description || "una zona de combate",
            conversationHistory,
        });
        (combatResult.debugLogs || []).forEach(localLog);
        return { ...combatResult, debugLogs };
    }

    // 2. Interpret Player Action
    const currentLocationData = adventureData.locations.find((l: any) => l.id === locationId);
    localLog("GameCoordinator: Calling ActionInterpreter...");
    const interpretation = await actionInterpreter({
        playerAction,
        locationContext: JSON.stringify(currentLocationData),
    });
    
    let newLocationId: string | null = null;
    let finalLocationData = currentLocationData;
    
    // 3. Process action based on interpretation
    switch(interpretation.actionType) {
        case 'ooc':
            localLog("GameCoordinator: OOC query detected. Calling OOC Assistant...");
            const oocResult = await oocAssistant({
                playerQuery: playerAction.substring(2).trim(),
                conversationHistory,
            });
            (oocResult.debugLogs || []).forEach(localLog);
            messages.push({ sender: 'DM', content: `(OOC) ${oocResult.dmReply}`});
            return { messages, debugLogs };

        case 'move':
            if (interpretation.targetId) {
                localLog(`GameCoordinator: Movement interpreted to '${interpretation.targetId}'.`);
                newLocationId = interpretation.targetId;
                locationId = newLocationId; // Update locationId for the current turn's context
                finalLocationData = adventureData.locations.find((l: any) => l.id === locationId);
            }
            localLog(`GameCoordinator: Action is 'move', proceeding to Narrative Expert.`);
            // Fall through to narrate the arrival
        
        case 'interact':
        case 'narrate':
        case 'attack': // Also falls through for narration of failed attacks or tense moments before combat
        default:
            localLog(`GameCoordinator: Action is '${interpretation.actionType}', proceeding to Narrative Expert.`);
            
            // 4. Generate Narrative
            localLog("GameCoordinator: Preparing to call Narrative Expert...");
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
                interpretedAction: interpretation,
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

            // 5. Generate Companion Reactions
            const aiCompanions = party.filter(p => p.controlledBy === 'AI');
            localLog(`GameCoordinator: Checking for reactions from ${aiCompanions.length} AI companions.`);
            
            let accumulatedHistory = narrativeResult.dmNarration;

            for (const companion of aiCompanions) {
                const companionSummary = partySummary.find(p => p.id === companion.id)!;
                localLog(`GameCoordinator: Calling CompanionExpert for ${companion.name}.`);
                
                const companionContext = `The player just did this: "${playerAction}"\n\nThe Dungeon Master described the result as: "${accumulatedHistory}"`;
                
                const companionResult = await companionExpertTool({
                    characterSummary: companionSummary,
                    context: companionContext,
                    inCombat: false,
                    enemies: [], 
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
                    accumulatedHistory += `\n${companion.name}: ${companionResult.action}`;
                }
            }

            // 6. Finalize Turn
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
            
            localLog(`GameCoordinator: Turn finished successfully. Current location: ${locationId}`);
            return {
              messages,
              debugLogs,
              updatedParty,
              nextLocationId: newLocationId,
            };
    }
  }
);


export async function gameCoordinator(input: GameCoordinatorInput): Promise<GameCoordinatorOutput> {
    return gameCoordinatorFlow(input);
}
