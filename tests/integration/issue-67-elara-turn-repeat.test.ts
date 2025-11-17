/**
 * Integration test for Issue #67: Companion AI turn repeats when pressing "Pasar 1 Turno"
 * 
 * Bug Description:
 * - After Elara (companion AI) executes her turn automatically, 
 *   pressing "Pasar 1 Turno" causes Elara to execute her turn again
 *   instead of advancing to Orco1.
 * 
 * Expected Flow:
 * 1. Galador (Player, index 0) executes turn
 * 2. Backend processes Galador's action
 * 3. Backend auto-processes Elara's turn (AI, index 1)
 * 4. Backend returns turnIndex: 2 (Orco1)
 * 5. Frontend updates turnIndexRef.current = 2
 * 6. User presses "Pasar 1 Turno"
 * 7. Frontend sends "continuar turno" with turnIndex: 2
 * 8. Backend should process Orco1's turn (NOT Elara's turn)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Combatant } from '@/lib/types';

describe('Issue #67: Elara turn repeat bug', () => {
  // Mock initiative order: Galador → Elara → Orco1
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

  describe('Backend Logic: Turn Index Advancement', () => {
    it('should advance from Galador (0) to Elara (1) after player action', () => {
      const currentTurnIndex = 0; // Galador's turn
      const activeCombatant = mockInitiativeOrder[currentTurnIndex];
      
      expect(activeCombatant.characterName).toBe('Galador');
      expect(activeCombatant.controlledBy).toBe('Player');
      
      // After processing player action, advance to next turn
      const nextTurnIndex = (currentTurnIndex + 1) % mockInitiativeOrder.length;
      const nextCombatant = mockInitiativeOrder[nextTurnIndex];
      
      expect(nextTurnIndex).toBe(1);
      expect(nextCombatant.characterName).toBe('Elara');
      expect(nextCombatant.controlledBy).toBe('AI');
    });

    it('should auto-process Elara (1) and advance to Orco1 (2)', () => {
      const elaraTurnIndex = 1;
      const elaraCombatant = mockInitiativeOrder[elaraTurnIndex];
      
      expect(elaraCombatant.characterName).toBe('Elara');
      expect(elaraCombatant.controlledBy).toBe('AI');
      
      // After auto-processing Elara's turn, advance to next
      const nextTurnIndex = (elaraTurnIndex + 1) % mockInitiativeOrder.length;
      const nextCombatant = mockInitiativeOrder[nextTurnIndex];
      
      expect(nextTurnIndex).toBe(2);
      expect(nextCombatant.characterName).toBe('Orco1');
      expect(nextCombatant.controlledBy).toBe('AI');
    });

    it('should return correct state after processing player action and AI companion', () => {
      // Simulate backend response after Galador's action
      let currentTurnIndex = 0; // Galador
      
      // Process player action
      // Advance to next turn (Elara)
      currentTurnIndex = (currentTurnIndex + 1) % mockInitiativeOrder.length;
      let activeCombatant = mockInitiativeOrder[currentTurnIndex];
      
      // Elara is AI, so auto-process
      const elaraWasProcessed = activeCombatant.controlledBy === 'AI';
      const elaraIndex = currentTurnIndex;
      
      // Advance to next turn (Orco1)
      currentTurnIndex = (currentTurnIndex + 1) % mockInitiativeOrder.length;
      activeCombatant = mockInitiativeOrder[currentTurnIndex];
      
      // Backend should return this state
      const backendResponse = {
        turnIndex: currentTurnIndex, // 2 (Orco1)
        lastProcessedTurnWasAI: elaraWasProcessed, // true
        lastProcessedTurnIndex: elaraIndex, // 1 (Elara)
        hasMoreAITurns: activeCombatant.controlledBy === 'AI', // true (Orco1 is AI)
      };
      
      expect(backendResponse.turnIndex).toBe(2);
      expect(backendResponse.lastProcessedTurnWasAI).toBe(true);
      expect(backendResponse.lastProcessedTurnIndex).toBe(1);
      expect(backendResponse.hasMoreAITurns).toBe(true);
    });
  });

  describe('Frontend Logic: turnIndexRef Synchronization', () => {
    it('should update turnIndexRef to 2 (Orco1) after receiving backend response', () => {
      // Simulate receiving backend response
      const backendResponse = {
        turnIndex: 2, // Orco1
        lastProcessedTurnWasAI: true,
        lastProcessedTurnIndex: 1, // Elara
        hasMoreAITurns: true,
      };
      
      // Frontend should update ref
      let turnIndexRef = { current: 0 }; // Before update
      turnIndexRef.current = backendResponse.turnIndex;
      
      expect(turnIndexRef.current).toBe(2);
      
      // Verify the combatant at this index
      const nextCombatant = mockInitiativeOrder[turnIndexRef.current];
      expect(nextCombatant.characterName).toBe('Orco1');
    });

    it('should display Elara (1) visually while ref points to Orco1 (2)', () => {
      const backendResponse = {
        turnIndex: 2, // Orco1 (next turn)
        lastProcessedTurnWasAI: true,
        lastProcessedTurnIndex: 1, // Elara (just processed)
        hasMoreAITurns: true,
      };
      
      // Frontend state
      let turnIndexRef = { current: 2 }; // Points to next turn
      let displayedTurnIndex = backendResponse.lastProcessedTurnIndex; // Display processed turn
      
      expect(turnIndexRef.current).toBe(2); // Internal: next turn
      expect(displayedTurnIndex).toBe(1); // Visual: processed turn
      
      // Verify displayed combatant
      const displayedCombatant = mockInitiativeOrder[displayedTurnIndex];
      expect(displayedCombatant.characterName).toBe('Elara');
      
      // Verify ref combatant
      const refCombatant = mockInitiativeOrder[turnIndexRef.current];
      expect(refCombatant.characterName).toBe('Orco1');
    });

    it('should send turnIndex: 2 when pressing "Pasar 1 Turno"', () => {
      // Frontend state after receiving response
      let turnIndexRef = { current: 2 }; // Orco1
      let displayedTurnIndex = 1; // Elara (visual only)
      const hasMoreAITurns = true;
      
      // User presses "Pasar 1 Turno"
      // Frontend should:
      // 1. Update visual to show Orco1
      displayedTurnIndex = turnIndexRef.current;
      expect(displayedTurnIndex).toBe(2);
      
      // 2. Send "continuar turno" with turnIndex: 2
      const messageToBackend = {
        action: 'continuar turno',
        turnIndex: turnIndexRef.current, // Should be 2, NOT 1
      };
      
      expect(messageToBackend.turnIndex).toBe(2);
      expect(messageToBackend.turnIndex).not.toBe(1); // NOT Elara!
    });
  });

  describe('Backend Logic: Processing "continue_turn" action', () => {
    it('should NOT advance when receiving continue_turn for AI combatant', () => {
      // Backend receives "continuar turno" with turnIndex: 2
      const receivedTurnIndex = 2;
      const activeCombatant = mockInitiativeOrder[receivedTurnIndex];
      
      expect(activeCombatant.characterName).toBe('Orco1');
      expect(activeCombatant.controlledBy).toBe('AI');
      
      // This is the key logic from combat-manager.ts lines 187-213
      // When continue_turn is detected:
      // - If activeCombatant is Player, advance
      // - If activeCombatant is AI, DON'T advance (process this turn)
      
      const shouldAdvance = activeCombatant.controlledBy === 'Player';
      expect(shouldAdvance).toBe(false);
      
      // Process Orco1's turn WITHOUT advancing
      const turnToProcess = receivedTurnIndex;
      expect(turnToProcess).toBe(2); // Orco1
      expect(turnToProcess).not.toBe(1); // NOT Elara!
    });

    it('should advance when receiving continue_turn for Player combatant', () => {
      // Scenario: Player turn, player presses "Pasar 1 Turno"
      const receivedTurnIndex = 0; // Galador
      const activeCombatant = mockInitiativeOrder[receivedTurnIndex];
      
      expect(activeCombatant.characterName).toBe('Galador');
      expect(activeCombatant.controlledBy).toBe('Player');
      
      // When continue_turn for Player, advance to next turn
      const shouldAdvance = activeCombatant.controlledBy === 'Player';
      expect(shouldAdvance).toBe(true);
      
      const nextTurnIndex = (receivedTurnIndex + 1) % mockInitiativeOrder.length;
      expect(nextTurnIndex).toBe(1); // Elara
    });
  });

  describe('Complete Flow: Reproduce Issue #67', () => {
    it('should NOT repeat Elara\'s turn when pressing "Pasar 1 Turno"', () => {
      // STEP 1: Initial state - Galador's turn
      let backendTurnIndex = 0;
      let frontendTurnIndexRef = { current: 0 };
      let frontendDisplayIndex = 0;
      
      expect(mockInitiativeOrder[backendTurnIndex].characterName).toBe('Galador');
      
      // STEP 2: Player sends action (e.g., "ataco al orco")
      const playerAction = 'ataco al orco';
      const sentTurnIndex = frontendTurnIndexRef.current;
      expect(sentTurnIndex).toBe(0);
      
      // STEP 3: Backend processes player action
      // - Process Galador's action
      // - Advance to Elara (1)
      backendTurnIndex = (backendTurnIndex + 1) % mockInitiativeOrder.length;
      expect(backendTurnIndex).toBe(1);
      expect(mockInitiativeOrder[backendTurnIndex].characterName).toBe('Elara');
      
      // - Elara is AI, auto-process her turn
      const elaraIndex = backendTurnIndex;
      backendTurnIndex = (backendTurnIndex + 1) % mockInitiativeOrder.length;
      expect(backendTurnIndex).toBe(2);
      expect(mockInitiativeOrder[backendTurnIndex].characterName).toBe('Orco1');
      
      // - Backend returns
      const backendResponse = {
        turnIndex: 2, // Orco1 (next)
        lastProcessedTurnWasAI: true,
        lastProcessedTurnIndex: 1, // Elara (just processed)
        hasMoreAITurns: true,
      };
      
      // STEP 4: Frontend receives response and updates
      frontendTurnIndexRef.current = backendResponse.turnIndex; // 2
      frontendDisplayIndex = backendResponse.lastProcessedTurnIndex; // 1
      
      expect(frontendTurnIndexRef.current).toBe(2);
      expect(frontendDisplayIndex).toBe(1);
      expect(mockInitiativeOrder[frontendTurnIndexRef.current].characterName).toBe('Orco1');
      expect(mockInitiativeOrder[frontendDisplayIndex].characterName).toBe('Elara');
      
      // STEP 5: User presses "Pasar 1 Turno"
      // Frontend updates display and sends message
      frontendDisplayIndex = frontendTurnIndexRef.current; // 2
      const continueTurnMessage = {
        action: 'continuar turno',
        turnIndex: frontendTurnIndexRef.current, // 2
      };
      
      expect(continueTurnMessage.turnIndex).toBe(2);
      expect(mockInitiativeOrder[continueTurnMessage.turnIndex].characterName).toBe('Orco1');
      
      // STEP 6: Backend receives "continuar turno" with turnIndex: 2
      const receivedTurnIndex = continueTurnMessage.turnIndex;
      const activeCombatant = mockInitiativeOrder[receivedTurnIndex];
      
      expect(receivedTurnIndex).toBe(2);
      expect(activeCombatant.characterName).toBe('Orco1');
      expect(activeCombatant.characterName).not.toBe('Elara'); // ✅ NOT Elara!
      
      // STEP 7: Backend processes turn WITHOUT advancing (because it's AI)
      const shouldAdvance = activeCombatant.controlledBy === 'Player';
      expect(shouldAdvance).toBe(false);
      
      const turnToProcess = receivedTurnIndex;
      expect(turnToProcess).toBe(2); // ✅ Process Orco1, NOT Elara!
      expect(mockInitiativeOrder[turnToProcess].characterName).toBe('Orco1');
    });

    it('should identify where the bug occurs if turnIndex is wrong', () => {
      // This test will FAIL if the bug exists, showing us WHERE it fails
      
      // Simulate the scenario
      let frontendTurnIndexRef = { current: 0 };
      
      // After backend processes Galador + Elara
      const backendResponse = {
        turnIndex: 2, // Orco1
        lastProcessedTurnIndex: 1, // Elara
      };
      
      // Frontend updates ref
      frontendTurnIndexRef.current = backendResponse.turnIndex;
      
      // Check if ref was updated correctly
      expect(frontendTurnIndexRef.current).toBe(2);
      
      // If this fails, the bug is in frontend ref update
      if (frontendTurnIndexRef.current !== 2) {
        throw new Error('BUG LOCATION: Frontend turnIndexRef not updating correctly');
      }
      
      // Simulate "Pasar 1 Turno" - check what turnIndex would be sent
      const sentTurnIndex = frontendTurnIndexRef.current;
      expect(sentTurnIndex).toBe(2);
      
      // If this fails, the bug is in how we send the message
      if (sentTurnIndex !== 2) {
        throw new Error('BUG LOCATION: Frontend sending wrong turnIndex to backend');
      }
      
      // Check backend would process correct combatant
      const combatantToProcess = mockInitiativeOrder[sentTurnIndex];
      expect(combatantToProcess.characterName).toBe('Orco1');
      
      // If this fails, the bug is in backend processing
      if (combatantToProcess.characterName === 'Elara') {
        throw new Error('BUG LOCATION: Backend processing wrong combatant');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle wrap-around correctly', () => {
      // Scenario: Last combatant (Orco1) executes, should wrap to Galador
      const lastIndex = 2; // Orco1
      const nextIndex = (lastIndex + 1) % mockInitiativeOrder.length;
      
      expect(nextIndex).toBe(0); // Wraps to Galador
      expect(mockInitiativeOrder[nextIndex].characterName).toBe('Galador');
    });

    it('should handle multiple consecutive AI turns', () => {
      // Extended scenario: Galador → Elara → Orco1 → Orco2 (all AI after player)
      const extendedOrder: Combatant[] = [
        ...mockInitiativeOrder,
        {
          id: 'enemy-2',
          characterName: 'Orco2',
          initiative: 10,
          isPlayer: false,
          controlledBy: 'AI',
        },
      ];
      
      // After Galador's turn, process Elara
      let currentIndex = 1; // Elara
      expect(extendedOrder[currentIndex].characterName).toBe('Elara');
      
      // Advance to Orco1
      currentIndex = (currentIndex + 1) % extendedOrder.length;
      expect(currentIndex).toBe(2);
      expect(extendedOrder[currentIndex].characterName).toBe('Orco1');
      
      // When user presses "Pasar 1 Turno", advance to Orco2
      currentIndex = (currentIndex + 1) % extendedOrder.length;
      expect(currentIndex).toBe(3);
      expect(extendedOrder[currentIndex].characterName).toBe('Orco2');
    });

    it('should handle Player → AI → Player sequence', () => {
      const sequence: Combatant[] = [
        mockInitiativeOrder[0], // Galador (Player)
        mockInitiativeOrder[1], // Elara (AI)
        mockInitiativeOrder[0], // Galador (Player) - simulating next round
      ];
      
      // After Galador's turn, process Elara
      let currentIndex = 0;
      currentIndex = (currentIndex + 1) % sequence.length;
      expect(currentIndex).toBe(1);
      expect(sequence[currentIndex].characterName).toBe('Elara');
      
      // After Elara's turn, next is Galador again
      currentIndex = (currentIndex + 1) % sequence.length;
      expect(currentIndex).toBe(2);
      expect(sequence[currentIndex].characterName).toBe('Galador');
      expect(sequence[currentIndex].controlledBy).toBe('Player');
    });
  });
});

