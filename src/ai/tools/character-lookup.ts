
/**
 * @fileOverview A Genkit tool to look up information about a party member.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { CharacterSchema } from '@/lib/schemas';

// This is a simplified, non-persistent way to hold party data for the tool.
// In a real application, this might be a database call or a state management system.
let currentPartyData: any[] = [];
export const updatePartyDataForTools = (party: any[]) => {
  currentPartyData = party;
};

export const characterLookupTool = ai.defineTool(
  {
    name: 'characterLookupTool',
    description: 'Looks up information about a specific character in the current party. Use this to get details about an ally, such as their current health, spells, or inventory.',
    inputSchema: z.object({
        characterName: z.string().describe("The name of the character to look up. For example: 'Galador' or 'Elara'."),
    }),
    outputSchema: CharacterSchema.optional().describe('A JSON object containing the character\'s data, or null if not found.'),
  },
  async ({ characterName }) => {
    const normalizedQuery = characterName.toLowerCase().trim();
    
    const character = currentPartyData.find(c => c.name.toLowerCase() === normalizedQuery);

    if (character) {
      return character;
    }

    return null;
  }
);
