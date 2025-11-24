'use server';

/**
 * @fileOverview Parses adventure data from JSON format using AI.
 *
 * @exports parseAdventureFromJson - Function to parse adventure data from JSON.
 * @exports ParseAdventureFromJsonInput - Input type for parseAdventureFromJson.
 * @exports ParseAdventureFromJsonOutput - Output type for parseAdventureFromJson.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { log } from '@/lib/logger';
import { executePromptWithRetry } from '@/ai/flows/retry-utils';
import { parseAdventureFast } from '@/lib/adventure-loader/adventure-parser';
import { adventureCache } from '@/lib/adventure-loader/adventure-cache';

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
  const jsonContent = input.adventureJson;
  const hash = adventureCache.generateHash(jsonContent);

  // 1. Check Cache
  const cached = adventureCache.get(hash);
  if (cached) {
    log.info('Adventure found in cache', { module: 'ParseAdventure', hash });
    return cached;
  }

  // 2. Check Pending Requests
  const pending = adventureCache.getPending(hash);
  if (pending) {
    log.info('Waiting for pending adventure parse', { module: 'ParseAdventure', hash });
    return pending;
  }

  // 3. Process (Fast Parse -> AI Fallback)
  const parsePromise = (async () => {
    // Try Fast Parse first
    try {
      const fastParsed = parseAdventureFast(jsonContent);
      // If we successfully extracted title and summary, we are good
      if (fastParsed.adventureTitle && fastParsed.adventureTitle !== 'Aventura sin título' &&
        fastParsed.adventureSummary && fastParsed.adventureSummary !== 'Sin descripción disponible') {

        log.info('Adventure parsed successfully using Fast Parser', {
          module: 'ParseAdventure',
          title: fastParsed.adventureTitle
        });

        adventureCache.set(hash, fastParsed);
        return fastParsed;
      }

      log.info('Fast parser result incomplete, falling back to AI', {
        module: 'ParseAdventure',
        extractedTitle: fastParsed.adventureTitle
      });
    } catch (e) {
      log.warn('Fast parser failed, falling back to AI', {
        module: 'ParseAdventure',
        error: e instanceof Error ? e.message : String(e)
      });
    }

    // Fallback to AI Flow
    return parseAdventureFromJsonFlow(input).then(result => {
      // Ensure the result matches ParsedAdventure interface
      const parsedResult = {
        adventureTitle: result.adventureTitle,
        adventureSummary: result.adventureSummary,
        adventureData: result.adventureData
      };
      adventureCache.set(hash, parsedResult);
      return parsedResult;
    });
  })();

  adventureCache.setPending(hash, parsePromise);
  return parsePromise;
}

const prompt = ai.definePrompt({
  name: 'parseAdventureFromJsonPrompt',
  input: { schema: ParseAdventureFromJsonInputSchema },
  output: {
    schema: z.object({
      adventureTitle: z.string().describe('The title of the adventure, extracted from the JSON content.'),
      adventureSummary: z.string().describe('A brief summary of the adventure, generated from the JSON content.'),
    })
  },
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

    // Try to extract title and summary using the AI prompt with retry logic
    // This helps with intermittent connection timeouts and quota exhaustion
    log.info('Starting adventure JSON parsing with AI', {
      module: 'ParseAdventure',
      flow: 'parseAdventureFromJsonFlow',
      jsonLength: input.adventureJson.length,
      hasAdventureData: !!adventureData,
    });

    const result = await executePromptWithRetry(
      prompt,
      input,
      { flowName: 'parseAdventureFromJsonFlow' }
    );

    const output = result.output;

    if (!output) {
      log.error('AI returned null output for adventure parsing', {
        module: 'ParseAdventure',
        flow: 'parseAdventureFromJsonFlow',
      });
      throw new Error('Could not extract adventure title and summary from JSON.');
    }

    log.info('Successfully parsed adventure JSON with AI', {
      module: 'ParseAdventure',
      flow: 'parseAdventureFromJsonFlow',
      title: output.adventureTitle,
      summaryLength: output.adventureSummary?.length || 0,
    });

    // Return the extracted info plus the full, original JSON data.
    return {
      adventureTitle: output.adventureTitle,
      adventureSummary: output.adventureSummary,
      adventureData: adventureData,
    };
  }
);
