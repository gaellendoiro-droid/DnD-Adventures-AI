/**
 * @fileOverview CombatSession - State Object Pattern for Combat Management
 * 
 * Encapsulates all combat state and provides clean methods for state manipulation.
 * This class eliminates the need to pass multiple state variables between functions.
 * 
 * @module CombatSession
 */

import { log } from '@/lib/logger';
import { type Character, type Combatant, type GameMessage, type DiceRoll, CombatPhase } from '@/lib/types';
import type { CombatManagerDependencies } from '@/ai/tools/combat-manager';
import type { z } from 'zod';
import { CombatManagerInputSchema, CombatManagerOutputSchema } from '@/ai/tools/combat-manager';
import { CombatTurnManager } from '@/lib/combat/turn-manager';
import { checkEndOfCombat, getHpStatus, isUnconsciousOrDead } from '@/lib/combat/rules-engine';
import { CombatInitializer } from '@/lib/combat/combat-initializer';
import type { CombatInitContext } from '@/lib/combat/initialization/types';
import { TurnProcessor } from '@/lib/combat/turn-processor';
import { resolveEnemyId } from '@/lib/combat/target-resolver';
import { getVisualName, replaceOrdinalReferences, escapeRegex } from '@/lib/combat/monster-name-manager';
import { SurpriseManager } from '@/lib/combat/surprise-manager';

// Re-export types for convenience
export type CombatManagerInput = z.infer<typeof CombatManagerInputSchema>;
export type CombatManagerOutput = z.infer<typeof CombatManagerOutputSchema>;

/**
 * CombatSession - Encapsulates combat state and provides state manipulation methods.
 * 
 * This class follows the State Object pattern to eliminate the "passing balls of state"
 * anti-pattern where multiple state variables are passed between functions.
 * 
 * @example
 * ```typescript
 * // Create session from input
 * const combat = CombatSession.fromInput(input);
 * 
 * // Initialize or process turn
 * if (!combat.isActive) {
 *   await combat.initialize(deps);
 * } else {
 *   await combat.processCurrentTurn(input.interpretedAction, deps);
 * }
 * 
 * // Serialize to output
 * return combat.toJSON();
 * ```
 */
export class CombatSession {
  // ============================================================================
  // PRIVATE STATE
  // ============================================================================

  /** Current party members */
  private party: Character[];

  /** Current enemies in combat */
  private enemies: any[]; // Using any[] to match existing flexible enemy type

  /** Initiative order of combatants */
  private initiativeOrder: Combatant[];

  /** Current turn index in initiative order */
  private turnIndex: number;

  /** Accumulated messages from combat */
  private messages: Omit<GameMessage, 'id' | 'timestamp'>[];

  /** Accumulated dice rolls from combat */
  private diceRolls: Omit<DiceRoll, 'id' | 'timestamp'>[];

  /** Whether combat is currently active */
  private inCombat: boolean;

  /** Location ID (for context) */
  private locationId: string;

  /** Next location ID (if combat ends and moves to new location) */
  private nextLocationId: string | null;

  /** Flags for turn processing state */
  private lastProcessedTurnWasAI: boolean;
  private lastProcessedTurnIndex: number;
  
  /** Current phase of the combat turn */
  private phase: CombatPhase;

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  /**
   * Private constructor - use `fromInput()` or `createEmpty()` to create instances.
   * 
   * @param party - Party members
   * @param enemies - Enemies in combat
   * @param initiativeOrder - Initiative order
   * @param turnIndex - Current turn index (validated to be in range)
   * @param inCombat - Whether combat is active
   * @param locationId - Current location ID
   * @param nextLocationId - Next location ID (if combat ends)
   */
  private constructor(
    party: Character[],
    enemies: any[],
    initiativeOrder: Combatant[],
    turnIndex: number,
    inCombat: boolean,
    locationId: string,
    nextLocationId: string | null = null,
    phase: CombatPhase = CombatPhase.SETUP
  ) {
    this.party = party;
    this.enemies = enemies;
    this.initiativeOrder = initiativeOrder;

    // Validate and clamp turnIndex to valid range
    if (initiativeOrder.length > 0) {
      this.turnIndex = Math.max(0, Math.min(turnIndex, initiativeOrder.length - 1));
    } else {
      this.turnIndex = 0;
    }

    this.inCombat = inCombat;
    this.locationId = locationId;
    this.nextLocationId = nextLocationId;
    this.phase = phase;
    this.messages = [];
    this.diceRolls = [];
    this.lastProcessedTurnWasAI = false;
    this.lastProcessedTurnIndex = this.turnIndex;
  }

