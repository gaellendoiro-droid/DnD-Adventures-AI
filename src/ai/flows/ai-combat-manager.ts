
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
  playerAction: z.string().describe("The action taken by the player on their turn."),
  characterActions: z.string().optional().describe('The actions or dialogue of AI-controlled characters. This field may be empty.'),
  gameState: z.string().optional().describe('The current state of the game, for looking up entity/monster stats.'),
  locationDescription: z.string().optional().describe('A description of the current location.'),
  characterStats: z.string().optional().describe('The current stats of the player character.'),
  conversationHistory: z.string().optional().describe("A transcript of the last few turns of conversation to provide immediate context."),
});
export type AiCombatManagerInput = z.infer<typeof AiCombatManagerInputSchema>;

const CombatDiceRollSchema = z.object({
    roller: z.string().describe("The name of the character or monster rolling the dice."),
    rollNotation: z.string().describe("The dice notation for the roll (e.g., '1d20+5', '2d6+3')."),
    individualRolls: z.array(z.number()).describe("The result of each individual die rolled."),
    modifier: z.number().optional().describe("The modifier applied to the roll."),
    totalResult: z.number().describe("The total score after the modifier (sum of individual rolls + modifier)."),
    description: z.string().describe("A brief description of the roll's purpose, including dice notation. For example: 'Tirada de Ataque (1d20+5)', 'Tirada de Daño (2d6+3)', 'Salvación de Destreza (1d20+2)'."),
    outcome: z.enum(['crit', 'success', 'fail', 'pifia', 'neutral']).describe("The outcome of the roll. For attack rolls, use 'crit' for a critical hit (natural 20) and 'pifia' for a critical fail (natural 1). For all other attack rolls, you will determine success or failure based on the target's AC. For saving throws, use 'success' or 'fail' based on the DC. For damage rolls, use 'neutral'."),
});

const AiCombatManagerOutputSchema = z.object({
  narration: z.string().describe("The AI Dungeon Master's narration of the combat turn, formatted in Markdown."),
  updatedCharacterStats: z.string().optional().nullable().describe("The updated character stats (e.g., HP, XP, status effects), if any, as a valid JSON string. For example: '{\"hp\":{\"current\":8,\"max\":12}}'. Must be a valid JSON string or null."),
  diceRolls: z.array(CombatDiceRollSchema).optional().nullable().describe("An array of any dice rolls (attack, damage, saving throws, etc.) made during this turn."),
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

**COMBAT PROTOCOL (Strictly follow):**
1.  **Narrate Player's Turn:** Describe the outcome of the player's action: "{{{playerAction}}}".
2.  **Process NPC Turns:** After the player's turn, process the turns for any NPCs (monsters, enemies) that act next in the initiative order, up until the next player turn.
3.  **NPC Actions:** For each NPC, determine their action based on their stats and tactics. Use the 'dndApiLookupTool' or 'adventureLookupTool' to get monster stats if you don't know them.
4.  **Roll and Report:** For any NPC action requiring a roll (attack, damage, save), you MUST provide the details in the 'diceRolls' field.
    -   **Attack Flow:** First, make the attack roll. Narrate if it hits or misses based on the target's AC. A natural 20 is a 'crit', a natural 1 is a 'pifia'. ONLY if it hits, then make the damage roll.
5.  **Update Stats:** If any character (player or NPC) takes damage or is affected by a condition, reflect this in the 'updatedCharacterStats' field for the player character if they are affected.
6.  **End Turn:** Your narration MUST end by prompting the player for their next action if combat continues (e.g., "Es tu turno, ¿qué haces?").
7.  **Check for Combat End:** If all enemies are defeated or have fled, set 'endCombat' to true. Otherwise, it MUST be false.

**CONTEXT:**
-   Player Stats: {{{characterStats}}}
-   Location: {{{locationDescription}}}
-   Conversation History:
    \`\`\`
    {{{conversationHistory}}}
    \`\`\`

Narrate the results of the player's action ("{{{playerAction}}}") and proceed with the combat turn according to the protocol.
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
