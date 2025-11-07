/**
 * @fileOverview A Genkit tool to look up D&D 5e information from an external API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Helper function to format the JSON data for better readability for the AI
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

async function searchApi(resourceType: string, query: string): Promise<string | null> {
    const baseUrl = 'https://www.dnd5eapi.co/api';
    const formattedQuery = query.toLowerCase().replace(/\s+/g, '-');

    try {
        const response = await fetch(`${baseUrl}/${resourceType}/${formattedQuery}`);
        
        if (response.ok) {
            const data = await response.json();
            return formatRelevantInfo(data);
        }

        // If direct lookup fails, try searching
        const searchResponse = await fetch(`${baseUrl}/${resourceType}/?name=${query}`);
        if(searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.count > 0 && searchData.results[0].url) {
                const detailResponse = await fetch(`https://www.dnd5eapi.co${searchData.results[0].url}`);
                if (detailResponse.ok) {
                    const detailData = await detailResponse.json();
                    return formatRelevantInfo(detailData);
                }
            }
        }
        return null;
    } catch (error) {
        console.warn(`D&D API Lookup: Error fetching from ${resourceType} for query "${query}"`, error);
        return null;
    }
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
    const resourceTypes = ['monsters', 'spells', 'equipment'];
    
    for (const resourceType of resourceTypes) {
        const result = await searchApi(resourceType, input.query);
        if (result) {
            return result;
        }
    }

    console.log(`D&D API Lookup: No information found for "${input.query}" in any category.`);
    return `No information found for "${input.query}".`;
  }
);