  // ============================================================================
  // FACTORY METHODS
  // ============================================================================

  /**
   * Creates a CombatSession from CombatManagerInput.
   * Validates and normalizes the input data.
   * 
   * @param input - The combat manager input from Genkit
   * @returns A new CombatSession instance
   * @throws Error if input is invalid (e.g., inCombat=true but missing required data)
   */
  static fromInput(input: CombatManagerInput): CombatSession {
    const party = input.party || [];
    const enemies = input.enemies || [];
    const initiativeOrder = input.initiativeOrder || [];
    const inCombat = input.inCombat || false;
    const turnIndex = input.turnIndex ?? 0;

    // Validate: If inCombat is true, we need initiativeOrder and valid turnIndex
    if (inCombat) {
      if (initiativeOrder.length === 0) {
        log.warn('CombatSession.fromInput: inCombat=true but initiativeOrder is empty', {
          module: 'CombatSession',
          action: 'fromInput',
        });
        // Continue anyway, but combat won't work properly
      }

      // Validate turnIndex is in range (will be clamped in constructor)
      if (turnIndex < 0 || (initiativeOrder.length > 0 && turnIndex >= initiativeOrder.length)) {
        log.warn('CombatSession.fromInput: turnIndex out of range, clamping', {
          module: 'CombatSession',
          action: 'fromInput',
          turnIndex,
          initiativeOrderLength: initiativeOrder.length,
        });
      }
    }

    return new CombatSession(
      party,
      enemies,
      initiativeOrder,
      turnIndex,
      inCombat,
      input.locationId || '',
      (input as any).nextLocationId || null,
      input.phase || (inCombat ? CombatPhase.TURN_START : CombatPhase.SETUP)
    );
  }

  /**
   * Creates an empty CombatSession (for testing).
   * 
   * @returns A new empty CombatSession instance
   */
  static createEmpty(): CombatSession {
    return new CombatSession([], [], [], 0, false, '', null, CombatPhase.SETUP);
  }

  // ============================================================================
  // PUBLIC GETTERS
  // ============================================================================

  /**
   * Gets the current active combatant (the one whose turn it is).
   * 
   * @returns The active combatant or null if no combat is active
   */
  getActiveCombatant(): Combatant | null {
    if (!this.inCombat || this.initiativeOrder.length === 0) {
      return null;
    }
    return this.initiativeOrder[this.turnIndex] || null;
  }

  /**
   * Checks if combat is currently active.
   * 
   * @returns true if combat is active
   */
  isActive(): boolean {
    return this.inCombat;
  }

  /**
   * Gets the current turn index.
   * 
   * @returns The current turn index
   */
  getTurnIndex(): number {
    return this.turnIndex;
  }

  /**
   * Gets the initiative order.
   * 
   * @returns The initiative order array
   */
  getInitiativeOrder(): Combatant[] {
    return [...this.initiativeOrder]; // Return copy to prevent external mutation
  }

  /**
   * Gets the current party.
   * 
   * @returns The party array (copy)
   */
  getParty(): Character[] {
    return [...this.party]; // Return copy to prevent external mutation
  }

  /**
   * Gets the current enemies.
   * 
   * @returns The enemies array (copy)
   */
  getEnemies(): any[] {
    return [...this.enemies]; // Return copy to prevent external mutation
  }

  // ============================================================================
  // PUBLIC METHODS (to be implemented in later phases)
  // ============================================================================

