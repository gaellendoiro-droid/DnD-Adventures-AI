
import { processCompanionReactionsStreaming } from '../src/ai/flows/managers/companion-reaction-manager';
import { canEntityReact } from '../src/lib/game/entity-status-utils';
import { Character } from '../src/lib/types';

async function main() {
    console.log('Testing Companion Reaction Logic...');

    const playerChar: Character = {
        id: 'p1',
        name: 'Merryl',
        controlledBy: 'Player', // Expected value
        hp: { current: 10, max: 10 },
        isDead: false,
        race: 'Elf', characterClass: 'Rogue', stats: {} as any, inventory: [], skills: [], statusEffects: [], level: 1, accessories: [], armor: [], weapons: [], spells: [], abilityScores: {} as any, background: 'Criminal', sex: 'Female', color: 'Purple', personality: 'Sassy'
    };

    const aiChar: Character = {
        id: 'p2',
        name: 'Galador',
        controlledBy: 'AI',
        hp: { current: 10, max: 10 },
        isDead: false,
        race: 'Human', characterClass: 'Paladin', stats: {} as any, inventory: [], skills: [], statusEffects: [], level: 1, accessories: [], armor: [], weapons: [], spells: [], abilityScores: {} as any, background: 'Noble', sex: 'Male', color: 'Blue', personality: 'Noble'
    };

    const party = [playerChar, aiChar];

    console.log('Checking canEntityReact:');
    console.log(`Merryl (Player): ${canEntityReact(playerChar)}`);
    console.log(`Galador (AI): ${canEntityReact(aiChar)}`);

    console.log('\nRunning Stream...');
    const stream = processCompanionReactionsStreaming({
        party,
        playerAction: 'Hola a todos',
        interpretation: { actionType: 'interact' },
        inCombat: false,
        timing: 'before_dm',
        isAdventureStart: false,
        chatHistory: ''
    });

    for await (const event of stream) {
        console.log('Event:', event.type, (event as any).message?.senderName);
    }
    console.log('Done.');
}

main().catch(console.error);
