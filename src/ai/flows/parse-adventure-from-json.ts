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
  adventureTitle: z.string().describe('The title of the adventure, extracted from the JSON content.'),
  adventureSummary: z.string().describe('A brief summary of the adventure, generated from the JSON content.'),
  adventureData: z.any().describe('The entire valid JSON adventure data.'),
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
  output: {schema: z.object({
    adventureTitle: z.string().describe('The title of the adventure, extracted from the JSON content.'),
    adventureSummary: z.string().describe('A brief summary of the adventure, generated from the JSON content.'),
  })},
  prompt: `You are an expert D&D game master. Your task is to process adventure data from a JSON format.

  Here is the adventure data in JSON format:
  \`\`\`json
  {{{adventureJson}}}
  \`\`\`

  From the content of this JSON, please extract the adventure's main title and generate a concise summary (2-3 sentences) of what the adventure is about.
  `,
});

const parseAdventureFromJsonFlow = ai.defineFlow(
  {
    name: 'parseAdventureFromJsonFlow',
    inputSchema: ParseAdventureFromJsonInputSchema,
    outputSchema: ParseAdventureFromJsonOutputSchema,
  },
  async input => {
    // First, validate if the input is valid JSON
    let adventureData;
    try {
      adventureData = JSON.parse(input.adventureJson);
    } catch (e) {
      throw new Error("Invalid JSON provided for the adventure.");
    }

    // Then, extract title and summary using the AI prompt
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("Could not extract adventure title and summary.");
    }
    
    // Return the extracted info plus the full, original JSON data.
    return {
      adventureTitle: output.adventureTitle,
      adventureSummary: output.adventureSummary,
      adventureData: adventureData,
    };
  }
);