  /**
   * Initializes a new combat encounter.
   * Delegates to CombatInitializer and updates internal state with results.
   * 
   * @param deps - Combat manager dependencies
   * @param combatantIds - IDs of combatants to initialize combat with
   * @param locationContext - Location context for narration
   * @param conversationHistory - Recent conversation history
   * @param playerAction - Original player action that triggered combat
   * @param interpretedAction - Interpreted action from action interpreter
   * @returns Promise that resolves when initialization is complete
   * @throws Error if initialization fails critically
   */
  async initialize(
    deps: CombatManagerDependencies,
    combatantIds: string[],
    locationContext: any,
    conversationHistory: Array<Partial<GameMessage>>,
    playerAction: string,
    interpretedAction: any,
    surpriseSide?: 'player' | 'enemy'
  ): Promise<void> {
    this.log('info', 'Initializing combat encounter', {
      combatantIds: combatantIds.length,
      locationId: this.locationId,
    });

    // Lazy load heavy dependencies if not provided via DI
    const narrativeExpertToUse = deps.narrativeExpert || (await import('@/ai/flows/narrative-manager')).narrativeExpert;
    const markdownToHtmlToUse = deps.markdownToHtml || (await import('@/ai/flows/markdown-to-html')).markdownToHtml;

    // Create combat end dice roll helper function
    const createCombatEndDiceRoll = (reason: string): DiceRoll => {
      const isVictory = reason.includes('enemigos derrotados');
      return {
        id: `combat-end-${Date.now()}-${Math.random()}`,
        roller: 'DM',
        rollNotation: '',
        individualRolls: [],
        totalResult: 0,
        outcome: isVictory ? 'victory' : 'defeat',
        timestamp: new Date(),
        description: reason || 'El combate ha finalizado.',
      };
    };

    // Create localLog function that uses our internal logging
    const localLog = (message: string) => {
      this.log('debug', message, { source: 'CombatInitializer' });
    };

    // Prepare context for CombatInitializer
    const initContext: CombatInitContext = {
      combatantIds,
      party: this.party,
      existingEnemies: this.enemies,
      locationContext,
      conversationHistory,
      playerAction,
      interpretedAction,
      locationId: this.locationId,
      surpriseSide, // Pass surprise side to mark surprised combatants
      diceRollerTool: deps.diceRollerTool,
      narrativeExpert: narrativeExpertToUse,
      markdownToHtml: markdownToHtmlToUse,
      processAICombatantRolls: deps.processAICombatantRolls,
      enemyTacticianTool: deps.enemyTacticianTool,
      companionTacticianTool: deps.companionTacticianTool,
      combatNarrationExpertTool: deps.combatNarrationExpertTool,
      createCombatEndDiceRoll,
      localLog,
    };

    // Call CombatInitializer
    const initResult = await CombatInitializer.initializeCombat(initContext);

    if (!initResult.success) {
      // Initialization failed - add error message and update state
      this.addMessage({
        sender: 'DM',
        content: initResult.messages[0]?.content || 'Hubo un error al iniciar el combate.',
      });
      this.addMessages(initResult.messages.slice(1).map(m => ({ ...m, sender: m.sender as 'DM' | 'Player' | 'System' | 'Character' | 'Error' })));
      this.addDiceRolls(initResult.diceRolls);

      // Update party if provided
      if (initResult.updatedParty) {
        this.updateState({ party: initResult.updatedParty });
      }

      this.log('error', 'Combat initialization failed', {
        error: initResult.error,
        messagesCount: initResult.messages.length,
      });

      // Don't throw - let the caller check the state
      return;
    }

    // Initialization succeeded - update state
    this.addMessages(initResult.messages.map(m => ({ ...m, sender: m.sender as 'DM' | 'Player' | 'System' | 'Character' | 'Error' })));
    this.addDiceRolls(initResult.diceRolls);
    
    // Handle firstTurnData if provided (for backward compatibility with tests and old behavior)
    const firstTurnData = (initResult as any).firstTurnData;
    const initialTurnIndex = firstTurnData?.turnIndex ?? 0;
    const initialPhase = firstTurnData ? CombatPhase.ACTION_RESOLVED : CombatPhase.SETUP;
    
    this.updateState({
      party: initResult.updatedParty,
      enemies: initResult.enemies,
      initiativeOrder: initResult.initiativeOrder,
      inCombat: true,
      turnIndex: initialTurnIndex,
      phase: initialPhase,
      lastProcessedTurnWasAI: firstTurnData?.lastProcessedTurnWasAI ?? false,
      lastProcessedTurnIndex: firstTurnData?.lastProcessedTurnIndex ?? 0,
    });

    this.log('info', 'Combat initialized', {
      turnIndex: initialTurnIndex,
      firstCombatant: initResult.initiativeOrder[0]?.characterName,
      hasFirstTurnData: !!firstTurnData,
    });

    // Start Combat FSM (only if firstTurnData wasn't provided, otherwise we're already at ACTION_RESOLVED)
    if (!firstTurnData) {
      await this.transitionTo(CombatPhase.TURN_START, deps, { location: locationContext, history: conversationHistory });
    }
    
    this.log('info', 'Combat initialization completed (FSM started)');
  }

