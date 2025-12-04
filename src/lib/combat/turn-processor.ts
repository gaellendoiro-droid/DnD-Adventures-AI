/**
 * @fileOverview Turn Processor (Unified)
 * Processes a complete combat turn (planning → intention → execution → resolution).
 * Works the same for Player and AI combatants.
 * 
 * Key principles:
 * - Unified flow for Player and AI
 * - 4-step process: Planning → Intention → Execution → Resolution
 * - Uses CombatActionExecutor for execution
 * - Uses CombatNarrationExpert for narrations
 */

import { log } from '@/lib/logger';
import type { Character, DiceRoll, GameMessage } from '@/lib/types';
import type { Combatant } from '@/lib/types';
import { getVisualName } from '@/lib/combat/monster-name-manager';
import { resolveEnemyId } from '@/lib/combat/target-resolver';
import { getHpStatus } from '@/lib/combat/rules-engine';
import { initialParty } from '@/lib/initial-party';
import {
    CombatActionExecutor,
    type CombatActionInput,
    type DiceRollRequest,
    type CombatActionResult,
} from './action-executor';
import { updateRollNotationWithModifiers } from '@/lib/combat/roll-notation-utils';
import { CombatActionResolver } from './action-resolver';

// --- Types ---

/**
 * Input for processing a turn
 */
export interface TurnProcessorInput {
    /** The combatant whose turn it is */
    combatant: Combatant;
    /** For Player: interpreted action (already decided) */
    interpretedAction?: {
        actionType: 'attack' | 'spell' | 'heal' | 'move' | 'interact' | 'narrate' | 'ooc' | 'continue_turn';
        targetId?: string | null;
    };
    /** For Player: original player action text */
    playerAction?: string;
    /** Current party state */
    party: Character[];
    /** Current enemies state */
    enemies: any[];
    /** Initiative order */
    initiativeOrder: Combatant[];
    /** Location context */
    locationContext?: any;
    /** Conversation history */
    conversationHistory?: Array<Partial<GameMessage>>;
    /** Dependencies */
    dependencies: {
        /** For AI: tactician tool (enemy or companion) */
        tactician?: (input: any) => Promise<any>;
        /** Narration expert for generating complete combat narrations (includes preparation, execution, and result) */
        narrationExpert: (input: any) => Promise<{ narration: string }>;
        /** Dice roller tool */
        diceRollerTool: (input: any) => Promise<any>;
        /** Function to update roll notation with modifiers (for player characters) */
        updateRollNotationWithModifiers?: (roll: DiceRoll, character: Character, isAttackRoll: boolean) => void;
    };
}

/**
 * Result of processing a turn
 */
export interface TurnProcessorResult {
    /** Whether the turn was processed successfully */
    success: boolean;
    /** Messages generated (intention + resolution) */
    messages: Array<Omit<GameMessage, 'id' | 'timestamp'>>;
    /** Dice rolls executed */
    diceRolls: DiceRoll[];
    /** Updated party state */
    updatedParty: Character[];
    /** Updated enemies state */
    updatedEnemies: any[];
    /** Combat result information */
    combatResult: CombatActionResult['combatResult'];
    /** Whether combat ended */
    combatEnded: boolean;
    /** Reason combat ended (if it did) */
    endReason?: string;
    /** Error message if turn failed */
    error?: string;
}

// --- Turn Processor ---

/**
 * Extracts weapon name from player action.
 * Returns null if no specific weapon is mentioned.
 * 
 * @param action - Player action string (e.g., "Ataco con mi espada al goblin")
 * @returns Weapon name if found, null otherwise
 * 
 * @example
 * extractWeaponName("Ataco con mi espada") // "espada"
 * extractWeaponName("Disparo mi arco") // "arco"
 * extractWeaponName("Ataco al goblin 1") // null
 */
