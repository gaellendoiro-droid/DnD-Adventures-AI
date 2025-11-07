
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
import { companionExpert } from '../tools/companion-expert';

const NarrativeExpertInputSchema = z.object({
  playerAction: z.string().describe('The action taken by the player.'),
  partyJson: z.string().describe("A JSON string representing the player's party."),
  gameState: z.string().describe('A JSON string representing the entire adventure data. This is the primary source of truth for locations, entities, and interactable objects.'),
  locationId: z.string().describe('The ID of the current location (e.g., "phandalin-plaza-del-pueblo").'),
  locationContext: z.string().describe('A JSON string with the full data of the current location, including its description, exits, and interactable objects.'),
  characterStats: z.string().optional().describe('The current stats of the character.'),
  conversationHistory: z.string().optional().describe("A transcript of the last few turns of conversation to provide immediate context."),
});
export type NarrativeExpertInput = z.infer<typeof NarrativeExpertInputSchema>;

const NarrativeExpertOutputSchema = z.object({
  narration: z.string().describe("The AI Dungeon Master's narration in response to the player's action, formatted in Markdown. If characters are talking, include their dialogue in the narration. This can be an empty string if no narration is needed."),
  nextLocationId: z.string().optional().nullable().describe("The ID of the new location, if the player moved. Must be a valid ID from the adventure's 'locations' data."),
  updatedCharacterStats: z.string().optional().nullable().describe("The updated character stats (e.g., HP, XP, status effects), if any, as a valid JSON string. For example: '{\"hp\":{\"current\":8,\"max\":12}, \"inventory\": [{\"id\":\"item-gp-1\",\"name\":\"Monedas de Oro\",\"quantity\":10}]}'. Must be a valid JSON string or null."),
  startCombat: z.boolean().describe("Set to true if the player's action or the narrative circumstances have definitively initiated combat."),
  combatStartNarration: z.string().optional().describe("If startCombat is true, this field MUST contain a brief, exciting narration of how the combat begins that MENTIONS THE ENEMY NAMES (e.g., '¡Una emboscada! Dos orcos saltan de los arbustos, ¡con las hachas en alto!'). This will be used by the app to identify the combatants."),
  identifiedEnemies: z.array(z.string()).optional().describe("If startCombat is true, this field MUST contain a list of the names of the enemies starting combat."),
  debugLogs: z.array(z.string()).optional(),
});
export type NarrativeExpertOutput = z.infer<typeof NarrativeExpertOutputSchema>;