  /**
   * Processes the current turn (player or AI).
   * Detects the type of turn and delegates to appropriate handler.
   * 
   * @param interpretedAction - The interpreted player action (if player's turn)
   * @param playerAction - Original player action text
   * @param locationContext - Location context for narration
   * @param conversationHistory - Recent conversation history
   * @param deps - Combat manager dependencies
   * @returns Promise that resolves when turn processing is complete
   */
  async processCurrentTurn(
    interpretedAction: any,
    playerAction: string,
    locationContext: any,
    conversationHistory: Array<Partial<GameMessage>>,
    deps: CombatManagerDependencies
  ): Promise<void> {
    if (!this.inCombat) {
      this.log('warn', 'Cannot process turn: combat is not active');
      return;
    }

    const activeCombatant = this.getActiveCombatant();
    if (!activeCombatant) {
      this.log('warn', 'Cannot process turn: no active combatant');
      return;
    }

    this.log('info', 'Processing current turn (FSM)', {
      combatant: activeCombatant.characterName,
      controlledBy: activeCombatant.controlledBy,
      turnIndex: this.turnIndex,
      phase: this.phase
    });

    // Handle "continue_turn" action
    if (interpretedAction?.actionType === 'continue_turn') {
      // Relaxed check: Allow continuing from TURN_START (fallback hydration), ACTION_RESOLVED, WAITING_FOR_ACTION, or SETUP (if phase is lost)
      if (this.phase === CombatPhase.ACTION_RESOLVED || 
          this.phase === CombatPhase.TURN_START || 
          this.phase === CombatPhase.WAITING_FOR_ACTION ||
          this.phase === CombatPhase.SETUP) {
          
         this.log('info', 'Processing continue_turn action', { phase: this.phase });
         // Always transition to TURN_END to advance the combat (never re-enter handleTurnStart)
         await this.transitionTo(CombatPhase.TURN_END, deps, { location: locationContext, history: conversationHistory });
      } else {
         this.log('warn', 'Received continue_turn but phase is invalid for advancement', { phase: this.phase });
      }
      return;
    }

    // Handle Player Action
    if (this.phase === CombatPhase.WAITING_FOR_ACTION) {
       if (activeCombatant.controlledBy === 'Player') {
           await this.transitionTo(CombatPhase.PROCESSING_ACTION, deps);
           const success = await this.executeTurnLogic(activeCombatant, interpretedAction, playerAction, locationContext, conversationHistory, deps);
           if (success) {
               await this.transitionTo(CombatPhase.ACTION_RESOLVED, deps);
           } else {
               await this.transitionTo(CombatPhase.WAITING_FOR_ACTION, deps);
           }
           return;
       } else {
           // AI stuck check
           this.log('warn', 'In WAITING phase for AI turn - retrying execution');
           await this.transitionTo(CombatPhase.PROCESSING_ACTION, deps);
           await this.executeTurnLogic(activeCombatant, undefined, undefined, locationContext, conversationHistory, deps);
           await this.transitionTo(CombatPhase.ACTION_RESOLVED, deps);
           return;
       }
    }
    
    // Fallback for hydration (restarting FSM if lost)
    if (this.phase === CombatPhase.SETUP || this.phase === CombatPhase.TURN_START) {
        await this.handleTurnStart(deps, { location: locationContext, history: conversationHistory });
        return;
    }

    this.log('warn', 'Ignored action due to phase mismatch', { phase: this.phase, action: interpretedAction?.actionType });
  }

  /**
   * Advances to the next turn in initiative order.
   * Uses CombatTurnManager to handle wrap-around correctly.
   */
  advanceTurn(): void {
    if (this.initiativeOrder.length === 0) {
      this.log('warn', 'Cannot advance turn: initiative order is empty');
      return;
    }

    const previousIndex = this.turnIndex;
    this.turnIndex = CombatTurnManager.nextTurnIndex(this.turnIndex, this.initiativeOrder.length);

    // Reset processing flags when turn advances
    this.lastProcessedTurnWasAI = false;
    this.playerActionCompleted = false;

    this.log('debug', 'Turn advanced', {
      fromIndex: previousIndex,
      toIndex: this.turnIndex,
      fromCombatant: this.initiativeOrder[previousIndex]?.characterName || 'Unknown',
      toCombatant: this.initiativeOrder[this.turnIndex]?.characterName || 'Unknown',
    });
  }

  /**
   * Checks if there are more AI turns to process.
   * Uses CombatTurnManager to determine if the active combatant is AI or should be skipped.
   * 
   * @returns true if the next turn(s) should be processed automatically (AI)
   */
  hasMoreAITurns(): boolean {
    if (!this.inCombat) {
      return false;
    }

    // If turn is completed, wait for user confirmation (do NOT auto-advance)
    if (this.turnCompleted) {
      return false;
    }

    const activeCombatant = this.getActiveCombatant();
    if (!activeCombatant) {
      return false;
    }

    // Check if combat has ended
    const endCheck = this.checkEndOfCombat();
    if (endCheck.combatEnded) {
      return false;
    }

    // Use CombatTurnManager to determine if there are more AI turns
    return CombatTurnManager.hasMoreAITurns(
      activeCombatant,
      this.party,
      this.enemies,
      endCheck.combatEnded
    );
  }

