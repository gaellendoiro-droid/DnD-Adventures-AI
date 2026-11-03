# Changelog

Todas las novedades y cambios importantes de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Nota de procedimiento:** Todos los cambios nuevos deben registrarse en la sección `[Unreleased]`. Cuando se decide versionar, esta sección se renombra con el nuevo número de versión y la fecha. A continuación, se debe crear una nueva sección `[Unreleased]` vacía y actualizar el número de versión correspondiente en el archivo `package.json`.

**DIRECTIVA DE ALTA PRIORIDAD PARA EL ASISTENTE DE IA:** Al modificar este archivo, DEBES leer primero su contenido completo y asegurarte de que tu operación de escritura sea puramente aditiva a la sección `[Unreleased]`. NUNCA debes borrar, truncar o resumir el historial de versiones existente. La violación de esta directiva se considerará un fallo crítico de funcionamiento.

## [Unreleased]

### Added
- **🏷️ NPCs y Criaturas Dinámicas Condicionales en Localizaciones:** Implementada la lógica de presencia dinámica de criaturas en el motor del mundo (`world-state-manager.ts`) y esquemas (`schemas.ts`). Permite que `entitiesPresent` de una sala admita tanto IDs directos de criatura como objetos condicionales estructurados con flags globales de presencia y ausencia (`presenceFlag` y `absenceFlag`), determinando su spawn físico de forma dinámica.
- **🛡️ Soporte de Asignación Condicional en el Conversor PDF a JSON:** Actualizado el convertidor inteligente de aventuras (`pdf-to-json.ts`) con prompts instructivos para que la IA asocie NPCs clave de forma condicional a lo largo de las salas en base a los eventos e hitos de la historia (ej: situar a Guz en la torre solo si sobrevive o escapa del pueblo), y adaptado el postprocesador de entidades huérfanas para no eliminar objetos condicionales estructurados.
- **🧪 Suite de Tests de Spawns Condicionales:** Desarrollada una suite de pruebas unitarias exhaustiva (`world-state-conditional-entities.test.ts`) que valida de forma aislada e integrada todos los escenarios lógicos del ciclo de vida y visibilidad de criaturas dinámicas según el estado del mundo.


## [0.6.2] - 2026-07-02

### Added
- **📖 Buscador del Compendio Prioritario de la Aventura Activa:** Modificado el buscador universal (acción `searchCompendium` en `compendium.ts`) para que el comando `??` priorice y busque en las entidades e ítems de la aventura en curso antes de caer en la base de datos global de D&D o en consultas de IA externa.
- **🏷️ Visualización de Fuente del Compendio:** Se agregó soporte visual en `compendium-formatter.ts` tanto para tarjetas de monstruos como de objetos para indicar de forma explícita **`Fuente: 📖 Aventura`** cuando los datos provienen del archivo JSON de la aventura en curso.
- **🐏 Semilla de Criatura Oveja (`Sheep`):** Inyectada una semilla estática en la base de datos SQLite local para la criatura oveja con sus estadísticas del SRD para impedir lentitudes y fallos por hidratación de IA en caliente.
- **🎙️ Integración de Gemini 3.1 Flash TTS:** Integrado el modelo `gemini-3.1-flash-tts-preview` como nuevo proveedor de Text-to-Speech (TTS) nativo y por defecto. Permite alternar dinámicamente entre Gemini y Eleven Labs mediante la variable de entorno `TTS_PROVIDER`.
    - ✅ **Conversión Nativa a WAV:** Implementada una envoltura en el backend que añade una cabecera WAV de 44 bytes a las muestras PCM crudas (`audio/l16`) devueltas por Gemini, corrigiendo los errores `NotSupportedError` del navegador.
    - ✅ **Dirección Artística por Prompt:** Integrado el soporte de directrices mediante "Audio Profile" y "Director's Notes" (`GEMINI_TTS_PROFILE`, `GEMINI_TTS_STYLE`, `GEMINI_TTS_PACE`, `GEMINI_TTS_ACCENT` en `.env`) que formatean el prompt del transcriptor de forma estructurada sin interferir con la narración, permitiendo modular la voz (ej: voz de Enceladus, anciana y profunda).
- **📚 Resubida Automática de Manuales (File API):** Creado el servicio `RulebookManager` que valida el estado de los archivos de manuales subidos en Gemini y, si han caducado (error 403/404), resube automáticamente los PDFs locales ubicados en `knowledge/source_books/` a Google AI Studio. Guarda la configuración en `knowledge/file-api-cache.json` y maneja bloqueos de subidas concurrentes.

### Fixed
- **🗣️ Estabilización del Flujo de Interacción Social (Genkit + Gemini):** Eliminadas las herramientas redundantes `dndApiLookupTool` y `adventureLookupTool` de `interactionExpertPrompt` (`interaction-expert.ts`) para evitar el bug conocido en la API de Gemini que devolvía `null` y rompía la validación del esquema estructurado de Genkit al realizar llamadas a funciones. Se adaptaron las directivas del prompt para obligar al Dungeon Master a buscar datos y rumores exclusivamente en el `npcContext` y el `adventureLore` ya provistos por el backend en lugar de recurrir a herramientas.
- **🛡️ Resolución de NPCs de Combate en el Conversor:** Modificado el conversor automático de PDF a JSON (`pdf-to-json.ts`) para que resuelva estadísticas y aplique overrides también a entidades de tipo `'npc'` (como Guz o Noke).
- **🚫 Desactivación de Fallback RAG para Criaturas Únicas:** Implementado el parámetro `allowAiFallback = false` en `getMonsterStatsFromDndApi` y `DataService.getMonster` para desactivar la hidratación por IA mediante RAG en manuales si la criatura no tiene un tipo base oficial (`baseType` ausente), previniendo que NPCs únicos de aventura como Guz se confundan con monstruos oficiales no relacionados (como el Gusano Púrpura).
- **🔤 Corrección en Normalización de Búsqueda de Criaturas (`normalizeQuery`):** Corregido el motor de traducción en `text-utils.ts` ordenando las claves del mapa español-inglés de forma descendente por longitud antes de procesar coincidencias parciales con `includes()`, evitando colisiones donde términos compuestos ("Oso Pardo Polimorfo") hacían match parcial erróneo con palabras más cortas ("oso" -> Hombre Oso).
- **📜 Fallback y Continuidad en el Motor de Reglas (GameRulesEngine):** Corregido un fallo crítico en el bucle de evaluación de `GameRulesEngine` (`rules-engine.ts`) donde cualquier módulo que coincidiera en `canHandle` detenía la cadena de evaluación incluso si retornaba `intercepted: false`. Esto hacía que acciones como "dar el pergamino a Merryl" fueran pre-seleccionadas por `ScrollRuleModule` (al mencionar la palabra "pergamino") pero no interceptadas por este, impidiendo que `InventoryRuleModule` se evaluase y bloqueando la transferencia física del pergamino entre inventarios. Ahora el motor de reglas continúa con el resto de módulos de la lista si el módulo actual no intercepta la acción.
- **🤖 Solución a Fallos de Validación de Esquema en Interacción (Gemini structured outputs):** Simplificado el campo `attitudeChange` en `InteractionExpertOutputSchema` (`schemas.ts`) para evitar uniones complejas con `z.union`, `z.literal` y `nullable()` que causaban fallos de validación en la API de Gemini (devolviendo `null` y produciendo caídas de conexión) al utilizar herramientas. Se eliminó la herramienta redundante `characterLookupTool` del prompt de interacción, se actualizaron las instrucciones del prompt en `interaction-expert.ts` para que la IA omita el campo en lugar de devolver `null` si no hay cambios, y se normalizaron los valores no definidos a `null` para conservar compatibilidad con el backend.
- **🛡️ Inclusión Inteligente de NPCs en Combate:** Corregido el bug por el cual Guz (semiorco) y la oveja Shinebright (ambos de tipo `npc` en el esquema de la aventura) eran excluidos del orden de iniciativa y combate al inicio de sus encuentros. Implementada la **Opción de Diseño B** mediante un filtro de post-procesamiento (`enrichCombatantsWithSmartNPCs`) que corre después de la evaluación de la IA Experta para asegurar que NPCs clave se añadan al combate si son objetivo de agresión, son desencadenantes de trigger, o si son mencionados en el texto de acción del jugador o en la descripción de escena del DM.
- **⚔️ Sincronización del Inicio del Combate:** Se ha inyectado el delta de estado completo (`party`, `enemies`, `enemiesByLocation`, `diceRolls`) en los eventos `state_delta` de inicialización del combate, resolviendo bugs que impedían ver la iniciativa en el frontend y bloqueaban la actualización de HP de monstruos y personajes.
- **🎲 Daño Crítico en Modificadores Negativos:** Modificado `action-resolver.ts` para formatear de forma limpia las tiradas con modificadores negativos (evitando dobles signos como `+-`) y robustecida la sanitización previa a la evaluación de críticos en `action-executor.ts` (eliminando espacios y normalizando signos).
- **🗣️ Redundancia Narrativa de DM al Iniciar Combate:** Actualizado el prompt `combatInitiationPrompt` con instrucciones críticas estrictas para impedir que el DM de combate repita o parafrasee descripciones del entorno y monstruos ya leídas en el último turno de exploración del historial.
- **👩‍🎤 Concordancia de Género del Dungeon Master:** Añadida inyección dinámica de contexto `combatantsContext` en combate e instrucciones explícitas en los prompts de exploración (`narrativeDirectorPrompt`) e inicio de combate (`combatInitiationPrompt`) para respetar estrictamente la concordancia gramatical en español basada en la propiedad `sex` ("Varón"/"Mujer") de las fichas de personajes (corrigiendo el trato en femenino para Merryl).

## [0.6.1] - 2026-06-28

### Added
- **🗝️ Enriquecimiento de Hechos Mecánicos en Apertura de Puertas con Llaves:** Añadido soporte de metadatos (`method`, `keyName`) al evento `DoorOpened` para registrar el uso exacto de llaves. El formateador de hechos para el narrador (`eventsLogText`) se adaptó para describir el método de apertura (llave, forzado de cerradura, fuerza bruta), de modo que el DM narre la acción física correcta en lugar de asumir que se empuja la puerta.

### Fixed
- **🚪 Visibilidad de Puertas y Verjas Cerradas en Modo Exploración:** Modificada la lógica de `exploration-context-builder.ts` para que las puertas cerradas y bloqueadas de carácter no secreto sean siempre visibles por defecto. Esto permite que el Dungeon Master las mencione en la descripción inicial de las salas en lugar de ignorarlas.
- **🎯 Corrección de Cálculo de Daño Crítico para Modificadores Negativos (2026-06-27):**
  - **Problema:** Los personajes y monstruos con modificador de daño neto negativo (como el bastón de Merryl, con daño `1d6-1` debido a su modificador de fuerza de `-1`) no duplicaban sus dados de daño al realizar golpes críticos debido a un fallo en la expresión regular de parseo.
  - **Solución:** Corregida la expresión regular en `action-executor.ts` para aceptar el signo menos (`-`) y calcular el modificador final de forma correcta. Además, se mejoró `getCriticalDamageNotation` en `rules-engine.ts` para dar un formato limpio como `2d6-1` (en lugar de `2d6+-1`) y evitar concatenar `+0` cuando el modificador es nulo.
- **🤫 Exclusión del Personaje Activo de las Reacciones Autónomas de Compañeros (2026-06-27):**
  - **Mejora:** El compañero seleccionado actualmente en el frontend (`selectedCharacterName`) se propaga al array de exclusiones (`excludeCharacters`) para que la IA no genere comentarios síncronos ni en streaming para ese personaje mientras el jugador lo esté controlando de manera activa en ese turno.

### Added
- **🌐 Unificación de Contexto de los Expertos (Single Source of Truth) [Fase 1] (2026-06-27):**
  - **Mejora:** Inyección del inventario estructurado y estado de la party a todos los expertos de la IA conversacional.
  - **Características:**
    - ✅ **Esquemas Zod**: Añadida la propiedad `party` a `NarrativeExpertInputSchema`, `ExplorationExpertInputSchema` e `InteractionExpertInputSchema`.
    - ✅ **Propagación**: Modificados `NarrativeTurnManager` y `NarrativeManager` para propagar el contexto dinámico de los personajes e inventarios al orquestador, experto de exploración, interacción y director de escena.
    - ✅ **Prompts Directivos**: Añadida la directiva de **Verdad de Posesión (Inventario de la Party)** en `exploration-expert.ts`, `interaction-expert.ts` y `narrative-manager.ts` para que la IA valide los inventarios estructurados antes de alucinar u ocultar la posesión de un objeto.
- **🚫 Delimitación de Interacciones Físicas y Bloqueo de Contenedores Cerrados [Fase 2] (2026-06-27):**
  - **Mejora:** Robustecimiento interactivo y control lógico de saqueos y manipulación de contenedores.
  - **Características:**
    - ✅ **Bloqueo de Cofre Cerrado**: Se impide el saqueo (`isLootAction`) de contenedores en estado `'closed'` en el `worldState`. Devolviendo el feedback específico: *"The container [Chest] is closed. You must open it first."*
    - ✅ **Delegación Física de Interactuables**: Si el jugador intenta llevarse o coger el mueble contenedor físico completo (ej. *"Cojo el cofre"*), la acción no vacía el cofre ni altera los inventarios del juego, devolviendo una indicación al DM para narrar libremente el esfuerzo físico.
    - ✅ **Tests Coherentes**: Añadidos tests unitarios para verificar el bloqueo de cofres cerrados y el control de transporte físico, y actualizados los tests existentes para abrir los cofres de forma coherente antes de realizar saqueos.
- **🔒 Soporte Global de Acciones de Cierre y Resolución de Sinónimos Físicos (2026-06-26):**
  - **Mejora:** Soporte determinista en `InteractionHandler` para cerrar contenedores, puertas e interactuables genéricos, y resolución robusta de sinónimos narrativos en los expertos de IA.
  - **Características:**
    - ✅ **Acciones de Cierre**: Agregada detección de `isCloseAction` y el método privado `handleDoorClosing` para persistir lógicamente el cierre de puertas, cofres e interactuables genéricos de la sala en `worldState` e `updatedOpenDoors`.
    - ✅ **Mapeo Semántico Inverso**: Modificados los prompts de `exploration-expert.ts` e `interaction-expert.ts` para resolver descripciones conversacionales (ej. "poción burbujeante") a sus IDs formales ("Poción de Curación") a pesar del recorte del historial de chat.
    - ✅ **Consistencia de Contenedores Cerrados**: Asegurado que los ítems permanezcan localizados dentro del cofre en el prompt de la IA cuando esté lógicamente cerrado.
    - ✅ **Tests de Cierre**: Creados tests específicos en `interaction-handler.test.ts` para validar cierres de cofres, puertas y objetos decorativos.
- **📦 Saqueo Selectivo y Detallado de Contenedores (2026-06-26):**
  - **Mejora:** Implementación de mecánicas de saqueo parcial a nivel de contenedor en el motor dinámico del mundo.
  - **Características:**
    - ✅ **Contenido Dinámico**: Modificados los esquemas y `WorldStateManager` para almacenar la lista de objetos restantes de un contenedor dentro del `worldState`.
    - ✅ **Saqueo Parcial**: Permite al jugador retirar un ítem específico de un cofre (ej. "cojo la llave"), dejándolo abierto y con los otros objetos dentro.
    - ✅ **Redirección de Mapeo**: El gestor resuelve peticiones de ítems huérfanos a sus contenedores padres correspondientes en la sala actual de forma automática.
- **🗝️ Sistema de Llaves y Forzado de Puertas / Cerraduras (2026-06-26):**
  - **Mejora:** Integración del control determinista de apertura y forzado de cerraduras bajo D&D 5e.
  - **Características:**
    - ✅ **Apertura Determinista**: Abre automáticamente conexiones si algún miembro de la party posee la llave requerida (`requiredKeyId`) sin pedir tiradas de dados.
    - ✅ **Reglas de Forzado**: Añadido `KeyRuleModule` que redirige a tiradas de *Juegos de Manos* (`lockpickDC`) o *Atletismo* (`breakDC`) ante intentos de forzar cerraduras o forzar físicamente la puerta, o bloquea la acción si es impenetrable.
- **💾 Consolidación, Reactividad y Robustez de WorldState (2026-06-26):**
  - **Mejora:** Consolidación de la arquitectura del estado del mundo con sincronización visual en tiempo real en el frontend y tolerancia a fallos ortográficos del modelo.
  - **Características:**
    - ✅ **Reactividad en Cliente**: Migrado `worldStateRef` a estado reactivo de React (`worldState`/`useState`) en `game-view.tsx`, solucionando cierres obsoletos en los callbacks asíncronos de streaming.
    - ✅ **Memoria de Eventos**: Implementación de `event-manager.ts` para registrar sucesos y alimentar prompts de los compañeros.
    - ✅ **Tolerancia a Erratas en IA**: Añadido preprocesamiento Zod en `schemas.ts` para corregir automáticamente claves mal escritas del LLM (ej. `explorationNaration` -> `explorationNarration`), previniendo caídas del stream.
- **💾 Integración del WorldState y Consumo de Inventario en Tiradas de Habilidad (2026-06-22):**
  - **Mejora:** Integración dinámica del estado del mundo (`worldState`) y los inventarios de personajes con el motor de resolución de tiradas de habilidad.
  - **Características:**
    - ✅ **Consumo Físico de Objetos:** Implementación del método auxiliar `consumeScrollFromPartyInventory` en `NarrativeTurnManager` para remover automáticamente los pergaminos (como pergaminos de conjuros) del inventario del personaje del grupo tras una tirada de identificación y activación exitosa.
    - ✅ **Persistencia de Flags en WorldState:** El éxito en tiradas asocia directamente la activación de efectos mágicos y marcas circunstanciales en `globalFlags` dentro del `worldState`.
    - ✅ **Propagación Dinámica de Efectos:** Los efectos mágicos resultantes de tiradas exitosas (ej. `"speak_with_animals"`) se propagan inmediatamente a `activeEffects` para habilitar o restringir mecánicas sociales o de exploración en tiempo real.

- **📚 Simplificación y Consolidación del Sistema de Documentación (2026-06-22):**
  - **Mejora:** Rediseño completo de la estructura de documentación del proyecto, consolidando más de 20 archivos fragmentados en 5 archivos únicos de "fuente de verdad" para reducir la redundancia y facilitar el mantenimiento.
  - **Características:**
    - ✅ **Arquitectura Consolidada:** Fusión de 11 documentos de arquitectura en `docs/arquitectura.md`.
    - ✅ **Inicio Rápido y Visión:** Fusión de `inicio-rapido.md`, `vision-diseno.md` y la guía de setup de Eleven Labs en un único `docs/inicio-rapido.md`.
    - ✅ **Testing y QA:** Fusión del manual de Vitest y las pautas de QA manual en `docs/testing.md`.
    - ✅ **Roadmap y Bugs:** Unificación de issues pendientes y el roadmap estratégico en `docs/roadmap.md`.
    - ✅ **Borrador de Notas:** Fusión de notas informales y frases de testeo en `docs/notas-desarrollo.md`.
    - ✅ **Archivo Histórico:** Movidos todos los planes de desarrollo completados antiguos a la nueva carpeta `docs/referencias-historicas/` para mantener el repositorio limpio.
    - ✅ **Eliminación de Redundancia:** Borrado de archivos redundantes como `issues/corregidos.md` (cuyo historial ya vive en el propio `CHANGELOG.md`).

