
'use server';

/**
 * @fileOverview ExplorationExpert - Handles environmental description and exploration mechanics.
 * Part of the NarrativeManager hybrid architecture.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { dndApiLookupTool } from '../../tools/dnd-api-lookup';
import { adventureLookupTool } from '../../tools/adventure-lookup';
import { ExplorationExpertInputSchema, ExplorationExpertOutputSchema, type ExplorationExpertInput, type ExplorationExpertOutput } from '../schemas';
import { log } from '@/lib/logger';
import { retryWithExponentialBackoff } from '../retry-utils';

const explorationExpertPrompt = ai.definePrompt({
    name: 'explorationExpertPrompt',
    input: { schema: ExplorationExpertInputSchema },
    output: { schema: ExplorationExpertOutputSchema },
    tools: [dndApiLookupTool, adventureLookupTool],
    config: {
        safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
    },
    prompt: `You are an expert D&D 5e Dungeon Master specializing in **EXPLORATION and ATMOSPHERE**.
You MUST ALWAYS reply in Spanish from Spain.

**YOUR ROLE:**
Your job is to describe the world, the environment, and the immediate consequences of physical actions (movement, searching, investigating). You focus on **SENSORY DETAILS** (sight, sound, smell, temperature).

**INPUT:**
- **Action:** "{{{playerAction}}}"
- **Location:** \`{{{locationId}}}\`
- **Context:** \`\`\`json
{{{locationContext}}}
\`\`\`
- **Interpreted Action:** \`\`\`json
{{{interpretedAction}}}
\`\`\`

**GUIDELINES:**
1.  **Focus on the Environment:** Describe the setting vividly. If the player moves, describe the transition. If they look at something, describe it in detail using the context.
2.  **Use the Context:** The \`locationContext\` is your source of truth.
    *   If the player interacts with an object, look for it in \`interactables\`.
    *   If the result is a description, narrate it.
    *   If the result is a text to read, present it clearly.
3.  **Atmosphere:** Is it dark? Damp? Noisy? Silent? Use these details to build immersion.
4.  **No Dialogue:** Do NOT generate dialogue for NPCs. If an NPC is present, you can describe their *physical appearance* or *actions* (e.g., "The guard watches you suspiciously"), but do not make them speak. That is the job of the Interaction Expert.
5.  **Dungeon Turns (Implicit):** If the action takes time (searching a room), imply the passage of time in your narration.

**OUTPUT:**
Return a JSON object with:
- \`explorationNarration\`: The atmospheric description and result of the action.
`,
});

export const explorationExpertFlow = ai.defineFlow(
    {
        name: 'explorationExpertFlow',
        inputSchema: ExplorationExpertInputSchema,
        outputSchema: ExplorationExpertOutputSchema,
    },
    async (input) => {
        const debugLogs: string[] = [];
        const localLog = (message: string) => {
            debugLogs.push(message);
        };

        try {
            localLog("ExplorationExpert: Generating narration...");

            const llmResponse = await retryWithExponentialBackoff(
                () => explorationExpertPrompt(input),
                3,
                1000,
                'explorationExpert'
            );

            let output = llmResponse.output;

            if (!output) {
                throw new Error("ExplorationExpert: AI returned null output.");
            }

            // Robustness: Wrap raw string if necessary
            if (typeof output === 'string') {
                output = { explorationNarration: output };
            }

            return { ...output, debugLogs };

        } catch (e: any) {
            localLog(`ExplorationExpert: Failed. Error: ${e.message}`);
            log.error("Error in explorationExpertFlow", { flow: 'explorationExpert' }, e);
            throw new Error(`explorationExpertFlow failed: ${e.message}`);
        }
    }
);

export async function explorationExpert(input: ExplorationExpertInput): Promise<ExplorationExpertOutput> {
    return explorationExpertFlow(input);
}
