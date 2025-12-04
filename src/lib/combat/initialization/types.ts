/**
 * @fileOverview Shared types for combat initialization modules.
 */

import type { Character, Combatant, DiceRoll, GameMessage } from '@/lib/types';

export interface CombatInitContext {
    combatantIds: string[];
    party: Character[];
    existingEnemies: any[];
    locationContext: any;
    conversationHistory: Array<Partial<GameMessage>>;
    playerAction: string;
    interpretedAction: any;
    locationId: string;
    surpriseSide?: 'player' | 'enemy'; // Which side is surprised (loses first turn)
    // Tool functions
    diceRollerTool: (input: any) => Promise<any>;
    narrativeExpert: (input: any) => Promise<any>;
    markdownToHtml: (input: { markdown: string }) => Promise<{ html: string }>;
    processAICombatantRolls: (input: any) => Promise<any>;
    enemyTacticianTool: (input: any) => Promise<any>;
    companionTacticianTool: (input: any) => Promise<any>;
    combatNarrationExpertTool: (input: any) => Promise<any>;
    createCombatEndDiceRoll: (reason: string) => DiceRoll;
    localLog: (message: string) => void;
}

export interface CombatInitResult {
    success: boolean;
    initiativeOrder: Combatant[];
    enemies: any[];
    updatedParty: Character[];
    messages: Array<{ sender: string; content: string; originalContent?: string }>;
    diceRolls: DiceRoll[];
    debugLogs?: string[];
    // First turn data (if AI goes first and turn was processed)
    firstTurnData?: {
        turnIndex: number;
        activeCombatant: Combatant;
        hasMoreAITurns: boolean;
        lastProcessedTurnWasAI: boolean;
        lastProcessedTurnIndex: number;
        combatEnded?: boolean;
    };
    error?: string;
}

export interface EnemyWithStats {
    uniqueId: string;
    id: string;
    adventureId: string;
    name: string;
    color: string;
    hp: { current: number; max: number };
    ac: number;
    isDead?: boolean;
    // Full stats for robust roll system
    abilityScores?: {
        fuerza: number;
        destreza: number;
        constitución: number;
        inteligencia: number;
        sabiduría: number;
        carisma: number;
    };
    abilityModifiers?: {
        fuerza: number;
        destreza: number;
        constitución: number;
        inteligencia: number;
        sabiduría: number;
        carisma: number;
    };
    proficiencyBonus?: number;
    actions?: any[];
}
