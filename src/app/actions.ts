
'use server';

import { oocAssistant } from "@/ai/flows/ooc-assistant";
import { companionExpert } from "@/ai/flows/companion-expert";
import { narrativeExpert } from "@/ai/flows/narrative-expert";
import { markdownToHtml } from "@/ai/flows/markdown-to-html";
import type { Character, GameMessage, Combatant, DiceRoll } from "@/lib/types";
import { enemyTactician } from "@/ai/flows/enemy-tactician";

/**
 * Handles out-of-character messages from the player.
 */
export async function handleOocMessage(playerQuery: string, gameState: string, conversationHistory: string): Promise<string | null> {
  const oocResponse = await oocAssistant({
    playerQuery,
    gameState: gameState,
    conversationHistory: conversationHistory,
  });
  return oocResponse.dmReply ? `(OOC) ${oocResponse.dmReply}` : null;
}

/**
 * The main "Narrative" logic. This function receives a player action outside of combat
 * and orchestrates the turn by calling the narrative and companion experts.
 */
export async function runTurn(
  playerAction: string,
  party: Character[],
  locationId: string,
  gameState: string,
  conversationHistory: string,
) {
  
  // 1. Get Companion Reactions (if any)
  const aiCharacters = party.filter(c => c.controlledBy === 'AI').map(c => ({id: c.id, name: c.name, class: c.class, race: c.race, personality: c.personality }));
  let companionMessages: GameMessage[] = [];
  let companionActionsContent = "";
  if (aiCharacters.length > 0) {
      const companionActionsResponse = await companionExpert({
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
  const narrativeResponse = await narrativeExpert({
      playerAction,
      characterActions: companionActionsContent,
      locationId,
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
    nextLocationId: narrativeResponse.nextLocationId,
    updatedCharacterStats: parsedStats,
  };
}


/**
 * The Combat Coordinator. This function processes a single player action and then
 * runs the turns for all subsequent NPCs (allies and enemies) until it is the
 * player's turn again or combat ends.
 */
export async function runCombatTurn(
    playerAction: string,
    party: Character[],
    enemiesInCombat: any[], // Simplified for this example
    initiativeOrder: Combatant[],
    currentTurnIndex: number,
    gameState: string,
    locationDescription: string,
    conversationHistory: string,
) {
    const turnResults: { messages: GameMessage[], diceRolls: DiceRoll[], updatedParty: Character[], updatedEnemies: any[] } = {
        messages: [],
        diceRolls: [],
        updatedParty: [...party],
        updatedEnemies: [...enemiesInCombat],
    };

    const addMessage = (msg: Omit<GameMessage, 'id' | 'timestamp'>) => {
        turnResults.messages.push({ ...msg, id: Date.now().toString() + Math.random(), timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
    };

    const addDiceRolls = (rolls: any[]) => {
        const newRolls = rolls.map(r => ({ ...r, id: Date.now().toString() + Math.random(), timestamp: new Date() }));
        turnResults.diceRolls.push(...newRolls);
    }
    
    // =================================================================
    // 1. Process Player's Turn
    // =================================================================
    const playerCombatant = initiativeOrder[currentTurnIndex];
    if (playerCombatant.type === 'player') {
        const playerCharacter = party.find(c => c.id === playerCombatant.id);
        if (playerCharacter?.controlledBy === 'Player') {
          addMessage({
              sender: 'System',
              content: `Turno de ${playerCharacter?.name}.`,
          });

          // For now, we'll just narrate the player's action. A real implementation
          // would involve calling the narrativeExpert to interpret the action and
          // determine outcomes and dice rolls.
          const { html } = await markdownToHtml({ markdown: `Tú (${playerCharacter?.name}) atacas: ${playerAction}` });
          addMessage({ sender: 'DM', content: html, originalContent: `Tú (${playerCharacter?.name}) atacas: ${playerAction}` });
        }
    }


    // =================================================================
    // 2. Loop through subsequent NPC turns
    // =================================================================
    let turnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
    let combatLoop = 0; // Safety break

    while(initiativeOrder[turnIndex].type !== 'player' && combatLoop < initiativeOrder.length) {
        const currentCombatant = initiativeOrder[turnIndex];
        const isCompanion = party.some(p => p.id === currentCombatant.id);

        if(isCompanion) {
            const companion = party.find(p => p.id === currentCombatant.id)!;
             addMessage({
                sender: 'System',
                content: `Turno de ${companion.name}.`,
            });
            const response = await companionExpert({
                characters: [{id: companion.id, name: companion.name, class: companion.class, race: companion.race, personality: companion.personality}],
                context: "Es el turno de este personaje en combate. Decide su acción.",
                inCombat: true,
                enemies: enemiesInCombat.map(e => e.name),
            });
            if(response.actions.length > 0) {
                 const { html } = await markdownToHtml({ markdown: `${companion.name} ${response.actions[0].action}` });
                 addMessage({ sender: 'Character', senderName: companion.name, characterColor: companion.color, content: html, originalContent: `${companion.name} ${response.actions[0].action}`});
            }

        } else { // It's an enemy
            const enemy = enemiesInCombat.find(e => e.id === currentCombatant.id)!;
            addMessage({
                sender: 'System',
                content: `Turno de ${enemy.name}.`,
            });

            const enemyResponse = await enemyTactician({
                activeCombatant: enemy.name,
                party: party,
                enemies: enemiesInCombat.map(e => ({ name: e.name, hp: 'Unknown' })), // HP status can be improved later
                locationDescription,
                conversationHistory,
                gameState,
            });

            const { html } = await markdownToHtml({ markdown: enemyResponse.narration });
            addMessage({ sender: 'DM', content: html, originalContent: enemyResponse.narration });
            if(enemyResponse.diceRolls) addDiceRolls(enemyResponse.diceRolls);
        }

        turnIndex = (turnIndex + 1) % initiativeOrder.length;
        combatLoop++;
    }


    // =================================================================
    // 3. Return all collected results
    // =================================================================
    const endCombat = turnResults.updatedEnemies.every(e => e.hp.current <= 0);
    if(endCombat) {
        addMessage({ sender: 'System', content: '¡Combate Finalizado!' });
    }


    return {
        turnResults,
        nextTurnIndex: turnIndex,
        endCombat,
    };
}
