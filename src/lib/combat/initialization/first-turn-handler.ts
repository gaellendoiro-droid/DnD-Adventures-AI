/**
 * @fileOverview First Turn Handler module
 * Handles the processing of the first turn if it belongs to an AI combatant.
 */

import { log } from '@/lib/logger';
import type { Character, Combatant, DiceRoll, GameMessage } from '@/lib/types';
import { CombatTurnManager } from '@/lib/combat/turn-manager';
import { resolveEnemyId } from '@/lib/combat/target-resolver';
import { getVisualName, escapeRegex } from '@/lib/combat/monster-name-manager';
import { getHpStatus, checkEndOfCombat } from '@/lib/combat/rules-engine';
import type { EnemyWithStats } from './types';

interface FirstTurnContext {
    newInitiativeOrder: Combatant[];
    updatedParty: Character[];
    updatedEnemies: EnemyWithStats[];
    differentiatedNames: Map<string, string>;
    locationContext: any;
    conversationHistory: Array<Partial<GameMessage>>;
    diceRollerTool: (input: any) => Promise<any>;
    processAICombatantRolls: (input: any) => Promise<any>;
    enemyTacticianTool: (input: any) => Promise<any>;
    companionTacticianTool: (input: any) => Promise<any>;
    combatNarrationExpertTool: (input: any) => Promise<any>;
    createCombatEndDiceRoll: (reason: string) => DiceRoll;
    localLog: (msg: string) => void;
}

interface FirstTurnResult {
    messages: Array<{ sender: string; content: string; originalContent?: string }>;
    diceRolls: DiceRoll[];
    updatedParty: Character[];
    updatedEnemies: any[];
    firstTurnData: {
        turnIndex: number;
        activeCombatant: Combatant;
        hasMoreAITurns: boolean;
        lastProcessedTurnWasAI: boolean;
        lastProcessedTurnIndex: number;
        combatEnded?: boolean;
    };
}

