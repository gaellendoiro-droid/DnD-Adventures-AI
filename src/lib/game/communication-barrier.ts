/**
 * @fileOverview Barrera de comunicación genérica (independiente de la aventura).
 *
 * Mientras el grupo no pueda comunicarse con una criatura (p. ej. una bestia sin
 * `speak_with_animals` activo), los expertos de IA no deben recibir su rol ni sus
 * secretos. Esta utilidad:
 *  - Detecta entidades tras una barrera de comunicación (dato `roleplay.communicationBarrier`
 *    o heurística de bestia/animal).
 *  - Las enmascara conservando su identidad visible (id, nombre, descripción del JSON)
 *    y eliminando personalidad, objetivos y secretos.
 *  - Oculta términos de spoiler declarados en los datos de la aventura
 *    (`roleplay.hiddenIdentityTerms`) en textos de contexto, sin nombres fijos en código.
 */

export interface HiddenIdentityTerm {
    term: string;
    replacement: string;
}

const ANIMAL_WORDS = /\b(oveja|sheep|bestia|beast|animal)\b/i;

/** Indica si la entidad debe tratarse como tras una barrera de comunicación. */
export function isBehindCommunicationBarrier(ent: any): boolean {
    if (!ent || typeof ent !== 'object') return false;
    return (
        Boolean(ent.roleplay?.communicationBarrier) ||
        ANIMAL_WORDS.test(String(ent.id || '').replace(/[-_]/g, ' ')) ||
        ANIMAL_WORDS.test(ent.name || '') ||
        /bestia|beast/i.test(ent.baseType || '') ||
        /bestia|beast/i.test(ent.subType || '')
    );
}

/** Recopila los términos de spoiler declarados en las entidades de la aventura (los más largos primero). */
export function collectHiddenIdentityTerms(entities: any[] | undefined | null): HiddenIdentityTerm[] {
    if (!Array.isArray(entities)) return [];
    const terms: HiddenIdentityTerm[] = [];
    const seen = new Set<string>();
    for (const ent of entities) {
        const list = ent?.roleplay?.hiddenIdentityTerms;
        if (!Array.isArray(list)) continue;
        for (const t of list) {
            if (!t?.term || typeof t.term !== 'string') continue;
            const key = t.term.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            terms.push({ term: t.term, replacement: typeof t.replacement === 'string' ? t.replacement : '' });
        }
    }
    return terms.sort((a, b) => b.term.length - a.term.length);
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Sustituye en el texto los términos de spoiler declarados. */
export function applyHiddenIdentityTerms<T extends string | undefined>(text: T, terms: HiddenIdentityTerm[]): T {
    if (!text || terms.length === 0) return text;
    let out: string = text;
    for (const { term, replacement } of terms) {
        out = out.replace(new RegExp(escapeRegExp(term), 'gi'), replacement);
    }
    return out as T;
}

/**
 * Devuelve una versión enmascarada de la entidad: conserva lo que el grupo puede ver
 * (id, nombre, tipo y descripción de los datos) y sustituye su rol por una barrera genérica.
 */
export function maskEntityBehindBarrier(ent: any, terms: HiddenIdentityTerm[] = []): any {
    const ownBarrier = ent.roleplay?.communicationBarrier
        ? ` ${applyHiddenIdentityTerms(String(ent.roleplay.communicationBarrier), terms)}`
        : '';
    return {
        id: ent.id,
        name: applyHiddenIdentityTerms(ent.name, terms),
        type: ent.type || 'npc',
        ...(ent.baseType ? { baseType: ent.baseType } : {}),
        description: applyHiddenIdentityTerms(ent.description, terms),
        roleplay: {
            personality: 'Se comporta como una criatura de su especie; puede mostrar urgencia o inteligencia solo mediante gestos.',
            voiceAndMannerisms: 'Solo emite los sonidos propios de su especie y se comunica con gestos físicos.',
            goals: 'Desconocidos para el grupo mientras no puedan comunicarse con ella.',
            communicationBarrier: `PROHIBIDO HABLAR EN CASTELLANO/COMÚN: el efecto speak_with_animals NO está activo. Solo puede emitir sonidos de su especie y hacer gestos.${ownBarrier}`,
        },
    };
}

/** Carga los términos de spoiler de la aventura activa (best-effort: nunca lanza). */
export async function loadActiveAdventureHiddenTerms(): Promise<HiddenIdentityTerm[]> {
    try {
        const { getAdventureData } = await import('@/app/game-state-actions');
        const adventureData = await getAdventureData();
        return collectHiddenIdentityTerms(adventureData?.entities);
    } catch {
        return [];
    }
}
