import { describe, it, expect } from 'vitest';
import {
    activationRule,
    completeItemUse,
    giveItem,
    identifyItem,
    rollAbilityCheck,
    takeItem,
    useItem,
    type ItemRuleContext,
} from '@/lib/game/core-v2/item-rules';
import { createCoreV2State, isCoreV2Enabled, type AdventureItem } from '@/lib/game/core-v2/state';
import { maxSpellLevel, normalizeClass } from '@/lib/game/core-v2/spell-rules';

const fighter = { id: 'pj-1', name: 'Galador', characterClass: 'Guerrero', level: 1 };
const druid = { id: 'pj-2', name: 'Sauce', characterClass: 'Druida', level: 1 };
const wizard = { id: 'pj-3', name: 'Merryl', characterClass: 'Mago', level: 1 };

const item = (over: Partial<AdventureItem>): AdventureItem => ({ id: 'obj', name: 'Objeto', ...over } as AdventureItem);

/** Pergamino que el PDF permite activar solo con leerlo (activation.check = null). */
const pdfScroll = item({
    id: 'pergamino-pdf', name: 'Pergamino de Hablar con Animales', type: 'scroll',
    spell: { id: 'speak_with_animals', name: 'Hablar con Animales' },
    identification: { method: 'label' },
    activation: { method: 'read_aloud', check: null, affects: 'party' },
    consumedOnUse: true,
    startsWith: { entityId: 'criatura' },
});
/** El mismo conjuro sin nada en los datos: reglas oficiales. */
const officialScroll = item({
    id: 'pergamino-oficial', name: 'Pergamino de Hablar con Animales', type: 'scroll',
    spell: { id: 'speak_with_animals', name: 'Hablar con Animales' },
    activation: { method: 'read_aloud' },
    consumedOnUse: true,
    startsWith: { locationId: 'plaza' },
});
const fireballScroll = item({
    id: 'pergamino-bola', name: 'Pergamino de Bola de Fuego', type: 'scroll',
    spell: { id: 'fireball', name: 'Bola de Fuego' }, consumedOnUse: true, startsWith: { locationId: 'plaza' },
});
const wand = item({
    id: 'varita', name: 'Varita', type: 'wand', spell: { id: 'true_polymorph', name: 'Verdadero Polimorfismo' },
    identification: { method: 'check', check: { skill: 'Arcana', dc: 15 } },
    activation: { method: 'attunement', check: { skill: 'Arcana', dc: 17 }, affects: 'target' },
    startsWith: { locationId: 'plaza' },
});
const hidden = item({ id: 'escondido', name: 'Pergamino escondido', type: 'scroll', startsWith: { locationId: 'plaza', hidden: true } });

const items = [pdfScroll, officialScroll, fireballScroll, wand, hidden];
const ctx = (over: Partial<ItemRuleContext> = {}): ItemRuleContext => ({
    items,
    state: createCoreV2State({ items }),
    partyIds: [fighter.id, druid.id, wizard.id],
    locationId: 'plaza',
    presentEntityIds: ['criatura'],
    ...over,
});

describe('objetos v2: activación según los datos o las reglas oficiales', () => {
    // "Baaaa-d News" (p. 2): basta con leer el pergamino en voz alta para activar el conjuro.
    it('check = null (excepción del PDF): cualquiera lo activa sin tirada, aunque no sea su clase', () => {
        const res = useItem(ctx(), pdfScroll.id, fighter);
        expect(res.outcome).toBe('done');
        expect(res.facts.some(f => f.type === 'CheckRequired')).toBe(false);
        expect(res.facts).toContainEqual({ type: 'SpellActivated', itemId: pdfScroll.id, actorId: fighter.id, spellId: 'speak_with_animals', affects: 'party' });
        expect(res.facts).toContainEqual({ type: 'ItemConsumed', itemId: pdfScroll.id });
        // La criatura se lo pasa a quien lo lee.
        expect(res.facts[0]).toEqual({ type: 'ItemTransferred', itemId: pdfScroll.id, from: { kind: 'entity', id: 'criatura' }, to: { kind: 'character', id: fighter.id } });
        expect(res.state.itemHolders[pdfScroll.id]).toEqual({ kind: 'consumed' });
    });

    it('un pergamino gastado no se puede volver a usar', () => {
        const first = useItem(ctx(), pdfScroll.id, fighter);
        const again = useItem(ctx({ state: first.state }), pdfScroll.id, druid);
        expect(again.outcome).toBe('blocked');
        expect(again.facts).toEqual([{ type: 'ItemUnusable', itemId: pdfScroll.id, actorId: druid.id, reason: 'already_consumed' }]);
    });

    it('sin datos y con el conjuro en su lista de clase: se lanza sin tirada (DMG, Spell Scroll)', () => {
        expect(activationRule(officialScroll, druid)).toEqual({ kind: 'free', source: 'official_rules' });
        expect(useItem(ctx(), officialScroll.id, druid).outcome).toBe('done');
    });

    it('sin datos y sin el conjuro en su lista: el pergamino es ininteligible', () => {
        const res = useItem(ctx(), officialScroll.id, fighter);
        expect(res.outcome).toBe('blocked');
        expect(res.facts).toContainEqual({ type: 'ItemUnusable', itemId: officialScroll.id, actorId: fighter.id, reason: 'spell_not_on_class_list' });
    });

    it('conjuro de su lista pero de nivel superior: prueba de característica CD 10 + nivel; si falla, se pierde', () => {
        const res = useItem(ctx(), fireballScroll.id, wizard);
        expect(res.outcome).toBe('check_required');
        expect(res.check).toEqual({ kind: 'ability', name: 'intelligence', dc: 13, source: 'official_rules' });
        const failed = completeItemUse(ctx({ state: res.state }), fireballScroll.id, wizard, false, res.check);
        expect(failed.facts).toEqual([{ type: 'ItemConsumed', itemId: fireballScroll.id }]);
    });

    it('prueba que da el PDF: se pide esa prueba y un fallo no gasta el objeto', () => {
        const res = useItem(ctx(), wand.id, wizard);
        expect(res.check).toEqual({ kind: 'skill', name: 'arcana', dc: 17, source: 'adventure' });
        const failed = completeItemUse(ctx({ state: res.state }), wand.id, wizard, false, res.check);
        expect(failed.facts).toEqual([]);
        const ok = completeItemUse(ctx({ state: res.state }), wand.id, wizard, true, res.check);
        expect(ok.facts.map(f => f.type)).toEqual(['ItemUsed', 'ItemIdentified', 'SpellActivated']);
    });

    it('un conjuro que no está en la tabla no se resuelve con reglas oficiales (vuelve al núcleo actual)', () => {
        const odd = item({ id: 'raro', name: 'Raro', type: 'scroll', spell: { id: 'conjuro_inventado', name: 'X' }, startsWith: { locationId: 'plaza' } });
        expect(useItem(ctx({ items: [odd], state: createCoreV2State({ items: [odd] }) }), odd.id, wizard).outcome).toBe('unsupported');
    });
});

