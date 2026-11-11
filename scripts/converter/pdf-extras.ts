/**
 * Pasadas del conversor PDF → JSON que recogen lo que la extracción general pierde
 * (núcleo v2, paso B; ver docs/nucleo-v2.md):
 *
 *  - Escenas: las indicaciones del PDF para el DM, traducidas sin resumir, con su página, un
 *    disparador que el motor evalúa sin IA y los flags que activan.
 *  - Objetos con mecánica: quién los tiene, cómo se identifican y activan, si piden tirada.
 *  - Bloques de estadísticas: los números reales del PDF para criaturas únicas.
 *  - Mapa: reparar las localizaciones a las que no se puede llegar.
 *
 * El PDF es la verdad absoluta: los prompts piden fidelidad, no resúmenes, y que las excepciones a
 * las reglas oficiales de 5e se marquen como tales. Ningún prompt contiene ejemplos de una aventura
 * concreta.
 */
import { z } from 'genkit';
import { checkAdventureContent, flagsSetByScenes, presenceFlags, reachableLocations } from '@/lib/adventure-loader/content-checks';

export type Generate = (options: any) => Promise<any>;

const EVENTS = [
    'adventure_start', 'entered_location', 'talked_to', 'attempted_leave',
    'entity_defeated', 'combat_ended', 'item_obtained', 'item_used', 'scene_started',
] as const;

const SimpleConditionSchema = z.object({
    flag: z.string().optional(),
    notFlag: z.string().optional(),
    atLocation: z.string().optional(),
    event: z.enum(EVENTS).optional(),
    target: z.string().optional(),
    afterTurns: z.number().optional(),
});
// Sin recursión: los modelos generan mejor un nivel de all/any que un árbol arbitrario.
const ConditionSchema = SimpleConditionSchema.extend({
    all: z.array(SimpleConditionSchema).optional(),
    any: z.array(SimpleConditionSchema).optional(),
});

const SourceSchema = z.object({ section: z.string(), page: z.number().optional() });

const CONDITION_HELP = `Vocabulario de disparadores (startsWhen). Todas las propiedades presentes deben cumplirse; "all" exige todas las subcondiciones y "any" al menos una:
- event: "adventure_start" (al empezar la partida), "entered_location" (target = ID de localización), "talked_to" (target = ID de entidad con la que el grupo habla y que le entiende), "attempted_leave" (target = ID de la localización que intentan abandonar), "entity_defeated" (target = ID de entidad), "combat_ended", "item_obtained" / "item_used" (target = ID de objeto), "scene_started" (target = ID de otra escena).
- flag / notFlag: un flag global activo / inactivo.
- atLocation: el grupo está en esa localización.
- afterTurns: turnos que deben pasar desde que se cumple el resto.
Usa SOLO los IDs de las listas que se te dan.`;

const pagesHelp = (fullText: string) => {
    const total = fullText.match(/-- \d+ of (\d+) --/)?.[1];
    return total
        ? `El texto incluye marcas "-- N of ${total} --" al FINAL de cada página: el texto anterior a la marca N es la página N.`
        : 'Si no hay marcas de página, omite "page".';
};

// ---------------------------------------------------------------------------
// Escenas
// ---------------------------------------------------------------------------

