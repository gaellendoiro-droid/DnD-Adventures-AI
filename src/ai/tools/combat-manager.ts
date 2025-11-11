
/**
 * @fileOverview A Genkit tool that manages a full round or turn of combat.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { enemyTacticianTool } from './enemy-tactician';
import { companionTacticianTool } from './companion-tactician';
import type { GameMessage, DiceRoll, Combatant } from '@/lib/types';
import { diceRollerTool } from './dice-roller';
import { getAdventureData } from '@/app/game-state-actions';
import { GameStateSchema, ActionInterpreterOutputSchema } from '@/ai/flows/schemas';
import { narrativeExpert } from '../flows/narrative-expert';
import { markdownToHtml } from '../flows/markdown-to-html';

export const CombatManagerInputSchema = GameStateSchema.extend({
  interpretedAction: ActionInterpreterOutputSchema.optional(),
  locationContext: z.any().optional(),
  combatantIds: z.array(z.string()).optional(),
});

const formatMessageForTranscript = (msg: Partial<GameMessage>): string => {
    const senderName = msg.senderName || msg.sender;
    const content = msg.originalContent || msg.content;
    if (senderName && content) {
        return `${senderName}: ${content}`;
    }
    return '';
};

export const CombatManagerOutputSchema = z.object({
    messages: z.array(z.any()),
    diceRolls: z.array(z.any()).optional(),
    updatedParty: z.array(z.any()).optional(),
    updatedEnemies: z.array(z.any()).optional(),
    nextLocationId: z.string().optional().nullable(),
    inCombat: z.boolean(),
    initiativeOrder: z.array(z.any()).optional(),
    enemies: z.array(z.any()).optional(),
    debugLogs: z.array(z.string()).optional(),
    turnIndex: z.number().optional(),
});

const getHpStatus = (current: number, max: number): string => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'Healthy';
    if (percentage >= 60) return 'Injured';
    if (percentage >= 20) return 'Wounded';
    if (percentage > 0) return 'Badly Wounded';
    return 'Defeated';
};

export const combatManagerTool = ai.defineTool(
    {
      name: 'combatManagerTool',
      description: 'Manages a sequence of turns in combat, starting from the current turn, until it is a human player\'s turn again or combat ends. It also handles the initiation of combat.',
      inputSchema: CombatManagerInputSchema,
      outputSchema: CombatManagerOutputSchema,
    },
    async (input) => {
        const { playerAction, inCombat, locationId, interpretedAction, locationContext, conversationHistory, combatantIds, party, initiativeOrder } = input;
        let { turnIndex } = input;
        
        const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
        const diceRolls: Omit<DiceRoll, 'id' | 'timestamp'>[] = [];
        const debugLogs: string[] = [];
        let updatedEnemies = [...(input.enemies || [])];
        let updatedParty = [...(input.party || [])];

        const localLog = (message: string) => {
            debugLogs.push(`CombatManager: ${message}`);
        };

        if (inCombat) {
            localLog("Continuing existing combat...");
            if (!initiativeOrder || turnIndex === undefined) {
                throw new Error("Combat in progress, but initiativeOrder or turnIndex is missing.");
            }

            let currentTurnIndex = turnIndex;
            let activeCombatant = initiativeOrder[currentTurnIndex];
            
            while(activeCombatant && activeCombatant.controlledBy === 'AI') {
                localLog(`Processing turn for AI combatant ${activeCombatant.characterName} at index ${currentTurnIndex}...`);
                
                const isCompanion = updatedParty.some(p => p.id === activeCombatant.id);
                let tacticianResponse;

                const baseTacticianInput = {
                    activeCombatant: activeCombatant.characterName,
                    party: updatedParty,
                    enemies: updatedEnemies.map(e => ({ name: e.name, id: e.uniqueId, hp: getHpStatus(e.hp.current, e.hp.max) })),
                    locationDescription: locationContext?.description || "An unknown battlefield",
                    conversationHistory: conversationHistory.map(formatMessageForTranscript).join('\n')
                };

                if (isCompanion) {
                    localLog(`Invoking CompanionTacticianTool for ${activeCombatant.characterName}.`);
                    tacticianResponse = await companionTacticianTool(baseTacticianInput);
                } else {
                    localLog(`Invoking EnemyTacticianTool for ${activeCombatant.characterName}.`);
                    tacticianResponse = await enemyTacticianTool(baseTacticianInput);
                }

                const { narration, targetId, diceRolls: requestedRolls, debugLog: tacticianDebugLog } = tacticianResponse;
                if (tacticianDebugLog) {
                    debugLogs.push(tacticianDebugLog);
                }

                localLog(`Tactician for ${activeCombatant.characterName} decided action targeting ${targetId || 'no one'}.`);

                if (narration) {
                    messages.push({ sender: 'DM', content: narration });
                }

                if (targetId && requestedRolls && requestedRolls.length > 0) {
                    const target = [...updatedParty, ...updatedEnemies].find(c => c.id === targetId || (c as any).uniqueId === targetId);

                    if (target) {
                        localLog(`Found target: ${target.name}`);
                        for (const rollData of requestedRolls) {
                            const roll = await diceRollerTool({ ...rollData, roller: activeCombatant.characterName });
                            diceRolls.push(roll);

                            if (roll.description.toLowerCase().includes('attack')) {
                                if (roll.totalResult >= target.ac) {
                                    messages.push({ sender: 'DM', content: `${activeCombatant.characterName}'s attack on ${target.name} hits!` });
                                } else {
                                    messages.push({ sender: 'DM', content: `${activeCombatant.characterName} attacks ${target.name}, but misses.` });
                                    break; // No damage if attack misses
                                }
                            } else if (roll.description.toLowerCase().includes('damage')) {
                                const targetIsPlayer = updatedParty.some(p => p.id === target.id);
                                if (targetIsPlayer) {
                                    updatedParty = updatedParty.map(p => p.id === target.id ? { ...p, hp: { ...p.hp, current: Math.max(0, p.hp.current - roll.totalResult) } } : p);
                                } else {
                                    updatedEnemies = updatedEnemies.map(e => (e as any).uniqueId === (target as any).uniqueId ? { ...e, hp: { ...e.hp, current: Math.max(0, e.hp.current - roll.totalResult) } } : e);
                                }
                                messages.push({ sender: 'DM', content: `It deals ${roll.totalResult} damage.` });
                            } else if (roll.description.toLowerCase().includes('healing')) {
                                const targetIsPlayer = updatedParty.some(p => p.id === target.id);
                                    if (targetIsPlayer) {
                                    updatedParty = updatedParty.map(p => p.id === target.id ? { ...p, hp: { ...p.hp, current: Math.min(p.hp.max, p.hp.current + roll.totalResult) } } : p);
                                    messages.push({ sender: 'DM', content: `${target.name} is healed for ${roll.totalResult} points.` });
                                }
                            }
                        }
                    } else { localLog(`Could not find target combatant with id: "${targetId}"`); }
                } else if (!targetId) { localLog('Action had no targetId.'); }
                
                currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
                activeCombatant = initiativeOrder[currentTurnIndex];
            }
            
            const playerCombatant = initiativeOrder.find(c => c.controlledBy === 'Player');
            localLog(`Loop Stopped. Control ceded to player ${playerCombatant?.characterName} at index ${currentTurnIndex}.`);
            
            return { messages, diceRolls, inCombat: true, debugLogs, turnIndex: currentTurnIndex, initiativeOrder, updatedParty, updatedEnemies };
        }
        
        // --- Combat Initiation Logic (remains the same) ---
        localLog("Initiating new combat sequence.");
        if (!combatantIds || !interpretedAction || !locationContext || !party) throw new Error("Combat initiation requires combatantIds, interpretedAction, locationContext, and party data.");
        const adventureData = await getAdventureData();
        const allEntities = adventureData.entities;
        const combatantData: any[] = [];
        for (const id of combatantIds) {
            let found = party.find(p => p.id === id);
            if (found) { combatantData.push({ ...found, entityType: 'player', name: found.name, controlledBy: found.controlledBy }); continue; }
            found = allEntities.find((e: any) => e.id === id);
            if (found) combatantData.push({ ...found, entityType: 'monster', name: found.name, controlledBy: 'AI' });
        }
        const hostileEntities = combatantData.filter(c => c.entityType === 'monster');
        if (hostileEntities.length === 0) {
            messages.push({ sender: 'DM', content: "Atacas fervientemente al aire, pero no parece haber ninguna amenaza real a la vista." });
            return { messages, inCombat: false, debugLogs };
        }
        messages.push({ sender: 'System', content: `¡Comienza el Combate!` });
        const initialEnemies = hostileEntities.map((e: any, index: number) => ({ ...e, uniqueId: `${e.id}-${index}` }));
        const combatantsForInit = [ ...combatantData.filter(c => c.entityType === 'player'), ...initialEnemies.map(e => ({...e, id: e.uniqueId })) ];
        const initiativeRolls: any[] = [];
        for (const combatant of combatantsForInit) {
            let dexModifier = combatant.abilityModifiers?.destreza ?? Math.floor(((combatant.abilityScores?.destreza ?? combatant.stats?.dexterity ?? 10) - 10) / 2);
            const rollNotation = `1d20${dexModifier >= 0 ? `+${dexModifier}` : `${dexModifier}`}`;
            const roll = await diceRollerTool({ roller: combatant.name, rollNotation, description: 'Iniciativa' });
            diceRolls.push(roll);
            const combatantType = combatant.entityType === 'player' ? 'ally' : 'enemy';
            initiativeRolls.push({ id: combatant.id, name: combatant.name, total: roll.totalResult, type: combatantType, controlledBy: combatant.controlledBy });
        }
        initiativeRolls.sort((a, b) => b.total - a.total);
        const newInitiativeOrder: Combatant[] = initiativeRolls.map(r => ({ id: r.id, characterName: r.name, total: r.total, type: r.type as any, controlledBy: r.controlledBy as any }));
        const historyTranscript = conversationHistory.map(formatMessageForTranscript).join('\n');
        const narrativeResult = await narrativeExpert({ playerAction, locationId, locationContext: JSON.stringify(locationContext), conversationHistory: historyTranscript, interpretedAction: JSON.stringify(interpretedAction) });
        if (narrativeResult.debugLogs) narrativeResult.debugLogs.forEach(log => debugLogs.push(log));
        if (narrativeResult.dmNarration) {
            const { html } = await markdownToHtml({ markdown: narrativeResult.dmNarration });
            messages.push({ sender: 'DM', content: html, originalContent: narrativeResult.dmNarration });
        }
        const finalResult = {
            messages,
            diceRolls,
            inCombat: true,
            initiativeOrder: newInitiativeOrder,
            turnIndex: 0,
            enemies: initialEnemies.map(e => ({ uniqueId: e.uniqueId, id: e.id, name: e.name, color: '#ef4444', hp: { current: e.hp, max: e.hp }})),
            debugLogs,
            updatedParty: party,
        };
        localLog(`Data being returned: ${JSON.stringify({ messages: finalResult.messages?.length, diceRolls: finalResult.diceRolls?.length, initiativeOrder: finalResult.initiativeOrder?.map(c => c.characterName), inCombat: finalResult.inCombat, turnIndex: finalResult.turnIndex,})}`);
        return finalResult;
    }
);
