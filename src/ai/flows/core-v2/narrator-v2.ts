/**
 * Narrador v2 (docs/nucleo-v2.md §3 ④ y ⑤): una llamada que narra SOLO el paquete de hechos, con las
 * voces de los NPC y las reacciones de los compañeros. Si el validador encuentra un problema se pide
 * una corrección; si vuelve a fallar, se usa la versión segura escrita por código.
 */
import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { log } from '@/lib/logger';
import { GEMINI_MODEL_NAME } from '@/ai/model-config';
import { executePromptWithRetry } from '../retry-utils';
import { isUnusableAnswer } from './unusable-answer';
import { renderFactPacket, type FactPacket } from '@/lib/game/core-v2/fact-packet';
import { safeNarration, validateNarration, type NarrationProblem, type NarrationV2 } from '@/lib/game/core-v2/narration-validator';

/** El plugin de Groq corta los prompts de más de 14.000 caracteres por la mitad: allí se recorta antes, por párrafos. */
export function narratorLimits(model: string = GEMINI_MODEL_NAME): { maxGuidanceChars: number; maxHistoryChars: number } {
    return model.startsWith('groq/')
        ? { maxGuidanceChars: 4500, maxHistoryChars: 1500 }
        : { maxGuidanceChars: 12000, maxHistoryChars: 2500 };
}

function narratorSchema(packet: FactPacket) {
    const ids = packet.companions.map(c => c.id);
    const reaction = z.object({
        companionId: ids.length ? z.enum(ids as [string, ...string[]]) : z.string(),
        text: z.string(),
    });
    return z.object({ narration: z.string(), reactions: z.array(reaction) });
}

const INSTRUCTIONS = `Eres el Dungeon Master de una partida de D&D 5e. Narra en español de España, en segunda persona del plural, lo que ocurre en este turno.

Reglas:
1. Narra los HECHOS DE ESTE TURNO tal como están: ya están resueltos. No los contradigas ni añadas acontecimientos que cambien el estado (objetos que cambian de manos, tiradas, llegadas, heridas, combates, viajes).
2. Sigue las indicaciones de la aventura: qué hace cada personaje, cómo reacciona y qué cuenta. Incluyen también lo que pasará MÁS ADELANTE: no lo adelantes. Solo están aquí los PRESENTES; quien no esté en esa lista no aparece.
3. Los personajes presentes hablan con su voz entre «». Quien no puede hablar solo emite sonidos y gestos. No inventes nombres propios.
4. No hables ni decidas por el personaje del jugador. Nada de términos de juego: ni CD, ni tiradas, ni identificadores.
5. De 1 a 3 párrafos breves.
6. "reactions": como mucho 2 intervenciones breves de compañeros de la lista, en primera persona y solo si aportan algo; normalmente, lista vacía. Los compañeros no hablan dentro de "narration".`;

export interface NarrationOutcome {
    result: NarrationV2;
    calls: number;
    problems: NarrationProblem[];
    /** Se ha usado la versión segura escrita por código. */
    safe: boolean;
}

export async function narrateV2(packet: FactPacket): Promise<NarrationOutcome> {
    const schema = narratorSchema(packet);
    const basePrompt = `${INSTRUCTIONS}\n\n${renderFactPacket(packet)}`;
    let problems: NarrationProblem[] = [];

    for (let call = 1; call <= 2; call++) {
        const prompt = call === 1
            ? basePrompt
            : `${basePrompt}\n\n## Corrección\nTu respuesta anterior no es válida. ${problems.map(p => p.message).join(' ')} Escríbela de nuevo sin ese problema.`;
        let output: NarrationV2 | null = null;
        try {
            const response = await executePromptWithRetry(
                () => ai.generate({ prompt, output: { schema } }) as unknown as Promise<{ output: NarrationV2 | null }>,
                undefined,
                { flowName: 'narratorV2' },
            );
            output = response.output;
        } catch (error: any) {
            if (!isUnusableAnswer(error)) throw error;
        }
        if (!output) {
            problems = [{ kind: 'format', message: 'No tiene el formato pedido.' }];
        } else {
            const result: NarrationV2 = {
                narration: (output.narration || '').trim(),
                reactions: (output.reactions || [])
                    .filter(r => r.text?.trim() && packet.companions.some(c => c.id === r.companionId))
                    .slice(0, 2),
            };
            problems = validateNarration(result, packet);
            if (!problems.length) return { result, calls: call, problems, safe: false };
        }
        log.warn('Narrador v2: narración rechazada', { module: 'CoreV2', call, problems: problems.map(p => p.kind).join(', ') });
    }
    return { result: safeNarration(packet), calls: 2, problems, safe: true };
}
