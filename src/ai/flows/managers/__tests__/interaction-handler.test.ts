import { describe, it, expect, vi } from 'vitest';
import { InteractionHandler } from '../interaction-handler';
import { createInitialWorldState } from '@/lib/game/world-state-types';

// Mock del logger
vi.mock('@/lib/logger', () => ({
    log: {
        gameCoordinator: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        aiFlow: vi.fn()
    }
}));

describe('InteractionHandler', () => {
    const mockLocationData = {
        id: 'loc-1',
        title: 'Test Room',
        interactables: [
            {
                id: 'chest_1',
                name: 'Wooden Chest',
                description: 'A dusty chest.',
                type: 'container',
                items: ['potion_healing', 'potion_healing', 'sword_magic']
            },
            {
                id: 'door_east',
                name: 'East Door',
                description: 'A heavy door.',
                type: 'door'
            }
        ],
        connections: [
            {
                direction: 'este',
                targetId: 'loc-2',
                description: 'East corridor'
            }
        ]
    };

    const mockAdventureData = {
        adventureId: 'test_adv',
        items: [
            {
                id: 'potion_healing',
                name: 'Poción de Curación',
                description: 'Cura heridas.'
            },
            {
                id: 'sword_magic',
                name: 'Espada Mágica',
                description: 'Hace pupa.'
            }
        ]
    };

    const mockParty = [
        {
            name: 'Gael',
            inventory: [
                { id: 'gold', name: 'Gold', quantity: 10 }
            ]
        }
    ];

    it('should open container and set its state to open', async () => {
        const worldState = createInitialWorldState();

        const result = await InteractionHandler.processInteraction({
            playerAction: 'abrir el cofre',
            targetId: 'Wooden Chest',
            actionType: 'interact',
            locationData: mockLocationData,
            currentLocationId: 'loc-1',
            resolvedEntities: [],
            worldState,
            party: mockParty,
            adventureData: mockAdventureData
        });

        expect(result.updatedWorldState).toBeDefined();
        const locState = result.updatedWorldState.locations['loc-1'];
        expect(locState).toBeDefined();
        expect(locState.interactables?.chest_1).toBeDefined();
        expect(locState.interactables?.chest_1.state).toBe('open');
        expect(result.systemFeedback).toContain('Opened container');
    });

    it('should loot container, transfer items, and set state to looted', async () => {
        const worldState = createInitialWorldState();
        worldState.locations['loc-1'] = {
            visited: true,
            visitedCount: 1,
            enemies: [],
            droppedItems: [],
            interactables: {
                chest_1: {
                    id: 'chest_1',
                    state: 'open',
                    usedTimes: 0,
                    items: ['potion_healing', 'potion_healing', 'sword_magic']
                }
            }
        };

        const result = await InteractionHandler.processInteraction({
            playerAction: 'saquear cofre',
            targetId: 'Wooden Chest',
            actionType: 'interact',
            locationData: mockLocationData,
            currentLocationId: 'loc-1',
            resolvedEntities: [],
            worldState,
            party: mockParty,
            adventureData: mockAdventureData,
            activeCharacterName: 'Gael'
        });

        // 1. Verificar WorldState
        expect(result.updatedWorldState).toBeDefined();
        const locState = result.updatedWorldState.locations['loc-1'];
        expect(locState.interactables?.chest_1.state).toBe('looted');

        // 2. Verificar Party (inventario del personaje)
        expect(result.updatedParty).toBeDefined();
        const activeChar = result.updatedParty![0];
        
        // Debe tener Gold, Poción (cantidad 2 porque había dos) y Espada Mágica
        expect(activeChar.inventory).toHaveLength(3);
        
        const potion = activeChar.inventory.find((i: any) => i.id === 'potion_healing');
        expect(potion).toBeDefined();
        expect(potion.quantity).toBe(2);

        const sword = activeChar.inventory.find((i: any) => i.id === 'sword_magic');
        expect(sword).toBeDefined();
        expect(sword.quantity).toBe(1);

        // 3. Verificar feedback del sistema
        expect(result.systemFeedback).toContain('Looted container');
        expect(result.systemFeedback).toContain('Poción de Curación');
        expect(result.systemFeedback).toContain('Espada Mágica');
    });

    it('should open doors successfully', async () => {
        const result = await InteractionHandler.processInteraction({
            playerAction: 'abrir puerta este',
            targetId: 'East Door',
            actionType: 'interact',
            locationData: mockLocationData,
            currentLocationId: 'loc-1',
            resolvedEntities: [],
            currentOpenDoors: {}
        });

        expect(result.updatedOpenDoors['loc-1:este']).toBe(true);
        expect(result.systemFeedback).toContain('Door opened successfully');
    });

    it('should support selective looting, removing only the target item and leaving others', async () => {
        const worldState = createInitialWorldState();
        worldState.locations['loc-1'] = {
            visited: true,
            visitedCount: 1,
            enemies: [],
            droppedItems: [],
            interactables: {
                chest_1: {
                    id: 'chest_1',
                    state: 'open',
                    usedTimes: 0,
                    items: ['potion_healing', 'potion_healing', 'sword_magic']
                }
            }
        };

        const result = await InteractionHandler.processInteraction({
            playerAction: 'cojo la espada',
            targetId: 'sword_magic', // El target interpretado es la espada
            actionType: 'interact',
            locationData: mockLocationData,
            currentLocationId: 'loc-1',
            resolvedEntities: [],
            worldState,
            party: mockParty,
            adventureData: mockAdventureData,
            activeCharacterName: 'Gael'
        });

        // 1. Verificar WorldState (el cofre debe estar 'open' porque quedan pociones)
        expect(result.updatedWorldState).toBeDefined();
        const locState = result.updatedWorldState.locations['loc-1'];
        expect(locState.interactables?.chest_1.state).toBe('open');
        expect(locState.interactables?.chest_1.items).toEqual(['potion_healing', 'potion_healing']);

        // 2. Verificar que Gael recibió solo la espada mágica
        expect(result.updatedParty).toBeDefined();
        const activeChar = result.updatedParty![0];
        const sword = activeChar.inventory.find((i: any) => i.id === 'sword_magic');
        expect(sword).toBeDefined();
        
        // No debería haber recibido la poción en esta acción selectiva
        const potion = activeChar.inventory.find((i: any) => i.id === 'potion_healing');
        expect(potion).toBeUndefined();
    });

    it('should close container and set its state to closed', async () => {
        const worldState = createInitialWorldState();

        // Primero abrir el cofre
        let result = await InteractionHandler.processInteraction({
            playerAction: 'abrir el cofre',
            targetId: 'Wooden Chest',
            actionType: 'interact',
            locationData: mockLocationData,
            currentLocationId: 'loc-1',
            resolvedEntities: [],
            worldState,
            party: mockParty,
            adventureData: mockAdventureData
        });

        // Ahora cerrarlo
        result = await InteractionHandler.processInteraction({
            playerAction: 'cierro el cofre',
            targetId: 'Wooden Chest',
            actionType: 'interact',
            locationData: mockLocationData,
            currentLocationId: 'loc-1',
            resolvedEntities: [],
            worldState: result.updatedWorldState,
            party: mockParty,
            adventureData: mockAdventureData
        });

        expect(result.updatedWorldState).toBeDefined();
        const locState = result.updatedWorldState.locations['loc-1'];
        expect(locState.interactables?.chest_1.state).toBe('closed');
        expect(result.systemFeedback).toContain('Closed container');
    });

    it('should close doors successfully', async () => {
        const result = await InteractionHandler.processInteraction({
            playerAction: 'cerrar puerta este',
            targetId: 'East Door',
            actionType: 'interact',
            locationData: mockLocationData,
            currentLocationId: 'loc-1',
            resolvedEntities: [],
            currentOpenDoors: { 'loc-1:este': true }
        });

        expect(result.updatedOpenDoors['loc-1:este']).toBe(false);
        expect(result.systemFeedback).toContain('Door closed successfully');
    });

    it('should close generic interactables and update their state to closed in worldState', async () => {
        const worldState = createInitialWorldState();
        const localLocationData = {
            ...mockLocationData,
            interactables: [
                ...mockLocationData.interactables,
                {
                    id: 'trampilla_1',
                    name: 'Trampilla vieja',
                    type: 'interactable',
                    state: 'open'
                }
            ]
        };

        const result = await InteractionHandler.processInteraction({
            playerAction: 'cierro la trampilla',
            targetId: 'Trampilla vieja',
            actionType: 'interact',
            locationData: localLocationData,
            currentLocationId: 'loc-1',
            resolvedEntities: [],
            worldState,
            party: mockParty,
            adventureData: mockAdventureData
        });

        expect(result.updatedWorldState).toBeDefined();
        const locState = result.updatedWorldState.locations['loc-1'];
        expect(locState.interactables?.trampilla_1.state).toBe('closed');
        expect(result.systemFeedback).toContain('Closed interactable');
    });

    it('should block looting if the container is closed', async () => {
        const worldState = createInitialWorldState();
        // Por defecto el cofre de mockLocationData está "closed".
        // Intentar saquearlo directamente debe ser bloqueado.
        const result = await InteractionHandler.processInteraction({
            playerAction: 'saquear cofre',
            targetId: 'Wooden Chest',
            actionType: 'interact',
            locationData: mockLocationData,
            currentLocationId: 'loc-1',
            resolvedEntities: [],
            worldState,
            party: mockParty,
            adventureData: mockAdventureData
        });

        // El estado no debe cambiar a looted y debe contener el feedback de bloqueo
        expect(result.systemFeedback).toContain('is closed. You must open it first');
        // El cofre no debe haberse vaciado en el inventario del jugador
        const locState = result.updatedWorldState.locations['loc-1'];
        expect(locState.interactables?.chest_1).toBeUndefined(); // No se ha guardado estado dinámico, sigue cerrado por defecto
    });

    it('should delegate lifting the physical container to DM narration', async () => {
        const worldState = createInitialWorldState();
        const result = await InteractionHandler.processInteraction({
            playerAction: 'cojo el cofre de madera',
            targetId: 'Wooden Chest',
            actionType: 'interact',
            locationData: mockLocationData,
            currentLocationId: 'loc-1',
            resolvedEntities: [],
            worldState,
            party: mockParty,
            adventureData: mockAdventureData
        });

        // Debe devolver feedback de delegación física al DM y no haber saqueado su contenido
        expect(result.systemFeedback).toContain('intenta coger o llevarse el contenedor físico');
        const activeChar = result.updatedParty![0];
        // El inventario de Gael debe permanecer sin los objetos del cofre
        expect(activeChar.inventory).toHaveLength(1); // Solo tiene Gold
    });

    it('should block opening a door if it is locked and party does not have the key', async () => {
        // Modificar mockLocationData para que la puerta este requiera una llave
        const lockedLocationData = {
            ...mockLocationData,
            connections: [
                {
                    direction: 'este',
                    targetId: 'loc-2',
                    description: 'East corridor',
                    requiredKeyId: 'llave-calabozo' // Requiere llave
                }
            ]
        };

        const result = await InteractionHandler.processInteraction({
            playerAction: 'abrir puerta este',
            targetId: 'East Door',
            actionType: 'interact',
            locationData: lockedLocationData,
            currentLocationId: 'loc-1',
            resolvedEntities: [],
            party: mockParty, // mockParty no tiene la llave en su inventario
            currentOpenDoors: {}
        });

        expect(result.updatedOpenDoors['loc-1:este']).toBeUndefined(); // No debe haberse abierto
        expect(result.systemFeedback).toContain('is locked. You do not have the required key');
    });

    it('should open a locked door if a party member has the required key', async () => {
        const lockedLocationData = {
            ...mockLocationData,
            connections: [
                {
                    direction: 'este',
                    targetId: 'loc-2',
                    description: 'East corridor',
                    requiredKeyId: 'llave-calabozo'
                }
            ]
        };

        // Darle la llave a Gael en la party
        const partyWithKey = [
            {
                ...mockParty[0],
                inventory: [
                    ...mockParty[0].inventory,
                    { id: 'llave-calabozo', name: 'Llave del Calabozo', quantity: 1 }
                ]
            }
        ];

        const result = await InteractionHandler.processInteraction({
            playerAction: 'abrir puerta este',
            targetId: 'East Door',
            actionType: 'interact',
            locationData: lockedLocationData,
            currentLocationId: 'loc-1',
            resolvedEntities: [],
            party: partyWithKey, // La party sí tiene la llave
            currentOpenDoors: {}
        });

        expect(result.updatedOpenDoors['loc-1:este']).toBe(true); // Debe abrirse con éxito
        expect(result.systemFeedback).toContain('Door opened successfully');
        expect(result.doorOpeningDetails).toEqual({
            method: 'key',
            keyName: 'llave calabozo',
            requiredKeyId: 'llave-calabozo'
        });
    });
});