export async function extractScenes(
    generate: Generate,
    model: string,
    fullText: string,
    ctx: { locations: any[]; entities: any[]; flags: string[]; startingLocationId?: string },
): Promise<any[]> {
    console.log('\n🎬 Extrayendo escenas del PDF (indicaciones del DM y disparadores)...');
    const locs = ctx.locations.map(l => ({ id: l.id, name: l.name }));
    const ents = ctx.entities.map(e => ({ id: e.id, name: e.name }));

    const outlinePrompt = `Eres un DM experto en D&D 5e que convierte una aventura publicada a datos para un motor de juego.
El PDF de la aventura es la VERDAD ABSOLUTA: no inventes nada que no diga.

Divide la aventura en ESCENAS JUGABLES: cada momento de juego que el PDF describe con instrucciones para el DM (un encuentro, una llegada a un lugar, una conversación clave, una decisión, el desenlace). No crees escenas para bloques de estadísticas, créditos ni apartados puramente de trasfondo.

Para cada escena devuelve:
- id: kebab-case en español.
- title: título breve en español.
- sourceSection: el título de la sección del PDF de donde sale, COPIADO TAL CUAL del original (en su idioma).
- page: página del PDF. ${pagesHelp(fullText)}
- locationIds: IDs de las localizaciones donde ocurre.
- startsWhen: cuándo empieza, según el PDF, con el vocabulario de abajo.
- setFlags: flags de la lista de flags de presencia que esta escena debe activar para que aparezcan sus entidades.

REGLAS:
1. La primera escena empieza con event "adventure_start" en la localización inicial (${ctx.startingLocationId ?? 'la primera'}).
2. CADA flag de la lista de flags de presencia debe activarlo alguna escena (en setFlags). Si un flag hace aparecer a un antagonista, actívalo en la escena en la que el PDF dice que aparece.
3. Si el PDF dice que algo ocurre "poco después" de otra cosa, usa afterTurns: 1 o 2.
4. Si hay alternativas ("cuando X, o al intentar Y"), usa "any".
5. Usa como disparador el hecho CONCRETO que el PDF nombra: si una escena empieza cuando el grupo habla con alguien, entra en un lugar, derrota a alguien o usa un objeto, usa ese evento con su target (combinado con afterTurns si el PDF dice "poco después"), no "scene_started" de una escena anterior.
6. Cada flag de presencia hace aparecer a una entidad en UNA localización concreta: actívalo solo en la escena en la que el PDF dice que esa entidad aparece en ESA localización (si un PNJ huye a otra sala más tarde, el flag de esa otra sala va en la escena de la huida, no en la de su primer encuentro).

${CONDITION_HELP}

Localizaciones: ${JSON.stringify(locs)}
Entidades: ${JSON.stringify(ents)}
Flags de presencia: ${JSON.stringify(ctx.flags)}

Texto de la aventura:
${fullText}`;

    const outline = await generate({
        model,
        prompt: outlinePrompt,
        output: {
            schema: z.object({
                scenes: z.array(z.object({
                    id: z.string(),
                    title: z.string(),
                    sourceSection: z.string(),
                    page: z.number().optional(),
                    locationIds: z.array(z.string()).optional(),
                    startsWhen: ConditionSchema.optional(),
                    setFlags: z.array(z.string()).optional(),
                })),
            }),
        },
        config: { temperature: 0.1, maxOutputTokens: 6000 },
    });
    const scenes: any[] = outline.output?.scenes ?? [];
    console.log(`   ${scenes.length} escenas: ${scenes.map(s => s.id).join(', ')}`);

    const result: any[] = [];
    for (const s of scenes) {
        console.log(`   ✍️  Indicaciones del DM para "${s.title}" (${s.sourceSection}, p. ${s.page ?? '?'})...`);
        const guidancePrompt = `Traduce al español de España, de forma FIEL y COMPLETA, las indicaciones para el DM de la sección "${s.sourceSection}" de esta aventura de D&D 5e (y de los recuadros o apartados que el PDF asocia directamente a esa escena, como el "Roleplaying" del PNJ que aparece en ella).

NO resumas: conserva cada instrucción, reacción de los PNJ, frase que dicen, táctica, condición, CD, número y consecuencia. No añadas nada que no esté en el PDF. Si el PDF se aparta de las reglas oficiales de 5e en algo, dilo explícitamente ("Excepción de la aventura: ..."). Usa la terminología oficial de D&D 5e en español. Devuelve solo el texto traducido, en párrafos.

Texto de la aventura:
${fullText}`;
        const g = await generate({
            model,
            prompt: guidancePrompt,
            output: { schema: z.object({ guidance: z.string() }) },
            config: { temperature: 0.1, maxOutputTokens: 3000 },
        });
        const cond = s.startsWhen ?? {};
        const cleanCond = Object.fromEntries(Object.entries(cond).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)));
        result.push({
            id: s.id,
            title: s.title,
            source: { section: s.sourceSection, ...(s.page ? { page: s.page } : {}) },
            guidance: g.output?.guidance ?? '',
            ...(s.locationIds?.length ? { locationIds: s.locationIds } : {}),
            ...(Object.keys(cleanCond).length ? { startsWhen: cleanCond } : {}),
            ...(s.setFlags?.length ? { onStart: { setFlags: s.setFlags } } : {}),
        });
    }
    return result;
}

