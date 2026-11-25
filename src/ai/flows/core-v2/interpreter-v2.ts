/**
 * Intérprete v2 (docs/nucleo-v2.md §3 ①): una llamada que elige acción e IDs de listas cerradas.
 * El esquema se construye en cada turno con los IDs reales, así que un modelo con salidas
 * estructuradas no puede inventar destinos ni objetos; con el resto, lo comprueba `resolveActionV2`.
 */
import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { log } from '@/lib/logger';
import { executePromptWithRetry } from '../retry-utils';
import { isUnusableAnswer } from './unusable-answer';
import {
    ACTION_TYPES, NONE, SKILLS, recipientIds, resolveActionV2, targetIds,
    type ActionOptions, type ActionV2, type Option, type RawActionV2,
} from '@/lib/game/core-v2/actions';

const closed = (ids: readonly string[]) => z.enum([NONE, ...ids.filter(id => id !== NONE)] as [string, ...string[]]);

export function interpreterSchema(o: ActionOptions) {
    return z.object({
        type: z.enum(ACTION_TYPES),
        actor: closed(o.actors.map(a => a.id)),
        target: closed(targetIds(o)),
        item: closed(o.items.map(i => i.id)),
        recipient: closed(recipientIds(o)),
        skill: closed(SKILLS),
        stealth: z.boolean(),
        clarification: z.string(),
    });
}

export function buildInterpreterPrompt(playerText: string, o: ActionOptions, history: string): string {
    const list = (title: string, xs: Option[]) => `${title}:\n${xs.length ? xs.map(x => `- ${x.id} = ${x.label}`).join('\n') : '- (ninguno)'}`;
    const actor = o.actors.find(a => a.id === o.defaultActorId);
    return `You are the action interpreter of a D&D 5e game. Classify the player's message (Spanish). You do NOT decide rules, rolls or outcomes.

Action types:
- move: go to one of the exits (target = exit id).
- take: pick up or accept an item (item).
- give: hand over an item WITHOUT asking anyone to use it (item + recipient).
- use_item: read, activate, drink or use an item (item). If someone is asked to use it ("Merryl, toma esto y léelo"), that person is the actor, even if the item has to be handed over first.
- talk: speak or ask something (target = entity or companion id; "none" if nobody in particular).
- examine: look, inspect or identify something (target and/or item; "none" to look around), including approaching something already here.
- attack: attack an entity (target).
- check: attempt something with an uncertain result that no other type covers: searching for hidden things, persuading, sneaking, climbing... (skill).
- rest: short or long rest.
- clarify: the message cannot be understood, or it names a place or thing that is not listed. Write the question in "clarification", in Spanish.

Rules:
- Use ONLY ids from the lists below; "none" for fields that do not apply. Plain questions and conversation are talk, not check.
- actor: who performs the action. Default: ${actor ? `${actor.id} (${actor.label})` : NONE}. If the player orders a companion to do it, that companion.
- stealth: true only if the player says they move or act quietly.
- "clarification" is an empty string unless type is clarify.

${list('Party (actor ids)', o.actors)}

${list('Entities present', o.entities)}

${list('Items within reach', o.items)}

${list('Objects in the room', o.interactables)}

${list('Exits', o.exits)}

Recent messages:
${history || '(none)'}

Player message: «${playerText}»`;
}

export async function interpretActionV2(input: { playerText: string; options: ActionOptions; history: string }): Promise<ActionV2> {
    try {
        const { output } = await executePromptWithRetry(
            () => ai.generate({
                prompt: buildInterpreterPrompt(input.playerText, input.options, input.history),
                output: { schema: interpreterSchema(input.options) },
                config: { temperature: 0.1 },
            }) as unknown as Promise<{ output: RawActionV2 | null }>,
            undefined,
            { flowName: 'interpreterV2' },
        );
        return resolveActionV2(output, input.options);
    } catch (error: any) {
        // Un fallo del proveedor (cuota, red…) se muestra como tal; una respuesta inservible se pregunta.
        if (!isUnusableAnswer(error)) throw error;
        log.warn('Intérprete v2: respuesta no válida, se pide aclaración', { module: 'CoreV2', error: error?.message });
        return { type: 'clarify' };
    }
}
