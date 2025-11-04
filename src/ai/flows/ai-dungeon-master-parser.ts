'use server';
/**
 * @fileOverview This file contains the Genkit flow for the AiDungeonMasterParser, which parses player actions and drives the story forward.
 *
 * - aiDungeonMasterParser - A function that takes player input and returns the AI's response to drive the story.
 * - AiDungeonMasterParserInput - The input type for the aiDungeonMasterParser function.
 * - AiDungeonMasterParserOutput - The return type for the aiDungeonMasterParser function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiDungeonMasterParserInputSchema = z.object({
  playerAction: z.string().describe('The action taken by the player.'),
  gameState: z.string().optional().describe('The current state of the game.'),
  locationDescription: z.string().optional().describe('A description of the current location.'),
  characterStats: z.string().optional().describe('The current stats of the character.'),
});
export type AiDungeonMasterParserInput = z.infer<typeof AiDungeonMasterParserInputSchema>;

const AiDungeonMasterParserOutputSchema = z.object({
  narration: z.string().describe('The AI Dungeon Master narration in response to the player action.'),
  updatedGameState: z.string().optional().describe('The updated game state, if any.'),
  nextLocationDescription: z.string().optional().describe('A description of the next location, if the player moved.'),
  updatedCharacterStats: z.string().optional().describe('The updated character stats, if any.'),
});
export type AiDungeonMasterParserOutput = z.infer<typeof AiDungeonMasterParserOutputSchema>;

export async function aiDungeonMasterParser(input: AiDungeonMasterParserInput): Promise<AiDungeonMasterParserOutput> {
  return aiDungeonMasterParserFlow(input);
}

const aiDungeonMasterParserPrompt = ai.definePrompt({
  name: 'aiDungeonMasterParserPrompt',
  input: {schema: AiDungeonMasterParserInputSchema},
  output: {schema: AiDungeonMasterParserOutputSchema},
  prompt: `You are an AI Dungeon Master for a D&D 5e game. You are responsible for interpreting player actions and narrating the game world, making decisions based on the context to drive the story forward. You MUST ALWAYS reply in Spanish. It is very important that you DO NOT translate proper nouns (names of people, places, items, etc.).

  You MUST be faithful to the information provided in the gameState. The gameState is the source of truth for the world, including locations, characters, and events. Do not invent new names for places or characters if they are described in the gameState. The player character's stats are provided separately and should not be confused with NPCs in the gameState.

  Here is the current game state: {{{gameState}}}
  Here is the description of the current location: {{{locationDescription}}}
  Here are the player character stats: {{{characterStats}}}

  The player's action is: {{{playerAction}}}

  Based on the player's action and the current game state, narrate what happens next. Be descriptive and engaging. If applicable, update the game state, character stats or location description. If the player changes locations, you must provide a new location description for the 'nextLocationDescription' field.`,
});

const aiDungeonMasterParserFlow = ai.defineFlow(
  {
    name: 'aiDungeonMasterParserFlow',
    inputSchema: AiDungeonMasterParserInputSchema,
    outputSchema: AiDungeonMasterParserOutputSchema,
  },
  async input => {
    const {output} = await aiDungeonMasterParserPrompt(input);
    return output!;
  }
);
