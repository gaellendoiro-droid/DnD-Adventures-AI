
'use server';
/**
 * @fileOverview This file contains the Genkit flow for the NarrativeExpert, which handles the narrative/exploration mode of the game.
 *
 * - narrativeExpert - A function that takes player input and returns the AI's response to drive the story.
 * - NarrativeExpertInput - The input type for the narrativeExpert function.
 * - NarrativeExpertOutput - The return type for the narrativeExpert function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { dndApiLookupTool } from '../tools/dnd-api-lookup';
import { adventureLookupTool } from '../tools/adventure-lookup';

const NarrativeExpertInputSchema = z.object({
  playerAction: z.string().describe('The action taken by the player.'),
  characterActions: z.string().optional().describe('The actions or dialogue of AI-controlled characters in response to the player. This field may be empty.'),
  gameState: z.string().optional().describe('A JSON string representing the entire adventure data. This is the primary source of truth for locations, entities, and interactable objects.'),
  locationDescription: z.string().optional().describe('A description of the current location.'),
  characterStats: z.string().optional().describe('The current stats of the character.'),
  conversationHistory: z.string().optional().describe("A transcript of the last few turns of conversation to provide immediate context."),
});
export type NarrativeExpertInput = z.infer<typeof NarrativeExpertInputSchema>;

const NarrativeExpertOutputSchema = z.object({
  narration: z.string().describe("The AI Dungeon Master's narration in response to the player's action, formatted in Markdown. If the characters are just talking, this can be an empty string."),
  nextLocationDescription: z.string().optional().nullable().describe('A description of the next location, if the player moved.'),
  updatedCharacterStats: z.string().optional().nullable().describe("The updated character stats (e.g., HP, XP, status effects), if any, as a valid JSON string. For example: '{\"hp\":{\"current\":8,\"max\":12}, \"inventory\": [{\"id\":\"item-gp-1\",\"name\":\"Monedas de Oro\",\"quantity\":10}]}'. Must be a valid JSON string or null."),
  startCombat: z.boolean().describe("Set to true if the player's action or the narrative circumstances have definitively initiated combat."),
  combatStartNarration: z.string().optional().describe("If startCombat is true, this field MUST contain a brief, exciting narration of how the combat begins (e.g., 'An arrow whistles past your ear and you see three goblins emerging from the bushes!'). This will be used by the app to identify the combatants."),
});
export type NarrativeExpertOutput = z.infer<typeof NarrativeExpertOutputSchema>;

export async function narrativeExpert(input: NarrativeExpertInput): Promise<NarrativeExpertOutput> {
  return narrativeExpertFlow(input);
}

const narrativeExpertPrompt = ai.definePrompt({
  name: 'narrativeExpertPrompt',
  input: {schema: NarrativeExpertInputSchema},
  output: {schema: NarrativeExpertOutputSchema},
  tools: [dndApiLookupTool, adventureLookupTool],
  prompt: `You are an AI Dungeon Master for a D&D 5e game in narrative/exploration mode. You are an expert storyteller. You MUST ALWAYS reply in Spanish. DO NOT translate proper nouns (names, places, etc.).

**Your Priorities:**
1.  **Primary Task: Drive the Narrative.** Your main goal is to be a descriptive and engaging storyteller. Describe the world, react to the player's choices, portray non-player characters (NPCs), and create an immersive experience. Your narration must always end by prompting the player for their next action (e.g., "¿Qué haces?").
2.  **Use Your Tools:** You have access to a complete adventure data file. Use the 'adventureLookupTool' to get details about locations, what's inside them, and how to interact with objects. This is your primary source of truth. If the player wants to move to a new location (e.g., "Voy a la Colina del Resentimiento"), you MUST use this tool to get the description of the new place. For general D&D rules, spells, or monster stats not in the adventure file, use the 'dndApiLookupTool'.
3.  **CRITICAL DIRECTIVE: Detect Combat.** Your most important job is to determine if the story leads to combat. This can be due to a player's hostile action (e.g., "Ataco al guardia") or a narrative event (e.g., an ambush). If combat starts, you MUST set 'startCombat' to true.

**Combat Start Protocol (Strictly follow):**
-   When 'startCombat' is true, your ONLY job is to write a brief, exciting narration in the 'combatStartNarration' field describing the moment the fight breaks out (e.g., "El guardia desenvaina su espada con un grito, y la batalla comienza." or "¡Una banda de orcos os embosca desde las ruinas!"). This narration is critical as it will be used to identify the enemies.
-   Your 'narration' field in this case can be the same as 'combatStartNarration' or a slightly more detailed version.
-   When 'startCombat' is true, DO NOT roll initiative, do not describe attacks, do not do anything else. The application will handle all combat mechanics.
-   For any other action that does NOT start combat, 'startCombat' MUST be false.

**Rules:**
-   Only update \`updatedCharacterStats\` for actions resolved in this turn (e.g., drinking a potion). Do not update stats for combat-related actions.
-   ALWAYS return a valid JSON object matching the output schema.

Here is the general description of the current location: {{{locationDescription}}}
Here are the player character stats: {{{characterStats}}}

This is the recent conversation history. Use it to maintain continuity:
\`\`\`
{{{conversationHistory}}}
\`\`\`

The player's latest action is: "{{{playerAction}}}"

The other characters in the party have just said or done the following (for context, do NOT narrate their actions again):
{{#if characterActions}}
\`\`\`
{{{characterActions}}}
\`\`\`
{{else}}
(No other characters have acted.)
{{/if}}

Based on all directives, narrate what happens next. Use your tools for accurate information. If combat starts, follow the protocol exactly.
`,
});

const narrativeExpertFlow = ai.defineFlow(
  {
    name: 'narrativeExpertFlow',
    inputSchema: NarrativeExpertInputSchema,
    outputSchema: NarrativeExpertOutputSchema,
  },
  async (input) => {
    let adventureData: any = null;
    if (input.gameState) {
      try {
        adventureData = JSON.parse(input.gameState);
      } catch (e) {
        console.error("Failed to parse gameState JSON in narrativeExpertFlow");
      }
    }

    const dynamicAdventureLookupTool = ai.defineTool(
      {
        name: 'adventureLookupTool',
        description: 'Looks up information about a specific location or entity (character, monster) from the main adventure data file. Use this to get details when a player moves to a new area or interacts with a specific named entity. This is the most accurate source for named characters.',
        inputSchema: z.object({
          query: z.string().describe("The search query, which can be the entity's ID or name (e.g., 'phandalin-plaza-del-pueblo', 'cryovain')."),
        }),
        outputSchema: z.string().describe('A JSON string containing the requested information, or an error message if not found.'),
      },
      async ({ query }) => {
        if (!adventureData) {
          return "Error: Adventure data is not available.";
        }
        
        const allData = [...(adventureData.locations || []), ...(adventureData.entities || [])];
        const result = allData.find((item: any) => item.id === query || item.name.toLowerCase() === query.toLowerCase());

        return result ? JSON.stringify(result) : `Error: No location or entity found matching '${query}'.`;
      }
    );

    try {
        const {output} = await narrativeExpertPrompt(input, {
            tools: [dndApiLookupTool, dynamicAdventureLookupTool],
        });
        
        if (!output) {
            return { narration: "El Dungeon Master parece distraído y no responde.", startCombat: false };
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
    } catch(e: any) {
        console.error("Critical error in narrativeExpertFlow. The AI did not return valid JSON.", e);
        // This specific error message will be caught by the action and shown in the UI.
        throw new Error(`narrativeExpertFlow failed: ${e.message || 'Unknown error'}`);
    }
  }
);
