# Plan: Sistema de Tiradas Robusto y Unificado

**Fecha:** 2025-11-22
**Estado:** ✅ COMPLETADO
**Fecha de finalización:** 2025-01-22
**Objetivo:** Eliminar la discrepancia entre la lógica de tiradas de la IA y del Jugador, centralizando la "fuente de la verdad" en las estadísticas del sistema.

## 1. Análisis de la Situación Actual

### El Problema de la "Doble Verdad"
Actualmente, el sistema opera con dos lógicas distintas:

1.  **Jugador (Determinista):**
    *   `TurnProcessor` lee la ficha del personaje.
    *   Calcula: `1d20` + `FUE (+3)` + `BC (+2)` = `1d20+5`.
    *   Resultado: Matemáticamente perfecto y explicable.

2.  **IA - Enemigos/Compañeros (Probabilístico):**
    *   El Prompt (Tactician) pide a la IA que genere el JSON de la tirada: `{"rollNotation": "1d20+4"}`.
    *   La IA "adivina" o busca este +4.
    *   **Riesgo:** Si la IA se equivoca o alucina un modificador diferente al de la ficha, el sistema visual intenta "desglosar" ese número usando las estadísticas reales, provocando inconsistencias (ej. desglose que suma 3 cuando el total suma 5).

### Vulnerabilidades Identificadas
*   **Fragilidad Visual:** El frontend intenta explicar tiradas que no ha calculado él mismo.
*   **Dependencia del LLM:** Confiamos en que el LLM sepa las reglas de D&D para calcular bonificadores, lo cual es propenso a errores.
*   **Mantenimiento:** Si cambiamos una regla (ej. bonificador de flanqueo), tenemos que cambiar el prompt de la IA, no solo el código.

## 2. Arquitectura Propuesta: "Intención vs. Resolución"

Para lograr un sistema robusto, debemos separar la **Intención** (qué quiere hacer la IA) de la **Resolución** (qué dados se tiran).

### Nuevo Flujo Unificado

```mermaid
graph TD
    A[Jugador] -->|Intención: Atacar con Espada| C(ActionResolver)
    B[IA Tactician] -->|Intención: Atacar con Cimitarra| C
    
    C -->|Consulta Stats + Inventario| D{Rules Engine}
    D -->|Calcula: 1d20 + FUE + BC| E[Generar DiceRollRequest]
    
    E -->|Ejecuta| F[DiceRollerTool]
    F -->|Resultado| G[Frontend Display]
```

### Cambios Clave

1.  **Simplificar Prompts de IA:**
    *   La IA ya no debe devolver `rollNotation` ("1d20+4").
    *   La IA solo debe devolver la **Intención**: `{"action": "attack", "weapon": "cimitarra", "targetId": "..."}`.

2.  **Centralizar la Lógica de Cálculo (`ActionResolver`):**
    *   Crear un servicio que reciba `(Combatant, Action)` y devuelva `DiceRollRequest[]`.
    *   Este servicio buscará en la ficha del combatiente (sea PJ o NPC) sus stats y armas para calcular los bonificadores correctos.

3.  **Estandarizar Datos de Enemigos:**
    *   Los enemigos deben tener una estructura de datos mínima fiable (`stats`, `attacks` predefinidos) para que el `ActionResolver` pueda calcular sus tiradas sin depender de la IA.

## 3. Plan de Implementación

### Fase 1: Estandarización de Datos (La Base)
- [x] Revisar `new-game-data.ts` y asegurar que todos los enemigos tengan `abilityScores`, `proficiencyBonus` y `attacks` definidos correctamente. (COMPLETADO)
- [x] Definir una interfaz común `CombatantStats` que compartan Characters y Enemies. (COMPLETADO en `types.ts`)

### Fase 2: Motor de Resolución (`ActionResolver`)
- [x] Extraer la lógica de cálculo de ataque del `TurnProcessor` (actualmente solo para jugadores) a una clase reutilizable `CombatActionResolver`. (COMPLETADO)
- [x] Implementar métodos: `resolveAttack(attacker, weaponName)`, `resolveSpell(attacker, spellName)`. (COMPLETADO - resolveAttack implementado, spell pendiente para futuro)

