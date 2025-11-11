
'use server';

import { gameCoordinator, type GameCoordinatorInput, type GameCoordinatorOutput } from "@/ai/flows/game-coordinator";
import { lookupAdventureEntityInDb } from "./game-state-actions";


/**
 * Main action handler that processes all player inputs.
 * It acts as a bridge between the UI and the central AI coordinator.
 */
export async function processPlayerAction(
  input: GameCoordinatorInput
): Promise<GameCoordinatorOutput> {
  
  try {
    const result = await gameCoordinator(input);

    const logSummary = {
        messages: result.messages?.length,
        diceRolls: result.diceRolls?.length,
        updatedParty: result.updatedParty?.length,
        inCombat: result.inCombat,
        nextLocationId: result.nextLocationId,
        turnIndex: result.turnIndex, // Added for logging
    }
    console.log(`[actions.ts] Returning result to client: ${JSON.stringify(logSummary)}`);

    return {
      ...result,
      turnIndex: result.turnIndex, // Ensure turnIndex is explicitly returned
    };

  } catch (error: any) {
    console.error("[Action Error] Failed to process player action:", error);
    // Return a structured error that the client can display
    return {
      error: `La IA coordinadora ha fallado: ${error.message || 'Error desconocido'}`,
      debugLogs: [`CRITICAL ERROR in processPlayerAction: ${error.message}`]
    };
  }
}


/**
 * Server action to look up an entity from the adventure data.
 * This is needed because the client-side components cannot run the tool directly.
 */
export async function lookupAdventureEntity(entityName: string): Promise<any | null> {
    return lookupAdventureEntityInDb(entityName);
}
