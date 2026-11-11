import { createEvent } from '@/lib/streaming/protocol';
import { GameStreamEvent } from '@/lib/streaming/types';
import { NarrativeExpertInput } from '../flows/schemas';
import {
    narrativeRouterPrompt,
    combatInitiationPrompt,
    narrativeDirectorPrompt
} from '../flows/narrative-manager';
import { explorationExpert } from '../flows/experts/exploration-expert';
import { interactionExpert } from '../flows/experts/interaction-expert';
import { executePromptWithRetry } from '../flows/retry-utils';
import { streamPromptWithRetry } from './stream-retry-utils';
import { log } from '@/lib/logger';
import { repairPunctuationSpacing } from '@/lib/utils/text-cleaner';

/**
 * Orchestrates the narrative generation in a streaming fashion.
 * Yields 'token' events for text, and 'debug' events for logic steps.
 * Uses the centralized Narrative Director hierarchy to maintain storyline integrity and formatting.
 */
export async function* narrativeManagerStream(
    input: NarrativeExpertInput
): AsyncGenerator<GameStreamEvent, void, unknown> {

    try {
        // 1. Combat Initiation (Legacy/Special Mode)
        if (input.phase === 'combat_initiation') {
            yield createEvent('debug', { message: 'Mode: COMBAT INITIATION' });

            const response = await streamPromptWithRetry(combatInitiationPrompt as any, input);
            for await (const chunk of response.stream) {
                const text = chunk.content?.[0]?.text;
                if (text) {
                    yield createEvent('token', { role: 'dm', content: text });
                }
            }
            return;
        }

        // 2. Routing
        let classification: 'EXPLORATION' | 'INTERACTION' | 'HYBRID' = 'EXPLORATION';
        const interpreted = (input.interpretedAction || '').toLowerCase();
        const isObviousExploration = interpreted.includes('"actiontype":"move"');
        const looksSocial = interpreted.includes('npc') || interpreted.includes('say') || interpreted.includes('hablar') || interpreted.includes('decir');

        const hasCommunicationEffect = interpreted.includes('speak_with_animals') || interpreted.includes('comprehend_languages');
        const hasNPCs = input.explorationContext?.presentEntities && input.explorationContext.presentEntities.length > 0;

        if (hasCommunicationEffect && hasNPCs) {
            yield createEvent('debug', { message: 'Forcing HYBRID classification due to active/activated communication effect and present NPCs' });
            classification = 'HYBRID';
        } else if (isObviousExploration && !looksSocial) {
            yield createEvent('debug', { message: 'Skipping router (obvious exploration)' });
            classification = 'EXPLORATION';
        } else {
            const routerResponse = await executePromptWithRetry(
                narrativeRouterPrompt,
                {
                    playerAction: input.playerAction,
                    interpretedAction: input.interpretedAction,
                    conversationHistory: input.conversationHistory
                },
                { flowName: 'narrativeRouter' }
            );
            classification = routerResponse.output?.classification || 'EXPLORATION';
            yield createEvent('debug', { message: `Classification: ${classification}` });
        }

        let explorationText: string | undefined = undefined;
        let interactionText: string | undefined = undefined;

        // 3. Execution based on classification
        if (classification === 'EXPLORATION') {
            yield createEvent('debug', { message: 'Executing Exploration Expert...' });
            const expResult = await explorationExpert({
                playerAction: input.playerAction,
                locationId: input.locationId,
                locationContext: input.locationContext,
                interpretedAction: input.interpretedAction,
                deadEntities: input.deadEntities,
                isKeyMoment: (input as any).isKeyMoment,
                systemFeedback: input.systemFeedback,
                explorationContext: input.explorationContext,
                adventureLore: input.adventureLore,
                activeEffects: input.activeEffects,
                skillCheckResult: input.skillCheckResult,
                narrativeDirectives: input.narrativeDirectives,
            });
            explorationText = expResult.explorationNarration;

        } else if (classification === 'INTERACTION') {
            yield createEvent('debug', { message: 'Executing Interaction Expert...' });
            const resolvedNpcContext = input.explorationContext?.presentEntities && input.explorationContext.presentEntities.length > 0
                ? JSON.stringify(input.explorationContext.presentEntities)
                : input.locationContext;

            const intResult = await interactionExpert({
                playerAction: input.playerAction,
                npcContext: resolvedNpcContext,
                conversationHistory: input.conversationHistory || "",
                interpretedAction: input.interpretedAction,
                isKeyMoment: (input as any).isKeyMoment,
                activeEffects: input.activeEffects,
                adventureLore: input.adventureLore,
                skillCheckResult: input.skillCheckResult,
                narrativeDirectives: input.narrativeDirectives,
            });
            interactionText = intResult.npcResponse;

        } else { // HYBRID
            yield createEvent('debug', { message: 'Executing Hybrid Experts (Parallel)...' });
            const resolvedNpcContext = input.explorationContext?.presentEntities && input.explorationContext.presentEntities.length > 0
                ? JSON.stringify(input.explorationContext.presentEntities)
                : input.locationContext;

            const [expResult, intResult] = await Promise.all([
                explorationExpert({
                    playerAction: input.playerAction,
                    locationId: input.locationId,
                    locationContext: input.locationContext,
                    interpretedAction: input.interpretedAction,
                    deadEntities: input.deadEntities,
                    isKeyMoment: (input as any).isKeyMoment,
                    systemFeedback: input.systemFeedback,
                    explorationContext: input.explorationContext,
                    adventureLore: input.adventureLore,
                    activeEffects: input.activeEffects,
                    skillCheckResult: input.skillCheckResult,
                    narrativeDirectives: input.narrativeDirectives,
                }),
                interactionExpert({
                    playerAction: input.playerAction,
                    npcContext: resolvedNpcContext,
                    conversationHistory: input.conversationHistory || "",
                    interpretedAction: input.interpretedAction,
                    isKeyMoment: (input as any).isKeyMoment,
                    activeEffects: input.activeEffects,
                    adventureLore: input.adventureLore,
                    skillCheckResult: input.skillCheckResult,
                    narrativeDirectives: input.narrativeDirectives,
                })
            ]);

            explorationText = expResult.explorationNarration;
            interactionText = intResult.npcResponse;
        }

        // 4. Centralized Narrative Director call (unifying EXPLORATION, INTERACTION, and HYBRID)
        yield createEvent('debug', { message: 'Synthesizing with Narrative Director...' });
        const directorResponse = await executePromptWithRetry(
            narrativeDirectorPrompt,
            {
                playerAction: input.playerAction,
                explorationText,
                interactionText,
                conversationHistory: input.conversationHistory || "",
                adventureLore: input.adventureLore,
                systemFeedback: input.systemFeedback,
                activeEffects: input.activeEffects,
                skillCheckResult: input.skillCheckResult,
                narrativeDirectives: input.narrativeDirectives,
            },
            { flowName: 'narrativeDirector' }
        );

        const rawNarration = directorResponse.output?.finalNarration || `${explorationText || ''}\n\n${interactionText || ''}`.trim();
        const finalNarration = repairPunctuationSpacing(rawNarration);

        // 5. Artificial Streaming of the final narration
        for (const char of finalNarration) {
            yield createEvent('token', { role: 'dm', content: char });
        }

    } catch (error: any) {
        log.error('NarrativeManagerStream failed', error);
        yield createEvent('error', {
            code: 'NARRATIVE_ERROR',
            message: error.message,
            isFatal: false
        });
    }
}
