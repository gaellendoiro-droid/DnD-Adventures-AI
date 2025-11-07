
'use server';
/**
 * @fileOverview A specialized AI flow to interpret player actions.
 * It determines the player's intent (move, interact, attack, etc.)
 * and returns a structured object for the game coordinator to process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input Schema
const ActionInterpreterInputSchema = z.object({
  playerAction: z.string().describe('The action taken by the player.'),
  locationContext: z.string().describe('A JSON string with the full data of the current location, including its exits, interactable objects and entities present.'),
});
export type ActionInterpreterInput = z.infer<typeof ActionInterpreterInputSchema>;

// Output Schema
const ActionInterpreterOutputSchema = z.object({
  actionType: z.enum(['move', 'interact', 'attack', 'narrate', 'ooc']).describe("The interpreted type of the player's action."),
  targetId: z.string().optional().nullable().describe("The ID of the target for the action. For 'move', it's the destination ID. For 'attack', the entity ID. For 'interact', it's the specific interaction action name (e.g., 'Leer Misión de la Colina del Resentimiento')."),
});
export type ActionInterpreterOutput = z.infer<typeof ActionInterpreterOutputSchema>;


const actionInterpreterPrompt = ai.definePrompt({
    name: 'actionInterpreterPrompt',
    input: { schema: z.object({ playerAction: z.string(), locationContext: z.string() }) },
    output: { schema: ActionInterpreterOutputSchema },
    prompt: `You are an expert action interpreter for a D&D game. Your ONLY job is to determine the player's intent and return a structured JSON object.

**Directives:**
1.  **Analyze the Player's Action:** Read the player's action carefully.
2.  **Out-of-Character (OOC):** If the action starts with \`//\`, classify it as 'ooc'. The targetId is irrelevant.
3.  **Movement:** Compare the action to the \`exits\` in \`locationContext\`. If it matches an intent to move, classify as 'move' and set 'targetId' to the destination's \`toLocationId\`.
4.  **Attack:** If the action is an attack (e.g., "ataco al orco"), classify as 'attack' and set 'targetId' to the creature's name (e.g., "orco").
5.  **Interaction (Very Specific):**
    *   If the player wants to interact with an object or person (e.g., "hablo con el posadero", "miro el tablón", "que pone en la mision X"), look at the \`interactables\` in \`locationContext\`.
    *   Find the specific \`interactionResults.action\` that most closely matches the player's intent.
    *   If the player action is generic (e.g., "miro el tablón"), and there are multiple interaction options, **default to the FIRST interaction action available** (e.g., "Leer anuncios (General)").
    *   Classify the action as 'interact' and set 'targetId' to the **exact string of that specific sub-action** (e.g., "Leer Misión de la Colina del Resentimiento", "Leer anuncios (General)").
6.  **Default to Narration:** If none of the above apply, it's a general descriptive action. Classify it as 'narrate'.

**Location Context:**
\`\`\`json
{{{locationContext}}}
\`\`\`

**Player Action:**
"{{{playerAction}}}"

Determine the player's intent. If it's an interaction, find the **most specific interaction action** from the context and use its exact name as the targetId. If the interaction is generic, use the first available interaction action.
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
