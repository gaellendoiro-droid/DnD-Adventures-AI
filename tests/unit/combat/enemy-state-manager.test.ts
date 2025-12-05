import { describe, it, expect } from 'vitest';
import {
    EnemyStateManager,
    getEnemiesForLocation,
    revealHiddenEnemy,
    filterVisibleEnemies,
    normalizeEnemyStats,
    filterAliveEnemies,
} from '../../../src/lib/game/enemy-state-manager';

describe('EnemyStateManager', () => {
    describe('getEnemiesForLocation', () => {
        it('should return enemies from enemiesByLocation if available', () => {
            const enemiesByLocation = {
                'location-1': [{ id: 'enemy-1', name: 'Goblin' }],
                'location-2': [{ id: 'enemy-2', name: 'Orc' }],
            };
            const result = getEnemiesForLocation('location-1', enemiesByLocation);
            expect(result).toEqual([{ id: 'enemy-1', name: 'Goblin' }]);
        });

        it('should fallback to fallbackEnemies if location not in map', () => {
            const enemiesByLocation = {
                'location-1': [{ id: 'enemy-1', name: 'Goblin' }],
            };
            const fallbackEnemies = [{ id: 'enemy-2', name: 'Orc' }];
            const result = getEnemiesForLocation('location-2', enemiesByLocation, fallbackEnemies);
            expect(result).toEqual([{ id: 'enemy-2', name: 'Orc' }]);
        });

        it('should return empty array if no enemies found', () => {
            const result = getEnemiesForLocation('location-unknown');
            expect(result).toEqual([]);
        });

        it('should prioritize enemiesByLocation over fallbackEnemies', () => {
            const enemiesByLocation = {
                'location-1': [{ id: 'enemy-1', name: 'Goblin' }],
            };
            const fallbackEnemies = [{ id: 'enemy-2', name: 'Orc' }];
            const result = getEnemiesForLocation('location-1', enemiesByLocation, fallbackEnemies);
            expect(result).toEqual([{ id: 'enemy-1', name: 'Goblin' }]);
        });
    });

    describe('revealHiddenEnemy', () => {
        it('should change disposition from hidden to hostile', () => {
            const hiddenEnemy = {
                id: 'mimic-1',
                name: 'Mimic',
                disposition: 'hidden',
                status: 'hidden',
            };
            const result = revealHiddenEnemy(hiddenEnemy);
            expect(result.disposition).toBe('hostile');
        });

        it('should change status from hidden to active', () => {
            const hiddenEnemy = {
                id: 'mimic-1',
                name: 'Mimic',
                disposition: 'hidden',
                status: 'hidden',
            };
            const result = revealHiddenEnemy(hiddenEnemy);
            expect(result.status).toBe('active');
        });

        it('should preserve other enemy properties', () => {
            const hiddenEnemy = {
                id: 'mimic-1',
                name: 'Mimic',
                disposition: 'hidden',
                status: 'hidden',
                hp: { current: 58, max: 58 },
                ac: 12,
            };
            const result = revealHiddenEnemy(hiddenEnemy);
            expect(result.id).toBe('mimic-1');
            expect(result.name).toBe('Mimic');
            expect(result.hp).toEqual({ current: 58, max: 58 });
            expect(result.ac).toBe(12);
        });
    });

    describe('filterVisibleEnemies', () => {
        it('should exclude enemies with disposition: hidden', () => {
            const enemies = [
                { id: 'enemy-1', name: 'Goblin', disposition: 'hostile' },
                { id: 'enemy-2', name: 'Mimic', disposition: 'hidden' },
                { id: 'enemy-3', name: 'Orc', disposition: 'hostile' },
            ];
            const result = filterVisibleEnemies(enemies);
            expect(result).toHaveLength(2);
            expect(result.map(e => e.id)).toEqual(['enemy-1', 'enemy-3']);
        });

        it('should exclude enemies with status: hidden', () => {
            const enemies = [
                { id: 'enemy-1', name: 'Goblin', status: 'active' },
                { id: 'enemy-2', name: 'Mimic', status: 'hidden' },
                { id: 'enemy-3', name: 'Orc', status: 'active' },
            ];
            const result = filterVisibleEnemies(enemies);
            expect(result).toHaveLength(2);
            expect(result.map(e => e.id)).toEqual(['enemy-1', 'enemy-3']);
        });

        it('should include enemies with disposition: hostile', () => {
            const enemies = [
                { id: 'enemy-1', name: 'Goblin', disposition: 'hostile' },
                { id: 'enemy-2', name: 'Orc', disposition: 'hostile' },
            ];
            const result = filterVisibleEnemies(enemies);
            expect(result).toHaveLength(2);
        });

        it('should exclude enemies with both hidden disposition and status', () => {
            const enemies = [
                { id: 'enemy-1', name: 'Goblin', disposition: 'hostile', status: 'active' },
                { id: 'enemy-2', name: 'Mimic', disposition: 'hidden', status: 'hidden' },
            ];
            const result = filterVisibleEnemies(enemies);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('enemy-1');
        });
    });

    describe('normalizeEnemyStats', () => {
        it('should convert stats.hp to hp: { current, max }', () => {
            const enemy = {
                id: 'enemy-1',
                name: 'Goblin',
                stats: { hp: 58, ac: 12 },
            };
            const result = normalizeEnemyStats(enemy);
            expect(result.hp).toEqual({ current: 58, max: 58 });
            expect(result.ac).toBe(12);
        });

        it('should preserve ac from stats.ac', () => {
            const enemy = {
                id: 'enemy-1',
                name: 'Goblin',
                stats: { hp: 58, ac: 15 },
            };
            const result = normalizeEnemyStats(enemy);
            expect(result.ac).toBe(15);
        });

        it('should not modify already normalized enemies', () => {
            const enemy = {
                id: 'enemy-1',
                name: 'Goblin',
                hp: { current: 58, max: 58 },
                ac: 12,
            };
            const result = normalizeEnemyStats(enemy);
            expect(result).toEqual(enemy);
        });

        it('should handle enemies with hp as number', () => {
            const enemy = {
                id: 'enemy-1',
                name: 'Goblin',
                hp: 58,
            };
            const result = normalizeEnemyStats(enemy);
            expect(result.hp).toEqual({ current: 58, max: 58 });
        });

        it('should add default hp if missing', () => {
            const enemy = {
                id: 'enemy-1',
                name: 'Goblin',
            };
            const result = normalizeEnemyStats(enemy);
            expect(result.hp).toEqual({ current: 10, max: 10 });
        });

        it('should handle invalid hp values gracefully', () => {
            const enemy = {
                id: 'enemy-1',
                name: 'Goblin',
                stats: { hp: 'invalid', ac: 12 },
            };
            const result = normalizeEnemyStats(enemy);
            expect(result.hp).toEqual({ current: 10, max: 10 });
        });
    });

    describe('filterAliveEnemies', () => {
        it('should exclude enemies with hp.current <= 0', () => {
            const enemies = [
                { id: 'enemy-1', name: 'Goblin', hp: { current: 10, max: 10 } },
                { id: 'enemy-2', name: 'Orc', hp: { current: 0, max: 20 } },
                { id: 'enemy-3', name: 'Troll', hp: { current: 5, max: 30 } },
            ];
            const result = filterAliveEnemies(enemies);
            expect(result).toHaveLength(2);
            expect(result.map(e => e.id)).toEqual(['enemy-1', 'enemy-3']);
        });

        it('should include enemies with hp.current > 0', () => {
            const enemies = [
                { id: 'enemy-1', name: 'Goblin', hp: { current: 1, max: 10 } },
                { id: 'enemy-2', name: 'Orc', hp: { current: 20, max: 20 } },
            ];
            const result = filterAliveEnemies(enemies);
            expect(result).toHaveLength(2);
        });

        it('should handle hp as number', () => {
            const enemies = [
                { id: 'enemy-1', name: 'Goblin', hp: 10 },
                { id: 'enemy-2', name: 'Orc', hp: 0 },
            ];
            const result = filterAliveEnemies(enemies);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('enemy-1');
        });

        it('should assume alive if no hp info (safety)', () => {
            const enemies = [
                { id: 'enemy-1', name: 'Goblin' }, // No hp info - assumed alive
                { id: 'enemy-2', name: 'Orc', hp: { current: 0, max: 20 } }, // Dead - filtered
                { id: 'enemy-3', name: 'Troll' }, // No hp info - assumed alive
            ];
            const result = filterAliveEnemies(enemies);
            expect(result).toHaveLength(2); // enemy-1 and enemy-3 assumed alive, enemy-2 filtered
            expect(result.map(e => e.id)).toEqual(['enemy-1', 'enemy-3']);
        });
    });

    describe('EnemyStateManager class', () => {
        it('should expose all functions as static methods', () => {
            expect(EnemyStateManager.getEnemiesForLocation).toBe(getEnemiesForLocation);
            expect(EnemyStateManager.revealHiddenEnemy).toBe(revealHiddenEnemy);
            expect(EnemyStateManager.filterVisibleEnemies).toBe(filterVisibleEnemies);
            expect(EnemyStateManager.normalizeEnemyStats).toBe(normalizeEnemyStats);
            expect(EnemyStateManager.filterAliveEnemies).toBe(filterAliveEnemies);
        });
    });
});

