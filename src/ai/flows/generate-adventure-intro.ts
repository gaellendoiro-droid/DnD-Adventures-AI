'use server';
/**
 * @fileOverview Generates a custom adventure introduction based on its title and summary.
 *
 * - generateAdventureIntro - A function that handles the adventure introduction generation.
 * - GenerateAdventureIntroInput - The input type for the generateAdventureIntro function.
 * - GenerateAdventureIntroOutput - The return type for the generateAdventureIntro function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAdventureIntroInputSchema = z.object({
  adventureTitle: z.string().describe('The title of the adventure.'),
  adventureSummary: z.string().describe('The summary of the adventure.'),
});
export type GenerateAdventureIntroInput = z.infer<typeof GenerateAdventureIntroInputSchema>;

const GenerateAdventureIntroOutputSchema = z.object({
  narration: z.string().describe("The Dungeon Master's immersive introduction to the adventure."),
});
export type GenerateAdventureIntroOutput = z.infer<typeof GenerateAdventureIntroOutputSchema>;

export async function generateAdventureIntro(input: GenerateAdventureIntroInput): Promise<GenerateAdventureIntroOutput> {
  return generateAdventureIntroFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAdventureIntroPrompt',
  input: {schema: GenerateAdventureIntroInputSchema},
  output: {schema: GenerateAdventureIntroOutputSchema},
  prompt: `You are an expert Dungeon Master for a D&D 5e game. Your task is to craft an immersive and engaging introduction for the players based on the adventure's title and summary. Do not reveal too much information. Instead, set the scene, create atmosphere, and suggest a few starting points or questions for the players to consider. The response MUST be in Spanish.

Adventure Title: {{{adventureTitle}}}
Adventure Summary: {{{adventureSummary}}}

Based on this, generate a compelling introductory narration to kick off the game.

Response: {
  "narration": "Your immersive introductory narration in Spanish."
}`,
});

const generateAdventureIntroFlow = ai.defineFlow(
  {
    name: 'generateAdventureIntroFlow',
    inputSchema: GenerateAdventureIntroInputSchema,
    outputSchema: GenerateAdventureIntroOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
