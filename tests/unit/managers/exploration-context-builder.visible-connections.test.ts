import { describe, it, expect } from 'vitest';
import { ExplorationContextBuilder } from '@/ai/flows/managers/exploration-context-builder';

describe('ExplorationContextBuilder - visible connections include entities of target location', () => {
  it('includes open connection from connected open room (without entity spoilers)', () => {
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

    // The connection should be visible (open door/archway)
    expect(result).toHaveLength(1);

    const joined = result.join(' ');

    // Should include the direction
    expect(joined).toMatch(/sur/);

    // Should NOT include entity names (entities in adjacent rooms are not spoiled)
    expect(joined).not.toMatch(/Goblin guard/);
    expect(joined).not.toMatch(/entities:/);
  });

  it('does NOT include hidden connections from closed rooms', () => {
    const adventureData = {
      locations: [
        {
          id: 'room-a',
          title: 'Room A',
          connections: [
            { id: 'conn-n', toLocationId: 'room-c', targetId: 'room-c', direction: 'norte', visibility: 'hidden' },
          ],
          entitiesPresent: [],
        },
        {
          id: 'room-c',
          title: 'Room C',
          entitiesPresent: [],
        },
      ],
      entities: [],
    };

    const result = ExplorationContextBuilder['calculateVisibleConnections']({
      locationData: adventureData.locations[0],
      locationId: 'room-a',
      adventureData,
      openDoors: {},
      enemiesByLocation: {},
    } as any);

    // Hidden connections should not appear
    expect(result).toHaveLength(0);
  });
});
