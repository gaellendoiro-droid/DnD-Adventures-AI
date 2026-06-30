import { Character, GameMessage } from '../../types';

export interface RulesEngineInput {
    playerAction: string;
    interpretation: any;
    party: Character[];
    currentLocationId: string;
    adventureData: any;
    worldState: any;
    conversationHistory: GameMessage[];
    openDoors?: Record<string, boolean>;
}

export interface RulesEngineResult {
    interpretation: any;
    systemFeedback?: string;
    updatedWorldState?: any;
    updatedParty?: Character[];
    intercepted: boolean;
    pendingEffects?: string[];
    pendingWorldStateFlags?: Record<string, any>;
}

export interface RuleModule {
    name: string;
    canHandle(input: RulesEngineInput): boolean;
    evaluate(input: RulesEngineInput): RulesEngineResult;
}
