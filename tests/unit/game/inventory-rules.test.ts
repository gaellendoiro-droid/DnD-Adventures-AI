import { describe, it, expect } from 'vitest';
import { InventoryRuleModule } from '../../../src/lib/game/rules/inventory-rules';

describe('InventoryRuleModule', () => {
    const createMockParty = (): any[] => [
        {
            id: 'galador',
            name: 'Galador',
            characterClass: 'Paladín',
            level: 4,
            controlledBy: 'Player' as const,
            hp: { current: 36, max: 36 },
            inventory: [
                { id: 'pocion-curacion', name: 'Poción de Curación', quantity: 2, description: 'Cura heridas' },
                { id: 'llave-oxidada', name: 'Llave Oxidada', quantity: 1, description: 'Una llave' }
            ]
        },
        {
            id: 'merryl',
            name: 'Merryl',
            characterClass: 'Mago',
            level: 4,
            controlledBy: 'AI' as const,
            hp: { current: 20, max: 20 },
            inventory: []
        }
    ];

    it('should handle drop and give actions', () => {
        const module = new InventoryRuleModule();

        const inputDrop = {
            playerAction: 'Tiro la llave oxidada al suelo',
            interpretation: { actionType: 'drop', targetId: 'llave-oxidada' },
            party: createMockParty(),
            currentLocationId: 'camara-test',
            adventureData: {},
            worldState: {},
            conversationHistory: []
        };

        const inputGive = {
            playerAction: 'Le doy una poción a Merryl',
            interpretation: { actionType: 'give', targetId: 'pocion-curacion', recipient: 'Merryl' },
            party: createMockParty(),
            currentLocationId: 'camara-test',
            adventureData: {},
            worldState: {},
            conversationHistory: []
        };

        const inputOther = {
            playerAction: 'Ataco al trasgo',
            interpretation: { actionType: 'attack' },
            party: createMockParty(),
            currentLocationId: 'camara-test',
            adventureData: {},
            worldState: {},
            conversationHistory: []
        };

        expect(module.canHandle(inputDrop)).toBe(true);
        expect(module.canHandle(inputGive)).toBe(true);
        expect(module.canHandle(inputOther)).toBe(false);
    });

    it('should drop an item and place it in the world state', () => {
        const module = new InventoryRuleModule();
        const party = createMockParty();
        const worldState = { locations: {} };

        const input = {
            playerAction: 'Tiro la llave oxidada al suelo',
            interpretation: { actionType: 'drop', targetId: 'llave-oxidada', assignedCompanion: 'Galador' },
            party,
            currentLocationId: 'camara-test',
            adventureData: {},
            worldState,
            conversationHistory: []
        };

        const result = module.evaluate(input);

        expect(result.intercepted).toBe(true);
        expect(result.updatedParty).toBeDefined();
        
        // Verificar que Galador ya no tiene la llave en su inventario
        const galador = result.updatedParty?.find(p => p.id === 'galador');
        const hasKey = galador?.inventory.some((it: any) => it.id === 'llave-oxidada');
        expect(hasKey).toBe(false);

        // Verificar que la localización en el worldState tiene la llave en droppedItems
        const droppedItems = result.updatedWorldState?.locations['camara-test']?.droppedItems;
        expect(droppedItems).toBeDefined();
        expect(droppedItems.length).toBe(1);
        expect(droppedItems[0].id).toBe('llave-oxidada');
        expect(droppedItems[0].quantity).toBe(1);
        expect(result.systemFeedback).toContain('ha dejado caer Llave Oxidada al suelo');
    });

    it('should decrease quantity instead of removing when dropping if quantity > 1', () => {
        const module = new InventoryRuleModule();
        const party = createMockParty();
        const worldState = { locations: {} };

        const input = {
            playerAction: 'Tiro una poción al suelo',
            interpretation: { actionType: 'drop', targetId: 'pocion-curacion', assignedCompanion: 'Galador' },
            party,
            currentLocationId: 'camara-test',
            adventureData: {},
            worldState,
            conversationHistory: []
        };

        const result = module.evaluate(input);

        expect(result.intercepted).toBe(true);
        
        // Verificar que Galador ahora tiene 1 poción (tenía 2)
        const galador = result.updatedParty?.find(p => p.id === 'galador');
        const potion = galador?.inventory.find((it: any) => it.id === 'pocion-curacion');
        expect(potion).toBeDefined();
        expect(potion!.quantity).toBe(1);

        // Verificar que la localización en el worldState tiene 1 poción en droppedItems
        const droppedItems = result.updatedWorldState?.locations['camara-test']?.droppedItems;
        expect(droppedItems).toBeDefined();
        expect(droppedItems.length).toBe(1);
        expect(droppedItems[0].id).toBe('pocion-curacion');
        expect(droppedItems[0].quantity).toBe(1);
    });

    it('should transfer item from source to recipient on give action', () => {
        const module = new InventoryRuleModule();
        const party = createMockParty();
        const worldState = { locations: {} };

        const input = {
            playerAction: 'Le doy una poción a Merryl',
            interpretation: { actionType: 'give', targetId: 'pocion-curacion', recipient: 'Merryl', assignedCompanion: 'Galador' },
            party,
            currentLocationId: 'camara-test',
            adventureData: {},
            worldState,
            conversationHistory: []
        };

        const result = module.evaluate(input);

        expect(result.intercepted).toBe(true);
        
        // Galador debe tener 1 poción ahora
        const galador = result.updatedParty?.find(p => p.id === 'galador');
        const galadorPotion = galador?.inventory.find((it: any) => it.id === 'pocion-curacion');
        expect(galadorPotion!.quantity).toBe(1);

        // Merryl debe tener 1 poción en su inventario
        const merryl = result.updatedParty?.find(p => p.id === 'merryl');
        const merrylPotion = merryl?.inventory.find((it: any) => it.id === 'pocion-curacion');
        expect(merrylPotion).toBeDefined();
        expect(merrylPotion!.quantity).toBe(1);

        expect(result.systemFeedback).toContain('le ha entregado Poción de Curación a Merryl');
    });

    it('should return error feedback if item is not found', () => {
        const module = new InventoryRuleModule();
        const party = createMockParty();
        const worldState = { locations: {} };

        const input = {
            playerAction: 'Tiro una espada que no tengo al suelo',
            interpretation: { actionType: 'drop', targetId: 'espada-magica', assignedCompanion: 'Galador' },
            party,
            currentLocationId: 'camara-test',
            adventureData: {},
            worldState,
            conversationHistory: []
        };

        const result = module.evaluate(input);

        expect(result.intercepted).toBe(true);
        expect(result.systemFeedback).toContain("No tienes 'espada-magica' en tu inventario");
    });
});
