/**
 * @fileOverview CombatSession - State Object Pattern for Combat Management
 * 
 * Encapsulates all combat state and provides clean methods for state manipulation.
 * This class eliminates the need to pass multiple state variables between functions.
 * 
 * @module CombatSession
 */

import { log } from '@/lib/logger';
import type { Character, Combatant, GameMessage, DiceRoll } from '@/lib/types';
import type { CombatManagerDependencies } from '@/ai/tools/combat-manager';
import type { z } from 'zod';
import { CombatManagerInputSchema, CombatManagerOutputSchema } from '@/ai/tools/combat-manager';
import { CombatTurnManager } from '@/lib/combat/turn-manager';
import { checkEndOfCombat, getHpStatus, isUnconsciousOrDead } from '@/lib/combat/rules-engine';
import { CombatInitializer } from '@/lib/combat/combat-initializer';
import type { CombatInitContext } from '@/lib/combat/initialization/types';
import { CombatActionProcessor } from '@/lib/combat/action-processor';
import { resolveEnemyId } from '@/lib/combat/target-resolver';
import { getVisualName, replaceOrdinalReferences, escapeRegex } from '@/lib/combat/monster-name-manager';

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
  private playerActionCompleted: boolean;

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
    nextLocationId: string | null = null
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
    this.messages = [];
    this.diceRolls = [];
    this.lastProcessedTurnWasAI = false;
    this.lastProcessedTurnIndex = this.turnIndex;
    this.playerActionCompleted = false;
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
      (input as any).nextLocationId || null
    );
  }

  /**
   * Creates an empty CombatSession (for testing).
   * 
   * @returns A new empty CombatSession instance
   */
  static createEmpty(): CombatSession {
    return new CombatSession([], [], [], 0, false, '', null);
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
    interpretedAction: any
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
    this.updateState({
      party: initResult.updatedParty,
      enemies: initResult.enemies,
      initiativeOrder: initResult.initiativeOrder,
      inCombat: true,
    });

    // Handle first turn data if AI went first
    if (initResult.firstTurnData) {
      this.log('info', 'First turn was AI, updating state', {
        turnIndex: initResult.firstTurnData.turnIndex,
        combatant: initResult.firstTurnData.activeCombatant.characterName,
        hasMoreAITurns: initResult.firstTurnData.hasMoreAITurns,
      });

      this.updateState({
        turnIndex: initResult.firstTurnData.turnIndex,
        inCombat: !initResult.firstTurnData.combatEnded,
        lastProcessedTurnWasAI: initResult.firstTurnData.lastProcessedTurnWasAI,
        lastProcessedTurnIndex: initResult.firstTurnData.lastProcessedTurnIndex,
      });

      // If combat ended during first turn, clear enemies
      if (initResult.firstTurnData.combatEnded) {
        this.updateState({ enemies: [] });
      }
    } else {
      // Player goes first
      this.log('info', 'Player goes first', {
        turnIndex: 0,
      });

      this.updateState({
        turnIndex: 0,
        lastProcessedTurnWasAI: false,
        lastProcessedTurnIndex: 0,
      });
    }

    this.log('info', 'Combat initialization completed', {
      initiativeOrderLength: this.initiativeOrder.length,
      enemiesCount: this.enemies.length,
      turnIndex: this.turnIndex,
    });
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

    this.log('info', 'Processing current turn', {
      combatant: activeCombatant.characterName,
      controlledBy: activeCombatant.controlledBy,
      turnIndex: this.turnIndex,
    });

    // Handle "continue_turn" action (step-by-step combat)
    if (interpretedAction && interpretedAction.actionType === 'continue_turn') {
      this.log('debug', 'Continue turn action detected', {
        currentCombatant: activeCombatant.characterName,
        controlledBy: activeCombatant.controlledBy,
      });

      // If it's currently the player's turn, advance to next turn
      if (activeCombatant.controlledBy === 'Player') {
        const previousIndex = this.turnIndex;
        this.advanceTurn();

        this.log('info', 'Advanced from player turn to next turn', {
          fromIndex: previousIndex,
          toIndex: this.turnIndex,
          fromCombatant: activeCombatant.characterName,
          toCombatant: this.getActiveCombatant()?.characterName || 'Unknown',
        });

        // Update flags
        this.updateState({
          lastProcessedTurnIndex: previousIndex,
        });

        // The next turn will be processed below if it's AI
        // Update activeCombatant for next check
        const nextCombatant = this.getActiveCombatant();
        if (nextCombatant && nextCombatant.controlledBy === 'AI') {
          // Process the AI turn that we just advanced to
          await this.processAITurn(nextCombatant, locationContext, conversationHistory, deps);
        }
        return;
      }
    }

    // Check if player is unconscious/dead
    if (activeCombatant.controlledBy === 'Player') {
      if (CombatTurnManager.shouldSkipTurn(activeCombatant, this.party, this.enemies)) {
        await this.processSkippedPlayerTurn(activeCombatant, interpretedAction);
        return;
      }

      // Process player turn
      if (interpretedAction && interpretedAction.actionType !== 'continue_turn') {
        await this.processPlayerTurn(interpretedAction, playerAction, locationContext, deps);
        return;
      }
    }

    // Check if we should process this turn automatically (AI turn or player unconscious)
    const shouldProcessTurn = activeCombatant.controlledBy === 'AI' ||
      (activeCombatant.controlledBy === 'Player' &&
        this.party.some(p => p.id === activeCombatant.id && isUnconsciousOrDead(p)));

    if (shouldProcessTurn) {
      await this.processAITurn(activeCombatant, locationContext, conversationHistory, deps);
    }
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

    const result = checkEndOfCombat(this.party, this.enemies);

    if (result.combatEnded) {
      this.log('info', 'Combat ended', {
        reason: result.reason || 'Unknown',
        partyAlive: this.party.filter(p => p.hp.current > 0).length,
        enemiesAlive: this.enemies.filter(e => e.hp.current > 0).length,
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
    return {
      messages: this.messages,
      diceRolls: this.diceRolls,
      updatedParty: this.party,
      updatedEnemies: this.enemies,
      nextLocationId: this.nextLocationId,
      inCombat: this.inCombat,
      initiativeOrder: this.initiativeOrder,
      enemies: this.enemies,
      turnIndex: this.turnIndex,
      hasMoreAITurns: this.hasMoreAITurns(),
      lastProcessedTurnWasAI: this.lastProcessedTurnWasAI,
      lastProcessedTurnIndex: this.lastProcessedTurnIndex,
      playerActionCompleted: this.playerActionCompleted,
    };
  }

  // ============================================================================
  // PRIVATE METHODS - TURN PROCESSING
  // ============================================================================

  /**
   * Processes a player's turn.
   * Handles attack actions, target inference, and uses CombatActionProcessor.
   * 
   * @param interpretedAction - The interpreted player action
   * @param playerAction - Original player action text
   * @param locationContext - Location context
   * @param deps - Combat manager dependencies
   */
  private async processPlayerTurn(
    interpretedAction: any,
    playerAction: string,
    locationContext: any,
    deps: CombatManagerDependencies
  ): Promise<void> {
    const activeCombatant = this.getActiveCombatant();
    if (!activeCombatant || activeCombatant.controlledBy !== 'Player') {
      return;
    }

    this.log('info', 'Processing player turn', {
      player: activeCombatant.characterName,
      actionType: interpretedAction?.actionType,
    });

    // Process player action (attack, spell, etc.)
    if (interpretedAction?.actionType === 'attack') {
      // If no targetId specified, try to infer it
      let targetIdToUse = interpretedAction.targetId;

      if (!targetIdToUse) {
        // Filter only alive enemies
        const aliveEnemies = this.enemies.filter(e => e.hp.current > 0);

        this.log('debug', 'Player attack without explicit target - inferring target', {
          player: activeCombatant.characterName,
          aliveEnemiesCount: aliveEnemies.length,
        });

        if (aliveEnemies.length === 1) {
          // Only one enemy alive: auto-select it
          targetIdToUse = aliveEnemies[0].uniqueId;
          const autoSelectedName = getVisualName(targetIdToUse || '', this.initiativeOrder, this.enemies);

          this.log('info', 'Auto-selected single enemy as target', {
            player: activeCombatant.characterName,
            target: autoSelectedName,
            targetId: targetIdToUse,
          });

          // Add a brief DM message to clarify the auto-selection
          this.addMessage({
            sender: 'DM',
            content: `${activeCombatant.characterName} ataca a ${autoSelectedName}.`
          });
        } else if (aliveEnemies.length > 1) {
          // Multiple enemies: ask for clarification
          const clarificationMessage = `No has especificado un objetivo. ¿A quién o qué quieres atacar?`;

          this.log('info', 'Player attack without target - multiple enemies, asking for clarification', {
            player: activeCombatant.characterName,
            enemiesCount: aliveEnemies.length,
          });

          this.addMessage({
            sender: 'DM',
            content: clarificationMessage
          });

          // Do NOT advance turn - wait for player's next action
          this.updateState({
            lastProcessedTurnWasAI: false,
            lastProcessedTurnIndex: this.turnIndex,
          });
          return;
        } else {
          // No enemies alive
          this.log('warn', 'Player tried to attack but no enemies are alive');
          this.addMessage({
            sender: 'DM',
            content: `No hay enemigos vivos para atacar.`
          });

          // Advance turn normally
          this.advanceTurn();
          return;
        }
      }

      // Only proceed with attack if we have a valid target
      if (targetIdToUse) {
        // Create localLog wrapper
        const localLog = (message: string) => {
          this.log('debug', message, { source: 'CombatActionProcessor' });
        };

        // Process the attack using CombatActionProcessor
        const attackResult = await CombatActionProcessor.processPlayerAttack({
          attacker: activeCombatant,
          targetId: targetIdToUse,
          playerAction,
          initiativeOrder: this.initiativeOrder,
          party: this.party,
          enemies: this.enemies,
          locationContext,
          diceRollerTool: deps.diceRollerTool,
          combatNarrationExpertTool: deps.combatNarrationExpertTool,
          updateRollNotationWithModifiers: deps.updateRollNotationWithModifiers,
          localLog,
        });

        // Handle the result
        if (!attackResult.success) {
          // Target not found or ambiguous
          this.addMessages(attackResult.messages.map(m => ({ ...m, sender: m.sender as 'DM' })));
          this.addDiceRolls(attackResult.diceRolls);

          // For ambiguous or invalid targets, return without advancing turn
          if (attackResult.error === 'TARGET_AMBIGUOUS' || attackResult.error === 'TARGET_NOT_FOUND') {
            this.updateState({
              lastProcessedTurnWasAI: false,
              lastProcessedTurnIndex: this.turnIndex,
            });
            return;
          }
        }

        // Successful attack - update state
        this.addMessages(attackResult.messages.map(m => ({ ...m, sender: m.sender as 'DM' })));
        this.addDiceRolls(attackResult.diceRolls);
        this.updateState({
          party: attackResult.updatedParty,
          enemies: attackResult.updatedEnemies,
        });

        // Check if combat has ended
        if (attackResult.combatEnded) {
          this.log('info', 'Combat ended after player action', {
            reason: attackResult.endReason,
          });

          this.addMessage({
            sender: 'DM',
            content: attackResult.endReason || 'El combate ha terminado.'
          });

          // Create combat end dice roll
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

          const combatEndRoll = createCombatEndDiceRoll(attackResult.endReason || 'El combate ha terminado.');
          this.addDiceRoll(combatEndRoll);

          this.updateState({
            inCombat: false,
            turnIndex: 0,
            initiativeOrder: [],
            enemies: [],
            lastProcessedTurnWasAI: false,
            lastProcessedTurnIndex: this.turnIndex,
          });
          return;
        }

        // After processing player action, DO NOT advance turn yet
        // The turn will advance when user explicitly clicks "Pasar turno"
        this.log('debug', 'Player action completed. Waiting for user to advance turn.');

        this.updateState({
          lastProcessedTurnWasAI: false,
          lastProcessedTurnIndex: this.turnIndex,
          playerActionCompleted: true,
        });
      }
    }
  }

  /**
   * Processes an AI turn (enemy or companion).
   * Consults tactician, processes narration, and executes rolls.
   * 
   * @param activeCombatant - The AI combatant whose turn it is
   * @param locationContext - Location context for narration
   * @param conversationHistory - Recent conversation history
   * @param deps - Combat manager dependencies
   */
  private async processAITurn(
    activeCombatant: Combatant,
    locationContext: any,
    conversationHistory: Array<Partial<GameMessage>>,
    deps: CombatManagerDependencies
  ): Promise<void> {
    this.log('info', 'Processing AI turn', {
      combatant: activeCombatant.characterName,
      controlledBy: activeCombatant.controlledBy,
    });

    // Check if active combatant is dead or unconscious - skip their turn if so
    const isCompanion = this.party.some(p => p.id === activeCombatant.id);

    if (CombatTurnManager.shouldSkipTurn(activeCombatant, this.party, this.enemies)) {
      await this.processSkippedAITurn(activeCombatant, isCompanion);
      return;
    }

    // Create localLog wrapper
    const localLog = (message: string) => {
      this.log('debug', message, { source: 'AICombatantRolls' });
    };

    // Get visual names for enemies to pass to tacticians
    const enemyVisualNames = new Map<string, string>();
    for (const enemy of this.enemies) {
      const visualName = getVisualName(enemy.uniqueId, this.initiativeOrder, this.enemies);
      enemyVisualNames.set(enemy.uniqueId, visualName);
    }

    // Filter out dead combatants before passing to tactician
    const aliveParty = this.party.filter(p => p.hp.current > 0);
    const aliveEnemies = this.enemies.filter(e => e.hp.current > 0);

    this.log('debug', 'Filtering dead combatants for tactician', {
      activeCombatant: activeCombatant.characterName,
      totalParty: this.party.length,
      aliveParty: aliveParty.length,
      totalEnemies: this.enemies.length,
      aliveEnemies: aliveEnemies.length,
    });

    // Get full character data for companions to access their inventory and spells
    const activeCombatantFullData = isCompanion
      ? aliveParty.find(p => p.id === activeCombatant.id)
      : null;

    // Format conversation history
    const formatMessageForTranscript = (msg: Partial<GameMessage>): string => {
      const senderName = msg.senderName || msg.sender;
      const content = msg.originalContent || msg.content;
      if (senderName && content) {
        return `${senderName}: ${content}`;
      }
      return '';
    };

    const baseTacticianInput = {
      activeCombatant: activeCombatant.characterName,
      party: aliveParty,
      enemies: aliveEnemies.map(e => ({
        name: enemyVisualNames.get(e.uniqueId) || e.name,
        id: e.uniqueId,
        hp: getHpStatus(e.hp.current, e.hp.max)
      })),
      locationDescription: locationContext?.description || "An unknown battlefield",
      conversationHistory: conversationHistory.map(formatMessageForTranscript).join('\n'),
      availableSpells: activeCombatantFullData?.spells || [],
      inventory: activeCombatantFullData?.inventory || []
    };

    let tacticianResponse;
    if (isCompanion) {
      this.log('debug', `Invoking CompanionTacticianTool for ${activeCombatant.characterName}.`);
      tacticianResponse = await deps.companionTacticianTool(baseTacticianInput);
    } else {
      this.log('debug', `Invoking EnemyTacticianTool for ${activeCombatant.characterName}.`);
      tacticianResponse = await deps.enemyTacticianTool(baseTacticianInput);
    }

    const { actionDescription, targetId, diceRolls: requestedRolls } = tacticianResponse;

    this.log('debug', `Tactician for ${activeCombatant.characterName} decided action: ${actionDescription}, targeting ${targetId || 'no one'}.`);

    // Resolve target if present
    let target: any = null;
    let targetVisualName = 'nadie';

    if (targetId) {
      // Resolve targetId (can be visual name or uniqueId)
      const resolved = resolveEnemyId(targetId, this.enemies, this.initiativeOrder, this.party);

      // For AI, if ambiguous, choose the first match
      let resolvedTargetId = resolved.uniqueId;
      if (resolved.ambiguous && resolved.matches.length > 0) {
        const firstMatchName = resolved.matches[0];
        const firstMatchCombatant = this.initiativeOrder.find(c => c.characterName === firstMatchName);
        resolvedTargetId = firstMatchCombatant?.id || null;
        this.log('debug', `AI target ambiguous, choosing first match: ${firstMatchName} (${resolvedTargetId})`);
      }

      // Use resolved uniqueId to find target
      const finalTargetId = resolvedTargetId || targetId;
      target = [...this.party, ...this.enemies].find(
        c => c.id === finalTargetId || (c as any).uniqueId === finalTargetId
      );

      if (target) {
        targetVisualName = getVisualName(
          (target as any).uniqueId || target.id,
          this.initiativeOrder,
          this.enemies
        );
      }
    }

    if (target && requestedRolls && requestedRolls.length > 0) {
      // Process AI combatant rolls using centralized function
      const rollsResult = await deps.processAICombatantRolls({
        activeCombatant,
        requestedRolls,
        target,
        updatedParty: this.party,
        updatedEnemies: this.enemies,
        newInitiativeOrder: this.initiativeOrder,
        localLog,
        combatNarrationExpertTool: deps.combatNarrationExpertTool,
        actionDescription: actionDescription, // Pass action description for complete narration
      });

      // Extract results
      this.addDiceRolls(rollsResult.diceRolls);
      this.addMessages(rollsResult.messages);
      this.updateState({
        party: rollsResult.updatedParty,
        enemies: rollsResult.updatedEnemies,
      });

      let combatHasEnded = rollsResult.combatEnded;

      // Double-check combat end status after updating enemies
      if (!combatHasEnded) {
        const endOfCombatCheck = this.checkEndOfCombat();
        if (endOfCombatCheck.combatEnded) {
          this.log('info', 'Combat ended detected after AI turn', {
            reason: endOfCombatCheck.reason,
          });

          combatHasEnded = true;
          if (!this.messages.some(m => String(m.content || '').includes('Victoria') || String(m.content || '').includes('derrotados'))) {
            this.addMessage({
              sender: 'DM',
              content: endOfCombatCheck.reason || 'El combate ha terminado.'
            });

            // Create combat end dice roll
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

            const combatEndRoll = createCombatEndDiceRoll(endOfCombatCheck.reason || 'El combate ha terminado.');
            this.addDiceRoll(combatEndRoll);
          }
        }
      }

      if (combatHasEnded) {
        this.updateState({
          inCombat: false,
          turnIndex: 0,
          initiativeOrder: [],
          enemies: [],
          lastProcessedTurnWasAI: true,
          lastProcessedTurnIndex: this.turnIndex,
        });
        return;
      }
    }

    // Advance turn
    const processedTurnIndex = this.turnIndex;
    this.advanceTurn();

    // Check if there are more AI turns
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

  /**
   * Processes a skipped player turn (player is unconscious/dead).
   * 
   * @param activeCombatant - The player combatant
   * @param interpretedAction - The interpreted action (may be continue_turn)
   */
  private async processSkippedPlayerTurn(
    activeCombatant: Combatant,
    interpretedAction: any
  ): Promise<void> {
    const playerData = this.party.find(p => p.id === activeCombatant.id);
    if (!playerData) {
      return;
    }

    this.log('info', 'Player turn detected but player is unconscious/dead', {
      player: activeCombatant.characterName,
      hp: playerData.hp.current,
      isDead: playerData.isDead,
    });

    // Show message about player being unconscious/dead
    const statusMessage = playerData.isDead === true
      ? `${activeCombatant.characterName} está muerto y no puede actuar.`
      : `${activeCombatant.characterName} está inconsciente y no puede actuar.`;

    this.addMessage({
      sender: 'DM',
      content: statusMessage
    });

    // If "continue_turn" action is received, advance the turn to prevent infinite loop
    if (interpretedAction && interpretedAction.actionType === 'continue_turn') {
      this.log('debug', `Player ${activeCombatant.characterName} is ${playerData.isDead ? 'dead' : 'unconscious'}. Advancing turn due to continue_turn action.`);

      const processedTurnIndex = this.turnIndex;
      this.advanceTurn();

      const nextCombatant = this.getActiveCombatant();
      const hasMoreAITurns = CombatTurnManager.hasMoreAITurns(
        nextCombatant!,
        this.party,
        this.enemies,
        false
      );

      this.updateState({
        lastProcessedTurnWasAI: true,
        lastProcessedTurnIndex: processedTurnIndex,
      });

      // Note: The next turn will be processed in the next call if hasMoreAITurns is true
    } else {
      this.log('debug', `Player ${activeCombatant.characterName} is ${playerData.isDead ? 'dead' : 'unconscious'}. Waiting for pass turn button.`);

      // Return immediately with hasMoreAITurns: true to show "Pasar turno" buttons
      this.updateState({
        lastProcessedTurnWasAI: true,
        lastProcessedTurnIndex: this.turnIndex,
      });
    }
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
    playerActionCompleted?: boolean;
  }): void {
    if (updates.party !== undefined) this.party = updates.party;
    if (updates.enemies !== undefined) this.enemies = updates.enemies;
    if (updates.initiativeOrder !== undefined) this.initiativeOrder = updates.initiativeOrder;
    if (updates.turnIndex !== undefined) this.turnIndex = updates.turnIndex;
    if (updates.inCombat !== undefined) this.inCombat = updates.inCombat;
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

