/**
 * Comprobaciones de CONTENIDO de una aventura (sin IA): que se pueda jugar de principio a fin.
 *
 * Las usan el conversor PDF → JSON (para reparar e informar al convertir) y los tests. A diferencia
 * del validador de esquema, no miran tipos sino coherencia:
 *  - todas las localizaciones son alcanzables desde la inicial;
 *  - cada flag de presencia (`presenceFlag`) lo activa alguna escena, o nunca aparecería la entidad;
 *  - escenas, condiciones y objetos solo usan IDs que existen.
 */
import { resolveStartingLocationId } from './starting-location';
import type { SceneCondition } from '@/lib/schemas';

export interface ContentIssue {
    code:
        | 'UNREACHABLE_LOCATION'
        | 'FLAG_NEVER_SET'
        | 'UNKNOWN_ID'
        | 'SCENE_WITHOUT_TRIGGER';
    message: string;
    ref?: string;
}

/** Flags que pone el propio motor, sin necesidad de escena (p. ej. al derrotar a una entidad). */
const ENGINE_FLAG = /_derrotad[oa]$|_defeated$/;

export function reachableLocations(data: any): Set<string> {
    const start = resolveStartingLocationId(data);
    const byId = new Map<string, any>((data.locations ?? []).map((l: any) => [l.id, l]));
    const seen = new Set<string>();
    const queue = start ? [start] : [];
    while (queue.length > 0) {
        const id = queue.shift()!;
        if (seen.has(id) || !byId.has(id)) continue;
        seen.add(id);
        for (const c of byId.get(id)?.connections ?? []) {
            if (c?.targetId && !seen.has(c.targetId)) queue.push(c.targetId);
        }
    }
    return seen;
}

/** Todos los flags que exige `presenceFlag` en alguna localización. */
export function presenceFlags(data: any): Set<string> {
    const flags = new Set<string>();
    for (const loc of data.locations ?? []) {
        for (const e of loc.entitiesPresent ?? []) {
            if (e && typeof e === 'object' && e.presenceFlag) flags.add(e.presenceFlag);
        }
    }
    return flags;
}

/** Flags que activa alguna escena al empezar. */
export function flagsSetByScenes(data: any): Set<string> {
    const flags = new Set<string>();
    for (const s of data.scenes ?? []) {
        for (const f of s.onStart?.setFlags ?? []) flags.add(f);
    }
    return flags;
}

function conditionIds(cond: SceneCondition | undefined, out: { locations: string[]; targets: string[] }): void {
    if (!cond) return;
    if (cond.atLocation) out.locations.push(cond.atLocation);
    if (cond.target) out.targets.push(cond.target);
    for (const c of cond.all ?? []) conditionIds(c, out);
    for (const c of cond.any ?? []) conditionIds(c, out);
}

export function checkAdventureContent(data: any): ContentIssue[] {
    const issues: ContentIssue[] = [];
    const locationIds = new Set<string>((data.locations ?? []).map((l: any) => l.id));
    const entityIds = new Set<string>((data.entities ?? []).map((e: any) => e.id));
    const itemIds = new Set<string>((data.items ?? []).map((i: any) => i.id));
    const sceneIds = new Set<string>((data.scenes ?? []).map((s: any) => s.id));
    const anyId = (id: string) => locationIds.has(id) || entityIds.has(id) || itemIds.has(id) || sceneIds.has(id);

    const reachable = reachableLocations(data);
    for (const id of locationIds) {
        if (!reachable.has(id)) {
            issues.push({ code: 'UNREACHABLE_LOCATION', message: `La localización '${id}' no es alcanzable desde la inicial.`, ref: id });
        }
    }

    const setByScenes = flagsSetByScenes(data);
    for (const flag of presenceFlags(data)) {
        if (!ENGINE_FLAG.test(flag) && !setByScenes.has(flag)) {
            issues.push({ code: 'FLAG_NEVER_SET', message: `Ninguna escena activa el flag '${flag}': sus entidades nunca aparecerán.`, ref: flag });
        }
    }

    for (const scene of data.scenes ?? []) {
        if (!scene.startsWhen) {
            issues.push({ code: 'SCENE_WITHOUT_TRIGGER', message: `La escena '${scene.id}' no tiene disparador (startsWhen).`, ref: scene.id });
        }
        const ids = { locations: [] as string[], targets: [] as string[] };
        conditionIds(scene.startsWhen, ids);
        for (const id of [...ids.locations, ...(scene.locationIds ?? [])]) {
            if (!locationIds.has(id)) issues.push({ code: 'UNKNOWN_ID', message: `La escena '${scene.id}' usa la localización inexistente '${id}'.`, ref: id });
        }
        for (const id of ids.targets) {
            if (!anyId(id)) issues.push({ code: 'UNKNOWN_ID', message: `La escena '${scene.id}' usa el ID inexistente '${id}'.`, ref: id });
        }
    }

    for (const item of data.items ?? []) {
        const s = item.startsWith;
        if (s?.entityId && !entityIds.has(s.entityId)) {
            issues.push({ code: 'UNKNOWN_ID', message: `El objeto '${item.id}' empieza en la entidad inexistente '${s.entityId}'.`, ref: s.entityId });
        }
        if (s?.locationId && !locationIds.has(s.locationId)) {
            issues.push({ code: 'UNKNOWN_ID', message: `El objeto '${item.id}' empieza en la localización inexistente '${s.locationId}'.`, ref: s.locationId });
        }
    }

    return issues;
}

/**
 * Añade la conexión de vuelta cuando solo existe la de ida (A → B sin B → A), algo que los
 * extractores olvidan a menudo. Devuelve cuántas añadió.
 */
export function addReturnConnections(data: any): number {
    const byId = new Map<string, any>((data.locations ?? []).map((l: any) => [l.id, l]));
    const OPPOSITE: Record<string, string> = {
        norte: 'sur', sur: 'norte', este: 'oeste', oeste: 'este',
        noreste: 'suroeste', suroeste: 'noreste', noroeste: 'sureste', sureste: 'noroeste',
        arriba: 'abajo', abajo: 'arriba', dentro: 'fuera', fuera: 'dentro',
    };
    let added = 0;
    for (const loc of data.locations ?? []) {
        for (const c of loc.connections ?? []) {
            const target = byId.get(c.targetId);
            if (!target) continue;
            target.connections = target.connections ?? [];
            if (!target.connections.some((b: any) => b.targetId === loc.id)) {
                target.connections.push({
                    targetId: loc.id,
                    ...(c.direction && OPPOSITE[c.direction] ? { direction: OPPOSITE[c.direction] } : {}),
                    description: `Camino de vuelta a ${loc.name ?? loc.id}.`,
                    ...(c.travelTime ? { travelTime: c.travelTime } : {}),
                });
                added++;
            }
        }
    }
    return added;
}
