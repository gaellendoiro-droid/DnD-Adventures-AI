/**
 * Unit tests for target-resolver.ts
 * Tests target ID resolution logic
 */

import { describe, it, expect } from 'vitest';
import { resolveEnemyId } from '@/lib/combat/target-resolver';
import type { Combatant } from '@/lib/types';

describe('resolveEnemyId', () => {
  const mockInitiativeOrder: Combatant[] = [
    {
      id: 'goblin-1',
      characterName: 'Goblin 1',
      initiative: 15,
      isPlayer: false,
    },
    {
      id: 'goblin-2',
      characterName: 'Goblin 2',
      initiative: 12,
      isPlayer: false,
    },
    {
      id: 'player-1',
      characterName: 'Galador',
      initiative: 10,
      isPlayer: true,
    },
  ];

  const mockEnemies = [
    { uniqueId: 'goblin-1', name: 'Goblin' },
    { uniqueId: 'goblin-2', name: 'Goblin' },
  ];

  const mockParty = [
    { id: 'player-1', name: 'Galador', controlledBy: 'Player' },
  ];

  it('should return null for empty targetId', () => {
    const result = resolveEnemyId(null, mockEnemies, mockInitiativeOrder, mockParty);
    expect(result.uniqueId).toBe(null);
    expect(result.ambiguous).toBe(false);
    expect(result.matches).toEqual([]);
  });

  it('should resolve direct uniqueId match in enemies', () => {
    const result = resolveEnemyId('goblin-1', mockEnemies, mockInitiativeOrder, mockParty);
    expect(result.uniqueId).toBe('goblin-1');
    expect(result.ambiguous).toBe(false);
  });

  it('should resolve visual name to uniqueId', () => {
    const result = resolveEnemyId('Goblin 1', mockEnemies, mockInitiativeOrder, mockParty);
    expect(result.uniqueId).toBe('goblin-1');
    expect(result.ambiguous).toBe(false);
  });

  it('should resolve base name when only one match exists', () => {
    // Create scenario with only one goblin
    const singleEnemy = [{ uniqueId: 'goblin-1', name: 'Goblin' }];
    const singleInitiative: Combatant[] = [
      {
        id: 'goblin-1',
        characterName: 'Goblin 1',
        initiative: 15,
        isPlayer: false,
      },
    ];
    const result = resolveEnemyId('Goblin', singleEnemy, singleInitiative, mockParty);
    expect(result.uniqueId).toBe('goblin-1');
    expect(result.ambiguous).toBe(false);
  });

  it('should return ambiguous when multiple matches exist for base name', () => {
    const result = resolveEnemyId('Goblin', mockEnemies, mockInitiativeOrder, mockParty);
    expect(result.uniqueId).toBe(null);
    expect(result.ambiguous).toBe(true);
    expect(result.matches).toContain('Goblin 1');
    expect(result.matches).toContain('Goblin 2');
  });

  it('should handle accent-insensitive matching', () => {
    const enemiesWithAccent = [
      { uniqueId: 'manticora-1', name: 'Mantícora' },
    ];
    const initiativeWithAccent: Combatant[] = [
      {
        id: 'manticora-1',
        characterName: 'Mantícora 1',
        initiative: 15,
        isPlayer: false,
      },
    ];
    const result = resolveEnemyId('manticora', enemiesWithAccent, initiativeWithAccent, mockParty);
    expect(result.uniqueId).toBe('manticora-1');
    expect(result.ambiguous).toBe(false);
  });

  it('should handle case-insensitive matching', () => {
    const result = resolveEnemyId('goblin 1', mockEnemies, mockInitiativeOrder, mockParty);
    expect(result.uniqueId).toBe('goblin-1');
    expect(result.ambiguous).toBe(false);
  });

  it('should return null when no match is found', () => {
    const result = resolveEnemyId('Unknown Enemy', mockEnemies, mockInitiativeOrder, mockParty);
    expect(result.uniqueId).toBe(null);
    expect(result.ambiguous).toBe(false);
    expect(result.matches).toEqual([]);
  });

  it('should resolve uniqueId format to visual name', () => {
    const result = resolveEnemyId('goblin-1', mockEnemies, mockInitiativeOrder, mockParty);
    expect(result.uniqueId).toBe('goblin-1');
    expect(result.ambiguous).toBe(false);
  });
});

