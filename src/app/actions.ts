
'use server';

import { gameCoordinator, type GameCoordinatorInput } from "@/ai/flows/game-coordinator";
import { lookupAdventureEntityInDb } from "./game-state-actions";

// In-memory store for debug logs for a "real-time" feel.
// In a real multi-user app, this would need a more robust solution (e.g., Redis, DB).
const turnLogs: { [turnId: string]: string[] } = {};

/**
 * Main action handler that processes all player inputs.
 * It acts as a bridge between the UI and the central AI coordinator.
 */
export async function processPlayerAction(
  input: GameCoordinatorInput & { turnId: string }
) {
  const { turnId } = input;
  turnLogs[turnId] = []; // Reset logs for the new turn

  const log = (message: string) => {
    if (!turnLogs[turnId]) {
      turnLogs[turnId] = [];
    }
    turnLogs[turnId].push(message);
  };
  
  // Pass the logger function to the coordinator
  const coordinatorInput = { ...input, log };

  try {
    const result = await gameCoordinator(coordinatorInput);
    // Final logs are still returned in the result for completeness
    result.debugLogs = turnLogs[turnId] || [];
    delete turnLogs[turnId]; // Clean up after the turn is complete
    return result;

  } catch (error: any) {
    console.error("[Action Error] Failed to process player action:", error);
    delete turnLogs[turnId]; // Clean up on error
    // Return a structured error that the client can display
    return {
      error: `La IA coordinadora ha fallado: ${error.message || 'Error desconocido'}`
    };
  }
}

/**
 * Server action to fetch the latest debug logs for a given turn ID.
 */
export async function getDebugLogs(turnId: string): Promise<string[]> {
    return turnLogs[turnId] || [];
}


/**
 * Server action to look up an entity from the adventure data.
 * This is needed because the client-side components cannot run the tool directly.
 */
export async function lookupAdventureEntity(entityName: string, gameState: string): Promise<any | null> {
    return lookupAdventureEntityInDb(entityName, gameState);
}
