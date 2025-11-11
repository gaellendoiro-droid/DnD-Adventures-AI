
'use server';
/**
 * @fileOverview A Genkit tool for generating actions for AI-controlled companions.
 * This version uses a more robust, two-step process to generate reactions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { characterLookupTool } from './character-lookup';
import { PartySchema, CharacterSchema } from '@/lib/schemas';

const CompanionExpertInputSchema = z.object({
  party: PartySchema.describe("The array of character objects for the entire party."),
  characterName: z.string().describe("The name of the AI-controlled character whose action is being decided."),
  context: z.string().describe("The Dungeon Master's most recent narration or the player's most recent action, providing context for the scene."),
  inCombat: z.boolean().describe("Whether the party is currently in combat."),
});

const CompanionExpertOutputSchema = z.object({
    action: z.string().optional().describe("The character's action or dialogue. Can be an empty string for no action."),
});

// New prompt that receives the character's data directly. No tools needed.
const reactionGenerationPrompt = ai.definePrompt({
    name: 'reactionGenerationPrompt',
    input: {schema: z.object({
        character: CharacterSchema,
        context: z.string(),
    })},
    output: {schema: CompanionExpertOutputSchema},
    prompt: `You are orchestrating an AI-controlled character in a D&D party. Your goal is to make their interactions feel natural and true to their unique personality. You MUST ALWAYS reply in Spanish from Spain.

    **Guiding Principle: Realism over Reactivity. The character should only act if it makes sense for them.**

    **Your Character's Details:**
    \`\`\`json
    {{{json character}}}
    \`\`\`
    
    **Current Situation:**
    "{{{context}}}"

    **You are in narrative/exploration mode.**
    - Based on your character's personality and the situation, decide if they would say or do something.
    - **It's okay to be silent.** If the character has no strong opinion or reason to act, they should remain silent.

    **RULES:**
    - **CRITICAL: Do not use Markdown.** The output must be plain text.
    - Your output MUST be a valid JSON object matching the schema.
    - Keep actions concise.
    - If the character does nothing, return an empty string for the action inside the JSON object, like this: {"action": ""}.
    `,
});

export const companionExpertTool = ai.defineTool(
    {
        name: 'companionExpertTool',
        description: 'Decides the action or dialogue for an AI-controlled companion based on their personality and the current game context (exploration).',
        inputSchema: CompanionExpertInputSchema,
        outputSchema: CompanionExpertOutputSchema,
    },
    async (input) => {
        try {
            const { party, characterName, context } = CompanionExpertInputSchema.parse(input);

            // STEP 1: Look up the character data directly in code.
            const characterData = await characterLookupTool({ party, characterName });

            if (!characterData) {
                console.warn(`[CompanionExpertTool] Character "${characterName}" not found in party. Skipping reaction.`);
                return { action: "" };
            }

            // STEP 2: Call the LLM with all context provided. No tools needed.
            const { output } = await reactionGenerationPrompt({
                character: characterData,
                context: context,
            });
            
            if (!output) {
                return { action: "" };
            }
            
            return CompanionExpertOutputSchema.parse(output);

        } catch (error) {
            console.error('[CompanionExpertTool Error]', error);
            return { action: "" };
        }
    }
);
