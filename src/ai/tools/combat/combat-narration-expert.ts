'use server';
/**
 * @fileOverview Combat Narration Expert - Generates descriptive narrations for combat actions.
 * 
 * This tool handles both intention and resolution narrations for combat:
 * - Resolution narration: Based on results (hit/miss, damage, critical, etc.)
 * - Intention narration: Based on planned action (future use for AI turns)
 * 
 * Currently used for player turn resolution narrations.
 * Future: Will replace narration generation in enemyTactician and companionTactician.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { retryWithExponentialBackoff } from '@/ai/flows/retry-utils';

/**
 * Input schema for combat narration expert
 */
const CombatNarrationExpertInputSchema = z.object({
  narrationType: z.enum(['resolution']).describe("Type of narration to generate. Currently only 'resolution' (after action results are known) is supported. 'intention' will be added in the future for AI turns."),
  
  // Action context
  attackerName: z.string().describe("Name of the character performing the action (e.g., 'Galador', 'Goblin 1')."),
  targetName: z.string().describe("Name of the target character (e.g., 'Orco 1', 'Merryl')."),
  playerAction: z.string().describe("The original action text from the player (e.g., 'Ataco al orco con mi espada')."),
  
  // Combat results (for resolution narration)
  attackResult: z.enum(['hit', 'miss', 'critical', 'fumble']).describe("Result of the attack roll: 'hit' (normal hit), 'miss' (failed), 'critical' (natural 20 or crit), 'fumble' (natural 1 or pifia)."),
  damageDealt: z.number().optional().describe("Amount of damage dealt (only if attack hit). 0 or undefined if attack missed."),
  targetPreviousHP: z.number().optional().describe("Target's HP before the attack."),
  targetNewHP: z.number().optional().describe("Target's HP after the attack."),
  targetKilled: z.boolean().optional().describe("True if the target was killed/defeated."),
  targetKnockedOut: z.boolean().optional().describe("True if the target was knocked unconscious (for player characters/companions)."),
  
  // Context for richer narration
  locationDescription: z.string().optional().describe("Brief description of the current location for environmental context."),
  conversationHistory: z.string().optional().describe("Recent combat events for context continuity."),
});
export type CombatNarrationExpertInput = z.infer<typeof CombatNarrationExpertInputSchema>;

/**
 * Output schema for combat narration expert
 */
const CombatNarrationExpertOutputSchema = z.object({
  narration: z.string().describe("The descriptive narration of the combat action. Should be exciting, immersive, and in Spanish from Spain. Do NOT include dice roll results or HP numbers - those are shown separately."),
  debugLogs: z.array(z.string()).optional(),
});
export type CombatNarrationExpertOutput = z.infer<typeof CombatNarrationExpertOutputSchema>;

/**
 * Prompt for generating combat narrations
 */
const combatNarrationPrompt = ai.definePrompt({
  name: 'combatNarrationPrompt',
  input: { schema: CombatNarrationExpertInputSchema },
  output: { schema: CombatNarrationExpertOutputSchema },
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ],
  },
  prompt: `You are an expert D&D 5e Dungeon Master specialized in creating vivid, exciting combat narrations. You MUST ALWAYS reply in Spanish from Spain.

**YOUR TASK: Generate a Descriptive Combat Narration**

You will receive the RESULTS of a combat action (attack hit/missed, damage dealt, etc.) and must create an exciting, immersive narration that brings the action to life.

**CONTEXT:**
- **Attacker:** {{{attackerName}}}
- **Target:** {{{targetName}}}
- **Player's Action:** "{{{playerAction}}}"
- **Attack Result:** {{{attackResult}}}
{{#if damageDealt}}
- **Damage Dealt:** {{{damageDealt}}} points
{{/if}}
{{#if targetPreviousHP}}
- **Target HP:** {{{targetPreviousHP}}} → {{{targetNewHP}}}
{{/if}}
{{#if targetKilled}}
- **Target Status:** KILLED/DEFEATED
{{/if}}
{{#if targetKnockedOut}}
- **Target Status:** KNOCKED UNCONSCIOUS
{{/if}}
{{#if locationDescription}}
- **Location:** {{{locationDescription}}}
{{/if}}

**NARRATION GUIDELINES:**

1. **Be Descriptive and Exciting:**
   - Paint a vivid picture of the action
   - Use dynamic verbs and sensory details
   - Make the player feel like a hero (or witness a dramatic failure)

2. **Match the Tone to the Result:**
   - **Critical Hit:** Epic, powerful, devastating description
   - **Normal Hit:** Solid, effective, competent action
   - **Miss:** Near miss, blocked, dodged - still exciting, not embarrassing
   - **Fumble:** Dramatic failure, comedic or tense depending on context

3. **Incorporate the Context:**
   - Reference the player's original action when possible
   - Consider the environment if provided
   - Acknowledge if target was killed or knocked out (but don't repeat the mechanical message)

4. **CRITICAL - What NOT to Include:**
   - ❌ DO NOT include dice roll results (e.g., "rolled a 17", "1d20+5")
   - ❌ DO NOT include specific damage numbers (e.g., "dealt 12 damage")
   - ❌ DO NOT include HP numbers (e.g., "reduced to 5 HP")
   - ❌ DO NOT include AC comparisons (e.g., "vs AC 15")
   - These technical details are shown separately in the combat log

5. **Length:**
   - Keep it concise but impactful (2-4 sentences)
   - Focus on the most dramatic moment of the action

**EXAMPLES:**

**Critical Hit (killed enemy):**
*"La espada de Galador corta el aire con un silbido mortal. El filo encuentra su marca en el cuello del orco con precisión quirúrgica, y la bestia se desploma con un último rugido ahogado."*

**Normal Hit (significant damage):**
*"El golpe de Galador impacta de lleno en el costado del goblin. La criatura aúlla de dolor y retrocede tambaleándose, su postura ahora claramente debilitada."*

**Miss (but dramatic):**
*"Galador lanza un tajo horizontal, pero el orco se agacha en el último momento. La hoja pasa rozando las puntas de su pelo grasiento, tan cerca que el guerrero puede ver el miedo momentáneo en los ojos de su enemigo."*

**Fumble:**
*"Galador carga con determinación, pero su pie resbala en un charco de sangre. Su espada corta el aire en un arco inútil mientras lucha por mantener el equilibrio. El orco gruñe, una mezcla de sorpresa y burla en su rostro."*

**Now generate the narration for this combat action. Remember: descriptive, exciting, in Spanish from Spain, NO dice/damage/HP numbers.**
`,
});

