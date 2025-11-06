
'use server';
/**
 * @fileOverview This file contains the Genkit tool for the OocAssistant, which handles out-of-character player questions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { dndApiLookupTool } from './dnd-api-lookup';
import { runDynamicTool } from './tool-runner';

const OocAssistantToolInputSchema = z.object({
  playerQuery: z.string().describe('The out-of-character question from the player to the Dungeon Master.'),
  conversationHistory: z.string().optional().describe("A transcript of the last few turns of conversation to provide immediate context."),
});

const OocAssistantToolOutputSchema = z.object({
  dmReply: z.string().describe("The Dungeon Master's helpful, out-of-character reply to the player, formatted in Markdown."),
});

const oocAssistantPrompt = ai.definePrompt({
  name: 'oocAssistantToolPrompt',
  input: { schema: OocAssistantToolInputSchema },
  output: { schema: OocAssistantToolOutputSchema },
  tools: [dndApiLookupTool],
  prompt: `You are an AI Dungeon Master for a D&D 5e game. A player is asking you a question out-of-character. Your role is to be a helpful and clear assistant. You MUST ALWAYS reply in Spanish.

Here is the recent conversation history for context:
\`\`\`
{{{conversationHistory}}}
\`\`\`

The player's query is: "{{{playerQuery}}}"

Provide a direct, helpful, and concise out-of-character response to the player. Address them as "el jugador", not as their character.
If they are pointing out a mistake you made, acknowledge it and thank them.
If they are asking for a rule clarification or a question about the current situation, explain it simply. If you are unsure about a specific rule, spell, or item, use the dndApiLookupTool to get accurate information before answering.

Response:`,
});

export const oocAssistantTool = ai.defineTool(
  {
    name: 'oocAssistantTool',
    description: "Handles out-of-character (OOC) questions from the player, such as rule clarifications or questions about the game state. Use this when the player's message starts with //.",
    inputSchema: OocAssistantToolInputSchema,
    outputSchema: OocAssistantToolOutputSchema,
  },
  async (input, context) => runDynamicTool(oocAssistantPrompt, input, context)
);
