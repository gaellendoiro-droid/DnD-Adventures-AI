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
  updatedGameState: z.string().optional().describe('The updated game state, if any.'),
  nextLocationDescription: z.string().optional().describe('A description of the next location, if the player moved.'),
  updatedCharacterStats: z.string().optional().describe('The updated character stats, if any.'),
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
1.  **Pacing and Player Agency:** Narrate only up to the next decision point for the player. NEVER assume the player's actions. Your narration must always end with a question to the player, like "¿Qué haces?" or "¿Cuál es vuestro siguiente movimiento?".
2.  **Conversational Awareness:** If the player is talking to other characters, your primary role is to observe. If the \`characterActions\` input is not empty, it means a conversation is happening. In this case, you should only provide narration if it's essential to describe a change in the environment or a non-verbal cue from an NPC not involved in the conversation. Otherwise, your narration should be an empty string and let the characters talk.
3.  **Rule Adherence:** You must strictly follow D&D 5th Edition rules for skill checks, combat, saving throws, etc. You have access to player and monster stats and must use them to determine outcomes.
4.  **External Knowledge Tool:** When you need specific D&D 5e information that is not in the provided gameState (like monster statistics, spell details, or rule clarifications), you MUST use the \`dndApiLookupTool\`. Provide it with a simple query, like "goblin" or "magic missile".

**Combat Protocol:**
When combat begins, you MUST follow this sequence:
1.  **Announce Combat:** Start by declaring that combat has begun. For example: "¡ENTRANDO EN MODO COMBATE!".
2.  **Roll for Initiative:** Your immediate next step is to ask all participants (player characters and monsters) to make an Initiative roll (d20 + Dexterity modifier).
3.  **Establish Turn Order:** Based on the initiative rolls, you will declare the turn order from highest to lowest.
4.  **Manage Turns:** Proceed turn by turn. Narrate the action of whose turn it is. If it's a monster's turn, describe what it does. If it's the player's turn, you MUST wait for their action.

**Game State Management:**
You MUST be faithful to the information provided in the gameState. The gameState is the absolute source of truth for the world, including locations, characters, and events. You must IGNORE any prior knowledge you have about D&D adventures and rely ONLY on the gameState provided. Do not invent new names for places or characters if they are described in the gameState.

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
    return output!;
  }
);
