import { GameEvent } from '../events/event-schemas';

export interface SystemContext {
  worldState: any;
  party: any[];
  openDoors: Record<string, boolean>;
  currentLocationId: string;
  adventureData: any;
  explorationState?: any;
  diceRolls: any[]; // Tiradas de dados generadas durante el turno
  systemFeedback?: string; // Feedback directo para el DM
  enqueue: (event: Omit<GameEvent, 'id' | 'timestamp' | 'turnNumber'>) => void;
}

export interface GameSystem {
  name: string;
  /**
   * Procesa un evento individual.
   * Si el sistema necesita reaccionar, muta el contexto y/o encola nuevos eventos.
   */
  handle(event: GameEvent, context: SystemContext): Promise<void> | void;
}
