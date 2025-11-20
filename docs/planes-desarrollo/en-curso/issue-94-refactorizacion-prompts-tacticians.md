# Plan de Desarrollo: Issue #94 - Refactorización de Prompts de Tacticians

**Última actualización:** 2025-11-20

## 1. Visión General

Este plan detalla los pasos para refactorizar los prompts de los _tacticians_ (`enemyTacticianTool` y `companionTacticianTool`), separando la responsabilidad de la **decisión táctica** de la **narración**. El objetivo es centralizar toda la narración de combate en el `combatNarrationExpertTool`, mejorando la consistencia, reduciendo la complejidad de los prompts y disminuyendo la probabilidad de errores de validación.

- **Issue original:** [#94: Refactorización de Prompts de Tacticians - Separación de Narración y Decisión Táctica](https://github.com/gaelgimenez/DnD-Adventures-AI/issues/94)
- **Estado:** 📝 **EN CURSO**
- **Estimación:** 12-16 horas

## 2. Problema Actual

- **Responsabilidades Mezcladas:** Los tacticians deciden la acción Y la narran.
- **Inconsistencia Narrativa:** El estilo de narración de la IA (enemigos y compañeros) difiere del `combatNarrationExpertTool` usado para el jugador.
- **Complejidad de Prompts:** Los prompts de los tacticians son largos y complejos, aumentando el riesgo de que la IA devuelva un output inválido (relacionado con Issue #14).
- **Mantenimiento Difícil:** Mejorar la calidad narrativa requiere editar múltiples archivos de forma inconsistente.

## 3. Arquitectura Propuesta

1.  **Tacticians (Decisión Pura):**
    - `enemyTacticianTool` / `companionTacticianTool` se encargarán **exclusivamente** de la lógica táctica.
    - Su output se limitará a la decisión: `targetId`, `diceRolls`, y un nuevo campo `actionType` (ej: 'ataque con maza', 'lanzar Rayo de Escarcha').
    - **No generarán más narración.**

2.  **Combat Narration Expert (Narración Centralizada):**
    - `combatNarrationExpertTool` se extenderá para manejar **dos tipos de narración**:
        - `intention`: Narra la intención de la acción *antes* de las tiradas de dados (ej: "El goblin se abalanza sobre ti, blandiendo su cimitarra.").
        - `resolution`: Narra el resultado de la acción *después* de las tiradas (funcionalidad actual).
    - Será el único responsable de generar texto narrativo en combate para jugador, compañeros y enemigos.

3.  **Flujo de Turno de IA:**
    1.  `combat-manager` llama al **tactician** correspondiente para obtener la decisión táctica.
    2.  `combat-manager` llama a `combatNarrationExpertTool` con `narrationType: 'intention'` para narrar lo que el PNJ va a hacer.
    3.  El sistema procesa las tiradas de dados (`diceRolls`).
    4.  `combat-manager` llama a `combatNarrationExpertTool` con `narrationType: 'resolution'` para narrar el resultado.

## 4. Fases de Implementación

### Fase 1: Extender `combat-narration-expert` (3-4 horas)

-   [ ] **Modificar `CombatNarrationExpertInputSchema`:**
    -   Añadir `intention` al `narrationType` enum.
    -   Añadir campos opcionales para el contexto de intención: `actionDescription` (ej: "Ataque con Maza"), `weaponName`, `spellName`.
-   [ ] **Actualizar el Prompt:**
    -   Añadir una sección condicional para `narrationType === 'intention'`.
    -   Instruir a la IA para que genere una narración de la acción que *está a punto de ocurrir*, basándose en `attackerName`, `targetName` y `actionDescription`.
-   [ ] **Garantizar Retrocompatibilidad:** Asegurar que las llamadas existentes con `narrationType: 'resolution'` sigan funcionando como hasta ahora.

### Fase 2: Refactorizar `enemyTacticianTool` y `companionTacticianTool` (4-5 horas)

-   [ ] **Modificar Schemas de Output:**
    -   Eliminar el campo `narration` de `EnemyTacticianOutputSchema` y `CompanionTacticianOutputSchema`.
    -   Añadir un campo `actionDescription: string` para describir la acción de forma concisa (ej: "Ataque con Maza", "Lanzar Palabra de Curación").
-   [ ] **Simplificar Prompts:**
    -   Eliminar todas las instrucciones relacionadas con la generación de `narration`.
    -   Reforzar las instrucciones para que se centren únicamente en la decisión táctica y el formato correcto de `diceRolls` y `targetId`.
    -   Añadir la instrucción para rellenar el nuevo campo `actionDescription`.
-   [ ] **Ajustar la Lógica del Tool:**
    -   Modificar el código TypeScript de los tools para que se ajuste a los nuevos schemas de output.

### Fase 3: Integrar el Nuevo Flujo en `combat-manager.ts` (4-6 horas)

-   [ ] **Refactorizar `processAITurn` en `combat-session.ts` (y `first-turn-handler.ts`):**
    1.  Después de recibir la respuesta del tactician (`tacticianResponse`), construir el input para la narración de intención.
    2.  Llamar a `combatNarrationExpertTool` con `narrationType: 'intention'`.
    3.  Añadir la narración de intención a la cola de mensajes.
    4.  Procesar las tiradas de dados como se hace actualmente.
    5.  Después de calcular los resultados (hit/miss, daño), construir el input para la narración de resolución.
    6.  Llamar a `combatNarrationExpertTool` con `narrationType: 'resolution'`.
    7.  Añadir la narración de resolución a la cola de mensajes.
-   [ ] **Gestionar Errores:** Asegurar que si una de las llamadas a `combatNarrationExpertTool` falla, el sistema pueda continuar con una narración de fallback simple.

### Fase 4: Documentación y Limpieza (1-2 horas)

-   [ ] **Actualizar `compendio-prompts-ia.md`:**
    -   Reemplazar los prompts antiguos de los tacticians con las nuevas versiones simplificadas.
    -   Actualizar la sección de `combat-narration-expert` para incluir la nueva funcionalidad de `intention`.
-   [ ] **Revisar Documentación de Arquitectura:** Asegurar que `arquitectura-backend.md` y `flujo-datos.md` reflejen el nuevo flujo de narración centralizado.
-   [ ] **Eliminar Código Obsoleto:** Quitar cualquier lógica o comentario que haya quedado obsoleto tras la refactorización.

## 5. Criterios de Aceptación

-   [ ] Los turnos de los enemigos y compañeros generan dos mensajes de narración: uno de intención (antes de las tiradas) y otro de resolución (después de las tiradas).
-   [ ] El estilo narrativo es consistente para las acciones del jugador, compañeros y enemigos.
-   [ ] Los archivos `enemy-tactician.ts` y `companion-tactician.ts` ya no contienen lógica de generación de `narration`.
-   [ ] Los prompts de los tacticians son notablemente más simples y están enfocados puramente en la táctica.
-   [ ] La documentación (`compendio-prompts-ia.md`) está actualizada con los cambios.
