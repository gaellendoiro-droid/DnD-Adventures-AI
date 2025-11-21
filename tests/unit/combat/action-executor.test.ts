/**
 * @fileOverview Unit tests for CombatActionExecutor
 * Tests the unified action executor that works for both Player and AI combatants.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatActionExecutor, type CombatActionInput, type DiceRollRequest } from '@/lib/combat/action-executor';
import type { Character, Combatant } from '@/lib/types';

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/combat/monster-name-manager', () => ({
  getVisualName: vi.fn((id) => id),
}));

describe('CombatActionExecutor', () => {
  const mockDiceRoller = vi.fn();
  const mockUpdateRollNotation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execute - Attack Action', () => {
    it('should execute a successful attack (hit)', async () => {
      const combatant: Combatant = {
        id: 'player-1',
        characterName: 'Test Player',
        total: 15,
        type: 'player',
        controlledBy: 'Player',
      };

      const party: Character[] = [
        {
          id: 'player-1',
          name: 'Test Player',
          hp: { current: 20, max: 20 },
          ac: 16,
          abilityScores: { fuerza: 16, destreza: 14, constitución: 14, inteligencia: 10, sabiduría: 10, carisma: 12 },
          abilityModifiers: { fuerza: 3, destreza: 2, constitución: 2, inteligencia: 0, sabiduría: 0, carisma: 1 },
          skills: [],
          inventory: [],
          spells: [],
          proficiencyBonus: 2,
          controlledBy: 'Player',
        } as Character,
      ];

      const enemies = [
        {
          uniqueId: 'goblin-1',
          id: 'goblin-1',
          name: 'Goblin 1',
          hp: { current: 10, max: 10 },
          ac: 15,
        },
      ];

      const initiativeOrder: Combatant[] = [combatant];

      // Mock dice roller
      mockDiceRoller
        .mockResolvedValueOnce({
          // Attack roll: 18 (hits AC 15)
          id: 'roll-1',
          roller: 'Test Player',
          rollNotation: '1d20+5',
          individualRolls: [13],
          modifier: 5,
          totalResult: 18,
          outcome: 'success',
          timestamp: new Date(),
          description: 'Tirada de ataque',
        })
        .mockResolvedValueOnce({
          // Damage roll: 8 damage
          id: 'roll-2',
          roller: 'Test Player',
          rollNotation: '1d8+3',
          individualRolls: [5],
          modifier: 3,
          totalResult: 8,
          outcome: 'neutral',
          timestamp: new Date(),
          description: 'Tirada de daño',
        });

      const input: CombatActionInput = {
        combatant,
        action: {
          type: 'attack',
          targetId: 'goblin-1',
          diceRollRequests: [
            {
              rollNotation: '1d20+5',
              description: 'Tirada de ataque',
              roller: 'Test Player',
            },
            {
              rollNotation: '1d8+3',
              description: 'Tirada de daño',
              roller: 'Test Player',
            },
          ],
          actionDescription: 'ataque',
        },
        party,
        enemies,
        initiativeOrder,
        diceRollerTool: mockDiceRoller,
        updateRollNotationWithModifiers: mockUpdateRollNotation,
      };

      const result = await CombatActionExecutor.execute(input);

      expect(result.success).toBe(true);
      expect(result.diceRolls).toHaveLength(2);
      expect(result.combatResult.attackHit).toBe(true);
      expect(result.combatResult.damageDealt).toBe(8);
      expect(result.updatedEnemies[0].hp.current).toBe(2); // 10 - 8 = 2
      expect(result.combatResult.targetKilled).toBe(false);
    });

    it('should execute a missed attack', async () => {
      const combatant: Combatant = {
        id: 'player-1',
        characterName: 'Test Player',
        total: 15,
        type: 'player',
        controlledBy: 'Player',
      };

      const party: Character[] = [
        {
          id: 'player-1',
          name: 'Test Player',
          hp: { current: 20, max: 20 },
          ac: 16,
          abilityScores: { fuerza: 16, destreza: 14, constitución: 14, inteligencia: 10, sabiduría: 10, carisma: 12 },
          abilityModifiers: { fuerza: 3, destreza: 2, constitución: 2, inteligencia: 0, sabiduría: 0, carisma: 1 },
          skills: [],
          inventory: [],
          spells: [],
          proficiencyBonus: 2,
          controlledBy: 'Player',
        } as Character,
      ];

      const enemies = [
        {
          uniqueId: 'goblin-1',
          id: 'goblin-1',
          name: 'Goblin 1',
          hp: { current: 10, max: 10 },
          ac: 15,
        },
      ];

      const initiativeOrder: Combatant[] = [combatant];

      // Mock dice roller - attack misses
      mockDiceRoller.mockResolvedValueOnce({
        id: 'roll-1',
        roller: 'Test Player',
        rollNotation: '1d20+5',
        individualRolls: [8],
        modifier: 5,
        totalResult: 13, // Misses AC 15
        outcome: 'fail',
        timestamp: new Date(),
        description: 'Tirada de ataque',
      });

      const input: CombatActionInput = {
        combatant,
        action: {
          type: 'attack',
          targetId: 'goblin-1',
          diceRollRequests: [
            {
              rollNotation: '1d20+5',
              description: 'Tirada de ataque',
              roller: 'Test Player',
            },
            {
              rollNotation: '1d8+3',
              description: 'Tirada de daño',
              roller: 'Test Player',
            },
          ],
          actionDescription: 'ataque',
        },
        party,
        enemies,
        initiativeOrder,
        diceRollerTool: mockDiceRoller,
        updateRollNotationWithModifiers: mockUpdateRollNotation,
      };

      const result = await CombatActionExecutor.execute(input);

      expect(result.success).toBe(true);
      expect(result.diceRolls).toHaveLength(1); // Only attack roll, no damage
      expect(result.combatResult.attackHit).toBe(false);
      expect(result.combatResult.damageDealt).toBeUndefined();
      expect(result.updatedEnemies[0].hp.current).toBe(10); // No damage
    });

    it('should execute a critical hit', async () => {
      const combatant: Combatant = {
        id: 'player-1',
        characterName: 'Test Player',
        total: 15,
        type: 'player',
        controlledBy: 'Player',
      };

      const party: Character[] = [
        {
          id: 'player-1',
          name: 'Test Player',
          hp: { current: 20, max: 20 },
          ac: 16,
          abilityScores: { fuerza: 16, destreza: 14, constitución: 14, inteligencia: 10, sabiduría: 10, carisma: 12 },
          abilityModifiers: { fuerza: 3, destreza: 2, constitución: 2, inteligencia: 0, sabiduría: 0, carisma: 1 },
          skills: [],
          inventory: [],
          spells: [],
          proficiencyBonus: 2,
          controlledBy: 'Player',
        } as Character,
      ];

      const enemies = [
        {
          uniqueId: 'goblin-1',
          id: 'goblin-1',
          name: 'Goblin 1',
          hp: { current: 10, max: 10 },
          ac: 15,
        },
      ];

      const initiativeOrder: Combatant[] = [combatant];

      // Mock dice roller - critical hit
      mockDiceRoller
        .mockResolvedValueOnce({
          id: 'roll-1',
          roller: 'Test Player',
          rollNotation: '1d20+5',
          individualRolls: [20],
          modifier: 5,
          totalResult: 25,
          outcome: 'crit',
          timestamp: new Date(),
          description: 'Tirada de ataque',
        })
        .mockResolvedValueOnce({
          id: 'roll-2',
          roller: 'Test Player',
          rollNotation: '2d8+3', // Critical doubles dice
          individualRolls: [6, 5],
          modifier: 3,
          totalResult: 14,
          outcome: 'crit',
          timestamp: new Date(),
          description: 'Tirada de daño (crítico)',
        });

      const input: CombatActionInput = {
        combatant,
        action: {
          type: 'attack',
          targetId: 'goblin-1',
          diceRollRequests: [
            {
              rollNotation: '1d20+5',
              description: 'Tirada de ataque',
              roller: 'Test Player',
            },
            {
              rollNotation: '2d8+3',
              description: 'Tirada de daño',
              roller: 'Test Player',
            },
          ],
          actionDescription: 'ataque',
        },
        party,
        enemies,
        initiativeOrder,
        diceRollerTool: mockDiceRoller,
        updateRollNotationWithModifiers: mockUpdateRollNotation,
      };

      const result = await CombatActionExecutor.execute(input);

      expect(result.success).toBe(true);
      expect(result.diceRolls).toHaveLength(2);
      expect(result.combatResult.attackHit).toBe(true);
      expect(result.combatResult.wasCritical).toBe(true);
      expect(result.combatResult.damageDealt).toBe(14);
      expect(result.updatedEnemies[0].hp.current).toBe(0); // 10 - 14 = 0 (dead)
      expect(result.combatResult.targetKilled).toBe(true);
    });

    it('should handle target not found', async () => {
      const combatant: Combatant = {
        id: 'player-1',
        characterName: 'Test Player',
        total: 15,
        type: 'player',
        controlledBy: 'Player',
      };

      const input: CombatActionInput = {
        combatant,
        action: {
          type: 'attack',
          targetId: 'nonexistent',
          diceRollRequests: [],
          actionDescription: 'ataque',
        },
        party: [],
        enemies: [],
        initiativeOrder: [],
        diceRollerTool: mockDiceRoller,
      };

      const result = await CombatActionExecutor.execute(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('TARGET_NOT_FOUND');
    });
  });

  describe('execute - Healing Action', () => {
    it('should execute a healing action', async () => {
      const combatant: Combatant = {
        id: 'player-1',
        characterName: 'Test Player',
        total: 15,
        type: 'player',
        controlledBy: 'Player',
      };

      const party: Character[] = [
        {
          id: 'player-1',
          name: 'Test Player',
          hp: { current: 5, max: 20 },
          ac: 16,
          abilityScores: { fuerza: 10, destreza: 10, constitución: 10, inteligencia: 10, sabiduría: 10, carisma: 10 },
          abilityModifiers: { fuerza: 0, destreza: 0, constitución: 0, inteligencia: 0, sabiduría: 0, carisma: 0 },
          skills: [],
          inventory: [],
          spells: [],
          controlledBy: 'Player',
        } as Character,
      ];

      const initiativeOrder: Combatant[] = [combatant];

      // Mock dice roller - healing roll
      mockDiceRoller.mockResolvedValueOnce({
        id: 'roll-1',
        roller: 'Test Player',
        rollNotation: '1d8+2',
        individualRolls: [6],
        modifier: 2,
        totalResult: 8,
        outcome: 'neutral',
        timestamp: new Date(),
        description: 'Tirada de curación',
      });

      const input: CombatActionInput = {
        combatant,
        action: {
          type: 'heal',
          targetId: 'player-1',
          diceRollRequests: [
            {
              rollNotation: '1d8+2',
              description: 'Tirada de curación',
              roller: 'Test Player',
            },
          ],
          actionDescription: 'curación',
        },
        party,
        enemies: [],
        initiativeOrder,
        diceRollerTool: mockDiceRoller,
      };

      const result = await CombatActionExecutor.execute(input);

      expect(result.success).toBe(true);
      expect(result.diceRolls).toHaveLength(1);
      expect(result.combatResult.healingAmount).toBe(8);
      expect(result.updatedParty[0].hp.current).toBe(13); // 5 + 8 = 13
    });
  });
});

