import { GameSystem, SystemContext } from './system-types';
import { GameEvent } from '../events/event-schemas';
import { NavigationManager } from '@/ai/flows/managers/navigation-manager';
import { resolveSkillCheck } from '@/lib/skills/skill-check-resolver';
import { EnemyStateManager } from '../enemy-state-manager';

export class NavigationSystem implements GameSystem {
  name = 'NavigationSystem';

  async handle(event: GameEvent, context: SystemContext): Promise<void> {
    if (event.type !== 'MoveAttempted') {
      return;
    }

    const { toLocationId, stealthIntent, assignedCompanion } = event.payload;

    // Crear un mock de GameState para dárselo a NavigationManager
    const tempGameState = {
      playerAction: '', // No es necesaria aquí
      party: context.party,
      locationId: context.currentLocationId,
      inCombat: false,
      conversationHistory: [],
      openDoors: context.openDoors,
      worldTime: context.worldState?.worldTime || { day: 1, hour: 8, minute: 0 },
    };

    const result = await NavigationManager.resolveMovement(
      tempGameState as any,
      toLocationId,
      context.adventureData
    );

    if (result.success && result.newLocationId) {
      const fromLocationId = context.currentLocationId;
      const newLocationId = result.newLocationId;

      // 1. Calcular Sigilo si se declaró
      let stealthCheckResult: { success: boolean; roll: number } | undefined = undefined;
      
      if (stealthIntent) {
        // Encontrar enemigo con la percepción pasiva más alta en el destino
        let maxPassivePerception = 10;
        const enemiesByLocation = context.worldState?.locations?.[newLocationId]?.enemies || [];
        if (enemiesByLocation.length > 0) {
          maxPassivePerception = Math.max(
            ...enemiesByLocation.map((e: any) => e.stats?.passive_perception || e.passivePerception || 10)
          );
        }

        // Determinar quién hace la tirada
        let actor = context.party[0];
        if (assignedCompanion) {
          const foundCompanion = context.party.find(
            (p) => p.name.toLowerCase() === assignedCompanion.toLowerCase()
          );
          if (foundCompanion) {
            actor = foundCompanion;
          }
        }

        const stealthRoll = resolveSkillCheck(actor, 'stealth', maxPassivePerception);
        context.diceRolls.push(stealthRoll);

        stealthCheckResult = {
          success: stealthRoll.totalResult >= maxPassivePerception,
          roll: stealthRoll.totalResult,
        };

        // Emitir evento de tirada resuelta
        context.enqueue({
          type: 'SkillCheckResolved',
          payload: {
            characterName: actor.name,
            skill: 'stealth',
            dc: maxPassivePerception,
            rollTotal: stealthRoll.totalResult,
            isSuccess: stealthCheckResult.success,
            reasoning: `Intento de sigilo al entrar en ${newLocationId}.`,
          },
        });
      }

      // 2. Actualizar el tiempo en el estado del mundo
      if (result.timePassed) {
        const delta = result.timePassed;
        if (!context.worldState.worldTime) {
          context.worldState.worldTime = { day: 1, hour: 8, minute: 0 };
        }
        let { day, hour, minute } = context.worldState.worldTime;
        minute += delta.minutes;
        while (minute >= 60) {
          minute -= 60;
          hour += 1;
        }
        hour += delta.hours;
        while (hour >= 24) {
          hour -= 24;
          day += 1;
        }
        day += delta.days;
        context.worldState.worldTime = { day, hour, minute };
      }

      // 3. Registrar visita de la nueva sala en el worldState
      if (!context.worldState.locations) {
        context.worldState.locations = {};
      }
      if (!context.worldState.locations[newLocationId]) {
        context.worldState.locations[newLocationId] = {
          visited: false,
          visitedCount: 0,
          enemies: [],
        };
      }
      const locState = context.worldState.locations[newLocationId];
      locState.visited = true;
      locState.visitedCount = (locState.visitedCount || 0) + 1;

      // 4. Actualizar ID de ubicación actual
      context.currentLocationId = newLocationId;

      // 5. Emitir evento de movimiento exitoso
      context.enqueue({
        type: 'PlayerMoved',
        payload: {
          fromLocationId,
          toLocationId: newLocationId,
          travelTimePassed: result.timePassed
            ? result.timePassed.days * 24 * 60 + result.timePassed.hours * 60 + result.timePassed.minutes
            : 0,
          stealthCheckResult,
        },
      });

      // 6. Si hay un trigger de combate programado en la conexión, emitir CombatTriggered
      if (result.combatTrigger?.shouldStartCombat) {
        context.enqueue({
          type: 'CombatTriggered',
          payload: {
            reason: result.combatTrigger.reason as any,
            triggeringEntityIds: result.combatTrigger.triggeringEntityIds || [],
            message: result.combatTrigger.message,
          },
        });
      }
    } else {
      // "Acercarse" a algo que ya está en la localización actual (una criatura, un objeto)
      // no es un viaje: el grupo no cambia de sala y no hay nada que haya fallado.
      if (result.status === 'not_found' && isTargetInCurrentLocation(toLocationId, context)) {
        return;
      }

      // Movimiento fallido
      context.systemFeedback = result.error || 'No puedes ir allí.';
      context.enqueue({
        type: 'MoveFailed',
        payload: {
          locationId: toLocationId,
          reason: context.systemFeedback,
        },
      });
    }
  }
}

const normalize = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * ¿El destino de un "move" es en realidad algo presente en la localización actual
 * (una entidad o un interactuable)? Se compara por id y por nombre, sin tildes ni guiones.
 */
export function isTargetInCurrentLocation(target: string, context: Pick<SystemContext, 'adventureData' | 'currentLocationId'>): boolean {
  const t = normalize(target);
  if (t.length < 3) return false;
  const location = context.adventureData?.locations?.find((l: any) => l.id === context.currentLocationId);
  if (!location) return false;

  const candidates: string[] = [];
  for (const entry of location.entitiesPresent ?? []) {
    const id = typeof entry === 'string' ? entry : entry?.entityId ?? entry?.id;
    const entity = context.adventureData?.entities?.find((e: any) => e.id === id);
    candidates.push(id, entity?.name);
  }
  for (const it of location.interactables ?? []) {
    candidates.push(it?.id, it?.name);
  }

  return candidates
    .map(normalize)
    .filter(c => c.length >= 3)
    .some(c => c === t || t.includes(c) || c.includes(t));
}
