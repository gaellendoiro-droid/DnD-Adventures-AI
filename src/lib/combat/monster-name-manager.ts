/**
 * @fileOverview Monster Name Management
 * Handles generation of differentiated names for multiple monsters of the same type,
 * normalization for matching, and replacement of references in narration.
 * 
 * This module resolves Issue #16 by centralizing all name management logic.
 */

import type { Combatant } from '@/lib/types';
import { log } from '@/lib/logger';

/**
 * Generates differentiated names for enemies (e.g., "Goblin 1", "Goblin 2").
 * ALWAYS numbers all enemies, even if there's only one of a type.
 * This ensures consistency: if there's 1 goblin, it's "Goblin 1", not just "Goblin".
 * 
 * @param enemies Array of enemy objects with name and uniqueId properties
 * @returns Map of uniqueId to visual (differentiated) name
 */
export function generateDifferentiatedNames(enemies: any[]): Map<string, string> {
    const nameMap = new Map<string, string>();

    // Group enemies by base name (normalize to handle case differences)
    const nameGroups = new Map<string, any[]>();
    for (const enemy of enemies) {
        // Get base name from enemy.name or extract from uniqueId
        const baseName = (enemy.name || enemy.id?.split('-')[0] || 'Unknown').trim();
        const normalizedBaseName = baseName.toLowerCase();

        if (!nameGroups.has(normalizedBaseName)) {
            nameGroups.set(normalizedBaseName, []);
        }
        // Store with original base name for display
        nameGroups.get(normalizedBaseName)!.push({ ...enemy, originalBaseName: baseName });
    }

    // For each group, assign differentiated names based on original index
    for (const [normalizedBaseName, group] of nameGroups.entries()) {
        // Use the first enemy's original base name for consistency
        const baseName = group[0].originalBaseName;

        // Sort by uniqueId to ensure consistent ordering (based on original index)
        const sorted = [...group].sort((a, b) => {
            const aIndex = parseInt(a.uniqueId.split('-').pop() || '1', 10);
            const bIndex = parseInt(b.uniqueId.split('-').pop() || '1', 10);
            return aIndex - bIndex;
        });

        // ALWAYS number all enemies, even if there's only one
        // This ensures consistency: if there's 1 goblin, it's "Goblin 1", not just "Goblin"
        // Now the uniqueId number matches the visual number directly (1-indexed)
        sorted.forEach((enemy) => {
            const visualNumber = parseInt(enemy.uniqueId.split('-').pop() || '1', 10);
            nameMap.set(enemy.uniqueId, `${baseName} ${visualNumber}`);
        });
    }

    return nameMap;
}

/**
 * Normalizes a name for pattern matching (removes accents, converts to lowercase, handles spaces).
 * This ensures we can match "Mantícora" with "mantícora", "manticora", etc.
 * 
 * @param name The name to normalize
 * @returns Normalized name (lowercase, no accents)
 */
export function normalizeNameForMatching(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .trim();
}

/**
 * Escapes special regex characters in a string for use in a regex pattern.
 * 
 * @param str The string to escape
 * @returns Escaped string safe for use in regex
 */
export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replaces ordinal references (e.g., "primer goblin", "segundo goblin") with visual names.
 * Works with any monster name, including names with spaces, accents, and special characters.
 * 
 * @param narration The narration text to process
 * @param enemies The enemies array
 * @param visualNamesMap Map of uniqueId to visual name
 * @param options Optional configuration
 * @returns The processed narration with ordinal references replaced
 */
