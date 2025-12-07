import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractionHandler, InteractionInput } from '@/ai/flows/managers/interaction-handler';
import { CombatTriggerEvaluator as CombatTriggerManager, CombatTriggerResult } from '@/lib/combat/trigger/combat-trigger-evaluator';

// Mock CombatTriggerManager
vi.mock('@/lib/combat/trigger/combat-trigger-evaluator', () => ({
    CombatTriggerEvaluator: {
        evaluateInteraction: vi.fn(),
    },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
    log: {
        gameCoordinator: vi.fn(),
    },
}));

describe('InteractionHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('processInteraction', () => {
        describe('non-interaction actions', () => {
            it('should return unchanged state for non-interact actions', async () => {
                const input: InteractionInput = {
                    playerAction: 'I move north',
                    targetId: null,
                    actionType: 'move',
                    locationData: {},
                    currentLocationId: 'loc-1',
                    currentOpenDoors: {},
                    resolvedEntities: [],
                };

                const result = await InteractionHandler.processInteraction(input);

                expect(result.updatedOpenDoors).toEqual({});
                expect(result.actualTargetId).toBe('');
                expect(result.combatTrigger).toBeUndefined();
                expect(result.systemFeedback).toBeUndefined();
            });

            it('should return unchanged state when targetId is null', async () => {
                const input: InteractionInput = {
                    playerAction: 'I interact',
                    targetId: null,
                    actionType: 'interact',
                    locationData: {},
                    currentLocationId: 'loc-1',
                    currentOpenDoors: {},
                    resolvedEntities: [],
                };

                const result = await InteractionHandler.processInteraction(input);

                expect(result.updatedOpenDoors).toEqual({});
                expect(result.actualTargetId).toBe('');
            });
        });

        describe('interactable mapping', () => {
            it('should map interactable by ID', async () => {
                const input: InteractionInput = {
                    playerAction: 'I open the door',
                    targetId: 'door-norte',
                    actionType: 'interact',
                    locationData: {
                        interactables: [
                            { id: 'door-norte', name: 'Puerta Norte' },
                        ],
                    },
                    currentLocationId: 'loc-1',
                    currentOpenDoors: {},
                    resolvedEntities: [],
                };

                const mockTriggerResult: CombatTriggerResult = {
                    shouldStartCombat: false,
                    reason: 'none',
                    message: '',
                };
                vi.mocked(CombatTriggerManager.evaluateInteraction).mockReturnValue(mockTriggerResult);

                const result = await InteractionHandler.processInteraction(input);

                expect(result.actualTargetId).toBe('door-norte');
            });

            it('should map interactable by name', async () => {
                const input: InteractionInput = {
                    playerAction: 'I open the door',
                    targetId: 'puerta norte',
                    actionType: 'interact',
                    locationData: {
                        interactables: [
                            { id: 'door-norte', name: 'Puerta Norte' },
                        ],
                    },
                    currentLocationId: 'loc-1',
                    currentOpenDoors: {},
                    resolvedEntities: [],
                };

                const mockTriggerResult: CombatTriggerResult = {
                    shouldStartCombat: false,
                    reason: 'none',
                    message: '',
                };
                vi.mocked(CombatTriggerManager.evaluateInteraction).mockReturnValue(mockTriggerResult);

                const result = await InteractionHandler.processInteraction(input);

                expect(result.actualTargetId).toBe('door-norte');
            });

            it('should map interactable by interaction action', async () => {
                const input: InteractionInput = {
                    playerAction: 'I open the door',
                    targetId: 'abrir',
                    actionType: 'interact',
                    locationData: {
                        interactables: [
                            {
                                id: 'door-norte',
                                name: 'Puerta Norte',
                                interactions: [{ action: 'abrir' }],
                            },
                        ],
                    },
                    currentLocationId: 'loc-1',
                    currentOpenDoors: {},
                    resolvedEntities: [],
                };

                const mockTriggerResult: CombatTriggerResult = {
                    shouldStartCombat: false,
                    reason: 'none',
                    message: '',
                };
                vi.mocked(CombatTriggerManager.evaluateInteraction).mockReturnValue(mockTriggerResult);

                const result = await InteractionHandler.processInteraction(input);

                expect(result.actualTargetId).toBe('door-norte');
            });

            it('should use original targetId if no interactable matches', async () => {
                const input: InteractionInput = {
                    playerAction: 'I interact',
                    targetId: 'unknown-item',
                    actionType: 'interact',
                    locationData: {
                        interactables: [
                            { id: 'door-norte', name: 'Puerta Norte' },
                        ],
                    },
                    currentLocationId: 'loc-1',
                    currentOpenDoors: {},
                    resolvedEntities: [],
                };

                const mockTriggerResult: CombatTriggerResult = {
                    shouldStartCombat: false,
                    reason: 'none',
                    message: '',
                };
                vi.mocked(CombatTriggerManager.evaluateInteraction).mockReturnValue(mockTriggerResult);

                const result = await InteractionHandler.processInteraction(input);

                expect(result.actualTargetId).toBe('unknown-item');
            });
        });

        describe('door opening', () => {
            it('should open door by matching connection direction', async () => {
                const input: InteractionInput = {
                    playerAction: 'I abrir the door',
                    targetId: 'door-norte',
                    actionType: 'interact',
                    locationData: {
                        interactables: [
                            { id: 'door-norte', name: 'Puerta Norte' },
                        ],
                        connections: [
                            { direction: 'norte', targetId: 'loc-2' },
                        ],
                    },
                    currentLocationId: 'loc-1',
                    currentOpenDoors: {},
                    resolvedEntities: [],
                };

                const mockTriggerResult: CombatTriggerResult = {
                    shouldStartCombat: false,
                    reason: 'none',
                    message: '',
                };
                vi.mocked(CombatTriggerManager.evaluateInteraction).mockReturnValue(mockTriggerResult);

                const result = await InteractionHandler.processInteraction(input);

                expect(result.updatedOpenDoors['loc-1:norte']).toBe(true);
                expect(result.systemFeedback).toBe('Door opened successfully: norte');
            });

            it('should open door by matching direction in interactable ID', async () => {
                const input: InteractionInput = {
                    playerAction: 'I abrir the door',
                    targetId: 'puerta-norte',
                    actionType: 'interact',
                    locationData: {
                        interactables: [
                            { id: 'puerta-norte', name: 'Puerta Norte' },
                        ],
                        connections: [],
                    },
                    currentLocationId: 'loc-1',
                    currentOpenDoors: {},
                    resolvedEntities: [],
                };

                const mockTriggerResult: CombatTriggerResult = {
                    shouldStartCombat: false,
                    reason: 'none',
                    message: '',
                };
                vi.mocked(CombatTriggerManager.evaluateInteraction).mockReturnValue(mockTriggerResult);

                const result = await InteractionHandler.processInteraction(input);

                expect(result.updatedOpenDoors['loc-1:norte']).toBe(true);
                expect(result.systemFeedback).toBe('Door opened successfully: norte');
            });

            it('should not open door for non-open actions', async () => {
                const input: InteractionInput = {
                    playerAction: 'I examine the door',
                    targetId: 'door-norte',
                    actionType: 'interact',
                    locationData: {
                        interactables: [
                            { id: 'door-norte', name: 'Puerta Norte' },
                        ],
                        connections: [
                            { direction: 'norte', targetId: 'loc-2' },
                        ],
                    },
                    currentLocationId: 'loc-1',
                    currentOpenDoors: {},
                    resolvedEntities: [],
                };

                const mockTriggerResult: CombatTriggerResult = {
                    shouldStartCombat: false,
                    reason: 'none',
                    message: '',
                };
                vi.mocked(CombatTriggerManager.evaluateInteraction).mockReturnValue(mockTriggerResult);

                const result = await InteractionHandler.processInteraction(input);

                expect(result.updatedOpenDoors).toEqual({});
                expect(result.systemFeedback).toBeUndefined();
            });

            it('should preserve existing open doors', async () => {
                const input: InteractionInput = {
                    playerAction: 'I abrir the door',
                    targetId: 'door-sur',
                    actionType: 'interact',
                    locationData: {
                        interactables: [
                            { id: 'door-sur', name: 'Puerta Sur' },
                        ],
                        connections: [
                            { direction: 'sur', targetId: 'loc-3' },
                        ],
                    },
                    currentLocationId: 'loc-1',
                    currentOpenDoors: { 'loc-1:norte': true },
                    resolvedEntities: [],
                };

                const mockTriggerResult: CombatTriggerResult = {
                    shouldStartCombat: false,
                    reason: 'none',
                    message: '',
                };
                vi.mocked(CombatTriggerManager.evaluateInteraction).mockReturnValue(mockTriggerResult);

                const result = await InteractionHandler.processInteraction(input);

                expect(result.updatedOpenDoors['loc-1:norte']).toBe(true);
                expect(result.updatedOpenDoors['loc-1:sur']).toBe(true);
            });
        });

        describe('mimic detection', () => {
            it('should return combat trigger for mimic hazard', async () => {
                const input: InteractionInput = {
                    playerAction: 'I touch the chest',
                    targetId: 'chest-1',
                    actionType: 'interact',
                    locationData: {
                        interactables: [
                            { id: 'chest-1', name: 'Cofre' },
                        ],
                        hazards: [
                            {
                                id: 'mimic-1',
                                type: 'mimic',
                                targetId: 'chest-1',
                            },
                        ],
                    },
                    currentLocationId: 'loc-1',
                    currentOpenDoors: {},
                    resolvedEntities: [],
                };

                const mockTriggerResult: CombatTriggerResult = {
                    shouldStartCombat: true,
                    reason: 'mimic',
                    message: 'The chest attacks!',
                    surpriseSide: 'enemy',
                };
                vi.mocked(CombatTriggerManager.evaluateInteraction).mockReturnValue(mockTriggerResult);

                const result = await InteractionHandler.processInteraction(input);

                expect(result.combatTrigger).toBeDefined();
                expect(result.combatTrigger?.shouldStartCombat).toBe(true);
                expect(result.combatTrigger?.reason).toBe('mimic');
            });

            it('should not trigger combat for non-mimic interactions', async () => {
                const input: InteractionInput = {
                    playerAction: 'I examine the chest',
                    targetId: 'chest-1',
                    actionType: 'interact',
                    locationData: {
                        interactables: [
                            { id: 'chest-1', name: 'Cofre' },
                        ],
                        hazards: [],
                    },
                    currentLocationId: 'loc-1',
                    currentOpenDoors: {},
                    resolvedEntities: [],
                };

                const mockTriggerResult: CombatTriggerResult = {
                    shouldStartCombat: false,
                    reason: 'none',
                    message: '',
                };
                vi.mocked(CombatTriggerManager.evaluateInteraction).mockReturnValue(mockTriggerResult);

                const result = await InteractionHandler.processInteraction(input);

                expect(result.combatTrigger).toBeUndefined();
            });

            it('should use mapped interactable ID for combat trigger evaluation', async () => {
                const input: InteractionInput = {
                    playerAction: 'I touch the chest',
                    targetId: 'cofre',
                    actionType: 'interact',
                    locationData: {
                        interactables: [
                            { id: 'chest-1', name: 'Cofre' },
                        ],
                        hazards: [
                            {
                                id: 'mimic-1',
                                type: 'mimic',
                                targetId: 'chest-1',
                            },
                        ],
                    },
                    currentLocationId: 'loc-1',
                    currentOpenDoors: {},
                    resolvedEntities: [],
                };

                const mockTriggerResult: CombatTriggerResult = {
                    shouldStartCombat: true,
                    reason: 'mimic',
                    message: 'The chest attacks!',
                };
                vi.mocked(CombatTriggerManager.evaluateInteraction).mockReturnValue(mockTriggerResult);

                await InteractionHandler.processInteraction(input);

                expect(CombatTriggerManager.evaluateInteraction).toHaveBeenCalledWith({
                    targetId: 'chest-1', // Should use mapped ID, not original 'cofre'
                    locationHazards: input.locationData.hazards,
                    locationEntities: [],
                });
            });
        });

        describe('general interactions', () => {
            it('should pass through non-door, non-mimic interactions', async () => {
                const input: InteractionInput = {
                    playerAction: 'I examine the statue',
                    targetId: 'statue-1',
                    actionType: 'interact',
                    locationData: {
                        interactables: [
                            { id: 'statue-1', name: 'Estatua' },
                        ],
                    },
                    currentLocationId: 'loc-1',
                    currentOpenDoors: {},
                    resolvedEntities: [],
                };

                const mockTriggerResult: CombatTriggerResult = {
                    shouldStartCombat: false,
                    reason: 'none',
                    message: '',
                };
                vi.mocked(CombatTriggerManager.evaluateInteraction).mockReturnValue(mockTriggerResult);

                const result = await InteractionHandler.processInteraction(input);

                expect(result.updatedOpenDoors).toEqual({});
                expect(result.combatTrigger).toBeUndefined();
                expect(result.systemFeedback).toBeUndefined();
                expect(result.actualTargetId).toBe('statue-1');
            });
        });
    });

    describe('updateConnectionsForOpenDoors', () => {
        it('should update connections with isOpen flag', () => {
            const locationData = {
                connections: [
                    { direction: 'norte', targetId: 'loc-2' },
                    { direction: 'sur', targetId: 'loc-3' },
                ],
            };
            const openDoors = {
                'loc-1:norte': true,
            };

            InteractionHandler.updateConnectionsForOpenDoors(locationData, 'loc-1', openDoors);

            expect(locationData.connections[0].isOpen).toBe(true);
            expect(locationData.connections[1].isOpen).toBeUndefined();
        });

        it('should not modify connections if openDoors is undefined', () => {
            const locationData = {
                connections: [
                    { direction: 'norte', targetId: 'loc-2' },
                ],
            };
            const originalConnections = [...locationData.connections];

            InteractionHandler.updateConnectionsForOpenDoors(locationData, 'loc-1', undefined);

            expect(locationData.connections).toEqual(originalConnections);
        });

        it('should not modify connections if connections is undefined', () => {
            const locationData: any = {};
            const openDoors = {
                'loc-1:norte': true,
            };

            InteractionHandler.updateConnectionsForOpenDoors(locationData, 'loc-1', openDoors);

            expect(locationData.connections).toBeUndefined();
        });

        it('should handle multiple open doors', () => {
            const locationData = {
                connections: [
                    { direction: 'norte', targetId: 'loc-2' },
                    { direction: 'sur', targetId: 'loc-3' },
                    { direction: 'este', targetId: 'loc-4' },
                ],
            };
            const openDoors = {
                'loc-1:norte': true,
                'loc-1:sur': true,
            };

            InteractionHandler.updateConnectionsForOpenDoors(locationData, 'loc-1', openDoors);

            expect(locationData.connections[0].isOpen).toBe(true);
            expect(locationData.connections[1].isOpen).toBe(true);
            expect(locationData.connections[2].isOpen).toBeUndefined();
        });
    });
});

