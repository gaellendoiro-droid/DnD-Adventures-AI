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
import {log} from '@/lib/logger';

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

    // Try to extract title and summary using the AI prompt with retry logic
    // This helps with intermittent connection timeouts after hot reloads
    let output;
    const maxRetries = 3;
    let lastError: any = null;
    
    log.info('Starting adventure JSON parsing', {
      module: 'ParseAdventure',
      flow: 'parseAdventureFromJsonFlow',
      jsonLength: input.adventureJson.length,
      hasAdventureData: !!adventureData,
    });
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        log.debug(`Attempting to parse adventure (attempt ${attempt}/${maxRetries})`, {
          module: 'ParseAdventure',
          flow: 'parseAdventureFromJsonFlow',
          attempt,
          maxRetries,
        });
        
        const result = await prompt(input);
        output = result.output;
        if (output) {
          log.info('Successfully parsed adventure JSON', {
            module: 'ParseAdventure',
            flow: 'parseAdventureFromJsonFlow',
            attempt,
            title: output.adventureTitle,
            summaryLength: output.adventureSummary?.length || 0,
          });
          break; // Success, exit retry loop
        }
      } catch (error: any) {
        lastError = error;
        
        // Extract error information more robustly
        const errorCode = error?.code || error?.cause?.code || 'UNKNOWN';
        let errorMessage = error?.message || error?.toString() || 'Unknown error';
        const causeCode = error?.cause?.code || null;
        let causeMessage = error?.cause?.message || null;
        
        // Clean error messages: remove newlines and excessive whitespace, then truncate
        const cleanMessage = (msg: string, maxLength: number): string => {
          return msg
            .replace(/\s+/g, ' ') // Replace all whitespace (including newlines) with single space
            .trim()
            .substring(0, maxLength);
        };
        
        errorMessage = cleanMessage(errorMessage, 200);
        if (causeMessage) {
          causeMessage = cleanMessage(causeMessage, 100);
        }
        
        // Check if it's a connection timeout error
        const isTimeoutError = errorCode === 'UND_ERR_CONNECT_TIMEOUT' || 
                              errorMessage.includes('Connect Timeout') ||
                              errorMessage.includes('fetch failed') ||
                              causeCode === 'UND_ERR_CONNECT_TIMEOUT' ||
                              (causeMessage && causeMessage.includes('Connect Timeout'));
        
        log.warn(`Adventure parsing attempt ${attempt} failed`, {
          module: 'ParseAdventure',
          flow: 'parseAdventureFromJsonFlow',
          attempt,
          maxRetries,
          isTimeoutError,
          errorCode,
          errorMessage,
          causeCode,
          causeMessage,
          errorType: error?.constructor?.name || typeof error,
        });
        
        if (isTimeoutError && attempt < maxRetries) {
          // Wait a bit before retrying (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          log.info(`Retrying after ${delay}ms (exponential backoff)`, {
            module: 'ParseAdventure',
            flow: 'parseAdventureFromJsonFlow',
            attempt,
            nextAttempt: attempt + 1,
            delayMs: delay,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry
        }
        // If it's not a timeout or we've exhausted retries, throw
        const finalErrorCode = lastError?.code || lastError?.cause?.code || 'UNKNOWN';
        let finalErrorMessage = lastError?.message || lastError?.toString() || 'Unknown error';
        const finalCauseCode = lastError?.cause?.code || null;
        
        // Clean error message: remove newlines and excessive whitespace, then truncate
        finalErrorMessage = finalErrorMessage
          .replace(/\s+/g, ' ') // Replace all whitespace (including newlines) with single space
          .trim()
          .substring(0, 300);
        
        log.error('Adventure parsing failed permanently', {
          module: 'ParseAdventure',
          flow: 'parseAdventureFromJsonFlow',
          attempt,
          maxRetries,
          isTimeoutError,
          errorCode: finalErrorCode,
          errorMessage: finalErrorMessage,
          causeCode: finalCauseCode,
          errorType: lastError?.constructor?.name || typeof lastError,
        }, lastError);
        throw error;
      }
    }
    
    if (!output) {
      const errorMessage = `Could not extract adventure title and summary after ${maxRetries} attempts. ${lastError ? `Last error: ${lastError.message}` : ''}`;
      log.error('Adventure parsing failed: no output after all retries', {
        module: 'ParseAdventure',
        flow: 'parseAdventureFromJsonFlow',
        maxRetries,
        lastErrorCode: lastError?.code,
        lastErrorMessage: lastError?.message,
      });
      throw new Error(errorMessage);
    }
    
    // Return the extracted info plus the full, original JSON data.
    return {
      adventureTitle: output.adventureTitle,
      adventureSummary: output.adventureSummary,
      adventureData: adventureData,
    };
  }
);
