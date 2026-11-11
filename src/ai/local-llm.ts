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
export const LOCAL_TIMEOUT_MS = 180_000;
/** Sin las cuotas de Groq, el modelo local puede escribir respuestas completas. */
export const LOCAL_MAX_TOKENS = 2048;

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

/** `local/gemma3:27b` → `gemma3:27b`; cualquier otro nombre → `null`. */
export function localModelFromName(name: string | undefined): string | null {
    return name && name.startsWith(LOCAL_PREFIX) ? name.slice(LOCAL_PREFIX.length) : null;
}
