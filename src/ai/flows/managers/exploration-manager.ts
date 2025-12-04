import { z } from 'zod';
import { GameState, ExplorationStateSchema } from '@/ai/flows/schemas';
import { LocationSchema, CharacterSchema, HazardSchema } from '@/lib/schemas';

type Location = z.infer<typeof LocationSchema>;
type Character = z.infer<typeof CharacterSchema>;
type Hazard = z.infer<typeof HazardSchema>;
type ExplorationState = z.infer<typeof ExplorationStateSchema>;

export class ExplorationManager {

    /**
     * Inicializa o recupera el estado de exploración del GameState.
     */
    private static getExplorationState(gameState: GameState): ExplorationState {
        if (!gameState.exploration) {
            return {
                knownLocations: {}
            };
        }
        return gameState.exploration;
    }

    /**
     * Actualiza la "Niebla de Guerra" al entrar en una ubicación.
     * Marca la ubicación actual como 'visited' y las conexiones visibles como 'seen'.
     */
    static updateExplorationState(gameState: GameState, currentLocation: Location, worldTime: number): GameState {
        const explorationState = this.getExplorationState(gameState);
        const knownLocations = { ...explorationState.knownLocations };

        // 1. Marcar ubicación actual como VISITADA
        knownLocations[currentLocation.id] = {
            ...knownLocations[currentLocation.id],
            status: 'visited',
            lastVisited: worldTime,
            discoveredSecrets: knownLocations[currentLocation.id]?.discoveredSecrets || [],
            clearedHazards: knownLocations[currentLocation.id]?.clearedHazards || []
        };

        // 2. Revelar conexiones (Niebla de Guerra)
        if (currentLocation.connections) {
            for (const conn of currentLocation.connections) {
                const targetId = conn.targetId;
                const currentStatus = knownLocations[targetId]?.status || 'unknown';

                // Si ya está visitada, no la tocamos
                if (currentStatus === 'visited') continue;

                // Lógica de Visibilidad
                // Si la conexión es 'open', la marcamos como 'seen' (la ves desde aquí)
                // Si es 'restricted' (puerta cerrada/muro), se queda como está (unknown o seen si ya la viste antes)
                if (conn.visibility === 'open') {
                    knownLocations[targetId] = {
                        ...knownLocations[targetId],
                        status: 'seen',
                        lastVisited: knownLocations[targetId]?.lastVisited || 0,
                        discoveredSecrets: knownLocations[targetId]?.discoveredSecrets || [],
                        clearedHazards: knownLocations[targetId]?.clearedHazards || []
                    };
                } else {
                    // Si es restricted, aseguramos que exista la entrada en knownLocations aunque sea unknown
                    // Esto es útil para que el frontend sepa que "hay algo ahí" si decidimos mostrar mapa
                    if (!knownLocations[targetId]) {
                        knownLocations[targetId] = {
                            status: 'unknown',
                            lastVisited: 0,
                            discoveredSecrets: [],
                            clearedHazards: []
                        };
                    }
                }
            }
        }

        return {
            ...gameState,
            exploration: {
                ...explorationState,
                knownLocations
            }
        };
    }

    /**
     * Realiza un chequeo de Percepción Pasiva automático para todo el grupo.
     * Retorna los peligros detectados que NO habían sido descubiertos/neutralizados previamente.
     */
    static checkPassivePerception(gameState: GameState, location: Location, party: Character[]): Hazard[] {
        // Si no hay peligros o no estamos en modo dungeon, no hay nada que detectar
        if (!location.hazards || location.hazards.length === 0) return [];
        if (location.explorationMode === 'safe') return [];

        const explorationState = this.getExplorationState(gameState);
        const locationState = explorationState.knownLocations[location.id];

        // Filtramos peligros ya conocidos o neutralizados
        const activeHazards = location.hazards.filter(h =>
            h.active &&
            (!locationState || !locationState.clearedHazards.includes(h.id)) &&
            (!locationState || !locationState.discoveredSecrets.includes(h.id))
        );

        if (activeHazards.length === 0) return [];

        // Calculamos la mejor pasiva del grupo
        // Fórmula D&D 5e: 10 + Mod Sabiduría + (Proficiency si aplica)
        // Simplificación actual: Usamos Wisdom Score como proxy si no tenemos skills detalladas, 
        // o buscamos la skill 'Perception'.
        let maxPassivePerception = 0;

        for (const char of party) {
            let passive = 10;

            // Intentar obtener modificador de sabiduría
            const wisScore = char.abilityScores?.sabiduría || 10;
            const wisMod = Math.floor((wisScore - 10) / 2);
            passive += wisMod;

            // Verificar proficiencia en Percepción
            const perceptionSkill = char.skills?.find(s => s.name.toLowerCase() === 'perception' || s.name.toLowerCase() === 'percepción');
            if (perceptionSkill && perceptionSkill.proficient) {
                passive += (char.proficiencyBonus || 2);
            }

            if (passive > maxPassivePerception) {
                maxPassivePerception = passive;
            }
        }

        // Comparamos contra la CD de los peligros
        const detectedHazards = activeHazards.filter(h => maxPassivePerception >= h.detectionDC);

        return detectedHazards;
    }

    /**
     * Registra peligros como descubiertos en el estado.
     */
    static markHazardsAsDiscovered(gameState: GameState, locationId: string, hazards: Hazard[]): GameState {
        if (hazards.length === 0) return gameState;

        const explorationState = this.getExplorationState(gameState);
        const knownLocations = { ...explorationState.knownLocations };
        const currentLocationState = knownLocations[locationId] || {
            status: 'visited',
            lastVisited: 0,
            discoveredSecrets: [],
            clearedHazards: []
        };

        const newSecrets = [...currentLocationState.discoveredSecrets];

        for (const h of hazards) {
            if (!newSecrets.includes(h.id)) {
                newSecrets.push(h.id);
            }
        }
        knownLocations[locationId] = {
            ...currentLocationState,
            discoveredSecrets: newSecrets
        };

        return {
            ...gameState,
            exploration: {
                ...explorationState,
                knownLocations
            }
        };
    }

    /**
     * Realiza una búsqueda activa (Investigación/Percepción) solicitada por el jugador.
     * Retorna los peligros detectados que NO habían sido descubiertos/neutralizados previamente.
     */
    static performActiveSearch(gameState: GameState, location: Location, rollResult: number): Hazard[] {
        // Si no hay peligros o no estamos en modo dungeon, no hay nada que detectar
        if (!location.hazards || location.hazards.length === 0) return [];

        const explorationState = this.getExplorationState(gameState);
        const locationState = explorationState.knownLocations[location.id];

        // Filtramos peligros ya conocidos o neutralizados
        const activeHazards = location.hazards.filter(h =>
            h.active &&
            (!locationState || !locationState.clearedHazards.includes(h.id)) &&
            (!locationState || !locationState.discoveredSecrets.includes(h.id))
        );

        if (activeHazards.length === 0) return [];

        // Comparamos el resultado de la tirada contra la CD
        // Nota: Aquí asumimos que la tirada ya incluye modificadores.
        const detectedHazards = activeHazards.filter(h => rollResult >= h.detectionDC);

        return detectedHazards;
    }
}
