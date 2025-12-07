import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    CombatInitiationService,
    CombatInitiationRequest,
    CombatInitiationResponse,
} from '../../../src/lib/combat/combat-initiation-service';
import type { Character, Location } from '../../../src/lib/types';

// Mock the logger to avoid console output during tests
vi.mock('../../../src/lib/logger', () => ({
    log: {
        debug: vi.fn(),
        gameCoordinator: vi.fn(),
        error: vi.fn(),
    },
}));

describe('CombatInitiationService', () => {
    // Test data factories
    const createMockParty = (): Character[] => [
        {
            id: 'player-1',
            name: 'Hero',
            type: 'player',
            hp: { current: 30, max: 30 },
            ac: 15,
            level: 1,
            class: 'Fighter',
            race: 'Human',
            stats: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 10 },
            abilities: [],
            equipment: { weapons: [], armor: [], items: [] },
        },
        {
            id: 'companion-1',
            name: 'Companion',
            type: 'ally',
            hp: { current: 20, max: 20 },
            ac: 12,
            level: 1,
            class: 'Cleric',
            race: 'Elf',
            stats: { strength: 10, dexterity: 12, constitution: 12, intelligence: 14, wisdom: 16, charisma: 12 },
            abilities: [],
            equipment: { weapons: [], armor: [], items: [] },
        },
    ];

    const createMockLocation = (overrides?: Partial<Location>): Location => ({
        id: 'test-location',
        title: 'Test Location',
        description: 'A test location',
        connections: [],
        ...overrides,
    } as Location);

    const createMockEnemy = (id: string, name: string, hp: number = 10, disposition: string = 'hostile') => ({
        id,
        name,
        type: 'enemy',
        disposition,
        hp: { current: hp, max: hp },
        ac: 12,
        stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 8, wisdom: 8, charisma: 8 },
    });

    const createMockAdventureData = () => ({
        entities: [
            createMockEnemy('goblin-1', 'Goblin'),
            createMockEnemy('orc-1', 'Orc'),
            createMockEnemy('mimic-1', 'Mimic', 15, 'hidden'),
        ],
        locations: [
            createMockLocation({ id: 'test-location', entitiesPresent: ['goblin-1'] }),
        ],
    });

    describe('prepareCombatInitiation', () => {
        describe('player_attack initiation', () => {
            it('should return shouldStartCombat: true for attack action', async () => {
                const request: CombatInitiationRequest = {
                    initiationType: 'player_attack',
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation({ entitiesPresent: ['goblin-1'] }),
                    adventureData: createMockAdventureData(),
                    playerAction: 'Ataco al goblin',
                    interpretedAction: { actionType: 'attack', targetId: 'goblin-1' },
                    enemiesByLocation: {
                        'test-location': [createMockEnemy('goblin-1', 'Goblin')],
                    },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                expect(result.shouldStartCombat).toBe(true);
                expect(result.combatantIds.length).toBeGreaterThan(0);
            });

            it('should set surpriseSide to "player" for player-initiated attacks', async () => {
                const request: CombatInitiationRequest = {
                    initiationType: 'player_attack',
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation({ entitiesPresent: ['goblin-1'] }),
                    adventureData: createMockAdventureData(),
                    playerAction: 'Ataco al goblin por sorpresa',
                    interpretedAction: { actionType: 'attack', targetId: 'goblin-1' },
                    enemiesByLocation: {
                        'test-location': [createMockEnemy('goblin-1', 'Goblin')],
                    },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                // Player initiating attack from out of combat = player surprise
                expect(result.surpriseSide).toBe('player');
                expect(result.reason).toBe('player_surprise');
            });

            it('should include all party members in combatantIds', async () => {
                const party = createMockParty();
                const request: CombatInitiationRequest = {
                    initiationType: 'player_attack',
                    party,
                    locationId: 'test-location',
                    locationData: createMockLocation({ entitiesPresent: ['goblin-1'] }),
                    adventureData: createMockAdventureData(),
                    playerAction: 'Atacamos',
                    interpretedAction: { actionType: 'attack', targetId: 'goblin-1' },
                    enemiesByLocation: {
                        'test-location': [createMockEnemy('goblin-1', 'Goblin')],
                    },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                party.forEach(member => {
                    expect(result.combatantIds).toContain(member.id);
                });
            });

            it('should include target enemy in combatantIds', async () => {
                const request: CombatInitiationRequest = {
                    initiationType: 'player_attack',
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation({ entitiesPresent: ['goblin-1'] }),
                    adventureData: createMockAdventureData(),
                    playerAction: 'Ataco al goblin',
                    interpretedAction: { actionType: 'attack', targetId: 'goblin-1' },
                    enemiesByLocation: {
                        'test-location': [createMockEnemy('goblin-1', 'Goblin')],
                    },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                expect(result.combatantIds).toContain('goblin-1');
            });

            it('should normalize enemy stats in preparedEnemies', async () => {
                // Enemy with old-style stats (stats.hp instead of hp: {current, max})
                const unnormalizedEnemy = {
                    id: 'goblin-1',
                    name: 'Goblin',
                    type: 'enemy',
                    disposition: 'hostile',
                    stats: { hp: 10, ac: 12 },
                };

                const request: CombatInitiationRequest = {
                    initiationType: 'player_attack',
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation({ entitiesPresent: ['goblin-1'] }),
                    adventureData: createMockAdventureData(),
                    playerAction: 'Ataco',
                    interpretedAction: { actionType: 'attack', targetId: 'goblin-1' },
                    enemiesByLocation: {
                        'test-location': [unnormalizedEnemy],
                    },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                expect(result.preparedEnemies.length).toBeGreaterThan(0);
                const preparedEnemy = result.preparedEnemies[0];
                expect(preparedEnemy.hp).toBeDefined();
                expect(preparedEnemy.hp.current).toBe(10);
                expect(preparedEnemy.hp.max).toBe(10);
            });
        });

        describe('dynamic_trigger initiation (ambush)', () => {
            it('should set surpriseSide to "enemy" for ambush trigger', async () => {
                const request: CombatInitiationRequest = {
                    initiationType: 'dynamic_trigger',
                    triggerResult: {
                        shouldStartCombat: true,
                        reason: 'ambush',
                        surpriseSide: 'enemy',
                        message: '¡Emboscada!',
                    },
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation({ entitiesPresent: ['goblin-1'] }),
                    adventureData: createMockAdventureData(),
                    playerAction: 'Entro en la habitación',
                    interpretedAction: { actionType: 'explore', targetId: null },
                    enemiesByLocation: {
                        'test-location': [createMockEnemy('goblin-1', 'Goblin')],
                    },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                expect(result.surpriseSide).toBe('enemy');
                expect(result.reason).toBe('ambush');
            });

            it('should include ambush message in narrativeMessages', async () => {
                const ambushMessage = '¡Emboscada! Los goblins atacan desde las sombras.';
                const request: CombatInitiationRequest = {
                    initiationType: 'dynamic_trigger',
                    triggerResult: {
                        shouldStartCombat: true,
                        reason: 'ambush',
                        surpriseSide: 'enemy',
                        message: ambushMessage,
                    },
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation({ entitiesPresent: ['goblin-1'] }),
                    adventureData: createMockAdventureData(),
                    playerAction: 'Entro',
                    interpretedAction: { actionType: 'explore', targetId: null },
                    enemiesByLocation: {
                        'test-location': [createMockEnemy('goblin-1', 'Goblin')],
                    },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                expect(result.narrativeMessages.length).toBeGreaterThan(0);
                expect(result.narrativeMessages[0].content).toContain(ambushMessage);
            });

            it('should reveal ALL hidden enemies in an ambush', async () => {
                // Hidden enemies that should be revealed in ambush
                const hiddenEnemies = [
                    createMockEnemy('goblin-1', 'Goblin Acechador', 10, 'hidden'),
                    createMockEnemy('goblin-2', 'Goblin Arquero', 10, 'hidden'),
                ];

                const request: CombatInitiationRequest = {
                    initiationType: 'dynamic_trigger',
                    triggerResult: {
                        shouldStartCombat: true,
                        reason: 'ambush',
                        surpriseSide: 'enemy',
                        message: '¡Emboscada!',
                    },
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation({ entitiesPresent: ['goblin-1', 'goblin-2'] }),
                    adventureData: createMockAdventureData(),
                    playerAction: 'Entro en la habitación',
                    interpretedAction: { actionType: 'explore', targetId: null },
                    enemiesByLocation: {
                        'test-location': hiddenEnemies,
                    },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                // Should include both revealed enemies
                expect(result.combatantIds).toContain('goblin-1');
                expect(result.combatantIds).toContain('goblin-2');
                expect(result.preparedEnemies.length).toBe(2);

                // All enemies should now be hostile (revealed from hidden)
                result.preparedEnemies.forEach(enemy => {
                    expect(enemy.disposition).toBe('hostile');
                });
            });
        });

        describe('dynamic_trigger initiation (mimic)', () => {
            it('should reveal the mimic enemy', async () => {
                const hiddenMimic = {
                    id: 'mimic-1',
                    name: 'Mimic',
                    type: 'enemy',
                    disposition: 'hidden',
                    hp: { current: 15, max: 15 },
                };

                const request: CombatInitiationRequest = {
                    initiationType: 'dynamic_trigger',
                    triggerResult: {
                        shouldStartCombat: true,
                        reason: 'mimic',
                        surpriseSide: 'enemy',
                        message: '¡El cofre cobra vida!',
                        triggeringEntityId: 'mimic-1',
                    },
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation({ entitiesPresent: ['mimic-1'] }),
                    adventureData: createMockAdventureData(),
                    playerAction: 'Abro el cofre',
                    interpretedAction: { actionType: 'interact', targetId: 'cofre-1' },
                    enemiesByLocation: {
                        'test-location': [hiddenMimic],
                    },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                expect(result.preparedEnemies.length).toBeGreaterThan(0);
                const revealedMimic = result.preparedEnemies.find(e => e.id === 'mimic-1');
                expect(revealedMimic).toBeDefined();
                expect(revealedMimic.disposition).toBe('hostile');
            });

            it('should set surpriseSide to "enemy" for mimic', async () => {
                const request: CombatInitiationRequest = {
                    initiationType: 'dynamic_trigger',
                    triggerResult: {
                        shouldStartCombat: true,
                        reason: 'mimic',
                        surpriseSide: 'enemy',
                        triggeringEntityId: 'mimic-1',
                    },
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation({ entitiesPresent: ['mimic-1'] }),
                    adventureData: createMockAdventureData(),
                    playerAction: 'Toco el cofre',
                    interpretedAction: { actionType: 'interact', targetId: 'mimic-1' },
                    enemiesByLocation: {
                        'test-location': [createMockEnemy('mimic-1', 'Mimic', 15, 'hidden')],
                    },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                expect(result.surpriseSide).toBe('enemy');
            });

            it('should update enemiesByLocation with revealed enemy', async () => {
                const hiddenMimic = createMockEnemy('mimic-1', 'Mimic', 15, 'hidden');

                const request: CombatInitiationRequest = {
                    initiationType: 'dynamic_trigger',
                    triggerResult: {
                        shouldStartCombat: true,
                        reason: 'mimic',
                        surpriseSide: 'enemy',
                        triggeringEntityId: 'mimic-1',
                    },
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation({ entitiesPresent: ['mimic-1'] }),
                    adventureData: createMockAdventureData(),
                    playerAction: 'Abro el cofre',
                    interpretedAction: { actionType: 'interact', targetId: 'cofre' },
                    enemiesByLocation: {
                        'test-location': [hiddenMimic],
                    },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                const updatedEnemies = result.updatedEnemiesByLocation['test-location'];
                expect(updatedEnemies).toBeDefined();
                const mimic = updatedEnemies.find((e: any) => e.id === 'mimic-1');
                expect(mimic).toBeDefined();
                expect(mimic.disposition).toBe('hostile');
            });
        });

        describe('dynamic_trigger initiation (proximity)', () => {
            it('should not set surpriseSide for proximity trigger', async () => {
                const request: CombatInitiationRequest = {
                    initiationType: 'dynamic_trigger',
                    triggerResult: {
                        shouldStartCombat: true,
                        reason: 'proximity',
                        surpriseSide: undefined, // No surprise in proximity
                        message: 'Enemigos visibles',
                    },
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation({ entitiesPresent: ['goblin-1'] }),
                    adventureData: createMockAdventureData(),
                    playerAction: 'Entro en la habitación',
                    interpretedAction: { actionType: 'explore', targetId: null },
                    enemiesByLocation: {
                        'test-location': [createMockEnemy('goblin-1', 'Goblin')],
                    },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                expect(result.surpriseSide).toBeUndefined();
            });

            it('should include all visible hostile enemies', async () => {
                const enemies = [
                    createMockEnemy('goblin-1', 'Goblin 1'),
                    createMockEnemy('goblin-2', 'Goblin 2'),
                    createMockEnemy('mimic-1', 'Mimic', 15, 'hidden'), // Should NOT be included
                ];

                const request: CombatInitiationRequest = {
                    initiationType: 'dynamic_trigger',
                    triggerResult: {
                        shouldStartCombat: true,
                        reason: 'proximity',
                        surpriseSide: undefined,
                    },
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation({ entitiesPresent: ['goblin-1', 'goblin-2', 'mimic-1'] }),
                    adventureData: createMockAdventureData(),
                    playerAction: 'Exploro',
                    interpretedAction: { actionType: 'explore', targetId: null },
                    enemiesByLocation: {
                        'test-location': enemies,
                    },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                // Should include both visible goblins
                expect(result.combatantIds).toContain('goblin-1');
                expect(result.combatantIds).toContain('goblin-2');
                // Should NOT include hidden mimic
                expect(result.combatantIds).not.toContain('mimic-1');
            });
        });

        describe('location switching', () => {
            it('should use new location for combat when player moved', async () => {
                const newLocation = createMockLocation({ 
                    id: 'new-location', 
                    entitiesPresent: ['orc-1'] 
                });

                const request: CombatInitiationRequest = {
                    initiationType: 'dynamic_trigger',
                    triggerResult: {
                        shouldStartCombat: true,
                        reason: 'proximity',
                    },
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation(),
                    newLocationId: 'new-location',
                    newLocationData: newLocation,
                    adventureData: {
                        entities: [createMockEnemy('orc-1', 'Orc')],
                        locations: [newLocation],
                    },
                    playerAction: 'Voy al norte',
                    interpretedAction: { actionType: 'move', targetId: 'new-location' },
                    enemiesByLocation: {
                        'new-location': [createMockEnemy('orc-1', 'Orc')],
                    },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                expect(result.combatLocationId).toBe('new-location');
                expect(result.combatantIds).toContain('orc-1');
            });
        });

        describe('edge cases', () => {
            it('should handle missing triggerResult for dynamic_trigger gracefully', async () => {
                const request: CombatInitiationRequest = {
                    initiationType: 'dynamic_trigger',
                    // No triggerResult provided
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation(),
                    adventureData: createMockAdventureData(),
                    playerAction: 'test',
                    interpretedAction: { actionType: 'explore' },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                expect(result.shouldStartCombat).toBe(false);
                expect(result.combatantIds).toEqual([]);
            });

            it('should filter out dead enemies from combat', async () => {
                const enemies = [
                    createMockEnemy('goblin-1', 'Goblin Alive', 10),
                    createMockEnemy('goblin-2', 'Goblin Dead', 0), // Dead enemy
                ];

                const request: CombatInitiationRequest = {
                    initiationType: 'player_attack',
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation({ entitiesPresent: ['goblin-1', 'goblin-2'] }),
                    adventureData: createMockAdventureData(),
                    playerAction: 'Ataco',
                    interpretedAction: { actionType: 'attack', targetId: 'goblin-1' },
                    enemiesByLocation: {
                        'test-location': enemies,
                    },
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                expect(result.combatantIds).toContain('goblin-1');
                expect(result.combatantIds).not.toContain('goblin-2');
            });

            it('should load enemies from adventureData if not in enemiesByLocation', async () => {
                const adventureData = {
                    entities: [createMockEnemy('goblin-1', 'Goblin')],
                    locations: [
                        createMockLocation({ id: 'test-location', entitiesPresent: ['goblin-1'] }),
                    ],
                };

                const request: CombatInitiationRequest = {
                    initiationType: 'player_attack',
                    party: createMockParty(),
                    locationId: 'test-location',
                    locationData: createMockLocation({ entitiesPresent: ['goblin-1'] }),
                    adventureData,
                    playerAction: 'Ataco',
                    interpretedAction: { actionType: 'attack', targetId: 'goblin-1' },
                    // No enemiesByLocation provided
                };

                const result = await CombatInitiationService.prepareCombatInitiation(request);

                expect(result.combatantIds).toContain('goblin-1');
            });
        });
    });

    describe('evaluatePlayerAction', () => {
        it('should return player surprise for attack action', () => {
            const result = CombatInitiationService.evaluatePlayerAction('attack', 'goblin-1');

            expect(result.shouldStartCombat).toBe(true);
            expect(result.surpriseSide).toBe('player');
            expect(result.reason).toBe('player_surprise');
        });

        it('should not trigger combat for non-attack actions', () => {
            const result = CombatInitiationService.evaluatePlayerAction('explore');

            expect(result.shouldStartCombat).toBe(false);
        });
    });

    describe('evaluateExploration', () => {
        it('should trigger proximity combat for visible hostile enemies', () => {
            const location = createMockLocation();
            const visibleEntities = [createMockEnemy('goblin-1', 'Goblin')];

            const result = CombatInitiationService.evaluateExploration(
                location,
                [],
                visibleEntities
            );

            expect(result.shouldStartCombat).toBe(true);
            expect(result.reason).toBe('proximity');
            expect(result.surpriseSide).toBeUndefined();
        });

        it('should trigger ambush for undetected ambush hazard with no visible enemies', () => {
            const location = createMockLocation({
                hazards: [
                    { id: 'ambush-1', type: 'ambush', active: true, triggerDescription: '¡Emboscada!' },
                ],
            });

            const result = CombatInitiationService.evaluateExploration(
                location,
                [], // No detected hazards
                []  // No visible enemies (they're hidden)
            );

            expect(result.shouldStartCombat).toBe(true);
            expect(result.reason).toBe('ambush');
            expect(result.surpriseSide).toBe('enemy');
        });

        it('should not trigger ambush if ambush hazard is detected', () => {
            const location = createMockLocation({
                hazards: [
                    { id: 'ambush-1', type: 'ambush', active: true },
                ],
            });

            const result = CombatInitiationService.evaluateExploration(
                location,
                ['ambush-1'], // Hazard detected
                []
            );

            expect(result.shouldStartCombat).toBe(false);
        });
    });

    describe('evaluateInteraction', () => {
        it('should trigger combat for mimic interaction', () => {
            const mimic = {
                id: 'cofre-mimico',
                name: 'Mímico',
                type: 'enemy',
                disposition: 'hidden',
            };

            const result = CombatInitiationService.evaluateInteraction(
                'cofre-mimico',
                [mimic]
            );

            expect(result.shouldStartCombat).toBe(true);
            expect(result.reason).toBe('mimic');
            expect(result.surpriseSide).toBe('enemy');
            expect(result.triggeringEntityId).toBe('cofre-mimico');
        });

        it('should not trigger combat for normal interaction', () => {
            const npc = {
                id: 'merchant-1',
                name: 'Merchant',
                type: 'npc',
                disposition: 'friendly',
            };

            const result = CombatInitiationService.evaluateInteraction(
                'merchant-1',
                [npc]
            );

            expect(result.shouldStartCombat).toBe(false);
        });

        it('should trigger combat for social escalation', () => {
            const result = CombatInitiationService.evaluateInteraction(
                'npc-1',
                [],
                { escalation: true }
            );

            expect(result.shouldStartCombat).toBe(true);
            expect(result.reason).toBe('provocation');
        });
    });
});

