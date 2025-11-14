
/**
 * @fileOverview A Genkit tool that manages a full round or turn of combat.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { enemyTacticianTool } from './enemy-tactician';
import { companionTacticianTool } from './companion-tactician';
import type { GameMessage, DiceRoll, Combatant } from '@/lib/types';
import { diceRollerTool } from './dice-roller';
import { getAdventureData } from '@/app/game-state-actions';
import { GameStateSchema, ActionInterpreterOutputSchema } from '@/ai/flows/schemas';
import { narrativeExpert } from '../flows/narrative-expert';
import { markdownToHtml } from '../flows/markdown-to-html';
import { log } from '@/lib/logger';

export const CombatManagerInputSchema = GameStateSchema.extend({
  interpretedAction: ActionInterpreterOutputSchema.optional(),
  locationContext: z.any().optional(),
  combatantIds: z.array(z.string()).optional(),
});

const formatMessageForTranscript = (msg: Partial<GameMessage>): string => {
    const senderName = msg.senderName || msg.sender;
    const content = msg.originalContent || msg.content;
    if (senderName && content) {
        return `${senderName}: ${content}`;
    }
    return '';
};

/**
 * Normalizes a Spanish monster name to English for D&D API lookup.
 * Removes accents, converts to lowercase, and maps common Spanish names to English.
 */
function normalizeMonsterName(name: string): string {
    // Remove accents and convert to lowercase
    let normalized = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .trim();
    
    // Common Spanish to English mappings for monsters
    const spanishToEnglishMap: Record<string, string> = {
        'mantícora': 'manticore',
        'manticora': 'manticore',
        'orco': 'orc',
        'goblin': 'goblin',
        'dragón': 'dragon',
        'dragon': 'dragon',
        'troll': 'troll',
        'ogro': 'ogre',
        'zombi': 'zombie',
        'zombie': 'zombie',
        'esqueleto': 'skeleton',
        'vampiro': 'vampire',
    };
    
    // Check if we have a direct mapping
    if (spanishToEnglishMap[normalized]) {
        return spanishToEnglishMap[normalized];
    }
    
    // Try to find a partial match
    for (const [spanish, english] of Object.entries(spanishToEnglishMap)) {
        if (normalized.includes(spanish) || spanish.includes(normalized)) {
            return english;
        }
    }
    
    // If no mapping found, return the normalized query (without accents)
    return normalized;
}

/**
 * Parses hit_points from D&D API format (e.g., "7d8+14" or 45) to a number.
 * If it's a dice notation, calculates the average (rounded down).
 */
function parseHitPoints(hitPoints: any): number {
    if (typeof hitPoints === 'number') {
        return hitPoints;
    }
    
    if (typeof hitPoints === 'string') {
        // Try to parse dice notation like "7d8+14"
        const diceMatch = hitPoints.match(/(\d+)d(\d+)([+-]\d+)?/);
        if (diceMatch) {
            const diceCount = parseInt(diceMatch[1], 10);
            const diceSize = parseInt(diceMatch[2], 10);
            const modifier = diceMatch[3] ? parseInt(diceMatch[3], 10) : 0;
            // Calculate average: (diceCount * (diceSize + 1) / 2) + modifier
            const average = Math.floor((diceCount * (diceSize + 1)) / 2) + modifier;
            return average;
        }
        
        // Try to parse as plain number
        const num = parseInt(hitPoints, 10);
        if (!isNaN(num)) {
            return num;
        }
    }
    
    // Default fallback
    return 10;
}

/**
 * Parses armor_class from D&D API format (can be number or array of objects).
 */
function parseArmorClass(armorClass: any): number {
    if (typeof armorClass === 'number') {
        return armorClass;
    }
    
    if (Array.isArray(armorClass) && armorClass.length > 0) {
        // If it's an array, take the first value (usually the base AC)
        const first = armorClass[0];
        if (typeof first === 'number') {
            return first;
        }
        if (typeof first === 'object' && first.value !== undefined) {
            return typeof first.value === 'number' ? first.value : 10;
        }
    }
    
    // Default fallback
    return 10;
}

// Cache for monster stats to avoid repeated API calls
const monsterStatsCache: Map<string, { hp: number; ac: number }> = new Map();
// Cache for pending promises to avoid duplicate simultaneous calls
const pendingRequests: Map<string, Promise<{ hp: number; ac: number } | null>> = new Map();

/**
 * Fetches monster stats (HP and AC) from the D&D 5e API.
 * Uses a cache to avoid repeated calls for the same monster.
 * Also uses a pending requests cache to avoid duplicate simultaneous calls.
 * Returns null if the monster is not found or if there's an error.
 */
async function getMonsterStatsFromDndApi(monsterName: string): Promise<{ hp: number; ac: number } | null> {
    // Check cache first
    const cacheKey = normalizeMonsterName(monsterName).toLowerCase();
    if (monsterStatsCache.has(cacheKey)) {
        const cached = monsterStatsCache.get(cacheKey)!;
        log.debug('Monster stats retrieved from cache', {
            module: 'CombatManager',
            monsterName,
            hp: cached.hp,
            ac: cached.ac,
        });
        return cached;
    }
    
    // Check if there's already a pending request for this monster
    if (pendingRequests.has(cacheKey)) {
        log.debug('Waiting for pending request for monster stats', {
            module: 'CombatManager',
            monsterName,
        });
        return await pendingRequests.get(cacheKey)!;
    }
    
    // Create a new request and cache the promise
    const requestPromise = (async () => {
        const baseUrl = 'https://www.dnd5eapi.co/api';
        const normalizedName = normalizeMonsterName(monsterName);
        const formattedName = normalizedName.toLowerCase().replace(/\s+/g, '-');
        
        try {
            log.debug('Fetching monster stats from D&D API', {
                module: 'CombatManager',
                originalName: monsterName,
                normalizedName,
                formattedName,
            });
            
            // Create AbortController for timeout (10 seconds)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            try {
                // Try direct lookup first (only in monsters, not in spells or equipment)
                let response = await fetch(`${baseUrl}/monsters/${formattedName}`, {
                    signal: controller.signal,
                });
                
                if (!response.ok) {
                    // Try search endpoint (only in monsters)
                    const searchResponse = await fetch(`${baseUrl}/monsters/?name=${normalizedName}`, {
                        signal: controller.signal,
                    });
                    if (searchResponse.ok) {
                        const searchData = await searchResponse.json();
                        if (searchData.count > 0 && searchData.results[0].url) {
                            response = await fetch(`https://www.dnd5eapi.co${searchData.results[0].url}`, {
                                signal: controller.signal,
                            });
                        }
                    }
                }
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    const hp = parseHitPoints(data.hit_points);
                    const ac = parseArmorClass(data.armor_class);
                    
                    const stats = { hp, ac };
                    
                    // Cache the result
                    monsterStatsCache.set(cacheKey, stats);
                    
                    log.info('Monster stats fetched from D&D API', {
                        module: 'CombatManager',
                        monsterName,
                        hp,
                        ac,
                    });
                    
                    return stats;
                }
                
                log.warn('Monster not found in D&D API', {
                    module: 'CombatManager',
                    monsterName,
                    normalizedName,
                    status: response.status,
                });
                
                return null;
            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    log.warn('D&D API request timed out', {
                        module: 'CombatManager',
                        monsterName,
                        timeout: '10s',
                    });
                } else {
                    throw fetchError; // Re-throw to be caught by outer catch
                }
                return null;
            }
        } catch (error: any) {
            // Extract more detailed error information
            const errorMessage = error?.message || 'Unknown error';
            const errorName = error?.name || 'Unknown';
            const isNetworkError = errorMessage.includes('fetch failed') || 
                                  errorMessage.includes('ECONNREFUSED') ||
                                  errorMessage.includes('ETIMEDOUT') ||
                                  errorName === 'TypeError';
            
            log.warn('Error fetching monster stats from D&D API (will use defaults)', {
                module: 'CombatManager',
                monsterName,
                errorType: errorName,
                isNetworkError,
                errorMessage: errorMessage.substring(0, 100), // Truncate long messages
            });
            
            return null;
        } finally {
            // Remove from pending requests when done
            pendingRequests.delete(cacheKey);
        }
    })();
    
    // Cache the pending promise
    pendingRequests.set(cacheKey, requestPromise);
    
    return await requestPromise;
}

/**
 * Generates differentiated display names for enemies of the same type.
 * For example, if there are 2 goblins, they will be named "Goblin 1" and "Goblin 2".
 * The numbering is based on the original index, so it remains stable even if enemies die.
 * 
 * IMPORTANT: ALL enemies of the same type get numbered, even if there's only one,
 * to ensure consistency when more enemies of the same type are added later.
 * 
 * @param enemies Array of enemy objects with uniqueId and name
 * @returns Map from uniqueId to differentiated display name
 */
function generateDifferentiatedNames(enemies: any[]): Map<string, string> {
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
            const aIndex = parseInt(a.uniqueId.split('-').pop() || '0', 10);
            const bIndex = parseInt(b.uniqueId.split('-').pop() || '0', 10);
            return aIndex - bIndex;
        });
        
        // ALWAYS number all enemies, even if there's only one
        // This ensures consistency: if there's 1 goblin, it's "Goblin 1", not just "Goblin"
        sorted.forEach((enemy, index) => {
            nameMap.set(enemy.uniqueId, `${baseName} ${index + 1}`);
        });
    }
    
    return nameMap;
}

/**
 * Normalizes a name for pattern matching (removes accents, converts to lowercase, handles spaces).
 * This ensures we can match "Mantícora" with "mantícora", "manticora", etc.
 */
function normalizeNameForMatching(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .trim();
}

/**
 * Escapes special regex characters in a string for use in a regex pattern.
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replaces ordinal references (e.g., "primer goblin", "segundo goblin") with visual names.
 * Works with any monster name, including names with spaces, accents, and special characters.
 * 
 * @param narration The narration text to process
 * @param enemies The enemies array
 * @param visualNamesMap Map of uniqueId to visual name
 * @returns The processed narration with ordinal references replaced
 */
