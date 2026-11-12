import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { GameRulesEngine } from '@/lib/game/rules/rules-engine';
import { applyCoreV2EndOfTurn, deriveTurnEvents } from '@/lib/game/core-v2/legacy-bridge';
import { createCoreV2State } from '@/lib/game/core-v2/state';

/**
 * El motor v2 conectado al núcleo actual (CORE_V2=1) con los datos reales de la oveja:
 * leer el pergamino no pide tirada ("Baaaa-d News", p. 2) y Guz llega poco después.
 */
const adventure = JSON.parse(fs.readFileSync(
    path.resolve('public/adventures/la-caza-de-la-oveja-salvaje/la-caza-de-la-oveja-salvaje.json'), 'utf8'));
const scroll = adventure.items.find((i: any) => i.spell?.id === 'speak_with_animals' && i.startsWith?.entityId);
const sheepId: string = scroll.startsWith.entityId;
const town: string = adventure.locations.find((l: any) =>
    (l.entitiesPresent || []).some((r: any) => (typeof r === 'string' ? r : r.entityId) === sheepId)).id;
const guzRef = adventure.locations.find((l: any) => l.id === town).entitiesPresent
    .find((r: any) => typeof r === 'object' && /guz/.test(r.entityId) && r.presenceFlag);

const party = () => [
    { id: 'pj-1', name: 'Galador', characterClass: 'Paladín', level: 1, inventory: [], skills: [] },
    { id: 'pj-2', name: 'Merryl', characterClass: 'Mago', level: 1, inventory: [], skills: [] },
] as any[];

const evaluate = (interpretation: any, worldState: any, p = party()) => GameRulesEngine.evaluate({
    playerAction: 'texto que el motor v2 no lee',
    interpretation,
    party: p,
    currentLocationId: town,
    adventureData: adventure,
    worldState,
    conversationHistory: [],
} as any);

afterEach(() => vi.unstubAllEnvs());

