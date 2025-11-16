/**
 * Unit tests for retry-utils.ts
 * Tests retry logic with exponential backoff
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithExponentialBackoff } from '@/ai/flows/retry-utils';

describe('retryWithExponentialBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should return result immediately if function succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retryWithExponentialBackoff(fn, 3, 1000, 'test');
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on timeout error and succeed on second attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('success');

    const promise = retryWithExponentialBackoff(fn, 3, 1000, 'test');

    // Fast-forward through the delay
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry on fetch failed error', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce('success');

    const promise = retryWithExponentialBackoff(fn, 3, 1000, 'test');
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry on ECONNRESET error', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce('success');

    const promise = retryWithExponentialBackoff(fn, 3, 1000, 'test');
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry on UND_ERR_CONNECT_TIMEOUT error code', async () => {
    const error = new Error('Connection timeout');
    (error as any).code = 'UND_ERR_CONNECT_TIMEOUT';
    const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('success');

    const promise = retryWithExponentialBackoff(fn, 3, 1000, 'test');
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should use exponential backoff for delays', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('success');

    const promise = retryWithExponentialBackoff(fn, 3, 1000, 'test');

    // First retry: 1000ms (1 * 2^0)
    await vi.advanceTimersByTimeAsync(1000);
    expect(fn).toHaveBeenCalledTimes(2);

    // Second retry: 2000ms (1 * 2^1)
    await vi.advanceTimersByTimeAsync(2000);
    expect(fn).toHaveBeenCalledTimes(3);

    const result = await promise;
    expect(result).toBe('success');
  });

  it('should throw error if all retries are exhausted', async () => {
    const error = new Error('timeout');
    const fn = vi.fn().mockRejectedValue(error);

    const promise = retryWithExponentialBackoff(fn, 2, 1000, 'test');

    // Fast-forward through all delays
    await vi.advanceTimersByTimeAsync(1000 + 2000);

    // Wait for the promise to settle and verify it throws
    await expect(promise).rejects.toThrow('timeout');
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should not retry non-retryable errors', async () => {
    const error = new Error('Invalid input');
    const fn = vi.fn().mockRejectedValue(error);

    const promise = retryWithExponentialBackoff(fn, 3, 1000, 'test');

    await expect(promise).rejects.toThrow('Invalid input');
    expect(fn).toHaveBeenCalledTimes(1); // Only initial attempt
  });

  it('should use default maxRetries of 3', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('success');

    const promise = retryWithExponentialBackoff(fn, undefined, 1000, 'test');

    await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000);

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
  });

  it('should use default initialDelayMs of 1000', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('success');

    const promise = retryWithExponentialBackoff(fn, 3, undefined, 'test');

    // Default delay is 1000ms
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

