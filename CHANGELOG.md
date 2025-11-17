# Changelog

**DIRECTIVA DE ALTA PRIORIDAD PARA EL ASISTENTE DE IA:** Al modificar este archivo, DEBES leer primero su contenido completo y asegurarte de que tu operación de escritura sea puramente aditiva a la sección `[Unreleased]`. NUNCA debes borrar, truncar o resumir el historial de versiones existente. La violación de esta directiva se considerará un fallo crítico de funcionamiento.

---

Todas las novedades y cambios importantes de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Nota de procedimiento:** Todos los cambios nuevos deben registrarse en la sección `[Unreleased]`. Cuando se decide versionar, esta sección se renombra con el nuevo número de versión y la fecha. A continuación, se debe crear una nueva sección `[Unreleased]` vacía y actualizar el número de versión correspondiente en el archivo `package.json`.

---

## [Unreleased]

### Added
- **✨ Sistema de Bono de Competencia (Proficiency Bonus) y Modificadores Desglosados en Tiradas:**
  - Agregado campo `proficiencyBonus` al `CharacterSchema` para almacenar el bono de competencia del personaje
  - Todos los personajes iniciales ahora incluyen `proficiencyBonus: 2` (nivel 1)
  - Nuevo tipo `DiceRollModifier` y campo `modifiers` en `DiceRoll` para mostrar modificadores individuales
  - Función helper `updateRollNotationWithModifiers` en `dice-roll-processor.ts` para unificar la actualización de notaciones
  - **Archivos modificados:**
    - `src/lib/schemas.ts` - Agregado `proficiencyBonus` al schema
    - `src/lib/new-game-data.ts` - Agregado `proficiencyBonus: 2` a todos los personajes
    - `src/lib/types.ts` - Agregado `DiceRollModifier` interface y campo `modifiers` a `DiceRoll`
    - `src/ai/tools/combat/dice-roll-processor.ts` - Función `updateRollNotationWithModifiers`
    - `src/components/game/dice-roll-result.tsx` - UI actualizada para mostrar modificadores desglosados
  - **Impacto:** Alto - Las tiradas ahora muestran modificadores individuales (ej: `1d20+3+2` en lugar de `1d20+5`), mejorando la claridad y cumpliendo con las reglas de D&D 5e
  - **Mejora de visualización:** El desglose debajo del resultado total ahora muestra solo la suma de valores finales sin espacios ni etiquetas (ej: `20+3+2` en lugar de `(20) + 3 (DES) + 2 (BC)`)
  - **Consistencia de formato:** El formato compacto ahora se aplica también a enemigos (fallback), mostrando `18+4` en lugar de `(18) + 4` para mantener consistencia visual entre companions y enemigos
  - **Referencia:** Issue #82 en `docs/tracking/issues/pendientes.md`
