#!/usr/bin/env node
/**
 * Lanza los escenarios narrativos con el modo indicado (funciona igual en Windows y en Linux).
 *
 *   node scripts/run-scenarios.mjs [replay|record|live] [filtro...]
 *
 * Ejemplos:
 *   npm run test:scenarios                         -> reproduce las grabaciones (CI, sin IA)
 *   npm run test:scenarios:record -- oveja-01      -> vuelve a grabar un escenario con la IA real
 *   npm run test:scenarios:live                    -> ejecuta contra la IA real sin grabar (mide latencia)
 */
import { spawnSync } from 'node:child_process';

const [mode = 'replay', ...filters] = process.argv.slice(2);
if (!['replay', 'record', 'live'].includes(mode)) {
    console.error(`Modo no válido: ${mode}. Usa replay, record o live.`);
    process.exit(2);
}

const result = spawnSync(
    'npx',
    ['vitest', 'run', '--config', 'vitest.scenarios.config.ts', ...filters],
    { stdio: 'inherit', shell: true, env: { ...process.env, SCENARIO_MODE: mode } },
);
process.exit(result.status ?? 1);
