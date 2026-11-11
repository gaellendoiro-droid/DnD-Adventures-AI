import { describe, it, expect } from 'vitest';
import { createSeededRandom } from '../../scenarios/harness/determinism';

/**
 * El arnés de escenarios da a cada punto del código su propia secuencia aleatoria: el orden en que
 * terminan las llamadas en paralelo no debe cambiar los números que recibe cada uno.
 */
function rollInitiative(random: () => number) {
    return Math.floor(random() * 20) + 1;
}
function generateId(random: () => number) {
    return Math.floor(random() * 1e6);
}

describe('createSeededRandom', () => {
    it('cada punto del código recibe la misma secuencia aunque cambie el orden de las llamadas', () => {
        const a = createSeededRandom(7707);
        const firstOrder = [rollInitiative(a), generateId(a), rollInitiative(a), generateId(a)];

        const b = createSeededRandom(7707);
        const idsFirst = [generateId(b), generateId(b)];
        const rolls = [rollInitiative(b), rollInitiative(b)];

        expect(rolls).toEqual([firstOrder[0], firstOrder[2]]);
        expect(idsFirst).toEqual([firstOrder[1], firstOrder[3]]);
    });

    it('la misma semilla da los mismos valores y otra semilla da otros', () => {
        const seq = (seed: number) => {
            const r = createSeededRandom(seed);
            return [rollInitiative(r), rollInitiative(r), rollInitiative(r)];
        };
        expect(seq(1)).toEqual(seq(1));
        expect(seq(1)).not.toEqual(seq(2));
    });
});
