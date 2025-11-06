
'use server';

import type { Character } from "@/lib/types";
import { lookupAdventureEntityInDb } from "./game-state-actions";
import { gameCoordinator } from "@/ai/flows/game-coordinator";

/**
 * Main action handler that processes all player inputs.
 * It acts as a bridge between the UI and the central AI coordinator.
 */
export async function processPlayerAction(
  playerAction: string,
  party: Character[],
  locationId: string,
  inCombat: boolean,
  initiativeOrder: any[],
  enemies: any[],
  turnIndex: number,
  gameState: string,
  conversationHistory: string,
) {
  try {
    const result = await gameCoordinator({
      playerAction,
      party,
      locationId,
      inCombat,
      initiativeOrder,
      enemies,
      turnIndex,
      gameState,
      conversationHistory,
    });
    
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
