
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
{{#if adventureLore}}
- **Adventure Lore:** "{{adventureLore}}"
{{/if}}
{{#if conversationHistory}}
- **Recent History:**
\`\`\`
{{{conversationHistory}}}
\`\`\`
{{/if}}

**INSTRUCTIONS:**

0. **RESOLVE CONTEXT & ELISIONS (CRITICAL):**
   - Use the \`conversationHistory\` (Recent History) to resolve any context, pronouns, or elisions in the player's action.
   - For example: if the player's action is "Merryl, try it!" or "Léelo tú", look at the previous turn in the history to see what they are trying to do (e.g. they failed to inspect a scroll, or wanted to check a door). You must evaluate the check based on the **actual action being attempted** (e.g. deciphering a scroll -> Arcana or Investigation), NOT the raw command words.
   - If the player's action is too vague to determine any specific mechanical attempt even with history, default to a generic check or do not make it a check.

0.5. **CONSULT ADVENTURE LORE:** If "Adventure Lore" is provided, look up the description, secrets, objects (like scrolls, magical items, or traps) and rules of the adventure to identify the exact entity, spell level, or item the player is interacting with (e.g., identifying if a scroll is a level 1 spell like "Speak with Animals", or if an item is a rare artifact). Use this specific information to select the correct skill and determine the difficulty class (DC) accurately.

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
   Determine the DC (5 to 30) strictly based on D&D 5e DMG guidelines:
   
   - **5 (Muy Fácil):** Tareas rutinarias con mínimo riesgo de fallo en condiciones ideales.
   
   - **10 (Fácil):** 
     * *Acciones físicas:* Saltar obstáculos comunes, forzar cerraduras oxidadas o simples, esconderse en maleza espesa.
     * *Magia/Objetos:* Descifrar o identificar trucos, pociones comunes, o pergaminos/hechizos de nivel 1 (ej. *Hablar con los animales*, *Luz*, *Curar heridas*).
     * *Social:* Persuadir o convencer a NPCs neutrales sobre algo lógico y sin riesgo.
     
   - **15 (Moderado):** 
     * *Acciones físicas:* Escalar una pared resbaladiza, forzar una cerradura de hierro estándar, saltar un foso de 3 metros, mantener el equilibrio en una cornisa estrecha.
     * *Magia/Objetos:* Descifrar, identificar o contrarrestar pergaminos/hechizos de nivel 2 o 3 (ej. *Bola de fuego*, *Invisibilidad*, *Levitar*), u objetos mágicos poco comunes.
     * *Social:* Mentir a un guardia levemente receloso o persuadir a alguien que tiene intereses moderadamente contrarios.
     
   - **20 (Difícil):** 
     * *Acciones físicas:* Escalar muros lisos de piedra húmeda sin equipo, forzar cerraduras acorazadas o protegidas por trampas, desactivar trampas complejas.
     * *Magia/Objetos:* Descifrar o contrarrestar pergaminos/hechizos de nivel 4 o 5 (ej. *Polimorfia*, *Teletransporte*), u objetos mágicos raros.
     * *Social:* Intimidar o convencer a hostiles activos, o sostener mentiras sumamente sospechosas o inverosímiles.
     
   - **25 (Muy Difícil):** 
     * *Magia/Objetos:* Descifrar o contrarrestar pergaminos/hechizos de nivel 6 a 8 (ej. *Desintegrar*, *Terremoto*), u objetos mágicos muy raros.
     * *Social:* Hacer que un enemigo jurado coopere o revele secretos de alto riesgo.
     
   - **30 (Casi Imposible):**
     * *Magia/Objetos:* Magia legendaria o hechizos de nivel 9 (ej. *Polimorfia verdadera*, *Deseo*), o artefactos antiguos del multiverso.

3. **DETERMINE ADVANTAGE/DISADVANTAGE:**
   - **Advantage:** Character has help, perfect tool, or ideal conditions (e.g. attacking prone enemy, hiding in pitch black).
   - **Disadvantage:** Character is hindered, poor visibility, slippery surface, or fatigued.
   - **Normal:** Most cases.

4. **DETERMINE COMBATE AL FALLAR (combatOnFailure):**
   - Establece "combatOnFailure" como 'true' si un fallo en esta tirada de habilidad provocaría de forma lógica e inevitable que la tensión escale a un combate inmediato.
   - Ejemplos comunes:
     - El jugador intenta intimidar a un cazador agresivo y hostil para que se marche. Si falla, el cazador se enfurece y ataca.
     - El jugador intenta convencer con mentiras a un guardia sospechoso. Si falla, el guardia descubre la mentira y saca su arma.
     - El jugador intenta cruzar sigilosamente por delante de unas criaturas salvajes. Si falla, es descubierto y las criaturas atacan de inmediato.
   - En tareas donde no hay peligro directo ni enemigos activos en escena (como abrir una cerradura en un templo abandonado o buscar un libro en una biblioteca), déjalo como 'false' o no lo incluyas.

5. **NARRATION & REASONING (STRICT GROUNDING):**
   - **CRITICAL GROUNDING RULE:** You MUST base your \`reasoning\` and \`narrations\` **exclusively** on the provided \`playerAction\`, \`targetEntity\`, and \`locationContext\`. **NEVER** invent NPCs, guards, gates, doors, locks, or scenarios that are not explicitly present in \`playerAction\` or \`locationContext\`.
   - **Attempt:** Describe the character STARTING the exact action requested. Create suspense. Do NOT resolve it.
   - **Success:** Describe a competent, successful outcome of that exact action.
   - **Failure:** Describe a consequence or simply failing to achieve the goal.
   - **Criticals:** Add extra flair for Nat 20/Nat 1.

**LANGUAGE:**
Reply in **SPANISH (Spain)** for all narrations. Keep reasoning technical.

Return a valid JSON object matching the schema. The JSON must contain the keys "selectedSkill" (e.g., athletics), "difficultyClass" (a number), "suggestedMode" (normal/advantage/disadvantage), "combatOnFailure" (boolean), "reasoning" (text), and "narrations" (an object with attempt, success, failure, criticalSuccess, and criticalFailure text fields). Do NOT include any markdown code blocks, just return the JSON object matching the schema.`,
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
