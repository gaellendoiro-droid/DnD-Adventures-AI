import { Character, Location, GameMessage } from '@/lib/types';
import { isEntityOutOfCombat } from '@/lib/game/entity-status-utils';

// Input types for the evaluator
export interface ExplorationTriggerInput {
    location: Location;
    detectedHazards: string[]; // IDs of detected hazards
    visibleEntities: any[]; // Entities present in the location
    stealthCheckResult?: {
        success: boolean;
        roll: number;
    };
}

export interface InteractionTriggerInput {
    npcId?: string;
    npcName?: string;
    targetId?: string; // Para objetos/hazards
    interactionResult?: {
        escalation?: boolean;
        newAttitude?: string;
        action?: string;
    };
    locationHazards?: any[]; // HazardSchema[] - deprecated for mimic detection
    locationEntities?: any[]; // Entities in the location (for mimic detection)
}

export interface PlayerActionTriggerInput {
    actionType: string;
    targetId?: string;
    isCombatAction: boolean;
}

// Output type
export interface CombatTriggerResult {
    shouldStartCombat: boolean;
    reason?: 'ambush' | 'proximity' | 'stealth_fail' | 'mimic' | 'provocation' | 'player_surprise';
    surpriseSide?: 'player' | 'enemy';
    message?: string; // Optional narrative reason
    triggeringEntityId?: string; // ID of the entity that triggered combat (e.g. the mimic)
}

/**
 * CombatTriggerEvaluator
 *
 * Evaluates game events to determine if combat should start automatically.
 * Acts as a central arbiter for combat initiation logic.
 */
export class CombatTriggerEvaluator {

    /**
     * Evaluates exploration results (entering a room)
     */
    static evaluateExploration(input: ExplorationTriggerInput): CombatTriggerResult {
        const { location, detectedHazards, visibleEntities, stealthCheckResult } = input;

        // FIX: Ignore hidden enemies (like Mimics) until triggered
        const hostileEntities = visibleEntities.filter(e =>
            (e.type === 'enemy' || e.disposition === 'hostile') &&
            e.disposition !== 'hidden' &&
            e.status !== 'hidden' &&
            // Exclude dead/unconscious enemies to avoid phantom combats using centralized logic
            !isEntityOutOfCombat(e)
        );

        // 1. Check for Proximity (Visible Hostile Enemies)
        // IMPORTANT: If enemies are visible, there's NO surprise, even if there's an ambush hazard.
        // Ambushes only work if enemies are hidden/not visible.
        if (hostileEntities.length > 0) {
            // If player tried stealth and failed
            if (stealthCheckResult && !stealthCheckResult.success) {
                return {
                    shouldStartCombat: true,
                    reason: 'stealth_fail',
                    surpriseSide: undefined, // Normal combat usually, unless enemies were super alert
                    message: "Vuestro intento de sigilo falla. ¡Os han visto!"
                };
            }

            // If player just walked in (no stealth)
            if (!stealthCheckResult) {
                return {
                    shouldStartCombat: true,
                    reason: 'proximity',
                    surpriseSide: undefined, // Normal combat - enemies are visible, no surprise
                    message: "Enemigos visibles en la zona. ¡A las armas!"
                };
            }
        }

        // 2. Check for Ambushes (Hazards of type 'ambush' NOT detected)
        // IMPORTANT: Ambushes only trigger if enemies are NOT visible (hidden).
        // If enemies are visible, we already handled it above with 'proximity' (no surprise).
        if (location.hazards) {
            const ambushes = location.hazards.filter(h => h.type === 'ambush' && h.active);

            for (const ambush of ambushes) {
                // If ambush is NOT in detectedHazards, it triggers!
                // But only if there are NO visible enemies (enemies are hidden)
                if (!detectedHazards.includes(ambush.id) && hostileEntities.length === 0) {
                    return {
                        shouldStartCombat: true,
                        reason: 'ambush',
                        surpriseSide: 'enemy', // Enemy surprises player
                        message: ambush.triggerDescription || "¡Emboscada! Enemigos surgen de las sombras."
                    };
                }
            }
        }

        return { shouldStartCombat: false };
    }

    /**
     * Evaluates interaction results (talking to NPCs, touching objects)
     */
    static evaluateInteraction(input: InteractionTriggerInput): CombatTriggerResult {
        const { interactionResult, targetId, locationEntities } = input;

        // 1. Check for Mimics (Hidden entities that reveal when interacted with)
        if (targetId && locationEntities) {
            // A mimic is an entity with:
            // - disposition: 'hidden' (disguised as object)
            // - type: 'enemy'
            // - name/id containing 'mimic' OR baseType containing 'mimic'
            const targetLower = targetId.toLowerCase();

            const mimic = locationEntities.find(entity => {
                // Must be a hidden enemy
                if (entity.disposition !== 'hidden') return false;
                if (entity.type !== 'enemy') return false;

                // Check if it's a mimic by name, id, or baseType
                const isMimic =
                    entity.name?.toLowerCase().includes('mímico') ||
                    entity.name?.toLowerCase().includes('mimic') ||
                    entity.id?.toLowerCase().includes('mimic') ||
                    entity.baseType?.toLowerCase().includes('mimic');

                if (!isMimic) return false;

                // Check if target matches this entity's id
                const entityIdLower = entity.id?.toLowerCase() || '';
                return targetLower.includes(entityIdLower) ||
                       entityIdLower.includes(targetLower) ||
                       // Also check if targetId matches common chest/object keywords
                       (targetLower.includes('cofre') && entityIdLower.includes('cofre')) ||
                       (targetLower.includes('chest') && entityIdLower.includes('chest'));
            });

            if (mimic) {
                return {
                    shouldStartCombat: true,
                    reason: 'mimic',
                    surpriseSide: 'enemy', // Mimic surprises player
                    message: mimic.triggerDescription || mimic.description || "¡El objeto cobra vida! ¡Es un mímico!",
                    triggeringEntityId: mimic.id
                };
            }
        }

        // 2. Check for social escalation
        if (interactionResult && (interactionResult.escalation || interactionResult.action === 'attack')) {
            return {
                shouldStartCombat: true,
                reason: 'provocation',
                surpriseSide: undefined, // Usually normal initiative as tensions rise
                message: "La tensión estalla. ¡Comienza el combate!"
            };
        }

        return { shouldStartCombat: false };
    }

    /**
     * Evaluates player direct actions (e.g. "I stab him")
     */
    static evaluatePlayerAction(input: PlayerActionTriggerInput): CombatTriggerResult {
        const { actionType, isCombatAction } = input;

        // If player declares a combat action while out of combat
        if (isCombatAction || actionType === 'attack') {
            return {
                shouldStartCombat: true,
                reason: 'player_surprise',
                surpriseSide: 'player', // Player surprises enemy
                message: "¡Ataque sorpresa!"
            };
        }

        return { shouldStartCombat: false };
    }
}

