/**
 * Puente entre el motor de reglas v2 y el núcleo actual, solo con `CORE_V2=1`.
 *
 * Hasta el paso D (intérprete y narrador v2), el turno lo sigue dirigiendo
 * `narrative-turn-manager`. Este puente:
 *  - sustituye a `ScrollRuleModule` para los objetos con mecánica de `items[]` (`ItemRuleModuleV2`);
 *  - al final de cada turno deduce los sucesos del turno y avanza las escenas (`applyCoreV2EndOfTurn`).
 *
 * No usa expresiones regulares sobre el texto del jugador: trabaja con la interpretación
 * (`objectIntent`, `targetId`, `assignedCompanion`, `recipient`) y con el estado.
 */
import type { RuleModule, RulesEngineInput, RulesEngineResult } from '../rules/rule-module';
import { addEffectToCharacterInParty } from '../systems/effect-utils';
import { isBehindCommunicationBarrier } from '../communication-barrier';
import type { CoreV2Fact, TurnEvent } from './facts';
import {
    accessibleItems,
    completeIdentification,
    completeItemUse,
    giveItem,
    identifyItem,
    rollAbilityCheck,
    takeItem,
    useItem,
    type ItemActor,
    type ItemRuleContext,
    type ItemRuleResult,
} from './item-rules';
import { advanceScenes, getActiveScene, isFlagOn, type FlagValue } from './scene-engine';
import { ensureCoreV2State, isCoreV2Enabled, type AdventureItem, type CoreV2State } from './state';
import type { AbilityId } from './spell-rules';

/**
 * Marcas técnicas en `globalFlags` (empiezan por `__`: no son efectos). Duran un turno:
 * `applyCoreV2EndOfTurn` las procesa y las borra.
 *  - USED: el objeto se ha usado este turno (→ suceso `item_used`).
 *  - PENDING_*: la tirada pendiente del sistema actual las activa si sale bien.
 */
const USED_MARK = '__v2_item_used__';
const PENDING_USE_MARK = '__v2_pending_use__';
const PENDING_IDENTIFY_MARK = '__v2_pending_identify__';

type Flags = Record<string, FlagValue>;

