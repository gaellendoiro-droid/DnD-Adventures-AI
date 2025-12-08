
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { executePromptWithRetry } from '../retry-utils';
import { SkillCheckExpertInputSchema, SkillCheckExpertOutputSchema, type SkillCheckExpertInput, type SkillCheckExpertOutput } from '../schemas';
import { log } from '@/lib/logger';

/**
 * SkillCheckExpert - An AI expert specialized in adjudicating D&D 5e mechanics.
 * Responsibilities:
 * 1. Determine the correct Skill (e.g. Athletics vs Acrobatics).
 * 2. Set the Difficulty Class (DC) based on 5e standards (5-30).
 * 3. Evaluate Modifiers (Advantage/Disadvantage) based on context.
 * 4. Generate immersive narrations for the outcome.
 */
const skillCheckExpertPrompt = ai.definePrompt({
    name: 'skillCheckExpertPrompt',
    input: { schema: SkillCheckExpertInputSchema },
    output: { schema: SkillCheckExpertOutputSchema },
    config: {
        safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
    },
    prompt: `You are an expert D&D 5e Dungeon Master acting as a **MECHANICAL REFEREE**.
Your goal is to translate a player's narrative intention into a concrete D&D 5e Skill Check.

**INPUT DATA:**
- **Character:** "{{characterName}}"
- **Action:** "{{playerAction}}"
- **Context:** "{{locationContext}}"
{{#if targetEntity}}
- **Target:** "{{targetEntity}}"
{{/if}}

**INSTRUCTIONS:**

1. **SELECT SKILL:** Choose the ONE skill that best fits the action.
   - **Athletics:** Climbing, jumping, swimming, smashing.
   - **Acrobatics:** Balancing, tumbling, escaping bonds.
   - **Stealth:** Hiding, moving silently.
   - **Sleight of Hand:** Pickpocketing, concealing object, lockpicking (if using tools).
   - **Perception:** Spotting hidden things, hearing sounds.
   - **Investigation:** Deducing clues from objects, searching a room thoroughly.
   - **Insight:** Detecting lies, reading emotions.
   - **Survival:** Tracking, foraging, predicting weather.
   - **History/Arcana/Religion/Nature:** Recalling lore.
   - **Persuasion/Deception/Intimidation:** Social interactions.

2. **DETERMINE DC (Difficulty Class):**
   - **5 (Very Easy):** Routine task with minor chance of failure.
   - **10 (Easy):** Most adventurers can do this often.
   - **15 (Medium):** Requires competence or luck. Standard adventurer challenge.
   - **20 (Hard):** Difficult even for pros.
   - **25 (Very Hard):** Heroic feat.
   - **30 (Impossible):** Near supernatural feat.

3. **DETERMINE ADVANTAGE/DISADVANTAGE:**
   - **Advantage:** Character has help, perfect tool, or ideal conditions (e.g. attacking prone enemy, hiding in pitch black).
   - **Disadvantage:** Character is hindered, poor visibility, slippery surface, or fatigued.
   - **Normal:** Most cases.

4. **NARRATION:**
   - **Attempt:** Describe the character STARTING the action. Create suspense. Do NOT resolve it.
   - **Success:** Describe a competent, successful outcome.
   - **Failure:** Describe a consequence or simply failing to achieve the goal.
   - **Criticals:** Add extra flair for Nat 20/Nat 1.

**LANGUAGE:**
Reply in **SPANISH (Spain)** for all narrations. Keep reasoning technical.

**EXAMPLE OUTPUT:**
Action: "I try to climb the slippery wall"
{
  "selectedSkill": "athletics",
  "difficultyClass": 15, // Slippery makes it Medium/Hard
  "suggestedMode": "normal", // Or disadvantage if very slippery
  "reasoning": "Climbing is Athletics. Wall is slippery so DC is higher than normal (10 -> 15).",
  "narrations": {
     "attempt": "Galador busca asideros en la roca cubierta de musgo húmedo e intenta impulsarse hacia arriba...",
     "success": "Con un esfuerzo de sus músculos, logra aferrarse a un saliente seco y se iza hasta la cima.",
     "failure": "Sus dedos resbalan en el limo y cae de espaldas dolorosamente al suelo.",
     ...
  }
}
`,
});

export const skillCheckExpertFlow = ai.defineFlow(
    {
        name: 'skillCheckExpertFlow',
        inputSchema: SkillCheckExpertInputSchema,
        outputSchema: SkillCheckExpertOutputSchema,
    },
    async (input) => {
        const debugLogs: string[] = [];
        const localLog = (message: string) => {
            debugLogs.push(message);
        };

        try {
            localLog(`SkillCheckExpert: Evaluating action for ${input.characterName}...`);

            const llmResponse = await executePromptWithRetry(
                skillCheckExpertPrompt,
                input,
                { flowName: 'skillCheckExpert' }
            );

            let output = llmResponse.output;
            if (!output) throw new Error("SkillCheckExpert: AI returned null output.");

            // Add logs to output
            return { ...output, debugLogs };

        } catch (e: any) {
            localLog(`SkillCheckExpert: Failed. Error: ${e.message}`);
            log.error("Error in skillCheckExpertFlow", { flow: 'skillCheckExpert' }, e);
            throw new Error(`skillCheckExpertFlow failed: ${e.message}`);
        }
    }
);

export async function skillCheckExpert(input: SkillCheckExpertInput): Promise<SkillCheckExpertOutput> {
    return skillCheckExpertFlow(input);
}
