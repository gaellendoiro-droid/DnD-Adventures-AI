
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

// This prompt no longer needs tools. All context is provided directly.
const actionInterpreterPrompt = ai.definePrompt({
    name: 'actionInterpreterPrompt',
    input: { schema: z.object({ 
        playerAction: z.string(), 
        locationContext: z.string(), 
        party: ActionInterpreterInputSchema.shape.party,
        allLocationNames: z.array(z.string()), // Provide all possible location names
    }) },
    output: { schema: ActionInterpreterOutputSchema },
    prompt: `You are an expert action interpreter for a D&D game. Your ONLY job is to determine the player's intent and return a structured JSON object. You must follow a strict priority flow.

**Directives & Priority Flow:**

1.  **PRIORITY 1: Out-of-Character (OOC) Check:**
    *   If the player's action starts with \`//\`, you MUST classify the action as 'ooc'. The 'targetId' is irrelevant. Stop here.

2.  **PRIORITY 2: Attack:**
    *   Analyze for a clear intent to attack.
    *   If detected, classify as 'attack' and identify the target from the context. Stop here.

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

            // STEP 2: Call the LLM with all context provided. No tools needed.
            const llmResponse = await actionInterpreterPrompt({
                playerAction: input.playerAction,
                locationContext: input.locationContext,
                party: input.party,
                allLocationNames: allLocationNames,
            });
            
            let output = llmResponse.output;

            if (!output) {
                const msg = "ActionInterpreter: CRITICAL - AI returned null output. Defaulting to 'narrate'.";
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
            const msg = `ActionInterpreter: CRITICAL - Flow failed. Error: ${e.message}. Defaulting to 'narrate'.`;
            log.error(msg, { module: 'AIFlow', flow: 'actionInterpreter' }, e);
            debugLogs.push(msg);
            return { interpretation: { actionType: 'narrate' }, debugLogs };
        }
    }
);

export async function actionInterpreter(input: ActionInterpreterInput): Promise<{interpretation: ActionInterpreterOutput, debugLogs: string[]}> {
    return actionInterpreterFlow(input);
}
