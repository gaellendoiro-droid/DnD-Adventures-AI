
'use server';
/**
 * @fileOverview This file contains the Genkit flow for the AiCombatManager, which handles turn-based combat.
 *
 * - aiCombatManager - A function that takes the current combat state and returns the results of the next turn.
 * - AiCombatManagerInput - The input type for the aiCombatManager function.
 * - AiCombatManagerOutput - The return type for the aiCombatManager function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { dndApiLookupTool } from '../tools/dnd-api-lookup';
import type { Character } from '@/lib/types';

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


const AiCombatManagerInputSchema = z.object({
  playerAction: z.string().describe("The action taken by the player on their turn. For the very first turn of combat, this will be 'Comienza la batalla'."),
  characterActions: z.string().optional().describe('The actions or dialogue of AI-controlled characters. This field may be empty.'),
  gameState: z.string().optional().describe('The current state of the game, for looking up entity/monster stats.'),
  locationDescription: z.string().optional().describe('A description of the current location.'),
  party: z.array(CharacterSchema).optional().describe('An array containing the data for all characters in the party (player and AI-controlled).'),
  conversationHistory: z.string().optional().describe("A transcript of the last few turns of conversation to provide immediate context."),
  combatStartNarration: z.string().optional().describe("If this is the first turn of combat, this field will contain the DM's narration of how combat started."),
});
export type AiCombatManagerInput = z.infer<typeof AiCombatManagerInputSchema>;

const CombatDiceRollSchema = z.object({
    roller: z.string().describe("The name of the character or monster rolling the dice."),
    rollNotation: z.string().describe("The dice notation for the roll (e.g., '1d20+5', '2d6+3')."),
    individualRolls: z.array(z.number()).describe("The result of each individual die rolled."),
    modifier: z.number().optional().describe("The modifier applied to the roll."),
    totalResult: z.number().describe("The total score after the modifier (sum of individual rolls + modifier)."),
    description: z.string().describe("A brief description of the roll's purpose, including dice notation and ability modifier (e.g., 'Tirada de Ataque (1d20+FUE)', 'Salvación de Destreza (1d20+DES)')."),
    outcome: z.enum(['crit', 'success', 'fail', 'pifia', 'neutral', 'initiative']).describe("The outcome of the roll. For attack rolls, use 'crit' for a critical hit (natural 20) and 'pifia' for a critical fail (natural 1). For all other attack rolls, you will determine success or failure based on the target's AC. For saving throws, use 'success' or 'fail' based on the DC. For damage rolls, use 'neutral'. For initiative rolls, use 'initiative'."),
});

const InitiativeRollSchema = z.object({
    characterName: z.string().describe("The name of the character or monster."),
    roll: z.number().describe("The result of the d20 roll for initiative."),
    modifier: z.number().describe("The dexterity modifier applied to the roll."),
    total: z.number().describe("The total initiative score (roll + modifier).")
});

const AiCombatManagerOutputSchema = z.object({
  narration: z.string().describe("The AI Dungeon Master's narration of the combat turn, formatted in Markdown."),
  updatedCharacterStats: z.string().optional().nullable().describe("The updated character stats (e.g., HP, XP, status effects), if any, for the PLAYER character only, as a valid JSON string. For example: '{\"hp\":{\"current\":8,\"max\":12}}'. Must be a valid JSON string or null."),
  diceRolls: z.array(CombatDiceRollSchema).optional().nullable().describe("An array of any dice rolls (attack, damage, saving throws, etc.) made during this turn."),
  initiativeRolls: z.array(InitiativeRollSchema).optional().nullable().describe("An array of detailed initiative rolls. THIS SHOULD ONLY BE POPULATED ON THE VERY FIRST TURN OF COMBAT."),
  endCombat: z.boolean().describe("Set to true if all hostiles are defeated or have fled, ending combat."),
});
export type AiCombatManagerOutput = z.infer<typeof AiCombatManagerOutputSchema>;

export async function aiCombatManager(input: AiCombatManagerInput): Promise<AiCombatManagerOutput> {
  return aiCombatManagerFlow(input);
}

const aiCombatManagerPrompt = ai.definePrompt({
  name: 'aiCombatManagerPrompt',
  input: {schema: AiCombatManagerInputSchema},
  output: {schema: AiCombatManagerOutputSchema},
  tools: [dndApiLookupTool],
  prompt: `You are a strict AI Dungeon Master for a D&D 5e game, and you are in **COMBAT MODE**. Your only job is to manage the current turn of combat. You MUST ALWAYS reply in Spanish.

**CONTEXT:**
-   **Location:** {{{locationDescription}}}
-   **Player's Party:** The following characters are in the player's group.
    {{#if party}}
        {{#each party}}
-   **{{this.name}}** ({{this.race}} {{this.class}}, AC: {{this.ac}}, HP: {{this.hp.current}}/{{this.hp.max}}) - Controlled by: {{this.controlledBy}}
        {{/each}}
    {{/if}}
-   **How it Started:** {{#if combatStartNarration}} {{{combatStartNarration}}} {{else}} The battle continues. {{/if}}
-   **Conversation History:**
    \`\`\`
    {{{conversationHistory}}}
    \`\`\`

**STATE: FIRST TURN OF COMBAT**
- If the player's action is "Comienza la batalla", this is the VERY FIRST turn.
- **First Turn Protocol (Strictly follow, this is your highest priority):**
    1.  **Do NOT re-narrate the start of combat.** The context is already provided in "How it Started". Your narration should be brief and focused on the mechanics.
    2.  **Identify ALL Combatants:** Your first job is to read the 'How it Started' context and identify EVERYONE involved: the player's party and any enemies or NPCs mentioned. To get stats for an NPC/enemy, use your tools in this order:
        -   **First, try \`adventureLookupTool\`:** Use the NPC's name (e.g., 'Linene Vientogrís') to find their specific data in the adventure. This is the most accurate source.
        -   **Then, use \`dndApiLookupTool\`:** If the NPC is not in the adventure data, deduce a generic type (like 'commoner', 'guard') and use that to get base stats.
    3.  **Roll Initiative:** You MUST roll initiative for EVERY combatant you identified.
        - For each, calculate \`d20 + dexterity modifier\`.
        - You MUST populate the 'initiativeRolls' field with the detailed results for each combatant. This is mandatory.
    4.  **Establish Turn Order:** Your narration's primary job is to state the turn order clearly (e.g., "El orden de combate es: Merryl, Orco 1, Galador, Elara...").
    5.  **Execute First Turn:**
        -   **If a player-controlled character has the highest initiative:** Your narration MUST end with: "Es tu turno, ¿qué haces?". DO NOT take any action for the player. Do not describe them attacking or dodging. Just cede the turn.
        -   **If an AI-controlled character or NPC has the highest initiative:** Narrate their action, roll dice, and then proceed to the next character in the initiative order until it's a player's turn. Your narration MUST end by prompting the player for their next action (e.g., "Es tu turno, ¿qué haces?").

**STATE: SUBSEQUENT TURNS**
- If the player's action is anything other than "Comienza la batalla", this is a regular combat turn.
- **Combat Protocol (Strictly follow):**
    1.  **Narrate Player's Turn:** Describe the outcome of the player's action: "{{{playerAction}}}".
    2.  **Process NPC/AI Turns:** After the player's turn, process the turns for any AI characters or NPCs that act next in the initiative order, up until the next player turn.
    3.  **NPC Actions:** For each character, determine their action based on their stats and tactics.
    4.  **Roll and Report:** For any action requiring a roll (attack, damage, save), you MUST provide the details in the 'diceRolls' field.
        - The 'description' of the roll MUST include the dice notation and the ability modifier abbreviation (e.g., 'Tirada de Ataque (1d20+FUE)').
        - **Attack Flow:** First, make the attack roll. Narrate if it hits or misses based on the target's AC. A natural 20 is a 'crit', a natural 1 is a 'pifia'. ONLY if it hits, then make the damage roll.
    5.  **Update Stats:** If the PLAYER character takes damage or is affected by a condition, reflect this in the 'updatedCharacterStats' field. Do not update stats for AI or NPCs in this field.
    6.  **End Turn:** Your narration MUST end by prompting the player for their next action if combat continues (e.g., "Es tu turno, ¿qué haces?").
    7.  **Check for Combat End:** If all enemies are defeated or have fled, set 'endCombat' to true. Otherwise, it MUST be false.

Execute the turn according to the protocols above.
`,
});

const aiCombatManagerFlow = ai.defineFlow(
  {
    name: 'aiCombatManagerFlow',
    inputSchema: AiCombatManagerInputSchema,
    outputSchema: AiCombatManagerOutputSchema,
  },
  async (input) => {
     const tools = [dndApiLookupTool];
    if (input.gameState) {
      const dynamicAdventureLookupTool = ai.defineTool(
        {
          name: 'adventureLookupTool',
          description: 'Looks up information about a specific location or entity (character, monster) from the main adventure data file. Use this to get details when a player moves to a new area or interacts with a specific named entity.',
          inputSchema: z.object({
              query: z.string().describe("The search query, formatted as 'location:<id>' or 'entity:<id>'. For example: 'location:phandalin-plaza-del-pueblo' or 'entity:cryovain'."),
          }),
          outputSchema: z.string().describe('A JSON string containing the requested information, or an error message if not found.'),
        },
        async ({ query }) => {
          if (!input.gameState) return "Adventure data not available.";
          try {
            const adventureData = JSON.parse(input.gameState);
            const [queryType, queryId] = query.split(':');
      
            if (!queryType || !queryId) {
              return "Invalid query format. Use 'location:<id>' or 'entity:<id>'.";
            }
      
            let result: any;
            if (queryType === 'location') {
              result = adventureData.locations?.find((loc: any) => loc.id === queryId);
            } else if (queryType === 'entity') {
              // Search by ID first, then by name if ID fails
              result = adventureData.entities?.find((ent: any) => ent.id === queryId || ent.name === queryId);
            } else {
              return `Unknown query type '${queryType}'. Use 'location' or 'entity'.`;
            }
            
            return result ? JSON.stringify(result, null, 2) : `No ${queryType} found with ID or name '${queryId}'.`;
      
          } catch (error) {
            console.warn(`Adventure Lookup: Error processing query "${query}"`, error);
            return "Failed to parse or search the adventure data.";
          }
        }
      );
      tools.push(dynamicAdventureLookupTool);
    }

    const {output} = await aiCombatManagerPrompt(input, {
      model: 'googleai/gemini-2.5-flash',
      tools,
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
      return { narration: "El Dungeon Master parece aturdido por el combate y no responde.", endCombat: false };
    }

    if (output.updatedCharacterStats) {
        try {
            JSON.parse(output.updatedCharacterStats);
        } catch (e) {
            console.warn("AI returned invalid JSON for updatedCharacterStats. Discarding.", output.updatedCharacterStats);
            output.updatedCharacterStats = null;
        }
    }
    
    return output;
  }
);

    
