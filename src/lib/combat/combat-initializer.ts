/**
 * @fileOverview Combat Initializer
 * Main coordinator for combat initialization.
 * Delegates specific tasks to sub-modules.
 */

import { log } from '@/lib/logger';
import type { DiceRoll } from '@/lib/types';
import type { CombatInitContext, CombatInitResult } from './initialization/types';
import { EnemyValidator } from './initialization/enemy-validator';
import { InitiativeGenerator } from './initialization/initiative-generator';
import { NarrationProcessor } from './initialization/narration-processor';
import { FirstTurnHandler } from './initialization/first-turn-handler';

export class CombatInitializer {
    /**
     * Initializes a new combat encounter.
     * Handles enemy stats fetching, initiative rolls, and first AI turn if applicable.
     */
    static async initializeCombat(context: CombatInitContext): Promise<CombatInitResult> {
        const {
            combatantIds,
            party,
            existingEnemies,
            locationContext,
            conversationHistory,
            playerAction,
            interpretedAction,
            locationId,
            diceRollerTool,
            narrativeExpert,
            markdownToHtml,
            processAICombatantRolls,
            enemyTacticianTool,
            companionTacticianTool,
            combatNarrationExpertTool,
            createCombatEndDiceRoll,
            localLog,
        } = context;

        const messages: Array<{ sender: string; content: string; originalContent?: string }> = [];
        const diceRolls: DiceRoll[] = [];
        const debugLogs: string[] = [];
        let updatedParty = [...party];
        let updatedEnemies = [...existingEnemies];

        try {
            localLog("Initiating new combat sequence.");

            // Validate required data
            if (!combatantIds || !interpretedAction || !locationContext || !party) {
                throw new Error("Combat initiation requires combatantIds, interpretedAction, locationContext, and party data.");
            }

            // Step 1: Validate combatants and filter out dead ones
            const { validCombatants, hostileEntities } = await EnemyValidator.validateCombatants(
                combatantIds,
                party,
                existingEnemies,
                localLog
            );

            if (hostileEntities.length === 0) {
                messages.push({
                    sender: 'DM',
                    content: "Atacas fervientemente al aire, pero no parece haber ninguna amenaza real a la vista."
                });
                return {
                    success: false,
                    initiativeOrder: [],
                    enemies: [],
                    updatedParty: party,
                    messages,
                    diceRolls,
                    debugLogs,
                };
            }

            messages.push({ sender: 'System', content: `¡Comienza el Combate!` });

            // Step 2: Generate unique IDs and fetch enemy stats
            const initialEnemies = await EnemyValidator.fetchAndValidateEnemyStats(
                hostileEntities,
                localLog
            );

            updatedEnemies = initialEnemies;

            // Step 3: Generate initiative rolls
            const { initiativeRolls, initiativeDiceRolls, differentiatedNames } = await InitiativeGenerator.generateInitiativeRolls(
                validCombatants,
                initialEnemies,
                diceRollerTool,
                localLog
            );

            diceRolls.push(...initiativeDiceRolls);

            // Step 4: Create initiative order
            const newInitiativeOrder = InitiativeGenerator.createInitiativeOrder(
                initiativeRolls,
                differentiatedNames,
                localLog
            );

            // Step 5: Generate combat narration
            const narrationMessages = await NarrationProcessor.generateCombatNarration(
                newInitiativeOrder,
                updatedParty,
                updatedEnemies,
                differentiatedNames,
                playerAction,
                locationId,
                locationContext,
                conversationHistory,
                interpretedAction,
                narrativeExpert,
                markdownToHtml,
                localLog
            );

            messages.push(...narrationMessages);

            // Step 6: Process first AI turn if applicable
            const firstTurnResult = await FirstTurnHandler.processFirstAITurn({
                newInitiativeOrder,
                updatedParty,
                updatedEnemies,
                differentiatedNames,
                locationContext,
                conversationHistory,
                diceRollerTool,
                processAICombatantRolls,
                enemyTacticianTool,
                companionTacticianTool,
                combatNarrationExpertTool,
                createCombatEndDiceRoll,
                localLog,
            });

            if (firstTurnResult) {
                messages.push(...firstTurnResult.messages);
                diceRolls.push(...firstTurnResult.diceRolls);
                updatedParty = firstTurnResult.updatedParty;
                updatedEnemies = firstTurnResult.updatedEnemies;

                return {
                    success: true,
                    initiativeOrder: newInitiativeOrder,
                    enemies: updatedEnemies,
                    updatedParty,
                    messages,
                    diceRolls,
                    debugLogs,
                    firstTurnData: firstTurnResult.firstTurnData,
                };
            }

            // No first AI turn processed - player goes first
            return {
                success: true,
                initiativeOrder: newInitiativeOrder,
                enemies: updatedEnemies,
                updatedParty,
                messages,
                diceRolls,
                debugLogs,
            };

        } catch (error) {
            log.error('Error initializing combat', {
                module: 'CombatInitializer',
                error: error instanceof Error ? error.message : String(error),
            });

            return {
                success: false,
                initiativeOrder: [],
                enemies: [],
                updatedParty: party,
                messages: [{
                    sender: 'DM',
                    content: 'Hubo un error al iniciar el combate.'
                }],
                diceRolls: [],
                debugLogs,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
