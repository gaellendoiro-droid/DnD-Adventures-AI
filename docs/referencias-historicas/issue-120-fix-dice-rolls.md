# Plan de Desarrollo: Issue #120 - Fix Dice Rolls Inconsistencies

Este plan detalla los pasos para solucionar el Issue #120, implementando la arquitectura "Cerebro Centralizado, Frontend Obediente" para resolver las inconsistencias en el cálculo y visualización de tiradas de dados.

## Objetivos
1.  **Cálculo Correcto:** Asegurar que las tiradas de daño con modificadores negativos se calculen correctamente (ej: `1d8-1` = 6, no 7).
2.  **Visualización Fiel:** Asegurar que el desglose visual de la tirada muestre el atributo que realmente se usó (ej: FUE -1), no el más alto (ej: DES +3).
3.  **Robustez:** Mejorar el parser de dados para tolerar formatos inusuales pero matemáticamente válidos.

## Análisis Técnico

### Flujo de Datos Actual (Problemático)
1.  `CombatActionResolver` calcula `1d20+X` pero no dice qué atributo usó.
2.  `CombatActionResolver` genera strings como `1d8+-1` para modificadores negativos.
3.  `diceRollerTool` falla al parsear `+-1` y lo ignora (tratándolo como +0).
4.  Frontend (`updateRollNotationWithModifiers`) recibe la tirada y "adivina" el atributo basándose en cuál es mayor (FUE vs DES), causando discrepancia visual.

### Nueva Arquitectura ("Cerebro Centralizado")
1.  `CombatActionResolver` decide el atributo usando lógica de D&D (Finesse, Ranged, etc.).
2.  `CombatActionResolver` formatea correctamente el string (`1d8-1`).
3.  `CombatActionResolver` pasa el contexto `attributeUsed` a través de toda la cadena.
4.  `diceRollerTool` recibe y devuelve `attributeUsed`.
5.  Frontend usa `attributeUsed` para mostrar el desglose correcto.

## Pasos de Implementación

### Fase 1: Definición de Tipos y Schemas
Actualizar las interfaces para soportar el nuevo campo `attributeUsed`.

- [x] **1.1. Actualizar `src/lib/types.ts`**
    - Añadir `attributeUsed?: 'FUE' | 'DES' | 'CON' | 'INT' | 'SAB' | 'CAR'` a la interfaz `DiceRoll`.

- [x] **1.2. Actualizar `src/lib/combat/action-resolver.ts`**
    - Añadir `attributeUsed` a la interfaz `DiceRollRequest`.

- [x] **1.3. Actualizar `src/ai/tools/dice-roller.ts`**
    - Actualizar `DiceRollRequestSchema` (Zod) para incluir `attributeUsed` (opcional).
    - Actualizar `DiceRollResultSchema` (Zod) para incluir `attributeUsed` (opcional).
    - Actualizar la implementación de la herramienta para pasar `attributeUsed` del request al result.

### Fase 2: Lógica de Negocio ("El Cerebro")
Implementar la lógica de selección de atributos y formateo en `CombatActionResolver`.

- [x] **2.1. Implementar Helpers en `src/lib/combat/action-resolver.ts`**
    - `private static getAttackAbility(weapon: any, character: Character): { mod: number, label: string }`
        - **Objetivo:** Centralizar la decisión de qué atributo usar para cualquier ataque.
        - **Lógica Inicial (Armas):**
            - **A distancia (Ranged):** Usa DES.
            - **Sutil (Finesse):** Usa el mayor entre FUE y DES.
            - **Arrojadiza (Thrown):** (Si se implementa) Usa FUE (o DES si es Finesse).
            - **Por defecto:** Usa FUE.
        - **Extensibilidad:** Estructura preparada para añadir lógica de hechizos (INT/SAB/CAR) en el futuro.
    - `private static formatDiceNotation(dice: string, bonus: number): string`
        - Lógica: Manejar signos correctamente (`+` para positivos, nada para negativos ya que el número lo incluye).

- [x] **2.2. Actualizar `resolvePlayerAttack` en `src/lib/combat/action-resolver.ts`**
    - Usar `getWeaponAbility` para determinar bonificadores.
    - Usar `formatDiceNotation` para generar el string de la tirada.
    - Incluir `attributeUsed` en el objeto `DiceRollRequest`.

- [x] **2.3. Actualizar `src/lib/combat/action-executor.ts`**
    - Actualizar interfaz `DiceRollRequest` para incluir `attributeUsed`.
    - Pasar `attributeUsed` en la llamada a `diceRollerTool`.

### Fase 3: Robustez del Parser
Asegurar que el parser de dados no falle silenciosamente con formatos extraños.

- [x] **3.1. Mejorar Regex en `src/ai/tools/dice-roller.ts`**
    - Actualizar la regex para soportar espacios opcionales y el formato `+-` (aunque `formatDiceNotation` debería evitarlo, es bueno por seguridad).
    - Regex propuesta: `/(\d+)d(\d+)\s*([+-]?\s*-?\d+)?/` o lógica manual más robusta.

### Fase 4: Visualización ("Frontend Obediente")
Actualizar la utilidad de notación para respetar la decisión del backend.

- [x] **4.1. Actualizar `src/lib/combat/roll-notation-utils.ts`**
    - Modificar `updateRollNotationWithModifiers` para aceptar `attributeUsed` (ya sea en el objeto `roll` o como parámetro).
    - Si `attributeUsed` está presente, usar ese atributo para el desglose.
    - Si no, mantener el comportamiento legacy (fallback a Max(FUE, DES)).

## Verificación
- [ ] Verificar que Merryl (FUE -1, DES +3) ataca con Bastón (FUE) usando -1.
    - Notación: `1d6-1` (o `1d8-1`).
    - Desglose visual: `1d6 - 1 (FUE)`.
    - Resultado total correcto.
- [ ] Verificar que Merryl ataca con Daga (Finesse) usando +3 (DES).
- [ ] Verificar que un personaje con Arco usa DES.

## Notas Futuras
- **Extensibilidad de `getAttackAbility`:** La implementación actual cubre armas físicas (Cuerpo a cuerpo, A distancia, Sutil). En el futuro, esta función deberá extenderse para soportar:
    - **Hechizos:** Usar INT, SAB o CAR según la clase del lanzador.
    - **Armas Mágicas:** Armas como *Shillelagh* (SAB) o armas de Hexblade (CAR).
    - **Armas de Monje:** Usar DES en lugar de FUE para armas de monje.
    - **Ataques Especiales:** Habilidades que usen CON u otros atributos.
    
    La arquitectura actual ("Cerebro Centralizado") facilita esta expansión, ya que solo requerirá añadir más lógica condicional dentro de `getAttackAbility` sin afectar al resto del sistema de resolución o visualización.
