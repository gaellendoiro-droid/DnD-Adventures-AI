
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
import { companionExpertTool } from '../tools/companion-expert';
import { CharacterSchema } from '@/lib/schemas';
import { getAdventureData } from '@/app/game-state-actions';

const NarrativeExpertInputSchema = z.object({
  playerAction: z.string().describe('The action taken by the player.'),
  party: z.array(CharacterSchema).describe("The player's party. The character with `controlledBy: 'Player'` is the human player."),
  locationId: z.string().describe('The ID of the current location (e.g., "phandalin-plaza-del-pueblo").'),
  locationContext: z.string().describe('A JSON string with the full data of the current location, including its description, exits, and interactable objects.'),
  conversationHistory: z.string().optional().describe("A transcript of the last few turns of conversation to provide immediate context."),
  log: z.function(z.tuple([z.string()]), z.void()).optional().describe("A function to log debug messages in real-time."),
});
export type NarrativeExpertInput = z.infer<typeof NarrativeExpertInputSchema>;

const NarrativeExpertOutputSchema = z.object({
  narration: z.string().describe("The AI Dungeon Master's narration in response to the player's action, formatted in Markdown. If characters are talking, include their dialogue in the narration. This can be an empty string if no narration is needed."),
  nextLocationId: z.string().optional().nullable().describe("The ID of the new location, if the player moved. Must be a valid ID from the adventure's 'locations' data."),
  updatedCharacterStats: z.string().optional().nullable().describe("The updated character stats (e.g., HP, XP, status effects), if any, for the PLAYER character only, as a valid JSON string. For example: '{\"hp\":{\"current\":8,\"max\":12}, \"inventory\": [{\"id\":\"item-gp-1\",\"name\":\"Monedas de Oro\",\"quantity\":10}]}'. Must be a valid JSON string or null."),
  debugLogs: z.array(z.string()).optional(),
});
export type NarrativeExpertOutput = z.infer<typeof NarrativeExpertOutputSchema>;

const narrativeExpertPrompt = ai.definePrompt({
  name: 'narrativeExpertPrompt',
  input: {schema: z.object({
    playerAction: z.string(),
    party: z.array(CharacterSchema),
    locationId: z.string(),
    locationContext: z.string(),
    conversationHistory: z.string().optional(),
  })},
  output: {schema: NarrativeExpertOutputSchema},
  tools: [dndApiLookupTool, adventureLookupTool, companionExpertTool],
  prompt: `You are an AI Dungeon Master for a D&D 5e game in narrative/exploration mode. You are an expert storyteller. You MUST ALWAYS reply in Spanish. DO NOT translate proper nouns (names, places, etc.).

**Your Priorities & Directives:**
1.  **Primary Task: Contextual Narrative.** Your main goal is to be a descriptive and engaging storyteller. You have been given all the context for the current location. Use this to react to the player's choices, portray non-player characters (NPCs), and create an immersive experience. Your job is ONLY to narrate. Do not make decisions about game state like starting combat.
2.  **Companion AI Interaction:** The player's party includes AI-controlled companions (identified by \`controlledBy: "AI"\`). After the player acts, you MUST determine if each AI companion would react. To do this, call the \`companionExpertTool\`. For the 'character' parameter of the tool, use the full character object from the 'party' array in your context.
3.  **Interaction Directive:** When the player wants to interact with something in the current location (e.g., "leo el tablón de anuncios", "hablo con Linene", "miro las rocas blancas"), you MUST use the 'locationContext' you already have. Find the interactable object or entity in the context and refer to its 'interactionResults' or 'description' fields to describe the outcome. DO NOT use the \`adventureLookupTool\` for this.
4.  **Movement Directive:** When the player wants to move to a new place (e.g., "voy a la Colina del Resentimiento"), you MUST set the \`nextLocationId\` field in your response to the ID of the new location. Use the \`adventureLookupTool\` to get the data for the destination, and narrate the journey and the arrival at the new location based on its 'description' from the tool's response.
5.  **Question Answering Directive:** If the player asks about a location, person, or thing that is NOT in the current scene (e.g., "¿Quién es Cryovain?"), you MUST use the \`adventureLookupTool\` to find that information and use it to formulate your answer.
6.  **Tense Situations**: If enemies are present but haven't attacked, describe the tense situation and ask the player what they do. DO NOT initiate combat yourself. The central coordinator will handle that.
7.  **Final Narration:** Your final narration should combine the outcome of the player's action, any companion responses, and a prompt for the player's next action (e.g., "¿Qué haces?").

**Rules:**
-   ALWAYS return a valid JSON object matching the output schema.
-   Do not decide to start combat. The game coordinator will handle that. Describe the scene, and if it's hostile, the player's action will determine the next step.

**CONTEXT:**
- You are currently at location ID: \`{{{locationId}}}\`.
- Here is all the information about your current location: \`\`\`json
{{{locationContext}}}
\`\`\`
- The player's party (including the player character, identified by \`controlledBy: "Player"\`) is: {{{json party}}}
- This is the recent conversation history: \`\`\`{{{conversationHistory}}}\`\`\`

**PLAYER'S ACTION:**
"{{{playerAction}}}"

Based on all directives, use the provided context and tools to narrate what happens next.
`,
});

