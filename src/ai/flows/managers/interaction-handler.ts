/**
 * @fileOverview InteractionHandler - Maneja interacciones con objetos/puertas
 * 
 * Este módulo centraliza la lógica de:
 * - Mapeo de interactables (nombres/acciones a IDs)
 * - Apertura de puertas
 * - Detección de triggers de combate por interacción (mimics)
 * 
 * Extraído de narrative-turn-manager.ts líneas 361-478
 */

import { log } from '@/lib/logger';
import { CombatTriggerEvaluator, CombatTriggerResult } from '@/lib/combat/trigger/combat-trigger-evaluator';

/**
 * Resultado de procesar una interacción
 */
export interface InteractionResult {
    /** Estados de puertas actualizados (locationId:direction -> isOpen) */
    updatedOpenDoors: Record<string, boolean>;
    /** Trigger de combate si la interacción lo activa (mimic, etc.) */
    combatTrigger?: CombatTriggerResult;
    /** Feedback del sistema para el DM (ej: "Door opened successfully") */
    systemFeedback?: string;
    /** ID real del objetivo (después de mapeo de interactables) */
    actualTargetId: string;
    /** Contexto narrativo para el DM */
    narrativeContext?: any;
}

/**
 * Input para procesar una interacción
 */
export interface InteractionInput {
    /** Acción del jugador */
    playerAction: string;
    /** ID del objetivo de la interacción */
    targetId: string | null;
    /** Tipo de acción interpretada */
    actionType: string;
    /** Datos de la ubicación actual */
    locationData: any;
    /** ID de la ubicación actual */
    currentLocationId: string;
    /** Estados actuales de puertas abiertas */
    currentOpenDoors?: Record<string, boolean>;
    /** Entidades resueltas presentes en la ubicación */
    resolvedEntities: any[];
}

/**
 * Handler para procesar interacciones con objetos y puertas
 */
export class InteractionHandler {
    /**
     * Procesa una interacción con un objeto/puerta.
     * 
     * @param input - Datos de la interacción
     * @returns Resultado con puertas actualizadas, triggers de combate, etc.
     */
    static async processInteraction(input: InteractionInput): Promise<InteractionResult> {
        const {
            playerAction,
            targetId,
            actionType,
            locationData,
            currentLocationId,
            currentOpenDoors = {},
            resolvedEntities
        } = input;

        const updatedOpenDoors = { ...currentOpenDoors };
        let systemFeedback: string | undefined = undefined;
        let actualTargetId = targetId || '';
        let matchedInteractable: any = null;

        // Si no es una interacción, retornar sin cambios
        if (actionType !== 'interact' || !targetId) {
            return {
                updatedOpenDoors,
                actualTargetId: targetId || '',
            };
        }

        log.gameCoordinator('Processing interaction', {
            targetId,
            locationId: currentLocationId,
        });

        // 1. Mapear interactable (nombre/acción a ID)
        if (locationData.interactables) {
            matchedInteractable = locationData.interactables.find((i: any) => {
                const targetLower = targetId.toLowerCase();
                const interactableName = i.name?.toLowerCase() || '';
                const interactableId = i.id?.toLowerCase() || '';
                
                // Check if targetId matches interactable name, id, or any interaction action
                return targetLower.includes(interactableId) ||
                       interactableId.includes(targetLower) ||
                       targetLower.includes(interactableName) ||
                       interactableName.includes(targetLower) ||
                       i.interactions?.some((ia: any) => 
                           targetLower.includes(ia.action?.toLowerCase() || '')
                       );
            });
            
            if (matchedInteractable) {
                actualTargetId = matchedInteractable.id;
                log.gameCoordinator('Mapped interaction target', {
                    original: targetId,
                    mapped: actualTargetId,
                });
            }
        }

        // 2. Manejar apertura de puertas
        if (matchedInteractable) {
            const actionLower = playerAction.toLowerCase();
            const openActions = ['abrir', 'open', 'abre', 'abrimos', 'abro'];
            const isOpenAction = openActions.some(action => actionLower.includes(action));
            
            if (isOpenAction) {
                const doorResult = this.handleDoorOpening({
                    matchedInteractable,
                    locationData,
                    currentLocationId,
                    updatedOpenDoors,
                });

                if (doorResult.success) {
                    updatedOpenDoors[doorResult.doorKey!] = true;

                    // Open reciprocal door (target room opposite direction) to allow return path
                    const reverseMap: Record<string, string> = {
                        norte: 'sur',
                        sur: 'norte',
                        este: 'oeste',
                        oeste: 'este',
                        noreste: 'suroeste',
                        noroeste: 'sureste',
                        sureste: 'noroeste',
                        suroeste: 'noreste',
                        arriba: 'abajo',
                        abajo: 'arriba',
                    };
                    if (doorResult.direction && locationData.connections) {
                        const conn = locationData.connections.find((c: any) => c.direction === doorResult.direction);
                        if (conn?.targetId) {
                            const reverseDir = reverseMap[doorResult.direction];
                            if (reverseDir) {
                                const reciprocalKey = `${conn.targetId}:${reverseDir}`;
                                updatedOpenDoors[reciprocalKey] = true;
                            }
                        }
                    }

                    systemFeedback = doorResult.systemFeedback;
                    log.gameCoordinator('Door opened', {
                        doorKey: doorResult.doorKey,
                        direction: doorResult.direction,
                    });
                }
            }
        }

        // 3. Evaluar triggers de combate por interacción (mimics, etc.)
        let combatTrigger: CombatTriggerResult | undefined = undefined;
        
        const interactionTrigger = CombatTriggerEvaluator.evaluateInteraction({
            targetId: actualTargetId,
            locationHazards: locationData.hazards,
            locationEntities: resolvedEntities
        });

        if (interactionTrigger.shouldStartCombat) {
            combatTrigger = interactionTrigger;
            log.gameCoordinator('Interaction combat trigger detected', {
                reason: interactionTrigger.reason,
                targetId: actualTargetId,
            });
        }

        return {
            updatedOpenDoors,
            combatTrigger,
            systemFeedback,
            actualTargetId,
        };
    }