  /**
   * Checks if combat has ended.
   * Uses rules-engine to check if all enemies are defeated or all allies are unconscious/dead.
   * 
   * @returns Object with combatEnded flag and reason (if ended)
   */
  checkEndOfCombat(): { combatEnded: boolean; reason?: string } {
    if (!this.inCombat) {
      return { combatEnded: false };
    }

    // If there are no enemies remaining, end combat (defensive: avoid infinite WAIT loop)
    if (!this.enemies || this.enemies.length === 0) {
      return { combatEnded: true, reason: 'no_enemies_remaining' };
    }

    const result = checkEndOfCombat(this.party || [], this.enemies || []);

    // Ensure result is always an object with combatEnded property (defensive programming)
    if (!result || typeof result !== 'object' || typeof result.combatEnded !== 'boolean') {
      this.log('warn', 'checkEndOfCombat returned invalid result', { result, partyLength: this.party?.length, enemiesLength: this.enemies?.length });
      return { combatEnded: false };
    }

    if (result.combatEnded) {
      this.log('info', 'Combat ended', {
        reason: result.reason || 'Unknown',
        partyAlive: (this.party || []).filter(p => p.hp && p.hp.current > 0).length,
        enemiesAlive: (this.enemies || []).filter(e => e.hp && e.hp.current > 0).length,
      });
    }

    return {
      combatEnded: result.combatEnded,
      reason: result.reason || undefined,
    };
  }

  /**
   * Serializes the session state to CombatManagerOutput format.
   * 
   * @returns The output object for Genkit
   */
  toJSON(): CombatManagerOutput {
    // Build enemiesByLocation map: associate enemies with current location
    const enemiesByLocation: Record<string, any[]> = {};
    if (this.locationId && this.enemies.length > 0) {
      enemiesByLocation[this.locationId] = this.enemies;
    }

    // Calculate status for each combatant
    const initiativeOrderWithStatus = this.initiativeOrder.map(combatant => {
      let status: 'active' | 'unconscious' | 'dead' = 'active';

      // Find combatant data
      const isCompanion = this.party.some(p => p.id === combatant.id);
      const combatantData = isCompanion
        ? this.party.find(p => p.id === combatant.id)
        : this.enemies.find(e => (e as any).uniqueId === combatant.id || e.id === combatant.id);

      if (combatantData && combatantData.hp) {
        if (combatantData.hp.current <= 0) {
          if (isCompanion) {
            status = combatantData.isDead ? 'dead' : 'unconscious';
          } else {
            // Enemies are generally dead at 0 HP unless specified otherwise
            status = 'dead';
          }
        }
      }

      return {
        ...combatant,
        status
      };
    });

    // Safety check: If phase is ACTION_RESOLVED and active combatant is AI, ensure flag is true
    // This prevents UI lockups if the flag was accidentally reset or not set
    let finalLastProcessedTurnWasAI = this.lastProcessedTurnWasAI;
    if (this.phase === CombatPhase.ACTION_RESOLVED) {
        const active = this.getActiveCombatant();
        if (active && active.controlledBy === 'AI') {
            finalLastProcessedTurnWasAI = true;
        }
    }

    return {
      messages: this.messages,
      diceRolls: this.diceRolls,
      updatedParty: this.party,
      updatedEnemies: this.enemies, // Keep for backward compatibility
      updatedEnemiesByLocation: enemiesByLocation, // New: enemies by location
      nextLocationId: this.nextLocationId,
      inCombat: this.inCombat,
      initiativeOrder: initiativeOrderWithStatus,
      enemies: this.enemies, // Keep for backward compatibility
      enemiesByLocation: enemiesByLocation, // New: enemies by location
      turnIndex: this.turnIndex,
      hasMoreAITurns: false, // Deprecated: Frontend should rely on phase
      phase: this.phase,
      lastProcessedTurnWasAI: finalLastProcessedTurnWasAI,
      lastProcessedTurnIndex: this.lastProcessedTurnIndex,
      playerActionCompleted: this.phase === CombatPhase.ACTION_RESOLVED, // Backward compatibility for frontend
    };
  }

  // ============================================================================
  // FINITE STATE MACHINE (FSM)
  // ============================================================================

