
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
  enemies: z.array(z.object({name: z.string(), hp: z.string()})).describe("A list of all hostile NPCs/monsters currently in combat and their HP status (e.g., 'Healthy', 'Wounded', 'Badly Wounded')."),
  locationDescription: z.string().describe('A description of the current location.'),
  conversationHistory: z.string().describe("A transcript of the last few turns of combat to provide immediate context."),
});
export type EnemyTacticianInput = z.infer<typeof EnemyTacticianInputSchema>;

// Output Schema
const EnemyTacticianOutputSchema = z.object({
  action: z.string().describe("The chosen action for the active combatant (e.g., 'Attacks Galador with its Greatsword', 'Casts a spell on Elara'). This should be a concise description of the intended action."),
  narration: z.string().describe("The AI Dungeon Master's brief narration for this enemy's action. Do not include dice rolls here."),
  diceRolls: z.array(z.object({
    roller: z.string().describe("The name of the character or monster rolling the dice."),
    rollNotation: z.string().describe("The dice notation for the roll (e.g., '1d20+5', '2d6+3')."),
    description: z.string().describe("A brief description of the roll's purpose (e.g., 'Attack Roll', 'Damage Roll')."),
  })).optional().describe("An array of dice rolls required to resolve the action. For an attack, this would include an attack roll and a damage roll."),
});
export type EnemyTacticianOutput = z.infer<typeof EnemyTacticianOutputSchema>;

// Prompt
const enemyTacticianPrompt = ai.definePrompt({
  name: 'enemyTacticianPrompt',
  input: {schema: EnemyTacticianInputSchema},
  output: {schema: EnemyTacticianOutputSchema},
  tools: [dndApiLookupTool, adventureLookupTool],
  prompt: `You are the AI brain for hostile NPCs and monsters in a D&D 5e combat. You MUST ALWAYS reply in Spanish.

**Your ONLY job is to decide the action for a SINGLE enemy on its turn.**

**CONTEXT:**
- **Location:** {{{locationDescription}}}
- **Player's Party:**
  {{#each party}}
  - **{{this.name}}** (HP: {{this.hp.current}}/{{this.hp.max}}, AC: {{this.ac}}, Class: {{this.class}})
  {{/each}}
- **Your Allies (Enemies of the Party):**
  {{#each enemies}}
  - **{{this.name}}** (Status: {{this.hp}})
  {{/each}}
- **Recent Events:**
  \`\`\`
  {{{conversationHistory}}}
  \`\`\`

**YOUR TASK:**
It is **{{{activeCombatant}}}'s** turn.

1.  **Analyze the Battlefield:** Look at the party members and your allies. Who is the biggest threat? Who is most wounded?
2.  **Choose a Tactical Action:** Decide the most logical action for **{{{activeCombatant}}}**. This could be attacking, using a special ability, casting a spell, or even fleeing if the situation is dire. Use the provided tools ('adventureLookupTool', 'dndApiLookupTool') to look up {{{activeCombatant}}}'s stats and abilities to make an informed decision.
3.  **Define the Action:** State the action clearly in the 'action' field. (e.g., "Ataca a Galador con su hacha", "Lanza un hechizo sobre Elara").
4.  **Narrate the Action:** Provide a short, exciting narration of the action in the 'narration' field.
5.  **Request Dice Rolls:** In the 'diceRolls' field, specify ALL dice rolls needed to resolve this action. For example, if attacking, you must request both an attack roll and a damage roll.

**DO NOT:**
- Do not decide whose turn it is.
- Do not roll dice yourself.
- Do not determine the outcome of the rolls (hit, miss, damage amount).
- Do not narrate anyone else's turn.

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
      try {
        const { output } = await enemyTacticianPrompt(input);
  
        if (!output) {
          throw new Error("The AI failed to return an action for the combatant.");
        }
        return output;
  
      } catch (e: any) {
        console.error("Critical error in enemyTacticianFlow.", e);
        return {
          action: "Do nothing.",
          narration: `El combatiente ${input.activeCombatant} parece confundido y no hace nada en su turno.`,
          diceRolls: [],
        };
      }
    }
  );
