/**
 * Unit tests for critical damage calculation (Issue #50)
 * Tests the getCriticalDamageNotation function that doubles damage dice for critical hits
 * according to D&D 5e rules
 */

import { describe, it, expect } from 'vitest';
import { getCriticalDamageNotation } from '../../../../src/lib/combat/rules-engine';

/**
 * Unit tests for critical damage calculation (Issue #50)
 * Tests the getCriticalDamageNotation function that doubles damage dice for critical hits
 * according to D&D 5e rules
 * 
 * Note: This test now uses the unified getCriticalDamageNotation from rules-engine.ts
 * after Issue #117 unified the combat architecture.
 */

import { describe, it, expect } from 'vitest';
import { getCriticalDamageNotation } from '../../../../src/lib/combat/rules-engine';

describe('getCriticalDamageNotation - Unified (rules-engine)', () => {
  describe('Non-critical hits', () => {
    it('should return unchanged notation when isCritical is false', () => {
      expect(getCriticalDamageNotation('1d8', 3, false)).toBe('1d8+3');
      expect(getCriticalDamageNotation('2d6', 2, false)).toBe('2d6+2');
      expect(getCriticalDamageNotation('1d12', 5, false)).toBe('1d12+5');
    });

    it('should handle zero modifier on non-critical', () => {
      expect(getCriticalDamageNotation('1d8', 0, false)).toBe('1d8+0');
    });

    it('should handle negative modifier on non-critical', () => {
      expect(getCriticalDamageNotation('1d6', -1, false)).toBe('1d6+-1');
    });
  });

  describe('Critical hits - Single die', () => {
    it('should double single die damage on critical (1d8+3 -> 2d8+3)', () => {
      expect(getCriticalDamageNotation('1d8', 3, true)).toBe('2d8+3');
    });

    it('should double single die damage with different modifiers', () => {
      expect(getCriticalDamageNotation('1d6', 2, true)).toBe('2d6+2');
      expect(getCriticalDamageNotation('1d10', 4, true)).toBe('2d10+4');
      expect(getCriticalDamageNotation('1d12', 5, true)).toBe('2d12+5');
    });

    it('should double die but not modifier on critical with zero modifier', () => {
      expect(getCriticalDamageNotation('1d8', 0, true)).toBe('2d8+0');
    });

    it('should handle negative modifier correctly on critical', () => {
      expect(getCriticalDamageNotation('1d6', -1, true)).toBe('2d6+-1');
    });
  });

  describe('Critical hits - Multiple dice', () => {
    it('should double multiple dice on critical (2d6+2 -> 4d6+2)', () => {
      expect(getCriticalDamageNotation('2d6', 2, true)).toBe('4d6+2');
    });

    it('should double 3 dice correctly', () => {
      expect(getCriticalDamageNotation('3d6', 3, true)).toBe('6d6+3');
    });

    it('should double 4 dice correctly', () => {
      expect(getCriticalDamageNotation('4d4', 1, true)).toBe('8d4+1');
    });
  });

  describe('Edge cases', () => {
    it('should handle d4 (smallest die)', () => {
      expect(getCriticalDamageNotation('1d4', 2, true)).toBe('2d4+2');
    });

    it('should handle d20 (largest common die)', () => {
      expect(getCriticalDamageNotation('1d20', 5, true)).toBe('2d20+5');
    });

    it('should handle d100', () => {
      expect(getCriticalDamageNotation('1d100', 10, true)).toBe('2d100+10');
    });

    it('should handle invalid die notation gracefully', () => {
      // Should return invalid notation as-is with modifier appended
      const result = getCriticalDamageNotation('invalid', 3, true);
      expect(result).toBe('invalid+3');
    });

    it('should handle empty string', () => {
      const result = getCriticalDamageNotation('', 2, true);
      expect(result).toBe('+2');
    });
  });

  describe('D&D 5e Rule Compliance', () => {
    it('should follow D&D 5e rule: double dice, not modifier (1d8+2 -> 2d8+2, not 2d8+4)', () => {
      const result = getCriticalDamageNotation('1d8', 2, true);
      expect(result).toBe('2d8+2');
      expect(result).not.toBe('2d8+4'); // Modifier should NOT be doubled
    });

    it('should follow D&D 5e rule for larger weapons', () => {
      const result = getCriticalDamageNotation('1d12', 3, true);
      expect(result).toBe('2d12+3');
      // Average damage: normal = 9.5, critical = 16 (NOT 19)
    });

    it('should follow D&D 5e rule for versatile weapons (2d6)', () => {
      const result = getCriticalDamageNotation('2d6', 4, true);
      expect(result).toBe('4d6+4');
      // Doubles the dice (2d6 -> 4d6) but not the modifier (+4 stays +4)
    });
  });
});

