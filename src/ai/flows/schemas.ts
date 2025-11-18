/**
 * @fileOverview This file contains shared Zod schemas used across different AI flows
 * to avoid circular dependencies.
 */

import { z } from 'zod';
import { CharacterSchema, CharacterSummarySchema } from '@/lib/schemas';
import type { GameMessage, Combatant } from '@/lib/types';

// Schema for the action interpreter
export const ActionInterpreterInputSchema = z.object({
  playerAction: z.string().describe('The action taken by the player.'),
  locationContext: z.string().describe('A JSON string with the full data of the current location, including its exits, interactable objects and entities present.'),
  party: z.array(z.any()).describe("The array of party member objects. Used to identify companions."),
  updatedEnemies: z.array(z.any()).optional().describe("Array of enemies with current HP status to filter out dead entities."),
});
export type ActionInterpreterInput = z.infer<typeof ActionInterpreterInputSchema>;

export const ActionInterpreterOutputSchema = z.object({
  actionType: z.enum(['move', 'interact', 'attack', 'narrate', 'ooc', 'continue_turn']).describe("The interpreted type of the player's action. 'continue_turn' is used for step-by-step combat to advance to the next AI turn."),
  targetId: z.string().optional().nullable().describe("The ID of the target for the action. For 'move', it's the destination ID. For 'attack', the entity ID. For 'interact', it's the specific interaction action name (e.g., 'Leer Misión de la Colina del Resentimiento') or the character name (e.g., 'Elara')."),
});
export type ActionInterpreterOutput = z.infer<typeof ActionInterpreterOutputSchema>;


// Schema for the narrative expert
export const NarrativeExpertInputSchema = z.object({
  playerAction: z.string().describe('The action taken by the player.'),
  locationId: z.string().describe('The ID of the current location (e.g., "phandalin-plaza-del-pueblo").'),
  locationContext: z.string().describe('A JSON string with the full data of the current location, including its description, exits, and interactable objects.'),
  conversationHistory: z.string().optional().describe("A transcript of the last few turns of conversation to provide immediate context."),
  interpretedAction: z.string().describe("A JSON string of the structured interpretation of the player's action, provided by the actionInterpreter."),
  phase: z.enum(['normal', 'combat_initiation']).optional().describe("The narrative phase. Use 'combat_initiation' for the initial combat narration before any turns are processed."),
  combatContext: z.string().optional().describe("A JSON string with combat-specific information (initiative order, combatants list) for combat_initiation phase."),
});
export type NarrativeExpertInput = z.infer<typeof NarrativeExpertInputSchema>;

export const NarrativeExpertOutputSchema = z.object({
  dmNarration: z.string().describe("The AI Dungeon Master's primary narration in response to the player's action, formatted in Markdown. This should describe the companion dialogue here."),
  updatedCharacterStats: z.string().optional().nullable().describe("A valid JSON string representing partial updates for any character involved. For example, if a character takes damage, this would be '[{\"id\":\"char-1\", \"hp\": {\"current\": 5}}]'. It should be an array of partial character objects."),
  debugLogs: z.array(z.string()).optional(),
});
export type NarrativeExpertOutput = z.infer<typeof NarrativeExpertOutputSchema>;


// Schema for the game coordinator
export const GameCoordinatorInputSchema = z.object({
  playerAction: z.string(),
  party: z.array(CharacterSchema),
  locationId: z.string(),
  inCombat: z.boolean(),
  conversationHistory: z.string(),
  turnIndex: z.number().optional().describe('The index of the current combatant in the initiative order.'),
});
export type GameCoordinatorInput = z.infer<typeof GameCoordinatorInputSchema>;

export const GameCoordinatorOutputSchema = z.object({
  messages: z.array(z.any()).optional(), // Omit<GameMessage, 'id' | 'timestamp'>[] - Zod can't handle this
  diceRolls: z.array(z.any()).optional(),
  debugLogs: z.array(z.string()).optional(),
  updatedParty: z.array(z.any()).optional(),
  updatedEnemies: z.array(z.any()).optional(), // Added: Updated enemies with HP changes
  nextLocationId: z.string().optional().nullable(),
  inCombat: z.boolean().optional(),
  initiativeOrder: z.array(z.any()).optional(), // Combatant[]
  enemies: z.array(z.any()).optional(),
  error: z.string().optional(),
  turnIndex: z.number().optional(), // Added turnIndex to the output
  hasMoreAITurns: z.boolean().optional(), // Step-by-step combat: indicates if more AI turns are pending
});
export type GameCoordinatorOutput = z.infer<typeof GameCoordinatorOutputSchema>;

// To-Do: This will replace GameCoordinatorInputSchema
export const GameStateSchema = z.object({
    playerAction: z.string(),
    party: z.array(CharacterSchema),
    locationId: z.string(),
    inCombat: z.boolean(),
    conversationHistory: z.array(z.any()), // This is an array of GameMessage objects
    turnIndex: z.number().optional(),
    initiativeOrder: z.array(z.any()).optional(), // This represents Combatant[]
    enemies: z.array(z.any()).optional(),
  });
export type GameState = z.infer<typeof GameStateSchema>;