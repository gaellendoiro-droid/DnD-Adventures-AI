import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnemyValidator } from '../../../../src/lib/combat/initialization/enemy-validator';
import { getAdventureData } from '../../../../src/app/game-state-actions';
import { getMonsterStatsFromDndApi } from '../../../../src/lib/combat/monster-stats-parser';

vi.mock('../../../../src/app/game-state-actions', () => ({
    getAdventureData: vi.fn()
}));

vi.mock('../../../../src/lib/combat/monster-stats-parser', () => ({
    getMonsterStatsFromDndApi: vi.fn(),
    parseHitPoints: vi.fn().mockReturnValue({ current: 10, max: 10 }),
    parseArmorClass: vi.fn().mockReturnValue(12),
    normalizeMonsterName: vi.fn((name) => name.toLowerCase())
}));

vi.mock('../../../../src/lib/logger', () => ({
    log: {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }
}));

describe('EnemyValidator', () => {
    const mockLocalLog = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validateCombatants', () => {
        it('should separate party members and hostile entities', async () => {
            (getAdventureData as any).mockResolvedValue({
                entities: [
                    { id: 'goblin-1', name: 'Goblin', hp: 8, ac: 12 },
                    { id: 'wolf-1', name: 'Wolf', hp: 5, ac: 13 }
                ]
            });

            const party = [
                { id: 'player-1', name: 'Hero', hp: { current: 10, max: 10 }, controlledBy: 'Player' }
            ];

            const result = await EnemyValidator.validateCombatants(
                ['player-1', 'goblin-1', 'wolf-1'],
                party as any,
                [],
                mockLocalLog
            );

            expect(result.validCombatants).toHaveLength(3);
            expect(result.hostileEntities).toHaveLength(2);
            expect(result.hostileEntities.map(e => e.id)).toEqual(['goblin-1', 'wolf-1']);
        });

        it('should skip dead party members and enemies', async () => {
            (getAdventureData as any).mockResolvedValue({
                entities: [{ id: 'goblin-1', name: 'Goblin', hp: 0, ac: 12 }]
            });

            const party = [
                { id: 'player-1', name: 'Hero', hp: { current: 0, max: 10 }, controlledBy: 'Player' }
            ];

            const result = await EnemyValidator.validateCombatants(
                ['player-1', 'goblin-1'],
                party as any,
                [],
                mockLocalLog
            );

            expect(result.validCombatants).toHaveLength(0);
            expect(result.hostileEntities).toHaveLength(0);
        });
    });

    describe('fetchAndValidateEnemyStats', () => {
        it('should reuse provided stats when available', async () => {
            const hostiles = [
                { id: 'goblin-1', name: 'Goblin', hp: 10, ac: 13 }
            ];

            const result = await EnemyValidator.fetchAndValidateEnemyStats(
                hostiles as any,
                mockLocalLog
            );

            expect(result).toHaveLength(1);
            expect(result[0].hp.max).toBe(10);
            expect(result[0].ac).toBe(13);
        });

        it('should fetch missing stats from the D&D API', async () => {
            (getMonsterStatsFromDndApi as any).mockResolvedValue({ hp: 15, ac: 14 });

            const hostiles = [
                { id: 'orc-1', name: 'Orc' }
            ];

            const result = await EnemyValidator.fetchAndValidateEnemyStats(
                hostiles as any,
                mockLocalLog
            );

            expect(getMonsterStatsFromDndApi).toHaveBeenCalledWith('Orc');
            expect(result[0].hp.max).toBe(15);
            expect(result[0].ac).toBe(14);
        });
    });
});
