import { describe, it, expect } from 'vitest';
import { GameRulesEngine } from '@/lib/game/rules/rules-engine';
import { generateNarrativeDirectives } from '@/ai/flows/managers/narrative-turn-manager';

const mockAdventureData = {
    locations: [
        {
            id: 'plaza',
            name: 'Plaza del Pueblo',
            entitiesPresent: [{ entityId: 'finethir-oveja' }],
            interactables: []
        }
    ],
    entities: [
        {
            id: 'finethir-oveja',
            name: 'Finethir Shinebright',
            roleplay: {
                possessions: ['Pergamino de Hablar con los Animales']
            }
        }
    ]
};

const createMockParty = (holderName: 'Galador' | 'Merryl' = 'Galador') => [
    {
        id: 'char-1',
        name: 'Galador',
        characterClass: 'Paladín',
        inventory: holderName === 'Galador'
            ? [{ id: 'scroll-speak_with_animals', name: 'Pergamino enrollado sellado', quantity: 1, description: 'Un pergamino enrollado.' }]
            : []
    },
    {
        id: 'char-2',
        name: 'Merryl',
        characterClass: 'Mago',
        inventory: holderName === 'Merryl'
            ? [{ id: 'scroll-speak_with_animals', name: 'Pergamino enrollado sellado', quantity: 1, description: 'Un pergamino enrollado.' }]
            : []
    },
    {
        id: 'char-3',
        name: 'Elara',
        characterClass: 'Clérigo',
        inventory: []
    }
] as any[];

describe('ScrollRuleModule & Narrative Directives - Screenshot Regressions', () => {
    it('1. "Toma Merryl, todo tuyo. Intenta averiguar de que se trata." transfiere el pergamino a Merryl Y dispara tirada de identificación en el mismo turno', () => {
        const res = GameRulesEngine.evaluate({
            playerAction: 'Toma Merryl, todo tuyo. Intenta averiguar de que se trata.',
            interpretation: {
                actionType: 'give',
                targetId: 'pergamino',
                recipient: 'Merryl',
                objectIntent: 'give'
            },
            party: createMockParty('Galador'),
            currentLocationId: 'plaza',
            adventureData: mockAdventureData,
            worldState: { globalFlags: { took_scroll_speak_with_animals: true } },
            conversationHistory: []
        });

        expect(res.intercepted).toBe(true);
        expect(res.interpretation.actionType).toBe('skill_check');
        expect(res.interpretation.targetId).toBe('identify-scroll-speak_with_animals');
        expect(res.interpretation.assignedCompanion).toBe('Merryl');
        expect(res.pendingWorldStateFlags?.identified_scroll_speak_with_animals).toBe(true);

        const merryl = res.updatedParty?.find(c => c.name === 'Merryl');
        expect(merryl?.inventory?.some((i: any) => i.id === 'scroll-speak_with_animals')).toBe(true);
    });

    it('2. "de acuerdo, adelante" tras proponer Merryl reconocer el sello dispara la tirada de identificación de Merryl', () => {
        const res = GameRulesEngine.evaluate({
            playerAction: 'de acuerdo, adelante',
            interpretation: {
                actionType: 'interact',
                targetId: 'finethir-oveja',
                objectIntent: 'other'
            },
            party: createMockParty('Merryl'),
            currentLocationId: 'plaza',
            adventureData: mockAdventureData,
            worldState: { globalFlags: { took_scroll_speak_with_animals: true } },
            conversationHistory: [
                {
                    id: 'm1',
                    sender: 'Character',
                    senderName: 'Merryl',
                    content: '«Ese sello parece estar impregnado de energía mágica; intentaré reconocerlo antes de abrir el pergamino»',
                    timestamp: new Date().toISOString()
                } as any
            ]
        });

        expect(res.intercepted).toBe(true);
        expect(res.interpretation.actionType).toBe('skill_check');
        expect(res.interpretation.targetId).toBe('identify-scroll-speak_with_animals');
        expect(res.interpretation.assignedCompanion).toBe('Merryl');
        expect(res.pendingWorldStateFlags?.identified_scroll_speak_with_animals).toBe(true);
    });

    it('3. "Merryl intenta descifrar ese pergamino" dispara identify-scroll-speak_with_animals incluso si objectIntent es "other" y genera directiva de ÉXITO explícita', () => {
        const res = GameRulesEngine.evaluate({
            playerAction: 'Merryl intenta descifrar ese pergamino',
            interpretation: {
                actionType: 'skill_check',
                targetId: 'Merryl',
                assignedCompanion: 'Merryl',
                objectIntent: 'other'
            },
            party: createMockParty('Merryl'),
            currentLocationId: 'plaza',
            adventureData: mockAdventureData,
            worldState: { globalFlags: { took_scroll_speak_with_animals: true } },
            conversationHistory: []
        });

        expect(res.intercepted).toBe(true);
        expect(res.interpretation.actionType).toBe('skill_check');
        expect(res.interpretation.targetId).toBe('identify-scroll-speak_with_animals');
        expect(res.interpretation.assignedCompanion).toBe('Merryl');
        expect(res.pendingWorldStateFlags?.identified_scroll_speak_with_animals).toBe(true);

        const directives = generateNarrativeDirectives(
            [
                {
                    type: 'SkillCheckResolved',
                    payload: {
                        characterName: 'Merryl',
                        skill: 'arcana',
                        dc: 10,
                        rollTotal: 25,
                        isSuccess: true,
                        reasoning: res.systemFeedback
                    }
                }
            ],
            res.interpretation,
            undefined,
            []
        );

        expect(directives.length).toBe(1);
        expect(directives[0]).toContain('RESULTADO OBLIGATORIO (ÉXITO DE TIRADA)');
        expect(directives[0]).toContain("Pergamino de Hablar con los Animales");
    });
});
