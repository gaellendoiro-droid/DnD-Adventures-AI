import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeNarrativeTurn, executeNarrativeTurnStreaming } from '../narrative-turn-manager';
import * as narrativeManager from '../../narrative-manager';
import { Character } from '@/lib/types';
import { resolveSkillCheck } from '@/lib/skills/skill-check-resolver';

// Mocks Exhaustivos
vi.mock('@/lib/logger', () => ({
    log: {
        gameCoordinator: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        aiFlow: vi.fn()
    }
}));

vi.mock('../companion-reaction-manager', () => ({
    processCompanionReactions: vi.fn().mockResolvedValue({ messages: [], debugLogs: [] }),
    processCompanionReactionsStreaming: async function* () {
        // Yield empty
    }
}));

vi.mock('../navigation-manager', () => ({
    NavigationManager: {
        resolveMovement: vi.fn(),
        updateWorldTime: vi.fn()
    }
}));

vi.mock('../interaction-handler', () => ({
    InteractionHandler: {
        processInteraction: vi.fn().mockResolvedValue({
            updatedOpenDoors: {},
            systemFeedback: null,
            combatTrigger: { shouldStartCombat: false }
        }),
        updateConnectionsForOpenDoors: vi.fn()
    }
}));

vi.mock('../exploration-context-builder', () => ({
    ExplorationContextBuilder: {
        build: vi.fn().mockReturnValue({
            updatedGameState: {},
            detectedHazards: [],
            context: { presentEntities: [], visibleConnections: [] }
        }),
        calculateVisibleConnections: vi.fn().mockReturnValue([])
    }
}));

vi.mock('@/lib/game/enemy-state-manager', () => ({
    EnemyStateManager: {
        getEnemiesForLocation: vi.fn().mockReturnValue([])
    }
}));

vi.mock('../../experts/skill-check-expert', () => ({
    skillCheckExpert: vi.fn(),
}));

vi.mock('../../narrative-manager', () => ({
    narrativeExpert: vi.fn(),
}));

// Mock del resolver de tiradas
vi.mock('@/lib/skills/skill-check-resolver', () => ({
    resolveSkillCheck: vi.fn(),
}));

// Markdown to HTML mock (ya que se usa en el mensaje final)
vi.mock('@/lib/markdown-to-html', () => ({
    markdownToHtml: vi.fn().mockImplementation(async ({ markdown }) => ({ html: markdown }))
}));

// Combat Evaluator mock
vi.mock('@/lib/combat/trigger/combat-trigger-evaluator', () => ({
    CombatTriggerEvaluator: {
        evaluateExploration: vi.fn().mockReturnValue({ shouldStartCombat: false, reason: null, message: null })
    }
}));

const mockAdventureData = {
    locations: [
        { id: 'loc-1', title: 'Start Room', entitiesPresent: [], connections: [] }
    ],
    settings: { initialWorldTime: { day: 1, hour: 8, minute: 0 } }
};

const mockAdventureDataWithScroll = {
    locations: [
        {
            id: 'loc-1',
            title: 'Start Room',
            entitiesPresent: ['npc-sheep'],
            connections: [],
            interactables: []
        }
    ],
    entities: [
        {
            id: 'npc-sheep',
            name: 'Oveja',
            type: 'npc',
            roleplay: {
                possessions: ['Pergamino de Hablar con los Animales']
            }
        }
    ],
    settings: { initialWorldTime: { day: 1, hour: 8, minute: 0 } }
};

const mockParty: Character[] = [{
    id: 'char-1',
    name: 'Hero',
    race: 'Human',
    characterClass: 'Fighter',
    level: 1,
    sex: 'Male',
    background: 'Soldier',
    color: 'red',
    personality: 'Brave',
    abilityScores: { fuerza: 16, destreza: 14, constitución: 14, inteligencia: 10, sabiduría: 10, carisma: 10 },
    skills: [
        { name: 'athletics', proficient: true, modifier: 5 }
    ],
    inventory: [],
    hp: { current: 10, max: 10 },
    ac: 15,
    proficiencyBonus: 2,
    controlledBy: 'Player',
    spells: [],
    isDead: false
}];

