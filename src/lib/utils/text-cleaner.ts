
/**
 * @fileOverview Text Cleaner Utilities
 * 
 * Provides utility functions to clean and normalize text output from AI models.
 * Used to remove unwanted artifacts like markdown code blocks, prefixes, or excessive whitespace.
 */

/**
 * Removes markdown code block delimiters (```json, ```) from a string.
 * Also trims whitespace.
 * 
 * @param text The text to clean
 * @returns The cleaned text
 */
export function removeCodeBlocks(text: string): string {
    if (!text) return '';

    // Remove ```json, ```markdown, or just ``` at start and end
    let cleaned = text.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');

    return cleaned.trim();
}

/**
 * Tries to parse a JSON string that might be wrapped in code blocks or contain minor syntax errors.
 * 
 * @param text The potential JSON string
 * @returns The parsed object or null if parsing fails
 */
export function safeJsonParse<T>(text: string): T | null {
    if (!text) return null;

    try {
        const cleaned = removeCodeBlocks(text);
        return JSON.parse(cleaned) as T;
    } catch (e) {
        // Simple retry: specific common issues? for now, just return null.
        return null;
    }
}

/**
 * Repairs missing spaces after punctuation marks (., !, ?, ,) when they are followed directly by a letter.
 * 
 * @param text The text to repair
 * @returns The repaired text
 */
export function repairPunctuationSpacing(text: string): string {
    if (!text) return '';

    // Insert space after period, exclamation, or question mark if followed by a capital letter
    // e.g., "próximos.Un semiorco" -> "próximos. Un semiorco"
    let repaired = text.replace(/(\.|\!|\?)([A-ZÁÉÍÓÚÑ])/g, '$1 $2');

    // Insert space after comma if followed by any letter (lowercase or uppercase)
    // e.g., "llegada,un" -> "llegada, un"
    repaired = repaired.replace(/(,)([a-zA-ZáéíóúñÁÉÍÓÚÑ])/g, '$1 $2');

    return repaired;
}

