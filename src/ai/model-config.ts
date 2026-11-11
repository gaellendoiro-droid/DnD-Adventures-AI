/**
 * Configuration for AI Models.
 * 
 * @fileoverview Centralizes the model configuration to ensure consistency and prevent regressions.
 */

/**
 * The primary Generative Model for the application.
 * 
 * @constant
 * @type {string}
 * 
 * @ai_warning DO NOT DOWNGRADE THIS MODEL. The application relies on features only available in newer models.
 * @ai_warning The model 'gemini-1.5-flash' is OBSOLETE and causes 404 errors.
 * @ai_warning ALWAYS use 'gemini-2.5-flash' or newer (e.g., 'gemini-3.0-pro').
 * @ai_warning Current Knowledge Cutoff: 2026+ (Simulated).
 */
export const DEFAULT_GEMINI_MODEL = 'googleai/gemini-3.5-flash';
export const DEFAULT_GROQ_MODEL = 'groq/qwen/qwen3.8-27b';

/**
 * Modelo activo. Orden de resolución:
 *  1. `GEMINI_MODEL` en `.env` (admite `googleai/...` o `groq/...`).
 *  2. Si hay `GROQ_API_KEY` configurada, el modelo por defecto de Groq.
 *  3. En otro caso, Gemini (solo requiere `GOOGLE_GENAI_API_KEY`).
 */
export const GEMINI_MODEL_NAME =
    process.env.GEMINI_MODEL ||
    (process.env.GROQ_API_KEY ? DEFAULT_GROQ_MODEL : DEFAULT_GEMINI_MODEL);
