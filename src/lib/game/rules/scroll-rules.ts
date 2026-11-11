import { RuleModule, RulesEngineInput, RulesEngineResult } from './rule-module';
import { addEffectToCharacterInParty } from '../systems/effect-utils';

export class ScrollRuleModule implements RuleModule {
    name = 'ScrollRules';

    /**
     * Determina si la acción del jugador involucra a un pergamino mágico en la ubicación, inventarios o escena.
     */
    canHandle(input: RulesEngineInput): boolean {
        const { playerAction, interpretation, party, currentLocationId, adventureData, worldState } = input;
        if (interpretation.actionType === 'clarify') {
            return false;
        }
        const actionLower = playerAction.toLowerCase();

        // 1. Escanear si existe algún pergamino mágico en la escena
        let foundScrollName = '';

        // Buscar en la ubicación actual
        const location = adventureData.locations?.find((l: any) => l.id === currentLocationId);
        
        // Buscar en posesiones de NPCs presentes en la ubicación
        if (location?.entitiesPresent) {
            for (const entry of location.entitiesPresent) {
                const rawEntityId = typeof entry === 'string' ? entry : (entry?.entityId || entry?.id);
                const entity = adventureData.entities?.find((e: any) => e.id === rawEntityId);
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
        let inventoryScrollId = '';
        if (!foundScrollName) {
            for (const char of party) {
                if (char.inventory) {
                    for (const item of char.inventory) {
                        if (/pergamino|scroll/i.test(item.name) || /^scroll-/i.test(item.id || '')) {
                            foundScrollName = item.name;
                            inventoryScrollId = item.id || '';
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
        const scrollNameLower = `${foundScrollName} ${inventoryScrollId}`.toLowerCase();
        if (scrollNameLower.includes('hablar con los animales') || scrollNameLower.includes('speak with animals') || scrollNameLower.includes('speak_with_animals')) {
            scrollSpellEffect = 'speak_with_animals';
        } else if (scrollNameLower.includes('detectar magia') || scrollNameLower.includes('detect magic') || scrollNameLower.includes('detect_magic')) {
            scrollSpellEffect = 'detect_magic';
        } else if (scrollNameLower.includes('comprender idiomas') || scrollNameLower.includes('comprehend languages') || scrollNameLower.includes('comprehend_languages')) {
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

        // Si la acción o la interpretación hacen referencia a un pergamino (semánticamente vía actionInterpreter o por mención/elisión)
        const hasTakenScroll = !!(worldState?.globalFlags?.[`took_scroll_${scrollSpellEffect}`]) || !!inventoryScrollId;
        const recentMessagesText = (input.conversationHistory || [])
            .slice(-2)
            .map((m: any) => String(m.originalContent || m.content || ''))
            .join(' ');
        const recentHistoryMentionsScroll = /pergamino|scroll|sello|runas|inscripciones|conjuro|descifrar|reconocer|abrir el pergamino|leerlo/i.test(recentMessagesText);
        const isConfirmationAction =
            hasTakenScroll &&
            !isEffectActive &&
            recentHistoryMentionsScroll &&
            /^\s*(de acuerdo|adelante|procede|hazlo|inténtalo|intentalo|dale|sí|si|vale|ok|claro|por supuesto|venga|buena idea|me parece bien)\b/i.test(actionLower);

        const hasIdentifyOrCastWords =
            /\b(descifrar|descifro|descifra|descífralo|descifralo|descifrarlo|identificar|identifico|identifica|identifícalo|identificalo|identificarlo|examinar|examino|examina|examínalo|examinalo|examinarlo|analizar|analizo|analiza|inspeccionar|inspecciono|inspecciona|averiguar|averiguo|averigua|reconocer|reconozco|reconoce|reconocerlo|leer|leo|lee|leemos|léelo|leelo|leerlo|leela|léela|leerla|usar|uso|usa|usamos|úsalo|usalo|usarlo|activar|activo|activa|activamos|activarlo|lanzar|lanzo|lanza|lanzamos|lánzalo|lanzalo|lanzarlo|canalizar)\b|de qu[eé] se trata|qu[eé] contiene|qu[eé] pone|qu[eé] dice/i.test(actionLower);

        const semanticScrollMatch =
            (interpretation.targetId && /pergamino|scroll|speak_with_animals|detect_magic|comprehend_languages|hablar con los animales/i.test(interpretation.targetId)) ||
            (interpretation.objectIntent && ['take', 'identify', 'use', 'give'].includes(interpretation.objectIntent) && (hasTakenScroll || !isEffectActive)) ||
            (interpretation.activatedEffects &&
                interpretation.activatedEffects.some((eff: string) =>
                    ['speak_with_animals', 'detect_magic', 'comprehend_languages'].includes(eff)
                ));
        const fallbackTextMatch =
            actionLower.includes('pergamino') ||
            actionLower.includes('scroll') ||
            isConfirmationAction ||
            /\b(léelo|leelo|leerlo|leela|léela|leerla|descífralo|descifralo|descifrarlo|identifícalo|identificalo|identificarlo|examínalo|examinalo|examinarlo|úsalo|usalo|usarlo|activarlo|lánzalo|lanzalo|lanzarlo|inténtalo|intentalo|intentarlo|hazlo|hacerlo|hazla)\b/i.test(actionLower) ||
            (hasTakenScroll && !isEffectActive && hasIdentifyOrCastWords && !/\b(puerta|cerradura|cofre|baúl|baul|trampa|llave|poción|pocion)\b/i.test(actionLower));

        const mentionsScroll = semanticScrollMatch || fallbackTextMatch;

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
            for (const entry of location.entitiesPresent) {
                const rawEntityId = typeof entry === 'string' ? entry : (entry?.entityId || entry?.id);
                const entity = adventureData.entities?.find((e: any) => e.id === rawEntityId);
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

        let inventoryScrollId = '';
        if (foundScrollName === 'Pergamino') {
            for (const char of party) {
                if (char.inventory) {
                    for (const item of char.inventory) {
                        if (/pergamino|scroll/i.test(item.name) || /^scroll-/i.test(item.id || '')) {
                            foundScrollName = item.name;
                            inventoryScrollId = item.id || '';
                            break;
                        }
                    }
                }
            }
        }

        // 2. Determinar el efecto del pergamino basado en su nombre o ID
        let scrollSpellEffect = 'speak_with_animals'; // Por defecto
        const scrollNameLower = `${foundScrollName} ${inventoryScrollId}`.toLowerCase();
        if (scrollNameLower.includes('hablar con los animales') || scrollNameLower.includes('speak with animals') || scrollNameLower.includes('speak_with_animals')) {
            scrollSpellEffect = 'speak_with_animals';
        } else if (scrollNameLower.includes('detectar magia') || scrollNameLower.includes('detect magic') || scrollNameLower.includes('detect_magic')) {
            scrollSpellEffect = 'detect_magic';
        } else if (scrollNameLower.includes('comprender idiomas') || scrollNameLower.includes('comprehend languages') || scrollNameLower.includes('comprehend_languages')) {
            scrollSpellEffect = 'comprehend_languages';
        }

        const identifiedKey = `identified_scroll_${scrollSpellEffect}`;
        const isIdentified = !!updatedWorldState.globalFlags[identifiedKey];
        const canonicalScrollName =
            scrollSpellEffect === 'speak_with_animals'
                ? 'Pergamino de Hablar con los Animales'
                : scrollSpellEffect === 'detect_magic'
                    ? 'Pergamino de Detectar Magia'
                    : scrollSpellEffect === 'comprehend_languages'
                        ? 'Pergamino de Comprender Idiomas'
                        : (foundScrollName || `Pergamino de ${scrollSpellEffect}`);

        // Priorizar la intención semántica inferida por la IA (interpretation.objectIntent), reforzada por detección léxica y confirmaciones conversacionales
        const semanticObjectIntent = interpretation.objectIntent;
        const hasCastWords = /\b(leer|leo|lee|leemos|léelo|leelo|leerlo|leela|léela|leerla|usar|uso|usa|usamos|úsalo|usalo|usarlo|activar|activo|activa|activamos|activarlo|lanzar|lanzo|lanza|lanzamos|lánzalo|lanzalo|lanzarlo|canalizar|pronunciar|recitar|read|use|activate|cast)\b/i.test(actionLower);
        const hasIdentifyWords = /\b(descifrar|descifro|descifra|descífralo|descifralo|descifrarlo|identificar|identifico|identifica|identifícalo|identificalo|identificarlo|examinar|examino|examina|examínalo|examinalo|examinarlo|analizar|analizo|analiza|inspeccionar|inspecciono|inspecciona|averiguar|averiguo|averigua|reconocer|reconozco|reconoce|reconocerlo|decipher|identify|examine|inspect)\b|de qu[eé] se trata|qu[eé] contiene|qu[eé] pone|qu[eé] dice/i.test(actionLower);

        const recentMsgs = (input.conversationHistory || []).slice(-2);
        const recentMessagesText = recentMsgs
            .map((m: any) => String(m.originalContent || m.content || ''))
            .join(' ');
        const recentHistoryMentionsScroll = /pergamino|scroll|sello|runas|inscripciones|conjuro|descifrar|reconocer|abrir el pergamino|leerlo/i.test(recentMessagesText);
        const isConfirmationAction =
            recentHistoryMentionsScroll &&
            /^\s*(de acuerdo|adelante|procede|hazlo|inténtalo|intentalo|dale|sí|si|vale|ok|claro|por supuesto|venga|buena idea|me parece bien)\b/i.test(actionLower);

        // Detectar si un compañero acaba de ofrecerse a examinar/leer el pergamino en el último mensaje
        let confirmedCompanionName: string | undefined = undefined;
        let confirmedProposalIsIdentify = false;
        if (isConfirmationAction) {
            for (let i = recentMsgs.length - 1; i >= 0; i--) {
                const msg: any = recentMsgs[i];
                const speaker = msg.senderName || msg.characterName || '';
                const matchedComp = party.slice(1).find(p => p.name && speaker && p.name.toLowerCase() === speaker.toLowerCase());
                const msgText = String(msg.originalContent || msg.content || '');
                if (matchedComp && /pergamino|scroll|sello|runas|reconocer|descifrar|abrir|leer/i.test(msgText)) {
                    confirmedCompanionName = matchedComp.name;
                    if (!isIdentified && /reconocer|reconocerlo|descifrar|descifrarlo|identificar|examinar|analizar|sello|antes de abrir/i.test(msgText)) {
                        confirmedProposalIsIdentify = true;
                    }
                    break;
                }
            }
            if (!confirmedCompanionName && !isIdentified) {
                confirmedProposalIsIdentify = true;
            }
        }

        const isIdentifyOnlyIntent =
            semanticObjectIntent === 'identify' ||
            (hasIdentifyWords && !hasCastWords) ||
            (isConfirmationAction && confirmedProposalIsIdentify);

        const isUseIntent =
            semanticObjectIntent === 'use' ||
            semanticObjectIntent === 'identify' ||
            hasCastWords ||
            hasIdentifyWords ||
            isConfirmationAction ||
            (interpretation.activatedEffects && interpretation.activatedEffects.length > 0) ||
            (/\b(inténtalo|intentalo|hazlo|hazla)\b/i.test(actionLower));

        // Si es una acción pura de soltar ('drop') o dar ('give') SIN orden de leerlo/identificarlo en el mismo turno, delegar a InventoryRuleModule
        if (
            interpretation.actionType === 'drop' ||
            semanticObjectIntent === 'drop' ||
            ((interpretation.actionType === 'give' || semanticObjectIntent === 'give') && !isUseIntent)
        ) {
            return {
                interpretation,
                intercepted: false
            };
        }

        // 3. Comprobar si la intención es únicamente coger/recoger el pergamino (sin leerlo en el mismo acto)
        const isTakeIntent =
            semanticObjectIntent === 'take' ||
            (!semanticObjectIntent && !isUseIntent && /coger|cojer|coj|cogo|tom|guard|recog|llev|agarr|quit|rob|qued|sac|obten|adquir|recuper|acept|recib|pill|de sus fauces|de su boca|take|grab|loot|steal|pocket|keep|get|retrieve|hold/i.test(actionLower));

        if (isTakeIntent) {
            const mentionedCompanion = party.slice(1).find(p => p.name && actionLower.includes(p.name.toLowerCase()));
            const activeCharName = mentionedCompanion?.name || interpretation.assignedCompanion || party[0]?.name;
            const activeChar = party.find(p => p.name.toLowerCase() === activeCharName?.toLowerCase()) || party[0];

            let searchTerm = 'pergamino';
            if (scrollSpellEffect === 'speak_with_animals') {
                searchTerm = 'animal';
            } else if (scrollSpellEffect === 'detect_magic') {
                searchTerm = 'magia';
            } else if (scrollSpellEffect === 'comprehend_languages') {
                searchTerm = 'idioma';
            }

            const holderChar = party.find((c: any) =>
                c.inventory?.some((item: any) =>
                    item.id === `scroll-${scrollSpellEffect}` ||
                    (/pergamino|scroll/i.test(item.name) && new RegExp(searchTerm, 'i').test(item.name))
                )
            );

            if (holderChar) {
                return {
                    interpretation: {
                        ...interpretation,
                        actionType: 'interact',
                        targetId: 'pergamino'
                    },
                    systemFeedback: `${holderChar.name} ya tiene el pergamino enrollado en su inventario.`,
                    updatedWorldState,
                    intercepted: true
                };
            }

            const updatedParty = JSON.parse(JSON.stringify(party));
            const charInParty = updatedParty.find((p: any) => 
                (p.id && activeChar.id && p.id.toString().trim() === activeChar.id.toString().trim()) ||
                (p.name && activeChar.name && p.name.toLowerCase().trim() === activeChar.name.toLowerCase().trim())
            );
            const publicScrollName = isIdentified
                ? (foundScrollName || `Pergamino de ${scrollSpellEffect === 'speak_with_animals' ? 'Hablar con los Animales' : scrollSpellEffect}`)
                : 'Pergamino enrollado sellado';
            const publicScrollDesc = isIdentified
                ? `Un pergamino mágico enrollado.`
                : `Un pergamino enrollado y sellado con inscripciones aún por descifrar.`;

            if (charInParty) {
                if (!charInParty.inventory) {
                    charInParty.inventory = [];
                }
                charInParty.inventory.push({
                    id: `scroll-${scrollSpellEffect}`,
                    name: publicScrollName,
                    quantity: 1,
                    description: publicScrollDesc
                });
            }

            updatedWorldState.globalFlags[`took_scroll_${scrollSpellEffect}`] = true;

            return {
                interpretation: {
                    ...interpretation,
                    actionType: 'interact',
                    targetId: 'pergamino'
                },
                systemFeedback: `${activeChar.name} recoge el pergamino enrollado y lo guarda en su inventario.`,
                updatedWorldState,
                updatedParty,
                intercepted: true,
                events: [
                    {
                        type: 'ItemCollected',
                        payload: {
                            characterId: activeChar.id || activeChar.name,
                            characterName: activeChar.name,
                            itemId: `scroll-${scrollSpellEffect}`,
                            itemName: publicScrollName,
                            quantity: 1
                        }
                    }
                ]
            };
        }

        // 4. Intento de lectura / uso / activación (directo o tras pasárselo a un compañero en la misma frase)
        if (isUseIntent) {
            // Detectar si el jugador ha nombrado a un compañero (ej. "Le paso el pergamino a Merryl... léelo" o "Merryl, léelo" o confirmación a la propuesta de un compañero)
            const mentionedCompanion = party.slice(1).find(p => p.name && actionLower.includes(p.name.toLowerCase()));
            const holderCompanion = party.slice(1).find((c: any) =>
                c.inventory?.some((it: any) => it.id === `scroll-${scrollSpellEffect}` || /pergamino|scroll/i.test(it.name || ''))
            );
            const activeCharName =
                mentionedCompanion?.name ||
                confirmedCompanionName ||
                interpretation.recipient ||
                interpretation.assignedCompanion ||
                (isConfirmationAction && holderCompanion?.name) ||
                party[0]?.name;
            const activeChar = party.find(p => 
                p.name && activeCharName && p.name.toLowerCase().trim() === activeCharName.toLowerCase().trim()
            ) || party[0];

            // Asegurar que el pergamino pasa al inventario de quien lo va a leer si aún no ha sido consumido
            let updatedParty = JSON.parse(JSON.stringify(party));
            updatedWorldState.globalFlags[`took_scroll_${scrollSpellEffect}`] = true;

            // Si lo tenía otro miembro del grupo, transferirlo al lector activo
            let transferredScrollItem: any = null;
            let previousHolderName: string | undefined;
            for (const c of updatedParty) {
                if (c.inventory) {
                    const idx = c.inventory.findIndex((it: any) =>
                        it.id === `scroll-${scrollSpellEffect}` || /pergamino|scroll/i.test(it.name)
                    );
                    if (idx !== -1) {
                        transferredScrollItem = c.inventory.splice(idx, 1)[0];
                        previousHolderName = c.name;
                        break;
                    }
                }
            }
            // Contexto para el narrador: de dónde sale el pergamino (antes lo inventaba, p. ej.
            // "lo toma de las fauces de la oveja" cuando lo tenía Galador).
            const handoffNote = !transferredScrollItem
                ? `${activeChar.name} coge el pergamino que sujetaba la criatura. `
                : previousHolderName && previousHolderName.toLowerCase() !== activeChar.name.toLowerCase()
                    ? `${previousHolderName} le pasa el pergamino a ${activeChar.name}. `
                    : '';
            const readerInParty = updatedParty.find((c: any) => c.name?.toLowerCase() === activeChar.name.toLowerCase());
            if (readerInParty) {
                if (!readerInParty.inventory) readerInParty.inventory = [];
                readerInParty.inventory.push(
                    transferredScrollItem || {
                        id: `scroll-${scrollSpellEffect}`,
                        name: isIdentified ? canonicalScrollName : 'Pergamino enrollado sellado',
                        quantity: 1,
                        description: isIdentified ? `Un pergamino mágico.` : `Un pergamino enrollado y sellado con inscripciones aún por descifrar.`
                    }
                );
            }

            // Si la intención es ÚNICAMENTE descifrar/identificar/examinar el pergamino (sin lanzarlo aún)
            if (isIdentifyOnlyIntent) {
                return {
                    interpretation: {
                        ...interpretation,
                        actionType: 'skill_check',
                        targetId: `identify-scroll-${scrollSpellEffect}`,
                        assignedCompanion: activeChar.name,
                        overrideSkill: 'arcana',
                        overrideDC: 10,
                        activatedEffects: []
                    },
                    systemFeedback: `${handoffNote}${activeChar.name} examina el pergamino enrollado para intentar descifrar qué conjuro contiene mediante una tirada de Arcanos (CD 10).`,
                    updatedWorldState,
                    updatedParty,
                    intercepted: true,
                    pendingEffects: [],
                    pendingWorldStateFlags: {
                        [identifiedKey]: true
                    }
                };
            }

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
                updatedWorldState.globalFlags[identifiedKey] = true;
                updatedWorldState.globalFlags[scrollSpellEffect] = true;
                updatedWorldState.globalFlags[`consumed_scroll_${scrollSpellEffect}`] = true;
                updatedParty = consumeScrollFromPartyInventory(updatedParty, scrollSpellEffect);
                addEffectToCharacterInParty(updatedParty, activeChar.name, scrollSpellEffect, 'Pergamino mágico');
                return {
                    interpretation: {
                        ...interpretation,
                        actionType: 'interact',
                        assignedCompanion: activeChar.name,
                        activatedEffects: [scrollSpellEffect]
                    },
                    systemFeedback: `${handoffNote}${activeChar.name} lee el '${canonicalScrollName}' con fluidez y activa su magia con éxito de forma automática ya que pertenece a su lista de clase de ${activeChar.characterClass || 'Lanzador'}.`,
                    updatedWorldState,
                    updatedParty,
                    intercepted: true
                };
            } else {
                // No pertenece a su clase: requiere tirada de Arcanos CD 10 realizada por activeChar (ej. Merryl si se le ordenó a él)
                return {
                    interpretation: {
                        ...interpretation,
                        actionType: 'skill_check',
                        targetId: `cast-scroll-${scrollSpellEffect}`,
                        assignedCompanion: activeChar.name,
                        overrideSkill: 'arcana',
                        overrideDC: 10,
                        activatedEffects: [] // Se elimina de la interpretación inmediata
                    },
                    systemFeedback: `${handoffNote}${activeChar.name} intenta leer el pergamino para activar su conjuro. Como no pertenece directamente a su lista de clase de ${activeChar.characterClass || 'Aventurero'}, ${activeChar.name} realiza una tirada de Arcanos (CD 10) para canalizar la magia.`,
                    updatedWorldState,
                    updatedParty,
                    intercepted: true,
                    pendingEffects: [scrollSpellEffect],
                    pendingWorldStateFlags: {
                        [identifiedKey]: true,
                        [`consumed_scroll_${scrollSpellEffect}`]: true
                    }
                };
            }
        } else {
            return {
                interpretation: {
                    ...interpretation,
                    actionType: 'interact',
                    activatedEffects: []
                },
                systemFeedback: `El pergamino ya fue leído y consumido anteriormente; su conjuro ya se encuentra activo en la escena, por lo que ya podéis hablar directamente con el animal.`,
                updatedWorldState,
                // El grupo no cambia en esta rama: no se devuelve updatedParty
                intercepted: true
            };
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
