/**
 * Paquete de hechos v2 (docs/nucleo-v2.md §3 ③): lo único que ve el narrador. Código puro.
 *
 * Todo lo secreto se filtra AQUÍ: lo que no debe contarse no llega al modelo.
 */
import { displayName } from './legacy-bridge';
import type { CoreV2Fact } from './facts';
import type { AdventureItem, CoreV2State } from './state';
import type { ActionV2 } from './actions';
import { dropParagraphsWith, dropSentencesWith, findTerm, isBarrierUp, unrevealedTerms } from './secrets';

export interface PacketEntity {
    name: string;
    count: number;
    description?: string;
    canCommunicate: boolean;
    roleplay?: { personality?: string; voice?: string; goals?: string; knows?: string[] };
}

export interface FactPacket {
    playerText: string;
    actorName: string;
    /** Hechos de este turno, en orden y en lenguaje llano (sin CD). */
    facts: string[];
    /** Reglas especiales de los objetos usados este turno, según la aventura. */
    rules: string[];
    location: { name: string; description: string; exits: string[]; interactables: string[]; droppedItems: string[] };
    entities: PacketEntity[];
    partyItems: string[];
    activeEffects: string[];
    scene?: { title: string; guidance: string };
    /** Compañeros que pueden reaccionar. */
    companions: { id: string; name: string; personality?: string }[];
    /** El jugador habla con este compañero: tiene que contestar. */
    addressedCompanion?: string;
    history: string;
    /** Términos que no pueden aparecer en la narración. */
    forbiddenTerms: string[];
}

export interface FactPacketInput {
    playerText: string;
    action?: ActionV2;
    adventureData: any;
    location: any;
    party: any[];
    state: CoreV2State;
    flags: Record<string, any>;
    presentEntityIds: string[];
    facts: CoreV2Fact[];
    /** Eventos del despachador del núcleo actual. */
    events: any[];
    /** Aviso de un sistema actual sin hecho propio (p. ej. "está cerrada con llave"). */
    systemFeedback?: string;
    activeScene?: any;
    activeEffects?: string[];
    history: string;
    selectedCharacterName?: string;
    maxGuidanceChars?: number;
    maxHistoryChars?: number;
}

const STAT_BLOCK = /Clase de Armadura|Puntos de Golpe|Armor Class|Hit Points/i;

/** Indicaciones de la escena sin fichas de combate ni pasajes secretos, recortadas por párrafos. */
export function sceneGuidance(guidance: string | undefined, terms: string[], maxChars = 12000): string {
    const paragraphs = (guidance || '').split(/\n\s*\n/).map(p => p.trim()).filter(p => p && !STAT_BLOCK.test(p));
    const kept: string[] = [];
    let size = 0;
    for (const p of dropParagraphsWith(paragraphs, terms)) {
        if (size + p.length > maxChars) break;
        kept.push(p);
        size += p.length + 2;
    }
    return kept.join('\n\n');
}

/** Últimos mensajes, recortados por código en límites de línea. */
export function trimHistory(history: string, maxChars = 2500): string {
    if (history.length <= maxChars) return history;
    const tail = history.slice(-maxChars);
    const cut = tail.indexOf('\n');
    return cut >= 0 ? tail.slice(cut + 1) : tail;
}

const UNUSABLE: Record<string, string> = {
    spell_not_on_class_list: 'el conjuro no es de su clase y el texto le resulta ininteligible',
    already_consumed: 'ya se gastó',
    not_accessible: 'no está a su alcance',
    needs_rest_or_identify: 'hace falta un descanso corto estudiándolo o el conjuro Identificar para saber qué es',
};

const SKILL_NAMES: Record<string, string> = {
    athletics: 'Atletismo', acrobatics: 'Acrobacias', sleight_of_hand: 'Juego de Manos', stealth: 'Sigilo', arcana: 'Arcanos',
    history: 'Historia', investigation: 'Investigación', nature: 'Naturaleza', religion: 'Religión',
    animal_handling: 'Trato con Animales', insight: 'Perspicacia', medicine: 'Medicina', perception: 'Percepción',
    survival: 'Supervivencia', deception: 'Engaño', intimidation: 'Intimidación', performance: 'Interpretación',
    persuasion: 'Persuasión', strength: 'Fuerza', dexterity: 'Destreza', constitution: 'Constitución',
    intelligence: 'Inteligencia', wisdom: 'Sabiduría', charisma: 'Carisma',
};

