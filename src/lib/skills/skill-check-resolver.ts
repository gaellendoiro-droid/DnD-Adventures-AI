
import { v4 as uuidv4 } from 'uuid';
import { Character, DiceRoll, DiceRollOutcome, SkillCheckResult, SkillName, RollMode } from '../types';
import { rollD20 } from '../dice/dice-engine';
import { SKILL_TRANSLATIONS } from '../constants';

// Mapa de Habilidad a Atributo (en español, como en el schema de Character)
// Usado solo para estrategia de Fallback
const SKILL_TO_ATTRIBUTE: Record<SkillName, keyof Character['abilityScores']> = {
    "athletics": "fuerza",
    "acrobatics": "destreza",
    "sleight_of_hand": "destreza",
    "stealth": "destreza",
    "arcana": "inteligencia",
    "history": "inteligencia",
    "investigation": "inteligencia",
    "nature": "inteligencia",
    "religion": "inteligencia",
    "animal_handling": "sabiduría",
    "insight": "sabiduría",
    "medicine": "sabiduría",
    "perception": "sabiduría",
    "survival": "sabiduría",
    "deception": "carisma",
    "intimidation": "carisma",
    "performance": "carisma",
    "persuasion": "carisma"
};

/**
 * Resuelve una prueba de habilidad (Skill Check) de forma determinista y segura.
 * Strategy: "Optimistic with Safe Fallback"
 * 
 * 1. Intenta leer el modificador pre-calculado de la ficha.
 * 2. Si falla, lo calcula al vuelo usando Atributos + Bono de Competencia.
 * 3. Ejecuta la tirada usando el DiceEngine.
 * 4. Retorna el objeto DiceRoll formateado listo para la UI y persistencia.
 */
export function resolveSkillCheck(
    character: Character,
    skillName: SkillName,
    difficultyClass: number,
    rollMode: RollMode = 'normal'
): DiceRoll {

    // 1. Obtener el modificador efectivo
    let finalModifier = 0;
    let modifierSource = "calculated"; // 'sheet' or 'calculated'

    // Buscar en los pre-calculados
    const sheetSkill = character.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase() || s.name === SKILL_TRANSLATIONS[skillName]);

    if (sheetSkill && typeof sheetSkill.modifier === 'number') {
        finalModifier = sheetSkill.modifier;
        modifierSource = "sheet";
    } else {
        // FALLBACK STRATEGY
        // Si llegamos aquí, la ficha no tiene el skill o está mal formada.
        // Calculamos manual: Stat Mod + (PB if proficient)
        console.warn(`[SkillCheckResolver] Warning: Skill '${skillName}' not found in character '${character.name}'. Using fallback calculation.`);

        // a. Obtener stats base
        const attributeKey = SKILL_TO_ATTRIBUTE[skillName];
        // Intentamos leer de abilityModifiers (pre-calc) o abilityScores (raw)
        let abilityMod = 0;

        if (character.abilityModifiers && typeof character.abilityModifiers[attributeKey] === 'number') {
            abilityMod = character.abilityModifiers[attributeKey];
        } else {
            // Fallback profundo: Calcular mod desde score: Math.floor((score - 10) / 2)
            const score = character.abilityScores[attributeKey] || 10;
            abilityMod = Math.floor((score - 10) / 2);
        }

        // b. Sumar proficiencia si aplica (Asumimos false si no hay info, o pasas info extra? 
        // Por simplicidad en fallback asumimos no proficient a menos que encontremos el objeto sin modifier)
        // Pero si el objeto sheetSkill existia pero sin modifier, podriamos ver su 'proficient' flag.
        const isProficient = sheetSkill?.proficient || false;
        const pb = character.proficiencyBonus || 2;

        finalModifier = abilityMod + (isProficient ? pb : 0);
    }

    // 2. Ejecutar la tirada física
    const rollResult = rollD20(rollMode);
    const total = rollResult.kept + finalModifier;

    // 3. Determinar resultado
    // House Rule: Natural 20 is Auto Success? 
    // Por ahora D&D 5e RAW: Nat 20 en skills NO es auto éxito, pero el usuario pidió "Narrar criticos".
    // Lo marcaremos como 'crit' en outcome para efectos visuales/narrativos.

    let outcome: DiceRollOutcome = 'neutral'; // Default

    if (rollResult.naturalCrit) {
        outcome = 'crit';
        // Si decidimos que Nat20 siempre pasa:
        // success = true; 
    } else if (rollResult.naturalFail) {
        outcome = 'pifia';
        // success = false;
    } else if (total >= difficultyClass) {
        outcome = 'success';
    } else {
        outcome = 'fail';
    }

    // Asegurar consistencia éxito/fallo con criticos si se desea house rule (Opción del plan: "house rule donde 20 es éxito")
    // Implementamos la house rule solicitada en la sesión anterior:
    const isSuccess = rollResult.naturalCrit ? true : (rollResult.naturalFail ? false : total >= difficultyClass);

    // Ajustar outcome final basado en la house rule
    if (isSuccess && outcome !== 'crit') outcome = 'success';
    if (!isSuccess && outcome !== 'pifia') outcome = 'fail';

    // 4. Construir SkillCheckResult Detail
    const skillDetails: SkillCheckResult = {
        skillName: skillName,
        rollTotal: total,
        difficultyClass: difficultyClass,
        isSuccess: isSuccess,
        isCriticalSuccess: rollResult.naturalCrit,
        isCriticalFailure: rollResult.naturalFail,
        rollMode: rollMode,
        rollBreakdown: {
            die1: rollResult.die1,
            die2: rollResult.die2,
            kept: rollResult.kept,
            modifier: finalModifier
        }
    };

    // 5. Construir DiceRoll Object completo
    const diceRoll: DiceRoll = {
        id: uuidv4(),
        roller: character.name,
        rollNotation: `1d20${finalModifier >= 0 ? '+' : ''}${finalModifier}`, // Simple notation visual
        individualRolls: rollResult.die2 ? [rollResult.die1, rollResult.die2] : [rollResult.die1], // Legacy support

        type: 'skill_check',
        rollMode: rollMode,
        diceResults: rollResult,
        skillCheckDetails: skillDetails,

        modifier: finalModifier,
        totalResult: total,
        outcome: outcome,
        timestamp: new Date(),
        description: `Skill Check: ${SKILL_TRANSLATIONS[skillName] || skillName} (CD ${difficultyClass})`,

        // Legacy fields (optional but good for compatibility)
        modifiers: [{ label: SKILL_TRANSLATIONS[skillName]?.substring(0, 3).toUpperCase() || "MOD", value: finalModifier }]
    };

    return diceRoll;
}
