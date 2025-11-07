
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
import { NarrativeExpertInputSchema, NarrativeExpertOutputSchema, type NarrativeExpertInput, type NarrativeExpertOutput } from './schemas';


const narrativeExpertPrompt = ai.definePrompt({
  name: 'narrativeExpertPrompt',
  input: {schema: NarrativeExpertInputSchema},
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

**Your ONLY Task: Narrate the Scene based on a Specific Action**
Your job is to be a descriptive storyteller based on a PRE-INTERPRETED action. You are the "executor", not the "decider".

**Directives & Information Hierarchy:**
1.  **Trust the Interpreted Action:** You will receive an \`interpretedAction\` object. This is your primary instruction. Your task is to narrate the outcome of THIS specific action.
2.  **Use Local Context as a Guide:** Your primary source of truth is the \`locationContext\` JSON.
    *   If the \`interpretedAction.actionType\` is \`interact\`, find the exact entry in \`locationContext.interactables.interactionResults\` where \`action\` matches \`interpretedAction.targetId\`. The corresponding \`result\` string is NOT a script to be read aloud. It's an **INSTRUCTION** for you. You must narrate the outcome naturally. For example, if the result is "Toblen comparte una historia...", your job is to invent and narrate that story as Toblen would.
    *   If the \`interpretedAction.actionType\` is \`move\`, narrate the arrival at the new location using its \`description\`.
    *   If the \`interpretedAction.actionType\` is \`narrate\`, describe the general scene or the minor action the player is taking.
3.  **Use Tools for External Knowledge:** Only if the player's original text (\`playerAction\`) contains a question about something NOT in the local context (like asking a barman about a dragon), should you use \`adventureLookupTool\` to find that information and weave it into your narration.
4.  **Be a Referee:** If an action requires a skill check, state it in the narration (e.g., "Para convencer al guardia, necesitarás hacer una tirada de Persuasión.").

**CRITICAL RULES:**
-   ALWAYS return a valid JSON object matching the output schema.
-   Your entire story narration goes into the \`dmNarration\` field.
-   **DO NOT** generate actions or dialogue for AI-controlled companions. Another system handles that.
-   **DO NOT** initiate combat. Just describe tense situations.

**CONTEXT:**
- You are at location: \`{{{locationId}}}\`.
- **Primary Information Source (Local Context):** \`\`\`json
{{{locationContext}}}
\`\`\`
- The player's party: 
  {{#each partySummary}}
  - {{this.name}} ({{this.class}} {{this.race}})
  {{/each}}
- Recent conversation: \`\`\`{{{conversationHistory}}}\`\`\`
- **Player's raw action:** "{{{playerAction}}}"
- **YOUR SPECIFIC INSTRUCTION (Interpreted Action):** \`\`\`json
{{{interpretedAction}}}
\`\`\`

Based on your specific instruction and the context, narrate what happens next. If it is an interaction, interpret the 'result' field as an instruction and narrate the scene naturally.
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
