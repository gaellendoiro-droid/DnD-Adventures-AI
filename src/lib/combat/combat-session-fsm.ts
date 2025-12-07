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
        // Should not happen, but safe fallback
        await this.transitionTo(CombatPhase.COMBAT_END, deps);
        return;
    }

    // 1. Check End of Combat
    const endCheck = this.checkEndOfCombat();
    if (endCheck.combatEnded) {
        await this.transitionTo(CombatPhase.COMBAT_END, deps);
        return;
    }

    // 2. Check Surprise
    if (SurpriseManager.isSurprised(combatant)) {
         this.addMessage({ sender: 'DM', content: `${combatant.characterName} está sorprendido y pierde su turno.` });
         
         // Clear surprise
         const index = this.initiativeOrder.findIndex(c => c.id === combatant.id);
         if (index !== -1) {
             this.initiativeOrder[index] = SurpriseManager.clearSurpriseFlag(this.initiativeOrder[index]);
         }
         
         await this.transitionTo(CombatPhase.ACTION_RESOLVED, deps);
         return;
    }

    // 3. Check Status (Dead/Unconscious)
    const entity = this.findEntity(combatant);
    if (entity && isUnconsciousOrDead(entity)) {
        const status = entity.isDead ? 'muerto' : 'inconsciente';
        this.addMessage({ sender: 'DM', content: `${combatant.characterName} está ${status} y no puede actuar.` });
        await this.transitionTo(CombatPhase.ACTION_RESOLVED, deps);
        return;
    }

    // 4. Normal Turn
    await this.transitionTo(CombatPhase.WAITING_FOR_ACTION, deps);

    // 5. If AI, auto-process
    if (combatant.controlledBy === 'AI') {
        await this.transitionTo(CombatPhase.PROCESSING_ACTION, deps);
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

