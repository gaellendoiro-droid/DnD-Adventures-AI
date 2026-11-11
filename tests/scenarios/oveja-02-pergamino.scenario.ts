/**
 * Escenario: el pergamino de Hablar con los Animales. PDF p. 2, "Baaaa-d News".
 *
 * Según el PDF, el pergamino (Modified) se activa con solo leerlo en voz alta, sin tirada, y todo
 * el grupo oye a la oveja hablar. Es una EXCEPCIÓN de esta aventura a las reglas oficiales (que
 * piden Arcanos a quien no tiene el conjuro en su clase) y debe llegar en datos (TASK-080). Hasta
 * entonces el juego aplica la regla oficial y la diferencia se registra como problema conocido.
 *
 * Qué protege:
 *  - El conjuro queda activo y la oveja se presenta como Finethir Shinebright.
 *  - Si hay tirada (regla oficial), la narración y el estado coinciden con el resultado.
 */
import { describe, it, expect } from 'vitest';
import { expectScenarioToPass, type ScenarioDefinition } from './harness/runner';
import { PDF, cite } from '../adventures/wild-sheep-chase.pdf-spec';
import { GUZ_FLAG } from './harness/fixtures';

const SCROLL = /pergamino|scroll/i;

export const scenario: ScenarioDefinition = {
    id: 'oveja-02-pergamino',
    title: 'Leer el pergamino de la oveja',
    adventure: 'public/adventures/la-caza-de-la-oveja-salvaje/la-caza-de-la-oveja-salvaje.json',
    seed: 2202,
    steps: [
        {
            action: 'Cojo el pergamino que la oveja lleva en la boca',
            intent: 'El pergamino pasa al inventario sin tirada.',
            expect(turn, h) {
                expect(turn.diceRolls).toHaveLength(0);
                expect(h.partyHasItem(turn.state, SCROLL)).toBe(true);
            },
        },
        {
            action: 'Le paso el pergamino a Merryl y le digo: «Merryl, tú que eres maga, léelo, por favor»',
            intent: 'Leído en voz alta, el conjuro se activa (PDF: sin tirada; hoy: Arcanos de Merryl).',
            knownIssues: [
                {
                    task: 'TASK-080',
                    description: `leer el pergamino no debería pedir tirada: ${cite(PDF.opening.readAloudActivates)}`,
                    check(turn) {
                        expect(turn.diceRolls).toHaveLength(0);
                    },
                },
            ],
            expect(turn, h) {
                expect(h.flag(turn.state, 'speak_with_animals'), cite(PDF.opening.readAloudActivates)).toBe(true);
                expect(turn.diceRolls.length).toBeGreaterThanOrEqual(1);
                const arcana = turn.diceRolls.find(r =>
                    /arcan/i.test(`${r.description ?? ''} ${JSON.stringify(r.skillCheckDetails ?? {})}`)
                );
                expect(arcana, 'Debe haber una tirada de Arcanos').toBeDefined();
                expect(String(arcana.roller ?? '')).toMatch(/merryl/i);

                const active = h.flag(turn.state, 'speak_with_animals') === true;
                const success: boolean | undefined =
                    typeof arcana.skillCheckDetails?.isSuccess === 'boolean'
                        ? arcana.skillCheckDetails.isSuccess
                        : arcana.outcome
                            ? !/fail|pifia/i.test(String(arcana.outcome))
                            : undefined;
                if (success !== undefined) {
                    // La narración y el estado deben coincidir con la tirada.
                    expect(active).toBe(success);
                }
                if (active) {
                    const merryl = h.character(turn.state, 'Merryl');
                    expect((merryl?.activeEffects ?? []).map((e: any) => e.id)).toContain('speak_with_animals');
                }
            },
        },
        {
            action: 'Le pregunto a la oveja: «¿Quién eres y qué te ha pasado?»',
            intent: 'La oveja se presenta como Finethir Shinebright y pide ayuda para recuperar un artefacto.',
            knownIssues: [
                {
                    task: 'TASK-084',
                    description: `al empezar su historia deberían oírse aullidos y llegar Guz: ${cite(PDF.opening.howlingInterrupts)}`,
                    check(turn, h) {
                        expect(h.flag(turn.state, GUZ_FLAG)).toBe(true);
                    },
                },
            ],
            expect(turn, h) {
                expect(turn.diceRolls).toHaveLength(0);
                expect(turn.dmText, cite(PDF.opening.introducesHimself)).toMatch(/Finethir|Shinebright/);
                // La invariante general de spoilers ya comprueba el caso sin conjuro activo.
                expect(h.itemHolder(turn.state, /scroll-speak_with_animals/)).not.toBe('Galador');
            },
        },
    ],
};

describe('Escenario narrativo', () => {
    it(`${scenario.id}: ${scenario.title}`, async () => {
        await expectScenarioToPass(scenario);
    });
});
