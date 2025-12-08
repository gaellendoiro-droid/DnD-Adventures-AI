/**
 * @fileOverview ExplorationContextBuilder - Construye el contexto de exploración
 * 
 * Este módulo centraliza la lógica de:
 * - Actualización del estado de exploración (Fog of War)
 * - Detección de hazards mediante percepción pasiva
 * - Cálculo de conexiones visibles
 * - Resolución de entidades presentes
 * 
 * Extraído de narrative-turn-manager.ts líneas 267-350
 */

import { log } from '@/lib/logger';
import type { GameState, Character } from '@/lib/types';
import { ExplorationManager } from './exploration-manager';
import { EnemyStateManager } from '@/lib/game/enemy-state-manager';
import { isEntityOutOfCombat } from '@/lib/game/entity-status-utils';

/**
 * Contexto de exploración para la narración del DM
 */
export interface ExplorationContext {
    /** Modo de exploración (safe, dungeon, wilderness) */
    mode: 'safe' | 'dungeon' | 'wilderness';
    /** Nivel de luz (bright, dim, dark) */
    lightLevel: 'bright' | 'dim' | 'dark';
    /** Estado de visita (unknown, seen, visited) */
    visitState: 'unknown' | 'seen' | 'visited';
    /** Hazards detectados mediante percepción pasiva */
    detectedHazards: any[];
    /** Descripciones de conexiones visibles */
    visibleConnections: string[];
    /** Entidades presentes resueltas */
    presentEntities: any[];
    /** Estado de todas las puertas en la ubicación actual (dirección -> abierta/cerrada) */
    doorStates: Record<string, 'open' | 'closed'>;
    /** Entidades muertas en salas conectadas (para que el DM no las narre como vivas) */
    deadEntitiesInConnectedLocations?: Record<string, string[]>; // locationId -> array of dead entity names
}

/**
 * Resultado de construir el contexto de exploración
 */
export interface ExplorationContextResult {
    /** Contexto de exploración construido */
    context: ExplorationContext;
    /** Estado del juego actualizado (con exploration state actualizado) */
    updatedGameState: GameState;
    /** Hazards detectados */
    detectedHazards: any[];
}

/**
 * Input para construir el contexto de exploración
 */
export interface ExplorationContextInput {
    /** Estado actual del juego */
    gameState: GameState;
    /** Datos de la ubicación actual */
    locationData: any;
    /** Miembros del grupo */
    party: Character[];
    /** Tiempo del mundo actualizado (opcional) */
    worldTime?: {
        day: number;
        hour: number;
        minute: number;
    };
    /** Tiempo inicial del mundo (para calcular timestamp si worldTime no está disponible) */
    initialWorldTime?: {
        day: number;
        hour: number;
        minute: number;
    };
    /** Datos de la aventura */
    adventureData: any;
    /** ID de la ubicación desde la que se vino (para excluir de conexiones visibles) */
    cameFromLocationId?: string | null;
    /** Estados de puertas abiertas */
    openDoors?: Record<string, boolean>;
    /** Enemigos por ubicación (para filtrar entidades muertas en salas conectadas) */
    enemiesByLocation?: Record<string, any[]>;
    /** Enemigos (fallback para compatibilidad hacia atrás) */
    enemies?: any[];
}

/**
 * Builder para construir el contexto de exploración
 */
