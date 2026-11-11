/**
 * Escenario: primer contacto con la oveja. PDF p. 2, "Baaaa-d News".
 *
 * Qué protege (cada expectativa cita su pasaje en tests/adventures/wild-sheep-chase.pdf-spec.ts):
 *  - La oveja no habla mientras no se active Hablar con los Animales.
 *  - Mirar o preguntar no provoca tiradas ni cambios de localización.
 *  - Coger el pergamino lo pone en el inventario sin tirada; según el PDF, su sello de cera ya dice
 *    qué conjuro contiene (excepción de la aventura, pendiente de llegar en datos: TASK-080).
 */
import { describe, it, expect } from 'vitest';
import { expectScenarioToPass, type ScenarioDefinition } from './harness/runner';
import { PDF, cite } from '../adventures/wild-sheep-chase.pdf-spec';

const SCROLL = /pergamino|scroll/i;

export const scenario: ScenarioDefinition = {
    id: 'oveja-01-encuentro',
    title: 'Primer contacto con la oveja',
    adventure: 'public/adventures/la-caza-de-la-oveja-salvaje/la-caza-de-la-oveja-salvaje.json',
    seed: 1101,
    steps: [
        {
            action: 'Me acerco despacio a la oveja y la observo con atención',
            intent: 'Descripción breve de la oveja, sin moverse (el PDF no impide una prueba de Percepción).',
            expect(turn) {
                expect(turn.state.locationId).toBe('ciudad-o-pueblo');
                expect(turn.dmText.trim().length).toBeGreaterThan(0);
            },
        },
        {
            action: 'Le pregunto a la oveja: «¿Quién eres y qué quieres de nosotros?»',
            intent: 'La oveja solo puede balar o gesticular: es una pregunta, no una tirada.',
            expect(turn, h) {
                expect(turn.diceRolls).toHaveLength(0);
                // Solo habla cuando se activa el conjuro.
                expect(h.flag(turn.state, 'speak_with_animals'), cite(PDF.opening.speaksElvenAccent)).not.toBe(true);
            },
        },
        {
            action: 'Cojo con cuidado el pergamino que lleva en la boca y lo guardo',
            intent: 'El pergamino pasa al inventario sin tirada; su sello de cera dice qué conjuro contiene.',
            expect(turn, h) {
                expect(turn.diceRolls, cite(PDF.opening.approachesCaster)).toHaveLength(0);
                expect(h.partyHasItem(turn.state, SCROLL)).toBe(true);
                expect(h.flag(turn.state, 'took_scroll_speak_with_animals')).toBe(true);
                expect(h.flag(turn.state, 'speak_with_animals')).not.toBe(true);
            },
            knownIssues: [
                {
                    task: 'TASK-080',
                    description: `el pergamino debería quedar identificado al cogerlo: ${cite(PDF.opening.sealNamesScroll)}`,
                    check(turn, h) {
                        expect(h.flag(turn.state, 'identified_scroll_speak_with_animals')).toBe(true);
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
