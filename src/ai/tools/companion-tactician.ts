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
        description: z.string().describe("A brief description of the roll's purpose. For attacks: MUST be 'Tirada de ataque con [weapon]' for attack roll (1d20+modifier), then 'Tirada de daño con [weapon]' for damage roll. ATTACK ROLL MUST ALWAYS COME FIRST."),
        attackType: z.enum(['attack_roll', 'saving_throw', 'healing', 'other']).optional().describe("IMPORTANT: Specify the type of roll. 'attack_roll' for weapons/spells that use 1d20 to hit (Ray of Frost, Mace). 'saving_throw' for spells where the target rolls to avoid damage (Sacred Flame, Fireball). 'healing' for healing spells. 'other' for utility rolls. This field is MANDATORY for all attack/damage rolls."),
    })).describe("MANDATORY: An array of dice rolls. FOR ATTACK ACTIONS: You MUST provide EXACTLY 2 rolls in order - FIRST the attack roll (1d20+modifier with 'Tirada de ataque'), THEN the damage roll (damage dice with 'Tirada de daño'). For healing: only the healing roll. NEVER provide only a damage roll."),
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
    *   First, check if any of your allies are **significantly wounded** (HP below 50% of their maximum).
    *   Then, use your tools to see if you have any healing abilities.
    *   Identify the most dangerous enemy.

2.  **Choose Your Action (Conditional Logic):**
    *   **IF** you have healing abilities **AND** an ally is **significantly wounded (HP < 50% max)**, your action is to **HEAL** the most injured ally.
    *   **IF** an ally is **critically wounded (HP < 25% max)**, healing takes priority over attacking.
    *   **OTHERWISE**, your action is to **ATTACK** an enemy. Choose the most logical target (lowest HP, most dangerous, or closest) and use your best offensive spell or weapon.
    *   **NEVER waste healing on allies who are at full HP or only slightly wounded (HP > 75% max)**.

3.  **Format Your Response:**
    *   **narration:** Provide a short, exciting narration for your chosen action (in Spanish from Spain).
    *   **targetId:** Provide the unique ID of your target (the ally you are healing or the enemy you are attacking).
    *   **diceRolls (⚠️ CRITICAL - MANDATORY - READ CAREFULLY):**

**⚠️ ABSOLUTE REQUIREMENT FOR ATTACK ACTIONS:**

There are TWO types of attack spells/weapons:

**TYPE 1: ATTACK ROLL SPELLS/WEAPONS (Ray of Frost, Mace, Sword, etc.)**
For these, you MUST provide EXACTLY 2 dice rolls, IN THIS EXACT ORDER:

**STEP 1 - ATTACK ROLL (ALWAYS FIRST):**
{
  "roller": "{{{activeCombatant}}}",
  "rollNotation": "1d20+X",  // Use 1d20 + your attack modifier
  "description": "Tirada de ataque con [weapon]" or "Tirada de ataque de [spell]",
  "attackType": "attack_roll"  // MANDATORY: Specify this is an attack roll
}

**STEP 2 - DAMAGE ROLL (ALWAYS SECOND):**
{
  "roller": "{{{activeCombatant}}}",
  "rollNotation": "XdY+Z",  // Use your weapon/spell damage dice
  "description": "Tirada de daño con [weapon]" or "Tirada de daño de [spell]",
  "attackType": "attack_roll"  // MANDATORY: Same type as the attack
}

**TYPE 2: SAVING THROW SPELLS (Sacred Flame, Fireball, etc.)**
For these, the target makes a saving throw, so you ONLY provide the damage roll:
{
  "roller": "{{{activeCombatant}}}",
  "rollNotation": "XdY",  // Your spell's damage dice (no attack roll needed)
  "description": "Daño radiante de [spell name]" or "Daño de [spell name]",
  "attackType": "saving_throw"  // MANDATORY: Specify this is a saving throw spell
}

**FOR HEALING ACTIONS:**
Only provide ONE roll:
{
  "roller": "{{{activeCombatant}}}",
  "rollNotation": "1d8+3",  // Your healing spell dice
  "description": "Curación" or "Tirada de curación",
  "attackType": "healing"  // MANDATORY: Specify this is healing
}

**CRITICAL RULES (VIOLATION WILL CAUSE ACTION TO FAIL):**
- ✅ For attack roll spells/weapons: ALWAYS provide attack roll (1d20+modifier) FIRST, then damage roll SECOND
- ✅ For saving throw spells: ONLY provide damage roll (no attack roll needed)
- ✅ For healing: Only provide the healing roll
- ✅ Use correct description format: "Tirada de ataque" and "Tirada de daño" for attack roll spells
- ✅ For saving throw spells, use "Daño radiante de [spell]" or "Daño de [spell]"
- ❌ NEVER provide ONLY a damage roll for attack roll spells (those that use 1d20 to hit)
- ❌ NEVER provide an attack roll for saving throw spells (those where target rolls to avoid)
- ❌ NEVER put damage roll before attack roll for attack roll spells

**MANDATORY EXAMPLES TO FOLLOW:**

Ray of Frost attack (TYPE 1: attack roll):
[
  {"roller": "Merryl", "rollNotation": "1d20+5", "description": "Tirada de ataque de Rayo de Escarcha", "attackType": "attack_roll"},
  {"roller": "Merryl", "rollNotation": "1d8", "description": "Tirada de daño de Rayo de Escarcha", "attackType": "attack_roll"}
]

Mace attack (TYPE 1: attack roll):
[
  {"roller": "Elara", "rollNotation": "1d20+4", "description": "Tirada de ataque con maza", "attackType": "attack_roll"},
  {"roller": "Elara", "rollNotation": "1d6+2", "description": "Tirada de daño con maza", "attackType": "attack_roll"}
]

Healing spell:
[
  {"roller": "Elara", "rollNotation": "1d8+3", "description": "Curación", "attackType": "healing"}
]

Sacred Flame (TYPE 2: saving throw - no attack roll):
[
  {"roller": "Elara", "rollNotation": "1d8", "description": "Daño radiante de Llama Sagrada", "attackType": "saving_throw"}
]

**ABSOLUTE RULES:**
- YOU MUST NOT BE PASSIVE. You must always either heal or attack.
- For attacks: BOTH attack and damage rolls are mandatory
- For healing: Only the healing roll
- Use the tools to look up your correct modifiers
- This is not optional - missing the attack roll will cause your action to fail

**DO NOT:**
- Do not provide ONLY a damage roll without an attack roll first (THIS WILL FAIL)
- Do not include dice rolls in the narration text
- Do not determine the outcome of the rolls
- DO NOT FORGET THE ATTACK ROLL when attacking - your action will be wasted

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
        log.debug('Calling companionTacticianPrompt', {
          module: 'AITool',
          tool: 'companionTacticianTool',
          activeCombatant: input.activeCombatant,
          partySize: input.party.length,
          enemiesCount: input.enemies.length,
        });

        let output;
        try {
          const response = await companionTacticianPrompt(input);
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
              narration: `${input.activeCombatant} parece confundido/a y no hace nada en su turno.`,
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
            narration: `${input.activeCombatant} parece confundido/a y no hace nada en su turno.`,
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
          narration: `${input.activeCombatant} parece confundido/a y no hace nada en su turno.`,
          targetId: null,
          diceRolls: [],
        };
      }
    }
  );
