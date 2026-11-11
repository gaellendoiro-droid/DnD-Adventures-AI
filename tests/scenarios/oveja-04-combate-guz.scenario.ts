/**
 * Escenario: combate contra Guz y sus bestias en la plaza.
 *
 * Parte de una partida en la que Guz ya ha aparecido (guz_aparece activo), porque hoy el juego no
 * activa ese flag por sí mismo (TASK-084). Protege el flujo completo de combate: inicio por
 * ataque del jugador, iniciativa, turnos automáticos de la IA, tiradas de ataque y estado.
 */
import { describe, it, expect } from 'vitest';
import { expectScenarioToPass, type ScenarioDefinition } from './harness/runner';
import { GUZ_EN_LA_PLAZA, OVEJA_ADVENTURE } from './harness/fixtures';

const names = (order: any[]) => order.map(c => String(c.characterName ?? c.name ?? ''));

export const scenario: ScenarioDefinition = {
    id: 'oveja-04-combate-guz',
    title: 'Combate contra Guz en la plaza',
    adventure: OVEJA_ADVENTURE,
    seed: 4404,
    initial: GUZ_EN_LA_PLAZA,
    autoContinueCombat: true,
    knownFailures: [
        {
            task: 'TASK-089',
            description: 'el turno de Elara falla con "Cannot read properties of undefined (reading \'split\')" y el error se muestra al jugador',
            match: /Hubo un error al procesar el turno de Elara/,
        },
        {
            task: 'TASK-089',
            description: 'un turno automático de la IA no produce ningún mensaje',
            match: /continuar turno\): El turno no produjo ningún mensaje/,
        },
        {
            task: 'TASK-090',
            description: 'al volver a atacar a Guz el objetivo no se resuelve y el jugador ve "TARGET_NOT_FOUND"',
            match: /TARGET_NOT_FOUND|Galador debe tirar para atacar/,
        },
    ],
    steps: [
        {
            action: 'Me niego a entregar la oveja, desenvaino el mandoble y ataco a Guz',
            intent: 'Empieza el combate: iniciativa con el grupo y con Guz.',
            expect(turn) {
                expect(turn.state.inCombat).toBe(true);
                const order = names(turn.state.initiativeOrder);
                expect(order.some(n => /galador/i.test(n))).toBe(true);
                expect(order.some(n => /guz/i.test(n))).toBe(true);
                expect(turn.diceRolls.length).toBeGreaterThanOrEqual(1);
            },
            knownIssues: [
                {
                    task: 'TASK-088',
                    description: 'la oveja (aliada del grupo) no debería entrar en la iniciativa como combatiente',
                    check(turn) {
                        expect(names(turn.state.initiativeOrder).some(n => /oveja/i.test(n))).toBe(false);
                    },
                },
            ],
        },
        {
            action: 'Vuelvo a atacar a Guz con el mandoble',
            intent: 'Galador hace una tirada de ataque contra Guz en su turno.',
            expect(turn) {
                const attack = turn.diceRolls.find(r => /galador/i.test(String(r.roller)));
                expect(attack, 'Galador debe tirar para atacar').toBeDefined();
            },
        },
    ],
};

describe('Escenario narrativo', () => {
    it(`${scenario.id}: ${scenario.title}`, async () => {
        await expectScenarioToPass(scenario);
    });
});
