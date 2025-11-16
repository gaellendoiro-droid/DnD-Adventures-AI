/**
 * @fileOverview Combat Validators
 * Handles validation of HP values, character state checking, and combat end detection.
 * 
 * This module is part of the Fase 1.4 refactorization.
 */

import { log } from '@/lib/logger';

/**
 * Gets a human-readable HP status description based on current/max HP.
 * 
 * @param current Current HP value
 * @param max Maximum HP value
 * @returns HP status string
 */
export const getHpStatus = (current: number, max: number): string => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'Healthy';
    if (percentage >= 60) return 'Injured';
    if (percentage >= 20) return 'Wounded';
    if (percentage > 0) return 'Badly Wounded';
    return 'Defeated';
};

/**
 * Validates and clamps HP values to ensure they are within valid ranges.
 * Ensures hp.current >= 0, hp.current <= hp.max, and hp.max > 0.
 * 
 * Special handling:
 * - If `isDead` is true, maintains hp.current at 0 (cannot be healed until revived)
 * - Clamps hp.current to [0, hp.max]
 * - Sets hp.max to default 10 if invalid
 * 
 * @param character Character or enemy object with hp property
 * @returns Character/enemy with validated and clamped HP values
 */
export function validateAndClampHP(character: any): any {
    if (!character || !character.hp) {
        log.warn('validateAndClampHP: Character has no HP property', {
            module: 'CombatValidators',
            characterId: character?.id || character?.uniqueId || 'unknown',
        });
        return character;
    }
    
    const { current, max } = character.hp;
    
    // Validate hp.max > 0
    if (max <= 0) {
        log.warn('validateAndClampHP: hp.max is invalid, setting to default 10', {
            module: 'CombatValidators',
            characterId: character.id || character.uniqueId || 'unknown',
            originalMax: max,
        });
        character.hp.max = 10;
    }
    
    // Si isDead es true, mantener hp.current = 0 (no puede ser curado hasta revivir)
    if (character.isDead === true) {
        return {
            ...character,
            hp: {
                current: 0,
                max: character.hp.max,
            },
            isDead: true,
        };
    }
    
    // Clamp hp.current to valid range [0, hp.max]
    const validMax = character.hp.max;
    const clampedCurrent = Math.max(0, Math.min(validMax, current));
    
    if (clampedCurrent !== current) {
        log.debug('validateAndClampHP: HP clamped to valid range', {
            module: 'CombatValidators',
            characterId: character.id || character.uniqueId || 'unknown',
            originalCurrent: current,
            clampedCurrent,
            max: validMax,
        });
    }
    
    return {
        ...character,
        hp: {
            current: clampedCurrent,
            max: validMax,
        },
        isDead: character.isDead || false, // Mantener estado existente o false
    };
}

/**
 * Verifica si un personaje está inconsciente o muerto.
 * Para jugador/compañeros: verifica isDead o hp.current <= 0.
 * Para enemigos: solo verifica hp.current <= 0 (comportamiento actual).
 * 
 * @param character Character or enemy object with hp and controlledBy properties
 * @returns true if character is unconscious or dead, false otherwise
 */
export function isUnconsciousOrDead(character: any): boolean {
    if (!character || !character.hp) {
        return false; // Si no tiene HP, asumir que está vivo
    }
    
    // Para jugador/compañeros: verificar isDead o hp.current <= 0
    if (character.controlledBy === 'Player' || character.controlledBy === 'AI') {
        return character.isDead === true || character.hp.current <= 0;
    }
    
    // Para enemigos, mantener lógica actual
    return character.hp.current <= 0;
}

/**
 * Checks if combat has ended by verifying if all enemies or all allies are defeated.
 * Distinguishes between all unconscious (can be healed) and all dead (cannot be healed without resurrection).
 * 
 * @param updatedParty Array of party members with current HP
 * @param updatedEnemies Array of enemies with current HP
 * @returns Object with combatEnded boolean and reason string
 */
export function checkEndOfCombat(updatedParty: any[], updatedEnemies: any[]): { combatEnded: boolean; reason: string | null } {
    // Check if all enemies are defeated (usar isUnconsciousOrDead para consistencia)
    const allEnemiesDefeated = updatedEnemies.every(e => e.hp.current <= 0);
    if (allEnemiesDefeated) {
        return { combatEnded: true, reason: 'Todos los enemigos derrotados' };
    }
    
    // Check if all allies are defeated or dead
    const allAlliesDefeated = updatedParty.every(p => isUnconsciousOrDead(p));
    if (allAlliesDefeated) {
        // Distinguish between all unconscious and all dead
        const allDead = updatedParty.every(p => p.isDead === true);
        if (allDead) {
            return { combatEnded: true, reason: 'Todos los aliados muertos' };
        } else {
            return { combatEnded: true, reason: 'Todos los aliados inconscientes' };
        }
    }
    
    return { combatEnded: false, reason: null };
}

