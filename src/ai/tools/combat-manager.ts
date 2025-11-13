
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
            
            // Try direct lookup first (only in monsters, not in spells or equipment)
            let response = await fetch(`${baseUrl}/monsters/${formattedName}`);
            
            if (!response.ok) {
                // Try search endpoint (only in monsters)
                const searchResponse = await fetch(`${baseUrl}/monsters/?name=${normalizedName}`);
                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    if (searchData.count > 0 && searchData.results[0].url) {
                        response = await fetch(`https://www.dnd5eapi.co${searchData.results[0].url}`);
                    }
                }
            }
            
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
            });
            
            return null;
        } catch (error: any) {
            log.error('Error fetching monster stats from D&D API', {
                module: 'CombatManager',
                monsterName,
            }, error);
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
    }
    
    // Step 2: Search in initiativeOrder by characterName (visual name) exact match
    const exactMatch = initiativeOrder.find(c => c.characterName === targetId);
    if (exactMatch) {
        return { uniqueId: exactMatch.id, ambiguous: false, matches: [] };
    }
    
    // Step 3: Search by base name (without number suffix) - check for ambiguity
    // Extract base name from targetId (remove trailing number if present)
    const baseNameMatch = targetId.match(/^(.+?)(?:\s+\d+)?$/);
    const baseName = baseNameMatch ? baseNameMatch[1].trim() : targetId.trim();
    
    // Find all enemies with matching base name
    const matchingEnemies = enemies.filter(e => {
        const enemyBaseName = e.name || e.id?.split('-')[0] || '';
        return enemyBaseName.toLowerCase() === baseName.toLowerCase();
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
 * Checks if combat has ended by verifying if all enemies or all allies are defeated.
 * @param updatedParty Array of party members with current HP
 * @param updatedEnemies Array of enemies with current HP
 * @returns Object with combatEnded boolean and reason string
 */
function checkEndOfCombat(updatedParty: any[], updatedEnemies: any[]): { combatEnded: boolean; reason: string | null } {
    // Check if all enemies are defeated
    const allEnemiesDefeated = updatedEnemies.every(e => e.hp.current <= 0);
    if (allEnemiesDefeated) {
        return { combatEnded: true, reason: 'Todos los enemigos derrotados' };
    }
    
    // Check if all allies are defeated
    const allAlliesDefeated = updatedParty.every(p => p.hp.current <= 0);
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
                if (interpretedAction.actionType === 'attack' && interpretedAction.targetId) {
                    // Resolve targetId (can be visual name or uniqueId)
                    const resolved = resolveEnemyId(interpretedAction.targetId, updatedEnemies, initiativeOrder, updatedParty);
                    
                    // Handle ambiguity: if multiple enemies match, ask the player
                    if (resolved.ambiguous) {
                        const baseName = interpretedAction.targetId.split(/\s+\d+$/)[0] || interpretedAction.targetId;
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
                        localLog(`Player ${activeCombatant.characterName} attacks ${target.name}`);
                        // Add player action message (the player's input is already in the chat)
                        // We'll need to process dice rolls if the action interpreter provided them
                        // For now, we'll just advance the turn
                    } else {
                        localLog(`Target not found for player action: ${interpretedAction.targetId} (resolved: ${resolvedTargetId})`);
                    }
                }
                
                // Advance to next turn
                currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
                activeCombatant = initiativeOrder[currentTurnIndex];
            }
            
            // Continue processing AI turns until it's the player's turn again
            let combatHasEnded = false;
            while(activeCombatant && activeCombatant.controlledBy === 'AI' && !combatHasEnded) {
                localLog(`Processing turn for AI combatant ${activeCombatant.characterName} at index ${currentTurnIndex}...`);
                
                const isCompanion = updatedParty.some(p => p.id === activeCombatant.id);
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
                
                const baseTacticianInput = {
                    activeCombatant: activeCombatant.characterName,
                    party: updatedParty,
                    enemies: updatedEnemies.map(e => ({ 
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
                        for (const rollData of requestedRolls) {
                            const roll = await diceRollerTool({ ...rollData, roller: activeCombatant.characterName });
                            diceRolls.push(roll);

                            if (roll.description.toLowerCase().includes('attack')) {
                                if (roll.totalResult >= target.ac) {
                                    messages.push({ sender: 'DM', content: `${activeCombatant.characterName} ataca a ${targetVisualName} y acierta.` });
                                } else {
                                    messages.push({ sender: 'DM', content: `${activeCombatant.characterName} ataca a ${targetVisualName}, pero falla.` });
                                    break; // No damage if attack misses
                                }
                            } else if (roll.description.toLowerCase().includes('damage')) {
                                const targetIsPlayer = updatedParty.some(p => p.id === target.id);
                                if (targetIsPlayer) {
                                    updatedParty = updatedParty.map(p => p.id === target.id ? { ...p, hp: { ...p.hp, current: Math.max(0, p.hp.current - roll.totalResult) } } : p);
                                } else {
                                    updatedEnemies = updatedEnemies.map(e => (e as any).uniqueId === (target as any).uniqueId ? { ...e, hp: { ...e.hp, current: Math.max(0, e.hp.current - roll.totalResult) } } : e);
                                }
                                messages.push({ sender: 'DM', content: `It deals ${roll.totalResult} damage.` });
                                
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
                            } else if (roll.description.toLowerCase().includes('healing')) {
                                const targetIsPlayer = updatedParty.some(p => p.id === target.id);
                                    if (targetIsPlayer) {
                                    updatedParty = updatedParty.map(p => p.id === target.id ? { ...p, hp: { ...p.hp, current: Math.min(p.hp.max, p.hp.current + roll.totalResult) } } : p);
                                    messages.push({ sender: 'DM', content: `${target.name} is healed for ${roll.totalResult} points.` });
                                }
                                // Note: We don't check for end of combat after healing, as healing shouldn't end combat
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
            if (found) { combatantData.push({ ...found, entityType: 'player', name: found.name, controlledBy: found.controlledBy }); continue; }
            found = allEntities.find((e: any) => e.id === id);
            if (found) combatantData.push({ ...found, entityType: 'monster', name: found.name, controlledBy: 'AI' });
        }
        const hostileEntities = combatantData.filter(c => c.entityType === 'monster');
        if (hostileEntities.length === 0) {
            messages.push({ sender: 'DM', content: "Atacas fervientemente al aire, pero no parece haber ninguna amenaza real a la vista." });
            return { messages, inCombat: false, debugLogs };
        }
        messages.push({ sender: 'System', content: `¡Comienza el Combate!` });
        // Generate uniqueIds for enemies based on their base name (extract from id if it has dashes)
        // This ensures consistent uniqueIds like "goblin-0", "goblin-1" instead of "goblin-2-0", "goblin-2-1"
        const initialEnemies = hostileEntities.map((e: any, index: number) => {
            // Extract base name from id (remove any existing numeric suffix)
            // e.g., "goblin-2" -> "goblin", "goblin" -> "goblin"
            const baseId = e.id.split('-').slice(0, -1).join('-') || e.id.split('-')[0] || e.id;
            const uniqueId = `${baseId}-${index}`;
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
            let hp = enemy.hp;
            let ac = enemy.ac;
            
            // If hp or ac are missing, try to fetch from D&D API
            if (hp === undefined || hp === null || ac === undefined || ac === null) {
                localLog(`Enemy ${enemy.name} missing hp or ac, fetching from D&D API...`);
                const stats = await getMonsterStatsFromDndApi(enemy.name);
                
                if (stats) {
                    hp = hp !== undefined && hp !== null ? hp : stats.hp;
                    ac = ac !== undefined && ac !== null ? ac : stats.ac;
                    localLog(`Fetched stats for ${enemy.name}: HP=${hp}, AC=${ac}`);
                } else {
                    // Use defaults if API lookup fails
                    hp = hp !== undefined && hp !== null ? hp : 10;
                    ac = ac !== undefined && ac !== null ? ac : 10;
                    localLog(`Using default stats for ${enemy.name}: HP=${hp}, AC=${ac}`);
                }
            }
            
            updatedEnemies.push({
                uniqueId: enemy.uniqueId,
                id: enemy.id,
                name: enemy.name,
                color: '#ef4444',
                hp: { current: hp, max: hp },
                ac: ac,
            });
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

            const baseTacticianInput = {
                activeCombatant: activeCombatant.characterName,
                party: updatedParty,
                enemies: updatedEnemies.map(e => ({ 
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
                    for (const rollData of requestedRolls) {
                        const roll = await diceRollerTool({ ...rollData, roller: activeCombatant.characterName });
                        diceRolls.push(roll);

                        if (roll.description.toLowerCase().includes('attack')) {
                            if (roll.totalResult >= target.ac) {
                                messages.push({ sender: 'DM', content: `${activeCombatant.characterName} ataca a ${targetVisualName} y acierta.` });
                            } else {
                                messages.push({ sender: 'DM', content: `${activeCombatant.characterName} ataca a ${targetVisualName}, pero falla.` });
                                break; // No damage if attack misses
                            }
                        } else if (roll.description.toLowerCase().includes('damage')) {
                            const targetIsPlayer = updatedParty.some(p => p.id === target.id);
                            if (targetIsPlayer) {
                                updatedParty = updatedParty.map(p => p.id === target.id ? { ...p, hp: { ...p.hp, current: Math.max(0, p.hp.current - roll.totalResult) } } : p);
                            } else {
                                updatedEnemies = updatedEnemies.map(e => (e as any).uniqueId === (target as any).uniqueId ? { ...e, hp: { ...e.hp, current: Math.max(0, e.hp.current - roll.totalResult) } } : e);
                            }
                            messages.push({ sender: 'DM', content: `It deals ${roll.totalResult} damage.` });
                            
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
                        } else if (roll.description.toLowerCase().includes('healing')) {
                            const targetIsPlayer = updatedParty.some(p => p.id === target.id);
                            if (targetIsPlayer) {
                                updatedParty = updatedParty.map(p => p.id === target.id ? { ...p, hp: { ...p.hp, current: Math.min(p.hp.max, p.hp.current + roll.totalResult) } } : p);
                                messages.push({ sender: 'DM', content: `${target.name} is healed for ${roll.totalResult} points.` });
                            }
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
