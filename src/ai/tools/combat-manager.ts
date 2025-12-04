/**
 * @fileOverview A Genkit tool that manages a full round or turn of combat.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { enemyTacticianTool } from './enemy-tactician';
import { companionTacticianTool } from './companion-tactician';
import type { GameMessage, DiceRoll, Combatant } from '@/lib/types';
import { diceRollerTool } from './dice-roller';

import { GameStateSchema, ActionInterpreterOutputSchema } from '@/ai/flows/schemas';
// narrativeExpert and markdownToHtml are lazy-loaded when combat starts
import { log } from '@/lib/logger';
import { updateRollNotationWithModifiers } from '@/lib/combat/roll-notation-utils';
// Note: processAICombatantRolls is deprecated - TurnProcessor now uses CombatActionExecutor
import { combatNarrationExpertTool } from './combat/combat-narration-expert';
import { CombatSession } from '@/lib/combat/combat-session';

/**
 * Dependencies interface for Dependency Injection in combatManagerTool.
 * Allows mocking dependencies in tests while maintaining backward compatibility.
 */
export interface CombatManagerDependencies {
    diceRollerTool: typeof diceRollerTool;
    enemyTacticianTool: typeof enemyTacticianTool;
    companionTacticianTool: typeof companionTacticianTool;
    combatNarrationExpertTool: typeof combatNarrationExpertTool;
    updateRollNotationWithModifiers: typeof updateRollNotationWithModifiers;
    // Deprecated: processAICombatantRolls is no longer used (replaced by TurnProcessor + CombatActionExecutor)
    processAICombatantRolls?: any; // Kept for backward compatibility but not used
    // Lazy-loaded dependencies (loaded dynamically during combat initialization)
    narrativeExpert?: any;
    markdownToHtml?: any;
}

export const CombatManagerInputSchema = GameStateSchema.extend({
    interpretedAction: ActionInterpreterOutputSchema.optional(),
    locationContext: z.any().optional(),
    combatantIds: z.array(z.string()).optional(),
    surpriseSide: z.enum(['player', 'enemy']).optional(), // Which side is surprised (loses first turn)
});







export const CombatManagerOutputSchema = z.object({
    messages: z.array(z.any()),
    diceRolls: z.array(z.any()).optional(),
    updatedParty: z.array(z.any()).optional(),
    updatedEnemies: z.array(z.any()).optional(), // Deprecated: Use updatedEnemiesByLocation instead
    updatedEnemiesByLocation: z.record(z.string(), z.array(z.any())).optional(), // Map of locationId -> updated enemies array
    nextLocationId: z.string().optional().nullable(),
    inCombat: z.boolean(),
    initiativeOrder: z.array(z.any()).optional(),
    enemies: z.array(z.any()).optional(), // Deprecated: Use enemiesByLocation instead
    enemiesByLocation: z.record(z.string(), z.array(z.any())).optional(), // Map of locationId -> enemies array
    // debugLogs removed - UI DebugLog panel is being deprecated
    turnIndex: z.number().optional(),
    hasMoreAITurns: z.boolean().optional(),
    // Nuevos campos para comunicación explícita de qué turno se procesó
    lastProcessedTurnWasAI: z.boolean().optional(), // true si el último turno procesado fue de IA/Enemy
    lastProcessedTurnIndex: z.number().optional(),  // índice del turno que se acaba de procesar
    playerActionCompleted: z.boolean().optional(),  // true si el jugador ya completó su acción en este turno
});


/**
 * Core combat manager logic with Dependency Injection support.
 * This function orchestrates combat using CombatSession, which encapsulates all combat state and logic.
 * 
 * @param input - The combat manager input (game state, player action, etc.)
 * @param dependencies - Optional dependencies for DI (defaults to real implementations)
 * @returns Combat manager output (messages, dice rolls, updated state, etc.)
 */
export async function executeCombatManager(
    input: z.infer<typeof CombatManagerInputSchema>,
    dependencies?: Partial<CombatManagerDependencies>
) {
    // Merge provided dependencies with defaults
    const deps: CombatManagerDependencies = {
        diceRollerTool,
        enemyTacticianTool,
        companionTacticianTool,
        combatNarrationExpertTool,
        updateRollNotationWithModifiers,
        // processAICombatantRolls is deprecated but kept for backward compatibility
        processAICombatantRolls: undefined,
        ...dependencies, // Override with provided dependencies (for testing)
    };

    const { playerAction, inCombat, locationId, interpretedAction, locationContext, conversationHistory, combatantIds, surpriseSide } = input;

    // Get enemies for current location from enemiesByLocation, fallback to enemies for backward compatibility
    const currentLocationEnemies = input.enemiesByLocation?.[locationId] || input.enemies || [];

    // Create or hydrate CombatSession from input
    const session = CombatSession.fromInput({
        party: input.party || [],
        enemies: currentLocationEnemies, // Use location-specific enemies
        initiativeOrder: input.initiativeOrder || [],
        turnIndex: input.turnIndex ?? 0,
        inCombat: inCombat || false,
        locationId: locationId || '',
        messages: input.messages || [],
        diceRolls: input.diceRolls || [],
    });

    if (inCombat) {
        // Continuing existing combat - process current turn
        log.info('Continuing existing combat', {
            module: 'CombatManager',
            turnIndex: session.getTurnIndex(),
            activeCombatant: session.getActiveCombatant()?.characterName || 'Unknown',
        });

        await session.processCurrentTurn(
            interpretedAction,
            playerAction || '',
            locationContext,
            conversationHistory || [],
            deps
        );
    } else {
        // Initiating new combat
        log.info('Initiating new combat', {
            module: 'CombatManager',
            combatantIds: combatantIds || [],
        });

        // Lazy load heavy dependencies for initiation (if not provided via DI)
        const narrativeExpertToUse = deps.narrativeExpert || (await import('@/ai/flows/narrative-manager')).narrativeExpert;
        const markdownToHtmlToUse = deps.markdownToHtml || (await import('@/ai/flows/markdown-to-html')).markdownToHtml;

        // Create deps object with lazy-loaded dependencies
        const initDeps: CombatManagerDependencies = {
            ...deps,
            narrativeExpert: narrativeExpertToUse,
            markdownToHtml: markdownToHtmlToUse,
        };

        await session.initialize(
            initDeps,
            combatantIds || [],
            locationContext,
            conversationHistory || [],
            playerAction || '',
            interpretedAction,
            surpriseSide
        );
    }

    // Serialize session state to output format
    return session.toJSON();
}

/**
 * Genkit tool wrapper for combatManagerTool.
 * This is the actual tool registered with Genkit that delegates to executeCombatManager.
 * Uses default dependencies (real implementations) unless overridden via executeCombatManager.
 */
export const combatManagerTool = ai.defineTool(
    {
        name: 'combatManagerTool',
        description: 'Manages a sequence of turns in combat, starting from the current turn, until it is a human player\'s turn again or combat ends. It also handles the initiation of combat.',
        inputSchema: CombatManagerInputSchema,
        outputSchema: CombatManagerOutputSchema,
    },
    async (input) => {
        // Call the core function with default dependencies
        return executeCombatManager(input);
    }
);
