'use server';
/**
 * @fileOverview A Genkit flow that acts as the "enemy brain" in combat.
 */
import { ai } from '@/ai/genkit';
import { dndApiLookupTool } from './dnd-api-lookup';
import { adventureLookupTool } from './adventure-lookup';
import { log } from '@/lib/logger';
import { retryWithExponentialBackoff } from '../flows/retry-utils';
import {
  EnemyTacticianInputSchema,
  EnemyTacticianOutputSchema,
  type EnemyTacticianInput,
  type EnemyTacticianOutput,
} from './combat/tactician-schemas';

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
3.  **Specify the Action Description:** In the 'actionDescription' field, provide a brief, technical description of the action (e.g., "Ataque con Cimitarra", "Lanzar Rayo de Escarcha"). This is NOT a narration, just a label for the action type.
4.  **Specify the Target:** In the 'targetId' field, provide the unique ID of the character you are attacking. You can see the IDs in the context above.
5.  **Request Dice Rolls (⚠️ CRITICAL - MANDATORY - READ CAREFULLY):**

**⚠️ ABSOLUTE REQUIREMENT FOR ATTACK ACTIONS:**

There are TWO types of attacks:

**TYPE 1: ATTACK ROLL ATTACKS/SPELLS (Most weapons and spells like Ray of Frost)**
For these, you MUST provide EXACTLY 2 dice rolls, IN THIS EXACT ORDER:

**STEP 1 - ATTACK ROLL (ALWAYS FIRST):**
{
  "roller": "{{{activeCombatant}}}",
  "rollNotation": "1d20+X",  // CRITICAL: X = ability modifier + proficiency bonus (use dndApiLookupTool to look up your stats if needed)
  "description": "Tirada de ataque con [weapon name]",  // or "Tirada de ataque de [spell name]"
  "attackType": "attack_roll"  // MANDATORY: Specify this is an attack roll
}

**HOW TO CALCULATE ATTACK MODIFIER:**
- Use the dndApiLookupTool to look up your creature's stats and attacks
- Attack bonus = ability modifier + proficiency bonus
- Most creature stat blocks already include the calculated attack bonus (e.g., "Scimitar: +4 to hit")
- Example: Goblin with Scimitar has +4 to hit = 1d20+4
- Example: Orc with Greataxe has +5 to hit = 1d20+5
- If you can't find exact stats, estimate based on creature CR: CR 1/4 to 1 typically has +3 to +5

**STEP 2 - DAMAGE ROLL (ALWAYS SECOND):**
{
  "roller": "{{{activeCombatant}}}",
  "rollNotation": "XdY+Z",  // Use your weapon/spell damage dice + ability modifier (look up in creature stats)
  "description": "Tirada de daño con [weapon name]",  // or "Tirada de daño de [spell name]"
  "attackType": "attack_roll"  // MANDATORY: Same type as the attack
}

**HOW TO CALCULATE DAMAGE:**
- Use the damage dice from the creature's stat block
- Add the ability modifier (NOT proficiency bonus)
- Example: Goblin Scimitar does 1d6+2 slashing damage
- Example: Orc Greataxe does 1d12+3 slashing damage
- Most creature stat blocks include the full damage notation

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

Goblin with scimitar (Goblin stat block: DEX +2, Proficiency +2, Scimitar +4 to hit, 1d6+2 damage):
[
  {"roller": "Goblin 1", "rollNotation": "1d20+4", "description": "Tirada de ataque con cimitarra", "attackType": "attack_roll"},  // DEX +2 + Proficiency +2 = +4
  {"roller": "Goblin 1", "rollNotation": "1d6+2", "description": "Tirada de daño con cimitarra", "attackType": "attack_roll"}  // 1d6 + DEX +2
]

Orc with greataxe (Orc stat block: STR +3, Proficiency +2, Greataxe +5 to hit, 1d12+3 damage):
[
  {"roller": "Orco 1", "rollNotation": "1d20+5", "description": "Tirada de ataque de Gran Hacha", "attackType": "attack_roll"},  // STR +3 + Proficiency +2 = +5
  {"roller": "Orco 1", "rollNotation": "1d12+3", "description": "Tirada de daño (Gran Hacha)", "attackType": "attack_roll"}  // 1d12 + STR +3
]

Young White Dragon with bite (Dragon stat block: STR +4, Proficiency +3, Bite +7 to hit, 2d10+4 damage):
[
  {"roller": "Dragón", "rollNotation": "1d20+7", "description": "Tirada de ataque de mordisco", "attackType": "attack_roll"},  // STR +4 + Proficiency +3 = +7
  {"roller": "Dragón", "rollNotation": "2d10+4", "description": "Tirada de daño de mordisco", "attackType": "attack_roll"}  // 2d10 + STR +4
]

**REMEMBER:**
- Use dndApiLookupTool to look up your creature's correct attack bonus and damage dice
- Attack bonus includes BOTH ability modifier AND proficiency bonus
- Damage includes ONLY ability modifier (NOT proficiency bonus)
- ALWAYS include BOTH rolls for any attack action
- The attack roll MUST come first, damage roll second
- This is not optional - missing the attack roll will cause your action to fail completely

**DO NOT:**
- Do not decide whose turn it is or roll dice yourself
- Do not determine the outcome of the rolls
- Do not provide ONLY a damage roll without an attack roll first (THIS WILL FAIL)
- Do not generate narration - that is handled by another system
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
        let response: any = null;
        try {
          response = await retryWithExponentialBackoff(
            () => enemyTacticianPrompt(input),
            3,
            1000,
            'enemyTactician'
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
