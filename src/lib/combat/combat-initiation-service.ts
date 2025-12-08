/**
 * @fileOverview Combat Initiation Service
 * 
 * Centralizes all combat initiation logic, extracting it from game-coordinator.ts.
 * This service handles:
 * - Player-initiated attacks (with potential surprise)
 * - Dynamic combat triggers (ambushes, mimics, proximity)
 * - Enemy preparation and normalization
 * - Surprise determination
 * 
 * Design: Stateless service with static methods for easy testing and use.
 */

import { log } from '@/lib/logger';
import { EnemyStateManager } from '@/lib/game/enemy-state-manager';
import { CombatTriggerEvaluator, CombatTriggerResult } from '@/lib/combat/trigger/combat-trigger-evaluator';
import type { Character, GameMessage, Location } from '@/lib/types';

// ============================================================================
// Interfaces
// ============================================================================

export interface CombatInitiationRequest {
    /** Type of combat initiation */
    initiationType: 'player_attack' | 'dynamic_trigger';

    /** Combat trigger result (for dynamic triggers) */
    triggerResult?: CombatTriggerResult;

    /** Player's party */
    party: Character[];

    /** Enemies organized by location ID */
    enemiesByLocation?: Record<string, any[]>;

    /** Fallback enemies (backwards compatibility) */
    fallbackEnemies?: any[];

    /** Current location ID */
    locationId: string;

    /** Location data from adventure */
    locationData: Location;

    /** Full adventure data (for entity lookup) */
    adventureData: any;

    /** Player's action text */
    playerAction: string;

    /** Interpreted action from action interpreter */
    interpretedAction: {
        actionType: string;
        targetId?: string | null;
    };

    /** New location ID if player moved before combat */
    newLocationId?: string;

    /** New location data if player moved */
    newLocationData?: Location;
}

export interface CombatInitiationResponse {
    /** Whether combat should start */
    shouldStartCombat: boolean;

    /** IDs of all combatants (party + enemies) */
    combatantIds: string[];

    /** Which side is surprised (if any) */
    surpriseSide?: 'player' | 'enemy';

    /** Reason for combat initiation */
    reason?: 'player_attack' | 'ambush' | 'proximity' | 'stealth_fail' | 'mimic' | 'provocation' | 'player_surprise';

    /** Enemies prepared for combat (normalized and revealed) */
    preparedEnemies: any[];

    /** Messages to display during combat transition */
    narrativeMessages: GameMessage[];

    /** Updated enemies by location (with revealed enemies) */
    updatedEnemiesByLocation: Record<string, any[]>;

    /** Location ID where combat takes place */
    combatLocationId: string;

    /** Location data where combat takes place */
    combatLocationData: Location;

    /** Debug logs for troubleshooting */
    debugLogs: string[];

    // 🔮 FUTURE EXTENSION: Initial positions for tactical combat
    // initialPositions?: Record<string, { x: number; y: number }>;
}

// ============================================================================
// Combat Initiation Service
// ============================================================================

export class CombatInitiationService {

    /**
     * Prepares combat initiation based on the request type.
     * This is the main entry point for all combat initiation logic.
     */
    static async prepareCombatInitiation(
        request: CombatInitiationRequest
    ): Promise<CombatInitiationResponse> {
        const debugLogs: string[] = [];
        const localLog = (message: string) => {
            log.debug(message, { module: 'CombatInitiationService' });
            debugLogs.push(`CombatInitiationService: ${message}`);
        };

        localLog(`Preparing combat initiation. Type: ${request.initiationType}`);

        if (request.initiationType === 'player_attack') {
            return this.handlePlayerAttack(request, localLog, debugLogs);
        } else {
            return this.handleDynamicTrigger(request, localLog, debugLogs);
        }
    }

