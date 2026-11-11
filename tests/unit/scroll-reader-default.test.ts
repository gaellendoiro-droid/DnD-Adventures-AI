import { describe, it, expect } from 'vitest';
import { GameRulesEngine } from '@/lib/game/rules/rules-engine';

/**
 * Regresión de la tercera prueba manual (11-11-2026): Elara tenía el pergamino y el jugador dijo
 * "¡Pues léelo para activarlo!"; la regla eligió a Galador como lector y le pasó el pergamino.
 * Si el jugador no habla en primera persona, lee quien tiene el pergamino.
 */
const adventureData = {
    locations: [{ id: 'plaza', name: 'Plaza', entitiesPresent: [{ entityId: 'oveja' }], interactables: [] }],
    entities: [{ id: 'oveja', name: 'Oveja', roleplay: { possessions: ['Pergamino de Hablar con los Animales'] } }],
};
const scroll = { id: 'scroll-speak_with_animals', name: 'Pergamino de Hablar con los Animales', quantity: 1 };
const party = () => [
    { id: 'char-1', name: 'Galador', characterClass: 'Paladín', inventory: [] },
    { id: 'char-2', name: 'Merryl', characterClass: 'Mago', inventory: [] },
    { id: 'char-3', name: 'Elara', characterClass: 'Clériga', inventory: [{ ...scroll }] },
] as any[];

const evaluate = (playerAction: string) => GameRulesEngine.evaluate({
    playerAction,
    interpretation: { actionType: 'interact', targetId: 'pergamino' },
    party: party(),
    currentLocationId: 'plaza',
    adventureData,
    worldState: { globalFlags: { took_scroll_speak_with_animals: true, identified_scroll_speak_with_animals: true } },
    conversationHistory: [],
} as any);

const holder = (res: any) => res.updatedParty?.find((c: any) => c.inventory?.some((i: any) => i.id === scroll.id))?.name;

describe('quién lee el pergamino si la frase no nombra a nadie', () => {
    it('"¡Pues léelo para activarlo!" lo lee Elara, que es quien lo tiene', () => {
        const res = evaluate('Pues leelo para activarlo!');
        expect(res.interpretation.assignedCompanion).toBe('Elara');
        expect(holder(res)).toBe('Elara');
    });

    it('"¡Vuelve a intentarlo!" tras un fallo lo intenta de nuevo quien tiene el pergamino', () => {
        const res = evaluate('Vuelve a intentarlo!');
        expect(res.interpretation.assignedCompanion).toBe('Elara');
        expect(holder(res)).toBe('Elara');
    });

    it('"Lo leo yo" en primera persona lo lee el jugador', () => {
        const res = evaluate('Trae, lo leo yo para activarlo');
        expect(res.interpretation.assignedCompanion).toBe('Galador');
        expect(holder(res)).toBe('Galador');
    });

    it('si nombra a otro compañero, lo lee ese compañero', () => {
        const res = evaluate('Merryl, léelo tú para activarlo');
        expect(res.interpretation.assignedCompanion).toBe('Merryl');
    });
});
