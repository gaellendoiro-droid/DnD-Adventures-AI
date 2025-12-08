
import { describe, it, expect } from 'vitest';
import { rollD20 } from '../dice-engine';

describe('DiceEngine Core Logic', () => {

    describe('rollD20 - Normal Mode', () => {
        it('should return a valid single d20 roll', () => {
            const result = rollD20('normal');

            expect(result.total).toBeGreaterThanOrEqual(1);
            expect(result.total).toBeLessThanOrEqual(20);
            expect(result.kept).toBe(result.die1);

            // En modo normal, die2 y discarded deben ser undefined
            expect(result.die2).toBeUndefined();
            expect(result.discarded).toBeUndefined();
        });
    });

    describe('rollD20 - Advantage Mode', () => {
        it('should roll two dice and keep the highest', () => {
            // Mockear math.random o hacer suficientes tiradas para garantizar comportamiento?
            // Por simplicidad en unit test sin mocks complejos, validamos la condicion logica 
            // de multiples tiradas.

            for (let i = 0; i < 50; i++) {
                const result = rollD20('advantage');

                expect(result.die2).toBeDefined();
                if (result.die2 !== undefined) {
                    const max = Math.max(result.die1, result.die2);
                    const min = Math.min(result.die1, result.die2);

                    expect(result.kept).toBe(max);
                    expect(result.discarded).toBe(min);
                    expect(result.total).toBe(max);
                }
            }
        });

        it('should functionally provide better results on average (statistical smoke test)', () => {
            let sumNormal = 0;
            let sumAdvantage = 0;
            const iterations = 10000;

            for (let i = 0; i < iterations; i++) {
                sumNormal += rollD20('normal').total;
                sumAdvantage += rollD20('advantage').total;
            }

            const avgNormal = sumNormal / iterations;
            const avgAdvantage = sumAdvantage / iterations;

            // Media d20 ~ 10.5
            // Media 2d20kh1 ~ 13.82
            expect(avgNormal).toBeCloseTo(10.5, 0); // Precision 0 (entero cercano)
            expect(avgAdvantage).toBeGreaterThan(avgNormal);
            expect(avgAdvantage).toBeGreaterThan(13.0);
        });
    });

    describe('rollD20 - Disadvantage Mode', () => {
        it('should roll two dice and keep the lowest', () => {
            for (let i = 0; i < 50; i++) {
                const result = rollD20('disadvantage');

                expect(result.die2).toBeDefined();
                if (result.die2 !== undefined) {
                    const max = Math.max(result.die1, result.die2);
                    const min = Math.min(result.die1, result.die2);

                    expect(result.kept).toBe(min);
                    expect(result.discarded).toBe(max);
                    expect(result.total).toBe(min);
                }
            }
        });

        it('should functionally provide worse results on average', () => {
            let sumDisadvantage = 0;
            const iterations = 10000;

            for (let i = 0; i < iterations; i++) {
                sumDisadvantage += rollD20('disadvantage').total;
            }

            const avgDisadvantage = sumDisadvantage / iterations;

            // Media 2d20kl1 ~ 7.17
            expect(avgDisadvantage).toBeLessThan(10.5);
            expect(avgDisadvantage).toBeLessThan(7.5);
        });
    });

    describe('Criticals and Fails', () => {
        it('should correctly flag natural crits', () => {
            // Force logic check manually or just check structure
            // Es dificil forzar un random, pero verificamos la estructura lógica
            // Mockeando Math.random para este test especifico seria ideal, pero
            // por velocidad usaremos property checking si sale.

            // No podemos garantizar que salga un 20 en loop corto, 
            // pero verificamos que SI sale, el flag sea true.

            let critFound = false;
            let failFound = false;
            let safety = 0;

            while ((!critFound || !failFound) && safety < 10000) {
                const res = rollD20('normal');
                if (res.total === 20) {
                    expect(res.naturalCrit).toBe(true);
                    critFound = true;
                }
                if (res.total === 1) {
                    expect(res.naturalFail).toBe(true);
                    failFound = true;
                }
                safety++;
            }
        });
    });

});
