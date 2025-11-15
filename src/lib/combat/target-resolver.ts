/**
 * @fileOverview Target Resolver
 * Handles resolution of target identifiers in combat, mapping visual names
 * (like "Goblin 1") to internal unique IDs (like "goblin-1").
 * 
 * This module is part of the Fase 1.3 refactorization.
 * 
 * Note: uniqueIds are now 1-indexed to match visual names directly (goblin-1 = "Goblin 1").
 */

import type { Combatant } from '@/lib/types';
import { log } from '@/lib/logger';
import { normalizeNameForMatching, generateDifferentiatedNames } from './monster-name-manager';

/**
 * Resolves a targetId (which can be a visual name like "Goblin 1" or a uniqueId like "goblin-1")
 * to the actual uniqueId for target lookup.
 * 
 * Handles:
 * - Direct uniqueId lookups
 * - Visual name to uniqueId mapping (now simplified: uniqueId number = visual number)
 * - Base name matching with ambiguity detection
 * - Accent normalization for matching
 * 
 * @param targetId The target identifier (can be visual name or uniqueId)
 * @param enemies Array of enemy objects
 * @param initiativeOrder Array of Combatants in initiative order
 * @param party Array of party member objects
 * @returns Object with uniqueId (or null), ambiguous flag, and list of matches if ambiguous
 */
export function resolveEnemyId(
    targetId: string | null | undefined,
    enemies: any[],
    initiativeOrder: Combatant[],
    party: any[]
): { uniqueId: string | null; ambiguous: boolean; matches: string[] } {
    if (!targetId) {
        return { uniqueId: null, ambiguous: false, matches: [] };
    }
    
    // Step 1: Check if targetId is already a uniqueId (contains '-' and ends with a number)
    const uniqueIdPattern = /^[^-]+-\d+$/;
    if (uniqueIdPattern.test(targetId)) {
        // Search directly in enemies or party by uniqueId or id
        const allCombatants = [...party, ...enemies];
        const found = allCombatants.find(
            c => c.id === targetId || (c as any).uniqueId === targetId
        );
        if (found) {
            return { uniqueId: found.id || (found as any).uniqueId, ambiguous: false, matches: [] };
        }
        
        // If not found directly, map uniqueId to visual name (now simplified: uniqueId number = visual number)
        // Example: uniqueId "goblin-1" -> visual name "Goblin 1" (direct match!)
        const parts = targetId.split('-');
        if (parts.length === 2) {
            const baseName = parts[0];
            const visualNumber = parseInt(parts[1], 10); // Now the number in uniqueId IS the visual number
            
            // Construct visual name directly from uniqueId
            const capitalizedBaseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
            const visualName = `${capitalizedBaseName} ${visualNumber}`;
            
            // Search in initiativeOrder by visual name
            const visualMatch = initiativeOrder.find(c => c.characterName === visualName);
            if (visualMatch) {
                log.debug('Resolved ID-format targetId to visual name (direct mapping)', {
                    module: 'TargetResolver',
                    originalTargetId: targetId,
                    visualNumber: visualNumber,
                    visualName: visualName,
                    resolvedUniqueId: visualMatch.id,
                });
                return { uniqueId: visualMatch.id, ambiguous: false, matches: [] };
            }
        }
    }
    
    // Step 2: Search in initiativeOrder by characterName (visual name) exact match
    // Use normalized comparison to handle accents (e.g., "manticora" matches "Mantícora 1")
    const normalizedTargetId = normalizeNameForMatching(targetId);
    const exactMatch = initiativeOrder.find(c => 
        normalizeNameForMatching(c.characterName) === normalizedTargetId
    );
    if (exactMatch) {
        return { uniqueId: exactMatch.id, ambiguous: false, matches: [] };
    }
    
    // Step 3: Search by base name (without number suffix) - check for ambiguity
    // Extract base name from targetId (remove trailing number if present)
    const baseNameMatch = targetId.match(/^(.+?)(?:\s+\d+)?$/);
    const baseName = baseNameMatch ? baseNameMatch[1].trim() : targetId.trim();
    const normalizedBaseName = normalizeNameForMatching(baseName);
    
    // Find all enemies with matching base name (use normalization to handle accents)
    const matchingEnemies = enemies.filter(e => {
        const enemyBaseName = e.name || e.id?.split('-')[0] || '';
        const normalizedEnemyBaseName = normalizeNameForMatching(enemyBaseName);
        return normalizedEnemyBaseName === normalizedBaseName;
    });
    
    if (matchingEnemies.length === 0) {
        // No matches found
        return { uniqueId: null, ambiguous: false, matches: [] };
    }
    
    if (matchingEnemies.length === 1) {
        // Single match - return its uniqueId
        return { uniqueId: matchingEnemies[0].uniqueId, ambiguous: false, matches: [] };
    }
    
    // Multiple matches - return ambiguous with list of visual names
    const differentiatedNames = generateDifferentiatedNames(enemies);
    const matches = matchingEnemies
        .map(e => {
            const visualName = differentiatedNames.get(e.uniqueId);
            // Also check initiativeOrder for the visual name
            const combatant = initiativeOrder.find(c => c.id === e.uniqueId);
            return visualName || combatant?.characterName || e.name;
        })
        .filter((name, index, arr) => arr.indexOf(name) === index); // Remove duplicates
    
    return { uniqueId: null, ambiguous: true, matches };
}

