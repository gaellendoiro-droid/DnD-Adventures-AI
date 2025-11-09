

/**
 * @fileOverview A Genkit tool that manages a full round or turn of combat.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { enemyTacticianTool } from './enemy-tactician';
import type { GameMessage, DiceRoll, Combatant } from '@/lib/types';
import { companionExpertTool } from './companion-expert';
import { diceRollerTool } from './dice-roller';
import { CharacterSchema, CharacterSummarySchema } from '@/lib/schemas';
import { getAdventureData } from '@/app/game-state-actions';
import { ActionInterpreterOutputSchema } from '../flows/schemas';
import { narrativeExpert } from '../flows/narrative-expert';
import { markdownToHtml } from '../flows/markdown-to-html';

export const CombatManagerInputSchema = z.object({
  playerAction: z.string(),
  party: z.array(CharacterSchema),
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
    updatedParty: z.array(z.any()),
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
        const { playerAction, party, inCombat, locationId, interpretedAction, locationContext, conversationHistory } = input;
        
        const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
        const diceRolls: Omit<DiceRoll, 'id' | 'timestamp'>[] = [];
        let updatedParty = [...party];
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
                updatedParty,
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
        const entitiesInLocation = locationContext.entitiesPresent || [];

        // Condition 1: The direct target of the attack is always a combatant.
        const directTarget = allEntities.find((e: any) => e.id === interpretedAction.targetId);
        if (directTarget) {
            combatantEntities.add(directTarget);
            localLog(`Direct target '${directTarget.name}' added to combat.`);
        }
        
        // Condition 2: Any entity present with type 'monster' is also a combatant.
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
            return { messages, updatedParty, inCombat: false, debugLogs };
        }
        
        localLog(`Found ${hostileEntitiesInLocation.length} hostile targets: ${hostileEntitiesInLocation.map((e:any) => e.name).join(', ')}.`);

        // --- Initiative Roll ---
        messages.push({ sender: 'System', content: `¡Comienza el Combate!` });
        const combatantsForInit: { id: string, name: string, type: 'player' | 'npc', dex: number }[] = [];
        
        party.forEach(p => {
            combatantsForInit.push({ id: p.id, name: p.name, type: 'player', dex: p.abilityScores.destreza });
        });
        
        updatedEnemies = hostileEntitiesInLocation.map((e: any, index: number) => ({
            ...e, 
            uniqueId: `${e.id}-${index}`, // Unique ID for this combat instance
            dex: 12, // HACK: Using fixed dexterity. 
        }));

        updatedEnemies.forEach(e => {
            combatantsForInit.push({ id: e.uniqueId, name: e.name, type: 'npc', dex: e.dex });
        });
        
        const initiativeRolls: { id: string, name: string, total: number, type: 'player' | 'npc' }[] = [];
        for (const combatant of combatantsForInit) {
            const dexModifier = Math.floor((combatant.dex - 10) / 2);
            const roll = await diceRollerTool({ roller: combatant.name, rollNotation: `1d20+${dexModifier}`, description: 'Iniciativa' });
            diceRolls.push(roll);
            initiativeRolls.push({ id: combatant.id, name: combatant.name, total: roll.total, type: combatant.type });
        }
        
        initiativeRolls.sort((a, b) => b.total - a.total);
        const initiativeOrder: Combatant[] = initiativeRolls.map(r => ({ id: r.id, characterName: r.name, total: r.total, type: r.type }));
        
        localLog(`Initiative order: ${JSON.stringify(initiativeOrder.map(c => c.characterName))}`);
        
        // --- First Action Narration ---
        const partySummary = party.map(c => ({ id: c.id, name: c.name, race: c.race, class: c.class, sex: c.sex, personality: c.personality, controlledBy: c.controlledBy }));
        
        localLog("Narrating the first action of combat...");
        const narrativeResult = await narrativeExpert({
             playerAction: playerAction,
             partySummary: partySummary,
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

        // TODO: This is where we would start the turn loop for NPCs if the player isn't first.
        // For now, we will return control to the player.
        localLog("Combat initiated. Returning control.");

        return {
            messages,
            diceRolls,
            updatedParty,
            updatedEnemies: updatedEnemies.map(e => ({...e, hp: { current: '?', max: '?'}})), // Don't reveal full HP yet
            inCombat: true,
            initiativeOrder,
            enemies: updatedEnemies.map(e => ({...e, hp: { current: '?', max: '?'}})), // Send enemy list to client
            debugLogs,
        };
    }
);
