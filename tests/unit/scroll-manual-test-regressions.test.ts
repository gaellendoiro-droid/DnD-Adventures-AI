import { describe, it, expect } from 'vitest';
import { GameRulesEngine } from '@/lib/game/rules/rules-engine';
import { generateNarrativeDirectives } from '@/ai/flows/managers/narrative-turn-manager';
import { stripBarrierConfig } from '@/lib/game/communication-barrier';

/**
 * Regresiones de la prueba manual del 11-11-2026 (escenario oveja-06-pergamino-fallido):
 * Galador identifica el pergamino, falla al leerlo y se lo pasa a Merryl, que lo activa.
 */
const adventureData = {
    locations: [{ id: 'plaza', name: 'Plaza', entitiesPresent: [{ entityId: 'oveja' }], interactables: [] }],
    entities: [{ id: 'oveja', name: 'Oveja', roleplay: { possessions: ['Pergamino de Hablar con los Animales'] } }],
};

const party = () => [
    {
        id: 'char-1', name: 'Galador', characterClass: 'Paladín',
        inventory: [{ id: 'scroll-speak_with_animals', name: 'Pergamino de Hablar con los Animales', quantity: 1 }],
    },
    { id: 'char-2', name: 'Merryl', characterClass: 'Mago', inventory: [] },
    { id: 'char-3', name: 'Elara', characterClass: 'Clérigo', inventory: [] },
] as any[];

describe('pergamino: traspaso entre personajes', () => {
    it('al pedirle a Merryl que lo active, el narrador sabe que se lo pasa Galador', () => {
        const res = GameRulesEngine.evaluate({
            playerAction: 'Creo que no soy capaz. Merryl toma, prueba tú a activarlo.',
            interpretation: { actionType: 'interact', targetId: 'pergamino' },
            party: party(),
            currentLocationId: 'plaza',
            adventureData,
            worldState: { globalFlags: { took_scroll_speak_with_animals: true, identified_scroll_speak_with_animals: true } },
            conversationHistory: [],
        } as any);

        expect(res.intercepted).toBe(true);
        expect(res.interpretation.targetId).toBe('cast-scroll-speak_with_animals');
        expect(res.interpretation.assignedCompanion).toBe('Merryl');
        expect(res.systemFeedback).toMatch(/^Galador le pasa el pergamino a Merryl\./);
        expect(res.systemFeedback).not.toMatch(/toma el pergamino/);

        const directives = generateNarrativeDirectives(
            [{ type: 'SkillCheckResolved', payload: { skill: 'arcana', dc: 10, rollTotal: 15, isSuccess: true, characterName: 'Merryl', reasoning: res.systemFeedback } }],
            res.interpretation,
        ).join('\n');
        expect(directives).toMatch(/Galador le pasa el pergamino a Merryl/);
    });
});

describe('pergamino: directivas de tiradas', () => {
    it('una tirada sobre la oveja con el conjuro activo no se narra como leer el pergamino', () => {
        const directives = generateNarrativeDirectives(
            [{ type: 'SkillCheckResolved', payload: {
                skill: 'animal_handling', dc: 10, rollTotal: 10, isSuccess: true, characterName: 'Merryl',
                reasoning: 'Merryl intenta calmar a la oveja tras leer el pergamino',
            } }],
            { actionType: 'skill_check', targetId: 'oveja' },
            undefined,
            ['speak_with_animals'],
        ).join('\n');
        expect(directives).not.toMatch(/lee en voz alta|pergamino se consume|inscripciones arcanas/);
        expect(directives).toMatch(/tirada de animal_handling/);
    });

    it('al fallar la lectura, el narrador no puede decir que la magia se pierde', () => {
        const directives = generateNarrativeDirectives(
            [{ type: 'SkillCheckResolved', payload: { skill: 'arcana', dc: 10, rollTotal: 4, isSuccess: false, characterName: 'Galador', reasoning: '' } }],
            { actionType: 'skill_check', targetId: 'cast-scroll-speak_with_animals' },
        ).join('\n');
        expect(directives).toMatch(/NO se pierde/);
        expect(directives).toMatch(/PROHIBIDO decir que las palabras o la magia se desvanecen/);
    });
});

describe('stripBarrierConfig', () => {
    it('quita los pares término → reemplazo antes de mandar la entidad a la IA', () => {
        const sheep = {
            id: 'oveja', name: 'Oveja',
            roleplay: {
                goals: 'Recuperar su vara de Ahmed Noke',
                hiddenIdentityTerms: [{ term: 'Ahmed Noke', replacement: 'un antagonista oculto' }],
            },
        };
        const clean = stripBarrierConfig(sheep);
        expect(JSON.stringify(clean)).not.toMatch(/antagonista oculto|hiddenIdentityTerms/);
        expect(clean.roleplay.goals).toBe('Recuperar su vara de Ahmed Noke');
        expect(sheep.roleplay.hiddenIdentityTerms).toHaveLength(1); // no muta el original
    });

    it('deja igual las entidades sin esa configuración', () => {
        const npc = { id: 'toblen', roleplay: { goals: 'x' } };
        expect(stripBarrierConfig(npc)).toBe(npc);
    });
});