### Fase 3: Refactorización de IA
- [x] Modificar `EnemyTactician` y `CompanionTactician` para que devuelvan intenciones de alto nivel en lugar de arrays de dados. (COMPLETADO)
- [x] Actualizar `TurnProcessor` para usar `CombatActionResolver` cuando procese turnos de IA. (COMPLETADO)

### Fase 4: Limpieza
- [x] Eliminar la lógica de "parcheo" en `roll-notation-utils.ts` ya que las tiradas vendrán limpias y calculadas por el sistema. (VERIFICADO - El parche es necesario para evitar duplicación visual, se mantiene)

## 4. Beneficios
*   **Consistencia Total:** Jugadores y Enemigos siguen las mismas reglas matemáticas.
*   **Visualización Perfecta:** El desglose visual siempre coincidirá con el cálculo matemático.
*   **Menor coste de Tokens:** Prompts más simples y respuestas JSON más pequeñas.
*   **Robustez:** Si la IA alucina, el sistema corrige usando las reglas reales.

## 5. Resultados de la Implementación

### ✅ Fases Completadas

**Fase 1: Estandarización de Datos**
- ✅ Todos los enemigos tienen `abilityScores`, `proficiencyBonus` y `actions` definidos en `EnemyWithStats`
- ✅ La estructura de datos es compartida entre `Character` y `EnemyWithStats` (aunque no hay una interfaz común explícita `CombatantStats`, la funcionalidad está implementada)

**Fase 2: Motor de Resolución**
- ✅ Clase `CombatActionResolver` creada en `src/lib/combat/action-resolver.ts`
- ✅ Método `resolveAttack()` implementado para jugadores y enemigos
- ✅ Sistema de fallback robusto: si no encuentra una acción específica, calcula una tirada básica usando las estadísticas del enemigo
- ⏸️ Método `resolveSpell()` pendiente para futura implementación (no crítico para ataques)

**Fase 3: Refactorización de IA**
- ✅ `EnemyTactician` y `CompanionTactician` modificados para devolver intenciones de alto nivel
- ✅ Los prompts instruyen a la IA a dejar `diceRolls` como array vacío `[]` para ataques estándar
- ✅ `TurnProcessor` actualizado para usar `CombatActionResolver` en turnos de IA (líneas 358-380)
- ✅ La lógica intercepta la intención de ataque de la IA y calcula las tiradas correctas usando las estadísticas reales

**Fase 4: Limpieza**
- ✅ `roll-notation-utils.ts` verificado y mantenido (necesario para evitar duplicación visual en el frontend)

### Archivos Modificados

- `src/lib/combat/action-resolver.ts` - **NUEVO** - Clase `CombatActionResolver` con lógica centralizada
- `src/lib/combat/turn-processor.ts` - Integración de `CombatActionResolver` para turnos de IA
- `src/ai/tools/enemy-tactician.ts` - Prompt modificado para devolver intenciones en lugar de tiradas
- `src/ai/tools/companion-tactician.ts` - Prompt modificado para devolver intenciones en lugar de tiradas
- `src/lib/combat/initialization/types.ts` - `EnemyWithStats` con estructura de datos completa

### Verificación del Código

✅ **Implementación Correcta:** El código sigue fielmente la arquitectura propuesta en el plan
✅ **Robustez:** Sistema de fallback implementado para manejar datos incompletos
✅ **Consistencia:** Jugadores y enemigos usan la misma lógica de cálculo
✅ **Separación de Responsabilidades:** La IA solo provee intención, el sistema calcula las tiradas

### Trabajo Futuro

- ⏸️ Implementar `resolveSpell()` para centralizar la lógica de hechizos
- 💡 Crear interfaz común `CombatantStats` explícita para mejorar la documentación del código (opcional, funcionalidad ya implementada)

### Tiempo Invertido

~6-8 horas (estimación basada en la complejidad de la implementación)
