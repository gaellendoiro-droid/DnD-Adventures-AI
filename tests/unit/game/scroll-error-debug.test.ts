import { describe, it } from 'vitest';
import { gameStreamCoordinator } from '../../../src/ai/streaming/game-stream-coordinator';
import { Character } from '../../../src/lib/types';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno del archivo .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const mockParty: Character[] = [
  {
    id: '6',
    name: 'Merryl',
    race: 'Mediano',
    characterClass: 'Mago',
    level: 4,
    sex: 'Varón',
    background: 'Erudito',
    color: '#8b5cf6',
    personality: 'Curioso',
    abilityScores: { fuerza: 8, destreza: 16, constitución: 14, inteligencia: 19, sabiduría: 10, carisma: 10 },
    abilityModifiers: { fuerza: -1, destreza: 3, constitución: 2, inteligencia: 4, sabiduría: 0, carisma: 0 },
    proficiencyBonus: 2,
    hp: { current: 26, max: 26 },
    ac: 13,
    speed: 25,
    initiative: 3,
    savingThrows: { fuerza: -1, destreza: 3, constitución: 2, inteligencia: 6, sabiduría: 2, carisma: 0 },
    isDead: false,
    skills: [
      { name: 'Arcano', proficient: true, modifier: 6 }
    ],
    inventory: [
      { id: 'scroll-speak-animals', name: 'Pergamino de Hablar con los Animales (Modificado)', quantity: 1 }
    ],
    spells: [],
    attacks: [],
    controlledBy: 'AI'
  }
];

describe('Debug Scroll Stream Error', () => {
  it('runs the coordinator stream and captures error details', async () => {
    const gameState = {
      playerAction: 'Merryl, lee el pergamino',
      party: mockParty,
      locationId: 'ciudad-inicial',
      inCombat: false,
      conversationHistory: [],
      selectedCharacterId: '6'
    };

    console.log('--- STARTING COORDINATOR RUN ---');
    try {
      const stream = gameStreamCoordinator(gameState as any);
      for await (const event of stream) {
        console.log(`Event yielded: type=${event.type}`, (event as any).payload || (event as any).content || '');
        if (event.type === 'error') {
          console.error('Captured Error Event:', JSON.stringify(event.payload, null, 2));
        }
      }
      console.log('--- COORDINATOR RUN FINISHED SUCCESSFULLY ---');
    } catch (err: any) {
      console.error('CAPTURED EXCEPTION IN RUN:', err);
      if (err.stack) {
        console.error('Stack trace:', err.stack);
      }
      if (err.cause) {
        console.error('Error cause:', err.cause);
      }
    }
  }, 30000); // 30s timeout
});
