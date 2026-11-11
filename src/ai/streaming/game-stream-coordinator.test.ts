
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gameStreamCoordinator } from './game-stream-coordinator';
import { GameStreamEvent } from '@/lib/streaming/types';

// Mock dependencies
vi.mock('@/app/game-state-actions', () => ({
    getAdventureData: vi.fn().mockResolvedValue({
        adventureId: 'test-adv',
        locations: [{ id: 'start', title: 'Start Room', entitiesPresent: [] }]
    })
}));

vi.mock('@/lib/game/entity-status-utils', () => ({
    areAllEntitiesOutOfCombat: vi.fn().mockReturnValue(false),
    areAllEntitiesDead: vi.fn().mockReturnValue(false)
}));

vi.mock('@/ai/flows/action-interpreter', () => ({
    actionInterpreter: vi.fn().mockResolvedValue({
        interpretation: { actionType: 'look', targetId: null },
        debugLogs: []
    })
}));

vi.mock('@/ai/flows/ooc-assistant', () => ({
    oocAssistant: vi.fn()
}));

vi.mock('@/lib/combat/combat-initiation-service', () => ({
    CombatInitiationService: {
        evaluatePlayerAction: vi.fn()
    }
}));

vi.mock('@/ai/tools/combat-initiation-expert', () => ({
    combatInitiationExpertTool: vi.fn()
}));

vi.mock('@/ai/tools/combat-manager', () => ({
    combatManagerTool: vi.fn()
}));

vi.mock('@/ai/flows/managers/narrative-turn-manager', () => ({
    executeNarrativeTurn: vi.fn().mockResolvedValue({
        messages: [
            { sender: 'DM', content: 'You look around.', originalContent: 'You look around.' }
        ],
        debugLogs: [],
        updatedParty: [],
        updatedWorldTime: { day: 1, hour: 12, minute: 0 }
    }),
    executeNarrativeTurnStreaming: vi.fn().mockImplementation(async function* () {
        yield { type: 'debug', content: 'Generating DM Content...' };
        yield { type: 'dm_narration', content: 'You look around.' };
    })
}));

describe('GameStreamCoordinator', () => {
    it('yields events in correct order for narrative turn', async () => {
        const input: any = {
            playerAction: 'Look around',
            party: [{ name: 'Hero', hp: { current: 10, max: 10 } }],
            locationId: 'start',
            conversationHistory: [],
            inCombat: false
        };

        const generator = gameStreamCoordinator(input);
        const events: GameStreamEvent[] = [];

        for await (const event of generator) {
            events.push(event);
        }

        // Verify sequence
        expect(events.length).toBeGreaterThan(0);
        expect(events[0].type).toBe('debug');

        // Should have tool_start for world_sim
        expect(events.find(e => e.type === 'tool_start' && (e.payload as any).tool === 'world_sim')).toBeDefined();

        // Should have tokens
        const tokens = events.filter(e => e.type === 'token');
        expect(tokens.length).toBeGreaterThan(0);
        expect(tokens.map(t => (t.payload as any).content).join('')).toContain('You look around.');

        // Should have state_delta
        expect(events.find(e => e.type === 'state_delta')).toBeDefined();

        // Should have stream_done
        expect(events[events.length - 1].type).toBe('stream_done');
    });
});
