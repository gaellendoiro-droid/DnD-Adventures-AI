
// scripts/reproduce-stream-crash.ts
import { gameStreamCoordinator } from '../src/ai/streaming/game-stream-coordinator';
import { GameState } from '../src/ai/flows/schemas';

async function main() {
    console.log('Starting crash reproduction...');

    const mockState: GameState = {
        playerAction: 'Mirar alrededor',
        party: [
            { id: 'p1', name: 'Gael', race: 'Human', class: 'Fighter', hp: { current: 10, max: 10 }, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, inventory: [], skills: [], statusEffects: [], level: 1, accessories: [], armor: [], weapons: [], spells: [], controlledBy: 'Player' }
        ],
        locationId: 'loc-1',
        inCombat: false,
        conversationHistory: [],
        diceRolls: [],
        enemies: [],
        enemiesByLocation: {},
        openDoors: {},
        turnIndex: 0,
        initiativeOrder: [],
        worldState: {
            locations: {},
            quests: {},
            npcs: {},
            globalFlags: {},
            time: {
                day: 1,
                timeOfDay: 'morning',
                turnCount: 0
            }
        }
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
