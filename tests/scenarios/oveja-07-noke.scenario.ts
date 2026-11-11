/**
 * Escenario: el grupo se enfrenta a Ahmed Noke en la plataforma central. PDF p. 5, "Roleplaying Noke".
 *
 * Según el PDF, Noke trabaja en la plataforma central; al ver al grupo exige que le devuelvan la
 * oveja a cambio de no destruirlos. Si hablan, explica por qué odia a Shinebright, presume de sus
 * logros y pregunta por "su hombre, Guz". Si se niegan a entregar a Shinebright, ordena atacar.
 *
 * Hoy no se puede llegar a la torre caminando (TASK-085): se parte de la plataforma central.
 */
import { describe, it, expect } from 'vitest';
import { expectScenarioToPass, type ScenarioDefinition } from './harness/runner';
import { ANTE_NOKE, OVEJA_ADVENTURE } from './harness/fixtures';
import { PDF, cite } from '../adventures/wild-sheep-chase.pdf-spec';

const names = (order: any[]) => order.map(c => String(c.characterName ?? c.name ?? ''));

export const scenario: ScenarioDefinition = {
    id: 'oveja-07-noke',
    title: 'Confrontación con Noke',
    adventure: OVEJA_ADVENTURE,
    seed: 7707,
    initial: ANTE_NOKE,
    steps: [
        {
            action: 'Le digo al mago: «Venimos de parte de Finethir Shinebright. Sabemos lo que le hiciste.»',
            intent: 'Noke exige la oveja y amenaza con destruirlos; todavía no hay combate.',
            expect(turn) {
                expect(turn.state.locationId).toBe('plataforma-central');
                expect(turn.state.inCombat, cite(PDF.noke.refusalCombat)).toBe(false);
            },
            knownIssues: [
                {
                    task: 'TASK-093',
                    description: `Noke debería exigir que le devuelvan la oveja: ${cite(PDF.noke.demands)}`,
                    check(turn) {
                        expect(turn.dmText).toMatch(/devol|devuélv|entreg/i);
                        expect(turn.dmText).toMatch(/oveja/i);
                    },
                },
            ],
        },
        {
            action: 'Le pregunto: «¿Por qué le traicionaste? ¿Y qué esperabas conseguir?»',
            intent: 'Noke explica su resentimiento y presume de sus logros; puede preguntar por Guz.',
            expect(turn) {
                expect(turn.state.inCombat).toBe(false);
                expect(turn.diceRolls).toHaveLength(0);
                expect(turn.dmText.length, cite(PDF.noke.talks)).toBeGreaterThan(80);
            },
            knownIssues: [
                {
                    task: 'TASK-093',
                    description: `Noke debería preguntar por Guz: ${cite(PDF.noke.talks)}`,
                    check(turn) {
                        expect(turn.dmText).toMatch(/Guz/);
                    },
                },
            ],
        },
        {
            action: 'No pensamos devolverte la oveja. Desenvaino el mandoble y avanzo hacia él.',
            intent: 'Ante la negativa, Noke ordena atacar: empieza el combate con Noke.',
            expect(turn) {
                expect(turn.state.inCombat, cite(PDF.noke.refusalCombat)).toBe(true);
                expect(names(turn.state.initiativeOrder).some(n => /noke/i.test(n))).toBe(true);
            },
            knownIssues: [
                {
                    task: 'TASK-096',
                    description: `la boca balbuceante no debería estar en el combate desde el principio (el combate ignora presenceFlag): ${cite(PDF.noke.mouther)}`,
                    check(turn) {
                        expect(names(turn.state.initiativeOrder).some(n => /boca/i.test(n))).toBe(false);
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
