
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

const NarrativeExpertInputSchema = z.object({
  playerAction: z.string().describe('The action taken by the player.'),
  characterActions: z.string().optional().describe('The actions or dialogue of AI-controlled characters in response to the player. This field may be empty.'),
  gameState: z.string().describe('A JSON string representing the entire adventure data. This is the primary source of truth for locations, entities, and interactable objects.'),
  locationId: z.string().describe('The ID of the current location (e.g., "phandalin-plaza-del-pueblo").'),
  characterStats: z.string().optional().describe('The current stats of the character.'),
  conversationHistory: z.string().optional().describe("A transcript of the last few turns of conversation to provide immediate context."),
});
export type NarrativeExpertInput = z.infer<typeof NarrativeExpertInputSchema>;

const NarrativeExpertOutputSchema = z.object({
  narration: z.string().describe("The AI Dungeon Master's narration in response to the player's action, formatted in Markdown. If the characters are just talking, this can be an empty string."),
  nextLocationId: z.string().optional().nullable().describe("The ID of the new location, if the player moved. Must be a valid ID from the adventure's 'locations' data."),
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
  tools: [dndApiLookupTool],
  prompt: `You are an AI Dungeon Master for a D&D 5e game in narrative/exploration mode. You are an expert storyteller. You MUST ALWAYS reply in Spanish. DO NOT translate proper nouns (names, places, etc.).

**Your Priorities & Directives:**
1.  **Primary Task: Drive the Narrative.** Your main goal is to be a descriptive and engaging storyteller. Describe the world, react to the player's choices, portray non-player characters (NPCs), and create an immersive experience. Your narration must always end by prompting the player for their next action (e.g., "¿Qué haces?").
2.  **Tool Directive: Use Your Tools.** You have two tools:
    - \`adventureLookupTool\`: Use this to get information about the player's CURRENT location or a location they want to move to. It will return a JSON object with all details for that location. You MUST use this to get the context for your narration.
    - \`dndApiLookupTool\`: For general D&D rules, spells, or monster stats.
3.  **Interaction Directive:** When the player wants to interact with something (e.g., "leo el tablón de anuncios"), first use \`adventureLookupTool\` to get the data for the current location. Then, find the "interactables" array in the returned JSON and use the information there to describe the outcome. **DO NOT INVENT THE RESULT.** The tool is your source of truth.
4.  **Movement Directive:** When the player wants to move (e.g., "voy a la Colina del Resentimiento"), use the \`adventureLookupTool\` to get the data for the destination. If the exit is valid, you MUST set the \`nextLocationId\` field in your response to the ID of the new location. Narrate the journey and the arrival at the new location based on its description.
5.  **Combat Detection Directive:** Your most important job is to determine if the story leads to combat. This can be due to a player's hostile action (e.g., "Ataco al guardia") or a narrative event (e.g., an ambush). If combat starts, you **MUST** set 'startCombat' to true.
6.  **Combat Start Protocol (Strictly follow):**
    -   When 'startCombat' is true, your ONLY job is to write a brief, exciting narration in the 'combatStartNarration' field describing the moment the fight breaks out.
    -   Your 'narration' field can be the same or slightly more detailed.
    -   When 'startCombat' is true, DO NOT roll initiative or describe attacks.

**Rules:**
-   Only update \`updatedCharacterStats\` for actions resolved in this turn (e.g., drinking a potion).
-   When the player moves, you MUST populate \`nextLocationId\`.
-   ALWAYS return a valid JSON object matching the output schema.

**CONTEXT:**
- You are currently at location ID: \`{{{locationId}}}\`. Use the \`adventureLookupTool\` with this ID to understand your surroundings.
- Here are the player character stats: {{{characterStats}}}
- This is the recent conversation history: \`\`\`{{{conversationHistory}}}\`\`\`

**PLAYER'S ACTION:**
"{{{playerAction}}}"

**COMPANION ACTIONS (for context):**
{{#if characterActions}}\`\`\`{{{characterActions}}}\`\`\`{{else}}(No other characters have acted.){{/if}}

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
        description: "Looks up and returns the entire JSON object for a specific location or entity (character, monster, item) from the adventure data. Use this to get all details about a place the player is in or wants to go to, or an object they want to interact with.",
        inputSchema: z.object({
          query: z.string().describe("The ID or name of the location, entity, or interactable object (e.g., 'phandalin-plaza-del-pueblo', 'cryovain', 'Tablón de oportunidades')."),
        }),
        outputSchema: z.string().describe('A JSON string containing the requested information, or an error message if not found.'),
      },
      async ({ query }) => {
        if (!adventureData) {
          return "Error: Adventure data is not available.";
        }
        
        const allData = [...(adventureData.locations || []), ...(adventureData.entities || [])];
        const result = allData.find((item: any) => 
            item.id === query || (item.name && typeof item.name === 'string' && item.name.toLowerCase() === query.toLowerCase())
        );

        if (result) return JSON.stringify(result);

        // Add search for interactables within the current location
        if (input.locationId) {
            const currentLocation = (adventureData.locations || []).find((loc:any) => loc.id === input.locationId);
            if (currentLocation && currentLocation.interactables) {
                const interactable = currentLocation.interactables.find((i: any) => i.name && typeof i.name === 'string' && i.name.toLowerCase() === query.toLowerCase());
                if (interactable) return JSON.stringify(interactable);
            }
        }

        return `Error: No location, entity or interactable found matching '${query}'.`;
      }
    );

    try {
        const {output} = await narrativeExpertPrompt(input, {
            tools: [dndApiLookupTool, dynamicAdventureLookupTool],
        });
        
        if (!output) {
            throw new Error("The AI failed to return a valid output.");
        }
        
        // Final validation for location ID before returning
        if (output.nextLocationId) {
            const locationExists = (adventureData.locations || []).some((loc: any) => loc.id === output.nextLocationId);
            if (!locationExists) {
                console.warn(`AI returned a non-existent nextLocationId: '${output.nextLocationId}'. Discarding it.`);
                output.nextLocationId = null;
            }
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
        console.error("Critical error in narrativeExpertFlow.", e);
        // This specific error message will be caught by the action and shown in the UI.
        throw new Error(`narrativeExpertFlow failed: ${e.message || 'Unknown error'}`);
    }
  }
);
