
'use server';
/**
 * @fileOverview A specialized AI flow to interpret player actions.
 * It determines the player's intent (move, interact, attack, etc.)
 * and returns a structured object for the game coordinator to process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { ActionInterpreterInputSchema, ActionInterpreterOutputSchema, type ActionInterpreterInput, type ActionInterpreterOutput } from './schemas';
import { locationLookupTool } from '../tools/location-lookup';


const actionInterpreterPrompt = ai.definePrompt({
    name: 'actionInterpreterPrompt',
    input: { schema: z.object({ playerAction: z.string(), locationContext: z.string() }) },
    output: { schema: ActionInterpreterOutputSchema },
    tools: [locationLookupTool],
    prompt: `You are an expert action interpreter for a D&D game. Your ONLY job is to determine the player's intent and return a structured JSON object. You MUST prioritize movement actions.

**Directives:**
1.  **Analyze the Player's Action:** Read the player's action carefully.
2.  **Out-of-Character (OOC):** If the action starts with \`//\`, classify it as 'ooc'. The targetId is irrelevant.
3.  **Movement (HIGHEST Priority):** Your primary goal is to determine if the player wants to move.
    a. **Local Exits:** First, check if the destination in the player's action (e.g., "vamos a la posada") matches the \`description\` of any \`exits\` in the \`locationContext\`. If you find a match, you MUST classify the action as 'move' and use the exact \`toLocationId\` from that exit as the 'targetId'.
    b. **Global Search (If No Local Exit):** If the destination is NOT in the local exits (e.g., "vamos a la Colina del Resentimiento" from the tavern), you MUST use the \`locationLookupTool\` with the player's destination as the query (e.g., "Colina del Resentimiento", "Adabra Gwynn").
       - If the tool returns a location object, you MUST classify the action as 'move' and use the \`id\` from the returned location object as the 'targetId'.
4.  **Interaction (If Not Movement):** If and ONLY IF you have determined it is NOT a movement action, evaluate it as an interaction.
    *   Find the **most specific 'interactionResults.action' string** from the 'interactables' in the 'locationContext' that matches the player's intent.
    *   If the action is generic (e.g., "miro el tablón"), use the most logical default action (usually the first one listed).
    *   Classify the action as 'interact' and set 'targetId' to that **exact action string**.
5.  **Attack:** If the action is an attack (e.g., "ataco al orco"), classify as 'attack' and set 'targetId' to the creature's name (e.g., "orco").
6.  **Default to Narration:** If none of the above apply, classify it as 'narrate' and leave targetId null.

**Location Context:**
\`\`\`json
{{{locationContext}}}
\`\`\`

**Player Action:**
"{{{playerAction}}}"

Determine the player's intent. Your highest priority is to resolve movement, using local exits first, and the locationLookupTool as a fallback.
`,
});


export const actionInterpreterFlow = ai.defineFlow(
    {
      name: 'actionInterpreterFlow',
      inputSchema: ActionInterpreterInputSchema,
      outputSchema: ActionInterpreterOutputSchema,
    },
    async (input) => {
        try {
            const { output } = await actionInterpreterPrompt(input);

            if (!output) {
                console.error("ActionInterpreter: CRITICAL - AI returned null output. Defaulting to 'narrate'.");
                return { actionType: 'narrate' };
            }
            return output;

        } catch (e: any) {
            console.error(`ActionInterpreter: CRITICAL - Flow failed. Error: ${e.message}. Defaulting to 'narrate'.`);
            return { actionType: 'narrate' };
        }
    }
);

export async function actionInterpreter(input: ActionInterpreterInput): Promise<ActionInterpreterOutput> {
    return actionInterpreterFlow(input);
}
