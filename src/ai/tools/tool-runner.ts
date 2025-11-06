
'use server';
/**
 * @fileOverview A helper utility to run a prompt with dynamic tools.
 */

import { ai } from '@/ai/genkit';
import { dndApiLookupTool } from './dnd-api-lookup';
import { z } from 'zod';
import type { FlowContext } from 'genkit/flow';
import type { GenerateOptions, ModelReference, Prompt } from 'genkit';

/**
 * Creates a dynamic instance of the adventureLookupTool that uses the gameState
 * from the flow's context.
 */
function createDynamicAdventureLookupTool(gameState: string | undefined) {
  return ai.defineTool(
    {
      name: 'adventureLookupTool',
      description: "Looks up and returns the entire JSON object for a specific location or entity (character, monster, item) from the adventure data. Use this to get all details about a place the player is in or wants to go to, or an object/character they want to interact with or ask about.",
      inputSchema: z.object({
        query: z.string().describe("The ID or name of the location, entity, or interactable object (e.g., 'phandalin-plaza-del-pueblo', 'cryovain', 'Tablón de oportunidades')."),
      }),
      outputSchema: z.string().describe('A JSON string containing the requested information, or an error message if not found.'),
    },
    async ({ query }) => {
      if (!gameState) {
        return "Error: Adventure data is not available in this context.";
      }
      let adventureData;
      try {
        adventureData = JSON.parse(gameState);
      } catch (e) {
        return "Error: Failed to parse adventure data.";
      }

      const allData = [...(adventureData.locations || []), ...(adventureData.entities || [])];
      let result = allData.find((item: any) =>
        item.id === query || (item.name && typeof item.name === 'string' && item.name.toLowerCase() === query.toLowerCase())
      );

      if (result) return JSON.stringify(result);
      
      // Also search interactables in all locations as a fallback
      if (adventureData.locations) {
          for (const loc of adventureData.locations) {
              if (loc.interactables) {
                  const interactable = loc.interactables.find((i: any) => i.name && typeof i.name === 'string' && i.name.toLowerCase() === query.toLowerCase());
                  if (interactable) return JSON.stringify(interactable);
              }
          }
      }

      return `Error: No location, entity or interactable found matching '${query}'.`;
    }
  );
}

/**
 * Runs a Genkit prompt with a dynamically created adventureLookupTool.
 * This is necessary because the adventure data (gameState) is only available
 * within the context of a flow execution.
 */
export async function runDynamicTool<
  I extends z.ZodType,
  O extends z.ZodType
>(
  prompt: Prompt<I, O>,
  input: z.infer<I>,
  context: FlowContext,
  options?: Omit<GenerateOptions, 'tools' | 'output'>,
): Promise<z.infer<O> | null> {
  const gameState = context.flow?.vars?.gameState;
  const dynamicAdventureLookupTool = createDynamicAdventureLookupTool(gameState);

  const { output } = await prompt(input, {
    ...options,
    tools: [dynamicAdventureLookupTool, dndApiLookupTool],
  });

  return output;
}
