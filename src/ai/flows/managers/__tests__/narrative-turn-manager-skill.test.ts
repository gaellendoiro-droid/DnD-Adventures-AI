
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeNarrativeTurn } from '../narrative-turn-manager';
import { skillCheckExpert } from '../../experts/skill-check-expert';
import * as narrativeManager from '../../narrative-manager';
import { Character } from '@/lib/types';

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
    processCompanionReactions: vi.fn().mockResolvedValue({ messages: [], debugLogs: [] })
}));

vi.mock('../navigation-manager', () => ({
    NavigationManager: {
        resolveMovement: vi.fn(),
        updateWorldTime: vi.fn()
    }
}));

vi.mock('../interaction-handler', () => ({
    InteractionHandler: {
        processInteraction: vi.fn(),
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

// Markdown to HTML mock (ya que se usa en el mensaje final)
vi.mock('../../markdown-to-html', () => ({
    markdownToHtml: vi.fn().mockImplementation(async ({ markdown }) => ({ html: markdown }))
}));

// Combat Evaluator mock
vi.mock('@/lib/combat/trigger/combat-trigger-evaluator', () => ({
    CombatTriggerEvaluator: {
        evaluateExploration: vi.fn().mockReturnValue({ shouldStartCombat: false, reason: null, message: null })
    }
}));

// Mock simple de adventure data
const mockAdventureData = {
    locations: [
        { id: 'loc-1', title: 'Start Room', entitiesPresent: [], connections: [] }
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
    conditions: []
}];

describe('NarrativeTurnManager - Skill Checks Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should trigger skill check flow when actionType is skill_check', async () => {
        // 1. Setup Mock Responses
        // Skill Check Expert AI decision
        vi.mocked(skillCheckExpert).mockResolvedValue({
            selectedSkill: 'athletics',
            difficultyClass: 10, // Easy DC to ensure success with +5 mod
            suggestedMode: 'normal',
            reasoning: 'Climbing wall',
            narrations: {
                attempt: 'Intentas escalar...',
                success: 'Subes con exito.',
                failure: 'Resbalas y caes.',
                criticalSuccess: 'Subes volando.',
                criticalFailure: 'Te rompes la crisma.'
            }
        });

        // Narrative Expert (should NOT be called if we use skill check narration override)
        // Pero el codigo dice: IF skillCheckNarration AND !isLocationChange, skip it.
        vi.mocked(narrativeManager.narrativeExpert).mockResolvedValue({
            dmNarration: 'Generic room description',
            debugLogs: []
        });

        // 2. Execute Input
        const input = {
            playerAction: "Climb wall",
            interpretation: { actionType: 'skill_check', targetId: null },
            party: mockParty,
            currentLocationId: 'loc-1',
            adventureData: mockAdventureData,
            conversationHistory: [],
            enemiesByLocation: {},
            enemies: []
        };

        const result = await executeNarrativeTurn(input);

        // 3. Assertions

        // a. Verify SkillCheckExpert interaction
        expect(skillCheckExpert).toHaveBeenCalledTimes(1);
        expect(skillCheckExpert).toHaveBeenCalledWith(expect.objectContaining({
            playerAction: "Climb wall",
            characterName: "Hero"
        }));

        // b. Verify DiceRoll produced
        expect(result.diceRolls).toBeDefined();
        expect(result.diceRolls).toHaveLength(1);
        const roll = result.diceRolls![0];
        expect(roll.type).toBe('skill_check');
        expect(roll.skillCheckDetails?.skillName).toBe('athletics');
        expect(roll.skillCheckDetails?.difficultyClass).toBe(10);

        // c. Verify Narration Override
        // Expected: "Intentas escalar...\n\nSubes con exito." (assuming roll was > 10)
        // Since dice logic is real and random, result could be success or failure,
        // but the MESSAGE content should match one of the aiDecision narrations.
        expect(result.messages).toHaveLength(1); // Assuming companion reactions skipped or empty
        const dmMessage = result.messages.find(m => m.sender === 'DM');
        expect(dmMessage).toBeDefined();

        const content = dmMessage!.content;
        expect(content).toContain('Intentas escalar...');

        // d. Verify Narrative Expert was SKIPPED (optimization)
        expect(narrativeManager.narrativeExpert).not.toHaveBeenCalled();
    });

    it('should fallback to narrative expert if skill check fails or is not triggered', async () => {
        // Case: Regular 'narrate' action
        vi.mocked(narrativeManager.narrativeExpert).mockResolvedValue({
            dmNarration: 'Just looking around.',
            debugLogs: []
        });

        const input = {
            playerAction: "Look around",
            interpretation: { actionType: 'narrate', targetId: null },
            party: mockParty,
            currentLocationId: 'loc-1',
            adventureData: mockAdventureData,
            conversationHistory: [],
            enemiesByLocation: {},
            enemies: []
        };

        const result = await executeNarrativeTurn(input);

        expect(skillCheckExpert).not.toHaveBeenCalled();
        expect(result.diceRolls).toBeUndefined();
        expect(narrativeManager.narrativeExpert).toHaveBeenCalledTimes(1);
    });
});