export function extractWeaponName(action: string): string | null {
    if (!action) return null;

    const actionLower = action.toLowerCase();

    // Patterns to match: "con [weapon]", "usando [weapon]", "mi [weapon]", "el/la [weapon]"
    // Using [a-záéíóúñü]+ to match Spanish words with accents
    const patterns = [
        /con (?:mi |el |la |un |una )?([a-záéíóúñü]+)/i,
        /usando (?:mi |el |la |un |una )?([a-záéíóúñü]+)/i,
        /mi ([a-záéíóúñü]+)/i,
        /(?:el|la) ([a-záéíóúñü]+)/i,
    ];

    for (const pattern of patterns) {
        const match = actionLower.match(pattern);
        if (match && match[1]) {
            return match[1]; // e.g., "espada", "arco"
        }
    }

    return null; // No specific weapon mentioned
}

/**
 * Extracts spell name from player action.
 * Returns null if no specific spell is mentioned.
 * 
 * @param action - Player action string (e.g., "Lanzo bola de fuego al goblin")
 * @returns Spell name if found, null otherwise
 * 
 * @example
 * extractSpellName("Lanzo bola de fuego") // "bola de fuego"
 * extractSpellName("Uso curación") // "curación"
 */
export function extractSpellName(action: string): string | null {
    if (!action) return null;

    const actionLower = action.toLowerCase();

    // Patterns to match: "lanzo [spell]", "uso [spell]", "conjuro [spell]", "hechizo [spell]"
    const patterns = [
        /lanzo (?:el |la |un |una )?([a-záéíóúñü\s]+?)(?:\s+a\s+|\s+contra\s+|$)/i,
        /uso (?:el |la |un |una )?([a-záéíóúñü\s]+?)(?:\s+a\s+|\s+contra\s+|$)/i,
        /conjuro (?:el |la |un |una )?([a-záéíóúñü\s]+?)(?:\s+a\s+|\s+contra\s+|$)/i,
        /hechizo (?:el |la |un |una )?([a-záéíóúñü\s]+?)(?:\s+a\s+|\s+contra\s+|$)/i,
        /lanzar (?:el |la |un |una )?([a-záéíóúñü\s]+?)(?:\s+a\s+|\s+contra\s+|$)/i,
    ];

    for (const pattern of patterns) {
        const match = actionLower.match(pattern);
        if (match && match[1]) {
            return match[1].trim(); // e.g., "bola de fuego", "curación"
        }
    }

    return null; // No specific spell mentioned
}

/**
 * Extracts item name from player action.
 * Returns null if no specific item is mentioned.
 * 
 * @param action - Player action string (e.g., "Uso mi poción de curación")
 * @returns Item name if found, null otherwise
 * 
 * @example
 * extractItemName("Uso mi poción de curación") // "poción de curación"
 * extractItemName("Consumo un pergamino") // "pergamino"
 */
export function extractItemName(action: string): string | null {
    if (!action) return null;

    const actionLower = action.toLowerCase();

    // Patterns to match: "uso [item]", "consumo [item]", "utilizo [item]", "con [item]"
    const patterns = [
        /uso (?:mi |el |la |un |una )?([a-záéíóúñü\s]+?)(?:\s+a\s+|\s+contra\s+|$)/i,
        /consumo (?:mi |el |la |un |una )?([a-záéíóúñü\s]+?)(?:\s+a\s+|\s+contra\s+|$)/i,
        /utilizo (?:mi |el |la |un |una )?([a-záéíóúñü\s]+?)(?:\s+a\s+|\s+contra\s+|$)/i,
        /con (?:mi |el |la |un |una )?([a-záéíóúñü\s]+?)(?:\s+a\s+|\s+contra\s+|$)/i,
    ];

    for (const pattern of patterns) {
        const match = actionLower.match(pattern);
        if (match && match[1]) {
            return match[1].trim(); // e.g., "poción de curación", "pergamino"
        }
    }

    return null; // No specific item mentioned
}

