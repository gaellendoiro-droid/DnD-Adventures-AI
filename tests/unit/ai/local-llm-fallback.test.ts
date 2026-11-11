// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { genkit } from 'genkit';
import { registerGroqModels } from '@/ai/groq-plugin';
import { getLocalLlmConfig, localModelFromName } from '@/ai/local-llm';

/**
 * Respaldo local (Ollama): cuando Groq agota su cuota, la partida sigue con el modelo local
 * en vez de mostrar un error. También puede ser el modelo principal (`local/<modelo>`).
 */
const ok = (text: string) =>
    new Response(JSON.stringify({ choices: [{ message: { content: text }, finish_reason: 'stop' }], usage: {} }), { status: 200 });
const quota = () =>
    new Response(JSON.stringify({ error: { message: 'Rate limit reached on tokens per day (TPD)' } }), { status: 429 });

const calls: string[] = [];
let localUp = true;

beforeEach(() => {
    calls.length = 0;
    localUp = true;
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    vi.stubEnv('LOCAL_LLM_MODEL', 'gemma3:27b');
    vi.stubGlobal('fetch', async (url: string) => {
        calls.push(url);
        if (url.includes('api.groq.com')) return quota();
        if (!localUp) throw new TypeError('fetch failed');
        return ok('Respuesta del modelo local');
    });
});
afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

const makeAi = (active?: string) => {
    const ai = genkit({});
    registerGroqModels(ai, active);
    return ai;
};

describe('configuración del modelo local', () => {
    it('solo se activa con LOCAL_LLM_MODEL y usa la URL de Ollama por defecto', () => {
        expect(getLocalLlmConfig({} as any)).toBeNull();
        expect(getLocalLlmConfig({ LOCAL_LLM_MODEL: 'gemma3:27b' } as any))
            .toEqual({ model: 'gemma3:27b', baseUrl: 'http://localhost:11434/v1' });
        expect(localModelFromName('local/gemma3:27b')).toBe('gemma3:27b');
        expect(localModelFromName('groq/qwen/qwen3.8-27b')).toBeNull();
    });
});

describe('respaldo local cuando Groq falla', () => {
    it('si los modelos de Groq agotan la cuota, responde el modelo local', async () => {
        const ai = makeAi();
        const res = await ai.generate({ model: 'groq/qwen/qwen3.8-27b', prompt: 'Hola' });
        expect(res.text).toBe('Respuesta del modelo local');
        expect(calls.filter(u => u.includes('api.groq.com')).length).toBe(3);
        expect(calls.at(-1)).toBe('http://localhost:11434/v1/chat/completions');
    });

    it('si el modelo local tampoco responde, el error dice que Ollama no está disponible', async () => {
        localUp = false;
        const ai = makeAi();
        await expect(ai.generate({ model: 'groq/qwen/qwen3.8-27b', prompt: 'Hola' }))
            .rejects.toThrow(/tokens per day[\s\S]*respaldo local no responde[\s\S]*Ollama/);
    });

    it('sin LOCAL_LLM_MODEL se mantiene el comportamiento de siempre', async () => {
        vi.stubEnv('LOCAL_LLM_MODEL', '');
        const ai = makeAi();
        await expect(ai.generate({ model: 'groq/qwen/qwen3.8-27b', prompt: 'Hola' })).rejects.toThrow(/429/);
        expect(calls.some(u => u.includes('localhost'))).toBe(false);
    });
});

describe('modelo local como principal', () => {
    it('local/<modelo> no llama a Groq', async () => {
        const ai = makeAi('local/gemma3:27b');
        const res = await ai.generate({ model: 'local/gemma3:27b', prompt: 'Hola' });
        expect(res.text).toBe('Respuesta del modelo local');
        expect(calls.every(u => u.startsWith('http://localhost:11434'))).toBe(true);
    });
});
