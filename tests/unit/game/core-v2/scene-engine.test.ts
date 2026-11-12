import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { advanceScenes, getActiveScene, type AdventureSceneLike } from '@/lib/game/core-v2/scene-engine';
import { createCoreV2State, type CoreV2State } from '@/lib/game/core-v2/state';
import { presentEntityIds } from '@/lib/game/core-v2/legacy-bridge';
import type { TurnEvent } from '@/lib/game/core-v2/facts';

/** Avanza varios turnos seguidos; cada elemento son los sucesos de ese turno. */
function play(scenes: AdventureSceneLike[], turns: TurnEvent[][], opts: { locationId?: string; flags?: Record<string, any>; state?: CoreV2State } = {}) {
    let state = opts.state || createCoreV2State({});
    let flags = { ...(opts.flags || {}) };
    const startedPerTurn: string[][] = [];
    for (const events of turns) {
        const res = advanceScenes({ scenes, state, flags, locationId: opts.locationId || 'plaza', events });
        state = res.state;
        flags = res.flags;
        startedPerTurn.push(res.startedSceneIds);
    }
    return { state, flags, startedPerTurn };
}

describe('motor de escenas v2: condiciones', () => {
    it('adventure_start arranca la escena inicial en el primer turno, y solo una vez', () => {
        const scenes = [{ id: 'intro', title: 'Intro', startsWhen: { event: 'adventure_start' as const } }];
        const { startedPerTurn, state } = play(scenes, [[{ event: 'adventure_start' }], [{ event: 'adventure_start' }]]);
        expect(startedPerTurn).toEqual([['intro'], []]);
        expect(state.activeSceneId).toBe('intro');
        expect(state.startedScenes.intro).toBe(1);
    });

    it('el suceso tiene que coincidir con su target', () => {
        const scenes = [{ id: 's', title: 'S', startsWhen: { event: 'entered_location' as const, target: 'cueva' } }];
        expect(play(scenes, [[{ event: 'entered_location', target: 'bosque' }]]).startedPerTurn).toEqual([[]]);
        expect(play(scenes, [[{ event: 'entered_location', target: 'cueva' }]]).startedPerTurn).toEqual([['s']]);
    });

    it('flag, notFlag y atLocation se combinan con AND', () => {
        const scenes = [{ id: 's', title: 'S', startsWhen: { flag: 'puerta_abierta', notFlag: 'alarma', atLocation: 'sotano' } }];
        expect(play(scenes, [[]], { flags: { puerta_abierta: true }, locationId: 'patio' }).startedPerTurn).toEqual([[]]);
        expect(play(scenes, [[]], { flags: { puerta_abierta: true, alarma: true }, locationId: 'sotano' }).startedPerTurn).toEqual([[]]);
        expect(play(scenes, [[]], { flags: { puerta_abierta: true }, locationId: 'sotano' }).startedPerTurn).toEqual([['s']]);
    });

    it('all exige todas las condiciones y any al menos una', () => {
        const scenes = [{
            id: 's', title: 'S',
            startsWhen: { all: [{ flag: 'a' }, { any: [{ flag: 'b' }, { event: 'combat_ended' as const }] }] },
        }];
        expect(play(scenes, [[]], { flags: { a: true } }).startedPerTurn).toEqual([[]]);
        expect(play(scenes, [[{ event: 'combat_ended' }]], { flags: { a: true } }).startedPerTurn).toEqual([['s']]);
        expect(play(scenes, [[]], { flags: { a: true, b: true } }).startedPerTurn).toEqual([['s']]);
    });

    it('afterTurns espera N turnos desde que se cumple el resto, aunque el suceso no se repita', () => {
        const scenes = [{ id: 's', title: 'S', startsWhen: { event: 'item_used' as const, target: 'cuerno', afterTurns: 2 } }];
        const { startedPerTurn } = play(scenes, [[], [{ event: 'item_used', target: 'cuerno' }], [], []]);
        expect(startedPerTurn).toEqual([[], [], [], ['s']]);
    });

    it('onStart activa y borra flags, y scene_started encadena escenas en el mismo turno', () => {
        const scenes = [
            { id: 'a', title: 'A', startsWhen: { event: 'entered_location' as const, target: 'torre' }, onStart: { setFlags: ['torre_visitada'], clearFlags: ['niebla'] } },
            { id: 'b', title: 'B', startsWhen: { event: 'scene_started' as const, target: 'a' } },
            { id: 'c', title: 'C', startsWhen: { flag: 'torre_visitada' } },
        ];
        const { startedPerTurn, flags, state } = play(scenes, [[{ event: 'entered_location', target: 'torre' }]], { flags: { niebla: true } });
        expect(startedPerTurn).toEqual([['a', 'b', 'c']]);
        expect(flags).toEqual({ torre_visitada: true });
        expect(state.activeSceneId).toBe('c');
    });

    it('no modifica el estado ni los flags que recibe', () => {
        const state = createCoreV2State({});
        const flags = { x: true };
        advanceScenes({ scenes: [{ id: 's', title: 'S', startsWhen: { flag: 'x' }, onStart: { clearFlags: ['x'] } }], state, flags, locationId: 'p', events: [] });
        expect(state.turn).toBe(0);
        expect(state.startedScenes).toEqual({});
        expect(flags).toEqual({ x: true });
    });
});

