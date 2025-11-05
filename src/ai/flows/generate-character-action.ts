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
  personality: z.string().describe("A brief description of the character's personality and background."),
});

const GenerateCharacterActionInputSchema = z.object({
  characters: z.array(CharacterInfoSchema).describe("The list of AI-controlled characters in the party."),
  dmNarration: z.string().describe("The Dungeon Master's most recent narration, providing context for the scene."),
  playerAction: z.string().describe("The player's most recent action or dialogue."),
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
  prompt: `You are orchestrating the AI-controlled characters in a D&D party. Your goal is to make their interactions feel natural, realistic, and true to their unique personalities.

**Guiding Principle: Realismo sobre la Reactividad. No todos tienen que hablar siempre.** El silencio es una respuesta válida y a menudo la más natural.

Your characters are:
{{#each characters}}
- **Name:** {{{this.name}}} (ID: {{{this.id}}})
  - **Class:** {{{this.class}}}
  - **Race:** {{{this.race}}}
  - **Personality:** {{{this.personality}}}
{{/each}}

This is what's happening, as told by the Dungeon Master:
"{{{dmNarration}}}"

The player character just said or did this:
"{{{playerAction}}}"

Based on the situation and each character's personality, decide if any of your characters should react.
- **Is the player talking to them directly?** If so, a response is likely but not guaranteed. The response should be in character.
- **Does the situation warrant a reaction?** A character might react to a tense moment, a critical event, or something that specifically aligns with their personality (e.g., a greedy character noticing treasure).
- **It's okay to be silent.** This is the most important rule. Not everyone has to speak or act every time. If a character has no strong opinion or nothing relevant to add, they should remain silent. Your goal is realism, not to fill every silence. Do not generate an action for them.
- A character's action can be a short, in-character line of dialogue or a brief description of a non-verbal action (e.g., "Elara asiente en señal de acuerdo.").
- Keep actions concise.
- If a character does nothing, do not include them in the output array. If no one acts, return an empty array.
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
