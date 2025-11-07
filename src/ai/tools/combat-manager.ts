/**
 * @fileOverview A Genkit tool that manages a full round or turn of combat.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { enemyTacticianTool } from './enemy-tactician';
import type { GameMessage, DiceRoll } from '@/lib/types';
import { companionExpertTool } from './companion-expert';
import { diceRollerTool } from './dice-roller';
import { CharacterSchema } from '@/lib/schemas';


export const CombatManagerInputSchema = z.object({
  playerAction: z.string().nullable(),
  party: z.array(CharacterSchema),
  enemies: z.array(z.any()),
  initiativeOrder: z.array(z.any()),
  currentTurnIndex: z.number(),
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


export const combatManagerTool = ai.defineTool(
    {
      name: 'combatManagerTool',
      description: 'Manages a sequence of turns in combat, starting from the current turn, until it is a human player\'s turn again or combat ends.',
      inputSchema: CombatManagerInputSchema,
      outputSchema: CombatManagerOutputSchema,
    },
    async (input) => {
        const { playerAction, party, enemies, initiativeOrder, currentTurnIndex, locationDescription, conversationHistory } = input;
        
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
            
            const response = await companionExpertTool({
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
                
                const enemyResponse = await enemyTacticianTool({
                    activeCombatant: enemy.name,
                    party: party,
                    enemies: enemies.map(e => ({ name: e.name, hp: 'Unknown' })), // Placeholder HP
                    locationDescription: locationDescription || '',
                    conversationHistory,
                });
    
                debugLogs.push(`EnemyTactician action for ${enemy.name}: ${enemyResponse.narration}`);
                addMessage({ sender: 'DM', content: enemyResponse.narration });
                
                if (enemyResponse.diceRolls) {
                    debugLogs.push(`CombatManager: Enemy action requires ${enemyResponse.diceRolls.length} dice roll(s). Calling diceRollerTool...`);
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
);
