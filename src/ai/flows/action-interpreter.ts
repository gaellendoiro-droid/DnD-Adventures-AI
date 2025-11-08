
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
    prompt: `You are an expert action interpreter for a D&D game. Your ONLY job is to determine the player's intent and return a structured JSON object. You must follow a strict logic flow.

**Directives & Logic Flow:**

1.  **Out-of-Character (OOC) Check:**
    *   If the player's action starts with \`//\`, you MUST classify the action as 'ooc'. The 'targetId' is irrelevant. Stop here.

2.  **Movement - Step 1 (Local Exits):**
    *   Analyze the player's action for movement intent (e.g., "vamos a", "entramos en", "ir a").
    *   If movement is intended, check if the destination in the player's action (e.g., "vamos a la posada", "entramos en Suministros Barthen") matches the \`description\` of any \`exits\` in the \`locationContext\`.
    *   If you find a match, you MUST classify the action as 'move' and use the exact \`toLocationId\` from that exit as the 'targetId'. Stop here.

3.  **Movement - Step 2 (Global Search - MANDATORY if Step 2 Fails):**
    *   If, and ONLY IF, you detected movement intent but did not find a match in the local exits, you MUST use the \`locationLookupTool\`.
    *   Use the player's destination as the query for the tool (e.g., "Colina del Resentimiento", "Adabra Gwynn").
    *   If the tool returns a location object, you MUST classify the action as 'move' and use the \`id\` from the returned location object as the 'targetId'. Stop here.

4.  **Interaction (If NOT Movement):**
    *   If, and ONLY IF, you have determined it is NOT a movement action after checking both local and global options, then evaluate it as an interaction.
    *   Find the most specific 'interactionResults.action' string from the 'interactables' in the 'locationContext' that matches the player's intent.
    *   If the action is generic (e.g., "miro el tablón"), use the most logical default action.
    *   Classify the action as 'interact' and set 'targetId' to that exact action string. Stop here.

5.  **Attack:**
    *   If the action is an attack (e.g., "ataco al orco"), classify as 'attack' and set 'targetId' to the creature's name (e.g., "orco"). Stop here.

6.  **Default to Narration:**
    *   If none of the above apply, and only as a last resort, classify it as 'narrate' and leave 'targetId' null.

**Location Context:**
\`\`\`json
{{{locationContext}}}
\`\`\`

**Player Action:**
"{{{playerAction}}}"

Determine the player's intent based on the strict logic flow above. Your highest priority is to resolve movement by checking local exits first, then performing a global search with the required tool.
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
