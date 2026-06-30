import { RuleModule, RulesEngineInput, RulesEngineResult } from './rule-module';
import { WorldStateManager } from '../world-state-manager';

export class InventoryRuleModule implements RuleModule {
    name = 'InventoryRules';

    canHandle(input: RulesEngineInput): boolean {
        const { interpretation } = input;
        return interpretation.actionType === 'drop' || interpretation.actionType === 'give';
    }

    evaluate(input: RulesEngineInput): RulesEngineResult {
        const { playerAction, interpretation, party, worldState, currentLocationId } = input;

        const updatedWorldState = worldState ? JSON.parse(JSON.stringify(worldState)) : { locations: {}, globalFlags: {}, recentEvents: [] };
        const updatedParty = party ? JSON.parse(JSON.stringify(party)) : [];

        const activeCharName = interpretation.assignedCompanion || updatedParty[0]?.name;
        const activeChar = updatedParty.find((c: any) => c.name.toLowerCase() === activeCharName.toLowerCase());

        if (!activeChar) {
            return {
                interpretation,
                intercepted: true,
                updatedParty,
                updatedWorldState,
                systemFeedback: `No se pudo encontrar al personaje activo '${activeCharName}' en el grupo.`
            };
        }

        const targetItemQuery = interpretation.targetId || '';
        if (!targetItemQuery) {
            return {
                interpretation,
                intercepted: true,
                updatedParty,
                updatedWorldState,
                systemFeedback: `¿Qué objeto intentas manipular?`
            };
        }

        // Buscar el objeto en el inventario del personaje activo de forma robusta
        const itemIndex = activeChar.inventory?.findIndex((it: any) => {
            const idMatch = it.id.toLowerCase() === targetItemQuery.toLowerCase();
            const nameMatch = it.name.toLowerCase().includes(targetItemQuery.toLowerCase()) || 
                              targetItemQuery.toLowerCase().includes(it.name.toLowerCase());
            return idMatch || nameMatch;
        });

        if (itemIndex === undefined || itemIndex === -1) {
            return {
                interpretation,
                intercepted: true,
                updatedParty,
                updatedWorldState,
                systemFeedback: `No tienes '${targetItemQuery}' en tu inventario.`
            };
        }

        const itemToManipulate = activeChar.inventory[itemIndex];

        if (interpretation.actionType === 'drop') {
            // Acción de soltar (Drop)
            // Restar 1 al inventario del PJ
            if (itemToManipulate.quantity > 1) {
                itemToManipulate.quantity--;
            } else {
                activeChar.inventory.splice(itemIndex, 1);
            }

            // Obtener estado mutable de la localización
            const locState = WorldStateManager.getLocationState(updatedWorldState, currentLocationId);
            if (!locState.droppedItems) {
                locState.droppedItems = [];
            }

            // Buscar si ya hay un ítem idéntico tirado en el suelo
            const existingDroppedIndex = locState.droppedItems.findIndex((it: any) => it.id === itemToManipulate.id);
            if (existingDroppedIndex !== -1) {
                locState.droppedItems[existingDroppedIndex].quantity++;
            } else {
                locState.droppedItems.push({
                    id: itemToManipulate.id,
                    name: itemToManipulate.name,
                    quantity: 1,
                    description: itemToManipulate.description || ''
                });
            }

            return {
                interpretation,
                intercepted: true,
                updatedParty,
                updatedWorldState,
                systemFeedback: `${activeChar.name} ha dejado caer ${itemToManipulate.name} al suelo.`
            };

        } else if (interpretation.actionType === 'give') {
            // Acción de dar (Give)
            let recipientName = interpretation.recipient;

            // Intento de fallback inteligente de receptor si la IA no lo detectó
            if (!recipientName) {
                const actionLower = playerAction.toLowerCase();
                const possibleRecipient = updatedParty.find((c: any) => 
                    c.name.toLowerCase() !== activeChar.name.toLowerCase() && 
                    actionLower.includes(c.name.toLowerCase())
                );
                if (possibleRecipient) {
                    recipientName = possibleRecipient.name;
                }
            }

            if (!recipientName) {
                return {
                    interpretation,
                    intercepted: true,
                    updatedParty,
                    updatedWorldState,
                    systemFeedback: `¿A qué compañero de grupo le quieres entregar ${itemToManipulate.name}?`
                };
            }

            const recipientChar = updatedParty.find((c: any) => c.name.toLowerCase() === recipientName.toLowerCase());
            if (!recipientChar) {
                return {
                    interpretation,
                    intercepted: true,
                    updatedParty,
                    updatedWorldState,
                    systemFeedback: `No se pudo encontrar al compañero '${recipientName}' en el grupo.`
                };
            }

            if (recipientChar.name.toLowerCase() === activeChar.name.toLowerCase()) {
                return {
                    interpretation,
                    intercepted: true,
                    updatedParty,
                    updatedWorldState,
                    systemFeedback: `No puedes entregarte un objeto a ti mismo.`
                };
            }

            // Restar de origen
            if (itemToManipulate.quantity > 1) {
                itemToManipulate.quantity--;
            } else {
                activeChar.inventory.splice(itemIndex, 1);
            }

            // Añadir a destino
            if (!recipientChar.inventory) {
                recipientChar.inventory = [];
            }
            const existingItem = recipientChar.inventory.find((it: any) => it.id === itemToManipulate.id);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                recipientChar.inventory.push({
                    id: itemToManipulate.id,
                    name: itemToManipulate.name,
                    quantity: 1,
                    description: itemToManipulate.description || ''
                });
            }

            return {
                interpretation,
                intercepted: true,
                updatedParty,
                updatedWorldState,
                systemFeedback: `${activeChar.name} le ha entregado ${itemToManipulate.name} a ${recipientChar.name}.`
            };
        }

        return {
            interpretation,
            intercepted: false,
            updatedWorldState
        };
    }
}