  /**
   * Transitions the combat state machine to a new phase.
   */
  private async transitionTo(
    newPhase: CombatPhase, 
    deps?: CombatManagerDependencies,
    context?: { location?: any, history?: any }
  ): Promise<void> {
    this.log('info', `FSM Transition: ${this.phase} -> ${newPhase}`, {
      turnIndex: this.turnIndex,
      activeCombatant: this.getActiveCombatant()?.characterName
    });

    this.phase = newPhase;

    switch (newPhase) {
      case CombatPhase.TURN_START:
        await this.handleTurnStart(deps, context);
        break;
        
      case CombatPhase.PROCESSING_ACTION:
        // Automatically handled by logic calling transitionTo
        break;

      case CombatPhase.ACTION_RESOLVED:
        // Wait for user confirmation
        break;

      case CombatPhase.TURN_END:
        await this.handleTurnEnd(deps, context);
        break;
        
      case CombatPhase.COMBAT_END:
        this.inCombat = false;
        break;
    }
  }

  private async handleTurnStart(
    deps?: CombatManagerDependencies,
    context?: { location?: any, history?: any }
  ): Promise<void> {
    const combatant = this.getActiveCombatant();
    if (!combatant) {
        await this.transitionTo(CombatPhase.COMBAT_END, deps);
        return;
    }

    // 1. Check End of Combat
    const endCheck = this.checkEndOfCombat();
    if (endCheck.combatEnded) {
        // Emit a clear end-of-combat message once the last enemy cae
        this.addMessage({
            sender: 'DM',
            content: endCheck.reason
              ? `El combate ha terminado (${endCheck.reason}). ¡Victoria!`
              : '¡Victoria! El combate ha terminado.',
        });
        await this.transitionTo(CombatPhase.COMBAT_END, deps);
        return;
    }

    // 2. Check Surprise
    if (SurpriseManager.isSurprised(combatant)) {
         this.addMessage({ sender: 'DM', content: `${combatant.characterName} está sorprendido y pierde su turno.` });
         
         const index = this.initiativeOrder.findIndex(c => c.id === combatant.id);
         if (index !== -1) {
             this.initiativeOrder[index] = SurpriseManager.clearSurpriseFlag(this.initiativeOrder[index]);
         }
         
         this.updateState({
             lastProcessedTurnWasAI: combatant.controlledBy === 'AI',
             lastProcessedTurnIndex: this.turnIndex
         });

         await this.transitionTo(CombatPhase.ACTION_RESOLVED, deps);
         return;
    }

    // 3. Check Status (Dead/Unconscious)
    const entity = this.findEntity(combatant);
    if (entity && isUnconsciousOrDead(entity)) {
        const status = entity.isDead ? 'muerto' : 'inconsciente';
        this.addMessage({ sender: 'DM', content: `${combatant.characterName} está ${status} y no puede actuar.` });
        
        this.updateState({
             lastProcessedTurnWasAI: combatant.controlledBy === 'AI',
             lastProcessedTurnIndex: this.turnIndex
        });

        await this.transitionTo(CombatPhase.ACTION_RESOLVED, deps);
        return;
    }

    // 4. Normal Turn
    await this.transitionTo(CombatPhase.WAITING_FOR_ACTION, deps);

    // 5. If AI, auto-process
    if (combatant.controlledBy === 'AI') {
        // Mark that we're processing an AI turn BEFORE execution (in case it fails)
        this.updateState({
            lastProcessedTurnWasAI: true,
            lastProcessedTurnIndex: this.turnIndex
        });
        
        await this.transitionTo(CombatPhase.PROCESSING_ACTION, deps);
        // We need to pass undefined for player action inputs
        // context.location and context.history should be passed if available
        await this.executeTurnLogic(combatant, undefined, undefined, context?.location, context?.history, deps);
        await this.transitionTo(CombatPhase.ACTION_RESOLVED, deps);
    }
  }

  private async handleTurnEnd(
    deps?: CombatManagerDependencies,
    context?: { location?: any, history?: any }
  ): Promise<void> {
      this.advanceTurn();
      await this.transitionTo(CombatPhase.TURN_START, deps, context);
  }

  private findEntity(combatant: Combatant): any {
    const isCompanion = this.party.some(p => p.id === combatant.id);
    return isCompanion
      ? this.party.find(p => p.id === combatant.id)
      : this.enemies.find(e => (e as any).uniqueId === combatant.id || e.id === combatant.id);
  }

  // ============================================================================
  // PRIVATE METHODS - TURN PROCESSING
  // ============================================================================