export const narrativeExpertFlow = ai.defineFlow(
  {
    name: 'narrativeExpertFlow',
    inputSchema: NarrativeExpertInputSchema,
    outputSchema: NarrativeExpertOutputSchema,
  },
  async (input) => {
    const { log = () => {} } = input;
    const debugLogs: string[] = [];
    const localLog = (message: string) => {
        log(message);
        debugLogs.push(message);
    };

    try {
        localLog("NarrativeExpert: Generating narration based on player action and context...");
                
        const {output, usage} = await narrativeExpertPrompt(input);
        
        if (usage?.toolCalls?.length) {
            usage.toolCalls.forEach(call => {
                localLog(`NarrativeExpert: Called tool '${call.tool}...'`);
            });
        }
        
        if (!output) {
            localLog("NarrativeExpert: AI returned null output. This could be due to safety filters or an internal model error. Retrying once...");
            // Retry logic
            const { output: retryOutput, usage: retryUsage } = await narrativeExpertPrompt(input);
            if (retryUsage?.toolCalls?.length) {
                retryUsage.toolCalls.forEach(call => {
                    localLog(`NarrativeExpert (Retry): Called tool '${call.tool}...'`);
                });
            }
            if (!retryOutput) {
                localLog("NarrativeExpert: AI returned null output on second attempt. Failing.");
                throw new Error("The AI failed to return a valid output after a retry. It might have been blocked by safety filters.");
            }
             const finalOutput = { ...retryOutput, debugLogs };
            localLog("NarrativeExpert: Successfully generated narration object on retry.");
            return finalOutput;
        }
        
        // Final validation for location ID before returning
        if (output.nextLocationId) {
            const adventureData = await getAdventureData();
            const locationExists = (adventureData.locations || []).some((loc: any) => loc.id === output.nextLocationId);
            if (!locationExists) {
                localLog(`NarrativeExpert: WARNING - AI returned a non-existent nextLocationId: '${output.nextLocationId}'. Discarding it.`);
                output.nextLocationId = null;
            }
        }

        if (output.updatedCharacterStats) {
            try {
                JSON.parse(output.updatedCharacterStats);
            } catch (e) {
                localLog(`NarrativeExpert: WARNING - AI returned invalid JSON for updatedCharacterStats. Discarding. Error: ${e}`);
                output.updatedCharacterStats = null;
            }
        }
        
        const finalOutput = { ...output, debugLogs };
        localLog("NarrativeExpert: Successfully generated narration object.");
        return finalOutput;

    } catch(e: any) {
        localLog(`NarrativeExpert: CRITICAL - Flow failed. Error: ${e.message}`);
        console.error("Critical error in narrativeExpertFlow.", e);
        // This specific error message will be caught by the action and shown in the UI.
        throw new Error(`narrativeExpertFlow failed: ${e.message || 'Unknown error'}`);
    }
  }
);

export async function narrativeExpert(input: NarrativeExpertInput): Promise<NarrativeExpertOutput> {
    return narrativeExpertFlow(input);
}
