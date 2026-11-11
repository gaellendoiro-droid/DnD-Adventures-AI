import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Configuración de los escenarios narrativos (Fase 1, TASK-071 a TASK-074).
 * Se ejecuta con `npm run test:scenarios` (ver scripts/run-scenarios.mjs y docs/testing.md).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/scenarios/**/*.scenario.ts'],
    setupFiles: ['./tests/scenarios/harness/setup.ts'],
    // Cada escenario en su propio proceso y de uno en uno: el modelo y las cachés de módulo no se mezclan.
    pool: 'forks',
    fileParallelism: false,
    testTimeout: 15 * 60 * 1000,
    hookTimeout: 60 * 1000,
    // El logger del juego es muy verboso: se silencia salvo con SCENARIO_VERBOSE=1.
    // El informe del escenario se escribe directamente en stdout.
    onConsoleLog: () => (process.env.SCENARIO_VERBOSE ? undefined : false),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './tests/mocks/server-only.ts'),
    },
  },
});
