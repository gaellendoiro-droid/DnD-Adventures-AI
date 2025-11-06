
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

const AiCombatManagerInputSchema = z.object({
  playerAction: z.string().describe("The action taken by the player on their turn. For the very first turn of combat, this will be 'Comienza la batalla'."),
  characterActions: z.string().optional().describe('The actions or dialogue of AI-controlled characters. This field may be empty.'),
  gameState: z.string().optional().describe('The current state of the game, for looking up entity/monster stats.'),
  locationDescription: z.string().optional().describe('A description of the current location.'),
  characterStats: z.string().optional().describe('The current stats of the player character.'),
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
    outcome: z.enum(['crit', 'success', 'fail', 'pifia', 'neutral']).describe("The outcome of the roll. For attack rolls, use 'crit' for a critical hit (natural 20) and 'pifia' for a critical fail (natural 1). For all other attack rolls, you will determine success or failure based on the target's AC. For saving throws, use 'success' or 'fail' based on the DC. For damage rolls, use 'neutral'."),
});

const InitiativeRollSchema = z.object({
    characterName: z.string().describe("The name of the character or monster."),
    roll: z.number().describe("The result of the d20 roll for initiative."),
    modifier: z.number().describe("The dexterity modifier applied to the roll."),
    total: z.number().describe("The total initiative score (roll + modifier).")
});

const AiCombatManagerOutputSchema = z.object({
  narration: z.string().describe("The AI Dungeon Master's narration of the combat turn, formatted in Markdown."),
  updatedCharacterStats: z.string().optional().nullable().describe("The updated character stats (e.g., HP, XP, status effects), if any, as a valid JSON string. For example: '{\"hp\":{\"current\":8,\"max\":12}}'. Must be a valid JSON string or null."),
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

**STATE: FIRST TURN OF COMBAT**
- If the player's action is "Comienza la batalla", this is the VERY FIRST turn.
- **First Turn Protocol (Strictly follow this is your highest priority):**
    1.  **Identify Combatants:** Read the \`combatStartNarration\` to identify ALL combatants involved. This is your primary source of truth.
    2.  **Roll Initiative:** You MUST roll initiative for EVERY combatant identified.
        - For each, calculate \`d20 + dexterity modifier\`. Use the dndApiLookupTool if you need stats for generic creatures like 'guard' or 'goblin'.
        - You MUST populate the 'initiativeRolls' field with the results for each combatant. This is mandatory for the first turn.
    3.  **Establish Turn Order:** Based on the initiative rolls, state the turn order clearly in your narration (e.g., "El orden de combate es: Merryl, Orco 1, Galador, Elara...").
    4.  **Execute First Turn:** Narrate the action for the character with the highest initiative.
        - If it's the player's turn, end your narration with: "Es tu turno, ¿qué haces?".
        - If it's an NPC's turn, execute their action, roll dice, and then proceed to the next character in the initiative order until it's the player's turn.

**STATE: SUBSEQUENT TURNS**
- If the player's action is anything other than "Comienza la batalla", this is a regular combat turn.
- **Combat Protocol (Strictly follow):**
    1.  **Narrate Player's Turn:** Describe the outcome of the player's action: "{{{playerAction}}}".
    2.  **Process NPC Turns:** After the player's turn, process the turns for any NPCs (monsters, enemies) that act next in the initiative order, up until the next player turn.
    3.  **NPC Actions:** For each NPC, determine their action based on their stats and tactics. Use the 'dndApiLookupTool' or 'adventureLookupTool' to get monster stats if you don't know them.
    4.  **Roll and Report:** For any NPC action requiring a roll (attack, damage, save), you MUST provide the details in the 'diceRolls' field.
        - The 'description' of the roll MUST include the dice notation and the ability modifier abbreviation (e.g., 'Tirada de Ataque (1d20+FUE)').
        - **Attack Flow:** First, make the attack roll. Narrate if it hits or misses based on the target's AC. A natural 20 is a 'crit', a natural 1 is a 'pifia'. ONLY if it hits, then make the damage roll.
    5.  **Update Stats:** If any character (player or NPC) takes damage or is affected by a condition, reflect this in the 'updatedCharacterStats' field for the player character if they are affected.
    6.  **End Turn:** Your narration MUST end by prompting the player for their next action if combat continues (e.g., "Es tu turno, ¿qué haces?").
    7.  **Check for Combat End:** If all enemies are defeated or have fled, set 'endCombat' to true. Otherwise, it MUST be false.

**CONTEXT:**
{{#if combatStartNarration}}
-   **This is how combat started:** {{{combatStartNarration}}}
{{/if}}
-   Player Stats: {{{characterStats}}}
-   Location: {{{locationDescription}}}
-   Conversation History:
    \`\`\`
    {{{conversationHistory}}}
    \`\`\`

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
              result = adventureData.entities?.find((ent: any) => ent.id === queryId);
            } else {
              return `Unknown query type '${queryType}'. Use 'location' or 'entity'.`;
            }
            
            return result ? JSON.stringify(result, null, 2) : `No ${queryType} found with ID '${queryId}'.`;
      
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