function replaceOrdinalReferences(narration: string, enemies: any[], visualNamesMap: Map<string, string>): string {
    let processed = narration;
    
    log.debug(`Starting ordinal reference replacement`, {
        module: 'CombatManager',
        action: 'replaceOrdinalReferences',
        narrationLength: narration.length,
        enemiesCount: enemies.length,
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
        module: 'CombatManager',
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
        
        // Sort by uniqueId to ensure consistent ordering
        const sortedEnemies = [...sameNameEnemies].sort((a, b) => {
            const aIndex = parseInt(a.uniqueId.split('-').pop() || '0', 10);
            const bIndex = parseInt(b.uniqueId.split('-').pop() || '0', 10);
            return aIndex - bIndex;
        });
        
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
                        module: 'CombatManager',
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
                    module: 'CombatManager',
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
function getVisualName(combatantId: string, initiativeOrder: Combatant[], enemies: any[]): string {
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

/**
 * Resolves a targetId (which can be a visual name like "Goblin 1" or a uniqueId like "goblin-0")
 * to the actual uniqueId for target lookup.
 * 
 * @param targetId The target identifier (can be visual name or uniqueId)
 * @param enemies Array of enemy objects
 * @param initiativeOrder Array of Combatants in initiative order
 * @param party Array of party member objects
 * @returns Object with uniqueId (or null), ambiguous flag, and list of matches if ambiguous
 */
function resolveEnemyId(
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
        
        // If not found, try to interpret as visual name (e.g., "goblin-2" -> "Goblin 2")
        // Extract base name and number from ID format (e.g., "goblin-2" -> "goblin", "2")
        const parts = targetId.split('-');
        if (parts.length === 2) {
            const baseName = parts[0];
            const visualNumber = parseInt(parts[1], 10);
            
            // Construct visual name (capitalize first letter, add space and number)
            const capitalizedBaseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
            const visualName = `${capitalizedBaseName} ${visualNumber}`;
            
            // Search in initiativeOrder by visual name
            const visualMatch = initiativeOrder.find(c => c.characterName === visualName);
            if (visualMatch) {
                log.debug('Resolved ID-format targetId to visual name', {
                    module: 'CombatManager',
                    originalTargetId: targetId,
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

export const CombatManagerOutputSchema = z.object({
    messages: z.array(z.any()),
    diceRolls: z.array(z.any()).optional(),
    updatedParty: z.array(z.any()).optional(),
    updatedEnemies: z.array(z.any()).optional(),
    nextLocationId: z.string().optional().nullable(),
    inCombat: z.boolean(),
    initiativeOrder: z.array(z.any()).optional(),
    enemies: z.array(z.any()).optional(),
    debugLogs: z.array(z.string()).optional(),
    turnIndex: z.number().optional(),
});

const getHpStatus = (current: number, max: number): string => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'Healthy';
    if (percentage >= 60) return 'Injured';
    if (percentage >= 20) return 'Wounded';
    if (percentage > 0) return 'Badly Wounded';
    return 'Defeated';
};

/**
 * Validates and clamps HP values to ensure they are within valid ranges.
 * Ensures hp.current >= 0, hp.current <= hp.max, and hp.max > 0.
 * 
 * @param character Character or enemy object with hp property
 * @returns Character/enemy with validated and clamped HP values
 */
function validateAndClampHP(character: any): any {
    if (!character || !character.hp) {
        log.warn('validateAndClampHP: Character has no HP property', {
            module: 'CombatManager',
            characterId: character?.id || character?.uniqueId || 'unknown',
        });
        return character;
    }
    
    const { current, max } = character.hp;
    
    // Validate hp.max > 0
    if (max <= 0) {
        log.warn('validateAndClampHP: hp.max is invalid, setting to default 10', {
            module: 'CombatManager',
            characterId: character.id || character.uniqueId || 'unknown',
            originalMax: max,
        });
        character.hp.max = 10;
    }
    
    // Si isDead es true, mantener hp.current = 0 (no puede ser curado hasta revivir)
    if (character.isDead === true) {
        return {
            ...character,
            hp: {
                current: 0,
                max: character.hp.max,
            },
            isDead: true,
        };
    }
    
    // Clamp hp.current to valid range [0, hp.max]
    const validMax = character.hp.max;
    const clampedCurrent = Math.max(0, Math.min(validMax, current));
    
    if (clampedCurrent !== current) {
        log.debug('validateAndClampHP: HP clamped to valid range', {
            module: 'CombatManager',
            characterId: character.id || character.uniqueId || 'unknown',
            originalCurrent: current,
            clampedCurrent,
            max: validMax,
        });
    }
    
    return {
        ...character,
        hp: {
            current: clampedCurrent,
            max: validMax,
        },
        isDead: character.isDead || false, // Mantener estado existente o false
    };
}

/**
 * Verifica si un personaje está inconsciente o muerto.
 * Para jugador/compañeros: verifica isDead o hp.current <= 0.
 * Para enemigos: solo verifica hp.current <= 0 (comportamiento actual).
 * @param character Character or enemy object with hp and controlledBy properties
 * @returns true if character is unconscious or dead, false otherwise
 */
function isUnconsciousOrDead(character: any): boolean {
    if (!character || !character.hp) {
        return false; // Si no tiene HP, asumir que está vivo
    }
    
    // Para jugador/compañeros: verificar isDead o hp.current <= 0
    if (character.controlledBy === 'Player' || character.controlledBy === 'AI') {
        return character.isDead === true || character.hp.current <= 0;
    }
    
    // Para enemigos, mantener lógica actual
    return character.hp.current <= 0;
}

/**
 * Checks if combat has ended by verifying if all enemies or all allies are defeated.
 * @param updatedParty Array of party members with current HP
 * @param updatedEnemies Array of enemies with current HP
 * @returns Object with combatEnded boolean and reason string
 */
function checkEndOfCombat(updatedParty: any[], updatedEnemies: any[]): { combatEnded: boolean; reason: string | null } {
    // Check if all enemies are defeated (usar isUnconsciousOrDead para consistencia)
    const allEnemiesDefeated = updatedEnemies.every(e => e.hp.current <= 0);
    if (allEnemiesDefeated) {
        return { combatEnded: true, reason: 'Todos los enemigos derrotados' };
    }
    
    // Check if all allies are defeated or dead
    const allAlliesDefeated = updatedParty.every(p => isUnconsciousOrDead(p));
    if (allAlliesDefeated) {
        return { combatEnded: true, reason: 'Todos los aliados derrotados' };
    }
    
    return { combatEnded: false, reason: null };
}

export const combatManagerTool = ai.defineTool(
    {
      name: 'combatManagerTool',
      description: 'Manages a sequence of turns in combat, starting from the current turn, until it is a human player\'s turn again or combat ends. It also handles the initiation of combat.',
      inputSchema: CombatManagerInputSchema,
      outputSchema: CombatManagerOutputSchema,
    },
    async (input) => {
        const { playerAction, inCombat, locationId, interpretedAction, locationContext, conversationHistory, combatantIds, party, initiativeOrder } = input;
        let { turnIndex } = input;
        
        const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
        const diceRolls: Omit<DiceRoll, 'id' | 'timestamp'>[] = [];
        const debugLogs: string[] = [];
        let updatedEnemies = [...(input.enemies || [])];
        let updatedParty = [...(input.party || [])];

        const localLog = (message: string) => {
            debugLogs.push(`CombatManager: ${message}`);
        };

        if (inCombat) {
            localLog("Continuing existing combat...");
            if (!initiativeOrder || turnIndex === undefined) {
                throw new Error("Combat in progress, but initiativeOrder or turnIndex is missing.");
            }

            let currentTurnIndex = turnIndex;
            let activeCombatant = initiativeOrder[currentTurnIndex];
            
            // If it's the player's turn, process their action first
            if (activeCombatant && activeCombatant.controlledBy === 'Player' && interpretedAction) {
                localLog(`Processing player turn for ${activeCombatant.characterName} at index ${currentTurnIndex}...`);
                
                // Process player action (attack, spell, etc.)
                if (interpretedAction.actionType === 'attack') {
                    // If no targetId specified, try to infer it (Issue #23)
                    let targetIdToUse = interpretedAction.targetId;
                    
                    if (!targetIdToUse) {
                        // Filter only alive enemies
                        const aliveEnemies = updatedEnemies.filter(e => e.hp.current > 0);
                        
                        log.debug('Player attack without explicit target - inferring target', {
                            module: 'CombatManager',
                            player: activeCombatant.characterName,
                            aliveEnemiesCount: aliveEnemies.length,
                        });
                        
                        if (aliveEnemies.length === 1) {
                            // Only one enemy alive: auto-select it
                            targetIdToUse = aliveEnemies[0].uniqueId;
                            const autoSelectedName = getVisualName(targetIdToUse || '', initiativeOrder, updatedEnemies);
                            
                            localLog(`Auto-selected single enemy target: ${autoSelectedName} (${targetIdToUse})`);
                            log.info('Auto-selected single enemy as target', {
                                module: 'CombatManager',
                                player: activeCombatant.characterName,
                                target: autoSelectedName,
                                targetId: targetIdToUse,
                            });
                            
                            // Add a brief DM message to clarify the auto-selection
                            messages.push({
                                sender: 'DM',
                                content: `${activeCombatant.characterName} ataca a ${autoSelectedName}.`
                            });
                        } else if (aliveEnemies.length > 1) {
                            // Multiple enemies: ask for clarification
                            // Don't list specific enemies to avoid restricting player choices
                            // (they might want to attack a companion, NPC, or object)
                            const clarificationMessage = `No has especificado un objetivo. ¿A quién o qué quieres atacar?`;
                            
                            localLog(`Multiple enemies present, asking player for clarification`);
                            log.info('Player attack without target - multiple enemies, asking for clarification', {
                                module: 'CombatManager',
                                player: activeCombatant.characterName,
                                enemiesCount: aliveEnemies.length,
                            });
                            
                            messages.push({
                                sender: 'DM',
                                content: clarificationMessage
                            });
                            
                            // Do NOT advance turn - wait for player's next action
                            return {
                                messages,
                                diceRolls,
                                inCombat: true,
                                debugLogs,
                                turnIndex: currentTurnIndex, // Keep same turn index
                                initiativeOrder,
                                updatedParty,
                                updatedEnemies,
                            };
                        } else {
                            // No enemies alive
                            localLog('Player tried to attack but no enemies are alive');
                            messages.push({
                                sender: 'DM',
                                content: `No hay enemigos vivos para atacar.`
                            });
                            
                            // Advance turn normally
                            currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
                            activeCombatant = initiativeOrder[currentTurnIndex];
                            
                            // Continue to AI turns processing
                            // (don't return early, let the code flow to the AI turns loop)
                        }
                    }
                    
                    // Only proceed with attack if we have a valid target
                    if (targetIdToUse) {
                        // Resolve targetId (can be visual name or uniqueId)
                        const resolved = resolveEnemyId(targetIdToUse, updatedEnemies, initiativeOrder, updatedParty);
                    
                    // Handle ambiguity: if multiple enemies match, ask the player
                    if (resolved.ambiguous) {
                        const baseName = targetIdToUse.split(/\s+\d+$/)[0] || targetIdToUse;
                        const clarificationMessage = `Hay múltiples ${baseName}. ¿A cuál te refieres? ${resolved.matches.join(' o ')}`;
                        const { html } = await markdownToHtml({ markdown: clarificationMessage });
                        messages.push({ sender: 'DM', content: html, originalContent: clarificationMessage });
                        
                        // Do NOT process the action, do NOT advance turn - wait for player's next action
                        localLog(`Target ambiguous for player action. Asking for clarification.`);
                        
                        // Return early with just the clarification message
                        return {
                            messages,
                            diceRolls,
                            inCombat: true,
                            debugLogs,
                            turnIndex: currentTurnIndex, // Keep same turn index
                            initiativeOrder,
                            updatedParty,
                            updatedEnemies,
                        };
                    }
                    
                    // Use resolved uniqueId to find target
                    const resolvedTargetId = resolved.uniqueId || interpretedAction.targetId;
                    const target = [...updatedParty, ...updatedEnemies].find(
                        c => c.id === resolvedTargetId || (c as any).uniqueId === resolvedTargetId
                    );
                    
                    if (target) {
                        // Get visual name for target
                        const targetVisualName = getVisualName(
                            (target as any).uniqueId || target.id,
                            initiativeOrder,
                            updatedEnemies
                        );
                        
                        localLog(`Player ${activeCombatant.characterName} attacks ${targetVisualName}`);
                        
                        // Get player character data to determine attack and damage modifiers
                        const playerChar = updatedParty.find(p => p.id === activeCombatant.id);
                        if (!playerChar) {
                            localLog(`ERROR: Player character not found in party: ${activeCombatant.id}`);
                        } else {
                            try {
                                // Determine attack modifier (use Strength or Dexterity, whichever is higher)
                                const strMod = playerChar.abilityModifiers?.fuerza || 0;
                                const dexMod = playerChar.abilityModifiers?.destreza || 0;
                                const attackMod = Math.max(strMod, dexMod);
                                
                                // Determine damage modifier (same as attack, typically)
                                const damageMod = attackMod;
                                
                                // Determine damage die (default to 1d8 for a standard weapon like a longsword)
                                // TODO: In the future, read this from the player's equipped weapon
                                const damageDie = '1d8';
                                
                                log.debug('Player attack modifiers', {
                                    module: 'CombatManager',
                                    player: activeCombatant.characterName,
                                    strMod,
                                    dexMod,
                                    attackMod,
                                    damageMod,
                                    damageDie,
                                });
                                
                                // Generate attack roll
                                const attackRollResult = await diceRollerTool({
                                    rollNotation: `1d20+${attackMod}`,
                                    description: `Tirada de ataque de ${activeCombatant.characterName}`,
                                    roller: activeCombatant.characterName,
                                });
                                
                                // Validate target AC
                                let finalTargetAC: number;
                                if (target.ac === undefined || target.ac === null) {
                                    log.warn('Attack roll processed but target AC is missing', {
                                        module: 'CombatManager',
                                        targetId: target.id,
                                        targetName: targetVisualName,
                                        roller: activeCombatant.characterName,
                                    });
                                    finalTargetAC = 10;
                                } else {
                                    const targetAC = typeof target.ac === 'number' ? target.ac : parseInt(String(target.ac), 10);
                                    if (isNaN(targetAC)) {
                                        log.warn('Target AC is not a valid number, using default', {
                                            module: 'CombatManager',
                                            targetId: target.id,
                                            targetAC: target.ac,
                                        });
                                        finalTargetAC = 10;
                                    } else {
                                        finalTargetAC = targetAC;
                                    }
                                }
                                
                                const attackHit = attackRollResult.totalResult >= finalTargetAC;
                                
                                // Update attack roll with combat information
                                const updatedAttackRoll = {
                                    ...attackRollResult,
                                    targetName: targetVisualName,
                                    targetAC: finalTargetAC,
                                    attackHit: attackHit,
                                    outcome: attackHit ? (attackRollResult.outcome === 'crit' ? 'crit' : 'success') : (attackRollResult.outcome === 'pifia' ? 'pifia' : 'fail'),
                                };
                                diceRolls.push(updatedAttackRoll);
                                
                                log.debug('Player attack roll processed', {
                                    module: 'CombatManager',
                                    roller: activeCombatant.characterName,
                                    targetName: targetVisualName,
                                    targetAC: finalTargetAC,
                                    attackHit: attackHit,
                                    outcome: updatedAttackRoll.outcome,
                                    rollTotal: attackRollResult.totalResult,
                                });
                                
                                // Generate DM narration for attack
                                if (attackHit) {
                                    if (attackRollResult.outcome === 'crit') {
                                        messages.push({
                                            sender: 'DM',
                                            content: `¡${activeCombatant.characterName} ataca a ${targetVisualName} con un golpe crítico!`
                                        });
                                    } else {
                                        messages.push({
                                            sender: 'DM',
                                            content: `${activeCombatant.characterName} ataca a ${targetVisualName} y acierta (${attackRollResult.totalResult} vs AC ${finalTargetAC}).`
                                        });
                                    }
                                    
                                    // Generate damage roll (only if attack hit)
                                    const damageRollResult = await diceRollerTool({
                                        rollNotation: `${damageDie}+${damageMod}`,
                                        description: `Tirada de daño de ${activeCombatant.characterName}`,
                                        roller: activeCombatant.characterName,
                                    });
                                    
                                    // Validate damage is positive
                                    if (damageRollResult.totalResult <= 0) {
                                        log.warn('Damage roll resulted in non-positive damage', {
                                            module: 'CombatManager',
                                            damage: damageRollResult.totalResult,
                                            roller: activeCombatant.characterName,
                                        });
                                        messages.push({
                                            sender: 'DM',
                                            content: `${activeCombatant.characterName} intenta hacer daño a ${targetVisualName}, pero no causa ningún daño.`
                                        });
                                    } else {
                                        // Apply damage to target
                                        const targetIsEnemy = updatedEnemies.some(e => (e as any).uniqueId === (target as any).uniqueId);
                                        const previousHP = targetIsEnemy
                                            ? updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)?.hp.current
                                            : updatedParty.find(p => p.id === target.id)?.hp.current;
                                        
                                        const damage = damageRollResult.totalResult;
                                        
                                        if (targetIsEnemy) {
                                            // Para enemigos, mantener comportamiento actual
                                            updatedEnemies = updatedEnemies.map(e => {
                                                if ((e as any).uniqueId === (target as any).uniqueId) {
                                                    const updated = { ...e, hp: { ...e.hp, current: Math.max(0, e.hp.current - damage) } };
                                                    return validateAndClampHP(updated);
                                                }
                                                return e;
                                            });
                                        } else {
                                            // Para jugador/compañeros: aplicar regla de muerte masiva D&D 5e
                                            updatedParty = updatedParty.map(p => {
                                                if (p.id === target.id) {
                                                    const targetHP = p.hp.current;
                                                    const targetHPMax = p.hp.max;
                                                    
                                                    // Regla de muerte masiva: daño restante (después de llegar a 0) >= hpMax
                                                    // Fórmula: daño restante = damage - hp.current
                                                    const remainingDamage = damage - targetHP;
                                                    
                                                    if (remainingDamage >= targetHPMax) {
                                                        // Muerte instantánea
                                                        messages.push({
                                                            sender: 'DM',
                                                            content: `${p.name} ha recibido un golpe devastador y muere instantáneamente.`,
                                                        });
                                                        const updated = { 
                                                            ...p, 
                                                            hp: { current: 0, max: targetHPMax },
                                                            isDead: true 
                                                        };
                                                        return validateAndClampHP(updated);
                                                    } else {
                                                        // Daño normal: puede llegar a 0 (inconsciente) pero no muere
                                                        const newHP = Math.max(0, targetHP - damage);
                                                        
                                                        if (newHP === 0 && targetHP > 0) {
                                                            // Acaba de caer inconsciente
                                                            messages.push({
                                                                sender: 'DM',
                                                                content: `${p.name} cae inconsciente.`,
                                                            });
                                                        }
                                                        
                                                        const updated = { 
                                                            ...p, 
                                                            hp: { current: newHP, max: targetHPMax },
                                                            isDead: false
                                                        };
                                                        return validateAndClampHP(updated);
                                                    }
                                                }
                                                return p;
                                            });
                                        }
                                        
                                        const newHP = targetIsEnemy
                                            ? updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)?.hp.current
                                            : updatedParty.find(p => p.id === target.id)?.hp.current;
                                        
                                        // Update damage roll with combat information
                                        const updatedDamageRoll = {
                                            ...damageRollResult,
                                            targetName: targetVisualName,
                                            damageDealt: damageRollResult.totalResult,
                                        };
                                        diceRolls.push(updatedDamageRoll);
                                        
                                        // Generate damage message
                                        const damageMessage = `${activeCombatant.characterName} ha hecho ${damageRollResult.totalResult} puntos de daño a ${targetVisualName}${previousHP !== undefined && newHP !== undefined ? ` (${previousHP} → ${newHP} HP)` : ''}.`;
                                        messages.push({
                                            sender: 'DM',
                                            content: damageMessage
                                        });
                                        
                                        log.debug('Player damage applied', {
                                            module: 'CombatManager',
                                            target: targetVisualName,
                                            damage: damageRollResult.totalResult,
                                            previousHP,
                                            newHP,
                                        });
                                        
                                        // Check if target was defeated
                                        if (newHP !== undefined && newHP <= 0) {
                                            messages.push({
                                                sender: 'DM',
                                                content: `¡${activeCombatant.characterName} ha matado a ${targetVisualName}!`
                                            });
                                            localLog(`${activeCombatant.characterName} killed ${targetVisualName}!`);
                                        }
                                    }
                                } else {
                                    // Attack missed
                                    if (attackRollResult.outcome === 'pifia') {
                                        messages.push({
                                            sender: 'DM',
                                            content: `¡${activeCombatant.characterName} falla estrepitosamente al atacar a ${targetVisualName}! (Pifia: ${attackRollResult.totalResult} vs AC ${finalTargetAC})`
                                        });
                                    } else {
                                        messages.push({
                                            sender: 'DM',
                                            content: `${activeCombatant.characterName} ataca a ${targetVisualName}, pero falla (${attackRollResult.totalResult} vs AC ${finalTargetAC}).`
                                        });
                                    }
                                    log.debug('Player attack missed', {
                                        module: 'CombatManager',
                                        rollTotal: attackRollResult.totalResult,
                                        targetAC: finalTargetAC,
                                        isPifia: attackRollResult.outcome === 'pifia',
                                    });
                                }
                                
                            } catch (error) {
                                log.error('Error processing player attack', {
                                    module: 'CombatManager',
                                    error: error instanceof Error ? error.message : String(error),
                                    player: activeCombatant.characterName,
                                    target: targetVisualName,
                                });
                                messages.push({
                                    sender: 'DM',
                                    content: `Hubo un error al procesar el ataque de ${activeCombatant.characterName}.`
                                });
                            }
                        }
                    } else {
                        localLog(`Target not found for player action: ${targetIdToUse} (resolved: ${resolvedTargetId})`);
                        messages.push({
                            sender: 'DM',
                            content: `No puedes encontrar ese objetivo.`
                        });
                    }
                    
                    // Advance to next turn after successful attack processing
                    currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
                    activeCombatant = initiativeOrder[currentTurnIndex];
                    }
                }
            }
            
            // Continue processing AI turns until it's the player's turn again
            let combatHasEnded = false;
            while(activeCombatant && activeCombatant.controlledBy === 'AI' && !combatHasEnded) {
                localLog(`Processing turn for AI combatant ${activeCombatant.characterName} at index ${currentTurnIndex}...`);
                
                // Check if active combatant is dead - skip their turn if so
                const isCompanion = updatedParty.some(p => p.id === activeCombatant.id);
                const activeCombatantData = isCompanion 
                    ? updatedParty.find(p => p.id === activeCombatant.id)
                    : updatedEnemies.find(e => (e as any).uniqueId === activeCombatant.id);
                
                if (activeCombatantData && activeCombatantData.hp.current <= 0) {
                    log.debug('Skipping turn for dead combatant', {
                        module: 'CombatManager',
                        combatant: activeCombatant.characterName,
                        hp: activeCombatantData.hp.current,
                    });
                    messages.push({
                        sender: 'DM',
                        content: `${activeCombatant.characterName} está muerto y no puede actuar.`
                    });
                    
                    // Advance to next turn
                    currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
                    activeCombatant = initiativeOrder[currentTurnIndex];
                    continue;
                }
                let tacticianResponse;

                // Get visual names for enemies to pass to tacticians
                const enemyVisualNames = new Map<string, string>();
                for (const enemy of updatedEnemies) {
                    const visualName = getVisualName(enemy.uniqueId, initiativeOrder, updatedEnemies);
                    enemyVisualNames.set(enemy.uniqueId, visualName);
                    log.debug(`Enemy mapping: uniqueId=${enemy.uniqueId}, originalName="${enemy.name}", visualName="${visualName}"`, {
                        module: 'CombatManager',
                        action: 'getVisualNames',
                    });
                }

                // Filter out dead combatants before passing to tactician (Issue #18)
                const aliveParty = updatedParty.filter(p => p.hp.current > 0);
                const aliveEnemies = updatedEnemies.filter(e => e.hp.current > 0);
                
                log.debug('Filtering dead combatants for tactician', {
                    module: 'CombatManager',
                    activeCombatant: activeCombatant.characterName,
                    totalParty: updatedParty.length,
                    aliveParty: aliveParty.length,
                    totalEnemies: updatedEnemies.length,
                    aliveEnemies: aliveEnemies.length,
                });

                const baseTacticianInput = {
                    activeCombatant: activeCombatant.characterName,
                    party: aliveParty,
                    enemies: aliveEnemies.map(e => ({ 
                        name: enemyVisualNames.get(e.uniqueId) || e.name, // Use visual name
                        id: e.uniqueId, 
                        hp: getHpStatus(e.hp.current, e.hp.max) 
                    })),
                    locationDescription: locationContext?.description || "An unknown battlefield",
                    conversationHistory: conversationHistory.map(formatMessageForTranscript).join('\n')
                };

                if (isCompanion) {
                    localLog(`Invoking CompanionTacticianTool for ${activeCombatant.characterName}.`);
                    tacticianResponse = await companionTacticianTool(baseTacticianInput);
                } else {
                    localLog(`Invoking EnemyTacticianTool for ${activeCombatant.characterName}.`);
                    tacticianResponse = await enemyTacticianTool(baseTacticianInput);
                }

                const { narration, targetId, diceRolls: requestedRolls } = tacticianResponse;

                localLog(`Tactician for ${activeCombatant.characterName} decided action targeting ${targetId || 'no one'}.`);

                if (narration) {
                    // Post-process narration to replace enemy IDs/names with visual names
                    // IMPORTANT: Process in reverse order (longest names first) to avoid multiple replacements
                    let processedNarration = narration;
                    
                    // FIRST: Replace ordinal references (e.g., "primer goblin" -> "Goblin 1")
                    processedNarration = replaceOrdinalReferences(processedNarration, updatedEnemies, enemyVisualNames);
                    
                    // Sort enemies by visual name length (longest first) to avoid replacing "Goblin 2" with "Goblin 1 2"
                    const enemiesSorted = [...updatedEnemies].sort((a, b) => {
                        const nameA = enemyVisualNames.get(a.uniqueId) || a.name;
                        const nameB = enemyVisualNames.get(b.uniqueId) || b.name;
                        return nameB.length - nameA.length; // Longest first
                    });
                    
                    for (const enemy of enemiesSorted) {
                        const visualName = enemyVisualNames.get(enemy.uniqueId) || enemy.name;
                        const originalName = enemy.name;
                        
                        // Log for debugging
                        if (originalName !== visualName) {
                            log.debug(`Post-processing narration: ${originalName} -> ${visualName} (uniqueId: ${enemy.uniqueId})`, {
                                module: 'CombatManager',
                                action: 'postProcessNarration',
                            });
                        }
                        
                        // Replace uniqueId references first (e.g., "goblin-0", "goblin-1")
                        const beforeUniqueId = processedNarration;
                        processedNarration = processedNarration.replace(
                            new RegExp(`\\b${enemy.uniqueId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
                            visualName
                        );
                        if (beforeUniqueId !== processedNarration) {
                            log.debug(`Replaced uniqueId ${enemy.uniqueId} with ${visualName}`, {
                                module: 'CombatManager',
                                action: 'postProcessNarration',
                            });
                        }
                        
                        // Replace original name references ONLY if:
                        // 1. The visual name is different from the original name
                        // 2. The original name is NOT already part of a visual name (e.g., don't replace "Goblin" in "Goblin 2")
                        // 3. Check if the FULL visual name (with number) is already present (case-insensitive)
                        //    BUT allow replacement if it's just the base name without number
                        const visualNameLower = visualName.toLowerCase();
                        const narrationLower = processedNarration.toLowerCase();
                        
                        // Check if the full visual name (e.g., "goblin 1") is present
                        const hasFullVisualName = new RegExp(`\\b${escapeRegex(visualNameLower)}\\b`).test(narrationLower);
                        const hasBaseNameWithNumber = new RegExp(`\\b${escapeRegex(originalName.toLowerCase())}\\s+\\d+\\b`).test(narrationLower);
                        
                        // Only skip if the FULL visual name is present, OR if the base name is already followed by a number
                        const shouldSkip = hasFullVisualName || hasBaseNameWithNumber;
                        
                        if (originalName !== visualName && 
                            !visualName.startsWith(originalName + ' ') &&
                            !shouldSkip) {
                            // Only replace if it's a standalone word and NOT followed by a number (which would indicate it's already a visual name)
                            // Use negative lookahead to avoid replacing "Goblin" in "Goblin 2"
                            // Make it case-insensitive to catch "goblin" (lowercase) and "Goblin" (capitalized)
                            const beforeName = processedNarration;
                            processedNarration = processedNarration.replace(
                                new RegExp(`\\b${escapeRegex(originalName)}(?!\\s+\\d)`, 'gi'),
                                visualName
                            );
                            if (beforeName !== processedNarration) {
                                log.debug(`Replaced name "${originalName}" with "${visualName}"`, {
                                    module: 'CombatManager',
                                    action: 'postProcessNarration',
                                });
                            }
                        } else {
                            if (originalName !== visualName) {
                                log.debug(`Skipped replacing "${originalName}" -> "${visualName}": already present or would create duplicate`, {
                                    module: 'CombatManager',
                                    action: 'postProcessNarration',
                                    hasFullVisualName,
                                    hasBaseNameWithNumber,
                                });
                            }
                        }
                    }
                    
                    log.debug(`Final processed narration: ${processedNarration.substring(0, 100)}...`, {
                        module: 'CombatManager',
                        action: 'postProcessNarration',
                    });
                    messages.push({ sender: 'DM', content: processedNarration });
                }

                if (targetId && requestedRolls && requestedRolls.length > 0) {
                    // Resolve targetId (can be visual name or uniqueId)
                    const resolved = resolveEnemyId(targetId, updatedEnemies, initiativeOrder, updatedParty);
                    
                    // For AI, if ambiguous, choose the first match (or could use tactical logic)
                    let resolvedTargetId = resolved.uniqueId;
                    if (resolved.ambiguous && resolved.matches.length > 0) {
                        // Choose first match (could be improved with tactical logic)
                        const firstMatchName = resolved.matches[0];
                        const firstMatchCombatant = initiativeOrder.find(c => c.characterName === firstMatchName);
                        resolvedTargetId = firstMatchCombatant?.id || null;
                        localLog(`AI target ambiguous, choosing first match: ${firstMatchName} (${resolvedTargetId})`);
                    }
                    
                    // Use resolved uniqueId to find target
                    const finalTargetId = resolvedTargetId || targetId;
                    const target = [...updatedParty, ...updatedEnemies].find(
                        c => c.id === finalTargetId || (c as any).uniqueId === finalTargetId
                    );

                    if (target) {
                        // Get visual name for target (enemy or party member)
                        const targetVisualName = getVisualName(
                            (target as any).uniqueId || target.id,
                            initiativeOrder,
                            updatedEnemies
                        );
                        
                        localLog(`Found target: ${targetVisualName}`);
                        
                        // Track attack result to ensure damage only applies if attack hits
                        let attackHit = false;
                        let attackRoll: any = null;
                        
                        // Log what rolls the tactician requested
                        log.debug('Processing rolls for AI combatant', {
                            module: 'CombatManager',
                            combatant: activeCombatant.characterName,
                            rollsCount: requestedRolls.length,
                            rollDescriptions: requestedRolls.map((r: any) => r.description),
                        });
                        
                        // Process rolls in order: attack first, then damage/healing
                        for (const rollData of requestedRolls) {
                            try {
                            const roll = await diceRollerTool({ ...rollData, roller: activeCombatant.characterName });
                            diceRolls.push(roll);

                                const rollDescription = (roll.description || '').toLowerCase();
                                // Extract attackType from rollData (provided by AI tactician)
                                const attackType = (rollData as any).attackType;
                                
                                // Fallback to keyword detection if attackType is not provided (for backward compatibility)
                                const isSavingThrowFromKeywords = rollDescription.includes('saving') || rollDescription.includes('salvación') || 
                                                     rollDescription.includes('save') || rollDescription.includes('salvacion');
                                
                                // Determine if this is a saving throw spell (prefer explicit attackType, fallback to keywords)
                                const isSavingThrow = attackType === 'saving_throw' || (!attackType && isSavingThrowFromKeywords);
                                
                                log.debug('Processing individual roll', {
                                    module: 'CombatManager',
                                    combatant: activeCombatant.characterName,
                                    description: roll.description,
                                    attackType: attackType || 'not specified',
                                    isAttack: rollDescription.includes('attack') || rollDescription.includes('ataque'),
                                    isDamage: rollDescription.includes('damage') || rollDescription.includes('daño'),
                                    isHealing: rollDescription.includes('healing') || rollDescription.includes('curación') || rollDescription.includes('cura'),
                                    isSavingThrow: isSavingThrow,
                                });
                                
                                // Process attack roll (check both English and Spanish)
                                if (rollDescription.includes('attack') || rollDescription.includes('ataque')) {
                                    attackRoll = roll;
                                    
                                    // Validate target AC exists
                                    let finalTargetAC: number;
                                    if (target.ac === undefined || target.ac === null) {
                                        log.warn('Attack roll processed but target AC is missing', {
                                            module: 'CombatManager',
                                            targetId: target.id,
                                            targetName: targetVisualName,
                                            roller: activeCombatant.characterName,
                                        });
                                        // Use default AC if missing
                                        finalTargetAC = 10;
                                } else {
                                        // Validate AC is a number
                                        const targetAC = typeof target.ac === 'number' ? target.ac : parseInt(String(target.ac), 10);
                                        if (isNaN(targetAC)) {
                                            log.warn('Target AC is not a valid number, using default', {
                                                module: 'CombatManager',
                                                targetId: target.id,
                                                targetAC: target.ac,
                                            });
                                            finalTargetAC = 10;
                                        } else {
                                            finalTargetAC = targetAC;
                                        }
                                    }
                                    
                                    attackHit = roll.totalResult >= finalTargetAC;
                                    
                                    // Update roll with combat information
                                    const rollIndex = diceRolls.length - 1;
                                    const updatedRoll = {
                                        ...roll,
                                        targetName: targetVisualName,
                                        targetAC: finalTargetAC,
                                        attackHit: attackHit,
                                        outcome: attackHit ? (roll.outcome === 'crit' ? 'crit' : 'success') : (roll.outcome === 'pifia' ? 'pifia' : 'fail'),
                                    };
                                    diceRolls[rollIndex] = updatedRoll;
                                    
                                    log.debug('Updated attack roll with combat information', {
                                        module: 'CombatManager',
                                        roller: activeCombatant.characterName,
                                        targetName: targetVisualName,
                                        targetAC: finalTargetAC,
                                        attackHit: attackHit,
                                        outcome: updatedRoll.outcome,
                                        rollTotal: roll.totalResult,
                                    });
                                    
                                    if (attackHit) {
                                        // Check for crit
                                        if (roll.outcome === 'crit') {
                                            messages.push({ 
                                                sender: 'DM', 
                                                content: `¡${activeCombatant.characterName} ataca a ${targetVisualName} con un golpe crítico!` 
                                            });
                                        } else {
                                            messages.push({ 
                                                sender: 'DM', 
                                                content: `${activeCombatant.characterName} ataca a ${targetVisualName} y acierta (${roll.totalResult} vs AC ${finalTargetAC}).` 
                                            });
                                        }
                                        log.debug('Attack hit', {
                                            module: 'CombatManager',
                                            rollTotal: roll.totalResult,
                                            targetAC: finalTargetAC,
                                            isCrit: roll.outcome === 'crit',
                                        });
                                    } else {
                                        // Check for pifia
                                        if (roll.outcome === 'pifia') {
                                            messages.push({ 
                                                sender: 'DM', 
                                                content: `¡${activeCombatant.characterName} falla estrepitosamente al atacar a ${targetVisualName}! (Pifia: ${roll.totalResult} vs AC ${finalTargetAC})` 
                                            });
                                        } else {
                                            messages.push({ 
                                                sender: 'DM', 
                                                content: `${activeCombatant.characterName} ataca a ${targetVisualName}, pero falla (${roll.totalResult} vs AC ${finalTargetAC}).` 
                                            });
                                        }
                                        log.debug('Attack missed', {
                                            module: 'CombatManager',
                                            rollTotal: roll.totalResult,
                                            targetAC: finalTargetAC,
                                            isPifia: roll.outcome === 'pifia',
                                        });
                                    }
                                    
                                    // If attack missed, skip damage rolls
                                    if (!attackHit) {
                                        log.debug('Attack missed, skipping damage rolls', {
                                            module: 'CombatManager',
                                        });
                                    break; // No damage if attack misses
                                }
                                }
                                // Process damage roll (only if attack hit or it's a saving throw spell)
                                else if (rollDescription.includes('damage') || rollDescription.includes('daño')) {
                                    // Determine if this is a saving throw spell using attackType (preferred) or keywords (fallback)
                                    const isSavingThrowSpell = isSavingThrow;
                                    
                                    // Validate that attack hit first (unless it's a saving throw spell)
                                    if (attackRoll === null && !isSavingThrowSpell) {
                                        log.warn('Damage roll without prior attack roll - SKIPPING', {
                                            module: 'CombatManager',
                                            roller: activeCombatant.characterName,
                                            rollDescription: roll.description,
                                            attackType: attackType || 'not specified',
                                        });
                                        // Remove the invalid roll from the array
                                        diceRolls.pop();
                                        continue; // Skip damage if there was no attack roll
                                    }
                                    
                                    if (!attackHit && !isSavingThrowSpell) {
                                        log.debug('Skipping damage roll because attack missed', {
                                            module: 'CombatManager',
                                            roller: activeCombatant.characterName,
                                            attackTotal: attackRoll?.totalResult,
                                            targetAC: target.ac,
                                        });
                                        // Remove the invalid roll from the array
                                        diceRolls.pop();
                                        continue; // Skip damage if attack didn't hit
                                    }
                                    
                                    // Log if this is a saving throw spell
                                    if (isSavingThrowSpell) {
                                        log.debug('Processing saving throw spell damage', {
                                            module: 'CombatManager',
                                            roller: activeCombatant.characterName,
                                            targetName: targetVisualName,
                                            damage: roll.totalResult,
                                            attackType: attackType,
                                        });
                                    }
                                    
                                    // Validate damage is positive
                                    if (roll.totalResult <= 0) {
                                        log.warn('Damage roll resulted in non-positive damage', {
                                            module: 'CombatManager',
                                            damage: roll.totalResult,
                                            roller: activeCombatant.characterName,
                                        });
                                        messages.push({ 
                                            sender: 'DM', 
                                            content: `${activeCombatant.characterName} intenta hacer daño a ${targetVisualName}, pero no causa ningún daño.` 
                                        });
                                        continue;
                                    }
                                    
                                const targetIsPlayer = updatedParty.some(p => p.id === target.id);
                                    const previousHP = targetIsPlayer 
                                        ? updatedParty.find(p => p.id === target.id)?.hp.current 
                                        : updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)?.hp.current;
                                    
                                if (targetIsPlayer) {
                                        updatedParty = updatedParty.map(p => {
                                            if (p.id === target.id) {
                                                const updated = { ...p, hp: { ...p.hp, current: Math.max(0, p.hp.current - roll.totalResult) } };
                                                return validateAndClampHP(updated);
                                            }
                                            return p;
                                        });
                                } else {
                                        updatedEnemies = updatedEnemies.map(e => {
                                            if ((e as any).uniqueId === (target as any).uniqueId) {
                                                const updated = { ...e, hp: { ...e.hp, current: Math.max(0, e.hp.current - roll.totalResult) } };
                                                return validateAndClampHP(updated);
                                            }
                                            return e;
                                        });
                                    }
                                    
                                    const newHP = targetIsPlayer 
                                        ? updatedParty.find(p => p.id === target.id)?.hp.current 
                                        : updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)?.hp.current;
                                    
                                    // Check if target was killed by this damage
                                    const targetKilled = newHP !== undefined && newHP <= 0;
                                    
                                    // Update roll with damage information
                                    const rollIndex = diceRolls.length - 1;
                                    diceRolls[rollIndex] = {
                                        ...roll,
                                        targetName: targetVisualName,
                                        damageDealt: roll.totalResult,
                                        targetKilled: targetKilled,
                                    };
                                    
                                    messages.push({ 
                                        sender: 'DM', 
                                        content: `${activeCombatant.characterName} ha hecho ${roll.totalResult} puntos de daño a ${targetVisualName}${previousHP !== undefined && newHP !== undefined ? ` (${previousHP} → ${newHP} HP)` : ''}.` 
                                    });
                                    
                                    log.debug('Damage applied', {
                                        module: 'CombatManager',
                                        target: targetVisualName,
                                        damage: roll.totalResult,
                                        previousHP,
                                        newHP,
                                        targetKilled,
                                    });
                                    
                                    // Check if target was defeated
                                    if (targetKilled) {
                                        messages.push({
                                            sender: 'DM',
                                            content: `¡${activeCombatant.characterName} ha matado a ${targetVisualName}!`
                                        });
                                        localLog(`${activeCombatant.characterName} killed ${targetVisualName}!`);
                                    }
                                    
                                    // Check if combat has ended after applying damage
                                    localLog('checkEndOfCombat: Checking for end of combat...');
                                    const combatCheck = checkEndOfCombat(updatedParty, updatedEnemies);
                                    if (combatCheck.combatEnded) {
                                        localLog(`checkEndOfCombat: End of combat detected! [Razón: ${combatCheck.reason}]`);
                                        if (combatCheck.reason === 'Todos los enemigos derrotados') {
                                            messages.push({ sender: 'DM', content: '¡Victoria! Todos los enemigos han sido derrotados.' });
                                        } else if (combatCheck.reason === 'Todos los aliados derrotados') {
                                            messages.push({ sender: 'DM', content: '¡Derrota! Todos los aliados han caído en combate.' });
                                        }
                                        // Mark combat as ended and break out of the roll loop
                                        combatHasEnded = true;
                                        break;
                                    }
                                }
                                // Process healing roll
                                else if (rollDescription.includes('healing') || rollDescription.includes('curación') || rollDescription.includes('cura')) {
                                    // Validate healing is positive
                                    if (roll.totalResult <= 0) {
                                        log.warn('Healing roll resulted in non-positive healing', {
                                            module: 'CombatManager',
                                            healing: roll.totalResult,
                                            roller: activeCombatant.characterName,
                                        });
                                        messages.push({ 
                                            sender: 'DM', 
                                            content: `${activeCombatant.characterName} intenta curar a ${targetVisualName}, pero no tiene efecto.` 
                                        });
                                        continue;
                                    }
                                    
                                const targetIsPlayer = updatedParty.some(p => p.id === target.id);
                                    if (targetIsPlayer) {
                                        const previousHP = updatedParty.find(p => p.id === target.id)?.hp.current;
                                        const wasUnconscious = previousHP !== undefined && previousHP <= 0;
                                        
                                        updatedParty = updatedParty.map(p => {
                                            if (p.id === target.id) {
                                                const updated = { 
                                                    ...p, 
                                                    hp: { ...p.hp, current: Math.min(p.hp.max, p.hp.current + roll.totalResult) },
                                                    isDead: false // Curación revive personajes inconscientes
                                                };
                                                return validateAndClampHP(updated);
                                            }
                                            return p;
                                        });
                                        const newHP = updatedParty.find(p => p.id === target.id)?.hp.current;
                                        
                                        // Update roll with healing information
                                        const rollIndex = diceRolls.length - 1;
                                        diceRolls[rollIndex] = {
                                            ...roll,
                                            targetName: targetVisualName,
                                            healingAmount: roll.totalResult,
                                        };
                                        
                                        // Narrativa de revivencia si el personaje estaba inconsciente
                                        if (wasUnconscious && newHP !== undefined && newHP > 0) {
                                            messages.push({ 
                                                sender: 'DM', 
                                                content: `${targetVisualName} recupera la consciencia gracias a la curación recibida.` 
                                            });
                                        }
                                        
                                        messages.push({ 
                                            sender: 'DM', 
                                            content: `${targetVisualName} es curado por ${roll.totalResult} puntos${previousHP !== undefined && newHP !== undefined ? ` (${previousHP} → ${newHP} HP)` : ''}.` 
                                        });
                                        
                                        log.debug('Healing applied', {
                                            module: 'CombatManager',
                                            target: targetVisualName,
                                            healing: roll.totalResult,
                                            previousHP,
                                            newHP,
                                        });
                                    } else {
                                        // Healing enemies is possible but less common
                                        const previousHP = updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)?.hp.current;
                                        updatedEnemies = updatedEnemies.map(e => {
                                            if ((e as any).uniqueId === (target as any).uniqueId) {
                                                const updated = { ...e, hp: { ...e.hp, current: Math.min(e.hp.max, e.hp.current + roll.totalResult) } };
                                                return validateAndClampHP(updated);
                                            }
                                            return e;
                                        });
                                        const newHP = updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)?.hp.current;
                                        
                                        // Update roll with healing information
                                        const rollIndex = diceRolls.length - 1;
                                        diceRolls[rollIndex] = {
                                            ...roll,
                                            targetName: targetVisualName,
                                            healingAmount: roll.totalResult,
                                        };
                                        
                                        messages.push({ 
                                            sender: 'DM', 
                                            content: `${targetVisualName} es curado por ${roll.totalResult} puntos${previousHP !== undefined && newHP !== undefined ? ` (${previousHP} → ${newHP} HP)` : ''}.` 
                                        });
                                        
                                        log.debug('Healing applied to enemy', {
                                            module: 'CombatManager',
                                            target: targetVisualName,
                                            healing: roll.totalResult,
                                            previousHP,
                                            newHP,
                                        });
                                    }
                                    // Note: We don't check for end of combat after healing, as healing shouldn't end combat
                                }
                            } catch (error: any) {
                                // Handle errors gracefully
                                log.error('Error processing dice roll', {
                                    module: 'CombatManager',
                                    roller: activeCombatant.characterName,
                                    rollData,
                                    error: error.message,
                                }, error);
                                
                                messages.push({ 
                                    sender: 'DM', 
                                    content: `${activeCombatant.characterName} intenta realizar una acción, pero algo sale mal.` 
                                });
                                
                                // Continue with next roll instead of breaking
                                continue;
                            }
                        }
                    } else { localLog(`Could not find target combatant with id: "${targetId}"`); }
                } else if (!targetId) { localLog('Action had no targetId.'); }
                
                // Only advance turn if combat hasn't ended
                if (!combatHasEnded) {
                currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
                activeCombatant = initiativeOrder[currentTurnIndex];
                }
            }
            
            // If combat ended, return final state
            if (combatHasEnded) {
                return {
                    messages,
                    diceRolls,
                    inCombat: false,
                    debugLogs,
                    turnIndex: 0,
                    initiativeOrder: [],
                    enemies: [],
                    updatedParty,
                    updatedEnemies,
                };
            }
            
            const playerCombatant = initiativeOrder.find(c => c.controlledBy === 'Player');
            localLog(`Loop Stopped. Control ceded to player ${playerCombatant?.characterName} at index ${currentTurnIndex}.`);
            
            return { messages, diceRolls, inCombat: true, debugLogs, turnIndex: currentTurnIndex, initiativeOrder, updatedParty, updatedEnemies };
        }
        
        // --- Combat Initiation Logic (remains the same) ---
        localLog("Initiating new combat sequence.");
        if (!combatantIds || !interpretedAction || !locationContext || !party) throw new Error("Combat initiation requires combatantIds, interpretedAction, locationContext, and party data.");
        const adventureData = await getAdventureData();
        const allEntities = adventureData.entities;
        const combatantData: any[] = [];
        for (const id of combatantIds) {
            let found = party.find(p => p.id === id);
            if (found) {
                // Issue #27: Verificar HP antes de incluir en combate
                if (found.hp && found.hp.current > 0) {
                    combatantData.push({ ...found, entityType: 'player', name: found.name, controlledBy: found.controlledBy });
                } else {
                    log.debug('Skipping dead party member in combat initiation', {
                        module: 'CombatManager',
                        characterName: found.name,
                        hp: found.hp?.current || 0,
                    });
                }
                continue;
            }
            found = allEntities.find((e: any) => e.id === id);
            if (found) {
                // Issue #27: Verificar si el enemigo ya existe en updatedEnemies y está muerto
                // Si no existe en updatedEnemies, asumir vivo (nuevo enemigo)
                const existingEnemy = updatedEnemies.find((e: any) => e.id === id || (e as any).uniqueId === id);
                if (!existingEnemy || (existingEnemy.hp && existingEnemy.hp.current > 0)) {
                    combatantData.push({ ...found, entityType: 'monster', name: found.name, controlledBy: 'AI' });
                } else {
                    log.debug('Skipping dead enemy in combat initiation', {
                        module: 'CombatManager',
                        enemyId: id,
                        hp: existingEnemy.hp?.current || 0,
                    });
                }
            } else {
                log.warn('Combatant ID not found in entities', {
                    module: 'CombatManager',
                    combatantId: id,
                    availableEntityIds: allEntities.map((e: any) => e.id),
                });
            }
        }
        const hostileEntities = combatantData.filter(c => c.entityType === 'monster');
        if (hostileEntities.length === 0) {
            messages.push({ sender: 'DM', content: "Atacas fervientemente al aire, pero no parece haber ninguna amenaza real a la vista." });
            return { messages, inCombat: false, debugLogs };
        }
        messages.push({ sender: 'System', content: `¡Comienza el Combate!` });
        // Generate uniqueIds for enemies based on their base name (extract from id if it has dashes)
        // This ensures consistent uniqueIds like "goblin-0", "goblin-1", "orco-0" instead of using array index
        // Group enemies by base name and number them within each group
        const enemyGroups = new Map<string, number>(); // Map<baseName, currentIndex>
        const initialEnemies = hostileEntities.map((e: any) => {
            // Extract base name from id (remove any existing numeric suffix)
            // e.g., "goblin-2" -> "goblin", "goblin" -> "goblin", "orco-1" -> "orco"
            const baseId = e.id.split('-').slice(0, -1).join('-') || e.id.split('-')[0] || e.id;
            
            // Get or initialize the index for this base name
            const currentIndex = enemyGroups.get(baseId) || 0;
            enemyGroups.set(baseId, currentIndex + 1);
            
            const uniqueId = `${baseId}-${currentIndex}`;
            return { ...e, uniqueId };
        });
        const combatantsForInit = [ ...combatantData.filter(c => c.entityType === 'player'), ...initialEnemies.map(e => ({...e, id: e.uniqueId })) ];
        const initiativeRolls: any[] = [];
        // Generate differentiated names BEFORE initiative rolls so we can use them in dice rolls
        const differentiatedNames = generateDifferentiatedNames(initialEnemies);
        
        for (const combatant of combatantsForInit) {
            let dexModifier = combatant.abilityModifiers?.destreza ?? Math.floor(((combatant.abilityScores?.destreza ?? combatant.stats?.dexterity ?? 10) - 10) / 2);
            const rollNotation = `1d20${dexModifier >= 0 ? `+${dexModifier}` : `${dexModifier}`}`;
            
            // Use differentiated name for enemies in dice rolls
            let rollerName = combatant.name;
            if (combatant.entityType === 'monster' && combatant.uniqueId) {
                const visualName = differentiatedNames.get(combatant.uniqueId);
                if (visualName) {
                    rollerName = visualName;
                }
            }
            
            const roll = await diceRollerTool({ roller: rollerName, rollNotation, description: 'Iniciativa' });
            diceRolls.push(roll);
            const combatantType = combatant.entityType === 'player' ? 'ally' : 'enemy';
            initiativeRolls.push({ id: combatant.id, name: combatant.name, total: roll.totalResult, type: combatantType, controlledBy: combatant.controlledBy });
        }
        initiativeRolls.sort((a, b) => b.total - a.total);
        
        // Differentiated names already generated above, reuse them
        
        // Create initiativeOrder with differentiated names for enemies
        const newInitiativeOrder: Combatant[] = initiativeRolls.map(r => {
            // Check if this is an enemy (has uniqueId pattern)
            const isEnemy = /^[^-]+-\d+$/.test(r.id);
            let displayName = r.name;
            
            if (isEnemy) {
                // Use differentiated name - should always be available for enemies
                const visualName = differentiatedNames.get(r.id);
                if (visualName) {
                    displayName = visualName;
                } else {
                    // Fallback: if not found, log warning but use original name
                    localLog(`Warning: Differentiated name not found for enemy ${r.id}, using original name ${r.name}`);
                }
            }
            
            return {
                id: r.id,
                characterName: displayName,
                total: r.total,
                type: r.type as any,
                controlledBy: r.controlledBy as any
            };
        });
        
        // Initialize enemies array for combat processing
        // If hp or ac are missing, fetch from D&D API
        updatedEnemies = [];
        for (const enemy of initialEnemies) {
            let hpValue: number | undefined;
            let hpMax: number | undefined;
            let ac = enemy.ac;
            
            // Handle hp: can be a number or an object { current: number, max: number }
            if (enemy.hp !== undefined && enemy.hp !== null) {
                if (typeof enemy.hp === 'number') {
                    // HP is a single number, use it for both current and max
                    hpValue = enemy.hp;
                    hpMax = enemy.hp;
                } else if (typeof enemy.hp === 'object' && 'current' in enemy.hp && 'max' in enemy.hp) {
                    // HP is an object with current and max
                    hpValue = typeof enemy.hp.current === 'number' ? enemy.hp.current : undefined;
                    hpMax = typeof enemy.hp.max === 'number' ? enemy.hp.max : undefined;
                }
            }
            
            // If hp or ac are missing, try to fetch from D&D API
            if (hpValue === undefined || hpMax === undefined || ac === undefined || ac === null) {
                localLog(`Enemy ${enemy.name} missing hp or ac, fetching from D&D API...`);
                const stats = await getMonsterStatsFromDndApi(enemy.name);
                
                if (stats) {
                    // Use fetched stats if we don't have them
                    hpValue = hpValue !== undefined ? hpValue : stats.hp;
                    hpMax = hpMax !== undefined ? hpMax : stats.hp;
                    ac = ac !== undefined && ac !== null ? ac : stats.ac;
                    localLog(`Fetched stats for ${enemy.name}: HP=${hpMax}, AC=${ac}`);
                } else {
                    // Use defaults if API lookup fails
                    hpValue = hpValue !== undefined ? hpValue : 10;
                    hpMax = hpMax !== undefined ? hpMax : 10;
                    ac = ac !== undefined && ac !== null ? ac : 10;
                    localLog(`Using default stats for ${enemy.name}: HP=${hpMax}, AC=${ac}`);
                }
            }
            
            // Ensure we have valid values (should always be true at this point, but double-check)
            if (hpValue === undefined || hpMax === undefined) {
                log.warn('Enemy HP still undefined after all attempts, using defaults', {
                    module: 'CombatManager',
                    enemyName: enemy.name,
                    enemyId: enemy.id,
                });
                hpValue = 10;
                hpMax = 10;
            }
            
            if (ac === undefined || ac === null) {
                log.warn('Enemy AC still undefined after all attempts, using default', {
                    module: 'CombatManager',
                    enemyName: enemy.name,
                    enemyId: enemy.id,
                });
                ac = 10;
            }
            
            // Create enemy with validated HP
            // IMPORTANT: Use uniqueId as id to maintain consistency with initiativeOrder
            // The original id from JSON is preserved in the enemy object but not used as the primary identifier
            const newEnemy = {
                uniqueId: enemy.uniqueId,
                id: enemy.uniqueId, // Use uniqueId as id to match initiativeOrder
                name: enemy.name,
                color: '#ef4444',
                hp: { current: hpValue, max: hpMax },
                ac: ac,
            };
            
            // Validate and clamp HP before adding to array
            const validatedEnemy = validateAndClampHP(newEnemy);
            updatedEnemies.push(validatedEnemy);
        }
        
        // Generate narrative BEFORE processing combat turns (so it appears first in the chat)
        const historyTranscript = conversationHistory.map(formatMessageForTranscript).join('\n');
        const narrativeResult = await narrativeExpert({ playerAction, locationId, locationContext: JSON.stringify(locationContext), conversationHistory: historyTranscript, interpretedAction: JSON.stringify(interpretedAction) });
        if (narrativeResult.debugLogs) narrativeResult.debugLogs.forEach(log => debugLogs.push(log));
        if (narrativeResult.dmNarration) {
            // Post-process narration to replace enemy IDs/names with visual names
            // IMPORTANT: Process in reverse order (longest names first) to avoid multiple replacements
            let processedNarration = narrativeResult.dmNarration;
            const differentiatedNames = generateDifferentiatedNames(updatedEnemies);
            
            // FIRST: Replace ordinal references (e.g., "primer goblin" -> "Goblin 1")
            processedNarration = replaceOrdinalReferences(processedNarration, updatedEnemies, differentiatedNames);
            
            // Sort enemies by visual name length (longest first) to avoid replacing "Goblin 2" with "Goblin 1 2"
            const enemiesSorted = [...updatedEnemies].sort((a, b) => {
                const nameA = differentiatedNames.get(a.uniqueId) || a.name;
                const nameB = differentiatedNames.get(b.uniqueId) || b.name;
                return nameB.length - nameA.length; // Longest first
            });
            
            for (const enemy of enemiesSorted) {
                const visualName = differentiatedNames.get(enemy.uniqueId) || enemy.name;
                const originalName = enemy.name;
                
                // Log for debugging
                if (originalName !== visualName) {
                    log.debug(`Post-processing DM narration: ${originalName} -> ${visualName} (uniqueId: ${enemy.uniqueId})`, {
                        module: 'CombatManager',
                        action: 'postProcessDmNarration',
                    });
                }
                
                // Replace uniqueId references first (e.g., "goblin-0", "goblin-1")
                const beforeUniqueId = processedNarration;
                processedNarration = processedNarration.replace(
                    new RegExp(`\\b${enemy.uniqueId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
                    visualName
                );
                if (beforeUniqueId !== processedNarration) {
                    log.debug(`Replaced uniqueId ${enemy.uniqueId} with ${visualName} in DM narration`, {
                        module: 'CombatManager',
                        action: 'postProcessDmNarration',
                    });
                }
                
                // Replace original name references ONLY if:
                // 1. The visual name is different from the original name
                // 2. The original name is NOT already part of a visual name (e.g., don't replace "Goblin" in "Goblin 2")
                // 3. Check if the FULL visual name (with number) is already present (case-insensitive)
                //    BUT allow replacement if it's just the base name without number
                const visualNameLower = visualName.toLowerCase();
                const narrationLower = processedNarration.toLowerCase();
                
                // Check if the full visual name (e.g., "goblin 1") is present
                // We need to be smart: if we see "goblin 1" (with number), don't replace "goblin" standalone
                // But if we only see "goblin" (without number), we should replace it
                const hasFullVisualName = new RegExp(`\\b${escapeRegex(visualNameLower)}\\b`).test(narrationLower);
                const hasBaseNameWithNumber = new RegExp(`\\b${escapeRegex(originalName.toLowerCase())}\\s+\\d+\\b`).test(narrationLower);
                
                // Only skip if the FULL visual name is present, OR if the base name is already followed by a number
                const shouldSkip = hasFullVisualName || hasBaseNameWithNumber;
                
                if (originalName !== visualName && 
                    !visualName.startsWith(originalName + ' ') &&
                    !shouldSkip) {
                    // Only replace if it's a standalone word and NOT followed by a number (which would indicate it's already a visual name)
                    // Use negative lookahead to avoid replacing "Goblin" in "Goblin 2"
                    // Make it case-insensitive to catch "goblin" (lowercase) and "Goblin" (capitalized)
                    const beforeName = processedNarration;
                    processedNarration = processedNarration.replace(
                        new RegExp(`\\b${escapeRegex(originalName)}(?!\\s+\\d)`, 'gi'),
                        visualName
                    );
                    if (beforeName !== processedNarration) {
                        log.debug(`Replaced name "${originalName}" with "${visualName}" in DM narration`, {
                            module: 'CombatManager',
                            action: 'postProcessDmNarration',
                        });
                    }
                } else {
                    if (originalName !== visualName) {
                        log.debug(`Skipped replacing "${originalName}" -> "${visualName}" in DM narration: already present or would create duplicate`, {
                            module: 'CombatManager',
                            action: 'postProcessDmNarration',
                            hasFullVisualName,
                            hasBaseNameWithNumber,
                            narrationSample: processedNarration.substring(0, 100),
                        });
                    }
                }
            }
            
            log.debug(`Final processed DM narration: ${processedNarration.substring(0, 100)}...`, {
                module: 'CombatManager',
                action: 'postProcessDmNarration',
            });
            const { html } = await markdownToHtml({ markdown: processedNarration });
            messages.push({ sender: 'DM', content: html, originalContent: processedNarration });
        }
        
        // Process AI turns automatically if the first combatant is an AI
        let currentTurnIndex = 0;
        let activeCombatant = newInitiativeOrder[currentTurnIndex];
        
        localLog(`Combat initiated. First combatant: ${activeCombatant.characterName} (controlled by: ${activeCombatant.controlledBy})`);
        
        // Process AI turns automatically until it's the player's turn
        let combatHasEnded = false;
        while(activeCombatant && activeCombatant.controlledBy === 'AI' && !combatHasEnded) {
            localLog(`Processing turn for AI combatant ${activeCombatant.characterName} at index ${currentTurnIndex}...`);
            
            const isCompanion = updatedParty.some(p => p.id === activeCombatant.id);
            
            // Issue #27: Check if active combatant is dead/unconscious - skip their turn if so
            const activeCombatantDataInit = isCompanion 
                ? updatedParty.find(p => p.id === activeCombatant.id)
                : updatedEnemies.find(e => (e as any).uniqueId === activeCombatant.id);
            
            if (activeCombatantDataInit && isUnconsciousOrDead(activeCombatantDataInit)) {
                log.debug('Skipping turn for dead/unconscious combatant (init)', {
                    module: 'CombatManager',
                    combatant: activeCombatant.characterName,
                    hp: activeCombatantDataInit.hp.current,
                    isDead: activeCombatantDataInit.isDead,
                });
                
                // Mensaje apropiado según estado
                const statusMessage = activeCombatantDataInit.isDead === true 
                    ? `${activeCombatant.characterName} está muerto y no puede actuar.`
                    : `${activeCombatant.characterName} está inconsciente y no puede actuar.`;
                
                messages.push({
                    sender: 'DM',
                    content: statusMessage
                });
                
                // Advance to next turn
                currentTurnIndex = (currentTurnIndex + 1) % newInitiativeOrder.length;
                activeCombatant = newInitiativeOrder[currentTurnIndex];
                continue;
            }
            
            let tacticianResponse;

            // Get visual names for enemies to pass to tacticians
            const enemyVisualNamesInit = new Map<string, string>();
            for (const enemy of updatedEnemies) {
                const visualName = getVisualName(enemy.uniqueId, newInitiativeOrder, updatedEnemies);
                enemyVisualNamesInit.set(enemy.uniqueId, visualName);
                log.debug(`Enemy mapping (init): uniqueId=${enemy.uniqueId}, originalName="${enemy.name}", visualName="${visualName}"`, {
                    module: 'CombatManager',
                    action: 'getVisualNamesInit',
                });
            }

            // Filter out dead combatants before passing to tactician (Issue #18)
            const alivePartyInit = updatedParty.filter(p => p.hp.current > 0);
            const aliveEnemiesInit = updatedEnemies.filter(e => e.hp.current > 0);
            
            log.debug('Filtering dead combatants for tactician (init)', {
                module: 'CombatManager',
                activeCombatant: activeCombatant.characterName,
                totalParty: updatedParty.length,
                aliveParty: alivePartyInit.length,
                totalEnemies: updatedEnemies.length,
                aliveEnemies: aliveEnemiesInit.length,
            });
            
            const baseTacticianInput = {
                activeCombatant: activeCombatant.characterName,
                party: alivePartyInit,
                enemies: aliveEnemiesInit.map(e => ({ 
                    name: enemyVisualNamesInit.get(e.uniqueId) || e.name, // Use visual name
                    id: e.uniqueId, 
                    hp: getHpStatus(e.hp.current, e.hp.max) 
                })),
                locationDescription: locationContext?.description || "An unknown battlefield",
                conversationHistory: conversationHistory.map(formatMessageForTranscript).join('\n')
            };

            if (isCompanion) {
                localLog(`Invoking CompanionTacticianTool for ${activeCombatant.characterName}.`);
                tacticianResponse = await companionTacticianTool(baseTacticianInput);
            } else {
                localLog(`Invoking EnemyTacticianTool for ${activeCombatant.characterName}.`);
                tacticianResponse = await enemyTacticianTool(baseTacticianInput);
            }

            const { narration, targetId, diceRolls: requestedRolls } = tacticianResponse;

            localLog(`Tactician for ${activeCombatant.characterName} decided action targeting ${targetId || 'no one'}.`);

            if (narration) {
                // Post-process narration to replace enemy IDs/names with visual names
                // IMPORTANT: Process in reverse order (longest names first) to avoid multiple replacements
                let processedNarration = narration;
                
                // FIRST: Replace ordinal references (e.g., "primer goblin" -> "Goblin 1")
                processedNarration = replaceOrdinalReferences(processedNarration, updatedEnemies, enemyVisualNamesInit);
                
                // Sort enemies by visual name length (longest first) to avoid replacing "Goblin 2" with "Goblin 1 2"
                const enemiesSorted = [...updatedEnemies].sort((a, b) => {
                    const nameA = enemyVisualNamesInit.get(a.uniqueId) || a.name;
                    const nameB = enemyVisualNamesInit.get(b.uniqueId) || b.name;
                    return nameB.length - nameA.length; // Longest first
                });
                
                for (const enemy of enemiesSorted) {
                    const visualName = enemyVisualNamesInit.get(enemy.uniqueId) || enemy.name;
                    
                    // Replace uniqueId references first (e.g., "goblin-0", "goblin-1")
                    processedNarration = processedNarration.replace(
                        new RegExp(`\\b${enemy.uniqueId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
                        visualName
                    );
                    
                    // Replace original name references ONLY if:
                    // 1. The visual name is different from the original name
                    // 2. The original name is NOT already part of a visual name (e.g., don't replace "Goblin" in "Goblin 2")
                    // 3. Check if the FULL visual name (with number) is already present (case-insensitive)
                    //    BUT allow replacement if it's just the base name without number
                    const visualNameLower = visualName.toLowerCase();
                    const narrationLower = processedNarration.toLowerCase();
                    
                    // Check if the full visual name (e.g., "goblin 1") is present
                    const hasFullVisualName = new RegExp(`\\b${escapeRegex(visualNameLower)}\\b`).test(narrationLower);
                    const hasBaseNameWithNumber = new RegExp(`\\b${escapeRegex(enemy.name.toLowerCase())}\\s+\\d+\\b`).test(narrationLower);
                    
                    // Only skip if the FULL visual name is present, OR if the base name is already followed by a number
                    const shouldSkip = hasFullVisualName || hasBaseNameWithNumber;
                    
                    if (enemy.name !== visualName && 
                        !visualName.startsWith(enemy.name + ' ') &&
                        !shouldSkip) {
                        // Only replace if it's a standalone word and NOT followed by a number (which would indicate it's already a visual name)
                        // Use negative lookahead to avoid replacing "Goblin" in "Goblin 2"
                        // Make it case-insensitive to catch "goblin" (lowercase) and "Goblin" (capitalized)
                        const beforeName = processedNarration;
                        processedNarration = processedNarration.replace(
                            new RegExp(`\\b${escapeRegex(enemy.name)}(?!\\s+\\d)`, 'gi'),
                            visualName
                        );
                        if (beforeName !== processedNarration) {
                            log.debug(`Replaced name "${enemy.name}" with "${visualName}"`, {
                                module: 'CombatManager',
                                action: 'postProcessNarrationInit',
                            });
                        }
                    } else {
                        if (enemy.name !== visualName) {
                            log.debug(`Skipped replacing "${enemy.name}" -> "${visualName}": already present or would create duplicate`, {
                                module: 'CombatManager',
                                action: 'postProcessNarrationInit',
                                hasFullVisualName,
                                hasBaseNameWithNumber,
                            });
                        }
                    }
                }
                messages.push({ sender: 'DM', content: processedNarration });
            }

            if (targetId && requestedRolls && requestedRolls.length > 0) {
                // Resolve targetId (can be visual name or uniqueId)
                const resolved = resolveEnemyId(targetId, updatedEnemies, newInitiativeOrder, updatedParty);
                
                // For AI, if ambiguous, choose the first match (or could use tactical logic)
                let resolvedTargetId = resolved.uniqueId;
                if (resolved.ambiguous && resolved.matches.length > 0) {
                    // Choose first match (could be improved with tactical logic)
                    const firstMatchName = resolved.matches[0];
                    const firstMatchCombatant = newInitiativeOrder.find(c => c.characterName === firstMatchName);
                    resolvedTargetId = firstMatchCombatant?.id || null;
                    localLog(`AI target ambiguous, choosing first match: ${firstMatchName} (${resolvedTargetId})`);
                }
                
                // Use resolved uniqueId to find target
                const finalTargetId = resolvedTargetId || targetId;
                const target = [...updatedParty, ...updatedEnemies].find(
                    c => c.id === finalTargetId || (c as any).uniqueId === finalTargetId
                );

                if (target) {
                    // Get visual name for target (enemy or party member)
                    const targetVisualName = getVisualName(
                        (target as any).uniqueId || target.id,
                        newInitiativeOrder,
                        updatedEnemies
                    );
                    
                        localLog(`Found target: ${targetVisualName}`);
                        
                        // Track attack result to ensure damage only applies if attack hits
                        let attackHit = false;
                        let attackRoll: any = null;
                        
                        // Log what rolls the tactician requested
                        log.debug('Processing rolls for AI combatant', {
                            module: 'CombatManager',
                            combatant: activeCombatant.characterName,
                            rollsCount: requestedRolls.length,
                            rollDescriptions: requestedRolls.map((r: any) => r.description),
                        });
                        
                        // Process rolls in order: attack first, then damage/healing
                        for (const rollData of requestedRolls) {
                            try {
                                const roll = await diceRollerTool({ ...rollData, roller: activeCombatant.characterName });
                                diceRolls.push(roll);
                                
                                const rollDescription = (roll.description || '').toLowerCase();
                                // Extract attackType from rollData (provided by AI tactician)
                                const attackType = (rollData as any).attackType;
                                
                                // Fallback to keyword detection if attackType is not provided (for backward compatibility)
                                const isSavingThrowFromKeywords = rollDescription.includes('saving') || rollDescription.includes('salvación') || 
                                                     rollDescription.includes('save') || rollDescription.includes('salvacion');
                                
                                // Determine if this is a saving throw spell (prefer explicit attackType, fallback to keywords)
                                const isSavingThrow = attackType === 'saving_throw' || (!attackType && isSavingThrowFromKeywords);
                                
                                log.debug('Processing individual roll', {
                                    module: 'CombatManager',
                                    combatant: activeCombatant.characterName,
                                    description: roll.description,
                                    attackType: attackType || 'not specified',
                                    isAttack: rollDescription.includes('attack') || rollDescription.includes('ataque'),
                                    isDamage: rollDescription.includes('damage') || rollDescription.includes('daño'),
                                    isHealing: rollDescription.includes('healing') || rollDescription.includes('curación') || rollDescription.includes('cura'),
                                    isSavingThrow: isSavingThrow,
                                });
                                
                                // Process attack roll (check both English and Spanish)
                                if (rollDescription.includes('attack') || rollDescription.includes('ataque')) {
                                    attackRoll = roll;
                                    
                                    // Validate target AC exists
                                    let finalTargetAC: number;
                                    if (target.ac === undefined || target.ac === null) {
                                        log.warn('Attack roll processed but target AC is missing', {
                                            module: 'CombatManager',
                                            targetId: target.id,
                                            targetName: targetVisualName,
                                            roller: activeCombatant.characterName,
                                        });
                                        // Use default AC if missing
                                        finalTargetAC = 10;
                                    } else {
                                        // Validate AC is a number
                                        const targetAC = typeof target.ac === 'number' ? target.ac : parseInt(String(target.ac), 10);
                                        if (isNaN(targetAC)) {
                                            log.warn('Target AC is not a valid number, using default', {
                                                module: 'CombatManager',
                                                targetId: target.id,
                                                targetAC: target.ac,
                                            });
                                            finalTargetAC = 10;
                                        } else {
                                            finalTargetAC = targetAC;
                                        }
                                    }
                                    
                                    attackHit = roll.totalResult >= finalTargetAC;
                                    
                                    // Update roll with combat information
                                    const rollIndex = diceRolls.length - 1;
                                    const updatedRoll = {
                                        ...roll,
                                        targetName: targetVisualName,
                                        targetAC: finalTargetAC,
                                        attackHit: attackHit,
                                        outcome: attackHit ? (roll.outcome === 'crit' ? 'crit' : 'success') : (roll.outcome === 'pifia' ? 'pifia' : 'fail'),
                                    };
                                    diceRolls[rollIndex] = updatedRoll;
                                    
                                    log.debug('Updated attack roll with combat information', {
                                        module: 'CombatManager',
                                        roller: activeCombatant.characterName,
                                        targetName: targetVisualName,
                                        targetAC: finalTargetAC,
                                        attackHit: attackHit,
                                        outcome: updatedRoll.outcome,
                                        rollTotal: roll.totalResult,
                                    });
                                    
                                    if (attackHit) {
                                        // Check for crit
                                        if (roll.outcome === 'crit') {
                                            messages.push({ 
                                                sender: 'DM', 
                                                content: `¡${activeCombatant.characterName} ataca a ${targetVisualName} con un golpe crítico!` 
                                            });
                                        } else {
                                            messages.push({ 
                                                sender: 'DM', 
                                                content: `${activeCombatant.characterName} ataca a ${targetVisualName} y acierta (${roll.totalResult} vs AC ${finalTargetAC}).` 
                                            });
                                        }
                                        log.debug('Attack hit', {
                                            module: 'CombatManager',
                                            rollTotal: roll.totalResult,
                                            targetAC: finalTargetAC,
                                            isCrit: roll.outcome === 'crit',
                                        });
                                    } else {
                                        // Check for pifia
                                        if (roll.outcome === 'pifia') {
                                            messages.push({ 
                                                sender: 'DM', 
                                                content: `¡${activeCombatant.characterName} falla estrepitosamente al atacar a ${targetVisualName}! (Pifia: ${roll.totalResult} vs AC ${finalTargetAC})` 
                                            });
                                        } else {
                                            messages.push({ 
                                                sender: 'DM', 
                                                content: `${activeCombatant.characterName} ataca a ${targetVisualName}, pero falla (${roll.totalResult} vs AC ${finalTargetAC}).` 
                                            });
                                        }
                                        log.debug('Attack missed', {
                                            module: 'CombatManager',
                                            rollTotal: roll.totalResult,
                                            targetAC: finalTargetAC,
                                            isPifia: roll.outcome === 'pifia',
                                        });
                                    }
                                    
                                    // If attack missed, skip damage rolls
                                    if (!attackHit) {
                                        log.debug('Attack missed, skipping damage rolls', {
                                            module: 'CombatManager',
                                        });
                                        break; // No damage if attack misses
                                    }
                                }
                                // Process damage roll (only if attack hit or it's a saving throw spell)
                                else if (rollDescription.includes('damage') || rollDescription.includes('daño')) {
                                    // Determine if this is a saving throw spell using attackType (preferred) or keywords (fallback)
                                    const isSavingThrowSpell = isSavingThrow;
                                    
                                    // Validate that attack hit first (unless it's a saving throw spell)
                                    if (attackRoll === null && !isSavingThrowSpell) {
                                        log.warn('Damage roll without prior attack roll - SKIPPING', {
                                            module: 'CombatManager',
                                            roller: activeCombatant.characterName,
                                            rollDescription: roll.description,
                                            attackType: attackType || 'not specified',
                                        });
                                        // Remove the invalid roll from the array
                                        diceRolls.pop();
                                        continue; // Skip damage if there was no attack roll
                                    }
                                    
                                    if (!attackHit && !isSavingThrowSpell) {
                                        log.debug('Skipping damage roll because attack missed', {
                                            module: 'CombatManager',
                                            roller: activeCombatant.characterName,
                                            attackTotal: attackRoll?.totalResult,
                                            targetAC: target.ac,
                                        });
                                        // Remove the invalid roll from the array
                                        diceRolls.pop();
                                        continue; // Skip damage if attack didn't hit
                                    }
                                    
                                    // Log if this is a saving throw spell
                                    if (isSavingThrowSpell) {
                                        log.debug('Processing saving throw spell damage', {
                                            module: 'CombatManager',
                                            roller: activeCombatant.characterName,
                                            targetName: targetVisualName,
                                            damage: roll.totalResult,
                                            attackType: attackType,
                                        });
                                    }
                                    
                                    // Validate damage is positive
                                    if (roll.totalResult <= 0) {
                                        log.warn('Damage roll resulted in non-positive damage', {
                                            module: 'CombatManager',
                                            damage: roll.totalResult,
                                            roller: activeCombatant.characterName,
                                        });
                                        messages.push({ 
                                            sender: 'DM', 
                                            content: `${activeCombatant.characterName} intenta hacer daño a ${targetVisualName}, pero no causa ningún daño.` 
                                        });
                                        continue;
                                    }
                                    
                                    const targetIsPlayer = updatedParty.some(p => p.id === target.id);
                                    const previousHP = targetIsPlayer 
                                        ? updatedParty.find(p => p.id === target.id)?.hp.current 
                                        : updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)?.hp.current;
                                    
                                    const damage = roll.totalResult;
                                    
                                    if (targetIsPlayer) {
                                        // Para jugador/compañeros: aplicar regla de muerte masiva D&D 5e
                                        updatedParty = updatedParty.map(p => {
                                            if (p.id === target.id) {
                                                const targetHP = p.hp.current;
                                                const targetHPMax = p.hp.max;
                                                
                                                // Regla de muerte masiva: daño restante (después de llegar a 0) >= hpMax
                                                // Fórmula: daño restante = damage - hp.current
                                                const remainingDamage = damage - targetHP;
                                                
                                                if (remainingDamage >= targetHPMax) {
                                                    // Muerte instantánea
                                                    messages.push({
                                                        sender: 'DM',
                                                        content: `${p.name} ha recibido un golpe devastador y muere instantáneamente.`,
                                                    });
                                                    const updated = { 
                                                        ...p, 
                                                        hp: { current: 0, max: targetHPMax },
                                                        isDead: true 
                                                    };
                                                    return validateAndClampHP(updated);
                                                } else {
                                                    // Daño normal: puede llegar a 0 (inconsciente) pero no muere
                                                    const newHP = Math.max(0, targetHP - damage);
                                                    
                                                    if (newHP === 0 && targetHP > 0) {
                                                        // Acaba de caer inconsciente
                                                        messages.push({
                                                            sender: 'DM',
                                                            content: `${p.name} cae inconsciente.`,
                                                        });
                                                    }
                                                    
                                                    const updated = { 
                                                        ...p, 
                                                        hp: { current: newHP, max: targetHPMax },
                                                        isDead: false
                                                    };
                                                    return validateAndClampHP(updated);
                                                }
                                            }
                                            return p;
                                        });
                                    } else {
                                        // Para enemigos, mantener comportamiento actual
                                        updatedEnemies = updatedEnemies.map(e => {
                                            if ((e as any).uniqueId === (target as any).uniqueId) {
                                                const updated = { ...e, hp: { ...e.hp, current: Math.max(0, e.hp.current - damage) } };
                                                return validateAndClampHP(updated);
                                            }
                                            return e;
                                        });
                                    }
                                    
                                    const newHP = targetIsPlayer 
                                        ? updatedParty.find(p => p.id === target.id)?.hp.current 
                                        : updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)?.hp.current;
                                    
                                    // Check if target was killed by this damage
                                    const targetKilled = newHP !== undefined && newHP <= 0;
                                    
                                    // Update roll with damage information
                                    const rollIndex = diceRolls.length - 1;
                                    diceRolls[rollIndex] = {
                                        ...roll,
                                        targetName: targetVisualName,
                                        damageDealt: roll.totalResult,
                                        targetKilled: targetKilled,
                                    };
                                    
                                    messages.push({ 
                                        sender: 'DM', 
                                        content: `${activeCombatant.characterName} ha hecho ${roll.totalResult} puntos de daño a ${targetVisualName}${previousHP !== undefined && newHP !== undefined ? ` (${previousHP} → ${newHP} HP)` : ''}.` 
                                    });
                                    
                                    log.debug('Damage applied', {
                                        module: 'CombatManager',
                                        target: targetVisualName,
                                        damage: roll.totalResult,
                                        previousHP,
                                        newHP,
                                        targetKilled,
                                    });
                                    
                                    // Check if target was defeated
                                    if (targetKilled) {
                                        messages.push({
                                            sender: 'DM',
                                            content: `¡${activeCombatant.characterName} ha matado a ${targetVisualName}!`
                                        });
                                        localLog(`${activeCombatant.characterName} killed ${targetVisualName}!`);
                                    }
                                    
                                    // Check if combat has ended after applying damage
                                    localLog('checkEndOfCombat: Checking for end of combat...');
                                    const combatCheck = checkEndOfCombat(updatedParty, updatedEnemies);
                                    if (combatCheck.combatEnded) {
                                        localLog(`checkEndOfCombat: End of combat detected! [Razón: ${combatCheck.reason}]`);
                                        if (combatCheck.reason === 'Todos los enemigos derrotados') {
                                            messages.push({ sender: 'DM', content: '¡Victoria! Todos los enemigos han sido derrotados.' });
                                        } else if (combatCheck.reason === 'Todos los aliados derrotados') {
                                            messages.push({ sender: 'DM', content: '¡Derrota! Todos los aliados han caído en combate.' });
                                        }
                                        // Mark combat as ended and break out of the roll loop
                                        combatHasEnded = true;
                                        break;
                                    }
                                }
                                // Process healing roll
                                else if (rollDescription.includes('healing') || rollDescription.includes('curación') || rollDescription.includes('cura')) {
                                    // Validate healing is positive
                                    if (roll.totalResult <= 0) {
                                        log.warn('Healing roll resulted in non-positive healing', {
                                            module: 'CombatManager',
                                            healing: roll.totalResult,
                                            roller: activeCombatant.characterName,
                                        });
                                        messages.push({ 
                                            sender: 'DM', 
                                            content: `${activeCombatant.characterName} intenta curar a ${targetVisualName}, pero no tiene efecto.` 
                                        });
                                        continue;
                                    }
                                    
                                    const targetIsPlayer = updatedParty.some(p => p.id === target.id);
                                    if (targetIsPlayer) {
                                        const previousHP = updatedParty.find(p => p.id === target.id)?.hp.current;
                                        const wasUnconscious = previousHP !== undefined && previousHP <= 0;
                                        
                                        updatedParty = updatedParty.map(p => {
                                            if (p.id === target.id) {
                                                const updated = { 
                                                    ...p, 
                                                    hp: { ...p.hp, current: Math.min(p.hp.max, p.hp.current + roll.totalResult) },
                                                    isDead: false // Curación revive personajes inconscientes
                                                };
                                                return validateAndClampHP(updated);
                                            }
                                            return p;
                                        });
                                        const newHP = updatedParty.find(p => p.id === target.id)?.hp.current;
                                        
                                        // Update roll with healing information
                                        const rollIndex = diceRolls.length - 1;
                                        diceRolls[rollIndex] = {
                                            ...roll,
                                            targetName: targetVisualName,
                                            healingAmount: roll.totalResult,
                                        };
                                        
                                        // Narrativa de revivencia si el personaje estaba inconsciente
                                        if (wasUnconscious && newHP !== undefined && newHP > 0) {
                                            messages.push({ 
                                                sender: 'DM', 
                                                content: `${targetVisualName} recupera la consciencia gracias a la curación recibida.` 
                                            });
                                        }
                                        
                                        messages.push({ 
                                            sender: 'DM', 
                                            content: `${targetVisualName} es curado por ${roll.totalResult} puntos${previousHP !== undefined && newHP !== undefined ? ` (${previousHP} → ${newHP} HP)` : ''}.` 
                                        });
                                        
                                        log.debug('Healing applied', {
                                            module: 'CombatManager',
                                            target: targetVisualName,
                                            healing: roll.totalResult,
                                            previousHP,
                                            newHP,
                                        });
                                    } else {
                                        // Healing enemies is possible but less common
                                        const previousHP = updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)?.hp.current;
                                        updatedEnemies = updatedEnemies.map(e => {
                                            if ((e as any).uniqueId === (target as any).uniqueId) {
                                                const updated = { ...e, hp: { ...e.hp, current: Math.min(e.hp.max, e.hp.current + roll.totalResult) } };
                                                return validateAndClampHP(updated);
                                            }
                                            return e;
                                        });
                                        const newHP = updatedEnemies.find(e => (e as any).uniqueId === (target as any).uniqueId)?.hp.current;
                                        
                                        // Update roll with healing information
                                        const rollIndex = diceRolls.length - 1;
                                        diceRolls[rollIndex] = {
                                            ...roll,
                                            targetName: targetVisualName,
                                            healingAmount: roll.totalResult,
                                        };
                                        
                                        messages.push({ 
                                            sender: 'DM', 
                                            content: `${targetVisualName} es curado por ${roll.totalResult} puntos${previousHP !== undefined && newHP !== undefined ? ` (${previousHP} → ${newHP} HP)` : ''}.` 
                                        });
                                        
                                        log.debug('Healing applied to enemy', {
                                            module: 'CombatManager',
                                            target: targetVisualName,
                                            healing: roll.totalResult,
                                            previousHP,
                                            newHP,
                                        });
                                    }
                                    // Note: We don't check for end of combat after healing, as healing shouldn't end combat
                                }
                            } catch (error: any) {
                                // Handle errors gracefully
                                log.error('Error processing dice roll', {
                                    module: 'CombatManager',
                                    roller: activeCombatant.characterName,
                                    rollData,
                                    error: error.message,
                                }, error);
                                
                                messages.push({ 
                                    sender: 'DM', 
                                    content: `${activeCombatant.characterName} intenta realizar una acción, pero algo sale mal.` 
                                });
                                
                                // Continue with next roll instead of breaking
                                continue;
                            }
                        }
                } else { localLog(`Could not find target combatant with id: "${targetId}"`); }
            } else if (!targetId) { localLog('Action had no targetId.'); }
            
            // Only advance turn if combat hasn't ended
            if (!combatHasEnded) {
                currentTurnIndex = (currentTurnIndex + 1) % newInitiativeOrder.length;
                activeCombatant = newInitiativeOrder[currentTurnIndex];
            }
        }
        
        // If combat ended during initiation, return final state
        if (combatHasEnded) {
            return {
                messages,
                diceRolls,
                inCombat: false,
                debugLogs,
                turnIndex: 0,
                initiativeOrder: [],
                enemies: [],
                updatedParty,
                updatedEnemies,
            };
        }
        
        const playerCombatant = newInitiativeOrder.find(c => c.controlledBy === 'Player');
        localLog(`Initial AI turns processed. Control ceded to player ${playerCombatant?.characterName} at index ${currentTurnIndex}.`);
        
        const finalResult = {
            messages,
            diceRolls,
            inCombat: true,
            initiativeOrder: newInitiativeOrder,
            turnIndex: currentTurnIndex,
            enemies: updatedEnemies,
            debugLogs,
            updatedParty: updatedParty,
        };
        localLog(`Data being returned: ${JSON.stringify({ messages: finalResult.messages?.length, diceRolls: finalResult.diceRolls?.length, initiativeOrder: finalResult.initiativeOrder?.map(c => c.characterName), inCombat: finalResult.inCombat, turnIndex: finalResult.turnIndex,})}`);
        return finalResult;
    }
);
