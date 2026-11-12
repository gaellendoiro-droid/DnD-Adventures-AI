/**
 * Objetos con mecánica v2 (TASK-080): coger, dar, identificar y usar los `items[]` de la aventura.
 *
 * Por defecto se aplican las reglas oficiales de 5e. Lo que el PDF establece distinto viene en los
 * datos del objeto:
 * - `activation.check === null`  → se activa sin tirada (excepción del PDF).
 * - `activation.check` con valor → esa prueba, tal como la da el PDF.
 * - `activation.check` ausente   → reglas oficiales (pergamino de conjuro: ver spell-rules.ts).
 * - `identification.method` obvious/label → el grupo sabe qué es sin tirada.
 *
 * Funciones puras: reciben el estado v2 y devuelven uno nuevo más la lista de hechos.
 */
import type { CheckRequirement, CoreV2Fact } from './facts';
import type { AdventureItem, CoreV2State, ItemHolder } from './state';
import { getSpellInfo, maxSpellLevel, normalizeClass, spellcastingAbility, type AbilityId } from './spell-rules';

export interface ItemActor {
    id: string;
    name?: string;
    characterClass?: string;
    level?: number;
}

export interface ItemRuleContext {
    items: AdventureItem[];
    state: CoreV2State;
    /** IDs de los personajes del grupo. */
    partyIds: string[];
    locationId: string;
    /** Entidades presentes en la sala (pueden dar o recibir objetos). */
    presentEntityIds: string[];
}

export type ItemOutcome = 'done' | 'check_required' | 'blocked' | 'unsupported';

export interface ItemRuleResult {
    state: CoreV2State;
    facts: CoreV2Fact[];
    outcome: ItemOutcome;
    check?: CheckRequirement;
}

export type ActivationRule =
    | { kind: 'free'; source: 'adventure' | 'official_rules' }
    | { kind: 'check'; check: CheckRequirement }
    | { kind: 'unusable'; reason: 'spell_not_on_class_list' }
    | { kind: 'unsupported' };

export type IdentificationRule =
    | { kind: 'known' }
    | { kind: 'check'; check: CheckRequirement }
    | { kind: 'needs_rest_or_identify' };

const ABILITY_ALIASES: Record<string, AbilityId> = {
    strength: 'strength', str: 'strength', fuerza: 'strength',
    dexterity: 'dexterity', dex: 'dexterity', destreza: 'dexterity',
    constitution: 'constitution', con: 'constitution', constitucion: 'constitution',
    intelligence: 'intelligence', int: 'intelligence', inteligencia: 'intelligence',
    wisdom: 'wisdom', wis: 'wisdom', sabiduria: 'wisdom',
    charisma: 'charisma', cha: 'charisma', carisma: 'charisma',
};

