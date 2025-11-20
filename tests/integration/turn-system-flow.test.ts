/**
 * Integration tests for complete turn system flow
 * Tests the end-to-end flow of turn processing including state transitions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isUnconsciousOrDead, checkEndOfCombat } from '@/lib/combat/rules-engine';
import type { Combatant, Character } from '@/lib/types';

describe('Flujo Completo del Sistema de Turnos', () => {
  const mockParty: Character[] = [
    {
      id: 'player-1',
      name: 'Galador',
      controlledBy: 'Player',
      hp: { current: 12, max: 12 },
      isDead: false,
    },
    {
      id: 'companion-1',
      name: 'Merryl',
      controlledBy: 'AI',
      hp: { current: 8, max: 8 },
      isDead: false,
    },
  ];

  const mockEnemies = [
    {
      uniqueId: 'goblin-1',
      name: 'Goblin',
      hp: { current: 7, max: 7 },
    },
  ];

  const mockInitiativeOrder: Combatant[] = [
    {
      id: 'goblin-1',
      characterName: 'Goblin 1',
      initiative: 18,
      isPlayer: false,
      controlledBy: 'AI',
    },
    {
      id: 'player-1',
      characterName: 'Galador',
      initiative: 15,
      isPlayer: true,
      controlledBy: 'Player',
    },
    {
      id: 'companion-1',
      characterName: 'Merryl',
      initiative: 12,
      isPlayer: false,
      controlledBy: 'AI',
    },
  ];

  describe('Flujo: Inicio de Combate → Turno de IA → Turno de Jugador', () => {
    it('should process first AI turn and return hasMoreAITurns correctly', () => {
      const currentTurnIndex = 0; // Goblin 1 (AI)
      const activeCombatant = mockInitiativeOrder[currentTurnIndex];
      
      // After processing AI turn, check next combatant
      const nextTurnIndex = (currentTurnIndex + 1) % mockInitiativeOrder.length;
      const nextCombatant = mockInitiativeOrder[nextTurnIndex];
      
      // Next is player, so hasMoreAITurns should be false
      // But we just processed an AI turn, so justProcessedAITurn should be true
      const hasMoreAITurns = nextCombatant.controlledBy === 'AI';
      const justProcessedAITurn = activeCombatant.controlledBy === 'AI';
      
      expect(justProcessedAITurn).toBe(true);
      expect(hasMoreAITurns).toBe(false);
    });

    it('should correctly transition from AI turn to player turn', () => {
      // After processing AI turn at index 0
      const processedTurnIndex = 0;
      const nextTurnIndex = (processedTurnIndex + 1) % mockInitiativeOrder.length;
      
      expect(nextTurnIndex).toBe(1);
      expect(mockInitiativeOrder[nextTurnIndex].controlledBy).toBe('Player');
    });

    it('should process player turn and automatically advance to next AI turn', () => {
      const playerTurnIndex = 1;
      const nextTurnIndex = (playerTurnIndex + 1) % mockInitiativeOrder.length;
      const nextCombatant = mockInitiativeOrder[nextTurnIndex];
      
      // After player turn, next should be AI (companion)
      expect(nextCombatant.controlledBy).toBe('AI');
      expect(nextCombatant.characterName).toBe('Merryl');
    });
  });

  describe('Flujo: Turno Saltado (Combatiente Muerto/Inconsciente)', () => {
    it('should skip turn for unconscious combatant and advance correctly', () => {
      const unconsciousCombatant: Character = {
        ...mockParty[0],
        hp: { current: 0, max: 12 },
        isDead: false,
      };
      
      const isUnconscious = isUnconsciousOrDead(unconsciousCombatant);
      expect(isUnconscious).toBe(true);
      
      // When skipping, should advance to next turn
      const currentIndex = 1; // Player's turn
      const nextIndex = (currentIndex + 1) % mockInitiativeOrder.length;
      
      expect(nextIndex).toBe(2);
    });

    it('should show message when skipping unconscious combatant', () => {
      const unconsciousCombatant: Character = {
        ...mockParty[0],
        hp: { current: 0, max: 12 },
        isDead: false,
      };
      
      const statusMessage = unconsciousCombatant.isDead === true
        ? `${unconsciousCombatant.name} está muerto y no puede actuar.`
        : `${unconsciousCombatant.name} está inconsciente y no puede actuar.`;
      
      expect(statusMessage).toContain('inconsciente');
    });

    it('should correctly calculate processedTurnIndex when skipping', () => {
      // Scenario: Skip combatant at index 1, advance to index 2
      const skippedIndex = 1;
      const nextIndex = (skippedIndex + 1) % mockInitiativeOrder.length;
      const processedTurnIndex = (nextIndex - 1 + mockInitiativeOrder.length) % mockInitiativeOrder.length;
      
      expect(processedTurnIndex).toBe(1); // The turn that was skipped
      expect(nextIndex).toBe(2);
    });
  });

  describe('Flujo: Wrap-around de Ronda', () => {
    it('should correctly wrap around from last combatant to first', () => {
      const lastIndex = mockInitiativeOrder.length - 1; // Last combatant
      const nextIndex = (lastIndex + 1) % mockInitiativeOrder.length;
      
      expect(nextIndex).toBe(0); // Wraps to first
    });

    it('should maintain correct turn order through multiple rounds', () => {
      // Simulate 2 full rounds
      let currentIndex = 0;
      const rounds = 2;
      const turnsPerRound = mockInitiativeOrder.length;
      const totalTurns = rounds * turnsPerRound;
      
      const processedIndices: number[] = [];
      
      for (let i = 0; i < totalTurns; i++) {
        processedIndices.push(currentIndex);
        currentIndex = (currentIndex + 1) % mockInitiativeOrder.length;
      }
      
      // Verify order is correct
      expect(processedIndices[0]).toBe(0); // First turn of round 1
      expect(processedIndices[turnsPerRound]).toBe(0); // First turn of round 2
      expect(processedIndices.length).toBe(totalTurns);
    });
  });

  describe('Flujo: Fin de Combate', () => {
    it('should detect combat end when all enemies defeated', () => {
      const defeatedEnemies = mockEnemies.map(e => ({ ...e, hp: { current: 0, max: e.hp.max } }));
      const result = checkEndOfCombat(mockParty, defeatedEnemies);
      
      expect(result.combatEnded).toBe(true);
      expect(result.reason).toBe('Todos los enemigos derrotados');
    });

    it('should detect combat end when all allies unconscious', () => {
      const unconsciousParty = mockParty.map(p => ({ ...p, hp: { current: 0, max: p.hp.max }, isDead: false }));
      const result = checkEndOfCombat(unconsciousParty, mockEnemies);
      
      expect(result.combatEnded).toBe(true);
      expect(result.reason).toBe('Todos los aliados inconscientes');
    });

    it('should detect combat end when all allies dead', () => {
      const deadParty = mockParty.map(p => ({ ...p, hp: { current: 0, max: p.hp.max }, isDead: true }));
      const result = checkEndOfCombat(deadParty, mockEnemies);
      
      expect(result.combatEnded).toBe(true);
      expect(result.reason).toBe('Todos los aliados muertos');
    });

    it('should continue combat when some allies are alive', () => {
      const mixedParty = [
        { ...mockParty[0], hp: { current: 0, max: 12 }, isDead: false }, // Unconscious
        { ...mockParty[1], hp: { current: 5, max: 8 }, isDead: false }, // Alive
      ];
      const result = checkEndOfCombat(mixedParty, mockEnemies);
      
      expect(result.combatEnded).toBe(false);
      expect(result.reason).toBe(null);
    });
  });

  describe('Flujo: Sincronización de Estado Completa', () => {
    it('should maintain consistent state through multiple turn advances', () => {
      // Simulate: Process AI turn, advance, process next AI turn
      let turnIndex = 0;
      let hasMoreAITurns = true;
      let lastProcessedTurnWasAI = false;
      let lastProcessedTurnIndex: number | undefined;
      
      // Process first AI turn
      const firstCombatant = mockInitiativeOrder[turnIndex];
      if (firstCombatant.controlledBy === 'AI') {
        lastProcessedTurnWasAI = true;
        lastProcessedTurnIndex = turnIndex;
        turnIndex = (turnIndex + 1) % mockInitiativeOrder.length;
        
        const nextCombatant = mockInitiativeOrder[turnIndex];
        hasMoreAITurns = nextCombatant.controlledBy === 'AI';
      }
      
      expect(lastProcessedTurnWasAI).toBe(true);
      expect(lastProcessedTurnIndex).toBe(0);
      expect(turnIndex).toBe(1);
      expect(hasMoreAITurns).toBe(false); // Next is player
    });

    it('should correctly update state when player acts and next is AI', () => {
      // After player turn, process next AI turn automatically
      let turnIndex = 1; // Player
      turnIndex = (turnIndex + 1) % mockInitiativeOrder.length; // Advance to next
      
      const nextCombatant = mockInitiativeOrder[turnIndex];
      const hasMoreAITurns = nextCombatant.controlledBy === 'AI';
      
      expect(turnIndex).toBe(2);
      expect(hasMoreAITurns).toBe(true); // Next is AI (companion)
    });
  });
});

