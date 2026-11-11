import { GameSystem, SystemContext } from './system-types';
import { GameEvent } from '../events/event-schemas';
import { InteractionHandler } from '@/ai/flows/managers/interaction-handler';
import { WorldStateManager } from '../world-state-manager';

export class InteractionSystem implements GameSystem {
  name = 'InteractionSystem';

  async handle(event: GameEvent, context: SystemContext): Promise<void> {
    if (event.type !== 'InteractAttempted') {
      return;
    }

    const { targetId, assignedCompanion } = event.payload;

    // Resolver entidad activa
    let activeCharacterName = context.party[0]?.name;
    if (assignedCompanion) {
       const found = context.party.find(p => p.name.toLowerCase() === assignedCompanion.toLowerCase());
       if (found) {
         activeCharacterName = found.name;
       }
    }

    const locationData = context.adventureData.locations.find((l: any) => l.id === context.currentLocationId);
    if (!locationData) {
      return;
    }

    // Resolver enemigos/entidades vivas para dárselas al InteractionHandler
    const resolvedEntities = locationData.entitiesPresent || [];

    // Guardar copia del inventario inicial de la party para detectar ítems recolectados
    const initialInventoryState = context.party.map(p => ({
      id: p.id,
      name: p.name,
      inventory: JSON.parse(JSON.stringify(p.inventory || []))
    }));

    // Guardar estado inicial de puertas
    const initialOpenDoors = { ...context.openDoors };

    const result = await InteractionHandler.processInteraction({
      playerAction: event.payload.playerAction || `interactuar con ${targetId}`,
      targetId,
      actionType: 'interact',
      locationData,
      currentLocationId: context.currentLocationId,
      currentOpenDoors: context.openDoors,
      resolvedEntities,
      worldState: context.worldState,
      party: context.party,
      adventureData: context.adventureData,
      activeCharacterName
    });

    // 1. Detectar puertas que se abrieron o cerraron
    for (const [doorKey, isOpen] of Object.entries(result.updatedOpenDoors)) {
      const wasOpen = initialOpenDoors[doorKey];
      if (isOpen !== wasOpen) {
        const parts = doorKey.split(':');
        const locId = parts[0];
        const direction = parts[1];

        if (isOpen) {
          const details = (result as any).doorOpeningDetails;
          context.enqueue({
            type: 'DoorOpened',
            payload: {
              locationId: locId,
              direction,
              method: details?.method,
              keyName: details?.keyName,
              requiredKeyId: details?.requiredKeyId,
            }
          });
        } else {
          context.enqueue({
            type: 'DoorClosed',
            payload: {
              locationId: locId,
              direction,
            }
          });
        }
      }
    }

    // Actualizar puertas abiertas en el contexto
    context.openDoors = result.updatedOpenDoors;

    // 2. Detectar si la party recogió objetos
    if (result.updatedParty) {
      for (const updatedChar of result.updatedParty) {
        const initialChar = initialInventoryState.find(c => c.id === updatedChar.id);
        if (!initialChar) continue;

        const updatedInv = updatedChar.inventory || [];
        const initialInv = initialChar.inventory || [];

        for (const item of updatedInv) {
          const initItem = initialInv.find((i: any) => i.id === item.id);
          const initialQty = initItem ? initItem.quantity : 0;

          if (item.quantity > initialQty) {
            context.enqueue({
              type: 'ItemCollected',
              payload: {
                characterId: updatedChar.id,
                characterName: updatedChar.name,
                itemId: item.id,
                itemName: item.name,
                quantity: item.quantity - initialQty,
              }
            });
          }
        }
      }

      // Actualizar la party en el contexto
      context.party = result.updatedParty;
    }

    // 3. Actualizar WorldState si mutó
    if (result.updatedWorldState) {
      context.worldState = result.updatedWorldState;
    }

    // 4. Si se activó un trigger de combate (mimic, trampa, etc.)
    if (result.combatTrigger?.shouldStartCombat) {
      context.enqueue({
        type: 'CombatTriggered',
        payload: {
          reason: result.combatTrigger.reason as any,
          triggeringEntityIds: result.combatTrigger.triggeringEntityIds || [],
          message: result.combatTrigger.message,
        }
      });
    }

    // Guardar el feedback del sistema
    if (result.systemFeedback) {
      context.systemFeedback = result.systemFeedback;
    }
  }
}
