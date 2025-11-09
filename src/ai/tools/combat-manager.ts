

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
import { characterLookupTool } from './character-lookup';

export const CombatManagerInputSchema = z.object({
  playerAction: z.string(),
  locationId: z.string(),
  inCombat: z.boolean(),
  conversationHistory: z.string(),
  // These are optional and only provided when a combat is being initiated
  interpretedAction: ActionInterpreterOutputSchema.optional(),
  locationContext: z.any().optional(),
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
});


export const combatManagerTool = ai.defineTool(
    {
      name: 'combatManagerTool',
      description: 'Manages a sequence of turns in combat, starting from the current turn, until it is a human player\'s turn again or combat ends. It also handles the initiation of combat.',
      inputSchema: CombatManagerInputSchema,
      outputSchema: CombatManagerOutputSchema,
    },
    async (input) => {
        const { playerAction, inCombat, locationId, interpretedAction, locationContext, conversationHistory } = input;
        
        const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
        const diceRolls: Omit<DiceRoll, 'id' | 'timestamp'>[] = [];
        let updatedEnemies: any[] = [];
        const debugLogs: string[] = [];

        const localLog = (message: string) => {
            console.log(message);
            debugLogs.push(`CombatManager: ${message}`);
        };

        if (inCombat) {
            localLog("Continuing existing combat. (Logic to be implemented)");
            // TODO: Implement logic for subsequent combat turns.
            // For now, we'll just return the current state.
            return {
                messages,
                inCombat: true,
                debugLogs
            };
        }
        
        // ==== COMBAT INITIATION LOGIC ====
        localLog("Initiating new combat sequence.");

        if (!interpretedAction || !locationContext) {
            throw new Error("Combat initiation requires interpretedAction and locationContext.");
        }

        const adventureData = await getAdventureData();
        const allEntities = adventureData.entities;

        const combatantEntities = new Set<any>();
        
        const directTarget = allEntities.find((e: any) => e.id === interpretedAction.targetId || e.name === interpretedAction.targetId);
        if (directTarget) {
            combatantEntities.add(directTarget);
            localLog(`Direct target '${directTarget.name}' added to combat.`);
        }
        
        const entitiesInLocation = locationContext.entitiesPresent || [];
        entitiesInLocation.forEach((entityId: string) => {
            const entity = allEntities.find((e: any) => e.id === entityId);
            if (entity && entity.type === 'monster') {
                combatantEntities.add(entity);
                localLog(`Entity '${entity.name}' added to combat because it is a 'monster'.`);
            }
        });
        
        const hostileEntitiesInLocation = Array.from(combatantEntities);

        if (hostileEntitiesInLocation.length === 0) {
            localLog("Attack action received, but no hostile enemies were identified.");
            messages.push({ sender: 'DM', content: "Atacas fervientemente al aire, pero no parece haber ninguna amenaza real a la vista." });
            return { messages, inCombat: false, debugLogs };
        }
        
        localLog(`Found ${hostileEntitiesInLocation.length} hostile targets: ${hostileEntitiesInLocation.map((e:any) => e.name).join(', ')}.`);

        messages.push({ sender: 'System', content: `¡Comienza el Combate!` });
        const combatantsForInit: { id: string, name: string, type: 'player' | 'npc' }[] = [];
        
        const partyMembers: any = await characterLookupTool({});
        if (Array.isArray(partyMembers)) {
            partyMembers.forEach(p => {
                combatantsForInit.push({ id: p.id, name: p.name, type: 'player' });
            });
        }
        
        updatedEnemies = hostileEntitiesInLocation.map((e: any, index: number) => ({
            ...e, 
            uniqueId: `${e.id}-${index}`,
        }));

        updatedEnemies.forEach(e => {
            combatantsForInit.push({ id: e.uniqueId, name: e.name, type: 'npc' });
        });
        
        const initiativeRolls: { id: string, name: string, total: number, type: 'player' | 'npc' }[] = [];
        for (const combatant of combatantsForInit) {
            let dex = 10;
            if (combatant.type === 'player') {
                const charData: any = await characterLookupTool({ characterName: combatant.name, fields: ['abilityScores'] });
                if (charData) dex = charData.abilityScores.destreza;
            } else {
                dex = 12; 
            }
            
            const dexModifier = Math.floor((dex - 10) / 2);
            const roll = await diceRollerTool({ roller: combatant.name, rollNotation: `1d20+${dexModifier}`, description: 'Iniciativa' });
            diceRolls.push(roll);
            initiativeRolls.push({ id: combatant.id, name: combatant.name, total: roll.totalResult, type: combatant.type });
        }
        
        initiativeRolls.sort((a, b) => b.total - a.total);
        const initiativeOrder: Combatant[] = initiativeRolls.map(r => ({ id: r.id, characterName: r.name, total: r.total, type: r.type }));
        
        localLog(`Initiative order: ${JSON.stringify(initiativeOrder.map(c => c.characterName))}`);
        
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
            updatedParty: narrativeResult.updatedCharacterStats ? JSON.parse(narrativeResult.updatedCharacterStats) : undefined,
            updatedEnemies: updatedEnemies.map(e => ({...e, hp: { current: '?', max: '?'}})),
            inCombat: true,
            initiativeOrder,
            enemies: updatedEnemies.map(e => ({...e, hp: { current: '?', max: '?'}})),
            debugLogs,
        };

        const logSummary = {
            messages: finalResult.messages?.length,
            diceRolls: finalResult.diceRolls?.length,
            initiativeOrder: finalResult.initiativeOrder?.length,
            inCombat: finalResult.inCombat,
        };
        localLog(`Data being returned from CombatManager: ${JSON.stringify(logSummary)}`);
        
        return finalResult;
    }
);
