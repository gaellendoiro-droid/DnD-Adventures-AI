import { describe, it, expect } from 'vitest';
import { addReturnConnections, checkAdventureContent, reachableLocations } from '@/lib/adventure-loader/content-checks';
import { remapIdsFromPrevious, resolveShortIds } from '../../../scripts/converter/stable-ids';
import { applyStatBlock, setCreatureCount, toGameItem } from '../../../scripts/converter/pdf-extras';

const base = () => ({
    settings: { startingLocationId: 'plaza' },
    locations: [
        { id: 'plaza', name: 'Plaza', connections: [{ targetId: 'bosque', direction: 'sur' }],
          entitiesPresent: ['oveja', { entityId: 'bandido', presenceFlag: 'bandido_llega' }, { entityId: 'jefe', presenceFlag: 'jefe_derrotado' }] },
        { id: 'bosque', name: 'Bosque', connections: [] as any[] },
        { id: 'torre', name: 'Torre', connections: [] },
    ],
    entities: [{ id: 'oveja', name: 'Oveja' }, { id: 'bandido', name: 'Bandido' }, { id: 'jefe', name: 'Jefe' }],
    items: [] as any[],
    scenes: [] as any[],
});

describe('checkAdventureContent', () => {
    it('detecta localizaciones inalcanzables y flags de presencia que nada activa', () => {
        const issues = checkAdventureContent(base());
        expect(issues.map(i => `${i.code}:${i.ref}`)).toEqual(expect.arrayContaining([
            'UNREACHABLE_LOCATION:torre',
            'FLAG_NEVER_SET:bandido_llega',
        ]));
        // Los flags de derrota los pone el motor, no una escena
        expect(issues.some(i => i.ref === 'jefe_derrotado')).toBe(false);
    });

    it('acepta una aventura con escenas que activan sus flags y todo alcanzable', () => {
        const data = base();
        data.locations[1].connections.push({ targetId: 'torre', direction: 'norte' } as any);
        data.scenes = [{
            id: 'llega-el-bandido', title: 'Llega el bandido', source: { section: 'X', page: 1 }, guidance: '...',
            startsWhen: { all: [{ event: 'talked_to', target: 'oveja' }], afterTurns: 1 },
            onStart: { setFlags: ['bandido_llega'] },
        }];
        expect(checkAdventureContent(data)).toEqual([]);
    });

    it('detecta IDs inexistentes en escenas y objetos', () => {
        const data = base();
        data.scenes = [{ id: 's', title: 's', source: { section: 'X' }, guidance: '', startsWhen: { event: 'talked_to', target: 'fantasma' } }];
        data.items = [{ id: 'vara', name: 'Vara', startsWith: { entityId: 'nadie' } }];
        const refs = checkAdventureContent(data).filter(i => i.code === 'UNKNOWN_ID').map(i => i.ref);
        expect(refs).toEqual(expect.arrayContaining(['fantasma', 'nadie']));
    });
});

describe('addReturnConnections', () => {
    it('añade la vuelta con la dirección opuesta', () => {
        const data = base();
        expect(addReturnConnections(data)).toBe(1);
        expect(data.locations[1].connections[0]).toMatchObject({ targetId: 'plaza', direction: 'norte' });
        expect(reachableLocations(data).has('bosque')).toBe(true);
    });
});

describe('remapIdsFromPrevious', () => {
    it('recupera los IDs anteriores por nombre y actualiza todas las referencias', () => {
        const data = {
            settings: { startingLocationId: 'plaza-del-pueblo' },
            locations: [{ id: 'plaza-del-pueblo', name: 'Plaza', connections: [], entitiesPresent: [{ entityId: 'oveja-magica', presenceFlag: 'x' }] }],
            entities: [{ id: 'oveja-magica', name: 'Oveja' }],
        };
        const previous = { locations: [{ id: 'plaza', name: 'Plaza' }], entities: [{ id: 'oveja', name: 'oveja' }] };
        const renamed = remapIdsFromPrevious(data, previous);
        expect(renamed).toHaveLength(2);
        expect(data.locations[0].id).toBe('plaza');
        expect(data.settings.startingLocationId).toBe('plaza');
        expect(data.locations[0].entitiesPresent[0]).toEqual({ entityId: 'oveja', presenceFlag: 'x' });
        expect(data.entities[0].id).toBe('oveja');
    });
});

