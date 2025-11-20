/**
 * @fileOverview Combat Rules Engine
 * Pure functions implementing D&D 5e combat rules.
 * Handles HP validation, damage application, death saves (future), and status checks.
 */

import { log } from '@/lib/logger';

// --- Types ---

export interface DamageResult {
    newHP: number;
    damageDealt: number; // Actual damage subtracted (might be capped by 0)
    isDead: boolean;
    isUnconscious: boolean;
    isMassiveDamage: boolean;
    previousHP: number;
}

export interface CombatantState {
    hp: {
        current: number;
        max: number;
    };
    isDead?: boolean;
    controlledBy?: 'Player' | 'AI';
    name?: string;
    id?: string;
    uniqueId?: string;
}

// --- HP & Status Logic ---

/**
 * Gets a human-readable HP status description based on current/max HP.
 */
export const getHpStatus = (current: number, max: number): string => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'Healthy';
    if (percentage >= 60) return 'Injured';
    if (percentage >= 20) return 'Wounded';
    if (percentage > 0) return 'Badly Wounded';
    return 'Defeated';
};

/**
 * Validates and clamps HP values to ensure they are within valid ranges.
 */
export function validateAndClampHP<T extends CombatantState>(character: T): T {
    if (!character || !character.hp) {
        return character;
    }

    const { current, max } = character.hp;

    // Validate hp.max > 0
    if (max <= 0) {
        character.hp.max = 10;
    }

    // If isDead is true, keep hp.current at 0
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

    return {
        ...character,
        hp: {
            current: clampedCurrent,
            max: validMax,
        },
        isDead: character.isDead || false,
    };
}

/**
 * Checks if a character is unconscious or dead.
 */
export function isUnconsciousOrDead(character: CombatantState): boolean {
    if (!character || !character.hp) {
        return false;
    }

    // For players/companions: check isDead or hp.current <= 0
    if (character.controlledBy === 'Player' || character.controlledBy === 'AI') {
        return character.isDead === true || character.hp.current <= 0;
    }

    // For enemies: check hp.current <= 0
    return character.hp.current <= 0;
}

/**
 * Checks if combat has ended.
 */
export function checkEndOfCombat(updatedParty: CombatantState[], updatedEnemies: CombatantState[]): { combatEnded: boolean; reason: string | null } {
    const allEnemiesDefeated = updatedEnemies.every(e => e.hp.current <= 0);
    if (allEnemiesDefeated) {
        return { combatEnded: true, reason: 'Todos los enemigos derrotados' };
    }

    const allAlliesDefeated = updatedParty.every(p => isUnconsciousOrDead(p));
    if (allAlliesDefeated) {
        const allDead = updatedParty.every(p => p.isDead === true);
        if (allDead) {
            return { combatEnded: true, reason: 'Todos los aliados muertos' };
        } else {
            return { combatEnded: true, reason: 'Todos los aliados inconscientes' };
        }
    }

    return { combatEnded: false, reason: null };
}

// --- Damage Logic ---

/**
 * Calculates the result of applying damage to a combatant, implementing D&D 5e rules:
 * - Regular damage
 * - Massive damage (Instant death)
 * - Unconsciousness
 */
export function applyDamage(target: CombatantState, damage: number): DamageResult {
    const currentHP = target.hp.current;
    const maxHP = target.hp.max;

    // If already dead, no change
    if (target.isDead) {
        return {
            newHP: 0,
            damageDealt: 0,
            isDead: true,
            isUnconscious: true,
            isMassiveDamage: false,
            previousHP: currentHP
        };
    }

    let newHP = currentHP - damage;
    let isDead = false;
    let isUnconscious = false;
    let isMassiveDamage = false;

    if (newHP <= 0) {
        const remainingDamage = Math.abs(newHP);
        newHP = 0;
        isUnconscious = true;

        // Massive Damage Rule:
        // If damage reduces you to 0 HP and there is damage remaining,
        // and that remaining damage equals or exceeds your hit point maximum, you die.
        // ONLY applies to Player/Companions usually, but we can apply generally or flag it.
        // For monsters, 0 HP is usually death anyway.

        if (remainingDamage >= maxHP) {
            isDead = true;
            isMassiveDamage = true;
        } else {
            // For monsters, 0 HP is death (unless special trait).
            // For players, 0 HP is unconscious.
            // We'll let the caller decide based on 'controlledBy', but here we just return the flags.
            // Defaulting isDead to true if it's a monster (controlledBy AI and not in party? context needed).
            // Actually, let's stick to pure math here.
            // The caller (CombatManager) knows if it's a monster or player.
            // BUT, to be useful, we should probably handle the "Monster dies at 0" rule here if we know it's a monster.
            // However, `applyDamage` should be generic.
            // Let's return the flags and let the manager decide the final state text, 
            // OR we assume standard rules:

            if (target.controlledBy !== 'Player') {
                // Monsters die at 0 usually
                isDead = true;
            }
        }
    }

    return {
        newHP,
        damageDealt: currentHP - newHP, // Effective damage to HP pool
        isDead,
        isUnconscious,
        isMassiveDamage,
        previousHP: currentHP
    };
}

/**
 * Duplicates damage dice for critical hits according to D&D 5e rules.
 */
export const getCriticalDamageNotation = (damageDie: string, damageMod: number, isCritical: boolean): string => {
    const diceMatch = damageDie.match(/^(\d+)d(\d+)$/);

    if (!diceMatch) {
        return `${damageDie}+${damageMod}`;
    }

    const numDice = parseInt(diceMatch[1], 10);
    const dieType = diceMatch[2];

    const finalNumDice = isCritical ? numDice * 2 : numDice;

    return `${finalNumDice}d${dieType}+${damageMod}`;
};
