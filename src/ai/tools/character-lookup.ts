
/**
 * @fileOverview A Genkit tool to look up information about a party member.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { CharacterSchema, CharacterSummarySchema } from '@/lib/schemas';

// This is a simplified, non-persistent way to hold party data for the tool.
// In a real application, this might be a database call or a state management system.
let currentPartyData: any[] = [];
export const updatePartyDataForTools = (party: any[]) => {
  currentPartyData = party;
};

export const characterLookupTool = ai.defineTool(
  {
    name: 'characterLookupTool',
    description: 'Looks up information about characters in the current party. Use this to get details about allies. Can be used to fetch a list of all party members or details of a specific character.',
    inputSchema: z.object({
        characterName: z.string().optional().describe("The name of the character to look up. If omitted, returns a list of all party members' names."),
    }),
    outputSchema: z.any().describe('If a name is provided, returns the full character data object or null. If no name is provided, returns an array of character summaries.'),
  },
  async ({ characterName }) => {
    
    if (!characterName) {
        // If no name, return a summary of the whole party
        return currentPartyData.map(c => ({
            id: c.id,
            name: c.name,
            race: c.race,
            class: c.class,
            sex: c.sex,
            personality: c.personality,
            controlledBy: c.controlledBy,
        }));
    }

    const normalizedQuery = characterName.toLowerCase().trim();
    const character = currentPartyData.find(c => c.name.toLowerCase() === normalizedQuery);

    if (character) {
      return character;
    }

    return null;
  }
);
