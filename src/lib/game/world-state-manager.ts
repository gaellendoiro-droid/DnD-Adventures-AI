
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
        if (!world.locations) {
            world.locations = {};
        }
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
            // Debemos "spawnear" los enemigos basándonos en los datos estáticos y condicionales.
            if (staticLocation.entitiesPresent) {
                const activeEntityIds: string[] = [];
                const globalFlags = world.globalFlags || {};

                staticLocation.entitiesPresent.forEach((entityRef: any) => {
                    if (typeof entityRef === 'string') {
                        activeEntityIds.push(entityRef);
                    } else if (entityRef && typeof entityRef === 'object' && 'entityId' in entityRef) {
                        const presence = !entityRef.presenceFlag || globalFlags[entityRef.presenceFlag] === true;
                        const absence = !entityRef.absenceFlag || globalFlags[entityRef.absenceFlag] !== true;
                        if (presence && absence) {
                            activeEntityIds.push(entityRef.entityId);
                        }
                    }
                });

                effectiveEnemies = activeEntityIds.map((entityId: string, index: number) => {
                    const adventureEntity = adventure.entities?.find((e: any) => e.id === entityId);
                    return {
                        id: `${entityId}-${index}-${Date.now()}`, // ID único de instancia
                        adventureId: entityId, // Conservar el original para búsqueda de stats en la API
                        hp: { 
                            current: adventureEntity?.stats?.hp || adventureEntity?.statsOverrides?.hp || 10, 
                            max: adventureEntity?.stats?.hp || adventureEntity?.statsOverrides?.hp || 10 
                        },
                        status: 'active',
                        name: adventureEntity?.name || entityId,
                        type: adventureEntity?.type || 'enemy'
                    } as unknown as EnemyState;
                });
            }
        }

        const location = JSON.parse(JSON.stringify(staticLocation));

        // 2. Determinar estado de interactuables y conexiones si ya se ha visitado
        if (locState) {
            // A. Fusionar Interactables (cofres, palancas)
            if (location.interactables && locState.interactables) {
                location.interactables = location.interactables.map((interactable: any) => {
                    const key = interactable.id || interactable.name;
                    const dynamicInt = key ? locState.interactables[key] : undefined;
                    if (dynamicInt) {
                        const updated = {
                            ...interactable,
                            state: dynamicInt.state
                        };
                        if (dynamicInt.items !== undefined) {
                            updated.items = dynamicInt.items;
                        } else if (dynamicInt.state === 'looted') {
                            updated.items = [];
                        }
                        return updated;
                    }
                    return interactable;
                });
            }

            // B. Fusionar Conexiones (puertas/caminos)
            if (location.connections && locState.connections) {
                location.connections = location.connections.map((conn: any) => {
                    const dynamicConn = locState.connections[conn.direction || ''] || locState.connections[conn.targetId || ''];
                    if (dynamicConn) {
                        return {
                            ...conn,
                            isOpen: dynamicConn.isOpen,
                            isLocked: dynamicConn.isLocked,
                            isBlocked: dynamicConn.isBlocked
                        };
                    }
                    return conn;
                });
            }

            // C. Fusionar droppedItems
            if (locState.droppedItems) {
                location.droppedItems = locState.droppedItems;
            }
        }

        return {
            location,
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
