
/**
 * @fileOverview A Genkit tool that manages a full round or turn of combat.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { enemyTacticianTool } from './enemy-tactician';
import type { GameMessage, DiceRoll, Combatant } from '@/lib/types';
import { companionExpertTool } from './companion-expert';
import { diceRollerTool } from './dice-roller';
import { getAdventureData } from '@/app/game-state-actions';
import { ActionInterpreterOutputSchema } from '../flows/schemas';
import { narrativeExpert } from '../flows/narrative-expert';
import { markdownToHtml } from '../flows/markdown-to-html';
import { CharacterSchema } from '@/lib/schemas'; // Import the single source of truth


export const CombatManagerInputSchema = z.object({
  playerAction: z.string(),
  party: z.array(CharacterSchema),
  locationId: z.string(),
  inCombat: z.boolean(),
  conversationHistory: z.string(),
  turnIndex: z.number().optional(),
  initiativeOrder: z.array(z.any()).optional(), // Combatant[]
  // Fields for combat initiation
  interpretedAction: ActionInterpreterOutputSchema.optional(),
  locationContext: z.any().optional(),
  combatantIds: z.array(z.string()).optional(),
});

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

        const localLog = (message: string) => {
            console.log(message);
            debugLogs.push(`CombatManager: ${message}`);
        };

        if (inCombat) {
            localLog("Continuing existing combat...");
            if (!initiativeOrder || turnIndex === undefined) {
                throw new Error("Combat in progress, but initiativeOrder or turnIndex is missing.");
            }

            let currentTurnIndex = turnIndex;
            let activeCombatant = initiativeOrder[currentTurnIndex];
            
            // Loop through AI turns until it's a player's turn
            while(activeCombatant && activeCombatant.controlledBy === 'AI') {
                localLog(`CombatManager Loop: Processing turn for AI combatant ${activeCombatant.characterName} at index ${currentTurnIndex}...`);

                // Placeholder for Step 3: Call to enemyTacticianTool and execute action
                
                currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
                activeCombatant = initiativeOrder[currentTurnIndex];
            }
            
            const playerCombatant = initiativeOrder.find(c => c.controlledBy === 'Player');
            localLog(`CombatManager Loop: Stopped. Control ceded to player ${playerCombatant?.characterName} at index ${currentTurnIndex}.`);

            // Placeholder for player action processing
            
            return { 
                messages, 
                inCombat: true, 
                debugLogs, 
                turnIndex: currentTurnIndex,
                initiativeOrder: initiativeOrder,
            };
        }
        
        // ========= COMBAT INITIATION LOGIC (UNCHANGED) =========
        localLog("Initiating new combat sequence.");

        if (!combatantIds || !interpretedAction || !locationContext || !party) {
            throw new Error("Combat initiation requires combatantIds, interpretedAction, locationContext, and party data.");
        }

        localLog(`Received ${combatantIds.length} combatant IDs for combat initiation.`);

        const adventureData = await getAdventureData();
        const allEntities = adventureData.entities;
        const combatantData: any[] = [];

        for (const id of combatantIds) {
            let found = party.find(p => p.id === id);
            if (found) {
                combatantData.push({ ...found, entityType: 'player', name: found.name, controlledBy: found.controlledBy });
                localLog(`Player character '${found.name}' (ID: ${id}) added to combat.`);
                continue;
            }

            found = allEntities.find((e: any) => e.id === id);
            if (found) {
                combatantData.push({ ...found, entityType: 'monster', name: found.name, controlledBy: 'AI' });
                localLog(`Entity '${found.name}' (ID: ${id}) added to combat.`);
            } else {
                localLog(`Warning: Could not find entity with ID: ${id} in any provided data source.`);
            }
        }

        const hostileEntities = combatantData.filter(c => c.entityType === 'monster');

        if (hostileEntities.length === 0) {
            localLog("Attack action received, but no hostile enemies were identified.");
            messages.push({ sender: 'DM', content: "Atacas fervientemente al aire, pero no parece haber ninguna amenaza real a la vista." });
            return { messages, inCombat: false, debugLogs };
        }
        
        localLog(`Found ${hostileEntities.length} hostile targets: ${hostileEntities.map(e => e.name).join(', ')}.`);

        messages.push({ sender: 'System', content: `¡Comienza el Combate!` });

        const updatedEnemies = hostileEntities.map((e: any, index: number) => ({
            ...e, 
            uniqueId: `${e.id}-${index}`,
        }));

        const combatantsForInit = [
            ...combatantData.filter(c => c.entityType === 'player'),
            ...updatedEnemies.map(e => ({...e, id: e.uniqueId }))
        ];
        
        const initiativeRolls: { id: string; name: string; total: number; type: string; controlledBy: string; }[] = [];
        for (const combatant of combatantsForInit) {
            let dexModifier = 0;
            if (combatant.abilityModifiers && combatant.abilityModifiers.destreza !== undefined) {
                 dexModifier = combatant.abilityModifiers.destreza;
            } else if (combatant.abilityScores && combatant.abilityScores.destreza !== undefined) {
                 dexModifier = Math.floor((combatant.abilityScores.destreza - 10) / 2);
            } else if (combatant.stats && combatant.stats.dexterity !== undefined) {
                 dexModifier = Math.floor((combatant.stats.dexterity - 10) / 2);
            } else {
                dexModifier = 0;
            }
            
            const rollNotation = `1d20${dexModifier >= 0 ? `+${dexModifier}` : `${dexModifier}`}`;
            const roll = await diceRollerTool({ roller: combatant.name, rollNotation, description: 'Iniciativa' });
            diceRolls.push(roll);
            const combatantType = combatant.entityType === 'player' ? 'ally' : 'enemy';
            initiativeRolls.push({ id: combatant.id, name: combatant.name, total: roll.totalResult, type: combatantType, controlledBy: combatant.controlledBy });
        }
        
        initiativeRolls.sort((a, b) => b.total - a.total);
        const newInitiativeOrder: Combatant[] = initiativeRolls.map(r => ({ id: r.id, characterName: r.name, total: r.total, type: r.type as any, controlledBy: r.controlledBy as any }));
        
        localLog(`Initiative order: ${JSON.stringify(newInitiativeOrder.map(c => c.characterName))}`);
        
        localLog("Narrating the first action of combat...");
        const narrativeResult = await narrativeExpert({
             playerAction: playerAction,
             locationId: locationId,
             locationContext: JSON.stringify(locationContext),
             conversationHistory: conversationHistory,
             interpretedAction: JSON.stringify(interpretedAction),
        });
        (narrativeResult.debugLogs || []).forEach(log => debugLogs.push(log));

        if (narrativeResult.dmNarration) {
            const { html } = await markdownToHtml({ markdown: narrativeResult.dmNarration });
            messages.push({ sender: 'DM', content: html, originalContent: narrativeResult.dmNarration });
        }

        localLog("Combat initiated. Returning control.");

        const finalResult = {
            messages,
            diceRolls,
            inCombat: true,
            initiativeOrder: newInitiativeOrder,
            turnIndex: 0, // Set initial turnIndex to 0
            enemies: updatedEnemies.map(e => ({
                uniqueId: e.uniqueId,
                id: e.id,
                name: e.name,
                color: '#ef4444',
                hp: { current: e.hp, max: e.hp }
            })),
            debugLogs,
        };

        const logSummary = {
            messages: finalResult.messages?.length,
            diceRolls: finalResult.diceRolls?.length,
            initiativeOrder: finalResult.initiativeOrder?.map(c => c.characterName),
            inCombat: finalResult.inCombat,
            turnIndex: finalResult.turnIndex,
        };
        localLog(`Data being returned from CombatManager: ${JSON.stringify(logSummary)}`);
        
        return finalResult;
    }
);
