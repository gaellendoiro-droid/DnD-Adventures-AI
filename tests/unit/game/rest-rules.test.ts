import { describe, it, expect } from 'vitest';
import { RestRuleModule } from '../../../src/lib/game/rules/rest-rules';

describe('RestRuleModule', () => {
    const createMockParty = () => [
        {
            id: 'galador',
            name: 'Galador',
            characterClass: 'Paladín',
            level: 4,
            hp: { current: 15, max: 36 },
            abilityModifiers: { constitución: 2 },
            spellSlots: { level1: 1 } // ha gastado 2 ranuras (máx 3)
        },
        {
            id: 'merryl',
            name: 'Merryl',
            characterClass: 'Mago',
            level: 4,
            hp: { current: 10, max: 26 },
            abilityModifiers: { constitución: 2 },
            spellSlots: { level0: 999, level1: 2, level2: 1 } // ha gastado ranuras (máx 4 y 3)
        }
    ];

    it('should intercept rest actions', () => {
        const module = new RestRuleModule();

        const inputRest = {
            playerAction: 'Quiero hacer un descanso corto aquí',
            interpretation: { actionType: 'narrate' },
            party: [],
            currentLocationId: 'loc-1',
            adventureData: {},
            worldState: {},
            conversationHistory: []
        };

        expect(module.canHandle(inputRest as any)).toBe(true);

        const inputSleep = {
            playerAction: 'Vamos a dormir ocho horas',
            interpretation: { actionType: 'narrate' },
            party: [],
            currentLocationId: 'loc-1',
            adventureData: {},
            worldState: {},
            conversationHistory: []
        };

        expect(module.canHandle(inputSleep as any)).toBe(true);

        const inputOther = {
            playerAction: 'Ataco al trasgo',
            interpretation: { actionType: 'attack' },
            party: [],
            currentLocationId: 'loc-1',
            adventureData: {},
            worldState: {},
            conversationHistory: []
        };

        expect(module.canHandle(inputOther as any)).toBe(false);
    });

    it('should evaluate short rest correctly', () => {
        const module = new RestRuleModule();
        const party = createMockParty();
        const worldState = {
            locations: {},
            globalFlags: {},
            worldTime: { day: 1, hour: 10, minute: 0 }
        };

        const result = module.evaluate({
            playerAction: 'Hacemos un descanso corto de una hora',
            interpretation: { actionType: 'rest' },
            party: party as any,
            currentLocationId: 'loc-1',
            adventureData: {},
            worldState,
            conversationHistory: []
        });

        expect(result.intercepted).toBe(true);
        expect(result.interpretation.actionType).toBe('narrate'); // Se fuerza a narración
        
        // Reloj avanza 1 hora: 10 -> 11
        expect(result.updatedWorldState.worldTime.hour).toBe(11);
        expect(result.updatedWorldState.worldTime.day).toBe(1);

        // Los personajes deben haber recuperado vida (dados de golpe)
        const galador = result.updatedParty![0];
        const merryl = result.updatedParty![1];
        expect(galador.hp.current).toBeGreaterThan(15);
        expect(merryl.hp.current).toBeGreaterThan(10);

        // Recuperación Arcana: Merryl (Mago) debe haber recuperado 1 ranura de nivel 1 (de 2 a 3)
        expect(merryl.spellSlots?.level1).toBe(3);
    });

    it('should evaluate long rest correctly', () => {
        const module = new RestRuleModule();
        const party = createMockParty();
        const worldState = {
            locations: {},
            globalFlags: {
                'speak_with_animals': true,
                'some_other_flag': true
            },
            worldTime: { day: 1, hour: 20, minute: 0 }
        };

        const result = module.evaluate({
            playerAction: 'Vamos a tomar un descanso largo para dormir',
            interpretation: { actionType: 'rest' },
            party: party as any,
            currentLocationId: 'loc-1',
            adventureData: {},
            worldState,
            conversationHistory: []
        });

        expect(result.intercepted).toBe(true);

        // Reloj avanza 8 horas: 20:00 -> 4:00 del día siguiente
        expect(result.updatedWorldState.worldTime.hour).toBe(4);
        expect(result.updatedWorldState.worldTime.day).toBe(2);

        // Personajes curados al máximo
        const galador = result.updatedParty![0];
        const merryl = result.updatedParty![1];
        expect(galador.hp.current).toBe(36);
        expect(merryl.hp.current).toBe(26);

        // Ranuras de conjuro restauradas al máximo oficial de nivel 4
        // Galador (Paladín 4) -> nivel 1: 3
        expect(galador.spellSlots?.level1).toBe(3);
        // Merryl (Mago 4) -> nivel 1: 4, nivel 2: 3
        expect(merryl.spellSlots?.level1).toBe(4);
        expect(merryl.spellSlots?.level2).toBe(3);

        // El conjuro temporal 'speak_with_animals' debe haberse apagado (false)
        expect(result.updatedWorldState.globalFlags.speak_with_animals).toBe(false);
        // Las flags permanentes de la aventura ('some_other_flag') deben persistir
        expect(result.updatedWorldState.globalFlags.some_other_flag).toBe(true);
    });

    it('should not intercept actions that only contain rest-like fragments (regression)', () => {
        const module = new RestRuleModule();
        const make = (playerAction: string, actionType = 'interact') => ({
            playerAction,
            interpretation: { actionType },
            party: [],
            currentLocationId: 'loc-1',
            adventureData: {},
            worldState: {},
            conversationHistory: []
        }) as any;

        const nonRest = [
            'Examino el dormitorio',
            'Registro los restos del naufragio',
            '¿Cuántas flechas me quedan restantes?',
            'Subo hasta el descansillo de la escalera',
            'Me acerco sigilosamente al oso que duerme',
            'Observo al guardia que descansa junto a la puerta',
        ];
        for (const action of nonRest) {
            expect(module.canHandle(make(action)), action).toBe(false);
        }

        // Un ataque nunca debe convertirse en descanso
        expect(module.canHandle(make('Ataco al guardia antes de que pueda descansar', 'attack'))).toBe(false);

        const rest = [
            'Descansamos un rato junto a la hoguera',
            'Nos echamos una siesta',
            'Vamos a dormir',
            'Hacemos un descanso largo',
            'We take a short rest',
        ];
        for (const action of rest) {
            expect(module.canHandle(make(action, 'narrate')), action).toBe(true);
        }
    });
});
