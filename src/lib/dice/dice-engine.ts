
/**
 * Motor de dados centralizado del sistema.
 * Maneja la lógica matemática pura de tiradas, incluyendo mecánicas 
 * de Ventaja (2d20kh1) y Desventaja (2d20kl1).
 */

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface D20RollResult {
    total: number;       // Resultado final (después de aplicar ventaja/desventaja, sin modificadores)
    die1: number;        // Resultado del primer dado
    die2?: number;       // Resultado del segundo dado (si hubo ventaja/desventaja)
    kept: number;        // El valor que se mantuvo
    discarded?: number;  // El valor que se descartó (si hubo ventaja/desventaja)
    naturalCrit: boolean; // Si el dado mantenido es un 20 natural
    naturalFail: boolean; // Si el dado mantenido es un 1 natural
}

/**
 * Realiza una tirada de d20 aplicando la mecánica solicitada.
 * Esta función es pura y determinista (dado un RNG).
 * 
 * @param mode El modo de la tirada ('normal', 'advantage', 'disadvantage')
 * @returns Detalles completos de la tirada
 */
export function rollD20(mode: RollMode = 'normal'): D20RollResult {
    const die1 = Math.floor(Math.random() * 20) + 1;
    const die2 = (mode !== 'normal') ? Math.floor(Math.random() * 20) + 1 : undefined;

    let kept = die1;
    let discarded: number | undefined = undefined;

    if (mode === 'advantage') {
        // Ventaja: Mantener el mayor (Keep Highest 1)
        if (die2 !== undefined) {
            kept = Math.max(die1, die2);
            discarded = Math.min(die1, die2);
        }
    } else if (mode === 'disadvantage') {
        // Desventaja: Mantener el menor (Keep Lowest 1)
        if (die2 !== undefined) {
            kept = Math.min(die1, die2);
            discarded = Math.max(die1, die2);
        }
    }

    // En modo normal, kept es die1 y discarded es undefined

    return {
        total: kept, // Nota: Esto es el valor crudo del dado, sin modificadores aún
        die1,
        die2,
        kept,
        discarded,
        naturalCrit: kept === 20,
        naturalFail: kept === 1
    };
}

/**
 * Utilidad simple para tirar cualquier dado con notación XdY
 * @param count Número de dados
 * @param sides Caras del dado
 */
export function rollDice(count: number, sides: number): number[] {
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    return rolls;
}

/**
 * Suma un array de resultados de dados
 */
export function sumRolls(rolls: number[]): number {
    return rolls.reduce((acc, val) => acc + val, 0);
}
