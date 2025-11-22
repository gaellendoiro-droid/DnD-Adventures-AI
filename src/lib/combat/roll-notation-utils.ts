/**
 * @fileOverview Roll Notation Utilities
 * Utility functions for updating dice roll notations with modifiers.
 * Extracted from dice-roll-processor.ts as part of Issue #117.
 */

import type { DiceRoll } from '@/lib/types';
import type { Character } from '@/lib/types';
import { log } from '@/lib/logger';

/**
 * Updates a dice roll's notation to show individual modifiers instead of a single sum.
 * This function works for any combatant (player, companion, or enemy) that has
 * abilityModifiers and proficiencyBonus defined.
 * 
 * @param roll - The dice roll to update (will be modified in place)
 * @param character - Character/combatant data with abilityModifiers and proficiencyBonus
 * @param isAttackRoll - Whether this is an attack roll (includes proficiency bonus) or damage roll (doesn't)
 */
export function updateRollNotationWithModifiers(
    roll: DiceRoll,
    character: Character | any,
    isAttackRoll: boolean = false
): void {
    if (!character || !character.abilityModifiers || character.proficiencyBonus === undefined) {
        return; // Can't update without character data
    }

    const strMod = character.abilityModifiers.fuerza || 0;
    const dexMod = character.abilityModifiers.destreza || 0;
    const abilityMod = Math.max(strMod, dexMod);
    const proficiencyBonus = character.proficiencyBonus ?? 2;

    // Parse the original rollNotation to extract base dice (e.g., "1d20" or "1d8")
    const diceMatch = roll.rollNotation.match(/^(\d+d\d+)/);
    if (!diceMatch) {
        return; // Can't parse, return as-is
    }

    const baseDice = diceMatch[1];
    const modifiers: Array<{ value: number; label: string }> = [];

    if (isAttackRoll) {
        // Attack roll: ability modifier + proficiency bonus
        modifiers.push(
            { value: abilityMod, label: abilityMod === strMod ? 'FUE' : 'DES' },
            { value: proficiencyBonus, label: 'BC' }
        );

        const abilityStr = abilityMod >= 0 ? `+${abilityMod}` : `${abilityMod}`;
        const profStr = proficiencyBonus >= 0 ? `+${proficiencyBonus}` : `${proficiencyBonus}`;
        roll.rollNotation = `${baseDice}${abilityStr}${profStr}`;
    } else {
        // Damage roll: only ability modifier (no proficiency)
        if (abilityMod !== 0) {
            modifiers.push({ value: abilityMod, label: abilityMod === strMod ? 'FUE' : 'DES' });
            const abilityStr = abilityMod >= 0 ? `+${abilityMod}` : `${abilityMod}`;
            roll.rollNotation = `${baseDice}${abilityStr}`;
        }
    }

    // IMPORTANT: Clear the original modifier to avoid duplication in frontend display
    // The frontend will use roll.modifiers array instead of roll.modifier
    roll.modifier = undefined;
    roll.modifiers = modifiers;
}
