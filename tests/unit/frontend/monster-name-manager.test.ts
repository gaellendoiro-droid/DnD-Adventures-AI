/**
 * Unit tests for monster-name-manager.ts
 * Tests name generation, normalization, and ordinal reference replacement
 */

import { describe, it, expect } from 'vitest';
import {
  generateDifferentiatedNames,
  normalizeNameForMatching,
  escapeRegex,
  getVisualName,
} from '@/lib/combat/monster-name-manager';
import type { Combatant } from '@/lib/types';

describe('generateDifferentiatedNames', () => {
  it('should generate numbered names for single enemy', () => {
    const enemies = [
      { uniqueId: 'goblin-1', name: 'Goblin' },
    ];
    const result = generateDifferentiatedNames(enemies);
    expect(result.get('goblin-1')).toBe('Goblin 1');
  });

  it('should generate numbered names for multiple enemies of same type', () => {
    const enemies = [
      { uniqueId: 'goblin-1', name: 'Goblin' },
      { uniqueId: 'goblin-2', name: 'Goblin' },
      { uniqueId: 'goblin-3', name: 'Goblin' },
    ];
    const result = generateDifferentiatedNames(enemies);
    expect(result.get('goblin-1')).toBe('Goblin 1');
    expect(result.get('goblin-2')).toBe('Goblin 2');
    expect(result.get('goblin-3')).toBe('Goblin 3');
  });

  it('should generate names for different enemy types', () => {
    const enemies = [
      { uniqueId: 'goblin-1', name: 'Goblin' },
      { uniqueId: 'orc-1', name: 'Orc' },
    ];
    const result = generateDifferentiatedNames(enemies);
    expect(result.get('goblin-1')).toBe('Goblin 1');
    expect(result.get('orc-1')).toBe('Orc 1');
  });

  it('should handle enemies without name property (extract from uniqueId)', () => {
    const enemies = [
      { uniqueId: 'goblin-1', id: 'goblin-1' },
    ];
    const result = generateDifferentiatedNames(enemies);
    // When id is provided, it extracts base name from id (goblin-1 -> goblin)
    expect(result.get('goblin-1')).toBe('goblin 1');
  });

  it('should handle case-insensitive grouping', () => {
    const enemies = [
      { uniqueId: 'goblin-1', name: 'Goblin' },
      { uniqueId: 'goblin-2', name: 'goblin' },
    ];
    const result = generateDifferentiatedNames(enemies);
    expect(result.get('goblin-1')).toBe('Goblin 1');
    expect(result.get('goblin-2')).toBe('Goblin 2');
  });

  it('should sort by uniqueId index for consistent ordering', () => {
    const enemies = [
      { uniqueId: 'goblin-3', name: 'Goblin' },
      { uniqueId: 'goblin-1', name: 'Goblin' },
      { uniqueId: 'goblin-2', name: 'Goblin' },
    ];
    const result = generateDifferentiatedNames(enemies);
    expect(result.get('goblin-1')).toBe('Goblin 1');
    expect(result.get('goblin-2')).toBe('Goblin 2');
    expect(result.get('goblin-3')).toBe('Goblin 3');
  });
});

describe('normalizeNameForMatching', () => {
  it('should convert to lowercase', () => {
    expect(normalizeNameForMatching('GOBLIN')).toBe('goblin');
  });

  it('should remove accents', () => {
    expect(normalizeNameForMatching('Mantícora')).toBe('manticora');
    expect(normalizeNameForMatching('Góblin')).toBe('goblin');
  });

  it('should trim whitespace', () => {
    expect(normalizeNameForMatching('  Goblin  ')).toBe('goblin');
  });

  it('should handle names with numbers', () => {
    expect(normalizeNameForMatching('Goblin 1')).toBe('goblin 1');
  });

  it('should handle empty strings', () => {
    expect(normalizeNameForMatching('')).toBe('');
  });
});

describe('escapeRegex', () => {
  it('should escape special regex characters', () => {
    expect(escapeRegex('goblin.1')).toBe('goblin\\.1');
    expect(escapeRegex('goblin*1')).toBe('goblin\\*1');
    expect(escapeRegex('goblin+1')).toBe('goblin\\+1');
    expect(escapeRegex('goblin?1')).toBe('goblin\\?1');
    expect(escapeRegex('goblin^1')).toBe('goblin\\^1');
    expect(escapeRegex('goblin$1')).toBe('goblin\\$1');
    expect(escapeRegex('goblin(1)')).toBe('goblin\\(1\\)');
    expect(escapeRegex('goblin[1]')).toBe('goblin\\[1\\]');
  });

  it('should not escape regular characters', () => {
    expect(escapeRegex('goblin1')).toBe('goblin1');
  });
});

describe('getVisualName', () => {
  it('should return characterName from initiativeOrder if found', () => {
    const initiativeOrder: Combatant[] = [
      {
        id: 'goblin-1',
        characterName: 'Goblin 1',
        initiative: 15,
        isPlayer: false,
      },
    ];
    const enemies: any[] = [];
    expect(getVisualName('goblin-1', initiativeOrder, enemies)).toBe('Goblin 1');
  });

  it('should fallback to generated name from enemies if not in initiativeOrder', () => {
    const initiativeOrder: Combatant[] = [];
    const enemies = [
      { uniqueId: 'goblin-1', name: 'Goblin' },
    ];
    expect(getVisualName('goblin-1', initiativeOrder, enemies)).toBe('Goblin 1');
  });

  it('should fallback to enemy name if no differentiated name available', () => {
    const initiativeOrder: Combatant[] = [];
    const enemies = [
      { uniqueId: 'goblin-1', name: 'Goblin' },
    ];
    // This will use the enemy name directly
    expect(getVisualName('goblin-1', initiativeOrder, enemies)).toBe('Goblin 1');
  });

  it('should return combatantId if not found anywhere', () => {
    const initiativeOrder: Combatant[] = [];
    const enemies: any[] = [];
    expect(getVisualName('unknown-id', initiativeOrder, enemies)).toBe('unknown-id');
  });
});