// ---------------------------------------------------------------------------
// Objetos con mecánica
// ---------------------------------------------------------------------------

export async function extractItems(
    generate: Generate,
    model: string,
    fullText: string,
    ctx: { locations: any[]; entities: any[] },
): Promise<any[]> {
    console.log('\n🎒 Extrayendo objetos clave y su mecánica...');
    const locs = ctx.locations.map(l => ({ id: l.id, name: l.name, interactables: (l.interactables ?? []).map((i: any) => i.id ?? i.name) }));
    const ents = ctx.entities.map(e => ({ id: e.id, name: e.name }));
    const prompt = `Eres un DM experto en D&D 5e que convierte una aventura publicada a datos para un motor de juego.
El PDF es la VERDAD ABSOLUTA. Extrae los OBJETOS relevantes para jugar (objetos mágicos, pergaminos, varitas, llaves, tesoros y objetos de la trama). No incluyas el equipo normal de los monstruos.

Para cada objeto:
- id (kebab-case en español), name y description (en español; lo que se ve a simple vista, sin secretos).
- type: "scroll", "wand", "potion", "key", "treasure", "weapon", "armor" u "other".
- spell: si contiene o lanza un conjuro, { id: nombre en inglés en snake_case, name: nombre oficial en español }.
- identification: cómo se sabe qué es. "label" si una etiqueta, sello o inscripción visible lo dice; "obvious" si es evidente; "check" si exige tirada (con skill y dc del PDF); "identify_spell" si hace falta el conjuro Identificar.
- activation: { method: "read_aloud" | "command_word" | "attunement" | "consume" | "other", checkRule, check, affects: "user" | "party" | "target" | "area" }.
  checkRule (OBLIGATORIO): "pdf_check" si el PDF exige una tirada para usarlo (y entonces check = { skill, dc } del PDF); "no_check" si el PDF dice que funciona sin tirada (p. ej. "basta con leerlo en voz alta"); "official_rules" si el PDF no dice nada al respecto.
- consumedOnUse, charges (texto del PDF), rulesText (reglas especiales del PDF en español, completas).
- startsWith: quién lo tiene o dónde está al empezar: { entityId } o { locationId, interactableId?, hidden: true si hay que buscarlo }.
- exception: true si el PDF se aparta de las reglas oficiales de 5e para este objeto.
- source: { section (título del PDF tal cual), page }. ${pagesHelp(fullText)}
Si el mismo tipo de objeto aparece en dos sitios distintos (p. ej. un segundo ejemplar), crea un objeto por ejemplar.

Localizaciones: ${JSON.stringify(locs)}
Entidades: ${JSON.stringify(ents)}

Texto de la aventura:
${fullText}`;
    const res = await generate({
        model,
        prompt,
        output: {
            schema: z.object({
                items: z.array(z.object({
                    id: z.string(),
                    name: z.string(),
                    description: z.string().optional(),
                    type: z.string().optional(),
                    spell: z.object({ id: z.string(), name: z.string() }).optional(),
                    identification: z.object({
                        method: z.enum(['obvious', 'label', 'check', 'identify_spell']),
                        check: z.object({ skill: z.string(), dc: z.number() }).optional(),
                    }).optional(),
                    activation: z.object({
                        method: z.enum(['read_aloud', 'command_word', 'attunement', 'consume', 'other']),
                        checkRule: z.enum(['pdf_check', 'no_check', 'official_rules']),
                        check: z.object({ skill: z.string(), dc: z.number() }).optional(),
                        affects: z.enum(['user', 'party', 'target', 'area']).optional(),
                    }).optional(),
                    consumedOnUse: z.boolean().optional(),
                    charges: z.string().optional(),
                    rulesText: z.string().optional(),
                    startsWith: z.object({
                        entityId: z.string().optional(),
                        locationId: z.string().optional(),
                        interactableId: z.string().optional(),
                        hidden: z.boolean().optional(),
                    }).optional(),
                    exception: z.boolean().optional(),
                    source: SourceSchema.optional(),
                })),
            }),
        },
        config: { temperature: 0.1, maxOutputTokens: 4000 },
    });
    const items = (res.output?.items ?? []).map(toGameItem);
    console.log(`   ${items.length} objetos: ${items.map((i: any) => i.id).join(', ')}`);
    return items;
}

