
'use server';
/**
 * @fileOverview NarrativeManager - The Orchestrator of the "Soft Mode".
 * Replaces the old NarrativeExpert.
 * 
 * Responsibilities:
 * 1. Analyze player intent (Exploration vs Interaction vs Hybrid).
 * 2. Route to appropriate experts (ExplorationExpert, InteractionExpert).
 * 3. Synthesize responses for hybrid actions.
 * 4. Handle Combat Initiation (legacy/special mode).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { dndApiLookupTool } from '../tools/dnd-api-lookup';
import { adventureLookupTool } from '../tools/adventure-lookup';
import { characterLookupTool } from '../tools/character-lookup';
import { executePromptWithRetry } from './retry-utils';
import {
    NarrativeExpertInputSchema,
    NarrativeExpertOutputSchema,
    type NarrativeExpertInput,
    type NarrativeExpertOutput
} from './schemas';
import { explorationExpert } from './experts/exploration-expert';
import { interactionExpert } from './experts/interaction-expert';
import { log } from '@/lib/logger';

// --- Internal Schemas ---

const RouterOutputSchema = z.object({
    classification: z.enum(['EXPLORATION', 'INTERACTION', 'HYBRID']).describe("The classification of the player's action."),
    reasoning: z.string().describe("Brief reasoning for the classification."),
});

const SynthesizerInputSchema = z.object({
    explorationText: z.string().optional(),
    interactionText: z.string().optional(),
    originalAction: z.string(),
});

const SynthesizerOutputSchema = z.object({
    finalNarration: z.string().describe("The combined, fluid narration merging both exploration and interaction elements."),
});

// --- Prompts ---

// 1. Router Prompt: Decides which expert(s) to call
const narrativeRouterPrompt = ai.definePrompt({
    name: 'narrativeRouterPrompt',
    input: {
        schema: z.object({
            playerAction: z.string(),
            interpretedAction: z.string(),
            conversationHistory: z.string().optional()
        })
    },
    output: { schema: RouterOutputSchema },
    // Nota: No se establece generationConfig aquí porque el endpoint rechaza ese campo.
    prompt: `Analyze the player's action and classify it into one of three categories:

1. **EXPLORATION**: The player is moving, looking, searching, or interacting with inanimate objects/environment. (e.g., "I look at the wall", "I go north", "I search the chest").
2. **INTERACTION**: The player is speaking to or interacting socially with an NPC or intelligent being. (e.g., "I say hello", "I ask the guard for directions").
3. **HYBRID**: The player is doing BOTH simultaneously. (e.g., "I walk towards the door AND ask the guard why he's nervous", "I draw my sword and shout at the goblin").

**CRITICAL - CONTEXT AWARENESS:**
- Use the **Conversation History** to determine the context.
- If the last message in the history was an NPC asking a question or speaking to the player, and the player's action is a response (even without "I say"), classify as **INTERACTION**.
- Example: NPC: "Who are you?" -> Player: "I am Galador" -> **INTERACTION** (not Exploration).

**Input:**
- Action: "{{playerAction}}"
- Interpreted: {{interpretedAction}}
- History:
\`\`\`
{{conversationHistory}}
\`\`\`

**Output:**
Return the classification and reasoning.
`,
});

// 2. Synthesizer Prompt: Merges outputs from both experts
const narrativeSynthesizerPrompt = ai.definePrompt({
    name: 'narrativeSynthesizerPrompt',
    input: { schema: SynthesizerInputSchema },
    output: { schema: SynthesizerOutputSchema },
    prompt: `You are a Master Storyteller. Your task is to combine two separate narrative threads into a single, fluid paragraph.

**Inputs:**
1. **Exploration/Action:** "{{explorationText}}"
2. **Dialogue/Social:** "{{interactionText}}"
3. **Original Player Action:** "{{originalAction}}"

**Goal:**
Write a cohesive response in Spanish (Spain) that weaves these two elements together naturally. Do not just paste them one after another. Make it flow.

**Example:**
- Exp: "You walk to the bar."
- Int: "The barman asks what you want."
- **Result:** "Te acercas a la barra, donde la madera cruje bajo tus botas. Antes de que puedas acomodarte, el tabernero levanta la vista y te pregunta: '¿Qué te pongo?'"
`,
});

// 3. Combat Initiation Prompt (Preserved from legacy NarrativeExpert)
const combatInitiationPrompt = ai.definePrompt({
    name: 'combatInitiationPrompt',
    input: { schema: NarrativeExpertInputSchema },
    output: { schema: NarrativeExpertOutputSchema },
    tools: [dndApiLookupTool, adventureLookupTool, characterLookupTool],
    prompt: `You are a Master Storyteller DM expert in D&D 5e. Your task is to narrate the START of combat.
    
**Combat Initiation Guidelines:**
1. **Describe the tension:** Use the location description to set the scene.
2. **Use conversation history:** Consider the recent conversation context ({{{conversationHistory}}}) to make the combat initiation narratively coherent with what just happened. Reference recent events, dialogue, or actions that led to this combat if relevant.
3. **Identify Enemies:** Describe the enemies naturally and immersively.
   - Extract the base enemy type from differentiated names (remove numbers: "Goblin 1" → "Goblin")
   - You can group enemies of the same type naturally: "dos goblins" instead of "Goblin 1 y Goblin 2"
   - You can be descriptive and immersive: "dos goblins pequeños" or "un enorme orco"
   - Use the EXACT base type from the names (if you see "Goblin", use "goblin" in Spanish, NOT "gnomo")
4. **SURPRISE RULES (CRITICAL):**
   - Check the combatContext.surpriseSide field:
     * If surpriseSide is null or undefined: NO SURPRISE - This is a normal combat encounter. Both sides are aware of each other. DO NOT describe ambushes, surprise attacks, or unexpected encounters. Describe it as a normal confrontation where both sides are ready.
     * If surpriseSide is "enemy": ENEMIES SURPRISE PLAYERS - The enemies have ambushed/surprised the players. Describe the surprise/ambush naturally (e.g., "saltan de las sombras", "os emboscan", "os toman por sorpresa").
     * If surpriseSide is "player": PLAYERS SURPRISE ENEMIES - The players have surprised the enemies. Describe how the players catch the enemies off guard.
   - IMPORTANT: Only mention surprise/ambush if surpriseSide is NOT null/undefined. If there's no surprise, describe a normal combat encounter where both sides are aware and ready.
5. **Initiative:** Mention who acts first based on the initiative order.
6. **NO attacks/damage:** Combat hasn't started yet (no actions taken).
7. **Use Combat Context:** \`\`\`{{{combatContext}}}\`\`\`

**CRITICAL - ENEMY TYPES:**
- Use the EXACT base type. If the data says "Goblin", use "Goblin" or "Goblins" (do NOT translate to "Trasgo"). If it says "Orc", use "Orco".
- Do NOT translate specific monster names (e.g., Bugbear, Hobgoblin) unless you are certain of the established Spanish term and it is NOT "Trasgo" for Goblin. When in doubt, use the English term found in the context.
- Be immersive and descriptive while maintaining accuracy about enemy types
- Example: If combatContext shows "Goblin 1", "Goblin 2", "Orco 1" → narrate as "dos goblins y un orco" (not "Goblin 1, Goblin 2 y Orco 1")

Narrate the scene in Spanish (Spain).
`,
});

// --- Flow ---

export const narrativeManagerFlow = ai.defineFlow(
    {
        name: 'narrativeManagerFlow', // Keeping the name 'narrativeExpertFlow' might be safer for external callers? No, let's use the new name but export as 'narrativeExpert' for compatibility.
        inputSchema: NarrativeExpertInputSchema,
        outputSchema: NarrativeExpertOutputSchema,
    },
    async (input) => {
        const debugLogs: string[] = [];
        const localLog = (msg: string) => debugLogs.push(msg);

        try {
            localLog("NarrativeManager: Received input.");

            // 1. Handle Combat Initiation (Special Mode)
            if (input.phase === 'combat_initiation') {
                localLog("NarrativeManager: Mode = COMBAT INITIATION");
                const response = await executePromptWithRetry(
                    combatInitiationPrompt,
                    input,
                    { flowName: 'combatInitiation' }
                );
                return { ...response.output!, debugLogs };
            }

            // 2. Routing (Normal Mode)
            localLog("NarrativeManager: Routing action...");
            let classification: 'EXPLORATION' | 'INTERACTION' | 'HYBRID' = 'EXPLORATION';
            // Heurística rápida: si la interpretación es claramente exploración (move/interact con objeto) y no hay señal social, saltar router
            const interpreted = (input.interpretedAction || '').toLowerCase();
            const isObviousExploration = interpreted.includes('"actiontype":"move"') ||
                interpreted.includes('"actiontype":"interact"');
            const looksSocial = interpreted.includes('npc') || interpreted.includes('say') || interpreted.includes('hablar') || interpreted.includes('decir');

            if (isObviousExploration && !looksSocial) {
                localLog('NarrativeManager: Skipping router (obvious exploration).');
                classification = 'EXPLORATION';
            } else {
                const routerResponse = await executePromptWithRetry(
                    narrativeRouterPrompt,
                    {
                        playerAction: input.playerAction,
                        interpretedAction: input.interpretedAction,
                        conversationHistory: input.conversationHistory
                    },
                    { flowName: 'narrativeRouter' }
                );
                classification = routerResponse.output?.classification || 'EXPLORATION'; // Default to exploration
                localLog(`NarrativeManager: Classification = ${classification}`);
            }

            let finalNarration = "";
            let updatedStats = null; // Placeholder for future use

            // 3. Execution
            if (classification === 'EXPLORATION') {
                const expResult = await explorationExpert({
                    playerAction: input.playerAction,
                    locationId: input.locationId,
                    locationContext: input.locationContext,
                    interpretedAction: input.interpretedAction,
                    deadEntities: input.deadEntities,
                    isKeyMoment: (input as any).isKeyMoment,
                    systemFeedback: input.systemFeedback,
                    explorationContext: input.explorationContext, // Pass exploration context
                });
                finalNarration = expResult.explorationNarration;
                // updatedStats = expResult.updatedStats || null; // Feature not yet implemented in experts
                if (expResult.debugLogs) debugLogs.push(...expResult.debugLogs);

            } else if (classification === 'INTERACTION') {
                const intResult = await interactionExpert({
                    playerAction: input.playerAction,
                    npcContext: input.locationContext, // In interaction mode, location context serves as NPC context
                    conversationHistory: input.conversationHistory || "",
                    interpretedAction: input.interpretedAction,
                    isKeyMoment: (input as any).isKeyMoment,
                    // Interaction expert doesn't strictly need systemFeedback for movement, but good for consistency if we add it later
                } as any); // Cast to any to bypass strict type check for now
                finalNarration = intResult.npcResponse;
                // updatedStats = intResult.updatedStats || null; // Feature not yet implemented in experts
                if (intResult.attitudeChange) localLog(`Attitude Change: ${intResult.attitudeChange}`);
                if (intResult.debugLogs) debugLogs.push(...intResult.debugLogs);

            } else { // HYBRID
                localLog("NarrativeManager: Executing Hybrid Mode (Parallel Calls)");
                const [expResult, intResult] = await Promise.all([
                    explorationExpert({
                        playerAction: input.playerAction,
                        locationId: input.locationId,
                        locationContext: input.locationContext,
                        interpretedAction: input.interpretedAction,
                        deadEntities: input.deadEntities,
                        isKeyMoment: (input as any).isKeyMoment,
                        systemFeedback: input.systemFeedback,
                        explorationContext: input.explorationContext, // Pass exploration context
                    }),
                    interactionExpert({
                        playerAction: input.playerAction,
                        npcContext: input.locationContext,
                        conversationHistory: input.conversationHistory || "",
                        interpretedAction: input.interpretedAction,
                        isKeyMoment: (input as any).isKeyMoment,
                    } as any) // Cast to any to bypass strict type check for now
                ]);

                if (expResult.debugLogs) debugLogs.push(...expResult.debugLogs);
                if (intResult.debugLogs) debugLogs.push(...intResult.debugLogs);

                // Synthesize
                localLog("NarrativeManager: Synthesizing results...");
                const synthesis = await executePromptWithRetry(
                    narrativeSynthesizerPrompt,
                    {
                        explorationText: expResult.explorationNarration,
                        interactionText: intResult.npcResponse,
                        originalAction: input.playerAction
                    },
                    { flowName: 'narrativeSynthesizer' }
                );
                finalNarration = synthesis.output?.finalNarration || `${expResult.explorationNarration}\n\n${intResult.npcResponse}`;
            }

            return {
                dmNarration: finalNarration,
                updatedCharacterStats: updatedStats,
                debugLogs
            };

        } catch (e: any) {
            localLog(`NarrativeManager: Flow failed. Error: ${e.message}`);
            log.error("NarrativeManager failed", { module: 'NarrativeManager' }, e);
            throw e;
        }
    }
);

// Export as 'narrativeExpert' to maintain compatibility with GameCoordinator
export async function narrativeExpert(input: NarrativeExpertInput): Promise<NarrativeExpertOutput> {
    return narrativeManagerFlow(input);
}
