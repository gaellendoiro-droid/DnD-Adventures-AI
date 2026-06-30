import { RuleModule, RulesEngineInput, RulesEngineResult } from './rule-module';
import { WorldStateManager } from '../world-state-manager';

export class KeyRuleModule implements RuleModule {
    name = 'KeyRules';

    canHandle(input: RulesEngineInput): boolean {
        const { playerAction } = input;
        const locationData = (input as any).locationData || (input.adventureData?.locations?.find((loc: any) => loc.id === input.currentLocationId));
        if (!locationData || !locationData.connections) return false;

        const actionLower = playerAction.toLowerCase();
        
        // Comprobar si la acción implica abrir, forzar, desbloquear o usar una llave
        const isAttemptingOpen = /abrir|open|abr|forz|desbloq|destrab|tirar|empuj|tumb|derrib|llave|abrid/i.test(actionLower);
        if (!isAttemptingOpen) return false;

        // Comprobar si existe alguna conexión cerrada con llave en la ubicación actual
        const hasLockedConnection = locationData.connections.some((conn: any) => {
            if (!conn.isLocked) return false;

            const direction = conn.direction?.toLowerCase();
            if (!direction) return false;

            // Coincidencia de dirección en el texto
            const isDirMentioned = actionLower.includes(direction) || 
                                  (direction === 'norte' && actionLower.includes('north')) ||
                                  (direction === 'sur' && actionLower.includes('south')) ||
                                  (direction === 'este' && actionLower.includes('east')) ||
                                  (direction === 'oeste' && actionLower.includes('west'));
            
            // O coincidencia genérica si solo hay una puerta cerrada con llave en la estancia
            const isGenericDoorMention = /puerta|verja|portón|cerradura/i.test(actionLower);

            const lockedConnectionsCount = locationData.connections.filter((c: any) => c.isLocked).length;

            return isDirMentioned || (isGenericDoorMention && lockedConnectionsCount === 1);
        });

        return hasLockedConnection;
    }

