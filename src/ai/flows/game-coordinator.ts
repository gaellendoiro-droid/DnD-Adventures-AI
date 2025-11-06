
'use server';
/**
 * @fileOverview The central AI coordinator for the D&D game.
 * This flow is the main entry point for all player actions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { oocAssistant } from './ooc-assistant';
import { combatManagerTool } from '../tools/combat-manager';
import type { GameMessage } from '@/lib/types';
import { markdownToHtml } from './markdown-to-html';
import { narrativeExpert } from './narrative-expert';
import { lookupAdventureEntityInDb } from '@/app/game-state-actions';

// Schemas for the main coordinator flow
const GameCoordinatorInputSchema = z.object({
  playerAction: z.string(),
  party: z.array(z.any()), // Using any to avoid circular dependencies with Character type
  locationId: z.string(),
  inCombat: z.boolean(),
  initiativeOrder: z.array(z.any()),
  enemies: z.array(z.any()),
  turnIndex: z.number(),
  gameState: z.string(),
  conversationHistory: z.string(),
});

const GameCoordinatorOutputSchema = z.object({
  messages: z.array(z.any()).optional(),
  diceRolls: z.array(z.any()).optional(),
  updatedParty: z.array(z.any()).optional(),
  updatedEnemies: z.array(z.any()).optional(),
  nextLocationId: z.string().optional().nullable(),
  startCombat: z.boolean().optional(),
  combatStartNarration: z.string().optional(),
  identifiedEnemies: z.array(z.string()).optional(),
  endCombat: z.boolean().optional(),
  nextTurnIndex: z.number().optional(),
  error: z.string().optional(),
});

export type GameCoordinatorInput = z.infer<typeof GameCoordinatorInputSchema>;
export type GameCoordinatorOutput = z.infer<typeof GameCoordinatorOutputSchema>;

const gameCoordinatorFlow = ai.defineFlow(
  {
    name: 'gameCoordinatorFlow',
    inputSchema: GameCoordinatorInputSchema,
    outputSchema: GameCoordinatorOutputSchema,
    tools: [combatManagerTool]
  },
  async (input) => {
    const { playerAction, inCombat, conversationHistory, gameState, locationId } = input;
    
    // 1. Handle Out-of-Character (OOC) queries first
    if (playerAction.startsWith('//')) {
      const oocResult = await oocAssistant({
        playerQuery: playerAction.substring(2).trim(),
        conversationHistory,
        gameState,
      });
      const { html } = await markdownToHtml({ markdown: `(OOC) ${oocResult.dmReply}` });
      return {
        messages: [{
            sender: 'DM',
            content: html,
            originalContent: `(OOC) ${oocResult.dmReply}`
        }]
      };
    }
    
    // 2. Handle Combat mode
    if (inCombat) {
        const locationData = await lookupAdventureEntityInDb(locationId, gameState);
        const combatResult = await combatManagerTool({
            ...input,
            locationDescription: locationData?.description || "una zona de combate",
        });
        return combatResult;
    }

    // 3. Handle Narrative/Exploration mode
    const locationData = await lookupAdventureEntityInDb(locationId, gameState);
    const narrativeResult = await narrativeExpert({
        playerAction: input.playerAction,
        gameState, 
        locationId: input.locationId,
        locationContext: JSON.stringify(locationData),
        characterStats: JSON.stringify(input.party.find(c => c.controlledBy === 'Player')),
        conversationHistory: input.conversationHistory,
    });

    const messages: GameMessage[] = [];
    
    // Process narration
    if (narrativeResult.narration) {
        const { html } = await markdownToHtml({ markdown: narrativeResult.narration });
        messages.push({
            sender: 'DM',
            content: html,
            originalContent: narrativeResult.narration,
        } as GameMessage);
    }

    // Process character stat updates
    let updatedParty = input.party;
    if (narrativeResult.updatedCharacterStats) {
        const player = input.party.find(c => c.controlledBy === 'Player');
        if(player) {
            try {
                const updates = JSON.parse(narrativeResult.updatedCharacterStats);
                updatedParty = input.party.map(c => c.id === player.id ? { ...c, ...updates } : c);
            } catch (e) {
                console.warn("Invalid JSON in updatedCharacterStats, ignoring.", narrativeResult.updatedCharacterStats);
            }
        }
    }
    
    return {
      messages,
      updatedParty,
      nextLocationId: narrativeResult.nextLocationId,
      startCombat: narrativeResult.startCombat,
      combatStartNarration: narrativeResult.combatStartNarration,
      identifiedEnemies: narrativeResult.identifiedEnemies,
    };
  }
);


export async function gameCoordinator(input: GameCoordinatorInput): Promise<GameCoordinatorOutput> {
    return gameCoordinatorFlow(input);
}
