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

    // Parse the original rollNotation to extract base dice (e.g., "1d20" or "1d8")
    const diceMatch = roll.rollNotation.match(/^(\d+d\d+)/);
    if (!diceMatch) {
        return; // Can't parse, return as-is
    }
    const baseDice = diceMatch[1];
    const modifiers: Array<{ value: number; label: string }> = [];
    const proficiencyBonus = character.proficiencyBonus ?? 2;

    // NEW LOGIC: Use explicit attribute if provided by backend ("Obedient Frontend")
    if (roll.attributeUsed) {
        const attrMap: Record<string, string> = {
            'FUE': 'fuerza',
            'DES': 'destreza',
            'CON': 'constitución',
            'INT': 'inteligencia',
            'SAB': 'sabiduría',
            'CAR': 'carisma'
        };

        const modKey = attrMap[roll.attributeUsed];
        // Handle potential missing keys or typos safely
        const abilityMod = (character.abilityModifiers as any)[modKey] !== undefined
            ? (character.abilityModifiers as any)[modKey]
            : 0;

        if (isAttackRoll) {
            // Attack roll: ability modifier + proficiency bonus
            modifiers.push(
                { value: abilityMod, label: roll.attributeUsed },
                { value: proficiencyBonus, label: 'BC' }
            );

            // Use labels instead of values in notation (Issue #120 enhancement)
            roll.rollNotation = `${baseDice}+${roll.attributeUsed}+BC`;
        } else {
            // Damage roll: only ability modifier (no proficiency)
            // Always show the attribute used, even if modifier is 0 (for consistency across all combatants)
            modifiers.push({ value: abilityMod, label: roll.attributeUsed });
            // Use label instead of value in notation
            const sign = abilityMod >= 0 ? '+' : '';
            roll.rollNotation = `${baseDice}${sign}${roll.attributeUsed}`;
        }

        // Apply changes
        roll.modifier = undefined;
        roll.modifiers = modifiers;
        return;
    }

    // ERROR: Frontend should never guess - backend must provide attributeUsed
    // This maintains the "Obedient Frontend" architecture from Issue #120
    log.error('Missing attributeUsed in dice roll', {
        module: 'roll-notation-utils',
        rollId: roll.id,
        rollDescription: roll.description,
        characterName: character.name,
    });
    throw new Error(
        `Missing required 'attributeUsed' field in dice roll. ` +
        `Backend must provide this information. Roll: ${roll.description || roll.id || 'unknown'}`
    );
}
