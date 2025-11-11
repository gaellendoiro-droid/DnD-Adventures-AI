import { z } from 'zod';
import { CharacterSchema, PartySchema } from './schemas';

// Infer the TypeScript types from the Zod schemas
export type Character = z.infer<typeof CharacterSchema>;
export type Party = z.infer<typeof PartySchema>;

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

export type DiceRollOutcome = 'crit' | 'success' | 'fail' | 'pifia' | 'neutral' | 'initiative';

export interface DiceRoll {
  id: string;
  roller: string; // Character name or "DM"
  rollNotation: string; // e.g. "1d20", "2d6"
  individualRolls: number[];
  modifier?: number;
  totalResult: number;
  outcome: DiceRollOutcome;
  timestamp: Date;
  description?: string;
}

export interface InitiativeRoll {
    characterName: string;
    roll: number;
    modifier: number;
    total: number;
    id: string;
    type: 'player' | 'npc';
}

export interface Combatant {
  id: string;
  characterName: string;
  total: number;
  type: 'player' | 'npc';
  controlledBy: "Player" | "AI";
}

// We can also infer nested types if we need them separately
export type AbilityScores = Character['abilityScores'];
export type Skill = Character['skills'][number];
export type InventoryItem = Character['inventory'][number];
export type Spell = Character['spells'][number];