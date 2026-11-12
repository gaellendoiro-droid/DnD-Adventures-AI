/**
 * Motor de escenas v2 (TASK-084): evalúa `scenes[].startsWhen` SIN IA al final de cada turno.
 *
 * - Cada escena empieza como mucho una vez; se recorren en el orden de los datos.
 * - Al empezar una escena se aplican `onStart.setFlags/clearFlags`, pasa a ser la escena activa
 *   (su `guidance` es lo que recibirá el narrador en el paso D) y se emite `scene_started`, que
 *   puede encadenar otras escenas en el mismo turno.
 * - `afterTurns`: cuando el resto de la condición se cumple, se anota el turno (un "cerrojo");
 *   la condición pasa a ser cierta `afterTurns` turnos después, aunque el suceso ya no se repita.
 *
 * Nada aquí sabe de ninguna aventura concreta: todo sale de los datos del conversor.
 */
import type { SceneCondition } from '@/lib/schemas';
import type { CoreV2Fact, TurnEvent } from './facts';
import type { CoreV2State } from './state';

export interface AdventureSceneLike {
    id: string;
    title: string;
    guidance?: string;
    locationIds?: string[];
    startsWhen?: SceneCondition;
    onStart?: { setFlags?: string[]; clearFlags?: string[] };
}

export type FlagValue = boolean | number | string;

export interface SceneTurnInput {
    scenes: AdventureSceneLike[];
    state: CoreV2State;
    flags: Record<string, FlagValue>;
    /** Localización del grupo al terminar el turno. */
    locationId: string;
    /** Sucesos del turno (ver `deriveTurnEvents` en el puente). */
    events: TurnEvent[];
}

export interface SceneTurnResult {
    state: CoreV2State;
    flags: Record<string, FlagValue>;
    facts: CoreV2Fact[];
    startedSceneIds: string[];
}

export function isFlagOn(value: FlagValue | undefined): boolean {
    if (value === true) return true;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value !== '' && value.toLowerCase() !== 'false' && value !== '0';
    return false;
}

interface EvalContext {
    state: CoreV2State;
    flags: Record<string, FlagValue>;
    locationId: string;
    events: TurnEvent[];
    turn: number;
}

function evaluate(cond: SceneCondition, ctx: EvalContext, key: string): boolean {
    if (typeof cond.afterTurns === 'number' && cond.afterTurns > 0) {
        const { afterTurns, ...rest } = cond;
        let latchedAt = ctx.state.latches[key];
        if (latchedAt === undefined && evaluateBase(rest, ctx, key)) {
            latchedAt = ctx.turn;
            ctx.state.latches[key] = latchedAt;
        }
        return latchedAt !== undefined && ctx.turn - latchedAt >= afterTurns;
    }
    return evaluateBase(cond, ctx, key);
}

function evaluateBase(cond: SceneCondition, ctx: EvalContext, key: string): boolean {
    if (cond.flag !== undefined && !isFlagOn(ctx.flags[cond.flag])) return false;
    if (cond.notFlag !== undefined && isFlagOn(ctx.flags[cond.notFlag])) return false;
    if (cond.atLocation !== undefined && ctx.locationId !== cond.atLocation) return false;
    if (cond.event !== undefined) {
        const happened = ctx.events.some(e => e.event === cond.event && (cond.target === undefined || e.target === cond.target));
        if (!happened) return false;
    }
    if (cond.all && !cond.all.every((child, i) => evaluate(child, ctx, `${key}.all${i}`))) return false;
    if (cond.any && cond.any.length > 0) {
        // Se evalúan todas las ramas (sin cortocircuito) para que sus cerrojos se anoten a tiempo.
        const results = cond.any.map((child, i) => evaluate(child, ctx, `${key}.any${i}`));
        if (!results.some(Boolean)) return false;
    }
    return true;
}

/**
 * Avanza un turno: evalúa las escenas pendientes y aplica las que empiezan.
 * No modifica la entrada.
 */
export function advanceScenes(input: SceneTurnInput): SceneTurnResult {
    const state: CoreV2State = {
        ...input.state,
        turn: input.state.turn + 1,
        startedScenes: { ...input.state.startedScenes },
        latches: { ...input.state.latches },
    };
    const flags = { ...input.flags };
    const events = [...input.events];
    const facts: CoreV2Fact[] = [];
    const startedSceneIds: string[] = [];
    const ctx: EvalContext = { state, flags, locationId: input.locationId, events, turn: state.turn };

    let changed = true;
    while (changed) {
        changed = false;
        for (const scene of input.scenes) {
            if (state.startedScenes[scene.id] !== undefined || !scene.startsWhen) continue;
            if (!evaluate(scene.startsWhen, ctx, scene.id)) continue;

            state.startedScenes[scene.id] = state.turn;
            state.activeSceneId = scene.id;
            startedSceneIds.push(scene.id);
            facts.push({ type: 'SceneStarted', sceneId: scene.id, title: scene.title, turn: state.turn });
            for (const flag of scene.onStart?.setFlags || []) {
                flags[flag] = true;
                facts.push({ type: 'FlagSet', flag, sceneId: scene.id });
            }
            for (const flag of scene.onStart?.clearFlags || []) {
                delete flags[flag];
                facts.push({ type: 'FlagCleared', flag, sceneId: scene.id });
            }
            events.push({ event: 'scene_started', target: scene.id });
            changed = true;
        }
    }

    return { state, flags, facts, startedSceneIds };
}

/** Escena activa (la última que empezó), o `undefined`. */
export function getActiveScene<T extends AdventureSceneLike>(scenes: T[] | undefined, state: CoreV2State | undefined): T | undefined {
    if (!state?.activeSceneId) return undefined;
    return scenes?.find(scene => scene.id === state.activeSceneId);
}