    evaluate(input: RulesEngineInput): RulesEngineResult {
        const { playerAction, interpretation, party, worldState, currentLocationId } = input;
        const locationData = (input as any).locationData || (input.adventureData?.locations?.find((loc: any) => loc.id === currentLocationId));
        const actionLower = playerAction.toLowerCase();

        const updatedWorldState = worldState ? JSON.parse(JSON.stringify(worldState)) : { locations: {}, globalFlags: {}, recentEvents: [] };
        const updatedParty = party ? JSON.parse(JSON.stringify(party)) : [];

        // Buscar la conexión correspondiente que queremos abrir
        const connection = locationData?.connections?.find((conn: any) => {
            if (!conn.isLocked) return false;

            const direction = conn.direction?.toLowerCase();
            if (!direction) return false;

            const isDirMentioned = actionLower.includes(direction) || 
                                  (direction === 'norte' && actionLower.includes('north')) ||
                                  (direction === 'sur' && actionLower.includes('south')) ||
                                  (direction === 'este' && actionLower.includes('east')) ||
                                  (direction === 'oeste' && actionLower.includes('west'));
            
            const isGenericDoorMention = /puerta|verja|portón|cerradura/i.test(actionLower);
            const lockedConnectionsCount = locationData.connections.filter((c: any) => c.isLocked).length;

            return isDirMentioned || (isGenericDoorMention && lockedConnectionsCount === 1);
        });

        if (!connection) {
            return { interpretation, intercepted: false, updatedWorldState };
        }

        // 1. Caso A: Posee la llave correcta o está accesible en un contenedor abierto en la sala
        const requiredKeyId = connection.requiredKeyId;
        let hasKey = requiredKeyId && updatedParty.some((char: any) => 
            char.inventory?.some((item: any) => item.id === requiredKeyId)
        );

        // Si no la tiene en el inventario, verificar si está en un contenedor accesible (abierto) de la sala
        if (!hasKey && requiredKeyId) {
            const locState = WorldStateManager.getLocationState(updatedWorldState, currentLocationId);
            const interactables = locationData?.interactables || [];
            
            for (const inter of interactables) {
                const interState = locState.interactables?.[inter.id]?.state || inter.state || 'closed';
                // Si el contenedor está abierto, cogemos la llave automáticamente
                if (interState === 'open') {
                    const containerItems = locState.interactables?.[inter.id]?.items ?? inter.items ?? [];
                    const keyIndex = containerItems.indexOf(requiredKeyId);
                    if (keyIndex !== -1) {
                        const activeCharName = interpretation.assignedCompanion || updatedParty[0]?.name;
                        const activeChar = updatedParty.find((c: any) => c.name.toLowerCase() === activeCharName.toLowerCase()) || updatedParty[0];
                        if (activeChar) {
                            if (!activeChar.inventory) {
                                activeChar.inventory = [];
                            }
                            const itemDef = input.adventureData?.items?.find((it: any) => it.id === requiredKeyId);
                            activeChar.inventory.push({
                                id: requiredKeyId,
                                name: itemDef?.name || requiredKeyId.replace(/-/g, ' '),
                                quantity: 1,
                                description: itemDef?.description || ''
                            });

                            // Actualizar los ítems del contenedor en el worldState
                            const remainingItems = [...containerItems];
                            remainingItems.splice(keyIndex, 1);
                            const isNowLooted = remainingItems.length === 0;

                            if (!locState.interactables) {
                                locState.interactables = {};
                            }
                            locState.interactables[inter.id] = {
                                id: inter.id,
                                state: isNowLooted ? 'looted' : 'open',
                                usedTimes: (locState.interactables[inter.id]?.usedTimes || 0) + 1,
                                items: remainingItems
                            };

                            hasKey = true;
                            break;
                        }
                    }
                }
            }
        }

        if (hasKey) {
            // Obtener nombre de la llave para el feedback narrativo
            let keyName = 'la llave correspondiente';
            for (const char of updatedParty) {
                const item = char.inventory?.find((it: any) => it.id === requiredKeyId);
                if (item) {
                    keyName = item.name;
                    break;
                }
            }

            // Desbloquear y abrir la puerta en el estado persistido
            const locState = WorldStateManager.getLocationState(updatedWorldState, currentLocationId);
            if (!locState.connections) {
                locState.connections = {};
            }
            locState.connections[connection.direction] = {
                direction: connection.direction,
                isOpen: true,
                isLocked: false,
                isBlocked: false
            };

            // También abrir en openDoors si existe en el input para sincronización reactiva inmediata
            let updatedOpenDoors = { ...(input as any).openDoors || {} };
            const doorKey = `${currentLocationId}:${connection.direction}`;
            updatedOpenDoors[doorKey] = true;

            // Abrir puerta recíproca
            const reverseMap: Record<string, string> = {
                norte: 'sur', sur: 'norte', este: 'oeste', oeste: 'este',
                noreste: 'suroeste', noroeste: 'sureste', sureste: 'noroeste', suroeste: 'noreste',
                arriba: 'abajo', abajo: 'arriba'
            };
            const reverseDir = reverseMap[connection.direction];
            if (reverseDir && connection.targetId) {
                updatedOpenDoors[`${connection.targetId}:${reverseDir}`] = true;
                
                // Actualizar estado del mundo recíproco
                const targetLocState = WorldStateManager.getLocationState(updatedWorldState, connection.targetId);
                if (!targetLocState.connections) {
                    targetLocState.connections = {};
                }
                targetLocState.connections[reverseDir] = {
                    direction: reverseDir,
                    isOpen: true,
                    isLocked: false,
                    isBlocked: false
                };
            }

            return {
                interpretation: {
                    ...interpretation,
                    actionType: 'interact',
                    targetId: connection.targetId
                },
                systemFeedback: `Desbloqueas y abres la conexión hacia el ${connection.direction} usando '${keyName}' con éxito.`,
                updatedWorldState,
                updatedParty,
                intercepted: true,
                events: [
                    {
                        type: 'DoorOpened',
                        payload: {
                            locationId: currentLocationId,
                            direction: connection.direction,
                            method: 'key',
                            keyName: keyName,
                            requiredKeyId: requiredKeyId
                        }
                    }
                ],
                // Pasar openDoors en el output para que narrative-turn-manager lo propague
                ...({ updatedOpenDoors } as any)
            };
        }

        // 2. Caso B: No posee la llave
        const isAttemptingForce = /romp|derrib|empuj|tumb|destro|viol/i.test(actionLower) || (actionLower.includes('forzar') && !actionLower.includes('cerradura') && !actionLower.includes('ganzúa'));
        const isAttemptingSleight = /herramienta|ganzúa|delicado|habilidad|maña|cerradura/i.test(actionLower) || (actionLower.includes('forzar') && (actionLower.includes('cerradura') || actionLower.includes('ganzúa')));

        // Si la verja no tiene formas de forzado (es decir, es mágica/impenetrable)
        if (!connection.lockpickDC && !connection.breakDC) {
            return {
                interpretation: {
                    ...interpretation,
                    actionType: 'narrate'
                },
                systemFeedback: `La conexión al ${connection.direction} está cerrada firmemente con llave. No hay cerraduras accesibles para ganzúas ordinarias ni puntos débiles que permitan forzarla por la fuerza física. Requiere una llave específica para abrirse.`,
                updatedWorldState,
                updatedParty,
                intercepted: true
            };
        }

        // Si intenta forzar la cerradura técnicamente y tiene lockpickDC (prioridad sobre fuerza bruta si se mencionan ganzúas/cerraduras)
        if (isAttemptingSleight && connection.lockpickDC) {
            return {
                interpretation: {
                    ...interpretation,
                    actionType: 'skill_check',
                    overrideSkill: 'sleight_of_hand',
                    overrideDC: connection.lockpickDC,
                    targetId: connection.targetId
                },
                systemFeedback: `Intentas forzar la cerradura de la puerta bloqueada al ${connection.direction} usando herramientas de ladrón (Prueba de Juego de Manos con CD ${connection.lockpickDC}).`,
                updatedWorldState,
                updatedParty,
                intercepted: true
            };
        }

        // Si intenta forzar físicamente y tiene breakDC
        if (isAttemptingForce && connection.breakDC) {
            return {
                interpretation: {
                    ...interpretation,
                    actionType: 'skill_check',
                    overrideSkill: 'athletics',
                    overrideDC: connection.breakDC,
                    targetId: connection.targetId
                },
                systemFeedback: `Intentas forzar o derribar la puerta bloqueada al ${connection.direction} mediante la fuerza bruta (Prueba de Atletismo con CD ${connection.breakDC}).`,
                updatedWorldState,
                updatedParty,
                intercepted: true
            };
        }

        // Si intenta abrir normalmente sin llave ni especificar forzado (ej: "abrimos la puerta del norte")
        // Ofrecer una respuesta descriptiva de bloqueo, permitiéndole al jugador decidir si forzarla
        let optionsText = '';
        if (connection.lockpickDC && connection.breakDC) {
            optionsText = `Puedes intentar forzar la cerradura con ganzúas (Juego de Manos CD ${connection.lockpickDC}) o derribarla por la fuerza (Atletismo CD ${connection.breakDC}).`;
        } else if (connection.lockpickDC) {
            optionsText = `La cerradura parece delicada. Puedes intentar forzarla con herramientas de ladrón (Juego de Manos CD ${connection.lockpickDC}).`;
        } else if (connection.breakDC) {
            optionsText = `La verja parece oxidada pero sólida. Puedes intentar forzarla por la fuerza bruta (Atletismo CD ${connection.breakDC}).`;
        }

        return {
            interpretation: {
                ...interpretation,
                actionType: 'narrate'
            },
            systemFeedback: `La puerta hacia el ${connection.direction} está cerrada con llave. No posees la llave correspondiente. ${optionsText}`.trim(),
            updatedWorldState,
            updatedParty,
            intercepted: true
        };
    }
}