## [0.6.00] - 2026-06-09

### Added
- **🧙‍♂️ Sistema Genérico de Comunicación con Bestias y Efectos Activos (2026-06-09):**
  - **Mejora:** Introducción de un sistema genérico para evaluar la capacidad de comunicación verbal de criaturas de tipo *Bestia* (o con barreras de comunicación) basado en los efectos mágicos activos del grupo.
  - **Características:**
    - ✅ **Detección de Efectos en Intérprete:** `ActionInterpreter` detecta cuando se lanzan conjuros o usan pergaminos de comunicación (ej. `"speak_with_animals"`) y los emite en `activatedEffects`.
    - ✅ **Gestión de Estado Persistente:** `NarrativeTurnManager` almacena los efectos activos en los `globalFlags` del `worldState` y compila `activeEffects`.
    - ✅ **Filtro de Barrera en Diálogos:** `InteractionExpert` y `InteractionExpertStream` impiden hablar en común a criaturas del tipo *Bestia* si el efecto `"speak_with_animals"` no está activo en `activeEffects` (describiendo solo balidos, gruñidos y gestos). Permiten el habla normal una vez activado.
    - ✅ **Tests de Integración:** Suite completa de tests unitarios y de integración para validar el ciclo de vida del estado de efectos y su propagación.
  - **Archivos creados/modificados:**
    - `src/ai/flows/schemas.ts`
    - `src/ai/flows/action-interpreter.ts`
    - `src/ai/flows/managers/narrative-turn-manager.ts`
    - `src/ai/streaming/game-stream-coordinator.ts`
    - `src/ai/flows/game-coordinator.ts`
    - `src/ai/flows/experts/interaction-expert.ts`
    - `src/ai/flows/experts/interaction-expert-stream.ts`
    - `src/ai/flows/managers/__tests__/narrative-turn-manager-effects.test.ts`

- **🗺️ Visor de Mapa Táctico Interactivo (2026-06-09):**
  - **Mejora:** Añadido un botón en la interfaz del juego que permite al jugador abrir un modal con el mapa táctico de la ubicación actual, facilitando la visualización espacial durante la exploración y combate.
  - **Características:**
    - ✅ **Controles de Navegación:** Paneo mediante click-and-drag, zoom interactivo mediante la rueda del ratón y botones de zoom in/zoom out/restablecer.
    - ✅ **Escala y Fallback Táctico:** Muestra la escala táctica real si está definida en la aventura. Si una sala específica en modo exploración o mazmorra no posee un mapa asignado, el visor busca automáticamente y muestra de forma inteligente el mapa general de la aventura para evitar fallos.
  - **Archivos modificados:**
    - `src/components/game/game-view.tsx`

- **📄 Conversor Automatizado de PDF a JSON (2026-06-09):**
  - **Mejora:** Creación de un script ejecutable que utiliza Genkit IA (Gemini) para transformar PDFs de aventuras oficiales de D&D 5e al formato JSON compatible del juego.
  - **Características:**
    - ✅ **Extracción Completa:** Procesa de forma automatizada el lore global, todas las habitaciones (con sus conexiones y coordenadas), criaturas (con sus stats, posesiones, iniciativa y barreras de comunicación) y la tabla de contenidos inicial.
    - ✅ **Robustez y Reintentos:** Manejo de cuotas mediante backoff exponencial y ordenación de entidades huérfanas en la sala inicial de forma limpia.
  - **Archivos creados/modificados:**
    - `scripts/pdf-to-json.ts` (Nuevo)

## [0.5.99] - 2025-12-16

### Added
- **⚡ IA Conversacional Reactiva (Streaming) (Fase 4) (2025-12-16):**
  - **Mejora:** Implementación de arquitectura de streaming para reducir drásticamente la latencia percibida en interacciones sociales.
  - **Características:**
    - ✅ **Streaming de Texto:** `InteractionExpertStream` ahora envía tokens de texto inmediatamente al cliente, eliminando la espera de "Pensando...".
    - ✅ **Pipeline Reactivo:** `useGameStream` gestiona la conexión persistente y actualiza la UI letra a letra.
    - ✅ **Cambio de Actitud en 2º Plano:** Nueva herramienta `updateAttitudeTool` permite a la IA modificar la actitud de los NPCs sin interrumpir el flujo de texto con JSONs bloqueantes.
    - ✅ **Protocolo de Eventos:** Sistema robusto de eventos (`token`, `tool_call`, `debug`) para comunicación servidor-cliente.
  - **Archivos modificados:**
    - `src/ai/streaming/` (Nueva carpeta con lógica de streaming)
    - `src/ai/flows/experts/interaction-expert-stream.ts` (Nuevo experto)
    - `src/hooks/use-game-stream.ts` (Nuevo hook)
  - **Referencia:** [Plan Completado](../docs/planes-desarrollo/en-curso/ia-conversacional-avanzada.md)

### Fixed
- **🐛 Corrección de "Impersonación" en Chat (Red Box Glitch) (2025-12-16):**
  - **Problema:** En ocasiones, la IA generaba reacciones para el personaje del jugador (PC), mostrando mensajes con el borde rojo (estilo "Enemigo/AI") y texto que el jugador no había escrito.
  - **Causa:** El `CompanionReactionManager` no filtraba explícitamente a las entidades controladas por el jugador (`controlledBy: 'Player'`).
  - **Solución:** Añadida guardia estricta en `processCompanionReactionsStreaming` y `entity-status-utils.ts` para ignorar PCs.
  - **Archivos modificados:** `src/ai/flows/managers/companion-reaction-manager.ts`, `src/lib/game/entity-status-utils.ts`.

- **🕷️ Corrección de Triggers de Combate en Arquitectura de Streaming (2025-12-16):**
  - **Problema:** Las emboscadas y triggers de combate por "acercarse" no interrumpían la narración en modo streaming. El sistema detectaba el combate internamente pero el coordinador ignoraba la señal, continuando la descripción pacífica.
  - **Solución Arquitectónica:**
    - **Event-Driven:** `NarrativeTurnManager` ahora emite un evento prioritario `logic_update` con `combatTriggerResult` en lugar de devolverlo silenciosamente al final.
    - **Interrupción de Stream:** `GameStreamCoordinator` escucha este evento específico, detiene inmediatamente la generación de texto narrativo e invoca al `CombatManager`.
    - **Datos Robustos:** Corrección en `CombatTriggerEvaluator` para manejar propiedades `active` indefinidas como `true` por defecto, más actualización del JSON para ser explícito.
  - **Archivos modificados:**
    - `src/ai/streaming/game-stream-coordinator.ts`
    - `src/ai/flows/managers/narrative-turn-manager.ts`
    - `src/lib/combat/trigger/combat-trigger-evaluator.ts`
    - `JSON_adventures/el-dragon-del-pico-agujahelada_short.json`

## [0.5.97] - 2025-12-08

### Added
- **🎲 Sistema de Skill Checks (2025-12-08):**
  - **Mejora:** Implementación completa del sistema de pruebas de habilidad con soporte para ventaja/desventaja y resolución narrativa.
  - **Características:**
    - ✅ **Nuevo DiceEngine:** Soporte nativo para tiradas con Ventaja y Desventaja, retornando resultados detallados de ambos dados.
    - ✅ **SkillCheckExpert (AI):** Nuevo experto que analiza la acción narrativa para determinar la Skill (ej: Atletismo), la Dificultad (DC) y modificadores circunstanciales.
    - ✅ **Resolución Determinista:** `SkillCheckResolver` calcula el resultado final usando modificadores de personaje (bono de competencia + atributo), con fallback seguro a stats base.
    - ✅ **Integración en Game Loop:** El `NarrativeTurnManager` ahora intercepta acciones de habilidad, ejecuta la tirada y genera una narración coherente con el resultado (éxito/fallo/crítico).
    - ✅ **UI Visual:** Nuevo componente `VisualDicePair` para mostrar tiradas de ventaja/desventaja con dados visuales destacando el mantenido y tachando el descartado. Integrado en `DiceRollResult` con estilos específicos para skill checks.
    - ✅ **Testing Integral:** Cobertura con tests unitarios para el motor y tests de integración para el flujo narrativo completo.
  - **Archivos modificados:**
    - `src/lib/dice/dice-engine.ts`
    - `src/ai/flows/experts/skill-check-expert.ts`
    - `src/lib/skills/skill-check-resolver.ts`
    - `src/ai/flows/managers/narrative-turn-manager.ts`
    - `src/components/game/visual-dice-pair.tsx` (Nuevo)
    - `src/components/game/dice-roll-result.tsx` (Actualizado)
  - **Referencia:** [Plan de Desarrollo](../docs/planes-desarrollo/en-curso/sistema-skill-checks.md)

### Fixed
- **🔇 Corrección de Audio de Ambientación Persistente (2025-12-08):**
  - **Problema:** Al salir de una ubicación con audio mapeado (ej: Posada) a una sin audio específico/válido (ej: Plaza, si faltan archivos), la ambientación anterior seguía sonando indefinidamente debido a un retorno temprano en la lógica.
  - **Solución:** `MusicManager` ahora ejecuta explícitamente un fade-out para silenciar el canal si no encuentra una pista válida, en lugar de ignorar el cambio.
  - **Archivos modificados:** `src/components/game/music-manager.tsx`

## [0.5.96] - 2025-12-08

### Changed
- **💾 Refactorización y Persistencia del Estado del Mundo (2025-12-08):**
  - **Mejora:** Implementación del patrón "WorldState" para garantizar la persistencia de cambios en el mundo (enemigos derrotados, puertas abiertas) entre sesiones de juego.
  - **Problema Solucionado:** Al cargar una partida, el juego "olvidaba" los enemigos derrotados en otras habitaciones y el estado de puertas, resucitando enemigos y cerrando puertas previamente abiertas.
  - **Detalles Técnicos:**
    - Implementación de arquitectura "Base State + Deltas" mediante objeto `WorldState`.
    - Corrección de `handleInternalSaveGame` para incluir `enemiesByLocation` y `openDoors` sincronizados.
    - Restauración y mejora de `handleLoadGame` en `page.tsx` con migración automática de saves legacy.
    - Integración estricta de reglas de nombrado de enemigos en `ExplorationExpert` y `NarrativeManager` para evitar traducciones indeseadas (ej: "Goblin" -> "Trasgo").
  - **Archivos modificados:**
    - `src/app/page.tsx`
    - `src/components/game/game-view.tsx`
    - `src/ai/flows/narrative-manager.ts`
    - `src/ai/flows/experts/exploration-expert.ts`
  - **Referencia:** [Plan Completado](../docs/planes-desarrollo/completados/refactorizacion-persistencia-mundo.md)

### Fixed
- **🔧 Correcciones críticas del sistema de exploración y contexto narrativo (2025-12-08):**
  - **Problema:** El DM narraba incorrectamente entidades muertas en ubicaciones equivocadas, puertas cerradas como abiertas, NPCs como muertos, y revelaba spoilers de salas no visitadas.
  - **Correcciones implementadas:**
    - ✅ **Aislamiento estricto de entidades por ubicación:** `ExplorationContextBuilder.getEntitiesInLocationStrict` ahora solo usa `enemiesByLocation[locationId]` específico, evitando mezclar enemigos muertos de diferentes salas. Esto corrige el problema donde el goblin muerto en la sala sur aparecía en la descripción de la sala norte.
    - ✅ **Campo `doorStates` añadido al ExplorationContext:** Estado autoritativo de puertas (dirección → 'open' | 'closed') para que el DM no confíe en descripciones estáticas del JSON que pueden estar desactualizadas. El DM ahora usa `explorationContext.doorStates` como fuente de verdad.
    - ✅ **NPCs no marcados como muertos incorrectamente:** Mejora en `isEntityOutOfCombat` para manejar múltiples formatos de HP (`hp: { current, max }` y `stats: { hp }`). Si no hay información de HP, se asume que la entidad está viva para evitar falsos positivos. Esto corrige el problema donde Boris el Mercader aparecía como muerto sin haber sido atacado.
    - ✅ **Títulos de salas no visitadas ocultos:** Solo se revela el título de salas ya visitadas (`visitState === 'visited'` o `'seen'`). Para salas no visitadas, se muestra `(unexplored area)` en lugar del título literal, evitando spoilers como "Sala de la Emboscada".
    - ✅ **Prompt del ExplorationExpert reforzado:** `explorationContext` es ahora la fuente de verdad primaria, con instrucciones explícitas sobre puertas y entidades. El prompt incluye jerarquía clara: `explorationContext` > `locationContext` para evitar confiar en descripciones estáticas desactualizadas.
  - **Archivos modificados:**
    - `src/ai/flows/managers/exploration-context-builder.ts` - Aislamiento de entidades, `doorStates`, ocultación de títulos, normalización de NPCs
    - `src/ai/flows/experts/exploration-expert.ts` - Prompt reforzado con jerarquía de fuentes y prohibición de inventar muertes
    - `src/lib/game/entity-status-utils.ts` - Mejora en `isEntityOutOfCombat` para múltiples formatos de HP
  - **Impacto:** El DM ahora describe correctamente el estado de puertas, entidades y salas, sin mezclar información entre ubicaciones ni inventar muertes de NPCs.

- **🔧 Simplificación y mejoras del sistema de exploración (2025-12-08):**
  - **Simplificación del formato de `visibleConnections`:** Cambio de formato estructurado complejo (ej: `Room: "Sala del Tesoro"`, `[VISIBLE ENTITIES: ...]`) a formato natural simple (ej: `"norte Sala del Tesoro (archway) entities: Boris"`). Esto evita que el DM interprete literalmente etiquetas estructuradas y produce narraciones más naturales.
  - **Restauración de exclusión de conexión de origen:** La lógica para excluir la conexión por la que el jugador acaba de llegar (`cameFromLocationId`) ha sido restaurada en `calculateVisibleConnections`, evitando narraciones redundantes sobre la sala de la que acabas de salir.
  - **Mejora del prompt del ExplorationExpert:** Instrucciones explícitas añadidas para interpretar correctamente `(archway)` vs `(open door)` en `visibleConnections`. El DM ahora sabe que `(archway)` debe describirse como pasaje abierto o arco, NO como puerta, evitando confusiones cuando solo hay arcos en el mapa.
  - **Reducción de longitud de narración:** Ajuste de límites de longitud para hacer las narraciones más concisas:
    - Momentos clave: de 3-4 frases a **2-3 frases**
    - Narración estándar: de 2-3 frases a **1-2 frases**
  - **Archivos modificados:**
    - `src/ai/flows/managers/exploration-context-builder.ts` - Formato simplificado de `visibleConnections`, restauración de exclusión de conexión de origen
    - `src/ai/flows/experts/exploration-expert.ts` - Instrucciones explícitas sobre interpretación de `(archway)` vs `(open door)`, reducción de longitud de narración
    - `tests/unit/managers/exploration-context-builder.test.ts` - Actualización de tests para reflejar nuevo formato
  - **Impacto:** Narraciones más naturales y concisas, sin confusión entre puertas y arcos, y sin redundancias sobre salas ya visitadas.

### Added / Fixed
- **🎮 Selector de Aventuras con Estructura de Carpetas (2025-12-08):**
  - **Mejora:** El botón "Nueva Partida" ahora muestra un selector interactivo con todas las aventuras disponibles en `/JSON_adventures`.
  - **Características:**
    - Estructura de árbol jerárquica con carpetas colapsables
    - Las carpetas aparecen colapsadas por defecto y se expanden al hacer clic
    - Iconos visuales diferenciados para carpetas y archivos JSON
    - Indentación visual para mostrar la jerarquía de carpetas
    - Filtrado automático: ignora carpetas `dev` y `backup`
  - **Backend:**
    - Nueva API `/api/adventures/list` que devuelve estructura de árbol de aventuras
    - API `/api/load-adventure` actualizada para aceptar parámetro `filename` opcional
  - **Frontend:**
    - Componente `MainMenu` actualizado con diálogo de selección de aventuras
    - Reutiliza el mismo sistema robusto de carga que "Cargar Aventura (JSON)"
    - Muestra barra de progreso de carga con los mismos pasos de validación
  - **Archivos modificados:**
    - `src/app/api/adventures/list/route.ts` (nuevo)
    - `src/app/api/load-adventure/route.ts` (actualizado)
    - `src/components/game/main-menu.tsx` (actualizado)
    - `src/app/page.tsx` (actualizado)
- Movimiento con estado estructurado: `NavigationManager` ahora devuelve `status: 'ok' | 'already_here' | 'blocked' | 'not_found'` para que el flujo narrativo sepa si realmente hubo desplazamiento.
- Narración coherente con feedback: El Exploration Expert prioriza el `systemFeedback` ("Ya estás en…") y evita narrar viajes inexistentes cuando el jugador ya está en la sala.
- Estado real de enemigos en exploración: `ExplorationContextBuilder` usa primero `enemiesByLocation` (hp actualizado, muertos) antes de recurrir al JSON, eliminando combates fantasma con enemigos ya derrotados.
- Ajuste de ambush en sala visible: Retirado el hazard de emboscada en la sala sur (goblin visible) para que el combate inicie por proximidad sin sorpresa.



## [Unreleased]

