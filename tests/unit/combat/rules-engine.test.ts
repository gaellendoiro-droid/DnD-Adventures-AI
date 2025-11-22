
import { describe, it, expect } from 'vitest';
import {
    validateAndClampHP,
    isUnconsciousOrDead,
    applyDamage,
    getCriticalDamageNotation,
    checkEndOfCombat,
    type CombatantState
} from '../../../src/lib/combat/rules-engine';

describe('Combat Rules Engine', () => {

    describe('validateAndClampHP', () => {
        it('should clamp current HP to max HP', () => {
            const char = { hp: { current: 15, max: 10 } };
            const result = validateAndClampHP(char);
            expect(result.hp.current).toBe(10);
        });

        it('should clamp negative HP to 0', () => {
            const char = { hp: { current: -5, max: 10 } };
            const result = validateAndClampHP(char);
            expect(result.hp.current).toBe(0);
        });

        it('should set default max HP if invalid', () => {
            const char = { hp: { current: 10, max: 0 } };
            const result = validateAndClampHP(char);
            expect(result.hp.max).toBe(10);
        });

        it('should keep current HP at 0 if isDead is true', () => {
            const char = { hp: { current: 10, max: 10 }, isDead: true };
            const result = validateAndClampHP(char);
            expect(result.hp.current).toBe(0);
        });
    });

    describe('isUnconsciousOrDead', () => {
        it('should return true if HP is 0', () => {
            const char: CombatantState = { hp: { current: 0, max: 10 }, controlledBy: 'Player' };
            expect(isUnconsciousOrDead(char)).toBe(true);
        });

        it('should return true if isDead is true', () => {
            const char: CombatantState = { hp: { current: 10, max: 10 }, isDead: true, controlledBy: 'Player' };
            expect(isUnconsciousOrDead(char)).toBe(true);
        });

        it('should return false if HP > 0 and not dead', () => {
            const char: CombatantState = { hp: { current: 5, max: 10 }, controlledBy: 'Player' };
            expect(isUnconsciousOrDead(char)).toBe(false);
        });
    });

    describe('applyDamage', () => {
        it('should reduce HP correctly', () => {
            const char: CombatantState = { hp: { current: 10, max: 10 }, controlledBy: 'Player' };
            const result = applyDamage(char, 4, false); // false = party member
            expect(result.newHP).toBe(6);
            expect(result.damageDealt).toBe(4);
            expect(result.isUnconscious).toBe(false);
        });

        it('should handle unconsciousness (0 HP) for party members', () => {
            const char: CombatantState = { hp: { current: 5, max: 10 }, controlledBy: 'Player' };
            const result = applyDamage(char, 5, false); // false = party member, not enemy
            expect(result.newHP).toBe(0);
            expect(result.isUnconscious).toBe(true);
            expect(result.isDead).toBe(false);
        });

        it('should detect massive damage (Instant Death)', () => {
            const char: CombatantState = { hp: { current: 5, max: 10 }, controlledBy: 'Player' };
            // Damage = 15. Remaining = 15 - 5 = 10. MaxHP = 10. 10 >= 10 -> Massive Damage.
            const result = applyDamage(char, 15, false); // false = party member
            expect(result.newHP).toBe(0);
            expect(result.isUnconscious).toBe(true);
            expect(result.isDead).toBe(true);
            expect(result.isMassiveDamage).toBe(true);
        });

        it('should NOT trigger massive damage if remaining < maxHP', () => {
            const char: CombatantState = { hp: { current: 5, max: 10 }, controlledBy: 'Player' };
            // Damage = 14. Remaining = 14 - 5 = 9. MaxHP = 10. 9 < 10 -> Not Massive Damage.
            const result = applyDamage(char, 14, false); // false = party member
            expect(result.newHP).toBe(0);
            expect(result.isUnconscious).toBe(true);
            expect(result.isDead).toBe(false);
            expect(result.isMassiveDamage).toBe(false);
        });

        it('should mark enemies as dead at 0 HP', () => {
            const char: CombatantState = { hp: { current: 5, max: 10 }, controlledBy: 'AI' };
            const result = applyDamage(char, 5, true); // true = enemy
            expect(result.newHP).toBe(0);
            expect(result.isDead).toBe(true); // Enemies die at 0 HP
            expect(result.isUnconscious).toBe(true);
        });

        it('should mark AI companions as unconscious (not dead) at 0 HP', () => {
            const char: CombatantState = { hp: { current: 5, max: 10 }, controlledBy: 'AI' };
            const result = applyDamage(char, 5, false); // false = party member (AI companion)
            expect(result.newHP).toBe(0);
            expect(result.isDead).toBe(false); // Companions become unconscious, not dead
            expect(result.isUnconscious).toBe(true);
        });
    });

    describe('getCriticalDamageNotation', () => {
        it('should double the dice number', () => {
            expect(getCriticalDamageNotation('1d8', 3, true)).toBe('2d8+3');
            expect(getCriticalDamageNotation('2d6', 2, true)).toBe('4d6+2');
        });

        it('should NOT change notation if not critical', () => {
            expect(getCriticalDamageNotation('1d8', 3, false)).toBe('1d8+3');
        });

        it('should handle invalid notation gracefully', () => {
            expect(getCriticalDamageNotation('invalid', 0, true)).toBe('invalid+0');
        });
    });

    describe('checkEndOfCombat', () => {
        it('should detect when all enemies are defeated', () => {
            const party: CombatantState[] = [{ hp: { current: 10, max: 10 }, controlledBy: 'Player' }];
            const enemies: CombatantState[] = [{ hp: { current: 0, max: 10 }, controlledBy: 'AI' }];
            const result = checkEndOfCombat(party, enemies);
            expect(result.combatEnded).toBe(true);
            expect(result.reason).toContain('enemigos derrotados');
        });

        it('should detect when all allies are defeated', () => {
            const party: CombatantState[] = [{ hp: { current: 0, max: 10 }, controlledBy: 'Player' }];
            const enemies: CombatantState[] = [{ hp: { current: 10, max: 10 }, controlledBy: 'AI' }];
            const result = checkEndOfCombat(party, enemies);
            expect(result.combatEnded).toBe(true);
            expect(result.reason).toContain('aliados inconscientes'); // Default if not explicitly isDead
        });
    });
});
