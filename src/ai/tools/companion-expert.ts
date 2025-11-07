
'use server';
/**
 * @fileOverview A Genkit tool for generating actions for AI-controlled companions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define CharacterSchema locally to avoid 'use server' export issues.
const CharacterSchema = z.object({
    id: z.string(),
    name: z.string(),
    race: z.string(),
    class: z.string(),
    level: z.number(),
    sex: z.string(),
    background: z.string(),
    color: z.string(),
    personality: z.string(),
    abilityScores: z.object({
        fuerza: z.number(),
        destreza: z.number(),
        constitución: z.number(),
        inteligencia: z.number(),
        sabiduría: z.number(),
        carisma: z.number(),
    }),
    skills: z.array(z.object({ name: z.string(), proficient: z.boolean() })),
    hp: z.object({ current: z.number(), max: z.number() }),
    ac: z.number(),
    controlledBy: z.enum(["Player", "AI"]),
    inventory: z.array(z.object({ id: z.string(), name: z.string(), quantity: z.number(), description: z.string().optional() })),
    spells: z.array(z.object({ id: z.string(), name: z.string(), level: z.number(), description: z.string() })),
});

const CompanionExpertInputSchema = z.object({
  character: CharacterSchema.describe("The AI-controlled character whose action is being decided."),
  context: z.string().describe("The Dungeon Master's most recent narration or the player's most recent action, providing context for the scene."),
  inCombat: z.boolean().describe("Whether the party is currently in combat."),
  enemies: z.array(z.string()).optional().describe("A list of enemy names, if in combat."),
  party: z.array(CharacterSchema).describe("The full party data."),
});

const CompanionExpertOutputSchema = z.object({
    action: z.string().optional().describe("The character's action or dialogue. Can be an empty string for no action."),
});

const companionExpertPrompt = ai.definePrompt({
    name: 'companionExpertPrompt',
    input: {schema: CompanionExpertInputSchema},
    output: {schema: CompanionExpertOutputSchema},
    prompt: `You are orchestrating the AI-controlled character in a D&D party. Your goal is to make their interactions feel natural and true to their unique personality.

    **Guiding Principle: Realism over Reactivity. The character should only act if it makes sense for them.**

    Your character is:
    - **Name:** {{{character.name}}} (ID: {{{character.id}}})
      - **Class:** {{{character.class}}}
      - **Race:** {{{character.race}}}
      - **Personality:** {{{character.personality}}}

    The rest of the party is:
    {{#each party}}
    - **{{this.name}}** (HP: {{this.hp.current}}/{{this.hp.max}}, AC: {{this.ac}}, Class: {{this.class}})
    {{/each}}
    
    This is what's happening:
    "{{{context}}}"

    {{#if inCombat}}
    **You are IN COMBAT.** The enemies are: {{#each enemies}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.
    Decide the combat action for your character. The action should be based on their personality and class abilities.
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


export async function companionExpert(input: z.infer<typeof CompanionExpertInputSchema>): Promise<z.infer<typeof CompanionExpertOutputSchema>> {
    const { output } = await companionExpertPrompt(input);
    return output || { action: "" };
}

    