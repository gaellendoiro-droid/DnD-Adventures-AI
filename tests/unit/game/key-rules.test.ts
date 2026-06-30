import { describe, it, expect } from 'vitest';
import { KeyRuleModule } from '../../../src/lib/game/rules/key-rules';

describe('KeyRuleModule', () => {
    const createMockLocationData = () => ({
        id: 'camara-test',
        name: 'Cámara de Pruebas',
        connections: [
            {
                targetId: 'santuario-test',
                type: 'direct',
                direction: 'norte',
                description: 'Una gran verja de hierro reforzado.',
                isLocked: true,
                requiredKeyId: 'llave-calabozo',
                lockpickDC: 15,
                breakDC: 20
            },
            {
                targetId: 'sala-magica',
                type: 'direct',
                direction: 'sur',
                description: 'Una puerta rúnica sellada.',
                isLocked: true,
                requiredKeyId: 'llave-magica'
                // Sin lockpickDC ni breakDC (impenetrable)
            }
        ]
    });

    const createMockParty = (hasKeyId: string | null = null) => [
        {
            id: 'galador',
            name: 'Galador',
            characterClass: 'Paladín',
            level: 4,
            controlledBy: 'Player' as const,
            hp: { current: 36, max: 36 },
            abilityModifiers: { fuerza: 3, destreza: 0 },
            inventory: hasKeyId ? [{ id: hasKeyId, name: 'Llave de Prueba', quantity: 1, description: 'Una llave' }] : []
        }
    ];

    it('should intercept actions to open locked connections', () => {
        const module = new KeyRuleModule();
        const locationData = createMockLocationData();

        const inputOpenNorth = {
            playerAction: 'Intentamos abrir la verja del norte',
            interpretation: { actionType: 'interact' },
            party: [],
            currentLocationId: 'camara-test',
            adventureData: {},
            worldState: {},
            locationData,
            conversationHistory: []
        };

        expect(module.canHandle(inputOpenNorth)).toBe(true);

        const inputOpenGeneric = {
            playerAction: 'Quiero abrir la puerta',
            interpretation: { actionType: 'interact' },
            party: [],
            currentLocationId: 'camara-test',
            adventureData: {},
            worldState: {},
            locationData: {
                ...locationData,
                // Dejar solo una puerta cerrada con llave para probar coincidencia genérica
                connections: [locationData.connections[0]]
            },
            conversationHistory: []
        };

        expect(module.canHandle(inputOpenGeneric)).toBe(true);

        const inputOther = {
            playerAction: 'Ataco al trasgo',
            interpretation: { actionType: 'attack' },
            party: [],
            currentLocationId: 'camara-test',
            adventureData: {},
            worldState: {},
            locationData,
            conversationHistory: []
        };

        expect(module.canHandle(inputOther)).toBe(false);
    });

    it('should automatically open the connection if the party has the key', () => {
        const module = new KeyRuleModule();
        const locationData = createMockLocationData();
        const party = createMockParty('llave-calabozo');

        const input = {
            playerAction: 'Abrimos la puerta del norte con la llave',
            interpretation: { actionType: 'interact' },
            party: party as any,
            currentLocationId: 'camara-test',
            adventureData: {},
            worldState: { locations: {}, globalFlags: {}, recentEvents: [] },
            locationData,
            conversationHistory: []
        };

        const result = module.evaluate(input);

        expect(result.intercepted).toBe(true);
        expect(result.interpretation.actionType).toBe('interact');
        expect(result.interpretation.targetId).toBe('santuario-test');
        expect(result.systemFeedback).toContain("Desbloqueas y abres");
        
        // Verificar que actualiza openDoors en el output retornado
        expect((result as any).updatedOpenDoors['camara-test:norte']).toBe(true);
        expect((result as any).updatedOpenDoors['santuario-test:sur']).toBe(true);

        // Verificar que se emite el evento DoorOpened enriquecido
        expect((result as any).events).toHaveLength(1);
        expect((result as any).events[0].type).toBe('DoorOpened');
        expect((result as any).events[0].payload.method).toBe('key');
        expect((result as any).events[0].payload.keyName).toBe('Llave de Prueba');

        // Verificar que actualiza worldState de forma persistente
        const northConnection = result.updatedWorldState.locations['camara-test'].connections['norte'];
        expect(northConnection.isOpen).toBe(true);
        expect(northConnection.isLocked).toBe(false);
    });

    it('should block actions if the party does not have the key and connection is impenetrable', () => {
        const module = new KeyRuleModule();
        const locationData = createMockLocationData();
        const party = createMockParty(null); // Sin llaves

        const input = {
            playerAction: 'Intentamos abrir la verja del sur',
            interpretation: { actionType: 'interact' },
            party: party as any,
            currentLocationId: 'camara-test',
            adventureData: {},
            worldState: { locations: {}, globalFlags: {}, recentEvents: [] },
            locationData,
            conversationHistory: []
        };

        const result = module.evaluate(input);

        expect(result.intercepted).toBe(true);
        expect(result.interpretation.actionType).toBe('narrate');
        expect(result.systemFeedback).toContain("está cerrada firmemente con llave. No hay cerraduras accesibles");
    });

    it('should force an athletics skill check if attempting to force a door and it has breakDC', () => {
        const module = new KeyRuleModule();
        const locationData = createMockLocationData();
        const party = createMockParty(null); // Sin llaves

        const input = {
            playerAction: 'Intentamos derribar la verja del norte con un empujón',
            interpretation: { actionType: 'interact' },
            party: party as any,
            currentLocationId: 'camara-test',
            adventureData: {},
            worldState: { locations: {}, globalFlags: {}, recentEvents: [] },
            locationData,
            conversationHistory: []
        };

        const result = module.evaluate(input);

        expect(result.intercepted).toBe(true);
        expect(result.interpretation.actionType).toBe('skill_check');
        expect(result.interpretation.overrideSkill).toBe('athletics');
        expect(result.interpretation.overrideDC).toBe(20);
        expect(result.systemFeedback).toContain("Prueba de Atletismo con CD 20");
    });

    it('should force a sleight of hand skill check if attempting to pick lock and connection has lockpickDC', () => {
        const module = new KeyRuleModule();
        const locationData = createMockLocationData();
        const party = createMockParty(null); // Sin llaves

        const input = {
            playerAction: 'Saco mis ganzúas para forzar la cerradura del norte',
            interpretation: { actionType: 'interact' },
            party: party as any,
            currentLocationId: 'camara-test',
            adventureData: {},
            worldState: { locations: {}, globalFlags: {}, recentEvents: [] },
            locationData,
            conversationHistory: []
        };

        const result = module.evaluate(input);

        expect(result.intercepted).toBe(true);
        expect(result.interpretation.actionType).toBe('skill_check');
        expect(result.interpretation.overrideSkill).toBe('sleight_of_hand');
        expect(result.interpretation.overrideDC).toBe(15);
        expect(result.systemFeedback).toContain("Prueba de Juego de Manos con CD 15");
    });

    it('should automatically loot the key from an open chest in the same room and open the connection', () => {
        const module = new KeyRuleModule();
        const locationData = {
            ...createMockLocationData(),
            interactables: [
                {
                    id: 'cofre-madera',
                    name: 'Cofre de madera',
                    type: 'container',
                    state: 'open',
                    items: ['llave-calabozo']
                }
            ]
        };
        const party = createMockParty(null); // Sin llaves en el inventario

        const input = {
            playerAction: 'Cojo la llave del cofre e intento abrir la verja del norte',
            interpretation: { actionType: 'interact', assignedCompanion: 'Galador' },
            party: party as any,
            currentLocationId: 'camara-test',
            adventureData: {
                items: [
                    { id: 'llave-calabozo', name: 'Llave del Calabozo', description: 'Una llave de hierro oxidada' }
                ]
            },
            worldState: { locations: {}, globalFlags: {}, recentEvents: [] },
            locationData,
            conversationHistory: []
        };

        const result = module.evaluate(input as any);

        expect(result.intercepted).toBe(true);
        expect(result.interpretation.actionType).toBe('interact');
        
        // Verificar que la llave se ha inyectado en el inventario de Galador
        const activeChar = result.updatedParty.find((c: any) => c.name === 'Galador');
        expect(activeChar.inventory).toHaveLength(1);
        expect(activeChar.inventory[0].id).toBe('llave-calabozo');

        // Verificar que el cofre ahora está vacío (looted) en el worldState
        const cofreState = result.updatedWorldState.locations['camara-test'].interactables['cofre-madera'];
        expect(cofreState.state).toBe('looted');
        expect(cofreState.items).toHaveLength(0);

        // Verificar que la verja está abierta
        expect((result as any).updatedOpenDoors['camara-test:norte']).toBe(true);
    });
});