function normalizeKey(text: string): string {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/** Convierte la prueba de los datos (`{ skill: "Arcana", dc: 15 }`) en una prueba del motor. */
export function toCheckRequirement(raw: { skill: string; dc: number }, source: CheckRequirement['source']): CheckRequirement {
    const key = normalizeKey(raw.skill);
    const ability = ABILITY_ALIASES[key];
    if (ability) return { kind: 'ability', name: ability, dc: raw.dc, source };
    const SKILL_ALIASES: Record<string, string> = { arcanos: 'arcana', arcano: 'arcana', historia: 'history', investigacion: 'investigation', naturaleza: 'nature', religion: 'religion', percepcion: 'perception' };
    return { kind: 'skill', name: SKILL_ALIASES[key] || key, dc: raw.dc, source };
}

/** Qué hace falta para activar el objeto, según los datos o las reglas oficiales. */
export function activationRule(item: AdventureItem, actor: ItemActor): ActivationRule {
    const check = item.activation?.check;
    if (check === null) return { kind: 'free', source: 'adventure' };
    if (check) return { kind: 'check', check: toCheckRequirement(check, 'adventure') };

    // Reglas oficiales: pergamino de conjuro.
    if (item.type === 'scroll' && item.spell) {
        const spell = getSpellInfo(item.spell.id);
        if (!spell) return { kind: 'unsupported' };
        const classId = normalizeClass(actor.characterClass);
        if (!classId || !spell.classes.includes(classId)) return { kind: 'unusable', reason: 'spell_not_on_class_list' };
        if (spell.level > maxSpellLevel(classId, actor.level ?? 1)) {
            const ability = spellcastingAbility(classId) || 'intelligence';
            return { kind: 'check', check: { kind: 'ability', name: ability, dc: 10 + spell.level, source: 'official_rules' } };
        }
        return { kind: 'free', source: 'official_rules' };
    }
    return { kind: 'free', source: 'official_rules' };
}

/** Qué hace falta para saber qué es el objeto. */
export function identificationRule(item: AdventureItem, state: CoreV2State): IdentificationRule {
    if (state.identifiedItems.includes(item.id)) return { kind: 'known' };
    const id = item.identification;
    if (id?.method === 'obvious' || id?.method === 'label') return { kind: 'known' };
    if (id?.method === 'check' && id.check) return { kind: 'check', check: toCheckRequirement(id.check, 'adventure') };
    // identify_spell, o sin datos: reglas oficiales (descanso corto concentrado en el objeto o conjuro Identificar).
    return { kind: 'needs_rest_or_identify' };
}

function cloneState(state: CoreV2State): CoreV2State {
    return {
        ...state,
        startedScenes: { ...state.startedScenes },
        latches: { ...state.latches },
        itemHolders: { ...state.itemHolders },
        identifiedItems: [...state.identifiedItems],
    };
}

function findItem(ctx: ItemRuleContext, itemId: string): AdventureItem | undefined {
    return ctx.items.find(item => item.id === itemId);
}

/** ¿Puede el grupo alcanzar el objeto ahora? */
export function isAccessible(ctx: ItemRuleContext, itemId: string): boolean {
    const holder = ctx.state.itemHolders[itemId];
    if (!holder) return false;
    switch (holder.kind) {
        case 'character': return !!holder.id && ctx.partyIds.includes(holder.id);
        case 'entity': return !!holder.id && ctx.presentEntityIds.includes(holder.id);
        case 'location': return holder.id === ctx.locationId && !holder.hidden;
        default: return false;
    }
}

/** Objetos con mecánica que el grupo puede alcanzar ahora. */
export function accessibleItems(ctx: ItemRuleContext): AdventureItem[] {
    return ctx.items.filter(item => isAccessible(ctx, item.id));
}

function moveItem(state: CoreV2State, facts: CoreV2Fact[], itemId: string, to: ItemHolder): void {
    const from = state.itemHolders[itemId] || { kind: 'unplaced' };
    if (from.kind === to.kind && from.id === to.id) return;
    state.itemHolders[itemId] = to;
    facts.push({ type: 'ItemTransferred', itemId, from, to });
}

function markIdentified(state: CoreV2State, facts: CoreV2Fact[], itemId: string, by?: string): void {
    if (state.identifiedItems.includes(itemId)) return;
    state.identifiedItems.push(itemId);
    facts.push({ type: 'ItemIdentified', itemId, ...(by ? { by } : {}) });
}

function blocked(ctx: ItemRuleContext, itemId: string, actorId: string, reason: Extract<CoreV2Fact, { type: 'ItemUnusable' }>['reason']): ItemRuleResult {
    return { state: ctx.state, facts: [{ type: 'ItemUnusable', itemId, actorId, reason }], outcome: 'blocked' };
}

/** Un personaje coge el objeto (de la sala, de una entidad presente o de un compañero). */
export function takeItem(ctx: ItemRuleContext, itemId: string, actor: ItemActor): ItemRuleResult {
    if (!findItem(ctx, itemId)) return { state: ctx.state, facts: [], outcome: 'unsupported' };
    if (!isAccessible(ctx, itemId)) return blocked(ctx, itemId, actor.id, 'not_accessible');
    const state = cloneState(ctx.state);
    const facts: CoreV2Fact[] = [];
    moveItem(state, facts, itemId, { kind: 'character', id: actor.id });
    return { state, facts, outcome: 'done' };
}

/** Un personaje da el objeto a otro personaje o a una entidad presente. */
export function giveItem(ctx: ItemRuleContext, itemId: string, actor: ItemActor, recipientId: string): ItemRuleResult {
    if (!findItem(ctx, itemId)) return { state: ctx.state, facts: [], outcome: 'unsupported' };
    if (!isAccessible(ctx, itemId)) return blocked(ctx, itemId, actor.id, 'not_accessible');
    const to: ItemHolder | undefined = ctx.partyIds.includes(recipientId)
        ? { kind: 'character', id: recipientId }
        : ctx.presentEntityIds.includes(recipientId) ? { kind: 'entity', id: recipientId } : undefined;
    if (!to) return { state: ctx.state, facts: [], outcome: 'unsupported' };
    const state = cloneState(ctx.state);
    const facts: CoreV2Fact[] = [];
    moveItem(state, facts, itemId, to);
    return { state, facts, outcome: 'done' };
}

/** Un personaje intenta averiguar qué es el objeto. */
export function identifyItem(ctx: ItemRuleContext, itemId: string, actor: ItemActor): ItemRuleResult {
    const item = findItem(ctx, itemId);
    if (!item) return { state: ctx.state, facts: [], outcome: 'unsupported' };
    if (!isAccessible(ctx, itemId)) return blocked(ctx, itemId, actor.id, 'not_accessible');
    const rule = identificationRule(item, ctx.state);
    if (rule.kind === 'known') {
        const state = cloneState(ctx.state);
        const facts: CoreV2Fact[] = [];
        markIdentified(state, facts, itemId, actor.id);
        return { state, facts, outcome: 'done' };
    }
    if (rule.kind === 'check') {
        return {
            state: ctx.state,
            facts: [{ type: 'CheckRequired', itemId, actorId: actor.id, purpose: 'identify', check: rule.check }],
            outcome: 'check_required',
            check: rule.check,
        };
    }
    return blocked(ctx, itemId, actor.id, 'needs_rest_or_identify');
}

/** Resultado de la prueba de identificación pedida por `identifyItem`. */
export function completeIdentification(ctx: ItemRuleContext, itemId: string, actor: ItemActor, success: boolean): ItemRuleResult {
    if (!success) return { state: ctx.state, facts: [], outcome: 'done' };
    const state = cloneState(ctx.state);
    const facts: CoreV2Fact[] = [];
    markIdentified(state, facts, itemId, actor.id);
    return { state, facts, outcome: 'done' };
}

function applyUse(state: CoreV2State, facts: CoreV2Fact[], item: AdventureItem, actor: ItemActor): void {
    facts.push({ type: 'ItemUsed', itemId: item.id, actorId: actor.id });
    markIdentified(state, facts, item.id, actor.id);
    if (item.spell) {
        facts.push({ type: 'SpellActivated', itemId: item.id, actorId: actor.id, spellId: item.spell.id, affects: item.activation?.affects || 'user' });
    }
    if (item.consumedOnUse) {
        state.itemHolders[item.id] = { kind: 'consumed' };
        facts.push({ type: 'ItemConsumed', itemId: item.id });
    }
}

/**
 * Un personaje usa el objeto. Si no lo tiene él, primero pasa a sus manos (de un compañero o de
 * la entidad que lo ofrece). Puede quedar pendiente de una prueba (`check_required`): entonces se
 * llama a `completeItemUse` con el resultado.
 */
export function useItem(ctx: ItemRuleContext, itemId: string, actor: ItemActor): ItemRuleResult {
    const item = findItem(ctx, itemId);
    if (!item) return { state: ctx.state, facts: [], outcome: 'unsupported' };
    if (ctx.state.itemHolders[itemId]?.kind === 'consumed') return blocked(ctx, itemId, actor.id, 'already_consumed');
    if (!isAccessible(ctx, itemId)) return blocked(ctx, itemId, actor.id, 'not_accessible');

    const rule = activationRule(item, actor);
    if (rule.kind === 'unsupported') return { state: ctx.state, facts: [], outcome: 'unsupported' };

    const state = cloneState(ctx.state);
    const facts: CoreV2Fact[] = [];
    moveItem(state, facts, itemId, { kind: 'character', id: actor.id });

    if (rule.kind === 'unusable') {
        facts.push({ type: 'ItemUnusable', itemId, actorId: actor.id, reason: rule.reason });
        return { state, facts, outcome: 'blocked' };
    }
    if (rule.kind === 'check') {
        facts.push({ type: 'CheckRequired', itemId, actorId: actor.id, purpose: 'activate', check: rule.check });
        return { state, facts, outcome: 'check_required', check: rule.check };
    }
    applyUse(state, facts, item, actor);
    return { state, facts, outcome: 'done' };
}

/**
 * Resultado de la prueba de activación pedida por `useItem`. Con reglas oficiales, un pergamino
 * cuya prueba falla se pierde sin efecto (DMG, "Spell Scroll"); lo que ocurra al fallar con una
 * prueba del PDF lo describe su `rulesText` y lo cuenta el narrador.
 */
export function completeItemUse(ctx: ItemRuleContext, itemId: string, actor: ItemActor, success: boolean, check?: CheckRequirement): ItemRuleResult {
    const item = findItem(ctx, itemId);
    if (!item) return { state: ctx.state, facts: [], outcome: 'unsupported' };
    const state = cloneState(ctx.state);
    const facts: CoreV2Fact[] = [];
    if (success) {
        applyUse(state, facts, item, actor);
    } else if (check?.source === 'official_rules' && item.type === 'scroll' && item.consumedOnUse !== false) {
        state.itemHolders[item.id] = { kind: 'consumed' };
        facts.push({ type: 'ItemConsumed', itemId: item.id });
    }
    return { state, facts, outcome: 'done' };
}

/** Modificador de característica de 5e. */
export function abilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

const ABILITY_TO_SHEET: Record<AbilityId, string> = {
    strength: 'fuerza', dexterity: 'destreza', constitution: 'constitución',
    intelligence: 'inteligencia', wisdom: 'sabiduría', charisma: 'carisma',
};

/**
 * Prueba de característica (d20 + modificador) con un generador inyectable, para tests deterministas.
 * Las pruebas de habilidad las resuelve el sistema de tiradas actual.
 */
export function rollAbilityCheck(
    character: { abilityScores?: Record<string, number>; abilityModifiers?: Record<string, number> },
    ability: AbilityId,
    dc: number,
    rng: () => number = Math.random,
): { d20: number; modifier: number; total: number; dc: number; success: boolean } {
    const key = ABILITY_TO_SHEET[ability];
    const modifier = character.abilityModifiers?.[key] ?? abilityModifier(character.abilityScores?.[key] ?? 10);
    const d20 = Math.min(20, Math.floor(rng() * 20) + 1);
    const total = d20 + modifier;
    return { d20, modifier, total, dc, success: total >= dc };
}
