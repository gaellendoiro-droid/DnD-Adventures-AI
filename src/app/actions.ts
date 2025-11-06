
'use server';

import { gameCoordinator, type GameCoordinatorInput } from "@/ai/flows/game-coordinator";
import { lookupAdventureEntityInDb } from "./game-state-actions";

/**
 * Main action handler that processes all player inputs.
 * It acts as a bridge between the UI and the central AI coordinator.
 */
export async function processPlayerAction(
  input: GameCoordinatorInput
) {
  try {
    const result = await gameCoordinator(input);
    return result;

  } catch (error: any) {
    console.error("[Action Error] Failed to process player action:", error);
    // Return a structured error that the client can display
    return {
      error: `La IA coordinadora ha fallado: ${error.message || 'Error desconocido'}`
    };
  }
}


/**
 * Server action to look up an entity from the adventure data.
 * This is needed because the client-side components cannot run the tool directly.
 */
export async function lookupAdventureEntity(entityName: string, gameState: string): Promise<any | null> {
    return lookupAdventureEntityInDb(entityName, gameState);
}
