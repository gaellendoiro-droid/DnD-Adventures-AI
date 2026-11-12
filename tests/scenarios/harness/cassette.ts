/**
 * Grabación y reproducción de llamadas de red ("cassettes") a nivel de `fetch` global.
 *
 * Funciona igual con Gemini (Genkit) y con Groq porque ambos usan `globalThis.fetch`.
 * Nunca se guardan cabeceras de la petición (claves de API) ni parámetros `key=` de la URL.
 *
 * Modos:
 *  - replay: cada petición se busca por el hash de su contenido; si no existe, el test falla.
 *  - record: se llama a la red real y se guarda cada interacción.
 *  - live:   se llama a la red real sin guardar nada (para medir y explorar).
 */
import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

export type ScenarioMode = 'replay' | 'record' | 'live';

/**
 * Llamadas a la IA que el juego ha dejado de hacer a propósito. Si siguen grabadas en un
 * cassette antiguo, que sobren en replay no es un fallo: solo se avisa (hasta regrabarlo).
 * Cada entrada reconoce la petición por un fragmento fijo de su prompt.
 */
export const RETIRED_LLM_CALLS: { task: string; description: string; promptMarker: string }[] = [
    {
        task: 'TASK-092',
        description: 'conversión de Markdown a HTML (ahora es código)',
        promptMarker: 'Convert the following Markdown text to HTML.',
    },
];

/** Si la interacción grabada corresponde a una llamada retirada, la devuelve. */
export function retiredCallFor(it: CassetteInteraction): (typeof RETIRED_LLM_CALLS)[number] | undefined {
    const body = typeof it.request === 'string' ? it.request : JSON.stringify(it.request ?? '');
    return RETIRED_LLM_CALLS.find(r => body.includes(r.promptMarker));
}

export interface CassetteInteraction {
    key: string;
    method: string;
    url: string;
    /** Cuerpo de la petición (JSON parseado si es posible) para poder revisar qué cambió en un prompt. */
    request: unknown;
    response: {
        status: number;
        statusText: string;
        contentType: string | null;
        body: string;
    };
}

export interface Cassette {
    scenarioId: string;
    model: string;
    /** Modelo local de respaldo activo al grabar (`LOCAL_LLM_MODEL`), si lo había. */
    localModel?: string;
    seed: number;
    recordedAt: string;
    interactions: CassetteInteraction[];
}

export interface FetchStats {
    /** Llamadas a proveedores de IA (Gemini / Groq). */
    llmCalls: number;
    /** Resto de llamadas de red (API de D&D, etc.). */
    otherCalls: number;
}

const LLM_HOSTS = ['generativelanguage.googleapis.com', 'api.groq.com'];

/**
 * Datos de la cuenta que los proveedores incluyen en sus respuestas (p. ej. en los errores 429 de Groq)
 * y que no deben acabar en el repositorio.
 */
export function redactAccountData(text: string): string {
    return text
        .replace(/\borg_[A-Za-z0-9]{6,}\b/g, 'org_REDACTED')
        .replace(/\bproject_[A-Za-z0-9]{6,}\b/g, 'project_REDACTED');
}

/** Hosts a los que el juego llama solo para "precalentar" conexiones: no se graban. */
const IGNORED_PREWARM = (url: string, method: string) =>
    method === 'HEAD' || /\/v1beta\/models\/?$/.test(url);

function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify((value as any)[k])}`).join(',')}}`;
}

function sanitizeUrl(raw: string): string {
    try {
        const u = new URL(raw);
        u.searchParams.delete('key');
        return u.toString();
    } catch {
        return raw;
    }
}

async function readBody(input: RequestInfo | URL, init?: RequestInit): Promise<string> {
    if (init?.body !== undefined && init.body !== null) {
        if (typeof init.body === 'string') return init.body;
        if (init.body instanceof Uint8Array) return Buffer.from(init.body).toString('utf8');
        if (init.body instanceof ArrayBuffer) return Buffer.from(new Uint8Array(init.body)).toString('utf8');
        return String(init.body);
    }
    if (typeof Request !== 'undefined' && input instanceof Request) {
        return await input.clone().text();
    }
    return '';
}

function requestUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    return (input as Request).url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
    return (init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();
}

function parseMaybeJson(body: string): unknown {
    try {
        return JSON.parse(body);
    } catch {
        return body;
    }
}

export class CassetteRecorder {
    private readonly realFetch: typeof fetch;
    private interactions: CassetteInteraction[] = [];
    private replayPool = new Map<string, CassetteInteraction[]>();
    readonly stats: FetchStats = { llmCalls: 0, otherCalls: 0 };

