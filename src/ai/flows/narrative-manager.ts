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
import { z } from 'genkit';
import { dndApiLookupTool } from '../tools/dnd-api-lookup';
import { adventureLookupTool } from '../tools/adventure-lookup';
import { characterLookupTool } from '../tools/character-lookup';
import { consultRulebookTool } from '../tools/consult-rulebook';
import { lookupEntityStatsTool } from '../tools/lookup-entity-stats';
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
import { repairPunctuationSpacing } from '@/lib/utils/text-cleaner';

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
export const narrativeRouterPrompt = ai.definePrompt({
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

**CRITICAL - ENVIRONMENT QUESTIONS (OOC):**
- If the player's action asks for the status, location, or contents of inanimate objects, containers (chests, altars, locked doors), or room characteristics (even if it's an OOC question directed at the Dungeon Master starting with '//', e.g., "//Que hay en el cofre ahora?", "//Donde esta la llave?"), you MUST classify it as **EXPLORATION** (or **HYBRID** if it also targets an NPC). Never classify it as pure **INTERACTION**.

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
export const narrativeSynthesizerPrompt = ai.definePrompt({
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

// 2.2. Narrative Director Prompt: Central DM and Scene Director (Model Jerárquico)
export const narrativeDirectorPrompt = ai.definePrompt({
    name: 'narrativeDirectorPrompt',
    input: {
        schema: z.object({
            playerAction: z.string(),
            explorationText: z.string().optional(),
            interactionText: z.string().optional(),
            conversationHistory: z.string().optional(),
            adventureLore: z.string().optional(),
            systemFeedback: z.string().optional(),
            activeEffects: z.array(z.string()).optional(),
            skillCheckResult: z.any().optional(),
            party: z.array(z.any()).optional(),
            eventsLog: z.string().optional(),
        })
    },
    output: {
        schema: z.object({
            finalNarration: z.string().describe("La narración final unificada del Dungeon Master en español de España.")
        })
    },
    prompt: `You are the central Dungeon Master (DM) and Scene Director for a D&D 5e adventure.
You MUST ALWAYS speak and narrate in Spanish from Spain (Castellano culto, natural, literario y evocador).

**CONCORDANCIA DE GÉNERO EN ESPAÑOL (CRÍTICO):**
- Debes respetar estrictamente el género gramatical correcto de cada personaje al narrar.
- Analiza la propiedad \`sex\` ("Varón" o "Mujer") de cada personaje dentro del JSON de la \`party\` para utilizar la concordancia gramatical correcta en español de España al referirte a ellos (ej: "Varón" -> masculino, "Mujer" -> femenino).
- Si la propiedad \`sex\` de un personaje es "Varón" (como Merryl o Galador), utiliza adjetivos, sustantivos y pronombres masculinos (ej: "el mago Merryl", "silencioso", "preparado", "herido"). Si es "Mujer" (como Elara), utiliza concordancia femenina. Presta especial atención a Merryl para evitar tratarlo en femenino.

Your main responsibility is to act as the central orchestrator of the scene. You must synthesize the specialized inputs (environment descriptions and NPC dialogue) and guide the storyline.

**CRITICAL ROLE: STORYLINE INTERRUPTION AND EVENT DIRECTING (GENERIC)**
1. Read and analyze the "storyline" array in the \`adventureLore\` JSON. It contains a list of scripted storyline milestones/events for this adventure. Each event has an "eventName", "triggerCondition", "description" (in Spanish), and "consequences".
2. Read the \`conversationHistory\` to deduce which storyline events have already occurred. Identify the next uncompleted event in the list.
3. Compare the player's current action (\`playerAction\`), the context, and the history with the "triggerCondition" of the next uncompleted event.
4. **Triggering Events**:
   - If the player's action meets the "triggerCondition" (or if the player attempts to bypass this event by traveling/moving to a future location before resolving it), **YOU MUST TRIGGER AND EXECUTE THIS EVENT IMMEDIATELY**.
   - Use the event's "description" and "consequences" to narrate the scene. Describe how the event interrupts, blocks, or alters the player's intended action (e.g., a hostile group appearing to block travel, an NPC calling out, or an environmental event occurring).
   - **Do NOT trigger events out of order or too early**. For example, if a trigger condition requires a certain conversation to start or an item to be used, do NOT trigger the event until that condition is fully met.

**RULES OF NARRATIVE INTEGRITY & SECRECY (CRITICAL)**
0. **HECHOS MECÁNICOS DEL SISTEMA (CRÍTICO):** Si se provee un listado en \`eventsLog\`, debes incorporar obligatoriamente todos los hechos descritos en él en tu narración. Estos hechos son la única verdad matemática y mecánica de lo que ha sucedido (ej: si se abrió una puerta, si alguien sufrió daño, o si se falló una tirada). Viste estos hechos con tu prosa inmersiva.
1. **PREVALENCIA DE LOS EXPERTOS (REGLA DE ORO):** Respeta estrictamente la información y descripciones generadas por los expertos especializados (\`explorationText\` e \`interactionText\`). Si los expertos ocultan información en sus fragmentos, no la reveles en tu síntesis final.
2. **DISTINCIÓN ENTRE IDENTIFICACIÓN Y ACTIVACIÓN:** Si la tirada reciente en \`skillCheckResult\` fue un éxito para identificar, examinar o descifrar un objeto o pergamino mágico, describe que los personajes comprenden qué es y qué contiene. **BAJO NÍNGUN CONCEPTO** narres que el objeto se activa, que se lanza el hechizo, que se consume el objeto, o que sus efectos mágicos entran en vigor de forma automática en este turno. El objeto permanece latente e inactivo hasta que el jugador decida usarlo o activarlo explícitamente en una acción posterior.
3. **BARRERAS DE COMUNICACIÓN Y ANIMALES:** Si un NPC es un animal/bestia y el effect "speak_with_animals" NO figura activo en \`activeEffects\`, no permitas que hable o se exprese verbalmente en Común en tu narración. Debe limitarse a los balidos, gruñidos o gestos corporales descritos por el experto. Si el efecto mágico está activo en \`activeEffects\`, puede hablar Común libremente.
4. **RESTRICCIÓN ABSOLUTA ANTE FALLO:** Si el resultado en \`skillCheckResult\` indica un fallo (\`isSuccess: false\`), no reveles secretos, trasfondos ocultos, identidades reales ni nombres específicos de objetos de la aventura. Descríbelos de forma vaga y genérica (ej. "un pergamino antiguo cubierto de runas indescifrables" en lugar de "un Pergamino de Hablar con los Animales").
5. **PREVENCIÓN DE SPOILERS DE IDENTIDAD:** No utilices los nombres propios o identidades de NPCs que figuren en los datos de la aventura si el NPC no se ha presentado formalmente en el chat de juego de rol. En su lugar, utiliza descriptores físicos genéricos (ej: "el semiorco", "la oveja", "el encapuchado").
6. **CONSISTENCIA EN CONTENEDORES, SAQUEO SELECTIVO E INVENTARIOS (CRÍTICO):** Al narrar el saqueo, la posesión o interactuar con contenedores (cofres, alijos, baúles) u objetos físicos, debes guiarte estrictamente por el estado físico lógico proporcionado en el \`Location Context\` y por los inventarios del grupo en \`party\`.
   - **REGLA DE EXCLUSIÓN ABSOLUTA DE POSESIONES**: Si un ítem (ej: "Llave del Calabozo", "Poción de Curación", llaves, pociones, espadas) figura en el inventario (\`inventory\`) de cualquier personaje de la \`party\` en el input estructurado, **está TERMINANTEMENTE PROHIBIDO** narrar, insinuar o describir que dicho objeto sigue en el cofre, en el suelo, o en el entorno de la sala. Si la descripción literaria de la localización o el historial conversacional anterior afirman que el objeto sigue en el cofre, debes ignorarlos y corregir la narración de forma coherente reflejando la realidad lógicamente actualizada (el objeto está con su poseedor y el contenedor ya no lo contiene).
   - Si el jugador ha realizado un saqueo selectivo (ej: coger solo la llave), el contenedor NO está vacío. Debes narrar explícitamente que los demás objetos (como pociones u otros ítems listados en su JSON) siguen en su interior.
   - NUNCA declares que un contenedor está vacío si el JSON del contexto indica que aún tiene objetos.
7. **REGLA DE ORO: FIDELIDAD LÓGICA Y LIBERTAD SENSORIAL (CRÍTICO):**
   Debes mantener una prosa inmersiva, literaria y evocadora en español de España, pero respetando estrictamente la causalidad lógica del juego:
   - **LIBERTAD SENSORIAL Y EMOCIONAL (PERMITIDO):** Tienes total libertad para enriquecer la escena con detalles sensoriales (el clima, sonidos, olores) y reacciones corporales/emocionales de los NPCs o personajes (nerviosismo, curiosidad, cautela) para mantener la frescura narrativa.
   - **FIDELIDAD DE ESTADO Y ACTIVACIÓN (PROHIBIDO):** Bajo ningún concepto inventes cambios en el estado lógico del juego, activaciones mágicas o consumos de recursos que no se deriven de la acción del jugador. Si la acción no es usar/activar (ej: si solo es coger, recoger, desarmar, desobstruir, dar, recibir, guardar, examinar o soltar), narra el acto físico enriqueciéndolo visualmente, pero mantén el objeto latente e inactivo.
   - **PREVALENCIA ESTRICTA DE EFECTOS ACTIVOS:** Las consecuencias de un efecto mágico, de estado o de comunicación (como comprender idiomas, hablar con bestias, invisibilidad, visión en la oscuridad, etc.) **SOLO** pueden manifestarse en tu narración si el identificador de dicho efecto figura explícitamente activo en el array 'activeEffects' **O** si la acción de este turno es precisamente usar/activar el objeto y el resultado de la tirada ('skillCheckResult') o el feedback del sistema confirman su activación exitosa en este turno. La mera posesión, recogida, intercambio o manipulación física del objeto que concede dicho efecto **NUNCA** activa sus consecuencias mágicas. Si el efecto no está activo ni se activa con éxito en este turno, las barreras del entorno o comunicación siguen plenamente vigentes.
   - **RESPETO AL RITMO DE LA HISTORIA (PROHIBIDO):** No anticipes hitos de la historia ('storyline') ni reacciones del entorno que dependan del uso o activación de un objeto hasta que el jugador decida usarlo o activarlo de forma explícitamente declarada.





**FORMATTING AND NARRATIVE LENGTH (CRITICAL)**
- **Max length**: Keep the DM narration direct, concise, and dynamic. **Never exceed 3 paragraphs, and keep each paragraph short (1-2 sentences)**. The total output must not exceed 4-5 sentences, even for dramatic storyline interruptions or key moments. Avoid long-winded monologues.
- **Paragraph breaks**: Always separate distinct actions or events into separate paragraphs with double line breaks (\n\n). For example:
  * Paragraph 1: Resolution of the player's immediate action/skill check.
  * Paragraph 2: The sudden interruption or environmental occurrence (if triggered).
  * Paragraph 3: The NPC dialogue or verbal reaction.
- **No blocks of text**: Do NOT return a single massive block of text. Make the narration readable and well-spaced. You MUST separate the ambient/resolution narration from NPC dialogues using double line breaks (\n\n).
- **ESPACIADO Y ORTOGRAFÍA (CRÍTICO):** Asegúrate de insertar siempre un espacio en blanco después de cada punto, coma, signo de interrogación o exclamación. NUNCA pegues el texto descriptivo tras un signo de puntuación (ej: "próximos.Un semiorco" es incorrecto; "próximos. Un semiorco" es correcto).
- **DIÁLOGOS EN CURSIVA (CRÍTICO):** Todos los diálogos, frases literales o citas pronunciados por cualquier NPC deben ir en cursiva en Markdown (encerrados en asteriscos simples). Las rayas de diálogo en español (—) y el texto descriptivo circundante (los tags de diálogo como "dijo", "gruñe", etc.) no deben estar en cursiva. Ejemplo: —*¡Ahí está la oveja!* —gruñe el semiorco—.

**SYNTHESIS AND COHESION GUIDELINES (WHEN NO INTERRUPTION OCCURS)**
- Combine \`explorationText\` (physical/sensory descriptions) and \`interactionText\` (NPC dialogue and responses) into a single, cohesive, fluid narrative in third-person Spanish.
- Do NOT just paste them sequentially. Weave them together naturally.
- Use natural Spanish dialogue tags (e.g., "—*No tenemos tiempo que perder* —dijo el mago—.") y asegúrate de que el diálogo literal vaya en cursiva.
- If \`systemFeedback\` is present (e.g. "No puedes ir allí"), integrate the failure into the description (e.g., describing why they cannot go or what physically stops them).

**GENERAL INSTRUCTIONS**
- **DO NOT ROLEPLAY PLAYER COMPANIONS**: Do not generate dialogue or actions for the player's companions (e.g. Elara, Merryl, Galador, etc.). You may only describe their reactions in third-person, but never make them speak.
- **TONO Y IDIOMA**: Use premium, atmospheric Spanish (Spain) terminology. Avoid terms like "trasgo" for Goblins (use "Goblin" or "Goblins" if referred, or follow the text).

**Inputs:**
- **Player Action**: "{{{playerAction}}}"
- **Hechos Mecánicos del Sistema (eventsLog)**:
\`\`\`
{{{eventsLog}}}
\`\`\`
- **Exploration Text (Environment)**: "{{{explorationText}}}"
- **Interaction Text (NPC Dialogue)**: "{{{interactionText}}}"
- **Conversation History**:
\`\`\`
{{{conversationHistory}}}
\`\`\`
- **System Feedback**: "{{{systemFeedback}}}"
- **Active Effects**: {{{activeEffects}}}
{{#if party}}
- **Party (Personajes e Inventarios)**: \`\`\`json
{{{json party}}}
\`\`\`
{{/if}}
- **Adventure Lore**:
\`\`\`json
{{{adventureLore}}}
\`\`\`

**Output Format (CRITICAL):**
Return a raw, valid JSON object matching the output schema. Do NOT wrap the response in markdown code blocks. Do NOT write any thoughts, explanations, or text before or after the JSON. markdown code blocks. Do NOT write any thoughts, explanations, or text before or after the JSON.
`
});


// 3. Combat Initiation Prompt (Preserved from legacy NarrativeExpert)
export const combatInitiationPrompt = ai.definePrompt({
    name: 'combatInitiationPrompt',
    input: { schema: NarrativeExpertInputSchema },
    output: { schema: NarrativeExpertOutputSchema },
    tools: [dndApiLookupTool, adventureLookupTool, characterLookupTool, consultRulebookTool, lookupEntityStatsTool],
    prompt: `You are a Master Storyteller DM expert in D&D 5e. Your task is to narrate the START of combat.

**CONCORDANCIA DE GÉNERO EN ESPAÑOL (CRÍTICO):**
- Debes respetar estrictamente el género gramatical correcto de cada personaje al narrar.
- Analiza la propiedad \`sex\` ("Varón" o "Mujer") de cada personaje dentro del JSON de la \`party\` (o del contexto) para utilizar la concordancia gramatical correcta en español de España al referirte a ellos (ej: "Varón" -> masculino, "Mujer" -> femenino).
- Si la propiedad \`sex\` de un personaje es "Varón" (como Merryl o Galador), utiliza adjetivos, sustantivos y pronombres masculinos (ej: "el mago Merryl", "silencioso", "preparado", "herido"). Si es "Mujer" (como Elara), utiliza concordancia femenina. Presta especial atención a Merryl para evitar tratarlo en femenino.
    
    If you are unsure about a specific combat rule (e.g., Surprise, Initiative for specific monsters), use the 'consultRulebook' tool.
    If you need stats for a monster (e.g. to describe it accurately) use 'lookupEntityStats'.
    
**Combat Initiation Guidelines:**
1. **Describe the tension:** Use the location description to set the scene.
2. **Use conversation history:** Consider the recent conversation context ({{{conversationHistory}}}) to make the combat initiation narratively coherent.
   - CRITICAL: DO NOT repeat, re-describe, or paraphrase the description of the location or the enemies that the DM already narrated in the last message of the conversation history. Assume those details have already happened and have been read.
   - Focus exclusively on the immediate transition to physical combat, the sudden outbreak of aggression, the tension of the moment, and who is ready to act first based on the initiative order.
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
            // Heurística rápida: si la interpretación es claramente exploración (move) y no hay señal social, saltar router
            const interpreted = (input.interpretedAction || '').toLowerCase();
            const isObviousExploration = interpreted.includes('"actiontype":"move"');
            // Removing "interact" from fast-path. Conversations often look like "interact" without "say" keywords.
            // We trust the Router to distinguish "Interact with Chest" (Exploration) vs "Interact with NPC" (Interaction)
            const looksSocial = interpreted.includes('npc') || interpreted.includes('say') || interpreted.includes('hablar') || interpreted.includes('decir');

            const hasCommunicationEffect = interpreted.includes('speak_with_animals') || interpreted.includes('comprehend_languages');
            const hasNPCs = input.explorationContext?.presentEntities && input.explorationContext.presentEntities.length > 0;

            if (hasCommunicationEffect && hasNPCs) {
                localLog("NarrativeManager: Forcing HYBRID classification due to active/activated communication effect and present NPCs.");
                classification = 'HYBRID';
            } else if (isObviousExploration && !looksSocial) {
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

            let explorationText: string | undefined = undefined;
            let interactionText: string | undefined = undefined;

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
                    conversationHistory: input.conversationHistory,
                    explorationContext: input.explorationContext, // Pass exploration context
                    adventureLore: input.adventureLore,
                    activeEffects: input.activeEffects,
                    skillCheckResult: input.skillCheckResult,
                    party: input.party,
                });
                explorationText = expResult.explorationNarration;
                if (expResult.debugLogs) debugLogs.push(...expResult.debugLogs);

            } else if (classification === 'INTERACTION') {
                const resolvedNpcContext = input.explorationContext?.presentEntities && input.explorationContext.presentEntities.length > 0
                    ? JSON.stringify(input.explorationContext.presentEntities)
                    : input.locationContext;

                const intResult = await interactionExpert({
                    playerAction: input.playerAction,
                    npcContext: resolvedNpcContext,
                    conversationHistory: input.conversationHistory || "",
                    interpretedAction: input.interpretedAction,
                    isKeyMoment: (input as any).isKeyMoment,
                    activeEffects: input.activeEffects,
                    adventureLore: input.adventureLore,
                    skillCheckResult: input.skillCheckResult,
                    party: input.party,
                });
                interactionText = intResult.npcResponse;
                if (intResult.attitudeChange) localLog(`Attitude Change: ${intResult.attitudeChange}`);
                if (intResult.debugLogs) debugLogs.push(...intResult.debugLogs);

            } else { // HYBRID
                localLog("NarrativeManager: Executing Hybrid Mode (Parallel Calls)");
                const resolvedNpcContext = input.explorationContext?.presentEntities && input.explorationContext.presentEntities.length > 0
                    ? JSON.stringify(input.explorationContext.presentEntities)
                    : input.locationContext;

                const [expResult, intResult] = await Promise.all([
                    explorationExpert({
                        playerAction: input.playerAction,
                        locationId: input.locationId,
                        locationContext: input.locationContext,
                        interpretedAction: input.interpretedAction,
                        deadEntities: input.deadEntities,
                        isKeyMoment: (input as any).isKeyMoment,
                        systemFeedback: input.systemFeedback,
                        conversationHistory: input.conversationHistory,
                        explorationContext: input.explorationContext, // Pass exploration context
                        adventureLore: input.adventureLore,
                        activeEffects: input.activeEffects,
                        skillCheckResult: input.skillCheckResult,
                        party: input.party,
                    }),
                    interactionExpert({
                        playerAction: input.playerAction,
                        npcContext: resolvedNpcContext,
                        conversationHistory: input.conversationHistory || "",
                        interpretedAction: input.interpretedAction,
                        isKeyMoment: (input as any).isKeyMoment,
                        activeEffects: input.activeEffects,
                        adventureLore: input.adventureLore,
                        skillCheckResult: input.skillCheckResult,
                        party: input.party,
                    })
                ]);

                explorationText = expResult.explorationNarration;
                interactionText = intResult.npcResponse;
                if (expResult.debugLogs) debugLogs.push(...expResult.debugLogs);
                if (intResult.debugLogs) debugLogs.push(...intResult.debugLogs);
            }

            // Centralized Narrative Director call (unifying EXPLORATION, INTERACTION, and HYBRID)
            localLog("NarrativeManager: Synthesizing final output with Narrative Director...");
            const directorResponse = await executePromptWithRetry(
                narrativeDirectorPrompt,
                {
                    playerAction: input.playerAction,
                    explorationText,
                    interactionText,
                    conversationHistory: input.conversationHistory || "",
                    adventureLore: input.adventureLore,
                    systemFeedback: input.systemFeedback,
                    activeEffects: input.activeEffects,
                    skillCheckResult: input.skillCheckResult,
                    party: input.party,
                },
                { flowName: 'narrativeDirector' }
            );
            const rawNarration = directorResponse.output?.finalNarration || `${explorationText || ''}\n\n${interactionText || ''}`.trim();
            finalNarration = repairPunctuationSpacing(rawNarration);

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