function clone<T>(value: T): T {
    return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function sameId(a: string | undefined | null, b: string | undefined | null): boolean {
    return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Entidades presentes en una localización según sus `presenceFlag` / `absenceFlag`. */
export function presentEntityIds(adventureData: any, locationId: string, flags: Flags = {}): string[] {
    const location = adventureData?.locations?.find((l: any) => l.id === locationId);
    const ids: string[] = [];
    for (const ref of location?.entitiesPresent || []) {
        if (typeof ref === 'string') {
            ids.push(ref);
        } else if (ref?.entityId) {
            const presence = !ref.presenceFlag || isFlagOn(flags[ref.presenceFlag]);
            const absence = !ref.absenceFlag || !isFlagOn(flags[ref.absenceFlag]);
            if (presence && absence) ids.push(ref.entityId);
        }
    }
    return [...new Set(ids)];
}

function buildContext(adventureData: any, state: CoreV2State, party: any[], locationId: string, flags: Flags): ItemRuleContext {
    return {
        items: (adventureData?.items || []) as AdventureItem[],
        state,
        partyIds: party.map(c => c.id),
        locationId,
        presentEntityIds: presentEntityIds(adventureData, locationId, flags),
    };
}

function toActor(character: any): ItemActor {
    return { id: character.id, name: character.name, characterClass: character.characterClass, level: character.level };
}

type Intent = 'take' | 'give' | 'identify' | 'use';

interface SelectedItemAction {
    intent: Intent;
    item: AdventureItem;
    actor: any;
    recipientId?: string;
    ctx: ItemRuleContext;
    state: CoreV2State;
}

function loosely(text: string): string {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Elige el objeto de `items[]` al que se refiere la interpretación, sin mirar el texto del jugador. */
function selectItem(candidates: AdventureItem[], ctx: ItemRuleContext, targetId: string | null | undefined): AdventureItem | undefined {
    if (targetId) {
        const exact = candidates.find(item => item.id === targetId);
        if (exact) return exact;
        // La entidad que lo sostiene (p. ej. "la criatura me ofrece algo" → targetId = la criatura).
        const held = candidates.filter(item => {
            const holder = ctx.state.itemHolders[item.id];
            return holder?.kind === 'entity' && holder.id === targetId;
        });
        if (held.length === 1) return held[0];
        const target = loosely(targetId);
        const byName = candidates.filter(item => {
            const name = loosely(item.name);
            const id = loosely(item.id);
            return target.length >= 4 && (name.includes(target) || id.includes(target) || target.includes(name));
        });
        if (byName.length === 1) return byName[0];
        // El objetivo es otra cosa (una puerta, una entidad sin objetos…): no es un objeto de items[].
        return undefined;
    }
    return candidates.length === 1 ? candidates[0] : undefined;
}

function selectItemAction(input: RulesEngineInput): SelectedItemAction | undefined {
    const { interpretation, adventureData, party, worldState, currentLocationId } = input;
    const items: AdventureItem[] = adventureData?.items || [];
    if (!items.length || !party?.length || !interpretation) return undefined;
    if (interpretation.actionType === 'clarify' || interpretation.actionType === 'drop') return undefined;

    const flags: Flags = worldState?.globalFlags || {};
    const state = ensureCoreV2State(worldState?.coreV2, adventureData);
    const ctx = buildContext(adventureData, state, party, currentLocationId, flags);
    const candidates = accessibleItems(ctx);
    if (!candidates.length) return undefined;

    let intent: Intent | undefined;
    const objectIntent = interpretation.objectIntent;
    if (objectIntent === 'take' || objectIntent === 'give' || objectIntent === 'identify' || objectIntent === 'use') {
        intent = objectIntent;
    } else if (interpretation.actionType === 'give') {
        intent = 'give';
    }

    let item = selectItem(candidates, ctx, interpretation.targetId);
    if (!intent && Array.isArray(interpretation.activatedEffects) && interpretation.activatedEffects.length) {
        const bySpell = candidates.filter(c => c.spell && interpretation.activatedEffects.includes(c.spell.id));
        if (bySpell.length === 1) {
            intent = 'use';
            item = bySpell[0];
        }
    }
    if (!intent || !item) return undefined;

    const findMember = (name?: string | null) => (name ? party.find((c: any) => sameId(c.name, name) || sameId(c.id, name)) : undefined);
    const holder = state.itemHolders[item.id];
    const holderMember = holder?.kind === 'character' ? party.find((c: any) => c.id === holder.id) : undefined;

    if (intent === 'give') {
        const recipientMember = findMember(interpretation.recipient);
        const recipientEntity = interpretation.recipient && ctx.presentEntityIds.find(id => sameId(id, interpretation.recipient));
        const recipientId = recipientMember?.id || recipientEntity;
        if (!recipientId) return undefined;
        const actor = holderMember || findMember(interpretation.assignedCompanion) || party[0];
        return { intent, item, actor, recipientId, ctx, state };
    }

    // Quién actúa: quien recibe el objeto ("Merryl, tómalo y léelo") o el compañero al que se
    // le ordena; si no, quien lo tiene; si no, el personaje que habla. El núcleo actual rellena
    // `assignedCompanion` con el personaje del jugador cuando la IA no nombra a nadie, así que ese
    // valor por defecto no se impone a quien tiene el objeto (el intérprete v2 dará el actor).
    const assigned = findMember(interpretation.assignedCompanion);
    const explicitCompanion = assigned && assigned.id !== party[0].id ? assigned : undefined;
    const actor = findMember(interpretation.recipient) || explicitCompanion || holderMember || assigned || party[0];
    return { intent, item, actor, ctx, state };
}

function displayName(item: AdventureItem, identified: boolean): string {
    if (identified) return item.name;
    switch (item.type) {
        case 'scroll': return 'Pergamino sin identificar';
        case 'wand': return 'Varita sin identificar';
        case 'potion': return 'Poción sin identificar';
        default: return 'Objeto sin identificar';
    }
}

function inventoryEntry(item: AdventureItem, identified: boolean) {
    return {
        id: item.id,
        name: displayName(item, identified),
        quantity: 1,
        description: identified ? (item.description || null) : 'Un objeto mágico cuya naturaleza aún no conocéis.',
    };
}

/** Lleva los cambios de los hechos al inventario y a los efectos del grupo (formato del núcleo actual). */
function applyFactsToParty(party: any[], facts: CoreV2Fact[], items: AdventureItem[], state: CoreV2State): any[] {
    const updated = clone(party);
    const byId = (id: string) => items.find(item => item.id === id);
    const removeEverywhere = (itemId: string) => {
        for (const member of updated) {
            if (Array.isArray(member.inventory)) member.inventory = member.inventory.filter((it: any) => it.id !== itemId);
        }
    };
    for (const fact of facts) {
        if (fact.type === 'ItemTransferred') {
            const item = byId(fact.itemId);
            if (!item) continue;
            removeEverywhere(fact.itemId);
            if (fact.to.kind === 'character') {
                const member = updated.find((c: any) => c.id === fact.to.id);
                if (member) {
                    member.inventory = member.inventory || [];
                    member.inventory.push(inventoryEntry(item, state.identifiedItems.includes(item.id)));
                }
            }
        } else if (fact.type === 'ItemConsumed') {
            removeEverywhere(fact.itemId);
        } else if (fact.type === 'ItemIdentified') {
            const item = byId(fact.itemId);
            if (!item) continue;
            for (const member of updated) {
                for (const it of member.inventory || []) {
                    if (it.id === item.id) Object.assign(it, inventoryEntry(item, true));
                }
            }
        } else if (fact.type === 'SpellActivated') {
            const targets = fact.affects === 'party' ? updated.map((c: any) => c.id) : [fact.actorId];
            for (const id of targets) addEffectToCharacterInParty(updated, id, fact.spellId, 'Objeto mágico');
        }
    }
    return updated;
}

/** Flags del núcleo actual que dependen de los hechos (barrera de comunicación, pistas del narrador…). */
function applyFactsToFlags(flags: Flags, facts: CoreV2Fact[], items: AdventureItem[]): void {
    for (const fact of facts) {
        const item = 'itemId' in fact ? items.find(it => it.id === fact.itemId) : undefined;
        const spellId = item?.spell?.id;
        if (fact.type === 'SpellActivated') flags[fact.spellId] = true;
        if (!spellId || item?.type !== 'scroll') continue;
        if (fact.type === 'ItemTransferred' && fact.to.kind === 'character') flags[`took_scroll_${spellId}`] = true;
        if (fact.type === 'ItemIdentified') flags[`identified_scroll_${spellId}`] = true;
        if (fact.type === 'ItemConsumed') flags[`consumed_scroll_${spellId}`] = true;
    }
}

/** Texto llano de los hechos para el narrador actual (el paso D lo sustituirá por el paquete de hechos). */
export function describeFacts(facts: CoreV2Fact[], items: AdventureItem[], party: any[], adventureData: any, state: CoreV2State): string {
    const itemName = (id: string) => {
        const item = items.find(it => it.id === id);
        return item ? displayName(item, state.identifiedItems.includes(id)) : id;
    };
    const who = (id?: string) =>
        party.find((c: any) => c.id === id)?.name || adventureData?.entities?.find((e: any) => e.id === id)?.name || id || 'alguien';
    const lines: string[] = [];
    for (const fact of facts) {
        switch (fact.type) {
            case 'ItemTransferred':
                if (fact.from.kind === 'location') lines.push(`${who(fact.to.id)} coge ${itemName(fact.itemId)}.`);
                else lines.push(`${who(fact.from.id)} le da ${itemName(fact.itemId)} a ${who(fact.to.id)}.`);
                break;
            case 'ItemIdentified':
                lines.push(`El grupo sabe qué es: ${itemName(fact.itemId)}.`);
                break;
            case 'CheckRequired': {
                const what = fact.purpose === 'identify' ? 'averiguar qué es' : 'activarlo';
                lines.push(`${who(fact.actorId)} necesita una prueba de ${fact.check.name} (CD ${fact.check.dc}) para ${what}.`);
                break;
            }
            case 'ItemUsed': {
                const item = items.find(it => it.id === fact.itemId);
                const how = item?.activation?.method === 'read_aloud' ? 'lee en voz alta' : 'usa';
                lines.push(`${who(fact.actorId)} ${how} ${itemName(fact.itemId)}.`);
                if (item?.rulesText) lines.push(`Según la aventura: ${item.rulesText}`);
                break;
            }
            case 'SpellActivated': {
                const item = items.find(it => it.id === fact.itemId);
                const scope = fact.affects === 'party' ? 'para todo el grupo' : `para ${who(fact.actorId)}`;
                lines.push(`El conjuro ${item?.spell?.name || fact.spellId} se activa ${scope}.`);
                break;
            }
            case 'ItemConsumed':
                lines.push(`${itemName(fact.itemId)} se consume.`);
                break;
            case 'ItemUnusable': {
                const reasons: Record<string, string> = {
                    spell_not_on_class_list: 'el conjuro no es de su clase, así que el texto le resulta ininteligible',
                    already_consumed: 'ya se gastó',
                    not_accessible: 'no está a su alcance',
                    needs_rest_or_identify: 'hace falta un descanso corto estudiándolo o el conjuro Identificar para saber qué es',
                };
                lines.push(`${who(fact.actorId)} no puede con ${itemName(fact.itemId)}: ${reasons[fact.reason]}.`);
                break;
            }
            default:
                break;
        }
    }
    return lines.join(' ');
}

/**
 * Regla de objetos v2 para el motor de reglas actual. Solo actúa con `CORE_V2=1` y cuando la
 * interpretación se refiere a un objeto de `items[]`.
 */
export class ItemRuleModuleV2 implements RuleModule {
    name = 'ItemRulesV2';

    constructor(private readonly env: Record<string, string | undefined> = process.env, private readonly rng: () => number = Math.random) {}

    canHandle(input: RulesEngineInput): boolean {
        return isCoreV2Enabled(this.env) && !!selectItemAction(input);
    }

    evaluate(input: RulesEngineInput): RulesEngineResult {
        const selected = selectItemAction(input);
        if (!selected) return { interpretation: input.interpretation, intercepted: false };
        const { intent, item, actor, recipientId, ctx } = selected;
        const items = ctx.items;

        let result: ItemRuleResult;
        switch (intent) {
            case 'take': result = takeItem(ctx, item.id, toActor(actor)); break;
            case 'give': result = giveItem(ctx, item.id, toActor(actor), recipientId!); break;
            case 'identify': result = identifyItem(ctx, item.id, toActor(actor)); break;
            default: result = useItem(ctx, item.id, toActor(actor)); break;
        }
        if (result.outcome === 'unsupported') return { interpretation: input.interpretation, intercepted: false };

        let facts = [...result.facts];
        let state = result.state;
        const interpretation: any = { ...input.interpretation, actionType: 'interact', targetId: item.id, activatedEffects: [], assignedCompanion: actor.name };
        let pendingEffects: string[] | undefined;
        let pendingWorldStateFlags: Record<string, any> | undefined;
        let rollNote = '';

        if (result.outcome === 'check_required' && result.check) {
            const check = result.check;
            const required = facts.find((f): f is Extract<CoreV2Fact, { type: 'CheckRequired' }> => f.type === 'CheckRequired');
            const purpose = required?.purpose || 'activate';
            if (check.kind === 'ability') {
                // El sistema de tiradas actual solo resuelve habilidades: la prueba de característica se tira aquí.
                const roll = rollAbilityCheck(actor, check.name as AbilityId, check.dc, this.rng);
                rollNote = `${actor.name} hace una prueba de ${check.name}: ${roll.d20} + ${roll.modifier} = ${roll.total} contra CD ${check.dc}, ${roll.success ? 'éxito' : 'fallo'}. `;
                const after = purpose === 'identify'
                    ? completeIdentification({ ...ctx, state }, item.id, toActor(actor), roll.success)
                    : completeItemUse({ ...ctx, state }, item.id, toActor(actor), roll.success, check);
                state = after.state;
                facts = facts.concat(after.facts);
            } else {
                interpretation.actionType = 'skill_check';
                interpretation.overrideSkill = check.name;
                interpretation.overrideDC = check.dc;
                if (purpose === 'activate') {
                    pendingEffects = item.spell ? [item.spell.id] : [];
                    pendingWorldStateFlags = { [`${PENDING_USE_MARK}${item.id}`]: true };
                } else {
                    pendingEffects = [];
                    pendingWorldStateFlags = { [`${PENDING_IDENTIFY_MARK}${item.id}`]: true };
                }
            }
        }

        const updatedWorldState = clone(input.worldState) || { locations: {}, globalFlags: {}, recentEvents: [] };
        updatedWorldState.globalFlags = updatedWorldState.globalFlags || {};
        updatedWorldState.coreV2 = state;
        applyFactsToFlags(updatedWorldState.globalFlags, facts, items);
        for (const fact of facts) {
            if (fact.type === 'ItemUsed') updatedWorldState.globalFlags[`${USED_MARK}${fact.itemId}`] = true;
        }
        const updatedParty = applyFactsToParty(input.party, facts, items, state);

        const events = facts
            .filter((f): f is Extract<CoreV2Fact, { type: 'ItemTransferred' }> => f.type === 'ItemTransferred' && f.to.kind === 'character')
            .map(f => {
                const member = updatedParty.find((c: any) => c.id === f.to.id);
                return {
                    type: 'ItemCollected',
                    payload: { characterId: member?.id, characterName: member?.name, itemId: f.itemId, itemName: displayName(item, state.identifiedItems.includes(item.id)), quantity: 1 },
                };
            });

        return {
            interpretation,
            systemFeedback: (rollNote + describeFacts(facts, items, updatedParty, input.adventureData, state)).trim(),
            updatedWorldState,
            updatedParty,
            intercepted: true,
            pendingEffects,
            pendingWorldStateFlags,
            events,
        };
    }
}

export interface EndOfTurnInput {
    adventureData: any;
    worldStateBefore: any;
    worldStateAfter: any;
    party: any[];
    locationBefore: string;
    locationAfter: string;
    interpretation?: any;
    inCombatBefore?: boolean;
    inCombatAfter?: boolean;
}

export interface EndOfTurnResult {
    worldState: any;
    party: any[];
    facts: CoreV2Fact[];
    events: TurnEvent[];
    activeScene?: any;
    startedSceneIds: string[];
}

function baseEntityId(enemy: any): string {
    return String(enemy.adventureId || enemy.id || '').replace(/(-\d+)+$/, '');
}

function isDown(enemy: any): boolean {
    const hp = typeof enemy?.hp === 'object' ? enemy.hp?.current : enemy?.hp;
    return enemy?.status === 'dead' || enemy?.status === 'unconscious' || (typeof hp === 'number' && hp <= 0);
}

/** Sucesos del turno (para `SceneCondition.event`) a partir del estado antes y después. */
export function deriveTurnEvents(input: EndOfTurnInput, state: CoreV2State): TurnEvent[] {
    const events: TurnEvent[] = [];
    const flagsBefore: Flags = input.worldStateBefore?.globalFlags || {};
    const flagsAfter: Flags = input.worldStateAfter?.globalFlags || {};
    const interpretation = input.interpretation || {};

    if (state.turn === 0) events.push({ event: 'adventure_start' });
    if (input.locationAfter && input.locationAfter !== input.locationBefore) {
        events.push({ event: 'entered_location', target: input.locationAfter });
    } else if (interpretation.actionType === 'move') {
        events.push({ event: 'attempted_leave', target: input.locationBefore });
    }

    // Conversación con una entidad presente que puede entender al grupo.
    if (interpretation.actionType === 'interact' && interpretation.targetId && !interpretation.objectIntent) {
        const present = presentEntityIds(input.adventureData, input.locationAfter, flagsAfter);
        const entity = input.adventureData?.entities?.find((e: any) => e.id === interpretation.targetId);
        if (entity && present.includes(entity.id)) {
            const understands = !isBehindCommunicationBarrier(entity) || isFlagOn(flagsAfter.speak_with_animals);
            if (understands) events.push({ event: 'talked_to', target: entity.id });
        }
    }

    // Objetos: usados (marca de la regla v2) y obtenidos (cambio de manos hacia el grupo).
    for (const [flag, value] of Object.entries(flagsAfter)) {
        if (flag.startsWith(USED_MARK) && isFlagOn(value) && !isFlagOn(flagsBefore[flag])) {
            events.push({ event: 'item_used', target: flag.slice(USED_MARK.length) });
        }
    }
    const holdersBefore = input.worldStateBefore?.coreV2?.itemHolders || {};
    const partyIds = (input.party || []).map((c: any) => c.id);
    for (const [itemId, holder] of Object.entries<any>(state.itemHolders)) {
        const before = holdersBefore[itemId];
        const inPartyNow = holder.kind === 'character' && partyIds.includes(holder.id);
        const inPartyBefore = before?.kind === 'character' && partyIds.includes(before.id);
        if (inPartyNow && !inPartyBefore) events.push({ event: 'item_obtained', target: itemId });
    }

    // Combate: entidades caídas y fin del combate.
    const defeated = new Set<string>();
    for (const [locId, locState] of Object.entries<any>(input.worldStateAfter?.locations || {})) {
        const beforeEnemies: any[] = input.worldStateBefore?.locations?.[locId]?.enemies || [];
        for (const enemy of locState?.enemies || []) {
            if (!isDown(enemy)) continue;
            const previous = beforeEnemies.find(e => e.id === enemy.id);
            if (!previous || !isDown(previous)) defeated.add(baseEntityId(enemy));
        }
    }
    for (const id of defeated) events.push({ event: 'entity_defeated', target: id });
    if (input.inCombatBefore && input.inCombatAfter === false) events.push({ event: 'combat_ended' });

    return events;
}

/**
 * Cierra el turno con `CORE_V2=1`: completa las tiradas pendientes de objetos, deduce los sucesos
 * del turno y avanza las escenas (flags `onStart` y escena activa).
 */
export function applyCoreV2EndOfTurn(input: EndOfTurnInput): EndOfTurnResult {
    const worldState = clone(input.worldStateAfter) || { locations: {}, globalFlags: {}, recentEvents: [] };
    worldState.globalFlags = worldState.globalFlags || {};
    let state = ensureCoreV2State(worldState.coreV2, input.adventureData);
    const flagsBefore: Flags = input.worldStateBefore?.globalFlags || {};
    const items: AdventureItem[] = input.adventureData?.items || [];
    let party = input.party;
    const facts: CoreV2Fact[] = [];

    // Tiradas de habilidad resueltas por el sistema actual: aplicar el resultado en el estado v2.
    const ctxFor = (s: CoreV2State) => buildContext(input.adventureData, s, party, input.locationAfter, worldState.globalFlags);
    for (const [flag, value] of Object.entries<FlagValue>(worldState.globalFlags)) {
        if (!isFlagOn(value) || isFlagOn(flagsBefore[flag])) continue;
        const holderOf = (itemId: string) => party.find((c: any) => c.id === state.itemHolders[itemId]?.id) || party[0];
        if (flag.startsWith(PENDING_USE_MARK)) {
            const itemId = flag.slice(PENDING_USE_MARK.length);
            if (state.itemHolders[itemId]?.kind === 'consumed') continue;
            const actor = holderOf(itemId);
            const done = completeItemUse(ctxFor(state), itemId, toActor(actor), true);
            // El efecto ya lo aplicó el sistema de tiradas (pendingEffects): solo cambia el estado del objeto.
            state = done.state;
            facts.push(...done.facts.filter(f => f.type !== 'SpellActivated'));
            worldState.globalFlags[`${USED_MARK}${itemId}`] = true;
        } else if (flag.startsWith(PENDING_IDENTIFY_MARK)) {
            const itemId = flag.slice(PENDING_IDENTIFY_MARK.length);
            const done = completeIdentification(ctxFor(state), itemId, toActor(holderOf(itemId)), true);
            state = done.state;
            facts.push(...done.facts);
        }
    }
    if (facts.length) {
        applyFactsToFlags(worldState.globalFlags, facts, items);
        party = applyFactsToParty(party, facts, items, state);
    }

    const events = deriveTurnEvents({ ...input, worldStateAfter: worldState }, state);
    for (const flag of Object.keys(worldState.globalFlags)) {
        if (flag.startsWith(USED_MARK) || flag.startsWith(PENDING_USE_MARK) || flag.startsWith(PENDING_IDENTIFY_MARK)) {
            delete worldState.globalFlags[flag];
        }
    }
    const sceneResult = advanceScenes({
        scenes: input.adventureData?.scenes || [],
        state,
        flags: worldState.globalFlags,
        locationId: input.locationAfter,
        events,
    });
    worldState.globalFlags = sceneResult.flags;
    worldState.coreV2 = sceneResult.state;

    return {
        worldState,
        party,
        facts: facts.concat(sceneResult.facts),
        events,
        activeScene: getActiveScene(input.adventureData?.scenes, sceneResult.state),
        startedSceneIds: sceneResult.startedSceneIds,
    };
}
