
'use server';
/**
 * @fileOverview A Genkit tool for generating actions for AI-controlled companions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { CharacterSummarySchema } from '@/lib/schemas';
import { characterLookupTool } from './character-lookup';


const CompanionExpertInputSchema = z.object({
  characterSummary: CharacterSummarySchema.describe("The summary of the AI-controlled character whose action is being decided."),
  context: z.string().describe("The Dungeon Master's most recent narration or the player's most recent action, providing context for the scene."),
  inCombat: z.boolean().describe("Whether the party is currently in combat."),
  enemies: z.array(z.string()).optional().describe("A list of enemy names, if in combat."),
  partySummary: z.array(CharacterSummarySchema).describe("A summary of the entire party's current status (names, hp, etc)."),
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

    Your character is:
    - **Name:** {{{characterSummary.name}}} (ID: {{{characterSummary.id}}})
      - **Class:** {{{characterSummary.class}}}
      - **Race:** {{{characterSummary.race}}}
      - **Personality:** {{{characterSummary.personality}}}

    The rest of the party's status is:
    {{#each partySummary}}
    - **{{this.name}}** (Class: {{this.class}})
    {{/each}}
    
    This is what's happening:
    "{{{context}}}"

    {{#if inCombat}}
    **You are IN COMBAT.** The enemies are: {{#each enemies}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.
    Decide the combat action for your character. The action should be based on their personality and class abilities.
    - To know your character's specific abilities, spells, or inventory, you MUST use the 'characterLookupTool' with your character's name.
    - To know an ally's specific data (like if they have a certain spell), you MUST use the 'characterLookupTool'.
    - A pragmatic cleric might heal the most wounded ally.
    - A reckless mage might use a powerful area-of-effect spell, even if it's risky.
    - A cowardly rogue might try to hide.
    - A brave warrior will attack the biggest threat.

    State the action clearly (e.g., "Elara casts Healing Word on Galador", "Merryl attacks the goblin with a Fire Bolt").
    {{else}}
    **You are in narrative/exploration mode.** The player character just said or did the above.
    - **Is the player talking to them directly?** A response is likely.
    - **Does the situation warrant a reaction?** A character might react to a tense moment or something that aligns with their personality.
    - **It's okay to be silent.** If the character has no strong opinion, they should remain silent. Return an empty string for the action.
    {{/if}}

    **RULES:**
    - **CRITICAL: Do not use Markdown.** The output must be plain text.
    - Keep actions concise.
    - If the character does nothing, return an empty string for the action.
    `,
});


export const companionExpertTool = ai.defineTool(
    {
        name: 'companionExpertTool',
        description: 'Decides the action or dialogue for an AI-controlled companion based on their personality and the current game context (combat or exploration).',
        inputSchema: z.any(),
        outputSchema: CompanionExpertOutputSchema,
    },
    async (input) => {
        throw new Error(`DEBUG INTERRUPT in companionExpertTool - Input data: ${JSON.stringify(input, null, 2)}`);
        
        // This part of the code is now unreachable due to the interruption above.
        // It's kept here for when we remove the debug line.
        const validatedInput = CompanionExpertInputSchema.parse(input);
        const { output } = await companionExpertPrompt(validatedInput);
        return output || { action: "" };
    }
);
