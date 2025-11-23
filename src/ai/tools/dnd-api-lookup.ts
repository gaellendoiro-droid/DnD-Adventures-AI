/**
 * @fileOverview A Genkit tool to look up D&D 5e information from an external API.
 * 
 * This tool uses the unified D&D API client (dnd-api-client.ts) for all API calls.
 * It focuses solely on formatting API responses for the AI.
 * 
 * This module is part of Issue #125 unification.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { searchResource } from '@/lib/dnd-api-client';

/**
 * Helper function to format the JSON data for better readability for the AI.
 * Filters and formats relevant fields from the API response.
 */
function formatRelevantInfo(data: any): string {
    if (!data) return "No information found.";

    const relevantInfo: any = {};
    const fields = ['name', 'desc', 'higher_level', 'size', 'type', 'alignment', 'armor_class', 'hit_points', 'speed', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'proficiencies', 'damage_vulnerabilities', 'damage_resistances', 'damage_immunities', 'condition_immunities', 'senses', 'languages', 'challenge_rating', 'special_abilities', 'actions', 'legendary_actions', 'equipment_category', 'cost', 'weight'];

    for(const field of fields) {
        if(data[field] !== undefined && data[field] !== null) {
            relevantInfo[field] = data[field];
        }
    }

    return JSON.stringify(relevantInfo, null, 2);
}

export const dndApiLookupTool = ai.defineTool(
  {
    name: 'dndApiLookupTool',
    description: 'Looks up information about D&D 5e monsters, spells, or equipment from the dnd5eapi.co API. Use simple, one or two-word queries for best results (e.g., "goblin", "fireball", "longsword").',
    inputSchema: z.object({
        query: z.string().describe('The search term, e.g., "goblin", "magic missile", "plate armor".'),
    }),
    outputSchema: z.string().describe('A JSON string containing the requested information, or an error message if not found.'),
  },
  async (input) => {
    log.aiTool('dndApiLookupTool', 'Looking up D&D 5e information', { query: input.query });
    
    const originalQuery = input.query;
    const resourceTypes = ['monsters', 'spells', 'equipment'];
    
    // Try each resource type until we find a match
    for (const resourceType of resourceTypes) {
        // Use unified client to search (includes cache, retries, error handling)
        const data = await searchResource(resourceType, originalQuery);
        
        if (data) {
            // Format the data for the AI
            const formatted = formatRelevantInfo(data);
            
            log.aiTool('dndApiLookupTool', 'Information found', { 
                originalQuery,
                resourceType,
            });
            
            return formatted;
        }
    }

    log.warn('D&D API lookup: No information found', { 
        module: 'AITool',
        tool: 'dndApiLookupTool',
        originalQuery,
    });
    
    return `No information found for "${originalQuery}".`;
  }
);
