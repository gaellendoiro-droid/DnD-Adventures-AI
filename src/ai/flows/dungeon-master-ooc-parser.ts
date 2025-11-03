'use server';
/**
 * @fileOverview This file contains the Genkit flow for the DungeonMasterOocParser, which handles out-of-character player questions.
 *
 * - dungeonMasterOocParser - A function that takes player OOC input and returns the AI's response.
 * - DungeonMasterOocParserInput - The input type for the dungeonMasterOocParser function.
 * - DungeonMasterOocParserOutput - The return type for the dungeonMasterOocParser function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DungeonMasterOocParserInputSchema = z.object({
  playerQuery: z.string().describe('The out-of-character question from the player to the Dungeon Master.'),
  gameState: z.string().optional().describe('The current state of the game for context.'),
});
export type DungeonMasterOocParserInput = z.infer<typeof DungeonMasterOocParserInputSchema>;

const DungeonMasterOocParserOutputSchema = z.object({
  dmReply: z.string().describe('The Dungeon Master\'s helpful, out-of-character reply to the player.'),
});
export type DungeonMasterOocParserOutput = z.infer<typeof DungeonMasterOocParserOutputSchema>;

export async function dungeonMasterOocParser(input: DungeonMasterOocParserInput): Promise<DungeonMasterOocParserOutput> {
  return dungeonMasterOocParserFlow(input);
}

const dungeonMasterOocParserPrompt = ai.definePrompt({
  name: 'dungeonMasterOocParserPrompt',
  input: {schema: DungeonMasterOocParserInputSchema},
  output: {schema: DungeonMasterOocParserOutputSchema},
  prompt: `You are an AI Dungeon Master for a D&D 5e game. A player is asking you a question out-of-character. Your role is to be a helpful and clear assistant.

  Current game state for context: {{{gameState}}}

  The player's query is: "{{{playerQuery}}}"

  Provide a direct, helpful, and concise out-of-character response to the player. Address them as "the player", not as their character.
  If they are pointing out a mistake you made, acknowledge it and thank them.
  If they are asking for a rule clarification, explain it simply.
  
  Response:{
    "dmReply": "Your helpful out-of-character response to the player."
  }`,
});

const dungeonMasterOocParserFlow = ai.defineFlow(
  {
    name: 'dungeonMasterOocParserFlow',
    inputSchema: DungeonMasterOocParserInputSchema,
    outputSchema: DungeonMasterOocParserOutputSchema,
  },
  async input => {
    const {output} = await dungeonMasterOocParserPrompt(input);
    return output!;
  }
);
