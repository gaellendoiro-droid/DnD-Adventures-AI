import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    ExplorationContextBuilder,
    ExplorationContextInput,
} from '@/ai/flows/managers/exploration-context-builder';
import { ExplorationManager } from '@/ai/flows/managers/exploration-manager';
import type { GameState, Character } from '@/lib/types';

// Mock ExplorationManager
vi.mock('@/ai/flows/managers/exploration-manager', () => ({
    ExplorationManager: {
        updateExplorationState: vi.fn(),
        checkPassivePerception: vi.fn(),
        markHazardsAsDiscovered: vi.fn(),
    },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
    log: {
        gameCoordinator: vi.fn(),
    },
}));

describe('ExplorationContextBuilder', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createMockGameState = (overrides?: Partial<GameState>): GameState => ({
        playerAction: '',
        party: [],
        locationId: 'loc-1',
        inCombat: false,
        conversationHistory: [],
        exploration: {
            knownLocations: {
                'loc-1': {
                    status: 'unknown',
                    discoveredAt: 0,
                },
            },
        },
        ...overrides,
    });

    const createMockLocation = (overrides?: any) => ({
        id: 'loc-1',
        name: 'Test Location',
        description: 'A test location',
        explorationMode: 'safe',
        lightLevel: 'bright',
        connections: [],
        entitiesPresent: [],
        hazards: [],
        ...overrides,
    });

    const createMockParty = (): Character[] => [
        {
            id: 'char-1',
            name: 'Test Character',
            stats: {
                perception: 12,
            },
        } as Character,
    ];

    describe('build', () => {
        describe('exploration state updates', () => {
            it('should update exploration state with visited location', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation();
                const party = createMockParty();

                const updatedGameState = {
                    ...gameState,
                    exploration: {
                        ...gameState.exploration!,
                        knownLocations: {
                            'loc-1': {
                                status: 'visited',
                                discoveredAt: 1000,
                            },
                        },
                    },
                };

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(updatedGameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData: { locations: [], entities: [] },
                };

                const result = ExplorationContextBuilder.build(input);

                expect(ExplorationManager.updateExplorationState).toHaveBeenCalledWith(
                    gameState,
                    locationData,
                    expect.any(Number)
                );
                expect(result.updatedGameState).toEqual(updatedGameState);
            });

            it('should capture previous visit state before updating', () => {
                const gameState = createMockGameState({
                    exploration: {
                        knownLocations: {
                            'loc-1': {
                                status: 'seen',
                                discoveredAt: 500,
                            },
                        },
                    },
                });
                const locationData = createMockLocation();
                const party = createMockParty();

                const updatedGameState = {
                    ...gameState,
                    exploration: {
                        ...gameState.exploration!,
                        knownLocations: {
                            'loc-1': {
                                status: 'visited',
                                discoveredAt: 1000,
                            },
                        },
                    },
                };

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(updatedGameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData: { locations: [], entities: [] },
                };

                const result = ExplorationContextBuilder.build(input);

                expect(result.context.visitState).toBe('seen'); // Previous state, not 'visited'
            });

            it('should use default visit state if location not in exploration state', () => {
                const gameState = createMockGameState({
                    exploration: {
                        knownLocations: {},
                    },
                });
                const locationData = createMockLocation();
                const party = createMockParty();

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData: { locations: [], entities: [] },
                };

                const result = ExplorationContextBuilder.build(input);

                expect(result.context.visitState).toBe('unknown');
            });
        });

        describe('hazard detection', () => {
            it('should detect hazards using passive perception', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation();
                const party = createMockParty();

                const detectedHazards = [
                    { id: 'hazard-1', type: 'trap', detectionDC: 15 },
                    { id: 'hazard-2', type: 'trap', detectionDC: 10 },
                ];

                const updatedGameState = {
                    ...gameState,
                    exploration: {
                        ...gameState.exploration!,
                        knownLocations: {
                            'loc-1': {
                                status: 'visited',
                                discoveredAt: 1000,
                                discoveredHazards: ['hazard-1', 'hazard-2'],
                            },
                        },
                    },
                };

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue(detectedHazards);
                vi.mocked(ExplorationManager.markHazardsAsDiscovered).mockReturnValue(updatedGameState);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData: { locations: [], entities: [] },
                };

                const result = ExplorationContextBuilder.build(input);

                expect(ExplorationManager.checkPassivePerception).toHaveBeenCalledWith(
                    gameState,
                    locationData,
                    party
                );
                expect(result.detectedHazards).toEqual(detectedHazards);
                expect(result.context.detectedHazards).toEqual(detectedHazards);
            });

            it('should mark hazards as discovered when detected', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation();
                const party = createMockParty();

                const detectedHazards = [{ id: 'hazard-1', type: 'trap' }];
                const updatedGameState = {
                    ...gameState,
                    exploration: {
                        ...gameState.exploration!,
                        knownLocations: {
                            'loc-1': {
                                status: 'visited',
                                discoveredAt: 1000,
                                discoveredHazards: ['hazard-1'],
                            },
                        },
                    },
                };

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue(detectedHazards);
                vi.mocked(ExplorationManager.markHazardsAsDiscovered).mockReturnValue(updatedGameState);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData: { locations: [], entities: [] },
                };

                const result = ExplorationContextBuilder.build(input);

                expect(ExplorationManager.markHazardsAsDiscovered).toHaveBeenCalledWith(
                    gameState,
                    'loc-1',
                    detectedHazards
                );
                expect(result.updatedGameState).toEqual(updatedGameState);
            });

            it('should not mark hazards if none detected', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation();
                const party = createMockParty();

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData: { locations: [], entities: [] },
                };

                ExplorationContextBuilder.build(input);

                expect(ExplorationManager.markHazardsAsDiscovered).not.toHaveBeenCalled();
            });
        });

        describe('visible connections', () => {
            it('should calculate visible connections', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation({
                    connections: [
                        { direction: 'norte', targetId: 'loc-2', visibility: 'open' },
                        { direction: 'sur', targetId: 'loc-3', visibility: 'hidden' },
                    ],
                });
                const party = createMockParty();
                const adventureData = {
                    locations: [
                        { id: 'loc-2', description: 'North location description' },
                        { id: 'loc-3', description: 'South location description' },
                    ],
                    entities: [],
                };

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData,
                };

                const result = ExplorationContextBuilder.build(input);

                expect(result.context.visibleConnections).toHaveLength(1);
                expect(result.context.visibleConnections[0]).toContain('norte');
                expect(result.context.visibleConnections[0]).toContain('North location');
            });

            it('should exclude connection we came from', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation({
                    connections: [
                        { direction: 'norte', targetId: 'loc-2', visibility: 'open' },
                        { direction: 'sur', targetId: 'loc-0', visibility: 'open' },
                    ],
                });
                const party = createMockParty();
                const adventureData = {
                    locations: [
                        { id: 'loc-2', description: 'North location' },
                        { id: 'loc-0', description: 'South location (where we came from)' },
                    ],
                    entities: [],
                };

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData,
                    cameFromLocationId: 'loc-0',
                };

                const result = ExplorationContextBuilder.build(input);

                expect(result.context.visibleConnections).toHaveLength(1);
                expect(result.context.visibleConnections[0]).toContain('norte');
                expect(result.context.visibleConnections[0]).not.toContain('sur');
            });

            it('should include connections with open doors', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation({
                    connections: [
                        { direction: 'norte', targetId: 'loc-2', visibility: 'hidden' },
                    ],
                });
                const party = createMockParty();
                const adventureData = {
                    locations: [
                        { id: 'loc-2', description: 'North location' },
                    ],
                    entities: [],
                };
                const openDoors = {
                    'loc-1:norte': true,
                };

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData,
                    openDoors,
                };

                const result = ExplorationContextBuilder.build(input);

                expect(result.context.visibleConnections).toHaveLength(1);
                expect(result.context.visibleConnections[0]).toContain('norte');
            });

            it('should handle locations without connections', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation({
                    connections: undefined,
                });
                const party = createMockParty();

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData: { locations: [], entities: [] },
                };

                const result = ExplorationContextBuilder.build(input);

                expect(result.context.visibleConnections).toEqual([]);
            });
        });

        describe('entity resolution', () => {
            it('should resolve present entities from adventure data', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation({
                    entitiesPresent: ['entity-1', 'entity-2'],
                });
                const party = createMockParty();
                const adventureData = {
                    locations: [],
                    entities: [
                        { id: 'entity-1', name: 'Entity 1', type: 'npc' },
                        { id: 'entity-2', name: 'Entity 2', type: 'enemy' },
                    ],
                };

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData,
                };

                const result = ExplorationContextBuilder.build(input);

                expect(result.context.presentEntities).toHaveLength(2);
                expect(result.context.presentEntities[0].id).toBe('entity-1');
                expect(result.context.presentEntities[1].id).toBe('entity-2');
            });

            it('should filter out entities not found in adventure data', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation({
                    entitiesPresent: ['entity-1', 'entity-unknown'],
                });
                const party = createMockParty();
                const adventureData = {
                    locations: [],
                    entities: [
                        { id: 'entity-1', name: 'Entity 1' },
                    ],
                };

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData,
                };

                const result = ExplorationContextBuilder.build(input);

                expect(result.context.presentEntities).toHaveLength(1);
                expect(result.context.presentEntities[0].id).toBe('entity-1');
            });

            it('should handle locations without entities', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation({
                    entitiesPresent: undefined,
                });
                const party = createMockParty();

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData: { locations: [], entities: [] },
                };

                const result = ExplorationContextBuilder.build(input);

                expect(result.context.presentEntities).toEqual([]);
            });
        });

        describe('context properties', () => {
            it('should set correct mode from location data', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation({
                    explorationMode: 'dungeon',
                });
                const party = createMockParty();

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData: { locations: [], entities: [] },
                };

                const result = ExplorationContextBuilder.build(input);

                expect(result.context.mode).toBe('dungeon');
            });

            it('should default to safe mode if not specified', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation({
                    explorationMode: undefined,
                });
                const party = createMockParty();

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData: { locations: [], entities: [] },
                };

                const result = ExplorationContextBuilder.build(input);

                expect(result.context.mode).toBe('safe');
            });

            it('should set correct light level from location data', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation({
                    lightLevel: 'dim',
                });
                const party = createMockParty();

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData: { locations: [], entities: [] },
                };

                const result = ExplorationContextBuilder.build(input);

                expect(result.context.lightLevel).toBe('dim');
            });

            it('should default to bright light level if not specified', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation({
                    lightLevel: undefined,
                });
                const party = createMockParty();

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData: { locations: [], entities: [] },
                };

                const result = ExplorationContextBuilder.build(input);

                expect(result.context.lightLevel).toBe('bright');
            });
        });

        describe('time calculation', () => {
            it('should calculate timestamp from worldTime', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation();
                const party = createMockParty();
                const worldTime = { day: 2, hour: 14, minute: 30 };

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData: { locations: [], entities: [] },
                    worldTime,
                };

                ExplorationContextBuilder.build(input);

                const expectedMinutes = 2 * 1440 + 14 * 60 + 30; // 3330 minutes
                expect(ExplorationManager.updateExplorationState).toHaveBeenCalledWith(
                    gameState,
                    locationData,
                    expectedMinutes
                );
            });

            it('should use initialWorldTime if worldTime not provided', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation();
                const party = createMockParty();
                const initialWorldTime = { day: 1, hour: 8, minute: 0 };

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData: { locations: [], entities: [] },
                    initialWorldTime,
                };

                ExplorationContextBuilder.build(input);

                const expectedMinutes = 1 * 1440 + 8 * 60 + 0; // 960 minutes
                expect(ExplorationManager.updateExplorationState).toHaveBeenCalledWith(
                    gameState,
                    locationData,
                    expectedMinutes
                );
            });

            it('should use default time if neither worldTime nor initialWorldTime provided', () => {
                const gameState = createMockGameState();
                const locationData = createMockLocation();
                const party = createMockParty();

                vi.mocked(ExplorationManager.updateExplorationState).mockReturnValue(gameState);
                vi.mocked(ExplorationManager.checkPassivePerception).mockReturnValue([]);

                const input: ExplorationContextInput = {
                    gameState,
                    locationData,
                    party,
                    adventureData: { locations: [], entities: [] },
                };

                ExplorationContextBuilder.build(input);

                const expectedMinutes = 1 * 1440 + 480; // Default 8:00 AM day 1
                expect(ExplorationManager.updateExplorationState).toHaveBeenCalledWith(
                    gameState,
                    locationData,
                    expectedMinutes
                );
            });
        });
    });
});

