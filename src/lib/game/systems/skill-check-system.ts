import { GameSystem, SystemContext } from './system-types';
import { GameEvent } from '../events/event-schemas';
import { skillCheckExpert } from '@/ai/flows/experts/skill-check-expert';
import { resolveSkillCheck } from '@/lib/skills/skill-check-resolver';
import { addEffectToCharacterInParty } from './effect-utils';

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
          addEffectToCharacterInParty(context.party, actor.name, effect, 'Pergamino mágico');
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
          if (flag.startsWith('__unlock_door_') && val === true) {
            const parts = flag.replace('__unlock_door_', '').split('_');
            const method = (parts.pop() as 'lockpick' | 'force') || 'lockpick';
            const locId = parts[0] || context.currentLocationId;
            const direction = parts[1] || '';
            const targetId = parts.slice(2).join('_');

            if (direction) {
              const doorKey = `${locId}:${direction}`;
              context.openDoors[doorKey] = true;

              if (!context.worldState.locations) {
                context.worldState.locations = {};
              }
              if (!context.worldState.locations[locId]) {
                context.worldState.locations[locId] = {
                  visited: true,
                  visitCount: 1,
                  interactables: {},
                  connections: {},
                  enemies: [],
                  modificationLog: [],
                  droppedItems: [],
                };
              }
              const locState = context.worldState.locations[locId];
              if (!locState.connections) {
                locState.connections = {};
              }
              locState.connections[direction] = {
                direction,
                isOpen: true,
                isLocked: false,
                isBlocked: false,
              };

              // También desbloquear la conexión recíproca si existe
              const reverseMap: Record<string, string> = {
                norte: 'sur',
                sur: 'norte',
                este: 'oeste',
                oeste: 'este',
                noreste: 'suroeste',
                suroeste: 'noreste',
                noroeste: 'sureste',
                sureste: 'noroeste',
                arriba: 'abajo',
                abajo: 'arriba',
              };
              const reverseDir = reverseMap[direction.toLowerCase()];
              if (targetId && reverseDir) {
                context.openDoors[`${targetId}:${reverseDir}`] = true;
                if (!context.worldState.locations[targetId]) {
                  context.worldState.locations[targetId] = {
                    visited: false,
                    visitCount: 0,
                    interactables: {},
                    connections: {},
                    enemies: [],
                    modificationLog: [],
                    droppedItems: [],
                  };
                }
                const targetLocState = context.worldState.locations[targetId];
                if (!targetLocState.connections) {
                  targetLocState.connections = {};
                }
                targetLocState.connections[reverseDir] = {
                  direction: reverseDir,
                  isOpen: true,
                  isLocked: false,
                  isBlocked: false,
                };
              }

              context.enqueue({
                type: 'DoorOpened',
                payload: {
                  locationId: locId,
                  direction,
                  method,
                },
              });
            }
            continue;
          }

          context.worldState.globalFlags[flag] = val;
          if (flag.startsWith('identified_scroll_') && val === true) {
            const effect = flag.replace('identified_scroll_', '');
            const revealedName =
              effect === 'speak_with_animals'
                ? 'Pergamino de Hablar con los Animales'
                : effect === 'detect_magic'
                  ? 'Pergamino de Detectar Magia'
                  : effect === 'comprehend_languages'
                    ? 'Pergamino de Comprender Idiomas'
                    : `Pergamino de ${effect}`;
            for (const member of context.party) {
              if (member.inventory) {
                for (const item of member.inventory) {
                  if (item.id === `scroll-${effect}` || /pergamino enrollado/i.test(item.name)) {
                    item.name = revealedName;
                    item.description = `Un pergamino mágico que contiene el conjuro ${revealedName.replace(/^Pergamino de /i, '')}.`;
                  }
                }
              }
            }
          }
          if (flag.startsWith('consumed_scroll_') && val === true) {
            const effect = flag.replace('consumed_scroll_', '');
            context.party = this.consumeScrollFromPartyInventory(context.party, effect);
          }
        }
      }

      // Defensa en profundidad: si una prueba de Arcanos/Investigación sobre un pergamino tiene éxito aunque no viniera con pendingWorldStateFlags
      if (
        (selectedSkill === 'arcana' || selectedSkill === 'investigation') &&
        (/pergamino|scroll|sello|runas/i.test(playerAction || '') || /pergamino|scroll/i.test(reasoning || ''))
      ) {
        if (!context.worldState.globalFlags) {
          context.worldState.globalFlags = {};
        }
        for (const member of context.party) {
          if (member.inventory) {
            for (const item of member.inventory) {
              if (item.id === 'scroll-speak_with_animals' || /pergamino enrollado/i.test(item.name || '')) {
                context.worldState.globalFlags.identified_scroll_speak_with_animals = true;
                item.name = 'Pergamino de Hablar con los Animales';
                item.description = 'Un pergamino mágico que contiene el conjuro Hablar con los Animales.';
              }
            }
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
            item.id === `scroll-${spellEffect}` ||
            (/pergamino|scroll/i.test(item.name) &&
              new RegExp(searchTerm, 'i').test(item.name))
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