export class ExplorationContextBuilder {
    /**
     * Construye el contexto de exploración para el DM.
     * 
     * @param input - Datos necesarios para construir el contexto
     * @returns Contexto de exploración y estado actualizado
     */
    static build(input: ExplorationContextInput): ExplorationContextResult {
        const {
            gameState,
            locationData,
            party,
            worldTime,
            initialWorldTime,
            adventureData,
            cameFromLocationId,
            openDoors,
            enemiesByLocation,
            enemies
        } = input;

        let currentGameState: GameState = { ...gameState };

        // 1. Capturar estado de visita previo ANTES de actualizarlo
        const locationId = gameState.locationId;
        const previousVisitState = currentGameState.exploration?.knownLocations[locationId]?.status || 'unknown';

        // 2. Calcular timestamp total en minutos
        const currentTotalMinutes = worldTime
            ? (worldTime.day * 1440 + worldTime.hour * 60 + worldTime.minute)
            : (initialWorldTime?.day || 1) * 1440 + 480; // Default 8:00 AM

        // 3. Actualizar Fog of War
        currentGameState = ExplorationManager.updateExplorationState(
            currentGameState,
            locationData,
            currentTotalMinutes
        );

        // 4. Detección de Hazards (Percepción Pasiva)
        const detectedHazards = ExplorationManager.checkPassivePerception(
            currentGameState,
            locationData,
            party
        );

        // 5. Marcar hazards descubiertos
        if (detectedHazards.length > 0) {
            currentGameState = ExplorationManager.markHazardsAsDiscovered(
                currentGameState,
                locationId,
                detectedHazards
            );
            log.gameCoordinator('Hazards detected', {
                locationId,
                hazardsCount: detectedHazards.length,
                hazardIds: detectedHazards.map(h => h.id),
            });
        }

        // 6. Calcular conexiones visibles (con descripciones enriquecidas)
        const visibleConnections = this.calculateVisibleConnections({
            locationData,
            locationId,
            cameFromLocationId,
            openDoors,
            adventureData,
            explorationState: currentGameState.exploration,
            enemiesByLocation,
            enemies,
        });

        // 7. Resolver entidades presentes (usando estado actualizado si está disponible)
        const presentEntities = this.resolvePresentEntities({
            locationData,
            adventureData,
            locationId,
            enemiesByLocation,
            enemies,
        });

        // 8. Calcular estado de puertas para TODAS las conexiones
        const doorStates: Record<string, 'open' | 'closed'> = {};
        if (locationData.connections) {
            for (const conn of locationData.connections) {
                const doorKey = `${locationId}:${conn.direction}`;
                const isDoorOpen = openDoors?.[doorKey] === true;
                // Una puerta está abierta si: está en openDoors, o visibility='open', o isOpen=true en JSON
                const isOpen = isDoorOpen || conn.visibility === 'open' || conn.isOpen === true;
                doorStates[conn.direction] = isOpen ? 'open' : 'closed';
            }
        }

        log.debug('Door states calculated', {
            module: 'ExplorationContextBuilder',
            locationId,
            doorStates,
            openDoorsFromState: openDoors,
        });

        // 9. Construir contexto final
        const context: ExplorationContext = {
            mode: locationData.explorationMode || 'safe',
            lightLevel: locationData.lightLevel || 'bright',
            visitState: previousVisitState,
            detectedHazards: detectedHazards,
            visibleConnections: visibleConnections,
            presentEntities: presentEntities,
            doorStates: doorStates,
        };

        return {
            context,
            updatedGameState: currentGameState,
            detectedHazards,
        };
    }

