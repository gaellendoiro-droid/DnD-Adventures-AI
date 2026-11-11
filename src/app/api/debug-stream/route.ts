import { NextRequest, NextResponse } from 'next/server';
import { gameStreamCoordinator } from '@/ai/streaming/game-stream-coordinator';
import { GameState } from '@/ai/flows/schemas';

export async function POST(req: NextRequest) {
    console.log('DEBUG STREAM: Start');
    const mockState: GameState = {
        playerAction: 'Mirar alrededor',
        party: [
            { id: 'p1', name: 'Gael', race: 'Human', characterClass: 'Fighter', hp: { current: 10, max: 10 }, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, inventory: [], skills: [], statusEffects: [], level: 1, accessories: [], armor: [], weapons: [], spells: [], controlledBy: 'Player' } as any
        ],
        locationId: 'posada-rocacolina', // Valid ID from known adventure
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
        console.log('DEBUG STREAM: Calling coordinator');
        const generator = gameStreamCoordinator(mockState);
        console.log('DEBUG STREAM: Generator created');

        const events = [];
        for await (const event of generator) {
            console.log('DEBUG STREAM: Event received', event.type);
            events.push(event);
        }
        console.log('DEBUG STREAM: Finished');
        return NextResponse.json({ success: true, events });
    } catch (error: any) {
        console.error('DEBUG STREAM: CRASH', error);
        return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
    }
}
