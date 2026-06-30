
'use server';
/**
 * @fileOverview A specialized AI flow to interpret player actions.
 * This version uses a more robust, two-step process to generate interpretations.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { ActionInterpreterInputSchema, ActionInterpreterOutputSchema, type ActionInterpreterInput, type ActionInterpreterOutput } from '@/ai/flows/schemas';
import { getAdventureData } from '@/app/game-state-actions';
import { log } from '@/lib/logger';
import { executePromptWithRetry } from './retry-utils';

// This prompt no longer needs tools. All context is provided directly.
const actionInterpreterPrompt = ai.definePrompt({
    name: 'actionInterpreterPrompt',
    input: {
        schema: z.object({
            playerAction: z.string(),
            locationContext: z.string(),
            party: ActionInterpreterInputSchema.shape.party,
            allLocationNames: z.array(z.string()), // Provide all possible location names
            updatedEnemies: z.array(z.any()).optional(),
            conversationHistory: z.string().optional(),
        })
    },
    output: { schema: ActionInterpreterOutputSchema },
    prompt: `You are an expert action interpreter for a D&D game. Your ONLY job is to determine the player's intent and return a structured JSON object. You must follow a strict priority flow.

**Directives & Priority Flow:**

1.  **PRIORITY 1: Out-of-Character (OOC) Check:**
    *   If the player's action starts with \`//\`, you MUST classify the action as 'ooc'. The 'targetId' is irrelevant. Stop here.

2.  **PRIORITY 2: Attack / Hostile Intent / Offensive Magic:**
    *   Analyze for a clear intent to attack OR initiate violence, OR cast an OFFENSIVE SPELL.
    *   **IMPORTANT:** This includes BOTH combat attacks AND surprise attacks on neutral/friendly NPCs or objects.
    *   Examples of hostile intent:
    *     - Direct attacks: "ataco al guardia", "le disparo", "le clavo la daga"
    *     - Surprise attacks: "le ataco mientras me da la mano", "saco mi espada y ataco al tabernero"
    *     - Violent actions: "le corto el cuello", "le golpeo", "matarlo"
    *     - **Offensive Spells:** "Lanzo 'Manos Ardientes'", "Cast Fireball", "Eldritch Blast", "Magic Missile". Even if targeting objects ("ataco a la puerta", "lanzo fuego a los barriles"), if it uses an attack spell, classify as 'attack'.
    *   If detected, classify as 'attack'.
    *   **IMPORTANT - Target Identification:**
    *     - **Combat State Priority:** If 'updatedEnemies' is provided, look there FIRST. It contains the current state of combatants with unique IDs (e.g., "Goblin 2", "Orc 1"). Match the player's target (e.g., "ataco al goblin 2") to the 'id' or 'name' in 'updatedEnemies'.
    *     - **Contextual References:** Use 'conversationHistory' to resolve relative references like "the one who attacked me", "the one who killed Merryl", "the wounded one". Look for recent events in the history to identify the correct target ID.
    *     - **NPCs and Entities:** If the target is an NPC from 'entitiesPresent' (e.g., "tabernero", "guardia", "mercader"), use that entity's ID.
    *     - If the player explicitly mentions a specific target (e.g., "ataco al goblin", "ataco a la mantícora"), use that target's ID from 'updatedEnemies' or 'entitiesPresent'.
    *     - If the player's action is generic (e.g., "atacamos", "ataco", "luchamos") without specifying a target, you MAY leave 'targetId' as null or use the first hostile entity ID as a fallback.
    *     - The 'targetId' is just the INITIAL target - other hostile entities in the location will join combat automatically.
    *   Stop here.

2.5 **PRIORITY 2.5: Interaction/Examination of Hazards:**
    *   Analyze if the action targets a "strange feature", "glimmer", "texture", or potential hazard described in the context (often found in 'detectedHazards' or location description).
    *   Keywords: "examino el brillo", "toco la pared", "me acerco a la mancha", "investigate the glimmer".
    *   If the player interacts with or closely investigates a suspicious feature that corresponds to a hazard (e.g., "brillo húmedo", "mancha oscura"), classify as 'interact' and use the hazard's ID or description keyword as 'targetId'.
    *   Stop here.

3.  **PRIORITY 3: Skill Check / Risky Action / Dynamic Social Checks:**
    *   Analyze if the action implies a challenge, risk, or use of a specific ability that is NOT a direct attack.
    *   Keywords: "intento", "trato de", "escalo", "me escondo", "investigo", "busco", "persuado", "engaño", "salto", "fuerzo".
    *   Examples: "intento abrir la cerradura", "investigo la habitación", "me escondo en las sombras", "trato de convencer al guardia", "intento derribar la puerta".
    *   **DYNAMIC SOCIAL CHECKS:** You MUST classify dialogue/narrative as a 'skill_check' if the player attempts to persuade (Persuasion), lie/deceive (Deception), intimidate/threaten (Intimidation), or gauge motives/truthfulness (Insight/Intuition) of an NPC, EVEN IF they write it as raw dialogue/action without explicit keywords like "I try to".
    *     - Example: "Le digo a Guz que no he visto ninguna oveja, que se habrá equivocado de camino" is Deception -> Classify as 'skill_check', targetId: "Guz".
    *     - Example: "Le digo al tabernero que nos dé la habitación gratis o destruiremos su local" is Intimidation -> Classify as 'skill_check', targetId: "tabernero".
    *     - Example: "Le pido cortésmente al guardia que nos deje pasar en nombre del alcalde" is Persuasion -> Classify as 'skill_check', targetId: "guardia".
    *     - Example: "Observo de cerca a Guz para ver si está nervioso o miente" is Insight -> Classify as 'skill_check', targetId: "Guz".
    *   **IMPORTANT EXCEPTION:** Casting a standard spell (like "detectar magia", "luz") is NOT a skill check usually (unless it says "try to cast"). If it's a utility spell, check PRIORITY 6 (Interaction) or 8 (Narrate). Only use 'skill_check' if the player explicitly frames it as a difficult attempt ("try to control the magic").
    *   If detected, classify as 'skill_check'.
    *   Set 'targetId' to the target entity name or object if specified (e.g. "guardia", "cerradura", "Guz").
    *   Stop here.

3.5 **PRIORITY 3.5: Inventory Management (Drop / Give):**
    *   Analyze if the action describes dropping or discarding an item, OR transferring/giving an item to a companion.
    *   **Drop Item:** If the player wants to throw away, discard, drop, or leave an item on the floor (e.g., "tiro la llave al suelo", "suelto la poción de curación", "descarto la antorcha", "drop the sword"), you MUST classify the action as 'drop'. Set \`targetId\` to the item's name/ID (e.g., "llave-calabozo" or "pocion-curacion").
    *   **Give Item:** If the player wants to give, pass, hand, or transfer an item to an ally in the party (e.g., "le doy la poción a Merryl", "pásale la llave a Elara", "le entrego el mapa a Galador", "give the scroll to Merryl"), you MUST classify the action as 'give'. Set \`targetId\` to the item's name/ID and set \`recipient\` to the companion's name (e.g., "Merryl", "Elara").
    *   Stop here.

4.  **PRIORITY 4: Interaction with a Companion OR Proposal:**
    *   Analyze if the action is directed at a companion from the 'Player's Party' list.
    *   **Direct Addresses:** If the player's action starts with or explicitly names a companion in the party to ask them a question, make a statement to them, or tell them to do something (e.g., "Merryl ¿de que se trata?", "Elara, mira eso", "Pregunto a Merryl sobre el objeto"), you MUST classify the action as 'interact' and set 'targetId' to that specific companion's name (e.g. "Merryl", "Elara"). This takes absolute priority over any object or hazard they might be asking about (the target is the companion, not the object).
    *   **CRITICAL EXCEPTION:** If the player is ordering the companion to perform a physical, risky, hostile, or magical action (e.g., "Merryl, ataca al goblin", "Merryl, salta el acantilado", "Merryl, abre/fuerza el cofre", "Merryl, lee/usa el pergamino de hablar con los animales"), **DO NOT** classify this action under this priority as a simple social interaction. Instead, let the action be evaluated by the appropriate priorities below (e.g., \`attack\` for attacking, \`skill_check\` for physical challenges, or \`interact\` with the target object/NPC for object/magical interactions).
    *   **Proposals/Questions:** If the player asks a question to the group or proposes a plan WITHOUT executing it immediately (e.g., "¿Qué os parece si vamos a...?", "Should we go to...?", "What do you think?"), classify as 'interact'.
    *   In these cases, use 'Party' or 'Group' as the targetId, or a specific companion if addressed.
    *   **Crucial:** "Vamos a la posada" is a MOVE. "What if we go to the inn?" is an INTERACTION (Proposal).
    *   If so, classify as 'interact' and use the companion's name or 'Party' as 'targetId'. Stop here.

5.  **PRIORITY 5: Movement - Local Connections:**
    *   Analyze for movement intent (e.g., "vamos a", "entramos en", "cruzo", "ir al sur", "voy a la puerta").
    *   **IMPORTANT:** Actions like "abrir la puerta del [dirección]", "cerrar la puerta del [dirección]" or "forzar la verja" are INTERACTION actions, not movement.
    *   If the destination matches a local \`connections\` (or legacy \`exits\`) description, direction, or target name, classify as 'move' and use the \`targetId\` (or \`toLocationId\`). 
    *   **Direction Matching:** If the player mentions a direction (norte, sur, este, oeste, etc.), match it to a connection with that direction. If they express intent to traverse it (e.g., "voy a la puerta del norte", "cruzo la verja del este"), classify it as 'move'. Only classify as 'interact' if they want to manipulate the door itself (open, lock, unlock, break, force).
    *   Stop here.

6.  **PRIORITY 6: Interaction with Local Objects or NPCs:**
    *   Analyze if the action targets a local object/entity from \`interactables\` or \`entitiesPresent\`.
    *   **Keywords:** "interactuar", "tocar", "usar", "hablar", "saludar", "mirar", "examinar", "coger"; **AND ALSO PROXIMITY VERBS:** "acercarse a", "ir hacia", "aproximarse a" (e.g. "me acerco al altar", "voy hacia la estatua").
    *   **NPCs:** If the action targets an NPC (e.g., "talk to the dwarf", "greet her"), use the NPC's ID from \`entitiesPresent\` as the 'targetId'.
    *   **Implied Target ("Them"):** If the player uses generic social verbs like "greet", "talk", "ask", or "wave" and refers to "them" or "him/her" (e.g., "les saludamos", "hablo con ellos"), and there are NPCs in \`entitiesPresent\`, YOU MUST classify as 'interact' and select the logical NPC target(s).
    *   **Objects:** If targeting an object from \`interactables\`, use its name or specific ID.
    *   If so, classify as 'interact'. Stop here.

7.  **PRIORITY 7: Movement - Global Search (Fuzzy Match):**
    *   If movement intent was detected but didn't match a local exit, compare the player's destination to the provided 'allLocationNames' list.
    *   Find the best fuzzy match from the list. For example, if the player says "vamos a la colina", and the list has "Colina del Resentimiento", you should match it.
    *   If you find a strong match, classify as 'move' and use the matched name from the list as the 'targetId'. Stop here.

8.  **PRIORITY 8: Default to Narration:**
    *   If none of the above apply, classify as 'narrate' and leave 'targetId' null.

**CONTEXT:**
- Player's Party: \`\`\`json
{{{json party}}}
\`\`\`
- Updated Enemies (Current Combat State): \`\`\`json
{{{json updatedEnemies}}}
\`\`\`
- Current Location: \`\`\`json
{{{locationContext}}}
\`\`\`
- All Possible Locations: {{{json allLocationNames}}}
- Recent History:
\`\`\`
{{{conversationHistory}}}
\`\`\`
- Player Action: "{{{playerAction}}}"

Determine the player's intent based on the strict priority flow above.

**IMPORTANT - STEALTH INTENT:**
- If the player's action includes ANY intent to be stealthy, hide, move quietly, or avoid detection (e.g., "I sneak to...", "quietly", "without making noise", "stealthily", "sigilosamente", "con sigilo", "me escondo"), YOU MUST SET \`stealthIntent\` to \`true\`.
- This applies to ANY action type (Move, Interactions, etc.).
- Example: "I sneak into the room" -> actionType: 'move', stealthIntent: true.
- Example: "I quietly open the door" -> actionType: 'interact', stealthIntent: true.

**IMPORTANT - ACTIVATED EFFECTS:**
- If the player casts a utility/sensory spell, reads a magical scroll, or uses a potion/item that activates a state or magical effect (e.g., "lanzo Hablar con los animales", "uso el pergamino de hablar con los animales", "read the scroll of speak with animals", "cast detect magic", "uso detectar magia"), YOU MUST list the identifier of that effect in the \`activatedEffects\` array.
- **Companion Delegation:** This also applies if the player explicitly orders a companion in the party to use/read the item or scroll (e.g., "Merryl, lee el pergamino", "Elara, usa el pergamino de hablar con los animales"). If the action expresses the intention that the party or a companion activates the effect, list it here.
- **Recent History Resolution (Elision):** If the player's action is extremely short, generic, or elided (e.g., "Úsalo", "Adelante", "Léelo", "Hazlo", "Úsala") and refers to an action discussed in the immediate **Recent History** (e.g., the player just told a companion to read the scroll, and they replied asking for confirmation), you MUST resolve the context and include the logical effect identifier (e.g., "speak_with_animals") in \`activatedEffects\`.
- Standard identifiers to use:
  - "speak_with_animals" (for the spell/scroll to speak with beasts)
  - "detect_magic" (for detecting magic)
  - "comprehend_languages" (for understanding languages)
- Example: "Leo el pergamino para hablar con los animales" -> activatedEffects: ["speak_with_animals"].
- If no effects are activated by the player's action, leave \`activatedEffects\` as an empty array or undefined.

**IMPORTANT - ASSIGNED COMPANION:**
- If the player explicitly asks, directs, or orders a specific companion in the party (e.g., "Merryl", "Elara") to perform the action, attempt a check, or interact with something (e.g., "Merryl, ¿puedes descifrarlo?", "Elara, mira a ver si hay trampas", "Humm, quizás Merryl con su habilidad arcana pueda descifrarlo... Merryl lo puedes intentar tu?"), YOU MUST set \`assignedCompanion\` to the exact name of that companion (e.g., "Merryl", "Elara").
- If the action is performed by the player character themselves, set \`assignedCompanion\` to null or undefined.

**IMPORTANT - RECIPIENT:**
- If the player's action is classified as 'give' (transferring an item), YOU MUST set \`recipient\` to the exact name of the party companion receiving the item (e.g., "Merryl", "Elara"). It must match one of the companions in the party.
- For all other action types, set \`recipient\` to null or undefined.
`,
});

export const actionInterpreterFlow = ai.defineFlow(
    {
        name: 'actionInterpreterFlow',
        inputSchema: ActionInterpreterInputSchema,
        outputSchema: z.object({
            interpretation: ActionInterpreterOutputSchema,
            debugLogs: z.array(z.string()),
        }),
    },
    async (input) => {
        const debugLogs: string[] = [];
        try {
            // STEP 1: Fetch all possible location names from the adventure data.
            const adventureData = await getAdventureData();
            if (!adventureData) {
                throw new Error("Failed to load adventure data for interpreter.");
            }
            const allLocationNames = adventureData.locations.map((l: any) => l.name || l.title).filter(Boolean);

            // STEP 2: Call the LLM with retry logic (Issue #13)
            let llmResponse;
            try {
                llmResponse = await executePromptWithRetry(
                    actionInterpreterPrompt,
                    {
                        playerAction: input.playerAction,
                        locationContext: input.locationContext,
                        party: input.party,
                        allLocationNames: allLocationNames,
                        updatedEnemies: input.updatedEnemies,
                        conversationHistory: input.conversationHistory,
                    },
                    { flowName: 'actionInterpreter' }
                );
            } catch (retryError: any) {
                // All retries exhausted - implement intelligent fallback
                log.error('All retry attempts failed, using intelligent fallback', {
                    module: 'AIFlow',
                    flow: 'actionInterpreter',
                    error: retryError.message,
                    playerAction: input.playerAction,
                });

                // Intelligent fallback: simple pattern matching for common actions
                const actionLower = input.playerAction.toLowerCase().trim();
                const attackPatterns = ['ataco', 'atacar', 'atacamos', 'ataque', 'lucho', 'luchamos', 'golpeo', 'golpeamos'];
                const isAttack = attackPatterns.some(pattern => actionLower.includes(pattern));

                if (isAttack) {
                    // Check if player mentioned a specific target
                    let targetId: string | null = null;
                    const locationContextObj = typeof input.locationContext === 'string'
                        ? JSON.parse(input.locationContext)
                        : input.locationContext;

                    if (locationContextObj?.entitiesPresent) {
                        // Issue #27: Filtrar enemigos muertos SOLO para interpretación de ataques
                        // locationContextObj.entitiesPresent permanece intacto (incluye cadáveres)
                        const aliveEntities = locationContextObj.entitiesPresent.filter((entity: any) => {
                            if (!input.updatedEnemies) return true; // Primer combate, asumir vivos
                            const enemy = input.updatedEnemies.find((e: any) => e.id === entity.id || (e as any).uniqueId === entity.id);
                            if (!enemy) return true;
                            // Si el enemigo tiene información de hp, comprobar si está muerto
                            const hpCurrent = typeof enemy.hp === 'number'
                                ? enemy.hp
                                : enemy.hp?.current;
                            if (hpCurrent !== undefined) {
                                return hpCurrent > 0;
                            }
                            return true; // Si no tiene hp o hp.current, asumimos que está vivo
                        });

                        if (aliveEntities.length === 0) {
                            // Todos los enemigos están muertos, no puede atacar
                            log.info('Fallback: No living enemies to attack', {
                                module: 'AIFlow',
                                flow: 'actionInterpreter',
                            });
                            return {
                                interpretation: { actionType: 'narrate' as const, targetId: null },
                                debugLogs: ['Fallback: No hay enemigos vivos para atacar'],
                            };
                        }

                        // Try to find target mention in player action (usar aliveEntities)
                        for (const entity of aliveEntities) {
                            const entityName = entity.name?.toLowerCase() || '';
                            if (entityName && actionLower.includes(entityName)) {
                                targetId = entity.id;
                                break;
                            }
                        }

                        // If no specific target, use first alive hostile entity
                        if (!targetId && aliveEntities.length > 0) {
                            targetId = aliveEntities[0].id;
                        }
                    }

                    log.info('Fallback detected attack action', {
                        module: 'AIFlow',
                        flow: 'actionInterpreter',
                        targetId,
                    });

                    return {
                        interpretation: { actionType: 'attack' as const, targetId },
                        debugLogs: [`Fallback: Detected attack action with target: ${targetId}`],
                    };
                }

                // Default fallback: narrate
                log.warn('Fallback defaulting to narrate', {
                    module: 'AIFlow',
                    flow: 'actionInterpreter',
                });

                return {
                    interpretation: { actionType: 'narrate' as const },
                    debugLogs: ['Fallback: Defaulting to narrate'],
                };
            }

            let output = llmResponse.output;

            if (!output) {
                const msg = "ActionInterpreter: AI returned null output. Defaulting to 'narrate'.";
                log.error(msg, { module: 'AIFlow', flow: 'actionInterpreter' });
                debugLogs.push(msg);
                output = { actionType: 'narrate' as const };
            }

            // Post-processing to map title back to ID if a global move was detected
            if (output.actionType === 'move' && output.targetId) {
                const matchedLocation = adventureData.locations.find((l: any) => (l.name || l.title) === output.targetId || l.id === output.targetId);
                if (matchedLocation) {
                    log.aiFlow('actionInterpreter', 'Mapped location title to ID', {
                        title: output.targetId,
                        id: matchedLocation.id,
                    });
                    output.targetId = matchedLocation.id;
                }
            }

            log.aiFlow('actionInterpreter', 'Action interpreted', {
                actionType: output.actionType,
                targetId: output.targetId,
            });
            debugLogs.push(`ActionInterpreter Raw Output: ${JSON.stringify(output)}`);
            return { interpretation: output, debugLogs };

        } catch (e: any) {
            const msg = `ActionInterpreter: Flow failed. Error: ${e.message}. Defaulting to 'narrate'.`;
            log.error(msg, { module: 'AIFlow', flow: 'actionInterpreter' }, e);
            debugLogs.push(msg);
            return { interpretation: { actionType: 'narrate' as const }, debugLogs };
        }
    }
);

export async function actionInterpreter(input: ActionInterpreterInput): Promise<{ interpretation: ActionInterpreterOutput, debugLogs: string[] }> {
    return actionInterpreterFlow(input);
}
