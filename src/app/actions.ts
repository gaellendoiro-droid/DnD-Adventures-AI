
'use server';

import { dungeonMasterOocParser } from "@/ai/flows/dungeon-master-ooc-parser";
import { generateCharacterAction } from "@/ai/flows/generate-character-action";
import { aiDungeonMasterParser } from "@/ai/flows/ai-dungeon-master-parser";
import { markdownToHtml } from "@/ai/flows/markdown-to-html";
import { Character, GameMessage } from "@/lib/types";
import { aiCombatManager } from "@/ai/flows/ai-combat-manager";

// Placeholder for a more sophisticated dice roller if needed
function rollDice(notation: string): number {
    const [numDice, numSides] = notation.split('d').map(Number);
    let total = 0;
    for (let i = 0; i < numDice; i++) {
        total += Math.floor(Math.random() * numSides) + 1;
    }
    return total;
}

/**
 * Handles out-of-character messages from the player.
 */
export async function handleOocMessage(playerQuery: string, gameState: string, conversationHistory: string): Promise<string | null> {
  const oocResponse = await dungeonMasterOocParser({
    playerQuery,
    gameState: gameState,
    conversationHistory: conversationHistory,
  });
  return oocResponse.dmReply ? `(OOC) ${oocResponse.dmReply}` : null;
}

/**
 * The main "Coordinator" logic. This function receives a player action and orchestrates the turn
 * by calling the appropriate AI experts (narrator, companion AI, enemy AI).
 */
export async function runTurn(
  playerAction: string,
  party: Character[],
  locationDescription: string,
  gameState: string,
  conversationHistory: string,
) {
  
  // 1. Get Companion Reactions (if any)
  const aiCharacters = party.filter(c => c.controlledBy === 'AI').map(c => ({id: c.id, name: c.name, class: c.class, race: c.race, personality: c.personality }));
  let companionMessages: GameMessage[] = [];
  let companionActionsContent = "";
  if (aiCharacters.length > 0) {
      const companionActionsResponse = await generateCharacterAction({
        characters: aiCharacters,
        context: `Player action: ${playerAction}`,
        inCombat: false,
      });

      if (companionActionsResponse.actions && companionActionsResponse.actions.length > 0) {
        for (const action of companionActionsResponse.actions) {
          const character = party.find(c => c.id === action.characterId);
          if (character && action.action) {
            companionMessages.push({
              id: Date.now().toString() + Math.random(),
              sender: 'Character',
              senderName: character.name,
              characterColor: character.color,
              content: action.action,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            });
            companionActionsContent += `${character.name}: ${action.action}\n`;
          }
        }
      }
  }
  
  // 2. Call the Narrative Expert to get the main story progression
  const playerCharacter = party.find(c => c.controlledBy === 'Player');
  const narrativeResponse = await aiDungeonMasterParser({
      playerAction,
      characterActions: companionActionsContent,
      locationDescription,
      gameState,
      characterStats: playerCharacter ? JSON.stringify(playerCharacter) : undefined,
      conversationHistory,
  });

  // 3. Process the narrative response
  let dmNarration: GameMessage | null = null;
  if (narrativeResponse.narration) {
      const { html } = await markdownToHtml({ markdown: narrativeResponse.narration });
      dmNarration = {
          id: Date.now().toString() + Math.random(),
          sender: "DM",
          content: html,
          originalContent: narrativeResponse.narration,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
  }

  // 4. Parse any character stat updates from the narrative turn
  let parsedStats: Partial<Character> | null = null;
  if (narrativeResponse.updatedCharacterStats && typeof narrativeResponse.updatedCharacterStats === 'string') {
      try {
          parsedStats = JSON.parse(narrativeResponse.updatedCharacterStats);
      } catch(e) {
          console.error("Failed to parse updatedCharacterStats JSON from flow:", e);
          parsedStats = null; 
      }
  }
  
  // 5. Return all results to the client to update the state
  return {
    companionMessages,
    dmNarration,
    startCombat: narrativeResponse.startCombat,
    combatStartNarration: narrativeResponse.combatStartNarration,
    nextLocationDescription: narrativeResponse.nextLocationDescription,
    updatedCharacterStats: parsedStats,
  };
}
