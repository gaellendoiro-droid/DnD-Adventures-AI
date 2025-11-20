
import { describe, it, expect } from 'vitest';
import { CombatTurnManager } from '../../../src/lib/combat/turn-manager';
import { Combatant } from '../../../src/lib/types';

describe('CombatTurnManager', () => {
    describe('nextTurnIndex', () => {
        it('should advance to the next index', () => {
            expect(CombatTurnManager.nextTurnIndex(0, 3)).toBe(1);
            expect(CombatTurnManager.nextTurnIndex(1, 3)).toBe(2);
        });

        it('should wrap around to 0', () => {
            expect(CombatTurnManager.nextTurnIndex(2, 3)).toBe(0);
        });

        it('should return 0 if total combatants is 0', () => {
            expect(CombatTurnManager.nextTurnIndex(0, 0)).toBe(0);
        });
    });

    describe('shouldSkipTurn', () => {
        const mockParty = [
            { id: 'player1', hp: { current: 10, max: 10 }, isDead: false },
            { id: 'player2', hp: { current: 0, max: 10 }, isDead: false }, // Unconscious
            { id: 'player3', hp: { current: 0, max: 10 }, isDead: true }, // Dead
        ];

        const mockEnemies = [
            { uniqueId: 'goblin-1', hp: { current: 5, max: 5 } },
            { uniqueId: 'goblin-2', hp: { current: 0, max: 5 } }, // Dead (enemies die at 0)
        ];

        it('should not skip active player', () => {
            const combatant: Combatant = { id: 'player1', characterName: 'P1', type: 'player', controlledBy: 'Player', total: 10 };
            expect(CombatTurnManager.shouldSkipTurn(combatant, mockParty, mockEnemies)).toBe(false);
        });

        it('should skip unconscious player', () => {
            const combatant: Combatant = { id: 'player2', characterName: 'P2', type: 'player', controlledBy: 'Player', total: 10 };
            expect(CombatTurnManager.shouldSkipTurn(combatant, mockParty, mockEnemies)).toBe(true);
        });

        it('should skip dead player', () => {
            const combatant: Combatant = { id: 'player3', characterName: 'P3', type: 'player', controlledBy: 'Player', total: 10 };
            expect(CombatTurnManager.shouldSkipTurn(combatant, mockParty, mockEnemies)).toBe(true);
        });

        it('should not skip active enemy', () => {
            const combatant: Combatant = { id: 'goblin-1', characterName: 'G1', type: 'npc', controlledBy: 'AI', total: 10 };
            expect(CombatTurnManager.shouldSkipTurn(combatant, mockParty, mockEnemies)).toBe(false);
        });

        it('should skip dead enemy', () => {
            const combatant: Combatant = { id: 'goblin-2', characterName: 'G2', type: 'npc', controlledBy: 'AI', total: 10 };
            expect(CombatTurnManager.shouldSkipTurn(combatant, mockParty, mockEnemies)).toBe(true);
        });
    });

    describe('findNextActiveCombatant', () => {
        const mockParty = [
            { id: 'p1', hp: { current: 10, max: 10 }, isDead: false },
            { id: 'p2', hp: { current: 0, max: 10 }, isDead: true },
        ];
        const mockEnemies = [
            { uniqueId: 'e1', hp: { current: 10, max: 10 } },
            { uniqueId: 'e2', hp: { current: 0, max: 10 } },
        ];

        const initiativeOrder: Combatant[] = [
            { id: 'p1', characterName: 'P1', type: 'player', controlledBy: 'Player', total: 20 }, // 0
            { id: 'e2', characterName: 'E2', type: 'npc', controlledBy: 'AI', total: 15 },     // 1 (Dead)
            { id: 'p2', characterName: 'P2', type: 'player', controlledBy: 'Player', total: 10 }, // 2 (Dead)
            { id: 'e1', characterName: 'E1', type: 'npc', controlledBy: 'AI', total: 5 },      // 3
        ];

        it('should find next active combatant skipping dead ones', () => {
            // Start at 0 (P1). Next should be 3 (E1), skipping 1 and 2.
            // Note: The function takes startIndex and checks it first. 
            // If we want the *next* one after P1, we should pass index 1.

            const result = CombatTurnManager.findNextActiveCombatant(1, initiativeOrder, mockParty, mockEnemies);
            expect(result.index).toBe(3);
            expect(result.combatant.id).toBe('e1');
            expect(result.skippedTurns).toBe(2); // Skipped E2 and P2
        });

        it('should return current if active', () => {
            const result = CombatTurnManager.findNextActiveCombatant(0, initiativeOrder, mockParty, mockEnemies);
            expect(result.index).toBe(0);
            expect(result.combatant.id).toBe('p1');
        });
    });

    describe('hasMoreAITurns', () => {
        const mockParty = [
            { id: 'p1', hp: { current: 10, max: 10 }, isDead: false },
            { id: 'p2', hp: { current: 0, max: 10 }, isDead: true },
        ];
        const mockEnemies = [];

        it('should return true for AI combatant', () => {
            const combatant: Combatant = { id: 'e1', characterName: 'E1', type: 'npc', controlledBy: 'AI', total: 10 };
            expect(CombatTurnManager.hasMoreAITurns(combatant, mockParty, mockEnemies, false)).toBe(true);
        });

        it('should return false for active Player combatant', () => {
            const combatant: Combatant = { id: 'p1', characterName: 'P1', type: 'player', controlledBy: 'Player', total: 10 };
            expect(CombatTurnManager.hasMoreAITurns(combatant, mockParty, mockEnemies, false)).toBe(false);
        });

        it('should return true for dead Player combatant (auto-skip)', () => {
            const combatant: Combatant = { id: 'p2', characterName: 'P2', type: 'player', controlledBy: 'Player', total: 10 };
            expect(CombatTurnManager.hasMoreAITurns(combatant, mockParty, mockEnemies, false)).toBe(true);
        });

        it('should return false if combat has ended', () => {
            const combatant: Combatant = { id: 'e1', characterName: 'E1', type: 'npc', controlledBy: 'AI', total: 10 };
            expect(CombatTurnManager.hasMoreAITurns(combatant, mockParty, mockEnemies, true)).toBe(false);
        });
    });
});