/**
 * Del formato de extracción al del juego: en el juego `activation.check` vale `null` si el PDF
 * dice que no hace falta tirada, y se omite si se aplican las reglas oficiales.
 */
export function toGameItem(item: any): any {
    if (!item?.activation) return item;
    const { checkRule, check, ...activation } = item.activation;
    if (checkRule === 'no_check') activation.check = null;
    else if (checkRule === 'pdf_check' && check) activation.check = check;
    return { ...item, activation };
}

// ---------------------------------------------------------------------------
// Número de criaturas iguales por sala
// ---------------------------------------------------------------------------

/** Ajusta las copias de `entityId` en `entitiesPresent` a `count`, clonando la primera entrada. */
export function setCreatureCount(location: any, entityId: string, count: number): boolean {
    const list: any[] = location.entitiesPresent ?? [];
    const idOf = (e: any) => (typeof e === 'string' ? e : e?.entityId);
    const current = list.filter(e => idOf(e) === entityId);
    if (!current.length || count < 1 || count > 20 || current.length === count) return false;
    const others = list.filter(e => idOf(e) !== entityId);
    const copies = Array.from({ length: count }, () => JSON.parse(JSON.stringify(current[0])));
    location.entitiesPresent = [...others, ...copies];
    return true;
}

/**
 * La alineación de entidades a veces se equivoca en cuántas criaturas iguales hay ("tres simios"
 * → 2). Una pregunta concreta por cantidades es más fiable; solo se corrigen entidades ya presentes.
 */
export async function fixCreatureCounts(generate: Generate, model: string, fullText: string, data: any): Promise<string[]> {
    const placed = data.locations.flatMap((l: any) => [...new Set((l.entitiesPresent ?? [])
        .map((e: any) => (typeof e === 'string' ? e : e?.entityId)))].map(entityId => ({ locationId: l.id, entityId })));
    if (!placed.length) return [];
    const res = await generate({
        model,
        prompt: `Según el texto de esta aventura de D&D 5e (la VERDAD ABSOLUTA), ¿cuántos ejemplares de cada criatura hay en cada localización? Responde para CADA par de la lista con el número que dice el PDF (p. ej. "tres lobos" → 3; un PNJ único → 1).

Pares: ${JSON.stringify(placed)}

Texto de la aventura:
${fullText}`,
        output: { schema: z.object({ counts: z.array(z.object({ locationId: z.string(), entityId: z.string(), count: z.number() })) }) },
        config: { temperature: 0, maxOutputTokens: 1500 },
    });
    const changes: string[] = [];
    for (const c of res.output?.counts ?? []) {
        const loc = data.locations.find((l: any) => l.id === c.locationId);
        if (loc && setCreatureCount(loc, c.entityId, Math.round(c.count))) changes.push(`${c.entityId}@${c.locationId}=${Math.round(c.count)}`);
    }
    return changes;
}