export function replaceOrdinalReferences(
    narration: string,
    enemies: any[],
    visualNamesMap: Map<string, string>,
    options: { respectInputOrder?: boolean } = {}
): string {
    let processed = narration;

    log.debug(`Starting ordinal reference replacement`, {
        module: 'MonsterNameManager',
        action: 'replaceOrdinalReferences',
        narrationLength: narration.length,
        enemiesCount: enemies.length,
        respectInputOrder: options.respectInputOrder,
    });

    // Spanish ordinal numbers
    const ordinals = [
        { pattern: /primer[oa]?\s+/gi, index: 0 },
        { pattern: /segundo[oa]?\s+/gi, index: 1 },
        { pattern: /tercer[oa]?\s+/gi, index: 2 },
        { pattern: /cuarto[oa]?\s+/gi, index: 3 },
        { pattern: /quinto[oa]?\s+/gi, index: 4 },
        { pattern: /sexto[oa]?\s+/gi, index: 5 },
        { pattern: /séptimo[oa]?\s+/gi, index: 6 },
        { pattern: /octavo[oa]?\s+/gi, index: 7 },
        { pattern: /noveno[oa]?\s+/gi, index: 8 },
        { pattern: /décimo[oa]?\s+/gi, index: 9 },
    ];

    // Group enemies by normalized base name to handle multiple enemies of the same type
    const enemiesByNormalizedName = new Map<string, any[]>();
    for (const enemy of enemies) {
        const normalizedName = normalizeNameForMatching(enemy.name);
        if (!enemiesByNormalizedName.has(normalizedName)) {
            enemiesByNormalizedName.set(normalizedName, []);
        }
        enemiesByNormalizedName.get(normalizedName)!.push(enemy);
    }

    log.debug(`Grouped enemies by normalized name`, {
        module: 'MonsterNameManager',
        action: 'replaceOrdinalReferences',
        groupsCount: enemiesByNormalizedName.size,
        groups: Array.from(enemiesByNormalizedName.entries()).map(([name, enemies]) => ({
            normalizedName: name,
            count: enemies.length,
        })),
    });

    // For each group of enemies with the same normalized name
    for (const [normalizedName, sameNameEnemies] of enemiesByNormalizedName.entries()) {
        // Only process if there are multiple enemies of this type (ordinals only make sense for multiples)
        if (sameNameEnemies.length <= 1) continue;

        let sortedEnemies = [...sameNameEnemies];

        // Sort by uniqueId unless respectInputOrder is true
        if (!options.respectInputOrder) {
            sortedEnemies.sort((a, b) => {
                const aIndex = parseInt(a.uniqueId.split('-').pop() || '1', 10);
                const bIndex = parseInt(b.uniqueId.split('-').pop() || '1', 10);
                return aIndex - bIndex;
            });
        }

        // Get the original name (first enemy's name) for pattern matching
        // We'll match against both the original name and normalized name
        const originalName = sortedEnemies[0].name;
        const escapedOriginalName = escapeRegex(originalName);
        const escapedNormalizedName = escapeRegex(normalizedName);

        // Check each ordinal pattern
        for (const ordinal of ordinals) {
            if (ordinal.index >= sortedEnemies.length) continue; // Not enough enemies for this ordinal

            const targetEnemy = sortedEnemies[ordinal.index];
            const targetVisualName = visualNamesMap.get(targetEnemy.uniqueId) || targetEnemy.name;

            // Create patterns that match:
            // 1. "primer [nombre]" (with or without article)
            // 2. "el/la/los/las primer [nombre]"
            // 3. Works with original name (with accents/spaces) and normalized name
            const patterns = [
                // Pattern 1: "primer [nombre]" (exact match with original name)
                new RegExp(`(${ordinal.pattern.source})(${escapedOriginalName})\\b`, 'gi'),
                // Pattern 2: "el/la/los/las primer [nombre]" (with article, original name)
                new RegExp(`\\b(el|la|los|las)\\s+(${ordinal.pattern.source})(${escapedOriginalName})\\b`, 'gi'),
                // Pattern 3: "primer [nombre]" (normalized name, handles accents)
                new RegExp(`(${ordinal.pattern.source})(${escapedNormalizedName})\\b`, 'gi'),
                // Pattern 4: "el/la/los/las primer [nombre]" (with article, normalized name)
                new RegExp(`\\b(el|la|los|las)\\s+(${ordinal.pattern.source})(${escapedNormalizedName})\\b`, 'gi'),
            ];

            for (const pattern of patterns) {
                // Find all matches first
                const matches = processed.match(pattern);
                if (matches) {
                    // Reset regex lastIndex
                    pattern.lastIndex = 0;

                    // Replace the ordinal + name with the visual name
                    processed = processed.replace(pattern, (match, ...groups) => {
                        // If it's "el/la/los/las primer [nombre]", keep the article
                        if (groups[0] && ['el', 'la', 'los', 'las'].includes(groups[0].toLowerCase())) {
                            return `${groups[0]} ${targetVisualName}`;
                        }
                        return targetVisualName;
                    });

                    log.debug(`Replaced ordinal reference for ${originalName}: "${matches[0]}" -> "${targetVisualName}"`, {
                        module: 'MonsterNameManager',
                        action: 'replaceOrdinalReferences',
                        originalName,
                        normalizedName,
                        ordinalIndex: ordinal.index,
                    });
                }
            }
        }

        // Also replace "más cercano" / "más próximo" / "más próximo" patterns
        // These should default to the first enemy (index 0)
        const firstEnemy = sortedEnemies[0];
        const firstVisualName = visualNamesMap.get(firstEnemy.uniqueId) || firstEnemy.name;

        const proximityPatterns = [
            // "el/la [nombre] más cercano/a"
            new RegExp(`\\b(el|la|los|las)\\s+(${escapedOriginalName})\\s+más\\s+cercano[oa]?\\b`, 'gi'),
            new RegExp(`\\b(el|la|los|las)\\s+(${escapedNormalizedName})\\s+más\\s+cercano[oa]?\\b`, 'gi'),
            // "[nombre] más cercano/a" (without article)
            new RegExp(`\\b(${escapedOriginalName})\\s+más\\s+cercano[oa]?\\b`, 'gi'),
            new RegExp(`\\b(${escapedNormalizedName})\\s+más\\s+cercano[oa]?\\b`, 'gi'),
            // "el/la [nombre] más próximo/a"
            new RegExp(`\\b(el|la|los|las)\\s+(${escapedOriginalName})\\s+más\\s+próximo[oa]?\\b`, 'gi'),
            new RegExp(`\\b(el|la|los|las)\\s+(${escapedNormalizedName})\\s+más\\s+próximo[oa]?\\b`, 'gi'),
            // "[nombre] más próximo/a" (without article)
            new RegExp(`\\b(${escapedOriginalName})\\s+más\\s+próximo[oa]?\\b`, 'gi'),
            new RegExp(`\\b(${escapedNormalizedName})\\s+más\\s+próximo[oa]?\\b`, 'gi'),
        ];

        for (const pattern of proximityPatterns) {
            const matches = processed.match(pattern);
            if (matches) {
                pattern.lastIndex = 0;
                processed = processed.replace(pattern, (match, ...groups) => {
                    // If it's "el/la [nombre] más cercano", keep the article
                    if (groups[0] && ['el', 'la', 'los', 'las'].includes(groups[0].toLowerCase())) {
                        return `${groups[0]} ${firstVisualName}`;
                    }
                    return firstVisualName;
                });

                log.debug(`Replaced proximity reference for ${originalName}: "${matches[0]}" -> "${firstVisualName}"`, {
                    module: 'MonsterNameManager',
                    action: 'replaceOrdinalReferences',
                    originalName,
                    normalizedName,
                });
            }
        }
    }

    return processed;
}

/**
 * Gets the visual (differentiated) name for a combatant from the initiative order.
 * Falls back to the original name if not found.
 * 
 * @param combatantId The uniqueId or id of the combatant
 * @param initiativeOrder The initiative order array
 * @param enemies The enemies array (for fallback)
 * @returns The visual name to display
 */
export function getVisualName(combatantId: string, initiativeOrder: Combatant[], enemies: any[]): string {
    // First, try to find in initiativeOrder
    const combatant = initiativeOrder.find(c => c.id === combatantId);
    if (combatant) {
        return combatant.characterName;
    }

    // Fallback: try to find in enemies and generate name
    const enemy = enemies.find(e => e.uniqueId === combatantId || e.id === combatantId);
    if (enemy) {
        const differentiatedNames = generateDifferentiatedNames(enemies);
        return differentiatedNames.get(enemy.uniqueId) || enemy.name || combatantId;
    }

    return combatantId;
}

