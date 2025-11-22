/**
 * @fileOverview EntityStatusUtils - Utilidades centralizadas para verificar estados de entidades
 * 
 * Este módulo centraliza toda la lógica de verificación de estados de personajes y enemigos,
 * incluyendo comprobaciones de vida/muerte, consciencia/inconsciencia, y capacidad de reacción.
 * 
 * IMPORTANTE: Esta es una refactorización estructural. La lógica se ha extraído desde
 * múltiples archivos (game-coordinator.ts, companion-reaction-manager.ts, rules-engine.ts)
 * SIN MODIFICACIONES para preservar el comportamiento exacto.
 */

import type { Character } from '@/lib/types';

/**
 * Verifica si una entidad está viva y consciente.
 * 
 * Una entidad está activa si:
 * - Su HP actual es mayor que 0
 * - No está marcada como muerta (isDead !== true)
 * 
 * @param entity - Personaje o enemigo a verificar
 * @returns true si la entidad está viva y consciente
 */
export function isEntityActive(entity: Character | any): boolean {
    if (!entity || !entity.hp) {
        return false;
    }

    // LÓGICA EXACTA MOVIDA DESDE companion-reaction-manager.ts y game-coordinator.ts
    return entity.hp.current > 0 && entity.isDead !== true;
}

/**
 * Verifica si una entidad puede reaccionar en el flujo narrativo.
 * 
 * Una entidad puede reaccionar si:
 * - Es controlada por IA (para compañeros)
 * - Está viva y consciente (hp.current > 0 && isDead !== true)
 * 
 * @param entity - Personaje a verificar
 * @returns true si la entidad puede generar reacciones
 */
export function canEntityReact(entity: Character): boolean {
    // LÓGICA EXACTA MOVIDA DESDE companion-reaction-manager.ts (líneas 83 y 119)
    return entity.controlledBy === 'AI' && entity.hp.current > 0 && entity.isDead !== true;
}

/**
 * Verifica si una entidad está muerta (no solo inconsciente).
 * 
 * @param entity - Personaje o enemigo a verificar
 * @returns true si la entidad está muerta (isDead === true)
 */
export function isEntityDead(entity: Character | any): boolean {
    return entity?.isDead === true;
}

/**
 * Verifica si una entidad está inconsciente (HP <= 0 pero no muerta).
 * 
 * @param entity - Personaje o enemigo a verificar
 * @returns true si la entidad está inconsciente
 */
export function isEntityUnconscious(entity: Character | any): boolean {
    if (!entity || !entity.hp) {
        return false;
    }

    return entity.hp.current <= 0 && entity.isDead !== true;
}

/**
 * Verifica si una entidad está fuera de combate (muerta o inconsciente).
 * 
 * @param entity - Personaje o enemigo a verificar
 * @returns true si la entidad no puede actuar
 */
export function isEntityOutOfCombat(entity: Character | any): boolean {
    if (!entity || !entity.hp) {
        return true;
    }

    // LÓGICA EXACTA MOVIDA DESDE game-coordinator.ts (línea 60)
    return entity.hp.current <= 0 || entity.isDead === true;
}

/**
 * Filtra una lista de entidades, devolviendo solo las que están vivas y conscientes.
 * 
 * @param entities - Lista de personajes o enemigos
 * @returns Lista filtrada con solo entidades activas
 */
export function filterActiveEntities<T extends Character | any>(entities: T[]): T[] {
    return entities.filter(entity => isEntityActive(entity));
}

/**
 * Filtra una lista de entidades, devolviendo solo las que están muertas o inconscientes.
 * 
 * @param entities - Lista de personajes o enemigos
 * @returns Lista filtrada con solo entidades fuera de combate
 */
export function filterDeadEntities<T extends Character | any>(entities: T[]): T[] {
    return entities.filter(entity => isEntityOutOfCombat(entity));
}

/**
 * Obtiene los nombres de las entidades muertas de una lista.
 * Útil para contexto narrativo.
 * 
 * @param entities - Lista de personajes o enemigos
 * @returns Array con los nombres de las entidades muertas
 */
export function getDeadEntityNames<T extends Character | any>(entities: T[]): string[] {
    return filterDeadEntities(entities).map(entity => entity.name || entity.id || 'Unknown entity');
}

/**
 * Verifica si todos los miembros de un grupo están muertos o inconscientes.
 * 
 * @param entities - Lista de personajes
 * @returns true si todos están fuera de combate
 */
export function areAllEntitiesOutOfCombat<T extends Character | any>(entities: T[]): boolean {
    if (!entities || entities.length === 0) {
        return true;
    }

    // LÓGICA EXACTA MOVIDA DESDE game-coordinator.ts (línea 60)
    return entities.every(entity => entity.hp && (entity.hp.current <= 0 || entity.isDead === true));
}

/**
 * Verifica si todos los miembros de un grupo están realmente muertos (no solo inconscientes).
 * 
 * @param entities - Lista de personajes
 * @returns true si todos están muertos
 */
export function areAllEntitiesDead<T extends Character | any>(entities: T[]): boolean {
    if (!entities || entities.length === 0) {
        return true;
    }

    // LÓGICA EXACTA MOVIDA DESDE game-coordinator.ts (línea 63)
    return entities.every(entity => entity.isDead === true);
}
