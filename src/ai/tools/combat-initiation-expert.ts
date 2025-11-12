
/**
 * @fileOverview A Genkit tool that intelligently determines the participants of a combat encounter.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { CharacterSchema } from '@/lib/schemas'; // CORRECT: Import the single source of truth.
import { log } from '@/lib/logger';


export const CombatInitiationExpertInputSchema = z.object({
  locationId: z.string(),
  targetId: z.string(),
  playerAction: z.string(),
  locationContext: z.any(),
  party: z.array(CharacterSchema).describe("The array of character objects representing the player's party."),
});

export const CombatInitiationExpertOutputSchema = z.object({
  combatantIds: z.array(z.string()).describe('The IDs of all entities that should be included in the combat.'),
  debugLogs: z.array(z.string()).optional(),
});

export const combatInitiationExpertTool = ai.defineTool(
  {
    name: 'combatInitiationExpertTool',
    description: 'Analyzes the context of an attack to determine all participants that should be drawn into combat. This includes the player party and any relevant hostile entities.',
    inputSchema: CombatInitiationExpertInputSchema,
    outputSchema: CombatInitiationExpertOutputSchema,
  },
  async (input) => {
    const { locationId, targetId, playerAction, locationContext, party } = input;
    const debugLogs: string[] = [];
    const localLog = (message: string) => {
        log.aiTool('combatInitiationExpertTool', message, { 
            locationId,
            targetId,
        });
        debugLogs.push(`CombatInitiationExpert: ${message}`);
    };

    log.aiTool('combatInitiationExpertTool', 'Evaluating combat participants', { 
        locationId,
        targetId,
        partySize: party.length,
    });
    localLog('Tool started. Evaluating combat participants.');

    const partyIds = Array.isArray(party) ? party.map(p => p.id) : [];
    localLog(`Received party data directly. Party IDs: ${JSON.stringify(partyIds)}`);

    // CORRECTED: Directly use the array of strings, as that is the correct data type.
    const entityIdsInLocation = Array.isArray(locationContext.entitiesPresent) ? locationContext.entitiesPresent : [];

    const systemPrompt = `You are a component in a larger system. Your ONLY job is to select which characters and creatures should be in a combat encounter based on a list of available IDs.\n\n**CONTEXT**\n- Player's Party Member IDs: ${JSON.stringify(partyIds)}\n- Non-Player Entity IDs available in the current location: ${JSON.stringify(entityIdsInLocation)}\n- Full context of entities in the location: ${JSON.stringify(locationContext.entitiesPresent)}\n- Location Description: ${locationContext.description}\n- Player's Action: "${playerAction}"\n- Direct Target ID: "${targetId}"\n\n**RULES**\n1.  **CRITICAL:** Your output, the 'combatantIds' array, MUST ONLY contain the exact string IDs provided in the 'Player\'s Party Member IDs' and 'Non-Player Entity IDs' lists.\n2.  **DO NOT** invent, shorten, simplify, or guess IDs. Use the exact, full strings from the provided lists. For example, if an ID is "goblin_1", you must use "goblin_1", not "goblin" or "1".\n3.  All party members are always involved in combat. You MUST include all IDs from the 'Player\'s Party Member IDs' list in your output.\n4.  Analyze the 'Location Description' and 'Player's Action' to decide which of the 'Non-Player Entity IDs' should be included. If entities are described as a group (e.g., "a pack", "a pair"), an attack on one should include all of them.\n\n**TASK**\nBased on all the context and strictly following all the rules, return a JSON object with the 'combatantIds' field containing the final list of all entity IDs that should be in combat.\n`;

    localLog(`Generated prompt for IA. Valid party IDs: [${partyIds.join(', ')}]. Valid entity IDs: [${entityIdsInLocation.join(', ')}]`);

    const llmResponse = await ai.generate({
      prompt: systemPrompt,
      output: {
        schema: z.object({ combatantIds: z.array(z.string()) }),
      }
    });
    
    const llmCombatantIds = llmResponse.output?.combatantIds || [];
    localLog(`IA recommended ${llmCombatantIds.length} combatants: [${llmCombatantIds.join(', ')}]`);

    const finalCombatantIds = new Set([...partyIds, ...llmCombatantIds]);
    
    localLog(`Final list of combatants includes party. Total: ${finalCombatantIds.size} participants.`);

    return {
      combatantIds: Array.from(finalCombatantIds),
      debugLogs,
    };
  }
);
