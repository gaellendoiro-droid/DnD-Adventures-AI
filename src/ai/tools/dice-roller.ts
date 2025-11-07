/**
 * @fileOverview A Genkit tool for rolling dice.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { DiceRoll } from '@/lib/types';

// Input schema for a single dice roll request
const DiceRollRequestSchema = z.object({
  roller: z.string().describe("The name of the character or monster rolling the dice."),
  rollNotation: z.string().describe("The dice notation (e.g., '1d20+5', '2d6', '1d4-1')."),
  description: z.string().describe("A brief description of the roll's purpose (e.g., 'Attack Roll', 'Damage Roll')."),
});

// Output schema for a completed dice roll
const DiceRollResultSchema = z.object({
  id: z.string(),
  roller: z.string(),
  rollNotation: z.string(),
  individualRolls: z.array(z.number()),
  modifier: z.number(),
  totalResult: z.number(),
  outcome: z.enum(['crit', 'success', 'fail', 'pifia', 'neutral', 'initiative']),
  timestamp: z.date(),
  description: z.string().optional(),
});

export const diceRollerTool = ai.defineTool(
  {
    name: 'diceRollerTool',
    description: 'Rolls dice based on standard D&D notation (e.g., "1d20", "2d6+3") and returns the result.',
    inputSchema: DiceRollRequestSchema,
    outputSchema: z.any(), // Using any because DiceRoll type is complex for zod
  },
  async (request): Promise<Omit<DiceRoll, 'id'|'timestamp'>> => {
    const { rollNotation, roller, description } = request;
    const regex = /(\d+)d(\d+)([+-]\d+)?/;
    const match = rollNotation.match(regex);

    if (!match) {
      throw new Error(`Invalid dice notation: ${rollNotation}`);
    }

    const numDice = parseInt(match[1], 10);
    const numSides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    const individualRolls: number[] = [];
    let sum = 0;
    for (let i = 0; i < numDice; i++) {
      const roll = Math.floor(Math.random() * numSides) + 1;
      individualRolls.push(roll);
      sum += roll;
    }

    const totalResult = sum + modifier;

    let outcome: DiceRoll['outcome'] = 'neutral';
    if (numDice === 1 && numSides === 20) {
        if (individualRolls[0] === 20) outcome = 'crit';
        else if (individualRolls[0] === 1) outcome = 'pifia';
    }

    return {
      roller,
      rollNotation,
      individualRolls,
      modifier,
      totalResult,
      outcome,
      description,
    };
  }
);