/**
 * Combat Narration Expert Tool
 * Generates descriptive narrations for combat actions
 */
export const combatNarrationExpertTool = ai.defineTool(
  {
    name: 'combatNarrationExpertTool',
    description: 'Generates immersive, descriptive narrations for combat actions based on their results. Used for player turn resolution narrations.',
    inputSchema: CombatNarrationExpertInputSchema,
    outputSchema: CombatNarrationExpertOutputSchema,
  },
  async (input) => {
    const debugLogs: string[] = [];
    const localLog = (message: string) => {
      debugLogs.push(message);
    };

    try {
      localLog(`CombatNarrationExpert: Generating ${input.narrationType} narration for ${input.attackerName} -> ${input.targetName}`);
      
      log.aiTool('combatNarrationExpertTool', 'Generating combat narration', {
        narrationType: input.narrationType,
        attacker: input.attackerName,
        target: input.targetName,
        attackResult: input.attackResult,
      });

      // Call the LLM with retry logic
      const llmResponse = await retryWithExponentialBackoff(
        () => combatNarrationPrompt(input),
        3, // maxRetries
        1000, // initialDelayMs
        'combatNarrationExpert' // flowName
      );

      let output = llmResponse.output;

      if (!output) {
        localLog("CombatNarrationExpert: AI returned null output. Using fallback narration.");
        log.warn('AI returned null output for combat narration, using fallback', {
          module: 'AITool',
          tool: 'combatNarrationExpertTool',
          attacker: input.attackerName,
          target: input.targetName,
        });
        
        // Fallback narration based on result
        let fallbackNarration = '';
        if (input.attackResult === 'hit' || input.attackResult === 'critical') {
          fallbackNarration = `${input.attackerName} golpea a ${input.targetName} con fuerza.`;
        } else if (input.attackResult === 'fumble') {
          fallbackNarration = `${input.attackerName} falla estrepitosamente su ataque contra ${input.targetName}.`;
        } else {
          fallbackNarration = `${input.attackerName} intenta atacar a ${input.targetName}, pero falla.`;
        }
        
        return {
          narration: fallbackNarration,
          debugLogs,
        };
      }

      // Robustness check: if the model returns a raw string, wrap it
      if (typeof output === 'string') {
        localLog("CombatNarrationExpert: AI returned a raw string instead of JSON object. Wrapping it.");
        output = { narration: output };
      }

      localLog("CombatNarrationExpert: Successfully generated narration.");
      
      log.aiTool('combatNarrationExpertTool', 'Combat narration generated successfully', {
        attacker: input.attackerName,
        target: input.targetName,
        narrationLength: output.narration?.length || 0,
      });

      return {
        ...output,
        debugLogs,
      };

    } catch (e: any) {
      localLog(`CombatNarrationExpert: CRITICAL - Tool failed. Error: ${e.message}`);
      log.error('Critical error in combatNarrationExpertTool', {
        module: 'AITool',
        tool: 'combatNarrationExpertTool',
        attacker: input.attackerName,
        target: input.targetName,
      }, e);
      
      // Return a simple fallback narration instead of throwing
      return {
        narration: `${input.attackerName} ataca a ${input.targetName}.`,
        debugLogs,
      };
    }
  }
);

