/**
 * Validador de la narración v2 (docs/nucleo-v2.md §3 ⑤): comprobaciones baratas, sin IA. Las mismas
 * que los invariantes de los escenarios.
 */
import { findTerm } from './secrets';
import type { FactPacket } from './fact-packet';

export interface NarrationV2 {
    narration: string;
    reactions: { companionId: string; text: string }[];
}

export interface NarrationProblem {
    kind: 'empty' | 'secret' | 'technical' | 'dc' | 'format';
    /** Cómo se le explica al modelo. No repite el término secreto: sería dárselo. */
    message: string;
}

/** Problemas de la narración (vacío = correcta). */
export function validateNarration(n: NarrationV2, packet: FactPacket): NarrationProblem[] {
    const problems: NarrationProblem[] = [];
    const all = [n.narration, ...n.reactions.map(r => r.text)].join('\n');
    const answered = packet.addressedCompanion && n.reactions.some(r => r.text.trim());
    if (!n.narration.trim() && !answered) problems.push({ kind: 'empty', message: 'La narración está vacía.' });
    if (findTerm(all, packet.forbiddenTerms)) {
        problems.push({ kind: 'secret', message: 'Nombra algo que el grupo todavía no conoce: no uses nombres propios que no estén entre los presentes.' });
    }
    if (/\[object Object\]|\bundefined\b|\bNaN\b/.test(all) || /\b[A-Z]{3,}(?:_[A-Z]{2,})+\b/.test(all)) {
        problems.push({ kind: 'technical', message: 'Contiene restos técnicos o códigos internos.' });
    }
    if (/\b(?:CD|DC)\s*\d+|clase de dificultad/i.test(all)) problems.push({ kind: 'dc', message: 'Menciona una clase de dificultad (CD).' });
    return problems;
}

/** Versión segura, escrita por código, cuando el narrador falla dos veces. */
export function safeNarration(packet: FactPacket): NarrationV2 {
    return {
        narration: packet.facts.length ? packet.facts.join(' ') : `${packet.actorName} lo intenta, pero por ahora nada cambia en la escena.`,
        reactions: [],
    };
}
