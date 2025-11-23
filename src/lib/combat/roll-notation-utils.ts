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
            if (abilityMod !== 0) {
                modifiers.push({ value: abilityMod, label: roll.attributeUsed });
                // Use label instead of value in notation
                const sign = abilityMod >= 0 ? '+' : '';
                roll.rollNotation = `${baseDice}${sign}${roll.attributeUsed}`;
            }
        }

        // Apply changes
        roll.modifier = undefined;
        roll.modifiers = modifiers;
        return;
    }

    // LEGACY LOGIC: Fallback to guessing based on highest modifier (FUE vs DES)
    // This is kept for backward compatibility or for entities that don't provide attributeUsed (e.g. some enemies)

    const strMod = character.abilityModifiers.fuerza || 0;
    const dexMod = character.abilityModifiers.destreza || 0;
    const abilityMod = Math.max(strMod, dexMod);
    const abilityLabel = abilityMod === strMod ? 'FUE' : 'DES';

    if (isAttackRoll) {
        // Attack roll: ability modifier + proficiency bonus
        modifiers.push(
            { value: abilityMod, label: abilityLabel },
            { value: proficiencyBonus, label: 'BC' }
        );

        // Use labels instead of values in notation (Issue #120 enhancement)
        roll.rollNotation = `${baseDice}+${abilityLabel}+BC`;
    } else {
        // Damage roll: only ability modifier (no proficiency)
        if (abilityMod !== 0) {
            modifiers.push({ value: abilityMod, label: abilityLabel });
            // Use label instead of value in notation
            const sign = abilityMod >= 0 ? '+' : '';
            roll.rollNotation = `${baseDice}${sign}${abilityLabel}`;
        }
    }

    // IMPORTANT: Clear the original modifier to avoid duplication in frontend display
    // The frontend will use roll.modifiers array instead of roll.modifier
    roll.modifier = undefined;
    roll.modifiers = modifiers;
}
