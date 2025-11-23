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
  attributeUsed: z.enum(['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR']).optional().describe("The attribute used for the roll."),
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
  attributeUsed: z.enum(['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR']).optional(),
});

export const diceRollerTool = ai.defineTool(
  {
    name: 'diceRollerTool',
    description: 'Rolls dice based on standard D&D notation (e.g., "1d20", "2d6+3") and returns the result.',
    inputSchema: DiceRollRequestSchema,
    outputSchema: z.any(), // Using any because DiceRoll type is complex for zod
  },
  async (request): Promise<Omit<DiceRoll, 'id' | 'timestamp'>> => {
    const { rollNotation, roller, description, attributeUsed } = request;

    // Validation: Check for empty or invalid notation
    if (!rollNotation || typeof rollNotation !== 'string' || rollNotation.trim() === '') {
      throw new Error(`Invalid dice notation: notation is empty or invalid`);
    }

    // Validation: Parse dice notation
    // Improved regex to handle optional spaces and potential double signs (e.g. +-1)
    // Captures: 1=numDice, 2=numSides, 3=modifier (optional)
    const regex = /(\d+)d(\d+)\s*([+-]?\s*-?\d+)?/;
    const match = rollNotation.trim().match(regex);

    if (!match) {
      throw new Error(`Invalid dice notation: "${rollNotation}". Expected format: "XdY" or "XdY+Z" or "XdY-Z" (e.g., "1d20", "2d6+3", "1d4-1")`);
    }

    const numDice = parseInt(match[1], 10);
    const numSides = parseInt(match[2], 10);

    // Parse modifier: remove spaces and handle signs
    let modifier = 0;
    if (match[3]) {
      // Clean up the modifier string (remove spaces)
      const modStr = match[3].replace(/\s/g, '');
      // If it's something like "+-1", parseInt might handle it or we might need to be careful.
      // JS parseInt("+-1") is NaN. parseInt("-1") is -1. parseInt("+1") is 1.
      // We need to handle the double sign case if it exists.
      if (modStr.includes('+-') || modStr.includes('-+')) {
        modifier = parseInt(modStr.replace('+', ''), 10); // Treat "+-1" as "-1"
      } else if (modStr.startsWith('+')) {
        modifier = parseInt(modStr.substring(1), 10);
      } else {
        modifier = parseInt(modStr, 10);
      }

      if (isNaN(modifier)) {
        // Fallback for weird cases, though regex should restrict it mostly
        modifier = 0;
      }
    }

    // Validation: Reasonable limits for dice count and sides
    const MAX_DICE = 20;
    const MAX_SIDES = 100;
    const MIN_DICE = 1;
    const MIN_SIDES = 2;

    if (numDice < MIN_DICE || numDice > MAX_DICE) {
      throw new Error(`Invalid dice count: ${numDice}. Must be between ${MIN_DICE} and ${MAX_DICE}`);
    }

    if (numSides < MIN_SIDES || numSides > MAX_SIDES) {
      throw new Error(`Invalid dice sides: ${numSides}. Must be between ${MIN_SIDES} and ${MAX_SIDES}`);
    }

    // Validation: Check for negative numbers in notation (should be handled by modifier)
    if (numDice < 0 || numSides < 0) {
      throw new Error(`Invalid dice notation: negative numbers not allowed in dice count or sides`);
    }

    // Roll the dice
    const individualRolls: number[] = [];
    let sum = 0;
    for (let i = 0; i < numDice; i++) {
      const roll = Math.floor(Math.random() * numSides) + 1;
      // Validation: Ensure roll is in valid range
      if (roll < 1 || roll > numSides) {
        throw new Error(`Invalid roll result: ${roll}. Expected range: 1-${numSides}`);
      }
      individualRolls.push(roll);
      sum += roll;
    }

    // Calculate total result
    const totalResult = sum + modifier;

    // Validation: Verify totalResult calculation
    const expectedTotal = sum + modifier;
    if (totalResult !== expectedTotal) {
      throw new Error(`Calculation error: totalResult (${totalResult}) does not match expected (${expectedTotal})`);
    }

    // Determine outcome: Only for d20 rolls
    let outcome: DiceRoll['outcome'] = 'neutral';
    if (numDice === 1 && numSides === 20) {
      if (individualRolls[0] === 20) {
        outcome = 'crit';
      } else if (individualRolls[0] === 1) {
        outcome = 'pifia';
      }
    }

    return {
      roller,
      rollNotation,
      individualRolls,
      modifier,
      totalResult,
      outcome,
      description,
      attributeUsed,
    };
  }
);
