
'use server';
/**
 * @fileOverview A temporary debugging tool to log the exact data sent by an AI flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const NotaryCharacterSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  race: z.string(),
  class: z.string(),
  sex: z.string(),
  personality: z.string(),
  controlledBy: z.enum(["Player", "AI"]),
});

const NotaryInputSchema = z.object({
  characterSummary: NotaryCharacterSummarySchema.describe("The summary of the AI-controlled character whose action is being decided."),
  context: z.string().describe("The Dungeon Master's most recent narration or the player's most recent action, providing context for the scene."),
  inCombat: z.boolean().describe("Whether the party is currently in combat."),
  enemies: z.array(z.string()).optional().describe("A list of enemy names, if in combat."),
  partySummary: z.array(NotaryCharacterSummarySchema).describe("A summary of the entire party's current status (names, hp, etc)."),
});

export const notaryTool = ai.defineTool(
  {
    name: 'notaryTool',
    description: 'A debug tool to log the exact data an AI is about to send to another tool.',
    inputSchema: NotaryInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    // This tool's only job is to throw an error containing the data it received.
    // This allows us to see exactly what the AI generated before validation.
    throw new Error(`DEBUG NOTARY: Data received by notaryTool: ${JSON.stringify(input, null, 2)}`);
  }
);
