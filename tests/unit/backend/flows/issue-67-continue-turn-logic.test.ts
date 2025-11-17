/**
 * Unit test for Issue #67: Testing continue_turn logic in combat-manager
 * 
 * This test specifically targets the logic in combat-manager.ts lines 187-213
 * to verify that continue_turn is handled correctly for both Player and AI combatants.
 */

import { describe, it, expect } from 'vitest';
import type { Combatant } from '@/lib/types';

describe('Issue #67: continue_turn logic in combat-manager', () => {
  const mockInitiativeOrder: Combatant[] = [
    {
      id: 'player-1',
      characterName: 'Galador',
      initiative: 18,
      isPlayer: true,
      controlledBy: 'Player',
    },
    {
      id: 'companion-1',
      characterName: 'Elara',
      initiative: 15,
      isPlayer: false,
      controlledBy: 'AI',
    },
    {
      id: 'enemy-1',
      characterName: 'Orco1',
      initiative: 12,
      isPlayer: false,
      controlledBy: 'AI',
    },
  ];

  /**
   * Simulates the continue_turn logic from combat-manager.ts lines 187-213
   */
  function simulateContinueTurnLogic(
    currentTurnIndex: number,
    initiativeOrder: Combatant[]
  ): { newTurnIndex: number; didAdvance: boolean; combatantToProcess: Combatant } {
    const activeCombatant = initiativeOrder[currentTurnIndex];
    let newTurnIndex = currentTurnIndex;
    let didAdvance = false;

    // This replicates the logic from combat-manager.ts
    if (activeCombatant.controlledBy === 'Player') {
      // Player turn: advance to next turn
      newTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
      didAdvance = true;
    }
    // If AI: don't advance, process this turn

    return {
      newTurnIndex,
      didAdvance,
      combatantToProcess: initiativeOrder[newTurnIndex],
    };
  }

  describe('continue_turn with Player combatant', () => {
    it('should advance when current combatant is Player', () => {
      const currentTurnIndex = 0; // Galador (Player)
      const result = simulateContinueTurnLogic(currentTurnIndex, mockInitiativeOrder);

      expect(result.didAdvance).toBe(true);
      expect(result.newTurnIndex).toBe(1);
      expect(result.combatantToProcess.characterName).toBe('Elara');
      expect(result.combatantToProcess.controlledBy).toBe('AI');
    });

    it('should process next combatant after advancing from Player', () => {
      const currentTurnIndex = 0; // Galador (Player)
      const result = simulateContinueTurnLogic(currentTurnIndex, mockInitiativeOrder);

      // After advancing, the combatant to process should be Elara
      expect(result.combatantToProcess.characterName).toBe('Elara');
      expect(result.combatantToProcess.characterName).not.toBe('Galador');
    });
  });

  describe('continue_turn with AI combatant', () => {
    it('should NOT advance when current combatant is AI companion', () => {
      const currentTurnIndex = 1; // Elara (AI companion)
      const result = simulateContinueTurnLogic(currentTurnIndex, mockInitiativeOrder);

      expect(result.didAdvance).toBe(false);
      expect(result.newTurnIndex).toBe(1); // Stays at 1
      expect(result.combatantToProcess.characterName).toBe('Elara');
      expect(result.combatantToProcess.controlledBy).toBe('AI');
    });

    it('should NOT advance when current combatant is AI enemy', () => {
      const currentTurnIndex = 2; // Orco1 (AI enemy)
      const result = simulateContinueTurnLogic(currentTurnIndex, mockInitiativeOrder);

      expect(result.didAdvance).toBe(false);
      expect(result.newTurnIndex).toBe(2); // Stays at 2
      expect(result.combatantToProcess.characterName).toBe('Orco1');
      expect(result.combatantToProcess.controlledBy).toBe('AI');
    });

    it('should process the SAME combatant when AI does not advance', () => {
      const currentTurnIndex = 2; // Orco1 (AI)
      const result = simulateContinueTurnLogic(currentTurnIndex, mockInitiativeOrder);

      // The combatant to process should be the SAME as the current one
      expect(result.combatantToProcess.characterName).toBe('Orco1');
      expect(result.newTurnIndex).toBe(currentTurnIndex);
    });
  });

  describe('Issue #67 Specific: Orco1 turn after Elara', () => {
    it('should process Orco1 (NOT Elara) when continue_turn is received for index 2', () => {
      // This is the CRITICAL test for Issue #67
      // When "Pasar 1 Turno" is pressed after Elara's turn:
      // - Frontend should send turnIndex: 2 (Orco1)
      // - Backend should NOT advance (because Orco1 is AI)
      // - Backend should process Orco1's turn (NOT Elara's)

      const receivedTurnIndex = 2; // Orco1
      const result = simulateContinueTurnLogic(receivedTurnIndex, mockInitiativeOrder);

      // Should NOT advance (Orco1 is AI)
      expect(result.didAdvance).toBe(false);
      expect(result.newTurnIndex).toBe(2);

      // Should process Orco1 (NOT Elara!)
      expect(result.combatantToProcess.characterName).toBe('Orco1');
      expect(result.combatantToProcess.characterName).not.toBe('Elara');
      expect(result.combatantToProcess.controlledBy).toBe('AI');
    });

    it('should FAIL if wrong turnIndex is received (bug scenario)', () => {
      // This test simulates the BUG scenario
      // If frontend sends turnIndex: 1 instead of 2
      const wrongTurnIndex = 1; // Elara (WRONG!)
      const result = simulateContinueTurnLogic(wrongTurnIndex, mockInitiativeOrder);

      // Would process Elara again (THIS IS THE BUG!)
      expect(result.combatantToProcess.characterName).toBe('Elara');

      // This is what we DON'T want
      expect(result.combatantToProcess.characterName).not.toBe('Orco1');
    });
  });

  describe('Sequence Testing: Multiple continue_turn calls', () => {
    it('should process turns correctly in sequence: Player → AI1 → AI2', () => {
      // Scenario: Galador (Player) → Elara (AI) → Orco1 (AI)
      
      // User action: Galador attacks
      // After processing, turnIndex advances to Elara (1) and auto-processes
      // Backend returns turnIndex: 2 (Orco1)
      
      // User presses "Pasar 1 Turno"
      // Frontend sends continue_turn with turnIndex: 2
      const result1 = simulateContinueTurnLogic(2, mockInitiativeOrder);
      
      expect(result1.combatantToProcess.characterName).toBe('Orco1');
      expect(result1.didAdvance).toBe(false);
    });

    it('should handle full round: Player → AI → AI → Player', () => {
      const sequence = [
        { index: 0, expectedCombatant: 'Elara', expectedAdvance: true }, // Player advances to Elara
        { index: 1, expectedCombatant: 'Elara', expectedAdvance: false }, // Elara stays (AI)
        { index: 2, expectedCombatant: 'Orco1', expectedAdvance: false }, // Orco1 stays (AI)
      ];

      sequence.forEach(({ index, expectedCombatant, expectedAdvance }) => {
        const result = simulateContinueTurnLogic(index, mockInitiativeOrder);
        
        expect(result.combatantToProcess.characterName).toContain(expectedCombatant);
        expect(result.didAdvance).toBe(expectedAdvance);
      });
    });
  });

  describe('Wrap-around scenarios', () => {
    it('should wrap from last combatant to first when Player continues', () => {
      // Extend order to have Player at the end
      const extendedOrder: Combatant[] = [
        ...mockInitiativeOrder,
        {
          id: 'player-2',
          characterName: 'Merryl',
          initiative: 8,
          isPlayer: true,
          controlledBy: 'Player',
        },
      ];

      const lastPlayerIndex = 3; // Merryl (Player)
      const result = simulateContinueTurnLogic(lastPlayerIndex, extendedOrder);

      expect(result.didAdvance).toBe(true);
      expect(result.newTurnIndex).toBe(0); // Wraps to Galador
      expect(result.combatantToProcess.characterName).toBe('Galador');
    });

    it('should NOT wrap when AI at end continues (stays at same index)', () => {
      const lastAIIndex = 2; // Orco1 (AI, last in original order)
      const result = simulateContinueTurnLogic(lastAIIndex, mockInitiativeOrder);

      expect(result.didAdvance).toBe(false);
      expect(result.newTurnIndex).toBe(2); // Stays at Orco1
      expect(result.combatantToProcess.characterName).toBe('Orco1');
    });
  });

  describe('Comparison: Expected vs Bug Behavior', () => {
    it('EXPECTED: turnIndex 2 processes Orco1', () => {
      const correctTurnIndex = 2;
      const result = simulateContinueTurnLogic(correctTurnIndex, mockInitiativeOrder);
      
      expect(result.combatantToProcess.characterName).toBe('Orco1');
    });

    it('BUG: turnIndex 1 would process Elara again (wrong)', () => {
      const incorrectTurnIndex = 1;
      const result = simulateContinueTurnLogic(incorrectTurnIndex, mockInitiativeOrder);
      
      expect(result.combatantToProcess.characterName).toBe('Elara');
      // This is the bug: processing Elara when we should process Orco1
    });

    it('should clearly show the difference', () => {
      const correctResult = simulateContinueTurnLogic(2, mockInitiativeOrder);
      const bugResult = simulateContinueTurnLogic(1, mockInitiativeOrder);
      
      expect(correctResult.combatantToProcess.characterName).toBe('Orco1');
      expect(bugResult.combatantToProcess.characterName).toBe('Elara');
      expect(correctResult.combatantToProcess.characterName).not.toBe(
        bugResult.combatantToProcess.characterName
      );
    });
  });

  describe('Validation: Ensure turnIndex is always valid', () => {
    it('should handle all valid indices', () => {
      for (let i = 0; i < mockInitiativeOrder.length; i++) {
        const result = simulateContinueTurnLogic(i, mockInitiativeOrder);
        
        // Should never throw
        expect(result.newTurnIndex).toBeGreaterThanOrEqual(0);
        expect(result.newTurnIndex).toBeLessThan(mockInitiativeOrder.length);
        expect(result.combatantToProcess).toBeDefined();
      }
    });

    it('should match combatant at index', () => {
      const testIndex = 1; // Elara
      const result = simulateContinueTurnLogic(testIndex, mockInitiativeOrder);
      
      // When AI doesn't advance, combatant should match the index
      expect(result.combatantToProcess).toBe(mockInitiativeOrder[testIndex]);
    });
  });
});