export class FirstTurnHandler {
    /**
     * Processes the first turn if the active combatant is an AI.
     */
    static async processFirstAITurn(context: FirstTurnContext): Promise<FirstTurnResult | null> {
        const {
            newInitiativeOrder,
            differentiatedNames,
            locationContext,
            conversationHistory,
            diceRollerTool,
            processAICombatantRolls,
            enemyTacticianTool,
            companionTacticianTool,
            combatNarrationExpertTool,
            createCombatEndDiceRoll,
            localLog
        } = context;

        let updatedParty = [...context.updatedParty];
        let updatedEnemies = [...context.updatedEnemies];
        const messages: Array<{ sender: string; content: string; originalContent?: string }> = [];
        const diceRolls: DiceRoll[] = [];
        const debugLogs: string[] = [];

        let currentTurnIndex = 0;
        let activeCombatant = newInitiativeOrder[currentTurnIndex];

        localLog(`Combat initiated. First combatant: ${activeCombatant.characterName} (controlled by: ${activeCombatant.controlledBy})`);

        // If first combatant is NOT AI, return null (let CombatManager handle player turn)
        if (!activeCombatant || activeCombatant.controlledBy !== 'AI') {
            return null;
        }

        localLog(`Processing turn for AI combatant ${activeCombatant.characterName} at index ${currentTurnIndex}...`);

        let combatHasEnded = false;
        const isCompanion = updatedParty.some(p => p.id === activeCombatant.id);

        // Check if active combatant is dead/unconscious - skip their turn if so
        if (CombatTurnManager.shouldSkipTurn(activeCombatant, updatedParty, updatedEnemies)) {
            const activeCombatantDataInit = isCompanion
                ? updatedParty.find(p => p.id === activeCombatant.id)
                : updatedEnemies.find(e => (e as any).uniqueId === activeCombatant.id);

            if (activeCombatantDataInit) {
                let statusMessage: string;
                if (isCompanion) {
                    statusMessage = activeCombatantDataInit.isDead === true
                        ? `${activeCombatant.characterName} está muerto y no puede actuar.`
                        : `${activeCombatant.characterName} está inconsciente y no puede actuar.`;
                } else {
                    statusMessage = `${activeCombatant.characterName} está muerto y no puede actuar.`;
                }

                messages.push({ sender: 'DM', content: statusMessage });

                // Advance to next turn
                currentTurnIndex = CombatTurnManager.nextTurnIndex(currentTurnIndex, newInitiativeOrder.length);
                activeCombatant = newInitiativeOrder[currentTurnIndex];

                const hasMoreAITurns = CombatTurnManager.hasMoreAITurns(activeCombatant, updatedParty, updatedEnemies, combatHasEnded);
                const processedTurnIndex = (currentTurnIndex - 1 + newInitiativeOrder.length) % newInitiativeOrder.length;

                return {
                    messages,
                    diceRolls,
                    updatedParty,
                    updatedEnemies,
                    firstTurnData: {
                        turnIndex: currentTurnIndex,
                        activeCombatant,
                        hasMoreAITurns,
                        lastProcessedTurnWasAI: true,
                        lastProcessedTurnIndex: processedTurnIndex,
                        combatEnded: false
                    }
                };
            }
        }

        // Process AI Turn
        let tacticianResponse;

        // Get visual names for enemies to pass to tacticians
        const enemyVisualNamesInit = new Map<string, string>();
        for (const enemy of updatedEnemies) {
            const visualName = getVisualName(enemy.uniqueId, newInitiativeOrder, updatedEnemies);
            enemyVisualNamesInit.set(enemy.uniqueId, visualName);
        }

        // Filter out dead combatants before passing to tactician
        const alivePartyInit = updatedParty.filter(p => p.hp.current > 0);
        const aliveEnemiesInit = updatedEnemies.filter(e => e.hp.current > 0);

        const activeCombatantFullData = isCompanion
            ? alivePartyInit.find(p => p.id === activeCombatant.id)
            : null;

        const baseTacticianInput = {
            activeCombatant: activeCombatant.characterName,
            party: alivePartyInit,
            enemies: aliveEnemiesInit.map(e => ({
                name: enemyVisualNamesInit.get(e.uniqueId) || e.name,
                id: e.uniqueId,
                hp: getHpStatus(e.hp.current, e.hp.max)
            })),
            locationDescription: locationContext?.description || "An unknown battlefield",
            conversationHistory: conversationHistory.map(msg => {
                const senderName = msg.senderName || msg.sender;
                const content = msg.originalContent || msg.content;
                return senderName && content ? `${senderName}: ${content}` : '';
            }).join('\n'),
            availableSpells: activeCombatantFullData?.spells || [],
            inventory: activeCombatantFullData?.inventory || []
        };

        if (isCompanion) {
            tacticianResponse = await companionTacticianTool(baseTacticianInput);
        } else {
            tacticianResponse = await enemyTacticianTool(baseTacticianInput);
        }

        const { actionDescription, targetId, diceRolls: requestedRolls } = tacticianResponse;

        // Resolve target if present
        let target: any = null;
        let targetVisualName = 'nadie';

        if (targetId) {
            const resolved = resolveEnemyId(targetId, updatedEnemies, newInitiativeOrder, updatedParty);
            let resolvedTargetId = resolved.uniqueId;

            if (resolved.ambiguous && resolved.matches.length > 0) {
                const firstMatchName = resolved.matches[0];
                const firstMatchCombatant = newInitiativeOrder.find(c => c.characterName === firstMatchName);
                resolvedTargetId = firstMatchCombatant?.id || null;
            }

            const finalTargetId = resolvedTargetId || targetId;
            target = [...updatedParty, ...updatedEnemies].find(
                c => c.id === finalTargetId || (c as any).uniqueId === finalTargetId
            );

            if (target) {
                targetVisualName = getVisualName(
                    (target as any).uniqueId || target.id,
                    newInitiativeOrder,
                    updatedEnemies
                );
            }
        }

        if (targetId && requestedRolls && requestedRolls.length > 0) {
            const resolved = resolveEnemyId(targetId, updatedEnemies, newInitiativeOrder, updatedParty);
            let resolvedTargetId = resolved.uniqueId;

            if (resolved.ambiguous && resolved.matches.length > 0) {
                const firstMatchName = resolved.matches[0];
                const firstMatchCombatant = newInitiativeOrder.find(c => c.characterName === firstMatchName);
                resolvedTargetId = firstMatchCombatant?.id || null;
            }

            const finalTargetId = resolvedTargetId || targetId;
            const target = [...updatedParty, ...updatedEnemies].find(
                c => c.id === finalTargetId || (c as any).uniqueId === finalTargetId
            );

            if (target) {
            const rollsResult = await processAICombatantRolls({
                activeCombatant,
                requestedRolls,
                target,
                updatedParty,
                updatedEnemies,
                newInitiativeOrder,
                localLog,
                combatNarrationExpertTool,
                actionDescription, // Pass action description for complete narration
            });

                diceRolls.push(...rollsResult.diceRolls);
                messages.push(...rollsResult.messages);
                updatedParty = rollsResult.updatedParty;
                updatedEnemies = rollsResult.updatedEnemies;
                combatHasEnded = rollsResult.combatEnded;

                if (!combatHasEnded) {
                    const endOfCombatCheck = checkEndOfCombat(updatedParty, updatedEnemies);
                    if (endOfCombatCheck.combatEnded) {
                        combatHasEnded = true;
                        if (!messages.some(m => String(m.content || '').includes('Victoria') || String(m.content || '').includes('derrotados'))) {
                            messages.push({
                                sender: 'DM',
                                content: endOfCombatCheck.reason || 'El combate ha terminado.'
                            });
                            const combatEndRoll = createCombatEndDiceRoll(endOfCombatCheck.reason || 'El combate ha terminado.');
                            diceRolls.push(combatEndRoll);
                        }
                    }
                }
            }
        }

        if (!combatHasEnded) {
            currentTurnIndex = CombatTurnManager.nextTurnIndex(currentTurnIndex, newInitiativeOrder.length);
            activeCombatant = newInitiativeOrder[currentTurnIndex];
        }

        if (combatHasEnded) {
            if (!diceRolls.some(r => r.outcome === 'victory' || r.outcome === 'defeat')) {
                const endOfCombatCheck = checkEndOfCombat(updatedParty, updatedEnemies);
                if (endOfCombatCheck.combatEnded) {
                    const combatEndRoll = createCombatEndDiceRoll(endOfCombatCheck.reason || 'El combate ha terminado.');
                    diceRolls.push(combatEndRoll);
                }
            }
            return {
                messages,
                diceRolls,
                updatedParty,
                updatedEnemies,
                firstTurnData: {
                    turnIndex: 0,
                    activeCombatant: newInitiativeOrder[0], // Irrelevant as combat ended
                    hasMoreAITurns: false,
                    lastProcessedTurnWasAI: true,
                    lastProcessedTurnIndex: currentTurnIndex,
                    combatEnded: true
                }
            };
        }

        const hasMoreAITurns = CombatTurnManager.hasMoreAITurns(activeCombatant, updatedParty, updatedEnemies, combatHasEnded);
        const processedTurnIndex = (currentTurnIndex - 1 + newInitiativeOrder.length) % newInitiativeOrder.length;

        return {
            messages,
            diceRolls,
            updatedParty,
            updatedEnemies,
            firstTurnData: {
                turnIndex: currentTurnIndex,
                activeCombatant,
                hasMoreAITurns,
                lastProcessedTurnWasAI: true,
                lastProcessedTurnIndex: processedTurnIndex,
                combatEnded: false
            }
        };
    }

}
