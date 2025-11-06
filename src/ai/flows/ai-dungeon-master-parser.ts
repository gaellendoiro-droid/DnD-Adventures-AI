
'use server';
/**
 * @fileOverview This file contains the Genkit flow for the AiDungeonMasterParser, which parses player actions and drives the story forward.
 *
 * - aiDungeonMasterParser - A function that takes player input and returns the AI's response to drive the story.
 * - AiDungeonMasterParserInput - The input type for the aiDungeonMasterParser function.
 * - AiDungeonMasterParserOutput - The return type for the aiDungeonMasterParser function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { dndApiLookupTool } from '../tools/dnd-api-lookup';
import { adventureLookupTool } from '../tools/adventure-lookup';

const AiDungeonMasterParserInputSchema = z.object({
  playerAction: z.string().describe('The action taken by the player.'),
  characterActions: z.string().optional().describe('The actions or dialogue of AI-controlled characters in response to the player. This field may be empty.'),
  gameState: z.string().optional().describe('The current state of the game.'),
  locationDescription: z.string().optional().describe('A description of the current location.'),
  characterStats: z.string().optional().describe('The current stats of the character.'),
  conversationHistory: z.string().optional().describe("A transcript of the last few turns of conversation to provide immediate context."),
});
export type AiDungeonMasterParserInput = z.infer<typeof AiDungeonMasterParserInputSchema>;

const InitiativeRollSchema = z.object({
    characterName: z.string().describe("The name of the character or monster."),
    roll: z.number().describe("The result of the d20 roll for initiative."),
    modifier: z.number().describe("The dexterity modifier applied to the roll."),
    total: z.number().describe("The total initiative score (roll + modifier).")
});

const CombatDiceRollSchema = z.object({
    roller: z.string().describe("The name of the character or monster rolling the dice."),
    diceType: z.number().describe("The type of die being rolled (e.g., 20 for a d20, 8 for a d8)."),
    result: z.number().describe("The result of the dice roll."),
    modifier: z.number().optional().describe("The modifier applied to the roll."),
    finalResult: z.number().optional().describe("The total score after the modifier (roll + modifier)."),
    description: z.string().describe("A brief description of the roll's purpose (e.g., 'Tirada de Ataque', 'Tirada de Daño', 'Salvación de Destreza').")
});

const AiDungeonMasterParserOutputSchema = z.object({
  narration: z.string().describe("The AI Dungeon Master's narration in response to the player's action, formatted in Markdown. If the characters are just talking, this can be an empty string."),
  nextLocationDescription: z.string().optional().nullable().describe('A description of the next location, if the player moved.'),
  updatedCharacterStats: z.string().optional().nullable().describe("The updated character stats (e.g., HP, XP, status effects), if any, as a valid JSON string. For example: '{\"hp\":{\"current\":8,\"max\":12}, \"inventory\": [{\"id\":\"item-gp-1\",\"name\":\"Monedas de Oro\",\"quantity\":10}]}'. Must be a valid JSON string or null."),
  initiativeRolls: z.array(InitiativeRollSchema).optional().nullable().describe("An array of detailed initiative rolls if combat has started. This should include the d20 roll, modifier, and total for each combatant."),
  diceRolls: z.array(CombatDiceRollSchema).optional().nullable().describe("An array of any dice rolls (attack, damage, saving throws, etc.) made by NPCs during their turn."),
});
export type AiDungeonMasterParserOutput = z.infer<typeof AiDungeonMasterParserOutputSchema>;

export async function aiDungeonMasterParser(input: AiDungeonMasterParserInput): Promise<AiDungeonMasterParserOutput> {
  return aiDungeonMasterParserFlow(input);
}

const aiDungeonMasterParserPrompt = ai.definePrompt({
  name: 'aiDungeonMasterParserPrompt',
  input: {schema: AiDungeonMasterParserInputSchema},
  output: {schema: AiDungeonMasterParserOutputSchema},
  tools: [dndApiLookupTool, adventureLookupTool],
  prompt: `You are an AI Dungeon Master for a D&D 5e game. You are an expert in the D&D 5th Edition Player's Handbook rules. Your goal is to be a descriptive and engaging storyteller, while being faithful to the game's state and rules. You MUST ALWAYS reply in Spanish. It is very important that you DO NOT translate proper nouns (names of people, places, items, etc.).

**Core Directives (in order of importance):**

- **[Priority 1] Factual Adherence & Tool Use:** This is your most important rule. You MUST strictly adhere to the information returned by your tools. DO NOT invent character names, place names, or details that are not explicitly mentioned in the tool results or the provided location description. The adventure data is the single source of truth.
  - **adventureLookupTool:** Use this to get details about specific locations or entities from the adventure when the player moves or interacts with something new. For example: \`location:posada-rocacolina\` or \`entity:cryovain\`.
  - **dndApiLookupTool:** Use this ONLY for generic D&D 5e information NOT in the adventure data, like monster stats for a random encounter, spell details, or item prices. Provide simple queries, like "goblin" or "longsword".

- **[Priority 2] Reliability is Key:** You MUST ALWAYS return a valid JSON object that conforms to the output schema. Returning null or an invalid format is not an option. If there is no specific narration, return an object with an empty string for the 'narration' field.

- **[Priority 3] Pacing and Player Agency:** Narrate only up to the next decision point for the player. NEVER assume the player's actions or the outcome of their choices. Your narration must always end by prompting the player for their next action, like "¿Qué haces?" or "¿Cuál es vuestro siguiente movimiento?".

- **[Priority 4] Contextual Awareness:**
  - The actions of other characters (\`characterActions\`) are provided for context, NOT for you to narrate again. The game will display their dialogue separately. Your job is to narrate what happens as a consequence of the player's and other characters' actions, focusing on the environment and non-player characters (NPCs) that are not part of the adventuring party.
  - The \`conversationHistory\` is your primary source of truth for the immediate narrative. Use it to maintain continuity and avoid repeating descriptions of characters or scenes that are already in the recent history.
  - The \`locationDescription\` provides general context for the current area.

- **[Priority 5] Rule Adherence & Stat Updates:** You must strictly follow D&D 5th Edition rules.
    - **CRITICAL:** Only return \`updatedCharacterStats\` if an action has been *fully completed* and its consequences are resolved in the current turn. For example, if a merchant offers an item for sale, do not deduct the gold until the player explicitly confirms the purchase in a subsequent turn. If the player attacks and hits, then you can update HP.

**Combat Protocol:**
When combat begins, you MUST follow this exact sequence:
1.  **Announce Combat:** Start by declaring that combat has begun. For example: "¡ENTRANDO EN MODO COMBATE!".
2.  **Determine Initiative:** Immediately determine the initiative for all combatants (player characters and monsters) by simulating a d20 roll plus their Dexterity modifier. Do not ask the player to roll. You MUST return the details of each roll (character name, d20 roll, modifier, and total) in the \`initiativeRolls\` field of your response.
3.  **Establish and Declare Turn Order:** Based on the initiative rolls, declare the turn order from highest to lowest in your narration.
4.  **Manage Turns:** Proceed turn by turn. Narrate the action of whose turn it is. If it is a monster's turn, describe what it does. **CRITICAL: If it is the player's turn, your narration MUST stop just before their action, waiting for their input. For example: 'Es tu turno, Galador. ¿Qué haces?'. DO NOT, under any circumstances, take an action for the player.**
5.  **Report NPC Rolls:** For any action taken by an NPC (monster or other character) that requires a dice roll (attack, damage, saving throw, etc.), you MUST provide the details of that roll in the \`diceRolls\` field of your response.

Here is the general description of the current location: {{{locationDescription}}}
Here are the player character stats: {{{characterStats}}}

This is the recent conversation history. Use it to maintain continuity and avoid repeating yourself:
\`\`\`
{{{conversationHistory}}}
\`\`\`

The player's latest action is: "{{{playerAction}}}"

The other characters in the party have just said or done the following (this is for context, do NOT narrate their actions again):
{{#if characterActions}}
\`\`\`
{{{characterActions}}}
\`\`\`
{{else}}
(No other characters have acted.)
{{/if}}

Based on the player's action, the other characters' actions, and all your directives, narrate what happens next. Be descriptive, engaging, and follow the rules. Remember to use your tools to look up any information you don't know.
`,
});

const aiDungeonMasterParserFlow = ai.defineFlow(
  {
    name: 'aiDungeonMasterParserFlow',
    inputSchema: AiDungeonMasterParserInputSchema,
    outputSchema: AiDungeonMasterParserOutputSchema,
  },
  async (input) => {
    // Dynamically wire the adventure lookup tool to use the current gameState
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

    const {output} = await aiDungeonMasterParserPrompt(input, {
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
      return { narration: "El Dungeon Master parece distraído y no responde." };
    }
    
    // Validate that updatedCharacterStats is valid JSON before returning
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
