
'use server';
/**
 * @fileOverview A Genkit flow that acts as the "enemy brain" in combat.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { dndApiLookupTool } from './dnd-api-lookup';
import { adventureLookupTool } from './adventure-lookup';
import { CharacterSchema } from '@/lib/schemas';


const EnemyTacticianInputSchema = z.object({
  activeCombatant: z.string().describe("The name of the hostile NPC/monster whose turn it is."),
  party: z.array(CharacterSchema).describe('An array containing the data for all characters in the party (player and AI-controlled).'),
  enemies: z.array(z.object({name: z.string(), id: z.string(), hp: z.string()})).describe("A list of all hostile NPCs/monsters currently in combat and their HP status (e.g., 'Healthy', 'Wounded', 'Badly Wounded')."),
  locationDescription: z.string().describe('A description of the current location.'),
  conversationHistory: z.string().describe("A transcript of the last few turns of combat to provide immediate context."),
});
export type EnemyTacticianInput = z.infer<typeof EnemyTacticianInputSchema>;

const EnemyTacticianOutputSchema = z.object({
    narration: z.string().describe("The AI Dungeon Master's brief narration for this enemy's action. Do not include dice rolls here."),
    targetId: z.string().nullable().describe("The unique ID of the character being targeted by the action. This can be null if the action has no specific target."),
    diceRolls: z.array(z.object({
        roller: z.string().describe("The name of the character or monster rolling the dice."),
        rollNotation: z.string().describe("The dice notation for the roll (e.g., '1d20+5', '2d6+3')."),
        description: z.string().describe("A brief description of the roll's purpose (e.g., 'Attack Roll', 'Damage Roll')."),
    })).optional().describe("An array of dice rolls required to resolve the action."),
    debugLog: z.string().optional(),
});
export type EnemyTacticianOutput = z.infer<typeof EnemyTacticianOutputSchema>;

const enemyTacticianPrompt = ai.definePrompt({
  name: 'enemyTacticianPrompt',
  input: {schema: EnemyTacticianInputSchema},
  output: {schema: EnemyTacticianOutputSchema.omit({ debugLog: true })},
  tools: [dndApiLookupTool, adventureLookupTool],
  prompt: `You are the AI brain for hostile NPCs and monsters in a D&D 5e combat. You MUST ALWAYS reply in Spanish from Spain.

**Your ONLY job is to decide the action for a SINGLE enemy on its turn.**

**CONTEXT:**
- **Location:** {{{locationDescription}}}
- **Player's Party (Your enemies):**
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

**YOUR TASK:**
It is **{{{activeCombatant}}}'s** turn.

1.  **Analyze the Battlefield:** Identify the biggest threat in the player's party. Who is most wounded? Who is the most dangerous?
2.  **Choose a Tactical Action:** Decide the most logical action. This is almost always attacking the most threatening or vulnerable player character. Use the provided tools to look up your stats and abilities.
3.  **Narrate the Action:** Provide a short, exciting narration.
4.  **Specify the Target:** In the 'targetId' field, provide the unique ID of the character you are attacking. You can see the IDs in the context above.
5.  **Request Dice Rolls:** In the 'diceRolls' field, specify ALL dice rolls needed. For an attack, you must request both an attack roll and a damage roll.

**DO NOT:**
- Do not decide whose turn it is or roll dice yourself.
- Do not determine the outcome of the rolls.

Execute the turn for **{{{activeCombatant}}}** ONLY.
`,
});

export const enemyTacticianTool = ai.defineTool(
    {
      name: 'enemyTacticianTool',
      description: 'Determines the most logical action for a hostile NPC/monster during its turn in combat.',
      inputSchema: EnemyTacticianInputSchema,
      outputSchema: EnemyTacticianOutputSchema,
    },
    async (input) => {
      const debugLog = `EnemyTacticianTool Input: ${JSON.stringify(input, null, 2)}`;
      try {
        const { output } = await enemyTacticianPrompt(input);
  
        if (!output) {
          throw new Error("The AI failed to return an action for the combatant.");
        }
        return { ...output, debugLog };
  
      } catch (e: any) {
        console.error("Critical error in enemyTacticianTool.", e);
        return {
          narration: `${input.activeCombatant} ruge con frustración, pero no hace nada.`,
          targetId: null,
          diceRolls: [],
          debugLog: `CRITICAL ERROR in enemyTacticianTool: ${e.message}`
        };
      }
    }
  );
