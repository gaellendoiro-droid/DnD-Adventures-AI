'use server';
/**
 * @fileOverview A Genkit tool to look up D&D 5e information from an external API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Helper function to format the JSON data for better readability for the AI
function formatRelevantInfo(data: any): string {
    if (!data) return "No information found.";

    const relevantInfo: any = {};
    const fields = ['name', 'size', 'type', 'alignment', 'armor_class', 'hit_points', 'speed', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'proficiencies', 'damage_vulnerabilities', 'damage_resistances', 'damage_immunities', 'condition_immunities', 'senses', 'languages', 'challenge_rating', 'special_abilities', 'actions', 'legendary_actions'];

    for(const field of fields) {
        if(data[field]) {
            relevantInfo[field] = data[field];
        }
    }

    return JSON.stringify(relevantInfo, null, 2);
}

export const dndApiLookupTool = ai.defineTool(
  {
    name: 'dndApiLookupTool',
    description: 'Looks up information about D&D 5e monsters, spells, or items from the dnd5eapi.co API. Use simple, one or two-word queries for best results (e.g., "goblin", "fireball").',
    inputSchema: z.object({
        query: z.string().describe('The search term, e.g., "goblin" or "magic missile".'),
    }),
    outputSchema: z.string().describe('A JSON string containing the requested information, or an error message.'),
  },
  async (input) => {
    const baseUrl = 'https://www.dnd5eapi.co/api';
    const query = input.query.toLowerCase().replace(/\s+/g, '-');
    
    // For simplicity, we'll just search in monsters for now. 
    // This could be expanded to other resources like spells, items, etc.
    const resourceType = 'monsters';

    try {
      const response = await fetch(`${baseUrl}/${resourceType}/${query}`);
      
      if (!response.ok) {
        // Try a search if direct lookup fails
        const searchResponse = await fetch(`${baseUrl}/${resourceType}/?name=${input.query}`);
        if(!searchResponse.ok) {
            return `No information found for "${input.query}". The API call failed with status ${searchResponse.status}.`;
        }
        const searchData = await searchResponse.json();
        if (searchData.count > 0 && searchData.results[0].url) {
            const detailResponse = await fetch(`https://www.dnd5eapi.co${searchData.results[0].url}`);
            if (!detailResponse.ok) {
                return `Found a match for "${input.query}" but could not fetch details.`;
            }
            const detailData = await detailResponse.json();
            return formatRelevantInfo(detailData);
        } else {
            return `No information found for "${input.query}".`;
        }
      }

      const data = await response.json();
      return formatRelevantInfo(data);

    } catch (error: any) {
      console.error('D&D API Lookup Tool Error:', error);
      return `An error occurred while fetching data: ${error.message}`;
    }
  }
);