const narrativeExpertPrompt = ai.definePrompt({
  name: 'narrativeExpertPrompt',
  input: {schema: NarrativeExpertInputSchema},
  output: {schema: NarrativeExpertOutputSchema},
  tools: [dndApiLookupTool, adventureLookupTool, companionExpert],
  prompt: `You are an AI Dungeon Master for a D&D 5e game in narrative/exploration mode. You are an expert storyteller. You MUST ALWAYS reply in Spanish. DO NOT translate proper nouns (names, places, etc.).

**Your Priorities & Directives:**
1.  **Primary Task: Contextual Narrative.** Your main goal is to be a descriptive and engaging storyteller. You have been given all the context for the current location. Use this to react to the player's choices, portray non-player characters (NPCs), and create an immersive experience.
2.  **Companion AI Interaction:** The player's party includes AI-controlled companions. After the player acts, you MUST consider if any companion would react. Use the \`companionExpert\` tool to decide and generate their action or dialogue. Weave the companion's response naturally into your main narration. For example, if a companion speaks, format it like: **Elara dice:** "No me gusta este sitio."
3.  **Interaction Directive:** When the player wants to interact with something (e.g., "leo el tablón de anuncios" or "hablo con Linene"), use the 'locationContext' you already have. Refer to the 'interactionResults' or 'description' fields from the context to describe the outcome. DO NOT INVENT THE RESULT.
4.  **Movement Directive:** When the player wants to move to a new place (e.g., "voy a la Colina del Resentimiento"), you MUST use the \`adventureLookupTool\` to get the data for the destination. If the exit is valid, you MUST set the \`nextLocationId\` field in your response to the ID of the new location. Narrate the journey and the arrival at the new location based on its 'description' from the tool's response.
5.  **Question Answering Directive:** If the player asks about a location, person, or thing (e.g., "¿Quién es Cryovain?"), you MUST use the \`adventureLookupTool\` to find that information and use it to formulate your answer.
6.  **Combat Detection Directive (VERY IMPORTANT):**
    -   Your most important job is to determine if the story leads to combat. Set \`startCombat\` to \`true\` ONLY if combat is UNAVOIDABLE and IMMEDIATE.
    -   DO NOT start combat if enemies are present but haven't detected or attacked the party. Describe the tense situation and ask the player what they do.
    -   DO start combat if: the player attacks, an enemy ambushes the party, or a hostile conversation breaks down into violence.
7.  **Combat Start Protocol (Strictly follow):**
    -   When \`startCombat\` is true, you MUST provide a brief, exciting narration in the \`combatStartNarration\` field.
    -   This narration **MUST** clearly name the enemies involved (e.g., "¡Dos orcos y un goblin os atacan!").
    -   You MUST also populate the \`identifiedEnemies\` array with the names of the enemies starting combat.
8. **Final Narration:** Your final narration should combine the outcome of the player's action, any companion responses, and a prompt for the player's next action (e.g., "¿Qué haces?").

**Rules:**
-   ALWAYS return a valid JSON object matching the output schema.

**CONTEXT:**
- You are currently at location ID: \`{{{locationId}}}\`.
- Here is all the information about your current location: \`\`\`json
{{{locationContext}}}
\`\`\`
- The player's party is: {{{partyJson}}}
- Here are the player character stats: {{{characterStats}}}
- This is the recent conversation history: \`\`\`{{{conversationHistory}}}\`\`\`
- This is the complete adventure data that you MUST pass to the adventureLookupTool if you need to look up something NEW: \`\`\`json
{{{gameState}}}
\`\`\`

**PLAYER'S ACTION:**
"{{{playerAction}}}"

Based on all directives, use the provided context and tools to narrate what happens next.
`,
});

async function narrativeExpertFlow(input: NarrativeExpertInput): Promise<NarrativeExpertOutput> {
    const debugLogs: string[] = [];
    try {
        debugLogs.push("NarrativeExpert: Generating narration based on player action and context...");
        const {output} = await narrativeExpertPrompt(input);
        
        if (!output) {
            debugLogs.push("NarrativeExpert: AI returned null output. Throwing error.");
            throw new Error("The AI failed to return a valid output.");
        }
        
        // Final validation for location ID before returning
        if (output.nextLocationId) {
            const adventureData = JSON.parse(input.gameState);
            const locationExists = (adventureData.locations || []).some((loc: any) => loc.id === output.nextLocationId);
            if (!locationExists) {
                debugLogs.push(`NarrativeExpert: AI returned a non-existent nextLocationId: '${output.nextLocationId}'. Discarding it.`);
                output.nextLocationId = null;
            }
        }

        if (output.updatedCharacterStats) {
            try {
                JSON.parse(output.updatedCharacterStats);
            } catch (e) {
                debugLogs.push(`NarrativeExpert: AI returned invalid JSON for updatedCharacterStats. Discarding. Error: ${e}`);
                output.updatedCharacterStats = null;
            }
        }
        
        debugLogs.push("NarrativeExpert: Successfully generated narration object.");
        return { ...output, debugLogs };
    } catch(e: any) {
        debugLogs.push(`NarrativeExpert: Critical error in flow. Error: ${e.message}`);
        console.error("Critical error in narrativeExpertFlow.", e);
        // This specific error message will be caught by the action and shown in the UI.
        throw new Error(`narrativeExpertFlow failed: ${e.message || 'Unknown error'}`);
    }
}

export async function narrativeExpert(input: NarrativeExpertInput): Promise<NarrativeExpertOutput> {
    return narrativeExpertFlow(input);
}
