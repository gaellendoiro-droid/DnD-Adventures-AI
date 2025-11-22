/**
 * @fileOverview CompanionReactionManager - Gestiona las reacciones de compañeros en flujos narrativos
 * 
 * Este módulo encapsula toda la lógica de generación de reacciones de compañeros,
 * tanto antes como después de la narración del DM.
 * 
 * IMPORTANTE: Esta es una refactorización estructural. La lógica y los prompts
 * se han movido desde game-coordinator.ts SIN MODIFICACIONES para preservar
 * el comportamiento exacto de las IAs.
 */

import { companionExpertTool } from '../../tools/companion-expert';
import type { Character, GameMessage } from '@/lib/types';
import { log } from '@/lib/logger';
import { canEntityReact } from '@/lib/game/entity-status-utils';

/**
 * Timing de las reacciones de compañeros
 */
export type ReactionTiming = 'before_dm' | 'after_dm';

/**
 * Input para procesar reacciones de compañeros
 */
export interface CompanionReactionInput {
    party: Character[];
    playerAction: string;
    interpretation: {
        actionType?: string;
        targetId?: string | null;
    };
    inCombat: boolean;
    timing: ReactionTiming;
    isAdventureStart?: boolean;
    dmNarration?: string; // Solo para 'after_dm'
}

/**
 * Output de las reacciones procesadas
 */
export interface CompanionReactionOutput {
    messages: Omit<GameMessage, 'id' | 'timestamp'>[];
    debugLogs: string[];
}

/**
 * Procesa las reacciones de compañeros según el timing especificado.
 * 
 * Esta función encapsula la lógica exacta que estaba en game-coordinator.ts,
 * incluyendo:
 * - Filtrado de compañeros vivos/conscientes
 * - Construcción de contextos para cada compañero
 * - Llamadas al companionExpertTool
 * - Ensamblaje de mensajes
 * 
 * @param input - Parámetros para generar reacciones
 * @returns Mensajes generados y logs de debug
 */
export async function processCompanionReactions(
    input: CompanionReactionInput
): Promise<CompanionReactionOutput> {
    const { party, playerAction, interpretation, inCombat, timing, isAdventureStart = false, dmNarration } = input;

    const messages: Omit<GameMessage, 'id' | 'timestamp'>[] = [];
    const debugLogs: string[] = [];

    const localLog = (message: string) => debugLogs.push(message);

    // LÓGICA EXACTA MOVIDA DESDE game-coordinator.ts (líneas 324-364 y 428-469)

    if (timing === 'before_dm') {
        // Generate companion reactions BEFORE DM narration (optional, selective reactions to player's proposal)
        // Skip on adventure start and only for significant actions
        const significantActions = ['move', 'attack', 'interact'];
        if (!isAdventureStart && significantActions.includes(interpretation.actionType || '')) {
            log.gameCoordinator('Generating companion reactions (before DM)', {
                partySize: party.length,
                actionType: interpretation.actionType,
            });
            localLog("GameCoordinator: Generating companion reactions before DM narration...");

            for (const character of party) {
                // Issue #26/#27: Skip dead/unconscious companions - they cannot react
                if (canEntityReact(character)) {
                    const isTargeted = interpretation.actionType === 'interact' && interpretation.targetId === character.name;
                    const companionContext = `The player just proposed/said: "${playerAction}"${isTargeted ? `\n\n(You are being directly addressed.)` : ''}`;

                    const companionResult = await companionExpertTool({
                        party: party,
                        characterName: character.name,
                        context: companionContext,
                        inCombat: inCombat,
                        reactionTiming: 'before_dm',
                    });

                    if (companionResult.action && companionResult.action.trim() !== '') {
                        log.gameCoordinator('Companion reacted (before DM)', {
                            character: character.name,
                            action: companionResult.action.substring(0, 50) + '...',
                        });
                        localLog(`${character.name} reacted before DM: "${companionResult.action}"`);
                        messages.push({
                            sender: 'Character',
                            senderName: character.name,
                            characterColor: character.color,
                            content: companionResult.action,
                            originalContent: companionResult.action,
                        });
                    }
                }
            }
        }
    } else if (timing === 'after_dm') {
        // Generate companion reactions AFTER DM narration (and skip on adventure start)
        if (!isAdventureStart) {
            log.gameCoordinator('Generating companion reactions (after DM)', { partySize: party.length });
            localLog("GameCoordinator: Generating companion reactions after DM narration...");
            for (const character of party) {
                // Issue #26/#27: Skip dead/unconscious companions - they cannot react
                if (canEntityReact(character)) {
                    const isTargeted = interpretation.actionType === 'interact' && interpretation.targetId === character.name;
                    // Include DM narration in context so companions react to the CURRENT SITUATION, not just the player's original action
                    const dmNarrationContext = dmNarration
                        ? `\n\nDM narration (what just happened):\n"${dmNarration}"`
                        : '';
                    const companionContext = `The player's action was: "${playerAction}"${dmNarrationContext}${isTargeted ? `\n\n(You are being directly addressed.)` : ''}`;

                    const companionResult = await companionExpertTool({
                        party: party,
                        characterName: character.name,
                        context: companionContext,
                        inCombat: inCombat,
                        reactionTiming: 'after_dm',
                    });

                    if (companionResult.action && companionResult.action.trim() !== '') {
                        log.gameCoordinator('Companion reacted (after DM)', {
                            character: character.name,
                            action: companionResult.action.substring(0, 50) + '...',
                        });
                        localLog(`${character.name} reacted after DM: "${companionResult.action}"`);
                        messages.push({
                            sender: 'Character',
                            senderName: character.name,
                            characterColor: character.color,
                            content: companionResult.action,
                            originalContent: companionResult.action,
                        });
                    }
                }
            }
        } else {
            log.gameCoordinator('Skipping companion reactions (adventure start)', { partySize: party.length });
            localLog("GameCoordinator: Skipping companion reactions because this is the start of the adventure.");
        }
    }

    return { messages, debugLogs };
}
