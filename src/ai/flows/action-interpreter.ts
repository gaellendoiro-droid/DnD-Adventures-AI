
'use server';
/**
 * @fileOverview A specialized AI flow to interpret player actions.
 * This version uses a more robust, two-step process to generate interpretations.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { ActionInterpreterInputSchema, ActionInterpreterOutputSchema, type ActionInterpreterInput, type ActionInterpreterOutput } from '@/ai/flows/schemas';
import { getAdventureData } from '@/app/game-state-actions';
import { log } from '@/lib/logger';
import { executePromptWithRetry } from './retry-utils';

// This prompt no longer needs tools. All context is provided directly.
const actionInterpreterPrompt = ai.definePrompt({
    name: 'actionInterpreterPrompt',
    input: { schema: z.object({ 
        playerAction: z.string(), 
        locationContext: z.string(), 
        party: ActionInterpreterInputSchema.shape.party,
        allLocationNames: z.array(z.string()), // Provide all possible location names
        updatedEnemies: z.array(z.any()).optional(),
    }) },
    output: { schema: ActionInterpreterOutputSchema },
    prompt: `You are an expert action interpreter for a D&D game. Your ONLY job is to determine the player's intent and return a structured JSON object. You must follow a strict priority flow.

**Directives & Priority Flow:**

1.  **PRIORITY 1: Out-of-Character (OOC) Check:**
    *   If the player's action starts with \`//\`, you MUST classify the action as 'ooc'. The 'targetId' is irrelevant. Stop here.

2.  **PRIORITY 2: Attack:**
    *   Analyze for a clear intent to attack.
    *   If detected, classify as 'attack'.
    *   **IMPORTANT - Target Identification:**
    *     - **Combat State Priority:** If 'updatedEnemies' is provided, look there FIRST. It contains the current state of combatants with unique IDs (e.g., "Goblin 2", "Orc 1"). Match the player's target (e.g., "ataco al goblin 2") to the 'id' or 'name' in 'updatedEnemies'.
    *     - If the player explicitly mentions a specific target (e.g., "ataco al goblin", "ataco a la mantícora"), use that target's ID from 'updatedEnemies' or 'entitiesPresent'.
    *     - If the player's action is generic (e.g., "atacamos", "ataco", "luchamos") without specifying a target, you MAY leave 'targetId' as null or use the first hostile entity ID as a fallback.
    *     - The 'targetId' is just the INITIAL target - other hostile entities in the location will join combat automatically.
    *   Stop here.

3.  **PRIORITY 3: Interaction with a Companion:**
    *   Analyze if the action is directed at a companion from the 'Player's Party' list.
    *   If so, classify as 'interact' and use the companion's name as 'targetId'. Stop here.

4.  **PRIORITY 4: Movement - Local Exits:**
    *   Analyze for movement intent (e.g., "vamos a").
    *   If the destination matches a local \`exits\` description, classify as 'move' and use the \`toLocationId\`. Stop here.

5.  **PRIORITY 5: Interaction with a Local Object:**
    *   Analyze if the action targets a local object/entity from \`interactables\` or \`entitiesPresent\`.
    *   If so, classify as 'interact' and find the most specific 'interactionResults.action' string for 'targetId'. Stop here.

6.  **PRIORITY 6: Movement - Global Search (Fuzzy Match):**
    *   If movement intent was detected but didn't match a local exit, compare the player's destination to the provided 'allLocationNames' list.
    *   Find the best fuzzy match from the list. For example, if the player says "vamos a la colina", and the list has "Colina del Resentimiento", you should match it.
    *   If you find a strong match, classify as 'move' and use the matched name from the list as the 'targetId'. Stop here.

7.  **PRIORITY 7: Default to Narration:**
    *   If none of the above apply, classify as 'narrate' and leave 'targetId' null.

**CONTEXT:**
- Player's Party: \`\`\`json
{{{json party}}}
\`\`\`
- Updated Enemies (Current Combat State): \`\`\`json
{{{json updatedEnemies}}}
\`\`\`
- Current Location: \`\`\`json
{{{locationContext}}}
\`\`\`
- All Possible Locations: {{{json allLocationNames}}}
- Player Action: "{{{playerAction}}}"

Determine the player's intent based on the strict priority flow above.
`,
});

export const actionInterpreterFlow = ai.defineFlow(
    {
      name: 'actionInterpreterFlow',
      inputSchema: ActionInterpreterInputSchema,
      outputSchema: z.object({
        interpretation: ActionInterpreterOutputSchema,
        debugLogs: z.array(z.string()),
      }),
    },
    async (input) => {
        const debugLogs: string[] = [];
        try {
            // STEP 1: Fetch all possible location names from the adventure data.
            const adventureData = await getAdventureData();
            if (!adventureData) {
                throw new Error("Failed to load adventure data for interpreter.");
            }
            const allLocationNames = adventureData.locations.map((l: any) => l.title);

            // STEP 2: Call the LLM with retry logic (Issue #13)
            let llmResponse;
            try {
                llmResponse = await executePromptWithRetry(
                    actionInterpreterPrompt,
                    {
                        playerAction: input.playerAction,
                        locationContext: input.locationContext,
                        party: input.party,
                        allLocationNames: allLocationNames,
                        updatedEnemies: input.updatedEnemies,
                    },
                    { flowName: 'actionInterpreter' }
                );
            } catch (retryError: any) {
                // All retries exhausted - implement intelligent fallback
                log.error('All retry attempts failed, using intelligent fallback', {
                    module: 'AIFlow',
                    flow: 'actionInterpreter',
                    error: retryError.message,
                    playerAction: input.playerAction,
                });
                
                // Intelligent fallback: simple pattern matching for common actions
                const actionLower = input.playerAction.toLowerCase().trim();
                const attackPatterns = ['ataco', 'atacar', 'atacamos', 'ataque', 'lucho', 'luchamos', 'golpeo', 'golpeamos'];
                const isAttack = attackPatterns.some(pattern => actionLower.includes(pattern));
                
                if (isAttack) {
                    // Check if player mentioned a specific target
                    let targetId: string | null = null;
                    const locationContextObj = typeof input.locationContext === 'string' 
                        ? JSON.parse(input.locationContext) 
                        : input.locationContext;
                    
                    if (locationContextObj?.entitiesPresent) {
                        // Issue #27: Filtrar enemigos muertos SOLO para interpretación de ataques
                        // locationContextObj.entitiesPresent permanece intacto (incluye cadáveres)
                        const aliveEntities = locationContextObj.entitiesPresent.filter((entity: any) => {
                            if (!input.updatedEnemies) return true; // Primer combate, asumir vivos
                            const enemy = input.updatedEnemies.find((e: any) => e.id === entity.id || (e as any).uniqueId === entity.id);
                            // Si existe en updatedEnemies y está muerto, excluir de ataques
                            // Si NO existe, asumir vivo (nuevo enemigo o primer combate)
                            return !enemy || (enemy.hp && enemy.hp.current > 0);
                        });
                        
                        if (aliveEntities.length === 0) {
                            // Todos los enemigos están muertos, no puede atacar
                            log.info('Fallback: No living enemies to attack', {
                                module: 'AIFlow',
                                flow: 'actionInterpreter',
                            });
                            return {
                                interpretation: { actionType: 'narrate', targetId: null },
                                debugLogs: ['Fallback: No hay enemigos vivos para atacar'],
                            };
                        }
                        
                        // Try to find target mention in player action (usar aliveEntities)
                        for (const entity of aliveEntities) {
                            const entityName = entity.name?.toLowerCase() || '';
                            if (entityName && actionLower.includes(entityName)) {
                                targetId = entity.id;
                                break;
                            }
                        }
                        
                        // If no specific target, use first alive hostile entity
                        if (!targetId && aliveEntities.length > 0) {
                            targetId = aliveEntities[0].id;
                        }
                    }
                    
                    log.info('Fallback detected attack action', {
                        module: 'AIFlow',
                        flow: 'actionInterpreter',
                        targetId,
                    });
                    
                    return {
                        interpretation: { actionType: 'attack', targetId },
                        debugLogs: [`Fallback: Detected attack action with target: ${targetId}`],
                    };
                }
                
                // Default fallback: narrate
                log.warn('Fallback defaulting to narrate', {
                    module: 'AIFlow',
                    flow: 'actionInterpreter',
                });
                
                return {
                    interpretation: { actionType: 'narrate' },
                    debugLogs: ['Fallback: Defaulting to narrate'],
                };
            }
            
            let output = llmResponse.output;

            if (!output) {
                const msg = "ActionInterpreter: AI returned null output. Defaulting to 'narrate'.";
                log.error(msg, { module: 'AIFlow', flow: 'actionInterpreter' });
                debugLogs.push(msg);
                output = { actionType: 'narrate' };
            }

            // Post-processing to map title back to ID if a global move was detected
            if (output.actionType === 'move' && output.targetId) {
                const matchedLocation = adventureData.locations.find((l: any) => l.title === output.targetId);
                if (matchedLocation) {
                    log.aiFlow('actionInterpreter', 'Mapped location title to ID', {
                        title: output.targetId,
                        id: matchedLocation.id,
                    });
                    output.targetId = matchedLocation.id;
                }
            }

            log.aiFlow('actionInterpreter', 'Action interpreted', {
                actionType: output.actionType,
                targetId: output.targetId,
            });
            debugLogs.push(`ActionInterpreter Raw Output: ${JSON.stringify(output)}`);
            return { interpretation: output, debugLogs };

        } catch (e: any) {
            const msg = `ActionInterpreter: Flow failed. Error: ${e.message}. Defaulting to 'narrate'.`;
            log.error(msg, { module: 'AIFlow', flow: 'actionInterpreter' }, e);
            debugLogs.push(msg);
            return { interpretation: { actionType: 'narrate' }, debugLogs };
        }
    }
);

export async function actionInterpreter(input: ActionInterpreterInput): Promise<{interpretation: ActionInterpreterOutput, debugLogs: string[]}> {
    return actionInterpreterFlow(input);
}
