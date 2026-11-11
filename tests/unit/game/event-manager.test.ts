import { describe, it, expect } from 'vitest';
import { EventManager } from '../../../src/lib/game/event-manager';
import { createInitialWorldState } from '../../../src/lib/game/world-state-types';

describe('EventManager', () => {
    it('should record events correctly and clean expired events', () => {
        let worldState = createInitialWorldState();

        // Registrar primer evento en el turno 1
        worldState = EventManager.recordEvent(worldState, 1, {
            type: 'combat_end',
            locationId: 'room-1',
            description: 'Derrotamos a un orco.'
        });

        expect(worldState.recentEvents).toHaveLength(1);
        expect(worldState.recentEvents![0].description).toBe('Derrotamos a un orco.');
        expect(worldState.recentEvents![0].turnNumber).toBe(1);
        expect(worldState.recentEvents![0].id).toBeDefined();

        // Registrar segundo evento en el turno 5
        worldState = EventManager.recordEvent(worldState, 5, {
            type: 'trap_triggered',
            locationId: 'room-1',
            description: 'Gael activó una trampa.'
        });

        expect(worldState.recentEvents).toHaveLength(2);

        // Registrar un evento en el turno 12 (el del turno 1 debería expirar, TTL = 10)
        // El del turno 1: 12 - 1 = 11 >= 10 -> Expira.
        // El del turno 5: 12 - 5 = 7 < 10 -> Permanece.
        worldState = EventManager.recordEvent(worldState, 12, {
            type: 'npc_met',
            locationId: 'room-2',
            description: 'Conocimos a Elara.'
        });

        expect(worldState.recentEvents).toHaveLength(2); // El de turno 1 se borró, quedan turno 5 y 12.
        expect(worldState.recentEvents!.map(e => e.type)).toEqual(['trap_triggered', 'npc_met']);
    });

    it('should retrieve relevant events for current and adjacent rooms', () => {
        let worldState = createInitialWorldState();

        // Registrar eventos en distintos sitios y turnos
        worldState = EventManager.recordEvent(worldState, 5, {
            type: 'combat_end',
            locationId: 'room-1',
            description: 'Combate en room-1'
        });

        worldState = EventManager.recordEvent(worldState, 6, {
            type: 'search',
            locationId: 'room-2',
            description: 'Búsqueda en room-2'
        });

        worldState = EventManager.recordEvent(worldState, 8, {
            type: 'door_opened',
            locationId: 'room-3',
            description: 'Puerta abierta en room-3'
        });

        // En turno 10, buscamos eventos para room-1, con room-2 como adyacente
        // Todos están dentro del TTL (10 - 5 = 5 < 10)
        const relevant = EventManager.getRelevantEvents(worldState, 10, 'room-1', ['room-2']);
        
        expect(relevant).toHaveLength(2);
        expect(relevant.map(e => e.locationId)).toContain('room-1');
        expect(relevant.map(e => e.locationId)).toContain('room-2');
        expect(relevant.map(e => e.locationId)).not.toContain('room-3');
    });

    it('should format events correctly for prompts', () => {
        const events = [
            {
                id: '1',
                type: 'combat_end',
                turnNumber: 8,
                locationId: 'room-1',
                description: 'Derrotamos a los trasgos.'
            },
            {
                id: '2',
                type: 'trap_triggered',
                turnNumber: 9,
                locationId: 'room-1',
                description: 'Galador desarmó una trampa.'
            },
            {
                id: '3',
                type: 'talk',
                turnNumber: 10,
                locationId: 'room-1',
                description: 'Merryl habló con el tendero.'
            }
        ];

        // En turno 10:
        // Turno 8: hace 2 turnos
        // Turno 9: hace 1 turno
        // Turno 10: este turno
        const formatted = EventManager.formatForPrompt(events, 10);

        expect(formatted).toContain('- [Hace 2 turnos] Derrotamos a los trasgos.');
        expect(formatted).toContain('- [Hace 1 turno] Galador desarmó una trampa.');
        expect(formatted).toContain('- [Este turno] Merryl habló con el tendero.');
    });
});
