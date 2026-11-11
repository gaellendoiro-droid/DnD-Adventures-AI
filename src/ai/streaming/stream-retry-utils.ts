
import { retryWithExponentialBackoff, prewarmConnection } from '../flows/retry-utils';
import { GenerateStreamResponse, z } from 'genkit';

/**
 * Execute a Genkit prompt with 'generateStream' and retry logic for the INITIAL connection.
 * 
 * Note: If the stream starts successfully but fails mid-stream, this wrapper CANNOT retry it
 * (as that would imply restarting the generation, which might result in duplicate/different content).
 * Streaming resilience must be handled by the client or by accepting partial failure.
 * 
 * @param prompt The Genkit prompt object
 * @param input The input payload
 * @param options Retry options
 */
export async function streamPromptWithRetry<TInput>(
    prompt: { generateStream: (input: TInput) => Promise<any> },
    input: TInput,
    options?: {
        maxRetries?: number;
        initialDelayMs?: number;
        flowName?: string;
    }
): Promise<any> {
    const flowName = options?.flowName ?? 'streamPrompt';

    // Attempt to start the stream with retries
    return await retryWithExponentialBackoff(
        async () => {
            return await prompt.generateStream(input);
        },
        options?.maxRetries ?? 2, // Fewer retries for streams usually
        options?.initialDelayMs ?? 1000,
        flowName
    );
}
