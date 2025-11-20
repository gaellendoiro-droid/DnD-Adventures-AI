
process.env.GOOGLE_API_KEY = 'dummy';
import { combatManagerTool, executeCombatManager } from '../../src/ai/tools/combat-manager';
import { describe, it, expect, vi, beforeEach } from 'vitest'; // Assuming vitest or jest
import { Combatant } from '../../src/lib/types';

// Mock dependencies
vi.mock('../../src/ai/tools/dice-roller', () => ({
    diceRollerTool: vi.fn().mockImplementation(async (input) => {
        if (input.rollNotation) {
            // Mock attack roll
            if (input.rollNotation.includes('1d20')) {
                return {
                    totalResult: 18, // Hit
                    outcome: 'success',
                    rollNotation: input.rollNotation,
                    individualRolls: [{ result: 18 }]
                };
            }
            // Mock damage roll
            if (input.rollNotation.includes('1d8') || input.rollNotation.includes('1d6')) {
                return {
                    totalResult: 5,
                    outcome: 'success',
                    rollNotation: input.rollNotation,
                    individualRolls: [{ result: 5 }]
                };
            }
        }
        return { totalResult: 10, outcome: 'success' };
    })
}));

vi.mock('../../src/ai/flows/narrative-manager', () => ({
    narrativeExpert: vi.fn().mockResolvedValue({
        dmNarration: "Narración simulada del combate.",
        debugLogs: []
    })
}));

vi.mock('../../src/ai/tools/combat/combat-narration-expert', () => ({
    combatNarrationExpertTool: vi.fn().mockResolvedValue({
        narration: "Una descripción épica del combate.",
        debugLogs: []
    })
}));

vi.mock('../../src/ai/flows/markdown-to-html', () => ({
    markdownToHtml: vi.fn().mockImplementation((markdown) => Promise.resolve(markdown))
}));

vi.mock('../../src/ai/tools/enemy-tactician', () => ({
    enemyTacticianTool: vi.fn().mockResolvedValue({
        narration: "El enemigo ataca.",
        targetId: "player-1",
        diceRolls: [{ rollNotation: "1d20+3", purpose: "attack" }]
    })
}));

vi.mock('../../src/ai/tools/companion-tactician', () => ({
    companionTacticianTool: vi.fn().mockResolvedValue({
        narration: "El compañero ataca.",
        targetId: "enemy-1",
        diceRolls: [{ rollNotation: "1d20+3", purpose: "attack" }]
    })
}));

// Mock Genkit tool definition if needed, or just import the function if exported
// Since combatManagerTool is a tool action, we might need to invoke it differently depending on the framework.
// Assuming we can call it as a function for testing.

