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
  tools: [dndApiLookupTool, adventureLookupTool], // Use tools ONLY for additional spell mechanics info, NOT to determine available spells
  prompt: `You are the AI brain for a friendly companion in a D&D 5e combat. You MUST ALWAYS reply in Spanish from Spain.

**Your ONLY job is to decide the action for a SINGLE companion on their turn and return it in a structured format.**

**CONTEXT:**
- **You are:** {{{activeCombatant}}}
- **Location:** {{{locationDescription}}}
- **Your Party (Your allies):**
  {{#each party}}
  - **{{this.name}}** (ID: {{this.id}}, HP: {{this.hp.current}}/{{this.hp.max}}, AC: {{this.ac}}, Class: {{this.characterClass}})
    {{#if this.abilityModifiers}}
    - **Ability Modifiers:** FUE {{this.abilityModifiers.fuerza}}, DES {{this.abilityModifiers.destreza}}, CON {{this.abilityModifiers.constitución}}, INT {{this.abilityModifiers.inteligencia}}, SAB {{this.abilityModifiers.sabiduría}}, CAR {{this.abilityModifiers.carisma}}
    {{/if}}
    {{#if this.proficiencyBonus}}
    - **Proficiency Bonus:** +{{this.proficiencyBonus}}
    {{/if}}
  {{/each}}
- **YOUR INVENTORY (CRITICAL - ONLY USE ITEMS YOU HAVE):**
  {{#if inventory}}
    {{#each inventory}}
    - **{{this.name}}** (Qty: {{this.quantity}}){{#if this.description}}: {{this.description}}{{/if}}
    {{/each}}
  {{else}}
    - No items available
  {{/if}}
- **YOUR AVAILABLE SPELLS (CRITICAL - ONLY USE THESE):**
  {{#if availableSpells}}
    {{#each availableSpells}}
    - **{{this.name}}** (Level {{this.level}}): {{this.description}}
    {{/each}}
  {{else}}
    - **No spells available** - You can only use your weapons or basic actions.
  {{/if}}
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
    *   **CRITICAL - USE YOUR CHARACTER SHEET FIRST:** 
        - Check your **YOUR AVAILABLE SPELLS** list above to see what spells you have. **This is your PRIMARY source of information. ONLY use spells that are explicitly listed in YOUR AVAILABLE SPELLS.**
        - Check your **YOUR INVENTORY** list to see what weapons and items you have. **ONLY use weapons from your inventory.**
    *   **ONLY if you need additional information** about a spell's mechanics (damage dice, range, etc.) that is not in the description, you may use the \`dndApiLookupTool\` to look it up. **But DO NOT use tools to determine what spells or weapons you have - that information is already in YOUR AVAILABLE SPELLS and YOUR INVENTORY lists.**
    *   **DO NOT assume you have healing spells just because you are a Cleric. If the YOUR AVAILABLE SPELLS list says "No spells available" or doesn't include healing spells, you CANNOT use healing spells.**
    *   **DO NOT assume you have weapons like daggers or swords if they are not in YOUR INVENTORY. Use what you actually have.**
    *   Identify the most dangerous enemy.

2.  **Choose Your Action (Conditional Logic):**
    *   **IF** you have healing spells in your **YOUR AVAILABLE SPELLS** list **AND** an ally is **significantly wounded (HP < 50% max)**, your action is to **HEAL** the most injured ally using one of your available healing spells.
    *   **IF** an ally is **critically wounded (HP < 25% max)** **AND** you have healing spells in your **YOUR AVAILABLE SPELLS** list, healing takes priority over attacking.
    *   **IF** you do **NOT** have any healing spells in your **YOUR AVAILABLE SPELLS** list (or the list says "No spells available"), you **MUST ATTACK** an enemy instead, even if allies are wounded.
    *   **OTHERWISE**, your action is to **ATTACK** an enemy. Choose the most logical target (lowest HP, most dangerous, or closest) and use your best offensive spell from your **YOUR AVAILABLE SPELLS** list, or a weapon from your **YOUR INVENTORY** if you have no offensive spells.
    *   **NEVER waste healing on allies who are at full HP or only slightly wounded (HP > 75% max)**.
    *   **NEVER use spells that are NOT in your YOUR AVAILABLE SPELLS list.**
    *   **NEVER use weapons that are NOT in your YOUR INVENTORY list.**

3.  **Format Your Response:**
    *   **actionDescription:** Provide a brief, technical description of the action (e.g., "Ataque con Maza", "Lanzar Rayo de Escarcha", "Curar a Galador"). This is NOT a narration, just a label for the action type.
    *   **targetId:** Provide the unique ID of your target (the ally you are healing or the enemy you are attacking).
    *   **diceRolls (⚠️ CRITICAL - MANDATORY - READ CAREFULLY):**

**⚠️ ABSOLUTE REQUIREMENT FOR ATTACK ACTIONS:**

There are TWO types of attack spells/weapons:

**TYPE 1: ATTACK ROLL SPELLS/WEAPONS (Ray of Frost, Mace, Sword, etc.)**
For these, you MUST provide EXACTLY 2 dice rolls, IN THIS EXACT ORDER:

**STEP 1 - ATTACK ROLL (ALWAYS FIRST):**
{
  "roller": "{{{activeCombatant}}}",
  "rollNotation": "1d20+X",  // CRITICAL: X = your ability modifier (FUE or DES, whichever is higher) + your proficiency bonus
  "description": "Tirada de ataque con [weapon]" or "Tirada de ataque de [spell]",
  "attackType": "attack_roll"  // MANDATORY: Specify this is an attack roll
}

**HOW TO CALCULATE ATTACK MODIFIER:**
- For melee weapons: Use FUE modifier + Proficiency Bonus
- For ranged weapons or finesse weapons (versatile weapons like quarterstaffs): Use DES modifier + Proficiency Bonus
- For spells: Use your spellcasting ability modifier (INT for Wizards, SAB for Clerics) + Proficiency Bonus
- **CRITICAL:** Check your inventory first to see what weapons you actually have
- Example: Merryl (Mago) with DES +3, INT +3, Proficiency Bonus +2:
  - Attacking with his Bastón (quarterstaff, versatile/finesse): Use DES +3 + Proficiency +2 = 1d20+5
  - Casting Ray of Frost (spell attack): INT +3 + Proficiency +2 = 1d20+5

**STEP 2 - DAMAGE ROLL (ALWAYS SECOND):**
{
  "roller": "{{{activeCombatant}}}",
  "rollNotation": "XdY+Z",  // Use your weapon/spell damage dice + ability modifier (ONLY ability modifier, NOT proficiency bonus)
  "description": "Tirada de daño con [weapon]" or "Tirada de daño de [spell]",
  "attackType": "attack_roll"  // MANDATORY: Same type as the attack
}

**HOW TO CALCULATE DAMAGE MODIFIER:**
- Add the SAME ability modifier you used for the attack roll (FUE, DES, INT, or SAB)
- Do NOT add proficiency bonus to damage (only to attack rolls)
- Example: Merryl with Bastón (quarterstaff) using DES +3 = 1d6+3 damage (versatile weapon allows DEX)
- Example: Ray of Frost does not add ability modifier to damage (spell specific), so just 1d8

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

Ray of Frost attack by Merryl (Mago with INT +3, Proficiency +2):
[
  {"roller": "Merryl", "rollNotation": "1d20+5", "description": "Tirada de ataque de Rayo de Escarcha", "attackType": "attack_roll"},  // INT +3 + Proficiency +2 = +5
  {"roller": "Merryl", "rollNotation": "1d8", "description": "Tirada de daño de Rayo de Escarcha", "attackType": "attack_roll"}  // Ray of Frost doesn't add ability mod
]

Mace attack by Elara (Clériga with FUE +2, Proficiency +2, has Maza in inventory):
[
  {"roller": "Elara", "rollNotation": "1d20+4", "description": "Tirada de ataque con maza", "attackType": "attack_roll"},  // FUE +2 + Proficiency +2 = +4
  {"roller": "Elara", "rollNotation": "1d6+2", "description": "Tirada de daño con maza", "attackType": "attack_roll"}  // FUE +2 (no proficiency on damage)
]

Quarterstaff (Bastón) attack by Merryl (Mago with DES +3, Proficiency +2, has Bastón in inventory):
[
  {"roller": "Merryl", "rollNotation": "1d20+5", "description": "Tirada de ataque con bastón", "attackType": "attack_roll"},  // DES +3 + Proficiency +2 = +5 (versatile weapon)
  {"roller": "Merryl", "rollNotation": "1d6+3", "description": "Tirada de daño con bastón", "attackType": "attack_roll"}  // DES +3 (versatile allows DEX)
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
- **PRIORITY ORDER FOR INFORMATION:**
  1. **FIRST:** Use information from your character sheet (YOUR AVAILABLE SPELLS list, YOUR INVENTORY list, party member stats, etc.)
  2. **SECOND:** Only use tools (\`dndApiLookupTool\`) if you need additional mechanics information (e.g., exact damage dice for a spell, attack modifiers) that is not in your character sheet
  3. **NEVER:** Use tools to determine what spells or weapons you have - that information comes from YOUR AVAILABLE SPELLS and YOUR INVENTORY lists
- **YOU MUST ONLY USE WEAPONS FROM YOUR INVENTORY. DO NOT invent weapons like daggers or improvised weapons if they are not in your inventory.**
- This is not optional - missing the attack roll will cause your action to fail

**DO NOT:**
- Do not provide ONLY a damage roll without an attack roll first (THIS WILL FAIL)
- Do not generate narration - that is handled by another system
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
