/**
 * @fileOverview Unit tests for CombatSession
 * 
 * Tests the basic structure and factory methods of CombatSession.
 * More comprehensive tests will be added in later phases.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CombatSession, type CombatManagerInput } from '@/lib/combat/combat-session';
import type { Character, Combatant } from '@/lib/types';
import { CombatTurnManager } from '@/lib/combat/turn-manager';
import { checkEndOfCombat } from '@/lib/combat/rules-engine';
import { CombatInitializer } from '@/lib/combat/combat-initializer';
// Mock the modules
vi.mock('@/lib/combat/turn-manager');
vi.mock('@/lib/combat/rules-engine');
vi.mock('@/lib/combat/combat-initializer');
vi.mock('@/ai/flows/narrative-manager', () => ({
  narrativeExpert: vi.fn(),
}));
vi.mock('@/ai/flows/markdown-to-html', () => ({
  markdownToHtml: vi.fn(),
}));

describe('CombatSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Factory Methods', () => {
    it('should create an empty session with createEmpty()', () => {
      const session = CombatSession.createEmpty();
      
      expect(session).toBeInstanceOf(CombatSession);
      expect(session.isActive()).toBe(false);
      expect(session.getTurnIndex()).toBe(0);
      expect(session.getParty()).toEqual([]);
      expect(session.getEnemies()).toEqual([]);
      expect(session.getInitiativeOrder()).toEqual([]);
      expect(session.getActiveCombatant()).toBeNull();
    });

    it('should create a session from input with fromInput()', () => {
      const mockInput: CombatManagerInput = {
        party: [
          {
            id: 'player-1',
            name: 'Test Player',
            hp: { current: 20, max: 20 },
            // Add minimal required fields
            abilityScores: {
              fuerza: 10,
              destreza: 10,
              constitución: 10,
              inteligencia: 10,
              sabiduría: 10,
              carisma: 10,
            },
            skills: [],
            inventory: [],
            spells: [],
            controlledBy: 'Player',
          } as Character,
        ],
        enemies: [],
        initiativeOrder: [
          {
            id: 'player-1',
            characterName: 'Test Player',
            total: 15,
            type: 'player',
            controlledBy: 'Player',
          } as Combatant,
        ],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test-location',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);

      expect(session).toBeInstanceOf(CombatSession);
      expect(session.isActive()).toBe(true);
      expect(session.getTurnIndex()).toBe(0);
      expect(session.getParty()).toHaveLength(1);
      expect(session.getEnemies()).toEqual([]);
      expect(session.getInitiativeOrder()).toHaveLength(1);
    });

    it('should handle missing optional fields in input', () => {
      const minimalInput: Partial<CombatManagerInput> = {
        party: [],
        inCombat: false,
        locationId: '',
      };

      const session = CombatSession.fromInput(minimalInput as CombatManagerInput);

      expect(session).toBeInstanceOf(CombatSession);
      expect(session.isActive()).toBe(false);
      expect(session.getParty()).toEqual([]);
      expect(session.getEnemies()).toEqual([]);
      expect(session.getInitiativeOrder()).toEqual([]);
      expect(session.getTurnIndex()).toBe(0);
    });
  });

  describe('Getters', () => {
    it('should return active combatant when combat is active', () => {
      const mockInput: CombatManagerInput = {
        party: [],
        enemies: [],
        initiativeOrder: [
          {
            id: 'combatant-1',
            characterName: 'Test Combatant',
            total: 15,
            type: 'player',
            controlledBy: 'Player',
          } as Combatant,
        ],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      const activeCombatant = session.getActiveCombatant();

      expect(activeCombatant).not.toBeNull();
      expect(activeCombatant?.characterName).toBe('Test Combatant');
    });

    it('should return null for active combatant when combat is not active', () => {
      const session = CombatSession.createEmpty();
      expect(session.getActiveCombatant()).toBeNull();
    });

    it('should clamp turnIndex to valid range when out of bounds', () => {
      const mockInput: CombatManagerInput = {
        party: [],
        enemies: [],
        initiativeOrder: [
          {
            id: 'combatant-1',
            characterName: 'Test Combatant',
            total: 15,
            type: 'player',
            controlledBy: 'Player',
          } as Combatant,
        ],
        turnIndex: 10, // Out of bounds - should be clamped to 0
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      // turnIndex should be clamped to 0 (valid range)
      expect(session.getTurnIndex()).toBe(0);
      expect(session.getActiveCombatant()).not.toBeNull();
      expect(session.getActiveCombatant()?.characterName).toBe('Test Combatant');
    });

    it('should return copies of arrays to prevent external mutation', () => {
      const session = CombatSession.createEmpty();
      
      const party = session.getParty();
      const enemies = session.getEnemies();
      const initiativeOrder = session.getInitiativeOrder();

      // Modify the returned arrays
      party.push({} as Character);
      enemies.push({});
      initiativeOrder.push({} as Combatant);

      // Original arrays should not be modified
      expect(session.getParty()).toEqual([]);
      expect(session.getEnemies()).toEqual([]);
      expect(session.getInitiativeOrder()).toEqual([]);
    });
  });

  describe('toJSON()', () => {
    it('should serialize session to CombatManagerOutput format', () => {
      // Mock checkEndOfCombat and hasMoreAITurns
      vi.mocked(checkEndOfCombat).mockReturnValue({ combatEnded: false, reason: null });
      vi.mocked(CombatTurnManager.hasMoreAITurns).mockReturnValue(false);

      const mockInput: CombatManagerInput = {
        party: [
          {
            id: 'player-1',
            name: 'Test Player',
            hp: { current: 20, max: 20 },
            abilityScores: {
              fuerza: 10,
              destreza: 10,
              constitución: 10,
              inteligencia: 10,
              sabiduría: 10,
              carisma: 10,
            },
            skills: [],
            inventory: [],
            spells: [],
            controlledBy: 'Player',
          } as Character,
        ],
        enemies: [],
        initiativeOrder: [
          {
            id: 'player-1',
            characterName: 'Test Player',
            total: 15,
            type: 'player',
            controlledBy: 'Player',
          } as Combatant,
        ],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test-location',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      const output = session.toJSON();

      expect(output).toHaveProperty('messages');
      expect(output).toHaveProperty('diceRolls');
      expect(output).toHaveProperty('updatedParty');
      expect(output).toHaveProperty('updatedEnemies');
      expect(output).toHaveProperty('inCombat');
      expect(output).toHaveProperty('initiativeOrder');
      expect(output).toHaveProperty('turnIndex');
      expect(output).toHaveProperty('hasMoreAITurns');
      expect(output).toHaveProperty('lastProcessedTurnWasAI');
      expect(output).toHaveProperty('lastProcessedTurnIndex');
      expect(output).toHaveProperty('playerActionCompleted');

      expect(output.inCombat).toBe(true);
      expect(output.turnIndex).toBe(0);
      expect(output.updatedParty).toHaveLength(1);
    });

    it('should not include debugLogs in output', () => {
      const session = CombatSession.createEmpty();
      const output = session.toJSON();

      expect(output).not.toHaveProperty('debugLogs');
    });
  });

  describe('advanceTurn()', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should advance turn index using CombatTurnManager', () => {
      const mockInput: CombatManagerInput = {
        party: [],
        enemies: [],
        initiativeOrder: [
          { id: '1', characterName: 'A', total: 15, type: 'player', controlledBy: 'Player' } as Combatant,
          { id: '2', characterName: 'B', total: 10, type: 'player', controlledBy: 'Player' } as Combatant,
        ],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      
      // Mock CombatTurnManager.nextTurnIndex
      vi.mocked(CombatTurnManager.nextTurnIndex).mockReturnValue(1);
      
      expect(session.getTurnIndex()).toBe(0);
      session.advanceTurn();
      expect(CombatTurnManager.nextTurnIndex).toHaveBeenCalledWith(0, 2);
      expect(session.getTurnIndex()).toBe(1);
    });

    it('should handle wrap-around correctly', () => {
      const mockInput: CombatManagerInput = {
        party: [],
        enemies: [],
        initiativeOrder: [
          { id: '1', characterName: 'A', total: 15, type: 'player', controlledBy: 'Player' } as Combatant,
          { id: '2', characterName: 'B', total: 10, type: 'player', controlledBy: 'Player' } as Combatant,
        ],
        turnIndex: 1,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      
      // Mock wrap-around
      vi.mocked(CombatTurnManager.nextTurnIndex).mockReturnValue(0);
      
      session.advanceTurn();
      expect(session.getTurnIndex()).toBe(0);
    });

    it('should not advance if initiative order is empty', () => {
      const session = CombatSession.createEmpty();
      const initialIndex = session.getTurnIndex();
      
      // Clear any previous calls
      vi.clearAllMocks();
      
      session.advanceTurn();
      expect(session.getTurnIndex()).toBe(initialIndex);
      // Should not call nextTurnIndex when order is empty (early return)
      expect(CombatTurnManager.nextTurnIndex).not.toHaveBeenCalled();
    });
  });

  describe('hasMoreAITurns()', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return false if combat is not active', () => {
      const session = CombatSession.createEmpty();
      expect(session.hasMoreAITurns()).toBe(false);
    });

    it('should return false if no active combatant', () => {
      const mockInput: CombatManagerInput = {
        party: [],
        enemies: [],
        initiativeOrder: [],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      expect(session.hasMoreAITurns()).toBe(false);
    });

    it('should use CombatTurnManager.hasMoreAITurns', () => {
      const mockInput: CombatManagerInput = {
        party: [
          {
            id: 'player-1',
            name: 'Player',
            hp: { current: 20, max: 20 },
            abilityScores: {
              fuerza: 10,
              destreza: 10,
              constitución: 10,
              inteligencia: 10,
              sabiduría: 10,
              carisma: 10,
            },
            skills: [],
            inventory: [],
            spells: [],
            controlledBy: 'Player',
          } as Character,
        ],
        enemies: [],
        initiativeOrder: [
          { id: 'player-1', characterName: 'Player', total: 15, type: 'player', controlledBy: 'Player' } as Combatant,
        ],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      
      // Mock checkEndOfCombat to return not ended
      vi.mocked(checkEndOfCombat).mockReturnValue({ combatEnded: false, reason: null });
      // Mock hasMoreAITurns to return false
      vi.mocked(CombatTurnManager.hasMoreAITurns).mockReturnValue(false);

      const result = session.hasMoreAITurns();
      
      expect(checkEndOfCombat).toHaveBeenCalledWith(session.getParty(), session.getEnemies());
      expect(CombatTurnManager.hasMoreAITurns).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false if combat has ended', () => {
      const mockInput: CombatManagerInput = {
        party: [],
        enemies: [],
        initiativeOrder: [
          { id: '1', characterName: 'A', total: 15, type: 'player', controlledBy: 'Player' } as Combatant,
        ],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      
      // Mock checkEndOfCombat to return ended
      vi.mocked(checkEndOfCombat).mockReturnValue({ combatEnded: true, reason: 'All enemies defeated' });

      expect(session.hasMoreAITurns()).toBe(false);
      expect(CombatTurnManager.hasMoreAITurns).not.toHaveBeenCalled();
    });
  });

  describe('checkEndOfCombat()', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return false if combat is not active', () => {
      const session = CombatSession.createEmpty();
      const result = session.checkEndOfCombat();
      
      expect(result.combatEnded).toBe(false);
      expect(checkEndOfCombat).not.toHaveBeenCalled();
    });

    it('should use rules-engine checkEndOfCombat', () => {
      const mockInput: CombatManagerInput = {
        party: [
          {
            id: 'player-1',
            name: 'Player',
            hp: { current: 20, max: 20 },
            abilityScores: {
              fuerza: 10,
              destreza: 10,
              constitución: 10,
              inteligencia: 10,
              sabiduría: 10,
              carisma: 10,
            },
            skills: [],
            inventory: [],
            spells: [],
            controlledBy: 'Player',
          } as Character,
        ],
        enemies: [
          { uniqueId: 'enemy-1', name: 'Goblin', hp: { current: 7, max: 7 } } as any,
        ],
        initiativeOrder: [
          { id: 'player-1', characterName: 'Player', total: 15, type: 'player', controlledBy: 'Player' } as Combatant,
        ],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      
      // Mock checkEndOfCombat to return not ended
      vi.mocked(checkEndOfCombat).mockReturnValue({ combatEnded: false, reason: null });

      const result = session.checkEndOfCombat();
      
      expect(checkEndOfCombat).toHaveBeenCalledWith(session.getParty(), session.getEnemies());
      expect(result.combatEnded).toBe(false);
    });

    it('should return reason when combat has ended', () => {
      const mockInput: CombatManagerInput = {
        party: [],
        enemies: [],
        initiativeOrder: [],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      
      // Mock checkEndOfCombat to return ended
      vi.mocked(checkEndOfCombat).mockReturnValue({ combatEnded: true, reason: 'All enemies defeated' });

      const result = session.checkEndOfCombat();
      
      expect(result.combatEnded).toBe(true);
      expect(result.reason).toBe('All enemies defeated');
    });
  });

  describe('initialize()', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should initialize combat with player going first', async () => {
      const session = CombatSession.createEmpty();
      const mockDeps = {
        diceRollerTool: vi.fn(),
        enemyTacticianTool: vi.fn(),
        companionTacticianTool: vi.fn(),
        combatNarrationExpertTool: vi.fn(),
        // Note: processAICombatantRolls is deprecated - kept for backward compatibility in tests
        processAICombatantRolls: undefined,
        updateRollNotationWithModifiers: vi.fn(),
      } as any;

      // Mock CombatInitializer to return success without firstTurnData
      const mockInitResult = {
        success: true,
        initiativeOrder: [
          { id: 'player-1', characterName: 'Player', total: 15, type: 'player', controlledBy: 'Player' } as Combatant,
        ],
        enemies: [],
        updatedParty: [
          {
            id: 'player-1',
            name: 'Player',
            hp: { current: 20, max: 20 },
            abilityScores: {
              fuerza: 10,
              destreza: 10,
              constitución: 10,
              inteligencia: 10,
              sabiduría: 10,
              carisma: 10,
            },
            skills: [],
            inventory: [],
            spells: [],
            controlledBy: 'Player',
          } as Character,
        ],
        messages: [{ sender: 'System', content: '¡Comienza el Combate!' }],
        diceRolls: [],
      };

      vi.spyOn(CombatInitializer, 'initializeCombat').mockResolvedValue(mockInitResult);

      await session.initialize(
        mockDeps,
        ['combatant-1'],
        { description: 'A dark forest' },
        [],
        'I attack the goblin',
        { actionType: 'attack' }
      );

      expect(session.isActive()).toBe(true);
      expect(session.getTurnIndex()).toBe(0);
      expect(session.getInitiativeOrder()).toHaveLength(1);
      expect(session.getParty()).toHaveLength(1);
      expect(session.getEnemies()).toEqual([]);
    });

    it('should initialize combat with AI going first', async () => {
      const session = CombatSession.createEmpty();
      const mockDeps = {
        diceRollerTool: vi.fn(),
        enemyTacticianTool: vi.fn(),
        companionTacticianTool: vi.fn(),
        combatNarrationExpertTool: vi.fn(),
        // Note: processAICombatantRolls is deprecated - kept for backward compatibility in tests
        processAICombatantRolls: undefined,
        updateRollNotationWithModifiers: vi.fn(),
      } as any;

      // Mock CombatInitializer to return success with firstTurnData
      const mockInitResult = {
        success: true,
        initiativeOrder: [
          { id: 'enemy-1', characterName: 'Goblin', total: 18, type: 'npc', controlledBy: 'AI' } as Combatant,
          { id: 'player-1', characterName: 'Player', total: 15, type: 'player', controlledBy: 'Player' } as Combatant,
        ],
        enemies: [{ uniqueId: 'enemy-1', name: 'Goblin', hp: { current: 7, max: 7 } }],
        updatedParty: [
          {
            id: 'player-1',
            name: 'Player',
            hp: { current: 20, max: 20 },
            abilityScores: {
              fuerza: 10,
              destreza: 10,
              constitución: 10,
              inteligencia: 10,
              sabiduría: 10,
              carisma: 10,
            },
            skills: [],
            inventory: [],
            spells: [],
            controlledBy: 'Player',
          } as Character,
        ],
        messages: [
          { sender: 'System', content: '¡Comienza el Combate!' },
          { sender: 'DM', content: 'Goblin attacks!' },
        ],
        diceRolls: [],
        firstTurnData: {
          turnIndex: 1, // Next turn is player
          activeCombatant: { id: 'player-1', characterName: 'Player', total: 15, type: 'player', controlledBy: 'Player' } as Combatant,
          hasMoreAITurns: false,
          lastProcessedTurnWasAI: true,
          lastProcessedTurnIndex: 0, // Goblin's turn was processed
          combatEnded: false,
        },
      };

      vi.spyOn(CombatInitializer, 'initializeCombat').mockResolvedValue(mockInitResult);

      await session.initialize(
        mockDeps,
        ['combatant-1'],
        { description: 'A dark forest' },
        [],
        'I attack the goblin',
        { actionType: 'attack' }
      );

      expect(session.isActive()).toBe(true);
      expect(session.getTurnIndex()).toBe(1); // Player's turn
      expect(session.getInitiativeOrder()).toHaveLength(2);
      expect(session.getEnemies()).toHaveLength(1);
      
      // Check that firstTurnData was applied
      const output = session.toJSON();
      expect(output.lastProcessedTurnWasAI).toBe(true);
      expect(output.lastProcessedTurnIndex).toBe(0);
    });

    it('should handle initialization failure gracefully', async () => {
      const session = CombatSession.createEmpty();
      const mockDeps = {
        diceRollerTool: vi.fn(),
        enemyTacticianTool: vi.fn(),
        companionTacticianTool: vi.fn(),
        combatNarrationExpertTool: vi.fn(),
        // Note: processAICombatantRolls is deprecated - kept for backward compatibility in tests
        processAICombatantRolls: undefined,
        updateRollNotationWithModifiers: vi.fn(),
      } as any;

      // Mock CombatInitializer to return failure
      const mockInitResult = {
        success: false,
        initiativeOrder: [],
        enemies: [],
        updatedParty: [],
        messages: [{ sender: 'DM', content: 'Hubo un error al iniciar el combate.' }],
        diceRolls: [],
        error: 'No valid combatants',
      };

      vi.spyOn(CombatInitializer, 'initializeCombat').mockResolvedValue(mockInitResult);

      await session.initialize(
        mockDeps,
        [],
        { description: 'A dark forest' },
        [],
        'I attack',
        { actionType: 'attack' }
      );

      // Should not be in combat
      expect(session.isActive()).toBe(false);
      // Should have error message
      const output = session.toJSON();
      expect(output.messages).toHaveLength(1);
      expect(output.messages[0].content).toContain('error');
    });

    it('should handle combat ending during first AI turn', async () => {
      const session = CombatSession.createEmpty();
      const mockDeps = {
        diceRollerTool: vi.fn(),
        enemyTacticianTool: vi.fn(),
        companionTacticianTool: vi.fn(),
        combatNarrationExpertTool: vi.fn(),
        // Note: processAICombatantRolls is deprecated - kept for backward compatibility in tests
        processAICombatantRolls: undefined,
        updateRollNotationWithModifiers: vi.fn(),
      } as any;

      // Mock CombatInitializer to return success with combat ended
      const mockInitResult = {
        success: true,
        initiativeOrder: [
          { id: 'enemy-1', characterName: 'Goblin', total: 18, type: 'npc', controlledBy: 'AI' } as Combatant,
        ],
        enemies: [],
        updatedParty: [],
        messages: [
          { sender: 'System', content: '¡Comienza el Combate!' },
          { sender: 'DM', content: 'Goblin is defeated!' },
        ],
        diceRolls: [],
        firstTurnData: {
          turnIndex: 0,
          activeCombatant: { id: 'enemy-1', characterName: 'Goblin', total: 18, type: 'npc', controlledBy: 'AI' } as Combatant,
          hasMoreAITurns: false,
          lastProcessedTurnWasAI: true,
          lastProcessedTurnIndex: 0,
          combatEnded: true, // Combat ended during first turn
        },
      };

      vi.spyOn(CombatInitializer, 'initializeCombat').mockResolvedValue(mockInitResult);

      await session.initialize(
        mockDeps,
        ['combatant-1'],
        { description: 'A dark forest' },
        [],
        'I attack the goblin',
        { actionType: 'attack' }
      );

      // Should not be in combat (ended during first turn)
      expect(session.isActive()).toBe(false);
      expect(session.getEnemies()).toEqual([]); // Enemies cleared
    });
  });

  describe('processCurrentTurn()', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return early if combat is not active', async () => {
      const session = CombatSession.createEmpty();
      const mockDeps = {} as any;

      await session.processCurrentTurn(null, '', {}, [], mockDeps);
      
      // Should not throw, just return early
      expect(session.isActive()).toBe(false);
    });

    it('should return early if no active combatant', async () => {
      const mockInput: CombatManagerInput = {
        party: [],
        enemies: [],
        initiativeOrder: [],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      const mockDeps = {} as any;

      await session.processCurrentTurn(null, '', {}, [], mockDeps);
      
      // Should not throw, just return early
      expect(session.getActiveCombatant()).toBeNull();
    });

    it('should handle continue_turn action for player', async () => {
      const mockInput: CombatManagerInput = {
        party: [
          {
            id: 'player-1',
            name: 'Player',
            hp: { current: 20, max: 20 },
            abilityScores: {
              fuerza: 10,
              destreza: 10,
              constitución: 10,
              inteligencia: 10,
              sabiduría: 10,
              carisma: 10,
            },
            skills: [],
            inventory: [],
            spells: [],
            controlledBy: 'Player',
          } as Character,
        ],
        enemies: [],
        initiativeOrder: [
          { id: 'player-1', characterName: 'Player', total: 15, type: 'player', controlledBy: 'Player' } as Combatant,
          { id: 'enemy-1', characterName: 'Goblin', total: 10, type: 'npc', controlledBy: 'AI' } as Combatant,
        ],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      const mockDeps = {
        enemyTacticianTool: vi.fn().mockResolvedValue({ narration: 'Goblin attacks!', targetId: 'player-1', diceRolls: [] }),
        // Note: processAICombatantRolls is deprecated - TurnProcessor now handles this
        processAICombatantRolls: undefined, // vi.fn().mockResolvedValue({
          diceRolls: [],
          messages: [],
          updatedParty: session.getParty(),
          updatedEnemies: session.getEnemies(),
          combatEnded: false,
        }),
      } as any;

      vi.mocked(CombatTurnManager.nextTurnIndex).mockReturnValue(1);

      await session.processCurrentTurn(
        { actionType: 'continue_turn' },
        '',
        {},
        [],
        mockDeps
      );

      // Should advance to next turn (Goblin)
      expect(session.getTurnIndex()).toBe(1);
      expect(mockDeps.enemyTacticianTool).toHaveBeenCalled();
    });

    it('should process player turn when action is provided', async () => {
      const mockInput: CombatManagerInput = {
        party: [
          {
            id: 'player-1',
            name: 'Player',
            hp: { current: 20, max: 20 },
            abilityScores: {
              fuerza: 10,
              destreza: 10,
              constitución: 10,
              inteligencia: 10,
              sabiduría: 10,
              carisma: 10,
            },
            skills: [],
            inventory: [],
            spells: [],
            controlledBy: 'Player',
          } as Character,
        ],
        enemies: [
          { uniqueId: 'enemy-1', name: 'Goblin', hp: { current: 7, max: 7 }, ac: 15 } as any,
        ],
        initiativeOrder: [
          { id: 'player-1', characterName: 'Player', total: 15, type: 'player', controlledBy: 'Player' } as Combatant,
        ],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      const mockDeps = {
        diceRollerTool: vi.fn().mockResolvedValue({
          totalResult: 18,
          outcome: 'success',
          individualRolls: [18],
        }),
        combatNarrationExpertTool: vi.fn().mockResolvedValue({ html: '<p>Player attacks!</p>' }),
        updateRollNotationWithModifiers: vi.fn(),
      } as any;

      // Note: This test needs to be updated to use TurnProcessor instead of CombatActionProcessor
      // For now, we'll mock TurnProcessor via the dependencies
      vi.mock('@/lib/combat/turn-processor', () => ({
        TurnProcessor: {
          processTurn: vi.fn().mockResolvedValue({
            success: true,
            messages: [{ sender: 'DM', content: 'Player hits Goblin for 5 damage!' }],
            diceRolls: [],
            updatedParty: session.getParty(),
            updatedEnemies: [{ uniqueId: 'enemy-1', name: 'Goblin', hp: { current: 2, max: 7 }, ac: 15 } as any],
            combatEnded: false,
            playerActionCompleted: true,
          }),
        },
      }));

      await session.processCurrentTurn(
        { actionType: 'attack', targetId: 'enemy-1' },
        'I attack the goblin',
        {},
        [],
        mockDeps
      );

      // Should have processed the attack via TurnProcessor
      // Note: This assertion needs to be updated once TurnProcessor is properly mocked
      const output = session.toJSON();
      expect(output.messages.length).toBeGreaterThan(0);
      expect(output.playerActionCompleted).toBe(true);
    });

    it('should process AI turn automatically', async () => {
      const mockInput: CombatManagerInput = {
        party: [
          {
            id: 'player-1',
            name: 'Player',
            hp: { current: 20, max: 20 },
            abilityScores: {
              fuerza: 10,
              destreza: 10,
              constitución: 10,
              inteligencia: 10,
              sabiduría: 10,
              carisma: 10,
            },
            skills: [],
            inventory: [],
            spells: [],
            controlledBy: 'Player',
          } as Character,
        ],
        enemies: [
          { uniqueId: 'enemy-1', name: 'Goblin', hp: { current: 7, max: 7 }, ac: 15 } as any,
        ],
        initiativeOrder: [
          { id: 'enemy-1', characterName: 'Goblin', total: 18, type: 'npc', controlledBy: 'AI' } as Combatant,
        ],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      const mockDeps = {
        enemyTacticianTool: vi.fn().mockResolvedValue({
          narration: 'Goblin attacks Player!',
          targetId: 'player-1',
          diceRolls: [{ rollNotation: '1d20+3', type: 'attack' }],
        }),
        // Note: processAICombatantRolls is deprecated - TurnProcessor now handles this
        processAICombatantRolls: undefined, // vi.fn().mockResolvedValue({
          diceRolls: [],
          messages: [{ sender: 'DM', content: 'Goblin hits Player for 3 damage!' }],
          updatedParty: [{ ...session.getParty()[0], hp: { current: 17, max: 20 } }],
          updatedEnemies: session.getEnemies(),
          combatEnded: false,
        }),
      } as any;

      vi.mocked(CombatTurnManager.nextTurnIndex).mockReturnValue(0);

      await session.processCurrentTurn(
        null,
        '',
        {},
        [],
        mockDeps
      );

      // Should have processed AI turn
      expect(mockDeps.enemyTacticianTool).toHaveBeenCalled();
      // Note: processAICombatantRolls is deprecated - this assertion needs updating
      // expect(mockDeps.processAICombatantRolls).toHaveBeenCalled();
      
      const output = session.toJSON();
      expect(output.lastProcessedTurnWasAI).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle processCurrentTurn when combat ends during AI turn', async () => {
      const mockInput: CombatManagerInput = {
        party: [
          {
            id: 'player-1',
            name: 'Player',
            hp: { current: 20, max: 20 },
            abilityScores: {
              fuerza: 10,
              destreza: 10,
              constitución: 10,
              inteligencia: 10,
              sabiduría: 10,
              carisma: 10,
            },
            skills: [],
            inventory: [],
            spells: [],
            controlledBy: 'Player',
          } as Character,
        ],
        enemies: [
          { uniqueId: 'enemy-1', name: 'Goblin', hp: { current: 1, max: 7 }, ac: 15 } as any,
        ],
        initiativeOrder: [
          { id: 'enemy-1', characterName: 'Goblin', total: 18, type: 'npc', controlledBy: 'AI' } as Combatant,
        ],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      const mockDeps = {
        enemyTacticianTool: vi.fn().mockResolvedValue({
          narration: 'Goblin attacks Player!',
          targetId: 'player-1',
          diceRolls: [{ rollNotation: '1d20+3', type: 'attack' }],
        }),
        // Note: processAICombatantRolls is deprecated - TurnProcessor now handles this
        processAICombatantRolls: undefined, // vi.fn().mockResolvedValue({
          diceRolls: [],
          messages: [{ sender: 'DM', content: 'Goblin hits Player!' }],
          updatedParty: session.getParty(),
          updatedEnemies: [{ uniqueId: 'enemy-1', name: 'Goblin', hp: { current: 0, max: 7 }, ac: 15 } as any],
          combatEnded: true,
        }),
      } as any;

      vi.mocked(CombatTurnManager.nextTurnIndex).mockReturnValue(0);
      vi.mocked(checkEndOfCombat).mockReturnValue({
        combatEnded: true,
        reason: 'Todos los enemigos derrotados',
      });

      await session.processCurrentTurn(
        null,
        '',
        {},
        [],
        mockDeps
      );

      const output = session.toJSON();
      expect(output.inCombat).toBe(false);
      expect(output.enemies).toEqual([]);
      expect(output.initiativeOrder).toEqual([]);
    });

    it('should handle player turn with ambiguous target', async () => {
      const mockInput: CombatManagerInput = {
        party: [
          {
            id: 'player-1',
            name: 'Player',
            hp: { current: 20, max: 20 },
            abilityScores: {
              fuerza: 10,
              destreza: 10,
              constitución: 10,
              inteligencia: 10,
              sabiduría: 10,
              carisma: 10,
            },
            skills: [],
            inventory: [],
            spells: [],
            controlledBy: 'Player',
          } as Character,
        ],
        enemies: [
          { uniqueId: 'enemy-1', name: 'Goblin', hp: { current: 7, max: 7 }, ac: 15 } as any,
          { uniqueId: 'enemy-2', name: 'Goblin', hp: { current: 7, max: 7 }, ac: 15 } as any,
        ],
        initiativeOrder: [
          { id: 'player-1', characterName: 'Player', total: 15, type: 'player', controlledBy: 'Player' } as Combatant,
        ],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      const mockDeps = {} as any;

      await session.processCurrentTurn(
        { actionType: 'attack' }, // No targetId specified
        'I attack',
        {},
        [],
        mockDeps
      );

      const output = session.toJSON();
      // Should ask for clarification
      expect(output.messages.some((m: any) => m.content.includes('objetivo'))).toBe(true);
      expect(output.turnIndex).toBe(0); // Should not advance turn
    });

    it('should handle player turn with no enemies alive', async () => {
      const mockInput: CombatManagerInput = {
        party: [
          {
            id: 'player-1',
            name: 'Player',
            hp: { current: 20, max: 20 },
            abilityScores: {
              fuerza: 10,
              destreza: 10,
              constitución: 10,
              inteligencia: 10,
              sabiduría: 10,
              carisma: 10,
            },
            skills: [],
            inventory: [],
            spells: [],
            controlledBy: 'Player',
          } as Character,
        ],
        enemies: [
          { uniqueId: 'enemy-1', name: 'Goblin', hp: { current: 0, max: 7 }, ac: 15 } as any,
        ],
        initiativeOrder: [
          { id: 'player-1', characterName: 'Player', total: 15, type: 'player', controlledBy: 'Player' } as Combatant,
        ],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      const mockDeps = {} as any;

      vi.mocked(CombatTurnManager.nextTurnIndex).mockReturnValue(0);

      await session.processCurrentTurn(
        { actionType: 'attack' },
        'I attack',
        {},
        [],
        mockDeps
      );

      const output = session.toJSON();
      // Should show message about no enemies alive
      expect(output.messages.some((m: any) => m.content.includes('enemigos vivos'))).toBe(true);
    });

    it('should handle AI turn with no targetId', async () => {
      const mockInput: CombatManagerInput = {
        party: [
          {
            id: 'player-1',
            name: 'Player',
            hp: { current: 20, max: 20 },
            abilityScores: {
              fuerza: 10,
              destreza: 10,
              constitución: 10,
              inteligencia: 10,
              sabiduría: 10,
              carisma: 10,
            },
            skills: [],
            inventory: [],
            spells: [],
            controlledBy: 'Player',
          } as Character,
        ],
        enemies: [
          { uniqueId: 'enemy-1', name: 'Goblin', hp: { current: 7, max: 7 }, ac: 15 } as any,
        ],
        initiativeOrder: [
          { id: 'enemy-1', characterName: 'Goblin', total: 18, type: 'npc', controlledBy: 'AI' } as Combatant,
        ],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      const mockDeps = {
        enemyTacticianTool: vi.fn().mockResolvedValue({
          narration: 'Goblin looks around.',
          targetId: null, // No target
          diceRolls: [],
        }),
        // Note: processAICombatantRolls is deprecated - kept for backward compatibility in tests
        processAICombatantRolls: undefined,
      } as any;

      vi.mocked(CombatTurnManager.nextTurnIndex).mockReturnValue(0);

      await session.processCurrentTurn(
        null,
        '',
        {},
        [],
        mockDeps
      );

      // Should process narration but not call processAICombatantRolls
      expect(mockDeps.enemyTacticianTool).toHaveBeenCalled();
      // Note: processAICombatantRolls is deprecated - this assertion needs updating
      // expect(mockDeps.processAICombatantRolls).not.toHaveBeenCalled();
    });

    it('should handle initialize failure gracefully', async () => {
      const session = CombatSession.createEmpty();
      
      vi.mocked(CombatInitializer.initializeCombat).mockResolvedValue({
        success: false,
        initiativeOrder: [],
        enemies: [],
        updatedParty: [],
        messages: [{ sender: 'DM', content: 'Error al iniciar combate' }],
        diceRolls: [],
        error: 'Test error',
      });

      const mockDeps = {
        diceRollerTool: vi.fn(),
        enemyTacticianTool: vi.fn(),
        companionTacticianTool: vi.fn(),
        // Note: processAICombatantRolls is deprecated - kept for backward compatibility in tests
        processAICombatantRolls: undefined,
        narrativeExpert: vi.fn(),
        markdownToHtml: vi.fn(),
      } as any;

      await session.initialize(
        mockDeps,
        [], // combatantIds
        {}, // locationContext
        [], // conversationHistory
        '', // playerAction
        null // interpretedAction
      );

      const output = session.toJSON();
      expect(output.inCombat).toBe(false);
      expect(output.messages.length).toBeGreaterThan(0);
    });

    it('should handle fromInput with invalid turnIndex (out of bounds)', () => {
      const mockInput: CombatManagerInput = {
        party: [],
        enemies: [],
        initiativeOrder: [
          { id: 'player-1', characterName: 'Player', total: 15, type: 'player', controlledBy: 'Player' } as Combatant,
        ],
        turnIndex: 999, // Out of bounds
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      
      // Should clamp turnIndex to valid range
      expect(session.getTurnIndex()).toBe(0);
    });

    it('should handle fromInput with negative turnIndex', () => {
      const mockInput: CombatManagerInput = {
        party: [],
        enemies: [],
        initiativeOrder: [
          { id: 'player-1', characterName: 'Player', total: 15, type: 'player', controlledBy: 'Player' } as Combatant,
        ],
        turnIndex: -5, // Negative
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      
      // Should clamp turnIndex to 0
      expect(session.getTurnIndex()).toBe(0);
    });

    it('should handle processCurrentTurn with invalid action type', async () => {
      const mockInput: CombatManagerInput = {
        party: [
          {
            id: 'player-1',
            name: 'Player',
            hp: { current: 20, max: 20 },
            abilityScores: {
              fuerza: 10,
              destreza: 10,
              constitución: 10,
              inteligencia: 10,
              sabiduría: 10,
              carisma: 10,
            },
            skills: [],
            inventory: [],
            spells: [],
            controlledBy: 'Player',
          } as Character,
        ],
        enemies: [],
        initiativeOrder: [
          { id: 'player-1', characterName: 'Player', total: 15, type: 'player', controlledBy: 'Player' } as Combatant,
        ],
        turnIndex: 0,
        inCombat: true,
        locationId: 'test',
        messages: [],
        diceRolls: [],
      };

      const session = CombatSession.fromInput(mockInput);
      const mockDeps = {} as any;

      // Should not throw, just return early
      await session.processCurrentTurn(
        { actionType: 'unknown_action' },
        'unknown action',
        {},
        [],
        mockDeps
      );

      // Should not have processed anything
      const output = session.toJSON();
      expect(output.messages.length).toBe(0);
    });
  });
});

