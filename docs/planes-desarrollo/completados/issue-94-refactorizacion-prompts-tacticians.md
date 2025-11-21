# Plan de Desarrollo: Issue #94 - Refactorización de Prompts de Tacticians

**Última actualización:** 2025-11-21  
**Estado del Progreso:** ✅ **COMPLETADO** | Todas las fases implementadas y probadas

## 1. Visión General

Este plan detalla los pasos para refactorizar los prompts de los _tacticians_ (`enemyTacticianTool` y `companionTacticianTool`), separando la responsabilidad de la **decisión táctica** de la **narración**. El objetivo es centralizar toda la narración de combate en el `combatNarrationExpertTool`, mejorando la consistencia, reduciendo la complejidad de los prompts y disminuyendo la probabilidad de errores de validación.

- **Issue original:** [#94: Refactorización de Prompts de Tacticians - Separación de Narración y Decisión Táctica](../../tracking/issues/corregidos.md#issue-94-refactorización-de-prompts-de-tacticians---separación-de-narración-y-decisión-táctica--resuelto)
- **Estado:** ✅ **COMPLETADO**
- **Estimación original:** 12-16 horas
- **Tiempo invertido:** ~15 horas
- **Fecha de finalización:** 2025-11-21

## 2. Problema Original

- **Responsabilidades Mezcladas:** Los tacticians deciden la acción Y la narran.
- **Inconsistencia Narrativa:** El estilo de narración de la IA (enemigos y compañeros) difiere del `combatNarrationExpertTool` usado para el jugador.
- **Complejidad de Prompts:** Los prompts de los tacticians son largos y complejos, aumentando el riesgo de que la IA devuelva un output inválido (relacionado con Issue #14).
- **Mantenimiento Difícil:** Mejorar la calidad narrativa requiere editar múltiples archivos de forma inconsistente.

## 3. Solución Implementada

### Cambio Arquitectónico Principal

Durante la implementación, se tomó una decisión importante: **eliminar completamente la narración de intención** y hacer que el `combatNarrationExpertTool` genere una **narración completa** que incluya preparación, ejecución y resultado en un solo mensaje. Esto simplifica aún más el flujo y mejora la experiencia del usuario.

1. **Tacticians (Decisión Pura):**
   - `enemyTacticianTool` / `companionTacticianTool` se encargan **exclusivamente** de la lógica táctica.
   - Su output se limita a: `targetId`, `diceRolls`, y `actionDescription` (ej: 'Ataque con cimitarra', 'Lanzar Rayo de Escarcha').
   - **No generan narración.**

2. **Combat Narration Expert (Narración Completa):**
   - `combatNarrationExpertTool` genera **narraciones completas** que incluyen:
     - Preparación/intención del atacante
     - Ejecución del ataque
     - Impacto y reacción del objetivo
     - Resultado final (daño, muerte, etc.)
   - Es el único responsable de generar texto narrativo en combate para jugador, compañeros y enemigos.
   - **Un solo mensaje** por turno de IA (más limpio y fluido).

3. **Flujo de Turno de IA Simplificado:**
   1. `combat-manager` llama al **tactician** correspondiente para obtener la decisión táctica.
   2. El sistema procesa las tiradas de dados (`diceRolls`).
   3. `combat-manager` llama a `combatNarrationExpertTool` con el contexto completo (acción, resultado, daño, muerte) para generar una narración completa.
   4. La narración completa se añade como un único mensaje.

## 4. Fases de Implementación

### Fase 1: Extender `combat-narration-expert` ✅ COMPLETADA

- [x] **Modificar `CombatNarrationExpertInputSchema`:**
  - ✅ Eliminado `narrationType` (ya no hay tipos `intention` vs `resolution`)
  - ✅ `actionDescription` ahora es obligatorio
  - ✅ `attackResult` ahora es obligatorio
  - ✅ Schema simplificado y más claro
- [x] **Actualizar el Prompt:**
  - ✅ Prompt completamente reescrito para generar narraciones completas
  - ✅ Estructura de 3-4 oraciones: Preparación → Ejecución → Impacto → Resultado
  - ✅ Ejemplos mejorados y más descriptivos
  - ✅ Instrucciones explícitas para integrar muerte/inconsciencia en la narración
- [x] **Mejorar Fallbacks:**
  - ✅ Fallbacks descriptivos y completos
  - ✅ Validación mejorada para detectar narraciones genéricas

### Fase 2: Refactorizar `enemyTacticianTool` y `companionTacticianTool` ✅ COMPLETADA

- [x] **Modificar Schemas de Output:**
  - ✅ Ambos usan schemas centralizados de `tactician-schemas.ts`
  - ✅ Eliminado campo `narration` de ambos schemas
  - ✅ `actionDescription` es obligatorio en ambos
- [x] **Simplificar Prompts:**
  - ✅ Eliminadas todas las instrucciones relacionadas con narración
  - ✅ Prompts enfocados únicamente en decisión táctica
  - ✅ Instrucciones claras para rellenar `actionDescription`
- [x] **Ajustar la Lógica del Tool:**
  - ✅ Código actualizado para usar schemas centralizados
  - ✅ Fallbacks actualizados para usar `actionDescription`

### Fase 3: Integrar el Nuevo Flujo ✅ COMPLETADA

- [x] **Refactorizar `processAITurn` en `combat-session.ts`:**
  - ✅ Eliminada generación de narración de intención
  - ✅ `actionDescription` se pasa a `processAICombatantRolls`
  - ✅ `combatNarrationExpertTool` se llama una sola vez después de procesar los dados
  - ✅ Narración completa generada con todo el contexto
- [x] **Refactorizar `first-turn-handler.ts`:**
  - ✅ Eliminada generación de narración de intención
  - ✅ Mismo flujo que turnos normales
- [x] **Actualizar `dice-roll-processor.ts`:**
  - ✅ Acepta `actionDescription` como parámetro
  - ✅ Pasa `actionDescription` al `combatNarrationExpertTool`
  - ✅ Fallbacks mejorados para ser más descriptivos
- [x] **Corregir Bug Crítico:**
  - ✅ Añadido `combatNarrationExpertTool` a `CombatInitContext` para que esté disponible en el primer turno
  - ✅ Corregido problema donde el primer turno usaba fallback en lugar del tool

### Fase 4: Documentación y Limpieza ✅ COMPLETADA

- [x] **Actualizar `compendio-prompts-ia.md`:**
  - ✅ Documentación actualizada con el nuevo flujo
  - ✅ Ejemplos de narraciones completas
- [x] **Eliminar Código Obsoleto:**
  - ✅ Eliminadas todas las referencias a `narration` en los tacticians
  - ✅ Eliminadas referencias a `narrationType: 'intention'`
  - ✅ Código limpio y consistente

## 5. Criterios de Aceptación

- [x] Los turnos de los enemigos y compañeros generan **un solo mensaje** de narración completa
- [x] El estilo narrativo es consistente para las acciones del jugador, compañeros y enemigos
- [x] Los archivos `enemy-tactician.ts` y `companion-tactician.ts` ya no contienen lógica de generación de `narration`
- [x] Los prompts de los tacticians son notablemente más simples y están enfocados puramente en la táctica
- [x] La narración incluye preparación, ejecución, impacto y resultado en un solo mensaje fluido
- [x] El `combatNarrationExpertTool` está disponible desde el primer turno del combate

## 6. Resultados

### Mejoras Logradas

- ✅ **Consistencia Narrativa Total:** Todos los turnos (jugador, compañeros, enemigos) usan el mismo sistema de narración
- ✅ **Prompts Simplificados:** Los tacticians son más simples y enfocados, reduciendo errores de validación
- ✅ **Experiencia Mejorada:** Un solo mensaje narrativo por turno de IA, más limpio y fluido
- ✅ **Mantenibilidad:** Mejoras de narración se aplican centralmente a todos los turnos
- ✅ **Código Más Limpio:** Eliminación de duplicación y código obsoleto

### Archivos Modificados

- `src/ai/tools/combat/tactician-schemas.ts` - Schema simplificado sin `narrationType`
- `src/ai/tools/combat/combat-narration-expert.ts` - Prompt reescrito para narraciones completas
- `src/ai/tools/enemy-tactician.ts` - Prompt simplificado, sin narración
- `src/ai/tools/companion-tactician.ts` - Prompt simplificado, sin narración
- `src/lib/combat/combat-session.ts` - Eliminada narración de intención
- `src/lib/combat/initialization/first-turn-handler.ts` - Eliminada narración de intención
- `src/ai/tools/combat/dice-roll-processor.ts` - Acepta y pasa `actionDescription`
- `src/lib/combat/action-processor.ts` - Actualizado para pasar `actionDescription`
- `src/lib/combat/combat-initializer.ts` - Añadido `combatNarrationExpertTool` al contexto
- `src/lib/combat/initialization/types.ts` - Añadido `combatNarrationExpertTool` al contexto

### Issues Relacionados Resueltos

- ✅ Issue #94 - Refactorización de Prompts de Tacticians (completado)
- ✅ Mejora de consistencia narrativa en combate
- ✅ Reducción de complejidad de prompts (relacionado con Issue #14)

## 7. Notas de Implementación

### Decisión Arquitectónica: Narración Completa vs. Intención + Resolución

Durante la implementación, se decidió eliminar la narración de intención y generar una narración completa en un solo mensaje. Esta decisión fue tomada porque:

1. **Mejor Experiencia de Usuario:** Un solo mensaje es más limpio y fluido en el chat
2. **Menos Llamadas a IA:** Reduce el número de llamadas a la API
3. **Narraciones Más Coherentes:** La IA puede crear una narración más fluida cuando tiene todo el contexto de una vez
4. **Simplificación del Código:** Menos lógica de combinación y sincronización

### Bug Crítico Corregido

Durante las pruebas, se descubrió que el `combatNarrationExpertTool` no estaba disponible en el primer turno del combate, causando que se usara un fallback genérico. Esto se corrigió añadiendo el tool al `CombatInitContext` y pasándolo correctamente a `FirstTurnHandler`.

## 8. Referencias

- [Issue #94 - Refactorización de Prompts de Tacticians](../../tracking/issues/corregidos.md#issue-94-refactorización-de-prompts-de-tacticians---separación-de-narración-y-decisión-táctica--resuelto)
- [CHANGELOG.md](../../../CHANGELOG.md) - Sección [Unreleased] - Issue #94
- [Roadmap - Narración Unificada](../../roadmap.md#7-calidad-y-profundidad-de-la-ia)

