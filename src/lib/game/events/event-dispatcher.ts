import { v4 as uuidv4 } from 'uuid';
import { GameEvent } from './event-schemas';
import { GameSystem, SystemContext } from '../systems/system-types';

export class EventDispatcher {
  private eventQueue: GameEvent[] = [];
  private processedEvents: GameEvent[] = [];
  private systems: GameSystem[] = [];
  private currentTurnNumber = 0;
  private eventCounter = 0;

  constructor(turnNumber: number, systems: GameSystem[] = []) {
    this.currentTurnNumber = turnNumber;
    this.systems = systems;
  }

  /**
   * Registra un sistema en el despachador.
   */
  registerSystem(system: GameSystem): void {
    this.systems.push(system);
  }

  /**
   * Encola un nuevo evento. Genera el ID y el timestamp automáticamente.
   */
  enqueue(eventInput: Omit<GameEvent, 'id' | 'timestamp' | 'turnNumber'>): void {
    const fullEvent = {
      ...eventInput,
      id: uuidv4(),
      timestamp: Date.now() + (this.eventCounter++), // incremental para garantizar el orden estable
      turnNumber: this.currentTurnNumber,
    } as GameEvent;
    this.eventQueue.push(fullEvent);
  }

  /**
   * Procesa la cola de eventos en bucle FIFO (First In, First Out)
   * hasta vaciarla o alcanzar un límite de seguridad.
   */
  async dispatch(
    context: Omit<SystemContext, 'enqueue'>,
    onStep?: (step: { type: 'logic_update'; data: any }) => void | Promise<void>
  ): Promise<{
    processedEvents: GameEvent[];
    systemFeedback?: string;
  }> {
    const fullContext = context as unknown as SystemContext;
    fullContext.enqueue = (eventInput) => this.enqueue(eventInput);

    let iterations = 0;
    const MAX_ITERATIONS = 100;

    while (this.eventQueue.length > 0) {
      iterations++;
      if (iterations > MAX_ITERATIONS) {
        console.error('ALERTA: Bucle de eventos infinito detectado. Deteniendo despacho.');
        break;
      }

      // Obtener el primer evento de la cola
      const currentEvent = this.eventQueue.shift()!;
      this.processedEvents.push(currentEvent);

      let contextMutated = false;

      // Pasar el evento a cada sistema registrado secuencialmente
      for (const system of this.systems) {
        try {
          const initialPartyStr = JSON.stringify(fullContext.party);
          const initialWorldStateStr = JSON.stringify(fullContext.worldState);
          const initialOpenDoorsStr = JSON.stringify(fullContext.openDoors);
          const initialLocId = fullContext.currentLocationId;
          const initialDiceRollsLen = fullContext.diceRolls.length;

          await system.handle(currentEvent, fullContext);

          // Detectar si el sistema mutó algo del estado del juego
          if (
            JSON.stringify(fullContext.party) !== initialPartyStr ||
            JSON.stringify(fullContext.worldState) !== initialWorldStateStr ||
            JSON.stringify(fullContext.openDoors) !== initialOpenDoorsStr ||
            fullContext.currentLocationId !== initialLocId ||
            fullContext.diceRolls.length !== initialDiceRollsLen
          ) {
            contextMutated = true;
          }
        } catch (error) {
          console.error(`Error en el sistema '${system.name}' procesando evento '${currentEvent.type}':`, error);
        }
      }

      // Si el estado cambió o se generaron tiradas, emitir una actualización de lógica al frontend
      if (contextMutated && onStep) {
        await onStep({
          type: 'logic_update',
          data: {
            worldState: fullContext.worldState,
            updatedParty: fullContext.party,
            updatedOpenDoors: fullContext.openDoors,
            locationId: fullContext.currentLocationId,
            diceRolls: [...fullContext.diceRolls],
          },
        });
      }
    }

    delete (context as any).enqueue;
    return {
      processedEvents: this.processedEvents,
      systemFeedback: fullContext.systemFeedback,
    };
  }
}

