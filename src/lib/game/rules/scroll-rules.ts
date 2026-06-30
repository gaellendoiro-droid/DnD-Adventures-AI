import { RuleModule, RulesEngineInput, RulesEngineResult } from './rule-module';

export class ScrollRuleModule implements RuleModule {
    name = 'ScrollRules';

    /**
     * Determina si la acción del jugador involucra a un pergamino mágico en la ubicación, inventarios o escena.
     */
    canHandle(input: RulesEngineInput): boolean {
        const { playerAction, interpretation, party, currentLocationId, adventureData, worldState } = input;
        const actionLower = playerAction.toLowerCase();

        // 1. Escanear si existe algún pergamino mágico en la escena
        let foundScrollName = '';

        // Buscar en la ubicación actual
        const location = adventureData.locations?.find((l: any) => l.id === currentLocationId);
        
        // Buscar en posesiones de NPCs presentes en la ubicación
        if (location?.entitiesPresent) {
            for (const entityId of location.entitiesPresent) {
                const entity = adventureData.entities?.find((e: any) => e.id === entityId);
                if (entity?.roleplay?.possessions) {
                    for (const possession of entity.roleplay.possessions) {
                        if (/pergamino|scroll/i.test(possession)) {
                            let effect = 'speak_with_animals';
                            const possLower = possession.toLowerCase();
                            if (possLower.includes('hablar con los animales') || possLower.includes('speak with animals')) {
                                effect = 'speak_with_animals';
                            } else if (possLower.includes('detectar magia') || possLower.includes('detect magic')) {
                                effect = 'detect_magic';
                            } else if (possLower.includes('comprender idiomas') || possLower.includes('comprehend languages')) {
                                effect = 'comprehend_languages';
                            }

                            const isTaken = !!(worldState?.globalFlags?.[`took_scroll_${effect}`]);
                            if (!isTaken) {
                                foundScrollName = possession;
                                break;
                            }
                        }
                    }
                }
                if (foundScrollName) break;
            }
        }

        // Si no se encuentra en NPCs, buscar en los interactuables de la ubicación
        if (!foundScrollName && location?.interactables) {
            for (const interactable of location.interactables) {
                let candidate = '';
                if (/pergamino|scroll/i.test(interactable.name)) {
                    candidate = interactable.name;
                } else if (interactable.interactionResults) {
                    for (const res of interactable.interactionResults) {
                        if (/pergamino|scroll/i.test(res.result)) {
                            candidate = "Pergamino";
                            break;
                        }
                    }
                }

                if (candidate) {
                    let effect = 'speak_with_animals';
                    const candLower = candidate.toLowerCase();
                    if (candLower.includes('hablar con los animales') || candLower.includes('speak with animals')) {
                        effect = 'speak_with_animals';
                    } else if (candLower.includes('detectar magia') || candLower.includes('detect magic')) {
                        effect = 'detect_magic';
                    } else if (candLower.includes('comprender idiomas') || candLower.includes('comprehend languages')) {
                        effect = 'comprehend_languages';
                    }

                    const isTaken = !!(worldState?.globalFlags?.[`took_scroll_${effect}`]);
                    if (!isTaken) {
                        foundScrollName = candidate;
                        break;
                    }
                }
            }
        }

        // Buscar en el inventario del grupo
        if (!foundScrollName) {
            for (const char of party) {
                if (char.inventory) {
                    for (const item of char.inventory) {
                        if (/pergamino|scroll/i.test(item.name)) {
                            foundScrollName = item.name;
                            break;
                        }
                    }
                }
                if (foundScrollName) break;
            }
        }

        if (!foundScrollName) {
            return false;
        }

        // Determinar el efecto del pergamino
        let scrollSpellEffect = 'speak_with_animals';
        const scrollNameLower = foundScrollName.toLowerCase();
        if (scrollNameLower.includes('hablar con los animales') || scrollNameLower.includes('speak with animals')) {
            scrollSpellEffect = 'speak_with_animals';
        } else if (scrollNameLower.includes('detectar magia') || scrollNameLower.includes('detect magic')) {
            scrollSpellEffect = 'detect_magic';
        } else if (scrollNameLower.includes('comprender idiomas') || scrollNameLower.includes('comprehend languages')) {
            scrollSpellEffect = 'comprehend_languages';
        }

        // Si el pergamino para este efecto ya está consumido, no podemos volver a usarlo ni activarlo
        const isConsumed = !!(worldState?.globalFlags?.[`consumed_scroll_${scrollSpellEffect}`]);
        if (isConsumed) {
            return false;
        }

        // Si el efecto ya está activo en el mundo (ej: speak_with_animals es true),
        // y el jugador no menciona explícitamente la palabra "pergamino" o "scroll" en su acción,
        // no debemos interceptar la acción como un uso de pergamino.
        const isEffectActive = !!(worldState?.globalFlags?.[scrollSpellEffect]);
        const mentionsScrollWord = actionLower.includes('pergamino') || actionLower.includes('scroll');
        if (isEffectActive && !mentionsScrollWord) {
            return false;
        }

        // Si la acción o la interpretación hacen referencia a un pergamino
        const mentionsScroll = actionLower.includes('pergamino') || 
                               actionLower.includes('scroll') || 
                               (interpretation.targetId && /pergamino|scroll/i.test(interpretation.targetId)) ||
                               (interpretation.activatedEffects && 
                                interpretation.activatedEffects.some((eff: string) => 
                                    ['speak_with_animals', 'detect_magic', 'comprehend_languages'].includes(eff)
                                 )) ||
                               /\b(léelo|leelo|descífralo|descifralo|identifícalo|identificalo|úsalo|usalo|lánzalo|lanzalo|inténtalo|intentalo|hazlo|hazla|leela|léela)\b/i.test(actionLower);

        return !!(mentionsScroll && foundScrollName);
    }

