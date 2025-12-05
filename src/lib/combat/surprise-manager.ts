/**
 * @fileOverview SurpriseManager
 * Unifies all surprise logic in a single module.
 * 
 * This module provides the SINGLE SOURCE OF TRUTH for:
 * - Determining which side is surprised based on context
 * - Marking combatants as surprised in initiative order
 * - Clearing surprise flags after first turn
 * - Checking if a combatant is surprised
 */

import type { Combatant } from '@/lib/types';

/**
 * Context for determining surprise.
 */
export interface SurpriseContext {
    /** Trigger reason from CombatTriggerManager */
    triggerReason?: 'ambush' | 'proximity' | 'stealth_fail' | 'mimic' | 'provocation' | 'player_surprise';
    /** Whether the player initiated the attack */
    isPlayerInitiatedAttack?: boolean;
    /** Explicit surprise side (if already determined) */
    surpriseSide?: 'player' | 'enemy';
}

/**
 * Determines which side is surprised based on the context.
 * This is the SINGLE SOURCE OF TRUTH for surprise determination.
 * 
 * Rules:
 * - 'ambush' → enemy surprises player (surpriseSide: 'enemy')
 * - 'mimic' → enemy surprises player (surpriseSide: 'enemy')
 * - 'player_surprise' → player surprises enemy (surpriseSide: 'player')
 * - 'proximity' → no surprise (undefined)
 * - 'stealth_fail' → usually no surprise, but could be 'enemy' if ambush
 * - 'provocation' → usually no surprise
 * - isPlayerInitiatedAttack: true → player surprises enemy (surpriseSide: 'player')
 * 
 * @param context - Context for determining surprise
 * @returns 'player' if players surprise enemies, 'enemy' if enemies surprise players, undefined if no surprise
 */
export function determineSurprise(context: SurpriseContext): 'player' | 'enemy' | undefined {
    // If explicit surpriseSide is provided, use it
    if (context.surpriseSide) {
        return context.surpriseSide;
    }

    // Determine based on trigger reason
    if (context.triggerReason === 'ambush') {
        return 'enemy'; // Enemy surprises player
    }

    if (context.triggerReason === 'mimic') {
        return 'enemy'; // Mimic surprises player
    }

    if (context.triggerReason === 'player_surprise') {
        return 'player'; // Player surprises enemy
    }

    if (context.triggerReason === 'proximity') {
        return undefined; // Normal combat, no surprise
    }

    if (context.triggerReason === 'stealth_fail') {
        return undefined; // Usually normal combat, but could be enhanced later
    }

    if (context.triggerReason === 'provocation') {
        return undefined; // Usually normal combat
    }

    // If player initiated attack and no trigger reason, player surprises
    if (context.isPlayerInitiatedAttack === true) {
        return 'player';
    }

    // Default: no surprise
    return undefined;
}

/**
 * Marks combatants as surprised in the initiative order.
 * 
 * Rules:
 * - If surpriseSide is 'player': mark all enemies (AI combatants with enemy ID pattern) as surprised
 * - If surpriseSide is 'enemy': mark all player-side combatants (Player + companions, non-enemy IDs) as surprised
 * - If surpriseSide is undefined: no one is surprised
 * 
 * Note: Enemies are identified by type: 'npc'. Player-side combatants (players and companions) have type: 'player'.
 * 
 * @param initiativeOrder - The initiative order array
 * @param surpriseSide - Which side is surprised
 * @returns New initiative order with surprised combatants marked
 */
export function markCombatantsSurprised(
    initiativeOrder: Combatant[],
    surpriseSide: 'player' | 'enemy'
): Combatant[] {
    if (!surpriseSide) {
        return initiativeOrder;
    }

    return initiativeOrder.map(combatant => {
        let isSurprised = false;

        // Check if this is an enemy by type (enemies have type: 'npc', players/companions have type: 'player')
        const isEnemy = combatant.type === 'npc';

        if (surpriseSide === 'player') {
            // Player surprises enemies - mark enemies as surprised
            isSurprised = isEnemy;
        } else if (surpriseSide === 'enemy') {
            // Enemy surprises players - mark all player-side combatants (Player + companions) as surprised
            // Player-side = NOT an enemy (type: 'player')
            isSurprised = !isEnemy;
        }

        return {
            ...combatant,
            isSurprised: isSurprised ? true : undefined, // Only set if true, otherwise undefined
        };
    });
}

/**
 * Clears the surprise flag from a combatant.
 * 
 * @param combatant - The combatant to clear surprise flag from
 * @returns New combatant object with isSurprised set to false/undefined
 */
export function clearSurpriseFlag(combatant: Combatant): Combatant {
    return {
        ...combatant,
        isSurprised: false,
    };
}

/**
 * Checks if a combatant is surprised.
 * 
 * @param combatant - The combatant to check
 * @returns true if combatant.isSurprised === true, false otherwise
 */
export function isSurprised(combatant: Combatant): boolean {
    return combatant.isSurprised === true;
}

/**
 * SurpriseManager - Static class with utility functions for surprise management.
 */
export class SurpriseManager {
    static determineSurprise = determineSurprise;
    static markCombatantsSurprised = markCombatantsSurprised;
    static clearSurpriseFlag = clearSurpriseFlag;
    static isSurprised = isSurprised;
}

