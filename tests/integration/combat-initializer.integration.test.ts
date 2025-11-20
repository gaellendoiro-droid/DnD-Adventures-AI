process.env.GOOGLE_API_KEY = 'dummy';

import { combatManagerTool } from '../../src/ai/tools/combat-manager';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/ai/tools/dice-roller', () => ({
    diceRollerTool: vi.fn().mockResolvedValue({
        totalResult: 15,
        outcome: 'success',
        rollNotation: '1d20',
        individualRolls: [{ result: 15 }]
    })
}));

vi.mock('../../src/ai/flows/narrative-manager', () => ({
    narrativeExpert: vi.fn().mockResolvedValue({
        dmNarration: 'Narración de inicio de combate.',
        debugLogs: []
    })
}));

vi.mock('../../src/ai/tools/enemy-tactician', () => ({
    enemyTacticianTool: vi.fn().mockResolvedValue({
        narration: 'El enemigo se mueve.',
        targetId: 'player-1',
        diceRolls: []
    })
}));

vi.mock('../../src/ai/tools/companion-tactician', () => ({
    companionTacticianTool: vi.fn().mockResolvedValue({
        narration: 'El compañero se prepara.',
        targetId: 'enemy-1',
        diceRolls: []
    })
}));

vi.mock('../../src/app/game-state-actions', () => ({
    getAdventureData: vi.fn().mockResolvedValue({
        entities: [
            { id: 'goblin-1', name: 'Goblin', hp: 10, ac: 12 },
            { id: 'orc-1', name: 'Orc', hp: 15, ac: 13 }
        ]
    })
}));

vi.mock('../../src/lib/combat/monster-stats-parser', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as any),
        getMonsterStatsFromDndApi: vi.fn().mockResolvedValue({ hp: 10, ac: 12 })
    };
});

describe('CombatInitializer Integration', () => {
    const mockParty = [
        {
            id: 'player-1',
            name: 'Heroe',
            race: 'Humano',
            characterClass: 'Guerrero',
            level: 1,
            sex: 'M',
            background: 'Soldado',
            color: '#0000ff',
            personality: 'Valiente',
            abilityScores: { fuerza: 16, destreza: 14, constitucion: 14, inteligencia: 10, sabiduria: 10, carisma: 12 },
            abilityModifiers: { fuerza: 3, destreza: 2, constitucion: 2, inteligencia: 0, sabiduria: 0, carisma: 1 },
            skills: [],
            hp: { current: 20, max: 20 },
            ac: 16,
            controlledBy: 'Player',
            inventory: [],
            spells: [],
            proficiencyBonus: 2,
            savingThrows: { fuerza: 3, destreza: 2, constitucion: 2, inteligencia: 0, sabiduria: 0, carisma: 1 }
        }
    ];

    it('should initialize combat correctly', async () => {
        const input = {
            playerAction: 'Ataco a los enemigos',
            inCombat: false,
            locationId: 'loc-1',
            interpretedAction: {
                actionType: 'initiate_combat',
                target: 'goblin-1'
            },
            locationContext: { description: 'Arena' },
            conversationHistory: [],
            combatantIds: ['player-1', 'goblin-1'],
            party: mockParty,
            enemies: [],
            turnIndex: undefined
        };

        // @ts-ignore
        const result = await combatManagerTool(input);

        expect(result.inCombat).toBe(true);
        expect(result.initiativeOrder?.length).toBe(2);
        expect(result.enemies?.length).toBe(1);
        expect(result.messages.length).toBeGreaterThan(0);
    });
});
