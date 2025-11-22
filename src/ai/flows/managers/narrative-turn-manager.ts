/**
 * @fileOverview NarrativeTurnManager - Orquestador del flujo narrativo (fuera de combate)
 * 
 * Este módulo encapsula toda la lógica de un turno narrativo, incluyendo:
 * 1. Gestión de movimiento y cambio de ubicación
 * 2. Reacciones de compañeros previas a la narración
 * 3. Filtrado de contexto (enemigos muertos)
 * 4. Generación de narración del DM
 * 5. Reacciones de compañeros posteriores a la narración
 * 
 * IMPORTANTE: Esta es una refactorización estructural. La lógica se ha movido 
 * desde game-coordinator.ts SIN MODIFICACIONES funcionales para preservar 
 * el comportamiento exacto.
 */

import { log } from '@/lib/logger';
import type { GameMessage, Character } from '@/lib/types';
import { markdownToHtml } from '../markdown-to-html';
import { narrativeExpert } from '../narrative-manager';
import { processCompanionReactions } from './companion-reaction-manager';
import { isEntityOutOfCombat } from '@/lib/game/entity-status-utils';
import { formatMessageForTranscript } from '@/lib/utils/transcript-formatter';

/**
 * Input para procesar un turno narrativo
 */
export interface NarrativeTurnInput {
    playerAction: string;
    interpretation: {
        actionType?: string;
        targetId?: string | null;
    };
    party: Character[];
    currentLocationId: string;
    adventureData: any;
    conversationHistory: GameMessage[];
    enemiesByLocation?: Record<string, any[]>;
    enemies?: any[];
}

/**
 * Output de un turno narrativo
 */
export interface NarrativeTurnOutput {
    messages: Omit<GameMessage, 'id' | 'timestamp'>[];
    debugLogs: string[];
    nextLocationId: string | null;
    updatedParty: Character[];
}

/**
 * Ejecuta un turno narrativo completo.
 * 
 * @param input - Datos necesarios para el turno
 * @returns Resultado del turno (mensajes, logs, estado)
 */
export async function executeNarrativeTurn(input: NarrativeTurnInput): Promise<NarrativeTurnOutput> {
    const {
        playerAction,
        interpretation,
        party,
        currentLocationId,
        adventureData,
        conversationHistory,
        enemiesByLocation,
        enemies
    } = input;

    const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
    const debugLogs: string[] = [];
    const localLog = (message: string) => debugLogs.push(message);

    // 1. Check if this is the start of an adventure
    const isAdventureStart = conversationHistory.length === 0 &&
        (playerAction.toLowerCase().includes('comenzar') ||
            playerAction.toLowerCase().includes('empezar') ||
            playerAction.toLowerCase().includes('iniciar'));

    // 2. Handle movement and location context
    let locationId = currentLocationId;
    let newLocationId: string | null = null;
    let finalLocationData = adventureData.locations.find((l: any) => l.id === locationId);
    let currentLocationEnemies = enemiesByLocation?.[locationId] || enemies || [];

    if (interpretation.actionType === 'move' && interpretation.targetId) {
        newLocationId = interpretation.targetId;
        locationId = newLocationId;
        log.gameCoordinator('Player moving to new location', {
            from: currentLocationId,
            to: newLocationId,
        });
        finalLocationData = adventureData.locations.find((l: any) => l.id === locationId);
        if (!finalLocationData) {
            log.error('Location not found', {
                module: 'NarrativeTurnManager',
                locationId,
            });
            throw new Error(`Could not find data for location: ${locationId}.`);
        }
        // Update currentLocationEnemies for the new location
        currentLocationEnemies = enemiesByLocation?.[locationId] || enemies || [];
    }

    // 3. Generate companion reactions BEFORE DM narration
    const beforeDmReactions = await processCompanionReactions({
        party,
        playerAction,
        interpretation,
        inCombat: false,
        timing: 'before_dm',
        isAdventureStart,
    });
    beforeDmReactions.debugLogs.forEach(localLog);
    messages.push(...beforeDmReactions.messages);

    // 4. Generate DM narration
    log.gameCoordinator('Generating DM narration', {
        actionType: interpretation.actionType,
        isAdventureStart,
    });
    localLog("NarrativeTurnManager: Generating DM narration...");

    const historyForNarrator = [...conversationHistory, ...messages];
    const narrativeHistoryTranscript = historyForNarrator.map(formatMessageForTranscript).join('\n');

    // Filter out dead enemies from entitiesPresent before passing to narrative expert
    const filteredLocationData = { ...finalLocationData };
    const deadEntities: string[] = []; // Track defeated enemies for context

    if (filteredLocationData.entitiesPresent && currentLocationEnemies.length > 0) {
        filteredLocationData.entitiesPresent = filteredLocationData.entitiesPresent.filter((entityId: string) => {
            const enemy = currentLocationEnemies.find((e: any) =>
                e.id === entityId ||
                (e as any).uniqueId === entityId ||
                (e as any).adventureId === entityId
            );

            const isDead = enemy && isEntityOutOfCombat(enemy);

            if (isDead) {
                // Collect names of dead enemies for explicit context
                deadEntities.push(enemy.name || enemy.id || 'Unknown enemy');
                return false; // Remove from active entities list
            }

            // Include entity if it's not an enemy, or if it's an enemy that's still alive
            return !enemy || !isDead;
        });
        log.gameCoordinator('Filtered dead enemies from location context', {
            originalCount: finalLocationData.entitiesPresent?.length || 0,
            filteredCount: filteredLocationData.entitiesPresent.length,
            deadEntities: deadEntities.length > 0 ? deadEntities : undefined,
        });
    }

    const narrativeInput = {
        playerAction,
        locationId,
        locationContext: JSON.stringify(filteredLocationData),
        conversationHistory: narrativeHistoryTranscript,
        interpretedAction: JSON.stringify(interpretation),
        // Pass explicit list of dead entities so the AI knows to describe them as corpses
        deadEntities: deadEntities.length > 0 ? deadEntities.join(', ') : undefined,
    };

    const narrativeResult = await narrativeExpert(narrativeInput);
    (narrativeResult.debugLogs || []).forEach(localLog);

    if (narrativeResult.dmNarration) {
        const { html } = await markdownToHtml({ markdown: narrativeResult.dmNarration });
        messages.push({
            sender: 'DM',
            content: html,
            originalContent: narrativeResult.dmNarration,
        });
    }

    // 5. Generate companion reactions AFTER DM narration
    const afterDmReactions = await processCompanionReactions({
        party,
        playerAction,
        interpretation,
        inCombat: false,
        timing: 'after_dm',
        isAdventureStart,
        dmNarration: narrativeResult.dmNarration,
    });
    afterDmReactions.debugLogs.forEach(localLog);
    messages.push(...afterDmReactions.messages);

    log.gameCoordinator('Narrative turn finished', {
        messagesCount: messages.length,
        locationId,
    });
    localLog(`NarrativeTurnManager: Turn finished. Final location: ${locationId}. Returning ${messages.length} messages.`);

    return {
        messages,
        debugLogs,
        nextLocationId: newLocationId,
        updatedParty: party,
    };
}
