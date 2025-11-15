# Issues Pendientes

Issues que aún no han sido resueltos y requieren atención. Ordenados por prioridad (PMA → PA → PM → PB → PMB).

**Total:** 23 issues  
**Última actualización:** 2025-11-15

---

## 🔴 Prioridad Muy Alta (PMA) - Críticos

*(Ningún issue crítico pendiente actualmente)*

---

## 🟡 Prioridad Alta (PA) - Advertencias

### Issue #50: Daño de crítico no se duplica correctamente 🟡 ADVERTENCIA

- **Fecha de creación:** 2025-11-15
- **Ubicación:** `src/ai/tools/combat-manager.ts`
- **Severidad:** 🟡 **ALTA** (afecta mecánicas de combate, reduce efectividad de críticos)
- **Descripción:** Cuando un jugador hace un crítico, el daño no se duplica correctamente según las reglas de D&D 5e.
- **Contexto:** Detectado durante Test 15 (Sistema de Inconsciencia y Muerte - Personajes Muertos No Pueden Ser Curados).
- **Problema:**
  - El jugador hace un crítico (rollTotal=22, outcome=crit)
  - El daño aplicado es solo 5 puntos (1d8+2 = 5)
  - En D&D 5e, un crítico debería duplicar los **dados de daño**, no el total
  - Ejemplo correcto: Si normalmente haces `1d8+2`, en crítico deberías hacer `2d8+2`
- **Regla D&D 5e:** En un crítico, se tiran el doble de dados de daño, pero el modificador se aplica solo una vez.
- **Archivos involucrados:**
  - `src/ai/tools/combat-manager.ts`: Líneas 362-366 (generación de daño de jugador)
- **Impacto:** Alto - Los críticos no son tan efectivos como deberían, reduciendo la emoción y efectividad del combate
- **Estado:** 📝 **PENDIENTE**
- **Prioridad de corrección:** Alta
- **Detección:** Testing de v0.5.0 - Test 15

---

### Issue #51: Mensaje "ha matado" incorrecto cuando personaje ya estaba inconsciente 🟡 ADVERTENCIA

- **Fecha de creación:** 2025-11-15
- **Ubicación:** `src/ai/tools/combat/dice-roll-processor.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad:** 🟡 **ALTA** (afecta narrativa y reglas de D&D 5e, confunde al jugador)
- **Descripción:** Cuando un personaje ya está inconsciente (HP 0) y recibe daño adicional, el sistema muestra "ha matado" incluso cuando el daño no es suficiente para muerte masiva y el personaje puede ser curado después.
- **Contexto:** Detectado durante Test 15 (Sistema de Inconsciencia y Muerte - Personajes Muertos No Pueden Ser Curados).
- **Problema:**
  - Merryl está inconsciente (HP 0, `isDead: false`)
  - El jugador ataca a Merryl con un crítico
  - El daño aplicado es 5 puntos (previousHP=0, newHP=0)
  - El sistema muestra "¡Galador ha matado a Merryl!"
  - Sin embargo, Elara puede curar a Merryl después, lo que significa que NO está muerta
  - El daño adicional (5) no es suficiente para muerte masiva (necesitaría >= HP máximo de Merryl)
- **Análisis del código:**
  - En `dice-roll-processor.ts` línea 374: `if (targetKilled)` se evalúa cuando `newHP <= 0`
  - En línea 380: Se verifica `targetIsDead` pero el problema es que cuando el target ya estaba en 0 HP, el mensaje se genera antes de verificar muerte masiva
  - En `combat-manager.ts` líneas 404-438: La lógica de muerte masiva solo se aplica cuando `targetHP > 0`, no cuando ya está en 0 HP
- **Solución propuesta:**
  - Cuando un personaje ya está en 0 HP y recibe daño adicional, verificar si el daño restante es >= HP máximo para determinar muerte masiva
  - Si no es muerte masiva, mostrar "ha dejado inconsciente" o no mostrar mensaje de muerte si ya estaba inconsciente
  - Solo mostrar "ha matado" si realmente se produce muerte masiva
- **Archivos involucrados:**
  - `src/ai/tools/combat/dice-roll-processor.ts`: Lógica de mensajes de muerte/inconsciencia
  - `src/ai/tools/combat-manager.ts`: Lógica de aplicación de daño y muerte masiva
- **Impacto:** Alto - Confunde al jugador sobre el estado real del personaje (muerto vs inconsciente), rompe la narrativa y las reglas de D&D 5e
- **Estado:** 📝 **PENDIENTE**
- **Prioridad de corrección:** Alta
- **Detección:** Testing de v0.5.0 - Test 15

### Issue #53: Companions no usan hechizos disponibles en su ficha 🟡 ADVERTENCIA

- **Fecha de creación:** 2025-11-15
- **Ubicación:** `src/ai/tools/companion-tactician.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad:** 🟡 **ALTA** (afecta gameplay, los companions no usan sus hechizos disponibles)
- **Descripción:** Después de implementar la verificación de conjuros disponibles desde la ficha del personaje, los companions (Merryl, Elara) no están usando los hechizos que tienen disponibles en su ficha, prefiriendo usar armas básicas en su lugar.
- **Contexto:** Detectado durante testing de v0.5.0 después de implementar el sistema de verificación de conjuros disponibles.
- **Problema:**
  - Merryl tiene hechizos disponibles (Rayo de escarcha, Dardo mágico, etc.) pero el sistema dice "Sin hechizos a mano" y usa su bastón
  - Elara tiene hechizos disponibles (Llama sagrada, Escudo de fe, etc.) pero no los está usando
  - El sistema está pasando correctamente los conjuros en `availableSpells`, pero la IA no los está utilizando
