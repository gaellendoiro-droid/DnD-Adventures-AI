
import { Combatant } from '@/lib/types';
import { isUnconsciousOrDead } from './rules-engine';

/**
 * Manages the flow of combat turns, including initiative order navigation
 * and skipping dead or unconscious combatants.
 */
export class CombatTurnManager {
    /**
     * Calculates the next turn index, wrapping around the initiative order.
     */
    static nextTurnIndex(currentIndex: number, totalCombatants: number): number {
        if (totalCombatants === 0) return 0;
        return (currentIndex + 1) % totalCombatants;
    }

    /**
     * Determines if a combatant's turn should be skipped.
     * @param combatant The combatant to check
     * @param party The list of party members (to check HP/Status)
     * @param enemies The list of enemies (to check HP/Status)
     */
    static shouldSkipTurn(
        combatant: Combatant,
        party: any[],
        enemies: any[]
    ): boolean {
        // 1. Use status field if available (Unified Logic)
        if (combatant.status) {
            return combatant.status === 'dead' || combatant.status === 'unconscious';
        }

        // 2. Fallback to looking up data (Legacy/Safety)
        const isCompanion = party.some(p => p.id === combatant.id);
        const combatantData = isCompanion
            ? party.find(p => p.id === combatant.id)
            : enemies.find(e => (e as any).uniqueId === combatant.id || e.id === combatant.id);

        if (!combatantData) return true; // Skip if data not found (safety)

        return isUnconsciousOrDead(combatantData);
    }

    /**
     * Finds the next active combatant, skipping those who cannot act.
     * Returns the new index and the combatant, or the same index if everyone else is dead (shouldn't happen in valid combat).
     */
    static findNextActiveCombatant(
        startIndex: number,
        initiativeOrder: Combatant[],
        party: any[],
        enemies: any[]
    ): { index: number; combatant: Combatant; skippedTurns: number } {
        let currentIndex = startIndex;
        let skippedTurns = 0;
        const totalCombatants = initiativeOrder.length;

        if (totalCombatants === 0) {
            throw new Error("Cannot find next active combatant: Initiative order is empty.");
        }

        // Loop at most totalCombatants times to prevent infinite loop if everyone is dead
        for (let i = 0; i < totalCombatants; i++) {
            const combatant = initiativeOrder[currentIndex];

            if (!this.shouldSkipTurn(combatant, party, enemies)) {
                return { index: currentIndex, combatant, skippedTurns };
            }

            // Advance to next
            currentIndex = this.nextTurnIndex(currentIndex, totalCombatants);
            skippedTurns++;
        }

        // If we get here, everyone is dead/unconscious. Return the start index to avoid crash,
        // but the combat should probably end.
        return {
            index: startIndex,
            combatant: initiativeOrder[startIndex],
            skippedTurns
        };
    }

    /**
     * Determines if the frontend should automatically trigger another AI turn.
     * This is true if:
     * 1. The active combatant is AI.
     * 2. OR The active combatant is a Player but is unconscious/dead (so we skip them).
     */
    static hasMoreAITurns(
        activeCombatant: Combatant,
        party: any[],
        enemies: any[],
        combatHasEnded: boolean
    ): boolean {
        if (combatHasEnded) return false;
        if (!activeCombatant) return false;

        if (activeCombatant.controlledBy === 'AI') {
            return true;
        }

        // If it's a player, check if they are unconscious (skip turn)
        if (activeCombatant.controlledBy === 'Player') {
            return this.shouldSkipTurn(activeCombatant, party, enemies);
        }

        return false;
    }
}
