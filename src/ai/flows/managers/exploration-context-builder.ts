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

        // 8. Construir contexto final
        const context: ExplorationContext = {
            mode: locationData.explorationMode || 'safe',
            lightLevel: locationData.lightLevel || 'bright',
            visitState: previousVisitState,
            detectedHazards: detectedHazards,
            visibleConnections: visibleConnections,
            presentEntities: presentEntities,
        };

        return {
            context,
            updatedGameState: currentGameState,
            detectedHazards,
        };
    }

    /**
     * Calcula las conexiones visibles desde la ubicación actual.
     * Genera descripciones enriquecidas con estado de puertas y entidades visibles (vivas o muertas).
     * 
     * @param input - Datos para calcular conexiones
     * @returns Array de descripciones de conexiones visibles enriquecidas
     */
    private static calculateVisibleConnections(input: {
        locationData: any;
        locationId: string;
        cameFromLocationId?: string | null;
        openDoors?: Record<string, boolean>;
        adventureData: any;
        explorationState?: any;
        enemiesByLocation?: Record<string, any[]>;
        enemies?: any[];
    }): string[] {
        const { locationData, locationId, cameFromLocationId, openDoors, adventureData, enemiesByLocation, enemies } = input;
        const visibleConnections: string[] = [];

        if (!locationData.connections) {
            return visibleConnections;
        }

        for (const conn of locationData.connections) {
            // Verificar si la conexión es visible/abierta
            const doorKey = `${locationId}:${conn.direction}`;
            const isDoorOpen = openDoors?.[doorKey] === true;
            // Visible si: visibility='open' (arco/abertura) O puerta está abierta O isOpen=true en JSON
            const isVisible = conn.visibility === 'open' || isDoorOpen || conn.isOpen === true;
            
            if (isVisible) {
                // Omitir la conexión desde la que venimos para enfocar la narración en nuevos caminos
                if (cameFromLocationId && conn.targetId === cameFromLocationId) {
                    continue;
                }

                const targetLoc = adventureData.locations.find((l: any) => l.id === conn.targetId);
                if (targetLoc) {
                    let description = `To ${conn.direction || 'unknown'}: ${targetLoc.description.substring(0, 150)}...`;
                    
                    // 1. Enriquecer con estado de puerta
                    if (isDoorOpen) {
                        description += " (Through OPEN door)";
                    } else if (conn.visibility === 'open') {
                        description += " (Through open archway/passage)";
                    }

                    // 2. Enriquecer con entidades muertas visibles
                    const deadEntities = this.getDeadEntitiesInLocation(
                        conn.targetId,
                        targetLoc,
                        enemiesByLocation,
                        enemies
                    );

                    if (deadEntities.length > 0) {
                        const deadNames = deadEntities.join(', ');
                        description += ` [VISIBLE CORPSES: ${deadNames}]`;
                    }

                    visibleConnections.push(description);
                }
            }
        }

        return visibleConnections;
    }

    /**
     * Helper para obtener nombres de entidades muertas en una ubicación.
     */
    private static getDeadEntitiesInLocation(
        locationId: string,
        locationData: any,
        enemiesByLocation?: Record<string, any[]>,
        enemies?: any[]
    ): string[] {
        if (!locationData.entitiesPresent) return [];

        const locationEnemies = EnemyStateManager.getEnemiesForLocation(
            locationId,
            enemiesByLocation,
            enemies
        );

        const deadNames: string[] = [];
        
        for (const entityId of locationData.entitiesPresent) {
            const enemy = locationEnemies.find((e: any) =>
                e.id === entityId ||
                (e as any).uniqueId === entityId ||
                (e as any).adventureId === entityId
            );

            if (enemy && isEntityOutOfCombat(enemy)) {
                deadNames.push(enemy.name || enemy.id || 'Unknown enemy');
            }
        }

        return deadNames;
    }

    /**
     * Resuelve las entidades presentes en la ubicación.
     * Usa el estado actualizado del juego (enemiesByLocation) si está disponible,
     * de lo contrario usa los datos del JSON y los normaliza.
     * 
     * @param input - Datos de la ubicación, aventura y estado del juego
     * @returns Array de entidades resueltas con todas sus propiedades (estado actualizado si está disponible)
     */
    private static resolvePresentEntities(input: {
        locationData: any;
        adventureData: any;
        locationId: string;
        enemiesByLocation?: Record<string, any[]>;
        enemies?: any[];
    }): any[] {
        const { locationData, adventureData, locationId, enemiesByLocation, enemies } = input;

        if (!locationData.entitiesPresent) {
            return [];
        }

        // Obtener enemigos del estado actualizado (si están disponibles)
        const currentLocationEnemies = EnemyStateManager.getEnemiesForLocation(
            locationId,
            enemiesByLocation,
            enemies
        );

        return locationData.entitiesPresent
            .map((entityId: string) => {
                // CRITICAL: Primero intentar obtener del estado actualizado (tiene HP actualizado)
                // Esto es esencial para detectar enemigos muertos correctamente
                const stateEnemy = currentLocationEnemies.find((e: any) =>
                    e.id === entityId ||
                    (e as any).uniqueId === entityId ||
                    (e as any).adventureId === entityId
                );

                if (stateEnemy) {
                    // Usar el estado actualizado (ya tiene HP normalizado y actualizado)
                    return stateEnemy;
                }

                // Fallback: obtener del JSON y normalizar
                const entity = adventureData.entities?.find((e: any) => e.id === entityId);
                if (!entity) return null;
                
                // CRITICAL: Normalize enemy stats (stats.hp → hp: { current, max })
                // This ensures CombatTriggerManager can correctly detect if enemies are alive
                // Without this, isEntityOutOfCombat will return true for enemies with stats.hp
                // instead of hp: { current, max }, causing them to be filtered out incorrectly
                const normalizedEntity = entity.type === 'enemy' 
                    ? EnemyStateManager.normalizeEnemyStats(entity)
                    : entity;
                
                // Pasar todas las propiedades de la entidad (incluyendo disposition/status)
                // para que CombatTriggerManager pueda filtrar enemigos ocultos
                return normalizedEntity;
            })
            .filter((e: any) => e !== null);
    }
}

