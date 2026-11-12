// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { genkit, z } from 'genkit';
import { registerGroqModels } from '@/ai/groq-plugin';
import { localResponseFormat } from '@/ai/local-llm';

/**
 * El modelo local (Ollama) recibe el esquema de salida como "salida estructurada"
 * (`response_format: json_schema`): el servidor restringe la generación al esquema, así que el
 * modelo no puede omitir campos obligatorios ni devolver un objeto donde se pide una lista.
 * Groq no cambia.
 */
const bodies: { url: string; body: any }[] = [];
let reply = '{}';

beforeEach(() => {
    bodies.length = 0;
    vi.stubEnv('GROQ_API_KEY', '');
    vi.stubEnv('LOCAL_LLM_MODEL', '');
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
        bodies.push({ url, body: JSON.parse(String(init.body)) });
        return new Response(
            JSON.stringify({ choices: [{ message: { content: reply }, finish_reason: 'stop' }], usage: {} }),
            { status: 200 },
        );
    });
});
afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

const Room = z.object({ id: z.string(), name: z.string(), notes: z.string().optional() });

const makeAi = (active: string) => {
    const ai = genkit({});
    registerGroqModels(ai, active);
    return ai;
};

describe('localResponseFormat', () => {
    it('con esquema pide json_schema estricto y quita $schema', () => {
        const rf = localResponseFormat({
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            additionalProperties: false,
        }) as any;
        expect(rf.type).toBe('json_schema');
        expect(rf.json_schema.strict).toBe(true);
        expect(rf.json_schema.name).toBe('output');
        expect(rf.json_schema.schema).toEqual({
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            additionalProperties: false,
        });
    });

    it('sin esquema se queda en modo JSON', () => {
        expect(localResponseFormat(undefined)).toEqual({ type: 'json_object' });
    });
});

describe('cuerpo de la petición al modelo local', () => {
    it('una salida con esquema de objeto usa json_schema con el esquema completo', async () => {
        reply = '{"id":"a1","name":"Entrada"}';
        const ai = makeAi('local/qwen3.8:27b');
        const res = await ai.generate({ model: 'local/qwen3.8:27b', prompt: 'Sala', output: { schema: Room } });
        expect(res.output).toEqual({ id: 'a1', name: 'Entrada' });

        const { url, body } = bodies[0];
        expect(url).toBe('http://localhost:11434/v1/chat/completions');
        expect(body.response_format.type).toBe('json_schema');
        const schema = body.response_format.json_schema.schema;
        expect(schema.$schema).toBeUndefined();
        expect(schema.type).toBe('object');
        expect(schema.required).toEqual(['id', 'name']);
        expect(body.tools).toBeUndefined();
    });

    it('una raíz de tipo lista se pide como lista, sin envolver en {"items": [...]}', async () => {
        reply = '[{"id":"a1","name":"Entrada"},{"id":"a2","name":"Cripta"}]';
        const ai = makeAi('local/qwen3.8:27b');
        const res = await ai.generate({ model: 'local/qwen3.8:27b', prompt: 'Salas', output: { schema: z.array(Room) } });
        expect(res.output).toHaveLength(2);

        const { body } = bodies[0];
        expect(body.response_format.json_schema.schema.type).toBe('array');
        expect(body.response_format.json_schema.schema.items.required).toEqual(['id', 'name']);
        const prompt = body.messages.map((m: any) => m.content).join('\n');
        expect(prompt).toContain('MUST be a valid JSON array');
        expect(prompt).not.toContain('{"items": [ ... ]}');
    });

    it('sin esquema (texto libre) no envía response_format', async () => {
        reply = 'Hola, aventurero.';
        const ai = makeAi('local/qwen3.8:27b');
        await ai.generate({ model: 'local/qwen3.8:27b', prompt: 'Hola' });
        expect(bodies[0].body.response_format).toBeUndefined();
    });

    it('el respaldo local de Groq también usa json_schema', async () => {
        vi.stubEnv('LOCAL_LLM_MODEL', 'qwen3.8:27b');
        reply = '{"id":"a1","name":"Entrada"}';
        const ai = makeAi('groq/qwen/qwen3.8-27b');
        await ai.generate({ model: 'groq/qwen/qwen3.8-27b', prompt: 'Sala', output: { schema: Room } });
        expect(bodies[0].url).toContain('localhost:11434');
        expect(bodies[0].body.response_format.type).toBe('json_schema');
    });
});

describe('Groq no cambia', () => {
    it('gpt-oss sigue en modo JSON y la lista se pide envuelta en {"items": [...]}', async () => {
        vi.stubEnv('GROQ_API_KEY', 'test-key');
        reply = '{"items":[{"id":"a1","name":"Entrada"}]}';
        const ai = makeAi('groq/openai/gpt-oss-120b');
        const res = await ai.generate({
            model: 'groq/openai/gpt-oss-120b',
            prompt: 'Salas',
            output: { schema: z.array(Room) },
        });
        expect(res.output).toHaveLength(1);
        const { url, body } = bodies[0];
        expect(url).toContain('api.groq.com');
        expect(body.response_format).toEqual({ type: 'json_object' });
        expect(body.messages.at(-1).content).toContain('{"items": [ ... ]}');
    });
});
