import { describe, it, expect } from 'vitest';
import { WorldStateManager } from '../../../src/lib/game/world-state-manager';

describe('Entidades Condicionales Dinámicas', () => {
    const mockAdventureData = {
        adventureId: 'la-caza-de-la-oveja-salvaje',
        entities: [
            {
                id: 'guz',
                name: 'Guz',
                type: 'npc',
                stats: { hp: 67, ac: 14 }
            },
            {
                id: 'lobo',
                name: 'Lobo',
                type: 'monster',
                stats: { hp: 11, ac: 13 }
            }
        ],
        locations: [
            {
                id: 'ciudad-inicial',
                name: 'Ciudad Inicial',
                description: 'La plaza central del pueblo.',
                entitiesPresent: [
                    'oveja-finethir',
                    {
                        entityId: 'guz',
                        presenceFlag: 'guz_en_pueblo',
                        absenceFlag: 'guz_derrotado'
                    },
                    {
                        entityId: 'lobo',
                        presenceFlag: 'guz_en_pueblo',
                        absenceFlag: 'guz_derrotado'
                    }
                ]
            },
            {
                id: 'cabañas',
                name: 'Cabañas',
                description: 'Pequeñas cabañas en el bosque.',
                entitiesPresent: [
                    {
                        entityId: 'guz',
                        presenceFlag: 'guz_en_torre',
                        absenceFlag: 'guz_derrotado'
                    }
                ]
            }
        ]
    } as any;

    it('no debe spawnear a Guz si no se cumple el flag de presencia', () => {
        const worldState = {
            locations: {},
            globalFlags: {},
            recentEvents: []
        } as any;

        const result = WorldStateManager.getEffectiveLocationContext(mockAdventureData, worldState, 'ciudad-inicial');
        
        // Solo debería cargarse la oveja-finethir (que siempre está presente porque es un string simple)
        expect(result.enemies.length).toBe(1);
        expect((result.enemies[0] as any).name).toBe('oveja-finethir');
    });

    it('debe spawnear a Guz si se cumple el flag de presencia y no está derrotado', () => {
        const worldState = {
            locations: {},
            globalFlags: {
                guz_en_pueblo: true
            },
            recentEvents: []
        } as any;

        const result = WorldStateManager.getEffectiveLocationContext(mockAdventureData, worldState, 'ciudad-inicial');
        
        // Debería cargarse la oveja + Guz + Lobo (3 en total)
        expect(result.enemies.length).toBe(3);
        
        const guzInstance = result.enemies.find((e: any) => e.adventureId === 'guz') as any;
        expect(guzInstance).toBeDefined();
        expect(guzInstance?.name).toBe('Guz');
        expect(guzInstance?.type).toBe('npc');
        expect(guzInstance?.hp.max).toBe(67);
    });

    it('no debe spawnear a Guz si está derrotado aunque el flag de presencia sea true', () => {
        const worldState = {
            locations: {},
            globalFlags: {
                guz_en_pueblo: true,
                guz_derrotado: true
            },
            recentEvents: []
        } as any;

        const result = WorldStateManager.getEffectiveLocationContext(mockAdventureData, worldState, 'ciudad-inicial');
        
        // Solo la oveja
        expect(result.enemies.length).toBe(1);
        expect((result.enemies[0] as any).name).toBe('oveja-finethir');
    });

    it('debe spawnear a Guz en las cabañas si se retiró a la torre y no está derrotado', () => {
        const worldState = {
            locations: {},
            globalFlags: {
                guz_en_torre: true
            },
            recentEvents: []
        } as any;

        const result = WorldStateManager.getEffectiveLocationContext(mockAdventureData, worldState, 'cabañas');
        
        expect(result.enemies.length).toBe(1);
        expect((result.enemies[0] as any).adventureId).toBe('guz');
        expect(result.enemies[0].hp.max).toBe(67);
    });

    it('debe spawnear o retirar dinámicamente entidades condicionales aunque la sala ya haya sido visitada antes', () => {
        const worldState = {
            locations: {},
            globalFlags: {},
            recentEvents: []
        } as any;

        // 1. Primera visita a ciudad-inicial (sin guz_en_pueblo)
        const firstVisit = WorldStateManager.getEffectiveLocationContext(mockAdventureData, worldState, 'ciudad-inicial');
        expect(firstVisit.enemies.length).toBe(1);
        expect((firstVisit.enemies[0] as any).name).toBe('oveja-finethir');

        // Simulamos que la sala queda marcada como visitada con la oveja presente
        worldState.locations['ciudad-inicial'] = {
            visited: true,
            visitedCount: 1,
            enemies: firstVisit.enemies,
            interactables: {},
            connections: {},
            droppedItems: []
        };

        // 2. Más adelante en la partida se activa guz_en_pueblo = true y el grupo regresa a ciudad-inicial
        worldState.globalFlags.guz_en_pueblo = true;
        const secondVisit = WorldStateManager.getEffectiveLocationContext(mockAdventureData, worldState, 'ciudad-inicial');

        expect(secondVisit.enemies.length).toBe(3); // oveja + guz + lobo
        expect(secondVisit.enemies.some((e: any) => e.adventureId === 'guz')).toBe(true);
        expect(secondVisit.enemies.some((e: any) => e.adventureId === 'lobo')).toBe(true);

        // 3. Si luego se activa guz_derrotado = true, Guz y el Lobo dejan de aparecer como presentes condicionales
        worldState.globalFlags.guz_derrotado = true;
        const thirdVisit = WorldStateManager.getEffectiveLocationContext(mockAdventureData, worldState, 'ciudad-inicial');
        expect(thirdVisit.enemies.length).toBe(1);
        expect((thirdVisit.enemies[0] as any).name).toBe('oveja-finethir');
    });
});
