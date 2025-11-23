# Issues Pendientes

> ⚠️ **IMPORTANTE:** Cada vez que se modifique este archivo (añadir, mover o actualizar issues), **debe actualizarse también el [README.md](./README.md)** de esta carpeta con las estadísticas y enlaces actualizados.

---

Issues que aún no han sido resueltos y requieren atención. Ordenados por prioridad (PMA → PA → PM → PB → PMB).

**Total:** 25 issues  
**Última actualización:** 2025-01-22 (Issue #76 movido a corregidos - Input deshabilitado cuando DM está pensando)

---

## 🔴 Prioridad Muy Alta (PMA) - Críticos

### Issue #120: Inconsistencia en Cálculos de Tiradas y Visualización (Merryl) 🔴 CRÍTICO

- **Fecha de creación:** 2025-11-23
- **Ubicación:** `src/lib/combat/roll-notation-utils.ts`, `src/lib/combat/action-resolver.ts`, `src/ai/tools/dice-roller.ts`
- **Severidad:** 🔴 **CRÍTICA** (Cálculos de daño incorrectos y feedback visual engañoso)
- **Descripción:** Se han detectado dos bugs críticos que interactúan entre sí causando que las tiradas de daño sean incorrectas y que la UI muestre información falsa.
    1. **Visualización engañosa:** `updateRollNotationWithModifiers` selecciona automáticamente el modificador más alto (ej: DES +3) para "embellecer" el desglose visual, incluso si el ataque se calculó usando otro atributo (ej: FUE -1). Esto hace que el usuario vea "19+3+2" (Total 24) cuando el resultado real es 20.
    2. **Cálculo de daño erróneo:** `CombatActionResolver` genera notaciones inválidas para modificadores negativos (ej: `1d8+-1`). La regex del `diceRollerTool` no soporta el formato `+-`, por lo que ignora el modificador y lo trata como 0. Esto hace que un daño que debería ser 6 (7-1) se calcule como 7.
- **Problema:**
    - El usuario recibe información contradictoria: el desglose visual dice una cosa, el total dice otra, y el cálculo interno es incorrecto.
    - Los personajes con modificadores negativos de fuerza (como Merryl) hacen más daño del que deberían.
- **Comportamiento esperado:**
    - **Selección Inteligente de Habilidad:** El sistema debe identificar correctamente qué habilidad usar (FUE o DES) basándose en las reglas de D&D 5e:
        - **Cuerpo a cuerpo:** Usa FUE por defecto.
        - **A distancia:** Usa DES por defecto.
        - **Sutil (Finesse):** Permite elegir la más alta entre FUE y DES.
    - `updateRollNotationWithModifiers` debe recibir explícitamente qué atributo se usó para el cálculo, en lugar de adivinar o asumir el más alto.
    - `CombatActionResolver` debe formatear correctamente los números negativos (ej: `1d8-1` en lugar de `1d8+-1`).
    - `diceRollerTool` debe ser capaz de parsear correctamente notaciones con signos negativos o rechazar formatos inválidos como `+-`.
- **Impacto:** Crítico - Afecta la integridad matemática del juego y la confianza del usuario en el sistema.
- **Solución propuesta:**
    - **Arquitectura "Cerebro Centralizado, Frontend Obediente":**
        1.  **Helper `getWeaponAbility`:** Crear una función pura en `CombatActionResolver` que determine el atributo (FUE/DES) basándose en propiedades del arma (Sutil, Alcance) y stats del personaje.
        2.  **Helper `formatDiceNotation`:** Implementar una función simple para formatear correctamente los signos (ej: `1d8-1` en vez de `1d8+-1`).
        3.  **Inyección de Contexto:** `CombatActionResolver` inyectará el campo `attributeUsed: 'FUE' | 'DES'` en el objeto de la tirada.
        4.  **Frontend Determinista:** `updateRollNotationWithModifiers` dejará de "adivinar" basándose en el stat más alto y usará estrictamente el `attributeUsed` proporcionado por el backend.
    - **Robustecer Parser:** Mejorar la regex en `diceRollerTool` para soportar variaciones en la notación por seguridad.
- **Estado:** 📝 **PENDIENTE**
- **Prioridad:** Muy Alta


## 🟡 Prioridad Alta (PA) - Advertencias

---

### Issue #115: Validación de inventario al usar armas u objetos 🟡 ADVERTENCIA

- **Fecha de creación:** 2025-11-18
- **Ubicación:** `src/ai/flows/action-interpreter.ts`, `src/ai/tools/combat-manager.ts`, sistema de validación de inventario
- **Severidad:** 🟡 **ALTA** (afecta la coherencia del juego y permite acciones imposibles)
- **Descripción:** En combate y supongo que en exploración e interacción también, cuando escribo que ataco con un arma o uso un objeto que no tengo en mi inventario el DM lo narra igualmente sin comprobarlo.
- **Problema:** El sistema no valida que el personaje tiene el arma u objeto en su inventario antes de permitir su uso, lo que permite acciones imposibles y rompe la inmersión.
- **Comportamiento esperado:** El sistema debe validar que el personaje tiene el arma u objeto en su inventario antes de permitir su uso. Si no lo tiene, el DM debería informar al jugador.
- **Impacto:** Alto - Afecta la coherencia del juego y permite acciones que no deberían ser posibles
- **Solución propuesta:**
  - Añadir validación de inventario antes de procesar acciones que requieren armas u objetos
  - Verificar que el arma/objeto está en el inventario del personaje
  - Si no está disponible, informar al jugador y no procesar la acción
- **Archivos afectados:**
  - `src/ai/flows/action-interpreter.ts` (interpretación de acciones)
  - `src/ai/tools/combat-manager.ts` (procesamiento de acciones en combate)
  - Sistema de validación de inventario (a crear o mejorar)
- **Estado:** ⏸️ **POSPUESTO** - Plan creado pero pospuesto para priorizar otras mejoras
- **Referencia:** [Notas de Gael - #115](../notas/Notas%20de%20Gael.md)
- **Plan de implementación:** [Issue #115 - Validación de Inventario](../../planes-desarrollo/sin-comenzar/issue-115-validacion-inventario.md)
- **Razón de posposición:** Priorizar otras mejoras arquitectónicas (Issue #94) y features del roadmap. Este issue mejora la calidad pero no es bloqueador.



---

### Issue #93: Manejo de errores cuando se agotan los reintentos (especialmente errores 503 de sobrecarga) 🟡 ADVERTENCIA

- **Fecha de creación:** 2025-11-18
- **Ubicación:** `src/ai/flows/retry-utils.ts`, `src/ai/tools/enemy-tactician.ts`, `src/ai/tools/companion-tactician.ts`
- **Severidad:** 🟡 **ALTA** (afecta experiencia del usuario cuando el servicio está sobrecargado)
- **Descripción:** Cuando la API de Gemini devuelve errores 503 (Service Unavailable / "The model is overloaded") y se agotan los 4 intentos de reintento, el sistema no diferencia estos errores de otros errores críticos, mostrando el mismo mensaje genérico de fallo.
- **Problema:**
  - Los errores 503 después de agotar reintentos se tratan igual que cualquier otro error crítico
  - El usuario no recibe información clara sobre si el problema es temporal (sobrecarga del servicio) o permanente
  - Los logs no distinguen entre errores de sobrecarga y otros tipos de errores
  - El mensaje de fallo es genérico ("ruge con frustración, pero no hace nada") sin contexto del error real
- **Comportamiento actual:**
  1. `retryWithExponentialBackoff` intenta 4 veces (1 inicial + 3 reintentos)
  2. Si todos fallan con 503, lanza el error
  3. `enemyTacticianTool` / `companionTacticianTool` capturan el error en el catch externo
  4. Devuelven acción por defecto genérica sin diferenciar el tipo de error
- **Comportamiento esperado:**
  - Detectar específicamente errores 503 después de agotar reintentos
  - Registrar estos errores con información detallada (tipo de error, número de intentos, etc.)
  - Mostrar un mensaje más claro al usuario indicando que el servicio está sobrecargado
  - Considerar si se debe mostrar un mensaje diferente en la UI para errores de sobrecarga
- **Mejoras implementadas:**
  - ✅ Añadida detección de errores 503 en `retry-utils.ts` para reintentar automáticamente
  - ✅ Añadido logging detallado en `enemy-tactician.ts` para errores de validación
  - ✅ **Corregido (2025-11-21):** Stack traces completos de errores de API call ahora se suprimen. Los errores de red/timeout ahora muestran solo mensajes limpios sin stack traces largos en los logs.
- **Solución propuesta:**
  - **Fase 1 (PENDIENTE):** Mejorar detección y logging de errores 503 después de agotar reintentos
    - Detectar específicamente errores 503 en el catch de `enemyTacticianTool` / `companionTacticianTool`
    - Registrar información detallada: tipo de error, número de intentos, mensaje del servicio
  - **Fase 2 (PENDIENTE):** Mejorar mensajes al usuario
    - Mensaje diferente para errores de sobrecarga vs otros errores
    - Considerar mostrar mensaje en la UI cuando el servicio está sobrecargado
  - **Fase 3 (OPCIONAL):** Estrategias avanzadas
    - Considerar aumentar el número de reintentos para errores 503 específicamente
    - Implementar circuit breaker para evitar spam de requests cuando el servicio está sobrecargado
- **Archivos afectados:**
  - `src/ai/flows/retry-utils.ts` (detección de errores reintentables)
  - `src/ai/tools/enemy-tactician.ts` (manejo de errores después de reintentos)
  - `src/ai/tools/companion-tactician.ts` (manejo de errores después de reintentos)
- **Impacto:** Alto - Mejora la experiencia del usuario y facilita el diagnóstico cuando el servicio está sobrecargado
- **Estado:** 📝 **PENDIENTE**
- **Prioridad de corrección:** Alta
- **Detección:** Observado durante testing cuando Gemini API devolvió error 503
- **Relacionado con:** Issue #14 (output inválido/null), Issue #30 (logs verbosos de errores de API)

---

## 🟢 Prioridad Media (PM) - Mejoras

### Issue #116: DM narra palabras textuales de compañeros cuando tienen su propia voz 🟢 MEJORA

- **Fecha de creación:** 2025-01-20
- **Ubicación:** `src/ai/flows/game-coordinator.ts`, `src/ai/flows/narrative-manager.ts`, `src/ai/tools/companion-expert.ts`
- **Severidad:** 🟢 **MEDIA** (afecta calidad narrativa y coherencia del sistema de mensajes)
- **Descripción:** El DM a veces narra lo que dice algún compañero cuando los compañeros tienen su propia voz en el chat. El DM no debe narrar sus palabras textuales, ya que los compañeros generan sus propios mensajes directamente en el chat.
- **Problema:**
  - Los compañeros generan sus propios mensajes a través de `companionExpertTool` que aparecen directamente en el chat con su propia voz
  - El DM está narrando las palabras textuales de los compañeros en sus narraciones, creando duplicación y confusión
  - Falta coordinación entre el sistema de narración del DM y el sistema de mensajes de los compañeros
  - El DM debería narrar acciones y contexto, no repetir lo que los compañeros ya dijeron
- **Comportamiento actual:**
  - Los compañeros generan mensajes (ej: "Elara dice: '¡Cuidado, hay un goblin!'")
  - El DM luego narra: "Elara te advierte: '¡Cuidado, hay un goblin!'" (duplicación)
- **Comportamiento esperado:**
  - Los compañeros generan sus mensajes directamente en el chat con su propia voz
  - El DM narra el contexto y las acciones, pero NO repite las palabras textuales de los compañeros
  - El DM puede referenciar que un compañero habló (ej: "Elara te advierte sobre el peligro") sin citar sus palabras exactas
  - Coordinación clara: el DM debe saber qué compañeros ya hablaron para no duplicar su contenido
- **Impacto:** Medio - Afecta la calidad narrativa, crea duplicación de contenido y confusión sobre quién está hablando
- **Solución propuesta:**
  - **Fase 1:** Estudiar el flujo actual de coordinación entre `game-coordinator.ts`, `narrative-manager.ts` y `companion-expert.ts`
  - **Fase 2:** Identificar dónde el DM está recibiendo información sobre lo que dijeron los compañeros
  - **Fase 3:** Modificar el prompt del `narrativeExpert` para que:
    - No narre las palabras textuales de los compañeros
    - Solo referencie que un compañero habló sin citar sus palabras exactas
    - Se enfoque en narrar acciones, contexto y consecuencias, no diálogos directos
  - **Fase 4:** Asegurar que el contexto pasado al DM incluya información sobre qué compañeros hablaron, pero no sus palabras exactas
  - **Fase 5:** Testing para verificar que no hay duplicación y que la coordinación es clara
- **Archivos afectados:**
  - `src/ai/flows/game-coordinator.ts` (coordinación entre compañeros y DM)
  - `src/ai/flows/narrative-manager.ts` (prompt del narrativeExpert)
  - `src/ai/tools/companion-expert.ts` (generación de mensajes de compañeros)
- **Estado:** 📝 **PENDIENTE**
- **Prioridad:** Media (mejora calidad narrativa, no bloqueador)
- **Relacionado con:**
  - Issue #94 (Refactorización de Prompts de Tacticians) - Similar problema de coordinación narrativa
  - Roadmap - Sección 9 "Narración Unificada para Todos los Turnos"
- **Detección:** Observado durante gameplay manual - duplicación de contenido entre mensajes de compañeros y narraciones del DM

---

### Issue #119: Testeo profundo del sistema de combate después de refactorización 🟢 TESTING

- **Fecha de creación:** 2025-11-22
- **Ubicación:** Sistema de combate completo (`src/lib/combat/`, `src/ai/tools/combat-manager.ts`, `src/ai/flows/action-interpreter.ts`)
- **Severidad:** 🟢 **MEDIA** (necesario para asegurar estabilidad y corrección del sistema refactorizado)
- **Descripción:** Después de la refactorización profunda del sistema de combate (Issue #117), han reaparecido algunos problemas que ya existían antes. Aunque algunos casos específicos parecen estar corregidos, es necesario realizar un testeo profundo y sistemático para verificar que todos los casos de uso funcionan correctamente.
- **Problema:**
  - Después de la refactorización, problemas anteriores han vuelto a aparecer:
    - Fallos al hacer target sobre enemigos con el mismo nombre en ubicaciones diferentes
    - A veces los enemigos no hacían nada en sus turnos
  - Estos problemas específicos parecen estar corregidos, pero no se ha verificado sistemáticamente el resto de casos
  - La refactorización cambió significativamente la arquitectura, por lo que es necesario validar que todos los flujos funcionan correctamente
- **Casos específicos mencionados (aparentemente corregidos):**
  - ✅ Fallos al hacer target sobre enemigos con el mismo nombre en ubicaciones diferentes (corregido con `enemiesByLocation`)
  - ✅ Enemigos que no hacían nada en sus turnos (corregido con mejoras en `actionInterpreter` y `enemyTactician`)
- **Casos que requieren verificación:**
  - Identificación correcta de objetivos en combate (enemigos con nombres similares, múltiples enemigos del mismo tipo)
  - Turnos de enemigos se procesan correctamente en todos los escenarios
  - Turnos de compañeros funcionan correctamente
  - Manejo de enemigos muertos/inconscientes
  - Cambio de ubicación durante o después del combate
  - Inicio de combate desde diferentes estados (exploración, interacción)
  - Finalización de combate y transición a exploración
  - Manejo de múltiples combates en la misma sesión
  - Persistencia de estado de enemigos entre ubicaciones
  - Sincronización entre UI y estado del servidor
- **Comportamiento esperado:**
  - Todos los casos de uso del sistema de combate funcionan correctamente
  - No hay regresiones de problemas anteriores
  - El sistema es estable y predecible en todos los escenarios
- **Impacto:** Medio - Afecta la confiabilidad y estabilidad del sistema de combate, pero no es bloqueador ya que los problemas críticos parecen estar resueltos
- **Solución propuesta:**
  - **Fase 1:** Crear suite de tests sistemáticos para casos de uso comunes y edge cases
  - **Fase 2:** Testing manual exhaustivo de escenarios de combate
  - **Fase 3:** Verificar que no hay regresiones de problemas anteriores
  - **Fase 4:** Documentar casos de uso verificados y casos problemáticos encontrados
  - **Fase 5:** Crear issues específicos para cualquier problema encontrado durante el testing
- **Archivos afectados:**
  - `src/lib/combat/` (todos los módulos del sistema de combate)
  - `src/ai/tools/combat-manager.ts`
  - `src/ai/flows/action-interpreter.ts`
  - `src/ai/flows/game-coordinator.ts`
  - Tests existentes y nuevos tests a crear
- **Estado:** 📝 **PENDIENTE**
- **Prioridad:** Media (testing necesario pero no crítico ya que problemas específicos parecen resueltos)
- **Relacionado con:**
  - Issue #117 (Simplificación de Arquitectura de Combate) - La refactorización que requiere este testing
  - Issue #92 (Identificación incorrecta de enemigo en combate) - Problema relacionado que puede reaparecer
  - Issue #112 (Sincronización entre DM y combat tracker) - Problema de sincronización que puede estar relacionado
- **Estimación:** 8-12 horas (testing exhaustivo y documentación)
- **Referencia:** Reportado por usuario después de la refactorización (2025-11-22)

---

---

### Issue #92: Identificación incorrecta de enemigo en combate 🟢 MEJORA

- **Fecha de creación:** 2025-11-16
- **Ubicación:** `src/ai/flows/action-interpreter.ts`, `src/lib/combat/target-resolver.ts`
- **Severidad:** 🟢 **MEDIA** (afecta precisión de acciones del jugador)
- **Descripción:** Cuando el jugador hace referencia a un enemigo por acciones recientes (ej: "el goblin que me acaba de atacar"), el sistema a veces identifica incorrectamente al enemigo objetivo.
- **Ejemplo del problema:**
  - Jugador: "Con mis últimas fuerzas ataco al goblin que me acaba de dar un tajo" (refiriéndose al Goblin 2 que acababa de atacar y acertar)
  - Sistema: El DM narró que el personaje atacó al Goblin 1 (incorrecto)
- **Problema:** El sistema no está rastreando correctamente las acciones recientes de los enemigos para identificar referencias contextuales.
- **Comportamiento esperado:** El sistema debe identificar correctamente al enemigo cuando se hace referencia a acciones recientes (último ataque, último que hizo daño, etc.).
- **Impacto:** Medio – Puede causar que el jugador ataque al enemigo incorrecto, afectando decisiones tácticas
- **Solución propuesta:**
  - Mejorar el sistema de resolución de targets para considerar acciones recientes
  - Rastrear el historial de acciones de cada enemigo en el combate actual
  - Mejorar la interpretación de referencias contextuales ("el que me atacó", "el que está herido", etc.)
- **Archivos afectados:**
  - `src/ai/flows/action-interpreter.ts` (interpretación de acciones)
  - `src/lib/combat/target-resolver.ts` (resolución de targets)
- **Estado:** 📝 **PENDIENTE**
- **Detección:** Testing manual durante combate

---

### Issue #77: Mensajes lentos al avanzar turno cuando el siguiente personaje está muerto o inconsciente 🟢 MEJORA

- **Fecha de creación:** 2025-11-17
- **Ubicación:** `src/app/game-state-actions.ts`, `src/components/game/initiative-tracker.tsx`
- **Severidad:** 🟢 **MEDIA** (ralentiza el flujo de combate sin aportar información)
- **Descripción:** Al presionar “Avanzar turno”, si el siguiente combatiente está muerto o inconsciente, el mensaje que indica el salto de turno tarda demasiado en mostrarse, creando la sensación de que la UI se congeló.
- **Comportamiento esperado:** La transición debe ser instantánea, con un mensaje breve que indique que el combatiente está fuera de combate y que el turno se salta automáticamente.
- **Impacto:** Medio – Reduce fricción durante combates largos con múltiples personajes KO.
- **Solución propuesta:**
  - Detectar combatientes sin acciones disponibles y saltarlos sin delays ni narraciones largas.
  - Mostrar inmediatamente un mensaje corto (“Elara está inconsciente, se salta su turno”).
  - Revisar timers/awaits ligados al avance de turnos para eliminar esperas innecesarias.
- **Estado:** 📝 **PENDIENTE**
- **Detección:** Testing manual del sistema de turnos.

---


### Issue #80: Permitir múltiples acciones del jugador en un turno (movimiento/acción adicional) 🟢 MEJORA

- **Fecha de creación:** 2025-11-17
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/components/game/game-view.tsx`
- **Severidad:** 🟢 **MEDIA** (mejora UX; actualmente el turno se consume automáticamente tras una acción)
- **Descripción:** Tras implementar el auto-avance del turno del jugador (Issue #78), cualquier acción consume el turno inmediatamente. A futuro se necesitará permitir que el jugador realice acciones adicionales (movimiento, acción adicional, interacción) antes de pasar turno.
- **Comportamiento esperado:** El jugador debería poder realizar su acción principal, luego decidir si quiere moverse o usar una acción adicional, y finalmente pulsar “Pasar 1 Turno” para entregar el turno. El sistema debe llevar un registro claro de si la acción principal ya se consumió y qué acciones secundarias quedan disponibles.
- **Impacto:** Medio – No bloquea el gameplay actual, pero limita la profundidad táctica y futuras mecánicas.
- **Solución propuesta:**
  - Añadir flags de “acción principal consumida”, “movimiento disponible”, etc.
  - Solo auto-avanzar si el jugador ya marcó explícitamente que terminó (botón “Pasar 1 Turno”) o si consumió todas las acciones disponibles.
  - Adaptar la UI para mostrar el estado de acciones restante.
- **Estado:** 📝 **PENDIENTE (Mejora futura)**
- **Detección:** Discusión tras corregir el Issue #78 (2025-11-17).

---

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

### Issue #82: Unificar sistema de procesamiento de tiradas de dados (jugador, companions, enemigos) (DEUDA TÉCNICA)

- **Fecha de creación:** 2025-11-17
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/tools/combat/dice-roll-processor.ts`
- **Severidad:** Media (deuda técnica)
- **Descripción:** Actualmente el procesamiento de tiradas de dados está dividido en dos sistemas diferentes:
  - **Jugador:** Las tiradas se procesan directamente en `combat-manager.ts` (líneas ~434-540), calculando modificadores manualmente y llamando a `diceRollerTool` directamente
  - **Companions/Enemigos:** Las tiradas se generan por la IA (tacticians) y luego se procesan en `processAICombatantRolls` en `dice-roll-processor.ts`
- **Problema:**
  - Código duplicado para calcular modificadores y actualizar notaciones
  - Lógica de actualización de `rollNotation` con modificadores desglosados está en dos lugares
  - Diferencias en cómo se procesan las tiradas pueden llevar a inconsistencias
  - Mantenimiento más difícil: cambios deben aplicarse en múltiples lugares
- **Contexto:** 
  - Se creó la función helper `updateRollNotationWithModifiers` para unificar la actualización de notaciones
  - Sin embargo, el flujo de procesamiento sigue siendo diferente entre jugador y AI combatants
- **Impacto:** Medio (afecta mantenibilidad y consistencia)
- **Solución propuesta:**
  - **Corto plazo:** Usar la función `updateRollNotationWithModifiers` en todos los casos (ya implementado parcialmente)
  - **Largo plazo:** Refactorizar para que el jugador también use `processAICombatantRolls` o crear un sistema unificado que maneje los tres casos (jugador, companions, enemigos)
  - Considerar crear una función `processCombatRoll` genérica que pueda manejar tanto tiradas del jugador como de AI combatants
- **Prioridad:** Media
- **Estimación:** 6-8 horas (refactorización completa)
- **Estado:** 📝 Pendiente (deuda técnica documentada)
- **Relacionado con:** Issue #21 (código duplicado en combat-manager.ts)

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

### Issue #65: Ataque a compañero fuera de combate no inicia combate 🟢 MEJORA

- **Fecha de creación:** 2025-11-16
- **Ubicación:** `src/ai/flows/action-interpreter.ts`, `src/ai/flows/game-coordinator.ts`
- **Severidad:** 🟢 **MEDIA** (mejora de funcionalidad, no crítica)
- **Descripción:** Estando fuera de combate, si el jugador ataca a uno de sus compañeros, el sistema no entra en modo combate. El DM responde como si el ataque no fuera real, ignorando completamente la acción.
- **Ejemplo del comportamiento actual:**
  ```
  Jugador: "Ataco a Elara!"
  DM: "Atacas fervientemente al aire, pero no parece haber ninguna amenaza real a la vista." ❌ IGNORA LA ACCIÓN
  ```
- **Problema:**
  - El sistema no detecta que un ataque a un compañero debería iniciar combate o al menos reconocer la acción como un ataque real
  - El `action-interpreter` o `game-coordinator` no está procesando correctamente los ataques a compañeros fuera de combate
  - Puede estar relacionado con el sistema de inicio de combate dinámico (pendiente de implementar)
- **Impacto:** Medio (limita funcionalidad, pero no bloquea el gameplay principal)
- **Solución propuesta:**
  - Detectar ataques a compañeros en `action-interpreter`
  - Iniciar combate automáticamente cuando se detecta un ataque a un compañero
  - O al menos reconocer la acción como un ataque real y mostrar un mensaje apropiado
  - Relacionado con: [Sistema de Inicio de Combate Dinámico](../roadmap.md#2-sistema-de-inicio-de-combate-dinámico-prioridad-alta)
- **Archivos afectados:**
  - `src/ai/flows/action-interpreter.ts` (detección de ataques)
  - `src/ai/flows/game-coordinator.ts` (inicio de combate)
- **Estado:** 📝 **PENDIENTE (Mejora futura)** - Funcionalidad no crítica, marcada para implementación futura

---

## 📝 Notas

- Los números de issue se mantienen como referencia histórica del orden en que fueron añadidos
- Cuando un issue se resuelve, se mueve a [corregidos.md](./corregidos.md)
- Para más detalles sobre cada issue, consultar el historial de commits y el [CHANGELOG.md](../../../CHANGELOG.md)

