/**
 * Estado del motor de reglas v2 (docs/nucleo-v2.md, paso C).
 *
 * Vive en `worldState.coreV2` y solo lo usa la ruta `CORE_V2=1`. Todas las funciones del motor
 * son puras: reciben un estado y devuelven uno nuevo, sin tocar el original.
 */
import type { z } from 'zod';
import type { CoreV2StateSchema, ItemHolderSchema, ItemSchema } from '@/lib/schemas';

export type CoreV2State = z.infer<typeof CoreV2StateSchema>;
export type ItemHolder = z.infer<typeof ItemHolderSchema>;
export type AdventureItem = z.infer<typeof ItemSchema>;

/** ¿Está activado el núcleo v2? (`CORE_V2=1` o `CORE_V2=true`). */
export function isCoreV2Enabled(env: Record<string, string | undefined> = process.env): boolean {
    const value = (env.CORE_V2 || '').trim().toLowerCase();
    return value === '1' || value === 'true';
}

/** Dónde está cada objeto al empezar la aventura, según `items[].startsWith`. */
export function initialItemHolders(items: AdventureItem[] = []): Record<string, ItemHolder> {
    const holders: Record<string, ItemHolder> = {};
    for (const item of items) {
        const start = item.startsWith;
        if (start?.entityId) {
            holders[item.id] = { kind: 'entity', id: start.entityId };
        } else if (start?.locationId) {
            holders[item.id] = { kind: 'location', id: start.locationId, ...(start.hidden ? { hidden: true } : {}) };
        } else {
            holders[item.id] = { kind: 'unplaced' };
        }
    }
    return holders;
}

/** Objetos que el grupo reconoce nada más verlos (`identification.method` obvious/label). */
function initiallyIdentified(items: AdventureItem[] = []): string[] {
    return items
        .filter(item => item.identification?.method === 'obvious' || item.identification?.method === 'label')
        .map(item => item.id);
}

/** Estado inicial del motor v2 para una aventura. */
export function createCoreV2State(adventure: { items?: AdventureItem[] }): CoreV2State {
    return {
        turn: 0,
        startedScenes: {},
        latches: {},
        itemHolders: initialItemHolders(adventure.items),
        identifiedItems: initiallyIdentified(adventure.items),
    };
}

/**
 * Devuelve el estado v2 guardado o uno nuevo. Completa los objetos que falten (p. ej. si la
 * aventura se ha regenerado con objetos nuevos después de empezar la partida).
 */
export function ensureCoreV2State(existing: Partial<CoreV2State> | undefined, adventure: { items?: AdventureItem[] }): CoreV2State {
    const fresh = createCoreV2State(adventure);
    if (!existing) return fresh;
    const itemHolders = { ...fresh.itemHolders, ...(existing.itemHolders || {}) };
    const identified = new Set([...(existing.identifiedItems || []), ...fresh.identifiedItems]);
    return {
        turn: existing.turn ?? 0,
        startedScenes: { ...(existing.startedScenes || {}) },
        activeSceneId: existing.activeSceneId,
        latches: { ...(existing.latches || {}) },
        itemHolders,
        identifiedItems: [...identified],
    };
}
