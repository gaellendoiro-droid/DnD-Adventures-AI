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

export interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  avatarUrl: string;
  avatarHint: string;
  abilityScores: AbilityScores;
  skills: Skill[];
  hp: {
    current: number;
    max: number;
  };
  controlledBy: "Player" | "AI";
}

export interface GameMessage {
  id: string;
  sender: "DM" | "Player" | "System";
  content: string | React.ReactNode;
  timestamp: string;
}
