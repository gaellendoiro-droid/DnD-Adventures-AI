# Issues Corregidos

Issues que han sido resueltos y verificados. Ordenados por prioridad (PMA → PA → PM → PB → PMB).

**Total:** 30 issues  
**Última actualización:** 2025-11-17 (Issue #78)

---

## 🔴 Prioridad Muy Alta (PMA) - Críticos

### Issue #67: Turno de companion IA se repite al presionar "Pasar 1 Turno" ✅ RESUELTO

- **Fecha de creación:** 2025-11-16
- **Fecha de corrección:** 2025-11-16
- **Ubicación:** `src/components/game/game-view.tsx`
- **Severidad:** 🔴 **CRÍTICA** (rompe el flujo de combate, hace el juego injugable)
- **Descripción:** En modo combate por turnos, después de que un companion IA (como Elara) ejecuta su turno automáticamente, al presionar el botón "Pasar 1 Turno", el sistema vuelve a ejecutar el turno del mismo companion en lugar de avanzar al siguiente combatiente en el orden de iniciativa.
- **Contexto:** Detectado durante testing manual del sistema de turnos. El bug ocurría específicamente cuando:
  1. El jugador ejecutaba su turno (ej: Galador)
  2. Un companion IA ejecutaba su turno automáticamente (ej: Elara)
  3. El jugador presionaba "Pasar 1 Turno"
  4. **BUG:** El sistema volvía a ejecutar el turno de Elara en lugar de avanzar al siguiente combatiente (ej: Orco1)
- **Causa raíz identificada:** ✅
  - El `useEffect` en `game-view.tsx` (línea 68) estaba sincronizando `turnIndexRef.current` con el state `turnIndex` en cada render
  - Cuando el backend devolvía `turnIndex=1` (siguiente turno: Elara) y `lastProcessedTurnIndex=0` (turno procesado: Merryl), el frontend:
    1. Actualizaba `turnIndexRef.current = 1` correctamente (línea 389) ✅
    2. Actualizaba `setTurnIndex(0)` para mostrar visualmente el turno procesado (línea 420) ✅
    3. El `useEffect` se ejecutaba y sobrescribía `turnIndexRef.current = 0` (línea 68) ❌
  - Al presionar "Pasar 1 Turno", el código leía `turnIndexRef.current` que era 0 en lugar de 1, enviando el índice incorrecto al backend
- **Solución implementada:** ✅
  - **Cambio principal:** Eliminada la sincronización automática de `turnIndexRef` con `turnIndex` en el `useEffect`
  - **Razón:** `turnIndexRef` debe mantener el índice del "siguiente turno" (del backend), mientras que `turnIndex` (state) muestra el índice visual (puede ser el turno procesado)
  - **Modificación:** Removida la línea `turnIndexRef.current = turnIndex;` del `useEffect` (línea 68)
  - **Resultado:** `turnIndexRef` ahora solo se actualiza explícitamente desde las respuestas del backend (líneas 389 y 445), manteniendo el valor correcto del siguiente turno
- **Archivos modificados:**
  - `src/components/game/game-view.tsx` (línea 68): Eliminada sincronización automática de `turnIndexRef` en `useEffect`
- **Diagnóstico realizado:**
  - ✅ Logging extensivo agregado en puntos críticos del flujo
  - ✅ Tests unitarios e integración creados (29 tests, 100% pasaron)
  - ✅ Tests confirmaron que la lógica teórica era correcta
  - ✅ Análisis de logs identificó la causa raíz exacta
  - ✅ Documentación completa en: `docs/tracking/issues/resueltos/issue-67/`
- **Impacto:** Crítico - El flujo de combate por turnos ahora funciona correctamente, los jugadores pueden avanzar turnos sin que los companions IA repitan sus turnos
- **Estado:** ✅ RESUELTO - Corrección implementada y verificada
- **Detección:** Testing manual - Sistema de turnos de combate
- **Referencia:** Documentación archivada en `docs/tracking/issues/resueltos/issue-67/`

---

### Issue #49: Resolución incorrecta de targets en combate con enemigos múltiples ✅ RESUELTO

- **Fecha de creación:** 2025-11-15
- **Fecha de corrección:** 2025-11-15
- **Ubicación:** `src/lib/combat/target-resolver.ts`
- **Severidad:** 🟡 **ALTA** (afecta gameplay, puede causar ataques contra targets incorrectos)
- **Descripción:** Cuando el jugador especificaba un target explícito con número (ej: "Ataco a Goblin 1"), el sistema a veces interpretaba incorrectamente el target y dirigía el ataque contra un enemigo diferente (ej: Goblin 2 en lugar de Goblin 1).
- **Contexto:** Detectado durante Test 19 (Verificación de Regresiones - Refactorización de combat-manager.ts) en combate contra 2 Goblins y 1 Orco.
- **Problema identificado:**
  - Los `uniqueId` se generaban con numeración 0-indexed (`goblin-0`, `goblin-1`) mientras que los nombres visuales usaban 1-indexed ("Goblin 1", "Goblin 2")
  - Esto requería conversión compleja y propensa a errores: `uniqueId "goblin-0"` → "Goblin 1", `uniqueId "goblin-1"` → "Goblin 2"
  - El código en `target-resolver.ts` intentaba hacer esta conversión pero tenía bugs que causaban targets incorrectos
- **Solución implementada:** ✅ Refactorización arquitectónica - Cambio a numeración 1-indexed en uniqueIds
  - **Cambio principal:** Los `uniqueId` ahora empiezan en 1 (`goblin-1`, `goblin-2`) para coincidir directamente con los nombres visuales
  - **Simplificación:** Eliminada toda la lógica compleja de conversión en `target-resolver.ts` (reducido de ~50 líneas a ~15 líneas)
  - **Beneficios:**
    - Código más simple y mantenible
    - Menos errores: el número del uniqueId coincide directamente con el visual
    - Más intuitivo: `goblin-1` → "Goblin 1" (sin conversión)
- **Ejemplo de corrección:**
  - Ahora: `uniqueId "goblin-1"` → "Goblin 1" ✅ (mapeo directo, sin conversión)
  - Antes: `uniqueId "goblin-0"` → "Goblin 1" (requería conversión compleja) ❌
- **Archivos modificados:**
  - `src/ai/tools/combat-manager.ts`: Cambiada generación de uniqueIds para empezar en 1 (línea 923)
  - `src/lib/combat/monster-name-manager.ts`: Simplificado para usar número del uniqueId directamente (línea 52-54)
  - `src/lib/combat/target-resolver.ts`: Eliminada lógica compleja de conversión, ahora mapeo directo (líneas 53-76)
- **Impacto:** Alto - Los ataques ahora se dirigen correctamente al target especificado, código más simple y robusto
- **Estado:** ✅ RESUELTO - Refactorización completa implementada
- **Detección:** Testing de v0.5.0 - Test 19
- **Referencia:** CHANGELOG [Unreleased]

---

### Issue #68: Turno de IA se procesa automáticamente después de acción del jugador cuando el jugador va primero ✅ RESUELTO

- **Fecha de creación:** 2025-11-17
- **Fecha de corrección:** 2025-11-17
- **Ubicación:** `src/ai/tools/combat-manager.ts`
- **Severidad:** 🟡 **ALTA** (el jugador perdía el control manual del flujo de turnos)
- **Descripción:** Si el jugador ganaba la iniciativa (turnIndex=0) y realizaba una acción, el backend avanzaba automáticamente al siguiente combatiente y ejecutaba su turno (IA o compañero) sin esperar a que el jugador pulsara "Pasar 1 Turno".
- **Contexto:** Detectado en Test 1.3 (Flujo de Turno del Jugador) del sistema de turnos paso a paso.
- **Causa raíz:** Tras procesar la acción del jugador (líneas 222-640) se incrementaba `currentTurnIndex` y se entraba de inmediato en el bloque que procesa turnos de IA (líneas 644-976), ignorando el control manual establecido para el jugador.
- **Solución implementada:**
  - Eliminado el avance automático del índice después de una acción del jugador; ahora se retorna inmediatamente y se conserva el turno actual.
  - Añadido cálculo del siguiente combatiente para devolver un `hasMoreAITurns` coherente (IA o jugador inconsciente) sin adelantar el turno.
  - Mantenidos `lastProcessedTurnWasAI: false` y `lastProcessedTurnIndex` con el turno del jugador para sincronizar la UI.
- **Comportamiento corregido:** Una vez que el DM narra la acción del jugador, el combate se pausa y aparecen los botones "Pasar 1 Turno" / "Avanzar Todos". Solo cuando el jugador pulsa el botón se procesa el siguiente turno automáticamente.
- **Archivos modificados:** `src/ai/tools/combat-manager.ts` (bloque de procesamiento de acciones del jugador).
- **Impacto:** Restituye el control manual de turnos, evita narraciones adelantadas de la IA y mantiene la consistencia del sistema paso a paso.
- **Detección:** Testing manual - Test 1.3.

---

### Issue #54: El combate se detiene si el jugador cae inconsciente ✅ RESUELTO

- **Fecha de creación:** 2025-11-15
- **Fecha de corrección:** 2025-11-15
- **Ubicación:** `src/ai/flows/game-coordinator.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad:** 🔴 **CRÍTICO** (impide la continuación del combate)
- **Descripción:** Cuando el personaje del jugador caía inconsciente (HP 0), el combate se detenía completamente, aunque hubiera compañeros de la IA todavía vivos y el combate debería continuar.
- **Contexto:** Detectado durante Testing de v0.5.0 - Observación directa durante combate.
- **Problema identificado:**
  - En `game-coordinator.ts`, había una lógica que detenía el flujo inmediatamente cuando el jugador estaba inconsciente, sin verificar si había otros miembros del grupo activos
  - Esto impedía que el `combatManagerTool` procesara el combate correctamente
  - El combate solo debería terminar si TODOS los miembros del grupo están inconscientes/muertos
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
  - `src/ai/tools/combat-manager.ts`: Añadida detección y procesamiento de turnos del jugador inconsciente
- **Impacto:** Crítico - Permite que el combate continúe cuando el jugador cae, lo cual es esencial para la jugabilidad y las reglas de D&D 5e
- **Estado:** ✅ RESUELTO
- **Detección:** Testing de v0.5.0
- **Referencia:** CHANGELOG [Unreleased]

---

### Issue #51: Mensaje "ha matado" incorrecto cuando personaje ya estaba inconsciente ✅ RESUELTO

- **Fecha de creación:** 2025-11-15
- **Fecha de corrección:** 2025-11-15
- **Ubicación:** `src/ai/tools/combat-manager.ts`
- **Severidad:** 🟡 **ALTA** (afecta narrativa y reglas de D&D 5e, confunde al jugador)
- **Descripción:** Cuando un personaje del grupo (companion o jugador) ya estaba inconsciente (HP 0, `isDead: false`) y recibía daño adicional del jugador, el sistema mostraba "¡ha matado!" incluso cuando el daño no era suficiente para muerte masiva y el personaje podía ser curado después.
- **Contexto:** Detectado durante Test 15 (Sistema de Inconsciencia y Muerte - Personajes Muertos No Pueden Ser Curados).
- **Problema identificado:**
  - En `combat-manager.ts` líneas 513-519 (versión anterior), había código simplificado que siempre mostraba "ha matado" cuando `newHP <= 0`
  - Este código NO distinguía entre:
    1. Target es enemigo (debe mostrar "ha matado")
    2. Target es companion/jugador que acaba de caer inconsciente (debe mostrar "ha dejado inconsciente")
    3. Target es companion/jugador que YA estaba inconsciente y murió por daño masivo (debe mostrar "ha matado")
    4. Target es companion/jugador que YA estaba inconsciente pero NO murió por daño masivo (NO debe mostrar mensaje de muerte)
  - Ejemplo: Merryl inconsciente (HP 0, `isDead: false`) recibe 5 de daño → sistema muestra "ha matado" → pero luego Elara la cura exitosamente
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
- **Detección:** Testing de v0.5.0 - Test 15
- **Referencia:** CHANGELOG [Unreleased]

---

## 🟡 Prioridad Alta (PA) - Advertencias

### Issues #35, #36, #37: Corrección de mensajes de inconsciencia/muerte ✅ RESUELTOS

- **Fecha de creación:** 2025-11-14
- **Fecha de corrección:** 2025-11-14 (según CHANGELOG)
- **Ubicación:** `src/ai/tools/combat/dice-roll-processor.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad:** 🟡 **ALTA** (afecta narrativa, secuencia ilógica, confunde reglas de D&D 5e)
- **Descripción general:** Los mensajes del sistema no distinguían correctamente entre inconsciencia y muerte, y aparecían en orden incorrecto, confundiendo las reglas de D&D 5e y rompiendo la narrativa del juego.

#### Issue #35: Orden incorrecto de mensajes cuando personaje cae a 0 HP ✅ RESUELTO

- **Problema:** Cuando un personaje caía a 0 HP, los mensajes de inconsciencia aparecían en orden incorrecto. El mensaje "X cae inconsciente" aparecía ANTES del mensaje de daño, causando una secuencia ilógica.
- **Secuencia incorrecta (antes):**
  1. Narración del orco
  2. "Orco 1 ataca a Merryl y acierta (18 vs AC 13)."
  3. ❌ **"Merryl cae inconsciente."** (PREMATURO)
  4. "Orco 1 ha hecho 10 puntos de daño a Merryl (8 → 0 HP)."
  5. ❌ **"¡Orco 1 ha matado a Merryl!"** (INCORRECTO)
- **Secuencia correcta (después):**
  1. Narración del orco
  2. "Orco 1 ataca a Merryl y acierta (18 vs AC 13)."
  3. "Orco 1 ha hecho 10 puntos de daño a Merryl (8 → 0 HP)."
  4. ✅ **"¡Orco 1 ha dejado inconsciente a Merryl!"** (DESPUÉS del daño, mensaje correcto)
  5. ✅ **"Merryl cae inconsciente."** (DESPUÉS del mensaje anterior)
- **Solución implementada:** ✅ Reordenado para que el mensaje de inconsciencia aparezca DESPUÉS del mensaje de daño aplicado
  - En `dice-roll-processor.ts`: El mensaje de daño se añade primero (línea 439), luego se verifica si el target fue derrotado y se añaden los mensajes de inconsciencia/muerte (líneas 456-494)

#### Issue #36: Mensaje "ha matado" cuando personaje está inconsciente, no muerto ✅ RESUELTO

- **Problema:** Cuando un personaje caía a 0 HP (sin muerte masiva), el sistema mostraba "¡Orco 1 ha matado a Merryl!" cuando debería decir "¡Orco 1 ha dejado inconsciente a Merryl!". Según las reglas de D&D 5e, un personaje a 0 HP está **inconsciente**, no muerto (a menos que se aplique la regla de muerte masiva).
- **Solución implementada:** ✅ Verificación del campo `isDead` para distinguir entre muerte real (`isDead === true`) e inconsciencia (`hp.current <= 0` pero `isDead !== true`)
  - Si `isDead === true`: "ha matado"
  - Si `hp.current <= 0` pero `isDead !== true`: "ha dejado inconsciente"
  - En `dice-roll-processor.ts`: Verificación de `targetIsDead` (línea 462) antes de generar mensajes (líneas 467-493)

#### Issue #37: Mensaje "está muerto" cuando personaje está inconsciente ✅ RESUELTO

- **Problema:** Cuando un personaje inconsciente (HP 0, pero no muerto) intentaba tomar su turno, el sistema mostraba "Merryl está muerto y no puede actuar" cuando debería decir "Merryl está inconsciente y no puede actuar".
- **Solución implementada:** ✅ Verificación de `isDead` al inicio del turno
  - Si `isDead === true`: "está muerto y no puede actuar"
  - Si `hp.current <= 0` pero `isDead !== true`: "está inconsciente y no puede actuar"
  - En `combat-manager.ts`: Verificación correcta en líneas 155-157

- **Distinción entre personajes del grupo y enemigos:**
  - **Personajes del grupo (jugador y compañeros):** Pueden quedar inconscientes cuando HP llega a 0 sin muerte masiva (`isDead = false`) o morir por muerte masiva (`isDead = true`). Mensajes apropiados según estado.
  - **Enemigos:** Mueren directamente al llegar a HP 0 (no quedan inconscientes). Siempre muestran "está muerto" o "ha matado".

- **Archivos modificados:**
  - `src/ai/tools/combat/dice-roll-processor.ts`: Reordenado mensajes, verificación de `isDead` para mensajes de muerte/inconsciencia (líneas 439-494)
  - `src/ai/tools/combat-manager.ts`: Verificación de `isDead` en turnos normales e iniciación de combate, distinción entre enemigos y personajes del grupo (líneas 155-157)

- **Impacto:** Alto - Mejora drástica de coherencia narrativa, fidelidad a reglas de D&D 5e, y claridad para el jugador sobre el estado de los personajes
- **Estado:** ✅ RESUELTOS
- **Detección:** Testing de refactorización `combat-manager.ts`
- **Referencia:** CHANGELOG [Unreleased] - Issues #35, #36, #37

---

### Issue #34: AI de enemigos traduce/inventa nombres en narración en lugar de usar nombre exacto ✅ RESUELTO

- **Fecha de creación:** 2025-11-14
- **Fecha de corrección:** 2025-11-14
- **Ubicación:** `src/ai/tools/enemy-tactician.ts`
- **Severidad:** 🟡 **ALTA** (afecta narrativa, confunde al jugador)
- **Descripción:** Durante el combate, la AI de `enemyTacticianTool` generaba narrativas con nombres de criaturas traducidos o inventados (e.g., "Gnomo 1" en lugar de "Goblin 1"), mientras que el sistema internamente usaba el nombre correcto. Esto creaba inconsistencia entre la narración del enemigo y los mensajes del DM.
- **Ejemplo del bug:**
  ```
  DM: "El Gnomo 1, con una sonrisa maliciosa, arremete contra Merryl..."  [❌ Incorrecto]
  DM: "Goblin 1 ataca a Merryl, pero falla (10 vs AC 13)."               [✅ Correcto]
  ```
- **Causa raíz:** El prompt de `enemyTacticianTool` no instruía explícitamente a la AI para usar el nombre exacto del combatiente activo (`{{{activeCombatant}}}`), permitiendo que la AI tradujera o inventara nombres según su interpretación.
- **Solución implementada:** ✅ Añadida instrucción explícita en el prompt (línea 63):
  > "**CRITICAL: You MUST use EXACTLY the name "{{{activeCombatant}}}" when referring to this creature in your narration. DO NOT translate or change this name (e.g., if it's "Goblin 1", write "Goblin 1", NOT "Gnomo 1").**"
- **Archivos modificados:**
  - `src/ai/tools/enemy-tactician.ts` (prompt, línea 63)
- **Impacto:** Alto - Narrativa ahora es consistente, mantiene inmersión, y el jugador puede identificar claramente qué criatura está actuando
- **Estado:** ✅ RESUELTO
- **Detección:** Test 2 del plan de refactorización de `combat-manager.ts` (múltiples enemigos del mismo tipo)
- **Referencia:** CHANGELOG [Unreleased] - Bug de Nombrado de Enemigos en Narración

---

### Issue #13: Connect Timeout Error al iniciar combate ✅ RESUELTO

- **Fecha de creación:** 2025-11-12
- **Fecha de corrección:** 2025-11-12
- **Ubicación:** `src/ai/flows/action-interpreter.ts`
- **Severidad:** 🔴 **ALTA** (intermitente pero bloquea completamente el combate cuando ocurre)
- **Descripción:** Al intentar iniciar combate, ocasionalmente se producía un `TypeError: fetch failed` con `ConnectTimeoutError` al intentar conectar con la API de Google Gemini.
- **Solución implementada:** ✅ Retry logic con exponential backoff + fallback inteligente
  - Función `retryWithExponentialBackoff` con máximo 3 reintentos (4 intentos totales)
  - Delays de 1s, 2s, 4s
  - Fallback inteligente por palabras clave si todos los reintentos fallan
- **Archivos modificados:** `src/ai/flows/action-interpreter.ts` (líneas 14-217)
- **Estado:** ✅ RESUELTO
- **Nota adicional (2025-11-15):** La función de retry fue extraída a `src/ai/flows/retry-utils.ts` como módulo compartido y también se aplicó a `narrativeExpertFlow` para manejar timeouts durante la iniciación de combate y generación de narración.

### Issue #52: Timeouts de conexión en `companionTacticianTool` y `enemyTacticianTool` ✅ RESUELTO

- **Fecha de creación:** 2025-11-15
- **Fecha de corrección:** 2025-11-15
- **Ubicación:** `src/ai/tools/companion-tactician.ts`, `src/ai/tools/enemy-tactician.ts`
- **Severidad:** 🔴 **CRÍTICO** (cuando ocurre, impide que los personajes de la IA actúen)
- **Descripción:** Se detectó un `ConnectTimeoutError` al llamar a la API de Gemini desde `companionTacticianTool`. Ni este tool ni `enemyTacticianTool` tenían implementada una lógica de reintentos.
- **Solución implementada:** ✅ Se añadió lógica de reintentos con backoff exponencial a ambos tools utilizando el módulo compartido `retry-utils.ts`.
  - Se importó `retryWithExponentialBackoff` en ambos archivos.
  - Se envolvieron las llamadas a `companionTacticianPrompt` y `enemyTacticianPrompt` con la función de reintentos.
- **Archivos modificados:**
  - `src/ai/tools/companion-tactician.ts`
  - `src/ai/tools/enemy-tactician.ts`
- **Estado:** ✅ RESUELTO
- **Impacto:** Crítico - Asegura que los errores transitorios de red no impidan que la IA actúe en combate, mejorando significativamente la robustez del sistema.

### Issue #48: Sistema de Sincronización de Turnos - Problemas de Sincronización UI ✅ RESUELTO

- **Fecha de creación:** 2025-11-15
- **Fecha de corrección:** 2025-11-15
- **Ubicación:** `src/components/game/game-view.tsx`, `src/ai/tools/combat-manager.ts`
- **Severidad:** 🔴 **CRÍTICO** (afecta la experiencia de juego, múltiples intentos de corrección fallaron)
- **Descripción:** El sistema de turnos paso a paso tenía múltiples problemas de sincronización entre backend y frontend:
  - El marcador visual del turno (`turnIndex`) se actualizaba prematuramente, mostrando el siguiente turno antes de que el jugador presionara "Pasar 1 Turno"
  - La lógica del frontend era extremadamente compleja e ineficaz, intentando inferir qué turno se había procesado mediante cálculos complejos de índices, búsquedas hacia atrás, y detección de saltos de turnos
  - El backend no proporcionaba información explícita sobre qué turno se había procesado, forzando al frontend a adivinar
  - Múltiples intentos de corrección fallaron debido a la complejidad inherente de la solución
- **Solución implementada:** ✅ Refactorización completa con campos explícitos en el backend
  - **Backend (`combat-manager.ts`):**
    - Añadidos nuevos campos al schema: `lastProcessedTurnWasAI: boolean` y `lastProcessedTurnIndex: number`
    - Estos campos indican **explícitamente** qué turno se procesó en la última respuesta
    - Actualizados todos los puntos de retorno (10 ubicaciones) para incluir estos campos
  - **Frontend (`game-view.tsx`):**
    - Eliminada toda la lógica compleja de inferencia (cálculos de índices, búsquedas hacia atrás, detección de saltos)
    - Reemplazada por lógica simple y directa basada en los campos explícitos del backend
    - Reducción de código: ~150 líneas de lógica compleja → ~20 líneas de lógica simple
- **Archivos modificados:**
  - `src/ai/tools/combat-manager.ts`: Añadidos campos `lastProcessedTurnWasAI` y `lastProcessedTurnIndex` al schema y todos los puntos de retorno
  - `src/components/game/game-view.tsx`: Simplificada drásticamente la lógica de sincronización de turnos
- **Estado:** ✅ RESUELTO - Sistema completamente funcional y probado con combates completos
- **Impacto:** Crítico - Soluciona definitivamente los problemas de sincronización de turnos que habían persistido a través de múltiples intentos de corrección. El sistema ahora es robusto, simple y eficaz.

### Issue #19: Turno del jugador no procesa tiradas de dados ni narración del DM ✅ RESUELTO

- **Fecha de creación:** 2025-11-12
- **Fecha de corrección:** 2025-11-12
- **Ubicación:** `src/ai/tools/combat-manager.ts`
- **Severidad:** 🔴 **CRÍTICO**
- **Descripción:** El turno del jugador no generaba tiradas de dados ni narración del DM, bloqueando completamente la jugabilidad en combate.
- **Solución implementada:** ✅ Procesamiento completo del turno del jugador (líneas 738-1005)
  - Generación automática de attack roll y damage roll
  - Narración del DM para acierto/fallo, daño, críticos, pifias
  - Aplicación correcta de daño con validación
- **Archivos modificados:** `src/ai/tools/combat-manager.ts`
- **Estado:** ✅ RESUELTO

### Issue #20: Hechizos con tiradas de salvación no funcionan ✅ RESUELTO

- **Fecha de creación:** 2025-11-12
- **Fecha de corrección:** 2025-11-13
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/tools/enemy-tactician.ts`, `src/ai/tools/companion-tactician.ts`
- **Severidad:** 🔴 **CRÍTICO**
- **Descripción:** Hechizos como Sacred Flame que usan tirada de salvación del objetivo en lugar de tirada de ataque no funcionaban correctamente.
- **Solución implementada:** ✅ Sistema de metadata explícita (`attackType`)
  - Añadido campo `attackType` a schemas de AI tacticians
  - `combat-manager.ts` lee `attackType` del rollData
  - Fallback a detección por keywords para retrocompatibilidad
- **Archivos modificados:** 
  - `src/ai/tools/combat-manager.ts` (líneas 1248-1267, 1372-1409)
  - `src/ai/tools/enemy-tactician.ts`
  - `src/ai/tools/companion-tactician.ts`
- **Estado:** ✅ RESUELTO

### Issue #23: Selección automática de objetivo único y manejo de acciones ambiguas ✅ RESUELTO

- **Fecha de creación:** 2025-11-13
- **Fecha de corrección:** 2025-11-13
- **Ubicación:** `src/ai/tools/combat-manager.ts`
- **Severidad:** 🔴 **CRÍTICO**
- **Descripción:** Cuando el jugador atacaba sin especificar objetivo, el sistema fallaba y saltaba el turno.
- **Solución implementada:** ✅ Auto-selección de objetivo único + petición de aclaración para múltiples
  - Auto-selección cuando hay un solo enemigo vivo
  - Petición de aclaración cuando hay múltiples (turno NO avanza)
  - Fix de normalización de nombres con acentos
- **Archivos modificados:** `src/ai/tools/combat-manager.ts` (función `resolveEnemyId`, líneas 595-616)
- **Estado:** ✅ RESUELTO COMPLETAMENTE

### Issue #24: Helper `eq` de Handlebars no disponible en Genkit bloqueaba reacciones de compañeros ✅ RESUELTO

- **Fecha de creación:** 2025-11-13
- **Fecha de corrección:** 2025-11-13
- **Ubicación:** `src/ai/tools/companion-expert.ts`
- **Severidad:** 🔴 **CRÍTICO**
- **Descripción:** El prompt usaba `{{#if (eq reactionTiming "before_dm")}}` pero Genkit no soporta el helper `eq`, bloqueando todas las reacciones.
- **Solución implementada:** ✅ Reemplazado con variables booleanas directas
  - `reactionTiming` (string) → `isBeforeDm` e `isAfterDm` (booleanos)
  - Template usa `{{#if isBeforeDm}}` directamente
- **Archivos modificados:** `src/ai/tools/companion-expert.ts` (líneas 27-77, 109-114)
- **Estado:** ✅ RESUELTO

### Issue #26: Compañero muerto sigue reaccionando después de combate ✅ RESUELTO

- **Fecha de creación:** 2025-11-13
- **Fecha de corrección:** 2025-11-13
- **Ubicación:** `src/ai/flows/game-coordinator.ts`, `src/ai/tools/companion-expert.ts`
- **Severidad:** 🔴 **MUY ALTA** (rompe la inmersión y lógica del juego)
- **Descripción:** Después de un combate, si un compañero había muerto, el sistema seguía generando reacciones para ese compañero como si estuviera vivo.
- **Solución implementada:** ✅ Filtrado de compañeros muertos + validación defensiva
  - Filtrado en `game-coordinator.ts` (líneas 178 y 243): `character.hp.current > 0`
  - Validación defensiva en `companion-expert.ts` (líneas 102-111)
- **Archivos modificados:**
  - `src/ai/flows/game-coordinator.ts` (líneas 178 y 243)
  - `src/ai/tools/companion-expert.ts` (líneas 102-111)
- **Estado:** ✅ RESUELTO

### Issue #27: Verificación de muerte de personajes en combate y fuera de combate ✅ RESUELTO

- **Fecha de creación:** 2025-11-13
- **Fecha de corrección:** 2025-11-14
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/flows/game-coordinator.ts`, `src/ai/tools/combat-initiation-expert.ts`, `src/ai/flows/action-interpreter.ts`
- **Severidad:** 🔴 **ALTA** (afecta jugabilidad y lógica del juego)
- **Descripción:** El sistema no verificaba consistentemente el estado de vida de los personajes antes de permitirles actuar, participar en combates o generar acciones.
- **Solución implementada:** ✅ Sistema completo en 6 fases
  - Fase 1: Filtrar combatientes muertos en iniciación de combate
  - Fase 2: Filtrar enemigos muertos en `combatInitiationExpertTool`
  - Fase 3: Filtrar enemigos muertos en `actionInterpreter`
  - Fase 4: Verificar muerte del jugador y detección de "game over"
  - Fase 5: Pasar `updatedEnemies` a herramientas
  - Fase 6: Verificar muerte en iniciación de combate
- **Mejora adicional:** Sistema de Inconsciencia y Muerte Masiva (D&D 5e) implementado
- **Archivos modificados:**
  - `src/ai/tools/combat-manager.ts` (líneas 1729-1754, 2029-2049)
  - `src/ai/tools/combat-initiation-expert.ts` (líneas 26-85)
  - `src/ai/flows/action-interpreter.ts` (líneas 180-215)
  - `src/ai/flows/game-coordinator.ts` (líneas 55-83, 123, 158)
  - `src/ai/flows/schemas.ts` (línea 15)
  - `src/lib/schemas.ts` (campo `isDead`)
- **Estado:** ✅ RESUELTO

---

## 🟡 Prioridad Alta (PA) - Advertencias

### Issue #50: Daño de crítico no se duplica correctamente ✅ RESUELTO

- **Fecha de creación:** 2025-11-15
- **Fecha de corrección:** 2025-11-16
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/tools/combat/dice-roll-processor.ts`
- **Severidad:** 🟡 **ALTA** (afecta mecánicas de combate, reduce efectividad de críticos)
- **Descripción:** Cuando un jugador o NPC hacía un crítico, el daño no se duplicaba correctamente según las reglas de D&D 5e.
- **Contexto:** Detectado durante Test 15 (Sistema de Inconsciencia y Muerte - Personajes Muertos No Pueden Ser Curados).
- **Problema identificado:**
  - Cuando se detectaba un crítico (outcome=crit), el sistema mostraba el mensaje de crítico pero el daño se calculaba usando la notación normal de dados sin duplicar los dados
  - En D&D 5e, un crítico debería duplicar los **dados de daño**, no el total ni el modificador
  - Ejemplo correcto: Si normalmente haces `1d8+2`, en crítico deberías hacer `2d8+2` (duplica los dados, no el modificador)
  - El problema afectaba tanto a jugadores como a NPCs (enemigos y compañeros)
- **Regla D&D 5e:** En un crítico, se tiran el doble de dados de daño, pero el modificador se aplica solo una vez.
- **Solución implementada:** ✅ Función auxiliar para duplicar dados en críticos
  - **Función `getCriticalDamageNotation`:**
    - Creada función auxiliar que parsea la notación de dados (ej: "1d8+2")
    - Extrae el número de dados, tipo de dado y modificador
    - Duplica el número de dados en caso de crítico
    - Retorna la notación ajustada (ej: "2d8+2")
    - Incluye validación y fallback para notaciones inválidas
  - **`combat-manager.ts` (ataques de jugador):**
    - Añadida detección de crítico antes de calcular daño (línea 426)
    - Se usa `getCriticalDamageNotation` para ajustar la notación de dados antes de ejecutar el roll (línea 442)
    - Se añade "(crítico)" a la descripción del roll de daño para mayor claridad (línea 445)
  - **`dice-roll-processor.ts` (ataques de NPCs):**
    - Añadida función `getCriticalDamageNotation` al inicio del archivo
    - Añadida bandera `wasCritical` para rastrear si el ataque anterior fue crítico (línea 129)
    - Se verifica si el roll actual es de daño y si hubo crítico ANTES de ejecutar el roll (líneas 142-155)
    - Se ajusta la notación de dados antes de ejecutar el roll si es necesario
    - Se guarda la notación ajustada y se añade "(crítico)" a la descripción (líneas 168-171)
    - Se establece `wasCritical = true` cuando se detecta un crítico (línea 233)
- **Ejemplo de corrección:**
  - **Antes:** Crítico con 1d8+2 → se tiraba 1d8+2 → daño promedio ~6.5
  - **Ahora:** Crítico con 1d8+2 → se tira 2d8+2 → daño promedio ~11 ✅
- **Archivos modificados:**
  - `src/ai/tools/combat-manager.ts`: Añadida función `getCriticalDamageNotation` y lógica para jugadores
  - `src/ai/tools/combat/dice-roll-processor.ts`: Añadida función `getCriticalDamageNotation` y lógica para NPCs
- **Cobertura:** Completa - Afecta a jugadores, enemigos y compañeros
- **Impacto:** Alto - Los críticos ahora son significativamente más efectivos y cumplen con las reglas oficiales de D&D 5e
- **Estado:** ✅ RESUELTO
- **Detección:** Testing de v0.5.0 - Test 15
- **Referencia:** CHANGELOG [Unreleased]

---

### Issue #18: IA Táctica ataca a personajes ya derrotados (HP <= 0) ✅ RESUELTO

- **Fecha de creación:** 2025-11-12
- **Fecha de corrección:** 2025-11-12
- **Ubicación:** `src/ai/tools/enemy-tactician.ts`, `src/ai/tools/companion-tactician.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad:** Alta (afecta jugabilidad y lógica del combate)
- **Descripción:** Los AI tácticians continuaban seleccionando como objetivo a personajes que ya habían sido derrotados (HP llegó a 0 o menos).
- **Solución implementada:** ✅ Filtrado de personajes muertos antes de pasarlos a AI tacticians
  - Arrays `aliveParty` y `aliveEnemies` solo incluyen personajes con HP > 0
  - Implementado en turnos normales (líneas 1026-1049) e iniciación de combate (líneas 1838-1861)
- **Archivos modificados:** `src/ai/tools/combat-manager.ts`
- **Estado:** ✅ RESUELTO

### Issue #17: IA no incluye todos los enemigos hostiles en el combate ✅ RESUELTO

- **Fecha de creación:** 2025-11-12
- **Fecha de corrección:** 2025-11-12
- **Ubicación:** `src/ai/tools/combat-initiation-expert.ts`, `src/ai/flows/action-interpreter.ts`
- **Severidad:** Media (afecta la experiencia de juego)
- **Descripción:** La IA que decide qué combatientes participan en el combate a veces omitía enemigos hostiles que estaban presentes en la ubicación.
- **Solución implementada:** ✅ Prompts mejorados
  - Prompt de `combatInitiationExpertTool` más explícito sobre incluir todos los enemigos hostiles
  - Prompt de `actionInterpreter` más conservador al asignar `targetId`
- **Archivos modificados:**
  - `src/ai/tools/combat-initiation-expert.ts`
  - `src/ai/flows/action-interpreter.ts`
- **Estado:** ✅ RESUELTO

---

## 🟢 Prioridad Media (PM) - Mejoras

### Issue #78: Auto-avance se detiene un turno antes del jugador ✅ RESUELTO

- **Fecha de creación:** 2025-11-17
- **Fecha de corrección:** 2025-11-17
- **Ubicación:** `src/components/game/game-view.tsx`
- **Severidad:** 🟢 **MEDIA**
- **Descripción:** Al usar "Avanzar Todos" con el jugador ubicado después de varios enemigos, el auto-avance se detenía mostrando el último turno de IA procesado. El jugador debía pulsar "Pasar 1 Turno" manualmente para recuperar su turno real, rompiendo el flujo automático.
- **Causa raíz:** Al recibir `hasMoreAITurns=false`, el frontend salía del modo auto-avance pero dejaba el `turnIndex` visual apuntando al último enemigo procesado y mantenía `justProcessedAITurn=true`. Nunca se sincronizaba con `turnIndexRef.current`, que ya contenía el índice del jugador enviado por el backend.
- **Solución implementada:**
  - Detectar la combinación `autoAdvancingRef.current && !result.hasMoreAITurns` para forzar la sincronización visual con el turno del jugador (`setTurnIndex(turnIndexRef.current)`).
  - Restablecer `justProcessedAITurn` a `false` cuando el auto-avance termina en el turno del jugador y registrar en logs/debug quién debe actuar.
  - Añadidos logs y mensajes de depuración para identificar con claridad cuándo el auto-avance finaliza y a quién corresponde el turno.
- **Archivos modificados:** `src/components/game/game-view.tsx`
- **Estado:** ✅ RESUELTO
- **Detección:** Testing manual – Test 1.5 (Flujo "Avanzar Todos").

### Issue #1: Archivo Duplicado `game-view.tsx` ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/app/game-view.tsx`
- **Severidad:** Media (no crítico, pero causa confusión)
- **Descripción:** Existe un archivo `src/app/game-view.tsx` que no se está usando. El componente real está en `src/components/game/game-view.tsx`.
- **Solución aplicada:** ✅ Eliminado `src/app/game-view.tsx`
- **Estado:** ✅ Corregido

### Issue #2: Falta de validación en `page.tsx` al cargar aventura ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/app/page.tsx`, función `handleLoadAdventure`
- **Severidad:** Media
- **Descripción:** Al cargar una aventura desde JSON, no se valida que el `initialGameData` tenga todos los campos requeridos.
- **Solución aplicada:** ✅ Añadido esquema `AdventureDataSchema` para validar la estructura de la aventura antes de usarla
- **Estado:** ✅ Corregido

### Issue #3: Falta de validación en `page.tsx` al cargar partida guardada ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/app/page.tsx`, función `handleLoadGame`
- **Severidad:** Media
- **Descripción:** Al cargar una partida guardada, solo se validaba que existieran `party`, `messages` y `locationId`, pero no se validaba la estructura completa.
- **Solución aplicada:** ✅ Añadido esquema `SaveGameDataSchema` para validar la estructura completa del archivo de guardado
- **Estado:** ✅ Corregido

### Issue #4: `conversationHistory` incorrecto en `handleLoadAdventure` ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/app/page.tsx`, función `handleLoadAdventure`
- **Severidad:** Media
- **Descripción:** `conversationHistory` se pasaba como string vacío `""` en lugar de un array vacío `[]`.
- **Solución aplicada:** ✅ Cambiado `conversationHistory: ""` a `conversationHistory: []`
- **Estado:** ✅ Corregido

### Issue #5: Inconsistencia de tipos en `actions.ts` ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/app/actions.ts`
- **Severidad:** Media
- **Descripción:** `processPlayerAction` esperaba `GameCoordinatorInput` pero `gameCoordinator` espera `GameState`.
- **Solución aplicada:** ✅ Cambiado el tipo de parámetro de `processPlayerAction` de `GameCoordinatorInput` a `GameState`
- **Estado:** ✅ Corregido

### Issue #9: Dependencia incorrecta en useEffect de chat-message.tsx ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/components/game/chat-message.tsx`, línea 114
- **Severidad:** Baja (no crítico, pero puede causar problemas)
- **Descripción:** El `useEffect` tenía `[audioRef]` como dependencia, pero los refs no deberían estar en las dependencias.
- **Solución aplicada:** ✅ Cambiada la dependencia de `[audioRef]` a `[]` (array vacío)
- **Estado:** ✅ Corregido

### Issue #10: Campos de formulario sin atributos id o name ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/components/game/main-menu.tsx` y `src/components/game/player-input.tsx`
- **Severidad:** Baja (warning de accesibilidad)
- **Descripción:** Los campos de formulario no tenían atributos `id` o `name`, lo cual genera un warning en la consola del navegador.
- **Solución aplicada:** ✅ Añadidos atributos `id` y `name` a todos los campos de formulario
- **Estado:** ✅ Corregido

### Issue #11: Estados de combate no sincronizados ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/components/game/game-view.tsx`, función `handleSendMessage`
- **Severidad:** Media
- **Descripción:** Los estados relacionados con combate se actualizaban de forma independiente, causando inconsistencias.
- **Solución aplicada:** ✅ Implementada lógica de sincronización que limpia `initiativeOrder`, `turnIndex` y `enemies` cuando `inCombat` se establece en `false`
- **Estado:** ✅ Corregido

### Issue #12: `enemies` no se inicializa desde `initialData` ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/components/game/game-view.tsx`
- **Severidad:** Media
- **Descripción:** El estado `enemies` se inicializaba siempre como array vacío, ignorando cualquier valor de `initialData.enemies`.
- **Solución aplicada:** ✅ 
  - Añadido `enemies?: any[]` a `InitialGameData` y `GameViewProps.initialData`
  - Cambiado inicialización de `enemies` de `useState<any[]>([])` a `useState<any[]>(initialData.enemies || [])`
  - Añadido `enemies` al proceso de carga de partidas guardadas
- **Estado:** ✅ Corregido

---

## 📝 Notas

- Los números de issue se mantienen como referencia histórica del orden en que fueron añadidos
- Para más detalles sobre cada issue, consultar el historial de commits y el [CHANGELOG.md](../../../CHANGELOG.md)
- Los issues corregidos se mantienen aquí como referencia histórica y para documentar las soluciones implementadas