export class TurnProcessor {
    /**
     * Processes a complete combat turn.
     * 
     * Flow:
     * 1. Planning: Get action decision (from interpretedAction for Player, from tactician for AI)
     * 2. Execution: Execute action using CombatActionExecutor
     * 3. Resolution: Generate complete narration using combatNarrationExpertTool
     * 
     * @param input Turn processing input
     * @returns Turn processing result
     */
    static async processTurn(input: TurnProcessorInput): Promise<TurnProcessorResult> {
        const {
            combatant,
            interpretedAction,
            playerAction,
            party: initialParty,
            enemies: initialEnemies,
            initiativeOrder,
            locationContext,
            conversationHistory = [],
            dependencies,
        } = input;

        const messages: Array<Omit<GameMessage, 'id' | 'timestamp'>> = [];
        let updatedParty = [...initialParty];
        let updatedEnemies = [...initialEnemies];

        try {
            // ============================================================
            // STEP 1: PLANNING
            // ============================================================

            let plannedAction: {
                type: 'attack' | 'spell' | 'heal';
                targetId: string;
                actionDescription: string;
                diceRollRequests: DiceRollRequest[];
            } | null = null;

            if (combatant.controlledBy === 'Player') {
                // Player: use interpretedAction
                if (!interpretedAction || interpretedAction.actionType !== 'attack') {
                    return {
                        success: false,
                        messages: [{ sender: 'DM', content: 'Acción no válida para combate.' }],
                        diceRolls: [],
                        updatedParty: initialParty,
                        updatedEnemies: initialEnemies,
                        combatResult: {},
                        combatEnded: false,
                        error: 'INVALID_ACTION',
                    };
                }

                // Resolve target
                let targetIdToUse = interpretedAction.targetId;
                if (!targetIdToUse) {
                    // Filter only alive enemies
                    const aliveEnemies = initialEnemies.filter(e => e.hp.current > 0);
                    if (aliveEnemies.length === 1) {
                        targetIdToUse = aliveEnemies[0].uniqueId;
                        // Add message to clarify auto-selection
                        const autoSelectedName = getVisualName(targetIdToUse, initiativeOrder, initialEnemies);
                        messages.push({
                            sender: 'DM',
                            content: `${combatant.characterName} ataca a ${autoSelectedName}.`
                        });
                    } else if (aliveEnemies.length > 1) {
                        return {
                            success: false,
                            messages: [{ sender: 'DM', content: 'No has especificado un objetivo. ¿A quién o qué quieres atacar?' }],
                            diceRolls: [],
                            updatedParty: initialParty,
                            updatedEnemies: initialEnemies,
                            combatResult: {},
                            combatEnded: false,
                            error: 'TARGET_REQUIRED',
                        };
                    } else {
                        return {
                            success: false,
                            messages: [{ sender: 'DM', content: 'No hay enemigos vivos para atacar.' }],
                            diceRolls: [],
                            updatedParty: initialParty,
                            updatedEnemies: initialEnemies,
                            combatResult: {},
                            combatEnded: false,
                            error: 'NO_ENEMIES',
                        };
                    }
                }

                // Resolve targetId (can be visual name or uniqueId)
                const resolved = resolveEnemyId(targetIdToUse, initialEnemies, initiativeOrder, initialParty);
                if (resolved.ambiguous) {
                    const baseName = targetIdToUse.split(/\s+\d+$/)[0] || targetIdToUse;
                    const clarificationMessage = `Hay múltiples ${baseName}. ¿A cuál te refieres? ${resolved.matches.join(' o ')}`;
                    return {
                        success: false,
                        messages: [{ sender: 'DM', content: clarificationMessage }],
                        diceRolls: [],
                        updatedParty: initialParty,
                        updatedEnemies: initialEnemies,
                        combatResult: {},
                        combatEnded: false,
                        error: 'TARGET_AMBIGUOUS',
                    };
                }

                const resolvedTargetId = resolved.uniqueId || targetIdToUse;

                // Validate that target is alive (Issue #38)
                // We must check this BEFORE calculating rolls to avoid "zombie dodging" narrations
                const targetEnemy = initialEnemies.find(e => e.uniqueId === resolvedTargetId || e.id === resolvedTargetId);
                if (targetEnemy && targetEnemy.hp.current <= 0) {
                    const targetName = getVisualName(resolvedTargetId, initiativeOrder, initialEnemies);
                    return {
                        success: false,
                        messages: [{ sender: 'DM', content: `${targetName} ya está muerto. ¿Qué quieres hacer?` }],
                        diceRolls: [],
                        updatedParty: initialParty,
                        updatedEnemies: initialEnemies,
                        combatResult: {},
                        combatEnded: false,
                        error: 'TARGET_DEAD',
                    };
                }

                // Get player character data
                const playerChar = initialParty.find(p => p.id === combatant.id);
                if (!playerChar) {
                    return {
                        success: false,
                        messages: [{ sender: 'DM', content: 'Hubo un error al procesar el ataque.' }],
                        diceRolls: [],
                        updatedParty: initialParty,
                        updatedEnemies: initialEnemies,
                        combatResult: {},
                        combatEnded: false,
                        error: 'PLAYER_NOT_FOUND',
                    };
                }

                // Validate spells and items if mentioned in the action
                const spellQuery = extractSpellName(playerAction);
                if (spellQuery) {
                    const spellValidation = CombatActionResolver.validateSpell(playerChar, spellQuery);
                    if (!spellValidation.success) {
                        return {
                            success: false,
                            messages: [{ sender: 'DM', content: spellValidation.errorMessage || 'No conoces ese hechizo.' }],
                            diceRolls: [],
                            updatedParty: initialParty,
                            updatedEnemies: initialEnemies,
                            combatResult: {},
                            combatEnded: false,
                            error: spellValidation.error || 'SPELL_NOT_KNOWN',
                        };
                    }
                }

                const itemQuery = extractItemName(playerAction);
                if (itemQuery) {
                    const itemValidation = CombatActionResolver.validateItem(playerChar, itemQuery);
                    if (!itemValidation.success) {
                        return {
                            success: false,
                            messages: [{ sender: 'DM', content: itemValidation.errorMessage || 'No tienes ese objeto.' }],
                            diceRolls: [],
                            updatedParty: initialParty,
                            updatedEnemies: initialEnemies,
                            combatResult: {},
                            combatEnded: false,
                            error: itemValidation.error || 'ITEM_NOT_IN_INVENTORY',
                        };
                    }
                }

                // Use CombatActionResolver to calculate rolls
                // This ensures consistency with the new robust system
                const targetName = getVisualName(resolvedTargetId, initiativeOrder, initialEnemies);
                // Extract weapon name from player action using helper function
                const weaponQuery = extractWeaponName(playerAction) || 'ataque';

                const resolution = CombatActionResolver.resolveAttack(playerChar, weaponQuery, targetName);

                if (!resolution.success) {
                    return {
                        success: false,
                        messages: [{ sender: 'DM', content: resolution.errorMessage || resolution.error || 'No se pudo realizar el ataque.' }],
                        diceRolls: [],
                        updatedParty: initialParty,
                        updatedEnemies: initialEnemies,
                        combatResult: {},
                        combatEnded: false,
                        error: resolution.error || 'RESOLUTION_FAILED', // Preserve the error code from resolver
                    };
                }

                // Create dice roll requests
                plannedAction = {
                    type: 'attack',
                    targetId: resolvedTargetId,
                    actionDescription: resolution.actionDescription || playerAction || 'ataque',
                    diceRollRequests: resolution.diceRollRequests,
                };
            } else {
                // AI: use tactician
                if (!dependencies.tactician) {
                    return {
                        success: false,
                        messages: [{ sender: 'DM', content: 'No se pudo procesar el turno de la IA.' }],
                        diceRolls: [],
                        updatedParty: initialParty,
                        updatedEnemies: initialEnemies,
                        combatResult: {},
                        combatEnded: false,
                        error: 'NO_TACTICIAN',
                    };
                }

                // Get visual names for enemies
                const enemyVisualNames = new Map<string, string>();
                for (const enemy of initialEnemies) {
                    const visualName = getVisualName(enemy.uniqueId, initiativeOrder, initialEnemies);
                    enemyVisualNames.set(enemy.uniqueId, visualName);
                }

                // Filter out dead combatants
                const aliveParty = initialParty.filter(p => p.hp.current > 0);
                const aliveEnemies = initialEnemies.filter(e => e.hp.current > 0);

                // Get full character data for companions
                const isCompanion = initialParty.some(p => p.id === combatant.id);
                const activeCombatantFullData = isCompanion
                    ? aliveParty.find(p => p.id === combatant.id)
                    : null;

                // Format conversation history
                const formatMessageForTranscript = (msg: Partial<GameMessage>): string => {
                    const senderName = msg.senderName || msg.sender;
                    const content = msg.originalContent || msg.content;
                    if (senderName && content) {
                        return `${senderName}: ${content}`;
                    }
                    return '';
                };

                const tacticianInput = {
                    activeCombatant: combatant.characterName,
                    party: aliveParty,
                    enemies: aliveEnemies.map(e => ({
                        name: enemyVisualNames.get(e.uniqueId) || e.name,
                        id: e.uniqueId,
                        hp: getHpStatus(e.hp.current, e.hp.max)
                    })),
                    locationDescription: locationContext?.description || "An unknown battlefield",
                    conversationHistory: conversationHistory.map(formatMessageForTranscript).join('\n'),
                    availableSpells: activeCombatantFullData?.spells || [],
                    inventory: activeCombatantFullData?.inventory || []
                };

                const tacticianResponse = await dependencies.tactician(tacticianInput);
                const { actionDescription, targetId, diceRolls: requestedRolls = [] } = tacticianResponse;

                // DEBUG: Log tactician response to investigate duplicate attacks
                log.debug('Tactician response received', {
                    module: 'TurnProcessor',
                    combatant: combatant.characterName,
                    actionDescription,
                    targetId,
                    diceRollsCount: requestedRolls?.length || 0,
                    diceRolls: requestedRolls,
                });

                // Validate that we have at least a target and action description
                // requestedRolls can be empty now - CombatActionResolver will generate them
                if (!targetId || !actionDescription) {
                    return {
                        success: false,
                        messages: [{ sender: 'DM', content: `${combatant.characterName} no realiza ninguna acción.` }],
                        diceRolls: [],
                        updatedParty: initialParty,
                        updatedEnemies: initialEnemies,
                        combatResult: {},
                        combatEnded: false,
                        error: 'NO_ACTION',
                    };
                }

                // FIX: Detect "No hacer nada" and force a default attack
                let finalActionDescription = actionDescription;
                let finalTargetId = targetId;
                const actionLower = actionDescription.toLowerCase();
                const noActionPatterns = ['no hacer nada', 'no hace nada', 'no hace', 'no actúa', 'pasa', 'espera'];
                if (noActionPatterns.some(pattern => actionLower.includes(pattern))) {
                    log.warn('Tactician returned "no action", forcing default attack', {
                        module: 'TurnProcessor',
                        combatant: combatant.characterName,
                        originalAction: actionDescription,
                    });
                    
                    // Force a default attack on the first available target
                    const firstAlivePartyMember = aliveParty[0];
                    if (firstAlivePartyMember) {
                        finalActionDescription = 'Ataque';
                        finalTargetId = firstAlivePartyMember.id;
                        log.debug('Forcing default attack', {
                            module: 'TurnProcessor',
                            combatant: combatant.characterName,
                            forcedAction: finalActionDescription,
                            forcedTarget: finalTargetId,
                        });
                    } else {
                        // No valid targets - skip turn
                        return {
                            success: false,
                            messages: [{ sender: 'DM', content: `${combatant.characterName} no encuentra ningún objetivo válido.` }],
                            diceRolls: [],
                            updatedParty: initialParty,
                            updatedEnemies: initialEnemies,
                            combatResult: {},
                            combatEnded: false,
                            error: 'NO_VALID_TARGETS',
                        };
                    }
                }

                // Resolve target
                const resolved = resolveEnemyId(finalTargetId, initialEnemies, initiativeOrder, initialParty);
                let resolvedTargetId = resolved.uniqueId;
                if (resolved.ambiguous && resolved.matches.length > 0) {
                    const firstMatchName = resolved.matches[0];
                    const firstMatchCombatant = initiativeOrder.find(c => c.characterName === firstMatchName);
                    resolvedTargetId = firstMatchCombatant?.id || null;
                }
                if (!resolvedTargetId) {
                    resolvedTargetId = finalTargetId;
                }

                // Determine action type from rolls or description
                let actionType: 'attack' | 'spell' | 'heal' = 'attack';
                const firstRollDesc = (requestedRolls[0]?.description || '').toLowerCase();
                if (firstRollDesc.includes('healing') || firstRollDesc.includes('curación') || firstRollDesc.includes('cura')) {
                    actionType = 'heal';
                } else if (firstRollDesc.includes('spell') || firstRollDesc.includes('hechizo')) {
                    actionType = 'spell';
                }

                // Resolve action using CombatActionResolver.resolveAttack
                // Find the combatant data (Character or EnemyWithStats)
                const targetName = getVisualName(resolvedTargetId, initiativeOrder, initialEnemies);
                
                // Extract weapon/action name from action description
                const actionLowerForWeapon = finalActionDescription.toLowerCase();
                let weaponQuery = 'ataque'; // default
                
                // Try to extract weapon name from description (e.g., "Ataque con Cimitarra" -> "Cimitarra")
                const weaponMatch = actionLowerForWeapon.match(/(?:ataque con|ataca con|usa|utiliza)\s+(.+?)(?:\s+a\s+|$)/i);
                if (weaponMatch && weaponMatch[1]) {
                    weaponQuery = weaponMatch[1].trim();
                } else if (actionLowerForWeapon.includes('bastón')) {
                    weaponQuery = 'bastón';
                } else if (actionLowerForWeapon.includes('cimitarra') || actionLowerForWeapon.includes('scimitar')) {
                    weaponQuery = 'cimitarra';
                } else if (actionLowerForWeapon.includes('arco')) {
                    weaponQuery = 'arco';
                } else if (actionLowerForWeapon.includes('daga')) {
                    weaponQuery = 'daga';
                } else if (actionLowerForWeapon.includes('espada')) {
                    weaponQuery = 'espada';
                } else if (actionLowerForWeapon.includes('pseudopod') || actionLowerForWeapon.includes('pseudópodo')) {
                    weaponQuery = 'pseudopod';
                }

                // Find the combatant's data for resolution
                let combatantData: any = null;
                
                // Check if it's a party member (Character)
                const partyMember = initialParty.find(p => p.id === combatant.id || p.name === combatant.characterName);
                if (partyMember) {
                    combatantData = partyMember;
                } else {
                    // It's an enemy - find in enemies array
                    const enemy = initialEnemies.find(e => e.id === combatant.id || e.uniqueId === combatant.id || e.name === combatant.characterName);
                    if (enemy) {
                        combatantData = enemy;
                    }
                }

                let resolution;
                if (combatantData) {
                    resolution = CombatActionResolver.resolveAttack(
                            combatantData,
                            weaponQuery,
                        targetName || 'objetivo',
                        combatant.characterName // Use visual name for display
                    );
                } else {
                    // Fallback: create basic attack rolls
                    log.warn('Could not find combatant data for action resolution', {
                        module: 'TurnProcessor',
                        combatant: combatant.characterName,
                        combatantId: combatant.id,
                    });
                    resolution = {
                        success: true,
                        diceRollRequests: requestedRolls.length > 0 ? requestedRolls : [
                            { rollNotation: '1d20+2', description: `Ataque a ${targetName}`, roller: combatant.characterName, attackType: 'attack_roll' as const },
                            { rollNotation: '1d4', description: 'Daño', roller: combatant.characterName, attackType: 'damage_roll' as const }
                        ],
                        actionDescription: finalActionDescription
                    };
                }

                if (!resolution.success) {
                    return {
                        success: false,
                        messages: [{ sender: 'DM', content: `${combatant.characterName} no puede realizar esa acción.` }],
                        diceRolls: [],
                        updatedParty: initialParty,
                        updatedEnemies: initialEnemies,
                        combatResult: {},
                        combatEnded: false,
                        error: 'ACTION_RESOLUTION_FAILED',
                    };
                }

                plannedAction = {
                    type: actionType,
                    targetId: resolvedTargetId,
                    actionDescription: resolution.actionDescription || finalActionDescription,
                    diceRollRequests: resolution.diceRollRequests,
                };

            }

            if (!plannedAction) {
                return {
                    success: false,
                    messages: [{ sender: 'DM', content: 'No se pudo planificar la acción.' }],
                    diceRolls: [],
                    updatedParty: initialParty,
                    updatedEnemies: initialEnemies,
                    combatResult: {},
                    combatEnded: false,
                    error: 'PLANNING_FAILED',
                };
            }

            // ============================================================
            // STEP 2: EXECUTION
            // ============================================================
            // Note: Intention narration was removed in Issue #94.
            // combatNarrationExpertTool now generates complete narrations
            // that include preparation, execution, and result in a single message.

            const actionInput: CombatActionInput = {
                combatant,
                action: {
                    type: plannedAction.type,
                    targetId: plannedAction.targetId,
                    diceRollRequests: plannedAction.diceRollRequests,
                    actionDescription: plannedAction.actionDescription,
                },
                party: updatedParty,
                enemies: updatedEnemies,
                initiativeOrder,
                diceRollerTool: dependencies.diceRollerTool,
                updateRollNotationWithModifiers: dependencies.updateRollNotationWithModifiers,
            };

            const executionResult = await CombatActionExecutor.execute(actionInput);

            if (!executionResult.success) {
                return {
                    success: false,
                    messages: [{ sender: 'DM', content: executionResult.error || 'Error al ejecutar la acción.' }],
                    diceRolls: [],
                    updatedParty: initialParty,
                    updatedEnemies: initialEnemies,
                    combatResult: {},
                    combatEnded: false,
                    error: executionResult.error,
                };
            }

            // Update state
            updatedParty = executionResult.updatedParty;
            updatedEnemies = executionResult.updatedEnemies;

            // ============================================================
            // STEP 3: RESOLUTION NARRATION
            // ============================================================

            try {
                const targetVisualName = executionResult.combatResult.targetName || 'objetivo';
                let narrativeAttackResult: 'hit' | 'miss' | 'critical' | 'fumble' = 'miss';

                if (executionResult.combatResult.wasCritical) {
                    narrativeAttackResult = 'critical';
                } else if (executionResult.combatResult.wasFumble) {
                    narrativeAttackResult = 'fumble';
                } else if (executionResult.combatResult.attackHit) {
                    narrativeAttackResult = 'hit';
                }

                const narrationInput: any = {
                    attackerName: combatant.characterName,
                    targetName: targetVisualName,
                    actionDescription: plannedAction.actionDescription,
                    attackResult: narrativeAttackResult,
                };

                // Add damage and HP information if attack hit
                if (executionResult.combatResult.attackHit && executionResult.combatResult.damageDealt !== undefined) {
                    narrationInput.damageDealt = executionResult.combatResult.damageDealt;
                    narrationInput.targetPreviousHP = executionResult.combatResult.targetPreviousHP;
                    narrationInput.targetNewHP = executionResult.combatResult.targetNewHP;
                    narrationInput.targetKilled = executionResult.combatResult.targetKilled;
                    narrationInput.targetKnockedOut = executionResult.combatResult.targetKnockedOut;
                }

                // Add location context if available
                if (locationContext && typeof locationContext === 'object') {
                    narrationInput.locationDescription = (locationContext as any).description || '';
                }

                // Generate resolution narration
                const resolutionNarration = await dependencies.narrationExpert(narrationInput);

                if (resolutionNarration.narration) {
                    messages.push({
                        sender: 'DM',
                        content: resolutionNarration.narration,
                    });
                }
            } catch (error) {
                // If narration fails, log but continue
                log.warn('Could not generate resolution narration, continuing without it', {
                    module: 'TurnProcessor',
                    error: error instanceof Error ? error.message : String(error),
                });
            }

            return {
                success: true,
                messages,
                diceRolls: executionResult.diceRolls,
                updatedParty,
                updatedEnemies,
                combatResult: executionResult.combatResult,
                combatEnded: executionResult.combatResult.combatEnded || false,
                endReason: executionResult.combatResult.endReason,
            };

        } catch (error) {
            log.error('Error processing turn', {
                module: 'TurnProcessor',
                error: error instanceof Error ? error.message : String(error),
                combatant: combatant.characterName,
            });

            return {
                success: false,
                messages: [{ sender: 'DM', content: `Hubo un error al procesar el turno de ${combatant.characterName}.` }],
                diceRolls: [],
                updatedParty: initialParty,
                updatedEnemies: initialEnemies,
                combatResult: {},
                combatEnded: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}

