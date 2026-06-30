import { GameSystem, SystemContext } from './system-types';
import { GameEvent } from '../events/event-schemas';
import { skillCheckExpert } from '@/ai/flows/experts/skill-check-expert';
import { resolveSkillCheck } from '@/lib/skills/skill-check-resolver';

export class SkillCheckSystem implements GameSystem {
  name = 'SkillCheckSystem';

  async handle(event: GameEvent, context: SystemContext): Promise<void> {
    if (event.type !== 'SkillCheckAttempted') {
      return;
    }

    const {
      skill,
      dc,
      assignedCompanion,
      reasoning: initialReasoning,
      playerAction,
      conversationHistory,
      pendingEffects,
      pendingWorldStateFlags,
    } = event.payload;

    // 1. Determinar el personaje que realiza la prueba (actor)
    let actor = context.party[0];
    if (assignedCompanion) {
      const companion = context.party.find(
        (p) => p.name.toLowerCase() === assignedCompanion.toLowerCase()
      );
      if (companion) {
        actor = companion;
      }
    }

    let selectedSkill = skill || '';
    let difficultyClass = dc || 10;
    let suggestedMode: 'normal' | 'advantage' | 'disadvantage' = 'normal';
    let combatOnFailure = false;
    let reasoning = initialReasoning || '';

    // 2. Si no viene predefinida la habilidad y dificultad, preguntar al experto de la IA
    if (!selectedSkill || !dc) {
      try {
        const locationData = context.adventureData.locations.find((l: any) => l.id === context.currentLocationId);
        const aiDecision = await skillCheckExpert({
          playerAction: playerAction || `Intento realizar una acción con ${assignedCompanion || 'mi personaje'}`,
          characterName: actor.name,
          locationContext: JSON.stringify(locationData || {}),
          targetEntity: undefined, // Se podría inferir o pasar si es necesario
          adventureLore: context.adventureData.adventureLore ? JSON.stringify(context.adventureData.adventureLore) : undefined,
          conversationHistory: conversationHistory || '',
        });

        selectedSkill = aiDecision.selectedSkill;
        difficultyClass = aiDecision.difficultyClass;
        suggestedMode = aiDecision.suggestedMode as any || 'normal';
        combatOnFailure = aiDecision.combatOnFailure || false;
        reasoning = aiDecision.reasoning;
      } catch (error) {
        console.error('Error llamando a skillCheckExpert, usando fallback (atletismo CD 10):', error);
        selectedSkill = 'athletics';
        difficultyClass = 10;
        reasoning = 'Fallback por fallo del experto de IA.';
      }
    }

    // 3. Resolver tirada de dados
    const resultDiceRoll = resolveSkillCheck(
      actor,
      selectedSkill as any,
      difficultyClass,
      suggestedMode
    );

    context.diceRolls.push(resultDiceRoll);

    const isSuccess = resultDiceRoll.skillCheckDetails?.isSuccess || false;

    // 4. Emitir el hecho de tirada resuelta
    context.enqueue({
      type: 'SkillCheckResolved',
      payload: {
        characterName: actor.name,
        skill: selectedSkill,
        dc: difficultyClass,
        rollTotal: resultDiceRoll.totalResult,
        isSuccess,
        isCriticalSuccess: resultDiceRoll.skillCheckDetails?.isCriticalSuccess,
        isCriticalFailure: resultDiceRoll.skillCheckDetails?.isCriticalFailure,
        reasoning,
      },
    });

    // 5. Aplicar efectos y flags si tiene éxito
    if (isSuccess) {
      if (pendingEffects && pendingEffects.length > 0) {
        if (!context.worldState.globalFlags) {
          context.worldState.globalFlags = {};
        }
        for (const effect of pendingEffects) {
          context.worldState.globalFlags[effect] = true;
          // Emitir evento de efecto activado
          context.enqueue({
            type: 'ConditionApplied', // o similar para alertar de que se activó
            payload: {
              targetId: actor.id,
              targetName: actor.name,
              condition: `efecto_${effect}`,
            },
          });
        }
      }

      if (pendingWorldStateFlags && Object.keys(pendingWorldStateFlags).length > 0) {
        if (!context.worldState.globalFlags) {
          context.worldState.globalFlags = {};
        }
        for (const [flag, val] of Object.entries(pendingWorldStateFlags)) {
          context.worldState.globalFlags[flag] = val;
          if (flag.startsWith('consumed_scroll_') && val === true) {
            const effect = flag.replace('consumed_scroll_', '');
            context.party = this.consumeScrollFromPartyInventory(context.party, effect);
          }
        }
      }
    }

    // 6. Activar combate en caso de fallo crítico / si el experto lo requiere
    if (!isSuccess && combatOnFailure) {
      context.enqueue({
        type: 'CombatTriggered',
        payload: {
          reason: 'provocation',
          triggeringEntityIds: [],
          message: '¡La confrontación ha escalado y ha estallado el combate!',
        },
      });
    }
  }

  /**
   * Helper para consumir pergamino del inventario
   */
  private consumeScrollFromPartyInventory(party: any[], spellEffect: string): any[] {
    const updatedParty = JSON.parse(JSON.stringify(party));
    let searchTerm = 'pergamino';
    if (spellEffect === 'speak_with_animals') {
      searchTerm = 'animal';
    } else if (spellEffect === 'detect_magic') {
      searchTerm = 'magia';
    } else if (spellEffect === 'comprehend_languages') {
      searchTerm = 'idioma';
    }

    for (const char of updatedParty) {
      if (char.inventory) {
        const index = char.inventory.findIndex(
          (item: any) =>
            /pergamino|scroll/i.test(item.name) &&
            new RegExp(searchTerm, 'i').test(item.name)
        );
        if (index !== -1) {
          char.inventory.splice(index, 1);
          break;
        }
      }
    }
    return updatedParty;
  }
}
