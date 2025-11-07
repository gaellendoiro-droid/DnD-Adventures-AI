
'use server';
/**
 * @fileOverview This file contains the Genkit flow for the NarrativeExpert, which handles the narrative/exploration mode of the game.
 *
 * - narrativeExpert - a function that takes player input and returns the AI's response to drive the story.
 * - NarrativeExpertInput - The input type for the narrativeExpert function.
 * - NarrativeExpertOutput - The return type for the narrativeExpert function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { dndApiLookupTool } from '../tools/dnd-api-lookup';
import { adventureLookupTool } from '../tools/adventure-lookup';
import { CharacterSummarySchema } from '@/lib/schemas';
import { getAdventureData } from '@/app/game-state-actions';
import { companionExpertTool } from '../tools/companion-expert';

const NarrativeExpertInputSchema = z.object({
  playerAction: z.string().describe('The action taken by the player.'),
  partySummary: z.array(CharacterSummarySchema).describe("A lightweight summary of the player's party. This is for prompt context."),
  locationId: z.string().describe('The ID of the current location (e.g., "phandalin-plaza-del-pueblo").'),
  locationContext: z.string().describe('A JSON string with the full data of the current location, including its description, exits, and interactable objects.'),
  conversationHistory: z.string().optional().describe("A transcript of the last few turns of conversation to provide immediate context."),
  log: z.function(z.tuple([z.string()]), z.void()).optional().describe("A function to log debug messages in real-time."),
});
export type NarrativeExpertInput = z.infer<typeof NarrativeExpertInputSchema>;

const NarrativeExpertOutputSchema = z.object({
  dmNarration: z.string().describe("The AI Dungeon Master's primary narration in response to the player's action, formatted in Markdown. This should describe the world and outcomes. Do NOT include companion dialogue here."),
  companionActions: z.array(z.object({
    characterId: z.string().describe("The ID of the companion acting."),
    action: z.string().describe("The dialogue or action of the companion.")
  })).optional().describe("An array of actions or dialogues for AI companions. This should be a separate field from the main narration."),
  nextLocationId: z.string().optional().nullable().describe("The ID of the new location, if the player moved. Must be a valid ID from the adventure's 'locations' data."),
  updatedCharacterStats: z.string().optional().nullable().describe("The updated character stats (e.g., HP, XP, status effects), if any, for the PLAYER character only, as a valid JSON string. For example: '{\"hp\":{\"current\":8,\"max\":12}, \"inventory\": [{\"id\":\"item-gp-1\",\"name\":\"Monedas de Oro\",\"quantity\":10}]}'. Must be a valid JSON string or null."),
  debugLogs: z.array(z.string()).optional(),
});
export type NarrativeExpertOutput = z.infer<typeof NarrativeExpertOutputSchema>;

const narrativeExpertPrompt = ai.definePrompt({
  name: 'narrativeExpertPrompt',
  input: {schema: z.object({
    playerAction: z.string(),
    partySummary: z.array(CharacterSummarySchema),
    locationId: z.string(),
    locationContext: z.string(),
    conversationHistory: z.string().optional(),
  })},
  output: {schema: NarrativeExpertOutputSchema},
  tools: [dndApiLookupTool, adventureLookupTool, companionExpertTool],
  config: { // Add safety settings to be less restrictive
    safetySettings: [
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
    ],
  },
  prompt: `You are an AI Dungeon Master for a D&D 5e game in narrative/exploration mode. You are an expert storyteller. You MUST ALWAYS reply in Spanish from Spain. DO NOT translate proper nouns (names, places, etc.).

**Your Priorities & Directives:**
1.  **Primary Task: Narrate the World:** Your main goal is to be a descriptive and engaging storyteller. React to the player's choices, portray non-player characters (NPCs), and describe the environment. Your narration goes in the \`dmNarration\` field.
2.  **Companion Actions:** After narrating, consider if any AI companions would react. If a companion would say or do something, you MUST use the \`companionExpertTool\` for EACH companion that acts. Do not invent companion actions yourself.
3.  **Interaction Directive:** When the player interacts with something in the current location (e.g., "leo el tablón de anuncios", "hablo con Linene"), you MUST use the 'locationContext' you already have. Find the object/entity and use its 'interactionResults' or 'description' to formulate your \`dmNarration\`.
4.  **Movement Directive:** When the player wants to move (e.g., "voy a la Colina del Resentimiento"), use the \`adventureLookupTool\` to get the destination data. Narrate the journey and arrival in \`dmNarration\`, and set the \`nextLocationId\` field in your response.
5.  **Question Answering:** If the player asks about something NOT in the current scene (e.g., "¿Quién es Cryovain?"), use the \`adventureLookupTool\` to find that info and use it for your \`dmNarration\`.
6.  **Tense Situations**: If enemies are present but haven't attacked, describe the tense situation. DO NOT initiate combat yourself. The game coordinator handles combat initiation.

**Rules:**
-   ALWAYS return a valid JSON object matching the output schema.
-   Your primary narration goes into \`dmNarration\`.
-   Use the \`companionExpertTool\` to generate actions for AI companions; do not write their dialogue or actions directly into the \`dmNarration\`.

**CONTEXT:**
- You are currently at location ID: \`{{{locationId}}}\`.
- Here is all the information about your current location: \`\`\`json
{{{locationContext}}}
\`\`\`
- The player's party is: 
  {{#each partySummary}}
  - {{this.name}} ({{this.class}} {{this.race}}, ID: {{this.id}}), controlado por {{this.controlledBy}}. Personalidad: {{this.personality}}
  {{/each}}
- This is the recent conversation history: \`\`\`{{{conversationHistory}}}\`\`\`

**PLAYER'S ACTION:**
"{{{playerAction}}}"

Based on all directives, narrate what happens next and call tools for companion actions if necessary.
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
                
        const llmResponse = await narrativeExpertPrompt(input);
        
        if (llmResponse.usage?.toolCalls?.length) {
            llmResponse.usage.toolCalls.forEach(call => {
                localLog(`NarrativeExpert: Called tool '${call.tool}...'`);
            });
        }
        
        const output = llmResponse.output;

        if (!output) {
            localLog("NarrativeExpert: AI returned null output. This could be due to safety filters or an internal model error.");
            throw new Error("The AI failed to return a valid output. It might have been blocked by safety filters or an internal error.");
        }

        const companionActions: { characterId: string; action: string }[] = [];
        if (llmResponse.usage.toolCalls) {
            for (const toolCall of llmResponse.usage.toolCalls) {
                if (toolCall.tool.endsWith('/companionExpertTool')) {
                    const toolOutput = toolCall.output as { action?: string };
                    const toolInput = toolCall.input as { characterSummary: { id: string } };
                    if (toolOutput?.action) {
                        companionActions.push({
                            characterId: toolInput.characterSummary.id,
                            action: toolOutput.action,
                        });
                    }
                }
            }
        }

        output.companionActions = companionActions;
        
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

    