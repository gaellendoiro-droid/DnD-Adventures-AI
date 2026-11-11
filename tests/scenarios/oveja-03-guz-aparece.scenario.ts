/**
 * Escenario: la historia de la oveja y la llegada de Guz (evento "Pastores y Rufianes").
 *
 * Según el storyline de la aventura, Guz aparece "poco después de que Shinebright comience a
 * contar su historia, o al intentar salir de la zona inicial". Hoy nada en el juego activa el flag
 * `guz_aparece`, así que Guz nunca entra en escena (TASK-084): se registra como problema conocido.
 */
import { describe, it, expect } from 'vitest';
import { expectScenarioToPass, type ScenarioDefinition } from './harness/runner';
import { OVEJA_ADVENTURE, TRAS_LEER_PERGAMINO } from './harness/fixtures';

export const scenario: ScenarioDefinition = {
    id: 'oveja-03-guz-aparece',
    title: 'La oveja cuenta su historia y llega Guz',
    adventure: OVEJA_ADVENTURE,
    seed: 3303,
    initial: TRAS_LEER_PERGAMINO,
    steps: [
        {
            action: 'Le digo a la oveja: «Ahora que podemos entenderte, cuéntanos qué te ha pasado»',
            intent: 'La oveja empieza a contar su historia; puede revelar su identidad porque el conjuro está activo.',
            expect(turn, h) {
                expect(turn.diceRolls).toHaveLength(0);
                expect(h.flag(turn.state, 'speak_with_animals')).toBe(true);
                expect(turn.state.locationId).toBe('ciudad-o-pueblo');
            },
            knownIssues: [
                {
                    task: 'TASK-084',
                    description: 'el evento "Pastores y Rufianes" debería activar guz_aparece cuando la oveja empieza a contar su historia',
                    check(turn, h) {
                        expect(h.flag(turn.state, 'guz_aparece')).toBe(true);
                    },
                },
            ],
        },
        {
            action: 'Cogemos a la oveja y nos marchamos de la plaza camino del bosque',
            intent: 'Intentar salir de la zona inicial debe disparar la llegada de Guz y cortar el viaje.',
            knownIssues: [
                {
                    task: 'TASK-084',
                    description: 'al intentar salir de la plaza, Guz debería aparecer (guz_aparece) y el grupo seguir en ciudad-o-pueblo',
                    check(turn, h) {
                        expect(h.flag(turn.state, 'guz_aparece')).toBe(true);
                        expect(turn.state.locationId).toBe('ciudad-o-pueblo');
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
