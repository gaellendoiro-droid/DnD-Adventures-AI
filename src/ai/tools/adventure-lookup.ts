
'use server';
/**
 * @fileOverview A Genkit tool to look up information from the adventure JSON.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// This is the tool definition that the AI will see.
// It only defines the *signature* of the tool (name, description, input/output schemas).
// The actual implementation is created dynamically inside the flows
// because the implementation needs access to the `gameState` which is only available within that flow's context.
export const adventureLookupTool = ai.defineTool(
  {
    name: 'adventureLookupTool',
    description: 'Looks up information about a specific location or entity (character, monster, item) from the main adventure data file. Use this to get details when a player moves to a new area or interacts with a specific named entity like "tablón de anuncios" or an NPC.',
    inputSchema: z.object({
        query: z.string().describe("The search query, which can be the entity's ID or name. For example: 'phandalin-plaza-del-pueblo' or 'Linene Vientogrís' or 'Tablón de oportunidades'."),
    }),
    outputSchema: z.string().describe('A JSON string containing the requested information, or an error message if not found.'),
  },
  // This implementation will NOT be called. It's just a placeholder.
  // The real logic is dynamically created in the flow.
  async (input) => {
    console.error("The static adventureLookupTool should not be called directly.");
    return "Tool not implemented. The flow should provide a dynamic implementation.";
  }
);
