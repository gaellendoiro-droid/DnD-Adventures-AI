/**
 * @fileOverview Retry utilities for AI flows
 * Provides retry logic with exponential backoff for handling transient network errors
 */

import { log } from '@/lib/logger';

/**
 * Retry a function with exponential backoff
 * Useful for handling transient network errors like timeouts or connection failures
 * 
 * @param fn Function to retry
 * @param maxRetries Maximum number of retry attempts (default: 3, so 4 total attempts)
 * @param initialDelayMs Initial delay in milliseconds (default: 1000)
 * @param flowName Name of the flow using this function (for logging)
 * @returns Result of the function
 * @throws The last error if all retries fail
 */
export async function retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000,
    flowName: string = 'unknown'
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            log.debug(`Attempting API call (attempt ${attempt + 1}/${maxRetries + 1})`, {
                module: 'AIFlow',
                flow: flowName,
            });
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Check if it's a timeout/network error, server error, or quota error that we should retry
            const isRetryableError =
                error.message?.includes('timeout') ||
                error.message?.includes('fetch failed') ||
                error.message?.includes('ECONNRESET') ||
                error.message?.includes('Service Unavailable') ||
                error.message?.includes('overloaded') ||
                error.message?.includes('Resource has been exhausted') ||
                error.message?.includes('Too Many Requests') ||
                error.message?.includes('429') ||
                error.message?.includes('503') ||
                error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                error.status === 429 ||
                error.status === 503 ||
                error.statusCode === 429 ||
                error.statusCode === 503 ||
                (error.cause && (
                    error.cause.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                    error.cause.message?.includes('Connect Timeout') ||
                    error.cause.message?.includes('Service Unavailable') ||
                    error.cause.message?.includes('overloaded') ||
                    error.cause.message?.includes('Resource has been exhausted') ||
                    error.cause.message?.includes('Too Many Requests') ||
                    error.cause.status === 429 ||
                    error.cause.status === 503 ||
                    error.cause.statusCode === 429 ||
                    error.cause.statusCode === 503
                ));

            if (!isRetryableError || attempt === maxRetries) {
                // Don't retry non-network errors or if we've exhausted retries
                // For retryable errors that exhausted retries, create a clean error without full stack trace
                if (isRetryableError && attempt === maxRetries) {
                    const errorMsg = error.cause?.message || error.message || 'Network error';
                    const errorCode = error.cause?.code || error.code || 'UNKNOWN';
                    
                    log.error(`API call failed after ${maxRetries + 1} attempts`, {
                        module: 'AIFlow',
                        flow: flowName,
                        error: errorMsg,
                        errorCode: errorCode,
                    });
                    
                    // Create a clean error with limited stack trace
                    const cleanError: any = new Error(`API call failed: ${errorMsg} (${errorCode})`);
                    cleanError.code = errorCode;
                    cleanError.cause = error;
                    // Limit stack trace to just this function call
                    if (Error.captureStackTrace) {
                        Error.captureStackTrace(cleanError, retryWithExponentialBackoff);
                    } else {
                        // Fallback: create a minimal stack trace
                        cleanError.stack = `Error: ${cleanError.message}\n    at retryWithExponentialBackoff (${flowName})`;
                    }
                    throw cleanError;
                }
                throw error;
            }

            const delay = initialDelayMs * Math.pow(2, attempt);
            // Extract clean error message for logging
            const errorMsg = error.cause?.message || error.message || 'Network error';
            const errorCode = error.cause?.code || error.code;
            
            log.warn(`API call failed, retrying in ${delay}ms...`, {
                module: 'AIFlow',
                flow: flowName,
                attempt: attempt + 1,
                maxRetries: maxRetries + 1,
                error: errorMsg,
                errorCode: errorCode,
            });

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // If we exhausted retries, create a clean error without full stack trace
    if (lastError) {
        const errorMsg = lastError.cause?.message || lastError.message || 'Network error';
        const errorCode = lastError.cause?.code || lastError.code || 'UNKNOWN';
        
        log.error(`API call failed after ${maxRetries + 1} attempts`, {
            module: 'AIFlow',
            flow: flowName,
            error: errorMsg,
            errorCode: errorCode,
        });
        
        // Create a clean error with limited stack trace
        const cleanError: any = new Error(`API call failed: ${errorMsg} (${errorCode})`);
        cleanError.code = errorCode;
        cleanError.cause = lastError;
        // Limit stack trace to just this function call
        if (Error.captureStackTrace) {
            Error.captureStackTrace(cleanError, retryWithExponentialBackoff);
        } else {
            // Fallback: create a minimal stack trace
            cleanError.stack = `Error: ${cleanError.message}\n    at retryWithExponentialBackoff (${flowName})`;
        }
        throw cleanError;
    }
    
    throw new Error('Retry failed with unknown error');
}

/**
 * Execute a Genkit prompt with automatic retries for network errors.
 * 
 * Centralizes the common pattern of executing Genkit prompts with retry logic.
 * This helper encapsulates the retry pattern used across multiple flows and tools.
 * 
 * @param prompt The Genkit prompt to execute
 * @param input The input for the prompt
 * @param options Optional configuration
 * @param options.maxRetries Maximum number of retry attempts (default: 3, so 4 total attempts)
 * @param options.initialDelayMs Initial delay in milliseconds (default: 1000)
 * @param options.flowName Name of the flow using this function (for logging)
 * @returns The prompt response with output
 * @throws The last error if all retries fail
 * 
 * @example
 * ```typescript
 * const response = await executePromptWithRetry(
 *   enemyTacticianPrompt,
 *   input,
 *   { flowName: 'enemyTactician' }
 * );
 * const output = response.output;
 * ```
 */
export async function executePromptWithRetry<TInput, TOutput>(
    prompt: (input: TInput) => Promise<{ output: TOutput }>,
    input: TInput,
    options?: {
        maxRetries?: number;
        initialDelayMs?: number;
        flowName?: string;
    }
): Promise<{ output: TOutput }> {
    const maxRetries = options?.maxRetries ?? 3;
    const initialDelayMs = options?.initialDelayMs ?? 1000;
    const flowName = options?.flowName ?? 'unknown';

    return await retryWithExponentialBackoff(
        () => prompt(input),
        maxRetries,
        initialDelayMs,
        flowName
    );
}

