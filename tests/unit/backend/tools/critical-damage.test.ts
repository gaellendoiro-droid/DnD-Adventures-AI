/**
 * Unit tests for critical damage calculation (Issue #50)
 * Tests the getCriticalDamageNotation function that doubles damage dice for critical hits
 * according to D&D 5e rules
 */

import { describe, it, expect } from 'vitest';
import { getCriticalDamageNotation as getCriticalDamageNotationPlayer } from '../../../../src/lib/combat/rules-engine';
import { getCriticalDamageNotation as getCriticalDamageNotationNPC } from '../../../../src/ai/tools/combat/dice-roll-processor';

describe('getCriticalDamageNotation - Player Attacks (combat-manager)', () => {
  describe('Non-critical hits', () => {
    it('should return unchanged notation when isCritical is false', () => {
      expect(getCriticalDamageNotationPlayer('1d8', 3, false)).toBe('1d8+3');
      expect(getCriticalDamageNotationPlayer('2d6', 2, false)).toBe('2d6+2');
      expect(getCriticalDamageNotationPlayer('1d12', 5, false)).toBe('1d12+5');
    });

    it('should handle zero modifier on non-critical', () => {
      expect(getCriticalDamageNotationPlayer('1d8', 0, false)).toBe('1d8+0');
    });

    it('should handle negative modifier on non-critical', () => {
      expect(getCriticalDamageNotationPlayer('1d6', -1, false)).toBe('1d6+-1');
    });
  });

  describe('Critical hits - Single die', () => {
    it('should double single die damage on critical (1d8+3 -> 2d8+3)', () => {
      expect(getCriticalDamageNotationPlayer('1d8', 3, true)).toBe('2d8+3');
    });

    it('should double single die damage with different modifiers', () => {
      expect(getCriticalDamageNotationPlayer('1d6', 2, true)).toBe('2d6+2');
      expect(getCriticalDamageNotationPlayer('1d10', 4, true)).toBe('2d10+4');
      expect(getCriticalDamageNotationPlayer('1d12', 5, true)).toBe('2d12+5');
    });

    it('should double die but not modifier on critical with zero modifier', () => {
      expect(getCriticalDamageNotationPlayer('1d8', 0, true)).toBe('2d8+0');
    });

    it('should handle negative modifier correctly on critical', () => {
      expect(getCriticalDamageNotationPlayer('1d6', -1, true)).toBe('2d6+-1');
    });
  });

  describe('Critical hits - Multiple dice', () => {
    it('should double multiple dice on critical (2d6+2 -> 4d6+2)', () => {
      expect(getCriticalDamageNotationPlayer('2d6', 2, true)).toBe('4d6+2');
    });

    it('should double 3 dice correctly', () => {
      expect(getCriticalDamageNotationPlayer('3d6', 3, true)).toBe('6d6+3');
    });

    it('should double 4 dice correctly', () => {
      expect(getCriticalDamageNotationPlayer('4d4', 1, true)).toBe('8d4+1');
    });
  });

  describe('Edge cases', () => {
    it('should handle d4 (smallest die)', () => {
      expect(getCriticalDamageNotationPlayer('1d4', 2, true)).toBe('2d4+2');
    });

    it('should handle d20 (largest common die)', () => {
      expect(getCriticalDamageNotationPlayer('1d20', 5, true)).toBe('2d20+5');
    });

    it('should handle d100', () => {
      expect(getCriticalDamageNotationPlayer('1d100', 10, true)).toBe('2d100+10');
    });

    it('should handle invalid die notation gracefully', () => {
      // Should return invalid notation as-is with modifier appended
      const result = getCriticalDamageNotationPlayer('invalid', 3, true);
      expect(result).toBe('invalid+3');
    });

    it('should handle empty string', () => {
      const result = getCriticalDamageNotationPlayer('', 2, true);
      expect(result).toBe('+2');
    });
  });
});

