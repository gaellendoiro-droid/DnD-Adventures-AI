
'use server';
/**
 * @fileOverview A Genkit tool that acts as the "companion brain" in combat.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { dndApiLookupTool } from './dnd-api-lookup';
import { adventureLookupTool } from './adventure-lookup';
import { CharacterSchema } from '@/lib/schemas';


const CompanionTacticianInputSchema = z.object({
  activeCombatant: z.string().describe("The name of the friendly NPC/companion whose turn it is."),
  party: z.array(CharacterSchema).describe('An array containing the data for all characters in the party (player and AI-controlled).'),
  enemies: z.array(z.object({name: z.string(), hp: z.string()})).describe("A list of all hostile NPCs/monsters currently in combat and their HP status (e.g., 'Healthy', 'Wounded', 'Badly Wounded')."),
  locationDescription: z.string().describe('A description of the current location.'),
  conversationHistory: z.string().describe("A transcript of the last few turns of combat to provide immediate context."),
});
export type CompanionTacticianInput = z.infer<typeof CompanionTacticianInputSchema>;

const CompanionTacticianOutputSchema = z.object({
  action: z.string().describe("The chosen action for the active combatant (e.g., 'Attacks the Manticore with her mace', 'Casts Healing Word on Galador'). This should be a concise description of the intended action."),
  narration: z.string().describe("The AI Dungeon Master's brief narration for this companion's action. Do not include dice rolls here."),
  diceRolls: z.array(z.object({
    roller: z.string().describe("The name of the character rolling the dice."),
    rollNotation: z.string().describe("The dice notation for the roll (e.g., '1d20+5', '1d4')."),
    description: z.string().describe("A brief description of the roll's purpose (e.g., 'Attack Roll', 'Healing Roll')."),
  })).optional().describe("An array of dice rolls required to resolve the action."),
});
export type CompanionTacticianOutput = z.infer<typeof CompanionTacticianOutputSchema>;

const companionTacticianPrompt = ai.definePrompt({
  name: 'companionTacticianPrompt',
  input: {schema: CompanionTacticianInputSchema},
  output: {schema: CompanionTacticianOutputSchema},
  tools: [dndApiLookupTool, adventureLookupTool],
  prompt: `You are the AI brain for a friendly companion in a D&D 5e combat. You MUST ALWAYS reply in Spanish from Spain.

**Your ONLY job is to decide the action for a SINGLE companion on their turn.**

**CONTEXT:**
- **Location:** {{{locationDescription}}}
- **Your Party (Your allies):**
  {{#each party}}
  - **{{this.name}}** (HP: {{this.hp.current}}/{{this.hp.max}}, AC: {{this.ac}}, Class: {{this.characterClass}})
  {{/each}}
- **Enemies:**
  {{#each enemies}}
  - **{{this.name}}** (Status: {{this.hp}})
  {{/each}}
- **Recent Events:**
  \`\`\`
  {{{conversationHistory}}}
  \`\`\`

**YOUR TASK:**
It is **{{{activeCombatant}}}'s** turn. You are a loyal companion.

1.  **Analyze the Battlefield:** Look at your friends and the enemies. Who is most wounded and needs healing? Which enemy is the biggest threat?
2.  **Choose a Tactical Action:** Based on your character traits (retrieved via tools), decide the most logical action for **{{{activeCombatant}}}**. A cleric might heal a wounded friend. A mage might cast a powerful spell. A rogue might flank an enemy. Use the provided tools ('adventureLookupTool', 'dndApiLookupTool') to look up {{{activeCombatant}}}'s stats and abilities to make an informed decision.
3.  **Define the Action:** State the action clearly in the 'action' field. (e.g., "Ataca a la Mantícora con su maza", "Lanza Palabra de Curación sobre Galador").
4.  **Narrate the Action:** Provide a short, exciting narration of the action in the 'narration' field.
5.  **Request Dice Rolls:** In the 'diceRolls' field, specify ALL dice rolls needed. For a healing spell, request a healing roll. For an attack, request both an attack and a damage roll.

**DO NOT:**
- Do not decide whose turn it is.
- Do not roll dice yourself.
- Do not determine the outcome of the rolls.
- Do not narrate anyone else's turn.

Execute the turn for **{{{activeCombatant}}}** ONLY.
`,
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
        const { output } = await companionTacticianPrompt(input);
  
        if (!output) {
          throw new Error("The AI failed to return an action for the combatant.");
        }
        return output;
  
      } catch (e: any) {
        console.error("Critical error in companionTacticianTool.", e);
        return {
          action: "Do nothing.",
          narration: `El combatiente ${input.activeCombatant} parece confundido y no hace nada en su turno.`,
          diceRolls: [],
        };
      }
    }
  );

