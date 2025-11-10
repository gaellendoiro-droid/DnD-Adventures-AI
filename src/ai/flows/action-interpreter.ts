
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

// NOTE: characterLookupTool has been removed to favor explicit data flow.

const actionInterpreterPrompt = ai.definePrompt({
    name: 'actionInterpreterPrompt',
    input: { schema: z.object({ playerAction: z.string(), locationContext: z.string(), party: ActionInterpreterInputSchema.shape.party }) },
    output: { schema: ActionInterpreterOutputSchema },
    tools: [locationLookupTool], // characterLookupTool is no longer needed.
    prompt: `You are an expert action interpreter for a D&D game. Your ONLY job is to determine the player's intent and return a structured JSON object. You must follow a strict priority flow.

**Directives & Priority Flow:**

1.  **PRIORITY 1: Out-of-Character (OOC) Check:**
    *   If the player's action starts with \`//\`, you MUST classify the action as 'ooc'. The 'targetId' is irrelevant. Stop here.

2.  **PRIORITY 2: Attack:**
    *   Analyze if the action is a clear intent to attack a creature. This includes phrases like "ataco a", "lanzo un hechizo contra", "le disparo a", "golpeo al", "saco mi espada y ataco", "me lanzo al combate".
    *   If you detect an attack, you MUST classify it as 'attack'.
    *   Then, you MUST identify the target. Look for the target's name (e.g., "orco", "mantícora") in the \`playerAction\` or the \`locationContext\`. If there is only one logical enemy present in \`entitiesPresent\`, you should assume that is the target.
    *   The 'targetId' MUST be the name or ID of the creature being attacked. Stop here.

3.  **PRIORITY 3: Interaction with a Companion:**
    *   Analyze if the action is a question or statement directed at a specific companion from the 'Player\'s Party' list provided in the context.
    *   Check if the action starts with or contains a companion's name.
    *   If it is, you MUST classify the action as 'interact' and use the companion's name (e.g., "Elara") as the 'targetId'. Stop here.

4.  **PRIORITY 4: Movement - Local Exits:**
    *   Analyze the player's action for clear movement intent to a new location (e.g., "vamos a", "entramos en", "ir a").
    *   Check if the destination in the player's action (e.g., "vamos a la posada", "entramos en Suministros Barthen") matches the \`description\` of any \`exits\` in the \`locationContext\`.
    *   If you find a match, you MUST classify the action as 'move' and use the exact \`toLocationId\` from that exit as the 'targetId'. Stop here.

5.  **PRIORITY 5: Interaction with a Local Object:**
    *   Analyze if the action targets an object or entity present in the current location. Check if the target (e.g., "tablón de anuncios", "altar") matches the \`name\` of any \`interactables\` or \`entitiesPresent\` in the \`locationContext\`.
    *   Even if movement verbs are used ("vamos al tablón"), if the target is a local interactable, it's an interaction, not a move.
    *   If you find a match, you MUST classify it as 'interact'. The 'targetId' must be the most specific 'interactionResults.action' string that matches the player's intent (e.g., 'Leer anuncios (General)'). Stop here.

6.  **PRIORITY 6: Movement - Global Search:**
    *   If, and ONLY IF, you detected movement intent but did not find a match in local exits OR local interactables, you MAY use the \`locationLookupTool\`.
    *   Use the player's destination as the query for the tool (e.g., "Colina del Resentimiento", "Adabra Gwynn").
    *   If the tool returns a location object, you MUST classify the action as 'move' and use the \`id\` from the returned location object as the 'targetId'. Stop here.

7.  **PRIORITY 7: Default to Narration:**
    *   If none of the above apply, and only as a last resort, classify it as 'narrate' and leave 'targetId' null.

**CONTEXT:**
- Player's Party: \`\`\`json
{{{json party}}}
\`\`\`
- Location Context: \`\`\`json
{{{locationContext}}}
\`\`\`
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
            // Pass the party data as a JSON string to the prompt.
            const llmResponse = await actionInterpreterPrompt({
                playerAction: input.playerAction,
                locationContext: input.locationContext,
                party: input.party,
            });
            
            // Log tool output for debugging
            if (llmResponse.history?.length) {
                llmResponse.history.forEach(turn => {
                    if (turn.role === 'tool_response' && turn.content[0].toolResponse?.name === 'locationLookupTool') {
                         const toolOutput = turn.content[0].toolResponse.output;
                         debugLogs.push(`ActionInterpreter: locationLookupTool was called and returned: ${JSON.stringify(toolOutput)}`);
                    }
                });
            }

            let output = llmResponse.output;

            if (!output) {
                const msg = "ActionInterpreter: CRITICAL - AI returned null output. This can happen if a tool fails or returns an unexpected type. Defaulting to 'narrate'.";
                console.error(msg);
                debugLogs.push(msg);
                
                output = { actionType: 'narrate' };
            }

            debugLogs.push(`ActionInterpreter Raw Output: ${JSON.stringify(output)}`);

            return { interpretation: output, debugLogs };

        } catch (e: any) {
            const msg = `ActionInterpreter: CRITICAL - Flow failed. Error: ${e.message}. Defaulting to 'narrate'.`;
            console.error(msg);
            debugLogs.push(msg);
            return { interpretation: { actionType: 'narrate' }, debugLogs };
        }
    }
);

export async function actionInterpreter(input: ActionInterpreterInput): Promise<{interpretation: ActionInterpreterOutput, debugLogs: string[]}> {
    return actionInterpreterFlow(input);
}