function describe(input: FactPacketInput): { facts: string[]; rules: string[] } {
    const { adventureData, party, state } = input;
    const items: AdventureItem[] = adventureData?.items || [];
    const item = (id: string) => items.find(i => i.id === id);
    const itemName = (id: string) => {
        const it = item(id);
        return it ? displayName(it, state.identifiedItems.includes(id)) : 'el objeto';
    };
    const who = (id?: string) =>
        party.find(c => c.id === id)?.name || adventureData?.entities?.find((e: any) => e.id === id)?.name || 'alguien';
    const place = (id: string) => {
        const l = adventureData?.locations?.find((x: any) => x.id === id);
        return l?.name || l?.title || 'otro lugar';
    };
    const skill = (s: string) => SKILL_NAMES[s] || s;
    const facts: string[] = [];
    const rules: string[] = [];

    for (const fact of input.facts) {
        switch (fact.type) {
            case 'ItemTransferred':
                facts.push(fact.from.kind === 'entity' || fact.from.kind === 'character'
                    ? `${who(fact.from.id)} tenía ${itemName(fact.itemId)}; ahora lo tiene ${who(fact.to.id)}.`
                    : `${who(fact.to.id)} coge ${itemName(fact.itemId)}.`);
                break;
            case 'ItemIdentified':
                facts.push(`El grupo sabe qué es: ${itemName(fact.itemId)}.`);
                break;
            case 'CheckRolled':
                facts.push(`${who(fact.actorId)} ${fact.success ? 'SUPERA' : 'NO supera'} una prueba de ${skill(fact.name)} con ${itemName(fact.itemId)}.`);
                break;
            case 'ItemUsed': {
                const it = item(fact.itemId);
                facts.push(`${who(fact.actorId)} ${it?.activation?.method === 'read_aloud' ? 'lee en voz alta' : 'usa'} ${itemName(fact.itemId)}.`);
                if (it?.rulesText) rules.push(it.rulesText);
                break;
            }
            case 'SpellActivated':
                facts.push(`El conjuro ${item(fact.itemId)?.spell?.name || 'del objeto'} se activa para ${fact.affects === 'party' ? 'todo el grupo' : who(fact.actorId)}.`);
                break;
            case 'ItemConsumed':
                facts.push(`${itemName(fact.itemId)} se consume.`);
                break;
            case 'ItemUnusable':
                facts.push(`${who(fact.actorId)} no puede usar ${itemName(fact.itemId)}: ${UNUSABLE[fact.reason]}.`);
                break;
            default:
                break; // Las pruebas pendientes llegan resueltas; las escenas, por sus indicaciones.
        }
    }

    for (const e of input.events) {
        const p = e.payload || {};
        switch (e.type) {
            case 'PlayerMoved': facts.push(`El grupo llega a ${place(p.toLocationId)}.`); break;
            case 'MoveFailed': facts.push(`El grupo NO cambia de lugar: ${p.reason}`); break;
            case 'DoorOpened': facts.push(`Se abre la puerta hacia ${p.direction}.`); break;
            case 'DoorClosed': facts.push(`Se cierra la puerta hacia ${p.direction}.`); break;
            case 'SkillCheckResolved': facts.push(`${p.characterName} ${p.isSuccess ? 'SUPERA' : 'NO supera'} una prueba de ${skill(p.skill)}.`); break;
            case 'ItemCollected':
                // Los objetos con mecánica ya tienen su hecho `ItemTransferred`.
                if (!items.some(i => i.id === p.itemId)) facts.push(`${p.characterName} coge ${p.itemName}.`);
                break;
            case 'DamageApplied': facts.push(`${p.targetName} recibe ${p.amount} puntos de daño.`); break;
            case 'HealApplied': facts.push(`${p.targetName} recupera ${p.amount} puntos de vida.`); break;
            case 'TrapTriggered': facts.push('Se activa una trampa.'); break;
            default: break;
        }
    }
    // El texto de los sistemas actuales solo se usa si no hay nada mejor, y nunca con CD.
    if (!facts.length && input.systemFeedback) {
        facts.push(input.systemFeedback.replace(/\s*\(?\b(?:CD|DC)\s*\d+\)?/gi, ''));
    }
    return { facts, rules };
}

function refCount(location: any, id: string): number {
    const refs = (location?.entitiesPresent || []).filter((r: any) => (typeof r === 'string' ? r : r?.entityId ?? r?.id) === id);
    return Math.max(1, refs.length);
}

