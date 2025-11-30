
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
import { executePromptWithRetry } from '../retry-utils';

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
{{#if deadEntities}}
- **DEFEATED ENEMIES / DEAD BODIES:** {{{deadEntities}}}
  **CRITICAL:** The location description in the context may mention these entities as alive or threatening. You MUST IGNORE those parts. Instead, describe them as DEAD BODIES lying on the ground, defeated, or as corpses. Do NOT describe them as attacking, moving, or alive in any way.
{{/if}}
{{#if systemFeedback}}
- **SYSTEM FEEDBACK:** "{{{systemFeedback}}}"
  **CRITICAL:** The game system has provided feedback (e.g., movement failure). You MUST respect this. If the system says movement failed, describe the attempt and the reason it failed, but DO NOT describe the player successfully reaching the destination.
{{/if}}

**GUIDELINES:**
1.  **Focus on the Environment:** Describe the setting vividly. If the player moves, describe the transition. If they look at something, describe it in detail using the context.
2.  **Use the Context:** The \`locationContext\` is your source of truth.
    *   If the player interacts with an object, look for it in \`interactables\`.
    *   If the result is a description, narrate it.
    *   If the result is a text to read, present it clearly.
3.  **Atmosphere:** Is it dark? Damp? Noisy? Silent? Use these details to build immersion.
4.  **No Dialogue:** Do NOT generate dialogue for NPCs. If an NPC is present, you can describe their *physical appearance* or *actions* (e.g., "The guard watches you suspiciously"), but do not make them speak. That is the job of the Interaction Expert.
5.  **Dungeon Turns (Implicit):** If the action takes time (searching a room), imply the passage of time in your narration.
{{#if deadEntities}}
6.  **DEFEATED ENEMIES:** If "DEFEATED ENEMIES" is provided, those entities are DEAD. The location description may incorrectly mention them as alive - ignore that. Describe them as corpses, dead bodies, or defeated enemies lying on the ground. You can mention blood, wounds, or the aftermath of combat if appropriate.
{{/if}}

{{#if isKeyMoment}}
**NARRATION LENGTH - KEY MOMENT:**
- This is a significant moment (location change, event, or revelation).
- You can be slightly more descriptive to set the atmosphere.
- Target length: **3-4 sentences**.
{{else}}
**NARRATION LENGTH - STANDARD:**
- Keep the narration concise and direct.
- Target length: **2-3 sentences**.
{{/if}}

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

            const llmResponse = await executePromptWithRetry(
                explorationExpertPrompt,
                input,
                { flowName: 'explorationExpert' }
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
