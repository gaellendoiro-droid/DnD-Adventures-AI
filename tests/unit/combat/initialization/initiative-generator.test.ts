import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InitiativeGenerator } from '../../../../src/lib/combat/initialization/initiative-generator';
import { generateDifferentiatedNames } from '../../../../src/lib/combat/monster-name-manager';

vi.mock('../../../../src/lib/combat/monster-name-manager', () => ({
    generateDifferentiatedNames: vi.fn(() => new Map()),
    getVisualName: vi.fn((id, order, enemies) => {
        const enemy = enemies.find((e: any) => e.uniqueId === id);
        return enemy ? enemy.name : id;
    })
}));

describe('InitiativeGenerator', () => {
    const mockDiceRoller = vi.fn();
    const mockLocalLog = vi.fn();

    const basePlayer = {
        id: 'player-1',
        name: 'Hero',
        entityType: 'player',
        controlledBy: 'Player',
        abilityModifiers: { destreza: 2 }
    };

    const baseEnemy = {
        uniqueId: 'goblin-1',
        id: 'goblin-1',
        name: 'Goblin',
        hp: { current: 8, max: 8 },
        ac: 12
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const buildValidCombatants = () => ([
        basePlayer,
        { id: 'goblin-1', name: 'Goblin', entityType: 'monster', controlledBy: 'AI' }
    ]);

    it('should roll initiative for all combatants', async () => {
        mockDiceRoller.mockResolvedValue({ totalResult: 10 });

        const { initiativeRolls, initiativeDiceRolls } = await InitiativeGenerator.generateInitiativeRolls(
            buildValidCombatants(),
            [baseEnemy] as any,
            mockDiceRoller,
            mockLocalLog
        );

        expect(initiativeRolls).toHaveLength(2);
        expect(initiativeDiceRolls).toHaveLength(2);
        expect(mockDiceRoller).toHaveBeenCalledTimes(2);
    });

    it('should sort combatants by initiative total (descending)', async () => {
        mockDiceRoller
            .mockResolvedValueOnce({ totalResult: 15 })
            .mockResolvedValueOnce({ totalResult: 20 });

        const { initiativeRolls, differentiatedNames } = await InitiativeGenerator.generateInitiativeRolls(
            buildValidCombatants(),
            [baseEnemy] as any,
            mockDiceRoller,
            mockLocalLog
        );

        const initiativeOrder = InitiativeGenerator.createInitiativeOrder(
            initiativeRolls,
            differentiatedNames,
            mockLocalLog
        );

        expect(initiativeOrder[0].id).toBe('goblin-1');
        expect(initiativeOrder[1].id).toBe('player-1');
    });

    it('should handle dexterity tie-breaking', async () => {
        const speedyPlayer = {
            ...basePlayer,
            abilityModifiers: { destreza: 4 }
        };

        mockDiceRoller.mockResolvedValue({ totalResult: 15 });

        const { initiativeRolls, differentiatedNames } = await InitiativeGenerator.generateInitiativeRolls(
            [
                speedyPlayer,
                { id: 'goblin-1', name: 'Goblin', entityType: 'monster', controlledBy: 'AI' }
            ],
            [baseEnemy] as any,
            mockDiceRoller,
            mockLocalLog
        );

        const initiativeOrder = InitiativeGenerator.createInitiativeOrder(
            initiativeRolls,
            differentiatedNames,
            mockLocalLog
        );

        expect(initiativeOrder[0].id).toBe('player-1');
        expect(initiativeOrder[1].id).toBe('goblin-1');
    });

    it('should generate differentiated names for enemies', async () => {
        const enemies = [
            baseEnemy,
            { ...baseEnemy, uniqueId: 'goblin-2', id: 'goblin-2' }
        ];

        (generateDifferentiatedNames as any).mockReturnValue(new Map([
            ['goblin-1', 'Goblin 1'],
            ['goblin-2', 'Goblin 2']
        ]));

        mockDiceRoller.mockResolvedValue({ totalResult: 10 });

        const { differentiatedNames } = await InitiativeGenerator.generateInitiativeRolls(
            [
                basePlayer,
                { id: 'goblin-1', name: 'Goblin', entityType: 'monster', controlledBy: 'AI' },
                { id: 'goblin-2', name: 'Goblin', entityType: 'monster', controlledBy: 'AI' }
            ],
            enemies as any,
            mockDiceRoller,
            mockLocalLog
        );

        expect(generateDifferentiatedNames).toHaveBeenCalledWith(enemies);
        expect(differentiatedNames.get('goblin-1')).toBe('Goblin 1');
        expect(differentiatedNames.get('goblin-2')).toBe('Goblin 2');
    });
});
