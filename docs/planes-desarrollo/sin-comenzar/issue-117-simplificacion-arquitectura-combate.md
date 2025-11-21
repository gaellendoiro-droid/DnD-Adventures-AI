# Plan de Implementación: Issue #117 - Simplificación de Arquitectura de Combate

**Issue:** #117  
**Prioridad:** 🔴 MUY ALTA  
**Fecha de creación del plan:** 2025-11-20  
**Estado:** 📝 SIN COMENZAR  
**Referencia:** [Issue #117](../../tracking/issues/pendientes.md#issue-117-simplificación-de-arquitectura-de-combate-🔴-crítico)

---

## 🎯 Objetivo

Simplificar la arquitectura del sistema de combate unificando el procesamiento de turnos (jugador e IA) en un flujo único y consolidado. Esto reducirá la complejidad, eliminará duplicación de código, mejorará la consistencia y facilitará el mantenimiento futuro.

---

## 📋 Análisis del Problema

### Problema Actual

El sistema de combate actual tiene una arquitectura excesivamente compleja con múltiples capas de delegación:

1. **Flujo del Jugador:**
   - `game-coordinator.ts` → `combat-manager.ts` → `combat-session.ts` → `processPlayerTurn()` → `action-processor.ts` → `dice-roller.ts` → `rules-engine.ts` → `combat-narration-expert.ts`

2. **Flujo de IA (Enemigos/Compañeros):**
   - `combat-session.ts` → `processAITurn()` → `enemy/companion-tactician.ts` → `combat-narration-expert.ts` (intention) → `dice-roll-processor.ts` → `dice-roller.ts` → `rules-engine.ts` → `combat-narration-expert.ts` (resolution)

3. **Inicialización:**
   - `combat-manager.ts` → `combat-session.ts` → `combat-initializer.ts` → `first-turn-handler.ts` → (flujo de IA duplicado)

### Problemas Identificados

1. **Duplicación de Lógica:**
   - `action-processor.ts` y `dice-roll-processor.ts` hacen esencialmente lo mismo: tirar dados, aplicar daño, generar mensajes
   - Ambos tienen lógica similar para detectar muerte, aplicar daño, generar mensajes técnicos
   - Esto causa inconsistencias (ej: mensaje de muerte duplicado en diferentes lugares)

2. **Complejidad de Flujo:**
   - Demasiados saltos entre módulos (8-9 niveles de profundidad)
   - Difícil de seguir el flujo de ejecución
   - Difícil de depurar cuando algo falla

3. **Módulos Especiales Innecesarios:**
   - `first-turn-handler.ts` maneja el primer turno de forma especial, pero debería ser parte del flujo normal
   - `combat-initializer.ts` podría ser más simple si el flujo de turnos fuera unificado

4. **Inconsistencias:**
   - Jugador e IA usan código diferente para lo mismo
   - Si se arregla un bug en un flujo, puede no estar arreglado en el otro
   - Mensajes de muerte generados en lugares diferentes con lógica diferente

### Beneficios Esperados de la Simplificación

1. **Consistencia Total:** Jugador e IA usan el mismo código de ejecución
2. **Menos Saltos:** Flujo lineal: `Manager` → `TurnProcessor` → `Executor`
3. **Código Más Mantenible:** Menos archivos, menos duplicación
4. **Depuración Más Fácil:** Un solo lugar donde mirar qué pasó en un turno
5. **Menos Bugs:** Un solo lugar para arreglar problemas (ej: mensaje de muerte)

---

## 🏗️ Arquitectura Propuesta

### Nuevo Flujo Simplificado

```
┌─────────────────────────────────────────────────────────────┐
│                    CombatManager (Orquestador)               │
│  - Mantiene estado (CombatSession)                          │
│  - Controla bucle de turnos                                 │
│  - Único punto de entrada                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  TurnProcessor (Unificado)                  │
│  Recibe: combatant, action, target                          │
│  Funciona igual para Jugador y IA                           │
│                                                              │
│  1. Planificación:                                          │
│     - Si IA: Llama Tactician (decide qué hacer)            │
│     - Si Jugador: Usa interpretedAction (ya decidió)        │
│                                                              │
│  2. Narración de Intención:                                 │
│     - Llama NarrationExpert (intention)                    │
│                                                              │
│  3. Ejecución:                                              │
│     - Llama CombatActionExecutor (unificado)               │
│     - Resuelve tiradas (ataque/daño) usando RulesEngine    │
│     - Aplica resultados al estado                           │
│                                                              │
│  4. Narración de Resolución:                                │
│     - Llama NarrationExpert (resolution)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              CombatActionExecutor (Unificado)               │
│  - Procesa tiradas de ataque                                │
│  - Procesa tiradas de daño                                  │
│  - Aplica daño usando RulesEngine                           │
│  - Genera mensajes técnicos (hit/miss, daño)               │
│  - NO genera mensajes de muerte (eso va en narración)       │
└─────────────────────────────────────────────────────────────┘
```

### Módulos a Fusionar/Eliminar

1. **Eliminar `first-turn-handler.ts`:**
   - Su lógica debería ser parte del flujo normal de inicialización + ejecución del primer turno
   - No necesita ser un módulo especial

2. **Fusionar `action-processor.ts` y `dice-roll-processor.ts`:**
   - Ambos hacen lo mismo: tirar dados, aplicar daño, generar mensajes
   - Crear `CombatActionExecutor` unificado

3. **Simplificar `combat-initializer.ts`:**
   - Debería solo configurar el estado inicial
   - Luego ceder control al `CombatManager` para que ejecute el primer turno como cualquier otro

4. **Unificar `processPlayerTurn` y `processAITurn`:**
   - Ambos deberían usar el mismo `TurnProcessor`
   - La única diferencia es la fuente de la decisión (jugador vs IA)

---

## 🛠️ Solución Propuesta

### Estructura de Nuevos Módulos

#### 1. `CombatActionExecutor` (Nuevo - Unificado)

**Responsabilidad:** Ejecutar cualquier acción de combate (ataque, hechizo, etc.) independientemente de quién la ejecute.

**Input:**
```typescript
{
  combatant: Combatant,
  action: {
    type: 'attack' | 'spell' | 'heal',
    targetId: string,
    diceRolls: DiceRollRequest[],
    actionDescription: string
  },
  party: Character[],
  enemies: Enemy[],
  rulesEngine: RulesEngine
}
```

**Output:**
```typescript
{
  success: boolean,
  diceRolls: DiceRoll[],
  updatedParty: Character[],
  updatedEnemies: Enemy[],
  combatResult: {
    attackHit: boolean,
    damageDealt: number,
    targetKilled: boolean,
    targetKnockedOut: boolean,
    // ... otros resultados
  }
}
```

**Flujo Interno:**
1. Procesa tiradas de ataque (si aplica)
2. Compara con AC (si aplica)
3. Procesa tiradas de daño/curación
4. Aplica resultados usando `RulesEngine`
5. Retorna resultados (NO genera mensajes, eso es responsabilidad del `TurnProcessor`)

#### 2. `TurnProcessor` (Nuevo - Unificado)

**Responsabilidad:** Procesar un turno completo (planificación → intención → ejecución → resolución).

**Input:**
```typescript
{
  combatant: Combatant,
  interpretedAction?: InterpretedAction, // Solo para jugador
  locationContext: any,
  conversationHistory: GameMessage[],
  dependencies: {
    tactician?: TacticianTool, // Solo para IA
    narrationExpert: CombatNarrationExpert,
    actionExecutor: CombatActionExecutor,
    rulesEngine: RulesEngine
  }
}
```

**Flujo Interno:**
1. **Planificación:**
   - Si `combatant.controlledBy === 'Player'`: Usa `interpretedAction`
   - Si `combatant.controlledBy === 'AI'`: Llama a `tactician` para obtener decisión

2. **Narración de Intención:**
   - Llama a `narrationExpert` con `narrationType: 'intention'`
   - Añade mensaje de intención

3. **Ejecución:**
   - Llama a `actionExecutor` con la acción planificada
   - Obtiene resultados (diceRolls, updatedParty, updatedEnemies, combatResult)

4. **Narración de Resolución:**
   - Llama a `narrationExpert` con `narrationType: 'resolution'` y `combatResult`
   - Añade mensaje de resolución

5. **Retorna:**
   - Mensajes (intención + resolución)
   - DiceRolls
   - Estado actualizado

#### 3. `CombatInitializer` (Simplificado)

**Responsabilidad:** Solo inicializar el estado del combate (enemigos, iniciativa, orden).

**Flujo:**
1. Valida combatants
2. Obtiene stats de enemigos
3. Genera tiradas de iniciativa
4. Crea `initiativeOrder`
5. Retorna estado inicial
6. **NO procesa turnos** - eso lo hace `CombatManager` usando `TurnProcessor`

---

## 📝 Fases de Implementación

### Fase 1: Crear `CombatActionExecutor` Unificado (6-8 horas)

**Objetivo:** Fusionar la lógica de `action-processor.ts` y `dice-roll-processor.ts` en un solo módulo.

**Tareas:**
1. Crear `src/lib/combat/action-executor.ts`
2. Extraer lógica común de procesamiento de tiradas:
   - Procesamiento de tirada de ataque
   - Comparación con AC
   - Procesamiento de tirada de daño
   - Aplicación de daño usando `RulesEngine`
3. Eliminar generación de mensajes técnicos (hit/miss, daño) - eso será responsabilidad del `TurnProcessor`
4. Eliminar generación de mensajes de muerte - eso irá en la narración de resolución
5. Retornar solo resultados estructurados (combatResult)

**Archivos:**
- Nuevo: `src/lib/combat/action-executor.ts`
- Deprecar: `src/lib/combat/action-processor.ts` (marcar como deprecated)
- Deprecar: `src/ai/tools/combat/dice-roll-processor.ts` (marcar como deprecated)

**Estimación:** 6-8 horas

---

### Fase 2: Crear `TurnProcessor` Unificado (8-10 horas)

**Objetivo:** Crear un procesador de turnos que funcione igual para jugador e IA.

**Tareas:**
1. Crear `src/lib/combat/turn-processor.ts`
2. Implementar lógica de planificación:
   - Si es jugador: usar `interpretedAction`
   - Si es IA: llamar a `tactician` correspondiente
3. Implementar flujo de 4 pasos:
   - Planificación → Intención → Ejecución → Resolución
4. Integrar `CombatActionExecutor` para ejecución
5. Integrar `CombatNarrationExpert` para ambas narraciones
6. Manejar errores y fallbacks

**Archivos:**
- Nuevo: `src/lib/combat/turn-processor.ts`

**Estimación:** 8-10 horas

---

### Fase 3: Simplificar `CombatInitializer` y Eliminar `FirstTurnHandler` (4-6 horas)

**Objetivo:** Simplificar la inicialización y eliminar el manejo especial del primer turno.

**Tareas:**
1. Modificar `combat-initializer.ts`:
   - Eliminar lógica de procesamiento de turnos
   - Solo inicializar estado (enemigos, iniciativa, orden)
   - Retornar estado inicial limpio
2. Eliminar `first-turn-handler.ts`:
   - Su funcionalidad será manejada por `TurnProcessor` normal
3. Modificar `combat-session.ts`:
   - Después de `initialize()`, verificar si el primer combatant es IA
   - Si es IA, llamar a `TurnProcessor` normalmente (no necesita handler especial)

**Archivos:**
- Modificar: `src/lib/combat/combat-initializer.ts`
- Eliminar: `src/lib/combat/initialization/first-turn-handler.ts`
- Modificar: `src/lib/combat/combat-session.ts`

**Estimación:** 4-6 horas

---

### Fase 4: Refactorizar `CombatSession` para Usar `TurnProcessor` (6-8 horas)

**Objetivo:** Reemplazar `processPlayerTurn` y `processAITurn` con llamadas a `TurnProcessor`.

**Tareas:**
1. Modificar `combat-session.ts`:
   - Eliminar `processPlayerTurn()` y `processAITurn()`
   - Crear método `processTurn()` que usa `TurnProcessor`
   - Pasar las dependencias correctas según el tipo de combatant
2. Actualizar `processCurrentTurn()`:
   - Simplificar para solo llamar a `processTurn()`
   - Manejar casos especiales (skip turn, etc.)
3. Actualizar inicialización:
   - Después de `initialize()`, si el primer turno es IA, llamar a `processTurn()` normalmente

**Archivos:**
- Modificar: `src/lib/combat/combat-session.ts`

**Estimación:** 6-8 horas

---

### Fase 5: Actualizar Tests y Limpiar Código Obsoleto (4-6 horas)

**Objetivo:** Actualizar tests para usar la nueva arquitectura y eliminar código obsoleto.

**Tareas:**
1. Actualizar tests existentes:
   - Tests que usan `action-processor.ts` → usar `CombatActionExecutor`
   - Tests que usan `dice-roll-processor.ts` → usar `CombatActionExecutor`
   - Tests que usan `first-turn-handler.ts` → usar flujo normal
2. Crear nuevos tests para `TurnProcessor`:
   - Test de turno de jugador
   - Test de turno de enemigo
   - Test de turno de compañero
   - Test de flujo completo (intención → ejecución → resolución)
3. Eliminar código obsoleto:
   - Eliminar `action-processor.ts` (después de migrar tests)
   - Eliminar `dice-roll-processor.ts` (después de migrar tests)
   - Eliminar `first-turn-handler.ts` (después de migrar tests)
   - Limpiar imports y referencias

**Archivos:**
- Modificar: Todos los archivos de tests relacionados
- Eliminar: `src/lib/combat/action-processor.ts`
- Eliminar: `src/ai/tools/combat/dice-roll-processor.ts`
- Eliminar: `src/lib/combat/initialization/first-turn-handler.ts`

**Estimación:** 4-6 horas

---

### Fase 6: Actualizar Documentación (2-3 horas)

**Objetivo:** Actualizar documentación para reflejar la nueva arquitectura simplificada.

**Tareas:**
1. Actualizar `docs/arquitectura/arquitectura-backend.md`:
   - Documentar nueva arquitectura simplificada
   - Actualizar diagramas de flujo
2. Actualizar `docs/arquitectura/flujo-datos.md`:
   - Actualizar flujo de combate con nueva arquitectura
3. Actualizar `docs/compendio-prompts-ia.md`:
   - Verificar que sigue siendo correcto (no debería cambiar mucho)
4. Actualizar README de tests si existe

**Archivos:**
- Modificar: `docs/arquitectura/arquitectura-backend.md`
- Modificar: `docs/arquitectura/flujo-datos.md`
- Verificar: `docs/compendio-prompts-ia.md`

**Estimación:** 2-3 horas

---

## 📊 Resumen de Estimaciones

| Fase | Descripción | Estimación |
|------|-------------|------------|
| Fase 1 | Crear `CombatActionExecutor` Unificado | 6-8 horas |
| Fase 2 | Crear `TurnProcessor` Unificado | 8-10 horas |
| Fase 3 | Simplificar `CombatInitializer` y Eliminar `FirstTurnHandler` | 4-6 horas |
| Fase 4 | Refactorizar `CombatSession` para Usar `TurnProcessor` | 6-8 horas |
| Fase 5 | Actualizar Tests y Limpiar Código Obsoleto | 4-6 horas |
| Fase 6 | Actualizar Documentación | 2-3 horas |
| **TOTAL** | | **30-41 horas** |

---

## 🔗 Dependencias y Relaciones

### Issues Relacionados

- **Issue #94:** Refactorización de Prompts de Tacticians - Esta simplificación resolverá problemas de consistencia que se identificaron durante la refactorización
- **Issue #82:** Unificar sistema de procesamiento de tiradas de dados - Esta simplificación resolverá este issue completamente
- **Issue #21:** Código duplicado en `combat-manager.ts` - Esta simplificación eliminará la duplicación

### Módulos Relacionados

- `src/lib/combat/rules-engine.ts` - Se mantiene (lógica de reglas pura)
- `src/ai/tools/enemy-tactician.ts` - Se mantiene (solo decisión táctica)
- `src/ai/tools/companion-tactician.ts` - Se mantiene (solo decisión táctica)
- `src/ai/tools/combat/combat-narration-expert.ts` - Se mantiene (narración centralizada)
- `src/ai/tools/dice-roller.ts` - Se mantiene (tiradas de dados)

### Consideraciones

- **Compatibilidad:** Mantener compatibilidad con el sistema actual durante la migración
- **Testing:** Asegurar que todos los tests pasen después de cada fase
- **Rollback:** Mantener código antiguo marcado como deprecated hasta confirmar que todo funciona

---

## ✅ Criterios de Éxito

1. ✅ Jugador e IA usan el mismo código para ejecutar acciones
2. ✅ Flujo simplificado: máximo 3-4 niveles de profundidad (vs 8-9 actuales)
3. ✅ Eliminación de duplicación: `action-processor` y `dice-roll-processor` fusionados
4. ✅ Eliminación de módulos especiales: `first-turn-handler` eliminado
5. ✅ Consistencia total: mensajes de muerte integrados en narración de resolución
6. ✅ Todos los tests pasando
7. ✅ Documentación actualizada

---

## 🚀 Próximos Pasos

1. ✅ Crear este plan
2. ⏳ Revisar y aprobar plan
3. ⏳ Implementar Fase 1 (CombatActionExecutor)
4. ⏳ Implementar Fase 2 (TurnProcessor)
5. ⏳ Implementar Fase 3 (Simplificar Initializer)
6. ⏳ Implementar Fase 4 (Refactorizar CombatSession)
7. ⏳ Implementar Fase 5 (Tests y Limpieza)
8. ⏳ Implementar Fase 6 (Documentación)
9. ⏳ Testing completo del sistema
10. ⏳ Mover issue #117 a resueltos

---

**Última actualización:** 2025-11-20

