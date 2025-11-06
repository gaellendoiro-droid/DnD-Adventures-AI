
'use server';
/**
 * @fileOverview A Genkit flow that acts as the "enemy brain" in combat.
 */

import { ai } from '@/ai/genkit';
import { dndApiLookupTool } from './dnd-api-lookup';
import { adventureLookupTool } from './adventure-lookup';
import { EnemyTacticianInputSchema, EnemyTacticianOutputSchema, enemyTacticianPrompt, type EnemyTacticianInput, type EnemyTacticianOutput } from '../flows/enemy-tactician';


const enemyTacticianFlow = ai.defineFlow(
  {
    name: 'enemyTacticianFlow',
    inputSchema: EnemyTacticianInputSchema,
    outputSchema: EnemyTacticianOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await enemyTacticianPrompt(input, {tools: [adventureLookupTool, dndApiLookupTool]});

      if (!output) {
        throw new Error("The AI failed to return an action for the combatant.");
      }
      return output;

    } catch (e: any) {
      console.error("Critical error in enemyTacticianFlow.", e);
      return {
        action: "Do nothing.",
        narration: `El combatiente ${input.activeCombatant} parece confundido y no hace nada en su turno.`,
        diceRolls: [],
      };
    }
  }
);

export async function enemyTactician(input: EnemyTacticianInput): Promise<EnemyTacticianOutput> {
    return enemyTacticianFlow(input);
}