    /**
     * Maneja la apertura de una puerta.
     * 
     * @param input - Datos de la puerta a abrir
     * @returns Resultado con la clave de la puerta abierta y feedback
     */
    private static handleDoorOpening(input: {
        matchedInteractable: any;
        locationData: any;
        currentLocationId: string;
        updatedOpenDoors: Record<string, boolean>;
    }): {
        success: boolean;
        doorKey?: string;
        direction?: string;
        systemFeedback?: string;
    } {
        const { matchedInteractable, locationData, currentLocationId } = input;
        const doorId = matchedInteractable.id.toLowerCase();

        // Buscar conexión que coincida con esta puerta
        const matchingConnection = locationData.connections?.find((conn: any) => {
            const connDirection = conn.direction?.toLowerCase();
            const connTarget = conn.targetId?.toLowerCase();
            return doorId.includes(connDirection || '') || 
                   doorId.includes(connTarget || '') ||
                   (connDirection && doorId.includes(connDirection)) ||
                   (connTarget && doorId.includes(connTarget));
        });

        if (matchingConnection && matchingConnection.direction) {
            const doorKey = `${currentLocationId}:${matchingConnection.direction}`;
            return {
                success: true,
                doorKey,
                direction: matchingConnection.direction,
                systemFeedback: `Door opened successfully: ${matchingConnection.direction}`,
            };
        }

        // Intentar coincidencia por dirección en el ID del interactable
        const directions = ['norte', 'sur', 'este', 'oeste', 'noreste', 'noroeste', 'sureste', 'suroeste', 'arriba', 'abajo'];
        for (const dir of directions) {
            if (doorId.includes(dir)) {
                const doorKey = `${currentLocationId}:${dir}`;
                return {
                    success: true,
                    doorKey,
                    direction: dir,
                    systemFeedback: `Door opened successfully: ${dir}`,
                };
            }
        }

        return { success: false };
    }

    /**
     * Actualiza las conexiones de una ubicación para reflejar puertas abiertas.
     * 
     * @param locationData - Datos de la ubicación (se modifica in-place)
     * @param locationId - ID de la ubicación
     * @param openDoors - Estados de puertas abiertas
     */
    static updateConnectionsForOpenDoors(
        locationData: any,
        locationId: string,
        openDoors?: Record<string, boolean>
    ): void {
        if (!locationData.connections || !openDoors) {
            return;
        }

        locationData.connections = locationData.connections.map((conn: any) => {
            const doorKey = `${locationId}:${conn.direction}`;
            const isOpen = openDoors[doorKey] === true;
            
            if (isOpen) {
                return {
                    ...conn,
                    isOpen: true
                };
            }
            return conn;
        });
    }
}

