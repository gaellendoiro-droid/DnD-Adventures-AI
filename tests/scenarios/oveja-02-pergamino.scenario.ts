/**
 * Escenario: el pergamino de Hablar con los Animales (La caza de la oveja salvaje).
 *
 * Qué protege:
 *  - Merryl (Mago) no tiene el conjuro en su lista de clase: leerlo exige una tirada de Arcanos.
 *  - La narración respeta el resultado de esa tirada (éxito → se activa; fallo → no se activa).
 *  - El efecto activo se refleja en el estado (flag y efecto en la ficha del lector).
 *  - Antes de activarlo, la oveja no revela su identidad; después sí puede hablar.
 */
import { describe, it, expect } from 'vitest';
import { expectScenarioToPass, type ScenarioDefinition } from './harness/runner';

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
            intent: 'Merryl hace una tirada de Arcanos; el resultado decide si el conjuro se activa.',
            expect(turn, h) {
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
            intent: 'Si el conjuro está activo, la oveja puede explicarse; si no, solo bala.',
            expect(turn, h) {
                expect(turn.diceRolls).toHaveLength(0);
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
