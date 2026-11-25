/**
 * Acciones del intérprete v2 (docs/nucleo-v2.md §3 ①).
 *
 * La IA solo elige entre listas cerradas de IDs. `resolveActionV2` comprueba que la combinación
 * tiene sentido; si no, la acción pasa a `clarify` en vez de adivinar. El intérprete no decide
 * reglas: `skill` dice qué habilidad describe el intento, la CD la pone el motor.
 */
import type { AdventureItem, CoreV2State } from './state';
import { accessibleItems, type ItemRuleContext } from './item-rules';
import { findTerm, unrevealedTerms } from './secrets';
import { buildContext } from './legacy-bridge';

export const ACTION_TYPES = ['move', 'take', 'give', 'use_item', 'talk', 'examine', 'attack', 'check', 'rest', 'clarify'] as const;
export const SKILLS = [
    'athletics', 'acrobatics', 'sleight_of_hand', 'stealth', 'arcana', 'history', 'investigation', 'nature', 'religion',
    'animal_handling', 'insight', 'medicine', 'perception', 'survival', 'deception', 'intimidation', 'performance', 'persuasion',
] as const;
/** Valor de la lista cerrada que significa "ninguno". */
export const NONE = 'none';
/** CD de una prueba sin datos en la aventura: dificultad media de las reglas oficiales (DMG). */
export const DEFAULT_CHECK_DC = 15;

export interface Option { id: string; label: string }

export interface ActionOptions {
    actors: Option[];
    entities: Option[];
    items: Option[];
    interactables: Option[];
    exits: Option[];
    defaultActorId: string;
}

/** Respuesta de la IA, aún sin comprobar. */
export interface RawActionV2 {
    type: string;
    actor?: string;
    target?: string;
    item?: string;
    recipient?: string;
    skill?: string;
    stealth?: boolean;
    clarification?: string;
}

export type ActionV2 =
    | { type: 'move'; actorId: string; destinationId: string; stealth: boolean }
    | { type: 'take' | 'use_item'; actorId: string; itemId: string; targetId?: string }
    | { type: 'give'; actorId: string; itemId: string; recipientId: string }
    | { type: 'talk'; actorId: string; targetId?: string }
    | { type: 'examine'; actorId: string; targetId?: string; itemId?: string }
    | { type: 'attack'; actorId: string; targetId: string }
    | { type: 'check'; actorId: string; skill: string; targetId?: string }
    | { type: 'rest'; actorId: string }
    | { type: 'clarify'; question?: string };

/** El núcleo v2 se aplica a aventuras con los datos del conversor nuevo. */
export function hasCoreV2Data(adventure: any): boolean {
    return !!(adventure?.scenes?.length || adventure?.items?.length);
}

export interface ActionOptionsInput {
    adventureData: any;
    /** Sala con su estado actual (conexiones, interactuables, objetos en el suelo). */
    location: any;
    party: any[];
    state: CoreV2State;
    flags: Record<string, any>;
    selectedCharacterId?: string;
    /** Entidades fuera de juego (derrotadas) que ya no cuentan como presentes. */
    absentEntityIds?: string[];
}

function holderLabel(item: AdventureItem, state: CoreV2State, party: any[], adventureData: any, terms: string[]): string {
    const holder = state.itemHolders[item.id];
    if (holder?.kind === 'character') return `lo lleva ${party.find(c => c.id === holder.id)?.name ?? 'el grupo'}`;
    if (holder?.kind === 'entity') {
        const name = adventureData?.entities?.find((e: any) => e.id === holder.id)?.name;
        return `lo tiene ${name && !findTerm(name, terms) ? name : 'una criatura'}`;
    }
    return 'en la sala';
}

/** Listas cerradas de lo que el grupo puede mencionar ahora. */
export function buildActionOptions(input: ActionOptionsInput): ActionOptions {
    const { adventureData, location, party, state, flags } = input;
    const terms = unrevealedTerms(adventureData?.entities, flags);
    const label = (text: string | undefined, fallback: string) => (text && !findTerm(text, terms) ? text : fallback);
    const ctx: ItemRuleContext = buildContext(adventureData, state, party, location?.id, flags);
    const absent = new Set(input.absentEntityIds || []);

    const entities = ctx.presentEntityIds.filter(id => !absent.has(id)).map(id => {
        const entity = adventureData?.entities?.find((e: any) => e.id === id);
        return { id, label: label(entity?.name, 'criatura desconocida') };
    });

    const items: Option[] = [];
    const add = (option: Option) => {
        if (option.id && !items.some(o => o.id === option.id)) items.push(option);
    };
    for (const item of accessibleItems(ctx)) {
        const known = state.identifiedItems.includes(item.id);
        const name = known ? label(item.name, 'objeto') : `${item.type || 'objeto'} sin identificar`;
        add({ id: item.id, label: `${name} (${holderLabel(item, state, party, adventureData, terms)})` });
    }
    for (const member of party) {
        for (const it of member.inventory || []) {
            add({ id: String(it.id ?? it.name ?? ''), label: `${it.name} (lo lleva ${member.name})` });
        }
    }
    for (const it of location?.droppedItems || []) add({ id: it.id, label: `${it.name} (en el suelo)` });

    const interactables = (location?.interactables || [])
        .filter((i: any) => i?.id)
        .map((i: any) => ({ id: i.id, label: label(i.name, 'objeto de la sala') }));

    const exits: Option[] = [];
    const addExit = (id: string | undefined, direction?: string) => {
        const target = id && adventureData?.locations?.find((l: any) => l.id === id);
        if (!target || id === location?.id || exits.some(e => e.id === id)) return;
        exits.push({ id: id!, label: `${label(target.name || target.title, 'salida')}${direction ? ` (${direction})` : ''}` });
    };
    for (const conn of location?.connections || []) addExit(conn.targetId, conn.direction);
    for (const exit of location?.exits || []) addExit(typeof exit === 'string' ? exit : exit?.toLocationId);
    if (location?.regionId) {
        for (const l of adventureData?.locations || []) if (l.regionId === location.regionId) addExit(l.id);
    }

    const able = party.filter(c => !c.isDead && (c.hp?.current ?? 1) > 0);
    const actors = (able.length ? able : party).map(c => ({ id: String(c.id), label: c.name }));
    const selected = actors.find(a => a.id === String(input.selectedCharacterId ?? '').trim());
    return { actors, entities, items, interactables, exits, defaultActorId: (selected || actors[0])?.id ?? '' };
}

