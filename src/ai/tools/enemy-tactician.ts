'use server';
/**
 * @fileOverview A Genkit flow that acts as the "enemy brain" in combat.
 */
import { ai } from '@/ai/genkit';
import { dndApiLookupTool } from './dnd-api-lookup';
import { adventureLookupTool } from './adventure-lookup';
import { log } from '@/lib/logger';
import { executePromptWithRetry } from '../flows/retry-utils';
import {
  EnemyTacticianInputSchema,
  EnemyTacticianOutputSchema,
  type EnemyTacticianInput,
  type EnemyTacticianOutput,
} from './combat/tactician-schemas';

const enemyTacticianPrompt = ai.definePrompt({
  name: 'enemyTacticianPrompt',
  input: { schema: EnemyTacticianInputSchema },
  output: { schema: EnemyTacticianOutputSchema },
  tools: [dndApiLookupTool, adventureLookupTool],
  prompt: `You are a D&D 5e AI tactician for hostile monsters. Your job is to decide the action for ONE monster on its turn and provide the output in a specific JSON format. Reply in Spanish (Spain).

**Turn Information:**
- **Your Turn:** {{{activeCombatant}}}
- **Location:** {{{locationDescription}}}
- **Your Enemies (The Party):**
  {{#each party}}
  - **{{this.name}}** (ID: {{this.id}}, HP: {{this.hp.current}}/{{this.hp.max}}, AC: {{this.ac}})
  {{/each}}
- **Your Allies:**
  {{#each enemies}}
  - **{{this.name}}** (ID: {{this.id}}, Status: {{this.hp}})
  {{/each}}
- **Recent Events:**
  \`\`\`
  {{{conversationHistory}}}
  \`\`\`

**Your Task:**
1.  **CRITICAL - You MUST choose a combat action:** You MUST select an action for **{{{activeCombatant}}}**. "No hacer nada" is FORBIDDEN unless the monster is dead or unconscious. You MUST attack, use an ability, or take another combat action. If you don't know the monster's abilities, use the \`dndApiLookupTool\` to look up **{{{activeCombatant}}}** and find its available actions (attacks, special abilities, etc.).
2.  **Analyze & Decide:** Choose the best tactical action. Usually, this means attacking the most injured or threatening player. For monsters like Mimics, use their Pseudopod attack. For goblins, use their scimitar. Always choose an aggressive action.
3.  **Generate JSON Output:** Fill out the following fields based on your decision. The output MUST be a valid JSON object matching the required schema.

**JSON Output Fields & Rules:**

-   \`actionDescription\` (string): A brief technical label. *Example: "Ataque con Cimitarra"*.
-   \`targetId\` (string | null): The ID of your target from the list above.
-   \`diceRolls\` (array): The dice rolls needed for the action. This is CRITICAL.

**Dice Roll Rules:**
- **For Standard Attacks (Melee/Ranged):** Leave \`diceRolls\` as an empty array \`[]\`. The system will automatically calculate the correct attack and damage rolls based on the monster's stats.
- **For Spells/Special Abilities:** You MAY provide dice rolls if it's a complex ability not covered by standard attacks, but usually an empty array is preferred.

**OUTPUT FORMAT (CRITICAL):**
- You MUST return ONLY a valid JSON object. Do NOT wrap it in markdown code blocks (\`\`\`json\`\`\`).
- Do NOT include any text before or after the JSON.
- The JSON must match this exact structure:

Example output for a Goblin attacking with a scimitar:
{
  "actionDescription": "Ataque con Cimitarra",
  "targetId": "player-1",
  "diceRolls": []
}

Example output for a Mimic using its Pseudopod attack:
{
  "actionDescription": "Ataque con Pseudópodo",
  "targetId": "player-1",
  "diceRolls": []
}

**FORBIDDEN OUTPUTS:**
- "No hacer nada" - This is NEVER a valid action unless the monster is dead/unconscious.
- Empty or null actionDescription - You MUST provide a combat action.

Return ONLY the JSON object, nothing else.`,
});

export const enemyTacticianTool = ai.defineTool(
  {
    name: 'enemyTacticianTool',
    description: 'Determines the most logical action for a hostile NPC/monster during its turn in combat.',
    inputSchema: EnemyTacticianInputSchema,
    outputSchema: EnemyTacticianOutputSchema,
  },
  async (input) => {
    try {
      log.aiTool('enemyTacticianTool', 'Processing enemy turn', {
        activeCombatant: input.activeCombatant,
        enemiesCount: input.enemies?.length || 0,
        partySize: input.party?.length || 0,
      });

      let output;
      let response: any = null;
      try {
        response = await executePromptWithRetry(
          enemyTacticianPrompt,
          input,
          { flowName: 'enemyTactician' }
        );
        output = response.output;
      } catch (promptError: any) {
        // Catch Genkit schema validation errors (when AI returns null)
        if (promptError?.message?.includes('Schema validation failed') ||
          promptError?.message?.includes('INVALID_ARGUMENT') ||
          promptError?.code === 'INVALID_ARGUMENT') {
          log.warn('AI returned null/invalid output for enemy, using default action', {
            module: 'AITool',
            tool: 'enemyTacticianTool',
            activeCombatant: input.activeCombatant,
            errorMessage: promptError.message,
            errorCode: promptError.code,
            errorDetails: promptError.details || promptError.cause || 'No details available',
            errorStack: promptError.stack?.substring(0, 500), // Primeros 500 chars del stack
          });
          return {
            actionDescription: "No hace nada",
            targetId: null,
            diceRolls: [],
          };
        }
        // Re-throw if it's a different error
        throw promptError;
      }

      if (!output) {
        log.error('AI failed to return action for enemy', {
          module: 'AITool',
          tool: 'enemyTacticianTool',
          activeCombatant: input.activeCombatant,
          responseReceived: !!response,
          responseKeys: response ? Object.keys(response) : [],
        });
        return {
          actionDescription: "No hace nada",
          targetId: null,
          diceRolls: [],
        };
      }

      log.aiTool('enemyTacticianTool', 'Enemy action determined', {
        activeCombatant: input.activeCombatant,
        targetId: output.targetId,
        hasDiceRolls: (output.diceRolls?.length || 0) > 0,
      });

      return output;

    } catch (e: any) {
      log.error('Critical error in enemyTacticianTool', {
        module: 'AITool',
        tool: 'enemyTacticianTool',
        activeCombatant: input.activeCombatant,
      }, e);
      return {
        actionDescription: "No hace nada",
        targetId: null,
        diceRolls: [],
      };
    }
  }
);
