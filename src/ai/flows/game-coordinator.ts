
'use server';
/**
 * @fileOverview The central AI coordinator for the D&D game.
 * This flow is the main entry point for all player actions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { oocAssistant } from './ooc-assistant';
import { combatManagerTool } from '../tools/combat-manager';
import type { GameMessage, DiceRoll, InitiativeRoll } from '@/lib/types';
import { markdownToHtml } from './markdown-to-html';
import { narrativeExpert } from './narrative-expert';
import { getAdventureData } from '@/app/game-state-actions';
import { CharacterSummarySchema } from '@/lib/schemas';
import { companionExpertTool } from '../tools/companion-expert';
import { actionInterpreter } from './action-interpreter';


// Schemas for the main coordinator flow
const GameCoordinatorInputSchema = z.object({
  playerAction: z.string(),
  party: z.array(z.any()), // Using any to avoid circular dependencies with Character type
  locationId: z.string(),
  inCombat: z.boolean(),
  initiativeOrder: z.array(z.any()),
  enemies: z.array(z.any()),
  turnIndex: z.number(),
  conversationHistory: z.string(),
  log: z.function(z.tuple([z.string()]), z.void()).optional().describe("A function to log debug messages in real-time."),
});

const GameCoordinatorOutputSchema = z.object({
  messages: z.array(z.any()).optional(),
  diceRolls: z.array(z.any()).optional(),
  updatedParty: z.array(z.any()).optional(),
  updatedEnemies: z.array(z.any()).optional(),
  nextLocationId: z.string().optional().nullable(),
  startCombat: z.boolean().optional(),
  endCombat: z.boolean().optional(),
  nextTurnIndex: z.number().optional(),
  error: z.string().optional(),
  debugLogs: z.array(z.string()).optional(),
  // New fields for combat start
  initiativeOrder: z.array(z.any()).optional(),
  enemies: z.array(z.any()).optional(),
});

export type GameCoordinatorInput = z.infer<typeof GameCoordinatorInputSchema>;
export type GameCoordinatorOutput = z.infer<typeof GameCoordinatorOutputSchema>;


export const gameCoordinatorFlow = ai.defineFlow(
  {
    name: 'gameCoordinatorFlow',
    inputSchema: GameCoordinatorInputSchema,
    outputSchema: GameCoordinatorOutputSchema,
  },
  async (input) => {
    const { playerAction, inCombat, conversationHistory, party, log = () => {} } = input;
    let { locationId } = input;
    
    log(`GameCoordinator: Received action: "${playerAction}". InCombat: ${inCombat}. Location: ${locationId}.`);
    
    const adventureData = await getAdventureData();
    if (!adventureData) {
        throw new Error("Failed to load adventure data.");
    }
    
    const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
    
    // 1. Handle Combat mode
    if (inCombat) {
        const locationData = adventureData.locations.find((l: any) => l.id === locationId);
        log("GameCoordinator: Combat mode detected. Calling Combat Manager Tool...");
        const combatResult = await combatManagerTool({
            ...input,
            locationDescription: locationData?.description || "una zona de combate",
            conversationHistory,
        });
        (combatResult.debugLogs || []).forEach(log);
        return { ...combatResult };
    }

    // 2. Interpret Player Action
    const currentLocationData = adventureData.locations.find((l: any) => l.id === locationId);
    log("GameCoordinator: Calling ActionInterpreter...");
    const interpretation = await actionInterpreter({
        playerAction,
        locationContext: JSON.stringify(currentLocationData),
        log,
    });
    
    let newLocationId: string | null = null;
    let finalLocationData = currentLocationData;
    
    // 3. Process action based on interpretation
    switch(interpretation.actionType) {
        case 'ooc':
            log("GameCoordinator: OOC query detected. Calling OOC Assistant...");
            const oocResult = await oocAssistant({
                playerQuery: playerAction.substring(2).trim(),
                conversationHistory,
            });
            (oocResult.debugLogs || []).forEach(log);
            messages.push({ sender: 'DM', content: `(OOC) ${oocResult.dmReply}`});
            return { messages };

        case 'move':
            if (interpretation.targetId) {
                log(`GameCoordinator: Movement interpreted to '${interpretation.targetId}'.`);
                newLocationId = interpretation.targetId;
                locationId = newLocationId; // Update locationId for the current turn's context
                finalLocationData = adventureData.locations.find((l: any) => l.id === locationId);
            }
            // Now, fall through to narrate the arrival at the new location
            log(`GameCoordinator: Action is 'move', proceeding to Narrative Expert.`);
            break;
            
        case 'attack':
             log(`GameCoordinator: Attack action interpreted against "${interpretation.targetId}". Attempting to start combat.`);
             const targetName = interpretation.targetId || "";
             
             const targetEntity = adventureData.entities.find((e: any) => e.name.toLowerCase() === targetName.toLowerCase());
             const targetEntityId = targetEntity?.id;
      
              if (targetEntityId && finalLocationData?.entitiesPresent?.includes(targetEntityId)) {
                  log(`GameCoordinator: Valid target entity ID '${targetEntityId}' found in location. Looking up all entities present for combat...`);
                  
                  let identifiedEnemies: any[] = [];
                  if (finalLocationData.entitiesPresent.length > 0) {
                      for (const entityId of finalLocationData.entitiesPresent) {
                          log(`GameCoordinator: Looking up enemy data for '${entityId}'...`);
                          const enemyData = adventureData.entities.find((e: any) => e.id === entityId);
                          if (enemyData) {
                              const enemyWithStats = {
                                  ...enemyData,
                                  id: `${enemyData.id}-${Math.random().toString(36).substring(2, 9)}`,
                                  hp: { current: 30, max: 30 }, // Placeholder HP
                                  abilityScores: { destreza: 10, ...enemyData.abilityScores },
                              };
                              identifiedEnemies.push(enemyWithStats);
                              log(`GameCoordinator: Added '${enemyData.name}' to combatant list.`);
                          } else {
                              log(`GameCoordinator: WARNING - Could not find data for entity '${entityId}' in location.`);
                          }
                      }
                  }

                  if (identifiedEnemies.length === 0) {
                    log("GameCoordinator: CRITICAL - Attack action detected, but no valid enemies could be loaded for combat.");
                    return { error: "Intentaste atacar, pero no se encontró un objetivo válido en esta ubicación." };
                  }
                  
                  log("GameCoordinator: Calculating initiative...");
                  const combatants: (any)[] = [...party, ...identifiedEnemies];
                  const initiativeRolls: InitiativeRoll[] = combatants.map(c => {
                    const modifier = Math.floor(((c.abilityScores?.destreza || 10) - 10) / 2);
                    const roll = Math.floor(Math.random() * 20) + 1;
                    const combatantType: 'player' | 'npc' = party.some(p => p.id === c.id) ? 'player' : 'npc';
                    return {
                      characterName: c.name,
                      roll: roll,
                      modifier: modifier,
                      total: roll + modifier,
                      id: c.id,
                      type: combatantType,
                    }
                  });
              
                  const initiativeDiceRolls: Omit<DiceRoll, 'id' | 'timestamp'>[] = initiativeRolls.map(roll => ({
                      roller: roll.characterName,
                      rollNotation: `1d20${roll.modifier >= 0 ? '+' : ''}${roll.modifier}`,
                      individualRolls: [roll.roll],
                      modifier: roll.modifier,
                      totalResult: roll.total,
                      outcome: 'initiative' as const,
                      description: `Tirada de Iniciativa`
                  }));
                  
                  const sortedCombatants: any[] = initiativeRolls.sort((a, b) => b.total - a.total).map(r => ({id: r.id, characterName: r.characterName, total: r.total, type: r.type}));
                  log(`GameCoordinator: Initiative order determined: ${sortedCombatants.map(c => c.characterName).join(', ')}`);

                  return {
                    startCombat: true,
                    messages: [
                      { sender: 'DM', content: `¡Tu acción provoca un combate! La batalla contra ${identifiedEnemies.map(e => e.name).join(', ')} ha comenzado.`}
                    ],
                    diceRolls: initiativeDiceRolls,
                    initiativeOrder: sortedCombatants,
                    enemies: identifiedEnemies,
                    nextTurnIndex: 0,
                    nextLocationId: newLocationId,
                  };
              } else {
                 log(`GameCoordinator: Attack on "${targetName}" failed, target not present.`);
              }
              // Fall through to narrate the failed attack attempt.
              log(`GameCoordinator: Action is 'attack' but failed, proceeding to Narrative Expert.`);
              break;
        
        case 'interact':
        case 'narrate':
        default:
            // For these cases, we just proceed to the narrative expert.
            log(`GameCoordinator: Action is '${interpretation.actionType}', proceeding to Narrative Expert.`);
            break;
    }

    // 4. Generate Narrative
    log("GameCoordinator: Preparing to call Narrative Expert...");
    const partySummary = input.party.map(c => ({
        id: c.id,
        name: c.name,
        race: c.race,
        class: c.class,
        sex: c.sex,
        personality: c.personality,
        controlledBy: c.controlledBy,
    }));
    
    const narrativeInput = {
        playerAction: input.playerAction,
        partySummary: partySummary,
        locationId: locationId,
        locationContext: JSON.stringify(finalLocationData),
        conversationHistory: input.conversationHistory,
        log,
    };
    
    log(`GameCoordinator: Calling NarrativeExpert for location '${locationId}'...`);
    const narrativeResult = await narrativeExpert(narrativeInput);
    (narrativeResult.debugLogs || []).forEach(log);

    let dmNarrationHtml = "";
    if (narrativeResult.dmNarration) {
        log("GameCoordinator: Converting DM narration to HTML...");
        const { html } = await markdownToHtml({ markdown: narrativeResult.dmNarration });
        dmNarrationHtml = html;
        log("GameCoordinator: HTML conversion complete.");
        messages.push({
            sender: 'DM',
            content: dmNarrationHtml,
            originalContent: narrativeResult.dmNarration,
        });
    }

    // 5. Generate Companion Reactions
    const aiCompanions = party.filter(p => p.controlledBy === 'AI');
    log(`GameCoordinator: Checking for reactions from ${aiCompanions.length} AI companions.`);

    for (const companion of aiCompanions) {
        const companionSummary = partySummary.find(p => p.id === companion.id)!;
        log(`GameCoordinator: Calling CompanionExpert for ${companion.name}.`);
        
        // Build a more specific context for the companion
        const companionContext = `The player just did this: "${playerAction}"\n\nThe Dungeon Master described the result as: "${narrativeResult.dmNarration}"`;
        
        const companionResult = await companionExpertTool({
            characterSummary: companionSummary,
            context: companionContext,
            inCombat: false,
            enemies: [], // No enemies in narrative mode
            partySummary: partySummary,
        });

        if (companionResult.action) {
            log(`GameCoordinator: ${companion.name} reacts: "${companionResult.action}"`);
            messages.push({
                sender: 'Character',
                senderName: companion.name,
                characterColor: companion.color,
                content: companionResult.action,
            });
        }
    }

    // 6. Finalize Turn
    let updatedParty = input.party;
    if (narrativeResult.updatedCharacterStats) {
        const player = input.party.find(c => c.controlledBy === 'Player');
        if(player) {
            try {
                const updates = JSON.parse(narrativeResult.updatedCharacterStats);
                updatedParty = input.party.map(c => c.id === player.id ? { ...c, ...updates } : c);
            } catch (e) {
                console.warn("Invalid JSON in updatedCharacterStats, ignoring.", narrativeResult.updatedCharacterStats);
                log("GameCoordinator: WARNING - NarrativeExpert returned invalid JSON for updatedCharacterStats.");
            }
        }
    }
    
    log(`GameCoordinator: Turn finished successfully. Current location: ${locationId}`);
    return {
      messages,
      updatedParty,
      nextLocationId: newLocationId,
    };
  }
);


export async function gameCoordinator(input: GameCoordinatorInput): Promise<GameCoordinatorOutput> {
    return gameCoordinatorFlow(input);
}

    