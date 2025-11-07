

export interface AbilityScores {
  fuerza: number;
  destreza: number;
  constitución: number;
  inteligencia: number;
  sabiduría: number;
  carisma: number;
}

export interface Skill {
  name: string;
  proficient: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  description?: string | null;
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  description: string;
}

export interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  sex: string;
  background: string;
  color: string;
  personality: string;
  abilityScores: AbilityScores;
  skills: Skill[];
  hp: {
    current: number;
    max: number;
  };
  ac: number;
  controlledBy: "Player" | "AI";
  inventory: InventoryItem[];
  spells: Spell[];
}

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
}
