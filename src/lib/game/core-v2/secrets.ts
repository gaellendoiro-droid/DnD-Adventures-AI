/**
 * Qué términos secretos siguen ocultos y cómo quitarlos de un texto (núcleo v2, paso D).
 *
 * Los términos los declara la aventura (`roleplay.hiddenIdentityTerms`). Siguen ocultos mientras la
 * entidad que los declara esté tras su barrera de comunicación. En vez de sustituirlos (la IA tomaba
 * los reemplazos por instrucciones) se elimina el pasaje entero que los contiene.
 */
import { collectHiddenIdentityTerms, isBehindCommunicationBarrier } from '../communication-barrier';
import { isFlagOn, type FlagValue } from './scene-engine';

type Flags = Record<string, FlagValue>;

/** Efecto que levanta las barreras de comunicación (el mismo que usa el resto del juego). */
const BARRIER_LIFTING_FLAG = 'speak_with_animals';

/** ¿Está esta entidad tras una barrera de comunicación ahora mismo? */
export function isBarrierUp(entity: any, flags: Flags = {}): boolean {
    return isBehindCommunicationBarrier(entity) && !isFlagOn(flags[BARRIER_LIFTING_FLAG]);
}

/** Términos que el grupo aún no puede conocer. */
export function unrevealedTerms(entities: any[] | undefined, flags: Flags = {}): string[] {
    const hidden = (entities || []).filter(e => isBarrierUp(e, flags));
    return collectHiddenIdentityTerms(hidden).map(t => t.term);
}

export function findTerm(text: string, terms: string[]): string | undefined {
    const lower = text.toLowerCase();
    return terms.find(term => lower.includes(term.toLowerCase()));
}

/** Quita las frases que contienen un término oculto. */
export function dropSentencesWith(text: string | undefined, terms: string[]): string {
    if (!text) return '';
    if (!findTerm(text, terms)) return text;
    return (text.match(/[^.!?…]+[.!?…»”"']*\s*/g) || []).filter(s => !findTerm(s, terms)).join('').trim();
}

/** Quita los párrafos que contienen un término oculto. */
export function dropParagraphsWith(paragraphs: string[], terms: string[]): string[] {
    return paragraphs.filter(p => !findTerm(p, terms));
}