describe('applyStatBlock', () => {
    it('aplica CA, PG, características (con modificadores) y acciones del PDF', () => {
        const stats = applyStatBlock(
            { hp: 10, ac: 10, abilityScores: { fuerza: 10, destreza: 10 }, abilityModifiers: { fuerza: 0, destreza: 0 }, actions: [] },
            { ac: 14, hp: 67, abilityScores: { fuerza: 16, destreza: 12 }, actions: [{ name: 'Mandoble giratorio', desc: '...' }] },
        );
        expect(stats).toMatchObject({ ac: 14, hp: 67, statsSource: 'pdf' });
        expect(stats.abilityScores).toMatchObject({ fuerza: 16, destreza: 12 });
        expect(stats.abilityModifiers).toMatchObject({ fuerza: 3, destreza: 1 });
        expect(stats.actions).toHaveLength(1);
    });
});

describe('resolveShortIds', () => {
    it('sustituye un ID abreviado por el único ID existente que lo contiene', () => {
        const data: any = {
            locations: [{ id: 'torre-de-noke' }],
            entities: [{ id: 'ahmed-noke-mago-humano' }, { id: 'oveja-finethir-shinebright' }],
            items: [{ id: 'vara', startsWith: { entityId: 'shinebright' } }],
            scenes: [{ id: 's', startsWhen: { all: [{ event: 'talked_to', target: 'ahmed-noke' }] } }],
        };
        resolveShortIds(data);
        expect(data.items[0].startsWith.entityId).toBe('oveja-finethir-shinebright');
        expect(data.scenes[0].startsWhen.all[0].target).toBe('ahmed-noke-mago-humano');
    });
    it('resuelve un ID que solo difiere en palabras vacías', () => {
        const data: any = { items: [{ id: 'pergamino-de-hablar-con-animales' }],
            scenes: [{ id: 's', startsWhen: { event: 'item_used', target: 'pergamino-hablar-con-animales' } }] };
        resolveShortIds(data);
        expect(data.scenes[0].startsWhen.target).toBe('pergamino-de-hablar-con-animales');
    });
    it('no toca un ID ambiguo', () => {
        const data: any = { entities: [{ id: 'ahmed-noke' }, { id: 'noke-el-joven' }], items: [{ id: 'x', startsWith: { entityId: 'noke' } }] };
        resolveShortIds(data);
        expect(data.items[0].startsWith.entityId).toBe('noke');
    });
    it('solo resuelve contra IDs del mismo tipo (una entidad no se resuelve con una escena)', () => {
        const data: any = {
            entities: [{ id: 'oveja-finethir-shinebright' }],
            scenes: [{ id: 'conversacion-con-shinebright' }],
            items: [{ id: 'p', startsWith: { entityId: 'shinebright' } }],
        };
        resolveShortIds(data);
        expect(data.items[0].startsWith.entityId).toBe('oveja-finethir-shinebright');
    });
});

describe('toGameItem', () => {
    const act = (checkRule: string, check?: any) => toGameItem({ id: 'x', activation: { method: 'read_aloud', checkRule, check } }).activation;
    it('"no_check" → check null (excepción del PDF: sin tirada)', () => {
        expect(act('no_check')).toEqual({ method: 'read_aloud', check: null });
    });
    it('"official_rules" → sin check (reglas oficiales)', () => {
        expect(act('official_rules', { skill: 'Arcana', dc: 10 })).toEqual({ method: 'read_aloud' });
    });
    it('"pdf_check" → la tirada del PDF', () => {
        expect(act('pdf_check', { skill: 'Arcana', dc: 17 }).check).toEqual({ skill: 'Arcana', dc: 17 });
    });
});

describe('setCreatureCount', () => {
    it('ajusta las copias conservando la condición de presencia y el resto de entidades', () => {
        const loc: any = { entitiesPresent: ['jefe', { entityId: 'simio', presenceFlag: 'f' }, { entityId: 'simio', presenceFlag: 'f' }] };
        expect(setCreatureCount(loc, 'simio', 3)).toBe(true);
        expect(loc.entitiesPresent).toEqual(['jefe', ...Array(3).fill({ entityId: 'simio', presenceFlag: 'f' })]);
    });
    it('no añade entidades que no estaban ni acepta cantidades absurdas', () => {
        const loc: any = { entitiesPresent: ['jefe'] };
        expect(setCreatureCount(loc, 'simio', 3)).toBe(false);
        expect(setCreatureCount(loc, 'jefe', 0)).toBe(false);
        expect(loc.entitiesPresent).toEqual(['jefe']);
    });
});
