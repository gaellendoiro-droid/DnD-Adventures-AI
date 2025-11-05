
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

const AiDungeonMasterParserInputSchema = z.object({
  playerAction: z.string().describe('The action taken by the player.'),
  characterActions: z.string().optional().describe('The actions or dialogue of AI-controlled characters in response to the player. This field may be empty.'),
  gameState: z.string().optional().describe('The current state of the game.'),
  locationDescription: z.string().optional().describe('A description of the current location.'),
  characterStats: z.string().optional().describe('The current stats of the character.'),
});
export type AiDungeonMasterParserInput = z.infer<typeof AiDungeonMasterParserInputSchema>;

const AiDungeonMasterParserOutputSchema = z.object({
  narration: z.string().describe("The AI Dungeon Master's narration in response to the player's action, formatted in Markdown. If the characters are just talking, this can be an empty string."),
  updatedGameState: z.string().optional().nullable().describe('The updated game state, if any.'),
  nextLocationDescription: z.string().optional().nullable().describe('A description of the next location, if the player moved.'),
  updatedCharacterStats: z.string().optional().nullable().describe("The updated character stats (e.g., HP, XP, status effects), if any, as a valid JSON string. For example: '{\"hp\":{\"current\":8,\"max\":12}}'. Must be a valid JSON string or null."),
});
export type AiDungeonMasterParserOutput = z.infer<typeof AiDungeonMasterParserOutputSchema>;

export async function aiDungeonMasterParser(input: AiDungeonMasterParserInput): Promise<AiDungeonMasterParserOutput> {
  return aiDungeonMasterParserFlow(input);
}

const aiDungeonMasterParserPrompt = ai.definePrompt({
  name: 'aiDungeonMasterParserPrompt',
  input: {schema: AiDungeonMasterParserInputSchema},
  output: {schema: AiDungeonMasterParserOutputSchema},
  tools: [dndApiLookupTool],
  prompt: `You are an AI Dungeon Master for a D&D 5e game. You are an expert in the D&D 5th Edition Player's Handbook rules. Your goal is to be a descriptive and engaging storyteller, while being faithful to the game's state and rules. You MUST ALWAYS reply in Spanish. It is very important that you DO NOT translate proper nouns (names of people, places, items, etc.).

**Core Directives:**
1.  **Reliability is Key:** You MUST ALWAYS return a valid JSON object that conforms to the output schema. Returning null or an invalid format is not an option. If there is no specific narration, return an object with an empty string for the 'narration' field.
2.  **Pacing and Player Agency:** Narrate only up to the next decision point for the player. NEVER assume the player's actions. Your narration must always end with a question to the player, like "¿Qué haces?" or "¿Cuál es vuestro siguiente movimiento?".
3.  **Conversational Awareness:** If the player is talking to other characters, your primary role is to observe. If the \`characterActions\` input is not empty, it means a conversation is happening. In this case, you should only provide narration if it's essential to describe a change in the environment or a non-verbal cue from an NPC not involved in the conversation. Otherwise, your narration should be an empty string and let the characters talk.
4.  **Rule Adherence & Stat Updates:** You must strictly follow D&D 5th Edition rules. You have access to player and monster stats. If any character stat changes (HP, XP, status effects, etc.), you MUST return the complete, updated stats object in the 'updatedCharacterStats' field as a valid JSON string. For example: '{"hp":{"current":8,"max":12},"xp":300}'. If no stats change, return null for this field.
5.  **Information Hierarchy:** The \`gameState\` is the absolute source of truth. You must prioritize information from the \`gameState\` over any other knowledge. Use the \`dndApiLookupTool\` ONLY when you need specific D&D 5e information that is NOT present in the provided \`gameState\` (like monster statistics for a new encounter, spell details, or rule clarifications). Provide the tool with simple queries, like "goblin" or "magic missile".
6.  **Descriptive Locations:** When the party arrives at a new location, especially a town or city, your description MUST be vivid and comprehensive. Describe the atmosphere, notable landmarks (e.g., "a bustling marketplace to your left," "a quiet temple down the street," "the town blacksmith hammering away"), and potential points of interest to give the player a clear sense of place and actionable options.

**Combat Protocol:**
When combat begins, you MUST follow this exact sequence:
1.  **Announce Combat:** Start by declaring that combat has begun. For example: "¡ENTRANDO EN MODO COMBATE!".
2.  **Determine Initiative:** Immediately determine the initiative for all combatants (player characters and monsters) by simulating a d20 roll plus their Dexterity modifier. Do not ask the player to roll.
3.  **Establish and Declare Turn Order:** Based on the initiative rolls, declare the turn order from highest to lowest.
4.  **Manage Turns:** Proceed turn by turn. Narrate the action of whose turn it is. If it's a monster's turn, describe what it does. If it's the player's turn, you MUST wait for their action.

**Game State Management:**
Be faithful to the information provided in the gameState. Do not invent new names for places or characters if they are described in the gameState.

Here is the current game state in JSON format:
\`\`\`json
{{{gameState}}}
\`\`\`
Here is the description of the current location: {{{locationDescription}}}
Here are the player character stats: {{{characterStats}}}

The player's action is: "{{{playerAction}}}"

The other characters in the party have just said or done the following:
{{#if characterActions}}
\`\`\`
{{{characterActions}}}
\`\`\`
{{else}}
(No other characters have acted.)
{{/if}}

Based on the player's action, the other characters' actions, and all your directives, narrate what happens next. Be descriptive, engaging, and follow the rules. If applicable, update the game state, character stats or location description.`,
});

const aiDungeonMasterParserFlow = ai.defineFlow(
  {
    name: 'aiDungeonMasterParserFlow',
    inputSchema: AiDungeonMasterParserInputSchema,
    outputSchema: AiDungeonMasterParserOutputSchema,
  },
  async input => {
    const {output} = await aiDungeonMasterParserPrompt(input);
    
    // Safeguard: If the model returns null or undefined, provide a default valid response.
    if (!output) {
      return { narration: "El Dungeon Master parece distraído y no responde. Intenta reformular tu acción." };
    }
    
    // Safeguard: Validate that updatedCharacterStats is a valid JSON string if it exists
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

    