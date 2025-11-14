
/**
 * @fileOverview A Genkit tool that intelligently determines the participants of a combat encounter.
 * 
 * IMPORTANT DESIGN DECISION:
 * The AI (LLM) ALWAYS decides which combatants participate in combat. This tool does NOT force
 * inclusion of entities - it trusts the AI's contextual understanding to make the right decision.
 * 
 * The AI considers:
 * - The location description and context
 * - The player's action and intent
 * - Which entities are present in the location
 * - Whether entities are described as a group
 * - Whether nearby hostile entities would naturally join combat
 * 
 * This allows for nuanced scenarios where not all entities might participate (e.g., if some
 * are too far away, neutral, or the combat is very specific to certain entities).
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
  updatedEnemies: z.array(z.any()).optional().describe("Array of enemies with current HP status to filter out dead entities."),
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
    const { locationId, targetId, playerAction, locationContext, party, updatedEnemies } = input;
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

    // Issue #27: Filter out dead enemies from entitiesPresent
    // locationContext.entitiesPresent permanece intacto (incluye cadáveres)
    // Filtramos SOLO para selección de combatientes
    const allEntityIds = Array.isArray(locationContext.entitiesPresent) ? locationContext.entitiesPresent : [];
    const aliveEntityIds = updatedEnemies 
        ? allEntityIds.filter(id => {
            const enemy = updatedEnemies.find((e: any) => e.id === id || (e as any).uniqueId === id);
            // Si el enemigo existe en updatedEnemies, verificar HP
            // Si NO existe, asumir vivo (nuevo enemigo o primer combate)
            return !enemy || (enemy.hp && enemy.hp.current > 0);
        })
        : allEntityIds; // Si no hay updatedEnemies, asumir todos vivos (primer combate)
    
    const entityIdsInLocation = aliveEntityIds;
    
    if (updatedEnemies && aliveEntityIds.length < allEntityIds.length) {
        localLog(`Filtered ${allEntityIds.length - aliveEntityIds.length} dead enemies from combat selection.`);
    }

    const systemPrompt = `You are a component in a larger system. Your ONLY job is to select which characters and creatures should be in a combat encounter based on a list of available IDs.\n\n**CONTEXT**\n- Player's Party Member IDs: ${JSON.stringify(partyIds)}\n- Non-Player Entity IDs available in the current location (ALIVE ONLY): ${JSON.stringify(entityIdsInLocation)}\n- Location Description: ${locationContext.description}\n- Player's Action: "${playerAction}"\n- Direct Target ID: "${targetId}" ${targetId ? '(This is the INITIAL target only - other hostile entities will join combat)' : '(No specific target mentioned - player initiated generic combat)'}\n\n**IMPORTANT:** The 'Non-Player Entity IDs' list has been pre-filtered to include ONLY living entities. Dead enemies are not included (but their corpses remain in the location for narrative purposes).\n\n**RULES**\n1.  **CRITICAL:** Your output, the 'combatantIds' array, MUST ONLY contain the exact string IDs provided in the 'Player\'s Party Member IDs' and 'Non-Player Entity IDs' lists.\n2.  **DO NOT** invent, shorten, simplify, or guess IDs. Use the exact, full strings from the provided lists. For example, if an ID is "goblin_1", you must use "goblin_1", not "goblin" or "1".\n3.  All party members are always involved in combat. You MUST include all IDs from the 'Player\'s Party Member IDs' list in your output.\n4.  **CRITICAL - ALL HOSTILE ENTITIES:** If there are multiple hostile entities (monsters, enemies) present in the same location, and combat is initiated, you MUST include ALL of them in the combat. This is because:\n   - Hostile entities in the same location will naturally join combat when one is attacked\n   - Even if the player targets only one enemy (or no specific enemy), nearby hostile entities will react and join the fight\n   - The 'Non-Player Entity IDs available in the current location' list contains ALL LIVING entities present, and if they are hostile, they should all participate\n   - **DO NOT** assume that only the 'Direct Target ID' is involved - that is just the initial focus, not the only enemy\n5.  Analyze the 'Location Description' and 'Player's Action' to understand the context, but remember: if multiple hostile entities are in the same location, include them all.\n6.  If entities are described as a group (e.g., "a pack", "a pair", "two goblins and an orc"), an attack on one should include all of them.\n7.  **IMPORTANT - Understanding the Direct Target ID:**\n   - The 'Direct Target ID' is ONLY the initial target that the player mentioned (if any)\n   - It is NOT the only enemy that should participate\n   - If the player said "atacamos" without specifying a target, the 'Direct Target ID' may be null or a fallback - this does NOT mean only that enemy should participate\n   - ALL hostile entities in the location should participate, regardless of what the 'Direct Target ID' is\n\n**TASK**\nBased on all the context and strictly following all the rules, return a JSON object with the 'combatantIds' field containing the final list of all entity IDs that should be in combat. Remember: if multiple hostile entities are present in the location, include ALL of them, regardless of the 'Direct Target ID'.\n`;

    localLog(`Generated prompt for IA. Valid party IDs: [${partyIds.join(', ')}]. Valid entity IDs: [${entityIdsInLocation.join(', ')}]`);

    const llmResponse = await ai.generate({
      prompt: systemPrompt,
      output: {
        schema: z.object({ combatantIds: z.array(z.string()) }),
      }
    });
    
    const llmCombatantIds = llmResponse.output?.combatantIds || [];
    localLog(`IA recommended ${llmCombatantIds.length} combatants: [${llmCombatantIds.join(', ')}]`);

    // IMPORTANT: The AI decides which combatants participate. We trust its decision.
    // The final list includes party (always) + AI-recommended entities
    const finalCombatantIds = new Set([...partyIds, ...llmCombatantIds]);
    
    localLog(`Final list of combatants includes party. Total: ${finalCombatantIds.size} participants.`);

    return {
      combatantIds: Array.from(finalCombatantIds),
      debugLogs,
    };
  }
);
