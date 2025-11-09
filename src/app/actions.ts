
'use server';

import { gameCoordinator, type GameCoordinatorInput, type GameCoordinatorOutput } from "@/ai/flows/game-coordinator";
import { lookupAdventureEntityInDb } from "./game-state-actions";
import { updatePartyDataForTools } from "@/ai/tools/character-lookup";


/**
 * Main action handler that processes all player inputs.
 * It acts as a bridge between the UI and the central AI coordinator.
 */
export async function processPlayerAction(
  input: GameCoordinatorInput
): Promise<GameCoordinatorOutput> {
  const { party } = input;

  // HACK: Update the in-memory data for the character lookup tool.
  // In a real app, this would be a database or a proper state management system.
  updatePartyDataForTools(party);
  
  try {
    const result = await gameCoordinator(input);
    console.log(`[actions.ts] Returning result to client: ${JSON.stringify(result, null, 2)}`);
    return result;

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
