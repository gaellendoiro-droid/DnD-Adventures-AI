
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
import { dndApiLookupTool } from '../tools/dnd-api-lookup';

const DungeonMasterOocParserInputSchema = z.object({
  playerQuery: z.string().describe('The out-of-character question from the player to the Dungeon Master.'),
  gameState: z.string().optional().describe('The current state of the game for context.'),
  conversationHistory: z.string().optional().describe("A transcript of the last few turns of conversation to provide immediate context."),
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
  tools: [dndApiLookupTool],
  prompt: `You are an AI Dungeon Master for a D&D 5e game. A player is asking you a question out-of-character. Your role is to be a helpful and clear assistant. You MUST ALWAYS reply in Spanish.

  Here is the recent conversation history for context:
  \`\`\`
  {{{conversationHistory}}}
  \`\`\`

  The player's query is: "{{{playerQuery}}}"

  Provide a direct, helpful, and concise out-of-character response to the player. Address them as "the player", not as their character.
  If they are pointing out a mistake you made, acknowledge it and thank them.
  If they are asking for a rule clarification or a question about the current situation, explain it simply. If you are unsure about a specific rule, spell, or item, use the dndApiLookupTool to get accurate information before answering.
  
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
