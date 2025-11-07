
'use server';
/**
 * @fileOverview A Genkit tool that manages a full round or turn of combat.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { enemyTactician } from './enemy-tactician';
import type { GameMessage, DiceRoll } from '@/lib/types';
import { companionExpert } from './companion-expert';
import { diceRollerTool } from './dice-roller';

export const CombatManagerInputSchema = z.object({
  playerAction: z.string().nullable(),
  party: z.array(z.any()),
  enemies: z.array(z.any()),
  initiativeOrder: z.array(z.any()),
  currentTurnIndex: z.number(),
  gameState: z.string(),
  locationDescription: z.string().optional(),
  conversationHistory: z.string(),
});

export const CombatManagerOutputSchema = z.object({
  messages: z.array(z.any()),
  diceRolls: z.array(z.any()),
  updatedParty: z.array(z.any()),
  updatedEnemies: z.array(z.any()),
  nextTurnIndex: z.number(),
  endCombat: z.boolean(),
  debugLogs: z.array(z.string()).optional(),
});


export async function combatManager(input: z.infer<typeof CombatManagerInputSchema>): Promise<z.infer<typeof CombatManagerOutputSchema>> {
    const { playerAction, party, enemies, initiativeOrder, currentTurnIndex, gameState, locationDescription, conversationHistory } = input;
    
    const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
    const diceRolls: Omit<DiceRoll, 'id' | 'timestamp'>[] = [];
    let updatedParty = [...party];
    let updatedEnemies = [...enemies];
    const debugLogs: string[] = [];
    
    let turnIndex = currentTurnIndex;

    debugLogs.push("CombatManager: Starting combat round management.");

    const addMessage = (message: Omit<GameMessage, 'id' | 'timestamp'>) => {
        messages.push({
            ...message,
        });
    }

    // 1. Process player's action if it's their turn
    const playerCombatant = initiativeOrder[turnIndex];
    if (playerCombatant.type === 'player' && playerAction) {
      const playerCharacter = party.find(c => c.id === playerCombatant.id);
      if (playerCharacter?.controlledBy === 'Player') {
        debugLogs.push(`CombatManager: Processing player action for ${playerCharacter.name}.`);
        addMessage({ sender: 'System', content: `Turno de ${playerCharacter.name}.` });
        addMessage({ sender: 'DM', content: `Tú (${playerCharacter.name}) declaras: ${playerAction}` });
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
        debugLogs.push(`CombatManager: Companion turn: ${companion.name}. Calling CompanionExpert...`);
        addMessage({ sender: 'System', content: `Turno de ${companion.name}.` });
        
        const response = await companionExpert({
          character: companion,
          context: "Es el turno de este personaje en combate. Decide su acción.",
          inCombat: true,
          enemies: enemies.map(e => e.name),
          party: party,
        });
        debugLogs.push(`CompanionExpert action for ${companion.name}: ${response.action}`);
        if (response.action) {
          addMessage({ sender: 'Character', senderName: companion.name, characterColor: companion.color, content: `${response.action}` });
        }

      } else { // It's an enemy
        const enemy = enemies.find(e => e.id === currentCombatant.id);
        if (enemy) {
            debugLogs.push(`CombatManager: Enemy turn: ${enemy.name}. Calling EnemyTactician...`);
            addMessage({ sender: 'System', content: `Turno de ${enemy.name}.` });
            
            const enemyResponse = await enemyTactician({
                activeCombatant: enemy.name,
                party: party,
                enemies: enemies.map(e => ({ name: e.name, hp: 'Unknown' })), // Placeholder HP
                locationDescription: locationDescription || '',
                conversationHistory,
                gameState,
            });

            debugLogs.push(`EnemyTactician action for ${enemy.name}: ${enemyResponse.narration}`);
            addMessage({ sender: 'DM', content: enemyResponse.narration });
            
            if (enemyResponse.diceRolls) {
                for (const rollRequest of enemyResponse.diceRolls) {
                    const rollResult = await diceRollerTool(rollRequest);
                    diceRolls.push(rollResult);
                }
            }
        }
      }

      turnIndex = (turnIndex + 1) % initiativeOrder.length;
      combatLoop++;
    }

    const endCombat = updatedEnemies.every(e => e.hp?.current <= 0);
    if (endCombat) {
      debugLogs.push("CombatManager: All enemies defeated. Ending combat.");
      addMessage({ sender: 'System', content: '¡Combate Finalizado!' });
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
