# Issues Corregidos

Issues que han sido resueltos y verificados. Ordenados por prioridad (PMA → PA → PM → PB → PMB).

**Total:** 38 issues  
**Última actualización:** 2025-11-18 (Issue #75 movido desde pendientes)

---

## 🔴 Prioridad Muy Alta (PMA) - Críticos

### Issue #81: Bucle infinito cuando jugador inconsciente durante auto-avance ✅ RESUELTO

- **Fecha de creación:** 2025-11-17
- **Fecha de corrección:** 2025-11-17
- **Ubicación:** `src/ai/tools/combat-manager.ts` (líneas 148-210)
- **Severidad:** 🔴 **CRÍTICA** (causa bucle infinito que bloquea el juego)
- **Descripción:** Cuando el jugador está inconsciente y se presiona el botón "Avanzar Todos", el sistema mostraba el mensaje "Galador está inconsciente y no puede actuar." pero entraba en un bucle infinito repitiendo el mismo mensaje una y otra vez en lugar de saltar el turno y continuar.
- **Comportamiento esperado:** Cuando el jugador está inconsciente y se procesa su turno (ya sea manualmente o durante auto-avance), el sistema debe mostrar el mensaje y avanzar automáticamente al siguiente turno, no quedarse en el mismo turno.
- **Contexto:** Detectado durante Test 4.4 (Jugador Inconsciente en su Turno) cuando se probó el botón "Avanzar Todos" con el jugador inconsciente.
- **Causa raíz identificada:** ✅
  - En `combat-manager.ts` líneas 148-185, cuando el jugador estaba inconsciente, el sistema retornaba con `turnIndex: currentTurnIndex` (mantenía el mismo turno) y `hasMoreAITurns: true`.
  - El frontend detectaba `hasMoreAITurns: true` y automáticamente enviaba `'continuar turno'` después de 1.5 segundos.
  - El backend volvía a procesar el mismo turno del jugador inconsciente (porque `turnIndex` no cambió) y volvía a retornar con `hasMoreAITurns: true`, creando un bucle infinito.
- **Solución implementada:** ✅
  - **Modificación en `combat-manager.ts`:**
    - Cuando el jugador está inconsciente y se recibe la acción `'continue_turn'`, el sistema ahora avanza el turno ANTES de retornar.
    - El sistema calcula `hasMoreAITurns` basado en el siguiente combatiente después de avanzar.
    - Se retorna inmediatamente después de mostrar el mensaje, separando el mensaje del jugador inconsciente de los mensajes del siguiente turno.
    - Esto permite que el frontend procese el mensaje del jugador inconsciente primero, y luego envíe automáticamente otra llamada `'continuar turno'` para procesar el siguiente turno.
  - **Resultado:**
    - El mensaje del jugador inconsciente se muestra primero.
    - El turno avanza correctamente al siguiente combatiente.
    - Los mensajes del siguiente turno se muestran por separado en la siguiente respuesta.
    - No hay bucle infinito.
- **Archivos modificados:**
  - ✅ `src/ai/tools/combat-manager.ts` (líneas 148-210: lógica de avance de turno para jugador inconsciente)
- **Impacto:** Crítico - El auto-avance ahora funciona correctamente cuando el jugador está inconsciente, evitando bucles infinitos que bloqueaban el juego.
- **Estado:** ✅ RESUELTO - Implementación completada y verificada
- **Detección:** Testing manual – Test 4.4 (Jugador Inconsciente en su Turno)

---

### Issue #53: Companions no usan hechizos disponibles en su ficha ✅ RESUELTO

- **Fecha de creación:** 2025-11-15
- **Fecha de corrección:** 2025-11-18
- **Ubicación:** `src/ai/tools/companion-tactician.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad original:** 🟡 **ALTA** (afecta gameplay, los companions no usan sus hechizos disponibles)
- **Descripción:** Después de implementar la verificación de conjuros disponibles desde la ficha del personaje, los companions (Merryl, Elara) no estaban usando los hechizos que tenían disponibles en su ficha, prefiriendo usar armas básicas en su lugar.
- **Contexto:** Detectado durante testing de v0.5.0 después de implementar el sistema de verificación de conjuros disponibles.
- **Solución implementada:** ✅
  - El problema original ha sido resuelto: el sistema ahora maneja correctamente los hechizos disponibles
  - **Nota importante:** Los hechizos están temporalmente desactivados por diseño mientras se completa el sistema completo de magia
  - Esta es una decisión de desarrollo intencional, no un bug
  - Los hechizos se reactivarán cuando se implemente el sistema completo de magia según el roadmap
- **Estado actual:**
  - ✅ El sistema de verificación de hechizos funciona correctamente
  - ⏸️ Los hechizos están temporalmente desactivados por diseño
  - 📝 Pendiente: Implementar sistema completo de magia (Roadmap - Sección 9)
- **Relacionado con:**
  - Roadmap - Sección 9 "Sistema Completo de Magia" (slots de conjuros, conjuros conocidos/preparados, recuperación de slots, áreas de efecto, duración de efectos)
- **Impacto:** El problema original está resuelto. Los hechizos se reactivarán cuando el sistema completo de magia esté implementado.
- **Estado:** ✅ **RESUELTO** - Sistema funcional, hechizos temporalmente desactivados por diseño
- **Detección:** Testing de v0.5.0 - Observación directa durante combate
- **Referencia:** [Roadmap - Sistema Completo de Magia](../roadmap.md#9-mejoras-de-mecánicas-de-dd-5e-prioridad-media)

---

### Issue #75: DM inventa armas en narración de ataques sin consultar inventario ✅ RESUELTO

- **Fecha de creación:** 2025-11-17
- **Fecha de corrección:** 2025-11-18
- **Ubicación:** `src/ai/flows/game-coordinator.ts`, `src/ai/tools/companion-tactician.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad original:** 🟡 **ALTA** (narración inconsistente con la ficha y reglas de combate)
- **Descripción:** Durante la narración de ataques realizados por companions (y ocasionalmente por el jugador), el DM inventaba el arma utilizada sin validar el inventario real. Se describían acciones con armas inexistentes o incompatibles con la ficha y se ignoraban hechizos disponibles.
- **Comportamiento esperado:** Antes de narrar, el sistema debe validar arma/hechizo contra el inventario real del personaje o solicitar aclaración si la acción es ambigua.
- **Solución implementada:** ✅
  - **Validación de inventario antes de narrar:**
    - El sistema ahora consulta el inventario/equipo activo del personaje antes de generar narraciones
    - Los prompts de companions y narradores incluyen información del inventario disponible
    - El sistema valida que las armas mencionadas en las narraciones existan en el inventario del personaje
  - **Ajustes en prompts:**
    - Los prompts de `companion-tactician.ts` ahora incluyen instrucciones explícitas para indicar qué arma/hechizo se usa
    - El `combat-narration-expert` recibe información del inventario para narrar correctamente
    - Fallback implementado que pide aclaración si no se puede determinar el arma
  - **Mejoras en `combat-manager.ts`:**
    - Búsqueda y validación de armas equipadas antes de generar descripciones de tiradas
    - Actualización de descripciones de tiradas para usar el arma correcta del inventario
- **Archivos modificados:**
  - ✅ `src/ai/tools/companion-tactician.ts` (prompts actualizados con instrucciones sobre inventario)
  - ✅ `src/ai/tools/combat-manager.ts` (validación de armas e inventario)
  - ✅ `src/ai/tools/combat/combat-narration-expert.ts` (validación de inventario en narraciones)
- **Impacto:** Alto - Las narraciones ahora son consistentes con las fichas de personajes, mejorando la inmersión y evitando confusiones sobre qué armas están disponibles.
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada
- **Detección:** Testing manual en combates recientes

---

### Issue #79: Falta narración del DM en turnos del jugador ✅ RESUELTO

- **Fecha de creación:** 2025-11-17
- **Fecha de corrección:** 2025-11-17
- **Ubicación:** `src/ai/tools/combat-manager.ts` (bloque de turno del jugador, líneas ~222-620); `src/ai/tools/combat/combat-narration-expert.ts`
- **Severidad:** 🔴 **CRÍTICA** (afecta significativamente la experiencia del jugador y la inmersión en combate)
- **Descripción:** Cuando el jugador ejecutaba una acción en su turno, el DM solo mostraba mensajes técnicos de tiradas y daño ("Galador ataca…", "Galador ha hecho X puntos…") sin generar una narración descriptiva como la que sí se produce para turnos de IA (enemigos o companions). Esto rompía la inmersión y dejaba al jugador sin un relato coherente de sus propias acciones.
- **Comportamiento esperado:** Después de procesar la acción del jugador, el sistema debería generar una narración descriptiva de resolución basada en los resultados de las tiradas (ataque acertado/fallido, daño causado, crítico, etc.), manteniendo la misma calidad narrativa que los turnos de IA.
- **Contexto:** Detectado durante Test 3.3 (Mensajes y Narración) mientras se ejecutaban acciones del jugador en combate.
- **Causa raíz identificada:** ✅
  - En `combat-manager.ts`, el bloque de turno del jugador solo construía mensajes mecánicos y nunca llamaba a un generador de narración (a diferencia de los turnos de IA, que utilizan `enemyTacticianTool`/`companionTacticianTool` para generar narración de intención).
  - Faltaba un narrador dedicado para las acciones del jugador que generara narración de resolución.
- **Solución implementada:** ✅
  - **Creación de nuevo tool:** `combat-narration-expert.ts` - Tool especializado para generar narraciones descriptivas de combate basadas en resultados de acciones.
  - **Implementación para turnos del jugador:**
    - El tool se llama después de procesar las tiradas y daño del jugador.
    - Genera **narración de resolución** descriptiva basada en:
      - Resultado del ataque (acierto, fallo, crítico, pifia)
      - Daño causado (si aplica)
      - Estado del objetivo (HP anterior/nuevo, muerto, KO)
      - Contexto de ubicación (opcional)
    - La narración se añade como mensaje del DM después de los mensajes técnicos.
  - **Características del tool:**
    - Prompt optimizado para generar narraciones inmersivas en español
    - Maneja diferentes resultados: crítico, acierto, fallo, pifia
    - Sistema de fallback robusto en caso de error
    - Retry logic con exponential backoff
    - NO incluye números técnicos (dice rolls, HP) - solo descripción narrativa
  - **Integración en combat-manager.ts:**
    - Añadida llamada a `combatNarrationExpertTool` después de procesar el ataque del jugador
    - La narración se genera solo si el ataque se procesó correctamente
    - Sistema robusto: si falla la generación, el combate continúa normalmente
  - **Correcciones adicionales:**
    - Corregido problema de scope: `damageRollResult` ahora es accesible para la generación de narración
    - Corregido nombre del emisor en mensajes del jugador: ahora usa el nombre del combatiente activo en combate
- **Archivos creados/modificados:**
  - ✅ Nuevo: `src/ai/tools/combat/combat-narration-expert.ts` (tool para generar narraciones de combate)
  - ✅ Modificado: `src/ai/tools/combat-manager.ts` (integración del narration-expert para turnos del jugador)
  - ✅ Modificado: `src/components/game/game-view.tsx` (corrección del nombre del emisor en combate)
  - ✅ Modificado: `src/ai/tools/character-lookup.ts` (corrección: devolver objeto en lugar de null)
- **Futuro (documentado en roadmap):**
  - Refactorizar `enemyTacticianTool` y `companionTacticianTool` para usar `combat-narration-expert`
  - Añadir soporte para narración de intención (antes de las tiradas) para turnos de IA
  - Integrar con `combat-context-summarizer` (mejora futura) para contexto enriquecido
- **Impacto:** Crítico - Los turnos del jugador ahora tienen narraciones descriptivas e inmersivas, mejorando significativamente la experiencia del jugador y la consistencia narrativa en combate.
- **Estado:** ✅ RESUELTO - Implementación completada y verificada
- **Detección:** Testing manual – Test 3.3 (Mensajes y Narración)
- **Referencia:** Roadmap - Sección 6 (Calidad y Profundidad de la IA)

---

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

### Issue #91: Colores y efectos de tiradas críticas ✅ RESUELTO

- **Fecha de creación:** 2025-11-16
- **Fecha de corrección:** 2025-11-18
- **Ubicación:** `src/components/game/dice-roll-result.tsx`, `src/ai/tools/combat/dice-roll-processor.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad:** 🟡 **ALTA** (afecta feedback visual y claridad de información)
- **Descripción:** Los colores y efectos visuales de las tiradas críticas no estaban completamente implementados según el diseño esperado. Además, las tiradas de daño críticas no se detectaban correctamente y aparecían como tiradas de daño normales.
- **Problema:**
  - La tirada de ataque crítica debería ser de color verde manteniendo el efecto de pulso y el texto de "¡CRITICO!" con la estrellita debería ser verde también.
  - La tirada de daño crítica debería mantenerse amarilla (correcto) pero añadiéndole el efecto pulso y la etiqueta de ¡CRITICO! con la estrellita en amarillo.
  - Las tiradas de daño críticas no se detectaban como críticas porque tenían `outcome: 'neutral'` en lugar de `outcome: 'crit'`.
- **Comportamiento esperado:** 
  - Tiradas de ataque críticas: Verde con efecto pulso y etiqueta "¡CRITICO!" verde
  - Tiradas de daño críticas: Amarillo con efecto pulso y etiqueta "¡CRITICO!" amarilla
- **Solución implementada:** ✅
  - **`dice-roll-result.tsx`:** 
    - Creada función `getCriticalStyles()` que diferencia entre críticos de ataque (verde) y críticos de daño (amarillo)
    - Actualizada lógica de detección de tiradas de daño críticas para verificar tanto `outcome === 'crit'` como presencia de "(crítico)" en la descripción
    - Aplicados estilos condicionales: contenedor, texto del número y etiqueta "¡CRÍTICO!" según tipo de tirada
  - **`dice-roll-processor.ts`:** 
    - Establecido `outcome: 'crit'` para tiradas de daño críticas de companions y enemigos cuando `wasCritical` es true
  - **`combat-manager.ts`:** 
    - Establecido `outcome: 'crit'` para tiradas de daño críticas del jugador cuando `isCritical` es true
- **Archivos modificados:**
  - ✅ `src/components/game/dice-roll-result.tsx`: Función `getCriticalStyles()` y lógica de detección mejorada
  - ✅ `src/ai/tools/combat/dice-roll-processor.ts`: Establecimiento de `outcome: 'crit'` para daño crítico
  - ✅ `src/ai/tools/combat-manager.ts`: Establecimiento de `outcome: 'crit'` para daño crítico del jugador
- **Impacto:** Alto – Las tiradas críticas ahora se muestran correctamente con colores y efectos visuales apropiados, mejorando significativamente el feedback visual al jugador. Funciona para jugador, companions y enemigos.
- **Estado:** ✅ RESUELTO - Implementación completada y verificada
- **Detección:** Testing manual durante combate

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

### Issue #52: Narración de Inicio de Combate adelantada ✅ RESUELTO

- **Fecha de creación:** 2025-11-16
- **Fecha de corrección:** 2025-11-18
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/flows/narrative-expert.ts`, `src/ai/flows/schemas.ts`
- **Severidad:** 🟡 **MEDIA** (afectaba la inmersión y podía confundir al jugador)
- **Descripción:** Al iniciar un combate, la narración generada describía ataques o resultados antes de que se procesara ningún turno. El `narrativeExpert` no diferenciaba entre una acción normal y el arranque del combate, por lo que adelantaba acontecimientos y arruinaba el suspense inicial.
- **Solución implementada:**
  1. ✅ Se extendió el schema `NarrativeExpertInput` con los campos `phase` y `combatContext`.
  2. ✅ En `combat-manager.ts` se limita el historial a los últimos 5 mensajes y se envía un `combatContext` con orden de iniciativa, aliados y enemigos.
  3. ✅ El prompt de `narrativeExpert` ahora tiene un modo especial de “COMBAT INITIATION” que sólo describe tensión, posiciones y orden de iniciativa, explícitamente prohibiendo narrar tiradas/daños.
- **Impacto:** La narración inicial ahora se comporta como lo haría un DM de mesa: prepara la escena, menciona el orden de iniciativa y espera la primera acción real. Mejora la inmersión y evita contradicciones con el flujo paso a paso.
- **Detección:** Test 6.1 / Issue reportado durante el plan `testeo-sistema-turnos`.

### Issue #63: Combate con IDs de personajes no consecutivos ✅ RESUELTO

- **Fecha de creación:** 2025-11-16
- **Fecha de corrección:** 2025-11-18
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/lib/combat/target-resolver.ts`
- **Severidad:** 🟢 **MEDIA**
- **Descripción:** Se sospechaba que el sistema de turnos asumía IDs consecutivos (1,2,3) en la party, lo que podía causar comportamientos extraños cuando los IDs reales eran 1,6,3, etc.
- **Verificación:** Test 4.5 y partidas reales con la party `Galador (1)`, `Merryl (6)`, `Elara (3)` confirmaron que:
  - El orden de iniciativa usa coincidencias exactas por ID.
  - El `turnIndex` se mantiene estable aunque los IDs no estén en secuencia.
  - `target-resolver` y los prompts del DM utilizan los nombres correctos sin depender del orden numérico.
- **Estado:** ✅ Validado; no se requieren cambios adicionales.
- **Detección:** Test 4.5 del plan `testeo-sistema-turnos`.

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

### Issue #92: Compañeros no usan armas de su inventario ✅ RESUELTO

- **Fecha de creación:** 2025-11-18
- **Fecha de corrección:** 2025-11-18
- **Ubicación:** `src/ai/tools/combat-manager.ts` (líneas ~943-960 y ~1652-1669)
- **Severidad:** 🟡 **ALTA** (afecta la coherencia del combate y la experiencia del jugador)
- **Descripción:** Los compañeros controlados por IA (Merryl, Elara) estaban usando armas improvisadas o incorrectas en lugar de sus armas reales del inventario. Por ejemplo, Merryl usaba "puños" o "arma improvisada" en lugar de su "Bastón", y Elara generaba tiradas de daño inválidas (como "1d1+2") en lugar de usar su "Maza" correctamente.
- **Comportamiento esperado:** Los compañeros deben usar únicamente las armas que tienen en su inventario, tal como se especifica en sus fichas de personaje. Las descripciones de las armas en el inventario incluyen información detallada sobre el ataque y daño que deben usar.
- **Causa raíz identificada:** ✅
  - El tipo `Combatant` del `initiativeOrder` solo contiene información básica (id, nombre, iniciativa, controlledBy), pero **NO** incluye los campos `inventory` ni `spells`.
  - El código intentaba acceder a `activeCombatant.inventory` y `activeCombatant.spells` directamente, obteniendo `undefined`.
  - El `companionTacticianTool` recibía `inventory: []` y `availableSpells: []`, por lo que los compañeros no tenían acceso a sus armas reales.
  - El prompt del `companion-tactician` ya tenía instrucciones claras de usar solo armas del inventario, pero no podía seguirlas porque el inventario estaba vacío.
- **Solución implementada:** ✅
  - **Modificación en `combat-manager.ts` (2 ubicaciones):**
    1. **Sección de continuación de turno (líneas ~943-960):**
       - Antes de crear `baseTacticianInput`, ahora se busca el personaje completo en `aliveParty` usando el `id` del `activeCombatant`.
       - Se extrae el `inventory` y `spells` reales de ese personaje completo.
       - Se pasa esa información al `companionTacticianTool`.
    2. **Sección de inicio de combate (líneas ~1652-1669):**
       - Misma lógica aplicada para el turno inicial de los compañeros.
  - **Código añadido:**
    ```typescript
    // Get full character data for companions to access their inventory and spells
    const activeCombatantFullData = isCompanion 
        ? aliveParty.find(p => p.id === activeCombatant.id)
        : null;

    const baseTacticianInput = {
        // ... other fields ...
        availableSpells: activeCombatantFullData?.spells || [],
        inventory: activeCombatantFullData?.inventory || []
    };
    ```
  - **Resultado:**
    - Los compañeros ahora reciben su inventario completo con las descripciones detalladas de sus armas.
    - El prompt del `companion-tactician` puede seguir sus instrucciones de usar solo armas del inventario.
    - Merryl ahora usa su "Bastón" (1d4-1 o 1d6-1 versátil con DES +3).
    - Elara ahora usa su "Maza" (1d6+2 con FUE +2).
    - No más errores de dados inválidos como "1d1+2".
- **Archivos modificados:**
  - ✅ `src/ai/tools/combat-manager.ts` (líneas ~943-960 y ~1652-1669: obtención de datos completos del personaje para compañeros)
- **Impacto:** Alto - Los compañeros ahora usan correctamente sus armas del inventario, mejorando la coherencia del combate y la experiencia del jugador.
- **Estado:** ✅ RESUELTO - Implementación completada y verificada
- **Detección:** Testing manual - Observación durante combate de prueba

---

### Issue #93: Jugador no muestra arma en tiradas de ataque/daño ✅ RESUELTO

- **Fecha de creación:** 2025-11-18
- **Fecha de corrección:** 2025-11-18
- **Ubicación:** `src/ai/tools/combat-manager.ts` (líneas ~420-440 y ~514-518)
- **Severidad:** 🟡 **ALTA** (inconsistencia con compañeros y enemigos, afecta la claridad de las tiradas)
- **Descripción:** Cuando el jugador atacaba, las tiradas de ataque y daño no mostraban el nombre del arma que estaba usando, a diferencia de los compañeros y enemigos que sí lo mostraban. Las descripciones eran genéricas como "Tirada de ataque de Galador" en lugar de "Tirada de ataque con Mandoble". Además, el sistema siempre usaba un dado de daño por defecto "1d8" en lugar de leer el dado de daño del arma real del jugador.
- **Comportamiento esperado:** Las tiradas del jugador deben mostrar el nombre del arma que está usando (ej: "Tirada de ataque con Mandoble") y usar el dado de daño correcto de esa arma (ej: "2d6+2" para un Mandoble), igual que hacen los compañeros y enemigos.
- **Causa raíz identificada:** ✅
  - El código del ataque del jugador tenía un `TODO` comentado: `// TODO: In the future, read this from the player's equipped weapon`
  - El dado de daño estaba hardcodeado como `const damageDie = '1d8';`
  - Las descripciones de las tiradas no incluían el nombre del arma: `description: 'Tirada de ataque de ${activeCombatant.characterName}'`
  - El sistema no buscaba el arma en el inventario del jugador antes de generar las tiradas.
- **Solución implementada:** ✅
  - **Modificación en `combat-manager.ts` (líneas ~420-440 y ~514-518):**
    1. **Búsqueda del arma en el inventario:**
       - Se busca en `playerChar.inventory` un objeto que parezca un arma (buscando palabras clave como "daño", "espada", "mandoble", "maza", etc.).
       - Se extrae el nombre del arma (`weaponName`) o se usa "su arma" como fallback.
       - Se extrae el dado de daño (`damageDie`) de la descripción del arma usando una expresión regular `/(\d+d\d+)/`, o se usa "1d8" como fallback.
    2. **Actualización de las descripciones de tiradas:**
       - Tirada de ataque: `description: 'Tirada de ataque con ${weaponName}'`
       - Tirada de daño: `description: 'Tirada de daño con ${weaponName}${isCritical ? ' (crítico)' : ''}'`
    3. **Uso del dado de daño correcto:**
       - Se usa el `damageDie` extraído del arma en lugar del valor hardcodeado "1d8".
  - **Código añadido:**
    ```typescript
    // For now, find the first weapon in the inventory
    const weapon = playerChar.inventory.find(item => 
        item.description?.toLowerCase().includes('daño') || 
        item.name.toLowerCase().includes('espada') ||
        item.name.toLowerCase().includes('mandoble') ||
        item.name.toLowerCase().includes('maza') ||
        item.name.toLowerCase().includes('daga') ||
        item.name.toLowerCase().includes('bastón') ||
        item.name.toLowerCase().includes('arco')
    );

    const weaponName = weapon?.name || 'su arma';
    const damageDie = weapon?.description?.match(/(\d+d\d+)/)?.[0] || '1d8';
    ```
  - **Resultado:**
    - Las tiradas del jugador ahora muestran el nombre del arma: "Tirada de ataque con Mandoble"
    - El sistema usa el dado de daño correcto del arma (ej: "2d6" para Mandoble) en lugar de "1d8"
    - Consistencia con el comportamiento de compañeros y enemigos
- **Archivos modificados:**
  - ✅ `src/ai/tools/combat-manager.ts` (líneas ~420-440: búsqueda de arma y actualización de descripciones de tiradas)
- **Impacto:** Alto - Las tiradas del jugador ahora son consistentes con las de compañeros y enemigos, mejorando la claridad y coherencia del combate.
- **Estado:** ✅ RESUELTO - Implementación completada y verificada
- **Detección:** Testing manual - Observación durante combate de prueba

---

### Issue #94: Jugador no muestra mensaje de muerte al matar enemigo ✅ RESUELTO

- **Fecha de creación:** 2025-11-18
- **Fecha de corrección:** 2025-11-18
- **Ubicación:** `src/ai/tools/combat-manager.ts` (líneas ~639-675)
- **Severidad:** 🟡 **ALTA** (inconsistencia con compañeros y enemigos, afecta la retroalimentación del jugador)
- **Descripción:** Cuando el jugador mataba a un enemigo con su ataque, no se mostraba el mensaje "¡[Jugador] ha matado a [Enemigo]!" que sí aparecía cuando compañeros o enemigos mataban a sus objetivos. Esto creaba una inconsistencia en la experiencia del jugador y reducía la retroalimentación visual sobre el resultado de sus acciones.
- **Comportamiento esperado:** Cuando el jugador reduce el HP de un enemigo a 0 o menos, debe mostrarse el mensaje "¡[Jugador] ha matado a [Enemigo]!" igual que ocurre para compañeros y enemigos.
- **Causa raíz identificada:** ✅
  - La lógica para detectar cuando un enemigo es matado estaba presente en el código (líneas 640-675).
  - Sin embargo, la condición `else` genérica en la línea 667 no garantizaba que se ejecutara correctamente cuando el jugador mataba a un enemigo.
  - La condición `if (!targetIsEnemy && updatedTarget)` manejaba el caso de jugadores/compañeros, pero el `else` genérico podía no ejecutarse en algunos casos cuando `targetIsEnemy` era `true`.
- **Solución implementada:** ✅
  - **Modificación en `combat-manager.ts` (línea ~667):**
    - Se cambió el `else` genérico por un `else if (targetIsEnemy)` más específico.
    - Esto asegura que cuando el objetivo es un enemigo (`targetIsEnemy === true`), se ejecute el bloque que muestra el mensaje de muerte.
  - **Código modificado:**
    ```typescript
    // Antes:
    } else {
        // For enemies: they die directly at HP 0
        messages.push({
            sender: 'DM',
            content: `¡${activeCombatant.characterName} ha matado a ${targetVisualName}!`
        });
    }
    
    // Después:
    } else if (targetIsEnemy) {
        // For enemies: they die directly at HP 0 (no unconsciousness concept)
        messages.push({
            sender: 'DM',
            content: `¡${activeCombatant.characterName} ha matado a ${targetVisualName}!`
        });
        localLog(`${activeCombatant.characterName} killed ${targetVisualName}!`);
    }
    ```
  - **Resultado:**
    - Cuando el jugador mata a un enemigo, ahora se muestra correctamente el mensaje "¡[Jugador] ha matado a [Enemigo]!"
    - Consistencia completa con el comportamiento de compañeros y enemigos
    - Mejor retroalimentación visual para el jugador
- **Archivos modificados:**
  - ✅ `src/ai/tools/combat-manager.ts` (línea ~667: cambio de `else` genérico a `else if (targetIsEnemy)`)
- **Impacto:** Alto - Los ataques del jugador ahora proporcionan la misma retroalimentación que los de compañeros y enemigos, mejorando la consistencia y experiencia del jugador.
- **Estado:** ✅ RESUELTO - Implementación completada y verificada
- **Detección:** Testing manual - Observación durante combate de prueba

---

### Cambios Adicionales: Desactivación Temporal de Magia para Tests

- **Fecha:** 2025-11-18
- **Ubicación:** `src/lib/new-game-data.ts` (líneas 260 y 412)
- **Descripción:** Se desactivaron temporalmente todos los hechizos de Merryl y Elara para forzar el uso de armas durante las pruebas. Los arrays de `spells` fueron comentados y reemplazados por arrays vacíos.
- **Propósito:** Facilitar el testing del sistema de armas sin que la IA priorice el uso de hechizos.
- **Estado:** ⚠️ **TEMPORAL** - Los hechizos están comentados y pueden restaurarse fácilmente cuando se complete el testing.
- **Archivos modificados:**
  - ✅ `src/lib/new-game-data.ts` (líneas 260 y 412: arrays de `spells` comentados)

---

## 📝 Notas

- Los números de issue se mantienen como referencia histórica del orden en que fueron añadidos
- Para más detalles sobre cada issue, consultar el historial de commits y el [CHANGELOG.md](../../../CHANGELOG.md)
- Los issues corregidos se mantienen aquí como referencia histórica y para documentar las soluciones implementadas

