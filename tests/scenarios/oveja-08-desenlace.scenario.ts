/**
 * Escenario: el desenlace tras derrotar a Noke. PDF p. 6, "Big Choices", "Consequences" y
 * "Modified Wand of True Polymorph".
 *
 * Según el PDF: la vara está visiblemente dañada (quien sepa de Arcanos ve que la modificaron y es
 * poco fiable); en la plataforma central hay otro pergamino de Hablar con los Animales; el DM debe
 * insinuar el peligro de la vara; Shinebright quiere arriesgarse igualmente y solo un buen argumento
 * con Carisma (Persuasión) CD 15 le hace reconsiderarlo.
 */
import { describe, it, expect } from 'vitest';
import { expectScenarioToPass, type ScenarioDefinition } from './harness/runner';
import { NOKE_DERROTADO, OVEJA_ADVENTURE } from './harness/fixtures';
import { PDF, cite } from '../adventures/wild-sheep-chase.pdf-spec';

export const scenario: ScenarioDefinition = {
    id: 'oveja-08-desenlace',
    title: 'La vara dañada y la decisión de Shinebright',
    adventure: OVEJA_ADVENTURE,
    seed: 8808,
    initial: NOKE_DERROTADO,
    steps: [
        {
            action: 'Recojo la vara del suelo y la examino con cuidado',
            intent: 'La vara se ve dañada; el DM insinúa que es peligrosa.',
            expect(turn) {
                expect(turn.state.inCombat).toBe(false);
                expect(turn.dmText, cite(PDF.ending.damagedWand)).toMatch(/grieta|agrietad|dañad|runa|hierro|chispa|inestable/i);
            },
            knownIssues: [
                {
                    task: 'TASK-080',
                    description: `la vara debería pasar al inventario como objeto: ${cite(PDF.wand.charges)}`,
                    check(turn, h) {
                        expect(h.partyHasItem(turn.state, /vara|wand/i)).toBe(true);
                    },
                },
            ],
        },
        {
            action: 'Registramos las estanterías de la plataforma central',
            intent: 'Encuentran otro pergamino de Hablar con los Animales.',
            expect(turn) {
                expect(turn.dmText, cite(PDF.ending.secondScroll)).toMatch(/pergamino/i);
            },
            knownIssues: [
                {
                    task: 'TASK-080',
                    description: `el segundo pergamino debería entrar en el inventario: ${cite(PDF.ending.secondScroll)}`,
                    check(turn, h) {
                        expect(h.partyHasItem(turn.state, /pergamino|scroll/i)).toBe(true);
                    },
                },
            ],
        },
        {
            action: 'Le digo a Shinebright: «Esa vara está rota. Si la usas, puede matarte. Busquemos otra forma de devolverte tu cuerpo.»',
            intent: 'Intento de persuasión: Carisma (Persuasión) CD 15.',
            knownIssues: [
                {
                    task: 'TASK-093',
                    description: `convencerle exige Carisma (Persuasión) CD 15: ${cite(PDF.ending.persuasion)}`,
                    check(turn) {
                        const roll = turn.diceRolls.find(r => /persua/i.test(`${r.description ?? ''} ${JSON.stringify(r.skillCheckDetails ?? {})}`));
                        expect(roll).toBeDefined();
                        expect(roll.skillCheckDetails?.dc).toBe(15);
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
