
'use server';

/**
 * @fileOverview InteractionExpert - Handles NPC dialogue and social mechanics.
 * Part of the NarrativeManager hybrid architecture.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { dndApiLookupTool } from '../../tools/dnd-api-lookup';
import { characterLookupTool } from '../../tools/character-lookup';
import { InteractionExpertInputSchema, InteractionExpertOutputSchema, type InteractionExpertInput, type InteractionExpertOutput } from '../schemas';
import { log } from '@/lib/logger';
import { executePromptWithRetry } from '../retry-utils';

const interactionExpertPrompt = ai.definePrompt({
    name: 'interactionExpertPrompt',
    input: { schema: InteractionExpertInputSchema },
    output: { schema: InteractionExpertOutputSchema },
    tools: [dndApiLookupTool, characterLookupTool],
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
1.  **Roleplay the NPC:** Use the \`npcContext\` to understand their personality, goals, and secrets. Speak in their voice.
2.  **React Naturally:** If the player is rude, get angry. If they are persuasive, consider their arguments.
3.  **Social Mechanics:**
    *   If the player tries to Persuade, Intimidate, or Deceive, assess the difficulty based on the NPC's personality.
    *   You can narrate the result of these attempts (e.g., "El guardia duda por un momento, pero baja la lanza.").
4.  **No Environmental Description:** Do NOT describe the room, the weather, or static objects unless they are directly relevant to the conversation (e.g., the NPC points at a map). That is the job of the Exploration Expert.
5.  **Attitude Change:** If the interaction significantly shifts the NPC's view of the player (from Hostile to Neutral, or Neutral to Friendly), note it in the \`attitudeChange\` field.

**OUTPUT:**
Return a JSON object with:
- \`npcResponse\`: The narrative containing the NPC's dialogue and immediate physical reactions.
- \`attitudeChange\`: Optional. Describe any shift in attitude.
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
