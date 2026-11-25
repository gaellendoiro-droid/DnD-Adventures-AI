// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

/** Turno completo con CORE_V2=1: coordinador real, IA simulada a nivel de red (modelo local). */
const adventure = JSON.parse(fs.readFileSync(
    path.resolve('public/adventures/la-caza-de-la-oveja-salvaje/la-caza-de-la-oveja-salvaje.json'), 'utf8'));
// El logger de tests/setup.ts no tiene todos los métodos que usa el turno real.
vi.mock('@/lib/logger', () => ({ log: new Proxy({}, { get: () => () => {} }) }));
vi.mock('@/app/game-state-actions', () => ({ getAdventureData: async () => adventure }));

const scroll = adventure.items.find((i: any) => i.spell?.id === 'speak_with_animals' && i.startsWith?.entityId);
const sheep: string = scroll.startsWith.entityId;
const town: string = adventure.locations.find((l: any) => (l.entitiesPresent || []).includes(sheep)).id;

let replies: any[] = [];
let bodies: any[] = [];
let gameStreamCoordinator: any;
let initialParty: any[];
let party: any[];

const stubEnv = () => {
    vi.stubEnv('CORE_V2', '1');
    vi.stubEnv('GEMINI_MODEL', 'local/qwen-test');
    vi.stubEnv('LOCAL_LLM_MODEL', 'qwen-test');
    // El plugin de Gemini exige una clave al arrancar aunque no se use.
    vi.stubEnv('GEMINI_API_KEY', 'sin-clave');
    vi.stubEnv('GOOGLE_GENAI_API_KEY', 'sin-clave');
};

// El modelo se fija al importar: se importa una vez, con el entorno ya preparado.
beforeAll(async () => {
    stubEnv();
    ({ gameStreamCoordinator } = await import('@/ai/streaming/game-stream-coordinator'));
    ({ initialParty } = await import('@/lib/initial-party'));
}, 180_000);

beforeEach(() => {
    stubEnv();
    replies = [];
    bodies = [];
    party = JSON.parse(JSON.stringify(initialParty));
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
        if (!String(url).includes('/chat/completions')) return new Response('{}', { status: 404 });
        bodies.push(JSON.parse(String(init.body)));
        const reply = replies.shift();
        if (reply === undefined) throw new Error('llamada a la IA no prevista');
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(reply) }, finish_reason: 'stop' }], usage: {} }), { status: 200 });
    });
});
afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

const action = (a: any) => ({ actor: '1', target: 'none', item: 'none', recipient: 'none', skill: 'none', stealth: false, clarification: '', ...a });

async function play(playerAction: string, worldState: any = { locations: {}, globalFlags: {}, recentEvents: [] }) {
    const events: any[] = [];
    for await (const e of gameStreamCoordinator({
        playerAction, party, locationId: town, inCombat: false, conversationHistory: [], worldState, selectedCharacterId: party[0].id,
    })) events.push(e);
    const deltas = events.filter(e => e.type === 'state_delta').map(e => e.payload.data);
    return {
        errors: events.filter(e => e.type === 'error'),
        messages: deltas.flatMap(d => d.messages || []),
        worldState: deltas.map(d => d.worldState).filter(Boolean).at(-1),
    };
}

describe('turno v2 completo', () => {
    it('leer el pergamino: 2 llamadas, sin tirada, conjuro activo y escena avanzada', async () => {
        const merryl = party.find(c => c.name === 'Merryl');
        replies = [
            action({ type: 'use_item', actor: merryl.id, item: scroll.id }),
            { narration: 'Merryl lee el pergamino. «Soy Finethir Shinebright», dice la oveja.', reactions: [{ companionId: merryl.id, text: '¡Habla!' }] },
        ];
        const r = await play('Merryl, coge el pergamino y léelo');
        expect(r.errors).toEqual([]);
        expect(bodies).toHaveLength(2);
        expect(r.worldState.globalFlags.speak_with_animals).toBe(true);
        expect(r.worldState.coreV2.startedScenes['conversacion-con-shinebright']).toBeDefined();
        expect(r.messages.map(m => m.sender)).toEqual(['DM', 'Character']);
        expect(bodies[1].messages.at(-1).content).toContain('Merryl lee en voz alta');
    });

    it('el esquema del intérprete solo admite los IDs reales', async () => {
        replies = [action({ type: 'talk', target: sheep }), { narration: 'La oveja bala.', reactions: [] }];
        await play('¿Quién eres?');
        const target = bodies[0].response_format.json_schema.schema.properties.target;
        expect(target.enum).toContain(sheep);
        expect(target.enum).not.toContain('guz-semiorco');
        expect(target.enum).not.toContain('plataforma-superior');
    });

    it('si la narración desvela un secreto, se corrige una vez', async () => {
        replies = [action({ type: 'talk', target: sheep }), { narration: 'Es Finethir.', reactions: [] }, { narration: 'La oveja bala.', reactions: [] }];
        const r = await play('¿Quién eres?');
        expect(bodies).toHaveLength(3);
        expect(r.messages[0].content).toBe('La oveja bala.');
    });

    it('si falla dos veces, se muestra la versión segura', async () => {
        replies = [action({ type: 'talk', target: sheep }), { narration: 'Es Finethir.', reactions: [] }, { narration: 'Es Noke.', reactions: [] }];
        const r = await play('¿Quién eres?');
        expect(r.errors).toEqual([]);
        expect(r.messages[0].content).not.toMatch(/Finethir|Noke/);
        expect(bodies).toHaveLength(3);
    });

    it('una acción que no encaja se pregunta, sin narrador', async () => {
        replies = [action({ type: 'move', target: 'none' })];
        const r = await play('Vamos al castillo');
        expect(bodies).toHaveLength(1);
        expect(r.messages[0].sender).toBe('System');
    });

    it('una prueba de habilidad son 2 llamadas y deja la tirada hecha', async () => {
        replies = [action({ type: 'check', skill: 'perception' }), { narration: 'Miráis alrededor.', reactions: [] }];
        const r = await play('Busco huellas escondidas');
        expect(r.errors).toEqual([]);
        expect(bodies).toHaveLength(2);
        expect(bodies[1].messages.at(-1).content).toMatch(/supera una prueba de Percepción/i);
    });

    it('"descanso" en una frase no es un descanso si el intérprete no lo dice', async () => {
        replies = [action({ type: 'talk', target: sheep }), { narration: 'La oveja bala.', reactions: [] }];
        const r = await play('¿Quieres un descanso, oveja?');
        expect(r.worldState.worldTime.hour).toBe(8);
    });

    it('una respuesta sin el formato pedido se pregunta; un fallo del servidor se muestra como error', async () => {
        replies = [{ type: 'move', target: 'castillo' }];
        expect((await play('Vamos')).messages[0].sender).toBe('System');
        vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: { message: 'model not found' } }), { status: 404 }));
        const broken = await play('Vamos');
        expect(broken.errors).toHaveLength(1);
        expect(broken.messages).toEqual([]);
    });
});
