
import { describe, it, expect } from 'vitest';
import { resolveSkillCheck } from '../skill-check-resolver';
import { Character } from '../../types';

// Mock simple de Character
const mockCharacter: Character = {
    id: 'char-1',
    name: 'Test Hero',
    race: 'Human',
    characterClass: 'Fighter',
    level: 1,
    sex: 'Male',
    background: 'Soldier',
    color: 'blue',
    personality: 'Brave',
    abilityScores: {
        fuerza: 16,     // Mod +3
        destreza: 14,   // Mod +2
        constitución: 14,
        inteligencia: 10, // Mod +0
        sabiduría: 12,  // Mod +1
        carisma: 8      // Mod -1
    },
    // abilityModifiers simulados pre-calculados
    abilityModifiers: {
        fuerza: 3,
        destreza: 2,
        constitución: 2,
        inteligencia: 0,
        sabiduría: 1,
        carisma: -1
    },
    proficiencyBonus: 2,
    skills: [
        { name: 'athletics', proficient: true, modifier: 5 }, // 3 (str) + 2 (pb)
        { name: 'stealth', proficient: false, modifier: 2 }   // 2 (dex)
    ],
    hp: { current: 10, max: 10 },
    ac: 15,
    controlledBy: 'Player',
    inventory: [],
    spells: []
};

describe('SkillCheckResolver', () => {

    it('should use pre-calculated modifier from character sheet (Happy Path)', () => {
        // Atletismo tiene +5 hardcoded en el mock
        // Mockeamos el randomness ejecutandola varias veces y verificando la matematica
        // Total = Die + 5

        // No podemos controlar el dado sin mockear rollD20, pero verificamos consistencia
        // Total - Modificador = Dado (entre 1 y 20)
        for (let i = 0; i < 10; i++) {
            const result = resolveSkillCheck(mockCharacter, 'athletics', 15, 'normal');
            const dieRoll = result.totalResult - 5;

            expect(result.skillCheckDetails?.skillName).toBe('athletics');
            expect(result.modifier).toBe(5); // Debe leer el +5
            expect(dieRoll).toBeGreaterThanOrEqual(1);
            expect(dieRoll).toBeLessThanOrEqual(20);
        }
    });

    it('should fallback to attribute calculation if skill is missing in sheet', () => {
        // Perception NO está en el array skills del mock
        // Debería usar Sabiduría (+1) + PB(0, no proficient implicito) = +1

        const result = resolveSkillCheck(mockCharacter, 'perception', 15, 'normal');

        expect(result.modifier).toBe(1); // Modificador calculado correctamente
        expect(result.skillCheckDetails?.skillName).toBe('perception');
    });

    it('should fallback to raw ability score calc if abilityModifiers is missing', () => {
        // Clonamos y borramos pre-calcs
        const rawChar = { ...mockCharacter, abilityModifiers: undefined };
        // Intimidación (Carisma 8) -> score 8 -> (8-10)/2 = -1

        const result = resolveSkillCheck(rawChar, 'intimidation', 10, 'normal');
        expect(result.modifier).toBe(-1);
    });

    it('should correctly determine Success vs Failure', () => {
        // CD muy baja (0) -> Siempre éxito (a menos que nat 1)
        // CD muy alta (100) -> Siempre fallo (a menos que nat 20)

        // Probamos 50 veces para pillar varios valores
        // Nota: Es un test probabilistico, pero robusto para checkear la logica booleana

        const resultWin = resolveSkillCheck(mockCharacter, 'athletics', 2, 'normal');
        // Con bono +5, min total es 6 (salvo pifia).
        if (resultWin.diceResults?.naturalFail) {
            expect(resultWin.outcome).toBe('pifia');
            expect(resultWin.skillCheckDetails?.isSuccess).toBe(false);
            expect(resultWin.skillCheckDetails?.isCriticalFailure).toBe(true);
        } else {
            expect(resultWin.outcome).toMatch(/success|crit/);
            expect(resultWin.skillCheckDetails?.isSuccess).toBe(true);
        }
    });

    it('should apply House Rule: Natural 20 is always Success', () => {
        // Necesitariamos mockear rollD20 para garantizar un 20.
        // Como no lo mockeamos aqui (integration style), confiamos en la lectura del codigo
        // O hacemos loop hasta que salga un 20 (fuerza bruta).

        let critFound = false;
        let limit = 0;
        while (!critFound && limit < 2000) {
            // CD imposible (100)
            const result = resolveSkillCheck(mockCharacter, 'athletics', 100, 'normal');
            if (result.diceResults?.naturalCrit) {
                expect(result.skillCheckDetails?.isSuccess).toBe(true);
                expect(result.skillCheckDetails?.isCriticalSuccess).toBe(true);
                expect(result.outcome).toBe('crit');
                critFound = true;
            }
            limit++;
        }
    });

    it('should apply House Rule: Natural 1 is always Failure', () => {
        let failFound = false;
        let limit = 0;
        while (!failFound && limit < 2000) {
            // CD trivial (-20)
            const result = resolveSkillCheck(mockCharacter, 'athletics', -20, 'normal');
            if (result.diceResults?.naturalFail) {
                expect(result.skillCheckDetails?.isSuccess).toBe(false); // A pesar de que total > CD
                expect(result.skillCheckDetails?.isCriticalFailure).toBe(true);
                expect(result.outcome).toBe('pifia');
                failFound = true;
            }
            limit++;
        }
    });

});
