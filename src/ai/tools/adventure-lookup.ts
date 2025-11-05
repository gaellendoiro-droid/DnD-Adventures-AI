
'use server';
/**
 * @fileOverview A Genkit tool to look up information from the adventure JSON.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

async function searchAdventure(adventureJson: string, query: string): Promise<string | null> {
    try {
        const adventureData = JSON.parse(adventureJson);
        const [queryType, queryId] = query.split(':');

        if (!queryType || !queryId) {
            return "Invalid query format. Use 'location:<id>' or 'entity:<id>'.";
        }

        let result: any;
        if (queryType === 'location') {
            result = adventureData.locations?.find((loc: any) => loc.id === queryId);
        } else if (queryType === 'entity') {
            result = adventureData.entities?.find((ent: any) => ent.id === queryId);
        } else {
            return `Unknown query type '${queryType}'. Use 'location' or 'entity'.`;
        }
        
        if (result) {
            return JSON.stringify(result, null, 2);
        }

        return `No ${queryType} found with ID '${queryId}'.`;

    } catch (error) {
        console.warn(`Adventure Lookup: Error processing query "${query}"`, error);
        return "Failed to parse or search the adventure data.";
    }
}


export const adventureLookupTool = ai.defineTool(
  {
    name: 'adventureLookupTool',
    description: 'Looks up information about a specific location or entity (character, monster) from the main adventure data file. Use this to get details when a player moves to a new area or interacts with a specific named entity.',
    inputSchema: z.object({
        adventureJson: z.string().describe("The entire adventure's JSON content."),
        query: z.string().describe("The search query, formatted as 'location:<id>' or 'entity:<id>'. For example: 'location:phandalin-plaza-del-pueblo' or 'entity:cryovain'."),
    }),
    outputSchema: z.string().describe('A JSON string containing the requested information, or an error message if not found.'),
  },
  async ({ adventureJson, query }) => {
    // The flow passes the gameState as the adventureJson. We just need to call the search function.
    const result = await searchAdventure(adventureJson, query);
    return result || "Information not found.";
  }
);

// We need to extend the prompt's input to include the full adventure JSON for the tool.
// So we modify the tool definition to only expect the query, and the flow will pass the adventureJson.
const adventureLookupToolForPrompt = ai.defineTool(
    {
      name: 'adventureLookupTool',
      description: 'Looks up information about a specific location or entity (character, monster) from the main adventure data file. Use this to get details when a player moves to a new area or interacts with a specific named entity.',
      inputSchema: z.object({
          query: z.string().describe("The search query, formatted as 'location:<id>' or 'entity:<id>'. For example: 'location:phandalin-plaza-del-pueblo' or 'entity:cryovain'."),
      }),
      outputSchema: z.string().describe('A JSON string containing the requested information, or an error message if not found.'),
    },
    // This is a placeholder function because the actual logic is handled in the flow.
    // The tool definition for the prompt doesn't need the implementation, just the schema.
    async (input) => "This should not be called directly."
);

// We need to re-structure how the tool is called. The tool needs the gameState.
// The flow has the gameState. So the flow will call the tool.
// The AI only needs to know about the tool's *signature*, not its implementation.
// The AI will tell us *which* tool to call with *which* arguments. Genkit handles this.
// But the tool *needs* the adventure JSON. The AI doesn't know about it.

// Correct approach: The AI will ask to call `adventureLookupTool` with a `query`.
// The flow will intercept this, call the *actual* tool implementation, and pass
// *both* the AI-provided `query` and the `gameState` from the flow's context.

// Let's redefine the tool so the AI doesn't need to know about the JSON blob.
const finalAdventureLookupTool = ai.defineTool(
    {
        name: 'adventureLookupTool',
        description: 'Looks up information about a specific location or entity (character, monster) from the main adventure data file. Use this to get details when a player moves to a new area or interacts with a specific named entity.',
        inputSchema: z.object({
            query: z.string().describe("The search query, formatted as 'location:<id>' or 'entity:<id>'. For example: 'location:phandalin-plaza-del-pueblo' or 'entity:cryovain'."),
        }),
        outputSchema: z.string().describe('A JSON string containing the requested information, or an error message if not found.'),
    },
    // The actual implementation is defined within the flow that has access to the adventure JSON.
    // This is a bit of a workaround for Genkit's tool definition scope.
    // The function here is just a placeholder.
    async (input) => {
        // This won't be executed. The flow overrides it.
        return "Looking up...";
    }
);
