import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { buildActionOptions, resolveActionV2, targetIds, toLegacyInterpretation, type RawActionV2 } from '@/lib/game/core-v2/actions';
import { buildFactPacket, renderFactPacket, sceneGuidance, trimHistory, type FactPacketInput } from '@/lib/game/core-v2/fact-packet';
import { defeatedEntityIds, deriveTurnEvents, presentEntityIds } from '@/lib/game/core-v2/legacy-bridge';
import { safeNarration, validateNarration } from '@/lib/game/core-v2/narration-validator';
import { createCoreV2State } from '@/lib/game/core-v2/state';

/** Paso D del núcleo v2: acciones cerradas, paquete de hechos y validador, con la oveja real. */
const adventure = JSON.parse(fs.readFileSync(
    path.resolve('public/adventures/la-caza-de-la-oveja-salvaje/la-caza-de-la-oveja-salvaje.json'), 'utf8'));
const scroll = adventure.items.find((i: any) => i.spell?.id === 'speak_with_animals' && i.startsWith?.entityId);
const sheep: string = scroll.startsWith.entityId;
const town = adventure.locations.find((l: any) => (l.entitiesPresent || []).includes(sheep));
const exit: string = town.connections[0].targetId;
const opening = adventure.scenes.find((s: any) => s.startsWhen?.event === 'adventure_start');
const party = [
    { id: 'pj-1', name: 'Galador', controlledBy: 'Player', inventory: [{ id: 'cuerda', name: 'Cuerda' }], hp: { current: 9, max: 9 } },
    { id: 'pj-2', name: 'Merryl', controlledBy: 'AI', personality: 'Curiosa', inventory: [], hp: { current: 7, max: 7 } },
] as any[];
const open = { speak_with_animals: true };

const options = (flags: any = {}, extra: any = {}) => buildActionOptions({
    adventureData: adventure, location: town, party, state: createCoreV2State(adventure), flags, selectedCharacterId: 'pj-1', ...extra,
});
const raw = (r: Partial<RawActionV2>): RawActionV2 => ({
    type: 'clarify', actor: 'pj-1', target: 'none', item: 'none', recipient: 'none', skill: 'none', stealth: false, clarification: '', ...r,
});
const packet = (over: Partial<FactPacketInput> = {}) => buildFactPacket({
    playerText: 'hola', adventureData: adventure, location: town, party, state: createCoreV2State(adventure), flags: {},
    presentEntityIds: presentEntityIds(adventure, town.id, over.flags || {}), facts: [], events: [], history: '', activeScene: opening, ...over,
});

describe('listas cerradas', () => {
    it('ofrece lo que hay delante y no a quien aún no ha llegado', () => {
        const o = options();
        expect(o.entities.map(e => e.id)).toEqual([sheep]);
        expect(o.items.map(i => i.id)).toEqual(expect.arrayContaining([scroll.id, 'cuerda']));
        expect(o.exits.map(e => e.id)).toContain(exit);
        expect(o.exits.map(e => e.id)).not.toContain('plataforma-superior');
        expect(options({ guz_en_pueblo: true }).entities.map(e => e.id)).toContain('guz-semiorco');
    });
    it('las etiquetas no revelan términos secretos; el objeto escondido no aparece', () => {
        const o = options({ guz_en_pueblo: true });
        expect(o.entities.map(e => e.label).join()).not.toMatch(/Guz|Finethir/);
        expect(o.items.map(i => i.id)).not.toContain('pergamino-hablar-con-animales-2');
    });
    it('una criatura solo falta cuando han caído todas las de su ID', () => {
        const wolf = (n: number, hp: number) => ({ id: `lobo-${n}`, hp: { current: hp, max: 5 } });
        expect(defeatedEntityIds([wolf(1, 0), wolf(2, 3)])).toEqual([]);
        expect(defeatedEntityIds([wolf(1, 0), wolf(2, 0)])).toEqual(['lobo']);
        expect(options({}, { absentEntityIds: [sheep] }).entities).toEqual([]);
    });
});

describe('resolveActionV2', () => {
    const o = options();
    it('acepta combinaciones válidas', () => {
        expect(resolveActionV2(raw({ type: 'move', target: exit, stealth: true }), o)).toEqual({ type: 'move', actorId: 'pj-1', destinationId: exit, stealth: true });
        expect(resolveActionV2(raw({ type: 'use_item', actor: 'pj-2', item: scroll.id }), o)).toEqual({ type: 'use_item', actorId: 'pj-2', itemId: scroll.id });
    });
    it.each([
        ['destino inventado', { type: 'move', target: 'castillo' }],
        ['mover a una entidad', { type: 'move', target: sheep }],
        ['objeto inexistente', { type: 'take', item: 'espada-magica' }],
        ['dar sin receptor', { type: 'give', item: 'cuerda' }],
        ['atacar a un compañero', { type: 'attack', target: 'pj-2' }],
        ['prueba sin habilidad', { type: 'check' }],
        ['tipo desconocido', { type: 'teleport' }],
    ])('%s → clarify', (_n, r) => {
        expect(resolveActionV2(raw(r), o).type).toBe('clarify');
    });
    it('sin respuesta o con actor desconocido no inventa', () => {
        expect(resolveActionV2(null, o)).toEqual({ type: 'clarify' });
        expect(resolveActionV2(raw({ type: 'rest', actor: 'nadie' }), o)).toEqual({ type: 'rest', actorId: 'pj-1' });
    });
});

