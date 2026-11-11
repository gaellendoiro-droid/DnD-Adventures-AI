import { processCompanionReactionsStreaming } from '../src/ai/flows/managers/companion-reaction-manager';
import { isEntityOutOfCombat } from '../src/lib/game/entity-status-utils';
import { Character } from '../src/lib/types';

async function main() {
    console.log('Testing Companion Reaction Logic...');

    const playerChar: Character = {
        id: 'p1',
        name: 'Merryl',
        controlledBy: 'Player', // Expected value
        hp: { current: 10, max: 10 },
        isDead: false,
        race: 'Elf', characterClass: 'Rogue', inventory: [], skills: [], level: 1, spells: [], abilityScores: {} as any, background: 'Criminal', sex: 'Female', color: 'Purple', personality: 'Sassy'
    } as any;

    const aiChar: Character = {
        id: 'p2',
        name: 'Galador',
        controlledBy: 'AI',
        hp: { current: 10, max: 10 },
        isDead: false,
        race: 'Human', characterClass: 'Paladin', inventory: [], skills: [], level: 1, spells: [], abilityScores: {} as any, background: 'Noble', sex: 'Male', color: 'Blue', personality: 'Noble'
    } as any;

    const party = [playerChar, aiChar];

    console.log('Checking isEntityOutOfCombat:');
    console.log(`Merryl (Player): ${!isEntityOutOfCombat(playerChar)}`);
    console.log(`Galador (AI): ${!isEntityOutOfCombat(aiChar)}`);

    console.log('\nRunning Stream...');
    const stream = processCompanionReactionsStreaming({
        party,
        playerAction: 'Hola a todos',
        interpretation: { actionType: 'interact' } as any,
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
