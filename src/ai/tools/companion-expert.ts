
'use server';
/**
 * @fileOverview A Genkit flow for generating actions for AI-controlled companions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { companionExpertPrompt } from '../flows/companion-expert';

export const CompanionExpertInputSchema = z.object({
  characters: z.array(z.object({
    id: z.string(),
    name: z.string(),
    class: z.string(),
    race: z.string(),
    personality: z.string(),
  })).describe("A list of AI-controlled characters for which to generate actions."),
  context: z.string().describe("The Dungeon Master's most recent narration or the player's most recent action, providing context for the scene."),
  inCombat: z.boolean().describe("Whether the party is currently in combat."),
  enemies: z.array(z.string()).optional().describe("A list of enemy names, if in combat."),
});

export type CompanionExpertInput = z.infer<typeof CompanionExpertInputSchema>;

const CharacterActionSchema = z.object({
  characterId: z.string().describe("The ID of the character taking the action."),
  action: z.string().describe("The character's action or dialogue. Can be an empty string for no action."),
});

export const CompanionExpertOutputSchema = z.object({
  actions: z.array(CharacterActionSchema).describe("A list of character actions. Can be empty."),
});
export type CompanionExpertOutput = z.infer<typeof CompanionExpertOutputSchema>;


const companionExpertFlow = ai.defineFlow(
  {
    name: 'companionExpertFlow',
    inputSchema: CompanionExpertInputSchema,
    outputSchema: CompanionExpertOutputSchema,
  },
  async (input) => {
    // If there are no AI characters, don't call the model.
    if (input.characters.length === 0) {
      return { actions: [] };
    }
    
    const { output } = await companionExpertPrompt(input);

    return output || { actions: [] };
  }
);

export async function companionExpert(input: CompanionExpertInput): Promise<CompanionExpertOutput> {
    return companionExpertFlow(input);
}