describe('getCriticalDamageNotation - NPC Attacks (dice-roll-processor)', () => {
  describe('Non-critical hits', () => {
    it('should return unchanged notation when isCritical is false', () => {
      expect(getCriticalDamageNotationNPC('1d8+3', false)).toBe('1d8+3');
      expect(getCriticalDamageNotationNPC('2d6+2', false)).toBe('2d6+2');
      expect(getCriticalDamageNotationNPC('1d12+5', false)).toBe('1d12+5');
    });

    it('should handle notation without modifier on non-critical', () => {
      expect(getCriticalDamageNotationNPC('1d8', false)).toBe('1d8');
      expect(getCriticalDamageNotationNPC('2d6', false)).toBe('2d6');
    });
  });

  describe('Critical hits - Single die', () => {
    it('should double single die damage on critical (1d8+3 -> 2d8+3)', () => {
      expect(getCriticalDamageNotationNPC('1d8+3', true)).toBe('2d8+3');
    });

    it('should double single die with different modifiers', () => {
      expect(getCriticalDamageNotationNPC('1d6+2', true)).toBe('2d6+2');
      expect(getCriticalDamageNotationNPC('1d10+4', true)).toBe('2d10+4');
      expect(getCriticalDamageNotationNPC('1d12+5', true)).toBe('2d12+5');
    });

    it('should double die without modifier on critical', () => {
      expect(getCriticalDamageNotationNPC('1d8', true)).toBe('2d8');
    });

    it('should handle negative modifier on critical', () => {
      expect(getCriticalDamageNotationNPC('1d6-1', true)).toBe('2d6-1');
    });

    it('should handle zero modifier (explicit +0)', () => {
      expect(getCriticalDamageNotationNPC('1d8+0', true)).toBe('2d8+0');
    });
  });

  describe('Critical hits - Multiple dice', () => {
    it('should double multiple dice on critical (2d6+2 -> 4d6+2)', () => {
      expect(getCriticalDamageNotationNPC('2d6+2', true)).toBe('4d6+2');
    });

    it('should double 3 dice correctly', () => {
      expect(getCriticalDamageNotationNPC('3d6+3', true)).toBe('6d6+3');
    });

    it('should double 4 dice correctly', () => {
      expect(getCriticalDamageNotationNPC('4d4+1', true)).toBe('8d4+1');
    });

    it('should double dice without modifier', () => {
      expect(getCriticalDamageNotationNPC('2d6', true)).toBe('4d6');
    });
  });

  describe('Edge cases', () => {
    it('should handle d4 (smallest die)', () => {
      expect(getCriticalDamageNotationNPC('1d4+2', true)).toBe('2d4+2');
    });

    it('should handle d20 (largest common die)', () => {
      expect(getCriticalDamageNotationNPC('1d20+5', true)).toBe('2d20+5');
    });

    it('should handle d100', () => {
      expect(getCriticalDamageNotationNPC('1d100+10', true)).toBe('2d100+10');
    });

    it('should handle invalid notation gracefully', () => {
      // Should return notation as-is when invalid
      const result = getCriticalDamageNotationNPC('invalid+3', true);
      expect(result).toBe('invalid+3');
    });

    it('should handle notation without d separator', () => {
      const result = getCriticalDamageNotationNPC('8+3', true);
      expect(result).toBe('8+3');
    });

    it('should handle empty string', () => {
      const result = getCriticalDamageNotationNPC('', true);
      expect(result).toBe('');
    });
  });

  describe('D&D 5e Rule Compliance', () => {
    it('should follow D&D 5e rule: double dice, not modifier (1d8+2 -> 2d8+2, not 2d8+4)', () => {
      const result = getCriticalDamageNotationNPC('1d8+2', true);
      expect(result).toBe('2d8+2');
      expect(result).not.toBe('2d8+4'); // Modifier should NOT be doubled
    });

    it('should follow D&D 5e rule for larger weapons', () => {
      const result = getCriticalDamageNotationNPC('1d12+3', true);
      expect(result).toBe('2d12+3');
      // Average damage: normal = 9.5, critical = 16 (NOT 19)
    });

    it('should follow D&D 5e rule for versatile weapons (2d6)', () => {
      const result = getCriticalDamageNotationNPC('2d6+4', true);
      expect(result).toBe('4d6+4');
      // Doubles the dice (2d6 -> 4d6) but not the modifier (+4 stays +4)
    });
  });
});

describe('Integration - Both functions should behave identically', () => {
  const testCases = [
    { dice: '1d8', mod: 3, crit: true, expected: '2d8' },
    { dice: '2d6', mod: 2, crit: true, expected: '4d6' },
    { dice: '1d12', mod: 5, crit: false, expected: '1d12' },
    { dice: '3d6', mod: 0, crit: true, expected: '6d6' },
  ];

  testCases.forEach(({ dice, mod, crit, expected }) => {
    it(`should produce same result for ${dice}+${mod}, critical=${crit}`, () => {
      // Player function takes separate die and modifier
      const playerResult = getCriticalDamageNotationPlayer(dice, mod, crit);
      
      // NPC function takes combined notation
      const npcNotation = mod === 0 ? dice : `${dice}+${mod}`;
      const npcResult = getCriticalDamageNotationNPC(npcNotation, crit);
      
      // Extract just the dice part for comparison (ignore how modifier is formatted)
      expect(playerResult).toContain(expected);
      expect(npcResult).toContain(expected);
    });
  });
});