- **✨ Combat Narration Expert - Narraciones descriptivas para turnos del jugador (Issue #79):**
  - Nuevo tool `combat-narration-expert.ts` para generar narraciones descriptivas e inmersivas de acciones de combate
  - Implementado para turnos del jugador: genera narración de resolución después de procesar ataques
  - Características:
    - Narraciones descriptivas basadas en resultados (acierto, fallo, crítico, pifia)
    - Considera daño causado, estado del objetivo (HP, muerte, KO)
    - Contexto de ubicación opcional
    - Prompt optimizado para español de España
    - Sistema de fallback robusto
    - Retry logic con exponential backoff
  - **Archivos creados:**
    - `src/ai/tools/combat/combat-narration-expert.ts` - Tool especializado para narraciones de combate
  - **Archivos modificados:**
    - `src/ai/tools/combat-manager.ts` - Integración del narration-expert para turnos del jugador
    - `src/components/game/game-view.tsx` - Corrección del nombre del emisor en combate
    - `src/ai/tools/character-lookup.ts` - Corrección: devolver objeto en lugar de null para evitar errores de Genkit
  - **Impacto:** Crítico - Los turnos del jugador ahora tienen narraciones descriptivas, mejorando significativamente la inmersión y consistencia narrativa
  - **Futuro:** El tool está diseñado para ser reutilizado en turnos de IA (refactorización de tacticians)
  - **Referencia:** Issue #79 en `docs/tracking/issues/corregidos.md`, Roadmap - Sección 6

### Fixed
- **🎯 Corrección del Cálculo de Ataque - Inclusión del Bono de Competencia:**
  - **Problema:** Las tiradas de ataque del jugador solo mostraban el modificador de habilidad (FUE/DES) sin incluir el bono de competencia, resultando en valores incorrectos según las reglas de D&D 5e
  - **Ejemplo:** Personaje con FUE +3 y BC +2 mostraba `1d20+3` cuando debería ser `1d20+5`
  - **Solución implementada:** ✅
    - Cálculo de ataque ahora incluye: `Modificador de Habilidad + Bono de Competencia`
    - Cálculo de daño mantiene solo el modificador de habilidad (sin BC, según reglas D&D 5e)
    - Sistema aplicado a jugador, companions y enemigos
  - **Archivos modificados:**
    - `src/ai/tools/combat-manager.ts` - Cálculo corregido para jugador (líneas ~404-442)
    - `src/ai/tools/companion-tactician.ts` - Prompt actualizado con instrucciones claras sobre BC y ejemplos corregidos
    - `src/ai/tools/enemy-tactician.ts` - Prompt actualizado con instrucciones sobre BC y ejemplos corregidos
    - `src/ai/tools/combat/dice-roll-processor.ts` - Uso de función helper para companions
  - **Mejoras adicionales:**
    - Prompts de tacticians ahora incluyen modificadores de habilidad y BC en el contexto
    - Ejemplos actualizados con cálculos explícitos (ej: Merryl con FUE -1, BC +2 = `1d20+1`)
    - Sistema unificado usando función helper `updateRollNotationWithModifiers`
  - **Impacto:** Crítico - Las tiradas de ataque ahora cumplen correctamente con las reglas de D&D 5e
  - **Estado:** ✅ CORREGIDO
  - **Referencia:** Issue #82 en `docs/tracking/issues/pendientes.md`
- **📋 Plan de Mejora de Testabilidad y Refactorización (2025-11-15):**
  - Nuevo plan de desarrollo creado para mejorar la testabilidad del sistema
  - Objetivo: Implementar Inyección de Dependencias (DI) y separar lógica pura de efectos secundarios
  - Componentes principales:
    - DI en funciones críticas (`combatManagerTool`, `processAICombatantRolls`)
    - Separación de lógica pura de efectos secundarios
    - Preparación de UI para tests E2E (data-testid)
  - Prerequisito para el plan de Testing Integración y E2E
  - Estimación: 32-46 horas
  - **Referencia:** `docs/planes-desarrollo/sin-comenzar/mejora-testabilidad-refactorizacion.md`
  - **Nota:** Este plan fue creado después de identificar problemas de acoplamiento que impiden escribir tests de integración robustos
- **✨ Sistema de Turnos Paso a Paso - Pulido y Optimización (2025-11-15):**
  - Indicadores visuales en tracker de iniciativa:
    - Badge "Tu Turno" (azul) cuando es el turno del jugador
    - Badge "Procesando..." (ámbar) durante turnos de IA
  - Animación sutil (pulse) durante procesamiento de turnos
  - Transiciones suaves (transition-all duration-300) para cambios de turno
  - Mejoras de UX en el tracker de iniciativa
  - **Archivos modificados:**
    - `src/components/game/initiative-tracker.tsx` - Añadidos props `isPlayerTurn` e `isProcessing`, badges de estado, animaciones
    - `src/components/game/game-view.tsx` - Lógica para determinar turno del jugador y pasar props al tracker
  - **Estado:** Plan "Sistema de Turnos Paso a Paso en Combate" ahora 100% completado
- **🧪 Sistema de Testing Implementado (2025-11-15, actualizado 2025-11-16):**
  - Configuración completa de Vitest para unit tests y integration tests
  - 145 tests implementados (75 backend + 32 frontend + 38 integration)
  - Tests de integración para sistema de turnos paso a paso:
    - `turn-system.test.ts` (24 tests) - Sincronización de estado, procesamiento de turnos
    - `turn-system-flow.test.ts` (14 tests) - Flujos completos de turnos, wrap-around, fin de combate
  - Tests para módulos críticos:
    - `critical-damage.ts` (39 tests) - Cálculo de daño crítico según reglas D&D 5e (Issue #50) ✨ NUEVO
    - `combat-validators.ts` (26 tests) - Validación de HP, estados de combate, fin de combate
    - `retry-utils.ts` (10 tests) - Lógica de retry con exponential backoff
    - `monster-name-manager.ts` (17 tests) - Generación y normalización de nombres
    - `target-resolver.ts` (9 tests) - Resolución de IDs de objetivos
    - `utils.ts` (6 tests) - Utilidades de frontend
  - Scripts de test añadidos: `npm test`, `npm run test:ui`, `npm run test:run`, `npm run test:coverage`
  - Documentación completa en `docs/testing/README.md` y `docs/testing/guia-rapida.md`
  - Estructura de tests organizada: `tests/unit/backend/` y `tests/unit/frontend/`
  - **Referencia:** Items 10-11 del plan "Sistema de Turnos Paso a Paso en Combate" completados

### Fixed
- **🟡 Issue #49: Resolución incorrecta de targets en combate con enemigos múltiples:**
  - **Problema:** Cuando el jugador especificaba un target con número (ej: "Ataco a Goblin 1"), el sistema a veces interpretaba incorrectamente el target y dirigía el ataque contra un enemigo diferente (ej: Goblin 2).
  - **Causa Raíz:** Los `uniqueId` se generaban con numeración 0-indexed (`goblin-0`, `goblin-1`) mientras que los nombres visuales usaban 1-indexed ("Goblin 1", "Goblin 2"), requiriendo conversión compleja y propensa a errores.
  - **Solución implementada:** ✅ Refactorización arquitectónica - Cambio a numeración 1-indexed en uniqueIds
    - **Cambio principal:** Los `uniqueId` ahora empiezan en 1 (`goblin-1`, `goblin-2`) para coincidir directamente con los nombres visuales
    - **Simplificación:** Eliminada toda la lógica compleja de conversión en `target-resolver.ts` (reducido de ~50 líneas a ~15 líneas)
    - **Beneficios:**
      - Código más simple y mantenible
      - Menos errores: el número del uniqueId coincide directamente con el visual
      - Más intuitivo: `goblin-1` → "Goblin 1" (sin conversión)
  - **Archivos modificados:**
    - `src/ai/tools/combat-manager.ts`: Cambiada generación de uniqueIds para empezar en 1 (línea 923)
    - `src/lib/combat/monster-name-manager.ts`: Simplificado para usar número del uniqueId directamente (línea 52-54)
    - `src/lib/combat/target-resolver.ts`: Eliminada lógica compleja de conversión, ahora mapeo directo (líneas 53-76)
  - **Impacto:** Alto - Los ataques ahora se dirigen correctamente al target especificado, código más simple y robusto
  - **Estado:** ✅ CORREGIDO - Refactorización completa implementada
  - **Referencia:** Issue #49 en `docs/tracking/issues/corregidos.md`
- **🟡 Issue #50: Daño de crítico no se duplica correctamente:**
  - **Problema:** Cuando un jugador o NPC hacía un crítico, el daño no se duplicaba correctamente según las reglas de D&D 5e. El sistema mostraba el mensaje de crítico pero calculaba el daño usando la notación normal de dados sin duplicar los dados.
  - **Regla D&D 5e:** En un crítico, se tiran el doble de dados de daño, pero el modificador se aplica solo una vez. Ejemplo: `1d8+2` normal → `2d8+2` en crítico.
  - **Solución implementada:** ✅ Función auxiliar `getCriticalDamageNotation` para duplicar dados en críticos
    - **Implementación:**
      - Creada función que parsea la notación de dados (ej: "1d8+2"), extrae número de dados, tipo y modificador, duplica los dados en críticos, y retorna la notación ajustada (ej: "2d8+2")
      - En `combat-manager.ts`: Se detecta crítico antes de calcular daño, se ajusta la notación usando `getCriticalDamageNotation`, y se añade "(crítico)" a la descripción del roll
      - En `dice-roll-processor.ts`: Se añade bandera `wasCritical` para rastrear críticos, se verifica si el roll es de daño después de crítico ANTES de ejecutarlo, y se ajusta la notación si es necesario
    - **Cobertura completa:** Afecta a jugadores, enemigos y compañeros
    - **Ejemplo de corrección:**
      - **Antes:** Crítico con 1d8+2 → se tiraba 1d8+2 → daño promedio ~6.5
      - **Ahora:** Crítico con 1d8+2 → se tira 2d8+2 → daño promedio ~11 ✅
  - **Archivos modificados:**
    - `src/ai/tools/combat-manager.ts`: Añadida función `getCriticalDamageNotation` y lógica para jugadores (líneas 45-79, 426-447)
    - `src/ai/tools/combat/dice-roll-processor.ts`: Añadida función `getCriticalDamageNotation` y lógica para NPCs (líneas 21-60, 129, 142-173, 233)
  - **Impacto:** Alto - Los críticos ahora son significativamente más efectivos y cumplen con las reglas oficiales de D&D 5e
  - **Estado:** ✅ CORREGIDO
  - **Referencia:** Issue #50 en `docs/tracking/issues/corregidos.md`
- **🔴 Sistema de Sincronización de Turnos - Solución Definitiva (CRÍTICO):**
  - **Problema:** El sistema de turnos paso a paso tenía múltiples problemas de sincronización entre backend y frontend:
    - El marcador visual del turno (`turnIndex`) se actualizaba prematuramente, mostrando el siguiente turno antes de que el jugador presionara "Pasar 1 Turno"
    - La lógica del frontend era extremadamente compleja e ineficaz, intentando inferir qué turno se había procesado mediante cálculos complejos de índices, búsquedas hacia atrás, y detección de saltos de turnos
    - El backend no proporcionaba información explícita sobre qué turno se había procesado, forzando al frontend a adivinar
    - Múltiples intentos de corrección fallaron debido a la complejidad inherente de la solución
  - **Solución implementada:** ✅ Refactorización completa con campos explícitos en el backend
    - **Backend (`combat-manager.ts`):**
      - Añadidos nuevos campos al schema: `lastProcessedTurnWasAI: boolean` y `lastProcessedTurnIndex: number`
      - Estos campos indican **explícitamente** qué turno se procesó en la última respuesta
      - Actualizados todos los puntos de retorno (10 ubicaciones) para incluir estos campos:
        - Turno de IA procesado → `lastProcessedTurnWasAI: true`, `lastProcessedTurnIndex: <índice del turno procesado>`
        - Turno del jugador procesado → `lastProcessedTurnWasAI: false`, `lastProcessedTurnIndex: <índice del turno procesado>`
        - Turno saltado (muerto/inconsciente) → `lastProcessedTurnWasAI: false`, `lastProcessedTurnIndex: <índice del turno saltado>`
    - **Frontend (`game-view.tsx`):**
      - Eliminada toda la lógica compleja de inferencia (cálculos de índices, búsquedas hacia atrás, detección de saltos)
      - Reemplazada por lógica simple y directa:
        - Si `lastProcessedTurnWasAI === true` → Mostrar `lastProcessedTurnIndex` en el marcador visual, mostrar botón "Pasar 1 Turno"
        - Si `lastProcessedTurnWasAI === false` → Mostrar `result.turnIndex` (turno actual del jugador)
      - Reducción de código: ~150 líneas de lógica compleja → ~20 líneas de lógica simple
  - **Archivos modificados:**
    - `src/ai/tools/combat-manager.ts`: Añadidos campos `lastProcessedTurnWasAI` y `lastProcessedTurnIndex` al schema y todos los puntos de retorno
    - `src/components/game/game-view.tsx`: Simplificada drásticamente la lógica de sincronización de turnos
  - **Impacto:** Crítico - Soluciona definitivamente los problemas de sincronización de turnos que habían persistido a través de múltiples intentos de corrección. El sistema ahora es robusto, simple y eficaz.
  - **Estado:** ✅ RESUELTO - Sistema completamente funcional y probado con combates completos
- **Retry Logic para `narrativeExpertFlow` - Manejo de errores de timeout de conexión:**
  - **Problema:** El `narrativeExpertFlow` no tenía retry logic, causando fallos cuando ocurrían timeouts de conexión a la API de Gemini durante la iniciación de combate o generación de narración.
  - **Solución:** 
    - Extraída función `retryWithExponentialBackoff` a módulo compartido `src/ai/flows/retry-utils.ts` para reutilización
    - Añadido retry logic a `narrativeExpertFlow` con 3 reintentos (4 intentos totales) y backoff exponencial (1s, 2s, 4s)
    - Actualizado `actionInterpreterFlow` para usar el módulo compartido en lugar de función local
  - **Archivos modificados:**
    - `src/ai/flows/retry-utils.ts` (nuevo): Módulo compartido con función de retry reutilizable
    - `src/ai/flows/narrative-expert.ts`: Añadido retry logic alrededor de `narrativeExpertPrompt`
    - `src/ai/flows/action-interpreter.ts`: Refactorizado para usar módulo compartido
  - **Impacto:** Mejora la robustez del sistema ante errores transitorios de red, especialmente durante iniciación de combate. Consistencia en el manejo de errores entre flows.
- **🔴 Retry Logic para `companionTacticianTool` y `enemyTacticianTool` (CRÍTICO):**
  - **Problema:** Los tools que deciden las acciones de la IA en combate (`companionTacticianTool` y `enemyTacticianTool`) no tenían lógica de reintentos. Un `ConnectTimeoutError` con la API de Gemini provocaba que el tool fallase y devolviera una acción por defecto ("no hace nada"), paralizando a todos los NPCs.
  - **Solución:** Se implementó la lógica de reintentos existente en el módulo compartido `retry-utils.ts` en ambos tools.
  - **Archivos modificados:**
    - `src/ai/tools/companion-tactician.ts`: Añadido `retryWithExponentialBackoff`.
    - `src/ai/tools/enemy-tactician.ts`: Añadido `retryWithExponentialBackoff`.
  - **Impacto:** Crítico - Asegura que los errores transitorios de red no impidan que la IA actúe en combate, mejorando significativamente la robustez del sistema.
- **🔴 Issue #54: El combate se detiene si el jugador cae inconsciente (CRÍTICO):**
  - **Problema:** Cuando el personaje del jugador caía inconsciente (HP 0), el combate se detenía completamente, aunque hubiera compañeros de la IA todavía vivos y el combate debería continuar.
  - **Causa Raíz:** En `game-coordinator.ts`, había una lógica que detenía el flujo inmediatamente cuando el jugador estaba inconsciente, sin verificar si había otros miembros del grupo activos. Esto impedía que el `combatManagerTool` procesara el combate correctamente.
  - **Solución implementada:** ✅ Refactorización de lógica de game over
    - **`game-coordinator.ts`:**
      - Modificada la verificación de game over para solo detener el combate si TODOS los miembros del grupo están inconscientes/muertos
      - Si el jugador está inconsciente pero hay compañeros vivos, el flujo continúa normalmente hacia `combatManagerTool`
    - **`combat-manager.ts`:**
      - Añadida detección de jugador inconsciente al inicio de su turno (líneas 107-146)
      - Si el jugador está inconsciente en su turno, se muestra el mensaje automáticamente y se pausa el combate con los botones "Pasar turno"
      - Modificado el bucle de procesamiento de turnos para también procesar turnos del jugador inconsciente (líneas 570-578)
      - Actualizado `hasMoreAITurns` para considerar turnos del jugador inconsciente como turnos que deben procesarse automáticamente (4 ubicaciones)
  - **Comportamiento corregido:**
    - Cuando el jugador cae inconsciente, su turno se procesa mostrando el mensaje "está inconsciente y no puede actuar"
    - El combate se pausa y aparecen los botones "Pasar 1 Turno" / "Pasar Todos"
    - El jugador debe pulsar el botón para avanzar (mantiene consistencia con flujo paso a paso)
    - El combate continúa con los compañeros de la IA, que pueden intentar curar al jugador caído
    - Solo se muestra game over si TODOS los miembros del grupo están inconscientes/muertos
  - **Archivos modificados:**
    - `src/ai/flows/game-coordinator.ts`: Simplificada lógica de game over (líneas 55-74)
    - `src/ai/tools/combat-manager.ts`: Añadida detección y procesamiento de turnos del jugador inconsciente (líneas 107-146, 570-578, y 4 ubicaciones de `hasMoreAITurns`)
  - **Impacto:** Crítico - Permite que el combate continúe cuando el jugador cae, lo cual es esencial para la jugabilidad y las reglas de D&D 5e
  - **Estado:** ✅ RESUELTO
  - **Referencia:** Issue #54 en `docs/tracking/issues/corregidos.md`
- **🟢 Issue #78: Auto-avance se detiene un turno antes del jugador (MEJORA):**
  - **Problema:** Al pulsar "Avanzar Todos" con el jugador ubicado después de varios enemigos, el auto-avance finalizaba mostrando el último turno de IA procesado. El usuario debía pulsar "Pasar 1 Turno" manualmente para recuperar su turno real, rompiendo el flujo automatizado.
  - **Causa raíz:** Cuando `hasMoreAITurns` pasaba a `false`, el frontend deshabilitaba el modo auto-avance sin sincronizar `turnIndex` con el valor más reciente enviado por el backend (`turnIndexRef.current`). También mantenía `justProcessedAITurn=true`, por lo que el botón seguía visible aun cuando ya era turno del jugador.
  - **Solución implementada:** Ahora, al detectar `autoAdvancingRef.current && !result.hasMoreAITurns`, se fuerza el `setTurnIndex(turnIndexRef.current)`, se limpia `justProcessedAITurn`, y se añaden logs/debug para dejar rastro del combatiente que debe actuar.
  - **Archivos modificados:** `src/components/game/game-view.tsx`
  - **Impacto:** Medio - "Avanzar Todos" se detiene exactamente en el turno del jugador sin pasos adicionales, eliminando confusiones y manteniendo la promesa de flujo completamente automático.
  - **Referencia:** Issue #78 en `docs/tracking/issues/corregidos.md`
- **🟡 Issue #51: Mensaje "ha matado" incorrecto cuando personaje ya estaba inconsciente:**
  - **Problema:** Cuando un personaje del grupo (companion o jugador) ya estaba inconsciente (HP 0, `isDead: false`) y recibía daño adicional del jugador, el sistema mostraba "¡ha matado!" incluso cuando el daño no era suficiente para muerte masiva y el personaje podía ser curado después.
  - **Causa Raíz:** En `combat-manager.ts` líneas 513-519 (versión anterior), había código simplificado que siempre mostraba "ha matado" cuando `newHP <= 0`, sin distinguir entre:
    1. Target es enemigo (debe mostrar "ha matado")
    2. Target es companion/jugador que acaba de caer inconsciente (debe mostrar "ha dejado inconsciente")
    3. Target es companion/jugador que YA estaba inconsciente y murió por daño masivo (debe mostrar "ha matado")
    4. Target es companion/jugador que YA estaba inconsciente pero NO murió por daño masivo (NO debe mostrar mensaje de muerte)
  - **Solución implementada:** ✅ Lógica diferenciada de mensajes de muerte/inconsciencia
    - Reemplazado código simplificado con lógica completa que verifica el flag `isDead` y el `previousHP`
    - Para companions/jugadores:
      - Si `targetIsDead === true` → mostrar "ha matado" (muerte masiva)
      - Si `newHP === 0 && previousHP > 0` → mostrar "ha dejado inconsciente" (acaba de caer)
      - Si `newHP === 0 && previousHP === 0 && targetIsDead === false` → NO mostrar mensaje (ya estaba inconsciente, no hubo muerte masiva)
    - Para enemigos: siempre mostrar "ha matado" (no tienen concepto de inconsciencia)
  - **Archivos modificados:**
    - `src/ai/tools/combat-manager.ts`: Reemplazada lógica de mensajes de derrota (líneas 512-548)
  - **Impacto:** Alto - Mensajes narrativos ahora son correctos y consistentes con las reglas de D&D 5e y el estado real del personaje
  - **Estado:** ✅ RESUELTO
  - **Referencia:** Issue #51 en `docs/tracking/issues/corregidos.md`

---

## [0.5.0] - 2025-11-15

### Added
- **Sistema de Turnos Paso a Paso en Combate (✅ COMPLETADO)**
  - **Descripción:** El sistema de combate ahora ejecuta los turnos de IA uno a uno, dando al jugador control total sobre el avance de turnos
  - **Características:**
    - Backend procesa solo 1 turno de IA por llamada (cambio `while` → `if`)
    - Nuevo campo `hasMoreAITurns` en el output del `combatManagerTool`
    - **Botón "Pasar 1 Turno"**: Avanza manualmente un solo turno de IA
    - **Botón "Avanzar Todos"**: Avanza automáticamente todos los turnos de IA con delay de 1.5s entre cada uno
    - Acción especial "continuar turno" para avanzar sin interpretación
    - Experiencia más inmersiva, similar a D&D de mesa con control total del jugador
  - **Archivos modificados:**
    - `src/ai/tools/combat-manager.ts`: Cambio de bucles `while` a `if`, añadido campo `hasMoreAITurns`
    - `src/ai/flows/schemas.ts`: Añadido campo `hasMoreAITurns` al `GameCoordinatorOutputSchema` y `ActionInterpreterOutputSchema`
    - `src/ai/flows/game-coordinator.ts`: Manejo de acción especial "continuar turno"
    - `src/components/game/game-view.tsx`: Estados `hasMoreAITurns` y `autoAdvancing`, lógica de avance, refs para sincronización
    - `src/components/game/chat-panel.tsx`: Botones "Pasar 1 Turno" y "Avanzar Todos"
  - **Estado:** Implementación completa y funcional. Testing exhaustivo y pulido pendientes para futuro.
  - **Referencia:** [Plan Detallado](docs/planes-desarrollo/completados/sistema-turnos-paso-a-paso.md)

### Changed
- **Refactorización de `combat-manager.ts`: Fases 1-2 completadas, Fase 3 pausada**
  - **Decisión:** Pausar la Fase 3 de refactorización para priorizar el sistema de turnos paso a paso (Prioridad Muy Alta)
  - **Resultados alcanzados:**
    - ✅ Reducción de código: 2723 → 1235 líneas (54.6% de reducción)
    - ✅ 5 módulos especializados creados (1310 líneas extraídas)
    - ✅ Issues #21 (código duplicado) y #16 (gestión de nombres) resueltos
    - ✅ 10/10 tests PASS — Sin regresiones
    - ✅ Código duplicado eliminado: ~798 líneas
  - **Justificación:** La Fase 3 no es necesaria para implementar turnos paso a paso. El módulo ya está en mejor estado (54.6% de reducción) y la implementación de turnos paso a paso solo requiere modificar el bucle de turnos existente, no extraer toda la lógica a módulos separados. La Fase 3 se puede retomar en el futuro si se considera necesaria.
  - **Referencia:** [Plan de Refactorización](docs/planes-desarrollo/planes-en-curso/refactorizacion-combat-manager.md)

### Fixed
- **🔴 Issues #35, #36, #37: Corrección de mensajes de inconsciencia/muerte (CRÍTICO)**
  - **Problema:** Los mensajes del sistema no distinguían correctamente entre inconsciencia y muerte, y aparecían en orden incorrecto, confundiendo las reglas de D&D 5e y rompiendo la narrativa del juego.
  - **Issue #35 - Orden incorrecto de mensajes:** El mensaje "X cae inconsciente" aparecía ANTES del mensaje de daño, causando una secuencia ilógica. **Solución:** Reordenado para que el mensaje de inconsciencia aparezca DESPUÉS del mensaje de daño aplicado.
  - **Issue #36 - Mensaje "ha matado" incorrecto:** El sistema mostraba "ha matado" cuando un personaje caía a 0 HP sin muerte masiva (debería ser "ha dejado inconsciente"). **Solución:** Verificación del campo `isDead` para distinguir entre muerte real (`isDead === true`) e inconsciencia (`hp.current <= 0` pero `isDead !== true`).
  - **Issue #37 - Mensaje "está muerto" incorrecto:** El sistema mostraba "está muerto" cuando un personaje inconsciente intentaba tomar su turno. **Solución:** Verificación de `isDead` en la verificación de turnos para distinguir entre muerte e inconsciencia.
  - **Distinción entre personajes del grupo y enemigos:**
    - **Personajes del grupo (jugador y compañeros):** Pueden quedar inconscientes cuando HP llega a 0 sin muerte masiva (`isDead = false`) o morir por muerte masiva (`isDead = true`). Mensajes apropiados según estado.
    - **Enemigos:** Mueren directamente al llegar a HP 0 (no quedan inconscientes). Siempre muestran "está muerto" o "ha matado".
  - **Archivos modificados:**
    - `src/ai/tools/combat/dice-roll-processor.ts`: Reordenado mensajes, verificación de `isDead` para mensajes de muerte/inconsciencia
    - `src/ai/tools/combat-manager.ts`: Verificación de `isDead` en turnos normales e iniciación de combate, distinción entre enemigos y personajes del grupo
  - **Impacto:** Crítico - Mejora drástica de coherencia narrativa, fidelidad a reglas de D&D 5e, y claridad para el jugador sobre el estado de los personajes.
- **Bug de Nombrado de Enemigos en Narración (detectado en Test 2 de refactoring):** El prompt de `enemyTacticianTool` no instruía explícitamente a la AI para usar el nombre exacto del enemigo activo en su narración. Esto causaba que la AI tradujera o inventara nombres incorrectos (e.g., generaba "Gnomo 1" en lugar de "Goblin 1"). Se añadió instrucción explícita en el prompt: "You MUST use EXACTLY the name '{{{activeCombatant}}}' when referring to this creature in your narration. DO NOT translate or change this name."
- **Bug de Sincronización de Estado en Sistema de Turnos Paso a Paso:** Cuando se usaba "Avanzar Todos", el frontend enviaba estados desactualizados al backend porque las actualizaciones de estado de React son asíncronas. Esto causaba que enemigos atacaran a personajes que ya estaban inconscientes. **Solución:** Se implementaron refs (`partyRef`, `locationIdRef`, `inCombatRef`, `messagesRef`, `selectedCharacterRef`) para acceso síncrono a los estados críticos, asegurando que siempre se envíen los valores más recientes al backend, incluso en callbacks asíncronos como `setTimeout`.
- **Bug en Botón "Pasar 1 Turno":** Error de validación de schema porque `ActionInterpreterOutputSchema` no incluía `'continue_turn'` en el enum `actionType`. Se añadió `'continue_turn'` al enum.
- **Bug en Botón "Avanzar Todos":** El botón cambiaba a "Avanzando" pero no procesaba turnos porque `autoAdvancing` se actualizaba asíncronamente. Se implementó `autoAdvancingRef` para acceso síncrono y se corrigió la lógica del `setTimeout`.
- **Bug de Logging:** Se estaba llamando a `logClient.gameEvent()` que no existe. Se reemplazó por `logClient.uiEvent()`.
  - **Archivos modificados:** `src/ai/tools/enemy-tactician.ts`
  - **Impacto:** Crítico (narrativa inconsistente, confundía al jugador)
  - **Testing:** Test 2 (múltiples enemigos) - pendiente de re-test

---

## [0.4.9] - 2025-11-14

### Added
- **Sistema de Inconsciencia y Muerte Masiva (D&D 5e):**
  - **Objetivo:** Distinguir entre personajes inconscientes (HP 0) y muertos (muerte masiva) según reglas oficiales de D&D 5e
  - **Regla implementada:** Muerte instantánea ocurre cuando el daño restante (después de reducir HP a 0) >= HP máximo del personaje
  - **Implementación:**
    - Añadido campo `isDead` a `CharacterSchema` para distinguir muerte real de inconsciencia
    - Lógica de muerte masiva: si `damage - hp.current >= hp.max`, entonces muerte instantánea
    - Personajes inconscientes (HP 0, isDead = false) pueden ser curados y recuperar consciencia
    - Personajes muertos (isDead = true) no pueden ser curados sin magia de revivir
    - Solo aplicable a jugador y compañeros; enemigos mantienen comportamiento actual (HP 0 = derrotado)
  - **Mejoras de narrativa:**
    - Mensajes específicos: "X cae inconsciente" vs "X muere instantáneamente"
    - Narrativa de revivencia: "X recupera la consciencia gracias a la curación recibida"
    - Verificación mejorada fuera de combate: DM informa explícitamente si personaje está muerto o inconsciente
    - Verificación de game over: distingue entre todos inconscientes vs todos muertos
  - **Archivos modificados:**
    - `src/lib/schemas.ts`: Añadido campo `isDead` a CharacterSchema
    - `src/ai/tools/combat-manager.ts`: Lógica de muerte masiva, inconsciencia, revivencia, y función helper `isUnconsciousOrDead`
    - `src/ai/flows/game-coordinator.ts`: Verificaciones expandidas para interacciones con personajes muertos/inconscientes, reacciones de compañeros, y game over
  - **Beneficios:**
    - Mayor fidelidad a D&D 5e
    - Tensión dramática mejorada (diferencia entre inconsciente y muerto)
    - Narrativa más rica y apropiada para cada situación
    - Base sólida para futuro sistema de Death Saving Throws ([plan detallado](docs/planes-desarrollo/sin-comenzar/sistema-death-saving-throws.md))
  - **Relacionado con:** Issue #27 (Verificación de muerte), [Sistema de Death Saving Throws](docs/planes-desarrollo/sin-comenzar/sistema-death-saving-throws.md) (plan futuro)
- **Sistema de reacciones de compañeros en dos momentos (before_dm / after_dm):**
  - **Objetivo:** Simular el comportamiento de jugadores reales que reaccionan tanto a propuestas como a situaciones narradas
  - **Implementación:**
    - **Reacciones ANTES del DM** (`before_dm`): Los compañeros pueden reaccionar a la propuesta del jugador antes de que el DM narre
      - Momento: Jugador → Compañeros (opcional) → DM → Compañeros (opcional)
      - Probabilidad: ~30-40% (selectivo, solo acciones significativas: move, attack, interact)
      - Contexto: Solo la acción propuesta por el jugador
      - Ejemplo: Jugador: "vamos a la cueva oscura" → Elara: "¿Estás seguro? Parece peligroso..."
    - **Reacciones DESPUÉS del DM** (`after_dm`): Los compañeros reaccionan a lo que acaba de ser narrado
      - Momento: Jugador → DM → Compañeros (opcional)
      - Probabilidad: ~50-60% (más común, reacción natural a eventos)
      - Contexto: Acción del jugador + narración completa del DM
      - Ejemplo: DM: "veis un dragón enorme" → Merryl: "¡Por todos los dioses! ¡Es enorme!"
    - **Control de verbosidad:** Los compañeros pueden permanecer en silencio (devolver `action: ""`), implementado mediante prompt engineering
  - **Archivos modificados:**
    - `src/ai/tools/companion-expert.ts`: Añadido campo `reactionTiming` al schema y actualizado prompt con instrucciones específicas para cada momento
    - `src/ai/flows/game-coordinator.ts`: Implementado flujo de reacciones en dos momentos (líneas 166-205 y 236-271)
  - **Beneficios:**
    - Interacciones más naturales y realistas
    - Los compañeros se sienten como otros jugadores en la mesa
    - Permite interrupciones y diálogo antes de la narración
    - Evita saturación mediante control de probabilidad
- **Issue #16 - Gestión de nombres de múltiples monstruos:** Documentado nuevo issue sobre la necesidad de crear un módulo separado para gestionar y unificar nombres de múltiples monstruos del mismo tipo, reutilizable en narraciones del DM, combat manager y narraciones de compañeros.
- **Issue #21 - Código duplicado en `combat-manager.ts` (Deuda Técnica):** Documentado que el procesamiento de dice rolls para AI combatants está duplicado en dos lugares (~260 líneas cada uno): turnos normales (líneas 1241-1500) e iniciación de combate (líneas 2081-2340). Esta duplicación dificulta mantenimiento y causó que el fix del Issue #20 tuviera que aplicarse dos veces. Propuesta: extraer función `processAICombatantRolls` como parte del refactoring mayor de `combat-manager.ts`. Prioridad media, estimación 4-6 horas.
- **Issue #22 - Sistema completo de Saving Throws (Feature Incompleta):** Documentado que los saving throw spells funcionan pero de forma simplificada. El daño se aplica automáticamente sin simular la tirada de salvación del objetivo (1d20+bonus vs Spell Save DC) ni aplicar la regla de mitad de daño si el target acierta. Sistema actual funcional pero no 100% fiel a D&D 5e. Prioridad media, implementar después del refactoring de `combat-manager.ts`. Estimación: 9-12 horas.
- **Análisis del Sistema de HP:** Creado análisis completo del sistema de gestión de HP y fichas de personajes/enemigos identificando problemas críticos que bloquean el funcionamiento del sistema de combate.
  - Documento: `docs/planes-desarrollo/planes-en-curso/combate-turnos-analisis-hp.md`
  - Identifica 5 problemas principales: sincronización frontend-backend, inicialización de HP, validación, estandarización de estructura, y sistema centralizado

### Changed
- **Issue #14 - Mejorado logging para diagnóstico de AI Tacticians:** Añadido logging detallado en `companion-tactician.ts` para diagnosticar por qué el AI a veces devuelve output inválido/null
  - Log de input del prompt (activeCombatant, partySize, enemiesCount)
  - Log de respuesta del AI (hasOutput, outputKeys)
  - Log detallado de errores de validación (errorMessage, errorCode, errorDetails)
  - **Objetivo:** Recopilar datos para entender por qué el AI falla y poder mejorar los prompts en la siguiente fase
  - **Contexto:** Reportado por usuario que Merryl "parece confundido/a y no hace nada en su turno" al iniciar combate vs Mantícora
- **Reducción de verbosidad en logs:** Eliminado listado de todos los `locationIds` del log "Adventure data cache updated" para mejorar legibilidad
  - Antes: `locationIds=["phandalin-plaza-del-pueblo", "camino-a-las-afueras-de-phandalin", ...]` (38 items)
  - Ahora: Solo se muestran `adventureId`, `locationsCount` y `entitiesCount`
- **Reorganización de documentación de issues:** Movido `issues-encontrados.md` de `completados/` a la raíz de `planes-desarrollo/` para mejor organización y acceso.
  - Actualizadas todas las referencias en `combate-turnos.md`, `plan-maestro.md` y `CHANGELOG.md`
- **Actualización del Plan de Combate por Turnos:** Revisado y actualizado el estado real del plan de combate por turnos.
  - Paso 4 marcado como **NO COMPLETADO** (anteriormente marcado como bloqueado)
  - Añadida sección detallada "Lo que falta por hacer para completar el Paso 4" con 9 tareas organizadas en 4 fases
  - Identificado bloqueador crítico: sistema de gestión de HP no funcional
  - Estado actualizado: 3 de 5 pasos completamente funcionales (60%), 1 no completado, 1 completado
- **Issue #16 refinado:** Actualizado el Issue #16 para reflejar mejor la propuesta específica de gestión de nombres de múltiples monstruos (no post-procesamiento general de narraciones).
- **Mejora del `actionInterpreter`:** Mejorado el prompt del `actionInterpreter` para ser más conservador al asignar `targetId` cuando el jugador no especifica un objetivo explícito (ej: "atacamos!" vs "ataco al goblin").
  - El `targetId` ahora se entiende como el objetivo inicial, no el único enemigo que participará en el combate
- **Mejora del `combatInitiationExpertTool`:** Mejorado el prompt para que la IA entienda claramente que el `Direct Target ID` es solo el objetivo inicial mencionado por el jugador, y que todos los enemigos hostiles presentes en la ubicación deben participar en el combate.

### Fixed
- **🔴 CRÍTICO: Sistema completo de verificación de muerte de personajes (Issue #27):**
  - **Problema:** Enemigos y compañeros muertos podían participar en nuevos combates, tomar turnos y actuar como si estuvieran vivos. El jugador muerto podía seguir actuando. No había detección de "game over".
  - **Causa raíz múltiple:**
    1. `combat-manager.ts` no verificaba HP al crear orden de iniciativa
    2. `combatInitiationExpertTool` incluía enemigos muertos en nuevos combates
    3. `actionInterpreter` permitía atacar enemigos muertos
    4. No había verificación de muerte del jugador
    5. Faltaba detección de "game over" cuando todo el grupo muere
  - **Solución implementada en 6 fases:**
    - **Fase 1 (`combat-manager.ts` líneas 1729-1754):** Filtrar combatientes muertos al crear `combatantData` en iniciación de combate
    - **Fase 2 (`combat-initiation-expert.ts` líneas 68-85):** Añadido `updatedEnemies` al schema, filtrar enemigos muertos antes de pasar a IA
    - **Fase 3 (`action-interpreter.ts` líneas 180-215):** Añadido `updatedEnemies` al schema, filtrar enemigos muertos en fallback de ataques
    - **Fase 4 (`game-coordinator.ts` líneas 55-83):** Verificación de muerte del jugador y detección de "game over"
    - **Fase 5 (`game-coordinator.ts` líneas 123, 158):** Pasar `updatedEnemies` a `actionInterpreter` y `combatInitiationExpertTool`
    - **Fase 6 (`combat-manager.ts` líneas 2029-2049):** Verificación de muerte en iniciación de combate (similar a turnos normales)
  - **Principio de diseño:** Los cadáveres permanecen en `locationContext.entitiesPresent` como objetos narrativos interactuables, pero se filtran para combate
  - **Resultados:**
    - ✅ Enemigos muertos no inician nuevos combates
    - ✅ Compañeros muertos no toman turnos en combate
    - ✅ Jugador muerto no puede actuar (mensaje apropiado)
    - ✅ Detección de "game over" cuando todo el grupo muere
    - ✅ Cadáveres permanecen en el mundo para narrativa/interacción
    - ✅ Sistema robusto con múltiples capas de verificación
  - **Archivos modificados:**
    - `src/ai/tools/combat-manager.ts` (líneas 1729-1754, 2029-2049)
    - `src/ai/tools/combat-initiation-expert.ts` (líneas 26-85, prompt actualizado)
    - `src/ai/flows/action-interpreter.ts` (líneas 180-215)
    - `src/ai/flows/game-coordinator.ts` (líneas 55-83, 123, 158)
    - `src/ai/flows/schemas.ts` (línea 15 - añadido `updatedEnemies`)
- **🔴 CRÍTICO: Compañeros muertos seguían reaccionando después de combate (Issue #26):**
  - **Problema:** Después de un combate, si un compañero había muerto, el sistema seguía generando reacciones para ese compañero como si estuviera vivo, rompiendo completamente la inmersión y la lógica del juego
  - **Causa raíz:** El sistema de reacciones de compañeros no verificaba el estado de vida (`hp.current > 0`) antes de generar reacciones
  - **Solución:** 
    - **Filtrado en `game-coordinator.ts`:** Añadida verificación `character.hp.current > 0` en ambos lugares donde se generan reacciones (líneas 178 y 243: `before_dm` y `after_dm`)
    - **Validación defensiva en `companion-expert.ts`:** Añadida verificación adicional después de obtener los datos del personaje (líneas 102-111) como capa de protección extra
  - **Resultados:**
    - ✅ Compañeros muertos ya no reaccionan en ningún momento
    - ✅ Doble protección: filtrado principal + validación defensiva
    - ✅ Mejora drástica de inmersión y coherencia del juego
    - ✅ Logging mejorado para debugging
  - **Archivos modificados:**
    - `src/ai/flows/game-coordinator.ts` (líneas 178 y 243)
    - `src/ai/tools/companion-expert.ts` (líneas 102-111)
- **🔴 CRÍTICO: Helper `eq` no disponible en Handlebars bloqueaba todas las reacciones de compañeros:**
  - **Problema:** El prompt de `companion-expert.ts` usaba `{{#if (eq reactionTiming "before_dm")}}` para comparar strings, pero Genkit usa Handlebars con `knownHelpersOnly: true`, que no incluye el helper `eq`
  - **Síntoma:** Error `"You specified knownHelpersOnly, but used the unknown helper eq - 15:10"` en terminal, ningún compañero reaccionaba a ninguna acción
  - **Causa raíz:** Uso de sintaxis de Handlebars no soportada en Genkit
  - **Solución:** Reemplazado el parámetro `reactionTiming` (string) con dos variables booleanas `isBeforeDm` e `isAfterDm` en el schema del prompt (líneas 32-33)
  - **Cambios técnicos:**
    ```typescript
    // ANTES (líneas 29-33 - NO FUNCIONABA):
    input: {schema: z.object({
        character: CharacterSchema,
        context: z.string(),
        reactionTiming: z.string().optional(), // ❌ Requería helper 'eq' para comparar
    })}
    
    // AHORA (líneas 29-34 - FUNCIONA):
    input: {schema: z.object({
        character: CharacterSchema,
        context: z.string(),
        isBeforeDm: z.boolean().optional(), // ✅ Directo en template
        isAfterDm: z.boolean().optional(),   // ✅ Directo en template
    })}
    ```
    ```handlebars
    <!-- ANTES (líneas 49 y 56 - NO FUNCIONABA): -->
    {{#if (eq reactionTiming "before_dm")}} ❌ Helper 'eq' no existe
    {{#if (eq reactionTiming "after_dm")}}  ❌ Helper 'eq' no existe
    
    <!-- AHORA (líneas 48 y 56 - FUNCIONA): -->
    {{#if isBeforeDm}} ✅ Variable booleana directa
    {{#if isAfterDm}}  ✅ Variable booleana directa
    ```
  - **Llamada al prompt actualizada** (líneas 109-114):
    ```typescript
    // ANTES:
    await reactionGenerationPrompt({
        character: characterData,
        context: context,
        reactionTiming: input.reactionTiming || 'after_dm',
    });
    
    // AHORA:
    await reactionGenerationPrompt({
        character: characterData,
        context: context,
        isBeforeDm: input.reactionTiming === 'before_dm',
        isAfterDm: input.reactionTiming === 'after_dm' || !input.reactionTiming,
    });
    ```
  - **Archivos modificados:**
    - `src/ai/tools/companion-expert.ts` (líneas 27-77, 109-114)
  - **Impacto:**
    - ✅ **Sistema de reacciones de compañeros vuelve a funcionar completamente**
    - ✅ Reacciones `before_dm` (antes de la narración del DM) funcionan
    - ✅ Reacciones `after_dm` (después de la narración del DM) funcionan
    - ✅ No más errores de Handlebars en la terminal
- **Tipo restrictivo en `log.gameCoordinator` causaba 13 errores de TypeScript:**
  - **Problema:** El tipo de `log.gameCoordinator` solo aceptaba `action`, `inCombat` y `turnIndex`, pero el código pasaba propiedades adicionales como `locationId`, `actionType`, `partySize`, `character`, etc.
  - **Solución:** Añadido `[key: string]: any` al tipo de datos en `src/lib/logger.ts` (líneas 119 y 168-169), igual que `serverAction`, `aiTool` y `aiFlow`
  - **Impacto:** Eliminados todos los errores de linter sin cambiar la funcionalidad
- **Orden incorrecto de reacciones de compañeros en acciones de movimiento:**
  - **Problema:** Cuando el jugador se movía a una nueva ubicación, las reacciones de los compañeros eran ilógicas. El DM narraba la llegada al lugar (ej: "veis un monstruo atacando"), pero los compañeros luego preguntaban "¿Por qué vamos allí?" como si aún no hubieran llegado
  - **Causa raíz:** Las reacciones de los compañeros solo recibían la acción original del jugador como contexto (`"vamos a la colina del resentimiento"`), no la narración del DM que acababa de ocurrir
  - **Solución:** Modificado `game-coordinator.ts` (líneas 203-206) para incluir la narración del DM en el contexto de las reacciones de los compañeros
  - **Antes:** 
    1. Jugador: "vamos a la colina"
    2. DM: "Ya habéis llegado, veis un monstruo..."
    3. Compañeros: "¿Por qué vamos allí?" ❌ (sin contexto de la narración)
  - **Ahora:**
    1. Jugador: "vamos a la colina"
    2. DM: "Ya habéis llegado, veis un monstruo..."
    3. Compañeros: "¡Cuidado con ese monstruo!" / "Parece peligroso..." ✅ (reaccionando a la situación narrada)
  - **Impacto:** Mejora la coherencia narrativa y la inmersión, las reacciones de los compañeros ahora tienen sentido contextual
- **Issue #23 - Selección automática de objetivo único y manejo de acciones ambiguas:** ✅ RESUELTO COMPLETAMENTE
  - **Parte 1 (Selección automática de objetivo único):** Implementado auto-selección del único enemigo vivo cuando el jugador ataca sin especificar objetivo
    - Antes: "ataco con mi mandoble" (1 enemigo) → "No puedes encontrar ese objetivo" → turno saltado ❌
    - Ahora: "ataco con mi mandoble" (1 enemigo) → Auto-selección → Ataque procesado correctamente ✅
    - El DM añade un mensaje aclaratorio: "Galador ataca a Goblin 1."
  - **Parte 2 (Petición de aclaración con múltiples enemigos):** Implementado sistema de petición de aclaración cuando no hay objetivo específico
    - Antes: "ataco" (múltiples combatientes) → Fallo → Turno saltado ❌
    - Ahora: "ataco" (múltiples combatientes) → "No has especificado un objetivo. ¿A quién o qué quieres atacar?" → Turno NO avanza, espera respuesta del jugador ✅
    - **Diseño abierto:** El mensaje no lista enemigos específicos para no restringir las opciones del jugador (puede atacar enemigos, compañeros, PNJs, objetos, etc.)
  - **Parte 3 (Resolución de nombres con acentos - BUG FIX):** Corregido bug donde el `actionInterpreter` devolvía nombres sin acentos (ej: "manticora") pero el JSON de aventura tiene nombres con acentos (ej: "Mantícora"), causando que el target no se encontrara
    - **Problema:** `resolveEnemyId` comparaba strings directamente (`"mantícora" === "manticora"` → false)
    - **Solución:** Usar `normalizeNameForMatching` (que ya existía) para normalizar nombres antes de comparar, quitando acentos de ambos lados
    - **Antes:** "ataco" → actionInterpreter devuelve `targetId="manticora"` → "No puedes encontrar ese objetivo" → turno saltado ❌
    - **Ahora:** "ataco" → actionInterpreter devuelve `targetId="manticora"` → Sistema normaliza y encuentra "Mantícora" → Ataque procesado ✅
    - Modificado: `src/ai/tools/combat-manager.ts` función `resolveEnemyId` (líneas 595-616)
  - **Impacto:** Mejora drástica de UX en combate, elimina turnos perdidos injustamente, comportamiento más inteligente del DM, funciona correctamente con nombres que tienen acentos
- **Referencias rotas:** Corregidas todas las referencias a `issues-encontrados.md` después de moverlo a la raíz de `planes-desarrollo/`.
- **Issue #17 - IA no incluye todos los enemigos hostiles en el combate:** ✅ RESUELTO
  - Mejorados los prompts de `actionInterpreter` y `combatInitiationExpertTool` para que la IA entienda que debe incluir todos los enemigos hostiles presentes en la ubicación, independientemente del `targetId` específico
  - La IA ahora incluye correctamente todos los enemigos hostiles (ej: 2 goblins + 1 orco) cuando se inicia combate con órdenes genéricas ("atacamos!") o específicas ("atacamos a los goblins!")
- **Generación incorrecta de `uniqueId` para enemigos:** Corregida la lógica de generación de `uniqueId` en `combat-manager.ts` para que agrupe enemigos por nombre base y los numere dentro de cada grupo, en lugar de usar el índice del array completo.
  - **Antes:** `orco-1` (index 2) → `orco-2` ❌
  - **Ahora:** `orco-1` → `orco-0` ✅ (primer orco en el grupo "orco")
  - Esto asegura que los `uniqueId` sean consistentes: `goblin-0`, `goblin-1`, `orco-0` en lugar de `goblin-0`, `goblin-1`, `orco-2`
- **Issue #19 - 🔴 Turno del jugador no procesa tiradas de dados ni narración del DM (CRÍTICO):** ✅ RESUELTO
  - Implementado procesamiento completo del turno del jugador en `combat-manager.ts` (líneas 738-1005)
  - **Generación de tiradas de dados:** El sistema ahora genera automáticamente attack roll (`1d20+modificador`) y damage roll (`1d8+modificador` si acierta) usando los modificadores de habilidad del jugador
  - **Narración del DM:** Se generan mensajes del DM para acierto/fallo, daño aplicado con cambios de HP, críticos, pifias, y derrota de enemigos
  - **Aplicación de daño:** El daño se aplica correctamente al enemigo objetivo, actualizando HP con validación (`validateAndClampHP`)
  - **Panel de tiradas:** Las tiradas del jugador ahora incluyen toda la información de combate (`targetName`, `targetAC`, `attackHit`, `damageDealt`) y se muestran correctamente en el panel de tiradas
  - **Nota:** El dado de daño por defecto es `1d8`. TODO: Leer del arma equipada del personaje en el futuro
  - **Impacto:** Los jugadores ahora pueden atacar efectivamente en combate. Este era un bloqueador crítico del gameplay.
- **Issue #13 - 🔴 Connect Timeout Error al iniciar combate (CRÍTICO):** ✅ RESUELTO
  - Implementado retry logic con exponential backoff + fallback inteligente en `action-interpreter.ts`
  - **Retry Logic:** Función `retryWithExponentialBackoff` que reintenta hasta 3 veces (4 intentos totales) con delays de 1s, 2s, 4s
  - **Fallback Inteligente:** Si todos los reintentos fallan, análisis por palabras clave detecta acciones de ataque ('ataco', 'atacar', 'atacamos', etc.) y extrae el objetivo del contexto
  - **Impacto:** Reduce significativamente los fallos de API, permite jugar incluso cuando hay problemas de red, experiencia más confiable
- **Issue #18 - IA Táctica ataca a personajes ya derrotados (HP <= 0):** ✅ RESUELTO
  - Modificado `combat-manager.ts` para filtrar personajes muertos antes de pasarlos a los AI tacticians
  - **Filtrado implementado** en dos lugares: turno normal (líneas 1026-1049) e iniciación de combate (líneas 1838-1861)
  - Los arrays `aliveParty` y `aliveEnemies` solo incluyen personajes con HP > 0
  - **Impacto:** Los enemigos y aliados ya no atacan a personajes derrotados, mejorando realismo y lógica del combate
- **Mejora de mensajes de derrota en combate:**
  - Modificado `combat-manager.ts` para incluir el nombre del atacante en mensajes de muerte
  - **Antes:** "¡Merryl ha sido derrotado!" → **Ahora:** "¡Goblin 1 ha matado a Merryl!"
  - Aplicado tanto para turnos de jugador como de IA (líneas 952-956 y después de aplicar daño)
  - **Impacto:** Narración más clara y dramática cuando un personaje cae en combate
- **Mejora de resolución de targetId en combate:**
  - Mejorada función `resolveEnemyId` en `combat-manager.ts` (líneas 570-592)
  - **Problema:** El `actionInterpreter` devolvía IDs como `goblin-2` pero el sistema usa `uniqueId` como `goblin-0`, `goblin-1`
  - **Solución:** Cuando recibe un ID con formato `nombre-número` que no existe, lo convierte a nombre visual y busca en initiativeOrder
  - **Ejemplo:** `goblin-2` → "Goblin 2" → encuentra `uniqueId: goblin-1`
  - **Impacto:** El turno del jugador ahora procesa correctamente ataques a enemigos específicos sin error "No puedes encontrar ese objetivo"
- **Sistema de mensajes de muerte y curación en panel de Tiradas:**
  - **Problema 1:** Los mensajes de muerte solo aparecían en el chat del DM, no en el panel de Tiradas
  - **Problema 2:** Las tiradas de curación no mostraban información del objetivo ni cantidad curada
  - **Problema 3:** Combatientes muertos seguían actuando en su turno
  - **Solución implementada:**
    - Añadidos campos `targetKilled` y `healingAmount` a interfaz `DiceRoll` en `types.ts`
    - Modificado `combat-manager.ts` para:
      - Skipear turnos de combatientes con HP ≤ 0 y mostrar mensaje "X está muerto y no puede actuar"
      - Poblar `targetKilled: true` en damage rolls cuando HP del objetivo llega a 0
      - Poblar `healingAmount` y `targetName` en healing rolls
    - Modificado `dice-roll-result.tsx` para mostrar:
      - "💀 ¡X ha matado a Y!" debajo de las tiradas de daño letales
      - "X ha curado N puntos de vida a Y" en tiradas de curación
  - **Impacto:** Panel de Tiradas ahora muestra claramente muertes y curaciones, mejorando feedback visual y realismo del combate
- **Soporte para hechizos con tiradas de salvación (Saving Throw Spells) - MEJORADO CON METADATA EXPLÍCITA:**
  - **Problema original:** Hechizos como Sacred Flame (Llama Sagrada) que usan tirada de salvación del objetivo en lugar de tirada de ataque del lanzador no funcionaban correctamente. El sistema rechazaba el damage roll porque no había un attack roll previo
  - **Solución inicial (keywords):** Detección por palabras clave como "radiante", "sacred", "salvación" - FRÁGIL y no escalable
  - **Solución definitiva (metadata explícita):**
    - **Schemas actualizados** en `companion-tactician.ts` y `enemy-tactician.ts`:
      - Agregado campo `attackType` en el schema de `diceRolls`: `z.enum(['attack_roll', 'saving_throw', 'healing', 'other'])`
      - Los AI tacticians ahora especifican explícitamente el tipo de cada roll
      - **Ventaja:** No requiere parsing de strings ni mantenimiento de listas de keywords
    - **Prompts mejorados:**
      - Instrucciones claras sobre cuándo usar cada `attackType`
      - Ejemplos actualizados con el campo `attackType` incluido
      - **TYPE 1:** `attackType: "attack_roll"` para armas/hechizos que requieren 1d20 para acertar
      - **TYPE 2:** `attackType: "saving_throw"` para hechizos donde el objetivo tira salvación
      - **TYPE 3:** `attackType: "healing"` para hechizos de curación
    - **`combat-manager.ts` actualizado** (líneas 1248-1267, 1372-1409):
      - Lee `attackType` del rollData proporcionado por los tacticians
      - Fallback a detección por keywords para retrocompatibilidad
      - Log mejorado que muestra el `attackType` recibido
      - Validación robusta basada en metadata explícita en lugar de string parsing
    - **`dice-roll-result.tsx`** (líneas 46-57, 129-138):
      - Detecta saving throw spells automáticamente
      - Muestra mensaje específico: "X sufre N puntos de daño radiante (hechizo de salvación)"
  - **Impacto:** 
    - Sistema robusto y mantenible que no requiere añadir keywords para cada nuevo hechizo
    - Los AI tacticians ya consultan `dndApiLookupTool`, por lo que conocen el tipo de hechizo
    - Explícito > implícito: menos errores, más fácil de debuggear
    - Hechizos como Sacred Flame, Fireball funcionan correctamente
    - Escalable a futuras mecánicas de D&D 5e sin cambios de código
- **Resaltado visual de críticos y pifias en panel de Tiradas:**
  - **Objetivo:** Hacer que los críticos y pifias sean visualmente impactantes y fáciles de identificar
  - **Implementación en `dice-roll-result.tsx`:**
    - **Críticos:** 
      - Borde dorado grueso (`border-4 border-yellow-400`)
      - Fondo con gradiente dorado-verde brillante
      - Sombra dorada (`shadow-lg shadow-yellow-500/50`)
      - Animación de pulso (`animate-pulse`)
      - Etiqueta "⭐ ¡CRÍTICO!" en texto grande con glow effect
      - Número del resultado con brillo dorado
    - **Pifias:**
      - Borde rojo intenso grueso (`border-4 border-red-600`)
      - Fondo con gradiente rojo oscuro
      - Sombra roja (`shadow-lg shadow-red-600/50`)
      - Etiqueta "☠️ ¡PIFIA!" en texto grande con glow effect
      - Número del resultado con brillo rojo
  - **Impacto:** Los momentos épicos (críticos) y desastrosos (pifias) ahora destacan dramáticamente en el panel de Tiradas, mejorando la emoción del combate

---

## [0.4.8] - 2025-11-12

### Added
- **Sistema de Logging Centralizado:** Implementado un sistema de logging estructurado que centraliza todos los logs importantes (INFO, WARN, ERROR) del cliente en la terminal del servidor, proporcionando un único punto de información para depuración y seguimiento.
  - Creado endpoint `/api/log` para recibir logs del cliente
  - Modificado `logger-client.ts` para enviar automáticamente logs al servidor
  - Los logs del cliente ahora aparecen en la terminal del servidor con formato estructurado
  - Documentación completa del sistema en `docs/arquitectura/sistema-logging.md`
- **Plan de Saneamiento General:** Completada revisión sistemática de la aplicación identificando y corrigiendo 12 issues (10 corregidos, 3 mejoras opcionales documentadas).
  - Documentación completa de todos los issues encontrados en `docs/planes-desarrollo/issues-encontrados.md`
  - Plan de saneamiento documentado en `docs/planes-desarrollo/completados/saneamiento-general.md`

### Changed
- **Mejora del Sistema de Logging:** El logger del cliente ahora envía automáticamente logs INFO, WARN y ERROR al servidor para centralización. Los logs DEBUG solo aparecen en la consola del navegador para evitar spam.
- **Organización de Planes de Desarrollo:** Reorganizada la estructura de documentación de planes de desarrollo con carpetas separadas para planes en curso, completados y sin comenzar.
  - Actualizado `plan-maestro.md` con mejor separación visual entre tipos de planes
  - Plan de saneamiento movido a carpeta `completados/`

### Fixed
- **Campos de formulario sin atributos:** Añadidos atributos `id` y `name` a todos los campos de formulario (`input` y `textarea`) para cumplir con estándares de accesibilidad y eliminar warnings del navegador.
- **Dependencia incorrecta en useEffect:** Corregida dependencia incorrecta `[audioRef]` en `chat-message.tsx`, cambiada a `[]` ya que los refs no deben estar en las dependencias de `useEffect`.
- **Archivo duplicado:** Eliminado archivo duplicado `src/app/game-view.tsx` que no se estaba usando y causaba confusión.
- **Validación de datos:** Añadida validación con esquemas Zod en `handleNewGame`, `handleLoadAdventure` y `handleLoadGame` para prevenir errores con datos mal formados.
- **Inconsistencia de tipos:** Corregida inconsistencia de tipos en `actions.ts` donde `processPlayerAction` esperaba `GameCoordinatorInput` pero `gameCoordinator` espera `GameState`.
- **ConversationHistory incorrecto:** Corregido `conversationHistory` de string vacío a array vacío en `handleLoadAdventure` para mantener consistencia con el esquema.
- **Estados de combate no sincronizados:** Implementada lógica para limpiar `initiativeOrder`, `turnIndex` y `enemies` cuando `inCombat` se establece en `false`.
- **Enemigos no inicializados:** Corregida inicialización de `enemies` desde `initialData` en `game-view.tsx` y `page.tsx`.

### Security
- **Sanitización de HTML:** Implementada sanitización de HTML con DOMPurify antes de renderizar contenido generado por la IA usando `dangerouslySetInnerHTML`. Esto previene posibles ataques XSS si la IA genera HTML malicioso. Solo se permiten tags y atributos seguros para contenido de markdown.

### Docs
- **Documentación de Saneamiento:** Creada documentación completa del proceso de saneamiento general con 7 secciones revisadas (Frontend, Backend, Integración, Logs, Flujos Críticos, Rendimiento, Validación y Seguridad).
- **Plan Maestro de Desarrollo:** Mejorada la estructura visual del plan maestro con mejor separación entre tipos de planes y contadores de estado.

---

## [0.4.70] - 2024-07-29

### Added
- **Sistema de Logging Táctico:** Se ha añadido un campo `debugLog` a los outputs de las herramientas `companionTacticianTool` y `enemyTacticianTool` para capturar el `input` exacto que reciben y facilitar la depuración de su lógica de decisión.
- **Plan de Desarrollo del Sistema de Combate:** Se ha creado un nuevo documento (`docs/planes-desarrollo/combate-turnos.md`) con una hoja de ruta detallada para la implementación del bucle de turnos de combate.
- **Esqueleto del Bucle de Turnos de Combate:** Se ha implementado la estructura lógica (`while` loop) en el `combatManagerTool` que procesa los turnos de los PNJ controlados por la IA hasta ceder el control al jugador.

### Changed
- **Sincronización de la UI de Combate:** El panel "Orden de Combate" ahora resalta visualmente al combatiente cuyo turno está activo, gracias a la integración del `turnIndex` en el flujo de datos del frontend.
- **Refactorización de la Arquitectura de Esquemas:** Se ha llevado a cabo una refactorización integral de la gestión de tipos y esquemas de datos para mejorar la robustez y facilitar la depuración.
    - **Fuente Única de Verdad:** Se han eliminado las definiciones de tipos duplicadas en `src/lib/types.ts`. Ahora, todos los tipos se infieren directamente de los esquemas de Zod (`src/lib/schemas.ts`), asegurando una consistencia total entre la validación y la tipificación.
    - **Estandarización de Rutas de Importación:** Se han auditado y corregido todas las rutas de importación de esquemas en el módulo de IA (`src/ai/`) para usar alias de ruta (`@/`). Esto soluciona un bug de bajo nivel en Node.js que causaba fallos de validación silenciosos al tratar instancias idénticas de esquemas como si fueran diferentes.
    - **Validación en el Frontend:** Se ha centralizado la definición del estado del juego en un nuevo `GameStateSchema`. La validación de este estado se ha movido al frontend (`src/components/game/game-view.tsx`), permitiendo la detección inmediata de errores de estado antes de que los datos se envíen al backend. Cualquier discrepancia ahora genera un error claro en la consola del navegador.

### Fixed
- **Pasividad de la IA en Combate:** Solucionado un error crítico que provocaba que los compañeros de IA (especialmente aquellos sin habilidades de curación, como el Mago) quedaran pasivos y no realizaran ninguna acción durante su turno.
    - **Diagnóstico:** Gracias a la implementación de un nuevo sistema de logging, se descubrió que el prompt del `companionTacticianTool` era ambiguo. No instruía claramente a la IA sobre qué hacer si la condición principal (curar a un aliado) no se cumplía.
    - **Solución:** Se ha refactorizado el prompt para usar una lógica condicional explícita ("SI puedes curar Y un aliado está herido, ENTONCES cura. EN CUALQUIER OTRO CASO, ataca."). Esto asegura que la IA siempre tenga una acción ofensiva como opción por defecto, eliminando la pasividad y los errores de validación (`null` output) asociados.
- **Integración del Estado de Combate (`turnIndex`):** Se ha refactorizado el flujo de datos entre el frontend y el backend para incluir el `turnIndex` en el estado del juego, solucionando un error crítico que impedía la continuación del combate después del primer turno.
- **Corregido Bug de Flujo de Datos en Combate:** Solucionado un error en `game-view.tsx` que impedía que el `initiativeOrder` se enviara correctamente en los turnos de combate subsiguientes.
- **Corregido Error de Renderizado en `LeftPanel`:** Solucionados varios errores de renderizado en el panel izquierdo (`TypeError: Cannot read properties of undefined`) que ocurrían durante el combate, asegurando que los componentes `DiceLogPanel` y `InitiativeTracker` siempre reciban props válidas.
- **Solucionado Bug Crítico de Validación en Combate:** Resuelto un error que causaba fallos silenciosos e impedía el correcto funcionamiento del sistema de combate. El error se debía a inconsistencias en la validación de esquemas entre diferentes módulos de la IA. La nueva arquitectura de esquemas previene que este problema vuelva a ocurrir.

### Docs
- **Actualización del Plan de Combate:** Actualizado el plan de desarrollo (`docs/planes-desarrollo/combate-turnos.md`) para marcar el Paso 3 como completado, reflejando la exitosa implementación y depuración de la lógica táctica de la IA.
- **Plan de Refactorización de Esquemas:** Creado el documento `docs/planes-desarrollo/refactor-esquemas.md` para guiar la refactorización de la arquitectura de esquemas y asegurar que todos los objetivos se cumplieran de forma estructurada.

---

## [0.4.66] - 2024-07-28

### Changed
- **Restaurado el Log de Estado Final:** Se ha vuelto a añadir la información de la ubicación final y el estado de combate al mensaje de log `Turn finished` en el `gameCoordinator` para mejorar la trazabilidad y la depuración.
- **Flujo de Conversación Lógico:** Se ha refactorizado el `gameCoordinator` para asegurar que el orden de generación y ensamblaje de los mensajes sea lógicamente coherente. Ahora, las reacciones de los compañeros se generan y se añaden al historial primero, y la narración del DM se genera después, siendo consciente de dichas reacciones. El array de mensajes final respeta este orden (`[Reacciones..., Narración]`), garantizando la coherencia del historial para los turnos futuros.

### Fixed
- **Corregido Error Crítico en Herramientas de IA:** Se ha solucionado un fallo fundamental que provocaba el silencio de los compañeros de IA y errores en el `actionInterpreter`. La causa raíz era una refactorización incompleta de la herramienta `characterLookupTool`, que seguía dependiendo de un estado global obsoleto. La solución ha implicado:
    1.  Refactorizar `characterLookupTool` para que acepte los datos de la `party` como un argumento explícito.
    2.  Modificar `companionExpertTool` y `actionInterpreter` para adoptar un patrón más robusto donde los datos necesarios son inyectados directamente en los prompts, eliminando las frágiles llamadas a herramientas anidadas.
- **Corregido Error de Esquema:** Se ha definido y exportado el `PartySchema` en `src/lib/schemas.ts` para solucionar un error de compilación que impedía a las herramientas validar correctamente el array de la `party`.

### Docs
- Actualizada la documentación de `docs/arquitectura/arquitectura-backend.md` para reflejar el paso de un estado global a un flujo de datos explícito en las herramientas de IA, detallando la nueva arquitectura más robusta y predecible.
- **Restauración del Historial:** Se ha recuperado y fusionado el historial completo de versiones (0.1.0 a 0.4.5) en el `CHANGELOG.md` para asegurar una documentación completa del proyecto.

---

## [0.4.65] - 2024-07-27

### Added
- **Panel de Tiradas:** Se ha añadido un nuevo panel en la interfaz de usuario que muestra un historial de todas las tiradas de dados realizadas, proporcionando transparencia sobre los resultados.
- **Panel de Orden de Combate:** Se ha implementado un panel que aparece al iniciar un combate y muestra la lista de todos los participantes ordenados por su iniciativa.

### Changed
- **Iconos en el Log de Partida:** Se han añadido iconos visuales al log principal para diferenciar rápidamente los distintos tipos de acciones (ataque, movimiento, diálogo, tiradas), mejorando la legibilidad.
- **Refactorización del Cálculo de Modificadores de Habilidad:** Se ha realizado una refactorización integral para optimizar y centralizar el cálculo de los modificadores de habilidad de los personajes.
    - **`schemas.ts`:** Se ha añadido el campo `abilityModifiers` al `CharacterSchema` para validar la nueva estructura de datos.
    - **`new-game-data.ts`:** Se han añadido los modificadores de habilidad pre-calculados a todos los personajes iniciales, convirtiéndolos en la fuente única de verdad.
    - **`combat-manager.ts`:** Se ha simplificado la lógica de la herramienta. Ahora lee directamente el modificador de destreza pre-calculado en lugar de calcularlo dinámicamente durante el inicio del combate.
- Mejorada la interfaz de usuario para que en los mensajes del chat se muestre el nombre del personaje controlado por el jugador en lugar del genérico "Jugador", aumentando así la inmersión.
- Se ha ajustado la configuración de la narración por voz (Texto a Voz), cambiando el modelo, la voz y las instrucciones del prompt para obtener un resultado más adecuado al rol de Dungeon Master.
- Se ha renombrado el archivo `src/lib/data.ts` a `src/lib/new-game-data.ts` para que su propósito sea más claro. Se han actualizado las importaciones correspondientes.
- Mejorado el texto de introducción para una nueva partida, añadiendo más detalles sobre la ubicación inicial para enriquecer la inmersión.

### Fixed
- Corregido un error tipográfico (`idđ` en lugar de `id`) en un objeto del inventario del personaje 'Merryl' en `src/lib/new-game-data.ts`. Este error, introducido durante la reciente refactorización, causaba un fallo de validación del esquema.
- Corregido un error en el `gameCoordinator` que provocaba que la IA improvisara respuestas cuando un jugador le pedía a un compañero que leyera información del entorno (como un cartel). Ahora, el DM narra la información y el compañero reacciona a ella.
- Corregido el comportamiento del `narrativeExpert` para que, al leer un texto (como una misión), muestre el contenido literal del mismo en lugar de una narración resumida, evitando fallos de la IA.
- Corregido un error de validación en los datos iniciales (`new-game-data.ts`) donde un conjuro tenía un campo `id_ts` en lugar de `id`.
- Eliminado el registro de los diálogos de los compañeros de la consola de depuración para mantenerla limpia y centrada en la lógica de la IA.

### Docs
- Se ha actualizado y enriquecido significativamente el archivo de hoja de ruta (`docs/roadmap.md`) con un análisis detallado sobre la estrategia, el impacto y la implementación de las mejoras futuras propuestas.

### Removed
- Eliminado el archivo obsoleto `src/lib/data.ts`.

---

## [0.4.61] - 2024-07-26

### Changed
- Se ha mejorado la interfaz de usuario para permitir escribir en el campo de texto mientras el DM está pensando, aunque el botón de enviar permanezca desactivado.

### Fixed
- Corregido un error crítico por el que el `actionInterpreter` no reconocía las interacciones directas con los compañeros de IA, provocando que el DM narrara sus respuestas en lugar de que ellos mismos hablaran.
- Solucionado un error en el `gameCoordinator` que finalizaba el turno prematuramente tras una acción de movimiento, impidiendo que se registraran los logs de estado finales.

---

## [0.4.6] - 2024-05-24

### Added
- Archivo `CHANGELOG.md` creado para documentar el historial de cambios del proyecto.
- Archivo `docs/roadmap.md` creado para separar las posibles mejoras de la documentación principal.
- Se ha reactivado la lógica de los compañeros de IA en el flujo `gameCoordinator`.
- Reconstruido el historial de versiones (0.1.0 a 0.4.5) para reflejar la evolución del proyecto.

### Changed
- El sistema de versionado y changelog, anteriormente archivado, se anota como una mejora futura para su automatización.

### Fixed
- Se revirtieron cambios no solicitados en `page.tsx`, `game-view.tsx` y `actions.ts` que se habían introducido durante la primera intentona de documentación, restaurando la base de código a un estado estable previo.

---

## [0.4.5] - 2024-05-23

### Added
- Documentación detallada de la arquitectura de la aplicación (tanto del frontend como de la IA) añadida al archivo `README.md`.
- Implementación de un sistema de juego de rol funcional basado en la aventura "El Dragón del Pico Agujahelada".
- Flujos de IA (`gameCoordinator`, `actionInterpreter`, `narrativeExpert`) para gestionar la lógica del juego.
- Herramientas de IA (`locationLookupTool`, `companionExpertTool`, etc.) para dar soporte a los flujos principales.

### Changed
- El flujo de la partida se centraliza en `game-view.tsx` y se comunica con el backend a través de la Server Action `processPlayerAction`.

### Fixed
- Se estabilizó el comportamiento de la IA, asegurando que los flujos de ejecución sean predecibles y no entren en bucles.

### Removed
- Se desactivó temporalmente la lógica de los compañeros de IA en `gameCoordinator` para simplificar la depuración de los flujos de narración y acción principales.

---

## [0.4.0] - 2024-05-22

### Added
- Implementado el flujo principal de juego, conectando la entrada del usuario con el backend de IA a través de Server Actions.
- Creada la vista `game-view.tsx` para gestionar el estado de la partida activa.

---

## [0.3.0] - 2024-05-21

### Added
- Integración de Genkit para la funcionalidad de IA generativa.
- Creados los flujos y herramientas de IA iniciales para interpretar acciones y narrar la historia.

### Changed
- Se añade el archivo de aventura `el-dragon-del-pico-agujahelada.json` como fuente de datos principal para la IA.

---

## [0.2.0] - 2024-05-20

### Added
- Implementados los componentes principales de la interfaz de usuario con `shadcn/ui`, incluyendo el `ChatPanel`, `CharacterSheet` y `GameLayout`.
- Configurado el `LeftPanel` para mostrar el log de depuración y las tiradas de dados.

---

## [0.1.0] - 2024-05-19

### Added
- Inicialización del proyecto con Next.js, TypeScript y Tailwind CSS.
- Configuración de la estructura de archivos y dependencias base (`package.json`).
- Creación del `README.md` inicial y la estructura de carpetas `src`.
