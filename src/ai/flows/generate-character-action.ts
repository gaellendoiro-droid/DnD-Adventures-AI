'use server';
/**
 * @fileOverview Generates an action or dialogue for a character based on the current game state.
 *
 * - generateCharacterAction - A function that handles the character action generation.
 * - GenerateCharacterActionInput - The input type for the generateCharacterAction function.
 * - GenerateCharacterActionOutput - The return type for the generateCharacterAction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCharacterActionInputSchema = z.object({
  characterName: z.string().describe('The name of the character.'),
  characterClass: z.string().describe('The class of the character.'),
  characterRace: z.string().describe('The race of the character.'),
  dmNarration: z.string().describe("The Dungeon Master's most recent narration."),
  playerAction: z.string().describe("The player's most recent action."),
});
export type GenerateCharacterActionInput = z.infer<typeof GenerateCharacterActionInputSchema>;

const GenerateCharacterActionOutputSchema = z.object({
  action: z.string().describe("The character's action or dialogue in response to the situation. It can be an empty string if the character does nothing."),
});
export type GenerateCharacterActionOutput = z.infer<typeof GenerateCharacterActionOutputSchema>;

export async function generateCharacterAction(input: GenerateCharacterActionInput): Promise<GenerateCharacterActionOutput> {
  return generateCharacterActionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCharacterActionPrompt',
  input: {schema: GenerateCharacterActionInputSchema},
  output: {schema: GenerateCharacterActionOutputSchema},
  prompt: `You are acting as a character in a D&D game.
Your Name: {{{characterName}}}
Your Class: {{{characterClass}}}
Your Race: {{{characterRace}}}

This is what just happened, as told by the Dungeon Master:
"{{{dmNarration}}}"

The player character just did this:
"{{{playerAction}}}"

Based on your personality (as a {{{characterRace}}} {{{characterClass}}}) and the situation, what do you do or say? Your response should be a short, in-character action or a line of dialogue. If you have nothing to do or say, you can return an empty string. Keep it concise.`,
});

const generateCharacterActionFlow = ai.defineFlow(
  {
    name: 'generateCharacterActionFlow',
    inputSchema: GenerateCharacterActionInputSchema,
    outputSchema: GenerateCharacterActionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
