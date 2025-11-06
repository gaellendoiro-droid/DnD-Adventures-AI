
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
  combatStartNarration: z.string().optional().describe("If startCombat is true, this field MUST contain a brief, exciting narration of how the combat begins that MENTIONS THE ENEMY NAMES (e.g., '¡Una emboscada! Dos orcos saltan de los arbustos, ¡con las hachas en alto!'). This will be used by the app to identify the combatants."),
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

**Your Priorities & Directives:**
1.  **Primary Task: Drive the Narrative.** Your main goal is to be a descriptive and engaging storyteller. Describe the world, react to the player's choices, portray non-player characters (NPCs), and create an immersive experience. Your narration must always end by prompting the player for their next action (e.g., "¿Qué haces?").
2.  **Tool Directive: Use Your Tools.** You have two tools:
    - \`adventureLookupTool\`: Use this to get information about ANY location, character, monster, or interactable item from the adventure data. It is your primary source of truth.
    - \`dndApiLookupTool\`: For general D&D rules, spells, or monster stats.
3.  **Interaction Directive:** When the player wants to interact with something (e.g., "leo el tablón de anuncios" or "hablo con Linene"), you **MUST** use \`adventureLookupTool\` to get the data for that object or entity. Use the information in the JSON response (e.g., the 'interactionResults' array) to describe the outcome. **DO NOT INVENT THE RESULT.**
4.  **Movement Directive:** When the player wants to move to a new place (e.g., "voy a la Colina del Resentimiento"), you **MUST** use the \`adventureLookupTool\` to get the data for the destination. If the exit is valid, you MUST set the \`nextLocationId\` field in your response to the ID of the new location. Narrate the journey and the arrival at the new location based on its 'description' from the tool's response.
5.  **Question Answering Directive:** If the player asks about a location, person, or thing (e.g., "¿Quién es Cryovain?"), you **MUST** use the \`adventureLookupTool\` to find that information and use it to formulate your answer.
6.  **Combat Detection Directive (VERY IMPORTANT):**
    -   Your most important job is to determine if the story leads to combat. Set \`startCombat\` to \`true\` ONLY if combat is UNAVOIDABLE and IMMEDIATE.
    -   **DO NOT start combat if enemies are present but haven't detected or attacked the party.** Describe the tense situation and ask the player what they do. Give them a chance to act first (e.g., to try stealth or diplomacy).
    -   **DO start combat if:**
        -   The player explicitly attacks an enemy (e.g., "Ataco al orco").
        -   An enemy ambushes the party and their first action is to attack.
        -   A hostile conversation irrevocably breaks down into violence.
7.  **Combat Start Protocol (Strictly follow):**
    -   When \`startCombat\` is true, your ONLY job is to write a brief, exciting narration in the \`combatStartNarration\` field.
    -   This narration **MUST** clearly name the enemies involved (e.g., "¡Dos orcos y un goblin os atacan!"). The system uses these names to find the monsters.
    -   When 'startCombat' is true, DO NOT roll initiative or describe attacks. The system handles that.

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
        description: "Looks up and returns the entire JSON object for a specific location or entity (character, monster, item) from the adventure data. Use this to get all details about a place the player is in or wants to go to, or an object/character they want to interact with or ask about.",
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

    