  /**
   * Executes the core logic of a turn (using TurnProcessor).
   * Does NOT handle state transitions or turn skipping (handled by FSM).
   */
  private async executeTurnLogic(
    combatant: Combatant,
    interpretedAction?: any,
    playerAction?: string,
    locationContext?: any,
    conversationHistory?: Array<Partial<GameMessage>>,
    deps?: CombatManagerDependencies
  ): Promise<boolean> {
    if (!deps) {
      this.log('error', 'Cannot execute turn logic: dependencies not provided');
      return false;
    }

    // Determine tactician for AI
    const isCompanion = this.party.some(p => p.id === combatant.id);
    const tactician = combatant.controlledBy === 'AI'
      ? (isCompanion ? deps.companionTacticianTool : deps.enemyTacticianTool)
      : undefined;

    // Process turn using TurnProcessor
    const turnResult = await TurnProcessor.processTurn({
      combatant,
      interpretedAction,
      playerAction,
      party: this.party,
      enemies: this.enemies,
      initiativeOrder: this.initiativeOrder,
      locationContext,
      conversationHistory: conversationHistory || [],
      dependencies: {
        tactician,
        narrationExpert: deps.combatNarrationExpertTool,
        diceRollerTool: deps.diceRollerTool,
        updateRollNotationWithModifiers: deps.updateRollNotationWithModifiers,
      },
    });

    if (!turnResult.success) {
      this.addMessages(turnResult.messages);
      this.addDiceRolls(turnResult.diceRolls);

      const retryableErrors = [
        'TARGET_AMBIGUOUS', 'TARGET_REQUIRED', 'TARGET_NOT_FOUND', 'TARGET_DEAD',
        'WEAPON_NOT_IN_INVENTORY', 'SPELL_NOT_KNOWN', 'ITEM_NOT_IN_INVENTORY', 'INVALID_ACTION'
      ];

      if (turnResult.error && retryableErrors.includes(turnResult.error)) {
          return false; // Retryable error, stay in WAITING phase
      }
      return true; // Non-retryable error, consume turn
    }

    // Successful turn
    this.addMessages(turnResult.messages);
    this.addDiceRolls(turnResult.diceRolls);
    this.updateState({
      party: turnResult.updatedParty,
      enemies: turnResult.updatedEnemies,
      lastProcessedTurnWasAI: combatant.controlledBy === 'AI',
      lastProcessedTurnIndex: this.turnIndex
    });

    // End-of-combat guard: if TurnProcessor or current state says combat ended, close immediately.
    const endCheck = this.checkEndOfCombat();
    if (turnResult.combatEnded || endCheck.combatEnded) {
      const reason = turnResult.endReason || endCheck.reason || 'Todos los enemigos derrotados';
      this.addMessage({
        sender: 'DM',
        content: `El combate ha terminado (${reason}). ¡Victoria!`,
      });

      // Add victory badge to dice log (shown as a pill)
      this.addDiceRoll({
        id: `victory-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        roller: 'DM',
        rollNotation: '—',
        individualRolls: [],
        totalResult: 0,
        outcome: 'victory',
        timestamp: new Date(),
        description: `El combate ha terminado (${reason}). ¡Victoria!`,
      });

      // Move FSM to COMBAT_END now to avoid requiring "continuar turno"
      await this.transitionTo(CombatPhase.COMBAT_END, deps, {
        location: locationContext,
        history: conversationHistory,
      });
      return true;
    }

    return true;
  }



  /**
   * Processes a skipped AI turn (AI is dead/unconscious).
   * 
   * @param activeCombatant - The AI combatant
   * @param isCompanion - Whether this is a companion
   */
  private async processSkippedAITurn(
    activeCombatant: Combatant,
    isCompanion: boolean
  ): Promise<void> {
    const activeCombatantData = isCompanion
      ? this.party.find(p => p.id === activeCombatant.id)
      : this.enemies.find(e => (e as any).uniqueId === activeCombatant.id);

    if (!activeCombatantData) {
      return;
    }

    // Check if turn was skipped due to surprise
    const isSurprised = SurpriseManager.isSurprised(activeCombatant);
    const isDeadOrUnconscious = isUnconsciousOrDead(activeCombatantData);

    if (isSurprised && !isDeadOrUnconscious) {
      // Turn skipped due to surprise
      this.log('info', 'AI turn skipped due to surprise', {
        combatant: activeCombatant.characterName,
      });

      this.addMessage({
        sender: 'DM',
        content: `${activeCombatant.characterName} está sorprendido y pierde su turno.`
      });

      // Clear surprise flag after first turn using SurpriseManager
      const combatantIndex = this.initiativeOrder.findIndex(c => c.id === activeCombatant.id);
      if (combatantIndex !== -1) {
        this.initiativeOrder[combatantIndex] = SurpriseManager.clearSurpriseFlag(
          this.initiativeOrder[combatantIndex]
        );
      }

      // Advance turn after surprise skip
      this.advanceTurn();
      return; // Exit early - surprise turn handled
    }

    // Turn skipped due to death/unconsciousness (not surprise)
    this.log('debug', 'Skipping turn for dead/unconscious combatant', {
      combatant: activeCombatant.characterName,
      hp: activeCombatantData.hp.current,
      isDead: activeCombatantData.isDead,
      isCompanion: isCompanion,
    });

    // Mensaje apropiado según estado y tipo de combatiente
    let statusMessage: string;
    if (isCompanion) {
      statusMessage = activeCombatantData.isDead === true
        ? `${activeCombatant.characterName} está muerto y no puede actuar.`
        : `${activeCombatant.characterName} está inconsciente y no puede actuar.`;
    } else {
      statusMessage = `${activeCombatant.characterName} está muerto y no puede actuar.`;
    }

    this.addMessage({
      sender: 'DM',
      content: statusMessage
    });

    // Advance to next turn
    const processedTurnIndex = this.turnIndex;
    this.advanceTurn();

    const nextCombatant = this.getActiveCombatant();
    const hasMoreAITurns = CombatTurnManager.hasMoreAITurns(
      nextCombatant!,
      this.party,
      this.enemies,
      false
    );

    // Update flags
    this.updateState({
      lastProcessedTurnWasAI: true,
      lastProcessedTurnIndex: processedTurnIndex,
    });
  }

  // ============================================================================
  // PRIVATE METHODS - UTILITIES
  // ============================================================================

  /**
   * Internal logging method using @/lib/logger.
   * 
   * @param level - Log level ('debug' | 'info' | 'warn' | 'error')
   * @param message - Log message
   * @param context - Optional additional context
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, any>
  ): void {
    const logContext = { module: 'CombatSession', ...context };
    log[level](message, logContext);
  }

  /**
   * Updates internal state (for use by internal methods).
   * 
   * @param updates - Partial state updates
   */
  private updateState(updates: {
    party?: Character[];
    enemies?: any[];
    initiativeOrder?: Combatant[];
    turnIndex?: number;
    inCombat?: boolean;
    nextLocationId?: string | null;
    lastProcessedTurnWasAI?: boolean;
    lastProcessedTurnIndex?: number;
    phase?: CombatPhase;
  }): void {
    if (updates.party !== undefined) this.party = updates.party;
    if (updates.enemies !== undefined) this.enemies = updates.enemies;
    if (updates.initiativeOrder !== undefined) this.initiativeOrder = updates.initiativeOrder;
    if (updates.turnIndex !== undefined) this.turnIndex = updates.turnIndex;
    if (updates.inCombat !== undefined) this.inCombat = updates.inCombat;
    if (updates.phase !== undefined) this.phase = updates.phase;
    if (updates.nextLocationId !== undefined) this.nextLocationId = updates.nextLocationId;
    if (updates.lastProcessedTurnWasAI !== undefined) this.lastProcessedTurnWasAI = updates.lastProcessedTurnWasAI;
    if (updates.lastProcessedTurnIndex !== undefined) this.lastProcessedTurnIndex = updates.lastProcessedTurnIndex;
    if (updates.playerActionCompleted !== undefined) this.playerActionCompleted = updates.playerActionCompleted;
  }

  /**
   * Adds a message to the accumulated messages.
   * 
   * @param message - Message to add
   */
  private addMessage(message: Omit<GameMessage, 'id' | 'timestamp'>): void {
    this.messages.push(message);
  }

  /**
   * Adds multiple messages to the accumulated messages.
   * 
   * @param messages - Messages to add
   */
  private addMessages(messages: Omit<GameMessage, 'id' | 'timestamp'>[]): void {
    this.messages.push(...messages);
  }

  /**
   * Adds a dice roll to the accumulated dice rolls.
   * 
   * @param diceRoll - Dice roll to add
   */
  private addDiceRoll(diceRoll: Omit<DiceRoll, 'id' | 'timestamp'>): void {
    this.diceRolls.push(diceRoll);
  }

  /**
   * Adds multiple dice rolls to the accumulated dice rolls.
   * 
   * @param diceRolls - Dice rolls to add
   */
  private addDiceRolls(diceRolls: Omit<DiceRoll, 'id' | 'timestamp'>[]): void {
    this.diceRolls.push(...diceRolls);
  }
}