    constructor(
        readonly mode: ScenarioMode,
        readonly scenarioId: string,
        private readonly cassette?: Cassette,
    ) {
        this.realFetch = globalThis.fetch.bind(globalThis);
        if (mode === 'replay') {
            if (!cassette) {
                throw new Error(
                    `No existe cassette para el escenario "${scenarioId}". ` +
                    `Grábalo con: npm run test:scenarios:record -- ${scenarioId}`
                );
            }
            for (const it of cassette.interactions) {
                const list = this.replayPool.get(it.key) ?? [];
                list.push(it);
                this.replayPool.set(it.key, list);
            }
        }
    }

    install(): void {
        globalThis.fetch = this.handle.bind(this) as typeof fetch;
    }

    uninstall(): void {
        globalThis.fetch = this.realFetch;
    }

    /** Interacciones de replay que no se han consumido (indican llamadas que ya no ocurren). */
    unusedReplayInteractions(): CassetteInteraction[] {
        return [...this.replayPool.values()].flat();
    }

    toCassette(model: string, seed: number): Cassette {
        return {
            scenarioId: this.scenarioId,
            model,
            ...(process.env.LOCAL_LLM_MODEL ? { localModel: process.env.LOCAL_LLM_MODEL } : {}),
            seed,
            recordedAt: new Date(Date.now()).toISOString(),
            interactions: this.interactions,
        };
    }

    private async handle(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const url = sanitizeUrl(requestUrl(input));
        const method = requestMethod(input, init);
        const body = await readBody(input, init);

        if (IGNORED_PREWARM(url, method)) {
            return new Response(null, { status: 204 });
        }

        // Groq, Gemini o un modelo local compatible con OpenAI (Ollama).
        const isLlm = LLM_HOSTS.some(h => url.includes(h)) || /\/v1\/chat\/completions$/.test(url);
        if (isLlm) this.stats.llmCalls++;
        else this.stats.otherCalls++;

        const parsedBody = parseMaybeJson(body);
        const key = createHash('sha256')
            .update(`${method} ${url}\n${typeof parsedBody === 'string' ? parsedBody : stableStringify(parsedBody)}`)
            .digest('hex')
            .slice(0, 24);

        if (this.mode === 'replay') {
            const list = this.replayPool.get(key);
            const hit = list?.shift();
            if (!hit) {
                // Se guarda la petición para poder compararla con las grabadas (diff del prompt).
                const dumpDir = path.join(os.tmpdir(), 'dnd-scenarios');
                fs.mkdirSync(dumpDir, { recursive: true });
                const dumpFile = path.join(dumpDir, `${this.scenarioId}-${key}.json`);
                fs.writeFileSync(dumpFile, JSON.stringify(parsedBody, null, 2), 'utf8');
                throw new Error(
                    `[cassette:${this.scenarioId}] Petición no grabada (${method} ${url}). Guardada en: ${dumpFile}\n` +
                    `Es normal si has cambiado un prompt, el contexto enviado a la IA o la lógica previa a la llamada.\n` +
                    `Vuelve a grabar con: npm run test:scenarios:record -- ${this.scenarioId}\n` +
                    `Inicio del cuerpo: ${body.slice(0, 400)}`
                );
            }
            return new Response(hit.response.body, {
                status: hit.response.status,
                statusText: hit.response.statusText,
                headers: hit.response.contentType ? { 'content-type': hit.response.contentType } : undefined,
            });
        }

        const response = await this.realFetch(input as any, init as any);
        const text = await response.text();
        const contentType = response.headers.get('content-type');

        if (this.mode === 'record') {
            this.interactions.push({
                key,
                method,
                url,
                request: parsedBody,
                response: { status: response.status, statusText: response.statusText, contentType, body: redactAccountData(text) },
            });
        }

        return new Response(text, {
            status: response.status,
            statusText: response.statusText,
            headers: contentType ? { 'content-type': contentType } : undefined,
        });
    }
}

export function cassettePath(scenarioId: string): string {
    return path.resolve(__dirname, '..', 'cassettes', `${scenarioId}.json`);
}

export function loadCassette(scenarioId: string): Cassette | undefined {
    const file = cassettePath(scenarioId);
    if (!fs.existsSync(file)) return undefined;
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Cassette;
}

export function saveCassette(cassette: Cassette): void {
    const file = cassettePath(cassette.scenarioId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(cassette, null, 2) + '\n', 'utf8');
}
