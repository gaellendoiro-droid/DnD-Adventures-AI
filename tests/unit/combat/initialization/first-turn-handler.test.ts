import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirstTurnHandler } from '../../../../src/lib/combat/initialization/first-turn-handler';
import { CombatTurnManager } from '../../../../src/lib/combat/turn-manager';

vi.mock('../../../../src/lib/combat/turn-manager', () => ({
    CombatTurnManager: {
        hasMoreAITurns: vi.fn(),
        shouldSkipTurn: vi.fn(),
        nextTurnIndex: vi.fn((curr, len) => (curr + 1) % len)
    }
}));

vi.mock('../../../../src/lib/combat/monster-name-manager', () => ({
    getVisualName: vi.fn((id) => id),
    replaceOrdinalReferences: vi.fn((text) => text),
    escapeRegex: vi.fn((str) => str)
}));

vi.mock('../../../../src/lib/combat/target-resolver', () => ({
    resolveEnemyId: vi.fn().mockReturnValue({ uniqueId: 'player-1', ambiguous: false })
}));

vi.mock('../../../../src/lib/combat/rules-engine', () => ({
    getHpStatus: vi.fn(),
    checkEndOfCombat: vi.fn().mockReturnValue({ combatEnded: false })
}));

vi.mock('../../../../src/lib/logger', () => ({
    log: {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }
}));

describe('FirstTurnHandler', () => {
    const mockProcessAICombatantRolls = vi.fn();
    const mockEnemyTacticianTool = vi.fn();
    const mockCompanionTacticianTool = vi.fn();
    const mockLocalLog = vi.fn();
    const mockDiceRoller = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('processes the first AI turn when combat starts with an enemy', async () => {
        const initiativeOrder = [
            { id: 'goblin-1', controlledBy: 'AI', characterName: 'Goblin 1' },
            { id: 'player-1', controlledBy: 'Player', characterName: 'Hero' }
        ];
        const enemies = [{ uniqueId: 'goblin-1', name: 'Goblin', hp: { current: 10, max: 10 }, ac: 12 }];
        const party = [{ id: 'player-1', name: 'Hero', hp: { current: 20, max: 20 }, controlledBy: 'Player' }];

        mockEnemyTacticianTool.mockResolvedValue({
            narration: 'El goblin-1 ataca.',
            targetId: 'player-1',
            diceRolls: [{ rollNotation: '1d20+4', description: 'Ataque' }]
        });

        mockProcessAICombatantRolls.mockResolvedValue({
            diceRolls: [],
            messages: [],
            updatedParty: party,
            updatedEnemies: enemies,
            combatEnded: false
        });

        (CombatTurnManager.hasMoreAITurns as any).mockReturnValue(false);
        (CombatTurnManager.shouldSkipTurn as any).mockReturnValue(false);

        const result = await FirstTurnHandler.processFirstAITurn({
            newInitiativeOrder: initiativeOrder as any,
            updatedParty: party as any,
            updatedEnemies: enemies as any,
            differentiatedNames: new Map([['goblin-1', 'Goblin 1']]),
            locationContext: {},
            conversationHistory: [],
            diceRollerTool: mockDiceRoller,
            processAICombatantRolls: mockProcessAICombatantRolls,
            enemyTacticianTool: mockEnemyTacticianTool,
            companionTacticianTool: mockCompanionTacticianTool,
            createCombatEndDiceRoll: vi.fn(),
            localLog: mockLocalLog
        });

        expect(result).not.toBeNull();
        expect(result?.firstTurnData.turnIndex).toBe(1);
        expect(result?.firstTurnData.lastProcessedTurnWasAI).toBe(true);
        expect(mockEnemyTacticianTool).toHaveBeenCalled();
        expect(mockProcessAICombatantRolls).toHaveBeenCalled();
    });

    it('returns null when the player takes the first turn', async () => {
        const initiativeOrder = [
            { id: 'player-1', controlledBy: 'Player' },
            { id: 'goblin-1', controlledBy: 'AI' }
        ];

        const result = await FirstTurnHandler.processFirstAITurn({
            newInitiativeOrder: initiativeOrder as any,
            updatedParty: [],
            updatedEnemies: [],
            differentiatedNames: new Map(),
            locationContext: {},
            conversationHistory: [],
            diceRollerTool: mockDiceRoller,
            processAICombatantRolls: mockProcessAICombatantRolls,
            enemyTacticianTool: mockEnemyTacticianTool,
            companionTacticianTool: mockCompanionTacticianTool,
            createCombatEndDiceRoll: vi.fn(),
            localLog: mockLocalLog
        });

        expect(result).toBeNull();
    });
});
