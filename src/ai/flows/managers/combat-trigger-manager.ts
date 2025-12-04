
import { z } from 'zod';
import { Character, Location, GameMessage } from '@/lib/types';

// Input types for the manager
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
    locationHazards?: any[]; // HazardSchema[]
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
 * CombatTriggerManager
 * 
 * Evaluates game events to determine if combat should start automatically.
 * Acts as a central arbiter for combat initiation logic.
 */
export class CombatTriggerManager {

    /**
     * Evaluates exploration results (entering a room)
     */
    static evaluateExploration(input: ExplorationTriggerInput): CombatTriggerResult {
        const { location, detectedHazards, visibleEntities, stealthCheckResult } = input;

        // 1. Check for Ambushes (Hazards of type 'ambush' NOT detected)
        if (location.hazards) {
            const ambushes = location.hazards.filter(h => h.type === 'ambush' && h.active);

            for (const ambush of ambushes) {
                // If ambush is NOT in detectedHazards, it triggers!
                if (!detectedHazards.includes(ambush.id)) {
                    return {
                        shouldStartCombat: true,
                        reason: 'ambush',
                        surpriseSide: 'enemy', // Enemy surprises player
                        message: ambush.triggerDescription || "¡Emboscada! Enemigos surgen de las sombras."
                    };
                }
            }
        }

        // 2. Check for Proximity (Visible Hostile Enemies)
        // Logic: If there are enemies and we are NOT stealthy (or failed stealth), combat starts.
        // FIX: Ignore hidden enemies (like Mimics) until triggered
        const hostileEntities = visibleEntities.filter(e => 
            (e.type === 'enemy' || e.disposition === 'hostile') &&
            e.disposition !== 'hidden' &&
            e.status !== 'hidden'
        );

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
                    surpriseSide: undefined, // Normal combat
                    message: "Enemigos visibles en la zona. ¡A las armas!"
                };
            }
        }

        return { shouldStartCombat: false };
    }

    /**
     * Evaluates interaction results (talking to NPCs, touching objects)
     */
    static evaluateInteraction(input: InteractionTriggerInput): CombatTriggerResult {
        const { interactionResult, targetId, locationHazards } = input;

        // 1. Check for Mimics (Object interaction)
        if (targetId && locationHazards) {
            // First, try direct ID match
            let mimic = locationHazards.find(h => h.id === targetId && h.type === 'mimic' && h.active);
            
            // If not found, try to match by name (ActionInterpreter might return object name instead of ID)
            if (!mimic) {
                // Check if targetId matches any hazard's description or if it's a partial match
                const targetLower = targetId.toLowerCase();
                mimic = locationHazards.find(h => {
                    if (h.type !== 'mimic' || !h.active) return false;
                    // Check if targetId contains hazard ID or vice versa
                    const hazardIdLower = h.id.toLowerCase();
                    return targetLower.includes(hazardIdLower) || 
                           hazardIdLower.includes(targetLower) ||
                           // Also check if targetId matches common chest/object keywords
                           (targetLower.includes('cofre') && hazardIdLower.includes('cofre')) ||
                           (targetLower.includes('chest') && hazardIdLower.includes('chest'));
                });
            }
            
            if (mimic) {
                return {
                    shouldStartCombat: true,
                    reason: 'mimic',
                    surpriseSide: 'enemy', // Mimic surprises player
                    message: mimic.triggerDescription || "¡El objeto cobra vida! ¡Es un mímico!",
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
