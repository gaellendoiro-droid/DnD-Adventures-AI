/**
 * Hechos que produce el motor de reglas v2. Son lo único que el narrador (paso D) debe contar.
 */
import type { SceneEvent } from '@/lib/schemas';
import type { ItemHolder } from './state';

/** Prueba que exige una regla: de habilidad (skill) o de característica (ability). */
export interface CheckRequirement {
    kind: 'skill' | 'ability';
    /** Habilidad en inglés de 5e en minúsculas (arcana…) o característica (intelligence…). */
    name: string;
    dc: number;
    /** De dónde sale la regla: los datos de la aventura (PDF) o las reglas oficiales. */
    source: 'adventure' | 'official_rules';
}

export type CoreV2Fact =
    | { type: 'SceneStarted'; sceneId: string; title: string; turn: number }
    | { type: 'FlagSet'; flag: string; sceneId?: string }
    | { type: 'FlagCleared'; flag: string; sceneId?: string }
    | { type: 'ItemTransferred'; itemId: string; from: ItemHolder; to: ItemHolder }
    | { type: 'ItemIdentified'; itemId: string; by?: string }
    | { type: 'CheckRequired'; itemId: string; actorId: string; purpose: 'activate' | 'identify'; check: CheckRequirement }
    | { type: 'ItemUsed'; itemId: string; actorId: string }
    | { type: 'SpellActivated'; itemId: string; actorId: string; spellId: string; affects: 'user' | 'party' | 'target' | 'area' }
    | { type: 'ItemConsumed'; itemId: string }
    | { type: 'ItemUnusable'; itemId: string; actorId: string; reason: 'spell_not_on_class_list' | 'already_consumed' | 'not_accessible' | 'needs_rest_or_identify' };

/** Suceso de un turno que puede disparar escenas (`SceneCondition.event`). */
export interface TurnEvent {
    event: SceneEvent;
    target?: string;
}
