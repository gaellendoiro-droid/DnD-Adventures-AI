
'use server';
/**
 * @fileOverview A specialized Genkit tool to find the location of a named entity or place.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdventureData } from '@/app/game-state-actions';
import { log } from '@/lib/logger';

export const locationLookupTool = ai.defineTool(
  {
    name: 'locationLookupTool',
    description: "Finds the location object for a given query, which can be the name of a location (e.g., 'Phandalin') or a unique named entity (e.g., 'Adabra Gwynn'). It returns the entire location object where the target is found.",
    inputSchema: z.object({
        query: z.string().describe("The name of the location or unique entity to find. E.g., 'Colina del Resentimiento' or 'Adabra Gwynn' or 'tienda de Barthen'."),
    }),
    outputSchema: z.string().nullable().describe('A JSON string containing the full location object if found, or null if no valid location is found.'),
  },
  async ({ query }) => {
    try {
        log.aiTool('locationLookupTool', 'Looking up location', { query });
        const adventureData = await getAdventureData();
        if (!adventureData) {
          log.error('Adventure data not available for location lookup', { 
            module: 'AITool',
            tool: 'locationLookupTool',
          });
          // Returning a string message instead of null to prevent ToolResponsePart errors
          return "Error: Adventure data is not available.";
        }

        const locations = adventureData.locations || [];
        const entities = adventureData.entities || [];
        const normalizedQuery = query.toLowerCase().trim();

        // Layer 1: Exact match by ID or title. Highest priority.
        let match = locations.find((loc: any) => 
            (loc.id && loc.id.toLowerCase() === normalizedQuery) || 
            (loc.title && loc.title.toLowerCase() === normalizedQuery)
        );
        if (match) {
            log.aiTool('locationLookupTool', 'Location found (exact match)', { 
                query,
                locationId: match.id,
                locationTitle: match.title,
            });
            return JSON.stringify(match);
        }

        // Layer 2: Location title *includes* the query.
        // This is great for "Escudo de Leon" matching "Bazar Escudo de Leon".
        match = locations.find((loc: any) => 
          loc.title && loc.title.toLowerCase().includes(normalizedQuery)
        );
        if (match) {
            log.aiTool('locationLookupTool', 'Location found (partial match)', { 
                query,
                locationId: match.id,
                locationTitle: match.title,
            });
            return JSON.stringify(match);
        }

        // Layer 3: Query matches a unique entity name. Return the location of that entity.
        const entityMatch = entities.find((ent: any) => ent.name && ent.name.toLowerCase() === normalizedQuery);
        if (entityMatch && entityMatch.id) {
            const locationOfEntity = locations.find((loc: any) => 
                loc.entitiesPresent && loc.entitiesPresent.includes(entityMatch.id)
            );
            if (locationOfEntity) {
                log.aiTool('locationLookupTool', 'Location found (via entity)', { 
                    query,
                    entityName: entityMatch.name,
                    locationId: locationOfEntity.id,
                });
                return JSON.stringify(locationOfEntity);
            }
        }
        
        // Layer 4: Fallback to fuzzy word matching for typos.
        // This allows "tienda barten" to match "Suministros Barthen".
        const queryWords = normalizedQuery.split(' ').filter(w => w.length > 2); // ignore small words
        if(queryWords.length > 0) {
            match = locations.find((loc: any) => 
              loc.title && queryWords.some(word => loc.title.toLowerCase().includes(word))
            );
            if (match) {
                log.aiTool('locationLookupTool', 'Location found (fuzzy match)', { 
                    query,
                    locationId: match.id,
                    locationTitle: match.title,
                });
                return JSON.stringify(match);
            }
        }
        
        log.warn('Location not found', { 
            module: 'AITool',
            tool: 'locationLookupTool',
            query,
        });
        // If no match is found after all checks, return null.
        // The flow calling this tool is responsible for handling a null response.
        return null;
    } catch (e: any) {
        log.error('Location lookup failed', { 
            module: 'AITool',
            tool: 'locationLookupTool',
            query,
        }, e);
        return `Error: An exception occurred while searching for location: ${e.message}`;
    }
  }
);
