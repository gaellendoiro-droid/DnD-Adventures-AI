import { describe, it, expect } from 'vitest';
import {
    SurpriseManager,
    determineSurprise,
    markCombatantsSurprised,
    clearSurpriseFlag,
    isSurprised,
    type SurpriseContext,
} from '../../../src/lib/combat/surprise-manager';
import type { Combatant } from '../../../src/lib/types';

describe('SurpriseManager', () => {
    describe('determineSurprise', () => {
        it('should return "enemy" for ambush trigger', () => {
            const context: SurpriseContext = {
                triggerReason: 'ambush',
            };
            expect(determineSurprise(context)).toBe('enemy');
        });

        it('should return "enemy" for mimic trigger', () => {
            const context: SurpriseContext = {
                triggerReason: 'mimic',
            };
            expect(determineSurprise(context)).toBe('enemy');
        });

        it('should return "player" for player_surprise trigger', () => {
            const context: SurpriseContext = {
                triggerReason: 'player_surprise',
            };
            expect(determineSurprise(context)).toBe('player');
        });

        it('should return undefined for proximity trigger', () => {
            const context: SurpriseContext = {
                triggerReason: 'proximity',
            };
            expect(determineSurprise(context)).toBeUndefined();
        });

        it('should return undefined for stealth_fail trigger', () => {
            const context: SurpriseContext = {
                triggerReason: 'stealth_fail',
            };
            expect(determineSurprise(context)).toBeUndefined();
        });

        it('should return undefined for provocation trigger', () => {
            const context: SurpriseContext = {
                triggerReason: 'provocation',
            };
            expect(determineSurprise(context)).toBeUndefined();
        });

        it('should return "player" when isPlayerInitiatedAttack is true', () => {
            const context: SurpriseContext = {
                isPlayerInitiatedAttack: true,
            };
            expect(determineSurprise(context)).toBe('player');
        });

        it('should use explicit surpriseSide if provided', () => {
            const context: SurpriseContext = {
                triggerReason: 'proximity', // Would normally be undefined
                surpriseSide: 'player', // But explicit takes precedence
            };
            expect(determineSurprise(context)).toBe('player');
        });

        it('should return undefined by default', () => {
            const context: SurpriseContext = {};
            expect(determineSurprise(context)).toBeUndefined();
        });
    });

    describe('markCombatantsSurprised', () => {
        const mockInitiativeOrder: Combatant[] = [
            {
                id: 'player-1',
                characterName: 'Player',
                total: 20,
                type: 'player',
                controlledBy: 'Player',
            },
            {
                id: 'enemy-1',
                characterName: 'Goblin 1',
                total: 15,
                type: 'npc',
                controlledBy: 'AI',
            },
            {
                id: 'player-2',
                characterName: 'Companion',
                total: 12,
                type: 'player',
                controlledBy: 'Player',
            },
            {
                id: 'enemy-2',
                characterName: 'Goblin 2',
                total: 10,
                type: 'npc',
                controlledBy: 'AI',
            },
        ];

        it('should mark player combatants as surprised when surpriseSide is "player"', () => {
            const result = markCombatantsSurprised(mockInitiativeOrder, 'player');
            
            // Players should NOT be surprised (player side surprises)
            expect(result[0].isSurprised).toBeUndefined(); // Player
            expect(result[2].isSurprised).toBeUndefined(); // Companion (Player)
            
            // Enemies SHOULD be surprised
            expect(result[1].isSurprised).toBe(true); // Goblin 1
            expect(result[3].isSurprised).toBe(true); // Goblin 2
        });

        it('should mark AI combatants as surprised when surpriseSide is "enemy"', () => {
            const result = markCombatantsSurprised(mockInitiativeOrder, 'enemy');
            
            // Players SHOULD be surprised (enemy side surprises)
            expect(result[0].isSurprised).toBe(true); // Player
            expect(result[2].isSurprised).toBe(true); // Companion (Player)
            
            // Enemies should NOT be surprised
            expect(result[1].isSurprised).toBeUndefined(); // Goblin 1
            expect(result[3].isSurprised).toBeUndefined(); // Goblin 2
        });

        it('should not modify other combatant properties', () => {
            const result = markCombatantsSurprised(mockInitiativeOrder, 'player');
            
            expect(result[0].id).toBe('player-1');
            expect(result[0].characterName).toBe('Player');
            expect(result[0].total).toBe(20);
            expect(result[0].controlledBy).toBe('Player');
        });

        it('should return same array if surpriseSide is undefined', () => {
            const result = markCombatantsSurprised(mockInitiativeOrder, undefined as any);
            // All should have undefined isSurprised
            result.forEach(c => {
                expect(c.isSurprised).toBeUndefined();
            });
        });
    });

    describe('clearSurpriseFlag', () => {
        it('should set isSurprised to false', () => {
            const combatant: Combatant = {
                id: 'player-1',
                characterName: 'Player',
                total: 20,
                type: 'player',
                controlledBy: 'Player',
                isSurprised: true,
            };
            const result = clearSurpriseFlag(combatant);
            expect(result.isSurprised).toBe(false);
        });

        it('should preserve other combatant properties', () => {
            const combatant: Combatant = {
                id: 'player-1',
                characterName: 'Player',
                total: 20,
                type: 'player',
                controlledBy: 'Player',
                isSurprised: true,
            };
            const result = clearSurpriseFlag(combatant);
            expect(result.id).toBe('player-1');
            expect(result.characterName).toBe('Player');
            expect(result.total).toBe(20);
            expect(result.type).toBe('player');
            expect(result.controlledBy).toBe('Player');
        });

        it('should work even if isSurprised is undefined', () => {
            const combatant: Combatant = {
                id: 'player-1',
                characterName: 'Player',
                total: 20,
                type: 'player',
                controlledBy: 'Player',
            };
            const result = clearSurpriseFlag(combatant);
            expect(result.isSurprised).toBe(false);
        });
    });

    describe('isSurprised', () => {
        it('should return true if combatant.isSurprised is true', () => {
            const combatant: Combatant = {
                id: 'player-1',
                characterName: 'Player',
                total: 20,
                type: 'player',
                controlledBy: 'Player',
                isSurprised: true,
            };
            expect(isSurprised(combatant)).toBe(true);
        });

        it('should return false if combatant.isSurprised is false', () => {
            const combatant: Combatant = {
                id: 'player-1',
                characterName: 'Player',
                total: 20,
                type: 'player',
                controlledBy: 'Player',
                isSurprised: false,
            };
            expect(isSurprised(combatant)).toBe(false);
        });

        it('should return false if combatant.isSurprised is undefined', () => {
            const combatant: Combatant = {
                id: 'player-1',
                characterName: 'Player',
                total: 20,
                type: 'player',
                controlledBy: 'Player',
            };
            expect(isSurprised(combatant)).toBe(false);
        });
    });

    describe('SurpriseManager class', () => {
        it('should expose all functions as static methods', () => {
            expect(SurpriseManager.determineSurprise).toBe(determineSurprise);
            expect(SurpriseManager.markCombatantsSurprised).toBe(markCombatantsSurprised);
            expect(SurpriseManager.clearSurpriseFlag).toBe(clearSurpriseFlag);
            expect(SurpriseManager.isSurprised).toBe(isSurprised);
        });
    });
});