describe('motor de escenas v2 con La caza de la oveja salvaje', () => {
    const adventure = JSON.parse(fs.readFileSync(
        path.resolve('public/adventures/la-caza-de-la-oveja-salvaje/la-caza-de-la-oveja-salvaje.json'), 'utf8'));
    const scroll = adventure.items.find((i: any) => i.spell?.id === 'speak_with_animals' && i.startsWith?.entityId);
    const guzRef = adventure.locations
        .flatMap((l: any) => (l.entitiesPresent || []).map((ref: any) => ({ loc: l.id, ref })))
        .find((x: any) => typeof x.ref === 'object' && /guz/.test(x.ref.entityId) && x.ref.presenceFlag);

    it('los datos tienen lo que necesita el caso guía (pergamino de la oveja y Guz con presenceFlag)', () => {
        expect(scroll).toBeDefined();
        expect(guzRef).toBeDefined();
    });

    // "Baaaa-d News" (p. 2): poco después de que la oveja empiece su historia, llegan Guz y sus bestias.
    it('Guz aparece en el pueblo un turno después de leer el pergamino, y no antes', () => {
        const startLocation = guzRef.loc;
        const guzId = guzRef.ref.entityId;
        let state = createCoreV2State(adventure);
        let flags: Record<string, any> = {};
        const turn = (events: TurnEvent[]) => {
            const res = advanceScenes({ scenes: adventure.scenes, state, flags, locationId: startLocation, events });
            state = res.state;
            flags = res.flags;
            return res;
        };

        turn([{ event: 'adventure_start' }]);
        expect(presentEntityIds(adventure, startLocation, flags)).not.toContain(guzId);

        const reading = turn([{ event: 'item_used', target: scroll.id }]);
        expect(reading.startedSceneIds.length).toBeGreaterThan(0);
        expect(presentEntityIds(adventure, startLocation, flags)).not.toContain(guzId);

        const next = turn([]);
        expect(next.startedSceneIds.length).toBeGreaterThan(0);
        expect(flags[guzRef.ref.presenceFlag]).toBe(true);
        expect(presentEntityIds(adventure, startLocation, flags)).toContain(guzId);

        // La escena activa es la de la llegada de Guz, con sus indicaciones del PDF para el narrador.
        const active = getActiveScene(adventure.scenes, state) as any;
        expect(active?.onStart?.setFlags).toContain(guzRef.ref.presenceFlag);
        expect(typeof active?.guidance).toBe('string');
    });

    it('sin leer el pergamino, Guz no llega por mucho que pasen los turnos', () => {
        let state = createCoreV2State(adventure);
        let flags: Record<string, any> = {};
        for (let i = 0; i < 6; i++) {
            const res = advanceScenes({ scenes: adventure.scenes, state, flags, locationId: guzRef.loc, events: i === 0 ? [{ event: 'adventure_start' }] : [] });
            state = res.state;
            flags = res.flags;
        }
        expect(flags[guzRef.ref.presenceFlag]).toBeUndefined();
    });
});
