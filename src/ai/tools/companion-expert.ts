
'use server';
/**
 * @fileOverview A Genkit tool for generating actions for AI-controlled companions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { CharacterSummarySchema } from '@/lib/schemas';
import { characterLookupTool } from './character-lookup';


const CompanionExpertInputSchema = z.object({
  characterName: z.string().describe("The name of the AI-controlled character whose action is being decided."),
  context: z.string().describe("The Dungeon Master's most recent narration or the player's most recent action, providing context for the scene."),
  inCombat: z.boolean().describe("Whether the party is currently in combat."),
  enemies: z.array(z.string()).optional().describe("A list of enemy names, if in combat."),
});

const CompanionExpertOutputSchema = z.object({
    action: z.string().optional().describe("The character's action or dialogue. Can be an empty string for no action."),
});

const companionExpertPrompt = ai.definePrompt({
    name: 'companionExpertPrompt',
    input: {schema: CompanionExpertInputSchema},
    output: {schema: CompanionExpertOutputSchema},
    tools: [characterLookupTool],
    prompt: `You are orchestrating the AI-controlled character in a D&D party. Your goal is to make their interactions feel natural and true to their unique personality. You MUST ALWAYS reply in Spanish from Spain.

    **Guiding Principle: Realism over Reactivity. The character should only act if it makes sense for them.**

    Your character's name is **{{{characterName}}}**.

    To get your character's full details (class, race, personality, abilities, spells) and the status of your allies, you MUST use the \`characterLookupTool\`.
    
    This is what's happening:
    "{{{context}}}"

    {{#if inCombat}}
    **You are IN COMBAT.** The enemies are: {{#each enemies}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.
    Decide the combat action for your character. The action should be based on their personality and class abilities.
    - To know your character's specific abilities, spells, or inventory, you MUST use the 'characterLookupTool' with your character's name.
    - To know an ally's specific data (like if they have a certain spell or how wounded they are), you MUST use the 'characterLookupTool'.
    - A pragmatic cleric might heal the most wounded ally.
    - A reckless mage might use a powerful area-of-effect spell, even if it's risky.
    - A cowardly rogue might try to hide.
    - A brave warrior will attack the biggest threat.

    State the action clearly (e.g., "Elara casts Healing Word on Galador", "Merryl attacks the goblin with a Fire Bolt").
    {{else}}
    **You are in narrative/exploration mode.** The player character just said or did the above.
    - **Is the player talking to you directly?** A response is likely.
    - **Does the situation warrant a reaction?** A character might react to a tense moment or something that aligns with their personality.
    - **It's okay to be silent.** If the character has no strong opinion, they should remain silent. Return an empty string for the action.
    {{/if}}

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
        description: 'Decides the action or dialogue for an AI-controlled companion based on their personality and the current game context (combat or exploration).',
        inputSchema: CompanionExpertInputSchema,
        outputSchema: CompanionExpertOutputSchema,
    },
    async (input) => {
        try {
            const validatedInput = CompanionExpertInputSchema.parse(input);
            const { output } = await companionExpertPrompt(validatedInput);
            
            if (!output) {
                return { action: "" };
            }

            // This is our robustness check. If the model returned a raw string, we catch it.
            if (typeof output === 'string') {
                 // Attempt to parse it, in case it's a stringified JSON
                try {
                    return JSON.parse(output);
                } catch (e) {
                    // If it's just a plain string, wrap it in the expected object structure.
                    return { action: output };
                }
            }
            
            return output;

        } catch (error) {
            console.error('[CompanionExpertTool Error]', error);
            // In case of any failure, return a safe, empty action.
            return { action: "" };
        }
    }
);
