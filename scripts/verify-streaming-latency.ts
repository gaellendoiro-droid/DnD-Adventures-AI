
import { gameStreamCoordinator } from '../src/ai/streaming/game-stream-coordinator';
import { GameState } from '../src/ai/flows/schemas';

async function main() {
    console.log('Starting Latency Verification...');

    // Mock minimal valid state
    const mockState: any = {
        playerAction: 'Mirar alrededor', // Simple action triggers narrative
        party: [
            {
                id: 'p1', name: 'Gael', race: 'Human', characterClass: 'Fighter',
                hp: { current: 10, max: 10 },
                stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
                inventory: [], skills: [], statusEffects: [], level: 1,
                accessories: [], armor: [], weapons: [], spells: [],
                controlledBy: 'Player',
                abilityScores: { fuerza: 10, destreza: 10, constitución: 10, inteligencia: 10, sabiduría: 10, carisma: 10 },
                background: 'Soldier', sex: 'Male', color: 'Red', personality: 'Brave'
            }
        ],
        locationId: 'phandalin-plaza-del-pueblo', // Use a valid ID from the JSON if possible
        inCombat: false,
        conversationHistory: [],
        enemiesByLocation: {},
        exploration: { knownLocations: {} },
        openDoors: {},
        worldTime: { day: 1, hour: 8, minute: 0 }
    };

    const startTime = Date.now();
    let firstTokenTime = 0;
    let dmMessageTime = 0;
    let companionMessageTime = 0;

    try {
        const generator = gameStreamCoordinator(mockState as GameState);
        console.log('Generator created.');

        for await (const event of generator) {
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;

            if (event.type === 'token') {
                if (firstTokenTime === 0) {
                    firstTokenTime = elapsed;
                    console.log(`[${elapsed.toFixed(3)}s] FIRST TOKEN (${event.role}): ${JSON.stringify(event.content).substring(0, 20)}...`);
                }
            } else if (event.type === 'state_delta') {
                if (event.data?.messages) {
                    const msgs = event.data.messages;
                    for (const m of msgs) {
                        console.log(`[${elapsed.toFixed(3)}s] MESSAGE from ${m.sender}: "${m.content.substring(0, 30)}..."`);
                        if (m.sender === 'DM') dmMessageTime = elapsed;
                        else companionMessageTime = elapsed;
                    }
                }
            } else if (event.type === 'debug') {
                console.log(`[${elapsed.toFixed(3)}s] DEBUG: ${event.message}`);
            } else if (event.type === 'tool_start') {
                console.log(`[${elapsed.toFixed(3)}s] TOOL START: ${event.tool}`);
            } else if (event.type === 'tool_end') {
                console.log(`[${elapsed.toFixed(3)}s] TOOL END: ${event.tool}`);
            }
        }
        console.log('Stream finished.');
        console.log('-----------------------------------');
        console.log(`Time to First Token: ${firstTokenTime.toFixed(3)}s`);
        console.log(`Time to DM Message: ${dmMessageTime.toFixed(3)}s`);
        console.log(`Time to Companion Message: ${companionMessageTime.toFixed(3)}s`);

    } catch (error) {
        console.error('CRASH DETECTED:', error);
    }
}

main().catch(console.error);