    /**
     * Handles player-initiated attacks.
     * The player attacks first, potentially with surprise.
     */
    private static async handlePlayerAttack(
        request: CombatInitiationRequest,
        localLog: (msg: string) => void,
        debugLogs: string[]
    ): Promise<CombatInitiationResponse> {
        const { party, locationId, locationData, interpretedAction } = request;

        // Evaluate if this is a surprise attack
        const playerActionTrigger = CombatTriggerEvaluator.evaluatePlayerAction({
            actionType: interpretedAction.actionType,
            targetId: interpretedAction.targetId || undefined,
            isCombatAction: true
        });

        const surpriseSide = playerActionTrigger.surpriseSide;

        if (surpriseSide === 'player') {
            localLog(`Player Surprise Attack detected. Target: ${interpretedAction.targetId}`);
        } else {
            localLog(`Normal combat initiation. Target: ${interpretedAction.targetId}`);
        }

        // Get and prepare enemies for combat location
        const { enemies, updatedEnemiesByLocation } = this.prepareEnemiesForLocation(
            request,
            locationId,
            locationData,
            localLog
        );

        // If no viable enemies, do not start combat
        if (enemies.length === 0) {
            localLog('No viable enemies found for player attack. Aborting combat initiation.');
            return {
                shouldStartCombat: false,
                combatantIds: party.map(p => p.id),
                surpriseSide,
                reason: surpriseSide === 'player' ? 'player_surprise' : 'player_attack',
                preparedEnemies: [],
                narrativeMessages: [{
                    id: `msg-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    sender: 'DM',
                    content: `No encuentras ningún enemigo válido al que atacar.`
                }],
                updatedEnemiesByLocation,
                combatLocationId: locationId,
                combatLocationData: locationData,
                debugLogs
            };
        }

        // Build combatant IDs
        const partyIds = party.map(p => p.id);
        const enemyIds = enemies.map(e => e.id || e.uniqueId);
        const combatantIds = [...partyIds, ...enemyIds];

        localLog(`Combat participants: ${combatantIds.length} (${partyIds.length} party, ${enemyIds.length} enemies)`);

        return {
            shouldStartCombat: true,
            combatantIds,
            surpriseSide,
            reason: surpriseSide === 'player' ? 'player_surprise' : 'player_attack',
            preparedEnemies: enemies,
            narrativeMessages: [],
            updatedEnemiesByLocation,
            combatLocationId: locationId,
            combatLocationData: locationData,
            debugLogs
        };
    }

    /**
     * Handles dynamic combat triggers (ambush, mimic, proximity, etc.).
     * These are triggered by game events, not direct player attacks.
     */
    private static async handleDynamicTrigger(
        request: CombatInitiationRequest,
        localLog: (msg: string) => void,
        debugLogs: string[]
    ): Promise<CombatInitiationResponse> {
        const { party, triggerResult, locationId, locationData, adventureData, newLocationId, newLocationData } = request;

        if (!triggerResult) {
            localLog('ERROR: Dynamic trigger requested but no triggerResult provided');
            return this.createNoOpResponse(request, debugLogs);
        }

        localLog(`Dynamic Combat Triggered. Reason: ${triggerResult.reason}`);

        // Determine combat location (could be new location if player moved)
        const combatLocationId = newLocationId || locationId;
        const combatLocationData = newLocationData || locationData;

        if (newLocationId && newLocationId !== locationId) {
            localLog(`Combat location switched to new location: ${combatLocationId}`);
        }

        // Initialize narrativeMessages early
        const narrativeMessages: GameMessage[] = [];
        if (triggerResult.message) {
            narrativeMessages.push({
                id: `msg-trigger-${Date.now()}`,
                timestamp: new Date().toISOString(),
                sender: 'DM',
                content: `**${triggerResult.message}**`
            });
        }

        // Get and prepare enemies for combat location
        // For ambushes, we need to reveal ALL hidden enemies
        const isAmbush = triggerResult.reason === 'ambush';
        const { enemies, updatedEnemiesByLocation } = this.prepareEnemiesForLocation(
            request,
            combatLocationId,
            combatLocationData,
            localLog,
            triggerResult.triggeringEntityId,
            isAmbush
        );

        if (enemies.length === 0) {
            localLog('No viable enemies found for dynamic trigger. Aborting combat initiation.');

            // Still return updated state (e.g. revealed enemies) but don't start combat
            const noCombatMessages = [...narrativeMessages];
            if (narrativeMessages.length > 0) { // e.g. "Ambush!"
                noCombatMessages.push({
                    id: `msg-safe-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    sender: 'DM',
                    content: "Parece que no queda ninguna amenaza activa aquí."
                });
            }

            return {
                shouldStartCombat: false,
                combatantIds: [],
                preparedEnemies: [],
                narrativeMessages: noCombatMessages,
                updatedEnemiesByLocation,
                combatLocationId,
                combatLocationData,
                debugLogs,
                surpriseSide: triggerResult.surpriseSide,
                reason: triggerResult.reason as CombatInitiationResponse['reason']
            };
        }

        // Build combatant IDs
        const partyIds = party.map(p => p.id);
        const enemyIds = enemies.map(e => e.id || e.uniqueId);
        const combatantIds = [...partyIds, ...enemyIds];

        localLog(`Combat participants: ${combatantIds.length} (${partyIds.length} party, ${enemyIds.length} enemies)`);

        return {
            shouldStartCombat: true,
            combatantIds,
            surpriseSide: triggerResult.surpriseSide,
            reason: triggerResult.reason as CombatInitiationResponse['reason'],
            preparedEnemies: enemies,
            narrativeMessages,
            updatedEnemiesByLocation,
            combatLocationId,
            combatLocationData,
            debugLogs
        };
    }