describe('objetos v2: identificación, coger y dar', () => {
    it('un sello que lo indica (label) basta para saber qué es', () => {
        const state = createCoreV2State({ items });
        expect(state.identifiedItems).toContain(pdfScroll.id);
        expect(identifyItem(ctx(), pdfScroll.id, fighter).outcome).toBe('done');
    });

    it('identification.check pide esa prueba', () => {
        const res = identifyItem(ctx(), wand.id, wizard);
        expect(res.outcome).toBe('check_required');
        expect(res.check).toEqual({ kind: 'skill', name: 'arcana', dc: 15, source: 'adventure' });
    });

    it('sin datos de identificación: descanso corto o Identificar (reglas oficiales)', () => {
        const res = identifyItem(ctx(), officialScroll.id, wizard);
        expect(res.facts).toEqual([{ type: 'ItemUnusable', itemId: officialScroll.id, actorId: wizard.id, reason: 'needs_rest_or_identify' }]);
    });

    it('un objeto escondido no se puede coger hasta encontrarlo', () => {
        expect(takeItem(ctx(), hidden.id, fighter).outcome).toBe('blocked');
    });

    it('coger y dar mueven el objeto entre manos', () => {
        const taken = takeItem(ctx(), officialScroll.id, fighter);
        expect(taken.state.itemHolders[officialScroll.id]).toEqual({ kind: 'character', id: fighter.id });
        const given = giveItem(ctx({ state: taken.state }), officialScroll.id, fighter, druid.id);
        expect(given.state.itemHolders[officialScroll.id]).toEqual({ kind: 'character', id: druid.id });
        expect(given.facts).toEqual([{ type: 'ItemTransferred', itemId: officialScroll.id, from: { kind: 'character', id: fighter.id }, to: { kind: 'character', id: druid.id } }]);
    });

    it('no modifica el estado que recibe', () => {
        const c = ctx();
        useItem(c, pdfScroll.id, fighter);
        expect(c.state.itemHolders[pdfScroll.id]).toEqual({ kind: 'entity', id: 'criatura' });
    });
});

describe('reglas oficiales auxiliares', () => {
    it('normaliza clases en español e inglés', () => {
        expect(normalizeClass('Clériga')).toBe('cleric');
        expect(normalizeClass('paladín')).toBe('paladin');
        expect(normalizeClass('Wizard')).toBe('wizard');
        expect(normalizeClass('Inventada')).toBeUndefined();
    });

    it('nivel máximo de conjuro por clase', () => {
        expect(maxSpellLevel('wizard', 1)).toBe(1);
        expect(maxSpellLevel('wizard', 5)).toBe(3);
        expect(maxSpellLevel('ranger', 1)).toBe(0);
        expect(maxSpellLevel('ranger', 5)).toBe(2);
        expect(maxSpellLevel('warlock', 20)).toBe(5);
        expect(maxSpellLevel('fighter', 20)).toBe(0);
    });

    it('prueba de característica determinista con generador inyectado', () => {
        const pc = { abilityScores: { inteligencia: 16 } };
        expect(rollAbilityCheck(pc, 'intelligence', 13, () => 0.5)).toEqual({ d20: 11, modifier: 3, total: 14, dc: 13, success: true });
        expect(rollAbilityCheck(pc, 'intelligence', 13, () => 0)).toMatchObject({ d20: 1, total: 4, success: false });
    });

    it('CORE_V2 solo se activa con 1 o true', () => {
        expect(isCoreV2Enabled({})).toBe(false);
        expect(isCoreV2Enabled({ CORE_V2: '0' })).toBe(false);
        expect(isCoreV2Enabled({ CORE_V2: '1' })).toBe(true);
        expect(isCoreV2Enabled({ CORE_V2: 'true' })).toBe(true);
    });
});
