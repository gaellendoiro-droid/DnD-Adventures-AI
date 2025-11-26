/**
 * @fileOverview A Genkit tool to look up information from the adventure JSON.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdventureData } from '@/app/game-state-actions';

export const adventureLookupTool = ai.defineTool(
  {
    name: 'adventureLookupTool',
    description: 'Looks up information about a specific location or entity (character, monster, item) from the main adventure data file. Use this to get details when a player moves to a new area or interacts with a specific named entity like "tablón de anuncios" or an NPC.',
    inputSchema: z.object({
      query: z.string().describe("The search query, which can be the entity's ID or name. For example: 'phandalin-plaza-del-pueblo' or 'Linene Vientogrís' or 'Tablón de oportunidades'."),
      currentLocationId: z.string().optional().describe("The ID of the character's current location, to help narrow down searches for interactable objects."),
    }),
    outputSchema: z.string().describe('A JSON string containing the requested information, or an error message if not found.'),
  },
  async ({ query, currentLocationId }) => {
    const adventureData = await getAdventureData();
    if (!adventureData) {
      return "Error: Adventure data is not available. It must be provided.";
    }

    const locations = adventureData.locations || [];
    const entities = adventureData.entities || [];
    const tables = adventureData.tables || [];

    const normalizedQuery = query.toLowerCase().trim();

    function processTableRolls(text: string): string {
      const regex = /\[\[ROLL_TABLE:([a-zA-Z0-9-_]+)\]\]/g;
      return text.replace(regex, (match, tableId) => {
        const table = tables.find((t: any) => t.id === tableId);
        if (!table || !table.rows) return match;
        const randomRow = table.rows[Math.floor(Math.random() * table.rows.length)];

        // Log the table roll for debugging/visibility
        console.log(`[AdventureLookup] Rolling on table '${tableId}'. Result: "${randomRow.content.substring(0, 50)}..."`);

        return randomRow.content;
      });
    }

    // 1. Search for interactables within the current location
    if (currentLocationId) {
      const currentLocation = locations.find((loc: any) => loc.id === currentLocationId);
      if (currentLocation && currentLocation.interactables) {
        const interactable = currentLocation.interactables.find((i: any) => i.name && i.name.toLowerCase() === normalizedQuery);
        if (interactable) return processTableRolls(JSON.stringify(interactable));
      }
    }

    // 2. Exact match by ID or name across all locations and entities
    const allData = [...locations, ...entities];
    let result = allData.find((item: any) =>
      (item.id && item.id.toLowerCase() === normalizedQuery) ||
      (item.name && item.name.toLowerCase() === normalizedQuery)
    );
    if (result) return processTableRolls(JSON.stringify(result));

    // 3. Partial match / fuzzy search if no exact match is found
    const partialMatch = allData.find((item: any) =>
      (item.name && item.name.toLowerCase().includes(normalizedQuery)) ||
      (item.id && item.id.toLowerCase().includes(normalizedQuery))
    );
    if (partialMatch) return processTableRolls(JSON.stringify(partialMatch));

    return `Error: No location, entity or interactable found matching '${query}'. Try a broader query.`;
  }
);
