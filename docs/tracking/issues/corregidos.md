# Issues Corregidos

> ⚠️ **IMPORTANTE:** Cada vez que se modifique este archivo (añadir, mover o actualizar issues), **debe actualizarse también el [README.md](./README.md)** de esta carpeta con las estadísticas y enlaces actualizados.

---

Issues que han sido resueltos y verificados. Ordenados por prioridad (PMA → PA → PM → PB → PMB).

**Total:** 68 issues  
**Última actualización:** 2025-01-27 (Issue #15 resuelto y movido a corregidos)

---

## 🔴 Prioridad Muy Alta (PMA) - Críticos

### Issue #126: Revisión completa del sistema de carga de aventuras JSON e inicio de partida ✅ RESUELTO

- **Fecha de creación:** 2025-01-23
- **Fecha de corrección:** 2025-11-23
- **Ubicación:** `src/app/page.tsx`, `src/ai/flows/parse-adventure-from-json.ts`, `src/app/game-state-actions.ts`
- **Severidad:** 🔴 **MUY ALTA** (afecta la experiencia inicial del juego y puede causar problemas de estabilidad)
- **Descripción:** Revisar por completo el sistema de carga de aventuras JSON e inicio de la partida para mejorarlo y optimizarlo. El sistema actual puede tener problemas de rendimiento, manejo de errores, o flujo de inicialización.
- **Problema resuelto:**
  - ✅ **Fast Parser:** Carga instantánea (<1s) para archivos bien formados (sin IA)
  - ✅ **Validación Robusta:** Esquema Zod estricto + validación de integridad referencial (detecta enlaces rotos en `exits` y IDs duplicados)
  - ✅ **Caché Persistente:** Almacena aventuras procesadas en disco (`node_modules/.cache/dnd-adventures`), sobreviviendo a reinicios del servidor
  - ✅ **Sanitización Inteligente:** Auto-corrección de referencias rotas convirtiéndolas en elementos interactuables para preservar la narrativa
  - ✅ **Feedback Visual:** Nuevo componente `AdventureLoadProgress` que muestra cada paso (Parseando, Validando, Conectando, Inicializando, Narrando)
  - ✅ **Inicio Limpio:** Forzado silencio de compañeros en el turno 0 para que solo el DM narre la introducción
- **Solución implementada:** ✅
  - Rediseño completo con arquitectura modular (`adventure-parser`, `validator`, `adventure-cache`, `game-initializer`)
  - Todas las 6 fases completadas: Manejo de errores, Optimización de parseo, Mejora de inicialización, Feedback al usuario, Optimización de cache, Testing exhaustivo
- **Archivos modificados:**
  - `src/app/page.tsx` - Orquestación completa y UI de progreso
  - `src/lib/adventure-loader/*` - Nuevos módulos del sistema
  - `src/ai/flows/parse-adventure-from-json.ts` - Integración con caché y fast parser
- **Impacto:** Muy Alto - Mejora drástica del tiempo de carga (de 10-15s a <1s), validación robusta, y experiencia de usuario superior
- **Beneficios logrados:**
  - 🚀 Carga inmediata para la mayoría de aventuras
  - 🛡️ Imposible cargar aventuras rotas que crashearían el juego después
  - 💾 Persistencia entre sesiones de desarrollo
  - 👁️ UX muy superior con feedback claro
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada (2025-11-23)
- **Tiempo invertido:** ~40 horas
- **Plan de implementación:** [Issue #126 - Revisión Sistema de Carga de Aventuras](../../planes-desarrollo/completados/issue-126-revision-sistema-carga-aventuras.md)
- **Referencia:** [CHANGELOG.md](../../CHANGELOG.md) | [Arquitectura](../../arquitectura/sistema-carga-aventuras.md) | [Notas de Gael - #5](../notas/Notas%20de%20Gael.md)
- **Relacionado con:**
  - Issue #6 (Manejo de errores en `handleLoadAdventure`) - ✅ RESUELTO - Incluido en este issue
  - Issue #8 (Fallos al cargar aventura desde JSON) - ✅ RESUELTO - Incluido en este issue
  - Roadmap #14 (Actualización Automática de Fichas desde Archivos JSON) - Mejora relacionada

---

### Issue #130: Regresión UI - Botones de avance de turno no aparecen tras refactor ✅ RESUELTO

- **Fecha de creación:** 2025-11-26
- **Fecha de corrección:** 2025-11-26
- **Ubicación:** `src/components/game/game-view.tsx`, `src/components/game/chat-panel.tsx`
- **Severidad:** 🔴 **MUY ALTA** (bloqueaba el flujo de combate paso a paso)
- **Descripción:** Después de cambios recientes en el diseño de la UI, los botones “Avanzar 1 turno” y “Avance automático” dejaron de mostrarse aun cuando el backend indicaba que había turnos de IA pendientes o que se acababa de procesar un turno de IA.
- **Causa Raíz identificada:**
  - El componente `ChatPanel` requiere que se le pasen las funciones `onPassTurn` y `onAdvanceAll` para mostrar los botones.
  - En `game-view.tsx`, la función `handleAdvanceAll` no existía y no se estaba pasando a `ChatPanel`.
  - La lógica de `onPassTurn` estaba inline y no se gestionaba correctamente.
- **Solución implementada:** ✅
  - **Implementación de Handlers:** Se crearon `handlePassTurn` y `handleAdvanceAll` en `GameView`.
  - **Paso de Props:** Se pasaron estos handlers correctamente al componente `ChatPanel`.
  - **Limpieza:** Se eliminó el prop obsoleto `onDiceRoll` que causaba errores de tipo.
- **Archivos modificados:**
  - `src/components/game/game-view.tsx` - Implementación de handlers y paso de props
- **Impacto:** Crítico - Restaura la funcionalidad de avance de turnos en combate, permitiendo jugar IA vs IA y IA vs Jugador.
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada (2025-11-26)
- **Plan asociado:** [`docs/planes-desarrollo/completados/regresion-botones-turnos-ui.md`](../../planes-desarrollo/completados/regresion-botones-turnos-ui.md)
- **Nota:** Renombrado de #127 a #130 para evitar conflicto de IDs.



### Issue #127: Pérdida de Contexto en Diálogos Ambiguos ✅ RESUELTO

- **Fecha de creación:** 2025-11-26
- **Fecha de corrección:** 2025-11-26
- **Ubicación:** `src/ai/flows/narrative-manager.ts`
- **Severidad:** 🔴 **CRÍTICA** (Rompe el flujo de conversación y la inmersión)
- **Descripción:** Cuando el jugador respondía a un PNJ con frases ambiguas (ej: "Sí, claro", "Estoy de acuerdo") sin especificar explícitamente "le digo a X", el sistema clasificaba la acción como `EXPLORATION` en lugar de `INTERACTION`. Esto causaba que el DM describiera la habitación nuevamente en lugar de continuar el diálogo, rompiendo la inmersión.
- **Causa Raíz identificada:**
  - El `narrativeRouterPrompt` (encargado de clasificar la acción) no recibía el `conversationHistory`.
  - Sin el historial, el modelo no podía saber que la frase del jugador era una respuesta directa a una pregunta anterior del PNJ.
- **Solución implementada:** ✅
  - **Inyección de Contexto:** Se actualizó el `narrativeRouterPrompt` para recibir y procesar `conversationHistory`.
  - **Instrucciones Explícitas:** Se añadieron directivas "CRITICAL - CONTEXT AWARENESS" para instruir al modelo a revisar el historial y clasificar respuestas a preguntas como `INTERACTION`.
  - **Actualización de Flujo:** Se modificó `narrativeManagerFlow` para pasar el historial al router.
- **Archivos modificados:**
  - `src/ai/flows/narrative-manager.ts` - Prompt y llamada actualizados
- **Impacto:** Crítico - Restaura la fluidez de las conversaciones naturales, permitiendo al jugador responder como lo haría en una mesa real sin tener que ser explícito con comandos de "decir".
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada (2025-11-26)

### Issue #128: Alucinación de Localizaciones por PNJs ✅ RESUELTO

- **Fecha de creación:** 2025-11-26
- **Fecha de corrección:** 2025-11-26
- **Ubicación:** `src/ai/flows/experts/interaction-expert.ts`
- **Severidad:** 🔴 **CRÍTICA** (Información falsa al jugador, rompe la aventura)
- **Descripción:** Los PNJs inventaban nombres de localizaciones o traducían incorrectamente nombres propios (ej: "Boca del Crag" en lugar de "Cragmaw Hideout") al dar información al jugador sobre misiones o lugares.
- **Causa Raíz identificada:**
  - El `InteractionExpert` no tenía acceso a la herramienta `adventureLookupTool`, por lo que no podía consultar la "verdad" sobre el mundo de la aventura.
  - Dependía de su conocimiento pre-entrenado, lo que llevaba a alucinaciones o traducciones literales incorrectas ("Cragmaw" -> "Boca del Crag").
- **Solución implementada:** ✅
  - **Acceso a Herramientas:** Se añadió `adventureLookupTool` a la lista de herramientas permitidas para `InteractionExpert`.
  - **Directrices de Factuality:** Se añadieron instrucciones estrictas en el prompt para prohibir la invención de lugares y obligar al uso de la herramienta para verificar nombres.
- **Archivos modificados:**
  - `src/ai/flows/experts/interaction-expert.ts` - Prompt y tools actualizados
- **Impacto:** Crítico - Asegura que la información que dan los PNJs sea veraz y coherente con la aventura cargada.
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada (2025-11-26)

### Issue #128: Alucinación de Localizaciones por PNJs ✅ RESUELTO

- **Fecha de creación:** 2025-11-26
- **Fecha de corrección:** 2025-11-26
- **Ubicación:** `src/ai/flows/experts/interaction-expert.ts`
- **Severidad:** 🔴 **CRÍTICA** (Información falsa al jugador, rompe la aventura)
- **Descripción:** Los PNJs inventaban nombres de localizaciones o traducían incorrectamente nombres propios (ej: "Boca del Crag" en lugar de "Cragmaw Hideout") al dar información al jugador sobre misiones o lugares.
- **Causa Raíz identificada:**
  - El `InteractionExpert` no tenía acceso a la herramienta `adventureLookupTool`, por lo que no podía consultar la "verdad" sobre el mundo de la aventura.
  - Dependía de su conocimiento pre-entrenado, lo que llevaba a alucinaciones o traducciones literales incorrectas ("Cragmaw" -> "Boca del Crag").
- **Solución implementada:** ✅
  - **Acceso a Herramientas:** Se añadió `adventureLookupTool` a la lista de herramientas permitidas para `InteractionExpert`.
  - **Directrices de Factuality:** Se añadieron instrucciones estrictas en el prompt para prohibir la invención de lugares y obligar al uso de la herramienta para verificar nombres.
- **Archivos modificados:**
  - `src/ai/flows/experts/interaction-expert.ts` - Prompt y tools actualizados
- **Impacto:** Crítico - Asegura que la información que dan los PNJs sea veraz y coherente con la aventura cargada.
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada (2025-11-26)

### Issue #129: Alucinación de Rumores por falta de Tablas ✅ RESUELTO

- **Fecha de creación:** 2025-11-26
- **Fecha de corrección:** 2025-11-26
- **Ubicación:** `src/ai/tools/adventure-lookup.ts` y JSON de aventura
- **Severidad:** 🔴 **CRÍTICA** (Información falsa persistente a pesar de arreglos previos)
- **Descripción:** A pesar de tener acceso a la herramienta de búsqueda, los PNJs seguían inventando rumores (ej: "Cueva de los Colmillos") porque la aventura original usa tablas aleatorias para esto, y esas tablas no existían en el JSON, obligando a la IA a improvisar.
- **Causa Raíz identificada:**
  - Falta de estructura de datos para tablas aleatorias en el esquema de aventura.
  - Ausencia de mecanismo para "tirar dados" en tablas de texto dentro del flujo de la IA.
- **Solución implementada:** ✅
  - **Sistema de Tablas:** Añadida sección `tables` al JSON de aventura.
  - **Etiquetas Inteligentes:** Implementado soporte para etiquetas `[[ROLL_TABLE:id]]` en el texto del JSON.
  - **Resolución Automática:** La `adventureLookupTool` ahora detecta y procesa estas etiquetas, devolviendo un resultado real de la tabla.
- **Archivos modificados:**
  - `src/ai/tools/adventure-lookup.ts`
  - `JSON_adventures/el-dragon-del-pico-agujahelada_v2.json`
- **Impacto:** Crítico - Elimina la última fuente de alucinaciones en interacciones sociales y añade variabilidad canónica a la aventura.
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada (2025-11-26)

### Issue #29: Stats de enemigos incorrectos en combate ✅ RESUELTO

- **Fecha de creación:** 2025-11-14
- **Fecha de corrección:** 2025-01-23
- **Ubicación:** `src/lib/combat/monster-stats-parser.ts`, función `getMonsterStatsFromDndApi`
- **Severidad:** 🟡 **MEDIA** (afecta balance del juego)
- **Descripción:** Los stats de los enemigos (especialmente HP) no se estaban obteniendo correctamente desde las fichas oficiales de D&D. Los enemigos tenían menos HP del que deberían tener según su ficha oficial.
- **Causa Raíz identificada:**
  - La función `getMonsterStatsFromDndApi` hacía un único intento de fetch a la API de D&D
  - Los fallos en la primera llamada eran comunes (posiblemente por latencia de red o cold start de la API)
  - Al fallar, el sistema usaba stats por defecto (HP=10, AC=10) en lugar de reintentar
  - Esto causaba que los enemigos tuvieran stats incorrectos cuando la API fallaba temporalmente
- **Problema resuelto:**
  - ✅ El sistema ahora reintenta automáticamente cuando falla la primera llamada a la API
  - ✅ Los stats se obtienen correctamente de la API de D&D en la mayoría de los casos
  - ✅ Solo se usan stats por defecto si todos los reintentos fallan (4 intentos totales)
  - ✅ El sistema de caché evita llamadas redundantes
- **Solución implementada:** ✅
  - Resuelto junto con el Issue #124 mediante la implementación de sistema de retries
  - La función `getMonsterStatsFromDndApi` ahora usa `retryWithExponentialBackoff` para reintentos automáticos
  - Maneja errores de red, timeouts y errores temporales de la API (5xx) con retries
  - No retrya errores 404 (monster no encontrado) - cachea stats por defecto inmediatamente
- **Archivos modificados:**
  - `src/lib/combat/monster-stats-parser.ts` - Añadido sistema de retries (mismo cambio que Issue #124)
- **Impacto:** Medio - Mejora significativamente la precisión de los stats de enemigos en combate, mejorando el balance del juego
- **Relacionado con:**
  - Issue #124 (Sistema de retries faltante) - Mismo problema raíz, resuelto junto con este issue
  - Issue #125 (Primera llamada a APIs siempre falla) - ✅ RESUELTO - Unificación arquitectónica completa
- **Referencia:** Resuelto junto con [Issue #124](./corregidos.md#issue-124-sistema-de-retries-faltante-en-consulta-de-stats-de-enemigos-en-api-de-dd-resuelto)

---

### Issue #125: Primera llamada a APIs siempre falla (Gemini y D&D) ✅ RESUELTO

- **Fecha de creación:** 2025-01-23
- **Fecha de corrección:** 2025-01-23
- **Ubicación:** Múltiples módulos que hacen llamadas a APIs (`src/ai/flows/retry-utils.ts`, `src/ai/tools/dnd-api-lookup.ts`, `src/lib/combat/monster-stats-parser.ts`, llamadas a Gemini API)
- **Severidad:** 🟡 **ALTA** (afecta la experiencia del usuario y causa delays innecesarios)
- **Descripción:** La primera llamada a las APIs (tanto Gemini como D&D) frecuentemente fallaba, causando delays innecesarios. Además, existía un problema arquitectónico crítico con duplicación de código entre módulos que llamaban a la API de D&D.
- **Problema resuelto:**
  - ✅ Creado cliente unificado de D&D API (`src/lib/dnd-api-client.ts`) que centraliza toda la lógica de comunicación
  - ✅ Caché global compartido entre `monster-stats-parser` y `dnd-api-lookup` (evita llamadas duplicadas)
  - ✅ Normalización de nombres (Español → Inglés) centralizada
  - ✅ Retries añadidos a `dnd-api-lookup` que antes no los tenía
  - ✅ Helper `executePromptWithRetry()` creado para centralizar retries de Gemini API
  - ✅ 8 módulos refactorizados para usar el helper centralizado
  - ✅ Eliminadas ~200-300 líneas de código duplicado
- **Solución implementada:** ✅
  - **Fase 1:** Cliente unificado de D&D API creado con caché global, retries y normalización centralizada
  - **Fase 2:** `monster-stats-parser.ts` refactorizado para usar cliente unificado (mantiene solo parseo)
  - **Fase 3:** `dnd-api-lookup.ts` refactorizado para usar cliente unificado y añadidos retries (mantiene solo formateo)
  - **Fase 4:** Helper `executePromptWithRetry()` creado y 8 módulos refactorizados
  - **Fase 5:** Verificación completa - todas las llamadas a APIs tienen retries encapsulados
- **Archivos modificados:**
  - **Nuevo:**
    - `src/lib/dnd-api-client.ts` - Cliente unificado de D&D API
  - **Refactorizados:**
    - `src/lib/combat/monster-stats-parser.ts` - Usa cliente unificado
    - `src/ai/tools/dnd-api-lookup.ts` - Usa cliente unificado, retries añadidos
    - `src/ai/flows/retry-utils.ts` - Helper `executePromptWithRetry()` añadido
    - `src/ai/tools/enemy-tactician.ts` - Usa helper centralizado
    - `src/ai/tools/companion-tactician.ts` - Usa helper centralizado
    - `src/ai/flows/action-interpreter.ts` - Usa helper centralizado
    - `src/ai/flows/experts/exploration-expert.ts` - Usa helper centralizado
    - `src/ai/flows/experts/interaction-expert.ts` - Usa helper centralizado
    - `src/ai/flows/narrative-manager.ts` - Usa helper centralizado
    - `src/ai/flows/parse-adventure-from-json.ts` - Usa helper centralizado
- **Impacto:** Alto - Mejora significativamente la experiencia del usuario, reduce delays, elimina duplicación de código, y mejora la mantenibilidad del sistema
- **Beneficios logrados:**
  - ✅ Caché global compartido: Si la IA busca "Goblin" y luego el combate inicializa "Goblin", usan la misma entrada de caché
  - ✅ Retries unificados: Todas las llamadas a APIs tienen retries consistentes
  - ✅ Código más limpio: ~200-300 líneas de código duplicado eliminadas
  - ✅ Mantenibilidad: Un solo lugar para actualizar lógica de APIs
  - ✅ Robustez: Retries añadidos a `dnd-api-lookup` que antes no los tenía
- **Relacionado con:**
  - Issue #124 (Sistema de retries faltante) - ✅ RESUELTO - Ahora unificado en el cliente centralizado
  - Issue #29 (Stats de enemigos incorrectos) - ✅ RESUELTO - Ahora unificado en el cliente centralizado
  - Issue #93 (Manejo de errores cuando se agotan los reintentos) - ✅ RESUELTO - Resuelto por mejoras previas
- **Plan de implementación:** [Issue #125 - Unificación Arquitectónica de APIs](../../planes-desarrollo/completados/issue-125-unificacion-apis.md)
- **Referencia:** [Notas de Gael - #2](../notas/Notas%20de%20Gael.md)

---

## 🟡 Prioridad Alta (PA) - Advertencias

### Issue #93: Manejo de errores cuando se agotan los reintentos (especialmente errores 503 de sobrecarga) ✅ RESUELTO

- **Fecha de creación:** 2025-11-18
- **Fecha de corrección:** 2025-01-23
- **Ubicación:** `src/ai/flows/retry-utils.ts`, `src/ai/tools/enemy-tactician.ts`, `src/ai/tools/companion-tactician.ts`
- **Severidad:** 🟡 **ALTA** (afecta experiencia del usuario cuando el servicio está sobrecargado)
- **Descripción:** Cuando la API de Gemini devuelve errores 503 (Service Unavailable / "The model is overloaded") y se agotan los 4 intentos de reintento, el sistema no diferencia estos errores de otros errores críticos, mostrando el mismo mensaje genérico de fallo.
- **Problema resuelto:**
  - ✅ **Detección de errores 503:** `retry-utils.ts` detecta múltiples variantes de errores 503 (status code, mensajes, etc.)
  - ✅ **Logging detallado:** Cuando se agotan los reintentos, se registra el error con contexto completo (tipo de error, número de intentos, mensaje del servicio)
  - ✅ **Errores limpios:** Stack traces largos suprimidos, solo mensajes esenciales en logs
  - ✅ **Pre-warm de conexión:** Implementado pre-warm automático de Gemini API para evitar timeouts iniciales que causaban errores 503
  - ✅ **Función centralizada:** `executePromptWithRetry()` encapsula retries y pre-warm, usada en todos los módulos
- **Solución implementada:** ✅
  - Resuelto principalmente por las mejoras implementadas en Issue #125 (Unificación Arquitectónica de APIs)
  - El pre-warm de conexión reduce drásticamente la probabilidad de errores 503 en la primera llamada
  - Los 4 reintentos con exponential backoff hacen que sea extremadamente raro que todos los intentos fallen
  - El logging detallado en `retry-utils.ts` proporciona suficiente información para diagnóstico
  - Los errores limpios sin stack traces mejoran la legibilidad de los logs
- **Razón de cierre:**
  - Con el pre-warm y los retries mejorados, los errores 503 son extremadamente raros
  - El logging ya es bastante detallado y proporciona información suficiente
  - El impacto en el usuario es mínimo (solo afecta cuando todos los reintentos fallan, caso muy poco frecuente)
  - Las mejoras adicionales propuestas (detección específica en catch finales, mensajes diferentes al usuario) no aportan suficiente valor para justificar el esfuerzo
- **Archivos modificados:**
  - `src/ai/flows/retry-utils.ts` - Detección de errores 503, logging detallado, pre-warm, función `executePromptWithRetry()`
  - `src/ai/tools/enemy-tactician.ts` - Usa `executePromptWithRetry()` con retries y pre-warm automáticos
  - `src/ai/tools/companion-tactician.ts` - Usa `executePromptWithRetry()` con retries y pre-warm automáticos
- **Impacto:** Alto - Mejora significativa de la robustez del sistema y reducción drástica de errores 503
- **Estado:** ✅ **RESUELTO** - Resuelto por mejoras previas (Issue #125 y mejoras de retry-utils)
- **Relacionado con:**
  - Issue #125 (Primera llamada a APIs siempre falla) - ✅ RESUELTO - Pre-warm y retries centralizados resuelven el problema
  - Issue #30 (Logs verbosos de errores de API) - ✅ RESUELTO - Stack traces suprimidos, solo mensajes esenciales
  - Issue #14 (output inválido/null) - Problema relacionado de manejo de errores de validación

---

### Issue #124: Sistema de retries faltante en consulta de stats de enemigos en API de D&D ✅ RESUELTO

- **Fecha de creación:** 2025-01-23
- **Fecha de corrección:** 2025-01-23
- **Ubicación:** `src/lib/combat/monster-stats-parser.ts`, función `getMonsterStatsFromDndApi`
- **Severidad:** 🔴 **MUY ALTA** (afecta la fiabilidad del sistema de combate y causa fallos frecuentes)
- **Descripción:** Cuando el sistema intenta consultar stats de un enemigo en la API de D&D, casi siempre falla en el primer intento y no lo vuelve a intentar. El sistema de retries que ya existe en `retry-utils.ts` no está siendo utilizado en esta función.
- **Problema resuelto:**
  - ✅ La función `getMonsterStatsFromDndApi` ahora usa `retryWithExponentialBackoff` para reintentos automáticos
  - ✅ Maneja errores de red, timeouts y errores temporales de la API (5xx) con retries
  - ✅ No retrya errores 404 (monster no encontrado) - cachea stats por defecto inmediatamente
  - ✅ Solo usa stats por defecto si todos los reintentos fallan (4 intentos totales con backoff exponencial)
  - ✅ Mantiene el sistema de caché existente para evitar llamadas redundantes
- **Solución implementada:** ✅
  - Importado `retryWithExponentialBackoff` de `@/ai/flows/retry-utils`
  - Envuelto el fetch de la API de D&D en `retryWithExponentialBackoff` con 3 reintentos (4 intentos totales)
  - Configurado backoff exponencial (1s, 2s, 4s)
  - Implementada lógica para distinguir errores retryables (5xx, timeouts, errores de red) de no retryables (404)
  - Mejorado el logging para incluir información sobre reintentos
  - El sistema de caché solo cachea fallos después de agotar todos los reintentos (excepto 404 que se cachea inmediatamente)
- **Archivos modificados:**
  - `src/lib/combat/monster-stats-parser.ts` - Añadido import de `retryWithExponentialBackoff` y envuelto el fetch en retry logic
- **Impacto:** Muy Alto - Mejora significativamente la fiabilidad del sistema de combate, reduce el uso de stats por defecto incorrectos, y mejora la calidad de la experiencia de juego
- **Relacionado con:**
  - Issue #93 (Manejo de errores cuando se agotan los reintentos) - Similar problema de manejo de errores de API
  - Issue #29 (Stats de enemigos incorrectos en combate) - Puede estar relacionado con este problema
  - Issue #125 (Primera llamada a APIs siempre falla) - Problema relacionado de cold start
  - `retry-utils.ts` - Sistema de retries existente que ahora es utilizado
- **Referencia:** [Notas de Gael - #3](../notas/Notas%20de%20Gael.md)

---

### Issue #117: Simplificación de Arquitectura de Combate ✅ RESUELTO

- **Fecha de creación:** 2025-11-20
- **Fecha de corrección:** 2025-11-21
- **Ubicación:** `src/lib/combat/`, `src/ai/tools/combat/`
- **Severidad:** 🔴 **MUY ALTA** (afecta mantenibilidad, consistencia y facilita futuras mejoras)
- **Descripción:** El sistema de combate tenía una arquitectura excesivamente compleja con múltiples capas de delegación y duplicación de lógica. El flujo del jugador y el de la IA eran diferentes, causando inconsistencias y dificultando el mantenimiento.
- **Problema resuelto:**
  - ✅ Duplicación de lógica eliminada: `action-processor.ts` y `dice-roll-processor.ts` fusionados en `CombatActionExecutor`
  - ✅ Complejidad reducida: De 8-9 niveles de profundidad a 3-4 niveles
  - ✅ Módulos especiales eliminados: `first-turn-handler.ts` eliminado, flujo normal para todos los turnos
  - ✅ Inconsistencias resueltas: Jugador e IA ahora usan el mismo código
- **Solución implementada:** ✅
  - Creado `CombatActionExecutor` unificado que procesa cualquier acción de combate
  - Creado `TurnProcessor` unificado que maneja el flujo completo (planificación → intención → ejecución → resolución)
  - Simplificado `CombatInitializer` para solo inicializar estado
  - Refactorizado `CombatSession` para usar `TurnProcessor` en todos los casos
  - Eliminados módulos obsoletos: `action-processor.ts`, `dice-roll-processor.ts`, `first-turn-handler.ts`
- **Archivos modificados:**
  - ✅ Nuevo: `src/lib/combat/action-executor.ts` (unificado)
  - ✅ Nuevo: `src/lib/combat/turn-processor.ts` (unificado)
  - ✅ Nuevo: `src/lib/combat/roll-notation-utils.ts` (utilidades)
  - ✅ Modificado: `src/lib/combat/combat-session.ts` (usa TurnProcessor)
  - ✅ Modificado: `src/lib/combat/combat-initializer.ts` (simplificado)
  - ✅ Eliminado: `src/lib/combat/action-processor.ts`
  - ✅ Eliminado: `src/ai/tools/combat/dice-roll-processor.ts`
  - ✅ Eliminado: `src/lib/combat/initialization/first-turn-handler.ts`
- **Tests implementados:**
  - ✅ `tests/unit/combat/action-executor.test.ts` (5 tests)
  - ✅ `tests/unit/combat/turn-processor.test.ts` (6 tests)
  - ✅ `tests/integration/combat/unified-combat-flow.test.ts` (3 tests)
- **Documentación actualizada:**
  - ✅ `docs/arquitectura/arquitectura-backend.md`
  - ✅ `docs/arquitectura/flujo-datos.md`
  - ✅ `docs/testing/README.md`
- **Impacto:** Muy Alto - Mejora significativa de la arquitectura, facilita mantenimiento futuro y resuelve inconsistencias actuales
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada
- **Plan de implementación:** [Issue #117 - Simplificación de Arquitectura de Combate](../../planes-desarrollo/completados/issue-117-simplificacion-arquitectura-combate.md)
- **Relacionado con:**
  - Issue #94 (Refactorización de Prompts de Tacticians) - Resuelto problemas de consistencia
  - Issue #82 (Unificar sistema de procesamiento de tiradas) - Resuelto completamente (✅ RESUELTO)
  - Issue #21 (Código duplicado) - Eliminada duplicación (✅ RESUELTO)
  - Issue #119 (Testeo profundo del sistema de combate) - Testing después de esta refactorización (✅ RESUELTO)

---

### Issue #82: Unificar sistema de procesamiento de tiradas de dados (jugador, companions, enemigos) ✅ RESUELTO

- **Fecha de creación:** 2025-11-17
- **Fecha de corrección:** 2025-11-21 (resuelto como parte del Issue #117)
- **Ubicación:** `src/lib/combat/action-executor.ts`, `src/lib/combat/turn-processor.ts`
- **Severidad:** Media (deuda técnica)
- **Descripción:** El procesamiento de tiradas de datos estaba dividido en dos sistemas diferentes:
  - **Jugador:** Las tiradas se procesaban directamente en `combat-manager.ts`, calculando modificadores manualmente y llamando a `diceRollerTool` directamente
  - **Companions/Enemigos:** Las tiradas se generaban por la IA (tacticians) y luego se procesaban en `processAICombatantRolls` en `dice-roll-processor.ts`
- **Problema resuelto:**
  - ✅ Sistema unificado creado: `CombatActionExecutor` procesa tiradas para todos los tipos de combatientes (jugador, companions, enemigos)
  - ✅ Código duplicado eliminado: `action-processor.ts` y `dice-roll-processor.ts` fusionados en un solo módulo
  - ✅ Lógica consistente: Todos los combatientes usan el mismo flujo de procesamiento de tiradas
  - ✅ Mantenimiento simplificado: Cambios ahora se aplican en un solo lugar
  - ✅ Función `updateRollNotationWithModifiers` utilizada consistentemente en todos los casos
- **Solución implementada:** ✅
  - Creado `CombatActionExecutor` unificado que procesa cualquier acción de combate (ataque, hechizo, curación) para cualquier tipo de combatiente
  - Creado `TurnProcessor` unificado que maneja el flujo completo para jugador, companions y enemigos
  - Eliminados módulos obsoletos: `action-processor.ts` y `dice-roll-processor.ts`
  - Todos los combatientes ahora usan el mismo código para procesar tiradas de dados
- **Archivos modificados:**
  - ✅ Nuevo: `src/lib/combat/action-executor.ts` (sistema unificado)
  - ✅ Nuevo: `src/lib/combat/turn-processor.ts` (procesador unificado de turnos)
  - ✅ Eliminado: `src/lib/combat/action-processor.ts`
  - ✅ Eliminado: `src/ai/tools/combat/dice-roll-processor.ts`
- **Impacto:** Medio - Mejora significativa de mantenibilidad y consistencia. Todos los combatientes ahora usan el mismo sistema de procesamiento de tiradas.
- **Estado:** ✅ **RESUELTO** - Implementación completada como parte del Issue #117 (2025-11-21)
- **Prioridad:** Media
- **Relacionado con:**
  - Issue #117 (Simplificación de Arquitectura de Combate) - Resuelto como parte de esta refactorización (✅ RESUELTO)
  - Issue #21 (Código duplicado en combat-manager.ts) - Eliminada duplicación relacionada (✅ RESUELTO)

---

### Issue #21: Código duplicado en `combat-manager.ts` para procesamiento de rolls ✅ RESUELTO

- **Fecha de creación:** 2025-11-13
- **Fecha de corrección:** 2025-11-21 (resuelto como parte del Issue #117)
- **Ubicación:** `src/ai/tools/combat-manager.ts` (código duplicado eliminado)
- **Severidad:** Media (deuda técnica)
- **Descripción:** El procesamiento de dice rolls para AI combatants estaba duplicado en dos lugares: turnos normales (líneas 1241-1500) e iniciación de combate (líneas 2081-2340). Esta duplicación dificultaba el mantenimiento y causó que el fix del Issue #20 tuviera que aplicarse dos veces.
- **Problema resuelto:**
  - ✅ ~260 líneas de código duplicado eliminadas
  - ✅ Código unificado en `CombatActionExecutor` y `TurnProcessor`
  - ✅ Cambios ahora se aplican en un solo lugar
  - ✅ Eliminado riesgo de inconsistencias por actualizaciones en múltiples lugares
  - ✅ Eliminados módulos obsoletos: `action-processor.ts` y `dice-roll-processor.ts`
- **Solución implementada:** ✅
  - Creado `CombatActionExecutor` unificado que procesa cualquier acción de combate para cualquier tipo de combatiente
  - Creado `TurnProcessor` unificado que maneja el flujo completo (planificación → intención → ejecución → resolución)
  - Eliminada duplicación de lógica de procesamiento de rolls entre turnos normales e iniciación de combate
  - Todos los combatientes (jugador, companions, enemigos) ahora usan el mismo código
- **Archivos modificados:**
  - ✅ Nuevo: `src/lib/combat/action-executor.ts` (sistema unificado)
  - ✅ Nuevo: `src/lib/combat/turn-processor.ts` (procesador unificado de turnos)
  - ✅ Eliminado: `src/lib/combat/action-processor.ts`
  - ✅ Eliminado: `src/ai/tools/combat/dice-roll-processor.ts`
  - ✅ Simplificado: `src/ai/tools/combat-manager.ts` (código duplicado eliminado)
- **Impacto:** Medio - Mejora significativa de mantenibilidad. Eliminación de ~260 líneas de código duplicado y unificación del procesamiento de rolls.
- **Estado:** ✅ **RESUELTO** - Implementación completada como parte del Issue #117 (2025-11-21)
- **Prioridad:** Media
- **Relacionado con:**
  - Issue #117 (Simplificación de Arquitectura de Combate) - Resuelto como parte de esta refactorización (✅ RESUELTO)
  - Issue #82 (Unificar sistema de procesamiento de tiradas) - Problema relacionado también resuelto (✅ RESUELTO)
- **Referencia:** [Plan de Refactorización](../../planes-desarrollo/completados/issue-117-simplificacion-arquitectura-combate.md)

---

### Issue #119: Testeo profundo del sistema de combate después de refactorización ✅ RESUELTO

- **Fecha de creación:** 2025-11-22
- **Fecha de corrección:** 2025-01-27
- **Ubicación:** Sistema de combate completo (`src/lib/combat/`, `src/ai/tools/combat-manager.ts`, `src/ai/flows/action-interpreter.ts`)
- **Severidad:** 🟢 **MEDIA** (necesario para asegurar estabilidad y corrección del sistema refactorizado)
- **Descripción:** Después de la refactorización profunda del sistema de combate (Issue #117), era necesario realizar un testeo profundo y sistemático para verificar que todos los casos de uso funcionan correctamente y que no había regresiones de problemas anteriores.
- **Problema resuelto:**
  - ✅ Verificación sistemática de todos los casos de uso del sistema de combate
  - ✅ Confirmación de que los problemas específicos mencionados están corregidos:
    - Fallos al hacer target sobre enemigos con el mismo nombre en ubicaciones diferentes (corregido con `enemiesByLocation`)
    - Enemigos que no hacían nada en sus turnos (corregido con mejoras en `actionInterpreter` y `enemyTactician`)
  - ✅ Validación de que no hay regresiones de problemas anteriores
  - ✅ Sistema verificado como estable y predecible en todos los escenarios probados
- **Casos verificados:**
  - ✅ Identificación correcta de objetivos en combate (enemigos con nombres similares, múltiples enemigos del mismo tipo)
  - ✅ Turnos de enemigos se procesan correctamente en todos los escenarios
  - ✅ Turnos de compañeros funcionan correctamente
  - ✅ Manejo de enemigos muertos/inconscientes
  - ✅ Inicio de combate desde diferentes estados (exploración, interacción)
  - ✅ Finalización de combate y transición a exploración
  - ✅ Sincronización entre UI y estado del servidor
- **Solución implementada:** ✅
  - Testing exhaustivo del sistema de combate después de la refactorización
  - Verificación de casos de uso comunes y edge cases
  - Confirmación de que todos los flujos funcionan correctamente
  - Validación de que no hay regresiones de problemas anteriores
- **Archivos verificados:**
  - `src/lib/combat/` (todos los módulos del sistema de combate)
  - `src/ai/tools/combat-manager.ts`
  - `src/ai/flows/action-interpreter.ts`
  - `src/ai/flows/game-coordinator.ts`
- **Impacto:** Medio - Asegura la confiabilidad y estabilidad del sistema de combate después de la refactorización
- **Estado:** ✅ **RESUELTO** - Testing completado y sistema verificado (2025-01-27)
- **Prioridad:** Media
- **Relacionado con:**
  - Issue #117 (Simplificación de Arquitectura de Combate) - La refactorización que requería este testing (✅ RESUELTO)
  - Issue #92 (Identificación incorrecta de enemigo en combate) - Problema relacionado verificado como resuelto
  - Issue #112 (Sincronización entre DM y combat tracker) - Problema de sincronización verificado como resuelto
- **Referencia:** Reportado por usuario después de la refactorización (2025-11-22)

---

### Issue #120: Inconsistencia en Cálculos de Tiradas y Visualización (Merryl) ✅ RESUELTO

- **Fecha de creación:** 2025-11-23
- **Fecha de corrección:** 2025-11-23
- **Ubicación:** `src/lib/combat/roll-notation-utils.ts`, `src/lib/combat/action-resolver.ts`, `src/ai/tools/dice-roller.ts`
- **Severidad:** 🔴 **CRÍTICA** (Cálculos de daño incorrectos y feedback visual engañoso)
- **Descripción:** Se habían detectado dos bugs críticos que interactuaban entre sí causando que las tiradas de daño fueran incorrectas y que la UI mostrara información falsa.
    1. **Visualización engañosa:** `updateRollNotationWithModifiers` seleccionaba automáticamente el modificador más alto (ej: DES +3) para "embellecer" el desglose visual, incluso si el ataque se calculó usando otro atributo (ej: FUE -1).
    2. **Cálculo de daño erróneo:** `CombatActionResolver` generaba notaciones inválidas para modificadores negativos (ej: `1d8+-1`). La regex del `diceRollerTool` no soportaba el formato `+-`, por lo que ignoraba el modificador y lo trataba como 0.
- **Problema resuelto:**
  - ✅ Selección inteligente de habilidad implementada basándose en reglas D&D 5e (FUE/DES según tipo de arma)
  - ✅ `CombatActionResolver` ahora inyecta `attributeUsed` en el objeto de tirada
  - ✅ Frontend usa `attributeUsed` en lugar de "adivinar" el modificador
  - ✅ Formateo correcto de números negativos (`1d8-1` en lugar de `1d8+-1`)
  - ✅ Parser robustecido para soportar variaciones en notación
- **Solución implementada:** ✅
  - Arquitectura "Cerebro Centralizado, Frontend Obediente" implementada
  - Helper `getWeaponAbility` creado para determinar atributo (FUE/DES)
  - Helper `formatDiceNotation` implementado para formatear correctamente signos
  - Inyección de contexto: `attributeUsed` añadido a objetos de tirada
  - Frontend determinista: `updateRollNotationWithModifiers` usa `attributeUsed` proporcionado
- **Impacto:** Crítico - Resuelto completamente. Afectaba la integridad matemática del juego y la confianza del usuario.
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada (2025-11-23)
- **Prioridad:** Muy Alta
- **Relacionado con:**
  - Issue #121 (Regresión en Parsing de Armas) - Regresión introducida durante su implementación
  - Issue #122 (Nombres de Enemigos sin Número Distintivo) - Regresión introducida durante su implementación

---

### Issue #121: Regresión en Parsing de Armas en Ataques de Jugador ✅ RESUELTO

- **Fecha de creación:** 2025-11-23
- **Fecha de corrección:** 2025-01-23
- **Ubicación:** `src/lib/combat/turn-processor.ts`, `src/lib/combat/action-resolver.ts`, `src/lib/combat/roll-notation-utils.ts`
- **Severidad:** 🔴 **CRÍTICA** (Bloquea completamente los ataques de jugadores)
- **Descripción:** Tras implementar el Issue #120, se introdujo una regresión crítica que bloquea completamente los ataques de jugadores. El sistema pasaba **toda la acción del jugador** (ej: "Ataco al goblin 1") como `weaponQuery` a `CombatActionResolver.resolveAttack()`, en lugar de extraer solo el nombre del arma.
- **Problema resuelto:**
  - ✅ Función `extractWeaponName()` implementada para parsear nombres de armas desde acciones de jugador
  - ✅ Parsing robusto con soporte para caracteres acentuados en español
  - ✅ Fallback seguro a `'ataque'` cuando no se menciona arma específica
  - ✅ Armas a distancia (arcos, ballestas) ahora usan DES correctamente
  - ✅ Frontend "obediente" que no adivina atributos, recibe `attributeUsed` del backend
  - ✅ Visualización mejorada: tipo de ataque (melee/ranged) visible en panel de tiradas
  - ✅ Notación unificada: todos los combatantes muestran atributos de forma consistente, incluso con modificador 0
  - ✅ Desglose completo: muestra el modificador 0 cuando corresponde (ej: "1+0")
- **Solución implementada:** ✅
  - Función helper `extractWeaponName()` creada con patrones regex para extraer nombres de armas
  - Integrada en `TurnProcessor` para determinar `weaponQuery` antes de llamar a `CombatActionResolver`
  - Añadido `attributeUsed` a `DiceRollRequest` y establecido correctamente según tipo de arma
  - Añadido `attackRange` a `DiceRoll` y `DiceRollRequest` para indicar tipo de ataque
  - Eliminada lógica legacy de adivinación en frontend, ahora lanza error si falta `attributeUsed`
  - Modificada `updateRollNotationWithModifiers` para siempre mostrar atributo usado, incluso con modificador 0
- **Archivos modificados:**
  - ✅ `src/lib/combat/turn-processor.ts` - Función `extractWeaponName()` e integración
  - ✅ `src/lib/combat/action-resolver.ts` - Añadido `attributeUsed` y `attackRange` a `DiceRollRequest`
  - ✅ `src/lib/combat/roll-notation-utils.ts` - Eliminada lógica legacy, siempre mostrar atributo
  - ✅ `src/lib/types.ts` - Añadido `attackRange` a `DiceRoll`
  - ✅ `src/lib/combat/action-executor.ts` - Preservar `attackRange` al crear `DiceRoll`
  - ✅ `src/components/game/dice-roll-result.tsx` - Mostrar indicador visual de tipo de ataque
- **Tests implementados:**
  - ✅ `tests/unit/combat/extract-weapon-name.test.ts` (24 tests unitarios)
  - ✅ `tests/unit/combat/turn-processor.test.ts` (5 tests de integración adicionales)
- **Impacto:** Crítico - Resuelto completamente. Restaura funcionalidad de combate para jugadores y mejora la arquitectura del sistema.
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada (2025-01-23)
- **Prioridad:** Muy Alta
- **Plan de implementación:** [Issue #121 - Fix Weapon Parsing Regression](../../planes-desarrollo/completados/issue-121-fix-weapon-parsing.md)
- **Relacionado con:**
  - Issue #120 (Inconsistencia en Cálculos de Tiradas) - Regresión introducida durante su implementación (✅ RESUELTO)
  - Issue #115 (Validación de inventario) - Problema relacionado de validación de armas en inventario (✅ RESUELTO)

---

### Issue #115: Validación de inventario al usar armas u objetos ✅ RESUELTO

- **Fecha de creación:** 2025-11-18
- **Fecha de corrección:** 2025-01-27
- **Ubicación:** `src/lib/combat/turn-processor.ts`, `src/lib/combat/action-resolver.ts`, `src/lib/combat/combat-session.ts`, `src/components/game/game-view.tsx`
- **Severidad:** 🟡 **ALTA** (afecta la coherencia del juego y permite acciones imposibles)
- **Descripción:** En combate, cuando el jugador intentaba usar un arma, hechizo u objeto que no tenía en su inventario, el sistema lo procesaba igualmente sin validar, permitiendo acciones imposibles y rompiendo la inmersión.
- **Problema resuelto:**
  - ✅ Validación de armas: El sistema valida que el arma mencionada está en el inventario antes de procesar el ataque
  - ✅ Validación de hechizos: El sistema valida que el hechizo mencionado está en la lista de hechizos conocidos del personaje
  - ✅ Validación de objetos: El sistema valida que el objeto mencionado está en el inventario y tiene cantidad > 0
  - ✅ Errores específicos que no avanzan el turno, permitiendo al jugador reintentar la acción
  - ✅ Frontend detecta errores de inventario y resetea `playerActionCompleted` automáticamente
- **Solución implementada:** ✅
  - Funciones de extracción: `extractWeaponName()`, `extractSpellName()`, `extractItemName()` para parsear acciones del jugador
  - Métodos de validación en `CombatActionResolver`: `validateSpell()`, `validateItem()`
  - Validación automática en `TurnProcessor` cuando el jugador menciona hechizos u objetos
  - Códigos de error específicos: `WEAPON_NOT_IN_INVENTORY`, `SPELL_NOT_KNOWN`, `ITEM_NOT_IN_INVENTORY`
  - Estos errores no avanzan el turno en `CombatSession`, permitiendo reintentar
  - Frontend detecta mensajes de error y habilita el input automáticamente
- **Archivos modificados:**
  - ✅ `src/lib/combat/combat-session.ts` - Añadidos códigos de error que no avanzan turno
  - ✅ `src/lib/combat/turn-processor.ts` - Funciones de extracción y validación
  - ✅ `src/lib/combat/action-resolver.ts` - Métodos de validación de hechizos y objetos
  - ✅ `src/components/game/game-view.tsx` - Detección de errores en frontend
  - ✅ `tests/unit/combat/turn-processor.test.ts` - Tests para validación
- **Impacto:** Alto - Mejora la coherencia del juego y previene acciones imposibles. El jugador ahora recibe feedback claro cuando intenta usar algo que no tiene.
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada (2025-01-27)
- **Prioridad:** Alta
- **Plan de implementación:** [Issue #115 - Validación de Inventario](../../planes-desarrollo/completados/issue-115-validacion-inventario.md)
- **Referencia:** [Notas de Gael - #115](../notas/Notas%20de%20Gael.md)
- **Relacionado con:**
  - Issue #121 (Regresión en Parsing de Armas) - Problema relacionado de validación/búsqueda de armas en inventario (✅ RESUELTO)

---

### Issue #123: DM traduce nombres de enemigos en narraciones de combate (trasgo vs Goblin) ✅ RESUELTO

- **Fecha de creación:** 2025-01-23
- **Fecha de corrección:** 2025-01-23
- **Ubicación:** `src/ai/tools/combat/combat-narration-expert.ts`
- **Severidad:** 🔴 **CRÍTICA** (Afecta coherencia narrativa y confusión del jugador)
- **Descripción:** El DM estaba traduciendo los nombres de enemigos en las narraciones de combate. Por ejemplo, cuando se refiere a "Goblin 2", el DM lo narraba como "trasgo 2" (traducción al español), en lugar de usar el nombre exacto "Goblin 2" que se utiliza en el sistema.
- **Problema resuelto:**
  - ✅ Instrucción explícita añadida en el prompt para usar nombres exactos
  - ✅ Ejemplos actualizados para usar nombres específicos con números (ej: "Goblin 2" en lugar de "goblin")
  - ✅ Consistencia entre UI y narración restaurada
- **Solución implementada:** ✅
  - Añadida instrucción CRITICAL en el prompt: "You MUST use EXACTLY the name "{{{attackerName}}}" when referring to the attacker and "{{{targetName}}}" when referring to the target in your narration. DO NOT translate or change these names (e.g., if it's "Goblin 2", write "Goblin 2", NOT "trasgo 2" or "goblin 2")."
  - Actualizados los ejemplos del prompt para usar nombres específicos: "Goblin 2", "Goblin 1", "Orco 1" en lugar de genéricos "goblin", "orco"
  - Añadida instrucción adicional en Requirements: "MUST use exact names"
- **Archivos modificados:**
  - ✅ `src/ai/tools/combat/combat-narration-expert.ts` (prompt de `combatNarrationPrompt`, líneas 38-73)
- **Impacto:** Crítico - Resuelto completamente. La coherencia narrativa ahora es consistente entre UI y narraciones del DM.
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada (2025-01-23)
- **Prioridad:** Muy Alta
- **Relacionado con:**
  - Issue #34 (AI de enemigos traduce/inventa nombres) - Problema similar ya corregido en `enemyTacticianTool` (✅ RESUELTO)
  - Issue #118 (Narración de inicio de combate menciona enemigos incorrectos) - Problema relacionado de nombres incorrectos (✅ RESUELTO)
- **Detección:** Observado durante gameplay manual - DM narró "trasgo 2" cuando el sistema usa "Goblin 2"

---

### Issue #116: Tirada de ataque del jugador no especifica arma utilizada ✅ RESUELTO

- **Fecha de creación:** 2025-11-18
- **Fecha de corrección:** 2025-11-18
- **Ubicación:** `src/ai/tools/combat-manager.ts`, sistema de procesamiento de tiradas del jugador
- **Severidad:** 🔴 **MUY ALTA** (afecta claridad y precisión de las acciones del jugador)
- **Descripción:** La tirada de ataque del jugador no especificaba con qué arma la estaba haciendo, lo que reducía la claridad narrativa y la precisión de las acciones.
- **Comportamiento esperado:** El sistema debe mostrar qué arma se está usando en la tirada de ataque del jugador, similar a como se hace con enemigos y compañeros. Si el jugador no especifica arma, el DM debería preguntarle qué arma usa.
- **Solución implementada:** ✅
  - Incluida información del arma en el mensaje de tirada de ataque del jugador
  - Mejorada la claridad narrativa y la precisión de las acciones
- **Archivos modificados:**
  - ✅ `src/ai/tools/combat-manager.ts` (procesamiento de tiradas del jugador)
- **Impacto:** Muy alto - Mejora la claridad de las acciones del jugador y la inmersión del juego.
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada
- **Referencia:** [Notas de Gael - #116](../notas/Notas%20de%20Gael.md)

---

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

### Issue #122: Nombres de Enemigos sin Número Distintivo en Panel de Tiradas ✅ RESUELTO

- **Fecha de creación:** 2025-11-23
- **Fecha de corrección:** 2025-11-23
- **Ubicación:** `src/lib/combat/action-resolver.ts`, `src/lib/combat/action-executor.ts`
- **Severidad:** 🟡 **MEDIA** (Afectaba claridad visual pero no bloqueaba funcionalidad)
- **Descripción:** Tras implementar el Issue #120, los nombres de los enemigos en el panel de tiradas ya no mostraban el número distintivo (ej: "Goblin 1", "Goblin 2"). En su lugar, solo mostraban el nombre base (ej: "Goblin").
- **Problema resuelto:**
  - ✅ Nombres de enemigos en panel de tiradas ahora incluyen número distintivo
  - ✅ `CombatActionResolver` usa `getVisualName()` para obtener nombres con números distintivos
  - ✅ `roller` name en `DiceRollRequest` usa el nombre visual correcto
- **Solución implementada:** ✅
  - Restaurada lógica que añade número distintivo al nombre del enemigo
  - Verificado que tanto `roller` como `targetName` usen nombres visuales
- **Impacto:** Medio - Claridad visual restaurada en combates con múltiples enemigos del mismo tipo
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada (2025-11-23)
- **Prioridad:** 🟡 Alta
- **Relacionado con:**
  - Issue #120 (Inconsistencia en Cálculos de Tiradas) - Regresión introducida durante su implementación

---

### Issue #94: Refactorización de Prompts de Tacticians - Separación de Narración y Decisión Táctica ✅ RESUELTO

- **Fecha de creación:** 2025-11-18
- **Fecha de corrección:** 2025-11-21
- **Ubicación:** `src/ai/tools/enemy-tactician.ts`, `src/ai/tools/companion-tactician.ts`, `src/ai/tools/combat/combat-narration-expert.ts`, `src/lib/combat/`
- **Severidad:** 🟡 **ALTA** (mejora arquitectura, consistencia narrativa y reduce complejidad de prompts)
- **Descripción:** Los tacticians (`enemyTacticianTool` y `companionTacticianTool`) generaban tanto la decisión táctica como la narración, creando prompts complejos, inconsistencias narrativas y dificultando el mantenimiento.
- **Problema original:**
  - Responsabilidades mezcladas: Los tacticians decidían la acción Y la narraban
  - Inconsistencia narrativa: El estilo de narración de la IA (enemigos y compañeros) difería del `combatNarrationExpertTool` usado para el jugador
  - Complejidad de prompts: Prompts largos y complejos aumentaban el riesgo de errores de validación
  - Mantenimiento difícil: Mejorar la calidad narrativa requería editar múltiples archivos
- **Solución implementada:** ✅
  - **Tacticians simplificados:** Ahora solo generan decisión táctica (`targetId`, `diceRolls`, `actionDescription`), sin narración
  - **Narración centralizada:** `combatNarrationExpertTool` genera narraciones completas (preparación + ejecución + resultado) para todos los turnos
  - **Flujo simplificado:** Un solo mensaje narrativo por turno de IA, más limpio y fluido
  - **Schema simplificado:** Eliminado `narrationType` (intention/resolution), ahora solo narraciones completas
  - **Bug corregido:** Añadido `combatNarrationExpertTool` al `CombatInitContext` para que esté disponible desde el primer turno
- **Beneficios logrados:**
  - ✅ Consistencia narrativa total entre jugador, compañeros y enemigos
  - ✅ Prompts más simples = menos errores de validación
  - ✅ Mejoras de narración aplicables centralmente a todos los turnos
  - ✅ Experiencia mejorada: un solo mensaje narrativo por turno de IA
  - ✅ Código más limpio y mantenible
- **Archivos modificados:**
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
- **Impacto:** Alto - Mejora arquitectura, reduce errores, mejora consistencia narrativa y experiencia del usuario
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada
- **Referencia:** [Plan Completado](../../planes-desarrollo/completados/issue-94-refactorizacion-prompts-tacticians.md)

---

### Issue #118: Narración de inicio de combate menciona enemigos incorrectos ✅ RESUELTO

- **Fecha de creación:** 2025-11-20
- **Fecha de corrección:** 2025-01-22
- **Ubicación:** `src/ai/flows/narrative-manager.ts`, `src/lib/combat/initialization/narration-processor.ts`
- **Severidad:** 🟡 **ALTA** (afecta la inmersión y la coherencia narrativa)
- **Descripción:** La narración de inicio de combate generada por `combatInitiationPrompt` mencionaba nombres de enemigos incorrectos. Por ejemplo, cuando se combatía contra goblins, la narración mencionaba "gnomos" en lugar de "goblins".
- **Problema identificado:**
  - La IA estaba inventando o confundiendo los nombres de los enemigos en la narración de inicio
  - El prompt de `combatInitiationPrompt` no era lo suficientemente explícito sobre usar los nombres exactos del `combatContext`
  - La IA podía estar usando información del historial de conversación o inventando nombres en lugar de usar los del contexto de combate
- **Solución implementada:** ✅
  - Reforzado el prompt de `combatInitiationPrompt` con instrucciones explícitas sobre usar los tipos exactos de enemigos del `combatContext`
  - Añadida sección "CRITICAL - ENEMY TYPES" con instrucciones detalladas:
    - Extraer el tipo base de los nombres diferenciados (remove numbers: "Goblin 1" → "Goblin")
    - Usar el tipo exacto en español (Goblin → goblin, Orc → orco, NO "gnomo" o nombres inventados)
    - Permitir agrupación natural: "dos goblins" en lugar de "Goblin 1 y Goblin 2"
    - Ser inmersivo y descriptivo mientras se mantiene la precisión sobre los tipos de enemigos
    - Ejemplo: "Goblin 1", "Goblin 2", "Orco 1" → narrar como "dos goblins y un orco"
  - Verificado que el `combatContext` se está pasando correctamente con los nombres diferenciados
- **Mejora adicional (2025-01-22):**
  - Actualizado el prompt para permitir agrupación natural de enemigos, mejorando la inmersión
  - La narración ahora agrupa enemigos del mismo tipo de forma natural ("dos goblins" en lugar de listar "Goblin 1 y Goblin 2")
  - Mantiene la precisión sobre tipos de enemigos mientras mejora la fluidez narrativa
  - Prompt refinado manualmente para mayor claridad y permisividad (uso de "You can" en lugar de imperativos)
- **Archivos modificados:**
  - ✅ `src/ai/flows/narrative-manager.ts` (prompt de `combatInitiationPrompt` reforzado con instrucciones explícitas y agrupación natural, refinado manualmente)
  - ✅ `src/lib/combat/initialization/narration-processor.ts` (verificado correcto - construye combatContext con nombres diferenciados)
- **Impacto:** Alto - Mejora la inmersión y la coherencia narrativa del inicio de combate, asegurando que los tipos de enemigos sean exactos mientras permite narraciones más naturales y fluidas
- **Estado:** ✅ **RESUELTO Y VERIFICADO** - Prompt reforzado con instrucciones explícitas y agrupación natural, refinado y verificado (2025-01-22)
- **Relacionado con:**
  - Issue #34 (AI de enemigos traduce/inventa nombres) - Similar problema pero en narraciones de turnos
- **Tiempo invertido:** ~45 minutos (incluyendo mejora de inmersión)

---

### Issue #14: AI Tacticians (enemigos y companions) a veces devuelven output inválido/null en combate ✅ RESUELTO

- **Fecha de creación:** 2025-11-12
- **Fecha de corrección:** 2025-11-18
- **Ubicación:** `src/ai/tools/enemy-tactician.ts`, `src/ai/tools/companion-tactician.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad:** 🔴 **ALTA** (bloquea turnos completos de combatientes)
- **Descripción:** Durante el combate, tanto enemigos como companions a veces devuelven output nulo o inválido que falla la validación del schema de Genkit, causando que no realicen ninguna acción en su turno.
- **Problema identificado:**
  - Fallo de schema validation: El AI de Gemini devuelve output que no cumple con el schema
  - Posibles causas: AI no encuentra información en D&D API, prompts muy largos/complejos, filtros de seguridad, timeouts de conexión
- **Mejoras implementadas que resolvieron el problema:** ✅
  - **Fase 1 - Logging detallado:**
    - ✅ Añadido logging detallado en `companion-tactician.ts` para capturar input, respuesta y errores
    - ✅ Añadido logging detallado en `enemy-tactician.ts` para capturar errores de validación
  - **Retry logic con exponential backoff:**
    - ✅ Añadido `retryWithExponentialBackoff` a `companionTacticianTool` y `enemyTacticianTool` para manejar timeouts y errores transitorios
    - Esto resuelve problemas de conexión que causaban outputs nulos
  - **Prompts mejorados:**
    - ✅ Prompts actualizados con instrucciones más claras y explícitas sobre cómo generar rolls
    - ✅ Añadidos ejemplos detallados y obligatorios para cada tipo de acción
    - ✅ Instrucciones más específicas sobre el formato de `diceRolls` y `attackType`
  - **Schemas actualizados:**
    - ✅ Especificación explícita del tipo de cada roll (`attackType: 'attack_roll' | 'saving_throw' | 'healing'`)
    - ✅ Mejora en la validación del schema, reduciendo errores de validación
  - **Filtrado de personajes muertos:**
    - ✅ Modificado `combat-manager.ts` para filtrar personajes muertos antes de pasarlos a los AI tacticians
    - Reduce casos edge que podrían causar errores
- **Verificación:**
  - ✅ **No reproducido desde las mejoras:** Después de implementar las mejoras (retry logic, prompts mejorados, schemas actualizados), el problema no se ha vuelto a reproducir en todas las pruebas realizadas
  - Las mejoras implementadas (especialmente el retry logic y los prompts mejorados) han resuelto efectivamente el problema
- **Archivos modificados:**
  - ✅ `src/ai/tools/enemy-tactician.ts` (retry logic, logging, prompts mejorados)
  - ✅ `src/ai/tools/companion-tactician.ts` (retry logic, logging, prompts mejorados)
  - ✅ `src/ai/tools/combat-manager.ts` (filtrado de personajes muertos)
- **Relacionado con:** 
  - Issue #79 (Narraciones de combate para turnos del jugador) ✅ RESUELTO
  - Issue #94 (Refactorización de Prompts de Tacticians) - La refactorización futura podría simplificar aún más los prompts
  - Roadmap - Sección 7 "Narración Unificada para Todos los Turnos" (refactorización futura de tacticians)
- **Impacto:** Alto - El sistema ahora es más robusto y maneja correctamente los turnos de enemigos y companions, evitando que se queden sin acción por errores de validación o timeouts.
- **Estado:** ✅ **RESUELTO** - No reproducido desde las mejoras implementadas. El problema ha sido efectivamente resuelto por las mejoras en retry logic, prompts y schemas.

---

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

---

### Issue #15: Mejora de búsqueda en D&D API para monstruos no mapeados ✅ RESUELTO

- **Fecha de creación:** 2025-11-12
- **Fecha de corrección:** 2025-01-22 (implementado como parte de Issue #125 - Unificación de APIs)
- **Ubicación:** `src/lib/dnd-api-client.ts`
- **Severidad:** Baja
- **Descripción:** Cuando un monstruo, hechizo o equipo no estaba en el mapeo español→inglés, el sistema intentaba buscar con el nombre normalizado (sin acentos), pero si el nombre estaba en español y no tenía equivalente directo, la búsqueda fallaba.
- **Problema resuelto:**
  - ✅ Sistema de búsqueda mejorado con fallback de dos niveles
  - ✅ Mapeo español→inglés extenso implementado
  - ✅ Normalización inteligente que busca mapeo directo, parcial, o normaliza el nombre
  - ✅ Búsqueda por endpoint cuando el fetch directo falla
- **Solución implementada:** ✅
  - Implementado en `src/lib/dnd-api-client.ts` como parte de la unificación de APIs (Issue #125)
  - **Mapeo español→inglés extenso:** `SPANISH_TO_ENGLISH_MAP` con más de 100 entradas para monstruos, hechizos y equipamiento
  - **Normalización inteligente:** La función `normalizeQuery`:
    - Busca mapeo directo en el diccionario
    - Busca mapeo parcial para consultas de múltiples palabras
    - Si no encuentra mapeo, normaliza el nombre (quita acentos) y lo devuelve
  - **Sistema de fallback de dos niveles en `searchResource`:**
    1. **Primer intento:** Fetch directo por nombre normalizado (`/${resourceType}/${formattedQuery}`)
    2. **Segundo intento:** Si falla, usa endpoint de búsqueda (`/${resourceType}/?name=${normalizedQuery}`)
    3. Si encuentra resultados, obtiene el detalle del primer resultado encontrado
  - Esto permite encontrar monstruos incluso si no están en el mapeo, usando el nombre normalizado o la búsqueda por endpoint
- **Archivos modificados:**
  - ✅ `src/lib/dnd-api-client.ts` (implementación completa del sistema de búsqueda mejorado)
- **Impacto:** Bajo - Mejora la capacidad del sistema para encontrar información de monstruos, hechizos y equipamiento incluso cuando no están en el mapeo manual
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada (2025-01-22)
- **Prioridad:** Baja
- **Relacionado con:**
  - Issue #125 (Unificación de APIs) - Implementado como parte de esta mejora (✅ RESUELTO)

---

### Issue #30: Errores de conexión a APIs con logs verbosos ✅ RESUELTO

- **Fecha de creación:** 2025-11-14
- **Fecha de corrección:** 2025-11-21
- **Ubicación:** `src/ai/flows/retry-utils.ts`, `src/ai/flows/action-interpreter.ts` y otros módulos que usan APIs
- **Severidad:** 🟡 **MEDIA** (afecta legibilidad de logs)
- **Descripción:** Los errores de conexión a las APIs (especialmente Gemini API) generaban logs muy verbosos que ocupaban mucho espacio en la terminal, dificultando la lectura de otros logs importantes.
- **Problema resuelto:**
  - ✅ Stack traces completos suprimidos en errores de conexión
  - ✅ Mensajes de error simplificados mostrando solo información esencial
  - ✅ Stack traces limitados solo a la función `retryWithExponentialBackoff`
  - ✅ Logs más legibles y fáciles de diagnosticar
- **Solución implementada:** ✅
  - Modificado `retryWithExponentialBackoff` en `src/ai/flows/retry-utils.ts` para crear errores limpios sin stack traces completos
  - Cuando se agotan los reintentos, se crea un nuevo error con mensaje limpio: `API call failed: [mensaje] ([código])`
  - Se usa `Error.captureStackTrace` para limitar el stack trace solo a la función `retryWithExponentialBackoff`
  - Los errores ahora muestran solo el mensaje esencial y código de error, sin stack traces largos
- **Archivos modificados:**
  - ✅ `src/ai/flows/retry-utils.ts` (líneas 66-91, 114-137: creación de errores limpios)
- **Impacto:** Medio - Mejora significativa de la legibilidad de logs durante desarrollo. Los errores de API ahora son más fáciles de diagnosticar sin stack traces verbosos.
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada (2025-11-21)
- **Prioridad:** Media
- **Relacionado con:**
  - Issue #125 (Primera llamada a APIs siempre falla) - Mejoras relacionadas en manejo de errores de API (✅ RESUELTO)

---

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

### Issue #66: Orden incorrecto de mensajes en muerte masiva ✅ RESUELTO

- **Fecha de creación:** 2025-11-16
- **Fecha de corrección:** 2025-11-18
- **Ubicación:** `src/ai/tools/combat/dice-roll-processor.ts`
- **Severidad:** 🟡 **ALTA** (afecta narrativa, secuencia ilógica, confunde al jugador)
- **Descripción:** Cuando un personaje recibe muerte masiva (daño restante >= HP máximo), el mensaje "ha recibido un golpe devastador y muere instantáneamente" aparecía ANTES del mensaje de daño, causando una secuencia ilógica.
- **Contexto:** Detectado durante Test 1.1 (Flujo Completo de Inicio de Combate). Este bug es similar al Issue #35, pero afecta específicamente al caso de muerte masiva, que no fue corregido cuando se resolvió el Issue #35.
- **Secuencia incorrecta (antes):**
  1. Narración del enemigo
  2. "Goblin 2 ataca a Merryl y acierta (12 vs AC 10)."
  3. ❌ **"Merryl ha recibido un golpe devastador y muere instantáneamente."** (PREMATURO)
  4. "Goblin 2 ha hecho 7 puntos de daño a Merryl (2 → 0 HP)."
  5. "¡Goblin 2 ha matado a Merryl!"
- **Secuencia correcta (después):**
  1. Narración del enemigo
  2. "Goblin 2 ataca a Merryl y acierta (12 vs AC 10)."
  3. "Goblin 2 ha hecho 7 puntos de daño a Merryl (2 → 0 HP)."
  4. ✅ **"Merryl ha recibido un golpe devastador y muere instantáneamente."** (DESPUÉS del daño)
  5. ✅ **"¡Goblin 2 ha matado a Merryl!"** (DESPUÉS del mensaje anterior)
- **Causa raíz:** En `dice-roll-processor.ts`, el mensaje de muerte masiva se añadía dentro del `map()` que actualizaba el HP, mientras que el mensaje de daño se añadía después del `map()`. Esto causaba que el mensaje de muerte masiva apareciera antes del mensaje de daño.
- **Solución implementada:** ✅
  - Añadido flag `massiveDamageDeath` para rastrear cuando ocurre muerte masiva (línea 442)
  - El flag se establece durante el cálculo de daño cuando se detecta muerte masiva (línea 457)
  - El mensaje de daño se añade primero (líneas 505-510)
  - El mensaje de muerte masiva se añade DESPUÉS del mensaje de daño, solo si el flag está activo (líneas 535-539)
  - El mensaje "ha matado" se añade después del mensaje de muerte masiva (líneas 541-544)
  - Mantiene la misma estructura que se usó para corregir el Issue #35 (mensajes de inconsciencia)
- **Archivos modificados:**
  - ✅ `src/ai/tools/combat/dice-roll-processor.ts` (líneas 441-540: flag de muerte masiva y orden correcto de mensajes)
- **Impacto:** Alto - La narrativa ahora es coherente, los mensajes aparecen en el orden lógico correcto, mejorando la experiencia del jugador
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada
- **Relacionado con:** Issue #35 (orden incorrecto de mensajes - corregido para inconsciencia, ahora también corregido para muerte masiva)
- **Detección:** Testing manual - Test 1.1 (Flujo Completo de Inicio de Combate)

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

### Issue #113: Mensaje de muerte faltante cuando el jugador mata a un enemigo ✅ RESUELTO

- **Fecha de creación:** 2025-11-18
- **Fecha de corrección:** 2025-11-18
- **Ubicación:** `src/ai/tools/combat/dice-roll-processor.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad:** 🟢 **MEDIA** (afecta consistencia de mensajes y feedback visual)
- **Descripción:** En combate, cuando el jugador mataba a un enemigo en la tirada de daño no aparecía el mensaje como sí lo hacía en las de enemigos o compañeros: "💀 ¡Elara ha matado a Goblin 2!".
- **Problema:** Falta de consistencia en los mensajes de confirmación de muerte. Los enemigos y compañeros mostraban este mensaje, pero el jugador no.
- **Solución implementada:** ✅
  - Añadido el mensaje de confirmación de muerte cuando el jugador mata a un enemigo
  - Mantenido el mismo formato que se usa para enemigos y compañeros
  - Asegurado que el mensaje se muestra en el momento correcto (después del daño)
- **Archivos modificados:**
  - ✅ `src/ai/tools/combat/dice-roll-processor.ts` (procesamiento de tiradas de daño)
  - ✅ `src/ai/tools/combat-manager.ts` (procesamiento de acciones del jugador)
- **Impacto:** Medio – Mejora la consistencia de feedback y la claridad de las acciones del jugador
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada
- **Referencia:** [Notas de Gael - #113](../notas/Notas%20de%20Gael.md)

---

### Issue #112: Sincronización entre DM y combat tracker ✅ RESUELTO

- **Fecha de creación:** 2025-11-18
- **Fecha de corrección:** 2025-01-22
- **Ubicación:** `src/components/game/game-view.tsx`, `src/components/game/initiative-tracker.tsx`, `src/ai/tools/combat-manager.ts`
- **Severidad:** 🟢 **MEDIA** (afecta sincronización visual del estado del combate)
- **Descripción:** En combate, cuando se pasa 1 turno mientras en el chat sale "el DM está pensando..." el combat tracker aún estaba en el turno anterior.
- **Problema resuelto:** Había un desfase entre el estado del DM (procesando) y el estado visual del combat tracker, lo que podía confundir al jugador sobre qué turno estaba activo.
- **Solución implementada:** ✅
  - Mejorada la sincronización entre el estado del DM y el combat tracker
  - Actualizado el `turnIndex` en el frontend inmediatamente cuando se inicia el procesamiento de un turno
  - Asegurado que ambos reflejen el mismo estado del combate
- **Archivos afectados:**
  - `src/components/game/game-view.tsx` (gestión de estado de combate)
  - `src/components/game/initiative-tracker.tsx` (visualización del orden de combate)
  - `src/ai/tools/combat-manager.ts` (procesamiento de turnos)
- **Impacto:** Medio – Mejora la claridad visual del estado del combate, eliminando confusión sobre qué turno está activo
- **Estado:** ✅ **RESUELTO** - Sincronización implementada y verificada
- **Referencia:** [Notas de Gael - #112](../notas/Notas%20de%20Gael.md)

---

### Issue #76: Input debe deshabilitarse cuando el DM está "pensando" ✅ RESUELTO

- **Fecha de creación:** 2025-11-17
- **Fecha de corrección:** 2025-01-22
- **Ubicación:** `src/components/game/player-input.tsx`, `src/components/game/chat-panel.tsx`
- **Severidad:** 🟢 **MEDIA** (posible pérdida de acciones y UX confusa)
- **Descripción:** Mientras el DM estaba procesando (estado "El DM está pensando"), el cuadro de texto seguía habilitado, permitiendo que el jugador enviara nuevas órdenes que se perdían o quedaban en cola sin feedback.
- **Problema resuelto:** El textarea no estaba completamente deshabilitado cuando el DM estaba pensando, solo el botón de enviar estaba deshabilitado. Esto permitía que el jugador escribiera mensajes que luego se perdían o causaban confusión.
- **Solución implementada:** ✅
  - Añadida prop `isDMThinking` al componente `PlayerInput` para recibir el estado del DM
  - Deshabilitado el textarea cuando `disabled` es `true` (incluyendo cuando `isDMThinking` es `true`)
  - Actualizado el placeholder para mostrar "El DM está pensando..." cuando el DM está procesando
  - El input se rehabilita automáticamente cuando el backend responde (el flag `isDMThinking` se establece a `false` en el bloque `finally` de `handleSendMessage`)
- **Archivos modificados:**
  - ✅ `src/components/game/player-input.tsx` (añadida prop `isDMThinking`, textarea deshabilitado cuando `disabled` es true, placeholder actualizado)
  - ✅ `src/components/game/chat-panel.tsx` (pasada prop `isDMThinking` al componente `PlayerInput`)
- **Impacto:** Medio – Evita confusiones y asegura que las acciones se registren en el orden correcto. Mejora la UX al proporcionar feedback visual claro cuando el sistema está procesando.
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada
- **Detección:** Testing manual en la UI de combate

---

### Issue #77: Mensajes lentos al avanzar turno cuando el siguiente personaje está muerto o inconsciente ✅ RESUELTO

- **Fecha de creación:** 2025-11-17
- **Fecha de corrección:** 2025-01-27
- **Ubicación:** `src/app/game-state-actions.ts`, `src/components/game/initiative-tracker.tsx`, sistema de avance de turnos
- **Severidad:** 🟢 **MEDIA** (ralentiza el flujo de combate sin aportar información)
- **Descripción:** Al presionar "Avanzar turno", si el siguiente combatiente está muerto o inconsciente, el mensaje que indica el salto de turno tardaba demasiado en mostrarse, creando la sensación de que la UI se congeló.
- **Problema resuelto:**
  - ✅ Transición instantánea cuando se salta un turno de combatiente muerto/inconsciente
  - ✅ Mensaje breve e inmediato que indica que el combatiente está fuera de combate
  - ✅ Eliminación de delays y esperas innecesarias en el avance de turnos
  - ✅ Mejora del flujo de combate durante combates largos con múltiples personajes KO
- **Solución implementada:** ✅
  - Detección automática de combatientes sin acciones disponibles (muertos/inconscientes)
  - Saltado automático de turnos sin delays ni narraciones largas
  - Mensaje corto e inmediato ("[Nombre] está inconsciente, se salta su turno" o similar)
  - Revisión y eliminación de timers/awaits innecesarios ligados al avance de turnos
- **Archivos modificados:**
  - ✅ `src/app/game-state-actions.ts` (lógica de avance de turnos)
  - ✅ `src/components/game/initiative-tracker.tsx` (visualización de turnos)
  - ✅ Sistema de procesamiento de turnos en combate
- **Impacto:** Medio - Reduce fricción durante combates largos con múltiples personajes KO, mejorando la experiencia de usuario
- **Estado:** ✅ **RESUELTO** - Implementación completada y verificada (2025-01-27)
- **Prioridad:** Media
- **Detección:** Testing manual del sistema de turnos

---

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

### Issue #6: Manejo de errores en `handleLoadAdventure` ✅ NO RELEVANTE

- **Fecha de creación:** 2025-11-10
- **Fecha de cierre:** 2025-01-27
- **Ubicación:** `src/app/page.tsx`
- **Severidad:** Baja
- **Descripción:** El manejo de errores en `handleLoadAdventure` podría ser más específico, diferenciando entre errores de parseo JSON, errores de la IA, y errores de red.
- **Estado:** ✅ **NO RELEVANTE** - Ya no es relevante debido a mejoras en el sistema de carga de aventuras (Issue #126)
- **Nota:** Este issue fue marcado como no relevante porque el sistema de carga de aventuras ha sido completamente refactorizado y mejorado, incluyendo mejor manejo de errores.

---

### Issue #7: Advertencia de Content Security Policy sobre 'eval' ✅ NO RELEVANTE

- **Fecha de creación:** 2025-11-10
- **Fecha de cierre:** 2025-01-27
- **Ubicación:** Consola del navegador
- **Severidad:** Baja (solo advertencia, no error)
- **Descripción:** Aparece el mensaje "Content Security Policy of your site blocks the use of 'eval' in JavaScript" en la consola del navegador.
- **Problema:** Este mensaje es común en Next.js en modo desarrollo debido a source maps y hot reloading. No afecta la funcionalidad.
- **Estado:** ✅ **NO RELEVANTE** - Comportamiento esperado en desarrollo, no requiere acción
- **Nota:** Este issue fue marcado como no relevante porque es un comportamiento normal de Next.js en desarrollo y no afecta la funcionalidad de la aplicación.

---

### Issue #8: Fallos al cargar aventura desde JSON ✅ NO RELEVANTE

- **Fecha de creación:** 2025-11-10
- **Fecha de cierre:** 2025-01-27
- **Ubicación:** `src/app/page.tsx`, función `handleLoadAdventure`
- **Severidad:** Baja (funcionalidad aún no implementada completamente)
- **Descripción:** Al intentar cargar una aventura desde un archivo JSON, se producían varios fallos.
- **Estado:** ✅ **NO RELEVANTE** - Funcionalidad completamente implementada y mejorada (Issue #126)
- **Nota:** Este issue fue marcado como no relevante porque la funcionalidad de carga de aventuras desde JSON ha sido completamente implementada y mejorada en el Issue #126, incluyendo validación robusta, manejo de errores mejorado y sistema de caché.

---

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
- **Ubicación:** `src/lib/initial-party.ts` (líneas 260 y 412)
- **Descripción:** Se desactivaron temporalmente todos los hechizos de Merryl y Elara para forzar el uso de armas durante las pruebas. Los arrays de `spells` fueron comentados y reemplazados por arrays vacíos.
- **Propósito:** Facilitar el testing del sistema de armas sin que la IA priorice el uso de hechizos.
- **Estado:** ⚠️ **TEMPORAL** - Los hechizos están comentados y pueden restaurarse fácilmente cuando se complete el testing.
- **Archivos modificados:**
  - ✅ `src/lib/initial-party.ts` (líneas 260 y 412: arrays de `spells` comentados)
- **Nota:** La party inicial fue movida de `src/lib/new-game-data.ts` a `src/lib/initial-party.ts` en 2025-01-23.

---

## 📝 Notas

- Los números de issue se mantienen como referencia histórica del orden en que fueron añadidos
- Para más detalles sobre cada issue, consultar el historial de commits y el [CHANGELOG.md](../../../CHANGELOG.md)
- Los issues corregidos se mantienen aquí como referencia histórica y para documentar las soluciones implementadas


---

### Issue #92: Identificaci�n incorrecta de enemigo en combate  RESUELTO

- **Fecha de creaci�n:** 2025-11-16
- **Fecha de correcci�n:** 2025-11-27
- **Ubicaci�n:** \src/ai/flows/action-interpreter.ts\, \src/ai/flows/game-coordinator.ts\, \src/ai/flows/schemas.ts\
- **Severidad:**  **MEDIA** (afecta precisi�n de acciones del jugador)
- **Descripci�n:** Cuando el jugador hac�a referencia a un enemigo por acciones recientes (ej: 'el goblin que me acaba de atacar'), el sistema a veces identificaba incorrectamente al enemigo objetivo porque el int�rprete de acciones no ten�a acceso al historial reciente del combate.
- **Problema resuelto:**
  -  El \ActionInterpreter\ ahora recibe el \conversationHistory\ completo
  -  El prompt del int�rprete ha sido actualizado para usar este historial y resolver referencias contextuales ('el que me atac�', 'el que mat� a X')
  -  El \GameCoordinator\ genera y pasa el transcript del historial antes de llamar al int�rprete
- **Soluci�n implementada:** 
  - Modificado \ActionInterpreterInputSchema\ para incluir \conversationHistory\
  - Actualizado \ctionInterpreterPrompt\ para incluir instrucciones sobre el uso del historial
  - Actualizado \gameCoordinatorFlow\ para pasar el historial formateado
- **Archivos modificados:**
  - \src/ai/flows/schemas.ts\
  - \src/ai/flows/action-interpreter.ts\
  - \src/ai/flows/game-coordinator.ts\
- **Impacto:** Medio - Mejora la 'inteligencia' del sistema para entender referencias naturales del jugador basadas en eventos recientes.
- **Estado:**  **RESUELTO** - Implementaci�n completada y verificada (2025-11-27)


### Issue #28: Visualización de barra de vida en panel Grupo  ADVERTENCIA

- **Fecha de creación:** 2025-11-14
- **Ubicación:** src/components/game/party-panel.tsx
- **Severidad:**  **MEDIA** (bug visual)
- **Descripción:** En el panel Grupo, cuando un personaje está seleccionado, la visualización de la barra de vida no se muestra correctamente. El trozo de la barra que está vacío (HP perdido) no se ve bien.
- **Problema:**
  - El color de fondo de la barra de progreso (bg-secondary) coincidía con el color de fondo de la tarjeta seleccionada (bg-secondary), haciendo invisible la parte vacía de la barra.
- **Solución implementada:**
  - Se ha añadido la clase bg-black/20 al componente Progress para oscurecer el track de la barra.
  - Esto asegura que la barra sea visible tanto cuando el personaje está seleccionado (sobre fondo bg-secondary) como cuando no lo está.
- **Archivos modificados:**
  - src/components/game/party-panel.tsx
- **Estado:**  **RESUELTO** (2025-11-27)


### Issue #38: Auto-redirecci�n de ataque a enemigo diferente cuando target est� muerto  MEJORA / DECISI�N DE DISE�O

- **Fecha de creaci�n:** 2025-11-14
- **Fecha de resoluci�n:** 2025-11-27
- **Ubicaci�n:** src/lib/combat/turn-processor.ts, src/lib/combat/combat-session.ts, src/lib/combat/turn-manager.ts, src/components/game/initiative-tracker.tsx, src/components/game/dice-roll-result.tsx
- **Severidad:**  MEDIA
- **Descripci�n:** Se implement� la **Opci�n C**: rechazar la acci�n y pedir una nueva. Ahora, si el jugador intenta atacar a un objetivo muerto, el sistema devuelve un error TARGET_DEAD y el DM informa: '{Target} ya est� muerto. �Qu� quieres hacer?'.
- **Soluci�n Implementada:**
  1.  **Validaci�n en TurnProcessor:** Se comprueba si el objetivo est� muerto antes de procesar el ataque. Si lo est�, se devuelve success: false y error TARGET_DEAD.
  2.  **Manejo de Error en CombatSession:** Se a�adi� TARGET_DEAD a la lista de errores que resetean playerActionCompleted a false, permitiendo al jugador reintentar su turno inmediatamente.
  3.  **Sistema de Estados de Personaje:** Se implement� un sistema unificado de estados (active, dead, unconscious) en Combatant.
      - CombatSession calcula el estado basado en HP.
      - CombatTurnManager usa este estado para saltar turnos de muertos/inconscientes.
      - InitiativeTracker muestra iconos (Calavera/Actividad) seg�n el estado.
      - DiceRollResult usa los mismos iconos para mensajes de muerte/inconsciencia.
- **Archivos afectados:**
  - src/lib/combat/turn-processor.ts
  - src/lib/combat/combat-session.ts
  - src/lib/combat/turn-manager.ts
  - src/lib/types.ts
  - src/components/game/initiative-tracker.tsx
  - src/components/game/dice-roll-result.tsx
- **Estado:**  **RESUELTO**


### Issue #16: Gesti�n de nombres de m�ltiples monstruos en m�dulo separado  MEJORA

- **Fecha de creaci�n:** 2025-11-12
- **Fecha de resoluci�n:** 2025-11-27
- **Ubicaci�n:** src/lib/combat/monster-name-manager.ts
- **Severidad:** Media
- **Descripci�n:** Se ha extra�do la l�gica de gesti�n de nombres de monstruos a un m�dulo dedicado.
- **Soluci�n Implementada:**
  - Creado src/lib/combat/monster-name-manager.ts con funciones:
    - generateDifferentiatedNames: Genera nombres �nicos (Goblin 1, Goblin 2).
    - normalizeNameForMatching: Normaliza nombres para b�squedas.
    - replaceOrdinalReferences: Reemplaza referencias ordinales en narraci�n.
  - Integrado en InitiativeGenerator y NarrationProcessor.
- **Archivos afectados:**
  - src/lib/combat/monster-name-manager.ts (Nuevo)
  - src/lib/combat/initialization/initiative-generator.ts
  - src/lib/combat/initialization/narration-processor.ts
- **Estado:**  **RESUELTO**


### Issue #32: Limpieza de paneles de combate  MEJORA

- **Fecha de creaci�n:** 2025-11-14
- **Fecha de resoluci�n:** 2025-11-27
- **Ubicaci�n:** src/components/game/game-view.tsx
- **Severidad:** Baja
- **Descripci�n:** Se ha definido el comportamiento deseado para los paneles al finalizar el combate.
- **Soluci�n Implementada:**
  - El panel de iniciativa se limpia autom�ticamente para indicar claramente el fin del combate.
  - El panel de tiradas se mantiene visible para permitir al jugador revisar el historial de resultados.
  - Se considera este comportamiento como el dise�o correcto para equilibrar claridad de estado y persistencia de informaci�n.
- **Estado:**  **RESUELTO**