function unique(ids: string[]): string[] {
    return [...new Set(ids)];
}

/** IDs que la IA puede elegir como objetivo de una acción. */
export function targetIds(o: ActionOptions): string[] {
    return unique([...o.entities, ...o.interactables, ...o.exits, ...o.actors].map(x => x.id));
}

export function recipientIds(o: ActionOptions): string[] {
    return unique([...o.actors, ...o.entities].map(x => x.id));
}

/** Comprueba la respuesta de la IA contra las listas cerradas. Nunca inventa: lo que no encaja, se pregunta. */
export function resolveActionV2(raw: RawActionV2 | null | undefined, o: ActionOptions): ActionV2 {
    const has = (list: Option[], id?: string) => !!id && list.some(x => x.id === id);
    const value = (id?: string) => (id && id !== NONE ? id : undefined);
    const question = raw?.type === 'clarify' ? raw.clarification?.trim() : undefined;
    const clarify: ActionV2 = { type: 'clarify', ...(question ? { question } : {}) };
    if (!raw) return clarify;

    const actorId = has(o.actors, raw.actor) ? raw.actor! : o.defaultActorId;
    const target = value(raw.target);
    const item = value(raw.item);
    const recipient = value(raw.recipient);
    // Una lista cerrada que el modelo se salta no se da por buena.
    if (target && !targetIds(o).includes(target)) return clarify;
    if (item && !has(o.items, item)) return clarify;
    if (recipient && !recipientIds(o).includes(recipient)) return clarify;

    switch (raw.type) {
        case 'move':
            return has(o.exits, target) ? { type: 'move', actorId, destinationId: target!, stealth: raw.stealth === true } : clarify;
        case 'take':
        case 'use_item':
            return item ? { type: raw.type, actorId, itemId: item, ...(target ? { targetId: target } : {}) } : clarify;
        case 'give':
            return item && recipient ? { type: 'give', actorId, itemId: item, recipientId: recipient } : clarify;
        case 'talk':
            // Hablarle a un objeto o a una salida es hablar al aire.
            return has(o.entities, target) || has(o.actors, target)
                ? { type: 'talk', actorId, targetId: target }
                : { type: 'talk', actorId };
        case 'examine':
            return { type: 'examine', actorId, ...(target ? { targetId: target } : {}), ...(item ? { itemId: item } : {}) };
        case 'attack':
            return has(o.entities, target) ? { type: 'attack', actorId, targetId: target! } : clarify;
        case 'check':
            return (SKILLS as readonly string[]).includes(raw.skill || '')
                ? { type: 'check', actorId, skill: raw.skill!, ...(target ? { targetId: target } : {}) }
                : clarify;
        case 'rest':
            return { type: 'rest', actorId };
        default:
            return clarify;
    }
}

/**
 * Traduce la acción v2 al formato que entienden los sistemas del núcleo actual. Es el único punto
 * de contacto: `coreV2Action` viaja dentro para que el turno sepa que viene del intérprete v2.
 */
export function toLegacyInterpretation(action: ActionV2, o: ActionOptions, items: { id: string }[] = []): any {
    if (action.type === 'clarify') {
        return { actionType: 'clarify', clarificationQuestion: action.question, coreV2Action: action };
    }
    const nameOf = (id?: string) => o.actors.find(a => a.id === id)?.label;
    const base = { coreV2Action: action, assignedCompanion: nameOf(action.actorId) ?? null, targetId: null as string | null };
    switch (action.type) {
        case 'move':
            return { ...base, actionType: 'move', targetId: action.destinationId, stealthIntent: action.stealth };
        case 'take':
            return { ...base, actionType: 'interact', targetId: action.itemId, objectIntent: 'take' };
        case 'use_item':
            return { ...base, actionType: 'interact', targetId: action.itemId, objectIntent: 'use' };
        case 'give':
            return { ...base, actionType: 'give', targetId: action.itemId, objectIntent: 'give', recipient: nameOf(action.recipientId) ?? action.recipientId };
        case 'talk':
            return action.targetId
                ? { ...base, actionType: 'interact', targetId: nameOf(action.targetId) ?? action.targetId }
                : { ...base, actionType: 'narrate' };
        case 'examine':
            if (action.itemId && items.some(i => i.id === action.itemId)) {
                return { ...base, actionType: 'interact', targetId: action.itemId, objectIntent: 'identify' };
            }
            // `other`: mirar no es conversar (no dispara `talked_to`).
            return action.targetId && !nameOf(action.targetId)
                ? { ...base, actionType: 'interact', targetId: action.targetId, objectIntent: 'other' }
                : { ...base, actionType: 'narrate' };
        case 'attack':
            return { ...base, actionType: 'attack', targetId: action.targetId };
        case 'check':
            return { ...base, actionType: 'skill_check', targetId: action.targetId ?? null, overrideSkill: action.skill, overrideDC: DEFAULT_CHECK_DC };
        case 'rest':
            return { ...base, actionType: 'rest' };
    }
}
