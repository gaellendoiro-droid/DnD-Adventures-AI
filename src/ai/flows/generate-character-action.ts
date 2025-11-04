'use server';
/**
 * @fileOverview Generates actions or dialogue for a list of characters based on the current game state.
 *
 * - generateCharacterAction - A function that handles the character action generation.
 * - GenerateCharacterActionInput - The input type for the generateCharacterAction function.
 * - GenerateCharacterActionOutput - The return type for the generateCharacterAction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CharacterInfoSchema = z.object({
  id: z.string(),
  name: z.string().describe('The name of the character.'),
  class: z.string().describe('The class of the character.'),
  race: z.string().describe('The race of the character.'),
});

const GenerateCharacterActionInputSchema = z.object({
  characters: z.array(CharacterInfoSchema).describe("The list of AI-controlled characters in the party."),
  dmNarration: z.string().describe("The Dungeon Master's most recent narration."),
  playerAction: z.string().describe("The player's most recent action."),
});
export type GenerateCharacterActionInput = z.infer<typeof GenerateCharacterActionInputSchema>;

const CharacterActionSchema = z.object({
    characterId: z.string().describe("The ID of the character taking the action."),
    action: z.string().describe("The character's action or dialogue. Can be an empty string for no action."),
});

const GenerateCharacterActionOutputSchema = z.object({
  actions: z.array(CharacterActionSchema).describe("A list of character actions, in the order they should be performed. The list can be empty if no character acts."),
});
export type GenerateCharacterActionOutput = z.infer<typeof GenerateCharacterActionOutputSchema>;

export async function generateCharacterAction(input: GenerateCharacterActionInput): Promise<GenerateCharacterActionOutput> {
  // If there are no AI characters, don't call the flow.
  if (input.characters.length === 0) {
    return { actions: [] };
  }
  return generateCharacterActionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCharacterActionPrompt',
  input: {schema: GenerateCharacterActionInputSchema},
  output: {schema: GenerateCharacterActionOutputSchema},
  prompt: `You are orchestrating the AI-controlled characters in a D&D party.
Your characters are:
{{#each characters}}
- Name: {{{this.name}}}, Race: {{{this.race}}}, Class: {{{this.class}}} (ID: {{{this.id}}})
{{/each}}

This is what just happened, as told by the Dungeon Master:
"{{{dmNarration}}}"

The player character just did this:
"{{{playerAction}}}"

Based on the situation and each character's personality, decide which characters should act and in what order.
- It should feel natural. Not everyone has to speak or act every time. Sometimes no one will act.
- A character's action can be a short, in-character line of dialogue or a brief description of what they do.
- Keep actions concise.
- If a character does nothing, do not include them in the output array.
- The order of actions in the output array determines the sequence of events.
`,
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
