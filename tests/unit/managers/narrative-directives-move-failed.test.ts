import { describe, it, expect } from 'vitest';
import { generateNarrativeDirectives } from '@/ai/flows/managers/narrative-turn-manager';

/**
 * Regresión detectada por el escenario oveja-05-viaje-torre: si el movimiento falla,
 * el narrador no recibía ninguna directiva y narraba el viaje igualmente.
 */
describe('generateNarrativeDirectives — MoveFailed', () => {
    it('genera una directiva que prohíbe narrar la llegada a otro lugar', () => {
        const directives = generateNarrativeDirectives(
            [{ type: 'MoveFailed', payload: { locationId: 'tierra de la torre de Noke', reason: 'Ubicación no encontrada.' } }],
            { actionType: 'move', targetId: 'tierra de la torre de Noke' },
            'Ubicación no encontrada.'
        );
        const text = directives.join('\n');
        expect(text).toMatch(/NO cambia de localización/);
        expect(text).toMatch(/Ubicación no encontrada/);
        expect(text).toMatch(/PROHIBIDO describir que el grupo llega/);
    });

    it('no genera la directiva de fallo cuando el grupo sí se mueve', () => {
        const directives = generateNarrativeDirectives(
            [{ type: 'PlayerMoved', payload: { fromLocationId: 'a', toLocationId: 'b' } }],
            { actionType: 'move', targetId: 'b' }
        );
        expect(directives.join('\n')).not.toMatch(/NO cambia de localización/);
    });
});
