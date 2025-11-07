
'use server';
/**
 * @fileOverview A specialized AI flow to interpret player actions.
 * It determines the player's intent (move, interact, attack, etc.)
 * and returns a structured object for the game coordinator to process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { adventureLookupTool } from '../tools/adventure-lookup';

// Input Schema
const ActionInterpreterInputSchema = z.object({
  playerAction: z.string().describe('The action taken by the player.'),
  locationContext: z.string().describe('A JSON string with the full data of the current location, including its exits, interactable objects and entities present.'),
  log: z.function(z.tuple([z.string()]), z.void()).optional().describe("A function to log debug messages in real-time."),
});
export type ActionInterpreterInput = z.infer<typeof ActionInterpreterInputSchema>;

// Output Schema
const ActionInterpreterOutputSchema = z.object({
  actionType: z.enum(['move', 'interact', 'attack', 'narrate', 'ooc']).describe("The interpreted type of the player's action."),
  targetId: z.string().optional().nullable().describe("The ID of the target for the action, if applicable (e.g., the destination location ID for 'move', the entity ID for 'attack', the interactable name for 'interact')."),
  debugLogs: z.array(z.string()).optional(),
});
export type ActionInterpreterOutput = z.infer<typeof ActionInterpreterOutputSchema>;


const actionInterpreterPrompt = ai.definePrompt({
    name: 'actionInterpreterPrompt',
    input: { schema: z.object({ playerAction: z.string(), locationContext: z.string() }) },
    output: { schema: ActionInterpreterOutputSchema },
    tools: [adventureLookupTool],
    prompt: `You are an expert action interpreter for a D&D game. Your ONLY job is to determine the player's intent based on their action and return a structured JSON object.

**Directives:**
1.  **Analyze the Player's Action:** Read the player's action carefully.
2.  **Check for Out-of-Character (OOC):** If the action starts with \`//\`, classify it as 'ooc'.
3.  **Check for Movement:** Compare the action to the \`exits\` and their descriptions in the \`locationContext\`. If it matches an intent to go to a new location, classify the action as 'move' and set 'targetId' to the destination's \`toLocationId\`.
4.  **Check for Attack:** If the action describes an attack (e.g., "ataco al orco", "le disparo una flecha a la mantícora"), classify it as 'attack' and set 'targetId' to the name of the creature being attacked (e.g., "orco", "mantícora").
5.  **Check for Interaction:** If the action describes interacting with a specific object or person mentioned in the \`locationContext\` (e.g., "leo el tablón de anuncios", "hablo con el posadero"), classify it as 'interact' and set 'targetId' to the name of the object or person (e.g., "Tablón de oportunidades", "Toblen Rocacolina").
6.  **Default to Narration:** If none of the above apply, it's a general descriptive action. Classify it as 'narrate'.

**Location Context:**
\`\`\`json
{{{locationContext}}}
\`\`\`

**Player Action:**
"{{{playerAction}}}"

Determine the player's intent based on their action and the provided context.
`,
});


export const actionInterpreterFlow = ai.defineFlow(
    {
      name: 'actionInterpreterFlow',
      inputSchema: ActionInterpreterInputSchema,
      outputSchema: ActionInterpreterOutputSchema,
    },
    async (input) => {
        const { log = () => {} } = input;
        const debugLogs: string[] = [];
        const localLog = (message: string) => {
            log(message);
            debugLogs.push(message);
        };

        try {
            localLog(`ActionInterpreter: Interpreting action: "${input.playerAction}"`);
            
            const { output } = await actionInterpreterPrompt(input);

            if (!output) {
                localLog("ActionInterpreter: CRITICAL - AI returned null output. Defaulting to 'narrate'.");
                return { actionType: 'narrate', debugLogs };
            }

            localLog(`ActionInterpreter: Interpreted action as '${output.actionType}' with target '${output.targetId || 'none'}'.`);
            return { ...output, debugLogs };

        } catch (e: any) {
            localLog(`ActionInterpreter: CRITICAL - Flow failed. Error: ${e.message}. Defaulting to 'narrate'.`);
            console.error("Critical error in actionInterpreterFlow.", e);
            return { actionType: 'narrate', debugLogs };
        }
    }
);

export async function actionInterpreter(input: ActionInterpreterInput): Promise<ActionInterpreterOutput> {
    return actionInterpreterFlow(input);
}