    /**
     * Calcula las conexiones visibles desde la ubicación actual.
     * 
     * PRINCIPIOS CLAVE:
     * 1. NO usa descripciones estáticas del JSON (pueden estar desactualizadas)
     * 2. Solo incluye entidades de la ubicación ESPECÍFICA (no mezcla con otras)
     * 3. Incluye TODAS las conexiones visibles (incluyendo de donde venimos)
     * 4. NO revela títulos de salas no visitadas (evita spoilers como "Sala de la Emboscada")
     * 5. Marca claramente el estado de puertas y entidades
     * 
     * @param input - Datos para calcular conexiones
     * @returns Array de descripciones de conexiones visibles
     */
    public static calculateVisibleConnections(input: {
        locationData: any;
        locationId: string;
        cameFromLocationId?: string | null;
        openDoors?: Record<string, boolean>;
        adventureData: any;
        explorationState?: any;
        enemiesByLocation?: Record<string, any[]>;
        enemies?: any[];
    }): string[] {
        const { locationData, locationId, cameFromLocationId, openDoors, adventureData, explorationState, enemiesByLocation } = input;
        const visibleConnections: string[] = [];

        if (!locationData.connections) {
            return visibleConnections;
        }

        for (const conn of locationData.connections) {
            // Skip the connection we came from (avoid redundant "you see the room behind you")
            if (cameFromLocationId && conn.targetId === cameFromLocationId) {
                continue;
            }
            
            // Verificar si la conexión es visible/abierta
            const doorKey = `${locationId}:${conn.direction}`;
            const isDoorOpen = openDoors?.[doorKey] === true;
            // Visible si: visibility='open' (arco/abertura) O puerta está abierta O isOpen=true en JSON
            const isVisible = conn.visibility === 'open' || isDoorOpen || conn.isOpen === true;
            
            if (isVisible) {
                const targetLoc = adventureData.locations.find((l: any) => l.id === conn.targetId);
                if (targetLoc) {
                    // Simple format: direction, room name (only if visited), door state, entities
                    const targetVisitState = explorationState?.knownLocations?.[conn.targetId]?.status;
                    const isVisited = targetVisitState === 'visited';
                    
                    // Get visible entities (only from this specific location)
                    const entitiesVisible = this.getEntitiesInLocationStrict(
                        conn.targetId,
                        targetLoc,
                        enemiesByLocation,
                        adventureData
                    );

                    // Build simple description
                    let parts: string[] = [];
                    
                    // Direction
                    parts.push(conn.direction || 'unknown');
                    
                    // Room name (only if visited to avoid spoilers)
                    if (isVisited) {
                        parts.push(targetLoc.title || conn.targetId);
                    }
                    
                    // Door state
                    if (isDoorOpen) {
                        parts.push('(open door)');
                    } else if (conn.visibility === 'open') {
                        parts.push('(archway)');
                    }
                    
                    // Entities
                    if (entitiesVisible.length > 0) {
                        const entityNames = entitiesVisible.map(e => {
                            const name = e.name || e.id || 'Unknown';
                            return isEntityOutOfCombat(e) ? `corpse: ${name}` : name;
                        });
                        parts.push(`entities: ${entityNames.join(', ')}`);
                    }

                    visibleConnections.push(parts.join(' '));
                }
            }
        }

        return visibleConnections;
    }

