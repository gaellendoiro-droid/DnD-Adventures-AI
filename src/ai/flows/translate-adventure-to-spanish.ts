'use server';

/**
 * @fileOverview A flow to translate D&D adventures from English to Spanish.
 *
 * - translateAdventureToSpanish - A function that translates an adventure.
 * - TranslateAdventureToSpanishInput - The input type for the translateAdventureToSpanish function.
 * - TranslateAdventureToSpanishOutput - The return type for the translateAdventureToSpanish function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateAdventureToSpanishInputSchema = z.object({
  adventureText: z.string().describe('The adventure text in English to translate to Spanish.'),
});
export type TranslateAdventureToSpanishInput = z.infer<typeof TranslateAdventureToSpanishInputSchema>;

const TranslateAdventureToSpanishOutputSchema = z.object({
  translatedAdventureText: z.string().describe('The adventure text translated to Spanish.'),
});
export type TranslateAdventureToSpanishOutput = z.infer<typeof TranslateAdventureToSpanishOutputSchema>;

export async function translateAdventureToSpanish(input: TranslateAdventureToSpanishInput): Promise<TranslateAdventureToSpanishOutput> {
  return translateAdventureToSpanishFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateAdventureToSpanishPrompt',
  input: {schema: TranslateAdventureToSpanishInputSchema},
  output: {schema: TranslateAdventureToSpanishOutputSchema},
  prompt: `Translate the following D&D adventure text from English to Spanish. It is very important that you DO NOT translate proper nouns (names of people, places, items, etc.).\n\n{{{adventureText}}}`,
});

const translateAdventureToSpanishFlow = ai.defineFlow(
  {
    name: 'translateAdventureToSpanishFlow',
    inputSchema: TranslateAdventureToSpanishInputSchema,
    outputSchema: TranslateAdventureToSpanishOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
