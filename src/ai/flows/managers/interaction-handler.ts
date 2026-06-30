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

import { WorldStateManager } from '@/lib/game/world-state-manager';

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
    /** WorldState actualizado si se mutaron interactuables */
    updatedWorldState?: any;
    /** Lista de personajes actualizada si se transfirieron objetos */
    updatedParty?: any[];
    /** Detalles sobre la apertura de la puerta */
    doorOpeningDetails?: {
        method: 'key' | 'lockpick' | 'force' | 'free';
        keyName?: string;
        requiredKeyId?: string;
    };
}

/**
 * Input para procesar un turno de interacción
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
    /** WorldState actual */
    worldState?: any;
    /** Personajes del grupo */
    party?: any[];
    /** Datos completos de la aventura (para buscar items) */
    adventureData?: any;
    /** Nombre del personaje activo realizando la acción */
    activeCharacterName?: string;
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
            resolvedEntities,
            worldState,
            party,
            adventureData,
            activeCharacterName
        } = input;

        const updatedOpenDoors = { ...currentOpenDoors };
        let systemFeedback: string | undefined = undefined;
        let actualTargetId = targetId || '';
        let matchedInteractable: any = null;
        let updatedWorldState = worldState ? JSON.parse(JSON.stringify(worldState)) : undefined;
        let updatedParty = party ? JSON.parse(JSON.stringify(party)) : undefined;
        let doorOpeningDetails: any = undefined;

        // Si no es una interacción, retornar sin cambios
        if (actionType !== 'interact' || !targetId) {
            return {
                updatedOpenDoors,
                actualTargetId: targetId || '',
                updatedWorldState,
                updatedParty
            };
        }

        log.gameCoordinator('Processing interaction', {
            targetId,
            locationId: currentLocationId,
        });

        // 0. Verificar si se intenta coger un ítem del suelo (droppedItems)
        if (updatedWorldState && updatedParty) {
            const actionLower = playerAction.toLowerCase();
            const lootKeywords = ['coger', 'tomo', 'tomar', 'cojo', 'recoger', 'llevo', 'llevar', 'agarrar', 'agarro', 'recuperar', 'recupero', 'get', 'take', 'pick'];
            const isCollectAction = lootKeywords.some(action => actionLower.includes(action));

            if (isCollectAction) {
                const locState = WorldStateManager.getLocationState(updatedWorldState, currentLocationId);
                const droppedItems = locState.droppedItems || [];

                if (droppedItems.length > 0) {
                    const targetLower = targetId.toLowerCase();
                    // Buscar coincidencia en droppedItems
                    const matchedIndex = droppedItems.findIndex((it: any) => {
                        return it.id.toLowerCase() === targetLower ||
                               it.name.toLowerCase().includes(targetLower) ||
                               targetLower.includes(it.name.toLowerCase());
                    });

                    if (matchedIndex !== -1) {
                        const itemToCollect = droppedItems[matchedIndex];
                        let activeChar = updatedParty[0];
                        if (activeCharacterName) {
                            const found = updatedParty.find((p: any) => p.name.toLowerCase() === activeCharacterName.toLowerCase());
                            if (found) activeChar = found;
                        }

                        // Añadir al inventario de la party
                        if (!activeChar.inventory) {
                            activeChar.inventory = [];
                        }
                        const existingItem = activeChar.inventory.find((invIt: any) => invIt.id === itemToCollect.id);
                        if (existingItem) {
                            existingItem.quantity += 1;
                        } else {
                            activeChar.inventory.push({
                                id: itemToCollect.id,
                                name: itemToCollect.name,
                                quantity: 1,
                                description: itemToCollect.description || ''
                            });
                        }

                        // Restar de droppedItems
                        if (itemToCollect.quantity > 1) {
                            itemToCollect.quantity--;
                        } else {
                            droppedItems.splice(matchedIndex, 1);
                        }
                        locState.droppedItems = droppedItems;

                        log.gameCoordinator('Collected item from floor', {
                            item: itemToCollect.name,
                            character: activeChar.name
                        });

                        return {
                            updatedOpenDoors,
                            actualTargetId: itemToCollect.id,
                            updatedWorldState,
                            updatedParty,
                            systemFeedback: `${activeChar.name} ha recogido ${itemToCollect.name} del suelo.`
                        };
                    }
                }
            }
        }

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

            // FALLBACK: Si no se emparejó directamente, pero el targetId corresponde a un objeto
            // que está dentro de uno de los contenedores de la localización.
            if (!matchedInteractable) {
                const targetLower = targetId.toLowerCase();
                matchedInteractable = locationData.interactables.find((i: any) => {
                    if (i.type !== 'container' && !i.items) return false;
                    return i.items.some((itemId: string) => {
                        // Coincidencia directa con el ID del ítem
                        if (itemId.toLowerCase().includes(targetLower) || targetLower.includes(itemId.toLowerCase())) {
                            return true;
                        }
                        // Coincidencia con el nombre del ítem en la base de datos de la aventura
                        const itemDef = adventureData?.items?.find((it: any) => it.id === itemId);
                        if (itemDef) {
                            const itemNameLower = itemDef.name?.toLowerCase() || '';
                            return itemNameLower.includes(targetLower) || targetLower.includes(itemNameLower);
                        }
                        return false;
                    });
                });

                if (matchedInteractable) {
                    log.gameCoordinator('Mapped interaction target via nested item fallback', {
                        original: targetId,
                        mapped: matchedInteractable.id,
                    });
                }
            }

            if (matchedInteractable) {
                actualTargetId = matchedInteractable.id;
                log.gameCoordinator('Mapped interaction target', {
                    original: targetId,
                    mapped: actualTargetId,
                });
            }
        }

        // 2. Manejar apertura de puertas y contenedores
        if (matchedInteractable) {
            const actionLower = playerAction.toLowerCase();
            const openActions = ['abrir', 'open', 'abre', 'abrimos', 'abro'];
            const isOpenAction = openActions.some(action => actionLower.includes(action));

            const closeActions = ['cerrar', 'close', 'cierra', 'cerramos', 'cierro', 'juntar', 'junto'];
            const isCloseAction = closeActions.some(action => actionLower.includes(action));

            const lootActions = ['saquear', 'coger', 'lootear', 'tomo', 'tomar', 'cojo', 'recoger', 'llevo', 'llevar', 'vaciar', 'vacio', 'inspeccionar', 'inspecciono'];
            const isLootAction = lootActions.some(action => actionLower.includes(action));

            const isContainer = matchedInteractable.type === 'container' || 
                                matchedInteractable.id?.toLowerCase().includes('cofre') || 
                                matchedInteractable.name?.toLowerCase().includes('cofre') ||
                                matchedInteractable.id?.toLowerCase().includes('baul') ||
                                matchedInteractable.name?.toLowerCase().includes('baul');

            if (isContainer && updatedWorldState) {
                const locState = WorldStateManager.getLocationState(updatedWorldState, currentLocationId);
                const currentIntState = locState.interactables?.[matchedInteractable.id]?.state || matchedInteractable.state || 'closed';

                if (currentIntState === 'looted') {
                    systemFeedback = `The container ${matchedInteractable.name} has already been looted and is empty.`;
                } else if (isLootAction) {
                    let containerItems = locState.interactables?.[matchedInteractable.id]?.items ?? matchedInteractable.items ?? [];

                    // A. Validar si el jugador intenta coger/llevarse el contenedor físico en sí (mover el mueble completo)
                    const isLiftingContainer = (
                        (actionLower.includes('cojo') || actionLower.includes('coger') || actionLower.includes('llevo') || actionLower.includes('llevar') || actionLower.includes('recoger') || actionLower.includes('cargo') || actionLower.includes('cargar')) &&
                        !actionLower.includes('saquear') && !actionLower.includes('lootear') && !actionLower.includes('vaciar') && !actionLower.includes('inspeccionar') &&
                        (
                            actionLower.includes('cofre') || 
                            actionLower.includes('baul') || 
                            actionLower.includes('contenedor') ||
                            actionLower.includes('altar')
                        )
                    ) && !containerItems.some((itemId: string) => {
                        const itemDef = adventureData?.items?.find((it: any) => it.id === itemId);
                        const itemNameLower = itemDef?.name?.toLowerCase() || '';
                        return actionLower.includes(itemNameLower) || actionLower.includes(itemId.toLowerCase());
                    });

                    if (isLiftingContainer) {
                        return {
                            updatedOpenDoors,
                            actualTargetId: matchedInteractable.id,
                            updatedWorldState,
                            updatedParty,
                            systemFeedback: `El jugador intenta coger o llevarse el contenedor físico '${matchedInteractable.name}' completo en lugar de saquear su contenido. Delega esta acción física a la narración libre del DM (ej. describir si es demasiado pesado o si puede moverlo de sitio, pero no añadirlo al inventario de la party).`
                        };
                    }

                    // B. Validar si el contenedor está cerrado
                    if (currentIntState === 'closed') {
                        return {
                            updatedOpenDoors,
                            actualTargetId: matchedInteractable.id,
                            updatedWorldState,
                            updatedParty,
                            systemFeedback: `The container ${matchedInteractable.name} is closed. You must open it first before you can loot or take items from it.`
                        };
                    }

                    if (containerItems.length > 0 && updatedParty && adventureData) {
                        let activeChar = updatedParty[0];
                        if (activeCharacterName) {
                            const found = updatedParty.find((p: any) => p.name.toLowerCase() === activeCharacterName.toLowerCase());
                            if (found) activeChar = found;
                        }

                        // Determinar si el jugador busca un ítem específico
                        const originalTargetLower = targetId.toLowerCase();
                        let targetItemId: string | null = null;

                        for (const itemId of containerItems) {
                            if (itemId.toLowerCase().includes(originalTargetLower) || originalTargetLower.includes(itemId.toLowerCase())) {
                                targetItemId = itemId;
                                break;
                            }
                            const itemDef = adventureData.items?.find((it: any) => it.id === itemId);
                            if (itemDef) {
                                const itemNameLower = itemDef.name?.toLowerCase() || '';
                                if (itemNameLower.includes(originalTargetLower) || originalTargetLower.includes(itemNameLower)) {
                                    targetItemId = itemId;
                                    break;
                                }
                            }
                        }

                        let itemsToLoot: string[] = [];
                        let remainingItems: string[] = [];

                        if (targetItemId) {
                            // Saqueo selectivo: tomar solo una coincidencia
                            let found = false;
                            for (const itemId of containerItems) {
                                if (itemId === targetItemId && !found) {
                                    itemsToLoot.push(itemId);
                                    found = true;
                                } else {
                                    remainingItems.push(itemId);
                                }
                            }
                        } else {
                            // Saqueo completo
                            itemsToLoot = [...containerItems];
                            remainingItems = [];
                        }

                        let itemsAdded: string[] = [];
                        for (const itemId of itemsToLoot) {
                            const itemDef = adventureData.items?.find((it: any) => it.id === itemId);
                            if (itemDef) {
                                if (!activeChar.inventory) {
                                    activeChar.inventory = [];
                                }
                                const existingItem = activeChar.inventory.find((invIt: any) => invIt.id === itemDef.id);
                                if (existingItem) {
                                    existingItem.quantity += 1;
                                } else {
                                    activeChar.inventory.push({
                                        id: itemDef.id,
                                        name: itemDef.name || itemDef.id,
                                        quantity: 1,
                                        description: itemDef.description || ''
                                    });
                                }
                                itemsAdded.push(itemDef.name || itemDef.id);
                            }
                        }

                        if (!locState.interactables) {
                            locState.interactables = {};
                        }

                        const isNowLooted = remainingItems.length === 0;
                        locState.interactables[matchedInteractable.id] = {
                            id: matchedInteractable.id,
                            state: isNowLooted ? 'looted' : 'open',
                            usedTimes: (locState.interactables[matchedInteractable.id]?.usedTimes || 0) + 1,
                            items: remainingItems
                        };

                        if (itemsAdded.length > 0) {
                            systemFeedback = `Looted container: ${matchedInteractable.name}. Added items: ${itemsAdded.join(', ')} to ${activeCharacterName || updatedParty[0].name}'s inventory. State is now ${isNowLooted ? 'looted' : 'open'}.`;
                        } else {
                            systemFeedback = `Looted container: ${matchedInteractable.name}. No items found. State is now ${isNowLooted ? 'looted' : 'open'}.`;
                        }
                    } else {
                        if (!locState.interactables) {
                            locState.interactables = {};
                        }
                        locState.interactables[matchedInteractable.id] = {
                            id: matchedInteractable.id,
                            state: 'looted',
                            usedTimes: (locState.interactables[matchedInteractable.id]?.usedTimes || 0) + 1,
                            items: []
                        };
                        systemFeedback = `Looted container: ${matchedInteractable.name}. Container was already empty. State is now looted.`;
                    }
                } else if (isOpenAction) {
                    if (!locState.interactables) {
                        locState.interactables = {};
                    }
                    locState.interactables[matchedInteractable.id] = {
                        id: matchedInteractable.id,
                        state: 'open',
                        usedTimes: (locState.interactables[matchedInteractable.id]?.usedTimes || 0) + 1
                    };
                    systemFeedback = `Opened container: ${matchedInteractable.name}. State is now open.`;
                } else if (isCloseAction) {
                    if (!locState.interactables) {
                        locState.interactables = {};
                    }
                    locState.interactables[matchedInteractable.id] = {
                        ...locState.interactables[matchedInteractable.id],
                        id: matchedInteractable.id,
                        state: 'closed',
                        usedTimes: (locState.interactables[matchedInteractable.id]?.usedTimes || 0) + 1
                    };
                    systemFeedback = `Closed container: ${matchedInteractable.name}. State is now closed.`;
                }
            } else if (isOpenAction) {
                const doorResult = this.handleDoorOpening({
                    matchedInteractable,
                    locationData,
                    currentLocationId,
                    updatedOpenDoors,
                    party: updatedParty,
                    adventureData,
                });

                if (doorResult.success) {
                    updatedOpenDoors[doorResult.doorKey!] = true;
                    doorOpeningDetails = {
                        method: doorResult.method || 'free',
                        keyName: doorResult.keyName,
                        requiredKeyId: doorResult.requiredKeyId
                    };

                    // Open reciprocal door
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
                } else {
                    systemFeedback = doorResult.systemFeedback || `Failed to open: ${matchedInteractable.name}`;
                }
            } else if (isCloseAction) {
                // Primero intentamos cerrar como puerta
                const doorResult = this.handleDoorClosing({
                    matchedInteractable,
                    locationData,
                    currentLocationId,
                    updatedOpenDoors,
                });

                if (doorResult.success) {
                    updatedOpenDoors[doorResult.doorKey!] = false;

                    // Close reciprocal door
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
                                updatedOpenDoors[reciprocalKey] = false;
                            }
                        }
                    }

                    systemFeedback = doorResult.systemFeedback;
                    log.gameCoordinator('Door closed', {
                        doorKey: doorResult.doorKey,
                        direction: doorResult.direction,
                    });
                } else {
                    // Fallback: Si no era una conexión/puerta válida, lo tratamos como un interactuable genérico de la sala.
                    if (updatedWorldState) {
                        const locState = WorldStateManager.getLocationState(updatedWorldState, currentLocationId);
                        if (!locState.interactables) {
                            locState.interactables = {};
                        }
                        locState.interactables[matchedInteractable.id] = {
                            ...locState.interactables[matchedInteractable.id],
                            id: matchedInteractable.id,
                            state: 'closed'
                        };
                        systemFeedback = `Closed interactable: ${matchedInteractable.name}. State is now closed.`;
                    }
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
            updatedWorldState,
            updatedParty,
            doorOpeningDetails
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
        party?: any[];
        adventureData?: any;
    }): {
        success: boolean;
        doorKey?: string;
        direction?: string;
        systemFeedback?: string;
        method?: 'key' | 'lockpick' | 'force' | 'free';
        keyName?: string;
        requiredKeyId?: string;
    } {
        const { matchedInteractable, locationData, currentLocationId, party, adventureData } = input;
        const doorId = matchedInteractable.id.toLowerCase();

        const getNormalizedDirections = (dir: string): string[] => {
            const d = dir.toLowerCase();
            const map: Record<string, string> = {
                'este': 'east', 'east': 'este',
                'oeste': 'west', 'west': 'oeste',
                'norte': 'north', 'north': 'norte',
                'sur': 'south', 'south': 'sur',
                'noreste': 'northeast', 'northeast': 'noreste',
                'noroeste': 'northwest', 'northwest': 'noroeste',
                'sureste': 'southeast', 'southeast': 'sureste',
                'suroeste': 'southwest', 'southwest': 'suroeste',
                'arriba': 'up', 'up': 'arriba',
                'abajo': 'down', 'down': 'abajo'
            };
            return map[d] ? [d, map[d]] : [d];
        };

        const checkKeyRequirement = (conn: any): { success: boolean; systemFeedback?: string; keyName?: string } => {
            if (conn && conn.requiredKeyId) {
                const requiredKeyId = conn.requiredKeyId;
                const hasKey = party && party.some((char: any) =>
                    char.inventory?.some((item: any) => item.id === requiredKeyId)
                );
                if (!hasKey) {
                    const keyName = requiredKeyId.replace(/-/g, ' ');
                    return {
                        success: false,
                        systemFeedback: `The door/verja is locked. You do not have the required key (${keyName}).`
                    };
                }
                const itemDef = adventureData?.items?.find((it: any) => it.id === requiredKeyId);
                return {
                    success: true,
                    keyName: itemDef?.name || requiredKeyId.replace(/-/g, ' ')
                };
            }
            return { success: true };
        };

        // Buscar conexión que coincida con esta puerta
        const matchingConnection = locationData.connections?.find((conn: any) => {
            const connDirection = conn.direction?.toLowerCase() || '';
            const connTarget = conn.targetId?.toLowerCase() || '';
            const connDirs = getNormalizedDirections(connDirection);

            return connDirs.some(dir => doorId.includes(dir)) ||
                (connTarget && doorId.includes(connTarget));
        });

        if (matchingConnection && matchingConnection.direction) {
            const keyCheck = checkKeyRequirement(matchingConnection);
            if (!keyCheck.success) {
                return {
                    success: false,
                    systemFeedback: keyCheck.systemFeedback
                };
            }

            const doorKey = `${currentLocationId}:${matchingConnection.direction}`;
            return {
                success: true,
                doorKey,
                direction: matchingConnection.direction,
                systemFeedback: `Door opened successfully: ${matchingConnection.direction}`,
                method: matchingConnection.requiredKeyId ? 'key' : 'free',
                keyName: keyCheck.keyName,
                requiredKeyId: matchingConnection.requiredKeyId
            };
        }

        // Intentar coincidencia por dirección en el ID del interactable
        const directions = [
            'norte', 'sur', 'este', 'oeste', 'noreste', 'noroeste', 'sureste', 'suroeste', 'arriba', 'abajo',
            'north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'up', 'down'
        ];
        for (const dir of directions) {
            if (doorId.includes(dir)) {
                const englishToSpanish: Record<string, string> = {
                    'north': 'norte', 'south': 'sur', 'east': 'este', 'west': 'oeste',
                    'northeast': 'noreste', 'northwest': 'noroeste', 'southeast': 'sureste', 'southwest': 'suroeste',
                    'up': 'arriba', 'down': 'abajo'
                };
                const finalDir = englishToSpanish[dir] || dir;
                
                // Buscar conexión asociada a la dirección encontrada
                const connByDir = locationData.connections?.find((c: any) => c.direction?.toLowerCase() === finalDir.toLowerCase());
                const keyCheck = checkKeyRequirement(connByDir);
                if (!keyCheck.success) {
                    return {
                        success: false,
                        systemFeedback: keyCheck.systemFeedback
                    };
                }

                const doorKey = `${currentLocationId}:${finalDir}`;
                return {
                    success: true,
                    doorKey,
                    direction: finalDir,
                    systemFeedback: `Door opened successfully: ${finalDir}`,
                    method: connByDir?.requiredKeyId ? 'key' : 'free',
                    keyName: keyCheck.keyName,
                    requiredKeyId: connByDir?.requiredKeyId
                };
            }
        }

        return { success: false };
    }

    /**
     * Maneja el cierre de una puerta.
     * 
     * @param input - Datos de la puerta a cerrar
     * @returns Resultado con la clave de la puerta cerrada y feedback
     */
    private static handleDoorClosing(input: {
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

        const getNormalizedDirections = (dir: string): string[] => {
            const d = dir.toLowerCase();
            const map: Record<string, string> = {
                'este': 'east', 'east': 'este',
                'oeste': 'west', 'west': 'oeste',
                'norte': 'north', 'north': 'norte',
                'sur': 'south', 'south': 'sur',
                'noreste': 'northeast', 'northeast': 'noreste',
                'noroeste': 'northwest', 'northwest': 'noroeste',
                'sureste': 'southeast', 'southeast': 'sureste',
                'suroeste': 'southwest', 'southwest': 'suroeste',
                'arriba': 'up', 'up': 'arriba',
                'abajo': 'down', 'down': 'abajo'
            };
            return map[d] ? [d, map[d]] : [d];
        };

        // Buscar conexión que coincida con esta puerta
        const matchingConnection = locationData.connections?.find((conn: any) => {
            const connDirection = conn.direction?.toLowerCase() || '';
            const connTarget = conn.targetId?.toLowerCase() || '';
            const connDirs = getNormalizedDirections(connDirection);

            return connDirs.some(dir => doorId.includes(dir)) ||
                (connTarget && doorId.includes(connTarget));
        });

        if (matchingConnection && matchingConnection.direction) {
            const doorKey = `${currentLocationId}:${matchingConnection.direction}`;
            return {
                success: true,
                doorKey,
                direction: matchingConnection.direction,
                systemFeedback: `Door closed successfully: ${matchingConnection.direction}`,
            };
        }

        // Intentar coincidencia por dirección en el ID del interactable
        const directions = [
            'norte', 'sur', 'este', 'oeste', 'noreste', 'noroeste', 'sureste', 'suroeste', 'arriba', 'abajo',
            'north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'up', 'down'
        ];
        for (const dir of directions) {
            if (doorId.includes(dir)) {
                const englishToSpanish: Record<string, string> = {
                    'north': 'norte', 'south': 'sur', 'east': 'este', 'west': 'oeste',
                    'northeast': 'noreste', 'northwest': 'noroeste', 'southeast': 'sureste', 'southwest': 'suroeste',
                    'up': 'arriba', 'down': 'abajo'
                };
                const finalDir = englishToSpanish[dir] || dir;
                const doorKey = `${currentLocationId}:${finalDir}`;
                return {
                    success: true,
                    doorKey,
                    direction: finalDir,
                    systemFeedback: `Door closed successfully: ${finalDir}`,
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

