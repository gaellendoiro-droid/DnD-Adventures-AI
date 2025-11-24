
'use server';
/**
 * @fileOverview This file contains the Genkit flow for the OocAssistant, which handles out-of-character player questions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { dndApiLookupTool } from '../tools/dnd-api-lookup';
import { executePromptWithRetry } from './retry-utils';

const OocAssistantInputSchema = z.object({
  playerQuery: z.string().describe('The out-of-character question from the player to the Dungeon Master.'),
  conversationHistory: z.string().optional().describe("A transcript of the last few turns of conversation to provide immediate context."),
});
export type OocAssistantInput = z.infer<typeof OocAssistantInputSchema>;

const OocAssistantOutputSchema = z.object({
  dmReply: z.string().describe('The Dungeon Master\'s helpful, out-of-character reply to the player.'),
  debugLogs: z.array(z.string()).optional(),
});
export type OocAssistantOutput = z.infer<typeof OocAssistantOutputSchema>;

const oocAssistantPrompt = ai.definePrompt({
  name: 'oocAssistantPrompt',
  input: {schema: OocAssistantInputSchema},
  output: {schema: OocAssistantOutputSchema},
  tools: [dndApiLookupTool],
  prompt: `You are an AI Dungeon Master for a D&D 5e game. A player is asking you a question out-of-character. Your role is to be a helpful and clear assistant. You MUST ALWAYS reply in Spanish from Spain.

  Here is the recent conversation history for context:
  \`\`\`
  {{{conversationHistory}}}
  \`\`\`

  The player's query is: "{{{playerQuery}}}"

  Provide a direct, helpful, and concise out-of-character response to the player. Address them as "el jugador", not as their character.
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
  async (input) => {
    const debugLogs: string[] = [];
    debugLogs.push("OOCAssistant: Processing out-of-character query...");
    const response = await executePromptWithRetry(
      oocAssistantPrompt,
      input,
      { flowName: 'oocAssistant' }
    );
    const { output } = response;
    if (!output) {
      return { dmReply: "No se pudo procesar la pregunta.", debugLogs };
    }
    return { ...output, debugLogs };
  }
);


export async function oocAssistant(input: OocAssistantInput): Promise<OocAssistantOutput> {
    return oocAssistantFlow(input);
}

    