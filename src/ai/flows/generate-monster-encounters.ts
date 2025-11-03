'use server';
/**
 * @fileOverview Dynamically generates balanced monster encounters based on the party's level.
 *
 * - generateMonsterEncounter - A function that handles the monster encounter generation.
 * - GenerateMonsterEncounterInput - The input type for the generateMonsterEncounter function.
 * - GenerateMonsterEncounterOutput - The return type for the generateMonsterEncounter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMonsterEncounterInputSchema = z.object({
  partyLevel: z.number().describe('The average level of the adventuring party.'),
  environment: z.string().describe('The environment in which the encounter will take place, e.g., forest, dungeon, desert.'),
  encounterDifficulty: z.enum(['easy', 'medium', 'hard', 'deadly']).describe('The desired difficulty of the encounter.'),
});
export type GenerateMonsterEncounterInput = z.infer<typeof GenerateMonsterEncounterInputSchema>;

const GenerateMonsterEncounterOutputSchema = z.object({
  encounterDescription: z.string().describe('A detailed description of the monster encounter, including the types and number of monsters, their tactics, and the overall challenge.'),
});
export type GenerateMonsterEncounterOutput = z.infer<typeof GenerateMonsterEncounterOutputSchema>;

export async function generateMonsterEncounter(input: GenerateMonsterEncounterInput): Promise<GenerateMonsterEncounterOutput> {
  return generateMonsterEncounterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMonsterEncounterPrompt',
  input: {schema: GenerateMonsterEncounterInputSchema},
  output: {schema: GenerateMonsterEncounterOutputSchema},
  prompt: `You are an expert Dungeon Master for D&D 5th edition, skilled at creating balanced and engaging monster encounters.

Given the following information about the adventuring party and the desired encounter:

Party Level: {{{partyLevel}}}
Environment: {{{environment}}}
Encounter Difficulty: {{{encounterDifficulty}}}

Create a monster encounter that is appropriate for the party's level and the specified environment and difficulty.
Consider the types of monsters that would be found in the environment and their relative challenge to the party.
Provide a detailed description of the encounter, including the types and number of monsters, their tactics, and any special features or challenges the encounter presents.
Make sure the encounter is consistent with the D&D 5th edition rules.

Encounter Description:`,
});

const generateMonsterEncounterFlow = ai.defineFlow(
  {
    name: 'generateMonsterEncounterFlow',
    inputSchema: GenerateMonsterEncounterInputSchema,
    outputSchema: GenerateMonsterEncounterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
