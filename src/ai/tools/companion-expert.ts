
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
import { executePromptWithRetry } from '../flows/retry-utils';
import { SkillCheckResultSchema } from '../flows/schemas';

const CompanionExpertInputSchema = z.object({
    party: PartySchema.describe("The array of character objects for the entire party."),
    characterName: z.string().describe("The name of the AI-controlled character whose action is being decided."),
    context: z.string().describe("The Dungeon Master's most recent narration or the player's most recent action, providing context for the scene."),
    inCombat: z.boolean().describe("Whether the party is currently in combat."),
    reactionTiming: z.enum(['before_dm', 'after_dm']).optional().describe("When this reaction is being generated: 'before_dm' (reacting to player's proposal) or 'after_dm' (reacting to what just happened)."),
    chatHistory: z.string().optional().describe("The recent chat history (last 8-10 messages) to provide context."),
    locationContext: z.string().optional().describe("The description or details of the current location."),
    presentEntities: z.array(z.any()).optional().describe("The list of entities (NPCs, items, monsters) present in the location."),
    activeEffects: z.array(z.string()).optional().describe("The active world or magical effects (e.g. ['speak_with_animals'])."),
    skillCheckResult: SkillCheckResultSchema.optional().describe("Optional result of a mechanical skill check resolved prior to narration."),
});

const CompanionExpertOutputSchema = z.object({
    action: z.string().optional().describe("The character's action or dialogue. Can be an empty string for no action."),
});

// New prompt that receives the character's data directly. No tools needed.
const reactionGenerationPrompt = ai.definePrompt({
    name: 'reactionGenerationPrompt',
    input: {
        schema: z.object({
            character: CharacterSchema,
            context: z.string(),
            chatHistory: z.string().optional(),
            isBeforeDm: z.boolean().optional(),
            isAfterDm: z.boolean().optional(),
            locationContext: z.string().optional(),
            presentEntities: z.array(z.any()).optional(),
            activeEffects: z.array(z.string()).optional(),
            skillCheckResult: SkillCheckResultSchema.optional(),
        })
    },
    output: { schema: CompanionExpertOutputSchema },
    prompt: `You are orchestrating an AI-controlled character in a D&D party. Your goal is to make their interactions feel natural and true to their unique personality. You MUST ALWAYS reply in Spanish from Spain.

    **Guiding Principle: Realism over Reactivity. The character should only act if it makes sense for them.**

    **Your Character's Details:**
    \`\`\`json
    {{{json character}}}
    \`\`\`
    
    {{#if locationContext}}
    **Current Location Context:**
    {{{locationContext}}}
    {{/if}}

    {{#if presentEntities}}
    **Entities Present in the Location (NPCs, Monsters, Items):**
    \`\`\`json
    {{{json presentEntities}}}
    \`\`\`
    {{/if}}

    {{#if activeEffects}}
    **Active Magical/World Effects:**
    - {{{json activeEffects}}}
    {{/if}}

    {{#if skillCheckResult}}
    **Prueba de Habilidad Mecánica Reciente:**
    - Habilidad: {{skillCheckResult.skill}} (CD {{skillCheckResult.dc}})
    - Realizada por: {{skillCheckResult.characterName}}
    - Resultado: {{#if skillCheckResult.isSuccess}}ÉXITO{{else}}FALLO{{/if}} (Total: {{skillCheckResult.rollTotal}})
    - Justificación: {{skillCheckResult.reasoning}}
    {{/if}}

    **Current Situation:**
    "{{{context}}}"

    {{#if chatHistory}}
    **Recent Conversation History:**
    {{{chatHistory}}}
    {{/if}}

    {{#if isBeforeDm}}
    **Reaction Timing: before_dm**
    - You are reacting to the PLAYER'S PROPOSAL or action BEFORE the DM narrates what happens.
    - This is your chance to express doubt, agreement, caution, or enthusiasm about the plan.
    - Example: Player says "vamos a la cueva oscura" → You might say "¿Estás seguro? Parece peligroso..." or "¡Buena idea, necesitamos explorar!"
    - **Be selective:** Only react if your character has a strong opinion. Silence is often more realistic.
    - **Instruction:** You have been selected to react. Provide a comment or action that fits the situation.
    {{/if}}
    {{#if isAfterDm}}
    **Reaction Timing: after_dm**
    - You are reacting to WHAT JUST HAPPENED (the DM's narration).
    - React to the current situation, what you see, hear, or experience.
    - Example: DM narrates "veis un dragón" → You might say "¡Cuidado! ¡Es enorme!" or remain focused and silent.
    - **Be natural:** React as a real player would, based on your personality.
    - **Instruction:** You have been selected to react. Provide a comment or action that fits the situation.
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
    - **FACTUALITY & IDENTIFICATION:** If the player asks your character to examine, read, or identify an object, item, or scroll in the scene (or carried by an NPC), and you have that information in "Entities Present", you can help. However:
      - **CRITICAL (SKILL CHECKS):** If identifying or understanding the object requires a skill check (such as Arcana, Investigation, History, etc.) and the result of that check is a **FALLO** or **FALLO CRÍTICO** (as specified in \`skillCheckResult\`), you **MUST NOT** reveal the object's true identity, name, or properties. You must remain in character and express doubt, confusion, lack of knowledge, or offer an incorrect guess (e.g., "Parece algún tipo de pergamino antiguo, pero los símbolos me resultan indescifrables...", "No reconozco esa escritura, Galador").
      - Only reveal the true identity (e.g., "Es un Pergamino de Hablar con los Animales") if a skill check is successful, or if no check was required.
    - **ACTIVE EFFECTS & COMMUNICATION BARRIERS:** If a communication effect like "speak_with_animals" is in the 'Active Magical/World Effects', any communication barriers listed in the entities' descriptions (such as carrying a scroll in their mouth, barking/bleating, or needing a spell to speak) are now bypassed for you. You can understand them and converse with them fully. Do NOT act as if you cannot understand them or as if they still need the scroll/spell read.
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
            const response = await executePromptWithRetry(
                reactionGenerationPrompt,
                {
                    character: characterData,
                    context: context,
                    chatHistory: input.chatHistory,
                    isBeforeDm: input.reactionTiming === 'before_dm',
                    isAfterDm: input.reactionTiming === 'after_dm' || !input.reactionTiming,
                    locationContext: input.locationContext,
                    presentEntities: input.presentEntities,
                    activeEffects: input.activeEffects,
                    skillCheckResult: input.skillCheckResult,
                },
                { flowName: 'companionExpert' }
            );
            const { output } = response;

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