### Added
- **📚 Integración de Google File Search (RAG Automatizado) (2025-12-14):**
  - **Mejora:** Implementación completa del sistema RAG gestionado por Gemini para consulta de manuales.
  - **Características:**
    - ✅ **Script de Gestión:** `scripts/setup-knowledge-base.ts` para subir y gestionar PDFs automáticamente.
    - ✅ **Persistencia:** Reutilización de URIs de archivos indexados para evitar subidas redundantes.
    - ✅ **Consultas Semánticas:** `consult-rulebook.ts` y `structure-entity.ts` ahora usan el corpus indexado para responder preguntas de reglas y formatear entidades con precisión canónica.
  - **Archivos modificados:** `scripts/setup-knowledge-base.ts`, `src/ai/tools/consult-rulebook.ts`, `src/ai/tools/structure-entity.ts`.
  - **Referencia:** [Roadmap Item #7](../docs/roadmap.md#roadmap-7)

- **🎨 Rediseño Premium del Compendio (2025-12-14):**
  - **Mejora:** Revisión visual completa de las fichas de Monstruos, Hechizos y Objetos.
  - **Características:**
    - ✅ **Diseño Diferenciado:** Estilos únicos por tipo (Rojo/Monstruos, Azul/Hechizos, Oro/Objetos).
    - ✅ **Traducción Automática:** Los stats de monstruos (AC, HP, Sentidos, Skills) se traducen automáticamente al español en la UI.
    - ✅ **Layout Optimizado:** Fichas de ancho fijo (650px), centradas, con distribución en 2 columnas para stats defensivos.
    - ✅ **Tipografía Unificada:** Uso consistente de fuentes Slate y jerarquía visual clara.
  - **Archivos modificados:** `src/lib/game/compendium-formatter.ts`, `src/components/game/game-view.tsx`.

- **🕵️‍♂️ Refactorización de Arquitectura de Sigilo (2025-12-14):**
  - **Mejora:** El sistema de sigilo ahora se basa en detección de intención semántica por la IA, eliminando la dependencia de "palabras clave" harcodeadas.
  - **Características:**
    - ✅ **Stealth Intent:** Nuevo campo `stealthIntent` en el schema del `ActionInterpreter`.
    - ✅ **Prompt Inteligente:** La IA detecta intenciones sutiles ("me muevo con cautela", "trato de no hacer ruido") y marca el flag explícitamente.
    - ✅ **Ejecución Robusta:** `NarrativeTurnManager` consume este flag para realizar tiradas de sigilo implícitas durante el movimiento.
    - ✅ **Fix de Emboscada:** `CombatTriggerEvaluator` ahora respeta el resultado de la tirada de sigilo para evitar activar emboscadas si el check es exitoso.
  - **Archivos modificados:** `src/ai/flows/schemas.ts`, `src/ai/flows/action-interpreter.ts`, `src/ai/flows/managers/narrative-turn-manager.ts`, `src/lib/combat/trigger/combat-trigger-evaluator.ts`.



### Added
- Plan de refactorización de modularidad del sistema de combate cerrado (Fases 1, 2/2.5, 3 y 4), documentado en `docs/planes-desarrollo/completados/refactorizacion-modularidad-sistema-combate.md`, con plan maestro y roadmap actualizados.
- **✅ Estabilización de tests de combate (2025-12-06):**
  - Tests de integración y unidad alineados con el nuevo FSM (incluye `CombatPhase` en schemas front/back).
  - Nuevos tests unitarios para `InteractionHandler` y `ExplorationContextBuilder` (Fase 3 del plan de refactorización).
  - Ajustes de mocks de dados/tactician (`attackType`) para compatibilidad con `TurnProcessor`.
  - Script `test` usa `vitest run` para evitar watch mode por defecto.
### Fixed
- Fin de combate inmediato y pill de victoria restaurada:
  - La FSM cierra el combate en cuanto cae el último enemigo (sin requerir “continuar turno”).
  - Se emite una tirada sintética con `outcome: 'victory'` para mostrar la pastilla verde en el panel de tiradas.
- Estadísticas de enemigos respetan las del JSON:
  - `EnemyValidator` ahora prioriza `stats.hp`/`stats.ac` del adventure file y solo rellena campos faltantes desde la D&D API (evita que AC vuelva a 15 si el JSON la fija en 10).
- Puertas y triggers tras combate:
  - Puertas abiertas marcan también la dirección recíproca en `openDoors` para permitir el regreso.
  - Las transiciones de sala marcan las puertas usadas como abiertas (ida y vuelta).
  - Los triggers de combate por proximidad ignoran enemigos muertos/inconscientes para evitar combates fantasma y descripciones erróneas.
- **📦 División de `narrative-turn-manager.ts` - COMPLETADO (2025-12-05):**
  - **Mejora:** Refactorización de `narrative-turn-manager.ts` extrayendo lógica de interacciones y exploración a módulos especializados.
  - **Características:**
    - ✅ **InteractionHandler:** Módulo dedicado para manejar interacciones con objetos/puertas (~200 líneas)
      - Mapeo de interactables (nombres/acciones a IDs)
      - Apertura de puertas con detección inteligente de dirección
      - Detección de triggers de combate por interacción (mimics)
      - Actualización de estados de puertas abiertas
    - ✅ **ExplorationContextBuilder:** Módulo dedicado para construir contexto de exploración (~240 líneas)
      - Actualización del estado de exploración (Fog of War)
      - Detección de hazards mediante percepción pasiva
      - Cálculo de conexiones visibles
      - Resolución de entidades presentes
    - ✅ **Tipos Mejorados:** `mode` y `lightLevel` ahora tienen tipos específicos (`'safe' | 'dungeon' | 'wilderness'` y `'bright' | 'dim' | 'dark'`)
  - **Resultados:**
    - ✅ `narrative-turn-manager.ts` reducido de ~549 líneas a ~418 líneas (~130 líneas eliminadas)
    - ✅ Separación clara de responsabilidades
    - ✅ Código más testeable y mantenible
    - ✅ Reutilización de código facilitada
  - **Archivos creados:**
    - `src/ai/flows/managers/interaction-handler.ts` (~250 líneas)
    - `src/ai/flows/managers/exploration-context-builder.ts` (~240 líneas)
    - `tests/unit/managers/interaction-handler.test.ts` (18 tests, ~400 líneas)
    - `tests/unit/managers/exploration-context-builder.test.ts` (múltiples tests, ~500 líneas)
  - **Archivos modificados:**
    - `src/ai/flows/managers/narrative-turn-manager.ts` (refactorizado para usar los nuevos módulos)
  - **Tests:**
    - ✅ 18 tests para `InteractionHandler` (todos pasando)
    - ✅ Tests completos para `ExplorationContextBuilder` (mapeo de interactables, apertura de puertas, detección de mimics, actualización de conexiones, estado de exploración, detección de hazards, conexiones visibles, resolución de entidades)
  - **Referencia:** Plan de Refactorización - Fase 3 (Modularidad del Sistema de Combate)

- **🔄 Máquina de Estados Finita (FSM) para Sistema de Combate - COMPLETADO (2025-12-05):**
  - **Mejora:** Refactorización completa del sistema de combate implementando una Máquina de Estados Finita (FSM) explícita para eliminar problemas de sincronización, bucles infinitos y acciones fuera de turno.
  - **Características:**
    - ✅ **Estados Explícitos:** Sistema de fases claramente definidas (`SETUP`, `TURN_START`, `WAITING_FOR_ACTION`, `PROCESSING_ACTION`, `ACTION_RESOLVED`, `TURN_END`, `COMBAT_END`)
    - ✅ **Transiciones Controladas:** Método centralizado `transitionTo()` que maneja todas las transiciones de estado con validación y efectos secundarios
    - ✅ **Pausa Obligatoria:** Cada acción (AI o Player) termina en `ACTION_RESOLVED`, requiriendo confirmación explícita del usuario antes de avanzar
    - ✅ **Manejo Unificado de Sorpresa:** La sorpresa se maneja explícitamente en `TURN_START`, mostrando mensaje y saltando directamente a `ACTION_RESOLVED`
    - ✅ **Eliminación de Flags Redundantes:** Reemplazo de `turnCompleted`, `playerActionCompleted`, `waitingForPlayerConfirmation` por el estado `phase` único
    - ✅ **Frontend Simplificado:** El frontend ahora reacciona a `combatPhase` en lugar de múltiples flags booleanos
    - ✅ **Eliminación de Lógica Compleja:** Removidas ~100 líneas de lógica condicional compleja en favor de derivación simple de estado
    - ✅ **Robustez Mejorada:** Sistema funciona incluso si la fase se pierde durante serialización (medidas de seguridad)
  - **Problemas Resueltos:**
    - ✅ Eliminados bucles infinitos en turnos de AI
    - ✅ Eliminados saltos automáticos de turnos sin confirmación
    - ✅ Eliminada confusión entre turnos de AI y Player
    - ✅ Eliminada lógica de "predicción" del siguiente turno
    - ✅ Eliminada desincronización de fase entre cliente/servidor
    - ✅ Eliminada re-entrada en `handleTurnStart` causando bucles
    - ✅ Eliminada pérdida de fase durante serialización (añadido `phase` a todos los schemas)
  - **Archivos modificados:**
    - `src/lib/types.ts` (Añadido enum `CombatPhase`)
    - `src/ai/tools/combat-manager.ts` (Añadido `phase` a schemas de input/output)
    - `src/ai/flows/schemas.ts` (Añadido `phase` a `GameStateSchema` y `GameCoordinatorOutputSchema`)
    - `src/lib/combat/combat-session.ts` (Refactorización completa a FSM, eliminación de métodos ad-hoc, ~200 líneas modificadas)
    - `src/lib/combat/turn-manager.ts` (Eliminada lógica de sorpresa redundante)
    - `src/components/game/game-view.tsx` (Simplificación completa, eliminación de flags redundantes, ~150 líneas simplificadas)
    - `src/app/actions.ts` (Añadido logging de `phase` para debugging)
  - **Referencia:** Plan de Refactorización - Fase 2.5 (Modularidad del Sistema de Combate)

- **⚔️ Sistema de Inicio de Combate Dinámico - COMPLETADO (2025-12-03):**
  - **Mejora:** Sistema completo que permite que el mundo reaccione automáticamente a las acciones del jugador, iniciando combate cuando la narrativa o la lógica lo requieren.
  - **Fase 1: Emboscadas (2025-12-01):**
    - ✅ **Emboscadas Automáticas:** Entrar en una ubicación con enemigos ocultos (hazard tipo `ambush`) sin detectarlos inicia combate automáticamente con sorpresa para enemigos.
    - ✅ **Sistema de Sorpresa Mecánico:** Combatientes sorprendidos pierden su primer turno con mensaje narrativo "X está sorprendido y pierde su turno."
  - **Fase 1.5: Proximidad, Sigilo y Mímicos (2025-12-01):**
    - ✅ **Combate por Proximidad:** Enemigos visibles y hostiles inician combate automáticamente al entrar en la sala.
    - ✅ **Fallo de Sigilo:** Si el jugador intenta moverse sigilosamente pero falla, los enemigos detectan la intrusión e inician combate.
    - ✅ **Detección de Mímicos:** Interactuar con objetos que son hazards tipo `mimic` inicia combate automáticamente con sorpresa del enemigo.
    - ✅ **Sistema de Enemigos Ocultos:** Enemigos con `disposition: 'hidden'` no inician combate por proximidad, solo cuando se interactúa específicamente con ellos.
    - ✅ **Revelación Dinámica:** Solo el enemigo específico que dispara el combate se revela (cambia de `hidden` a `hostile`), manteniendo otros enemigos ocultos intactos.
    - ✅ **Normalización de Estadísticas:** Conversión automática de `stats.hp` a `hp: { current, max }` para entidades cargadas desde JSON.
    - ✅ **Mapeo Inteligente:** Sistema que mapea nombres de acciones/interactuables a IDs de hazards para detección precisa.
    - ✅ **Sistema de Puertas:** Puertas cerradas (`isOpen: false`) detienen el movimiento, requiriendo interacción explícita para abrir.
  - **Fase 2: Detección de Intención (2025-12-02):**
    - ✅ **Ataques Sorpresa del Jugador:** Detección automática de ataques a NPCs neutrales/amigables fuera de combate.
    - ✅ **Sorpresa del Jugador:** NPCs atacados por sorpresa pierden su primer turno.
    - ✅ **Transición Fluida:** El sistema transiciona automáticamente de exploración/diálogo a combate cuando se detecta intención hostil.
  - **Fase 3: Orquestación (2025-12-02):**
    - ✅ **Orquestación Centralizada:** `GameCoordinator` maneja todos los tipos de triggers de combate dinámico de forma unificada.
    - ✅ **Transiciones Fluidas:** Narraciones de transición coherentes entre exploración y combate.
  - **Test de Regresión (2025-12-03):**
    - ✅ Todos los tipos de triggers funcionan correctamente.
    - ✅ Las transiciones de exploración a combate son fluidas.
    - ✅ El sistema de sorpresa funciona mecánicamente (turnos saltados).
    - ✅ No hay errores en consola o estados inconsistentes.
    - ✅ El juego puede continuar normalmente después de cada combate.
  - **Archivos modificados:**
    - `src/ai/flows/managers/combat-trigger-manager.ts` (Nuevo módulo para evaluación de triggers de combate)
    - `src/ai/flows/managers/narrative-turn-manager.ts` (Integración de triggers en el flujo narrativo)
    - `src/ai/flows/game-coordinator.ts` (Manejo de triggers dinámicos y revelación de enemigos)
    - `src/ai/flows/action-interpreter.ts` (Detección de intención hostil)
    - `src/lib/schemas.ts` (Añadido `'mimic'` al enum `HazardSchema.type`, `isOpen` a `ConnectionSchema`)
    - `src/lib/types.ts` (Añadido `isSurprised?: boolean` a `Combatant`)
    - `src/lib/combat/combat-session.ts` (Manejo de turnos sorprendidos)
    - `src/lib/combat/combat-initializer.ts` (Soporte para `surpriseSide`)
    - `src/lib/combat/initialization/initiative-generator.ts` (Marcado de combatientes sorprendidos)
    - `src/lib/combat/turn-manager.ts` (Lógica para saltar turnos sorprendidos)
    - `src/lib/adventure-loader/game-initializer.ts` (Soporte para campo `introduction` en JSONs)
    - `src/ai/flows/schemas.ts` (Añadido `openDoors` a `GameStateSchema`)
    - `src/ai/flows/managers/navigation-manager.ts` (Validación de puertas cerradas)
    - `tests/unit/combat/combat-trigger-manager.test.ts` (Tests unitarios completos)
  - **Referencia:** [Plan Completado](../docs/planes-desarrollo/completados/sistema-inicio-combate-dinamico.md)

### Changed
- **🧪 Suite de tests de combate e integración actualizada (2025-12-06):**
  - Tests de integración (`combat-manager`, `combat-initializer`) mockean dependencias externas (Gemini) y se sincronizan con el FSM.
  - Aserciones relajadas en flujos de DI para evitar falsos negativos cuando el FSM mantiene `inCombat`.
  - Añadidos `attackType` y normalización de skills/saving throws en fixtures para cumplir esquemas.
- **📝 Mejoras en el Formato de Logs (2025-12-05):**
  - **Mejora:** Refactorización del formato de logs para mejorar la legibilidad y consistencia.
  - **Cambios en el formato:**
    - ✅ **Reordenamiento:** El módulo `[ModuleName]` ahora aparece después del nivel de log (INFO/WARN/ERROR) y antes del mensaje, en lugar de al final.
    - ✅ **Separador visual:** Los campos de contexto ahora están separados del mensaje con un guion (`-`) para mejor legibilidad.
    - ✅ **Formato de valores mejorado:** Manejo explícito de `null`, `undefined` y booleanos con representación clara.
    - ✅ **Truncado inteligente:** Strings largos se truncan a 100 caracteres y objetos JSON a 200 caracteres para evitar líneas excesivamente largas.
    - ✅ **Formato de objetos:** Objetos y arrays se serializan en JSON compacto pero legible.
    - ✅ **Colores sutiles:** Los campos de contexto usan color tenue en terminales con soporte de colores para diferenciarlos visualmente del mensaje principal.
    - ✅ **Orden alfabético:** Los campos de contexto se ordenan alfabéticamente para consistencia y fácil búsqueda.
  - **Ejemplo del cambio:**
    - **Antes:** `2025-12-05 19:59:23.923 INFO  Adventure data cache updated and persisted [GameState] adventureId=test-ambush locationsCount=5 entitiesCount=5`
    - **Después:** `2025-12-05 19:59:23.923 INFO [GameState] Adventure data cache updated and persisted - adventureId=test-ambush entitiesCount=5 locationsCount=5`
  - **Archivos modificados:**
    - `src/lib/logger.ts` (Refactorización de `formatOtherFields` y nuevo método `formatValue`)
    - `src/lib/logger-client.ts` (Mismas mejoras aplicadas al logger del cliente)

## [0.5.95] - 2025-12-01

### Added
- **🗺️ Sistema de Exploración de Mazmorras (Fase 2) (2025-12-01):**
  - **Mejora:** Implementación de "Niebla de Guerra", percepción pasiva y detección de peligros para aumentar la tensión en la exploración.
  - **Características:**
    - ✅ **Niebla de Guerra:** El sistema recuerda qué habitaciones han sido visitadas (`visited`), vistas (`seen`) o son desconocidas (`unknown`).
    - ✅ **Percepción Pasiva:** Chequeo automático al entrar en una sala contra la CD de trampas y enemigos ocultos.
    - ✅ **Peligros y Trampas:** Soporte para trampas mecánicas y emboscadas con lógica de activación y detección.
    - ✅ **Visibilidad en Conexiones:** Diferenciación entre conexiones abiertas (ves lo que hay al otro lado) y restringidas (puertas cerradas).
    - ✅ **Narrativa Contextual:** El Narrador adapta la descripción según el nivel de luz (`lightLevel`) y si es la primera visita o una revisita.
  - **Archivos modificados:**
    - `src/ai/flows/managers/exploration-manager.ts` (Nuevo gestor de lógica de exploración)
    - `src/ai/flows/managers/narrative-turn-manager.ts` (Integración de exploración en el turno)
    - `src/ai/flows/experts/exploration-expert.ts` (Prompt actualizado con contexto de exploración)
    - `src/ai/flows/action-interpreter.ts` (Soporte para `connections` en el prompt)
    - `src/lib/schemas.ts` (Nuevos esquemas para `Hazard`, `ExplorationState`, `Connection.visibility`)
  - **Referencia:** [Plan Completado](../docs/planes-desarrollo/completados/sistema-exploracion-mazmorras.md)

- **🗺️ Sistema de Movimiento y Conciencia Espacial (Fase 1) (2025-11-30):**
  - **Mejora:** Implementación de un sistema de navegación robusto que permite movimiento multi-salto, cálculo de tiempos y detección de bloqueos.
  - **Características:**
    - ✅ **Pathfinding BFS:** Calcula automáticamente la ruta más corta entre dos ubicaciones no adyacentes.
    - ✅ **Validación Paso a Paso:** Verifica bloqueos (`isBlocked`) y puertas cerradas (`isLocked`) en cada paso de la ruta.
    - ✅ **Cálculo de Tiempo:** Suma acumulativa del tiempo de viaje basado en el tipo de conexión (urbano, overland, directo).
    - ✅ **Narración Fluida:** Separa la narración del viaje (transición) de la descripción de llegada, permitiendo interrupciones narrativas naturales.
    - ✅ **Integración Semántica:** Permite moverse hacia NPCs o lugares por nombre (ej: "Ir a ver a Halia" -> "Casa de Cambio").
    - ✅ **Caché Reactiva:** El sistema de caché de aventuras ahora detecta cambios en el archivo JSON y se invalida automáticamente.
  - **Archivos modificados:**
    - `src/ai/flows/managers/navigation-manager.ts` (Nuevo motor de pathfinding)
    - `src/ai/flows/managers/narrative-turn-manager.ts` (Integración con flujo narrativo)
    - `src/lib/adventure-loader/adventure-cache.ts` (Soporte para invalidación por hash)
    - `src/lib/schemas.ts` (Nuevos tipos para conexiones ricas)
  - **Referencia:** [Plan Completado](../docs/planes-desarrollo/completados/sistema-movimiento-conciencia-espacial.md)


### Añadido
- **Direcciones en Conexiones:** Nuevo campo `direction` en el esquema de conexiones. Soporta cardinales (norte, sur, este, oeste), intermedios (noreste, noroeste, sureste, suroeste) y relativos (arriba, abajo, dentro, fuera) para mejorar la orientación espacial en la narración.
- **Regiones en Ubicaciones:** Nuevo campo `regionId` en el esquema de ubicaciones para agrupar lógicamente salas (ej: `excavacion-de-los-enanos`).
- **Nuevas Ubicaciones:** Desglose detallado de la "Excavación de los Enanos" en 6 sub-ubicaciones (E1-E11) coincidiendo con el mapa oficial.
- **Resolución de Entidades:** Nuevo campo `resolvedEntityId` en el esquema de `Location` y `Connection` para permitir que el Narrador se refiera a ubicaciones por nombres alternativos (ej: "Casa de Cambio" -> "Bazar de Phandalin").
- **Estado Inicial de Exploración:** El `game-initializer.ts` ahora establece el estado de exploración inicial (`ExplorationState`) para la ubicación de inicio, marcándola como `visited` y sus conexiones como `seen`.

### Corregido
- **Sistema de Combate**: Solucionado un error crítico donde el combate se reiniciaba sin enemigos (loops infinitos) al volver a una zona de emboscada con enemigos ya derrotados. El `CombatInitiationService` ahora aborta correctamente la iniciación si no hay enemigos vivos.
- **Narración de Exploración**: Corregido un problema donde objetos interactuables visibles (como cofres) en habitaciones adyacentes no se mencionaban en la descripción de las conexiones visibles. Ahora el `ExplorationExpert` recibe información sobre objetos visibles a través de puertas abiertas o arcos.
-   **Narración de Primera Visita:** Solucionado un bug en `NarrativeTurnManager` donde las ubicaciones se marcaban como "visitadas" antes de generar la narración. Además, se ha corregido la inicialización del juego (`game-initializer.ts`) para marcar la ubicación de inicio como visitada, evitando descripciones redundantes al regresar al hub inicial.
-   **Filtrado de Narración Redundante:** Mejorada la lógica de `NarrativeTurnManager` para filtrar la conexión de origen y evitar describir la salida por la que se acaba de entrar.
-   **Visibilidad de NPCs:** Ahora el `ExplorationExpert` recibe la información de las entidades presentes (`presentEntities`) y las describe visualmente en la escena, solucionando el problema de "NPCs invisibles" hasta que se interactuaba con ellos.
-   **Estructura JSON:** Reescritura completa de `el-dragon-del-pico-agujahelada_short.json` con correcciones de direcciones (noreste, suroeste) y descripciones actualizadas.

## [0.5.9] - 2025-11-27

### Changed
- **🚀 Refactorización de "Nueva Partida" (2025-11-27):**
  - **Mejora:** El botón "Nueva Partida" ahora utiliza el sistema robusto de inicialización (`initializeGame`) en lugar de lógica hardcodeada.
  - **Detalles:**
    - Se ha eliminado la dependencia de `new-game-data.ts`, que contenía una copia hardcodeada de la introducción.
    - Ahora la introducción se carga dinámicamente desde el archivo JSON de la aventura (`el-dragon-del-pico-agujahelada.json`), facilitando actualizaciones de contenido sin tocar código.
    - Se garantiza que la validación y el caché funcionen igual para "Nueva Partida" que para "Cargar Aventura".
  - **Archivos modificados:**
    - `src/app/page.tsx` (Lógica de `handleNewGame` actualizada)
    - `src/lib/new-game-data.ts` (Eliminado)

### Added
- **🎵 Sistema de Música y Sonido Dinámico (2025-11-27):**
  - **Mejora:** Implementación de un sistema de audio inmersivo que adapta la música y el ambiente al contexto del juego.
  - **Características:**
    - ✅ **Audio Multicanal:** Control independiente para Música, Ambiente, Efectos (SFX) y Narrador.
    - ✅ **Jerarquía de Búsqueda Inteligente (5 Niveles):**
      1. **Lugar Exacto:** ID específico (ej: `bazar-escudo-de-leon`)
      2. **Tipo Granular:** Tipo específico extraído del ID (ej: `bazar`)
      3. **Región:** Región inferida por ID o metadatos (ej: `phandalin`)
      4.  **Tipo General:** Categoría de ubicación (ej: `city`)
      5. **General:** Fallback global por modo de juego (ej: `exploration_general`)
    - ✅ **Inferencia de Región:** Detecta automáticamente si una ubicación pertenece a una región mayor (ej: Phandalin) basándose en metadatos.
    - ✅ **Transiciones Suaves:** Crossfading de 4 segundos para cambios de pista cinematográficos.
    - ✅ **Gestión de Estado Eficiente:** Uso de `useRef` para evitar re-renderizados innecesarios y logs redundantes.
  - **Archivos modificados:**
    - `src/components/game/music-manager.tsx` (Lógica central y jerarquía)
    - `src/components/game/game-view.tsx` (Gestión de estado global de audio)
    - `src/components/game/player-input.tsx` (Controles de volumen en UI)
    - `src/lib/types.ts` (Tipos de configuración de volumen)
  - **Referencia:** [Roadmap Item #20](../../docs/roadmap.md#roadmap-20-musica)

### Changed
- **🎨 Colores de Mensajes del Chat por Personaje (2025-01-23):**
  - **Mejora:** Los mensajes del chat ahora muestran el color del personaje correspondiente, tanto cuando son controlados por el jugador como por la IA.
  - **Detalles:**
    - Los mensajes de Galador se muestran en azul (#3b82f6)
    - Los mensajes de Merryl se muestran en lila (#8b5cf6)
    - Los mensajes de Elara se muestran en naranja (#f97316)
    - El color se aplica consistentemente independientemente de si el personaje está controlado por el jugador o por la IA
    - En combate, se usa el color del combatiente activo; fuera de combate, se usa el color del personaje seleccionado
  - **Archivos modificados:** `src/components/game/game-view.tsx`, `src/components/game/chat-message.tsx`
  - **Impacto:** Mejora la experiencia visual y facilita la identificación rápida de qué personaje está hablando

- **🏗️ Refactorización: Gestión de Nombres de Monstruos (Issue #16) (2025-11-27):**
  - **Mejora:** Centralizada la lógica de generación de nombres únicos y reemplazo en narraciones en un módulo dedicado.
  - **Detalles:**
    - Nuevo módulo `monster-name-manager.ts` que maneja `generateDifferentiatedNames` y `replaceOrdinalReferences`.
    - Elimina duplicación de código y mejora la mantenibilidad.
  - **Archivos modificados:** `src/lib/combat/monster-name-manager.ts`, `src/lib/combat/initialization/initiative-generator.ts`, `src/lib/combat/initialization/narration-processor.ts`.
  - **Referencia:** [Issue #16](../../docs/tracking/issues/corregidos.md#issue-16-gestión-de-nombres-de-múltiples-monstruos-en-módulo-separado-🟢-mejora)

### Fixed
- **✅ Comportamiento de Paneles Post-Combate (Issue #32) (2025-11-27):**
  - **Problema:** Inconsistencia percibida en la limpieza de paneles tras el combate.
  - **Solución:** Se ha estandarizado el comportamiento: el tracker de iniciativa se limpia (fin de combate) y el historial de tiradas se mantiene (revisión de resultados).
  - **Referencia:** [Issue #32](../../docs/tracking/issues/corregidos.md#issue-32-limpieza-de-paneles-de-combate-🟢-mejora)
- **✅ Validación de Ataque a Objetivo Muerto (Issue #38) (2025-11-27):**
  - **Problema:** El sistema permitía atacar a enemigos muertos y luego bloqueaba el input del jugador.
  - **Solución:**
    - Implementada validación `TARGET_DEAD` en `TurnProcessor` para rechazar ataques a muertos.
    - El sistema ahora informa: "{Target} ya está muerto. ¿Qué quieres hacer?" y permite nueva acción.
    - Implementado sistema de estados visuales (Calavera/Actividad) en `InitiativeTracker` y `DiceRollResult`.
  - **Archivos modificados:** `src/lib/combat/turn-processor.ts`, `src/lib/combat/combat-session.ts`, `src/components/game/initiative-tracker.tsx`.
  - **Referencia:** [Issue #38](../../docs/tracking/issues/corregidos.md#issue-38-auto-redirección-de-ataque-a-enemigo-diferente-cuando-target-está-muerto-🟢-mejora--decisión-de-diseño)


- **✅ Regresión UI - Botones de avance de turno (Issue #130) (2025-11-26):**
  - **Problema:** Los botones "Avanzar 1 turno" y "Avance automático" desaparecieron tras un refactor de UI, bloqueando el combate.
  - **Causa:** El componente `ChatPanel` no recibía el prop `onAdvanceAll` necesario para renderizar los controles.
  - **Solución:** Implementados handlers `handlePassTurn` y `handleAdvanceAll` en `GameView` y conectados correctamente a `ChatPanel`.
  - **Archivos modificados:** `src/components/game/game-view.tsx`.
  - **Referencia:** [Issue #130](../../docs/tracking/issues/corregidos.md#issue-130-regresión-ui---botones-de-avance-de-turno-no-aparecen-tras-refactor--resuelto)


- **✅ Visualización de Barra de Vida en Panel Grupo (Issue #28) (2025-11-27):**
  - **Problema:** La barra de vida vacía era invisible cuando el personaje estaba seleccionado debido a coincidencia de colores (`bg-secondary`).
  - **Solución:** Añadida clase `bg-black/20` al track de la barra de progreso para asegurar contraste y visibilidad en todos los estados.
  - **Archivos modificados:** `src/components/game/party-panel.tsx`.
  - **Referencia:** [Issue #28](../../docs/tracking/issues/corregidos.md#issue-28-visualización-de-barra-de-vida-en-panel-grupo-🟡-advertencia)


### Changed
- **🏗️ Refactorización: Separación de Party Inicial (2025-01-23):**
  - **Mejora:** Separación de la definición de la party inicial en un módulo independiente para facilitar futuras mejoras y el sistema de creación de personajes.
  - **Cambios:**
    - ✅ **Nuevo archivo:** `src/lib/initial-party.ts` - Contiene la definición completa de `initialParty` (Galador, Merryl, Elara).
    - ✅ **Archivo refactorizado:** `src/lib/new-game-data.ts` - Ahora solo contiene `initialMessage` (mensaje inicial del DM).
    - ✅ **Imports actualizados:** Todos los archivos que usaban `initialParty` ahora importan desde `@/lib/initial-party`.
  - **Beneficios:**
    - **Modularidad:** La party inicial está separada de otros datos de inicialización.
    - **Preparación para Creador de Personajes:** Facilita la futura implementación de un sistema de creación de personajes completo.
    - **Mantenibilidad:** Estructura más clara y fácil de extender.
  - **Archivos modificados:**
    - `src/lib/initial-party.ts` (Nuevo)
    - `src/lib/new-game-data.ts` (Refactorizado)
    - `src/app/page.tsx` (Imports actualizados)
    - `src/lib/combat/action-executor.ts` (Imports actualizados)
    - `src/lib/combat/turn-processor.ts` (Imports actualizados)
    - `src/lib/combat/turn-processor.ts` (Imports actualizados)

### Added
- **🗣️ Ajuste Dinámico de Longitud de Narración (2025-11-26):**
  - **Mejora:** El sistema ahora ajusta dinámicamente la longitud de las narraciones del DM basándose en la importancia del momento.
  - **Características:**
    - ✅ **Momentos Clave:** Detecta automáticamente cambios de ubicación, muertes de entidades y descansos.
    - ✅ **Narración Adaptativa:**
      - **Estándar:** 2-3 frases, conciso y directo para acciones rutinarias.
      - **Clave:** 3-4 frases, más descriptivo y atmosférico para momentos importantes.
    - ✅ **Integración Profunda:** La bandera `isKeyMoment` se propaga desde el `NarrativeTurnManager` hasta los expertos de `Exploration` e `Interaction`.
  - **Beneficios:**
    - Mejora el ritmo del juego (menos texto en rutina, más en momentos importantes).
    - Aumenta la inmersión en transiciones y eventos dramáticos.
    - Reduce la fatiga de lectura del jugador.
  - **Archivos modificados:**
    - `src/ai/flows/managers/narrative-turn-manager.ts` (Lógica de detección)
    - `src/ai/flows/narrative-manager.ts` (Propagación)
    - `src/ai/flows/experts/exploration-expert.ts` (Prompt condicional)
    - `src/ai/flows/experts/interaction-expert.ts` (Prompt condicional)
    - `src/ai/flows/schemas.ts` (Actualización de tipos)
  - **Referencia:** [Plan Completado](../docs/planes-desarrollo/completados/ajuste-longitud-narracion.md)

- **🎭 Atribución Narrativa en Diálogos (2025-11-26):**
  - **Mejora:** Los PNJs ahora siempre incluyen una breve descripción narrativa (quién habla y cómo) antes o durante sus diálogos.
  - **Características:**
    - ✅ **Contexto Emocional:** Describe tono, gestos y expresiones faciales.
    - ✅ **Claridad de Interlocutor:** Identifica explícitamente quién está hablando en cada intervención.
    - ✅ **Inmersión:** Elimina las respuestas "secas" o puramente textuales, acercándose más a la narración de un DM humano.
  - **Implementación:**
    - Nueva directiva **"NARRATIVE ATTRIBUTION"** en el prompt de `InteractionExpert`.
    - Ejemplos explícitos para guiar al modelo en la generación de acotaciones narrativas.
  - **Archivos modificados:**
    - `src/ai/flows/experts/interaction-expert.ts` (Prompt actualizado)

### Fixed
- **✅ Pérdida de Contexto en Diálogos Ambiguos (2025-11-26):**
  - **Problema:** Cuando el jugador respondía a un PNJ con frases ambiguas (ej: "Sí, claro"), el sistema a veces lo clasificaba erróneamente como `EXPLORATION` en lugar de `INTERACTION`, rompiendo el flujo del diálogo y describiendo la habitación de nuevo.
  - **Causa:** El `narrativeRouterPrompt` no tenía acceso al historial de conversación, por lo que no podía saber que la frase era una respuesta a una pregunta anterior.
  - **Solución:**
    - Se inyecta `conversationHistory` en el prompt del Router.
    - Se añaden instrucciones explícitas para detectar respuestas a preguntas previas como interacciones sociales.
  - **Archivos modificados:**
    - `src/ai/flows/narrative-manager.ts` (Prompt y flujo actualizados)

- **✅ Alucinación de Localizaciones por PNJs (2025-11-26):**
  - **Problema:** Los PNJs inventaban nombres de localizaciones o traducían incorrectamente nombres propios (ej: "Boca del Crag" en lugar de "Cragmaw Hideout") al dar información al jugador.
  - **Causa:** El `InteractionExpert` no tenía acceso a la herramienta `adventureLookupTool` para verificar la existencia y nombres correctos de las localizaciones, dependiendo solo de su conocimiento base (propenso a alucinaciones).
  - **Solución:**
    - Se ha añadido `adventureLookupTool` a las herramientas disponibles para `InteractionExpert`.
    - Se han añadido directrices estrictas de **FACTUALITY & LOCATIONS** en el prompt para prohibir la invención de lugares y forzar el uso de la herramienta de búsqueda.
  - **Archivos modificados:**
    - `src/ai/flows/experts/interaction-expert.ts` (Prompt y tools actualizados)
### Added
- **🎲 Sistema de Tablas Aleatorias en JSON (2025-11-26):**
  - **Mejora:** Soporte para tablas de tiradas aleatorias (ej: rumores, encuentros) directamente en el archivo JSON de la aventura.
  - **Características:**
    - ✅ **Sección `tables`:** Nueva estructura en el JSON para definir tablas con rangos de dados y contenido.
    - ✅ **Etiquetas Dinámicas:** Uso de `[[ROLL_TABLE:id]]` en cualquier texto del JSON.
    - ✅ **Resolución Automática:** La herramienta `adventureLookupTool` procesa estas etiquetas y devuelve contenido real de la aventura, eliminando alucinaciones.
  - **Beneficios:** Mayor fidelidad a la aventura original, variedad en las partidas y prevención de información falsa por parte de los PNJs.
  - **Archivos modificados:**
    - `src/ai/tools/adventure-lookup.ts` (Lógica de procesamiento de etiquetas)
    - `JSON_adventures/el-dragon-del-pico-agujahelada_v2.json` (Añadida tabla de rumores y referencias en PNJs)

- **💾 Sistema de Caché Reactivo para TTS (2025-11-25):**
  - **Mejora:** Implementación de un sistema de caché híbrido (Memoria + Disco) para las narraciones de audio.
  - **Características:**
    - ✅ **Caché Reactivo:** Solo almacena audios solicitados explícitamente por el usuario.
    - ✅ **Almacenamiento Híbrido:** LRU en memoria para acceso inmediato y persistencia en disco (`.cache/tts/`).
    - ✅ **Integración Transparente:** Integrado en el núcleo de `eleven-labs-direct.ts`, beneficiando tanto a Server Actions como a API Routes.
  - **Beneficios:**
    - **Ahorro de Costos:** Evita llamadas repetidas a Eleven Labs para el mismo texto (ej. introducciones).
    - **Latencia Cero:** Respuesta instantánea para audios ya generados.
  - **Archivos modificados:**
    - `src/lib/tts/tts-cache.ts` (Nuevo)
    - `src/lib/tts/eleven-labs-direct.ts` (Actualizado)
  - **Referencia:** [Plan Completado](../docs/planes-desarrollo/completados/sistema-cache-tts.md)

- **🎙️ Refactorización y Optimización de Eleven Labs TTS (2025-11-25):**
  - **Mejora:** Arquitectura optimizada para la integración de Eleven Labs, eliminando latencia y mejorando la seguridad.
  - **Cambios:**
    - ✅ **Cliente Isomórfico:** Nuevo `eleven-labs-client.ts` que funciona tanto en cliente como en servidor, delegando la autenticación a la API Route.
    - ✅ **Eliminación de "Double Hop":** Nuevo módulo `eleven-labs-direct.ts` para llamadas directas desde el servidor (Server Actions/Flows), evitando la petición HTTP redundante a `localhost`.
    - ✅ **Configuración Robusta:** Puerto fallback corregido a `3000` y variables de entorno documentadas en `.env.example`.
    - ✅ **Logging Estructurado:** Corrección de todas las llamadas al logger para cumplir estrictamente con la firma `(message, context)`.
  - **Beneficios:**
    - Menor latencia en la generación de audio desde Server Actions.
    - Mayor seguridad al no exponer API Keys en el cliente.
    - Código más limpio y mantenible con separación clara de responsabilidades.
  - **Archivos modificados:**
    - `src/lib/tts/eleven-labs-direct.ts` (Nuevo)
    - `src/lib/tts/eleven-labs-client.ts` (Refactorizado)
    - `src/app/api/generate-audio/route.ts` (Optimizado)
    - `src/ai/flows/generate-dm-narration-audio.ts` (Actualizado)
    - `.env.example` (Nuevo)
  - **Referencia:** [Plan Completado](../docs/planes-desarrollo/completados/integracion-eleven-labs-tts.md)

### Changed
- **✅ Sistema de Carga de Aventuras Revisado (Issue #126) (2025-11-23):**
  - **Problema:** El sistema anterior dependía excesivamente de la IA para parsear JSONs, era lento (10-15s), propenso a errores de alucinación, y carecía de validación robusta y feedback visual.
  - **Solución implementada:** Rediseño completo con arquitectura modular (`adventure-parser`, `validator`, `adventure-cache`, `game-initializer`).
  - **Características Clave:**
    1.  **Fast Parser:** Intenta leer el JSON directamente primero. Carga instantánea (<1s) para archivos bien formados. Fallback a IA solo si es necesario.
    2.  **Validación Robusta:** Esquema Zod estricto + validación de integridad referencial (detecta enlaces rotos en `exits` y IDs duplicados).
    3.  **Caché Persistente:** Almacena aventuras procesadas en disco (`node_modules/.cache/dnd-adventures`), sobreviviendo a reinicios del servidor.
    4.  **Feedback Visual:** Nuevo componente `AdventureLoadProgress` que muestra cada paso (Parseando, Validando, Conectando, Inicializando, Narrando).
    5.  **Inicio Limpio:** Forzado silencio de compañeros en el turno 0 para que solo el DM narre la introducción.
  - **Beneficios:**
    - 🚀 Carga inmediata para la mayoría de aventuras.
    - 🛡️ Imposible cargar aventuras rotas que crashearían el juego después.
    - 💾 Persistencia entre sesiones de desarrollo.
    - 👁️ UX muy superior con feedback claro.
  - **Archivos modificados:**
    - `src/app/page.tsx` - Orquestación completa y UI de progreso.
    - `src/lib/adventure-loader/*` - Nuevos módulos del sistema.
    - `src/ai/flows/parse-adventure-from-json.ts` - Integración con caché y fast parser.
  - **Referencia:** [Plan Completado](../../docs/planes-desarrollo/completados/issue-126-revision-sistema-carga-aventuras.md) | [Arquitectura](../../docs/arquitectura/sistema-carga-aventuras.md)

---

## [0.5.8] - 2025-11-24

### Added
- **🎙️ Integración Completa de Eleven Labs TTS (2025-11-24):**
  - **Mejora:** Sistema de texto a voz completamente funcional usando Eleven Labs API, reemplazando Google Gemini TTS.
  - **Características:**
    - ✅ Integración con API de Eleven Labs vía API route interna
    - ✅ Soporte para configuración de voz personalizada (Voice ID)
    - ✅ Parámetros de calidad configurables (stability, similarityBoost, style, useSpeakerBoost)
    - ✅ Formato de audio MP3 (más eficiente que WAV)
    - ✅ Manejo robusto de errores (401, 404, 429, quota exceeded)
    - ✅ Sistema de reintentos con exponential backoff integrado
    - ✅ Pre-warm de conexión para evitar timeouts en primer intento
    - ✅ Truncamiento automático de textos largos (5000 caracteres) para evitar exceder quota
  - **Optimizaciones:**
    - Timeout aumentado a 60 segundos para dar más tiempo a la conexión inicial
    - Delay de reintentos reducido a 500ms para respuestas más rápidas
    - Pre-warm de conexión antes de cada petición para evitar timeouts de 10s
  - **Archivos creados/modificados:**
    - `src/lib/tts/eleven-labs-client.ts` - Cliente principal de Eleven Labs
    - `src/app/api/generate-audio/route.ts` - API route para generación de audio
    - `src/ai/flows/generate-dm-narration-audio.ts` - Flujo actualizado para usar Eleven Labs
    - `docs/configuracion/eleven-labs-setup.md` - Documentación de configuración
    - `scripts/get-elevenlabs-voices.ts` - Script para listar voces disponibles
    - `scripts/diagnose-elevenlabs.ts` - Script de diagnóstico
  - **Impacto:** Alto - Mejora significativa en velocidad y calidad del audio del DM
  - **Relacionado con:** [Plan de Integración de Eleven Labs TTS](../docs/planes-desarrollo/en-curso/integracion-eleven-labs-tts.md)

- **⚡ Sistema de Pre-warm de Conexiones para APIs (2025-11-24):**
  - **Mejora:** Implementación de pre-warm de conexiones TCP/TLS para evitar timeouts en el primer intento de todas las APIs externas.
  - **APIs optimizadas:**
    - ✅ Eleven Labs API - Pre-warm antes de cada generación de audio
    - ✅ D&D 5e API - Pre-warm en primera llamada con caché para evitar múltiples pre-warms
    - ✅ Google Gemini API - Pre-warm automático en primer uso de `executePromptWithRetry`
  - **Beneficios:**
    - Elimina fallos en el primer intento (timeout de 10s de undici)
    - Reduce necesidad de reintentos automáticos
    - Mejora velocidad de respuesta general del sistema
    - Ahorro de tiempo: de ~17s (con reintento) a ~4-6s (sin reintento necesario)
  - **Implementación:**
    - Función genérica `prewarmConnection()` en `retry-utils.ts`
    - Reutilizable para todas las APIs del proyecto
    - Manejo silencioso de errores (no crítico si falla)
  - **Archivos modificados:**
    - `src/ai/flows/retry-utils.ts` - Función genérica de pre-warm
    - `src/app/api/generate-audio/route.ts` - Pre-warm para Eleven Labs
    - `src/lib/dnd-api-client.ts` - Pre-warm para D&D API con caché
    - `src/ai/flows/retry-utils.ts` - Pre-warm automático para Gemini en `executePromptWithRetry`
  - **Impacto:** Alto - Elimina un problema recurrente que afectaba a todas las APIs

- **🔄 Refactorización de Llamadas a Prompts de Gemini (2025-11-24):**
  - **Mejora:** Todas las llamadas directas a prompts de Genkit ahora usan `executePromptWithRetry` para consistencia y beneficios automáticos.
  - **Cambios:**
    - `narrativeRouterPrompt` y `narrativeSynthesizerPrompt` en `narrative-manager.ts`
    - `reactionGenerationPrompt` en `companion-expert.ts`
    - `oocAssistantPrompt` en `ooc-assistant.ts`
  - **Beneficios:**
    - Pre-warm automático de Gemini API
    - Retries automáticos con exponential backoff
    - Logging consistente con `flowName`
    - Código más mantenible y unificado
  - **Archivos modificados:**
    - `src/ai/flows/narrative-manager.ts`
    - `src/ai/tools/companion-expert.ts`
    - `src/ai/flows/ooc-assistant.ts`
  - **Impacto:** Medio - Mejora la robustez y consistencia del sistema

- **📋 Plan de Sistema de Caché para TTS (2025-11-24):**
  - **Planificación:** Creado plan detallado para implementar sistema de caché de audio generado con Eleven Labs.
  - **Objetivos:**
    - Evitar regenerar audio para textos ya convertidos
    - Ahorro de costos (30-50% menos llamadas a API)
    - Respuesta instantánea para textos cacheados (< 100ms vs 3-6s)
    - Especialmente útil para narraciones de introducción que son siempre las mismas
  - **Diseño:**
    - Caché híbrido (memoria + disco)
    - Sistema LRU para gestión de espacio
    - Clave de caché basada en hash del texto + configuración
  - **Estado:** 📋 PLANIFICADO - Listo para implementación
  - **Relacionado con:** [Plan de Sistema de Caché TTS](../docs/planes-desarrollo/en-curso/sistema-cache-tts.md)
- **⚡ Soporte para Narraciones Pre-generadas en Aventuras JSON (2025-11-24):**
  - **Mejora:** El sistema ahora soporta narraciones introductorias pre-generadas en los archivos JSON de aventuras mediante el campo `introductoryNarration` (o alias `openingScene`).
  - **Beneficios:**
    - ✅ **Carga Instantánea:** Elimina la llamada a la IA para generar la introducción (ahorro de 3-5 segundos)
    - ✅ **Calidad Consistente:** Permite curar y perfeccionar la introducción de cada aventura
    - ✅ **Fallback Inteligente:** Si el JSON no incluye introducción, el sistema genera una con IA automáticamente
  - **Implementación:**
    1. Actualizado `GameInitializer` para verificar primero si existe `introductoryNarration` o `openingScene` en el JSON
    2. Si existe, usa el texto directamente sin llamar a `processPlayerAction`
    3. Si no existe, mantiene el comportamiento anterior (generación con IA)
    4. Añadida introducción narrativa a "El Dragón del Pico Agujahelada" como ejemplo
  - **Esquema JSON:** Añadidos campos `introductoryNarration`, `openingScene`, `narrativeScenes` al `AdventureDataSchema`
  - **Archivos modificados:**
    - `src/lib/adventure-loader/game-initializer.ts` - Lógica de selección intro pre-generada vs IA
    - `src/lib/schemas.ts` - Actualizado `AdventureDataSchema` con nuevos campos
    - `JSON_adventures/adventure.schema.json` - Esquema JSON formal
    - `JSON_adventures/el-dragon-del-pico-agujahelada.json` - Añadida introducción
  - **Impacto:** Alto - Mejora drástica del tiempo de carga y calidad narrativa
  - **Relacionado con:** Plan "Definición de Estructura Base para Aventuras JSON"

- **✨ Sistema de Modificadores de Skills Pre-calculados (2025-11-24):**
  - **Mejora:** Los modificadores de habilidades ahora se calculan y almacenan directamente en las fichas de personajes.
  - **Implementación:**
    1. Añadido campo `modifier: number` al schema de skills en `CharacterSchema`
    2. Calculados modificadores para todos los personajes: `modificador_atributo + (proficient ? proficiencyBonus : 0)`
    3. Actualizada UI para mostrar modificadores junto a cada skill
  - **Beneficios:**
    - ✅ **Fuente única de verdad:** Valores en los datos del personaje, no en lógica de UI
    - ✅ **Consistencia:** Todos los componentes ven los mismos valores
    - ✅ **Rendimiento:** Cálculo una vez al crear/cargar personaje
    - ✅ **Disponible para IA:** Modificadores accesibles cuando la IA los necesite
  - **Archivos modificados:**
    - `src/lib/schemas.ts` - Añadido campo `modifier` a skills
    - `src/lib/new-game-data.ts` - Calculados modificadores para Galador, Merryl y Elara
    - `src/components/game/character-sheet.tsx` - Mostrar modificadores en UI
  - **Impacto:** Medio - Mejora la arquitectura y facilita futuras funcionalidades

### Changed
- **⚡ Optimización de Sistema de Reintentos y Conexiones (2025-11-24):**
  - **Mejora:** Optimización del sistema de reintentos y manejo de conexiones para todas las APIs externas.
  - **Cambios:**
    - Timeout aumentado de 30s a 60s en API route de Eleven Labs
    - Delay inicial de reintentos reducido de 1000ms a 500ms
    - Integración de función de retry estándar del proyecto (`retryWithExponentialBackoff`) en Eleven Labs TTS
    - Pre-warm de conexiones implementado para Eleven Labs, D&D API y Gemini API
  - **Beneficios:**
    - Reducción de tiempo de respuesta cuando hay errores de conexión
    - Menos reintentos necesarios gracias al pre-warm
    - Código más consistente usando funciones estándar del proyecto
  - **Archivos modificados:**
    - `src/lib/tts/eleven-labs-client.ts` - Usa `retryWithExponentialBackoff` estándar
    - `src/app/api/generate-audio/route.ts` - Timeout aumentado, pre-warm agregado
    - `src/lib/dnd-api-client.ts` - Pre-warm con caché
    - `src/ai/flows/retry-utils.ts` - Función genérica de pre-warm
  - **Impacto:** Medio - Mejora la velocidad y robustez del sistema

- **🎨 Mejoras de Compactación de UI - Panel Derecho (2025-11-24):**
  - **Objetivo:** Hacer la interfaz más compacta y eficiente en el uso del espacio vertical.
  - **Cambios implementados:**
    1. **Panel Derecho Colapsable:**
       - Reemplazado `ResizablePanelGroup` con layout flex colapsable
       - Añadido estado `isPartyPanelCollapsed` para controlar visibilidad de `PartyPanel`
       - Botones de colapso/expansión con iconos `ChevronUp`/`ChevronDown`
       - Cuando colapsado, `CharacterSheet` ocupa toda la altura
    2. **PartyPanel Compacto:**
       - Reducido padding de header, tamaño de iconos y títulos
       - Cards de personajes más compactos (padding, spacing, elementos reducidos)
       - HP bar y texto más pequeños
    3. **CharacterSheet Compacto:**
       - Reducido padding y spacing general
       - Headers, ability scores y list items más compactos
       - **Skills en Grid 2 Columnas:** Competencias ahora en layout de 2 columnas
       - **Badges Pequeños:** Texto `[9px]`, altura `h-4`, "Comp." abreviado
       - **Skills Competentes en Negrita:** Nombres de skills competentes resaltados
       - **Orden Mejorado:** Badge "Comp." antes del modificador
       - **Inventario/Conjuros:** Spacing reducido, descripciones limitadas a 2 líneas
  - **Beneficios:**
    - ✅ Mejor uso del espacio vertical
    - ✅ Menos scroll necesario
    - ✅ Información más densa pero legible
    - ✅ Skills competentes fácilmente identificables
  - **Archivos modificados:**
    - `src/components/game/game-view.tsx` - Layout colapsable del panel derecho
    - `src/components/game/party-panel.tsx` - Diseño compacto
    - `src/components/game/character-sheet.tsx` - Diseño compacto y grid de skills

### Removed
- **🗑️ Eliminado Botón de Dados del Chat (2025-11-24):**
  - **Razón:** El botón de dados no se estaba utilizando y ocupaba espacio innecesario.
  - **Cambios:**
    - Eliminado componente `DiceRoller` del `PlayerInput`
    - Eliminado prop `onDiceRoll` de `ChatPanel` y `PlayerInput`
    - Eliminado estado `isDicePopoverOpen`
    - Eliminados imports relacionados
  - **Beneficios:**
    - ✅ Interfaz más limpia y enfocada
    - ✅ Menos complejidad en el código
    - ✅ Input de texto más amplio
  - **Archivos modificados:**
    - `src/components/game/player-input.tsx` - Eliminado DiceRoller
    - `src/components/game/chat-panel.tsx` - Eliminado prop onDiceRoll

### Fixed
- **✅ Formato de Mensaje de Introducción Pre-generada (2025-11-24):**
  - **Problema:** Al usar introducción pre-generada del JSON, el mensaje del DM aparecía vacío en la interfaz.
  - **Causa:** El mensaje se creaba con campos `text` y `timestamp: number`, pero la interfaz `GameMessage` espera `content` y `timestamp: string (ISO)`.
  - **Solución:** Corregido el formato del mensaje en `GameInitializer` para usar `content` en lugar de `text` y `new Date().toISOString()` para el timestamp.
  - **Archivos modificados:**
    - `src/lib/adventure-loader/game-initializer.ts` - Corregido formato de mensaje
  - **Impacto:** Crítico - Sin este fix, la funcionalidad de introducción pre-generada no era visible para el usuario

---

## [0.5.7] - 2025-01-23

### Fixed
- **✅ Mensaje de Inconsciencia en Panel de Tiradas (2025-01-23):**
  - **Problema:** Cuando un enemigo dejaba inconsciente a un compañero, no aparecía ningún mensaje en el panel de tiradas, aunque el sistema sí mostraba mensajes de muerte cuando un objetivo era eliminado.
  - **Causa:** El campo `targetKnockedOut` se establecía en `combatResult` pero no se pasaba al objeto `DiceRoll`, y el componente de visualización no tenía lógica para mostrar mensajes de inconsciencia.
  - **Solución implementada:**
    1. Añadido campo `targetKnockedOut?: boolean` a la interfaz `DiceRoll` en `types.ts`
    2. Establecido `roll.targetKnockedOut = damageResult.isUnconscious && !damageResult.isDead` en `action-executor.ts` cuando se procesa el daño
    3. Añadido mensaje visual en `dice-roll-result.tsx` que muestra "¡{roller} ha dejado inconsciente a {targetName}!" en color naranja cuando `targetKnockedOut` es `true`
  - **Lógica de Muerte Masiva:**
    - En caso de muerte masiva (`isDead = true`), `targetKnockedOut` es `false` (porque `!isDead` es `false`)
    - Solo se muestra el mensaje de muerte (rojo), no el de inconsciencia (naranja)
    - En caso de inconsciencia normal (`isDead = false`), `targetKnockedOut` es `true`
    - Solo se muestra el mensaje de inconsciencia (naranja), no el de muerte
  - **Beneficios:**
    - ✅ Feedback visual claro cuando un compañero queda inconsciente
    - ✅ Distinción visual entre muerte (rojo) e inconsciencia (naranja)
    - ✅ Comportamiento correcto en caso de muerte masiva (solo muestra muerte)
  - **Archivos modificados:**
    - `src/lib/types.ts` - Añadido campo `targetKnockedOut` a `DiceRoll`
    - `src/lib/combat/action-executor.ts` - Establecido `roll.targetKnockedOut` al procesar daño
    - `src/components/game/dice-roll-result.tsx` - Añadido mensaje visual de inconsciencia
  - **Impacto:** Medio - Mejora la claridad visual y el feedback al jugador sobre el estado de los compañeros
- **✅ Mejora del Matching de Armas y Localización de Nombres en Panel de Tiradas (2025-01-23):**
  - **Problema:** El sistema no encontraba correctamente las acciones de enemigos cuando el nombre del arma estaba en español (ej: "cimitarra") y la acción de la API estaba en inglés ("Scimitar"). Además, el panel de tiradas mostraba nombres de armas en inglés en lugar de español.
  - **Causa:** 
    1. El matching entre `weaponQuery` (español) y `action.name` (inglés) no normalizaba correctamente ambos lados
    2. Faltaba la traducción "cimitarra" → "scimitar" en el mapeo de traducciones
    3. La descripción de las tiradas usaba `action.name` (inglés) en lugar del `weaponQuery` original (español)
  - **Solución implementada:**
    1. **Matching mejorado:** Implementado matching bidireccional por palabras que normaliza tanto el `weaponQuery` como el `action.name` antes de comparar, permitiendo coincidencias parciales (ej: "cimitarra" → "scimitar" → coincide con "Scimitar Attack")
    2. **Mapeo de traducciones:** Añadido "cimitarra" → "scimitar" al `SPANISH_TO_ENGLISH_MAP` en `dnd-api-client.ts`
    3. **Localización de descripciones:** Modificado `resolveEnemyAttack()` para usar el `weaponQuery` original (español) en las descripciones de tiradas en lugar de `action.name` (inglés)
    4. **Extracción mejorada:** Mejorada la extracción del nombre del arma en `turn-processor.ts` para manejar casos como "Ataque con Cimitarra a X"
  - **Beneficios:**
    - ✅ Matching robusto: Encuentra acciones correctamente independientemente del idioma
    - ✅ Localización consistente: El panel de tiradas muestra nombres de armas en español
    - ✅ Mejor UX: Los jugadores ven "Cimitarra" en lugar de "Scimitar"
    - ✅ Corrección de atributos: Los enemigos con armas finesse ahora usan el atributo correcto (DES en lugar de FUE)
  - **Archivos modificados:**
    - `src/lib/dnd-api-client.ts` - Añadido "cimitarra" → "scimitar" al mapeo de traducciones
    - `src/lib/combat/action-resolver.ts` - Mejorado matching bidireccional por palabras, uso de `weaponQuery` original para descripciones
    - `src/lib/combat/turn-processor.ts` - Mejorada extracción del nombre del arma de `actionDescription`
  - **Impacto:** Medio - Corrige bugs de matching y mejora la experiencia de usuario con localización consistente
- **✅ Selección de Arma Principal por Defecto (2025-01-23):**
  - **Problema:** Cuando el jugador atacaba sin especificar arma (ej: "ataco a goblin1"), el sistema seleccionaba incorrectamente el arco en lugar del mandoble como arma principal.
  - **Causa:** La lógica de búsqueda por palabras clave encontraba "arco" antes que "espada" en el inventario, ya que "Mandoble" no contiene la palabra "espada" en su nombre.
  - **Solución implementada:**
    1. **Prioridad al array attacks:** Cuando `weaponQuery === 'ataque'`, el sistema ahora usa el primer arma del array `player.attacks` (que representa el arma principal del personaje)
    2. **Búsqueda inteligente:** Busca el arma en el inventario usando el nombre del `attacks[0]` con matching flexible
    3. **Fallback mejorado:** Si no hay `attacks` o no se encuentra match, usa búsqueda por palabras clave priorizando armas cuerpo a cuerpo sobre armas a distancia
  - **Beneficios:**
    - ✅ Usa el arma principal correcta (Mandoble) cuando no se especifica arma
    - ✅ Respeta el orden definido en el array `attacks` del personaje
    - ✅ Fallback robusto si no hay array `attacks`
  - **Archivos modificados:**
    - `src/lib/combat/action-resolver.ts` - Lógica mejorada para selección de arma por defecto
  - **Impacto:** Medio - Mejora la experiencia de usuario al usar el arma correcta por defecto

### Changed
- **✅ Unificación de APIs D&D (Issue #125) (2025-01-23):**
  - **Problema:** Múltiples módulos hacían llamadas directas a la API de D&D con lógica duplicada de retry, caché y normalización de nombres. La primera llamada siempre fallaba, causando uso de stats por defecto.
  - **Solución implementada:** Cliente unificado `dnd-api-client.ts` que centraliza:
    1. **Retry logic:** Reintentos automáticos con backoff exponencial para errores transitorios
    2. **Caché global:** Caché compartida para evitar llamadas redundantes
    3. **Normalización de nombres:** Traducción español→inglés y normalización de acentos
    4. **Manejo de errores:** Distinción entre errores retryables (5xx, timeouts) y no retryables (404)
  - **Beneficios:**
    - ✅ Eliminación de código duplicado
    - ✅ Mayor robustez ante fallos temporales de red
    - ✅ Mejor rendimiento con caché compartida
    - ✅ Consistencia en el manejo de nombres español/inglés
  - **Archivos modificados:**
    - `src/lib/dnd-api-client.ts` - **NUEVO** - Cliente unificado de APIs D&D
    - `src/lib/combat/monster-stats-parser.ts` - Refactorizado para usar cliente unificado
    - `src/ai/tools/dnd-api-lookup.ts` - Refactorizado para usar cliente unificado
    - `src/lib/combat/action-resolver.ts` - Usa `normalizeQuery` del cliente unificado
  - **Impacto:** Alto - Mejora significativa de la arquitectura y robustez del sistema
- **✅ Sistema de Retries para Consulta de Stats de Enemigos (Issues #29 y #124) (2025-01-23):**
  - **Problema:** La función `getMonsterStatsFromDndApi` hacía un único intento de fetch a la API de D&D. Los fallos en la primera llamada eran comunes (posiblemente por latencia de red o cold start de la API), causando que el sistema usara stats por defecto (HP=10, AC=10) cuando podría obtener los reales con un reintento.
  - **Impacto:** Muy Alto - Afectaba la fiabilidad del sistema de combate, causaba que enemigos tuvieran stats incorrectos (Issue #29), y reducía la calidad de la experiencia de juego.
  - **Solución implementada:**
    - Envuelto el fetch de la API de D&D en `retryWithExponentialBackoff` con 3 reintentos (4 intentos totales)
    - Configurado backoff exponencial (1s, 2s, 4s)
    - Implementada lógica para distinguir errores retryables (5xx, timeouts, errores de red) de no retryables (404)
    - El sistema de caché solo cachea fallos después de agotar todos los reintentos (excepto 404 que se cachea inmediatamente)
  - **Archivos modificados:**
    - `src/lib/combat/monster-stats-parser.ts` - Añadido import de `retryWithExponentialBackoff` y envuelto el fetch en retry logic
  - **Beneficios:**
    - ✅ Mejora significativamente la fiabilidad del sistema de combate
    - ✅ Reduce el uso de stats por defecto incorrectos
    - ✅ Mejora la precisión de los stats de enemigos (resuelve Issue #29)
    - ✅ Mejora la calidad de la experiencia de juego
- **✅ Sistema Data-Driven para Detección de Propiedades de Armas (2025-01-23):**
  - **Problema:** El sistema usaba listas hardcodeadas de nombres de armas para detectar propiedades (finesse, ranged), causando inconsistencias. Por ejemplo, los Goblins con cimitarras usaban FUE(-1) en lugar de DES(+2) porque la cimitarra no estaba en la lista de finesse para enemigos.
  - **Causa:** La lógica de detección estaba duplicada entre `resolvePlayerAttack` y `resolveEnemyAttack`, y solo usaba heurísticas de nombres como último recurso, sin priorizar datos estructurados.
  - **Solución implementada:** Sistema data-driven con prioridad de fuentes:
    1. **Datos estructurados (Prioridad 1):** Lee `attacks[].properties` explícitas (ej: `['Finesse', 'Light']`)
    2. **Análisis de texto (Prioridad 2):** Parsea descripciones buscando palabras clave ("Sutil", "Finesse", "Alcance", "Ranged Weapon Attack")
    3. **Heurística de nombres (Prioridad 3 - Fallback):** Solo si lo anterior falla, usa lista de nombres como red de seguridad
  - **Funciones helper comunes:**
    - `getWeaponProperties()`: Extrae propiedades de armas usando las 3 fuentes de datos
    - `determineWeaponAttribute()`: Determina qué atributo usar (FUE/DES) basándose en propiedades detectadas
    - Ambas funciones son comunes para jugadores, compañeros y enemigos
  - **Beneficios:**
    - ✅ Consistencia: Misma lógica para todos los combatientes
    - ✅ Robustez: Prioriza datos reales sobre heurísticas
    - ✅ Mantenibilidad: Un solo lugar para actualizar la lógica
    - ✅ Corrección: Goblins con cimitarras ahora usan DES correctamente
  - **Archivos modificados:**
    - `src/lib/combat/action-resolver.ts` - Añadidas funciones helper comunes `getWeaponProperties()` y `determineWeaponAttribute()`
    - `src/lib/combat/action-resolver.ts` - Actualizado `resolvePlayerAttack()` para usar sistema data-driven
    - `src/lib/combat/action-resolver.ts` - Actualizado `resolveEnemyAttack()` para usar sistema data-driven
  - **Impacto:** Medio - Corrige cálculos incorrectos de atributos para armas finesse en enemigos y mejora la arquitectura del sistema

---

## [0.5.6] - 2025-01-23

### Changed
- **✅ Sistema de Tiradas Robusto y Unificado (2025-01-22):**
  - **Problema:** Existía una discrepancia entre la lógica de tiradas de la IA y del Jugador. La IA generaba tiradas de dados (`rollNotation`) que podían no coincidir con las estadísticas reales del personaje/enemigo, causando inconsistencias visuales (ej: desglose que suma 3 cuando el total suma 5).
  - **Solución implementada:**
    - Arquitectura "Intención vs. Resolución": La IA solo provee la intención de atacar, el sistema calcula las tiradas usando las estadísticas reales
    - Clase `CombatActionResolver` creada para centralizar el cálculo de tiradas
    - Tacticians (`EnemyTactician` y `CompanionTactician`) simplificados para devolver intenciones de alto nivel
    - `TurnProcessor` integrado para usar `CombatActionResolver` en turnos de IA
  - **Cambios:**
    - Nueva clase `CombatActionResolver` en `src/lib/combat/action-resolver.ts` con método `resolveAttack()`
    - Método `resolveAttack()` calcula tiradas para jugadores y enemigos usando estadísticas reales
    - Sistema de fallback robusto: si no encuentra acción específica, calcula tirada básica usando stats del enemigo
    - `TurnProcessor` intercepta intenciones de ataque de IA y calcula tiradas correctas (líneas 358-380)
    - Prompts de `EnemyTactician` y `CompanionTactician` modificados para devolver arrays vacíos `[]` para ataques estándar
    - La IA ya no genera `rollNotation` para ataques, solo provee `actionDescription` y `targetId`
  - **Beneficios:**
    - ✅ Consistencia total: Jugadores y enemigos siguen las mismas reglas matemáticas
    - ✅ Visualización perfecta: El desglose visual siempre coincide con el cálculo matemático
    - ✅ Menor coste de tokens: Prompts más simples y respuestas JSON más pequeñas
    - ✅ Robustez: Si la IA alucina, el sistema corrige usando las reglas reales
    - ✅ Eliminación de la "doble verdad": Una sola fuente de verdad (las estadísticas del sistema)
  - **Archivos modificados:**
    - `src/lib/combat/action-resolver.ts` - **NUEVO** - Clase `CombatActionResolver` con lógica centralizada
    - `src/lib/combat/turn-processor.ts` - Integración de `CombatActionResolver` para turnos de IA
    - `src/ai/tools/enemy-tactician.ts` - Prompt modificado para devolver intenciones en lugar de tiradas
    - `src/ai/tools/companion-tactician.ts` - Prompt modificado para devolver intenciones en lugar de tiradas
    - `src/lib/combat/initialization/types.ts` - `EnemyWithStats` con estructura de datos completa
  - **Referencia:** [Plan Detallado](../../docs/planes-desarrollo/completados/plan-sistema-tiradas-robusto.md)

### Fixed
- **✅ Issue #120 - Inconsistencias en Cálculos de Tiradas y Visualización (2025-11-23):**
  - **Problema:** Dos bugs críticos que interactuaban causando cálculos incorrectos y feedback visual engañoso:
    1. **Visualización engañosa:** `updateRollNotationWithModifiers` seleccionaba automáticamente el modificador más alto (DES +3) para el desglose visual, incluso si el ataque se calculó usando otro atributo (FUE -1)
    2. **Cálculo erróneo:** `CombatActionResolver` generaba notaciones inválidas para modificadores negativos (`1d8+-1`), y el parser de `diceRollerTool` fallaba al parsearlas, tratando el modificador como 0
  - **Solución implementada:** Arquitectura "Cerebro Centralizado, Frontend Obediente"
    - **Backend como fuente de verdad:**
      - `CombatActionResolver.getAttackAbility()`: Determina qué atributo usar (FUE/DES) basándose en propiedades del arma (Melee, Ranged, Finesse)
      - `CombatActionResolver.formatDiceNotation()`: Formatea correctamente modificadores negativos (`1d8-1` en lugar de `1d8+-1`)
      - Campo `attributeUsed` inyectado en toda la cadena de resolución (DiceRollRequest → diceRollerTool → DiceRoll)
    - **Parser robusto:** Regex mejorada en `diceRollerTool` para manejar espacios opcionales y signos negativos
    - **Frontend obediente:** `updateRollNotationWithModifiers` usa `attributeUsed` explícitamente en lugar de adivinar
    - **Notación con etiquetas:** Las tiradas ahora muestran etiquetas de modificadores (`1d20+FUE+BC`) en lugar de valores numéricos (`1d20+1`)
  - **Beneficios:**
    - ✅ Cálculos correctos: Modificadores negativos se aplican correctamente (ej: 7-1=6, no 7+0=7)
    - ✅ Visualización fiel: El desglose muestra el atributo realmente usado (FUE -1, no DES +3)
    - ✅ Notación educativa: `1d20+FUE+BC` es más descriptivo que `1d20+1`
    - ✅ Arquitectura robusta: Backend decide, frontend muestra
  - **Archivos modificados:**
    - `src/lib/types.ts` - Añadido `attributeUsed` a `DiceRoll`
    - `src/lib/combat/action-resolver.ts` - Añadido `attributeUsed` a `DiceRollRequest`, implementados helpers `getAttackAbility` y `formatDiceNotation`
    - `src/ai/tools/dice-roller.ts` - Añadido `attributeUsed` a schemas, mejorada regex de parsing
    - `src/lib/combat/roll-notation-utils.ts` - Usa `attributeUsed` para notación determinista con etiquetas
    - `src/lib/combat/action-executor.ts` - Añadido `attributeUsed` a `DiceRollRequest`, preserva `rollNotation` actualizado
  - **Impacto:** Crítico - Corrige cálculos matemáticos incorrectos y feedback visual engañoso
  - **Referencia:** [Issue #120](../../docs/tracking/issues/pendientes.md#issue-120-inconsistencia-en-cálculos-de-tiradas-y-visualización-merryl--crítico) | [Plan Completado](../../docs/planes-desarrollo/completados/issue-120-fix-dice-rolls.md)

- **✅ Issue #122 - Nombres de Enemigos sin Número Distintivo en Panel de Tiradas (2025-11-23):**
  - **Problema:** Tras implementar el Issue #120, los nombres de enemigos en el panel de tiradas perdieron el número distintivo (mostraban "Goblin" en lugar de "Goblin 1")
  - **Causa:** Durante la refactorización, `CombatActionResolver` usaba `enemy.name` (nombre base) en lugar del nombre visual con número
  - **Solución implementada:**
    - Añadido parámetro opcional `rollerName` a `CombatActionResolver.resolveAttack()`
    - `resolveEnemyAttack()` ahora usa `rollerName || enemy.name` para el campo `roller` en todos los `DiceRollRequest`
    - `TurnProcessor` pasa `combatant.characterName` (que incluye el número) como `rollerName` para enemigos de IA
  - **Beneficios:**
    - ✅ Nombres de enemigos con número distintivo restaurados (ej: "Goblin 1", "Goblin 2")
    - ✅ Mejor claridad visual en combates con múltiples enemigos del mismo tipo
    - ✅ Solución simple y no invasiva (parámetro opcional)
  - **Archivos modificados:**
    - `src/lib/combat/action-resolver.ts` - Añadido parámetro `rollerName` opcional
    - `src/lib/combat/turn-processor.ts` - Pasa `combatant.characterName` como `rollerName`
  - **Impacto:** Medio - Mejora claridad visual en combates
  - **Referencia:** [Issue #122](../../docs/tracking/issues/pendientes.md#issue-122-nombres-de-enemigos-sin-número-distintivo-en-panel-de-tiradas-)

- **✅ Issue #121 - Regresión en Parsing de Armas en Ataques de Jugador (2025-01-23):**
  - **Problema:** Tras implementar el Issue #120, se introdujo una regresión crítica que bloqueaba completamente los ataques de jugadores. El sistema pasaba toda la acción del jugador (ej: "Ataco al goblin 1") como `weaponQuery` a `CombatActionResolver.resolveAttack()`, en lugar de extraer solo el nombre del arma.
  - **Causa:** Durante la refactorización del Issue #120, se perdió la lógica que extraía el nombre del arma de la acción del jugador.
  - **Solución implementada:**
    - Función `extractWeaponName()` creada para parsear nombres de armas desde acciones de jugador usando patrones regex
    - Soporte para caracteres acentuados en español (á, é, í, ó, ú, ñ, ü)
    - Integrada en `TurnProcessor` para determinar `weaponQuery` antes de llamar a `CombatActionResolver`
    - Fallback seguro a `'ataque'` cuando no se menciona arma específica
  - **Mejoras adicionales implementadas:**
    1. **Fix Atributo Usado para Armas a Distancia:**
       - Añadido `attributeUsed` a `DiceRollRequest` y establecido correctamente según tipo de arma
       - Armas a distancia (arcos, ballestas) ahora usan DES correctamente
       - Armas melee usan FUE (o el mayor entre FUE/DES para finesse)
       - Frontend "obediente" que lanza error si no recibe `attributeUsed` (mantiene arquitectura del Issue #120)
    2. **Mostrar Tipo de Ataque (Melee/Ranged) en Panel de Tiradas:**
       - Añadido `attackRange` a `DiceRoll` y `DiceRollRequest`
       - Indicador visual en panel de tiradas: "🏹 A distancia" o "⚔️ Cuerpo a cuerpo"
       - Mejora la claridad visual y comprensión rápida del tipo de ataque
    3. **Unificar Notación de Tiradas de Daño:**
       - Las tiradas de daño ahora siempre muestran el atributo usado (ej: "1d6+DES", "1d6+FUE")
       - Comportamiento unificado para jugadores, compañeros y enemigos
       - El desglose muestra correctamente el modificador 0 (ej: "1+0" en lugar de solo "1")
  - **Beneficios:**
    - ✅ Funcionalidad de combate para jugadores restaurada completamente
    - ✅ Parsing robusto de nombres de armas con soporte para español
    - ✅ Atributos correctos según reglas D&D 5e (DES para ranged, FUE para melee)
    - ✅ Arquitectura mejorada: Frontend "obediente" que no adivina atributos
    - ✅ Visualización mejorada: Tipo de ataque visible en panel de tiradas
    - ✅ Notación unificada: Todos los combatantes muestran atributos de forma consistente
  - **Archivos modificados:**
    - `src/lib/combat/turn-processor.ts` - Función `extractWeaponName()` e integración
    - `src/lib/combat/action-resolver.ts` - Añadido `attributeUsed` y `attackRange` a `DiceRollRequest`
    - `src/lib/combat/roll-notation-utils.ts` - Eliminada lógica legacy, siempre mostrar atributo usado
    - `src/lib/types.ts` - Añadido `attackRange` a `DiceRoll`
    - `src/lib/combat/action-executor.ts` - Preservar `attackRange` al crear `DiceRoll`
    - `src/components/game/dice-roll-result.tsx` - Mostrar indicador visual de tipo de ataque
  - **Tests implementados:**
    - `tests/unit/combat/extract-weapon-name.test.ts` (24 tests unitarios)
    - `tests/unit/combat/turn-processor.test.ts` (5 tests de integración adicionales)
  - **Impacto:** Crítico - Restaura funcionalidad de combate para jugadores y mejora significativamente la arquitectura del sistema
  - **Referencia:** [Issue #121](../../docs/tracking/issues/corregidos.md#issue-121-regresión-en-parsing-de-armas-en-ataques-de-jugador--crítico) | [Plan Completado](../../docs/planes-desarrollo/completados/issue-121-fix-weapon-parsing.md)

### Fixed
- **✅ Issue #118 - Narración de inicio de combate mejorada (2025-01-22):**
  - **Problema:** La narración de inicio de combate mencionaba nombres de enemigos incorrectos (ej: "gnomos" cuando debería decir "goblins") y usaba nombres técnicos como "Goblin 1, Goblin 2" en lugar de descripciones naturales
  - **Solución:** Mejorado el prompt de `combatInitiationPrompt` para:
    - Usar exactamente los tipos de enemigos del `combatContext` (no traducir ni inventar nombres)
    - Permitir agrupación natural de enemigos ("dos goblins" en lugar de "Goblin 1 y Goblin 2")
    - Usar el historial de conversación para hacer la narración coherente con eventos recientes
  - **Cambios:**
    - Añadida sección "CRITICAL - ENEMY TYPES" con instrucciones explícitas sobre tipos de enemigos
    - Instrucciones para agrupar enemigos del mismo tipo de forma natural e inmersiva
    - Añadida instrucción para usar `conversationHistory` en la narración de inicio
  - **Beneficios:**
    - ✅ Narraciones más inmersivas y naturales ("dos goblins y un enorme orco" vs "Goblin 1, Goblin 2 y Orco 1")
    - ✅ Precisión mantenida sobre tipos de enemigos (no traduce "Goblin" a "Gnomo")
    - ✅ Coherencia narrativa con eventos recientes del chat
  - **Archivos modificados:**
    - `src/ai/flows/narrative-manager.ts` - Prompt `combatInitiationPrompt` mejorado
  - **Referencia:** [Issue #118](../../docs/tracking/issues/corregidos.md#issue-118-narración-de-inicio-de-combate-menciona-enemigos-incorrectos--resuelto)

### Changed
- **✅ Estandarización de Niveles de Logging (2025-01-22):**
  - **Problema:** Existían inconsistencias sistemáticas en los niveles de logging: mensajes DEBUG contenían "WARNING", mensajes INFO contenían "DEBUG", etc.
  - **Solución implementada:**
    - Creada guía de estilo completa sobre cuándo usar cada nivel de log (DEBUG, INFO, WARN, ERROR)
    - Añadida validación automática en el logger para detectar inconsistencias futuras
    - Corregidas 7 inconsistencias detectadas en el código
  - **Cambios:**
    - Nueva guía: `docs/arquitectura/guia-estilo-logging.md`
    - Validación automática en `src/lib/logger.ts` que detecta palabras clave inconsistentes
    - Correcciones en múltiples archivos:
      - `src/lib/combat/action-executor.ts` - Mensaje DEBUG con "Critical" corregido
      - `src/ai/tools/dnd-api-lookup.ts` - Mensaje WARN con "error" corregido
      - `src/lib/combat/turn-processor.ts` - Mensaje WARN mejorado para clarificar fallback
      - `src/ai/flows/action-interpreter.ts` - Eliminada redundancia "CRITICAL" en mensajes ERROR
      - `src/ai/flows/narrative-manager.ts` - Mejorados mensajes de error con contexto estructurado
      - `src/components/game/game-view.tsx` - Eliminado prefijo "[DEBUG]" de mensajes INFO
  - **Beneficios:**
    - ✅ Logs más consistentes y legibles
    - ✅ Validación automática detecta futuras inconsistencias en desarrollo
    - ✅ Facilita depuración y mantenimiento
    - ✅ Los filtros de log funcionan correctamente
  - **Archivos modificados:**
    - `src/lib/logger.ts` - Añadida validación automática de niveles de log
    - `docs/arquitectura/guia-estilo-logging.md` - Nueva guía de estilo
    - `docs/arquitectura/sistema-logging.md` - Actualizado con referencia a guía de estilo
    - `docs/roadmap.md` - Marcado como completado
```
    - `docs/planes-desarrollo/plan-maestro.md` - Actualizado estado
    - Múltiples archivos corregidos (ver lista arriba)
  - **Referencia:** [Roadmap - Estandarización de Niveles de Logging](../../docs/roadmap.md#0-estandarización-de-niveles-de-logging--completado)

---

## [0.5.51] - 2025-11-22

### Fixed
- **✅ Corrección: Enemigos muertos no se mantienen en estado después del combate (2025-11-21):**
  - **Problema:** Al terminar el combate, el sistema vaciaba completamente el array de enemigos, causando que el DM describiera enemigos muertos como vivos cuando el jugador exploraba la ubicación después del combate
  - **Solución:** Modificado `CombatSession` para mantener los enemigos derrotados (con `hp.current = 0`) en el estado después del combate
  - **Beneficios:**
    - ✅ El filtro existente en `game-coordinator.ts` puede identificar correctamente enemigos muertos
    - ✅ El DM no describe enemigos muertos como vivos
    - ✅ El estado persiste entre sesiones (se guarda en el archivo de partida)
  - **Archivos modificados:**
    - `src/lib/combat/combat-session.ts` - Eliminada línea que vaciaba array de enemigos al terminar combate
  - **Nota:** Esta fue una solución temporal. Ver entrada en `### Changed` sobre `enemiesByLocation` (2025-11-22) para la solución arquitectónica completa

- **✅ Mejora: Consistencia en narración de inicio de combate (2025-11-21):**
  - **Problema:** La narración de inicio de combate a veces mencionaba tipos de criaturas incorrectos (ej: orcos o gnomos cuando se enfrentaban goblins), causando inconsistencias narrativas
  - **Solución:** Mejorado el prompt de `combatInitiationPrompt` en `narrative-manager.ts` para ser más explícito sobre usar los nombres exactos de enemigos del `combatContext`
  - **Cambios:**
    - Eliminado ejemplo confuso que mencionaba "Orco 1"
    - Añadida instrucción explícita para identificar enemigos usando SOLO los nombres del contexto
    - Añadida instrucción crítica para NO inventar tipos de enemigos
    - Instrucciones simplificadas y más directas
  - **Beneficios:**
    - ✅ Narración consistente con los enemigos reales presentes
    - ✅ El DM menciona correctamente los tipos de criaturas (goblins, bandits, etc.)
    - ✅ Mejor coherencia narrativa al inicio del combate
  - **Archivos modificados:**
    - `src/ai/flows/narrative-manager.ts` - Mejorado prompt `combatInitiationPrompt`

- **✅ Corrección: Compañeros de IA mueren en lugar de quedar inconscientes a 0 HP (2025-11-22):**
  - **Problema:** Los compañeros de IA con `controlledBy === 'AI'` morían automáticamente al llegar a 0 HP, incluso con daño menor que su HP máximo. Esto violaba las reglas de D&D 5e donde los aliados deberían quedar inconscientes a menos que sea daño masivo
  - **Solución:** Añadido parámetro `isEnemy: boolean` a la función `applyDamage()` en `rules-engine.ts` para distinguir entre enemigos (que mueren a 0 HP) y aliados/party members (que quedan inconscientes a 0 HP)
  - **Cambios:**
    - `applyDamage()` ahora acepta `isEnemy` como tercer parámetro (por defecto `false`)
    - Lógica actualizada: enemigos mueren a 0 HP; aliados quedan inconscientes a menos que sea daño masivo (daño restante ≥ HP máximo)
    - `action-executor.ts` actualizado para pasar `targetIsEnemy` al llamar `applyDamage()`
    - Tests actualizados para reflejar el nuevo comportamiento
  - **Beneficios:**
    - ✅ Comportamiento correcto según reglas de D&D 5e
    - ✅ Compañeros de IA pueden ser curados/estabilizados después de caer inconscientes
    - ✅ Solo mueren con daño masivo o ataques específicos de remate
  - **Archivos modificados:**
    - `src/lib/combat/rules-engine.ts` - Añadido parámetro `isEnemy` a `applyDamage()`
    - `src/lib/combat/action-executor.ts` - Pasa `targetIsEnemy` a `applyDamage()`
    - `tests/unit/combat/rules-engine.test.ts` - Tests actualizados y añadido test específico para compañeros

- **✅ Corrección: ActionInterpreter no identifica objetivos específicos en combate (2025-11-22):**
  - **Problema:** Cuando el jugador atacaba a un enemigo específico en combate (ej: "Ataco al goblin 2"), el `actionInterpreter` devolvía `targetId=null` porque no tenía acceso al estado actual de los enemigos con sus IDs únicos generados dinámicamente
  - **Solución:** Añadido `updatedEnemies` al contexto del prompt de `actionInterpreter` para que el modelo tenga acceso a la lista actual de enemigos con sus nombres e IDs únicos
  - **Cambios:**
    - Schema del prompt `actionInterpreterPrompt` actualizado para incluir `updatedEnemies`
    - Prompt text actualizado con instrucciones explícitas para buscar objetivos en `updatedEnemies` primero
    - Añadido bloque de contexto "Updated Enemies (Current Combat State)" al prompt
    - `game-coordinator.ts` ya estaba pasando `currentLocationEnemies` correctamente
  - **Beneficios:**
    - ✅ El sistema identifica correctamente objetivos específicos en combate (ej: "goblin 2", "orco 1")
    - ✅ Funciona correctamente después de múltiples rondas cuando los enemigos tienen IDs únicos
    - ✅ Mejor experiencia de usuario: el jugador puede atacar a enemigos específicos sin confusión
  - **Archivos modificados:**
    - `src/ai/flows/action-interpreter.ts` - Añadido `updatedEnemies` al schema y contexto del prompt

- **✅ Corrección: Crash al cambiar de ubicación - Assignment to constant variable (2025-11-22):**
  - **Problema:** Al intentar moverse a una nueva ubicación durante el combate, el sistema lanzaba un error `TypeError: Assignment to constant variable` porque `currentLocationEnemies` estaba declarado como `const` pero se intentaba reasignar cuando cambiaba la ubicación
  - **Solución:** Cambiado `const currentLocationEnemies` a `let currentLocationEnemies` en `game-coordinator.ts` para permitir la actualización cuando el jugador cambia de ubicación
  - **Beneficios:**
    - ✅ El sistema puede actualizar correctamente la lista de enemigos al cambiar de ubicación
    - ✅ No más crashes al moverse entre habitaciones durante o después del combate
  - **Archivos modificados:**
    - `src/ai/flows/game-coordinator.ts` - Cambiado `const` a `let` para `currentLocationEnemies`

- **✅ Issue #93 - Stack traces completos en errores de API call (2025-11-21):**
  - **Problema:** Los errores de red/timeout (como `TypeError: fetch failed` con `ConnectTimeoutError`) mostraban stack traces completos muy largos en los logs, dificultando la lectura y diagnóstico
  - **Solución:** Modificado `retryWithExponentialBackoff` en `src/ai/flows/retry-utils.ts` para crear errores limpios sin stack traces completos:
    - Cuando se agotan los reintentos, se crea un nuevo error con mensaje limpio: `API call failed: [mensaje] ([código])`
    - Se usa `Error.captureStackTrace` para limitar el stack trace solo a la función `retryWithExponentialBackoff`
    - Los errores se registran con `log.error` antes de lanzarse, mostrando solo información relevante
    - Fallback para entornos sin `Error.captureStackTrace`: stack trace mínimo
  - **Resultado:** Los logs ahora muestran solo mensajes limpios como `Error: API call failed: Connect Timeout Error (UND_ERR_CONNECT_TIMEOUT)` sin stack traces de 20+ líneas
  - **Archivos modificados:**
    - `src/ai/flows/retry-utils.ts` - Manejo mejorado de errores con stack traces limitados
  - **Referencia:** [Issue #93](../../docs/tracking/issues/pendientes.md#issue-93-manejo-de-errores-cuando-se-agotan-los-reintentos-especialmente-errores-503-de-sobrecarga-🟡-advertencia)

### Changed
- **✅ Issue #117 - Simplificación de Arquitectura de Combate - Arquitectura Unificada (2025-11-21):**
  - **Problema:** El sistema de combate tenía una arquitectura excesivamente compleja con múltiples capas de delegación y duplicación de lógica. El flujo del jugador y el de la IA eran diferentes, causando inconsistencias y dificultando el mantenimiento
  - **Solución:** Arquitectura completamente unificada - Jugador e IA usan el mismo código para procesar turnos
  - **Cambios principales:**
    - **Nuevo `TurnProcessor` unificado:** Procesa turnos completos (planificación → intención → ejecución → resolución) para jugador e IA
    - **Nuevo `CombatActionExecutor` unificado:** Ejecuta cualquier acción de combate (ataque, hechizo, curación) independientemente de quién la ejecute
    - **Nuevo `roll-notation-utils.ts`:** Utilidades para notación de tiradas extraídas de módulos obsoletos
    - **`CombatInitializer` simplificado:** Solo inicializa estado, no procesa turnos
    - **`CombatSession` refactorizado:** Usa `TurnProcessor` para todos los turnos, eliminando métodos duplicados
    - **Módulos eliminados:** `action-processor.ts`, `dice-roll-processor.ts`, `first-turn-handler.ts`
  - **Beneficios:**
    - ✅ Consistencia total: Jugador e IA usan exactamente el mismo código
    - ✅ Complejidad reducida: De 8-9 niveles de profundidad a 3-4 niveles
    - ✅ Duplicación eliminada: Lógica unificada en módulos centralizados
    - ✅ Mantenibilidad mejorada: Menos archivos, menos duplicación, más fácil de depurar
    - ✅ Menos bugs: Un solo lugar para corregir problemas
  - **Archivos modificados:**
    - `src/lib/combat/turn-processor.ts` - Nuevo módulo unificado
    - `src/lib/combat/action-executor.ts` - Nuevo módulo unificado
    - `src/lib/combat/roll-notation-utils.ts` - Nuevo módulo de utilidades
    - `src/lib/combat/combat-session.ts` - Refactorizado para usar `TurnProcessor`
    - `src/lib/combat/combat-initializer.ts` - Simplificado, sin procesamiento de turnos
    - `src/ai/tools/combat-manager.ts` - Actualizado para nueva arquitectura
    - `src/lib/combat/action-processor.ts` - Eliminado (deprecated)
    - `src/ai/tools/combat/dice-roll-processor.ts` - Eliminado (deprecated)
    - `src/lib/combat/initialization/first-turn-handler.ts` - Eliminado (deprecated)
  - **Tests:**
    - `tests/unit/combat/action-executor.test.ts` - 5 tests unitarios
    - `tests/unit/combat/turn-processor.test.ts` - 6 tests unitarios
    - `tests/integration/combat/unified-combat-flow.test.ts` - 3 tests de integración
  - **Documentación:**
    - `docs/arquitectura/arquitectura-backend.md` - Actualizado con nueva arquitectura
    - `docs/arquitectura/flujo-datos.md` - Actualizado con flujo unificado
    - `docs/testing/README.md` - Actualizado con nuevos tests
  - **Referencia:** [Issue #117](../../docs/tracking/issues/corregidos.md#issue-117-simplificación-de-arquitectura-de-combate--resuelto) | [Plan Completado](../../docs/planes-desarrollo/completados/issue-117-simplificacion-arquitectura-combate.md)

- **✅ Sistema de Enemigos por Ubicación (`enemiesByLocation`) - Persistencia de Estado del Mundo (2025-11-22):**
  - **Problema:** El sistema usaba un array plano `enemies` que causaba varios problemas:
    - Enemigos muertos no se mantenían correctamente al cambiar de ubicación
    - Duplicación de IDs de enemigos en diferentes ubicaciones causaba conflictos
    - El DM mencionaba enemigos muertos como vivos al volver a una ubicación después del combate
    - No había forma de rastrear qué enemigos pertenecían a cada ubicación específica
  - **Solución:** Implementado sistema `enemiesByLocation` que asocia enemigos a sus ubicaciones específicas
  - **Cambios principales:**
    - **Nuevo esquema `enemiesByLocation`:** Estructura `Record<string, any[]>` que mapea `locationId` → array de enemigos
    - **GameCoordinator actualizado:** Obtiene enemigos de la ubicación actual desde `enemiesByLocation[locationId]`
    - **CombatSession refactorizado:** `toJSON()` ahora devuelve `enemiesByLocation` asociado a la ubicación del combate
    - **CombatManager actualizado:** Obtiene enemigos de la ubicación actual antes de iniciar combate
    - **GameView refactorizado:** Estado y refs actualizados para manejar `enemiesByLocation` en lugar de array plano
    - **Sistema de guardado:** `enemiesByLocation` se incluye en el estado guardado de la partida
    - **Compatibilidad hacia atrás:** El sistema sigue funcionando con `enemies` si `enemiesByLocation` no está presente
  - **Beneficios:**
    - ✅ Enemigos correctamente asociados a sus ubicaciones específicas
    - ✅ Cadáveres persisten al cambiar de ubicación y volver
    - ✅ Sin conflictos de IDs: enemigos con mismo ID en diferentes ubicaciones se manejan por separado
    - ✅ El DM describe correctamente el estado de los enemigos (vivos/muertos) según la ubicación
    - ✅ Base sólida para el sistema de mundo persistente futuro
  - **Archivos modificados:**
    - `src/ai/flows/schemas.ts` - Añadido `enemiesByLocation` a `GameStateSchema`, `GameCoordinatorOutputSchema` y `CombatManagerOutputSchema`
    - `src/ai/flows/game-coordinator.ts` - Actualizado para usar `enemiesByLocation[locationId]` y actualizar `currentLocationEnemies` al cambiar de ubicación
    - `src/lib/combat/combat-session.ts` - `toJSON()` devuelve `enemiesByLocation` asociado a `locationId`
    - `src/ai/tools/combat-manager.ts` - Obtiene enemigos de `enemiesByLocation[locationId]` antes de crear `CombatSession`
    - `src/components/game/game-view.tsx` - Estado `enemiesByLocation` y ref, merge correcto de actualizaciones, envía `enemiesByLocation` en acciones
    - `src/app/page.tsx` - `InitialGameData` y `SaveGameDataSchema` actualizados para incluir `enemiesByLocation`
  - **Nota:** Esta implementación mejora significativamente la corrección anterior (2025-11-21) sobre enemigos muertos, proporcionando una solución arquitectónica completa en lugar de una solución temporal

- **✅ Issue #94 - Refactorización de Prompts de Tacticians - Narración Centralizada (2025-11-21):**
  - **Problema:** Los tacticians (`enemyTacticianTool` y `companionTacticianTool`) generaban tanto la decisión táctica como la narración, creando prompts complejos, inconsistencias narrativas y dificultando el mantenimiento
  - **Solución:** Separación completa de responsabilidades - Tacticians solo deciden táctica, `combatNarrationExpertTool` genera todas las narraciones
  - **Cambios principales:**
    - **Tacticians simplificados:** Eliminado campo `narration`, ahora solo generan `targetId`, `diceRolls` y `actionDescription`
    - **Narración centralizada:** `combatNarrationExpertTool` genera narraciones completas (preparación + ejecución + resultado) en un solo mensaje
    - **Schema simplificado:** Eliminado `narrationType` (intention/resolution), ahora solo narraciones completas
    - **Flujo simplificado:** Un solo mensaje narrativo por turno de IA, más limpio y fluido
    - **Bug corregido:** Añadido `combatNarrationExpertTool` al `CombatInitContext` para que esté disponible desde el primer turno
  - **Beneficios:**
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
    - `src/lib/combat/initialization/first-turn-handler.ts` - Eliminado (deprecated en Issue #117)
    - `src/ai/tools/combat/dice-roll-processor.ts` - Eliminado (deprecated en Issue #117)
    - `src/lib/combat/action-processor.ts` - Eliminado (deprecated en Issue #117)
    - `src/lib/combat/combat-initializer.ts` - Añadido `combatNarrationExpertTool` al contexto
    - `src/lib/combat/initialization/types.ts` - Añadido `combatNarrationExpertTool` al contexto
  - **Referencia:** [Issue #94](../../docs/tracking/issues/corregidos.md#issue-94-refactorización-de-prompts-de-tacticians---separación-de-narración-y-decisión-táctica--resuelto) | [Plan Completado](../../docs/planes-desarrollo/completados/issue-94-refactorizacion-prompts-tacticians.md)

---

## [0.5.5] - 2025-01-20

### Added
- **✅ Refactorización CombatSession - State Object Pattern - COMPLETADO (2025-01-20):**
  - **Nueva clase `CombatSession`:** Implementación del patrón State Object para encapsular todo el estado del combate
  - **Reducción masiva de complejidad:** `combat-manager.ts` reducido de ~926 líneas a ~165 líneas (reducción del ~80%)
  - **Arquitectura simplificada:** Flujo de 3 pasos: Hidratar → Inicializar/Procesar → Serializar
  - **Eliminación de `debugLogs`:** Removido del output y del estado (panel DebugLog deprecado)
  - **Tests completos:** 36 tests unitarios + 16 tests de integración (100% pasando)
  - **Documentación completa:** JSDoc completo, guía de uso, y documentación de arquitectura actualizada
  - **Mejoras de mantenibilidad:**
    - Estado centralizado en una sola clase
    - Métodos con responsabilidades únicas
    - Testabilidad mejorada con estado encapsulado
    - Logging estructurado usando `@/lib/logger`
  - **Compatibilidad mantenida:** DI completamente funcional, todos los tests existentes pasando
  - **Plan completado:** Todas las 7 fases implementadas y documentadas
- **✅ Mejora de Testabilidad y Refactorización (2025-01-20) – Objetivos principales logrados:**
  - **Inyección de Dependencias completa:** `processAICombatantRolls` y `combatManagerTool` ahora aceptan dependencias inyectables a través de `executeCombatManager` + wrapper Genkit
  - **Código desacoplado:** Lógica pura consolidada en `rules-engine.ts`, `turn-manager.ts`, `action-processor.ts`
  - **Testing robusto:** 54+ tests verificados, nuevo test de integración con DI explícita
  - **Plan archivado:** Documentado como "Completado parcialmente" (Fases 4-5 pospuestas) en `docs/planes-desarrollo/completados/mejora-testabilidad-refactorizacion.md`
- **📚 Documentación de Dependency Injection (2025-01-20):**
  - Nuevo documento `docs/arquitectura/patrones-dependency-injection.md` describiendo el patrón DI implementado
  - Actualización de `docs/testing/README.md` con sección “Dependency Injection (DI) en Tests”
  - Guía rápida de testing actualizada con ejemplo de DI
  - Referencias cruzadas añadidas en `docs/README.md` y plan archivado
- **✅ Refactorización de CombatManager - Paso 4: Combat Initializer - COMPLETADO (2025-11-19):**
  - **Objetivo:** Extraer toda la lógica de inicialización de combate del `combat-manager.ts` a módulos especializados y reutilizables
  - **Módulos creados:**
    - `src/lib/combat/initialization/types.ts` - Interfaces compartidas para inicialización
    - `src/lib/combat/initialization/enemy-validator.ts` - Validación de combatientes y obtención de stats de enemigos
    - `src/lib/combat/initialization/initiative-generator.ts` - Generación de orden de iniciativa
    - `src/lib/combat/initialization/narration-processor.ts` - Procesamiento de narración de inicio de combate
    - `src/lib/combat/initialization/first-turn-handler.ts` - Manejo del primer turno si es de IA
    - `src/lib/combat/combat-initializer.ts` - Coordinador principal que orquesta todos los sub-módulos
  - **Tests implementados:**
    - Tests unitarios completos para todos los sub-módulos (`tests/unit/combat/initialization/`)
    - Test unitario del `CombatInitializer` principal (`tests/unit/combat/combat-initializer.test.ts`)
    - Test de integración end-to-end (`tests/integration/combat-initializer.integration.test.ts`)
    - Test manual de escenarios de combate (`tests/manual/combat-scenarios.test.ts`)
  - **Resultados:**
    - ✅ Reducción adicional de ~200 líneas en `combat-manager.ts`
    - ✅ Lógica de inicialización completamente modular y testeable
    - ✅ Separación clara de responsabilidades (validación, iniciativa, narración, primer turno)
    - ✅ Todos los tests de integración existentes siguen pasando
  - **Refactorización total completada:**
    - Paso 1: Rules Engine ✅
    - Paso 2: Turn Manager ✅
    - Paso 3: Action Processor ✅
    - Paso 4: Combat Initializer ✅
    - **Reducción total:** 2723 → ~800 líneas (~70% de reducción)
    - **Módulos extraídos:** 9 módulos especializados
  - **Referencia:** Plan completo en `docs/planes-desarrollo/completados/plan-refactorizacion-combat-manager.md`
- **✨ Optimización de Performance - Lazy Loading de Módulos Pesados (2025-11-19):**
  - **Problema:** La aplicación tardaba 111 segundos en cargar el menú principal debido a la inicialización inmediata de Genkit
  - **Solución:** Implementado lazy loading (carga diferida) de todos los módulos que inicializan Genkit
  - **Módulos optimizados:**
    - `gameCoordinator` en `src/app/actions.ts` - Solo se carga cuando el usuario ejecuta una acción
    - `parseAdventureFromJson` en `src/app/page.tsx` - Solo se carga cuando el usuario carga una aventura JSON
    - `processPlayerAction` y `setAdventureDataCache` en `src/app/page.tsx` - Solo se cargan cuando se necesitan
    - `narrativeExpert` y `markdownToHtml` en `src/ai/tools/combat-manager.ts` - Solo se cargan cuando se inicia un combate
  - **Resultados:**
    - ✅ Tiempo de carga inicial: 111s → 26.8s (76% más rápido)
    - ✅ Tiempo de compilación: 69.7s → 23.4s (66% más rápido)
    - ✅ Modo producción: < 2 segundos de carga
    - ✅ Genkit solo se inicializa cuando realmente se usa
  - **Archivos modificados:**
    - `src/app/actions.ts` - Lazy import de `gameCoordinator`
    - `src/app/page.tsx` - Lazy imports de `parseAdventureFromJson`, `processPlayerAction`, `setAdventureDataCache`
    - `src/ai/tools/combat-manager.ts` - Lazy imports de `narrativeExpert` y `markdownToHtml`
  - **Impacto:** Crítico - Mejora drástica de la experiencia de usuario al cargar la aplicación
- **✅ Fichas de Personajes Completas - COMPLETADO:**
  - **Schema actualizado (`src/lib/schemas.ts`):** Añadidos campos opcionales para fichas completas de D&D 5e:
    - `alignment`: Alineamiento del personaje
    - `speed`: Velocidad en pies por turno
    - `initiative`: Bonificador de iniciativa
    - `savingThrows`: Bonificadores de salvación por característica
    - `attacks`: Array de ataques con estadísticas completas (bonificador, daño, tipo, alcance, propiedades)
    - `racialTraits`: Rasgos raciales del personaje
    - `classFeatures`: Características de clase
    - `spellSlots`: Ranuras de conjuro disponibles por nivel
    - `spellSaveDC`: CD de salvación de conjuros
    - `spellAttackBonus`: Bonificador de ataque con conjuros
    - `appearance`: Descripción física
    - `ideals`, `bonds`, `flaws`: Ideales, vínculos y defectos del personaje
    - `experience`: Puntos de experiencia actuales
    - `deathSaves`: Tiradas de salvación contra la muerte (éxitos/fallos)
  - **Fichas de personajes iniciales completadas (`src/lib/new-game-data.ts`):**
    - **Galador (Paladín):** Ficha completa con todas las 18 habilidades, ataques, salvaciones, rasgos raciales y características de clase
    - **Merryl (Mago):** Ficha completa con todas las 18 habilidades, ataques, salvaciones, rasgos raciales, características de clase e información completa de conjuros
    - **Elara (Clériga):** Ficha completa con todas las 18 habilidades, ataques, salvaciones, rasgos raciales, características de clase e información completa de conjuros
    - **Inventario mejorado:** Descripciones de armas ahora incluyen información de ataque (bonificador, daño, tipo, alcance, propiedades)

### Fixed
- **🔧 Error de sintaxis en `narration-processor.ts` (Build Error):**
  - **Problema:** Build fallaba con "Parsing ecmascript source code failed" debido a un punto y coma en lugar de coma en la lista de parámetros
  - **Solución:** Corregido el separador de parámetros en la línea 28 de `src/lib/combat/initialization/narration-processor.ts`
  - **Impacto:** Crítico - Bloqueaba la compilación de la aplicación
- **🔧 Logging verboso de errores de timeout en `parseAdventureFromJson`:**
  - **Problema:** Los errores de timeout de conexión con la API de Gemini mostraban stack traces completos muy largos en los logs
  - **Solución:** Modificado el logging para mostrar solo mensajes concisos en intentos intermedios, stack trace completo solo en el último intento fallido
  - **Archivos modificados:** `src/ai/flows/parse-adventure-from-json.ts`
  - **Impacto:** Mejora la legibilidad de los logs durante desarrollo
- **Issue #91: Colores y efectos de tiradas críticas:**
  - Corregidos los colores y efectos visuales de las tiradas críticas según el diseño esperado
  - Tiradas de ataque críticas: Verde con efecto pulso y etiqueta "¡CRÍTICO!" verde
  - Tiradas de daño críticas: Amarillo con efecto pulso y etiqueta "¡CRÍTICO!" amarilla
  - Corregida la detección de tiradas de daño críticas que aparecían como normales (tenían `outcome: 'neutral'` en lugar de `outcome: 'crit'`)
  - Cambios en `src/components/game/dice-roll-result.tsx`: Función `getCriticalStyles()` para diferenciar críticos de ataque (verde) y daño (amarillo)
  - Cambios en `src/ai/tools/combat/dice-roll-processor.ts` y `src/ai/tools/combat-manager.ts`: Establecimiento correcto de `outcome: 'crit'` para tiradas de daño críticas
  - Funciona correctamente para jugador, compañeros y enemigos
- **Issue #94: Mensaje de muerte de enemigo faltante en ataques del jugador:**
  - Corregido el problema donde los ataques del jugador no mostraban el mensaje "¡[Jugador] ha matado a [Enemigo]!" cuando mataban a un enemigo
  - El mensaje ahora se muestra correctamente, igual que para compañeros y enemigos
  - Cambio en `src/ai/tools/combat-manager.ts`: Mejorada la condición para detectar cuando el jugador mata a un enemigo
- **Issue #95: Componente visual de tirada de daño del jugador no muestra mensaje de muerte:**
  - Corregido el problema donde el componente visual de la tirada de daño del jugador (panel izquierdo) no mostraba el mensaje "¡[Jugador] ha matado a [Enemigo]!" cuando mataba a un enemigo, aunque el mensaje sí aparecía en el chat
  - El objeto `DiceRoll` se creaba antes de determinar si el enemigo había muerto, por lo que no incluía la propiedad `targetKilled`
  - Solución: Refactorizada la lógica para determinar primero si el objetivo murió, y luego crear el objeto `DiceRoll` con la propiedad `targetKilled` correctamente establecida
  - Cambio en `src/ai/tools/combat-manager.ts`: Reordenamiento de la lógica de procesamiento de daño del jugador para incluir `targetKilled` en el objeto `DiceRoll`
  - Ahora el comportamiento es idéntico al de compañeros y enemigos: el mensaje de muerte aparece tanto en el chat como en el componente visual de la tirada
- **Corrección de valores incorrectos en fichas:**
  - **Galador:** CA corregida de 30 → 18 (armadura de placas sin escudo)
  - **Merryl:** HP corregido de 20 → 8 (correcto para nivel 1 de Mago con CON +2), CA corregida de 18 → 13 (sin armadura con DES mod)
  - **Elara:** HP corregido de 30 → 10 (correcto para nivel 1 de Clériga con CON +2), CA corregida de 18 → 13 (armadura de escamas con DES mod negativo)

### Changed
- **⚡ Desactivado Turbopack en favor de Webpack (2025-11-19):**
  - **Problema:** Turbopack era 4x más lento que Webpack para este proyecto (111s vs 26.8s)
  - **Solución:** Cambiado `package.json` para usar Webpack por defecto (`next dev` en lugar de `next dev --turbopack`)
  - **Razón:** Turbopack está en beta y tiene problemas con patrones complejos de server actions y lazy loading
  - **Resultado:** Compilación 66% más rápida, carga inicial 76% más rápida
  - **Archivo modificado:** `package.json` - Script `dev`
- **⚙️ Configuración de puerto unificada (2025-11-19):**
  - Configurado puerto 8080 tanto para desarrollo (`npm run dev`) como para producción (`npm start`)
  - **Antes:** dev en 8080, producción en 3000 (por defecto)
  - **Ahora:** Ambos en 8080 para consistencia
  - **Archivo modificado:** `package.json` - Scripts `dev` y `start`
- **🔧 Corrección de script de build para Windows (2025-11-19):**
  - Eliminado prefijo `NODE_ENV=production` del script de build (sintaxis Unix no compatible con Windows)
  - Next.js detecta automáticamente el modo producción en `npm run build`
  - **Archivo modificado:** `package.json` - Script `build`
- **Habilidades completadas:** Todas las fichas ahora incluyen las 18 habilidades oficiales de D&D 5e con sus estados de competencia correctos
- **Información de armas:** Las descripciones de armas en el inventario ahora incluyen estadísticas de ataque completas para mejor referencia durante el juego
- **Mejora de layout en panel de tiradas de ataque:**
  - El resultado del ataque ("✓ Acierta" o "✗ Fallo") ahora se muestra en una línea separada de la información del objetivo ("Contra: Goblin 2 (AC 15)")
  - Mejora la legibilidad y claridad visual de las tiradas de ataque
  - Aplicado a todas las tiradas de ataque (jugador, compañeros y enemigos)
  - Cambio en `src/components/game/dice-roll-result.tsx`: Separación del resultado del ataque en un párrafo independiente

---

## [0.5.1] - 2025-11-18

### Added
- **✅ Plan de Testeo Completo del Sistema de Turnos - COMPLETADO (2025-11-18):**
  - Testeo exhaustivo del sistema de turnos paso a paso implementado
  - **Resultados:**
    - ✅ 30/30 tests completados (100%)
    - ✅ 7 bugs detectados y corregidos (Issues #50, #52, #66, #68, #78, #79, #81)
    - ✅ 0 problemas potenciales pendientes
    - ✅ 2 mejoras futuras documentadas (Issues #65, #80)
  - **Tests ejecutados:**
    - Flujo de ejecución (5 tests): Inicio de combate, orden de turnos, avance manual/automático
    - Sincronización de estado (4 tests): Frontend-backend, turnIndex, iniciativa, logs
    - UX y controles (4 tests): Botones de avance, visibilidad, estados, placeholders
    - Casos edge (5 tests): Personajes inconscientes, muertos, múltiples combates, IDs no consecutivos
    - Validación de reglas (3 tests): Daño crítico, muerte masiva, orden de mensajes
    - Combates múltiples (3 tests): Múltiples salas, resolución de objetivos, fin de combate
    - Integración (2 tests): Frontend-backend, UI-state
    - Issues conocidos (5 tests): Issues #50, #52, #63, #65, #66, #68, #78, #79, #81
  - **Bugs corregidos durante el testeo:**
    - Issue #66: Orden incorrecto de mensajes en muerte masiva
    - Issue #68: Avance automático de turnos cuando jugador inicia combate
    - Issue #78: Botón "Avanzar Todos" se detiene un turno antes del jugador
    - Issue #79: Falta narración del DM en turnos del jugador
    - Issue #81: Bucle infinito cuando jugador inconsciente durante auto-avance
    - Issue #52: Narración de inicio de combate adelantada
    - Issue #63: Combate con IDs de personajes no consecutivos
  - **Mejoras futuras documentadas:**
    - Issue #65: Sistema para atacar compañeros fuera de combate (mejora futura)
    - Issue #80: Sistema para múltiples acciones del jugador en un turno (mejora futura)
  - **Archivos:**
    - `docs/planes-desarrollo/completados/testeo-sistema-turnos.md` - Documentación completa del testeo
  - **Estado:** ✅ PLAN COMPLETADO Y ARCHIVADO
  - **Referencia:** Plan de testeo completo en `docs/planes-desarrollo/completados/testeo-sistema-turnos.md`
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
- Implementado nuevo sistema de carga de aventuras modular (Parser, Validator, Cache).
- Añadida sanitización inteligente: las referencias rotas se convierten automáticamente en elementos interactuables ("Camino Bloqueado") para preservar la descripción narrativa sin romper el juego.
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

## [0.5.99] - 2025-12-16
### Changed
- **Interacción de Compañeros Refinada:**
  - El intérprete de acciones ahora distingue entre órdenes directas de movimiento ("Vamos a...") y propuestas sociales ("¿Qué os parece si vamos a...?").
  - Las propuestas al grupo ahora garantizan una respuesta de los compañeros (100% probabilidad) antes de cualquier narración.
  - Implementada deduplicación estricta: un compañero que habla antes del DM no volverá a hablar después en el mismo turno.
- **Supresión de Narrador (DM):**
  - El DM ahora mantiene un "voto de silencio" estricto durante interacciones puramente sociales con compañeros si no hay cambio de ubicación ni combate. Esto evita descripciones redundantes y mejora la fluidez del chat.
- **UI Limpia:**
  - Eliminado el indicador visual "Dungeon Master está pensando..." (Red Box) para evitar parpadeos y molestias visuales durante las respuestas rápidas o silencios intencionales del sistema.
- **Streaming AI:** 
  - Implementada arquitectura híbrida Request/Response + Event Streaming para narrativa y reacciones.
  - Solucionado 'Echo Glitch' donde el input del usuario se duplicaba.

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
