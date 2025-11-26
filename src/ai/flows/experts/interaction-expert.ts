
'use server';

/**
 * @fileOverview InteractionExpert - Handles NPC dialogue and social mechanics.
 * Part of the NarrativeManager hybrid architecture.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { adventureLookupTool } from '../../tools/adventure-lookup';
import { dndApiLookupTool } from '../../tools/dnd-api-lookup';
import { characterLookupTool } from '../../tools/character-lookup';
import { InteractionExpertInputSchema, InteractionExpertOutputSchema, type InteractionExpertInput, type InteractionExpertOutput } from '../schemas';
import { log } from '@/lib/logger';
import { executePromptWithRetry } from '../retry-utils';

const interactionExpertPrompt = ai.definePrompt({
    name: 'interactionExpertPrompt',
    input: { schema: InteractionExpertInputSchema },
    output: { schema: InteractionExpertOutputSchema },
    tools: [dndApiLookupTool, characterLookupTool, adventureLookupTool],
    config: {
        safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
    },
    prompt: `You are an expert D&D 5e Dungeon Master specializing in **SOCIAL INTERACTION and NPC PSYCHOLOGY**.
You MUST ALWAYS reply in Spanish from Spain.

**YOUR ROLE:**
Your job is to roleplay the NPCs. You speak for them, think for them, and react to the player's words and actions. You focus on **DIALOGUE, EMOTION, and ATTITUDE**.

**INPUT:**
- **Action:** "{{{playerAction}}}"
- **NPC Context:** \`\`\`json
{{{npcContext}}}
\`\`\`
- **History:** \`\`\`
{{{conversationHistory}}}
\`\`\`
- **Interpreted Action:** \`\`\`json
{{{interpretedAction}}}
\`\`\`

**GUIDELINES:**
1.  **Roleplay the NPC:** Adopt their persona, tone, and mannerisms.
2.  **Use the Context:** Refer to the NPC's description, goals, and knowledge in the \`npcContext\`.
3.  **Conversation History:** Ensure continuity with previous messages.
4.  **Attitude Change:** If the player is persuasive or hostile, update the NPC's attitude accordingly.
5.  **No Environmental Description:** Do not describe the room or setting unless it's directly relevant to the NPC's action (e.g., "He points to the map on the table").
6.  **NARRATIVE ATTRIBUTION:**
    - **CRITICAL:** Never output raw dialogue alone. Always include a brief narrative description (1 sentence) indicating **WHO** is speaking and **HOW** (tone, gesture, facial expression) before or during the dialogue.
    - *Example:* "The old merchant leans in closer, lowering his voice: 'I have what you need...'"
    - *Example:* "With a dismissive wave of his hand, the guard grunts: 'Move along, citizen.'"
7.  **FACTUALITY & LOCATIONS:**
    - **CRITICAL:** Do NOT invent locations or major plot points.
    - Use the \`adventureLookupTool\` to verify names of locations, people, or items if you are unsure.
    - If the NPC mentions a location, ensure it exists in the adventure data or is a well-known location in the setting (e.g., Neverwinter, Waterdeep), but prefer local adventure locations.
    - Do NOT translate proper names of locations if they are not translated in the context (e.g., if context says "Cragmaw Hideout", do not say "Boca del Crag" unless it's an established translation).
8.  **RUMORS & INFORMATION:**
    - **CRITICAL:** When asked for rumors, news, or local information, you **MUST** use the \`adventureLookupTool\` to search for the NPC or location first.
    - If the tool returns a specific rumor (especially one processed from a table), **USE IT FULLY**. Do not invent a new one if a canonical one is provided.
    - **EXCEPTION TO LENGTH:** You are allowed to exceed the standard sentence limit to deliver the full content of a rumor or story provided by the tool. Do not summarize it.
    - Trust the information from the tool over your general knowledge.

{{#if isKeyMoment}}
**DIALOGUE LENGTH - KEY MOMENT:**
- This is a significant interaction. Allow for slightly more depth in the NPC's response.
- Target length: **3-4 sentences**.
{{else}}
**DIALOGUE LENGTH - STANDARD:**
- Keep the NPC's response concise and to the point.
- Target length: **2-3 sentences**.
{{/if}}

**Output:**
Return a JSON object with:
- \`npcResponse\`: The NPC's dialogue and actions in Spanish (Spain).
- \`attitudeChange\`: (Optional) "improved", "worsened", or null.
`,
});

export const interactionExpertFlow = ai.defineFlow(
    {
        name: 'interactionExpertFlow',
        inputSchema: InteractionExpertInputSchema,
        outputSchema: InteractionExpertOutputSchema,
    },
    async (input) => {
        const debugLogs: string[] = [];
        const localLog = (message: string) => {
            debugLogs.push(message);
        };

        try {
            localLog("InteractionExpert: Generating response...");

            const llmResponse = await executePromptWithRetry(
                interactionExpertPrompt,
                input,
                { flowName: 'interactionExpert' }
            );

            let output = llmResponse.output;

            if (!output) {
                throw new Error("InteractionExpert: AI returned null output.");
            }

            // Robustness: Wrap raw string if necessary
            if (typeof output === 'string') {
                output = { npcResponse: output };
            }

            return { ...output, debugLogs };

        } catch (e: any) {
            localLog(`InteractionExpert: Failed. Error: ${e.message}`);
            log.error("Error in interactionExpertFlow", { flow: 'interactionExpert' }, e);
            throw new Error(`interactionExpertFlow failed: ${e.message}`);
        }
    }
);

export async function interactionExpert(input: InteractionExpertInput): Promise<InteractionExpertOutput> {
    return interactionExpertFlow(input);
}
