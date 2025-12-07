/**
 * @fileOverview Schemas for tactician tools
 * These schemas are used by the tactician tools for input/output validation
 * This file does NOT have 'use server' to allow exporting Zod schemas
 */

import { z } from 'zod';
import { CharacterSchema } from '@/lib/schemas';

/**
 * Enemy Tactician Schemas
 */
export const EnemyTacticianInputSchema = z.object({
    activeCombatant: z.string().describe("The name of the hostile NPC/monster whose turn it is."),
    party: z.array(CharacterSchema).describe('An array containing the data for all characters in the party (player and AI-controlled).'),
    enemies: z.array(z.object({ name: z.string(), id: z.string(), hp: z.string() })).describe("A list of all hostile NPCs/monsters currently in combat and their HP status (e.g., 'Healthy', 'Wounded', 'Badly Wounded')."),
    locationDescription: z.string().describe('A description of the current location.'),
    conversationHistory: z.string().describe("A transcript of the last few turns of combat to provide immediate context."),
});
export type EnemyTacticianInput = z.infer<typeof EnemyTacticianInputSchema>;

export const EnemyTacticianOutputSchema = z.object({
    actionDescription: z.string().describe("A brief, technical description of the action (e.g., 'Ataque con Cimitarra', 'Lanzar Rayo de Escarcha'). This is NOT a narration, just a label."),
    targetId: z.string().nullable().describe("The unique ID of the character being targeted by the action. This can be null if the action has no specific target."),
    diceRolls: z.array(z.object({
        roller: z.string().describe("The name of the character or monster rolling the dice."),
        rollNotation: z.string().describe("The dice notation for the roll (e.g., '1d20+5', '2d6+3')."),
        description: z.string().describe("A brief description of the roll's purpose. For attacks: MUST be 'Tirada de ataque con [weapon]' for attack roll (1d20+modifier), then 'Tirada de daño con [weapon]' for damage roll. ATTACK ROLL MUST ALWAYS COME FIRST."),
        attackType: z.enum(['attack_roll', 'saving_throw', 'other']).describe("IMPORTANT: Specify the type of roll. 'attack_roll' for weapons/spells that use 1d20 to hit. 'saving_throw' for spells where the target rolls to avoid damage (rare for basic enemies). 'other' for utility rolls. This field is MANDATORY for all attack/damage rolls."),
    })).optional().default([]).describe("An array of dice rolls. FOR STANDARD ATTACKS: Leave empty []. The system will calculate rolls automatically. FOR SPECIAL ABILITIES/SPELLS: You may provide rolls if needed."),
});
export type EnemyTacticianOutput = z.infer<typeof EnemyTacticianOutputSchema>;

/**
 * Companion Tactician Schemas
 */
export const CompanionTacticianInputSchema = z.object({
    activeCombatant: z.string().describe("The name of the friendly NPC/companion whose turn it is."),
    party: z.array(CharacterSchema).describe('An array containing the data for all characters in the party (player and AI-controlled).'),
    enemies: z.array(z.object({ name: z.string(), id: z.string(), hp: z.string() })).describe("A list of all hostile NPCs/monsters currently in combat and their HP status (e.g., 'Healthy', 'Wounded', 'Badly Wounded')."),
    locationDescription: z.string().describe('A description of the current location.'),
    conversationHistory: z.string().describe("A transcript of the last few turns of combat to provide immediate context."),
    availableSpells: z.array(z.object({
        id: z.string(),
        name: z.string(),
        level: z.number(),
        description: z.string().nullable(),
    })).describe("The list of spells available to the active combatant. This is CRITICAL - only use spells from this list."),
    inventory: z.array(z.object({
        id: z.string(),
        name: z.string(),
        quantity: z.number(),
        description: z.string().optional().nullable(),
    })).optional().describe("The inventory items of the active combatant. This is CRITICAL - only use weapons/items from this list."),
});
export type CompanionTacticianInput = z.infer<typeof CompanionTacticianInputSchema>;

