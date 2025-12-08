
import {
    WorldState,
    LocationState,
    EnemyState,
    createInitialWorldState,
    createInitialLocationState,
    ConnectionState
} from './world-state-types';
import { AdventureDataSchema, ItemSchema } from '../schemas';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid'; // Assuming we have uuid or similar generic id generator, if not I'll use a simple one

type AdventureData = z.infer<typeof AdventureDataSchema>;

export class WorldStateManager {

    /**
     * Inicializa un nuevo estado del mundo vacío o lo carga si ya existe.
     */
    static initialize(existingState?: WorldState): WorldState {
        if (existingState) {
            return existingState;
        }
        return createInitialWorldState();
    }

    /**
     * Obtiene el estado mutable de una ubicación. Si no existe, lo crea (lazy initialization).
     */
    static getLocationState(world: WorldState, locationId: string): LocationState {
        if (!world.locations[locationId]) {
            world.locations[locationId] = createInitialLocationState();
        }
        return world.locations[locationId];
    }

    /**
     * Registra una visita a una ubicación.
     * Útil para trackear "primera vez" vs "ya visitado".
     */
    static registerVisit(world: WorldState, locationId: string, turnNumber: number): WorldState {
        const locState = this.getLocationState(world, locationId);

        // Si es la primera visita, registrarla
        if (!locState.visited) {
            locState.visited = true;
            locState.firstVisitTurn = turnNumber;
        }

        locState.visitedCount++;
        locState.lastVisitTurn = turnNumber;

        return world;
    }

    /**
     * Actualiza el estado de los enemigos en una ubicación específica.
     * Esto reemplaza el estado anterior de enemigos para esa sala.
     */
    static updateEnemies(world: WorldState, locationId: string, enemies: EnemyState[]): WorldState {
        const locState = this.getLocationState(world, locationId);
        locState.enemies = enemies;
        return world;
    }

    /**
     * Actualiza el estado de una conexión (puerta/pasaje).
     */
    static updateConnection(world: WorldState, locationId: string, directionOrTargetId: string, updates: Partial<ConnectionState>): WorldState {
        const locState = this.getLocationState(world, locationId);

        if (!locState.connections) {
            locState.connections = {};
        }

        if (!locState.connections[directionOrTargetId]) {
            // Si no existe estado previo, inicializar con defaults
            locState.connections[directionOrTargetId] = {
                direction: directionOrTargetId, // Usamos la key como dirección/id
                isOpen: true,
                isLocked: false,
                isBlocked: false
            };
        }

        // Aplicar updates
        locState.connections[directionOrTargetId] = {
            ...locState.connections[directionOrTargetId],
            ...updates
        };

        return world;
    }

    /**
     * CORE LOGIC: Fusiona los datos estáticos de la aventura con el estado dinámico
     * para devolver lo que REALMENTE hay en la ubicación en este momento.
     */
    static getEffectiveLocationContext(adventure: AdventureData, world: WorldState, locationId: string): {
        location: any; // Tipado laxo por ahora, idealmente Location & { dynamicState: LocationState }
        enemies: EnemyState[];
        isFirstVisit: boolean;
    } {
        const staticLocation = adventure.locations.find(l => l.id === locationId);
        if (!staticLocation) {
            throw new Error(`Location ${locationId} not found in adventure data`);
        }

        const locState = world.locations[locationId];

        // 1. Determinar enemigos
        let effectiveEnemies: EnemyState[] = [];

        if (locState && locState.visited) {
            // Si ya visitamos, la verdad absoluta son los enemigos del estado (que pueden estar muertos o heridos)
            // NOTA: Esto asume que si visitamos, ya inicializamos los enemigos en el estado.
            // Si el array está vacío y visitamos, significa que o no había nadie o matamos a todos y limpiamos (depende de implementación).
            // Para mayor seguridad: si visitamos pero enemies es empty, podría significar que todos murieron.
            // Si nunca spawneamos enemigos, el array seguiría vacío.
            effectiveEnemies = locState.enemies || [];
        } else {
            // PRIMERA VISITA (o nunca visitado oficialmente):
            // Debemos "spawnear" los enemigos basándonos en los datos estáticos.
            // Aquí instanciamos 'EnemyState' desde 'entitiesPresent' o 'encounters'.

            // Logica simplificada de spawn:
            if (staticLocation.entitiesPresent) {
                effectiveEnemies = staticLocation.entitiesPresent.map((entityRef: any, index: number) => {
                    // entityRef podría ser un ID string o un objeto. Asumimos objeto o buscamos en adventure.entities
                    // Para el MVP, asumimos que entityRef tiene info básica o la buscamos
                    // TODO: Refinar lógica de búsqueda de stats completos
                    return {
                        id: `${entityRef.id || 'enemy'}-${index}-${Date.now()}`, // ID único de instancia
                        hp: { current: entityRef.hp?.max || 10, max: entityRef.hp?.max || 10 }, // Placeholder safe
                        status: 'active',
                        name: entityRef.name || 'Unknown Enemy',
                        type: entityRef.type || 'enemy'
                        // ... otros campos
                    } as unknown as EnemyState; // Casting forzado por simplificación temporal
                });
            }
        }

        // 2. Determinar estado de puertas/conexiones
        // Al devolver la location, podríamos inyectar info de puertas abiertas/cerradas para que el frontend/IA lo sepa
        // TODO: Implementar fusión de conexiones si es necesario para el contexto

        return {
            location: staticLocation,
            enemies: effectiveEnemies,
            isFirstVisit: !locState?.visited
        };
    }

    /**
     * Helper de Migración: Convierte el formato legacy `enemiesByLocation` al nuevo `WorldState`.
     * Útil para la transición y carga de partidas guardadas con el formato intermedio.
     */
    static migrateFromLegacy(enemiesByLocation: Record<string, any[]>): WorldState {
        const world = createInitialWorldState();

        Object.entries(enemiesByLocation).forEach(([locId, enemies]) => {
            const locState = this.getLocationState(world, locId);

            // Mapear los enemigos legacy al nuevo esquema EnemyState
            locState.enemies = enemies.map(legacyEnemy => ({
                id: legacyEnemy.id,
                hp: legacyEnemy.hp || { current: 10, max: 10 },
                status: (legacyEnemy.hp?.current <= 0) ? 'dead' : 'active',
                name: legacyEnemy.name || legacyEnemy.characterName,
                // Intentar preservar cualquier otro dato relevante
                conditions: [],
                inventory: []
            }));

            // Si hay enemigos registrados (vivos o muertos), asumimos que la sala fue visitada
            if (enemies.length > 0) {
                locState.visited = true;
                locState.visitedCount = 1;
            }
        });

        return world;
    }
}
