/**
 * @fileOverview A Genkit tool to look up information from the adventure JSON.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const adventureLookupTool = ai.defineTool(
  {
    name: 'adventureLookupTool',
    description: 'Looks up information about a specific location or entity (character, monster, item) from the main adventure data file. Use this to get details when a player moves to a new area or interacts with a specific named entity like "tablón de anuncios" or an NPC.',
    inputSchema: z.object({
        query: z.string().describe("The search query, which can be the entity's ID or name. For example: 'phandalin-plaza-del-pueblo' or 'Linene Vientogrís' or 'Tablón de oportunidades'."),
        gameState: z.string().describe("The full JSON string of the current adventure state. This MUST be passed from the prompt's context."),
        currentLocationId: z.string().optional().describe("The ID of the character's current location, to help narrow down searches for interactable objects."),
    }),
    outputSchema: z.string().describe('A JSON string containing the requested information, or an error message if not found.'),
  },
  async ({ query, gameState, currentLocationId }) => {
    if (!gameState) {
      return "Error: Adventure data (gameState) is not available. It must be provided.";
    }

    let adventureData: any;
    try {
      adventureData = JSON.parse(gameState);
    } catch (e: any) {
      console.error("[adventureLookupTool] Failed to parse gameState JSON:", e.message);
      return `Error: The provided gameState is not valid JSON. Error: ${e.message}`;
    }

    const locations = adventureData.locations || [];
    const entities = adventureData.entities || [];
    const allData = [...locations, ...entities];
    
    const normalizedQuery = query.toLowerCase().trim();

    // 1. Exact match by ID or name
    let result = allData.find((item: any) => 
        (item.id && item.id.toLowerCase() === normalizedQuery) || 
        (item.name && item.name.toLowerCase() === normalizedQuery)
    );
    if (result) return JSON.stringify(result);

    // 2. Search for interactables within the current location
    if (currentLocationId) {
        const currentLocation = locations.find((loc:any) => loc.id === currentLocationId);
        if (currentLocation && currentLocation.interactables) {
            const interactable = currentLocation.interactables.find((i: any) => i.name && i.name.toLowerCase() === normalizedQuery);
            if (interactable) return JSON.stringify(interactable);
        }
    }

    // 3. Partial match / fuzzy search if no exact match is found
    const partialMatch = allData.find((item: any) => 
        (item.name && item.name.toLowerCase().includes(normalizedQuery)) ||
        (item.id && item.id.toLowerCase().includes(normalizedQuery))
    );
    if (partialMatch) return JSON.stringify(partialMatch);
    
    return `Error: No location, entity or interactable found matching '${query}'. Try a broader query.`;
  }
);
