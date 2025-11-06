
'use server';
/**
 * @fileOverview A Genkit tool for generating actions for AI-controlled companions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { runDynamicTool } from './tool-runner';

const CharacterInfoSchema = z.object({
  id: z.string(),
  name: z.string().describe('The name of the character.'),
  class: z.string().describe('The class of the character.'),
  race: z.string().describe('The race of the character.'),
  personality: z.string().describe("A brief description of the character's personality and background."),
});

const CompanionExpertToolInputSchema = z.object({
  characters: z.array(CharacterInfoSchema).describe("A list of AI-controlled characters for which to generate actions."),
  context: z.string().describe("The Dungeon Master's most recent narration or the player's most recent action, providing context for the scene."),
  inCombat: z.boolean().describe("Whether the party is currently in combat."),
  enemies: z.array(z.string()).optional().describe("A list of enemy names, if in combat."),
});

const CharacterActionSchema = z.object({
  characterId: z.string().describe("The ID of the character taking the action."),
  action: z.string().describe("The character's action or dialogue. Can be an empty string for no action."),
});

const CompanionExpertToolOutputSchema = z.object({
  actions: z.array(CharacterActionSchema).describe("A list of character actions. Can be empty."),
});

const companionExpertPrompt = ai.definePrompt({
  name: 'companionExpertToolPrompt',
  input: { schema: CompanionExpertToolInputSchema },
  output: { schema: CompanionExpertToolOutputSchema },
  prompt: `You are orchestrating the AI-controlled characters in a D&D party. Your goal is to make their interactions feel natural and true to their unique personalities.

**Guiding Principle: Realism over Reactivity. Not everyone has to speak or act every time.**

Your characters are:
{{#each characters}}
- **Name:** {{{this.name}}} (ID: {{{this.id}}})
  - **Class:** {{{this.class}}}
  - **Race:** {{{this.race}}}
  - **Personality:** {{{this.personality}}}
{{/each}}

This is what's happening:
"{{{context}}}"

{{#if inCombat}}
**You are IN COMBAT.** The enemies are: {{#each enemies}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.
Decide the combat action for the character(s) whose turn it is. Their action should be based on their personality.
- A pragmatic cleric might heal the most wounded ally.
- A reckless mage might use a powerful area-of-effect spell, even if it's risky.
- A cowardly rogue might try to hide.
- A brave warrior will attack the biggest threat.

State the action clearly (e.g., "Elara casts Healing Word on Galador", "Merryl attacks the goblin with a Fire Bolt").
{{else}}
**You are in narrative/exploration mode.** The player character just said or did the above.
- **Is the player talking to them directly?** A response is likely.
- **Does the situation warrant a reaction?** A character might react to a tense moment or something that aligns with their personality.
- **It's okay to be silent.** If a character has no strong opinion, they should remain silent. Do not generate an action for them.
{{/if}}

**RULES:**
- **CRITICAL: Do not use Markdown.** The output must be plain text.
- Keep actions concise.
- If a character does nothing, do not include them in the output array. If no one acts, return an empty array.
- The order of actions in the output array determines the sequence of events.
`,
});

export const companionExpertTool = ai.defineTool(
  {
    name: 'companionExpertTool',
    description: 'Determines the actions or dialogue for AI-controlled party members in response to a situation, either in or out of combat.',
    inputSchema: CompanionExpertToolInputSchema,
    outputSchema: CompanionExpertToolOutputSchema,
  },
  async (input, context) => {
    // If there are no AI characters, don't call the flow.
    if (input.characters.length === 0) {
      return { actions: [] };
    }
    return runDynamicTool(companionExpertPrompt, input, context);
  }
);
