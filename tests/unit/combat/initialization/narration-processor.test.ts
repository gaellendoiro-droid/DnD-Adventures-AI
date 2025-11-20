import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NarrationProcessor } from '../../../../src/lib/combat/initialization/narration-processor';

vi.mock('../../../../src/lib/combat/monster-name-manager', () => ({
    replaceOrdinalReferences: vi.fn((text) => text),
    escapeRegex: vi.fn((str) => str.replace(/[.*+?^${}()|[\]\]/g, '\\$&'))
}));

describe('NarrationProcessor', () => {
    const mockNarrativeExpert = vi.fn();
    const mockMarkdownToHtml = vi.fn((input: { markdown: string }) => Promise.resolve({ html: `<p>${input.markdown}</p>` }));
    const mockLocalLog = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should generate combat narration and replace enemy identifiers', async () => {
        const initiativeOrder = [
            { id: 'player-1', characterName: 'Hero', controlledBy: 'Player', type: 'ally' },
            { id: 'goblin-1', characterName: 'Goblin 1', controlledBy: 'AI', type: 'enemy' }
        ];

        const differentiatedNames = new Map([
            ['goblin-1', 'Goblin 1']
        ]);

        const enemies = [
            { uniqueId: 'goblin-1', name: 'Goblin', hp: { current: 8, max: 8 }, ac: 12 }
        ];

        const party = [
            { id: 'player-1', name: 'Hero', hp: { current: 10, max: 10 }, controlledBy: 'Player' }
        ];

        mockNarrativeExpert.mockResolvedValue({
            dmNarration: 'El goblin-1 observa al heroe.',
            debugLogs: []
        });

        const messages = await NarrationProcessor.generateCombatNarration(
            initiativeOrder as any,
            party as any,
            enemies as any,
            differentiatedNames,
            'Ataco',
            'loc-1',
            { description: 'Arena' },
            [],
            { actionType: 'initiate_combat' },
            mockNarrativeExpert,
            mockMarkdownToHtml as any,
            mockLocalLog
        );

        expect(mockNarrativeExpert).toHaveBeenCalled();
        expect(messages).toHaveLength(1);
        expect(messages[0].content).toContain('Goblin 1');
    });
});
