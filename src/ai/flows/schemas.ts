/**
 * @fileOverview This file contains shared Zod schemas used across different AI flows
 * to avoid circular dependencies.
 */

import { z } from 'zod';
import { CharacterSchema, CharacterSummarySchema } from '@/lib/schemas';
import type { GameMessage } from '@/lib/types';

// Schema for the action interpreter
export const ActionInterpreterInputSchema = z.object({
  playerAction: z.string().describe('The action taken by the player.'),
  locationContext: z.string().describe('A JSON string with the full data of the current location, including its exits, interactable objects and entities present.'),
});
export type ActionInterpreterInput = z.infer<typeof ActionInterpreterInputSchema>;

export const ActionInterpreterOutputSchema = z.object({
  actionType: z.enum(['move', 'interact', 'attack', 'narrate', 'ooc']).describe("The interpreted type of the player's action."),
  targetId: z.string().optional().nullable().describe("The ID of the target for the action. For 'move', it's the destination ID. For 'attack', the entity ID. For 'interact', it's the specific interaction action name (e.g., 'Leer Misión de la Colina del Resentimiento')."),
});
export type ActionInterpreterOutput = z.infer<typeof ActionInterpreterOutputSchema>;


// Schema for the narrative expert
export const NarrativeExpertInputSchema = z.object({
  playerAction: z.string().describe('The action taken by the player.'),
  partySummary: z.array(CharacterSummarySchema).describe("A lightweight summary of the player's party. This is for prompt context."),
  locationId: z.string().describe('The ID of the current location (e.g., "phandalin-plaza-del-pueblo").'),
  locationContext: z.string().describe('A JSON string with the full data of the current location, including its description, exits, and interactable objects.'),
  conversationHistory: z.string().optional().describe("A transcript of the last few turns of conversation to provide immediate context."),
  interpretedAction: z.string().describe("A JSON string of the structured interpretation of the player's action, provided by the actionInterpreter."),
});
export type NarrativeExpertInput = z.infer<typeof NarrativeExpertInputSchema>;

export const NarrativeExpertOutputSchema = z.object({
  dmNarration: z.string().describe("The AI Dungeon Master's primary narration in response to the player's action, formatted in Markdown. This should describe the companion dialogue here."),
  updatedCharacterStats: z.string().optional().nullable().describe("The updated character stats (e.g., HP, XP, status effects), if any, for the PLAYER character only, as a valid JSON string. For example: '{\"hp\":{\"current\":8,\"max\":12}, \"inventory\": [{\"id\":\"item-gp-1\",\"name\":\"Monedas de Oro\",\"quantity\":10}]}'. Must be a valid JSON string or null."),
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
});
export type GameCoordinatorInput = z.infer<typeof GameCoordinatorInputSchema>;

export const GameCoordinatorOutputSchema = z.object({
  messages: z.array(z.any()).optional(), // Omit<GameMessage, 'id' | 'timestamp'>[] - Zod can't handle this
  debugLogs: z.array(z.string()).optional(),
  updatedParty: z.array(CharacterSchema).optional(),
  nextLocationId: z.string().optional().nullable(),
  error: z.string().optional(),
});
export type GameCoordinatorOutput = z.infer<typeof GameCoordinatorOutputSchema>;
