
/**
 * @fileOverview A Genkit tool to look up information about party members.
 * This version receives party data directly as an argument, avoiding global state.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { CharacterSchema, PartySchema } from '@/lib/schemas';

export const characterLookupTool = ai.defineTool(
  {
    name: 'characterLookupTool',
    description: 'Looks up information about characters in the current party. Use this to get details about allies. Can be used to fetch a list of all party members or details of a specific character.',
    inputSchema: z.object({
        party: PartySchema.describe("The array of character objects representing the current party."),
        characterName: z.string().optional().describe("The name of the character to look up. If omitted, returns a list of all party members' names."),
    }),
    outputSchema: z.any().describe('If a name is provided, returns the full character data object or null. If no name is provided, returns an array of character summaries.'),
  },
  async ({ party, characterName }) => {
    
    if (!characterName) {
        // If no name, return a summary of the whole party
        return party.map(c => ({
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
    const character = party.find(c => c.name.toLowerCase() === normalizedQuery);

    if (character) {
      return character;
    }

    // Return a message instead of null to avoid Genkit "output missing" error
    return { error: `Character "${characterName}" not found in party.` };
  }
);
