import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatInitializer } from '../../../src/lib/combat/combat-initializer';
import { EnemyValidator } from '../../../src/lib/combat/initialization/enemy-validator';
import { InitiativeGenerator } from '../../../src/lib/combat/initialization/initiative-generator';
import { NarrationProcessor } from '../../../src/lib/combat/initialization/narration-processor';
import { FirstTurnHandler } from '../../../src/lib/combat/initialization/first-turn-handler';

vi.mock('../../../src/lib/combat/initialization/enemy-validator', () => ({
    EnemyValidator: {
        validateCombatants: vi.fn(),
        fetchAndValidateEnemyStats: vi.fn()
    }
}));
vi.mock('../../../src/lib/combat/initialization/initiative-generator', () => ({
    InitiativeGenerator: {
        generateInitiativeRolls: vi.fn(),
        createInitiativeOrder: vi.fn()
    }
}));
vi.mock('../../../src/lib/combat/initialization/narration-processor', () => ({
    NarrationProcessor: { generateCombatNarration: vi.fn() }
}));
vi.mock('../../../src/lib/combat/initialization/first-turn-handler', () => ({
    FirstTurnHandler: { processFirstAITurn: vi.fn() }
}));

vi.mock('../../../src/lib/logger', () => ({
    log: {
        error: vi.fn()
    }
}));

describe('CombatInitializer', () => {
    const mockLocalLog = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const baseParty = [
        {
            id: 'player-1',
            name: 'Hero',
            race: 'Humano',
            characterClass: 'Guerrero',
            level: 1,
            sex: 'M',
            background: 'Soldado',
            color: '#fff',
            personality: 'Valiente',
            abilityScores: { fuerza: 16, destreza: 12, constitucion: 14, inteligencia: 10, sabiduria: 10, carisma: 12 },
            abilityModifiers: { fuerza: 3, destreza: 1, constitucion: 2, inteligencia: 0, sabiduria: 0, carisma: 1 },
            skills: [],
            hp: { current: 12, max: 12 },
            ac: 16,
            controlledBy: 'Player',
            inventory: [],
            spells: []
        }
    ];

    it('should coordinate initialization steps successfully', async () => {
        (EnemyValidator.validateCombatants as any).mockResolvedValue({
            validCombatants: [
                baseParty[0],
                { id: 'goblin-1', name: 'Goblin', entityType: 'monster', controlledBy: 'AI' }
            ],
            hostileEntities: [{ id: 'goblin-1', name: 'Goblin' }]
        });
        (EnemyValidator.fetchAndValidateEnemyStats as any).mockResolvedValue([
            { uniqueId: 'goblin-1', id: 'goblin-1', name: 'Goblin', hp: { current: 7, max: 7 }, ac: 12 }
        ]);
        (InitiativeGenerator.generateInitiativeRolls as any).mockResolvedValue({
            initiativeRolls: [{ id: 'goblin-1', total: 15 }, { id: 'player-1', total: 12 }],
            initiativeDiceRolls: [],
            differentiatedNames: new Map([['goblin-1', 'Goblin 1']])
        });
        (InitiativeGenerator.createInitiativeOrder as any).mockReturnValue([
            { id: 'goblin-1', characterName: 'Goblin 1', controlledBy: 'AI', type: 'enemy' },
            { id: 'player-1', characterName: 'Hero', controlledBy: 'Player', type: 'ally' }
        ]);
        (NarrationProcessor.generateCombatNarration as any).mockResolvedValue([
            { sender: 'DM', content: '¡Comienza el combate!' }
        ]);
        (FirstTurnHandler.processFirstAITurn as any).mockResolvedValue(null);

        const result = await CombatInitializer.initializeCombat({
            combatantIds: ['goblin-1'],
            party: baseParty as any,
            existingEnemies: [],
            locationContext: {},
            conversationHistory: [],
            playerAction: 'Attack',
            interpretedAction: { actionType: 'initiate_combat' },
            locationId: 'loc-1',
            diceRollerTool: vi.fn(),
            narrativeExpert: vi.fn(),
            markdownToHtml: vi.fn(),
            processAICombatantRolls: vi.fn(),
            enemyTacticianTool: vi.fn(),
            companionTacticianTool: vi.fn(),
            createCombatEndDiceRoll: vi.fn(),
            localLog: mockLocalLog
        });

        expect(result.success).toBe(true);
        expect(EnemyValidator.validateCombatants).toHaveBeenCalled();
        expect(EnemyValidator.fetchAndValidateEnemyStats).toHaveBeenCalled();
        expect(InitiativeGenerator.generateInitiativeRolls).toHaveBeenCalled();
        expect(NarrationProcessor.generateCombatNarration).toHaveBeenCalled();
        expect(FirstTurnHandler.processFirstAITurn).toHaveBeenCalled();
        expect(result.messages).toHaveLength(2);
    });

    it('should return failure if combatant validation fails', async () => {
        (EnemyValidator.validateCombatants as any).mockRejectedValue(new Error('Validation failed'));

        const result = await CombatInitializer.initializeCombat({
            combatantIds: ['goblin-1'],
            party: baseParty as any,
            existingEnemies: [],
            locationContext: {},
            conversationHistory: [],
            playerAction: 'Attack',
            interpretedAction: { actionType: 'initiate_combat' },
            locationId: 'loc-1',
            diceRollerTool: vi.fn(),
            narrativeExpert: vi.fn(),
            markdownToHtml: vi.fn(),
            processAICombatantRolls: vi.fn(),
            enemyTacticianTool: vi.fn(),
            companionTacticianTool: vi.fn(),
            createCombatEndDiceRoll: vi.fn(),
            localLog: mockLocalLog
        });

        expect(result.success).toBe(false);
        expect(result.messages[0].content).toContain('Hubo un error al iniciar el combate');
    });
});
