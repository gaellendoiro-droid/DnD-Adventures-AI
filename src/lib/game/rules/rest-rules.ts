import { RuleModule, RulesEngineInput, RulesEngineResult } from './rule-module';

export class RestRuleModule implements RuleModule {
    name = 'RestRules';

    canHandle(input: RulesEngineInput): boolean {
        const { playerAction, interpretation } = input;
        const actionLower = playerAction.toLowerCase();

        if (interpretation.actionType === 'rest') return true;
        // Nunca convertir en descanso un ataque, una aclaración o una consulta fuera de personaje
        if (['attack', 'clarify', 'ooc'].includes(interpretation.actionType)) return false;

        // Solo palabras completas que expresan que el grupo descansa o duerme.
        // Se evitan falsos positivos como "dormitorio", "restos", "restante", "descansillo"
        // o terceras personas ("el oso duerme", "el guardia descansa").
        return RestRuleModule.REST_INTENT_REGEX.test(actionLower);
    }

    static readonly REST_INTENT_REGEX =
        /(?<![\p{L}])(descanso|descansos|descansar|descansarnos|descansamos|descansemos|descansad|descansaremos|dormir|dormirnos|dormimos|dormid|dormiremos|duermo|durmamos|siesta|rest|resting|sleep|sleeping)(?![\p{L}])/iu;

    evaluate(input: RulesEngineInput): RulesEngineResult {
        const { playerAction, interpretation, party, worldState } = input;
        const actionLower = playerAction.toLowerCase();

        let updatedWorldState = worldState ? JSON.parse(JSON.stringify(worldState)) : { locations: {}, globalFlags: {}, recentEvents: [] };
        if (!updatedWorldState.globalFlags) {
            updatedWorldState.globalFlags = {};
        }

        // Determinar si es un descanso largo
        const isLongRest = /\b(largo|long|dormir|sleep|ocho|8\s*horas|8\s*h|8\s*hours)/i.test(actionLower);

        // 1. Mutar el reloj del mundo
        if (!updatedWorldState.worldTime) {
            updatedWorldState.worldTime = { day: 1, hour: 8, minute: 0 };
        }

        let day = updatedWorldState.worldTime.day ?? 1;
        let hour = updatedWorldState.worldTime.hour ?? 8;
        let minute = updatedWorldState.worldTime.minute ?? 0;

        const hoursToAdd = isLongRest ? 8 : 1;
        hour += hoursToAdd;
        if (hour >= 24) {
            const daysToAdd = Math.floor(hour / 24);
            day += daysToAdd;
            hour = hour % 24;
        }

        updatedWorldState.worldTime = { day, hour, minute };

        // 2. Aplicar consecuencias al grupo de personajes
        const updatedParty = JSON.parse(JSON.stringify(party));
        let feedbackDetails = '';

        for (const char of updatedParty) {
            if (char.isDead || char.hp?.current <= 0) {
                // Los personajes muertos no descansan mágicamente
                continue;
            }

            if (isLongRest) {
                // Descanso Largo: restauración completa de HP y ranuras
                const oldHp = char.hp.current;
                char.hp.current = char.hp.max;
                
                // Limpiar deathSaves
                if (char.deathSaves) {
                    char.deathSaves.successes = 0;
                    char.deathSaves.failures = 0;
                }

                // Restaurar ranuras de conjuros
                const maxSlots = this.getMaxSpellSlots(char.characterClass || '', char.level || 1);
                if (Object.keys(maxSlots).length > 0) {
                    char.spellSlots = maxSlots;
                }

                feedbackDetails += `${char.name} recupera todos sus puntos de golpe (${char.hp.max} HP) y ranuras de conjuro. `;
            } else {
                // Descanso Corto: tirar dados de golpe simulados
                const oldHp = char.hp.current;
                const conModifier = char.abilityModifiers?.constitución ?? char.abilityModifiers?.Constitution ?? 0;
                const hitDieSize = this.getHitDieType(char.characterClass || '');
                const numDice = Math.max(1, Math.floor((char.level || 1) / 2));

                let healAmount = 0;
                for (let i = 0; i < numDice; i++) {
                    healAmount += Math.floor(Math.random() * hitDieSize) + 1 + conModifier;
                }
                healAmount = Math.max(1, healAmount);
                char.hp.current = Math.min(char.hp.max, char.hp.current + healAmount);

                const healed = char.hp.current - oldHp;
                feedbackDetails += `${char.name} gasta dados de golpe y recupera ${healed} HP (ahora tiene ${char.hp.current}/${char.hp.max}). `;

                // Mago: Recuperación Arcana (restaura una ranura de nivel 1 si ha gastado alguna)
                if (char.characterClass?.toLowerCase() === 'mago' || char.characterClass?.toLowerCase() === 'wizard') {
                    if (char.spellSlots && char.spellSlots.level1 !== undefined) {
                        const maxSlots = this.getMaxSpellSlots(char.characterClass, char.level || 1);
                        if (char.spellSlots.level1 < (maxSlots.level1 || 0)) {
                            char.spellSlots.level1 += 1;
                            feedbackDetails += `${char.name} usa Recuperación Arcana para restaurar 1 ranura de conjuro de nivel 1. `;
                        }
                    }
                }
            }
        }

        // 3. Limpiar efectos temporales si es descanso largo
        if (isLongRest) {
            const spellsToClear = ['speak_with_animals', 'detect_magic', 'comprehend_languages'];
            for (const spell of spellsToClear) {
                if (updatedWorldState.globalFlags[spell] === true) {
                    updatedWorldState.globalFlags[spell] = false;
                }
            }
        }

        const systemFeedback = isLongRest
            ? `Realizas un descanso largo (8 horas). El tiempo avanza a las ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} del día ${day}. ${feedbackDetails.trim()}`
            : `Realizas un descanso corto (1 hora). El tiempo avanza a las ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} del día ${day}. ${feedbackDetails.trim()}`;

        return {
            interpretation: {
                ...interpretation,
                actionType: 'narrate' // Forzar a narrar el descanso
            },
            systemFeedback,
            updatedWorldState,
            updatedParty,
            intercepted: true
        };
    }

    private getHitDieType(characterClass: string): number {
        const cls = characterClass.toLowerCase();
        if (['guerrero', 'fighter', 'paladín', 'paladin'].includes(cls)) return 10;
        if (['clérigo', 'cleric', 'bardo', 'bard', 'pícaro', 'rogue', 'monje', 'monk', 'druida', 'druid'].includes(cls)) return 8;
        if (['mago', 'wizard', 'hechicero', 'sorcerer'].includes(cls)) return 6;
        return 8; // Default
    }

    private getMaxSpellSlots(characterClass: string, level: number): Record<string, number> {
        const cls = characterClass.toLowerCase();
        const lvl = level || 1;

        if (['mago', 'wizard', 'clérigo', 'cleric', 'bardo', 'bard', 'druida', 'druid', 'hechicero', 'sorcerer'].includes(cls)) {
            if (lvl === 1) return { level0: 999, level1: 2 };
            if (lvl === 2) return { level0: 999, level1: 3 };
            if (lvl === 3) return { level0: 999, level1: 4, level2: 2 };
            if (lvl >= 4) return { level0: 999, level1: 4, level2: 3 };
        }

        if (['paladín', 'paladin', 'explorador', 'ranger'].includes(cls)) {
            if (lvl === 1) return {};
            if (lvl === 2) return { level0: 999, level1: 2 };
            if (lvl >= 3) return { level0: 999, level1: 3 };
        }

        return {};
    }
}
