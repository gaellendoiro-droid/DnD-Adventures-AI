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
import { log } from '@/lib/logger';
import { retryWithExponentialBackoff } from '@/ai/flows/retry-utils';
import {
  CombatNarrationExpertInputSchema,
  CombatNarrationExpertOutputSchema,
  type CombatNarrationExpertInput,
  type CombatNarrationExpertOutput,
} from './tactician-schemas';

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
  prompt: `You are a D&D 5e Dungeon Master narrating combat actions. Reply in Spanish from Spain.

**Generate Complete Combat Narration**

Create a vivid, complete narration of {{{attackerName}}}'s action against {{{targetName}}}.

**Context:**
- Action: {{{actionDescription}}}
- Result: {{{attackResult}}}
{{#if targetKilled}}
- Target was KILLED - integrate death into narration
{{/if}}
{{#if targetKnockedOut}}
- Target was KNOCKED UNCONSCIOUS - describe falling unconscious
{{/if}}

**Structure (1-2 sentences):**
1. **Preparation/Intent:** How {{{attackerName}}} prepares or initiates the action
2. **Execution:** The attack movement, sound, visual details
3. **Impact:** How it connects (or misses) and the target's reaction
4. **Result:** Final outcome (damage effect, death, miss)

**Requirements:**
- Be vivid and exciting, show don't tell
- Integrate death/unconsciousness naturally into the narrative
- FORBIDDEN: Generic phrases like "X ataca a Y"
- DO NOT include dice numbers or damage numbers

**Examples:**

*Hit (killed):* "El goblin se abalanza sobre Galador con un gruñido salvaje, su cimitarra trazando un arco mortal. El filo corta el aire con un silbido y encuentra su marca en el cuello del aventurero. Galador se tambalea, sus ojos se apagan, y cae de rodillas antes de desplomarse sin vida."

*Hit (damage):* "Merryl gira su bastón con precisión y lo descarga contra el costado del goblin. El impacto resuena con un crujido sordo. La criatura aúlla de dolor y retrocede tambaleándose, sujetándose las costillas."

*Miss:* "El orco ruge y lanza un hachazo brutal hacia Galador. El aventurero se agacha en el último instante y el arma pasa rozando su pelo, estrellándose contra la pared con una lluvia de chispas."
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
      localLog(`CombatNarrationExpert: Generating narration for ${input.attackerName} -> ${input.targetName}`);
      
      log.aiTool('combatNarrationExpertTool', 'Generating combat narration', {
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
        
        // Fallback narration - MUST be descriptive, not generic
        let fallbackNarration = '';
        if (input.attackResult === 'hit' || input.attackResult === 'critical') {
          const damageDesc = input.damageDealt ? ` El impacto es claro y ${input.targetName} se tambalea bajo el golpe.` : '';
          const deathDesc = input.targetKilled ? ` ${input.targetName} se desploma sin vida.` : '';
          fallbackNarration = `${input.attackerName} golpea a ${input.targetName} con fuerza.${damageDesc}${deathDesc}`;
        } else if (input.attackResult === 'fumble') {
          fallbackNarration = `${input.attackerName} falla estrepitosamente su ataque contra ${input.targetName}, perdiendo el equilibrio.`;
        } else {
          fallbackNarration = `${input.attackerName} intenta atacar a ${input.targetName}, pero ${input.targetName} esquiva el golpe en el último momento.`;
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

      // Validate narration is not generic
      const narration = output.narration || '';
      const isGeneric = narration.match(/^[^.]* (ataca|golpea) a [^.]*\.?$/i) || 
                        narration.length < 30 ||
                        (narration.includes('ataca a') && !narration.includes('impacta') && !narration.includes('golpea') && !narration.includes('corta'));

      if (isGeneric) {
        localLog(`WARNING: Generated narration is too generic: "${narration}". Using enhanced fallback.`);
        log.warn('Generated narration is too generic, using enhanced fallback', {
          module: 'AITool',
          tool: 'combatNarrationExpertTool',
          attacker: input.attackerName,
          target: input.targetName,
          narration,
        });
        
        // Enhanced fallback that is descriptive
        let enhancedFallback = '';
        if (input.attackResult === 'hit' || input.attackResult === 'critical') {
          const weaponDesc = input.weaponName ? ` con ${input.weaponName}` : '';
          const impactDesc = input.damageDealt && input.damageDealt > 5 
            ? ` El impacto es contundente y ${input.targetName} se tambalea bajo el golpe.`
            : ` El golpe encuentra su marca y ${input.targetName} retrocede.`;
          const deathDesc = input.targetKilled 
            ? ` ${input.targetName} se desploma sin vida, su cuerpo inerte cayendo al suelo.`
            : '';
          enhancedFallback = `${input.attackerName} golpea a ${input.targetName}${weaponDesc} con fuerza.${impactDesc}${deathDesc}`;
        } else {
          enhancedFallback = `${input.attackerName} intenta atacar a ${input.targetName}, pero ${input.targetName} esquiva el golpe en el último momento.`;
        }
        
        return {
          narration: enhancedFallback,
          debugLogs,
        };
      }

      localLog("CombatNarrationExpert: Successfully generated narration.");
      
      log.aiTool('combatNarrationExpertTool', 'Combat narration generated successfully', {
        attacker: input.attackerName,
        target: input.targetName,
        narrationLength: narration.length,
      });

      return {
        narration,
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
      
      // Return a descriptive fallback narration instead of throwing
      let fallbackNarration = '';
      if (input.attackResult === 'hit' || input.attackResult === 'critical') {
        fallbackNarration = `${input.attackerName} golpea a ${input.targetName} con fuerza.`;
      } else {
        fallbackNarration = `${input.attackerName} intenta atacar a ${input.targetName}, pero falla.`;
      }
      
      return {
        narration: fallbackNarration,
        debugLogs,
      };
    }
  }
);

