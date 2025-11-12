'use server';
/**
 * @fileOverview A Genkit tool that acts as the "companion brain" in combat.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { dndApiLookupTool } from './dnd-api-lookup';
import { adventureLookupTool } from './adventure-lookup';
import { CharacterSchema } from '@/lib/schemas';
import { log } from '@/lib/logger';

const CompanionTacticianInputSchema = z.object({
  activeCombatant: z.string().describe("The name of the friendly NPC/companion whose turn it is."),
  party: z.array(CharacterSchema).describe('An array containing the data for all characters in the party (player and AI-controlled).'),
  enemies: z.array(z.object({name: z.string(), id: z.string(), hp: z.string()})).describe("A list of all hostile NPCs/monsters currently in combat and their HP status (e.g., 'Healthy', 'Wounded', 'Badly Wounded')."),
  locationDescription: z.string().describe('A description of the current location.'),
  conversationHistory: z.string().describe("A transcript of the last few turns of combat to provide immediate context."),
});
export type CompanionTacticianInput = z.infer<typeof CompanionTacticianInputSchema>;

const CompanionTacticianOutputSchema = z.object({
    narration: z.string().describe("The AI Dungeon Master's brief narration for this companion's action. Do not include dice rolls here. Example: 'Elara invoca una luz sanadora sobre Galador.'"),
    targetId: z.string().nullable().describe("The unique ID of the character or enemy being targeted by the action. This can be null if the action has no specific target."),
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

**Your ONLY job is to decide the action for a SINGLE companion on their turn and return it in a structured format.**

**CONTEXT:**
- **You are:** {{{activeCombatant}}}
- **Location:** {{{locationDescription}}}
- **Your Party (Your allies):**
  {{#each party}}
  - **{{this.name}}** (ID: {{this.id}}, HP: {{this.hp.current}}/{{this.hp.max}}, AC: {{this.ac}}, Class: {{this.characterClass}})
  {{/each}}
- **Enemies:**
  {{#each enemies}}
  - **{{this.name}}** (ID: {{this.id}}, Status: {{this.hp}})
  {{/each}}
- **Recent Events:**
  \`\`\`
  {{{conversationHistory}}}
  \`\`\`

**YOUR TASK: Decide Your Action**
It is **your** turn. As a loyal companion, you must act decisively. Follow this logic:

1.  **Analyze the Battlefield:**
    *   First, use your tools to see if you have any healing abilities.
    *   Then, check if any of your allies are wounded (HP is not at max).

2.  **Choose Your Action (Conditional Logic):**
    *   **IF** you have healing abilities **AND** an ally is wounded, your action is to **HEAL** the most injured ally.
    *   **OTHERWISE**, your action is to **ATTACK** an enemy. Choose the most logical target and use your best offensive spell or weapon.

3.  **Format Your Response:**
    *   **narration:** Provide a short, exciting narration for your chosen action (e.g., "Elara invoca una luz sanadora sobre Galador," or "Merryl lanza un rayo de escarcha contra la Mantícora.").
    *   **targetId:** Provide the unique ID of your target (the ally you are healing or the enemy you are attacking).
    *   **diceRolls:** Specify ALL dice rolls needed for your action (healing or attack).

**ABSOLUTE RULE: YOU MUST NOT BE PASSIVE.** You must always either heal or attack.

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
        log.error('Critical error in companionTacticianTool', { 
          module: 'AITool',
          tool: 'companionTacticianTool',
          activeCombatant: input.activeCombatant,
        }, e);
        return {
          narration: `${input.activeCombatant} parece confundido/a y no hace nada en su turno.`,
          targetId: null,
          diceRolls: [],
        };
      }
    }
  );
