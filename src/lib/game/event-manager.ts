import { WorldState, GameEvent } from './world-state-types';
import { v4 as uuidv4 } from 'uuid';

export interface RecordEventInput {
    type: string;
    locationId: string;
    description: string;
    metadata?: Record<string, any>;
}

export class EventManager {
    private static DEFAULT_TTL = 10;

    /**
     * Registra un nuevo evento en el estado del mundo.
     */
    static recordEvent(
        worldState: WorldState,
        currentTurn: number,
        input: RecordEventInput
    ): WorldState {
        if (!worldState.recentEvents) {
            worldState.recentEvents = [];
        }

        const newEvent: GameEvent = {
            id: uuidv4(),
            type: input.type,
            turnNumber: currentTurn,
            locationId: input.locationId,
            description: input.description,
            metadata: input.metadata
        };

        worldState.recentEvents.push(newEvent);

        // Limpiar eventos que ya expiraron del estado para no inflar la persistencia
        this.cleanExpiredEvents(worldState, currentTurn);

        return worldState;
    }

    /**
     * Limpia los eventos que han superado el TTL.
     */
    static cleanExpiredEvents(worldState: WorldState, currentTurn: number, ttl = this.DEFAULT_TTL): void {
        if (!worldState.recentEvents) {
            worldState.recentEvents = [];
            return;
        }
        worldState.recentEvents = worldState.recentEvents.filter(
            event => currentTurn - event.turnNumber < ttl
        );
    }

    /**
     * Recupera eventos relevantes para la ubicación actual (misma sala o salas adyacentes).
     */
    static getRelevantEvents(
        worldState: WorldState,
        currentTurn: number,
        currentLocationId: string,
        adjacentLocationIds: string[] = [],
        ttl = this.DEFAULT_TTL
    ): GameEvent[] {
        if (!worldState.recentEvents) {
            return [];
        }

        // Primero nos aseguramos de que no incluimos eventos expirados
        const activeEvents = worldState.recentEvents.filter(
            event => currentTurn - event.turnNumber < ttl
        );

        // Filtrar por ubicación (ubicación actual o adyacentes)
        const relevantLocations = [currentLocationId, ...adjacentLocationIds];
        return activeEvents.filter(event => relevantLocations.includes(event.locationId));
    }

    /**
     * Formatea una lista de eventos en texto legible para el prompt de la IA.
     */
    static formatForPrompt(events: GameEvent[], currentTurn: number): string {
        if (events.length === 0) {
            return '';
        }

        const lines = events.map(event => {
            const turnsAgo = currentTurn - event.turnNumber;
            let timeStr = '';
            if (turnsAgo === 0) {
                timeStr = 'Este turno';
            } else if (turnsAgo === 1) {
                timeStr = 'Hace 1 turno';
            } else {
                timeStr = `Hace ${turnsAgo} turnos`;
            }

            return `- [${timeStr}] ${event.description}`;
        });

        return lines.join('\n');
    }
}
