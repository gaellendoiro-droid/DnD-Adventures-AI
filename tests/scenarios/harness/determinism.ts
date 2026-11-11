/**
 * Hace deterministas los dados y las fechas durante un escenario.
 *
 * - `Math.random` se sustituye por PRNGs con semilla (mulberry32): mismas tiradas en cada ejecución.
 *   Cada punto del código que lo usa (función + fichero) tiene SU PROPIA secuencia. Así, el orden
 *   en que terminan las llamadas en paralelo (que al grabar depende de la latencia real de la IA y
 *   al reproducir es instantáneo) no cambia qué número recibe cada tirada: antes, el orden de
 *   iniciativa salía distinto al grabar y al reproducir y la reproducción no coincidía.
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

/** Hash FNV-1a de 32 bits. */
function hash(text: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/**
 * Identifica quién llama a `Math.random`: nombre de la función y fichero, sin números de línea
 * (así, editar otra parte del fichero no cambia las tiradas).
 */
function callSite(): string {
    const lines = (new Error().stack ?? '').split('\n');
    // [0] "Error", [1] callSite, [2] el Math.random sustituido, [3] quien lo llama.
    const frame = (lines[3] ?? '').trim();
    const fn = frame.match(/^at\s+([^\s(]+)\s+\(/)?.[1] ?? '';
    const file = frame.match(/([^/\\\s(]+?\.[cm]?[jt]sx?)(?::\d+)*\)?$/)?.[1] ?? frame;
    return `${fn}@${file}`;
}

/** `Math.random` determinista con una secuencia independiente por punto del código. */
export function createSeededRandom(seed: number): () => number {
    const streams = new Map<string, () => number>();
    return () => {
        const site = callSite();
        let next = streams.get(site);
        if (!next) {
            next = mulberry32((seed ^ hash(site)) >>> 0);
            streams.set(site, next);
        }
        return next();
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
    Math.random = createSeededRandom(seed);
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
