/**
 * Hace deterministas los dados y las fechas durante un escenario.
 *
 * - `Math.random` se sustituye por un PRNG con semilla (mulberry32): mismas tiradas en cada ejecución.
 * - `Date` queda congelado en una fecha fija (no avanza): ids y timestamps estables.
 *   Los temporizadores (`setTimeout`, `AbortSignal.timeout`) siguen siendo reales.
 */
import { vi } from 'vitest';

export const FIXED_DATE = new Date('2026-01-01T18:00:00.000Z');

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export interface DeterminismHandle {
    restore(): void;
}

/**
 * @param fastWaits En replay, las esperas largas (reintentos tras un 429 grabado, backoff…) no aportan
 *                  nada: se acortan a 10 ms para que la CI no espere decenas de segundos.
 */
export function enableDeterminism(seed: number, fastWaits = false): DeterminismHandle {
    const originalRandom = Math.random;
    const originalSetTimeout = globalThis.setTimeout;
    Math.random = mulberry32(seed);
    vi.useFakeTimers({ toFake: ['Date'], now: FIXED_DATE });
    if (fastWaits) {
        globalThis.setTimeout = ((fn: any, ms?: number, ...args: any[]) =>
            originalSetTimeout(fn, Math.min(ms ?? 0, 10), ...args)) as typeof setTimeout;
    }
    return {
        restore() {
            Math.random = originalRandom;
            globalThis.setTimeout = originalSetTimeout;
            vi.useRealTimers();
        },
    };
}
