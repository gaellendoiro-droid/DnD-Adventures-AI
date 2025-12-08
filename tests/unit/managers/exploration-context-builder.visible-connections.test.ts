import { describe, it, expect } from 'vitest';
import { ExplorationContextBuilder } from '@/ai/flows/managers/exploration-context-builder';

describe('ExplorationContextBuilder - visible connections include entities of target location', () => {
  it('includes visible enemies from connected open room', () => {
    const adventureData = {
      locations: [
        {
          id: 'room-a',
          title: 'Room A',
          connections: [
            { id: 'conn-s', toLocationId: 'room-b', targetId: 'room-b', direction: 'sur', isOpen: true, visibility: 'open' },
          ],
          entitiesPresent: [],
        },
        {
          id: 'room-b',
          title: 'Room B',
          description: 'Small guard room.',
          entitiesPresent: ['goblin-1'],
        },
      ],
      entities: [
        { id: 'goblin-1', name: 'Goblin guard', type: 'enemy' },
      ],
    };

    const result = ExplorationContextBuilder['calculateVisibleConnections']({
      locationData: adventureData.locations[0],
      locationId: 'room-a',
      adventureData,
      openDoors: { 'room-a:sur': true },
      enemiesByLocation: { 'room-b': [{ id: 'goblin-1', name: 'Goblin guard', type: 'enemy', hp: { current: 7, max: 7 } }] },
    } as any);

    const joined = result.join(' ');
    expect(joined).toMatch(/Goblin guard/);
    expect(joined).toMatch(/entities:/);
  });
});

