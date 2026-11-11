import { GameSystem, SystemContext } from './system-types';
import { GameEvent } from '../events/event-schemas';

export class CombatSystem implements GameSystem {
  name = 'CombatSystem';

  handle(event: GameEvent, context: SystemContext): void {
    if (event.type === 'AttackAttempted') {
      const { targetId } = event.payload;

      // Emitir evento de combate disparado por el ataque
      context.enqueue({
        type: 'CombatTriggered',
        payload: {
          reason: 'player_surprise',
          triggeringEntityIds: targetId ? [targetId] : [],
          message: '¡Inicias una agresión y estalla el combate!',
        },
      });
    } else if (event.type === 'CombatTriggered') {
      // Guardar el trigger de combate en el contexto para que lo reciba el NarrativeTurnManager
      if (!context.explorationState) {
        context.explorationState = {};
      }
      context.explorationState.combatTriggerResult = {
        shouldStartCombat: true,
        reason: event.payload.reason,
        message: event.payload.message || '¡El combate ha comenzado!',
        triggeringEntityIds: event.payload.triggeringEntityIds,
      };
    }
  }
}