const mockDruidParty: Character[] = [{
    id: 'char-druid',
    name: 'Elara',
    race: 'Elf',
    characterClass: 'Druid',
    level: 1,
    sex: 'Female',
    background: 'Outlander',
    color: 'green',
    personality: 'Wise',
    abilityScores: { fuerza: 10, destreza: 14, constitución: 14, inteligencia: 12, sabiduría: 16, carisma: 10 },
    skills: [
        { name: 'arcana', proficient: true, modifier: 3 }
    ],
    inventory: [],
    hp: { current: 8, max: 8 },
    ac: 14,
    proficiencyBonus: 2,
    controlledBy: 'AI',
    spells: [],
    isDead: false
}];

const mockPartyWithScroll: Character[] = [{
    ...mockParty[0],
    inventory: [
        { id: 'scroll-speak-animals', name: 'Pergamino de Hablar con los Animales (Modificado)', quantity: 1 }
    ]
}];

const mockDruidPartyWithScroll: Character[] = [{
    ...mockDruidParty[0],
    inventory: [
        { id: 'scroll-speak-animals', name: 'Pergamino de Hablar con los Animales (Modificado)', quantity: 1 }
    ]
}];

describe('NarrativeTurnManager - Active Effects Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should activate speak_with_animals and propagate activeEffects in non-streaming mode', async () => {
        vi.mocked(narrativeManager.narrativeExpert).mockResolvedValue({
            dmNarration: 'Narración con el efecto activo.',
            debugLogs: []
        });

        const input = {
            playerAction: "Uso el pergamino para hablar con la oveja",
            interpretation: { actionType: 'narrate', targetId: null, activatedEffects: ['speak_with_animals'] },
            party: mockParty,
            currentLocationId: 'loc-1',
            adventureData: mockAdventureData,
            conversationHistory: [],
            enemiesByLocation: {},
            enemies: [],
            worldState: { globalFlags: {} }
        };

        const result = await executeNarrativeTurn(input);

        // a. Verify worldState update
        expect(result.updatedWorldState).toBeDefined();
        expect(result.updatedWorldState.globalFlags.speak_with_animals).toBe(true);

        // b. Verify narrativeExpert was called with correct activeEffects
        expect(narrativeManager.narrativeExpert).toHaveBeenCalledTimes(1);
        expect(narrativeManager.narrativeExpert).toHaveBeenCalledWith(expect.objectContaining({
            activeEffects: ['speak_with_animals']
        }));
    });

    it('should activate speak_with_animals and propagate activeEffects in streaming mode', async () => {
        vi.mocked(narrativeManager.narrativeExpert).mockResolvedValue({
            dmNarration: 'Narración en streaming con el efecto activo.',
            debugLogs: []
        });

        const input = {
            playerAction: "Uso el pergamino para hablar con la oveja",
            interpretation: { actionType: 'narrate', targetId: null, activatedEffects: ['speak_with_animals'] },
            party: mockParty,
            currentLocationId: 'loc-1',
            adventureData: mockAdventureData,
            conversationHistory: [],
            enemiesByLocation: {},
            enemies: [],
            worldState: { globalFlags: {} }
        };

        const steps: any[] = [];
        const generator = executeNarrativeTurnStreaming(input);
        
        let next = await generator.next();
        while (!next.done) {
            steps.push(next.value);
            next = await generator.next();
        }
        const result = next.value;

        // a. Verify logic update step for world state
        const logicUpdate = steps.find(s => s.type === 'logic_update' && s.data?.worldState);
        expect(logicUpdate).toBeDefined();
        expect(logicUpdate.data.worldState.globalFlags.speak_with_animals).toBe(true);

        // b. Verify worldState in final output
        expect(result.updatedWorldState).toBeDefined();
        expect(result.updatedWorldState.globalFlags.speak_with_animals).toBe(true);

        // c. Verify narrativeExpert was called with correct activeEffects
        expect(narrativeManager.narrativeExpert).toHaveBeenCalledTimes(1);
        expect(narrativeManager.narrativeExpert).toHaveBeenCalledWith(expect.objectContaining({
            activeEffects: ['speak_with_animals']
        }));
    });

    describe('Modular Rules Engine - Scroll Rules (Simplified Direct Flow)', () => {
        beforeEach(() => {
            vi.mocked(narrativeManager.narrativeExpert).mockResolvedValue({
                dmNarration: 'Narración de prueba.',
                debugLogs: []
            });
        });

        it('Test 1: should require Arcana DC 10 to activate scroll for ineligible class (Fighter) and fail activation (Fail)', async () => {
            vi.mocked(resolveSkillCheck).mockReturnValue({
                id: 'roll-fail',
                roller: 'Hero',
                type: 'skill_check',
                totalResult: 8,
                outcome: 'fail',
                skillCheckDetails: {
                    isSuccess: false,
                    isCriticalSuccess: false,
                    isCriticalFailure: false,
                    skillName: 'arcana',
                    difficultyClass: 10
                }
            } as any);

            const input = {
                playerAction: "Leo el pergamino",
                interpretation: { actionType: 'interact', targetId: 'Pergamino' },
                party: mockPartyWithScroll,
                currentLocationId: 'loc-1',
                adventureData: mockAdventureDataWithScroll,
                conversationHistory: [],
                enemiesByLocation: {},
                enemies: [],
                worldState: { globalFlags: {} }
            };

            const result = await executeNarrativeTurn(input);

            // Debería forzar tirada de Arcanos CD 10
            expect(resolveSkillCheck).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Hero' }),
                'arcana',
                10,
                'normal'
            );

            // Al fallar la tirada, no se activa
            expect(result.updatedWorldState.globalFlags.speak_with_animals).toBeUndefined();
        });

        it('Test 2: should activate scroll on successful Arcana DC 10 check for ineligible class (Fighter) (Success)', async () => {
            vi.mocked(resolveSkillCheck).mockReturnValue({
                id: 'roll-success',
                roller: 'Hero',
                type: 'skill_check',
                totalResult: 14,
                outcome: 'success',
                skillCheckDetails: {
                    isSuccess: true,
                    isCriticalSuccess: false,
                    isCriticalFailure: false,
                    skillName: 'arcana',
                    difficultyClass: 10
                }
            } as any);

            const input = {
                playerAction: "Leo el pergamino",
                interpretation: { actionType: 'interact', targetId: 'Pergamino' },
                party: mockPartyWithScroll,
                currentLocationId: 'loc-1',
                adventureData: mockAdventureDataWithScroll,
                conversationHistory: [],
                enemiesByLocation: {},
                enemies: [],
                worldState: { globalFlags: {} }
            };

            const result = await executeNarrativeTurn(input);

            expect(resolveSkillCheck).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Hero' }),
                'arcana',
                10,
                'normal'
            );

            // Se activa y se consume
            expect(result.updatedWorldState.globalFlags.speak_with_animals).toBe(true);
            expect(result.updatedWorldState.globalFlags.consumed_scroll_speak_with_animals).toBe(true);
            
            // Verificamos que se consume del inventario
            const scrollFound = result.updatedParty[0].inventory?.some((item: any) => 
                /pergamino|scroll/i.test(item.name)
            );
            expect(scrollFound).toBe(false);
        });

        it('Test 3: should automatically activate scroll without check if class is eligible (Druid)', async () => {
            const input = {
                playerAction: "Leo el pergamino",
                interpretation: { actionType: 'interact', targetId: 'Pergamino' },
                party: mockDruidPartyWithScroll,
                currentLocationId: 'loc-1',
                adventureData: mockAdventureDataWithScroll,
                conversationHistory: [],
                enemiesByLocation: {},
                enemies: [],
                worldState: { globalFlags: {} }
            };

            const result = await executeNarrativeTurn(input);

            // No se debe llamar a resolveSkillCheck
            expect(resolveSkillCheck).not.toHaveBeenCalled();

            // Se activa automáticamente
            expect(result.updatedWorldState.globalFlags.speak_with_animals).toBe(true);
            expect(result.updatedWorldState.globalFlags.consumed_scroll_speak_with_animals).toBe(true);

            // Verificamos que se consume físicamente del inventario del druida
            const scrollFound = result.updatedParty[0].inventory?.some((item: any) => 
                /pergamino|scroll/i.test(item.name)
            );
            expect(scrollFound).toBe(false);
        });

        it('Test 4: streaming executeNarrativeTurn should yield updated worldState on success (Fighter DC 10)', async () => {
            vi.mocked(resolveSkillCheck).mockReturnValue({
                id: 'roll-success',
                roller: 'Hero',
                type: 'skill_check',
                totalResult: 14,
                outcome: 'success',
                skillCheckDetails: {
                    isSuccess: true,
                    isCriticalSuccess: false,
                    isCriticalFailure: false,
                    skillName: 'arcana',
                    difficultyClass: 10
                }
            } as any);

            const input = {
                playerAction: "Leo el pergamino",
                interpretation: { actionType: 'interact', targetId: 'Pergamino' },
                party: mockPartyWithScroll,
                currentLocationId: 'loc-1',
                adventureData: mockAdventureDataWithScroll,
                conversationHistory: [],
                enemiesByLocation: {},
                enemies: [],
                worldState: { globalFlags: {} }
            };

            const generator = executeNarrativeTurnStreaming(input);
            const steps: any[] = [];
            for await (const step of generator) {
                steps.push(step);
            }

            // Al ser un skill check, la mutación final ocurre en el backend tras el check.
            // Verificamos que en el resultado final del stream el efecto esté activo.
            expect(steps.some(s => s.type === 'logic_update' && s.data?.worldState?.globalFlags?.speak_with_animals === true)).toBe(true);
        });

        it('Test 5: streaming executeNarrativeTurn should support eligible class auto-activation directly', async () => {
            const input = {
                playerAction: "Leo el pergamino",
                interpretation: { actionType: 'interact', targetId: 'Pergamino' },
                party: mockDruidPartyWithScroll,
                currentLocationId: 'loc-1',
                adventureData: mockAdventureDataWithScroll,
                conversationHistory: [],
                enemiesByLocation: {},
                enemies: [],
                worldState: { globalFlags: {} }
            };

            const generator = executeNarrativeTurnStreaming(input);
            const steps: any[] = [];
            for await (const step of generator) {
                steps.push(step);
            }

            // Debería haber un logic_update con speak_with_animals activo y el pergamino consumido
            const logicUpdate = steps.find(s => s.type === 'logic_update' && s.data?.worldState?.globalFlags?.speak_with_animals === true);
            expect(logicUpdate).toBeDefined();

            const updatedParty = steps.find(s => s.type === 'logic_update' && s.data?.updatedParty)?.data.updatedParty;
            expect(updatedParty).toBeDefined();
            const scrollFound = updatedParty[0].inventory?.some((item: any) => /pergamino|scroll/i.test(item.name));
            expect(scrollFound).toBe(false);
        });

        it('Test 6: generic indirect actions (e.g. "Elara, intentalo tu") should delegate to the correct companion', async () => {
            // Elara es Druida y el pergamino está en su inventario. Debería auto-activarse sin tirada.
            const input = {
                playerAction: "Elara, intentalo tu",
                interpretation: { actionType: 'interact', targetId: 'Pergamino', assignedCompanion: 'Elara' },
                party: [
                    { ...mockParty[0] }, // Hero
                    {
                        ...mockDruidParty[0],
                        inventory: [
                            { id: 'scroll-speak-animals', name: 'Pergamino de Hablar con los Animales', quantity: 1 }
                        ]
                    }
                ],
                currentLocationId: 'loc-1',
                adventureData: mockAdventureDataWithScroll,
                conversationHistory: [],
                enemiesByLocation: {},
                enemies: [],
                worldState: { globalFlags: {} }
            };

            const result = await executeNarrativeTurn(input);

            // No se debe llamar a tiradas porque Elara es Druida apta
            expect(resolveSkillCheck).not.toHaveBeenCalled();
            expect(result.updatedWorldState.globalFlags.speak_with_animals).toBe(true);
            expect(result.updatedWorldState.globalFlags.consumed_scroll_speak_with_animals).toBe(true);
        });

        it('Test 7: should set consumed_scroll flag on success and subsequent animal speech should not trigger scroll checks', async () => {
            // 1. Turno 1: Fighter lee el pergamino y tiene éxito
            vi.mocked(resolveSkillCheck).mockReset();
            vi.mocked(resolveSkillCheck).mockReturnValue({
                id: 'roll-success-consume',
                roller: 'Hero',
                type: 'skill_check',
                totalResult: 15,
                outcome: 'success',
                skillCheckDetails: {
                    isSuccess: true,
                    isCriticalSuccess: false,
                    isCriticalFailure: false,
                    skillName: 'arcana',
                    difficultyClass: 10
                }
            } as any);

            const input1 = {
                playerAction: "Leo el pergamino",
                interpretation: { actionType: 'interact', targetId: 'Pergamino' },
                party: mockPartyWithScroll,
                currentLocationId: 'loc-1',
                adventureData: mockAdventureDataWithScroll,
                conversationHistory: [],
                enemiesByLocation: {},
                enemies: [],
                worldState: { globalFlags: {} }
            };

            const result1 = await executeNarrativeTurn(input1);

            expect(result1.updatedWorldState.globalFlags.speak_with_animals).toBe(true);
            expect(result1.updatedWorldState.globalFlags.consumed_scroll_speak_with_animals).toBe(true);

            // 2. Turno 2: Galador habla con la oveja.
            // Al estar ya consumido el pergamino y el efecto activo en globalFlags, no debe interceptar como uso de pergamino.
            vi.mocked(resolveSkillCheck).mockReset();
            
            const input2 = {
                playerAction: "Dinos oveja, ¿qué te preocupa?",
                interpretation: { actionType: 'narrate', activatedEffects: ['speak_with_animals'] },
                party: result1.updatedParty,
                currentLocationId: 'loc-1',
                adventureData: mockAdventureDataWithScroll,
                conversationHistory: [],
                enemiesByLocation: {},
                enemies: [],
                worldState: result1.updatedWorldState
            };

            const result2 = await executeNarrativeTurn(input2);

            // No se debe llamar a resolveSkillCheck para el pergamino
            expect(resolveSkillCheck).not.toHaveBeenCalled();
            expect((result2 as any).systemFeedback).toBeUndefined();
        });

        it('Test 8: should allow physically picking up the scroll and placing it in character\'s inventory without triggering a skill check', async () => {
            vi.mocked(resolveSkillCheck).mockReset();

            const input = {
                playerAction: "Cojo el pergamino de la oveja y me lo guardo en mi inventario",
                interpretation: { actionType: 'interact', targetId: 'Pergamino' },
                party: mockParty,
                currentLocationId: 'loc-1',
                adventureData: mockAdventureDataWithScroll,
                conversationHistory: [],
                enemiesByLocation: {},
                enemies: [],
                worldState: { globalFlags: {} }
            };

            const result = await executeNarrativeTurn(input);

            // 1. Debe haber sido interceptado para el procesamiento físico
            expect(result.updatedWorldState.globalFlags.took_scroll_speak_with_animals).toBe(true);

            // 2. Debe añadirse físicamente al inventario del personaje activo (Hero / Fighter)
            const hasScroll = result.updatedParty[0].inventory?.some((item: any) =>
                /pergamino|scroll/i.test(item.name)
            );
            expect(hasScroll).toBe(true);

            // 3. No se debe llamar a resolveSkillCheck
            expect(resolveSkillCheck).not.toHaveBeenCalled();

            // 4. El systemFeedback debe explicar que se ha cogido
            expect(narrativeManager.narrativeExpert).toHaveBeenCalledWith(
                expect.objectContaining({
                    systemFeedback: expect.stringContaining("recoge el pergamino")
                })
            );
        });
    });
});


