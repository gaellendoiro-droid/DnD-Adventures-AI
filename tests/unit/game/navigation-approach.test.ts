import { describe, it, expect } from 'vitest';
import { isTargetInCurrentLocation } from '@/lib/game/systems/navigation-system';

/**
 * Regresión detectada por el escenario oveja-01-encuentro: "Me acerco a la oveja" llega como
 * un `move` con la oveja como destino. No es un viaje fallido, sino acercarse a algo de la sala.
 */
const adventureData = {
    locations: [
        {
            id: 'plaza',
            entitiesPresent: ['oveja-finethir-shinebright', { entityId: 'guz-semiorco', presenceFlag: 'guz_aparece' }],
            interactables: [{ id: 'fuente', name: 'Fuente de piedra' }],
        },
        { id: 'bosque', entitiesPresent: [] },
    ],
    entities: [
        { id: 'oveja-finethir-shinebright', name: 'Oveja' },
        { id: 'guz-semiorco', name: 'Guz' },
    ],
};
const ctx = { adventureData, currentLocationId: 'plaza' };

describe('isTargetInCurrentLocation', () => {
    it('reconoce entidades presentes por id o por nombre', () => {
        expect(isTargetInCurrentLocation('oveja-finethir-shinebright', ctx)).toBe(true);
        expect(isTargetInCurrentLocation('la oveja', ctx)).toBe(true);
        expect(isTargetInCurrentLocation('Oveja', ctx)).toBe(true);
    });

    it('reconoce interactuables de la sala, sin importar tildes', () => {
        expect(isTargetInCurrentLocation('fuente de piedra', ctx)).toBe(true);
    });

    it('no confunde un destino real o inventado con algo de la sala', () => {
        expect(isTargetInCurrentLocation('bosque', ctx)).toBe(false);
        expect(isTargetInCurrentLocation('tierra de la torre de Noke', ctx)).toBe(false);
        expect(isTargetInCurrentLocation('ab', ctx)).toBe(false);
    });

    it('solo mira la localización actual', () => {
        expect(isTargetInCurrentLocation('oveja', { adventureData, currentLocationId: 'bosque' })).toBe(false);
    });
});