    /**
     * Evalúa y aplica las reglas de identificación y activación de pergaminos mágicos oficiales de D&D 5e.
     */
    evaluate(input: RulesEngineInput): RulesEngineResult {
        const { playerAction, interpretation, party, currentLocationId, adventureData, worldState } = input;
        const actionLower = playerAction.toLowerCase();
        
        let updatedWorldState = worldState ? JSON.parse(JSON.stringify(worldState)) : { globalFlags: {} };
        if (!updatedWorldState.globalFlags) {
            updatedWorldState.globalFlags = {};
        }

        // 1. Volver a buscar el nombre del pergamino
        let foundScrollName = 'Pergamino';
        const location = adventureData.locations?.find((l: any) => l.id === currentLocationId);
        
        if (location?.entitiesPresent) {
            for (const entityId of location.entitiesPresent) {
                const entity = adventureData.entities?.find((e: any) => e.id === entityId);
                if (entity?.roleplay?.possessions) {
                    for (const possession of entity.roleplay.possessions) {
                        if (/pergamino|scroll/i.test(possession)) {
                            let effect = 'speak_with_animals';
                            const possLower = possession.toLowerCase();
                            if (possLower.includes('hablar con los animales') || possLower.includes('speak with animals')) {
                                effect = 'speak_with_animals';
                            } else if (possLower.includes('detectar magia') || possLower.includes('detect magic')) {
                                effect = 'detect_magic';
                            } else if (possLower.includes('comprender idiomas') || possLower.includes('comprehend languages')) {
                                effect = 'comprehend_languages';
                            }

                            const isTaken = !!(updatedWorldState?.globalFlags?.[`took_scroll_${effect}`]);
                            if (!isTaken) {
                                foundScrollName = possession;
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (foundScrollName === 'Pergamino' && location?.interactables) {
            for (const interactable of location.interactables) {
                let candidate = '';
                if (/pergamino|scroll/i.test(interactable.name)) {
                    candidate = interactable.name;
                } else if (interactable.interactionResults) {
                    for (const res of interactable.interactionResults) {
                        if (/pergamino|scroll/i.test(res.result)) {
                            candidate = "Pergamino";
                            break;
                        }
                    }
                }

                if (candidate) {
                    let effect = 'speak_with_animals';
                    const candLower = candidate.toLowerCase();
                    if (candLower.includes('hablar con los animales') || candLower.includes('speak with animals')) {
                        effect = 'speak_with_animals';
                    } else if (candLower.includes('detectar magia') || candLower.includes('detect magic')) {
                        effect = 'detect_magic';
                    } else if (candLower.includes('comprender idiomas') || candLower.includes('comprehend languages')) {
                        effect = 'comprehend_languages';
                    }

                    const isTaken = !!(updatedWorldState?.globalFlags?.[`took_scroll_${effect}`]);
                    if (!isTaken) {
                        foundScrollName = candidate;
                        break;
                    }
                }
            }
        }

        if (foundScrollName === 'Pergamino') {
            for (const char of party) {
                if (char.inventory) {
                    for (const item of char.inventory) {
                        if (/pergamino|scroll/i.test(item.name)) {
                            foundScrollName = item.name;
                            break;
                        }
                    }
                }
            }
        }

        // 2. Determinar el efecto del pergamino basado en su nombre
        let scrollSpellEffect = 'speak_with_animals'; // Por defecto
        const scrollNameLower = foundScrollName.toLowerCase();
        if (scrollNameLower.includes('hablar con los animales') || scrollNameLower.includes('speak with animals')) {
            scrollSpellEffect = 'speak_with_animals';
        } else if (scrollNameLower.includes('detectar magia') || scrollNameLower.includes('detect magic')) {
            scrollSpellEffect = 'detect_magic';
        } else if (scrollNameLower.includes('comprender idiomas') || scrollNameLower.includes('comprehend languages')) {
            scrollSpellEffect = 'comprehend_languages';
        }

        const identifiedKey = `identified_scroll_${scrollSpellEffect}`;
        const isIdentified = !!updatedWorldState.globalFlags[identifiedKey];

        // 3. Comprobar si la intención es coger/recoger el pergamino
        const isTakeIntent = /coger|coj|tom|guard|recog|llev|agarr|quit|rob|qued|sac|obten|adquir|recuper|take|grab|loot|steal|pocket|keep|get|retrieve|hold/i.test(actionLower);

        if (isTakeIntent) {
            const activeCharName = interpretation.assignedCompanion || party[0]?.name;
            const activeChar = party.find(p => p.name.toLowerCase() === activeCharName?.toLowerCase()) || party[0];

            let searchTerm = 'pergamino';
            if (scrollSpellEffect === 'speak_with_animals') {
                searchTerm = 'animal';
            } else if (scrollSpellEffect === 'detect_magic') {
                searchTerm = 'magia';
            } else if (scrollSpellEffect === 'comprehend_languages') {
                searchTerm = 'idioma';
            }

            const alreadyHasIt = activeChar?.inventory?.some((item: any) => 
                /pergamino|scroll/i.test(item.name) && 
                new RegExp(searchTerm, 'i').test(item.name)
            );

            if (alreadyHasIt) {
                return {
                    interpretation: {
                        ...interpretation,
                        actionType: 'interact',
                        targetId: foundScrollName
                    },
                    systemFeedback: `Ya tienes el '${foundScrollName}' en tu inventario.`,
                    updatedWorldState,
                    intercepted: true
                };
            }

            const updatedParty = JSON.parse(JSON.stringify(party));
            const charInParty = updatedParty.find((p: any) => 
                (p.id && activeChar.id && p.id.toString().trim() === activeChar.id.toString().trim()) ||
                (p.name && activeChar.name && p.name.toLowerCase().trim() === activeChar.name.toLowerCase().trim())
            );
            if (charInParty) {
                if (!charInParty.inventory) {
                    charInParty.inventory = [];
                }
                charInParty.inventory.push({
                    id: `scroll-${scrollSpellEffect}`,
                    name: foundScrollName || `Pergamino de ${scrollSpellEffect === 'speak_with_animals' ? 'Hablar con los Animales' : scrollSpellEffect}`,
                    quantity: 1,
                    description: `Un pergamino mágico que contiene el conjuro ${scrollSpellEffect === 'speak_with_animals' ? 'Hablar con los Animales' : scrollSpellEffect === 'detect_magic' ? 'Detectar Magia' : 'Comprender Idiomas'}.`
                });
            }

            updatedWorldState.globalFlags[`took_scroll_${scrollSpellEffect}`] = true;

            return {
                interpretation: {
                    ...interpretation,
                    actionType: 'interact',
                    targetId: foundScrollName
                },
                systemFeedback: `Recoges el '${foundScrollName}' y lo guardas en el inventario de ${activeChar.name}.`,
                updatedWorldState,
                updatedParty,
                intercepted: true
            };
        }

        // 4. Cualquier acción de leer/usar/activar/descifrar se considera un intento de activación directa
        const isUseIntent = /leer|leo|lee|leemos|usar|uso|usa|usamos|activar|activo|activa|activamos|lanzar|lanzo|lanza|lanzamos|descifrar|descifro|descifra|decipher|read|use|activate|cast|úsalo|usalo|lánzalo|lanzalo/i.test(actionLower) || 
                            (interpretation.activatedEffects && interpretation.activatedEffects.length > 0) ||
                            /\b(léelo|leelo|descífralo|descifralo|identifícalo|identificalo|úsalo|usalo|lánzalo|lanzalo|inténtalo|intentalo|hazlo|hazla|leela|léela)\b/i.test(actionLower);

        if (isUseIntent) {
            // Identificar personaje activo
            const activeCharName = interpretation.assignedCompanion || party[0]?.name;
            const activeChar = party.find(p => 
                p.name && activeCharName && p.name.toLowerCase().trim() === activeCharName.toLowerCase().trim()
            ) || party[0];

            // Comprobar si el conjuro pertenece a su lista de clase
            const charClassLower = activeChar?.characterClass?.toLowerCase() || '';
            let isSpellOnClassList = false;

            if (scrollSpellEffect === 'speak_with_animals') {
                isSpellOnClassList = ['druid', 'ranger', 'bard', 'druida', 'explorador', 'bardo'].includes(charClassLower);
            } else if (scrollSpellEffect === 'detect_magic') {
                isSpellOnClassList = ['wizard', 'cleric', 'druid', 'bard', 'sorcerer', 'paladin', 'mago', 'clérigo', 'druida', 'bardo', 'hechicero', 'paladín'].includes(charClassLower);
            } else if (scrollSpellEffect === 'comprehend_languages') {
                isSpellOnClassList = ['wizard', 'bard', 'sorcerer', 'warlock', 'mago', 'bardo', 'hechicero', 'brujo'].includes(charClassLower);
            }

            if (isSpellOnClassList) {
                // Activación automática
                updatedWorldState.globalFlags[scrollSpellEffect] = true;
                updatedWorldState.globalFlags[`consumed_scroll_${scrollSpellEffect}`] = true;
                const updatedParty = consumeScrollFromPartyInventory(party, scrollSpellEffect);
                return {
                    interpretation: {
                        ...interpretation,
                        actionType: 'interact',
                        activatedEffects: [scrollSpellEffect]
                    },
                    systemFeedback: `Lees el pergamino con fluidez y activas su magia con éxito de forma automática ya que '${scrollSpellEffect}' pertenece a tu lista de clase de ${activeChar.characterClass || 'Mago'}.`,
                    updatedWorldState,
                    updatedParty,
                    intercepted: true
                };
            } else {
                // No pertenece a su clase: requiere tirada de Arcanos CD 10 para canalizar la magia.
                // Si la tirada tiene éxito, se consume y se activa. Si falla, no se consume.
                return {
                    interpretation: {
                        ...interpretation,
                        actionType: 'skill_check',
                        targetId: foundScrollName,
                        overrideSkill: 'arcana',
                        overrideDC: 10,
                        activatedEffects: [] // Se elimina de la interpretación inmediata
                    },
                    systemFeedback: `Intentas leer el pergamino mágico para activar su conjuro. Como no pertenece a tu lista de clase de ${activeChar.characterClass || 'Guerrero'}, debes realizar una tirada de Arcanos (CD 10) para intentar canalizar la magia con éxito.`,
                    updatedWorldState,
                    intercepted: true,
                    pendingEffects: [scrollSpellEffect],
                    pendingWorldStateFlags: {
                        [`consumed_scroll_${scrollSpellEffect}`]: true
                    }
                };
            }
        }

        return {
            interpretation,
            intercepted: false
        };
    }
}

/**
 * Auxiliar para consumir físicamente un pergamino del inventario del grupo
 */
function consumeScrollFromPartyInventory(party: any[], spellEffect: string): any[] {
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
            const index = char.inventory.findIndex((item: any) => 
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
