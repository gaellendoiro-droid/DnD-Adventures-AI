/**
 * @fileOverview Narration Processor module
 * Handles combat initiation narration generation and post-processing.
 */

import { log } from '@/lib/logger';
import type { Character, Combatant, GameMessage } from '@/lib/types';
import {
    escapeRegex,
    replaceOrdinalReferences,
} from '@/lib/combat/monster-name-manager';
import type { EnemyWithStats } from './types';

export class NarrationProcessor {
    /**
     * Generates the initial combat narration.
     */
    static async generateCombatNarration(
        initiativeOrder: Combatant[],
        updatedParty: Character[],
        updatedEnemies: EnemyWithStats[],
        differentiatedNames: Map<string, string>,
        playerAction: string,
        locationId: string,
        locationContext: any,
        conversationHistory: Array<Partial<GameMessage>>,
        interpretedAction: any,
        narrativeExpert: (input: any) => Promise<any>,
        markdownToHtml: (input: { markdown: string }) => Promise<{ html: string }>,
        localLog: (msg: string) => void
    ): Promise<Array<{ sender: string; content: string; originalContent?: string }>> {
        const messages: Array<{ sender: string; content: string; originalContent?: string }> = [];
        const debugLogs: string[] = [];

        // Format history
        const recentHistory = conversationHistory.slice(-5);
        const historyTranscript = recentHistory.map(msg => {
            const senderName = msg.senderName || msg.sender;
            const content = msg.originalContent || msg.content;
            if (senderName && content) {
                return `${senderName}: ${content}`;
            }
            return '';
        }).join('\n');

        // Build combat context
        const combatContext = {
            initiativeOrder: initiativeOrder.map((c, idx) => ({
                position: idx + 1,
                name: c.characterName,
                controlledBy: c.controlledBy,
                type: c.type
            })),
            allies: updatedParty.map(p => ({
                name: p.name,
                hp: `${p.hp.current}/${p.hp.max}`,
                controlledBy: p.controlledBy || 'Player'
            })),
            enemies: updatedEnemies.map(e => {
                const visualName = differentiatedNames.get(e.uniqueId) || e.name;
                return {
                    name: visualName,
                    hp: `${e.hp.current}/${e.hp.max}`,
                    controlledBy: 'AI'
                };
            })
        };

        const narrativeResult = await narrativeExpert({
            playerAction,
            locationId,
            locationContext: JSON.stringify(locationContext),
            conversationHistory: historyTranscript,
            interpretedAction: JSON.stringify(interpretedAction),
            phase: 'combat_initiation',
            combatContext: JSON.stringify(combatContext)
        });

        if (narrativeResult.dmNarration) {
            const processedNarration = this.postProcessDmNarration(
                narrativeResult.dmNarration,
                updatedEnemies,
                differentiatedNames,
                localLog
            );

            const { html } = await markdownToHtml({ markdown: processedNarration });
            messages.push({ sender: 'DM', content: html, originalContent: processedNarration });
        }

        return messages;
    }

    /**
     * Post-processes DM narration to replace enemy IDs/names with visual names.
     */
    private static postProcessDmNarration(
        narration: string,
        enemies: EnemyWithStats[],
        differentiatedNames: Map<string, string>,
        localLog: (msg: string) => void
    ): string {
        let processedNarration = narration;

        // FIRST: Replace ordinal references (e.g., "primer goblin" -> "Goblin 1")
        processedNarration = replaceOrdinalReferences(processedNarration, enemies, differentiatedNames);

        // Sort enemies by visual name length (longest first) to avoid replacing "Goblin 2" with "Goblin 1 2"
        const enemiesSorted = [...enemies].sort((a, b) => {
            const nameA = differentiatedNames.get(a.uniqueId) || a.name;
            const nameB = differentiatedNames.get(b.uniqueId) || b.name;
            return nameB.length - nameA.length; // Longest first
        });

        for (const enemy of enemiesSorted) {
            const visualName = differentiatedNames.get(enemy.uniqueId) || enemy.name;
            const originalName = enemy.name;

            // Replace uniqueId references first (e.g., "goblin-0", "goblin-1")
            const beforeUniqueId = processedNarration;
            processedNarration = processedNarration.replace(
                new RegExp(`\\b${enemy.uniqueId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
                visualName
            );

            // Replace original name references ONLY if conditions met
            const visualNameLower = visualName.toLowerCase();
            const narrationLower = processedNarration.toLowerCase();

            // Check if the full visual name (e.g., "goblin 1") is present
            const hasFullVisualName = new RegExp(`\\b${escapeRegex(visualNameLower)}\\b`).test(narrationLower);
            const hasBaseNameWithNumber = new RegExp(`\\b${escapeRegex(originalName.toLowerCase())}\\s+\\d+\\b`).test(narrationLower);

            const shouldSkip = hasFullVisualName || hasBaseNameWithNumber;

            if (originalName !== visualName &&
                !visualName.startsWith(originalName + ' ') &&
                !shouldSkip) {

                processedNarration = processedNarration.replace(
                    new RegExp(`\\b${escapeRegex(originalName)}(?!\\s+\\d)`, 'gi'),
                    visualName
                );
            }
        }

        return processedNarration;
    }
}
