import { GameSystem, SystemContext } from './system-types';
import { GameEvent } from '../events/event-schemas';

export class StatsSystem implements GameSystem {
  name = 'StatsSystem';

  handle(event: GameEvent, context: SystemContext): void {
    if (event.type === 'DamageApplied') {
      const { targetId, targetName, amount } = event.payload;

      // 1. Verificar si es un personaje de la party
      const partyMember = context.party.find(
        (p) => p.id === targetId || p.name.toLowerCase() === targetName.toLowerCase()
      );

      if (partyMember) {
        const initialHp = partyMember.hp.current;
        partyMember.hp.current = Math.max(0, partyMember.hp.current - amount);
        console.log(`[StatsSystem] Daño aplicado a personaje ${partyMember.name}: ${initialHp} -> ${partyMember.hp.current}`);

        if (partyMember.hp.current <= 0) {
          partyMember.isDead = true;
          // Emitir evento de muerte
          context.enqueue({
            type: 'CharacterDied',
            payload: {
              characterId: partyMember.id,
              characterName: partyMember.name,
              isUnconsciousOnly: false, // Por ahora simplificado a muerte
            },
          });
        }
        return;
      }

      // 2. Si no es party, buscar si es un enemigo en la localización actual
      const locState = context.worldState?.locations?.[context.currentLocationId];
      if (locState && locState.enemies) {
        const enemy = locState.enemies.find(
          (e: any) => e.id === targetId || e.name?.toLowerCase() === targetName.toLowerCase()
        );

        if (enemy) {
          const enemyHp = typeof enemy.hp === 'number' ? enemy.hp : enemy.hp.current;
          const maxHp = typeof enemy.hp === 'number' ? enemy.hp : enemy.hp.max;

          let newHp = Math.max(0, enemyHp - amount);

          if (typeof enemy.hp === 'number') {
            enemy.hp = newHp;
          } else {
            enemy.hp.current = newHp;
          }

          console.log(`[StatsSystem] Daño aplicado a enemigo ${enemy.id}: ${enemyHp} -> ${newHp}`);

          if (newHp <= 0) {
            enemy.status = 'dead';
            context.enqueue({
              type: 'EnemyDied',
              payload: {
                enemyId: enemy.id,
                enemyName: enemy.name || enemy.id,
                locationId: context.currentLocationId,
              },
            });
          }
        }
      }
    } else if (event.type === 'HealApplied') {
      const { targetId, targetName, amount } = event.payload;

      // Buscar miembro de la party para curar
      const partyMember = context.party.find(
        (p) => p.id === targetId || p.name.toLowerCase() === targetName.toLowerCase()
      );

      if (partyMember) {
        const initialHp = partyMember.hp.current;
        partyMember.hp.current = Math.min(partyMember.hp.max, partyMember.hp.current + amount);
        console.log(`[StatsSystem] Curación aplicada a personaje ${partyMember.name}: ${initialHp} -> ${partyMember.hp.current}`);
      }
    } else if (event.type === 'GoldChanged') {
      const { characterName, amount, isAddition } = event.payload;

      // Encontrar personaje para modificar su oro
      const partyMember = context.party.find(
        (p) => p.name.toLowerCase() === characterName.toLowerCase()
      );

      if (partyMember) {
        // En D&D 5e el oro está en el inventario o en un campo libre. Si está en inventario:
        if (!partyMember.inventory) {
          partyMember.inventory = [];
        }
        let goldItem = partyMember.inventory.find((i: any) => i.id === 'oro' || i.name.toLowerCase() === 'oro');
        if (!goldItem) {
          goldItem = { id: 'oro', name: 'Oro', quantity: 0, description: 'Monedas de oro de la party.' };
          partyMember.inventory.push(goldItem);
        }
        
        if (isAddition) {
          goldItem.quantity += amount;
        } else {
          goldItem.quantity = Math.max(0, goldItem.quantity - amount);
        }
        console.log(`[StatsSystem] Oro de ${partyMember.name} cambiado: ${isAddition ? '+' : '-'}${amount}. Total: ${goldItem.quantity}`);
      }
    }
  }
}