describe('puente v2 → núcleo actual', () => {
    it('sin CORE_V2 el motor v2 no interviene', () => {
        vi.stubEnv('CORE_V2', '');
        const res = evaluate({ actionType: 'interact', targetId: scroll.id, objectIntent: 'use' }, { globalFlags: {} });
        expect(res.updatedWorldState?.coreV2).toBeUndefined();
    });

    it('con CORE_V2=1, Merryl lee el pergamino de la oveja sin tirada y se activa el conjuro', () => {
        vi.stubEnv('CORE_V2', '1');
        const res = evaluate({ actionType: 'interact', targetId: sheepId, objectIntent: 'use', assignedCompanion: 'Merryl' }, { globalFlags: {} });
        expect(res.intercepted).toBe(true);
        expect(res.interpretation.actionType).toBe('interact');
        expect(res.interpretation.overrideSkill).toBeUndefined();
        expect(res.pendingEffects).toBeUndefined();
        expect(res.updatedWorldState.globalFlags.speak_with_animals).toBe(true);
        expect(res.updatedWorldState.coreV2.itemHolders[scroll.id]).toEqual({ kind: 'consumed' });
        const merryl = res.updatedParty!.find((c: any) => c.name === 'Merryl') as any;
        expect(merryl.activeEffects?.some((e: any) => e.id === 'speak_with_animals')).toBe(true);
        expect(res.updatedParty!.every((c: any) => !c.inventory.some((i: any) => i.id === scroll.id))).toBe(true);
        expect(res.systemFeedback).toContain('Merryl');
    });

    it('coger el pergamino lo pone en el inventario con su nombre (el sello lo indica)', () => {
        vi.stubEnv('CORE_V2', '1');
        const res = evaluate({ actionType: 'interact', targetId: sheepId, objectIntent: 'take' }, { globalFlags: {} });
        const galador = res.updatedParty!.find((c: any) => c.name === 'Galador') as any;
        expect(galador.inventory).toContainEqual(expect.objectContaining({ id: scroll.id, name: scroll.name }));
        expect(res.updatedWorldState.coreV2.itemHolders[scroll.id]).toEqual({ kind: 'character', id: 'pj-1' });
    });

    it('si lo tiene un compañero y nadie más se nombra, lo lee quien lo tiene', () => {
        vi.stubEnv('CORE_V2', '1');
        const coreV2 = createCoreV2State(adventure);
        coreV2.itemHolders[scroll.id] = { kind: 'character', id: 'pj-2' };
        const res = evaluate({ actionType: 'interact', targetId: 'pergamino', objectIntent: 'use', assignedCompanion: 'Galador' }, { globalFlags: {}, coreV2 });
        expect(res.interpretation.assignedCompanion).toBe('Merryl');
    });

    it('un turno completo: leer el pergamino arranca la conversación y al turno siguiente llega Guz', () => {
        vi.stubEnv('CORE_V2', '1');
        // Turno 1: empieza la aventura.
        const t1 = applyCoreV2EndOfTurn({ adventureData: adventure, worldStateBefore: { globalFlags: {} }, worldStateAfter: { globalFlags: {} }, party: party(), locationBefore: town, locationAfter: town });
        expect(t1.events).toContainEqual({ event: 'adventure_start' });
        expect(t1.startedSceneIds.length).toBe(1);

        // Turno 2: se lee el pergamino.
        const rules = evaluate({ actionType: 'interact', targetId: sheepId, objectIntent: 'use' }, t1.worldState);
        const t2 = applyCoreV2EndOfTurn({ adventureData: adventure, worldStateBefore: t1.worldState, worldStateAfter: rules.updatedWorldState, party: rules.updatedParty!, locationBefore: town, locationAfter: town });
        expect(t2.events).toContainEqual({ event: 'item_used', target: scroll.id });
        expect(t2.worldState.globalFlags[guzRef.presenceFlag]).toBeUndefined();
        // Las marcas técnicas duran un turno.
        expect(Object.keys(t2.worldState.globalFlags).some(f => f.startsWith('__v2_'))).toBe(false);

        // Turno 3: cualquier acción; llegan Guz y sus bestias.
        const t3 = applyCoreV2EndOfTurn({ adventureData: adventure, worldStateBefore: t2.worldState, worldStateAfter: t2.worldState, party: t2.party, locationBefore: town, locationAfter: town, interpretation: { actionType: 'interact', targetId: sheepId } });
        expect(t3.worldState.globalFlags[guzRef.presenceFlag]).toBe(true);
        expect(t3.activeScene?.onStart?.setFlags).toContain(guzRef.presenceFlag);
    });

    it('una tirada de habilidad pendiente se completa al final del turno si sale bien', () => {
        vi.stubEnv('CORE_V2', '1');
        const wand = adventure.items.find((i: any) => i.activation?.check?.dc);
        const coreV2 = createCoreV2State(adventure);
        coreV2.itemHolders[wand.id] = { kind: 'character', id: 'pj-2' };
        const res = evaluate({ actionType: 'interact', targetId: wand.id, objectIntent: 'use', assignedCompanion: 'Merryl' }, { globalFlags: {}, coreV2 });
        expect(res.interpretation.actionType).toBe('skill_check');
        expect(res.interpretation.overrideSkill).toBe('arcana');
        expect(res.interpretation.overrideDC).toBe(wand.activation.check.dc);
        // El sistema de tiradas aplica pendingWorldStateFlags solo si la tirada sale bien.
        const after = { ...res.updatedWorldState, globalFlags: { ...res.updatedWorldState.globalFlags, ...res.pendingWorldStateFlags } };
        const end = applyCoreV2EndOfTurn({ adventureData: adventure, worldStateBefore: { globalFlags: {}, coreV2 }, worldStateAfter: after, party: res.updatedParty!, locationBefore: town, locationAfter: town });
        expect(end.events).toContainEqual({ event: 'item_used', target: wand.id });
        expect(end.worldState.coreV2.identifiedItems).toContain(wand.id);
    });

    it('deriva sucesos de combate: entidad derrotada y fin del combate', () => {
        const before = { globalFlags: {}, locations: { [town]: { enemies: [{ id: 'guz-semiorco-0-123', adventureId: 'guz-semiorco', hp: { current: 5, max: 30 }, status: 'active' }] } } };
        const after = { globalFlags: {}, locations: { [town]: { enemies: [{ id: 'guz-semiorco-0-123', adventureId: 'guz-semiorco', hp: { current: 0, max: 30 }, status: 'dead' }] } } };
        const state = { ...createCoreV2State(adventure), turn: 5 };
        const events = deriveTurnEvents({ adventureData: adventure, worldStateBefore: before, worldStateAfter: after, party: party(), locationBefore: town, locationAfter: town, inCombatBefore: true, inCombatAfter: false }, state);
        expect(events).toEqual([{ event: 'entity_defeated', target: 'guz-semiorco' }, { event: 'combat_ended' }]);
    });
});
