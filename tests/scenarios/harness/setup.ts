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