- **Posibles causas:**
  1. El prompt puede estar siendo demasiado restrictivo o confuso sobre cuándo usar hechizos
  2. La lista de conjuros puede no estar mostrándose correctamente en el prompt
  3. La IA puede estar interpretando incorrectamente las instrucciones sobre priorizar la ficha
  4. Puede haber un problema con cómo se están pasando los conjuros desde `combat-manager.ts`
- **Archivos involucrados:**
  - `src/ai/tools/companion-tactician.ts`: Prompt y lógica de decisión de acciones
  - `src/ai/tools/combat-manager.ts`: Paso de `availableSpells` al tool
- **Impacto:** Alto - Los companions no utilizan sus capacidades mágicas, reduciendo su efectividad en combate y la variedad de acciones
- **Estado:** 📝 **PENDIENTE**
- **Prioridad de corrección:** Alta
- **Detección:** Testing de v0.5.0 - Observación directa durante combate

---

### Issue #35: Orden incorrecto de mensajes cuando personaje cae a 0 HP 🟡 ADVERTENCIA

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/ai/tools/combat/dice-roll-processor.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad:** 🟡 ALTA (afecta narrativa, secuencia ilógica)
- **Descripción:** Cuando un personaje cae a 0 HP, los mensajes de inconsciencia aparecen en orden incorrecto, y además el mensaje "ha matado" es incorrecto (debería ser "ha dejado inconsciente").
- **Secuencia actual (incorrecta):**
  1. Narración del orco
  2. "Orco 1 ataca a Merryl y acierta (18 vs AC 13)."
  3. ❌ **"Merryl cae inconsciente."** (PREMATURO)
  4. "Orco 1 ha hecho 10 puntos de daño a Merryl (8 → 0 HP)."
  5. ❌ **"¡Orco 1 ha matado a Merryl!"** (INCORRECTO - debería ser "ha dejado inconsciente")
- **Secuencia esperada (correcta):**
  1. Narración del orco
  2. "Orco 1 ataca a Merryl y acierta (18 vs AC 13)."
  3. "Orco 1 ha hecho 10 puntos de daño a Merryl (8 → 0 HP)."
  4. ✅ **"¡Orco 1 ha dejado inconsciente a Merryl!"** (DESPUÉS del daño, mensaje correcto)
  5. ✅ **"Merryl cae inconsciente."** (DESPUÉS del mensaje anterior)
- **Impacto:** Alto (rompe inmersión, confunde al jugador sobre qué pasó primero, mensaje incorrecto confunde reglas de D&D 5e)
- **Solución propuesta:**
  - Mover los mensajes de inconsciencia para que se generen DESPUÉS del mensaje de daño
  - Corregir el mensaje "ha matado" a "ha dejado inconsciente" cuando `isDead !== true`
  - Ajustar el orden de generación de mensajes en `dice-roll-processor.ts`
- **Archivos afectados:**
  - `src/ai/tools/combat/dice-roll-processor.ts`
  - `src/ai/tools/combat-manager.ts`
- **Estado:** 📝 **PENDIENTE**
- **Relacionado con:** Issue #36 (mensaje "ha matado" incorrecto)
- **Detección:** Testing de refactorización `combat-manager.ts`

---

