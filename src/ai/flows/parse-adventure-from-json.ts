'use server';

/**
 * @fileOverview Parses adventure data from JSON format using AI.
 *
 * @exports parseAdventureFromJson - Function to parse adventure data from JSON.
 * @exports ParseAdventureFromJsonInput - Input type for parseAdventureFromJson.
 * @exports ParseAdventureFromJsonOutput - Output type for parseAdventureFromJson.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ParseAdventureFromJsonInputSchema = z.object({
  adventureJson: z
    .string()
    .describe('The adventure data in JSON format.'),
});
export type ParseAdventureFromJsonInput = z.infer<
  typeof ParseAdventureFromJsonInputSchema
>;

const ParseAdventureFromJsonOutputSchema = z.object({
  adventureTitle: z.string().describe('The title of the adventure.'),
  adventureSummary: z.string().describe('A brief summary of the adventure.'),
  adventureData: z.any().describe('Parsed adventure data in a structured format.'),
});

export type ParseAdventureFromJsonOutput = z.infer<
  typeof ParseAdventureFromJsonOutputSchema
>;

export async function parseAdventureFromJson(
  input: ParseAdventureFromJsonInput
): Promise<ParseAdventureFromJsonOutput> {
  return parseAdventureFromJsonFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseAdventureFromJsonPrompt',
  input: {schema: ParseAdventureFromJsonInputSchema},
  output: {schema: ParseAdventureFromJsonOutputSchema},
  prompt: `You are an expert D&D game master. Your task is to parse adventure data from a JSON format and provide a structured output.

  Here is the adventure data in JSON format:
  \`\`\`
  {{{adventureJson}}}
  \`\`\`

  Based on the JSON data, extract the adventure title, create a brief summary, and parse the rest of the adventure data into a structured format that can be used by the application.
  Make your adventureData output be valid JSON.
  Here's an example:
  {
  "adventureTitle": "Title of the Adventure",
  "adventureSummary": "A brief summary of the adventure.",
   "adventureData": { ...structured data... }
  }
  `,
});

const parseAdventureFromJsonFlow = ai.defineFlow(
  {
    name: 'parseAdventureFromJsonFlow',
    inputSchema: ParseAdventureFromJsonInputSchema,
    outputSchema: ParseAdventureFromJsonOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
