
'use server';
/**
 * @fileOverview This file contains the Genkit flow for the EnemyTactician, which acts as the "enemy brain" in combat.
 *
 * - enemyTactician - A function that takes the current combat state and returns the action for a specific enemy.
 * - EnemyTacticianInput - The input type for the enemyTactician function.
 * - EnemyTacticianOutput - The return type for the enemyTactician function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { dndApiLookupTool } from '../tools/dnd-api-lookup';
import type { Character } from '@/lib/types';
import { adventureLookupTool } from '../tools/adventure-lookup';

const CharacterSchema = z.object({
    id: z.string(),
    name: z.string(),
    race: z.string(),
    class: z.string(),
    level: z.number(),
    sex: z.string(),
    background: z.string(),
    color: z.string(),
    personality: z.string(),
    abilityScores: z.object({
        fuerza: z.number(),
        destreza: z.number(),
        constitución: z.number(),
        inteligencia: z.number(),
        sabiduría: z.number(),
        carisma: z.number(),
    }),
    skills: z.array(z.object({ name: z.string(), proficient: z.boolean() })),
    hp: z.object({ current: z.number(), max: z.number() }),
    ac: z.number(),
    controlledBy: z.enum(["Player", "AI"]),
    inventory: z.array(z.object({ id: z.string(), name: z.string(), quantity: z.number(), description: z.string().optional() })),
    spells: z.array(z.object({ id: z.string(), name: z.string(), level: z.number(), description: z.string() })),
});


const EnemyTacticianInputSchema = z.object({
  activeCombatant: z.string().describe("The name of the hostile NPC/monster whose turn it is."),
  party: z.array(CharacterSchema).describe('An array containing the data for all characters in the party (player and AI-controlled).'),
  enemies: z.array(z.object({name: z.string(), hp: z.string()})).describe("A list of all hostile NPCs/monsters currently in combat and their HP status (e.g., 'Healthy', 'Wounded', 'Badly Wounded')."),
  locationDescription: z.string().describe('A description of the current location.'),
  conversationHistory: z.string().describe("A transcript of the last few turns of combat to provide immediate context."),
  gameState: z.string().optional().describe('The current state of the game, for looking up entity/monster stats.'),
});
export type EnemyTacticianInput = z.infer<typeof EnemyTacticianInputSchema>;

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

export async function enemyTactician(input: EnemyTacticianInput): Promise<EnemyTacticianOutput> {
  return enemyTacticianFlow(input);
}

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
  - **{{this.name}}** (HP: {{this.hp.current}}/{{this.hp.max}}, AC: {{this.ac}})
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

const enemyTacticianFlow = ai.defineFlow(
  {
    name: 'enemyTacticianFlow',
    inputSchema: EnemyTacticianInputSchema,
    outputSchema: EnemyTacticianOutputSchema,
  },
  async (input) => {

    let adventureData: any = null;
    if (input.gameState) {
      try {
        adventureData = JSON.parse(input.gameState);
      } catch (e) {
        console.error("Failed to parse gameState JSON in enemyTacticianFlow");
      }
    }

    const dynamicAdventureLookupTool = ai.defineTool(
      {
        name: 'adventureLookupTool',
        description: 'Looks up information about a specific location or entity (character, monster) from the main adventure data file. Use this to get details about abilities, descriptions, or what is inside a location.',
        inputSchema: z.object({
          query: z.string().describe("The search query, which can be the entity's ID or name (e.g., 'phandalin-plaza-del-pueblo', 'cryovain')."),
        }),
        outputSchema: z.string().describe('A JSON string containing the requested information, or an error message if not found.'),
      },
      async ({ query }) => {
        if (!adventureData) {
          return "Error: Adventure data is not available.";
        }
        
        const allData = [...(adventureData.locations || []), ...(adventureData.entities || [])];
        const result = allData.find((item: any) => 
            item.id === query || (item.name && typeof item.name === 'string' && item.name.toLowerCase() === query.toLowerCase())
        );

        return result ? JSON.stringify(result) : `Error: No location or entity found matching '${query}'.`;
      }
    );

    try {
      const {output} = await enemyTacticianPrompt(input, {
        model: 'googleai/gemini-2.5-flash',
        tools: [dndApiLookupTool, dynamicAdventureLookupTool],
        config: {
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE',
            },
          ],
        },
      });

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
