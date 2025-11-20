
'use server';

// gameCoordinator is lazy-loaded to improve initial page load time
// import { gameCoordinator } from "@/ai/flows/game-coordinator";
import { type GameState, type GameCoordinatorOutput } from "@/ai/flows/schemas";
import { lookupAdventureEntityInDb } from "./game-state-actions";
import { log } from "@/lib/logger";


/**
 * Main action handler that processes all player inputs.
 * It acts as a bridge between the UI and the central AI coordinator.
 */
export async function processPlayerAction(
  input: GameState
): Promise<GameCoordinatorOutput> {

  log.serverAction('Processing player action', {
    action: input.playerAction,
    inCombat: input.inCombat,
    turnIndex: input.turnIndex,
    locationId: input.locationId,
    isContinueTurn: input.playerAction?.toLowerCase().includes('continuar turno') ||
      input.playerAction?.toLowerCase().includes('pasar turno') ||
      input.playerAction?.toLowerCase().includes('siguiente turno'),
    partySize: input.party?.length,
    enemiesCount: input.enemies?.length,
  });

  try {
    // Lazy load gameCoordinator only when actually needed
    const { gameCoordinator } = await import("@/ai/flows/game-coordinator");
    const result = await gameCoordinator(input);

    const logSummary = {
      messages: result.messages?.length,
      diceRolls: result.diceRolls?.length,
      updatedParty: result.updatedParty?.length,
      inCombat: result.inCombat,
      nextLocationId: result.nextLocationId,
      turnIndex: result.turnIndex,
      hasMoreAITurns: result.hasMoreAITurns,
    };

    // Get combatant names for better debugging
    const currentCombatant = result.initiativeOrder?.[result.turnIndex || 0]?.characterName || 'Unknown';
    const previousCombatant = result.initiativeOrder?.[input.turnIndex || 0]?.characterName || 'Unknown';

    log.serverAction('Returning result to client', {
      summary: logSummary,
      messagesCount: result.messages?.length || 0,
      diceRollsCount: result.diceRolls?.length || 0,
      turnIndexChange: {
        from: input.turnIndex,
        to: result.turnIndex,
        previousCombatant,
        currentCombatant,
      },
      hasMoreAITurns: result.hasMoreAITurns,
      initiativeOrderLength: result.initiativeOrder?.length,
    });

    return {
      ...result,
      turnIndex: result.turnIndex, // Ensure turnIndex is explicitly returned
    };

  } catch (error: any) {
    log.error('Failed to process player action', {
      action: 'processPlayerAction',
      playerAction: input.playerAction,
    }, error);

    // Return a structured error that the client can display
    return {
      error: `La IA coordinadora ha fallado: ${error.message || 'Error desconocido'}`,
      debugLogs: [`CRITICAL ERROR in processPlayerAction: ${error.message}`]
    };
  }
}


/**
 * Server action to set the adventure data cache.
 * Used when loading adventures from JSON files.
 */
export async function setAdventureDataCache(adventureData: any): Promise<void> {
  const { setAdventureDataCache: setCache } = await import('./game-state-actions');
  await setCache(adventureData);
  log.serverAction('Adventure data cache updated', {
    locationsCount: adventureData?.locations?.length || 0,
    entitiesCount: adventureData?.entities?.length || 0,
  });
}

/**
 * Server action to look up an entity from the adventure data.
 * This is needed because the client-side components cannot run the tool directly.
 */
export async function lookupAdventureEntity(entityName: string): Promise<any | null> {
  return lookupAdventureEntityInDb(entityName);
}
