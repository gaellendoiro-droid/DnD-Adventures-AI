/**
 * @fileOverview Unit tests for TurnProcessor
 * Tests the unified turn processor that works for both Player and AI combatants.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TurnProcessor, type TurnProcessorInput } from '@/lib/combat/turn-processor';
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

vi.mock('@/lib/combat/target-resolver', () => ({
  resolveEnemyId: vi.fn((targetId) => ({
    uniqueId: targetId,
    ambiguous: false,
    matches: [],
  })),
}));

vi.mock('@/lib/combat/rules-engine', () => ({
  getHpStatus: vi.fn(() => 'Healthy'),
  checkEndOfCombat: vi.fn(() => ({ combatEnded: false, reason: null })),
  applyDamage: vi.fn((target, damage) => ({
    newHP: Math.max(0, target.hp.current - damage),
    damageDealt: damage,
    isDead: target.hp.current - damage <= 0,
    isUnconscious: target.hp.current - damage <= 0,
    isMassiveDamage: false,
    previousHP: target.hp.current,
  })),
  validateAndClampHP: vi.fn((char) => char),
}));

describe('TurnProcessor', () => {
  const mockDiceRoller = vi.fn();
  const mockNarrationExpert = vi.fn();
  const mockTactician = vi.fn();
  const mockUpdateRollNotation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processTurn - Player Turn', () => {
    it('should process a player attack turn successfully', async () => {
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
          inventory: [{ name: 'Espada', description: '1d8 daño' }],
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

      // Mock narration expert
      mockNarrationExpert.mockResolvedValue({
        narration: 'Test Player golpea a Goblin 1 con su espada.',
      });

      const input: TurnProcessorInput = {
        combatant,
        interpretedAction: {
          actionType: 'attack',
          targetId: 'goblin-1',
        },
        playerAction: 'Ataco al goblin',
        party,
        enemies,
        initiativeOrder,
        dependencies: {
          narrationExpert: mockNarrationExpert,
          diceRollerTool: mockDiceRoller,
          updateRollNotationWithModifiers: mockUpdateRollNotation,
        },
      };

      const result = await TurnProcessor.processTurn(input);

      expect(result.success).toBe(true);
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.diceRolls).toHaveLength(2);
      expect(result.combatResult.attackHit).toBe(true);
      expect(result.combatResult.damageDealt).toBe(8);
      expect(mockNarrationExpert).toHaveBeenCalled();
    });

    it('should handle player attack without target (multiple enemies)', async () => {
      const combatant: Combatant = {
        id: 'player-1',
        characterName: 'Test Player',
        total: 15,
        type: 'player',
        controlledBy: 'Player',
      };

      const enemies = [
        { uniqueId: 'goblin-1', id: 'goblin-1', name: 'Goblin 1', hp: { current: 10, max: 10 }, ac: 15 },
        { uniqueId: 'goblin-2', id: 'goblin-2', name: 'Goblin 2', hp: { current: 10, max: 10 }, ac: 15 },
      ];

      const input: TurnProcessorInput = {
        combatant,
        interpretedAction: {
          actionType: 'attack',
          targetId: null,
        },
        playerAction: 'Ataco',
        party: [],
        enemies,
        initiativeOrder: [],
        dependencies: {
          narrationExpert: mockNarrationExpert,
          diceRollerTool: mockDiceRoller,
        },
      };

      const result = await TurnProcessor.processTurn(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('TARGET_REQUIRED');
      expect(result.messages[0].content).toContain('No has especificado un objetivo');
    });

    it('should handle invalid action type for player', async () => {
      const combatant: Combatant = {
        id: 'player-1',
        characterName: 'Test Player',
        total: 15,
        type: 'player',
        controlledBy: 'Player',
      };

      const input: TurnProcessorInput = {
        combatant,
        interpretedAction: {
          actionType: 'move',
          targetId: null,
        },
        playerAction: 'Me muevo',
        party: [],
        enemies: [],
        initiativeOrder: [],
        dependencies: {
          narrationExpert: mockNarrationExpert,
          diceRollerTool: mockDiceRoller,
        },
      };

      const result = await TurnProcessor.processTurn(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_ACTION');
    });

    describe('Weapon Parsing Integration (Issue #121)', () => {
      const baseCombatant: Combatant = {
        id: 'player-1',
        characterName: 'Test Player',
        total: 15,
        type: 'player',
        controlledBy: 'Player',
      };

      const baseParty: Character[] = [
        {
          id: 'player-1',
          name: 'Test Player',
          hp: { current: 20, max: 20 },
          ac: 16,
          abilityScores: { fuerza: 16, destreza: 14, constitución: 14, inteligencia: 10, sabiduría: 10, carisma: 12 },
          abilityModifiers: { fuerza: 3, destreza: 2, constitución: 2, inteligencia: 0, sabiduría: 0, carisma: 1 },
          skills: [],
          inventory: [
            { name: 'Espada', description: '1d8 daño' },
            { name: 'Arco', description: '1d6 daño' },
            { name: 'Daga', description: '1d4 daño' },
          ],
          spells: [],
          proficiencyBonus: 2,
          controlledBy: 'Player',
        } as Character,
      ];

      const baseEnemies = [
        {
          uniqueId: 'goblin-1',
          id: 'goblin-1',
          name: 'Goblin 1',
          hp: { current: 10, max: 10 },
          ac: 15,
        },
      ];

      const baseInitiativeOrder: Combatant[] = [baseCombatant];

      beforeEach(() => {
        vi.clearAllMocks();
      });

      it('should use default weapon (ataque) when no weapon is specified', async () => {
        // Mock dice roller
        mockDiceRoller
          .mockResolvedValueOnce({
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

        mockNarrationExpert.mockResolvedValue({
          narration: 'Test Player golpea a Goblin 1.',
        });

        const input: TurnProcessorInput = {
          combatant: baseCombatant,
          interpretedAction: {
            actionType: 'attack',
            targetId: 'goblin-1',
          },
          playerAction: 'Ataco al goblin 1', // No weapon specified
          party: baseParty,
          enemies: baseEnemies,
          initiativeOrder: baseInitiativeOrder,
          dependencies: {
            narrationExpert: mockNarrationExpert,
            diceRollerTool: mockDiceRoller,
            updateRollNotationWithModifiers: mockUpdateRollNotation,
          },
        };

        const result = await TurnProcessor.processTurn(input);

        expect(result.success).toBe(true);
        expect(result.diceRolls).toHaveLength(2);
        // Should use default weapon (Espada from inventory)
      });

      it('should extract and use weapon name from "con mi [weapon]" pattern', async () => {
        mockDiceRoller
          .mockResolvedValueOnce({
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

        mockNarrationExpert.mockResolvedValue({
          narration: 'Test Player golpea a Goblin 1 con su espada.',
        });

        const input: TurnProcessorInput = {
          combatant: baseCombatant,
          interpretedAction: {
            actionType: 'attack',
            targetId: 'goblin-1',
          },
          playerAction: 'Ataco con mi espada al goblin',
          party: baseParty,
          enemies: baseEnemies,
          initiativeOrder: baseInitiativeOrder,
          dependencies: {
            narrationExpert: mockNarrationExpert,
            diceRollerTool: mockDiceRoller,
            updateRollNotationWithModifiers: mockUpdateRollNotation,
          },
        };

        const result = await TurnProcessor.processTurn(input);

        expect(result.success).toBe(true);
        expect(result.diceRolls).toHaveLength(2);
      });

      it('should extract and use weapon name from "usando mi [weapon]" pattern', async () => {
        mockDiceRoller
          .mockResolvedValueOnce({
            id: 'roll-1',
            roller: 'Test Player',
            rollNotation: '1d20+4',
            individualRolls: [12],
            modifier: 4,
            totalResult: 16,
            outcome: 'success',
            timestamp: new Date(),
            description: 'Tirada de ataque',
          })
          .mockResolvedValueOnce({
            id: 'roll-2',
            roller: 'Test Player',
            rollNotation: '1d6+2',
            individualRolls: [4],
            modifier: 2,
            totalResult: 6,
            outcome: 'neutral',
            timestamp: new Date(),
            description: 'Tirada de daño',
          });

        mockNarrationExpert.mockResolvedValue({
          narration: 'Test Player dispara a Goblin 1 con su arco.',
        });

        const input: TurnProcessorInput = {
          combatant: baseCombatant,
          interpretedAction: {
            actionType: 'attack',
            targetId: 'goblin-1',
          },
          playerAction: 'Usando mi arco disparo al goblin',
          party: baseParty,
          enemies: baseEnemies,
          initiativeOrder: baseInitiativeOrder,
          dependencies: {
            narrationExpert: mockNarrationExpert,
            diceRollerTool: mockDiceRoller,
            updateRollNotationWithModifiers: mockUpdateRollNotation,
          },
        };

        const result = await TurnProcessor.processTurn(input);

        expect(result.success).toBe(true);
        expect(result.diceRolls).toHaveLength(2);
      });

      it('should extract and use weapon name from "mi [weapon]" pattern', async () => {
        mockDiceRoller
          .mockResolvedValueOnce({
            id: 'roll-1',
            roller: 'Test Player',
            rollNotation: '1d20+4',
            individualRolls: [11],
            modifier: 4,
            totalResult: 15,
            outcome: 'success',
            timestamp: new Date(),
            description: 'Tirada de ataque',
          })
          .mockResolvedValueOnce({
            id: 'roll-2',
            roller: 'Test Player',
            rollNotation: '1d4+2',
            individualRolls: [3],
            modifier: 2,
            totalResult: 5,
            outcome: 'neutral',
            timestamp: new Date(),
            description: 'Tirada de daño',
          });

        mockNarrationExpert.mockResolvedValue({
          narration: 'Test Player apuñala a Goblin 1 con su daga.',
        });

        const input: TurnProcessorInput = {
          combatant: baseCombatant,
          interpretedAction: {
            actionType: 'attack',
            targetId: 'goblin-1',
          },
          playerAction: 'Mi daga contra el goblin',
          party: baseParty,
          enemies: baseEnemies,
          initiativeOrder: baseInitiativeOrder,
          dependencies: {
            narrationExpert: mockNarrationExpert,
            diceRollerTool: mockDiceRoller,
            updateRollNotationWithModifiers: mockUpdateRollNotation,
          },
        };

        const result = await TurnProcessor.processTurn(input);

        expect(result.success).toBe(true);
        expect(result.diceRolls).toHaveLength(2);
      });

      it('should return error when weapon is not in inventory', async () => {
        const input: TurnProcessorInput = {
          combatant: baseCombatant,
          interpretedAction: {
            actionType: 'attack',
            targetId: 'goblin-1',
          },
          playerAction: 'Ataco con mi lanza', // Lanza not in inventory
          party: baseParty,
          enemies: baseEnemies,
          initiativeOrder: baseInitiativeOrder,
          dependencies: {
            narrationExpert: mockNarrationExpert,
            diceRollerTool: mockDiceRoller,
            updateRollNotationWithModifiers: mockUpdateRollNotation,
          },
        };

        const result = await TurnProcessor.processTurn(input);

        expect(result.success).toBe(false);
        expect(result.error).toBe('RESOLUTION_FAILED');
        expect(result.messages[0].content).toContain('No tienes el arma');
        expect(result.messages[0].content).toContain('lanza');
      });
    });
  });

  describe('processTurn - AI Turn', () => {
    it('should process an AI attack turn successfully', async () => {
      const combatant: Combatant = {
        id: 'goblin-1',
        characterName: 'Goblin 1',
        total: 12,
        type: 'npc',
        controlledBy: 'AI',
      };

      const party: Character[] = [
        {
          id: 'player-1',
          name: 'Test Player',
          hp: { current: 20, max: 20 },
          ac: 16,
          abilityScores: { fuerza: 10, destreza: 10, constitución: 10, inteligencia: 10, sabiduría: 10, carisma: 10 },
          abilityModifiers: { fuerza: 0, destreza: 0, constitución: 0, inteligencia: 0, sabiduría: 0, carisma: 0 },
          skills: [],
          inventory: [],
          spells: [],
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

      // Mock tactician
      mockTactician.mockResolvedValue({
        actionDescription: 'ataque con cimitarra',
        targetId: 'player-1',
        diceRolls: [
          {
            rollNotation: '1d20+4',
            description: 'Tirada de ataque',
            roller: 'Goblin 1',
          },
          {
            rollNotation: '1d6+2',
            description: 'Tirada de daño',
            roller: 'Goblin 1',
          },
        ],
      });

      // Mock dice roller
      mockDiceRoller
        .mockResolvedValueOnce({
          id: 'roll-1',
          roller: 'Goblin 1',
          rollNotation: '1d20+4',
          individualRolls: [12],
          modifier: 4,
          totalResult: 16,
          outcome: 'success',
          timestamp: new Date(),
          description: 'Tirada de ataque',
        })
        .mockResolvedValueOnce({
          id: 'roll-2',
          roller: 'Goblin 1',
          rollNotation: '1d6+2',
          individualRolls: [4],
          modifier: 2,
          totalResult: 6,
          outcome: 'neutral',
          timestamp: new Date(),
          description: 'Tirada de daño',
        });

      // Mock narration expert (intention and resolution)
      mockNarrationExpert
        .mockResolvedValueOnce({
          narration: 'Goblin 1 se prepara para atacar.',
        })
        .mockResolvedValueOnce({
          narration: 'Goblin 1 golpea a Test Player con su cimitarra.',
        });

      const input: TurnProcessorInput = {
        combatant,
        party,
        enemies,
        initiativeOrder,
        conversationHistory: [],
        dependencies: {
          tactician: mockTactician,
          narrationExpert: mockNarrationExpert,
          diceRollerTool: mockDiceRoller,
        },
      };

      const result = await TurnProcessor.processTurn(input);

      expect(result.success).toBe(true);
      expect(result.messages.length).toBeGreaterThanOrEqual(1); // At least resolution narration
      expect(result.diceRolls).toHaveLength(2);
      expect(result.combatResult.attackHit).toBe(true);
      expect(result.combatResult.damageDealt).toBe(6);
      expect(mockTactician).toHaveBeenCalled();
      expect(mockNarrationExpert).toHaveBeenCalled();
    });

    it('should handle AI turn with no action from tactician', async () => {
      const combatant: Combatant = {
        id: 'goblin-1',
        characterName: 'Goblin 1',
        total: 12,
        type: 'npc',
        controlledBy: 'AI',
      };

      // Mock tactician returns no action
      mockTactician.mockResolvedValue({
        actionDescription: '',
        targetId: null,
        diceRolls: [],
      });

      const input: TurnProcessorInput = {
        combatant,
        party: [],
        enemies: [],
        initiativeOrder: [],
        dependencies: {
          tactician: mockTactician,
          narrationExpert: mockNarrationExpert,
          diceRollerTool: mockDiceRoller,
        },
      };

      const result = await TurnProcessor.processTurn(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_ACTION');
    });
  });

  describe('processTurn - Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const combatant: Combatant = {
        id: 'player-1',
        characterName: 'Test Player',
        total: 15,
        type: 'player',
        controlledBy: 'Player',
      };

      // Mock dice roller to throw error
      mockDiceRoller.mockRejectedValue(new Error('Dice roller failed'));

      const input: TurnProcessorInput = {
        combatant,
        interpretedAction: {
          actionType: 'attack',
          targetId: 'goblin-1',
        },
        playerAction: 'Ataco',
        party: [],
        enemies: [{ uniqueId: 'goblin-1', id: 'goblin-1', name: 'Goblin 1', hp: { current: 10, max: 10 }, ac: 15 }],
        initiativeOrder: [],
        dependencies: {
          narrationExpert: mockNarrationExpert,
          diceRollerTool: mockDiceRoller,
        },
      };

      const result = await TurnProcessor.processTurn(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

