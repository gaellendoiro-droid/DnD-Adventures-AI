
'use server';
/**
 * @fileOverview A Genkit tool that manages a full round or turn of combat.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { enemyTactician } from './enemy-tactician';
import type { GameMessage, DiceRoll } from '@/lib/types';
import { markdownToHtml } from '../flows/markdown-to-html';
import { companionExpert } from './companion-expert';

const CombatManagerInputSchema = z.object({
  playerAction: z.string().nullable(),
  party: z.array(z.any()),
  enemies: z.array(z.any()),
  initiativeOrder: z.array(z.any()),
  currentTurnIndex: z.number(),
  gameState: z.string(),
  locationDescription: z.string().optional(),
  conversationHistory: z.string(),
});

const CombatManagerOutputSchema = z.object({
  messages: z.array(z.any()),
  diceRolls: z.array(z.any()),
  updatedParty: z.array(z.any()),
  updatedEnemies: z.array(z.any()),
  nextTurnIndex: z.number(),
  endCombat: z.boolean(),
  debugLogs: z.array(z.string()).optional(),
});

async function createMessage(msg: Omit<GameMessage, 'id' | 'timestamp' | 'content'> & { content: string }) {
    const { html, originalContent } = (msg.sender === 'DM')
        ? { html: (await markdownToHtml({ markdown: msg.content })).html, originalContent: msg.content }
        : { html: msg.content, originalContent: msg.content };

    return {
        ...msg,
        content: html,
        originalContent: originalContent,
        id: Date.now().toString() + Math.random(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
}

export const combatManagerTool = ai.defineTool(
  {
    name: 'combatManagerTool',
    description: 'Manages a sequence of turns in combat, starting from the current turn, until it is a human player\'s turn again or combat ends.',
    inputSchema: CombatManagerInputSchema,
    outputSchema: CombatManagerOutputSchema,
  },
  async (input) => {
    const { playerAction, party, enemies, initiativeOrder, currentTurnIndex, gameState, locationDescription, conversationHistory } = input;
    
    const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
    const diceRolls: Omit<DiceRoll, 'id' | 'timestamp'>[] = [];
    let updatedParty = [...party];
    let updatedEnemies = [...enemies];
    const debugLogs: string[] = [];
    
    let turnIndex = currentTurnIndex;

    debugLogs.push("CombatManager: Starting combat round management.");

    // 1. Process player's action if it's their turn
    const playerCombatant = initiativeOrder[turnIndex];
    if (playerCombatant.type === 'player' && playerAction) {
      const playerCharacter = party.find(c => c.id === playerCombatant.id);
      if (playerCharacter?.controlledBy === 'Player') {
        debugLogs.push(`Processing player action for ${playerCharacter.name}.`);
        messages.push({ sender: 'System', content: `Turno de ${playerCharacter.name}.` });
        messages.push({ sender: 'DM', content: `Tú (${playerCharacter.name}) declaras: ${playerAction}` });
      }
      turnIndex = (turnIndex + 1) % initiativeOrder.length;
    }
    
    // 2. Loop through subsequent NPC turns
    let combatLoop = 0; // Safety break
    while (initiativeOrder.length > 0 && initiativeOrder[turnIndex]?.type !== 'player' && combatLoop < initiativeOrder.length) {
      const currentCombatant = initiativeOrder[turnIndex];
      const isCompanion = party.some(p => p.id === currentCombatant.id);

      if (isCompanion) {
        const companion = party.find(p => p.id === currentCombatant.id)!;
        debugLogs.push(`Companion turn: ${companion.name}. Calling CompanionExpert...`);
        messages.push({ sender: 'System', content: `Turno de ${companion.name}.` });
        
        const response = await companionExpert({
          character: companion,
          context: "Es el turno de este personaje en combate. Decide su acción.",
          inCombat: true,
          enemies: enemies.map(e => e.name),
          party: party,
        });
        debugLogs.push(`CompanionExpert action for ${companion.name}: ${response.action}`);
        if (response.action) {
          messages.push({ sender: 'Character', senderName: companion.name, characterColor: companion.color, content: `${response.action}` });
        }

      } else { // It's an enemy
        const enemy = enemies.find(e => e.id === currentCombatant.id);
        if (enemy) {
            debugLogs.push(`Enemy turn: ${enemy.name}. Calling EnemyTactician...`);
            messages.push({ sender: 'System', content: `Turno de ${enemy.name}.` });
            
            const enemyResponse = await enemyTactician({
                activeCombatant: enemy.name,
                party: party,
                enemies: enemies.map(e => ({ name: e.name, hp: 'Unknown' })), // Placeholder HP
                locationDescription: locationDescription || '',
                conversationHistory,
                gameState,
            });

            debugLogs.push(`EnemyTactician action for ${enemy.name}: ${enemyResponse.action}`);
            messages.push({ sender: 'DM', content: enemyResponse.narration });
            if (enemyResponse.diceRolls) diceRolls.push(...enemyResponse.diceRolls as Omit<DiceRoll, 'id' | 'timestamp'>[]);
        }
      }

      turnIndex = (turnIndex + 1) % initiativeOrder.length;
      combatLoop++;
    }

    const endCombat = updatedEnemies.every(e => e.hp?.current <= 0);
    if (endCombat) {
      debugLogs.push("All enemies defeated. Ending combat.");
      messages.push({ sender: 'System', content: '¡Combate Finalizado!' });
    }

    return {
      messages,
      diceRolls,
      updatedParty,
      updatedEnemies,
      nextTurnIndex: turnIndex,
      endCombat,
      debugLogs,
    };
  }
);
