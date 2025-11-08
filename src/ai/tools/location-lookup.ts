
'use server';
/**
 * @fileOverview A specialized Genkit tool to find the location of a named entity or place.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdventureData } from '@/app/game-state-actions';

export const locationLookupTool = ai.defineTool(
  {
    name: 'locationLookupTool',
    description: "Finds the location object for a given query, which can be the name of a location (e.g., 'Phandalin') or a unique named entity (e.g., 'Adabra Gwynn'). It returns the entire location object where the target is found.",
    inputSchema: z.object({
        query: z.string().describe("The name of the location or unique entity to find. E.g., 'Colina del Resentimiento' or 'Adabra Gwynn'."),
    }),
    outputSchema: z.string().describe('A JSON string containing the full location object if found, or null if not found.'),
  },
  async ({ query }) => {
    const adventureData = await getAdventureData();
    if (!adventureData) {
      return null;
    }

    const locations = adventureData.locations || [];
    const entities = adventureData.entities || [];
    const normalizedQuery = query.toLowerCase().trim();

    // 1. Direct search for a location by name or ID.
    const directLocationMatch = locations.find((loc: any) => 
        (loc.id && loc.id.toLowerCase() === normalizedQuery) || 
        (loc.name && loc.name.toLowerCase() === normalizedQuery)
    );
    if (directLocationMatch) {
      return JSON.stringify(directLocationMatch);
    }

    // 2. Search for a unique, named entity.
    const entityMatch = entities.find((ent: any) => ent.name && ent.name.toLowerCase() === normalizedQuery);
    
    if (entityMatch && entityMatch.id) {
        // If entity is found, now find which location it's in.
        const locationOfEntity = locations.find((loc: any) => 
            loc.entitiesPresent && loc.entitiesPresent.includes(entityMatch.id)
        );
        if (locationOfEntity) {
            return JSON.stringify(locationOfEntity);
        }
    }

    // 3. Fallback for partial matches on locations if no exact match is found
     const partialLocationMatch = locations.find((loc: any) => 
        loc.name && (loc.name.toLowerCase().includes(normalizedQuery) || normalizedQuery.includes(loc.name.toLowerCase()))
     );
     if (partialLocationMatch) {
        return JSON.stringify(partialLocationMatch);
     }
    
    return null;
  }
);