describe('traducción a los sistemas actuales', () => {
    const o = options();
    const legacy = (r: Partial<RawActionV2>) => toLegacyInterpretation(resolveActionV2(raw(r), o), o, adventure.items);
    it('usar un objeto lleva actor e intención', () => {
        expect(legacy({ type: 'use_item', actor: 'pj-2', item: scroll.id }))
            .toMatchObject({ actionType: 'interact', targetId: scroll.id, objectIntent: 'use', assignedCompanion: 'Merryl', coreV2Action: { actorId: 'pj-2' } });
    });
    it('hablar dispara talked_to; examinar, no', () => {
        const events = (r: Partial<RawActionV2>) => deriveTurnEvents({
            adventureData: adventure, worldStateBefore: { globalFlags: open }, worldStateAfter: { globalFlags: open }, party,
            locationBefore: town.id, locationAfter: town.id, interpretation: legacy(r),
        }, createCoreV2State(adventure)).map(e => e.event);
        expect(events({ type: 'talk', target: sheep })).toContain('talked_to');
        expect(events({ type: 'examine', target: sheep })).not.toContain('talked_to');
    });
    it('una prueba trae la habilidad y la CD del motor (sin otra llamada a la IA)', () => {
        expect(legacy({ type: 'check', skill: 'perception' })).toMatchObject({ actionType: 'skill_check', overrideSkill: 'perception', overrideDC: 15 });
    });
    it('los IDs de objetivo no se repiten', () => {
        expect(new Set(targetIds(o)).size).toBe(targetIds(o).length);
    });
});

describe('paquete de hechos', () => {
    it('con la barrera levantada no llega ningún secreto al narrador', () => {
        const p = packet({ flags: { guz_en_pueblo: true }, presentEntityIds: presentEntityIds(adventure, town.id, { guz_en_pueblo: true }) });
        // La lista de términos se usa en el validador, nunca en el texto.
        const text = renderFactPacket(p);
        for (const term of p.forbiddenTerms) expect(text.toLowerCase()).not.toContain(term.toLowerCase());
        expect(p.forbiddenTerms).toContain('Finethir');
        expect(text).toContain('NO puede hablar');
    });
    it('sin barrera, la oveja tiene ficha de rol y las indicaciones dicen quién es', () => {
        const p = packet({ flags: open });
        expect(p.forbiddenTerms).toEqual([]);
        expect(p.entities[0].roleplay?.knows?.length).toBeGreaterThan(0);
        expect(renderFactPacket(p)).toContain('Finethir Shinebright');
    });
    it('cuenta en lenguaje llano quién hace qué, sin CD', () => {
        const p = packet({
            facts: [
                { type: 'ItemTransferred', itemId: scroll.id, from: { kind: 'entity', id: sheep }, to: { kind: 'character', id: 'pj-2' } },
                { type: 'ItemUsed', itemId: scroll.id, actorId: 'pj-2' },
                { type: 'SpellActivated', itemId: scroll.id, actorId: 'pj-2', spellId: 'speak_with_animals', affects: 'party' },
            ],
            events: [{ type: 'SkillCheckResolved', payload: { characterName: 'Galador', skill: 'perception', dc: 15, isSuccess: false } }],
        });
        expect(p.facts.join(' ')).toMatch(/Oveja tenía .*ahora lo tiene Merryl.*Merryl lee en voz alta.*todo el grupo.*Galador NO supera una prueba de Percepción/);
        expect(p.facts.join(' ')).not.toMatch(/CD|15/);
    });
    it('el aviso de los sistemas actuales pierde la CD', () => {
        expect(packet({ systemFeedback: 'La cerradura resiste (CD 15).' }).facts).toEqual(['La cerradura resiste.']);
    });
    it('la guía va sin fichas, en párrafos enteros y dentro del límite; el historial, recortado por líneas', () => {
        expect(sceneGuidance('Uno.\n\nClase de Armadura 14\n\nDos.\n\nTres.', [], 12)).toBe('Uno.\n\nDos.');
        expect(sceneGuidance(opening.guidance, [], 4500).length).toBeLessThanOrEqual(4502);
        expect(trimHistory('aaaa\nbbbb\ncccc', 8)).toBe('cccc');
    });
    it('hablar con un compañero le obliga a contestar a él', () => {
        const p = packet({ action: { type: 'talk', actorId: 'pj-1', targetId: 'pj-2' } });
        expect(p.addressedCompanion).toBe('Merryl');
        expect(validateNarration({ narration: '', reactions: [{ companionId: 'pj-2', text: 'Claro.' }] }, p)).toEqual([]);
        expect(p.companions.map(c => c.name)).toEqual(['Merryl']);
    });
});

describe('validador', () => {
    const p = packet();
    const kinds = (narration: string) => validateNarration({ narration, reactions: [] }, p).map(x => x.kind);
    it('acepta una narración correcta', () => expect(kinds('La oveja bala y agita el pergamino.')).toEqual([]));
    it.each([
        ['La oveja se llama Finethir.', 'secret'], ['', 'empty'], ['Llegáis a undefined.', 'technical'],
        ['Error QUOTA_EXCEEDED.', 'technical'], ['Superáis la CD 15.', 'dc'],
    ])('«%s» → %s', (text, kind) => expect(kinds(text)).toContain(kind));
    it('también mira las reacciones y no le repite el secreto al modelo', () => {
        const [problem] = validateNarration({ narration: 'Bala.', reactions: [{ companionId: 'pj-2', text: '¿Noke?' }] }, p);
        expect(problem.kind).toBe('secret');
        expect(problem.message).not.toMatch(/Noke/);
    });
    it('la versión segura pasa el validador', () => {
        expect(validateNarration(safeNarration(p), p)).toEqual([]);
    });
});
