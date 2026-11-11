import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeNarrativeTurn, executeNarrativeTurnStreaming } from '../narrative-turn-manager';
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

vi.mock('@/lib/dice/dice-engine', () => ({
    rollD20: vi.fn().mockReturnValue({
        die1: 10,
        die2: null,
        kept: 10,
        naturalCrit: false,
        naturalFail: false,
    }),
}));

vi.mock('../companion-reaction-manager', () => ({
    processCompanionReactions: vi.fn().mockResolvedValue({ messages: [], debugLogs: [] }),
    processCompanionReactionsStreaming: vi.fn().mockImplementation(async function* () {
        // Yield nothing
    })
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
    narrativeExpert: vi.fn().mockResolvedValue({ dmNarration: "", debugLogs: [] }),
}));

vi.mock('../../markdown-to-html', () => ({
    markdownToHtml: vi.fn().mockImplementation(async ({ markdown }) => ({ html: markdown }))
}));

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
    abilityScores: { fuerza: 10, destreza: 10, constitución: 10, inteligencia: 10, sabiduría: 10, carisma: 10 },
    skills: [
        { name: 'deception', proficient: true, modifier: 2 }
    ],
    inventory: [],
    hp: { current: 10, max: 10 },
    ac: 15,
    abilityModifiers: { fuerza: 0, destreza: 0, constitución: 0, inteligencia: 0, sabiduría: 0, carisma: 0 },
    proficiencyBonus: 2,
    speed: 30,
    initiative: 0,
    savingThrows: { fuerza: 0, destreza: 0, constitución: 0, inteligencia: 0, sabiduría: 0, carisma: 0 },
    isDead: false,
    spells: [],
    attacks: [],
    controlledBy: 'Player'
}];

describe('NarrativeTurnManager - Social Skill Checks & Combat Transition', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should trigger combat on failure when combatOnFailure is true (synchronous)', async () => {
        // Mock a failure check (high DC) with combatOnFailure: true
        vi.mocked(skillCheckExpert).mockResolvedValue({
            selectedSkill: 'deception',
            difficultyClass: 30, // Impossible DC to guarantee failure
            suggestedMode: 'normal',
            combatOnFailure: true,
            reasoning: 'Lying to hostile NPC',
            narrations: {
                attempt: 'Intentas convencerle...',
                success: 'Le convences.',
                failure: 'Descubre tu mentira y se enfurece.',
                criticalSuccess: 'Se lo cree todo.',
                criticalFailure: 'Te ataca de inmediato.'
            }
        });

        const input = {
            playerAction: "Miento a Guz diciendo que no tengo la oveja",
            interpretation: { actionType: 'skill_check', targetId: 'Guz' },
            party: mockParty,
            currentLocationId: 'loc-1',
            adventureData: mockAdventureData,
            conversationHistory: [],
            enemiesByLocation: {},
            enemies: []
        };

        const result = await executeNarrativeTurn(input);

        // Verify skill check was performed
        expect(skillCheckExpert).toHaveBeenCalledTimes(1);
        expect(result.diceRolls).toBeDefined();
        expect(result.diceRolls).toHaveLength(1);

        // Verify combat was triggered
        expect(result.combatTriggerResult).toBeDefined();
        expect(result.combatTriggerResult?.shouldStartCombat).toBe(true);
        expect(result.combatTriggerResult?.reason).toBe('provocation');
        
        // Verify narration was suppressed due to combat triggering
        const dmMsg = result.messages.find(m => m.sender === 'DM');
        expect(dmMsg).toBeUndefined();
    });

    it('should yield logic_updates and combatTriggerResult in streaming mode', async () => {
        // Mock a failure check with combatOnFailure: true
        vi.mocked(skillCheckExpert).mockResolvedValue({
            selectedSkill: 'deception',
            difficultyClass: 30,
            suggestedMode: 'normal',
            combatOnFailure: true,
            reasoning: 'Lying to hostile NPC',
            narrations: {
                attempt: 'Intentas convencerle...',
                success: 'Le convences.',
                failure: 'Descubre tu mentira y se enfurece.',
                criticalSuccess: 'Se lo cree todo.',
                criticalFailure: 'Te ataca de inmediato.'
            }
        });

        const input = {
            playerAction: "Miento a Guz diciendo que no tengo la oveja",
            interpretation: { actionType: 'skill_check', targetId: 'Guz' },
            party: mockParty,
            currentLocationId: 'loc-1',
            adventureData: mockAdventureData,
            conversationHistory: [],
            enemiesByLocation: {},
            enemies: []
        };

        const generator = executeNarrativeTurnStreaming(input);
        const steps = [];
        for await (const step of generator) {
            steps.push(step);
        }

        // Verify we received logic_update steps containing the dice roll and combat trigger
        const logicUpdates = steps.filter(s => s.type === 'logic_update');
        expect(logicUpdates.length).toBeGreaterThanOrEqual(2);

        // One logic update should contain the rolls
        const rollUpdate = logicUpdates.find(u => u.data?.diceRolls);
        expect(rollUpdate).toBeDefined();
        expect(rollUpdate?.data?.diceRolls).toHaveLength(1);
        expect(rollUpdate?.data?.diceRolls[0].type).toBe('skill_check');

        // One logic update should contain the combatTriggerResult
        const combatUpdate = logicUpdates.find(u => u.data?.combatTriggerResult);
        expect(combatUpdate).toBeDefined();
        expect(combatUpdate?.data?.combatTriggerResult?.shouldStartCombat).toBe(true);
        expect(combatUpdate?.data?.combatTriggerResult?.reason).toBe('provocation');
    });
});
