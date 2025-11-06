
'use server';
/**
 * @fileOverview A Genkit tool to look up information from the adventure JSON.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { lookupAdventureEntityInDb } from '@/app/game-state-actions';

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
    } catch (e) {
      return "Error: The provided gameState is not valid JSON.";
    }

    const allData = [...(adventureData.locations || []), ...(adventureData.entities || [])];
    
    // First, try a direct match by ID or name
    let result = allData.find((item: any) => 
        item.id === query || (item.name && typeof item.name === 'string' && item.name.toLowerCase() === query.toLowerCase())
    );

    if (result) return JSON.stringify(result);

    // If no direct match, search for interactables within the current location
    if (currentLocationId) {
        const currentLocation = (adventureData.locations || []).find((loc:any) => loc.id === currentLocationId);
        if (currentLocation && currentLocation.interactables) {
            const interactable = currentLocation.interactables.find((i: any) => i.name && typeof i.name === 'string' && i.name.toLowerCase() === query.toLowerCase());
            if (interactable) return JSON.stringify(interactable);
        }
    }
    
    return `Error: No location, entity or interactable found matching '${query}'.`;
  }
);