describe('CombatManager Integration', () => {
    const mockParty = [
        {
            id: 'player-1',
            name: 'Heroe',
            race: 'Humano',
            characterClass: 'Guerrero',
            level: 1,
            sex: 'Masculino',
            background: 'Soldado',
            color: '#0000ff',
            personality: 'Valiente',
            abilityScores: {
                fuerza: 16,
                destreza: 14,
                constitución: 14,
                inteligencia: 10,
                sabiduría: 12,
                carisma: 10
            },
            abilityModifiers: {
                fuerza: 3,
                destreza: 2,
                constitución: 2,
                inteligencia: 0,
                sabiduría: 1,
                carisma: 0
            },
            skills: [{ name: 'Atletismo', proficient: true }],
            proficiencyBonus: 2,
            isDead: false,
            hp: { current: 20, max: 20 },
            ac: 16,
            stats: { dexterity: 14 }, // Legacy field, kept for compatibility if needed
            controlledBy: 'Player' as const,
            inventory: [
                { id: 'item-1', name: 'Espada Larga', quantity: 1, description: 'Daño: 1d8 cortante' }
            ],
            spells: []
        }
    ];

    const mockEnemies = [
        {
            uniqueId: 'goblin-1',
            id: 'goblin-1',
            name: 'Goblin',
            hp: { current: 10, max: 10 },
            ac: 12,
            controlledBy: 'AI'
        }
    ];

    const mockInitiativeOrder: Combatant[] = [
        { id: 'player-1', characterName: 'Heroe', total: 15, type: 'player', controlledBy: 'Player' },
        { id: 'goblin-1', characterName: 'Goblin', total: 10, type: 'npc', controlledBy: 'AI' }
    ];

    it('should process player attack and apply damage using Rules Engine', async () => {
        const input = {
            playerAction: 'Ataco al goblin',
            inCombat: true,
            locationId: 'loc-1',
            interpretedAction: {
                actionType: 'attack' as const,
                targetId: 'goblin-1',
                detectedEntity: 'Goblin'
            },
            locationContext: { description: 'Arena' },
            conversationHistory: [],
            combatantIds: ['player-1', 'goblin-1'],
            party: mockParty,
            initiativeOrder: mockInitiativeOrder,
            enemies: mockEnemies,
            turnIndex: 0 // Player's turn
        };

        // @ts-ignore - calling tool directly
        let result;
        try {
            result = await combatManagerTool(input);

            console.log('\n--- COMBAT SIMULATION RESULT ---');
            console.log('Messages:');
            result.messages.forEach((m: any) => console.log(`[${m.sender}]: ${m.content}`));

            const updatedGoblin = result.updatedEnemies?.find((e: any) => e.uniqueId === 'goblin-1');
            console.log('\nEnemy Status:');
            console.log(`Goblin HP: ${updatedGoblin?.hp.current}/${updatedGoblin?.hp.max}`);
            console.log('--------------------------------\n');

        } catch (error) {
            console.error('TEST FAILURE - Runtime Error:', error);
            throw error;
        }

        // Verify damage application
        const updatedGoblin = result.updatedEnemies?.find((e: any) => e.uniqueId === 'goblin-1');
        expect(updatedGoblin).toBeDefined();
        // Initial 10, Damage 5 (mocked) -> Remaining 5
        expect(updatedGoblin.hp.current).toBe(5);

        // Verify messages
        const damageMessage = result.messages.find((m: any) => m.content.includes('5 puntos de daño'));
        expect(damageMessage).toBeDefined();
    });

    it('should work with explicit Dependency Injection', async () => {
        // Create mock dependencies
        const mockDiceRoller = vi.fn().mockImplementation(async (input) => {
            if (input.rollNotation.includes('1d20')) {
                return {
                    totalResult: 20, // Critical hit!
                    outcome: 'crit',
                    rollNotation: input.rollNotation,
                    individualRolls: [{ result: 20 }]
                };
            }
            // For critical hits, damage dice are doubled (e.g., 2d8 instead of 1d8)
            if (input.rollNotation.includes('2d8')) {
                return {
                    totalResult: 12, // Enough to kill (10 HP goblin)
                    outcome: 'crit',
                    rollNotation: input.rollNotation,
                    individualRolls: [{ result: 6 }, { result: 6 }]
                };
            }
            if (input.rollNotation.includes('1d8') || input.rollNotation.includes('1d6')) {
                return {
                    totalResult: 6, // Regular damage
                    outcome: 'success',
                    rollNotation: input.rollNotation,
                    individualRolls: [{ result: 6 }]
                };
            }
            return { totalResult: 10, outcome: 'success' };
        });

        const mockCombatNarration = vi.fn().mockResolvedValue({
            narration: "¡Un golpe crítico devastador!",
            debugLogs: []
        });

        const mockUpdateRollNotation = vi.fn();

        const input = {
            playerAction: 'Ataco al goblin con todas mis fuerzas',
            inCombat: true,
            locationId: 'loc-1',
            interpretedAction: {
                actionType: 'attack' as const,
                targetId: 'goblin-1',
                detectedEntity: 'Goblin'
            },
            locationContext: { description: 'Arena' },
            conversationHistory: [],
            combatantIds: ['player-1', 'goblin-1'],
            party: mockParty,
            initiativeOrder: mockInitiativeOrder,
            enemies: mockEnemies,
            turnIndex: 0
        };

        // Call executeCombatManager directly with DI
        const result = await executeCombatManager(input, {
            diceRollerTool: mockDiceRoller as any,
            combatNarrationExpertTool: mockCombatNarration as any,
            updateRollNotationWithModifiers: mockUpdateRollNotation as any,
        });

        console.log('\n--- COMBAT SIMULATION RESULT (with DI) ---');
        console.log('Messages:');
        result.messages.forEach((m: any) => console.log(`[${m.sender}]: ${m.content}`));

        const updatedGoblin = result.updatedEnemies?.find((e: any) => e.uniqueId === 'goblin-1');
        console.log('\nEnemy Status:');
        console.log(`Goblin HP: ${updatedGoblin?.hp.current}/${updatedGoblin?.hp.max}`);
        console.log('--------------------------------\n');

        // Verify critical hit killed the goblin
        // When combat ends, enemies array is cleared, but updatedEnemies should still have the final state
        // Check updatedEnemies first (if combat ended, it may be empty in enemies but present in updatedEnemies)
        const updatedGoblinHP = result.updatedEnemies?.find((e: any) => e.uniqueId === 'goblin-1');
        
        // If combat ended, updatedEnemies might be empty, but we can verify from the messages
        if (result.inCombat) {
            expect(updatedGoblinHP).toBeDefined();
            // Initial 10 HP, critical hit damage 12 (2d8 + modifier) -> Dead (0 HP)
            expect(updatedGoblinHP.hp.current).toBe(0);
        } else {
            // Combat ended - verify through messages instead
            expect(result.inCombat).toBe(false);
        }

        // Verify mocks were called
        expect(mockDiceRoller).toHaveBeenCalled();
        expect(mockCombatNarration).toHaveBeenCalled();

        // Verify critical hit and kill messages
        const critMessage = result.messages.find((m: any) => m.content.includes('crítico'));
        expect(critMessage).toBeDefined();
        
        const killMessage = result.messages.find((m: any) => m.content.includes('matado'));
        expect(killMessage).toBeDefined();
        
        // Verify combat ended
        expect(result.inCombat).toBe(false);
    });
});
