import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { resolveStartingLocationId } from '@/lib/adventure-loader/starting-location';

/**
 * Regresión detectada en la prueba manual de la Fase 1: el conversor guarda la sala inicial en
 * `settings.startingLocationId`, pero el juego solo miraba la raíz y empezaba en `locations[0]`
 * (`ciudad-inicial`, vacía). Sin la oveja en la sala, el pergamino no entraba al inventario y el
 * narrador se inventaba la identidad de la oveja.
 */
const locations = [{ id: 'sala-vacia' }, { id: 'plaza' }, { id: 'torre' }];

describe('resolveStartingLocationId', () => {
    it('usa settings.startingLocationId, que es donde lo escribe el conversor', () => {
        expect(resolveStartingLocationId({ locations, settings: { startingLocationId: 'plaza' } })).toBe('plaza');
    });

    it('da prioridad al campo de la raíz si existe', () => {
        expect(resolveStartingLocationId({
            locations,
            startingLocationId: 'torre',
            settings: { startingLocationId: 'plaza' },
        })).toBe('torre');
    });

    it('ignora IDs que no existen y pasa al siguiente candidato', () => {
        expect(resolveStartingLocationId({
            locations,
            startingLocationId: 'inventada',
            settings: { startingLocationId: 'plaza' },
        })).toBe('plaza');
        expect(resolveStartingLocationId({ locations, settings: { startingLocationId: 'inventada' } })).toBe('sala-vacia');
    });

    it('sin datos de inicio usa la primera localización', () => {
        expect(resolveStartingLocationId({ locations })).toBe('sala-vacia');
        expect(resolveStartingLocationId({ locations: [] })).toBeUndefined();
    });
});

describe('aventuras incluidas', () => {
    const dir = path.resolve('public/adventures');
    const files = fs.readdirSync(dir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => path.join(dir, d.name, `${d.name}.json`))
        .filter(f => fs.existsSync(f));

    it('la oveja empieza en la sala donde está la oveja', () => {
        const data = JSON.parse(fs.readFileSync(
            path.join(dir, 'la-caza-de-la-oveja-salvaje', 'la-caza-de-la-oveja-salvaje.json'), 'utf8'));
        const startId = resolveStartingLocationId(data);
        const start = data.locations.find((l: any) => l.id === startId);
        const present = (start.entitiesPresent ?? []).map((e: any) => typeof e === 'string' ? e : e.entityId);
        expect(present).toContain('oveja-finethir-shinebright');
    });

    it.each(files)('%s declara una sala inicial que existe', (file) => {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const declared = data.startingLocationId ?? data.settings?.startingLocationId;
        if (declared) {
            expect(data.locations.map((l: any) => l.id)).toContain(declared);
        }
    });
});
