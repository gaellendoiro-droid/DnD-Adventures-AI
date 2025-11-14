
'use server';
/**
 * @fileOverview A Genkit tool for generating actions for AI-controlled companions.
 * This version uses a more robust, two-step process to generate reactions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { characterLookupTool } from './character-lookup';
import { PartySchema, CharacterSchema } from '@/lib/schemas';
import { log } from '@/lib/logger';

const CompanionExpertInputSchema = z.object({
  party: PartySchema.describe("The array of character objects for the entire party."),
  characterName: z.string().describe("The name of the AI-controlled character whose action is being decided."),
  context: z.string().describe("The Dungeon Master's most recent narration or the player's most recent action, providing context for the scene."),
  inCombat: z.boolean().describe("Whether the party is currently in combat."),
  reactionTiming: z.enum(['before_dm', 'after_dm']).optional().describe("When this reaction is being generated: 'before_dm' (reacting to player's proposal) or 'after_dm' (reacting to what just happened)."),
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
        isBeforeDm: z.boolean().optional(),
        isAfterDm: z.boolean().optional(),
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

    {{#if isBeforeDm}}
    **Reaction Timing: before_dm**
    - You are reacting to the PLAYER'S PROPOSAL or action BEFORE the DM narrates what happens.
    - This is your chance to express doubt, agreement, caution, or enthusiasm about the plan.
    - Example: Player says "vamos a la cueva oscura" → You might say "¿Estás seguro? Parece peligroso..." or "¡Buena idea, necesitamos explorar!"
    - **Be selective:** Only react if your character has a strong opinion. Silence is often more realistic.
    - **Probability guideline:** React about 30-40% of the time.
    {{/if}}
    {{#if isAfterDm}}
    **Reaction Timing: after_dm**
    - You are reacting to WHAT JUST HAPPENED (the DM's narration).
    - React to the current situation, what you see, hear, or experience.
    - Example: DM narrates "veis un dragón" → You might say "¡Cuidado! ¡Es enorme!" or remain focused and silent.
    - **Be natural:** React as a real player would, based on your personality.
    - **Probability guideline:** React about 50-60% of the time.
    {{/if}}
    {{#unless isBeforeDm}}{{#unless isAfterDm}}
    **You are in narrative/exploration mode.**
    - Based on your character's personality and the situation, decide if they would say or do something.
    {{/unless}}{{/unless}}
    - **It's okay to be silent.** If the character has no strong opinion or reason to act, they should remain silent.

    **RULES:**
    - **CRITICAL: Do not use Markdown.** The output must be plain text.
    - Your output MUST be a valid JSON object matching the schema.
    - Keep actions concise (1-2 sentences maximum).
    - If the character does nothing, return an empty string for the action inside the JSON object, like this: {"action": ""}.
    - DO NOT repeat what was already said or narrated. Add something NEW.
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
                log.warn('Character not found in party', { 
                    module: 'AITool',
                    tool: 'companionExpertTool',
                    characterName,
                });
                return { action: "" };
            }

            // Issue #26: Defensive check - dead companions cannot react
            if (characterData.hp && characterData.hp.current <= 0) {
                log.debug('Skipping reaction for dead companion', { 
                    module: 'AITool',
                    tool: 'companionExpertTool',
                    characterName,
                    hp: characterData.hp.current,
                });
                return { action: "" };
            }

            log.aiTool('companionExpertTool', 'Generating companion reaction', { 
                characterName,
                inCombat: input.inCombat,
                reactionTiming: input.reactionTiming || 'after_dm',
            });

            // STEP 2: Call the LLM with all context provided. No tools needed.
            const { output } = await reactionGenerationPrompt({
                character: characterData,
                context: context,
                isBeforeDm: input.reactionTiming === 'before_dm',
                isAfterDm: input.reactionTiming === 'after_dm' || !input.reactionTiming,
            });
            
            if (!output) {
                log.warn('No output from companion reaction prompt', { 
                    module: 'AITool',
                    tool: 'companionExpertTool',
                    characterName,
                });
                return { action: "" };
            }
            
            const result = CompanionExpertOutputSchema.parse(output);
            log.aiTool('companionExpertTool', 'Companion reaction generated', { 
                characterName,
                hasAction: !!result.action,
            });
            
            return result;

        } catch (error: any) {
            log.error('CompanionExpertTool error', { 
                module: 'AITool',
                tool: 'companionExpertTool',
                characterName: input.characterName,
            }, error);
            return { action: "" };
        }
    }
);