export function buildFactPacket(input: FactPacketInput): FactPacket {
    const { adventureData, location, party, flags } = input;
    const terms = unrevealedTerms(adventureData?.entities, flags);
    const clean = (t?: string) => dropSentencesWith(t, terms);
    const safeName = (t: string | undefined, fallback: string) => (t && !findTerm(t, terms) ? t : fallback);

    const entities: PacketEntity[] = [];
    for (const id of input.presentEntityIds) {
        const entity = adventureData?.entities?.find((e: any) => e.id === id);
        if (!entity) continue;
        const canCommunicate = !isBarrierUp(entity, flags);
        const rp = entity.roleplay;
        entities.push({
            name: safeName(entity.name, 'Una criatura desconocida'),
            count: refCount(location, id),
            description: clean(entity.description) || undefined,
            canCommunicate,
            ...(canCommunicate && rp ? {
                roleplay: {
                    personality: clean(rp.personality) || undefined,
                    voice: clean(rp.voiceAndMannerisms) || undefined,
                    goals: clean(rp.goals) || undefined,
                    knows: (rp.secretsKnown || []).filter((s: string) => !findTerm(s, terms)),
                },
            } : {}),
        });
    }

    const actorId = input.action && 'actorId' in input.action ? input.action.actorId : undefined;
    const actorName = party.find(c => c.id === actorId)?.name || input.selectedCharacterName || party[0]?.name || 'El grupo';
    const companions = party
        .filter(c => c.controlledBy === 'AI' && !c.isDead && (c.hp?.current ?? 1) > 0 && c.name !== input.selectedCharacterName)
        .map(c => ({ id: String(c.id), name: c.name, personality: c.personality }));
    const talkTarget = input.action?.type === 'talk' ? input.action.targetId : undefined;
    const addressed = companions.find(c => c.id === talkTarget);

    const locationName = (id: string) => {
        const l = adventureData?.locations?.find((x: any) => x.id === id);
        return safeName(l?.name || l?.title, 'un lugar desconocido');
    };
    const described = describe(input);

    return {
        playerText: input.playerText,
        actorName,
        facts: described.facts.map(clean).filter(Boolean),
        rules: described.rules.map(clean).filter(Boolean),
        location: {
            name: safeName(location?.name || location?.title, 'Este lugar'),
            description: clean(location?.description),
            exits: (location?.connections || [])
                .filter((c: any) => c.targetId)
                .map((c: any) => `${locationName(c.targetId)}${c.direction ? ` (${c.direction})` : ''}`),
            interactables: (location?.interactables || [])
                .map((i: any) => [safeName(i.name, ''), clean(i.description)].filter(Boolean).join(': '))
                .filter(Boolean),
            droppedItems: (location?.droppedItems || []).map((i: any) => safeName(i.name, 'un objeto')),
        },
        entities,
        partyItems: party.flatMap(c => (c.inventory || [])
            .filter((i: any) => (adventureData?.items || []).some((x: any) => x.id === i.id))
            .map((i: any) => `${c.name}: ${safeName(i.name, 'un objeto')}`)),
        activeEffects: input.activeEffects || [],
        ...(input.activeScene ? {
            scene: {
                title: safeName(input.activeScene.title, 'Escena actual'),
                guidance: sceneGuidance(input.activeScene.guidance, terms, input.maxGuidanceChars),
            },
        } : {}),
        companions,
        ...(addressed ? { addressedCompanion: addressed.name } : {}),
        history: trimHistory(input.history, input.maxHistoryChars),
        forbiddenTerms: terms,
    };
}

/** Texto del paquete para el prompt del narrador. */
export function renderFactPacket(p: FactPacket): string {
    const list = (xs: string[]) => xs.map(x => `- ${x}`).join('\n');
    const parts: string[] = [];
    if (p.scene?.guidance) parts.push(`## Indicaciones de la aventura para esta escena: ${p.scene.title}\n${p.scene.guidance}`);
    parts.push(`## Lugar: ${p.location.name}\n${p.location.description}`);
    if (p.location.exits.length) parts.push(`Salidas:\n${list(p.location.exits)}`);
    if (p.location.interactables.length) parts.push(`A la vista:\n${list(p.location.interactables)}`);
    if (p.location.droppedItems.length) parts.push(`En el suelo:\n${list(p.location.droppedItems)}`);
    const present = p.entities.map(e => {
        const out = [`- ${e.name}${e.count > 1 ? ` (×${e.count})` : ''}: ${e.description || ''}`];
        if (!e.canCommunicate) out.push('  NO puede hablar ni hacerse entender con palabras: solo sonidos de su especie y gestos.');
        if (e.roleplay?.personality) out.push(`  Personalidad: ${e.roleplay.personality}`);
        if (e.roleplay?.voice) out.push(`  Voz: ${e.roleplay.voice}`);
        if (e.roleplay?.goals) out.push(`  Objetivos: ${e.roleplay.goals}`);
        if (e.roleplay?.knows?.length) out.push(`  Sabe (lo cuenta solo si viene al caso): ${e.roleplay.knows.join(' ')}`);
        return out.join('\n');
    });
    parts.push(`## Presentes (nadie más está aquí)\n${present.length ? present.join('\n') : '- Solo el grupo.'}`);
    if (p.partyItems.length) parts.push(`Objetos especiales del grupo:\n${list(p.partyItems)}`);
    if (p.activeEffects.length) parts.push(`Efectos activos: ${p.activeEffects.join(', ')}`);
    if (p.companions.length) {
        parts.push(`## Compañeros que pueden reaccionar\n${list(p.companions.map(c => `${c.name} (id ${c.id}): ${c.personality || ''}`))}`);
    }
    if (p.history) parts.push(`## Últimos mensajes\n${p.history}`);
    parts.push(`## Turno actual\nActúa ${p.actorName}. El jugador escribe: «${p.playerText}»`);
    parts.push(`## Hechos de este turno (ya resueltos)\n${p.facts.length
        ? list(p.facts)
        : '- Ningún cambio de estado: solo la acción del jugador y la respuesta del entorno.'}`);
    if (p.rules.length) parts.push(`Reglas de la aventura que se han aplicado:\n${list(p.rules)}`);
    if (p.addressedCompanion) {
        parts.push(`El jugador habla con ${p.addressedCompanion}: su respuesta va en "reactions" y la narración puede quedar vacía.`);
    }
    return parts.join('\n\n');
}
