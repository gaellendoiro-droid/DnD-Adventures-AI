/**
 * Escenario: primer contacto con la oveja (La caza de la oveja salvaje).
 *
 * Qué protege:
 *  - La oveja no habla ni revela su identidad mientras no se active Hablar con los Animales.
 *  - Preguntar o mirar no provoca tiradas de dados ni cambios de localización.
 *  - Coger el pergamino lo pone en el inventario del grupo, sin tirada y sin revelar el conjuro.
 */
import { describe, it, expect } from 'vitest';
import { expectScenarioToPass, type ScenarioDefinition } from './harness/runner';

const SCROLL = /pergamino|scroll/i;

export const scenario: ScenarioDefinition = {
    id: 'oveja-01-encuentro',
    title: 'Primer contacto con la oveja',
    adventure: 'public/adventures/la-caza-de-la-oveja-salvaje/la-caza-de-la-oveja-salvaje.json',
    seed: 1101,
    steps: [
        {
            action: 'Me acerco despacio a la oveja y la observo con atención',
            intent: 'Descripción breve de la oveja; sin tiradas ni movimiento.',
            expect(turn) {
                expect(turn.state.locationId).toBe('ciudad-o-pueblo');
                expect(turn.diceRolls).toHaveLength(0);
                expect(turn.dmText.trim().length).toBeGreaterThan(0);
            },
        },
        {
            action: 'Le pregunto a la oveja: «¿Quién eres y qué quieres de nosotros?»',
            intent: 'La oveja solo puede balar o gesticular: es una pregunta, no una tirada.',
            expect(turn, h) {
                expect(turn.diceRolls).toHaveLength(0);
                expect(h.flag(turn.state, 'speak_with_animals')).not.toBe(true);
            },
        },
        {
            action: 'Cojo con cuidado el pergamino que lleva en la boca y lo guardo',
            intent: 'El pergamino pasa al inventario del grupo, sellado y sin revelar el conjuro.',
            expect(turn, h) {
                expect(turn.diceRolls).toHaveLength(0);
                expect(h.partyHasItem(turn.state, SCROLL)).toBe(true);
                expect(h.flag(turn.state, 'took_scroll_speak_with_animals')).toBe(true);
                expect(h.flag(turn.state, 'speak_with_animals')).not.toBe(true);
                // Sin identificar, el conjuro no debe nombrarse en lo que ve el jugador.
                const visible = [turn.dmText, ...turn.companionMessages.map(m => String(m.content))].join('\n');
                expect(visible).not.toMatch(/hablar con (los )?animales/i);
            },
        },
    ],
};

describe('Escenario narrativo', () => {
    it(`${scenario.id}: ${scenario.title}`, async () => {
        await expectScenarioToPass(scenario);
    });
});
