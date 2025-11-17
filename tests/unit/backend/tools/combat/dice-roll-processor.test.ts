/**
 * Unit tests for dice-roll-processor.ts
 * Tests the correct message ordering for massive damage deaths (Issue #66)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  processAICombatantRolls,
  getCriticalDamageNotation,
  type ProcessAICombatantRollsParams,
} from '@/ai/tools/combat/dice-roll-processor';
import type { Combatant } from '@/lib/types';

describe('getCriticalDamageNotation', () => {
  it('should double dice for critical hits without changing modifier', () => {
    expect(getCriticalDamageNotation('1d8+3', true)).toBe('2d8+3');
    expect(getCriticalDamageNotation('2d6+2', true)).toBe('4d6+2');
    expect(getCriticalDamageNotation('1d10+0', true)).toBe('2d10+0');
  });

  it('should return original notation for non-critical hits', () => {
    expect(getCriticalDamageNotation('1d8+3', false)).toBe('1d8+3');
    expect(getCriticalDamageNotation('2d6+2', false)).toBe('2d6+2');
  });

  it('should handle notation without explicit modifier', () => {
    expect(getCriticalDamageNotation('1d8', true)).toBe('2d8');
  });

  it('should handle negative modifiers', () => {
    expect(getCriticalDamageNotation('1d6-1', true)).toBe('2d6-1');
  });
});

describe('processAICombatantRolls - Issue #66: Massive damage message ordering', () => {
  it('should display messages in correct order for massive damage death', async () => {
    // Setup: Create a character with low HP (2/20) and an attacker that will deal massive damage
    const attacker: Combatant = {
      id: 'goblin-1',
      characterName: 'Goblin 1',
      initiative: 15,
      isPlayer: false,
    };

    const victim = {
      id: 1,
      name: 'Merryl',
      hp: { current: 2, max: 20 }, // Low HP - needs 22+ damage for massive death
      isDead: false,
      controlledBy: 'AI',
    };

    const party = [victim];
    const enemies: any[] = [];

    const initiativeOrder: Combatant[] = [attacker];

    // Mock dice roller to return controlled results
    const mockDiceRoller = vi.fn().mockImplementation(async (input: any) => {
      const notation = input.rollNotation;
      const roller = input.roller;
      const description = input.description;
      
      // Attack roll: successful hit (18 total)
      if (notation === '1d20+4') {
        return {
          roller,
          rollNotation: notation,
          individualRolls: [14],
          modifier: 4,
          totalResult: 18,
          outcome: 'success' as const,
          description,
        };
      }
      
      // Damage roll: 25 damage (enough for massive damage: 25 - 2 = 23 remaining, >= 20 max HP)
      if (notation === '1d8+3') {
        return {
          roller,
          rollNotation: notation,
          individualRolls: [22],
          modifier: 3,
          totalResult: 25,
          outcome: 'neutral' as const,
          description,
        };
      }

      // Default fallback
      return {
        roller,
        rollNotation: notation,
        individualRolls: [1],
        modifier: 0,
        totalResult: 1,
        outcome: 'neutral' as const,
        description,
      };
    });

    const localLog = vi.fn();

    const params: ProcessAICombatantRollsParams = {
      activeCombatant: attacker,
      requestedRolls: [
        {
          rollNotation: '1d20+4',
          description: 'Attack roll',
          targetAC: 10,
        },
        {
          rollNotation: '1d8+3',
          description: 'Damage roll',
        },
      ],
      target: victim,
      updatedParty: party,
      updatedEnemies: enemies,
      newInitiativeOrder: initiativeOrder,
      localLog,
      diceRoller: mockDiceRoller as any,
    };

    // Execute
    const result = await processAICombatantRolls(params);

    // Verify: Check that messages appear in the correct order
    expect(result.messages.length).toBeGreaterThanOrEqual(3);

    // Find the relevant messages
    const damageMessageIndex = result.messages.findIndex(
      (m) => m.content.includes('ha hecho') && m.content.includes('puntos de daño')
    );
    const massiveDamageMessageIndex = result.messages.findIndex(
      (m) => m.content.includes('golpe devastador') && m.content.includes('muere instantáneamente')
    );
    const killedMessageIndex = result.messages.findIndex(
      (m) => m.content.includes('ha matado')
    );

    // All three messages should exist
    expect(damageMessageIndex).toBeGreaterThanOrEqual(0);
    expect(massiveDamageMessageIndex).toBeGreaterThanOrEqual(0);
    expect(killedMessageIndex).toBeGreaterThanOrEqual(0);

    // Verify correct ordering (Issue #66 fix)
    // Expected order: damage message -> massive damage message -> killed message
    expect(damageMessageIndex).toBeLessThan(massiveDamageMessageIndex);
    expect(massiveDamageMessageIndex).toBeLessThan(killedMessageIndex);

    // Verify victim is dead
    const updatedVictim = result.updatedParty.find((p) => p.id === victim.id);
    expect(updatedVictim?.hp.current).toBe(0);
    expect(updatedVictim?.isDead).toBe(true);
  });

  it('should not show massive damage message for regular death (HP reaches 0 without massive damage)', async () => {
    // Setup: Character with 10 HP, takes 10 damage (not massive)
    const attacker: Combatant = {
      id: 'goblin-1',
      characterName: 'Goblin 1',
      initiative: 15,
      isPlayer: false,
    };

    const victim = {
      id: 1,
      name: 'Merryl',
      hp: { current: 10, max: 20 },
      isDead: false,
      controlledBy: 'AI',
    };

    const party = [victim];
    const enemies: any[] = [];
    const initiativeOrder: Combatant[] = [attacker];

    const mockDiceRoller = vi.fn().mockImplementation(async (input: any) => {
      const notation = input.rollNotation;
      const roller = input.roller;
      const description = input.description;
      
      // Attack roll: successful hit
      if (notation === '1d20+4') {
        return {
          roller,
          rollNotation: notation,
          individualRolls: [14],
          modifier: 4,
          totalResult: 18,
          outcome: 'success' as const,
          description,
        };
      }
      
      // 10 damage: brings to 0 HP, but remaining damage (0) < max HP (20), so NOT massive death
      if (notation === '1d8+3') {
        return {
          roller,
          rollNotation: notation,
          individualRolls: [7],
          modifier: 3,
          totalResult: 10,
          outcome: 'neutral' as const,
          description,
        };
      }

      // Default fallback
      return {
        roller,
        rollNotation: notation,
        individualRolls: [1],
        modifier: 0,
        totalResult: 1,
        outcome: 'neutral' as const,
        description,
      };
    });

    const localLog = vi.fn();

    const params: ProcessAICombatantRollsParams = {
      activeCombatant: attacker,
      requestedRolls: [
        {
          rollNotation: '1d20+4',
          description: 'Attack roll',
          targetAC: 10,
        },
        {
          rollNotation: '1d8+3',
          description: 'Damage roll',
        },
      ],
      target: victim,
      updatedParty: party,
      updatedEnemies: enemies,
      newInitiativeOrder: initiativeOrder,
      localLog,
      diceRoller: mockDiceRoller as any,
    };

    const result = await processAICombatantRolls(params);

    // Should NOT have massive damage message
    const massiveDamageMessage = result.messages.find(
      (m) => m.content.includes('golpe devastador')
    );
    expect(massiveDamageMessage).toBeUndefined();

    // Should have unconscious message instead (not death)
    const unconsciousMessage = result.messages.find(
      (m) => m.content.includes('inconsciente')
    );
    expect(unconsciousMessage).toBeDefined();

    // Victim should be unconscious, not dead
    const updatedVictim = result.updatedParty.find((p) => p.id === victim.id);
    expect(updatedVictim?.hp.current).toBe(0);
    expect(updatedVictim?.isDead).toBe(false);
  });
});

