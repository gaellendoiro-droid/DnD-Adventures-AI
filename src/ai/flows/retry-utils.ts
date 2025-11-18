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
            
            // Check if it's a timeout/network error or server error that we should retry
            const isRetryableError = 
                error.message?.includes('timeout') ||
                error.message?.includes('fetch failed') ||
                error.message?.includes('ECONNRESET') ||
                error.message?.includes('Service Unavailable') ||
                error.message?.includes('overloaded') ||
                error.message?.includes('503') ||
                error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                error.status === 503 ||
                error.statusCode === 503 ||
                (error.cause && (
                    error.cause.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                    error.cause.message?.includes('Connect Timeout') ||
                    error.cause.message?.includes('Service Unavailable') ||
                    error.cause.message?.includes('overloaded') ||
                    error.cause.status === 503 ||
                    error.cause.statusCode === 503
                ));
            
            if (!isRetryableError || attempt === maxRetries) {
                // Don't retry non-network errors or if we've exhausted retries
                throw error;
            }
            
            const delay = initialDelayMs * Math.pow(2, attempt);
            log.warn(`API call failed, retrying in ${delay}ms...`, {
                module: 'AIFlow',
                flow: flowName,
                attempt: attempt + 1,
                maxRetries: maxRetries + 1,
                error: error.message,
                errorCode: error.code,
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError || new Error('Retry failed with unknown error');
}