// ---------------------------------------------------------------------------
// Barreras de comunicación: lo que el grupo no puede saber antes de superarlas (TASK-086)
// ---------------------------------------------------------------------------

/**
 * Para cada entidad con `roleplay.communicationBarrier`, los términos que el grupo NO puede conocer
 * mientras no supere la barrera, con el texto neutro por el que el narrador los sustituye.
 * Devuelve cuántas entidades se han completado.
 */
export async function extractHiddenIdentityTerms(
    generate: Generate,
    model: string,
    fullText: string,
    entities: any[],
): Promise<number> {
    const targets = entities.filter(e => e?.roleplay?.communicationBarrier && !e.roleplay.hiddenIdentityTerms?.length);
    if (!targets.length) return 0;
    console.log(`
🙊 Términos ocultos tras barreras de comunicación: ${targets.map(e => e.id).join(', ')}`);
    let done = 0;
    for (const ent of targets) {
        const prompt = `En esta aventura de D&D 5e, el grupo no puede comunicarse con "${ent.name}" hasta superar esta barrera: "${ent.roleplay.communicationBarrier}".
Mientras no la superen, los jugadores solo saben lo que perciben a simple vista. Según el PDF (la VERDAD ABSOLUTA), lista los términos que el grupo NO puede conocer todavía y que el narrador no debe revelar: el nombre verdadero de esta entidad (completo y CADA parte por separado: nombre y apellido), y los nombres propios de personas, lugares y objetos que solo esta entidad podría contarles.
NO incluyas lo que el grupo ya puede saber por lo que ve o lee (p. ej. lo que indica una etiqueta, inscripción o sello visible, o el objeto que la entidad lleva a la vista).
El narrador escribe en español: da cada término en español, tal como lo escribiría el narrador con la terminología oficial de D&D 5e, y además en inglés si el PDF lo nombra en inglés.
Para cada término da un reemplazo breve y neutro en español, desde lo que el grupo percibe (p. ej. "la criatura", "un desconocido", "un objeto mágico"), sin pistas que revelen el secreto.
No incluyas palabras comunes.

Texto de la aventura:
${fullText}`;
        const res = await generate({
            model,
            prompt,
            output: { schema: z.object({ terms: z.array(z.object({ term: z.string(), replacement: z.string() })) }) },
            config: { temperature: 0.1, maxOutputTokens: 1500 },
        });
        const raw = (res.output?.terms ?? []).filter((t: any) => t?.term?.trim() && t?.replacement?.trim());
        // El narrador escribe en español: se añade la forma española de cada término (traducir una
        // lista corta es más fiable que pedirlo dentro del prompt anterior).
        const tr = raw.length ? await generate({
            model,
            prompt: `Traduce al español de España cada uno de estos términos de una aventura de D&D 5e, con la terminología OFICIAL en español (objetos mágicos, conjuros, monstruos). Los nombres propios de personas no se traducen: devuélvelos igual.
${JSON.stringify(raw.map((t: any) => t.term))}`,
            output: { schema: z.object({ translations: z.array(z.object({ term: z.string(), spanish: z.string() })) }) },
            config: { temperature: 0, maxOutputTokens: 800 },
        }).catch(() => null) : null;
        const spanishOf = new Map<string, string>((tr?.output?.translations ?? []).map((t: any) => [t.term, t.spanish]));
        const seen = new Set<string>();
        const terms = raw
            .flatMap((t: any) => [t, { term: spanishOf.get(t.term) ?? '', replacement: t.replacement }])
            .filter((t: any) => {
                const key = t.term.trim().toLowerCase();
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            // Formas largas antes que las cortas, para que el reemplazo no deje restos ("Finethir" dentro de "Finethir Shinebright")
            .sort((a: any, b: any) => b.term.length - a.term.length);
        if (terms.length) {
            ent.roleplay.hiddenIdentityTerms = terms;
            done++;
            console.log(`   ${ent.id}: ${terms.map((t: any) => t.term).join(', ')}`);
        }
    }
    return done;
}

// ---------------------------------------------------------------------------
// Bloques de estadísticas
// ---------------------------------------------------------------------------

const ABILITY_KEYS = ['fuerza', 'destreza', 'constitución', 'inteligencia', 'sabiduría', 'carisma'] as const;

export async function extractStatBlocks(
    generate: Generate,
    model: string,
    fullText: string,
    entities: any[],
): Promise<Map<string, any>> {
    console.log('\n📊 Extrayendo los bloques de estadísticas del PDF...');
    const ents = entities.map(e => ({ id: e.id, name: e.name }));
    const prompt = `Extrae los BLOQUES DE ESTADÍSTICAS que el PDF de esta aventura de D&D 5e incluye completos (Armor Class, Hit Points, STR/DEX/CON/INT/WIS/CHA, acciones...). Solo los que estén en el PDF; no uses tu memoria del Manual de Monstruos.
Asocia cada bloque a la entidad de la lista que corresponda (entityId). Si el PDF dice que una entidad usa las estadísticas de un monstruo estándar (con o sin cambios), pon en baseCreature su nombre oficial en inglés del Manual de Monstruos tal como lo cita el PDF, y si modifica algunas puntuaciones devuelve solo esas en abilityScores y deja el resto vacío.
Las puntuaciones van como números (el PDF puede traer espacios dentro de los números por la maquetación: "1 6" es 16).
Si la entidad lanza conjuros, pon en spells TODOS los conjuros que el PDF le da, con su nombre en inglés tal cual aparece en el PDF (lo usa el motor para buscarlos en el compendio).
Traduce al español, con la terminología OFICIAL de D&D 5e en español (nombres de conjuros, armas y rasgos), los nombres y descripciones de las acciones y rasgos, con el formato "Ataque con arma cuerpo a cuerpo: +5 a impactar, alcance 5 pies, un objetivo. Impacto: 10 (2d6 + 3) de daño cortante.".

Entidades: ${JSON.stringify(ents)}

Texto de la aventura:
${fullText}`;
    const res = await generate({
        model,
        prompt,
        output: {
            schema: z.object({
                statBlocks: z.array(z.object({
                    entityId: z.string(),
                    baseCreature: z.string().optional(),
                    ac: z.number().optional(),
                    hp: z.number().optional(),
                    hitDice: z.string().optional(),
                    abilityScores: z.object({
                        fuerza: z.number().optional(), destreza: z.number().optional(), constitución: z.number().optional(),
                        inteligencia: z.number().optional(), sabiduría: z.number().optional(), carisma: z.number().optional(),
                    }).optional(),
                    actions: z.array(z.object({ name: z.string(), desc: z.string() })).optional(),
                    traits: z.array(z.object({ name: z.string(), desc: z.string() })).optional(),
                    spells: z.array(z.string()).optional(),
                })),
            }),
        },
        config: { temperature: 0, maxOutputTokens: 4000 },
    });
    const map = new Map<string, any>();
    for (const b of res.output?.statBlocks ?? []) map.set(b.entityId, b);
    console.log(`   ${map.size} bloques: ${[...map.keys()].join(', ')}`);
    return map;
}

/** Aplica un bloque de estadísticas del PDF sobre las estadísticas que ya tenga la entidad. */
export function applyStatBlock(stats: any, block: any): any {
    const out = JSON.parse(JSON.stringify(stats ?? {}));
    if (typeof block.ac === 'number') out.ac = block.ac;
    if (typeof block.hp === 'number') out.hp = block.hp;
    if (block.hitDice) out.hitDice = block.hitDice;
    out.abilityScores = out.abilityScores ?? {};
    out.abilityModifiers = out.abilityModifiers ?? {};
    for (const k of ABILITY_KEYS) {
        const v = block.abilityScores?.[k];
        if (typeof v === 'number') {
            out.abilityScores[k] = v;
            out.abilityModifiers[k] = Math.floor((v - 10) / 2);
        }
    }
    if (block.actions?.length) out.actions = block.actions;
    if (block.traits?.length) out.traits = block.traits;
    if (block.spells?.length) out.spells = block.spells;
    out.statsSource = 'pdf';
    return out;
}

// ---------------------------------------------------------------------------
// Mapa
// ---------------------------------------------------------------------------

/** Pide conexiones para las localizaciones a las que no se puede llegar desde la inicial. */
export async function repairUnreachableLocations(
    generate: Generate,
    model: string,
    fullText: string,
    data: any,
): Promise<number> {
    const reachable = reachableLocations(data);
    const unreachable = data.locations.filter((l: any) => !reachable.has(l.id));
    if (unreachable.length === 0) return 0;
    console.log(`\n🧭 Reparando el mapa: ${unreachable.length} localizaciones inalcanzables (${unreachable.map((l: any) => l.id).join(', ')})...`);
    const prompt = `En esta aventura de D&D, el grupo no puede llegar a algunas localizaciones porque faltan conexiones. Según el PDF (la verdad absoluta), indica qué conexiones faltan para que TODAS sean alcanzables desde la localización inicial.
Solo puedes usar los IDs de la lista. Indica dirección ("norte", "sur", "este", "oeste", "noreste", "noroeste", "sureste", "suroeste", "arriba", "abajo", "dentro", "fuera") y una descripción breve en español, sin spoilers. Si el PDF dice que un paso está cerrado o requiere algo (p. ej. una puerta cerrada con CD), indícalo en description.

Localización inicial: ${[...reachable][0] ?? ''}
Alcanzables hoy: ${JSON.stringify([...reachable])}
Inalcanzables: ${JSON.stringify(unreachable.map((l: any) => ({ id: l.id, name: l.name })))}
Todas: ${JSON.stringify(data.locations.map((l: any) => ({ id: l.id, name: l.name })))}

Texto de la aventura:
${fullText}`;
    const res = await generate({
        model,
        prompt,
        output: {
            schema: z.object({
                connections: z.array(z.object({
                    fromId: z.string(),
                    targetId: z.string(),
                    direction: z.string().optional(),
                    description: z.string().optional(),
                    travelTime: z.string().optional(),
                })),
            }),
        },
        config: { temperature: 0.1, maxOutputTokens: 3000 },
    });
    const byId = new Map<string, any>(data.locations.map((l: any) => [l.id, l]));
    let added = 0;
    for (const c of res.output?.connections ?? []) {
        const from = byId.get(c.fromId);
        if (!from || !byId.has(c.targetId) || c.fromId === c.targetId) continue;
        from.connections = from.connections ?? [];
        if (from.connections.some((x: any) => x.targetId === c.targetId)) continue;
        const { fromId: _f, ...conn } = c;
        from.connections.push(conn);
        added++;
    }
    return added;
}

/** Informe de contenido para la consola del conversor. */
export function reportContent(data: any): void {
    const issues = checkAdventureContent(data);
    const flags = presenceFlags(data);
    const set = flagsSetByScenes(data);
    console.log(`\n🔎 Comprobación de contenido: ${issues.length === 0 ? 'sin problemas' : `${issues.length} problema(s)`}`);
    console.log(`   Flags de presencia activados por escenas: ${[...flags].filter(f => set.has(f)).length}/${flags.size}`);
    for (const i of issues) console.log(`   ⚠️ [${i.code}] ${i.message}`);
}