    /**
     * Prepares enemies for combat in a specific location.
     * Handles:
     * - Fetching enemies from state or adventure data
     * - Normalizing enemy stats
     * - Revealing hidden enemies (like mimics)
     * - Filtering to only visible/active enemies
     */
    private static prepareEnemiesForLocation(
        request: CombatInitiationRequest,
        locationId: string,
        locationData: Location,
        localLog: (msg: string) => void,
        triggeringEntityId?: string,
        isAmbush: boolean = false
    ): { enemies: any[]; updatedEnemiesByLocation: Record<string, any[]> } {
        const { enemiesByLocation, adventureData, fallbackEnemies } = request;

        // 1. Get enemies from state (prioritize location-specific)
        let combatEnemies = EnemyStateManager.getEnemiesForLocation(
            locationId,
            enemiesByLocation
        );

        localLog(`Found ${combatEnemies.length} enemies in state for location ${locationId}`);

        // 2. Fallback: Load from adventureData if not in state
        if (combatEnemies.length === 0 && locationData.entitiesPresent) {
            combatEnemies = locationData.entitiesPresent.map((id: string) =>
                adventureData.entities?.find((e: any) => e.id === id)
            ).filter((e: any) => e);
            localLog(`Loaded ${combatEnemies.length} enemies from adventure data for location ${locationId}`);
        }

        // 3. Legacy fallback: Use fallbackEnemies if provided and no location-specific enemies
        if (combatEnemies.length === 0 && fallbackEnemies && fallbackEnemies.length > 0) {
            combatEnemies = fallbackEnemies;
            localLog(`Using ${combatEnemies.length} fallback enemies`);
        }

        // 4. Normalize all enemy stats
        combatEnemies = combatEnemies.map((entity: any) =>
            EnemyStateManager.normalizeEnemyStats(entity)
        );

        // 5. Prepare filtered list for combat
        let filteredCombatEnemies: any[] = [];

        // If this is an AMBUSH, reveal ALL hidden enemies
        if (isAmbush) {
            localLog(`Ambush triggered! Revealing all hidden enemies.`);
            filteredCombatEnemies = combatEnemies.map((e: any) =>
                EnemyStateManager.revealHiddenEnemy(e)
            );
            localLog(`Revealed ${filteredCombatEnemies.length} enemies from ambush.`);
        }
        // If there's a specific triggering entity (e.g. mimic), reveal only that one
        else if (triggeringEntityId) {
            const triggeringEnemy = combatEnemies.find((e: any) => e.id === triggeringEntityId);
            if (triggeringEnemy) {
                const revealedEnemy = EnemyStateManager.revealHiddenEnemy(triggeringEnemy);
                filteredCombatEnemies.push(revealedEnemy);
                localLog(`Revealed hidden enemy: ${revealedEnemy.name} (${revealedEnemy.id})`);
            } else {
                localLog(`WARNING: Triggering entity ${triggeringEntityId} not found in enemies list`);
            }

            // Add other visible enemies (excluding already added triggering entity)
            const otherEnemies = EnemyStateManager.filterVisibleEnemies(
                combatEnemies.filter((e: any) => e.id !== triggeringEntityId)
            );
            filteredCombatEnemies = [...filteredCombatEnemies, ...otherEnemies];
        }
        // Normal case: only include visible enemies
        else {
            filteredCombatEnemies = EnemyStateManager.filterVisibleEnemies(combatEnemies);
        }

        localLog(`Total combat enemies after filtering: ${filteredCombatEnemies.length}`);

        // Filter out dead enemies (only for combat participation, not for state preservation)
        filteredCombatEnemies = EnemyStateManager.filterAliveEnemies(filteredCombatEnemies);

        // Ensure triggering entity is revealed (defensive)
        if (triggeringEntityId) {
            filteredCombatEnemies = filteredCombatEnemies.map(e =>
                e.id === triggeringEntityId ? EnemyStateManager.revealHiddenEnemy(e) : e
            );
        }
        localLog(`Alive combat enemies: ${filteredCombatEnemies.length}`);

        // Build updated enemies by location map
        // IMPORTANT: Preserve ALL enemies (alive + dead) but reflect revealed state (ambush/mimic)
        const revealedState = combatEnemies.map((e: any) => {
            if (isAmbush) return EnemyStateManager.revealHiddenEnemy(e);
            if (triggeringEntityId && e.id === triggeringEntityId) return EnemyStateManager.revealHiddenEnemy(e);
            return e;
        });

        const updatedEnemiesByLocation: Record<string, any[]> = {
            ...(enemiesByLocation || {}),
            [locationId]: revealedState
        };

        return {
            enemies: filteredCombatEnemies,
            updatedEnemiesByLocation
        };
    }

