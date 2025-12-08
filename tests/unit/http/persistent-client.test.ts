import { describe, it, expect, vi } from 'vitest';
import { createPersistentFetch } from '@/lib/http/persistent-client';

describe('persistentFetch', () => {
  it('inyecta dispatcher para URLs http/https', async () => {
    const baseFetch = vi.fn(async (_input, init?: RequestInit) => {
      return { ok: true, init } as any;
    });

    const fetchWithPool = createPersistentFetch({ baseFetch });

    const response: any = await fetchWithPool('https://example.com/data');

    expect(baseFetch).toHaveBeenCalledTimes(1);
    const callInit = baseFetch.mock.calls[0][1] as RequestInit;
    expect(callInit?.dispatcher).toBeDefined();
    expect(response.ok).toBe(true);
  });

  it('no modifica llamadas relativas (sin dispatcher)', async () => {
    const baseFetch = vi.fn(async (_input, init?: RequestInit) => {
      return { ok: true, init } as any;
    });

    const fetchWithPool = createPersistentFetch({ baseFetch });

    const response: any = await fetchWithPool('/api/internal');

    expect(baseFetch).toHaveBeenCalledTimes(1);
    const callInit = baseFetch.mock.calls[0][1] as RequestInit;
    expect(callInit?.dispatcher).toBeUndefined();
    expect(response.ok).toBe(true);
  });
});