### Issue #36: Mensaje "ha matado" cuando personaje está inconsciente, no muerto 🟡 ADVERTENCIA

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/ai/tools/combat/dice-roll-processor.ts`
- **Severidad:** 🟡 ALTA (narrativa incorrecta, confunde reglas de D&D 5e)
- **Descripción:** Cuando un personaje cae a 0 HP (sin muerte masiva), el sistema muestra "¡Orco 1 ha matado a Merryl!" cuando debería decir "¡Orco 1 ha dejado inconsciente a Merryl!". Según las reglas de D&D 5e, un personaje a 0 HP está **inconsciente**, no muerto (a menos que se aplique la regla de muerte masiva).
- **Ejemplo del bug:**
  ```
  DM: "Orco 1 ha hecho 10 puntos de daño a Merryl (8 → 0 HP)."
  DM: "¡Orco 1 ha matado a Merryl!" ❌ INCORRECTO (Merryl está inconsciente, no muerto)
  ```
- **Causa raíz:** El código en `dice-roll-processor.ts` (línea ~487) muestra el mensaje "ha matado" cuando `targetKilled = true`, pero no distingue entre muerte real (`isDead === true`) e inconsciencia (`hp.current <= 0`).
- **Solución propuesta:**
  - Verificar el campo `isDead` del personaje después de aplicar daño
  - Si `isDead === true`: "ha matado"
  - Si `hp.current <= 0` pero `isDead !== true`: "ha dejado inconsciente"
- **Impacto:** Alto (confunde las reglas de D&D 5e, narrativa incorrecta)
- **Archivos afectados:**
  - `src/ai/tools/combat/dice-roll-processor.ts`
- **Estado:** 📝 **PENDIENTE**
- **Relacionado con:** Sistema de inconsciencia y muerte masiva (Issue #27)
- **Detección:** Testing de refactorización `combat-manager.ts`

---

### Issue #37: Mensaje "está muerto" cuando personaje está inconsciente 🟡 ADVERTENCIA

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/ai/tools/combat-manager.ts`
- **Severidad:** 🟡 ALTA (narrativa incorrecta, confunde reglas de D&D 5e)
- **Descripción:** Cuando un personaje inconsciente (HP 0, pero no muerto) intenta tomar su turno, el sistema muestra "Merryl está muerto y no puede actuar" cuando debería decir "Merryl está inconsciente y no puede actuar".
- **Ejemplo del bug:**
  ```
  DM: "Merryl está muerto y no puede actuar." ❌ INCORRECTO (Merryl está inconsciente)
  ```
- **Causa raíz:** El código que verifica si un combatiente puede tomar su turno no distingue entre muerte real (`isDead === true`) e inconsciencia (`hp.current <= 0`).
- **Solución propuesta:**
  - Verificar el campo `isDead` al inicio del turno
  - Si `isDead === true`: "está muerto y no puede actuar"
  - Si `hp.current <= 0` pero `isDead !== true`: "está inconsciente y no puede actuar"
- **Impacto:** Alto (confunde las reglas de D&D 5e, narrativa incorrecta)
- **Archivos afectados:**
  - `src/ai/tools/combat-manager.ts` (verificación de turno de combatiente muerto)
