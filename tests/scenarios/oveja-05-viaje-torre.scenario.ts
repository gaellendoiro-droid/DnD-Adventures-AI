/**
 * Escenario: viaje desde la plaza hasta la torre de Noke. PDF p. 4, "The House in the Woods".
 *
 * Con el mapa del conversor v2 ya se llega del camino a la torre (TASK-085). Subir entre
 * plataformas sigue registrado como problema conocido.
 */
import { describe, it, expect } from 'vitest';
import { expectScenarioToPass, type ScenarioDefinition } from './harness/runner';
import { GUZ_DERROTADO, OVEJA_ADVENTURE } from './harness/fixtures';
import { PDF, cite } from '../adventures/wild-sheep-chase.pdf-spec';

const TOWER = /^(torre-de-noke|plataforma-|cabañas|retrete)/;

export const scenario: ScenarioDefinition = {
    id: 'oveja-05-viaje-torre',
    title: 'Viaje a la torre de Noke',
    adventure: OVEJA_ADVENTURE,
    seed: 5505,
    initial: GUZ_DERROTADO,
    steps: [
        {
            action: 'Partimos con la oveja hacia la torre de Noke',
            intent: 'El grupo sale de la plaza por la única conexión y llega al bosque.',
            knownIssues: [
                {
                    task: 'TASK-078',
                    description: 'el intérprete inventa el destino ("tierra de la torre de Noke") en vez de usar un ID real, y el grupo no sale de la plaza',
                    check(turn) {
                        expect(turn.state.locationId).toBe('la-casa-en-el-bosque');
                    },
                },
                {
                    task: 'TASK-081',
                    description: 'si el grupo no se mueve, el DM no debe narrar que sale de la plaza (el modelo ignora la directiva de MoveFailed)',
                    check(turn) {
                        if (turn.state.locationId === 'ciudad-o-pueblo') {
                            expect(turn.dmText).not.toMatch(/sal[íi]s|abandon|dej[áa]is atr[áa]s|os adentr|lleg[áa]is|queda atr[áa]s/i);
                        }
                    },
                },
            ],
        },
        {
            action: 'Nos acercamos a la torre y entramos',
            intent: 'Desde el bosque se debería poder llegar a la torre.',
            expect(turn) {
                expect(turn.state.locationId, cite(PDF.house.path)).toMatch(TOWER);
            },
        },
        {
            action: 'Subimos hasta la plataforma central',
            intent: 'Dentro de la torre se debería poder subir entre plataformas.',
            knownIssues: [
                {
                    task: 'TASK-085',
                    description: `las plataformas de la torre no tienen conexiones entre sí: ${cite(PDF.house.platforms)}`,
                    check(turn) {
                        expect(turn.state.locationId).toBe('plataforma-central');
                    },
                },
            ],
        },
    ],
};

describe('Escenario narrativo', () => {
    it(`${scenario.id}: ${scenario.title}`, async () => {
        await expectScenarioToPass(scenario);
    });
});
