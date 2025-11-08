
'use server';
/**
 * @fileOverview A specialized AI flow to interpret player actions.
 * It determines the player's intent (move, interact, attack, etc.)
 * and returns a structured object for the game coordinator to process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { ActionInterpreterInputSchema, ActionInterpreterOutputSchema, type ActionInterpreterInput, type ActionInterpreterOutput } from './schemas';


const actionInterpreterPrompt = ai.definePrompt({
    name: 'actionInterpreterPrompt',
    input: { schema: z.object({ playerAction: z.string(), locationContext: z.string() }) },
    output: { schema: ActionInterpreterOutputSchema },
    prompt: `You are an expert action interpreter for a D&D game. Your ONLY job is to determine the player's intent and return a structured JSON object.

**Directives:**
1.  **Analyze the Player's Action:** Read the player's action carefully.
2.  **Out-of-Character (OOC):** If the action starts with \`//\`, classify it as 'ooc'. The targetId is irrelevant.
3.  **Movement (High Priority):** Check for explicit movement verbs (e.g., "ir", "vamos a", "dirigirse a", "viajar a", "entramos en"). If present, you MUST classify the action as 'move'. Compare the destination in the action to the \`description\` of the \`exits\` in the \`locationContext\`. Find the corresponding exit and use its exact \`toLocationId\` as the 'targetId'. This is critical.
4.  **Interaction (CRITICAL):** If the action is not a clear movement, evaluate it as an interaction.
    *   Your primary goal is to find the **most specific 'interactionResults.action' string** from the 'interactables' in the 'locationContext' that matches the player's intent.
    *   If the player's action is specific (e.g., "leo la misión de la colina del resentimiento", "¿qué pone sobre los enanos?"), find the corresponding interaction action in the JSON and use its **exact string value** as the 'targetId'.
    *   If the player's action is generic (e.g., "miro el tablón", "hablo con el posadero"), you MUST find the most logical default action for that interactable. **This will almost always be the FIRST action listed in its 'interactionResults' array** (e.g., "Leer anuncios (General)").
    *   Once you've identified the specific action string, classify the action as 'interact' and set 'targetId' to that **exact string**.
5.  **Attack:** If the action is an attack (e.g., "ataco al orco"), classify as 'attack' and set 'targetId' to the creature's name (e.g., "orco").
6.  **Default to Narration:** If none of the above apply (e.g., "desenvaino mi espada", "miro a mi alrededor"), it's a general descriptive action. Classify it as 'narrate' and leave targetId null.

**Location Context:**
\`\`\`json
{{{locationContext}}}
\`\`\`

**Player Action:**
"{{{playerAction}}}"

Determine the player's intent. If it is a movement action, you MUST use the 'toLocationId' from the exits context as the targetId. If it is an interaction, you MUST find the most specific 'interactionResults.action' from the context and use its exact string as the targetId. If the interaction is generic, use the first available interaction action.
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
