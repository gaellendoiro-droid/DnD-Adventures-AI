
'use server';

import { dungeonMasterOocParser } from "@/ai/flows/dungeon-master-ooc-parser";
import { generateCharacterAction } from "@/ai/flows/generate-character-action";
import { aiDungeonMasterParser } from "@/ai/flows/ai-dungeon-master-parser";
import { markdownToHtml } from "@/ai/flows/markdown-to-html";
import { Character, GameMessage } from "@/lib/types";
import { aiCombatManager } from "@/ai/flows/ai-combat-manager";

export async function handleOocMessage(playerQuery: string, gameState: string): Promise<string | null> {
  const oocResponse = await dungeonMasterOocParser({
    playerQuery,
    gameState: gameState,
  });
  return oocResponse.dmReply ? `(OOC) ${oocResponse.dmReply}` : null;
}

export async function generateNpcActions(
  party: Character[],
  dmNarration: string,
  playerAction: string
): Promise<{ newMessages: GameMessage[], characterActionsContent: string }> {
  const aiCharacters = party.filter(c => c.controlledBy === 'AI').map(c => ({id: c.id, name: c.name, class: c.class, race: c.race, personality: c.personality }));
  
  if (aiCharacters.length === 0) {
    return { newMessages: [], characterActionsContent: "" };
  }

  const characterActionsResponse = await generateCharacterAction({
    characters: aiCharacters,
    dmNarration: dmNarration,
    playerAction: playerAction,
  });

  let characterActionsContent = "";
  const newMessages: GameMessage[] = [];

  if (characterActionsResponse.actions && characterActionsResponse.actions.length > 0) {
    for (const action of characterActionsResponse.actions) {
      const character = party.find(c => c.id === action.characterId);
      if (character && action.action) {
        newMessages.push({
          id: Date.now().toString() + Math.random(),
          sender: 'Character',
          senderName: character.name,
          characterColor: character.color,
          content: action.action,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
        characterActionsContent += `${character.name}: ${action.action}\n`;
      }
    }
  }
  return { newMessages, characterActionsContent };
}

export async function runDungeonMasterTurn(
  playerAction: string,
  characterActions: string,
  gameState: string,
  locationDescription: string,
  playerCharacter: Character | null,
  inCombat: boolean,
  conversationHistory?: string,
) {

  const characterStatsString = playerCharacter ? JSON.stringify(playerCharacter, (key, value) => {
    // Exclude color and personality from the stringified JSON
    if (key === 'color' || key === 'personality') {
      return undefined;
    }
    return value;
  }) : '';

  const input = {
    playerAction: playerAction,
    characterActions: characterActions,
    gameState: gameState,
    locationDescription: locationDescription,
    characterStats: characterStatsString,
    conversationHistory: conversationHistory,
  };

  let dmResponse: any;

  if (inCombat) {
    dmResponse = await aiCombatManager(input);
  } else {
    dmResponse = await aiDungeonMasterParser(input);
  }

  let dmNarration: GameMessage | null = null;
  if (dmResponse.narration) {
    const { html } = await markdownToHtml({ markdown: dmResponse.narration });
    dmNarration = {
      id: Date.now().toString() + Math.random(),
      sender: "DM",
      content: html,
      originalContent: dmResponse.narration,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  }

  let parsedStats: Partial<Character> | null = null;
  if (dmResponse.updatedCharacterStats && typeof dmResponse.updatedCharacterStats === 'string') {
    try {
      parsedStats = JSON.parse(dmResponse.updatedCharacterStats);
    } catch(e) {
      console.error("Failed to parse updatedCharacterStats JSON from flow:", e);
      parsedStats = null; 
    }
  }

  return {
    dmNarration,
    nextLocationDescription: dmResponse.nextLocationDescription,
    updatedCharacterStats: parsedStats,
    initiativeRolls: dmResponse.initiativeRolls,
    diceRolls: dmResponse.diceRolls,
    startCombat: dmResponse.startCombat,
    endCombat: dmResponse.endCombat,
  };
}
