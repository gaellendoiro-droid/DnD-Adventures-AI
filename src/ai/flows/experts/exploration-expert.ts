
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
        // Nota: maxOutputTokens no se establece aquí porque el endpoint rechaza generationConfig.
        // Se mantiene la brevedad por instrucciones de prompt.
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
  **CRITICAL - FEEDBACK PRIORITY:** The system feedback is the absolute truth about the action's result.
  - If it says "Movement failed" or "No puedes ir allí", describe the ATTEMPT and the FAILURE. Do NOT describe success.
  - If it says "Ya estás en [Location]", describe that the player is ALREADY there. Do NOT narrate a travel or arrival ("You go back to..."). Instead say "You are already in..." or "You look around the room you are already in...".
{{/if}}
{{#if explorationContext}}
- **EXPLORATION CONTEXT:**
  - **Mode:** {{explorationContext.mode}}
  - **Light Level:** {{explorationContext.lightLevel}}
  - **Visit State:** {{explorationContext.visitState}}
  - **Door States:** {{json explorationContext.doorStates}}
  - **Visible Connections:** {{json explorationContext.visibleConnections}}
  - **Present Entities:** {{json explorationContext.presentEntities}}
{{/if}}

**GUIDELINES:**
1. Use \`locationContext\` for room description and details.
2. Use \`doorStates\` to know which doors are open/closed (override locationContext if different).
3. Use \`visibleConnections\` to describe what's visible through open passages.
   - If it says \`(archway)\`, describe it as an open passage, archway, or opening - NOT as a door.
   - Only mention "door" if it explicitly says \`(open door)\` or \`(closed door)\`.
4. Use \`presentEntities\` for entities in THIS room only.
5. If \`visitState\` is 'visited', be brief. If 'unknown', describe fully.
6. Focus on sensory details (sight, sound, smell, temperature).
7. Do NOT generate dialogue for NPCs - describe appearance/actions only.
8. Do NOT invent deaths - only describe as dead if in \`deadEntities\` or marked as "corpse:" in visibleConnections.

{{#if isKeyMoment}}
**NARRATION LENGTH - KEY MOMENT:**
- This is a significant moment (location change, event, or revelation).
- You can be slightly more descriptive to set the atmosphere.
- Target length: **2-3 sentences**.
{{else}}
**NARRATION LENGTH - STANDARD:**
- Keep the narration concise and direct.
- Target length: **1-2 sentences**.
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
