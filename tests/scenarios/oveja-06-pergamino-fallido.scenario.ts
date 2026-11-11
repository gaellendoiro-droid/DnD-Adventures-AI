/**
 * Escenario: la partida manual del 11-11-2026, tal cual la jugó el usuario.
 *
 * Galador identifica el pergamino, falla al leerlo (no es de su clase) y se lo pasa a Merryl,
 * que sí lo activa. Después el grupo habla con la oveja.
 *
 * Qué protege:
 *  - Que el conjuro activado siga activo en los turnos siguientes (no se vuelve a "leer" el
 *    pergamino ni se pide una tirada para hablar con la oveja).
 *  - Que con el conjuro activo la oveja hable sin los textos de reemplazo de la barrera
 *    ("antagonista oculto", "artefacto arcano"…).
 *  - Que el narrador sepa quién tiene el pergamino.
 */
import { describe, it, expect } from 'vitest';
import { expectScenarioToPass, type ScenarioDefinition } from './harness/runner';
import { OVEJA_ADVENTURE } from './harness/fixtures';

const SCROLL = /pergamino|scroll/i;
const MASK_REPLACEMENTS = /antagonista oculto|artefacto arcano|criatura transformada|un perseguidor/i;
const flags = (turn: any) => JSON.stringify(turn.state.worldState?.globalFlags ?? {});

export const scenario: ScenarioDefinition = {
    id: 'oveja-06-pergamino-fallido',
    title: 'Galador falla al leer el pergamino y Merryl lo activa',
    adventure: OVEJA_ADVENTURE,
    seed: 6677,
    // Las tiradas de la partida manual: Galador 18 (descifrar), Galador 5 (leer, falla), Merryl 9 (+6, éxito).
    forcedD20: [18, 5, 9],
    steps: [
        {
            action: 'Cojo el pergamino que lleva la oveja en la boca',
            intent: 'El pergamino pasa al inventario de Galador.',
            expect(turn, h) {
                expect(h.itemHolder(turn.state, SCROLL)).toBe('Galador');
            },
        },
        {
            action: 'Intento descifrar el pergamino',
            intent: 'Galador hace una tirada de Arcanos para identificarlo.',
            expect(turn) {
                expect(turn.diceRolls.length).toBe(1);
            },
        },
        {
            action: 'Leo el pergamino para activarlo.',
            intent: 'Galador no tiene el conjuro en su lista: tirada de Arcanos CD 10.',
            expect(turn, h) {
                expect(turn.diceRolls.length).toBe(1);
                const active = h.flag(turn.state, 'speak_with_animals') === true;
                expect(active, `flags: ${flags(turn)}`).toBe(turn.diceRolls[0]?.skillCheckDetails?.isSuccess === true);
            },
        },
        {
            action: 'Creo que no soy capaz. Merryl toma, prueba tú a activarlo.',
            intent: 'Merryl tira Arcanos y, si acierta, el conjuro queda activo.',
            expect(turn, h) {
                expect(turn.diceRolls.length).toBe(1);
                expect(String(turn.diceRolls[0].roller ?? '')).toMatch(/merryl/i);
                expect(turn.dmText, 'el pergamino lo tenía Galador, no la oveja').not.toMatch(/fauces|de la boca de la oveja/i);
            },
        },
        {
            action: 'Veamos qué nos tiene que contar este animalillo...',
            intent: 'Con el conjuro activo basta con hablar: sin tiradas y sin volver a leer el pergamino.',
            expect(turn, h) {
                expect(h.flag(turn.state, 'speak_with_animals'), `flags: ${flags(turn)}`).toBe(true);
                expect(turn.diceRolls).toHaveLength(0);
                expect(turn.dmText).not.toMatch(/lee .*pergamino|pergamino se consume/i);
            },
        },
        {
            action: 'Dinos, oveja, ¿qué te preocupa?',
            intent: 'La oveja habla con sus nombres reales, sin textos de reemplazo.',
            expect(turn, h) {
                expect(h.flag(turn.state, 'speak_with_animals'), `flags: ${flags(turn)}`).toBe(true);
                expect(turn.dmText).not.toMatch(MASK_REPLACEMENTS);
            },
        },
    ],
};

describe('Escenario narrativo', () => {
    it(`${scenario.id}: ${scenario.title}`, async () => {
        await expectScenarioToPass(scenario);
    });
});
