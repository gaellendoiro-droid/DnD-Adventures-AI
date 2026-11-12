/**
 * @fileOverview Modelo de IA local (Ollama u otro servidor compatible con la API de OpenAI).
 *
 * Es el respaldo gratuito e ilimitado cuando Groq agota su cuota: corre en el ordenador del
 * jugador. También se puede usar como modelo principal (`GEMINI_MODEL=local/<modelo>`), por
 * ejemplo para grabar escenarios sin depender de cuotas.
 *
 * Variables de entorno:
 *  - `LOCAL_LLM_MODEL`: nombre del modelo en el servidor local (p. ej. `gemma3:27b`). Si no está
 *    definida, no hay respaldo local.
 *  - `LOCAL_LLM_BASE_URL`: URL de la API compatible con OpenAI (por defecto, la de Ollama).
 */

export const LOCAL_PREFIX = 'local/';
export const DEFAULT_LOCAL_BASE_URL = 'http://localhost:11434/v1';
/** Un modelo local en una GPU doméstica tarda más que Groq: margen amplio antes de abortar. */
export const LOCAL_TIMEOUT_MS = 600_000; // respuestas largas del conversor (hasta LOCAL_MAX_TOKENS)
/** Sin las cuotas de Groq, el modelo local puede escribir respuestas completas. Con 2048 la lista de
 *  salas del conversor se truncaba; 8192 es del orden del límite por defecto de Gemini. */
export const LOCAL_MAX_TOKENS = 8192;

export interface LocalLlmConfig {
    model: string;
    baseUrl: string;
}

/** Configuración del modelo local, o `null` si no está activado. */
export function getLocalLlmConfig(env: NodeJS.ProcessEnv = process.env): LocalLlmConfig | null {
    const model = env.LOCAL_LLM_MODEL?.trim();
    if (!model) return null;
    const baseUrl = (env.LOCAL_LLM_BASE_URL?.trim() || DEFAULT_LOCAL_BASE_URL).replace(/\/+$/, '');
    return { model, baseUrl };
}

/**
 * `response_format` para el modelo local. Con esquema se usan las salidas estructuradas de Ollama
 * (`json_schema`, admitidas en `/v1/chat/completions` desde la 0.5): el servidor restringe la
 * generación al esquema, así que el modelo no puede omitir campos obligatorios ni devolver otra
 * forma (p. ej. un objeto donde se pide una lista; la raíz puede ser una lista). Sin esquema, modo JSON.
 */
export function localResponseFormat(schema: unknown): Record<string, unknown> {
    if (!schema || typeof schema !== 'object') return { type: 'json_object' };
    // `$schema` (de Zod → JSON Schema) solo describe el dialecto: no aporta nada a la gramática.
    const { $schema: _dialect, ...rest } = schema as Record<string, unknown>;
    return {
        type: 'json_schema',
        json_schema: { name: 'output', strict: true, schema: rest },
    };
}

/** `local/gemma3:27b` → `gemma3:27b`; cualquier otro nombre → `null`. */
export function localModelFromName(name: string | undefined): string | null {
    return name && name.startsWith(LOCAL_PREFIX) ? name.slice(LOCAL_PREFIX.length) : null;
}