    /**
     * Creates a no-op response when combat should not start.
     */
    private static createNoOpResponse(
        request: CombatInitiationRequest,
        debugLogs: string[]
    ): CombatInitiationResponse {
        return {
            shouldStartCombat: false,
            combatantIds: [],
            preparedEnemies: [],
            narrativeMessages: [],
            updatedEnemiesByLocation: request.enemiesByLocation || {},
            combatLocationId: request.locationId,
            combatLocationData: request.locationData,
            debugLogs
        };
    }

    // ========================================================================
    // Helper Methods for External Use
    // ========================================================================

    /**
     * Evaluates a player action to determine if it triggers combat.
     * Wrapper around CombatTriggerEvaluator for consistent API.
     */
    static evaluatePlayerAction(
        actionType: string,
        targetId?: string
    ): CombatTriggerResult {
        return CombatTriggerEvaluator.evaluatePlayerAction({
            actionType,
            targetId,
            isCombatAction: actionType === 'attack'
        });
    }

    /**
     * Evaluates exploration to check for combat triggers.
     * Wrapper around CombatTriggerEvaluator for consistent API.
     */
    static evaluateExploration(
        location: Location,
        detectedHazards: string[],
        visibleEntities: any[],
        stealthCheckResult?: { success: boolean; roll: number }
    ): CombatTriggerResult {
        return CombatTriggerEvaluator.evaluateExploration({
            location,
            detectedHazards,
            visibleEntities,
            stealthCheckResult
        });
    }

    /**
     * Evaluates an interaction to check for combat triggers (e.g., mimics).
     * Wrapper around CombatTriggerEvaluator for consistent API.
     */
    static evaluateInteraction(
        targetId: string,
        locationEntities: any[],
        interactionResult?: { escalation?: boolean; action?: string }
    ): CombatTriggerResult {
        return CombatTriggerEvaluator.evaluateInteraction({
            targetId,
            locationEntities,
            interactionResult
        });
    }
}

