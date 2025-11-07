
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
  tools: [dndApiLookupTool, adventureLookupTool],
  config: {
    safetySettings: [
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ],
  },
  prompt: `You are an AI Dungeon Master for a D&D 5e game in narrative/exploration mode. You are an expert storyteller. You MUST ALWAYS reply in Spanish from Spain. DO NOT translate proper nouns (names, places, etc.).

**Your ONLY Task: Narrate the Scene**
Your one and only job is to be a descriptive and engaging storyteller. Based on the context provided, narrate the outcome of the player's action. Your narration goes in the \`dmNarration\` field.

**Directives:**
- **Describe the World:** React to the player's choices, portray non-player characters (NPCs), and describe the environment based on the provided context.
- **Use Your Tools:** If you need information about something (a monster, a spell, an item, another location), use the provided tools like \`adventureLookupTool\` or \`dndApiLookupTool\`.
- **Be a Referee:** If the player's action requires a skill check (e.g., trying to persuade someone, investigating a clue), describe it in the narration. For example: "Para convencer al guardia, necesitarás hacer una tirada de Persuasión."

**CRITICAL RULES:**
-   ALWAYS return a valid JSON object matching the output schema.
-   Your entire story narration goes into the \`dmNarration\` field.
-   **DO NOT** generate actions, dialogue, or thoughts for any AI-controlled companions. Another part of the system handles that.
-   **DO NOT** decide if the party moves to a new location. Another part of the system handles that. Just narrate the current scene based on the context you are given.
-   **DO NOT** initiate combat. Just describe the tense situation if enemies are present.

**CONTEXT:**
- You are at location: \`{{{locationId}}}\`.
- Information about this location: \`\`\`json
{{{locationContext}}}
\`\`\`
- The player's party: 
  {{#each partySummary}}
  - {{this.name}} ({{this.class}} {{this.race}})
  {{/each}}
- Recent conversation: \`\`\`{{{conversationHistory}}}\`\`\`

**PLAYER'S ACTION:**
"{{{playerAction}}}"

Based on all directives, narrate what happens next.
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