export const CompanionTacticianOutputSchema = z.object({
    actionDescription: z.string().describe("A brief, technical description of the action (e.g., 'Curar a Galador', 'Ataque con Maza'). This is NOT a narration, just a label."),
    targetId: z.string().nullable().describe("The unique ID of the character or enemy being targeted by the action. This can be null if the action has no specific target."),
    diceRolls: z.array(z.object({
        roller: z.string().describe("The name of the character rolling the dice."),
        rollNotation: z.string().describe("The dice notation for the roll (e.g., '1d20+5', '1d4')."),
        description: z.string().describe("A brief description of the roll's purpose. For attacks: MUST be 'Tirada de ataque con [weapon]' for attack roll (1d20+modifier), then 'Tirada de daño con [weapon]' for damage roll. ATTACK ROLL MUST ALWAYS COME FIRST."),
        attackType: z.enum(['attack_roll', 'saving_throw', 'healing', 'other']).describe("IMPORTANT: Specify the type of roll. 'attack_roll' for weapons/spells that use 1d20 to hit (Ray of Frost, Mace). 'saving_throw' for spells where the target rolls to avoid damage (Sacred Flame, Fireball). 'healing' for healing spells. 'other' for utility rolls. This field is MANDATORY for all attack/damage rolls."),
    })).optional().default([]).describe("An array of dice rolls. FOR STANDARD ATTACKS: Leave empty []. The system will calculate rolls automatically. FOR HEALING/SPECIAL SPELLS: Provide the necessary rolls."),
});
export type CompanionTacticianOutput = z.infer<typeof CompanionTacticianOutputSchema>;

/**
 * Combat Narration Expert Schemas
 * Generates complete combat narrations including preparation, execution, and result.
 */
export const CombatNarrationExpertInputSchema = z.object({
    // Core action info
    attackerName: z.string().describe("Name of the character performing the action (e.g., 'Galador', 'Goblin 1')."),
    targetName: z.string().describe("Name of the target character (e.g., 'Orco 1', 'Merryl')."),
    actionDescription: z.string().optional().describe("Brief description of the action (e.g., 'Ataque con Maza', 'Lanzar Rayo de Escarcha'). Optional for intention narrations."),
    // Type of narration (intention vs resolution). Optional for backward compatibility.
    narrationType: z.enum(['intention', 'resolution']).optional(),

    // Optional context
    playerAction: z.string().optional().describe("The original action text from the player (e.g., 'Ataco al orco con mi espada'). Optional for AI turns."),
    weaponName: z.string().optional().describe("Name of the weapon used, if any."),
    spellName: z.string().optional().describe("Name of the spell cast, if any."),

    // Combat results
    // Optional to allow intention narrations (pre-resolution); required at runtime for resolution narrations
    attackResult: z.enum(['hit', 'miss', 'critical', 'fumble']).optional().describe("Result of the attack roll. Required for resolution narrations."),
    damageDealt: z.number().optional().describe("Amount of damage dealt (only if attack hit). 0 or undefined if attack missed."),
    targetPreviousHP: z.number().optional().describe("Target's HP before the attack."),
    targetNewHP: z.number().optional().describe("Target's HP after the attack."),
    targetKilled: z.boolean().optional().describe("True if the target was killed/defeated."),
    targetKnockedOut: z.boolean().optional().describe("True if the target was knocked unconscious (for player characters/companions)."),

    // Context for richer narration
    locationDescription: z.string().optional().describe("Brief description of the current location for environmental context."),
    conversationHistory: z.string().optional().describe("Recent combat events for context continuity."),
});
export type CombatNarrationExpertInput = z.infer<typeof CombatNarrationExpertInputSchema>;

export const CombatNarrationExpertOutputSchema = z.object({
    narration: z.string().describe("The descriptive narration of the combat action. Should be exciting, immersive, and in Spanish from Spain. Do NOT include dice roll results or HP numbers - those are shown separately."),
    debugLogs: z.array(z.string()).optional(),
});
export type CombatNarrationExpertOutput = z.infer<typeof CombatNarrationExpertOutputSchema>;
