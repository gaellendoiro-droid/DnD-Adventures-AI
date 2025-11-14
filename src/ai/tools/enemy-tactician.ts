'use server';
/**
 * @fileOverview A Genkit flow that acts as the "enemy brain" in combat.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { dndApiLookupTool } from './dnd-api-lookup';
import { adventureLookupTool } from './adventure-lookup';
import { CharacterSchema } from '@/lib/schemas';
import { log } from '@/lib/logger';

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
        description: z.string().describe("A brief description of the roll's purpose. For attacks: MUST be 'Tirada de ataque con [weapon]' for attack roll (1d20+modifier), then 'Tirada de daño con [weapon]' for damage roll. ATTACK ROLL MUST ALWAYS COME FIRST."),
        attackType: z.enum(['attack_roll', 'saving_throw', 'other']).optional().describe("IMPORTANT: Specify the type of roll. 'attack_roll' for weapons/spells that use 1d20 to hit. 'saving_throw' for spells where the target rolls to avoid damage (rare for basic enemies). 'other' for utility rolls. This field is MANDATORY for all attack/damage rolls."),
    })).describe("MANDATORY: An array of dice rolls. FOR ATTACK ACTIONS: You MUST provide EXACTLY 2 rolls in order - FIRST the attack roll (1d20+modifier with 'Tirada de ataque'), THEN the damage roll (damage dice with 'Tirada de daño'). NEVER provide only a damage roll."),
});
export type EnemyTacticianOutput = z.infer<typeof EnemyTacticianOutputSchema>;

const enemyTacticianPrompt = ai.definePrompt({
  name: 'enemyTacticianPrompt',
  input: {schema: EnemyTacticianInputSchema},
  output: {schema: EnemyTacticianOutputSchema},
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
3.  **Narrate the Action:** Provide a short, exciting narration (in Spanish from Spain).
4.  **Specify the Target:** In the 'targetId' field, provide the unique ID of the character you are attacking. You can see the IDs in the context above.
5.  **Request Dice Rolls (⚠️ CRITICAL - MANDATORY - READ CAREFULLY):**

**⚠️ ABSOLUTE REQUIREMENT FOR ATTACK ACTIONS:**

There are TWO types of attacks:

**TYPE 1: ATTACK ROLL ATTACKS/SPELLS (Most weapons and spells like Ray of Frost)**
For these, you MUST provide EXACTLY 2 dice rolls, IN THIS EXACT ORDER:

**STEP 1 - ATTACK ROLL (ALWAYS FIRST):**
{
  "roller": "{{{activeCombatant}}}",
  "rollNotation": "1d20+X",  // Use 1d20 + your attack modifier
  "description": "Tirada de ataque con [weapon name]",  // or "Tirada de ataque de [spell name]"
  "attackType": "attack_roll"  // MANDATORY: Specify this is an attack roll
}

**STEP 2 - DAMAGE ROLL (ALWAYS SECOND):**
{
  "roller": "{{{activeCombatant}}}",
  "rollNotation": "XdY+Z",  // Use your weapon/spell damage dice
  "description": "Tirada de daño con [weapon name]",  // or "Tirada de daño de [spell name]"
  "attackType": "attack_roll"  // MANDATORY: Same type as the attack
}

**TYPE 2: SAVING THROW SPELLS (Rare for basic enemies, common for spellcasters)**
For these, the target makes a saving throw, so you ONLY provide the damage roll:
{
  "roller": "{{{activeCombatant}}}",
  "rollNotation": "XdY",  // Your spell's damage dice (no attack roll needed)
  "description": "Daño de [spell name]" or "Daño radiante de [spell name]",
  "attackType": "saving_throw"  // MANDATORY: Specify this is a saving throw spell
}

**CRITICAL RULES (VIOLATION WILL CAUSE ACTION TO FAIL):**
- ✅ For attack roll weapons/spells: ALWAYS provide the attack roll (1d20+modifier) FIRST, then damage roll SECOND
- ✅ For saving throw spells: ONLY provide damage roll (no attack roll needed)
- ✅ Use the EXACT description format: "Tirada de ataque con/de [name]" and "Tirada de daño con/de [name]" for attack roll attacks
- ✅ For saving throw spells, use "Daño de [spell]" or "Daño radiante de [spell]"
- ❌ NEVER provide ONLY a damage roll for attack roll weapons/spells (those that use 1d20 to hit)
- ❌ NEVER provide an attack roll for saving throw spells (those where target rolls to avoid)
- ❌ NEVER put damage roll before attack roll for attack roll attacks
- ❌ If you can't find the correct modifiers, use +4 for attack and your basic weapon damage

**MANDATORY EXAMPLES TO FOLLOW:**

Goblin with scimitar (TYPE 1: attack roll):
[
  {"roller": "Goblin 1", "rollNotation": "1d20+4", "description": "Tirada de ataque con cimitarra", "attackType": "attack_roll"},
  {"roller": "Goblin 1", "rollNotation": "1d6+2", "description": "Tirada de daño con cimitarra", "attackType": "attack_roll"}
]

Orc with greataxe (TYPE 1: attack roll):
[
  {"roller": "Orco 1", "rollNotation": "1d20+5", "description": "Tirada de ataque de Gran Hacha", "attackType": "attack_roll"},
  {"roller": "Orco 1", "rollNotation": "1d12+3", "description": "Tirada de daño (Gran Hacha)", "attackType": "attack_roll"}
]

Dragon with bite (TYPE 1: attack roll):
[
  {"roller": "Dragón", "rollNotation": "1d20+10", "description": "Tirada de ataque de mordisco", "attackType": "attack_roll"},
  {"roller": "Dragón", "rollNotation": "2d10+6", "description": "Tirada de daño de mordisco", "attackType": "attack_roll"}
]

**REMEMBER:**
- Use the tools to look up your correct attack bonus and damage dice
- ALWAYS include BOTH rolls for any attack action
- The attack roll MUST come first, damage roll second
- This is not optional - missing the attack roll will cause your action to fail completely

**DO NOT:**
- Do not decide whose turn it is or roll dice yourself
- Do not determine the outcome of the rolls
- Do not provide ONLY a damage roll without an attack roll first (THIS WILL FAIL)
- Do not include dice rolls in the narration text
- DO NOT FORGET THE ATTACK ROLL - your action will be wasted if you do

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
        log.aiTool('enemyTacticianTool', 'Processing enemy turn', { 
          activeCombatant: input.activeCombatant,
          enemiesCount: input.enemies?.length || 0,
          partySize: input.party?.length || 0,
        });
        
        let output;
        try {
          const response = await enemyTacticianPrompt(input);
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
            });
            return {
              narration: `${input.activeCombatant} ruge con frustración, pero no hace nada.`,
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
          });
          return {
            narration: `${input.activeCombatant} ruge con frustración, pero no hace nada.`,
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
          narration: `${input.activeCombatant} ruge con frustración, pero no hace nada.`,
          targetId: null,
          diceRolls: [],
        };
      }
    }
  );
