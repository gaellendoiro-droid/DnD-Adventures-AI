/**
 * IDs estables al regenerar una aventura (`--reuse-ids <aventura-anterior.json>`).
 *
 * Cada conversión con IA puede inventar IDs distintos para la misma sala o criatura, lo que rompe
 * partidas guardadas y escenarios de prueba. Si una localización o entidad nueva tiene el mismo
 * nombre (normalizado) que una de la versión anterior, recupera su ID en todas las referencias.
 */

const norm = (text: unknown) => String(text ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const STOPWORDS = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'en', 'a', 'al', 'o', 'y', 'e', 'un', 'una', 'the', 'of', 'and', 'or']);
const words = (text: unknown) => new Set(norm(text).split(' ').filter(w => w && !STOPWORDS.has(w)));

/**
 * Parecido entre dos nombres por palabras significativas: 1 si las de uno están todas en el otro
 * ("Plataforma Central" ⊂ "La Casa en el Bosque (Plataforma Central)"; "Pueblo o Ciudad" =
 * "Ciudad o Pueblo"). El Jaccard desempata a favor del más parecido en conjunto.
 */
function similarity(a: unknown, b: unknown): number {
    const A = words(a), B = words(b);
    if (!A.size || !B.size) return 0;
    const common = [...A].filter(w => B.has(w)).length;
    return common / Math.min(A.size, B.size) + 0.01 * (common / new Set([...A, ...B]).size);
}

function buildRenames(current: any[], previous: any[]): Map<string, string> {
    const prevIds = new Set((previous ?? []).map((p: any) => p.id));
    const taken = new Set((current ?? []).map((c: any) => c.id));
    const pending = (current ?? []).filter((c: any) => c?.id && !prevIds.has(c.id));
    const candidates: { from: string; to: string; score: number }[] = [];
    for (const c of pending) {
        for (const p of previous ?? []) {
            if (!p?.id || taken.has(p.id)) continue;
            const score = Math.max(similarity(c.name, p.name), similarity(c.id.replace(/-/g, ' '), p.id.replace(/-/g, ' ')));
            if (score >= 1) candidates.push({ from: c.id, to: p.id, score });
        }
    }
    // Asignación voraz: primero las parejas más parecidas; cada ID nuevo y anterior se usa una vez.
    candidates.sort((x, y) => y.score - x.score);
    const renames = new Map<string, string>();
    const used = new Set<string>();
    for (const { from, to } of candidates) {
        if (renames.has(from) || used.has(to)) continue;
        renames.set(from, to);
        used.add(to);
    }
    return renames;
}

/** Renombra en el sitio y devuelve la lista "nuevo → anterior" aplicada. */
export function remapIdsFromPrevious(data: any, previous: any): string[] {
    const locRenames = buildRenames(data.locations, previous.locations);
    const entRenames = buildRenames(data.entities, previous.entities);
    const loc = (id: string) => locRenames.get(id) ?? id;
    const ent = (id: string) => entRenames.get(id) ?? id;

    for (const l of data.locations ?? []) {
        l.id = loc(l.id);
        for (const c of l.connections ?? []) c.targetId = loc(c.targetId);
        l.entitiesPresent = (l.entitiesPresent ?? []).map((e: any) =>
            typeof e === 'string' ? ent(e) : { ...e, entityId: ent(e.entityId) });
        for (const c of l.connections ?? []) {
            if (c.combatTrigger?.triggeringEntityIds) {
                c.combatTrigger.triggeringEntityIds = c.combatTrigger.triggeringEntityIds.map(ent);
            }
        }
    }
    for (const e of data.entities ?? []) e.id = ent(e.id);
    if (data.settings?.startingLocationId) data.settings.startingLocationId = loc(data.settings.startingLocationId);

    return [
        ...[...locRenames].map(([a, b]) => `${a} → ${b}`),
        ...[...entRenames].map(([a, b]) => `${a} → ${b}`),
    ];
}

/**
 * Las pasadas de objetos y escenas a veces citan una entidad o sala con un ID abreviado
 * ("noke" por "ahmed-noke-mago-humano"). Si el ID no existe y exactamente un ID existente del
 * mismo tipo lo contiene como palabra, se sustituye. Devuelve la lista "abreviado → completo".
 */
export function resolveShortIds(data: any): string[] {
    const idsOf = (list: any[] | undefined) => (list ?? []).map((x: any) => x?.id).filter(Boolean) as string[];
    const byKind = {
        location: idsOf(data.locations),
        entity: idsOf(data.entities),
        item: idsOf(data.items),
        scene: idsOf(data.scenes),
    };
    type Kind = keyof typeof byKind;
    const applied = new Map<string, string>();
    const resolve = (id: unknown, kind: Kind) => {
        const ids = byKind[kind];
        if (typeof id !== 'string' || !id || ids.includes(id)) return id;
        let matches = ids.filter(full => `-${full}-`.includes(`-${id}-`));
        // Mismas palabras significativas ("pergamino-hablar-con-animales" = "pergamino-de-hablar-con-animales")
        if (matches.length === 0) matches = ids.filter(full => similarity(full.replace(/-/g, ' '), id.replace(/-/g, ' ')) >= 1 && words(full.replace(/-/g, ' ')).size === words(id.replace(/-/g, ' ')).size);
        if (matches.length !== 1) return id;
        applied.set(id, matches[0]);
        return matches[0];
    };
    const targetKind: Record<string, Kind> = {
        entered_location: 'location', attempted_leave: 'location',
        talked_to: 'entity', entity_defeated: 'entity',
        item_obtained: 'item', item_used: 'item',
        scene_started: 'scene',
    };
    const walkCondition = (c: any) => {
        if (!c || typeof c !== 'object') return;
        const kind = targetKind[c.event];
        if (kind && 'target' in c) c.target = resolve(c.target, kind);
        if ('atLocation' in c) c.atLocation = resolve(c.atLocation, 'location');
        for (const sub of [...(c.all ?? []), ...(c.any ?? [])]) walkCondition(sub);
    };
    for (const s of data.scenes ?? []) {
        walkCondition(s.startsWhen);
        if (s.locationIds) s.locationIds = s.locationIds.map((id: string) => resolve(id, 'location'));
    }
    for (const it of data.items ?? []) {
        const sw = it.startsWith;
        if (!sw) continue;
        if (sw.entityId) sw.entityId = resolve(sw.entityId, 'entity');
        if (sw.locationId) sw.locationId = resolve(sw.locationId, 'location');
    }
    return [...applied].map(([a, b]) => `${a} → ${b}`);
}
