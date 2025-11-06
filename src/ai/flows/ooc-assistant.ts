
'use server';
/**
 * @fileOverview This file contains the Genkit flow for the OocAssistant, which handles out-of-character player questions.
 *
 * - oocAssistant - A function that takes player OOC input and returns the AI's response.
 * - OocAssistantInput - The input type for the oocAssistant function.
 * - OocAssistantOutput - The return type for the oocAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { dndApiLookupTool } from '../tools/dnd-api-lookup';

const OocAssistantInputSchema = z.object({
  playerQuery: z.string().describe('The out-of-character question from the player to the Dungeon Master.'),
  gameState: z.string().optional().describe('The current state of the game for context.'),
  conversationHistory: z.string().optional().describe("A transcript of the last few turns of conversation to provide immediate context."),
});
export type OocAssistantInput = z.infer<typeof OocAssistantInputSchema>;

const OocAssistantOutputSchema = z.object({
  dmReply: z.string().describe('The Dungeon Master\'s helpful, out-of-character reply to the player.'),
});
export type OocAssistantOutput = z.infer<typeof OocAssistantOutputSchema>;

export async function oocAssistant(input: OocAssistantInput): Promise<OocAssistantOutput> {
  return oocAssistantFlow(input);
}

const oocAssistantPrompt = ai.definePrompt({
  name: 'oocAssistantPrompt',
  input: {schema: OocAssistantInputSchema},
  output: {schema: OocAssistantOutputSchema},
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

const oocAssistantFlow = ai.defineFlow(
  {
    name: 'oocAssistantFlow',
    inputSchema: OocAssistantInputSchema,
    outputSchema: OocAssistantOutputSchema,
  },
  async input => {
    const {output} = await oocAssistantPrompt(input);
    return output!;
  }
);