    /**
     * Obtiene entidades visibles para una ubicación ESPECÍFICA.
     * 
     * PRINCIPIOS CRÍTICOS:
     * 1. Solo usa enemiesByLocation[locationId], NO el array global
     * 2. NPCs siempre se obtienen del JSON (no están en enemiesByLocation)
     * 3. Solo incluir entidades si tienen estado válido (no inventar muertes)
     */
    private static getEntitiesInLocationStrict(
        locationId: string,
        locationData: any,
        enemiesByLocation?: Record<string, any[]>,
        adventureData?: any
    ): any[] {
        if (!locationData.entitiesPresent) return [];

        // CRÍTICO: Solo obtener enemigos de ESTA ubicación específica
        const locationSpecificEnemies = enemiesByLocation?.[locationId] || [];

        const resolved: any[] = [];

        for (const entityId of locationData.entitiesPresent) {
            // 1. Buscar en el estado actualizado de esta ubicación ESPECÍFICA
            const stateEnemy = locationSpecificEnemies.find((e: any) =>
                e.id === entityId ||
                (e as any).uniqueId === entityId ||
                (e as any).adventureId === entityId
            );

            if (stateEnemy) {
                // Tenemos estado actualizado - usar este (tiene HP correcto)
                if (stateEnemy.disposition !== 'hidden') {
                    resolved.push(stateEnemy);
                }
                continue;
            }

            // 2. Buscar en el JSON de la aventura
            const jsonEntity = adventureData?.entities?.find((e: any) => e.id === entityId);
            if (jsonEntity) {
                // Filtrar entidades ocultas
                if (jsonEntity.disposition === 'hidden') {
                    continue;
                }
                
                // Para ENEMIGOS: 
                // - Si están en enemiesByLocation, ya los procesamos arriba
                // - Si NO están en enemiesByLocation, significa que no han sido revelados/combatidos
                // - En este caso, incluirlos como "vivos" del JSON
                if (jsonEntity.type === 'enemy') {
                    resolved.push(EnemyStateManager.normalizeEnemyStats(jsonEntity));
                } else if (jsonEntity.type === 'npc') {
                    // NPCs: SIEMPRE vivos a menos que estén explícitamente en el estado
                    // Los NPCs NO se almacenan en enemiesByLocation, así que solo tienen el JSON
                    // IMPORTANTE: Normalizar HP para que tenga formato { current, max }
                    const normalizedNpc = {
                        ...jsonEntity,
                        hp: jsonEntity.hp || (jsonEntity.stats?.hp ? { 
                            current: jsonEntity.stats.hp, 
                            max: jsonEntity.stats.hp 
                        } : undefined)
                    };
                    resolved.push(normalizedNpc);
                } else {
                    // Otros tipos de entidad
                    resolved.push(jsonEntity);
                }
            }
        }

        return resolved;
    }

    /**
     * Resuelve las entidades presentes en la ubicación ACTUAL.
     * 
     * PRINCIPIO CRÍTICO: Solo usa enemiesByLocation[locationId], NO el array global.
     * Esto previene confundir enemigos de diferentes ubicaciones.
     * 
     * @param input - Datos de la ubicación, aventura y estado del juego
     * @returns Array de entidades resueltas con todas sus propiedades
     */
    private static resolvePresentEntities(input: {
        locationData: any;
        adventureData: any;
        locationId: string;
        enemiesByLocation?: Record<string, any[]>;
        enemies?: any[];
    }): any[] {
        const { locationData, adventureData, locationId, enemiesByLocation } = input;

        if (!locationData.entitiesPresent) {
            return [];
        }

        // CRÍTICO: Solo obtener enemigos de ESTA ubicación específica
        // NO usar el parámetro 'enemies' global que puede mezclar ubicaciones
        const locationSpecificEnemies = enemiesByLocation?.[locationId] || [];

        const result = locationData.entitiesPresent
            .map((entityId: string) => {
                // 1. Buscar en el estado actualizado de ESTA ubicación específica
                const stateEnemy = locationSpecificEnemies.find((e: any) =>
                    e.id === entityId ||
                    (e as any).uniqueId === entityId ||
                    (e as any).adventureId === entityId
                );

                if (stateEnemy) {
                    // Tenemos estado actualizado - usar este (tiene HP correcto)
                    if (stateEnemy.disposition === 'hidden') {
                        return null;
                    }
                    return stateEnemy;
                }

                // 2. Fallback: obtener del JSON de la aventura
                const entity = adventureData.entities?.find((e: any) => e.id === entityId);
                if (!entity) return null;

                // Filtrar entidades ocultas
                if (entity.disposition === 'hidden') {
                    return null;
                }
                
                // Normalizar stats si es un enemigo
                const normalizedEntity = entity.type === 'enemy' 
                    ? EnemyStateManager.normalizeEnemyStats(entity)
                    : entity;
                
                return normalizedEntity;
            })
            .filter((e: any) => e !== null);

        log.debug('Resolved present entities', {
            module: 'ExplorationContextBuilder',
            locationId,
            entitiesInJson: locationData.entitiesPresent?.length || 0,
            entitiesInState: locationSpecificEnemies.length,
            resolvedCount: result.length,
            resolvedIds: result.map((e: any) => e.id),
        });

        return result;
    }
}

