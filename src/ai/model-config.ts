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
export const GEMINI_MODEL_NAME = 'googleai/gemini-2.5-flash';
