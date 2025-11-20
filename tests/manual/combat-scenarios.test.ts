
import { describe, it, expect, vi } from 'vitest';
import { combatManagerTool } from '../../src/ai/tools/combat-manager';
import { Combatant } from '../../src/lib/types';

// --- Mocks ---
vi.mock('../../src/ai/tools/dice-roller', () => ({
    diceRollerTool: vi.fn().mockImplementation(async (input) => {
        const notation = input.rollNotation || '';
        if (notation.includes('1d20')) {
            // Attack roll
            return { totalResult: 18, outcome: 'success', rollNotation: notation, individualRolls: [{ result: 18 }] };
        }
        if (notation.includes('1d8') || notation.includes('1d6')) {
            // Damage roll
            return { totalResult: 6, outcome: 'success', rollNotation: notation, individualRolls: [{ result: 6 }] };
        }
        return { totalResult: 10, outcome: 'success' };
    })
}));

vi.mock('../../src/ai/flows/narrative-manager', () => ({
    narrativeExpert: vi.fn().mockResolvedValue({
        dmNarration: "Narración de combate simulada.",
        debugLogs: []
    })
}));

vi.mock('../../src/ai/flows/markdown-to-html', () => ({
    markdownToHtml: vi.fn().mockImplementation(async ({ markdown }) => ({ html: `<p>${markdown}</p>` }))
}));

vi.mock('../../src/ai/tools/enemy-tactician', () => ({
    enemyTacticianTool: vi.fn().mockResolvedValue({
        narration: "El enemigo contraataca.",
        targetId: "player-1",
        diceRolls: [{ rollNotation: "1d20+4", purpose: "attack" }]
    })
}));

vi.mock('../../src/ai/tools/companion-tactician', () => ({
    companionTacticianTool: vi.fn().mockResolvedValue({
        narration: "El compañero ayuda.",
        targetId: "enemy-1",
        diceRolls: []
    })
}));

// Mock getAdventureData for initialization
vi.mock('../../src/app/game-state-actions', () => ({
    getAdventureData: vi.fn().mockResolvedValue({
        entities: [{ id: 'goblin-1', name: 'Goblin', hp: 15, ac: 12 }]
    })
}));

vi.mock('../../src/lib/combat/monster-stats-parser', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as any),
        getMonsterStatsFromDndApi: vi.fn().mockResolvedValue({ hp: 15, ac: 12 })
    };
});

describe.skip('Manual Combat Scenario', () => {
    it('should run a full combat sequence', async () => {
        console.log('\n=== STARTING MANUAL COMBAT SCENARIO ===\n');

        const party = [{
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
            skills: [{ name: 'Atletismo', proficient: true }],
            proficiencyBonus: 2,
            isDead: false,
            hp: { current: 20, max: 20 },
            ac: 16,
            stats: { dexterity: 14 },
            controlledBy: 'Player' as const,
            inventory: [
                { id: 'item-1', name: 'Espada Larga', quantity: 1, description: 'Daño: 1d8 cortante' }
            ],
            spells: []
        }];

        // Step 1: Initialization
        console.log('--- Step 1: Initialization ---');
        let state = {
            playerAction: 'Ataco al goblin',
            inCombat: false,
            locationId: 'loc-1',
            interpretedAction: { actionType: 'attack' as const, target: 'goblin-1' },
            locationContext: { description: 'Arena' },
            conversationHistory: [],
            combatantIds: ['player-1', 'goblin-1'],
            party: party,
            enemies: [] as any[],
            turnIndex: undefined as number | undefined,
            initiativeOrder: undefined as any
        };

        // @ts-ignore
        // @ts-ignore
        let result;
        try {
            result = await combatManagerTool(state);
            logResult(result);
        } catch (error) {
            console.error('ERROR in Step 1:', error);
            throw error;
        }

        expect(result.inCombat).toBe(true);
        state.inCombat = true;
        state.enemies = result.enemies || [];
        state.initiativeOrder = result.initiativeOrder;
        state.turnIndex = result.turnIndex;

        // Step 2: Player Attack
        console.log('\n--- Step 2: Player Attack ---');
        // Assume player won initiative (mocked in initialization if needed, but let's force it)
        // If turnIndex is 0 and player is at 0, good.
        if (state.initiativeOrder[state.turnIndex!].controlledBy !== 'Player') {
            console.log('Force switching to Player turn for test...');
            state.turnIndex = state.initiativeOrder.findIndex((c: any) => c.controlledBy === 'Player');
        }

        state.playerAction = 'Ataco con mi espada';
        state.interpretedAction = { actionType: 'attack' as const, target: 'goblin-1' };

        // @ts-ignore
        result = await combatManagerTool(state);
        logResult(result);

        // Update state
        state.enemies = result.updatedEnemies || state.enemies;
        state.party = result.updatedParty || state.party;
        state.turnIndex = result.turnIndex;

        // Step 3: Enemy Turn (if not dead)
        console.log('\n--- Step 3: Enemy Turn ---');
        // If turn advanced to enemy
        if (state.initiativeOrder[state.turnIndex!].controlledBy === 'AI') {
            // @ts-ignore
            result = await combatManagerTool({
                ...state,
                playerAction: '', // AI turn doesn't need player action
                interpretedAction: undefined
            });
            logResult(result);
            // Update state
            state.enemies = result.updatedEnemies || state.enemies;
            state.party = result.updatedParty || state.party;
            state.turnIndex = result.turnIndex;
        }

        // Step 4: Player Finisher
        console.log('\n--- Step 4: Player Finisher ---');
        // Force player turn again
        state.turnIndex = state.initiativeOrder.findIndex((c: any) => c.controlledBy === 'Player');
        state.playerAction = 'Remato al goblin';
        state.interpretedAction = { actionType: 'attack' as const, target: 'goblin-1' };

        // Mock dice roller to deal enough damage to kill (Goblin HP 15, previous dmg 6, need 9)
        // We'll rely on the mock returning 6, so maybe we need 2 more hits or a crit.
        // Let's just say the goblin has 5 HP left.
        state.enemies[0].hp.current = 5;

        // @ts-ignore
        result = await combatManagerTool(state);
        logResult(result);

        if (result.inCombat === false) {
            console.log('\n=== COMBAT ENDED SUCCESSFULLY ===');
        } else {
            console.log('\n=== COMBAT STILL ACTIVE ===');
        }

        expect(result.inCombat).toBe(false);
    });
});

function logResult(result: any) {
    console.log(`In Combat: ${result.inCombat}`);
    console.log(`Turn Index: ${result.turnIndex}`);
    console.log('Messages:');
    result.messages.forEach((m: any) => console.log(`  [${m.sender}]: ${m.content}`));
    if (result.updatedEnemies) {
        console.log('Enemies:');
        result.updatedEnemies.forEach((e: any) => console.log(`  ${e.name}: ${e.hp.current}/${e.hp.max} HP`));
    }
}
