
'use server';
/**
 * @fileOverview The central AI coordinator for the D&D game.
 * This flow is the main entry point for all player actions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { oocAssistant } from './ooc-assistant';
import { combatManager } from '../tools/combat-manager';
import type { GameMessage, DiceRoll, InitiativeRoll } from '@/lib/types';
import { markdownToHtml } from './markdown-to-html';
import { narrativeExpert } from './narrative-expert';
import { lookupAdventureEntityInDb } from '@/app/game-state-actions';
import { CombatManagerInputSchema, CombatManagerOutputSchema } from '../tools/combat-manager';

const combatManagerTool = ai.defineTool(
  {
    name: 'combatManagerTool',
    description: 'Manages a sequence of turns in combat, starting from the current turn, until it is a human player\'s turn again or combat ends.',
    inputSchema: CombatManagerInputSchema,
    outputSchema: CombatManagerOutputSchema,
  },
  combatManager
);

// Schemas for the main coordinator flow
const GameCoordinatorInputSchema = z.object({
  playerAction: z.string(),
  party: z.array(z.any()), // Using any to avoid circular dependencies with Character type
  locationId: z.string(),
  inCombat: z.boolean(),
  initiativeOrder: z.array(z.any()),
  enemies: z.array(z.any()),
  turnIndex: z.number(),
  gameState: z.string(),
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

async function gameCoordinatorFlow(input: GameCoordinatorInput): Promise<GameCoordinatorOutput> {
    const { playerAction, inCombat, conversationHistory, gameState, locationId, party, log = () => {} } = input;
    
    log(`GameCoordinator: Received action: "${playerAction}". InCombat: ${inCombat}.`);
    
    // 1. Handle Out-of-Character (OOC) queries first
    if (playerAction.startsWith('//')) {
      log("GameCoordinator: OOC query detected. Calling OOC Assistant...");
      const oocResult = await oocAssistant({
        playerQuery: playerAction.substring(2).trim(),
        conversationHistory,
        gameState,
      });
      (oocResult.debugLogs || []).forEach(log);

      return {
        messages: [{
            sender: 'DM',
            content: `(OOC) ${oocResult.dmReply}`
        }],
      };
    }
    
    // 2. Handle Combat mode
    if (inCombat) {
        log("GameCoordinator: Combat mode detected. Looking up location data...");
        const locationData = await lookupAdventureEntityInDb(locationId, gameState);
        log("GameCoordinator: Calling Combat Manager Tool...");
        const combatResult = await combatManagerTool({
            ...input,
            locationDescription: locationData?.description || "una zona de combate",
        });
        (combatResult.debugLogs || []).forEach(log);
        return { ...combatResult };
    }

    // 3. Handle transition to combat from Narrative mode
    const attackRegex = /ataca a|atacar a|ataco al|ataco a la|pego a|disparo a/i;
    if (attackRegex.test(playerAction)) {
      log(`GameCoordinator: Attack action detected ("${playerAction}"). Attempting to start combat.`);
      const targetName = playerAction.split(attackRegex)[1].trim();
      log(`GameCoordinator: Extracted target name: "${targetName}". Looking up location data...`);
      const locationData = await lookupAdventureEntityInDb(locationId, gameState);
      
      const targetEntity = locationData?.entitiesPresent?.find((e: string) => e.toLowerCase().includes(targetName.toLowerCase()))
      
      if (targetEntity) {
          log(`GameCoordinator: Valid target entity ID '${targetEntity}' found in location. Looking up all entities present for combat...`);
          
          let identifiedEnemies: any[] = [];
          if (locationData.entitiesPresent.length > 0) {
              for (const name of locationData.entitiesPresent) {
                  log(`GameCoordinator: Looking up enemy data for '${name}'...`);
                  const enemyData = await lookupAdventureEntityInDb(name, gameState);
                  if (enemyData) {
                      const enemyWithStats = {
                          ...enemyData,
                          id: `${enemyData.id}-${Math.random().toString(36).substring(2, 9)}`,
                          hp: { current: 30, max: 30 }, // Placeholder HP
                          abilityScores: { destreza: 10, ...enemyData.abilityScores },
                      };
                      identifiedEnemies.push(enemyWithStats);
                      log(`GameCoordinator: Added '${name}' to combatant list.`);
                  } else {
                      log(`GameCoordinator: WARNING - Could not find data for entity '${name}' in location.`);
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
          };
      }
    }

    // 4. Handle Narrative/Exploration mode
    log("GameCoordinator: Narrative mode detected. Looking up location data...");
    const locationData = await lookupAdventureEntityInDb(locationId, gameState);
    log("GameCoordinator: Location data found. Calling Narrative Expert...");
    
    const narrativeInput = {
        playerAction: input.playerAction,
        partyJson: JSON.stringify(input.party),
        gameState, 
        locationId: input.locationId,
        locationContext: JSON.stringify(locationData),
        characterStats: JSON.stringify(input.party.find(c => c.controlledBy === 'Player')),
        conversationHistory: input.conversationHistory,
        log: log,
    };
    
    const narrativeResult = await narrativeExpert(narrativeInput);
    (narrativeResult.debugLogs || []).forEach(log);

    const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
    
    // Process narration
    if (narrativeResult.narration) {
        messages.push({
            sender: 'DM',
            content: narrativeResult.narration,
        } as Omit<GameMessage, 'id' | 'timestamp'>);
    }

    // Process character stat updates
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
    
    log("GameCoordinator: Turn finished successfully.");
    return {
      messages,
      updatedParty,
      nextLocationId: narrativeResult.nextLocationId,
    };
}


export async function gameCoordinator(input: GameCoordinatorInput): Promise<GameCoordinatorOutput> {
    return gameCoordinatorFlow(input);
}
