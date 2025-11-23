/**
 * @fileOverview Unit tests for extractWeaponName function
 * Tests the weapon name extraction from player actions (Issue #121)
 */

import { describe, it, expect } from 'vitest';
import { extractWeaponName } from '@/lib/combat/turn-processor';

describe('extractWeaponName', () => {
  describe('Pattern: "con [weapon]"', () => {
    it('should extract weapon name from "con mi [weapon]"', () => {
      expect(extractWeaponName('Ataco con mi espada al goblin')).toBe('espada');
      expect(extractWeaponName('Ataco con mi arco')).toBe('arco');
      expect(extractWeaponName('Golpeo con mi daga')).toBe('daga');
    });

    it('should extract weapon name from "con el [weapon]"', () => {
      expect(extractWeaponName('Ataco con el bastón')).toBe('bastón');
      expect(extractWeaponName('Golpeo con el hacha')).toBe('hacha');
    });

    it('should extract weapon name from "con la [weapon]"', () => {
      expect(extractWeaponName('Ataco con la espada')).toBe('espada');
      expect(extractWeaponName('Golpeo con la maza')).toBe('maza');
    });

    it('should extract weapon name from "con [weapon]" (without article)', () => {
      expect(extractWeaponName('Ataco con espada')).toBe('espada');
      expect(extractWeaponName('Disparo con arco')).toBe('arco');
    });

    it('should extract weapon name from "con un/una [weapon]"', () => {
      expect(extractWeaponName('Ataco con un cuchillo')).toBe('cuchillo');
      expect(extractWeaponName('Golpeo con una maza')).toBe('maza');
    });
  });

  describe('Pattern: "usando [weapon]"', () => {
    it('should extract weapon name from "usando mi [weapon]"', () => {
      expect(extractWeaponName('Usando mi espada ataco al goblin')).toBe('espada');
      expect(extractWeaponName('Disparo usando mi arco')).toBe('arco');
    });

    it('should extract weapon name from "usando el/la [weapon]"', () => {
      expect(extractWeaponName('Ataco usando el bastón')).toBe('bastón');
      expect(extractWeaponName('Golpeo usando la daga')).toBe('daga');
    });

    it('should extract weapon name from "usando [weapon]" (without article)', () => {
      expect(extractWeaponName('Ataco usando espada')).toBe('espada');
    });
  });

  describe('Pattern: "mi [weapon]"', () => {
    it('should extract weapon name from "mi [weapon]"', () => {
      expect(extractWeaponName('Mi espada contra el goblin')).toBe('espada');
      expect(extractWeaponName('Disparo mi arco')).toBe('arco');
      expect(extractWeaponName('Mi daga contra el enemigo')).toBe('daga');
    });

    it('should extract weapon name from "mi [weapon]" at different positions', () => {
      expect(extractWeaponName('Ataco con mi espada')).toBe('espada'); // Should match "con mi" first
      expect(extractWeaponName('Mi arco es mi arma favorita')).toBe('arco');
    });
  });

  describe('Pattern: "el/la [weapon]"', () => {
    it('should extract weapon name from "el [weapon]"', () => {
      expect(extractWeaponName('Ataco con el bastón')).toBe('bastón');
      expect(extractWeaponName('El hacha es poderosa')).toBe('hacha');
    });

    it('should extract weapon name from "la [weapon]"', () => {
      expect(extractWeaponName('Ataco con la espada')).toBe('espada');
      expect(extractWeaponName('La daga es afilada')).toBe('daga');
    });
  });

  describe('No weapon mentioned (should return null)', () => {
    it('should return null for generic attacks', () => {
      expect(extractWeaponName('Ataco al goblin 1')).toBeNull();
      expect(extractWeaponName('Ataco')).toBeNull();
      expect(extractWeaponName('Golpeo al enemigo')).toBeNull();
      expect(extractWeaponName('Disparo')).toBeNull();
    });

    it('should return null for empty or whitespace strings', () => {
      expect(extractWeaponName('')).toBeNull();
      expect(extractWeaponName('   ')).toBeNull();
    });

    it('should return null for actions without weapon patterns', () => {
      expect(extractWeaponName('Me muevo')).toBeNull();
      expect(extractWeaponName('Lanzo un hechizo')).toBeNull();
      expect(extractWeaponName('Uso una habilidad')).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle case insensitivity', () => {
      expect(extractWeaponName('ATACO CON MI ESPADA')).toBe('espada');
      expect(extractWeaponName('Ataco Con Mi Arco')).toBe('arco');
      expect(extractWeaponName('mi DAGA')).toBe('daga');
    });

    it('should extract first weapon mentioned when multiple patterns match', () => {
      // "con mi" pattern should match first
      expect(extractWeaponName('Ataco con mi espada y luego con mi daga')).toBe('espada');
    });

    it('should handle weapon names with multiple words (limited by \\w+)', () => {
      // Note: Current regex uses \w+ which matches single words
      // "espada larga" would only match "espada"
      expect(extractWeaponName('Ataco con mi espada larga')).toBe('espada');
    });

    it('should handle null/undefined input gracefully', () => {
      expect(extractWeaponName(null as any)).toBeNull();
      expect(extractWeaponName(undefined as any)).toBeNull();
    });
  });

  describe('Real-world examples from plan', () => {
    it('should handle "Ataco al goblin 1" → null (generic attack)', () => {
      expect(extractWeaponName('Ataco al goblin 1')).toBeNull();
    });

    it('should handle "Ataco con mi espada al goblin" → "espada"', () => {
      expect(extractWeaponName('Ataco con mi espada al goblin')).toBe('espada');
    });

    it('should handle "Usando mi arco disparo al goblin" → "arco"', () => {
      expect(extractWeaponName('Usando mi arco disparo al goblin')).toBe('arco');
    });

    it('should handle "Mi daga contra el goblin" → "daga"', () => {
      expect(extractWeaponName('Mi daga contra el goblin')).toBe('daga');
    });

    it('should handle "Ataco con mi lanza" → "lanza"', () => {
      expect(extractWeaponName('Ataco con mi lanza')).toBe('lanza');
    });
  });
});

