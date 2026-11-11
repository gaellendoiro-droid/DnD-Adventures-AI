/**
 * Setup de los escenarios narrativos.
 *
 * A diferencia de tests/setup.ts, aquí NO se simulan el dado ni el logger: se ejecuta el juego real.
 * Solo se sustituye la caché de la aventura activa del servidor, para no tocar la caché de disco
 * del entorno de desarrollo (node_modules/.cache) al ejecutar los tests.
 */
import { vi } from 'vitest';

vi.mock('@/app/game-state-actions', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/game-state-actions')>();
    return {
        ...actual,
        getAdventureData: async () => (globalThis as any).__scenarioAdventure ?? null,
        setAdventureDataCache: async (data: any) => {
            (globalThis as any).__scenarioAdventure = data;
        },
    };
});

/**
 * Tiradas de d20 fijadas por el escenario (`forcedD20`): la IA consume números aleatorios entre
 * tirada y tirada, así que la semilla no basta para reproducir una partida concreta. Mientras
 * queden valores en la cola, `rollD20` los usa en orden; después vuelve a tirar con la semilla.
 */
vi.mock('@/lib/dice/dice-engine', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/dice/dice-engine')>();
    const forced = (): number[] | undefined => (globalThis as any).__forcedD20;
    return {
        ...actual,
        rollD20: (mode: any = 'normal') => {
            const queue = forced();
            if (!queue || queue.length === 0) return actual.rollD20(mode);
            const die1 = queue.shift()!;
            const die2 = mode !== 'normal' ? (queue.shift() ?? die1) : undefined;
            const kept = die2 === undefined ? die1 : mode === 'advantage' ? Math.max(die1, die2) : Math.min(die1, die2);
            const discarded = die2 === undefined ? undefined : (kept === die1 ? die2 : die1);
            return { total: kept, die1, die2, kept, discarded, naturalCrit: kept === 20, naturalFail: kept === 1 };
        },
    };
});
