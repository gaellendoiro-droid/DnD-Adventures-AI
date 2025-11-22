'use server';
/**
 * @fileOverview A Genkit tool that acts as the "companion brain" in combat.
 */
import { ai } from '@/ai/genkit';
import { dndApiLookupTool } from './dnd-api-lookup';
import { adventureLookupTool } from './adventure-lookup';
import { log } from '@/lib/logger';
import { retryWithExponentialBackoff } from '../flows/retry-utils';
import {
  CompanionTacticianInputSchema,
  CompanionTacticianOutputSchema,
  type CompanionTacticianInput,
  type CompanionTacticianOutput,
} from './combat/tactician-schemas';

const companionTacticianPrompt = ai.definePrompt({
  name: 'companionTacticianPrompt',
  input: { schema: CompanionTacticianInputSchema },
  output: { schema: CompanionTacticianOutputSchema },
  tools: [dndApiLookupTool, adventureLookupTool],
  prompt: `You are a D&D 5e AI tactician for a friendly companion. Your job is to decide the action for ONE companion on their turn and provide the output in a specific JSON format. Reply in Spanish (Spain).

**Turn Information:**
- **Your Turn:** {{{activeCombatant}}}
- **Location:** {{{locationDescription}}}
- **Your Party (Allies):**
  {{#each party}}
  - **{{this.name}}** (ID: {{this.id}}, HP: {{this.hp.current}}/{{this.hp.max}}, AC: {{this.ac}}, Class: {{this.characterClass}})
    {{#if this.abilityModifiers}}
    - **Ability Modifiers:** FUE {{this.abilityModifiers.fuerza}}, DES {{this.abilityModifiers.destreza}}, CON {{this.abilityModifiers.constitución}}, INT {{this.abilityModifiers.inteligencia}}, SAB {{this.abilityModifiers.sabiduría}}, CAR {{this.abilityModifiers.carisma}}
    {{/if}}
    {{#if this.proficiencyBonus}}
    - **Proficiency Bonus:** +{{this.proficiencyBonus}}
    {{/if}}
  {{/each}}
- **YOUR INVENTORY (ONLY USE ITEMS YOU HAVE):**
  {{#if inventory}}
    {{#each inventory}}
    - **{{this.name}}** (Qty: {{this.quantity}}){{#if this.description}}: {{this.description}}{{/if}}
    {{/each}}
  {{else}}
    - No items available
  {{/if}}
- **YOUR AVAILABLE SPELLS (ONLY USE THESE):**
  {{#if availableSpells}}
    {{#each availableSpells}}
    - **{{this.name}}** (Level {{this.level}}): {{this.description}}
    {{/each}}
  {{else}}
    - **No spells available** - You can only use weapons or basic actions.
  {{/if}}
- **Enemies:**
  {{#each enemies}}
  - **{{this.name}}** (ID: {{this.id}}, Status: {{this.hp}})
  {{/each}}
- **Recent Events:**
  \`\`\`
  {{{conversationHistory}}}
  \`\`\`

**Your Task:**
1. **Analyze & Decide:** 
   - Check if any ally is significantly wounded (HP < 50% max). If yes AND you have healing spells in YOUR AVAILABLE SPELLS, prioritize healing the most injured ally.
   - Otherwise, attack the most logical enemy target.
   - **CRITICAL:** Only use spells from YOUR AVAILABLE SPELLS and weapons from YOUR INVENTORY. Do not assume you have items/spells not listed.

2. **Generate JSON Output:** Fill out the following fields. The output MUST be a valid JSON object matching the required schema.

**JSON Output Fields & Rules:**

- \`actionDescription\` (string): A brief technical label. *Example: "Ataque con Maza", "Lanzar Rayo de Escarcha", "Curar a Galador"*.
- \`targetId\` (string | null): The ID of your target (ally for healing, enemy for attacking).
- \`diceRolls\` (array): The dice rolls needed for the action. This is CRITICAL.

**Dice Roll Rules:**
- **For Standard Attacks (Melee/Ranged):** Leave \`diceRolls\` as an empty array \`[]\`. The system will automatically calculate the correct attack and damage rolls based on your stats.
- **For Healing/Spells:** You MAY provide dice rolls if it's a complex ability (like healing), but for standard attacks, use an empty array.

**OUTPUT FORMAT (CRITICAL):**
- You MUST return ONLY a valid JSON object. Do NOT wrap it in markdown code blocks (\`\`\`json\`\`\`).
- Do NOT include any text before or after the JSON.
- The JSON must match this exact structure:

Example output for an attack with a mace:
{
  "actionDescription": "Ataque con Maza",
  "targetId": "enemy-1",
  "diceRolls": []
}

Example output for healing:
{
  "actionDescription": "Curar a Galador",
  "targetId": "player-1",
  "diceRolls": [
    {
      "roller": "Elara",
      "rollNotation": "1d8+3",
      "description": "Curación",
      "attackType": "healing"
    }
  ]
}

Return ONLY the JSON object, nothing else.`,
});

export const companionTacticianTool = ai.defineTool(
  {
    name: 'companionTacticianTool',
    description: 'Determines the most logical action for a friendly AI-controlled companion during their turn in combat.',
    inputSchema: CompanionTacticianInputSchema,
    outputSchema: CompanionTacticianOutputSchema,
  },
  async (input) => {
    try {
      log.debug('Calling companionTacticianPrompt', {
        module: 'AITool',
        tool: 'companionTacticianTool',
        activeCombatant: input.activeCombatant,
        partySize: input.party.length,
        enemiesCount: input.enemies.length,
      });

      let output;
      try {
        const response = await retryWithExponentialBackoff(
          () => companionTacticianPrompt(input),
          3,
          1000,
          'companionTactician'
        );
        output = response.output;

        log.debug('Received response from companionTacticianPrompt', {
          module: 'AITool',
          tool: 'companionTacticianTool',
          activeCombatant: input.activeCombatant,
          hasOutput: !!output,
          outputKeys: output ? Object.keys(output) : [],
        });
      } catch (promptError: any) {
        // Catch Genkit schema validation errors (when AI returns null)
        if (promptError?.message?.includes('Schema validation failed') ||
          promptError?.message?.includes('INVALID_ARGUMENT') ||
          promptError?.code === 'INVALID_ARGUMENT') {
          log.warn('AI returned null/invalid output for companion, using default action', {
            module: 'AITool',
            tool: 'companionTacticianTool',
            activeCombatant: input.activeCombatant,
            errorMessage: promptError.message,
            errorCode: promptError.code,
            errorDetails: promptError.details || 'No details available',
          });
          return {
            actionDescription: "Pasa el turno",
            targetId: null,
            diceRolls: [],
          };
        }
        // Re-throw if it's a different error
        throw promptError;
      }

      if (!output) {
        log.error('AI failed to return action for companion', {
          module: 'AITool',
          tool: 'companionTacticianTool',
          activeCombatant: input.activeCombatant,
        });
        return {
          actionDescription: "Pasa el turno",
          targetId: null,
          diceRolls: [],
        };
      }

      return output;

    } catch (e: any) {
      log.error('Critical error in companionTacticianTool', {
        module: 'AITool',
        tool: 'companionTacticianTool',
        activeCombatant: input.activeCombatant,
      }, e);
      return {
        actionDescription: "Pasa el turno",
        targetId: null,
        diceRolls: [],
      };
    }
  }
);