- **Estado:** 📝 **PENDIENTE**
- **Relacionado con:** Sistema de inconsciencia y muerte masiva (Issue #27), Issue #36
- **Detección:** Testing de refactorización `combat-manager.ts`

---

### Issue #34: AI de enemigos traduce/inventa nombres en narración en lugar de usar nombre exacto 🟡 ADVERTENCIA

- **Fecha de creación:** 2025-11-14
- **Fecha de corrección:** 2025-11-14
- **Ubicación:** `src/ai/tools/enemy-tactician.ts`
- **Severidad:** 🟡 ALTA (afecta narrativa, confunde al jugador)
- **Descripción:** Durante el combate, la AI de `enemyTacticianTool` generaba narrativas con nombres de criaturas traducidos o inventados (e.g., "Gnomo 1" en lugar de "Goblin 1"), mientras que el sistema internamente usaba el nombre correcto. Esto creaba inconsistencia entre la narración del enemigo y los mensajes del DM.
- **Ejemplo del bug:**
  ```
  DM: "El Gnomo 1, con una sonrisa maliciosa, arremete contra Merryl..."  [❌ Incorrecto]
  DM: "Goblin 1 ataca a Merryl, pero falla (10 vs AC 13)."               [✅ Correcto]
  ```
- **Causa raíz:** El prompt de `enemyTacticianTool` no instruía explícitamente a la AI para usar el nombre exacto del combatiente activo (`{{{activeCombatant}}}`), permitiendo que la AI tradujera o inventara nombres según su interpretación.
- **Solución implementada:**
  - Añadida instrucción explícita en el prompt (línea 62):  
    > "**CRITICAL: You MUST use EXACTLY the name "{{{activeCombatant}}}" when referring to this creature in your narration. DO NOT translate or change this name (e.g., if it's "Goblin 1", write "Goblin 1", NOT "Gnomo 1").**"
- **Detección:** Test 2 del plan de refactorización de `combat-manager.ts` (múltiples enemigos del mismo tipo)
- **Impacto:** Alto (narrativa inconsistente, rompe inmersión, confunde al jugador sobre qué criatura está actuando)
- **Archivos modificados:**
  - `src/ai/tools/enemy-tactician.ts` (prompt)
- **Estado:** ✅ **CORREGIDO** - Pendiente de re-test en Test 2
- **Relacionado con:** Plan de refactorización de `combat-manager.ts`
- **Referencia:** CHANGELOG [Unreleased]

---

### Issue #14: AI Tacticians (enemigos y companions) a veces devuelven output inválido/null en combate

- **Fecha de creación:** 2025-11-12
- **Ubicación:** `src/ai/tools/enemy-tactician.ts`, `src/ai/tools/companion-tactician.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad:** 🔴 ALTA (bloquea turnos completos de combatientes)
- **Descripción:** Durante el combate, tanto enemigos como companions a veces devuelven output nulo o inválido que falla la validación del schema de Genkit, causando que no realicen ninguna acción en su turno.
- **Problema identificado:**
  - Fallo de schema validation: El AI de Gemini devuelve output que no cumple con el schema
  - Posibles causas: AI no encuentra información en D&D API, prompts muy largos/complejos, filtros de seguridad
- **Mejoras implementadas (Fase 1):**
  - ✅ Añadido logging detallado en `companion-tactician.ts` para capturar input, respuesta y errores
- **Solución propuesta (Multi-fase):**
  - **Fase 2 (PENDIENTE):** Mejorar prompts (simplificar, hacer reglas más explícitas, añadir ejemplos)
  - **Fase 3 (PENDIENTE):** Validación y fallback inteligente (completar campos faltantes, generar acción básica válida)
  - **Fase 4 (PENDIENTE - OPCIONAL):** Refactoring de prompts (prompt chaining)
- **Archivos afectados:**
  - `src/ai/tools/enemy-tactician.ts`
  - `src/ai/tools/companion-tactician.ts`
  - `src/ai/tools/combat-manager.ts`
- **Estado:** 🔴 **EN INVESTIGACIÓN** - Logging implementado, esperando datos de diagnóstico para siguiente fase

---

## 🟢 Prioridad Media (PM) - Mejoras

### Issue #38: Auto-redirección de ataque a enemigo diferente cuando target está muerto 🟢 MEJORA / DECISIÓN DE DISEÑO

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/ai/flows/action-interpreter.ts` o `src/lib/combat/target-resolver.ts`
- **Severidad:** 🟢 MEDIA (afecta jugabilidad, pero no rompe el juego)
- **Descripción:** Cuando el jugador intenta atacar a un enemigo que ya está muerto (e.g., "ataco a goblin1"), el sistema automáticamente **redirige el ataque** a otro enemigo vivo (e.g., "goblin-2") sin informar al jugador.
- **Comportamiento actual:**
  - Jugador: "Ataco a goblin1" (goblin1 está muerto)
  - Sistema: [Redirige silenciosamente a goblin-2]
  - DM: "Atacas a Goblin 2 y aciertas..."
- **Problema:** El jugador podría querer:
  - Examinar el cadáver del goblin1
  - Saquear el cadáver
  - Hacer algo específico con el goblin1 muerto
  - Saber que su target está muerto antes de desperdiciar un ataque
- **Opciones de diseño:**
  1. **Opción A (actual):** Auto-redirección silenciosa a enemigo vivo
     - ✅ Ventaja: No desperdicia turnos
     - ❌ Desventaja: Confuso, quita control al jugador
  2. **Opción B:** Informar al jugador y pedir confirmación
     - DM: "Goblin 1 ya está muerto. ¿Quieres atacar a otro enemigo? (Goblin 2, Orco 1)"
     - ✅ Ventaja: Claridad, más control para el jugador
     - ❌ Desventaja: Requiere interacción adicional
  3. **Opción C:** Rechazar la acción y pedir nueva acción
     - DM: "Goblin 1 ya está muerto. ¿Qué quieres hacer?"
     - ✅ Ventaja: Máximo control para el jugador
     - ❌ Desventaja: Puede ser frustrante
- **Impacto:** Medio (afecta control del jugador, pero no rompe el juego)
- **Solución propuesta:** **Opción B** - Informar y pedir confirmación (similar a Issue #23 con múltiples enemigos)
- **Archivos afectados:**
  - `src/ai/flows/action-interpreter.ts` (lógica de fallback)
  - `src/lib/combat/target-resolver.ts` (resolución de target)
  - `src/ai/flows/game-coordinator.ts` (manejo de clarificaciones)
- **Estado:** 📝 **PENDIENTE** (decisión de diseño pendiente)
- **Relacionado con:** Issue #23 (clarificación de acciones ambiguas)
- **Detección:** Testing de refactorización `combat-manager.ts`

---

### Issue #6: Manejo de errores en `handleLoadAdventure`

- **Fecha de creación:** 2025-11-10
- **Ubicación:** `src/app/page.tsx`
- **Severidad:** Baja
- **Descripción:** El manejo de errores en `handleLoadAdventure` podría ser más específico, diferenciando entre errores de parseo JSON, errores de la IA, y errores de red.
- **Impacto:** Bajo (mejora la experiencia del usuario al mostrar mensajes más claros)
- **Solución propuesta:** Añadir diferentes mensajes de error según el tipo de error
- **Estado:** 📝 Pendiente (mejora opcional, no crítica)

### Issue #7: Advertencia de Content Security Policy sobre 'eval'

- **Fecha de creación:** 2025-11-10
- **Ubicación:** Consola del navegador
- **Severidad:** Baja (solo advertencia, no error)
- **Descripción:** Aparece el mensaje "Content Security Policy of your site blocks the use of 'eval' in JavaScript" en la consola del navegador.
- **Problema:** Este mensaje es común en Next.js en modo desarrollo debido a source maps y hot reloading. No afecta la funcionalidad.
- **Solución propuesta:** 
  - En desarrollo: Es normal y puede ignorarse
  - En producción: Next.js no debería mostrar este mensaje
  - Si persiste en producción, se puede configurar CSP headers en `next.config.js`
- **Estado:** 📝 Documentado (no crítico, comportamiento esperado en desarrollo)

### Issue #8: Fallos al cargar aventura desde JSON

- **Fecha de creación:** 2025-11-10
- **Ubicación:** `src/app/page.tsx`, función `handleLoadAdventure`
- **Severidad:** Baja (funcionalidad aún no implementada completamente)
- **Descripción:** Al intentar cargar una aventura desde un archivo JSON, se producen varios fallos.
- **Problema:** Esta funcionalidad aún no está completamente implementada según el usuario.
- **Impacto:** Bajo (funcionalidad en desarrollo)
- **Solución propuesta:** Implementar completamente la funcionalidad de carga de aventuras desde JSON cuando se desarrolle esta característica.
- **Estado:** 📝 Documentado (funcionalidad pendiente de implementación)

### Issue #15: Mejora de búsqueda en D&D API para monstruos no mapeados

- **Fecha de creación:** 2025-11-12
- **Ubicación:** `src/ai/tools/dnd-api-lookup.ts`
- **Severidad:** Baja
- **Descripción:** Cuando un monstruo, hechizo o equipo no está en el mapeo español→inglés, el sistema intenta buscar con el nombre normalizado (sin acentos), pero si el nombre está en español y no tiene equivalente directo, la búsqueda falla.
- **Problema:** 
  - El mapeo actual cubre monstruos comunes, pero no todos los posibles
  - Si un monstruo no está mapeado, se normaliza pero sigue siendo español
  - La API de D&D está en inglés, por lo que búsquedas en español generalmente fallan
- **Impacto:** Bajo (el sistema funciona, pero la IA puede no tener información precisa de algunos monstruos)
- **Solución propuesta:**
  - **Opción 1:** Expandir el mapeo manualmente (más trabajo, pero más preciso)
  - **Opción 2:** Implementar búsquedas parciales más flexibles
  - **Opción 3:** Usar IA para traducir nombres no mapeados antes de buscar
- **Estado:** 📝 Pendiente

### Issue #16: Gestión de nombres de múltiples monstruos debería estar en un módulo separado

- **Fecha de creación:** 2025-11-12
- **Ubicación:** `src/ai/tools/combat-manager.ts`
- **Severidad:** Media (mejora de arquitectura)
- **Descripción:** La gestión y unificación de nombres de múltiples monstruos del mismo tipo está actualmente mezclada con la lógica de combate en `combat-manager.ts`. Esta funcionalidad debería estar centralizada en un módulo dedicado que pueda ser reutilizado en narraciones del DM, combat manager, y narraciones de compañeros.
- **Problema:**
  - Separación de responsabilidades: `combat-manager.ts` debería enfocarse en la lógica de combate
  - Reutilización: La funcionalidad se necesita en múltiples lugares
  - Mantenibilidad: Un módulo separado sería más fácil de testear y depurar
- **Impacto:** Medio (mejora la arquitectura, mantenibilidad y consistencia del código)
- **Solución propuesta:**
  - Crear nuevo módulo `src/lib/monster-name-manager.ts`
  - Extraer funciones: `generateDifferentiatedNames()`, `normalizeNameForMatching()`, `escapeRegex()`, `replaceOrdinalReferences()`
  - Exportar funciones principales para uso en múltiples lugares
- **Archivos afectados:**
  - `src/ai/tools/combat-manager.ts` (extraer funciones)
  - Nuevo: `src/lib/monster-name-manager.ts`
- **Estado:** 📝 Pendiente (mejora de arquitectura, prioridad media)

### Issue #21: Código duplicado en `combat-manager.ts` para procesamiento de rolls (DEUDA TÉCNICA)

- **Fecha de creación:** 2025-11-13
- **Ubicación:** `src/ai/tools/combat-manager.ts`
- **Severidad:** Media (deuda técnica)
- **Descripción:** El procesamiento de dice rolls para AI combatants está duplicado en dos lugares: turnos normales (líneas 1241-1500) e iniciación de combate (líneas 2081-2340). Esta duplicación dificulta mantenimiento y causó que el fix del Issue #20 tuviera que aplicarse dos veces.
- **Problema:**
  - ~260 líneas de código duplicado
  - Cambios deben aplicarse en dos lugares
  - Riesgo de inconsistencias si solo se actualiza un lugar
- **Impacto:** Medio (afecta mantenibilidad, no funcionalidad)
- **Solución propuesta:** 
  - **Corto plazo:** Extraer función `processAICombatantRolls` como parte del refactoring mayor de `combat-manager.ts`
  - **Largo plazo:** Este issue será resuelto completamente en el [Plan de Refactorización del Módulo `combat-manager.ts`](../../planes-desarrollo/sin-comenzar/refactorizacion-combat-manager.md) (Fase 2.1)
- **Prioridad:** Media
- **Estimación:** 4-6 horas (si se hace de forma aislada) o incluido en refactorización mayor (31-45 horas)
- **Estado:** 📝 Pendiente (deuda técnica documentada, será resuelto en refactorización mayor)
- **Referencia:** [Plan de Refactorización](../../planes-desarrollo/sin-comenzar/refactorizacion-combat-manager.md)

### Issue #22: Sistema completo de Saving Throws (tiradas de salvación del objetivo) 🟡 FEATURE INCOMPLETA

- **Fecha de creación:** 2025-11-13
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/tools/enemy-tactician.ts`, `src/ai/tools/companion-tactician.ts`
- **Severidad:** Media (feature incompleta)
- **Descripción:** Los saving throw spells funcionan pero de forma simplificada. El daño se aplica automáticamente sin simular la tirada de salvación del objetivo (1d20+bonus vs Spell Save DC) ni aplicar la regla de mitad de daño si el target acierta.
- **Problema:**
  - Sistema actual funcional pero no 100% fiel a D&D 5e
  - Falta cálculo de Spell Save DC del lanzador
  - Falta tirada de salvación del objetivo
  - Falta regla de mitad de daño si acierta
- **Impacto:** Medio (afecta fidelidad a reglas de D&D 5e)
- **Solución propuesta:**
  - PASO 1: Lanzador declara hechizo → Target específico
  - PASO 2: Sistema calcula Spell Save DC del lanzador
  - PASO 3: Target tira salvación (automática, generada por el sistema)
  - PASO 4: Comparar resultado vs DC
  - PASO 5: Mostrar en panel de Tiradas con información completa
  - PASO 6: Aplicar daño completo o mitad según resultado
- **Prioridad:** Media
- **Estimación:** 9-12 horas
- **Estado:** 📝 Pendiente (feature incompleta, implementar después del refactoring de `combat-manager.ts`)

### Issue #28: Visualización de barra de vida en panel Grupo 🟡 ADVERTENCIA

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/components/game/` (componente del panel Grupo)
- **Severidad:** 🟡 **MEDIA** (bug visual)
- **Descripción:** En el panel Grupo, cuando un personaje está seleccionado, la visualización de la barra de vida no se muestra correctamente. El trozo de la barra que está vacío (HP perdido) no se ve bien.
- **Problema:**
  - Posible problema de CSS/styling cuando el personaje está seleccionado
  - La barra de vida puede tener un color de fondo que se confunde con el estado seleccionado
  - O el contraste no es suficiente para distinguir HP perdido
- **Impacto:** Medio (afecta la legibilidad de la información de HP)
- **Solución propuesta:**
  - Revisar el CSS del componente del panel Grupo
  - Asegurar que la barra de vida tenga suficiente contraste cuando el personaje está seleccionado
  - Posiblemente usar colores diferentes o bordes más marcados para el estado seleccionado
- **Archivos afectados:**
  - Componente del panel Grupo (frontend)
  - Estilos CSS relacionados
- **Estado:** 📝 **PENDIENTE** - Bug visual pendiente de corrección

### Issue #29: Stats de enemigos incorrectos en combate 🟡 ADVERTENCIA

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/ai/tools/combat-initiation-expert.ts`, sistema de obtención de stats de enemigos
- **Severidad:** 🟡 **MEDIA** (afecta balance del juego)
- **Descripción:** Los stats de los enemigos (especialmente HP) no se están obteniendo correctamente desde las fichas oficiales de D&D. Los enemigos tienen menos HP del que deberían tener según su ficha oficial.
- **Causa Raíz posible:**
  1. Problema en la API de D&D: Los datos obtenidos pueden estar incompletos o incorrectos
  2. Problema en el parseo: El sistema puede no estar parseando correctamente los HP desde la ficha del monstruo
  3. Problema en la inicialización: Los HP pueden no estar inicializándose correctamente al crear el enemigo en combate
  4. Datos cacheados incorrectos: Si hay caché de datos de monstruos, puede estar desactualizado o incorrecto
- **Impacto:** Medio (afecta el balance del combate)
- **Solución propuesta:**
  1. Verificar obtención de datos desde la API de D&D
  2. Verificar inicialización en `combat-initiation-expert.ts`
  3. Añadir logging para debugging
  4. Verificar caché si existe
- **Archivos afectados:**
  - `src/ai/tools/combat-initiation-expert.ts` (inicialización de enemigos)
  - Sistema de obtención de datos de monstruos (API o caché)
- **Estado:** 📝 **PENDIENTE** - Bug de datos pendiente de investigación y corrección

### Issue #30: Errores de conexión a APIs con logs verbosos 🟡 ADVERTENCIA

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/ai/flows/action-interpreter.ts` y otros módulos que usan APIs
- **Severidad:** 🟡 **MEDIA** (afecta legibilidad de logs)
- **Descripción:** Los errores de conexión a las APIs (especialmente Gemini API) generan logs muy verbosos que ocupan mucho espacio en la terminal, dificultando la lectura de otros logs importantes.
- **Problema:**
  - Los stack traces completos de errores de conexión son muy largos
  - Se repiten múltiples veces durante un fallo
  - Ocupan demasiado espacio visual en la terminal
- **Impacto:** Medio (afecta la experiencia del desarrollador al depurar)
- **Solución propuesta:**
  1. Simplificar mensajes de error (mostrar solo el mensaje esencial)
  2. Ocultar el stack trace completo a menos que se active modo debug
  3. Agrupar errores repetidos (mostrar resumen si el mismo error ocurre múltiples veces)
  4. Usar niveles de log apropiados (warn en lugar de error para errores transitorios)
- **Archivos afectados:**
  - `src/ai/flows/action-interpreter.ts` (retry logic y logging)
  - Otros módulos que manejan errores de API
  - `src/lib/logger.ts` (posible mejora de formato de errores)
- **Estado:** 📝 **PENDIENTE** - Mejora de logging pendiente de implementación

---

## ⚪ Prioridad Baja (PB) - Mejoras menores

### Issue #25: Logs del navegador colapsados por defecto 🟡 ADVERTENCIA

- **Fecha de creación:** 2025-11-13
- **Ubicación:** Componente que renderiza los logs en la consola del navegador (frontend)
- **Severidad:** Baja (mejora de UX)
- **Descripción:** Los logs de estado en la consola del navegador aparecen expandidos por defecto, lo que dificulta la legibilidad cuando hay muchos logs.
- **Problema:**
  - Los logs ocupan mucho espacio visual
  - Dificulta encontrar información específica
- **Impacto:** Bajo (no afecta funcionalidad, solo legibilidad durante desarrollo)
- **Solución propuesta:**
  - Hacer que los logs de estado aparezcan colapsados por defecto
  - Permitir expandirlos al hacer clic si se necesita ver detalles
- **Estado:** 📝 **PENDIENTE** - Mejora de UX pendiente de implementación

### Issue #31: Gestión de ataques múltiples en combate 🟢 MEJORA

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/tools/enemy-tactician.ts`
- **Severidad:** 🟢 **BAJA** (funcionalidad incompleta)
- **Descripción:** Algunos enemigos (como la mantícora) tienen múltiples ataques en su turno según las reglas de D&D 5e, pero el sistema parece solo procesar un ataque por turno.
- **Causa Raíz posible:**
  1. AI Tactician: El `enemyTacticianTool` puede no estar generando múltiples ataques cuando corresponde
  2. Procesamiento: El `combat-manager.ts` puede estar procesando solo el primer ataque de la lista
  3. Datos de monstruo: La ficha del monstruo puede no incluir información sobre múltiples ataques
- **Impacto:** Bajo (afecta la fidelidad a las reglas de D&D)
- **Solución propuesta:**
  1. Verificar datos de monstruo (asegurar que incluyen información sobre múltiples ataques)
  2. Mejorar AI Tactician (instruir a la IA a generar múltiples ataques cuando el monstruo los tiene)
  3. Procesar todos los ataques (en `combat-manager.ts`, procesar todos los ataques generados, no solo el primero)
  4. Validar orden (asegurar que los ataques múltiples se procesan en el orden correcto)
- **Archivos afectados:**
  - `src/ai/tools/enemy-tactician.ts` (prompt y generación de ataques)
  - `src/ai/tools/combat-manager.ts` (procesamiento de ataques múltiples)
  - Sistema de obtención de datos de monstruos
- **Estado:** 📝 **PENDIENTE** - Funcionalidad incompleta pendiente de implementación

### Issue #32: Paneles de combate se limpian de forma inconsistente 🟢 MEJORA

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/components/game/` (componentes de paneles de combate)
- **Severidad:** 🟢 **BAJA** (inconsistencia de UX)
- **Descripción:** Al terminar un combate, el panel de orden de combate se limpia automáticamente, pero el panel de tiradas no se limpia. Esta inconsistencia puede confundir al jugador.
- **Problema:**
  - Inconsistencia en el comportamiento de los paneles
  - El jugador puede querer revisar las tiradas después del combate
  - O puede querer que ambos paneles se mantengan limpios
- **Impacto:** Bajo (inconsistencia de UX, no afecta funcionalidad)
- **Solución propuesta:**
  1. No limpiar automáticamente ningún panel (mantener ambos con su contenido después del combate)
  2. Implementar botón de limpieza manual (añadir un botón para limpiar los paneles cuando el jugador lo desee, solo disponible cuando estamos fuera de combate)
  3. Consistencia (ambos paneles deben comportarse igual)
- **Archivos afectados:**
  - Componentes de paneles de combate (frontend)
  - Lógica de limpieza de paneles al terminar combate
- **Estado:** 📝 **PENDIENTE** - Mejora de UX pendiente de implementación

---

## ⚫ Prioridad Muy Baja (PMB) - Mejoras muy menores

### Issue #33: Logs muestran turnIndex cuando inCombat es false 🟢 MEJORA

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/lib/logger.ts`, llamadas a `log.gameCoordinator`
- **Severidad:** 🟢 **MUY BAJA** (inconsistencia menor en logs)
- **Descripción:** Los logs muestran `turnIndex` incluso cuando `inCombat` es `false`, lo cual no tiene sentido ya que fuera de combate no hay turnos.
- **Problema:**
  - Inconsistencia en los logs
  - Información confusa o irrelevante cuando no hay combate
- **Impacto:** Muy bajo (solo afecta la legibilidad de los logs)
- **Solución propuesta:**
  - En `log.gameCoordinator`, solo incluir `turnIndex` en el contexto cuando `inCombat === true`
  - O filtrar `turnIndex` del contexto antes de loggear si `inCombat` es `false`
- **Archivos afectados:**
  - `src/lib/logger.ts` (función `gameCoordinator`)
  - Llamadas a `log.gameCoordinator` que pasan `turnIndex` cuando `inCombat` es `false`
- **Estado:** 📝 **PENDIENTE** - Mejora menor de logging pendiente de implementación

---

## 📝 Notas

- Los números de issue se mantienen como referencia histórica del orden en que fueron añadidos
- Cuando un issue se resuelve, se mueve a [corregidos.md](./corregidos.md)
- Para más detalles sobre cada issue, consultar el historial de commits y el [CHANGELOG.md](../../../CHANGELOG.md)

