import { z } from 'zod';
import { CharacterSchema, PartySchema, LocationSchema, ConnectionSchema, GameStateSchema, WorldStateSchema } from './schemas';

// Infer the TypeScript types from the Zod schemas
export type Character = z.infer<typeof CharacterSchema>;
export type Party = z.infer<typeof PartySchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type WorldState = z.infer<typeof WorldStateSchema>;
export type GameState = z.infer<typeof GameStateSchema>;

// We can still define types that don't have a direct schema equivalent if needed
export interface GameMessage {
  id: string;
  sender: "DM" | "Player" | "System" | "Character" | "Error";
  senderName?: string;
  characterColor?: string;
  content: string | React.ReactNode;
  originalContent?: string; // Store the raw markdown here
  timestamp: string;
  onRetry?: () => void;
}

export type DiceRollOutcome = 'crit' | 'success' | 'fail' | 'pifia' | 'neutral' | 'initiative' | 'victory' | 'defeat';

export interface DiceRollModifier {
  value: number;
  label: string; // e.g., "FUE", "BC", "INT"
}

export interface DiceRoll {
  id: string;
  roller: string; // Character name or "DM"
  rollNotation: string; // e.g. "1d20", "2d6"
  individualRolls: number[];
  modifier?: number;
  modifiers?: DiceRollModifier[]; // Breakdown of individual modifiers (e.g., [{value: 3, label: "INT"}, {value: 2, label: "BC"}])
  totalResult: number;
  outcome: DiceRollOutcome;
  timestamp: Date;
  description?: string;
  // Combat-specific information
  targetName?: string; // Name of the target (for attack/damage/healing rolls)
  targetAC?: number; // AC of the target (for attack rolls)
  attackHit?: boolean; // Whether the attack hit (for attack rolls)
  damageDealt?: number; // Damage dealt (for damage rolls)
  targetKilled?: boolean; // Whether the target was killed by this damage roll
  targetKnockedOut?: boolean; // Whether the target was knocked unconscious by this damage roll
  healingAmount?: number; // Healing amount (for healing rolls)
  attributeUsed?: 'FUE' | 'DES' | 'CON' | 'INT' | 'SAB' | 'CAR'; // The attribute used for the roll (e.g. "FUE" for Strength-based attacks)
  attackRange?: 'melee' | 'ranged'; // Type of attack: melee or ranged
}

export interface InitiativeRoll {
  characterName: string;
  roll: number;
  modifier: number;
  total: number;
  id: string;
  type: 'player' | 'npc';
}

export enum CombatPhase {
  SETUP = 'SETUP',                    // Combat starts
  TURN_START = 'TURN_START',          // Turn starts (evaluate conditions)
  WAITING_FOR_ACTION = 'WAITING_FOR_ACTION', // Waiting for input (Player or AI)
  PROCESSING_ACTION = 'PROCESSING_ACTION',   // Executing action
  ACTION_RESOLVED = 'ACTION_RESOLVED',       // Action finished, showing results (Pause)
  TURN_END = 'TURN_END',              // Turn ends (cleanup)
  COMBAT_END = 'COMBAT_END'           // Combat ends
}

export interface Combatant {
  id: string;
  characterName: string;
  total: number;
  type: 'player' | 'npc';
  controlledBy: "Player" | "AI";
  status?: 'active' | 'unconscious' | 'dead';
  isSurprised?: boolean; // If true, this combatant loses their first turn
}

// We can also infer nested types if we need them separately
export type AbilityScores = Character['abilityScores'];
export type Skill = Character['skills'][number];
export type InventoryItem = Character['inventory'][number];
export type Spell = Character['spells'][number];

export interface VolumeSettings {
  master: number;
  music: number;
  ambience: number;
  sfx: number;
  narrator: number;
}