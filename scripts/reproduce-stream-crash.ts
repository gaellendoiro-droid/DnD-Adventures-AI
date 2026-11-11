// scripts/reproduce-stream-crash.ts
import { gameStreamCoordinator } from '../src/ai/streaming/game-stream-coordinator';
import { GameState } from '../src/ai/flows/schemas';

async function main() {
    console.log('Starting crash reproduction...');

    const mockState: GameState = {
        playerAction: 'Mirar alrededor',
        party: [
            { id: 'p1', name: 'Gael', race: 'Human', characterClass: 'Fighter', hp: { current: 10, max: 10 }, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, inventory: [], skills: [], statusEffects: [], level: 1, accessories: [], armor: [], weapons: [], spells: [], controlledBy: 'Player' } as any
        ],
        locationId: 'loc-1',
        inCombat: false,
        conversationHistory: [],
        enemies: [],
        enemiesByLocation: {},
        openDoors: {},
        turnIndex: 0,
        initiativeOrder: [],
        worldState: {
            locations: {},
            globalFlags: {},
            recentEvents: [],
        } as any
    };

    try {
        const generator = gameStreamCoordinator(mockState);
        console.log('Generator created.');

        for await (const event of generator) {
            console.log('Received event:', event.type);
        }
        console.log('Stream finished successfully.');
    } catch (error) {
        console.error('CRASH DETECTED:', error);
    }
}

main().catch(console.error);
