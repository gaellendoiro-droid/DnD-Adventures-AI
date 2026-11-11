# Roadmap - Histórico de Iniciativas Completadas

Este anexo concentra las iniciativas del roadmap que ya fueron entregadas.  
Para consultar las iniciativas en curso y planificadas, utiliza el documento principal [`docs/roadmap.md`](./roadmap.md).

> **Última actualización:** 2025-11-27

---

## 🔴 Prioridad Muy Alta

### 0. Estandarización de Niveles de Logging ✅ COMPLETADO
*   **Problema Actual:** Existe una inconsistencia sistemática en los niveles de logging utilizados en todo el código base. Mensajes marcados como `DEBUG` contienen texto que dice "WARNING", mensajes marcados como `INFO` contienen texto que dice "DEBUG", y en general hay una falta de coherencia entre el nivel de log declarado y el contenido del mensaje.
*   **Mejora Implementada:** ✅
    *   ✅ **Guías de Estilo:** Creada documentación completa sobre cuándo usar cada nivel de log (DEBUG, INFO, WARN, ERROR) - [Guía de Estilo de Logging](../arquitectura/guia-estilo-logging.md)
    *   ✅ **Validación:** Añadida validación automática en el logger para detectar inconsistencias futuras
    *   ✅ **Documentación:** Actualizada la documentación del sistema de logging con referencias a la guía de estilo
    *   ✅ **Auditoría y Estandarización:** Revisado código base y corregidas 5 inconsistencias detectadas
*   **Impacto:** Muy Alto - Mejora significativa de la calidad de logs, facilita depuración y mantenimiento, y permite que los filtros de log funcionen correctamente.
*   **Estado:** ✅ **COMPLETADO** - Guía de estilo creada, validación implementada, inconsistencias corregidas (2025-01-22)
*   **Correcciones realizadas:**
    *   Corregido mensaje DEBUG con palabra "Critical" → "Damage calculated for critical hit"
    *   Corregido mensaje WARN con palabra "error" → "encountered an issue"
    *   Mejorado mensaje WARN para clarificar fallback recuperable
    *   Eliminada redundancia "CRITICAL" en mensajes ERROR
    *   Mejorados mensajes de error con contexto estructurado
*   **Referencia:** 
    - Issue #119 (Inconsistencia en niveles de logging) 🔴 CRÍTICO
    - Relacionado con Issue #30 (Errores de conexión a APIs con logs verbosos)
    - Relacionado con Issue #25 (Logs del navegador colapsados por defecto)
    - [Guía de Estilo de Logging](../arquitectura/guia-estilo-logging.md)

---

### 1. Refactorización y Simplificación Arquitectónica ✅ COMPLETADO
*   **Problema Actual:** El `GameCoordinator` ha asumido demasiadas responsabilidades de "micro-gestión", convirtiéndose en un controlador demasiado complejo. Contiene bucles explícitos para gestionar compañeros, lógica de filtrado de enemigos muertos, y conoce demasiado sobre la estructura interna del turno narrativo.
*   **Mejora Implementada:** ✅
    *   ✅ **Fase 1 - CompanionReactionManager:** Extraída toda la lógica de reacciones de compañeros a `src/ai/flows/managers/companion-reaction-manager.ts`
    *   ✅ **Fase 2 - EntityStatusUtils:** Centralizadas 11 funciones de verificación de estados en `src/lib/game/entity-status-utils.ts`
    *   ✅ **Fase 3 - NarrativeTurnManager:** Encapsulado el flujo narrativo completo en `src/ai/flows/managers/narrative-turn-manager.ts` + extraído `TranscriptFormatter`
    *   ⏸️ **Fase 4 - SystemCommandDetector:** Pospuesta por baja prioridad (no necesaria actualmente)
*   **Impacto:** Transformacional - Reducción de `GameCoordinator.ts` de 493 → 321 líneas (-35%), mejora significativa de testabilidad, modularidad y escalabilidad.
*   **Resultados Obtenidos:**
    *   ✅ Código más limpio y enfocado en orquestación de alto nivel
    *   ✅ Testabilidad mejorada (4 nuevos módulos especializados)
    *   ✅ Escalabilidad (añadir nuevas fases al turno narrativo sin tocar el coordinador)
    *   ✅ Prompts de IA preservados sin modificaciones
    *   ✅ Tests validados: Sin nuevos fallos introducidos
    *   ✅ Pruebas manuales: Flujo narrativo funcionando correctamente
*   **Estado:** ✅ **COMPLETADO** - 3 de 4 fases implementadas (Fase 4 pospuesta) (2025-11-22)
*   **Referencia:** [Plan Detallado](planes-desarrollo/completados/plan-refactorizacion-arquitectura.md)
*   **Referencia:** 
    - Análisis de arquitectura realizado el 2025-11-22
    - Relacionado con la complejidad del GameCoordinator (~500 líneas)
    - Base para futuras mejoras del flujo narrativo

---

### 1. Simplificación de Arquitectura de Combate ✅ COMPLETADO
*   **Problema Actual:** El sistema de combate tenía una arquitectura excesivamente compleja con múltiples capas de delegación (8-9 niveles de profundidad). El flujo del jugador y el de la IA eran diferentes, causando duplicación de código, inconsistencias y dificultando el mantenimiento.
*   **Mejora Implementada:** ✅
    *   ✅ **TurnProcessor Unificado:** Creado `TurnProcessor` único que funciona igual para jugador e IA, eliminando la duplicación entre `action-processor.ts` y `dice-roll-processor.ts`.
    *   ✅ **CombatActionExecutor Unificado:** Creado módulo unificado que maneja cualquier acción de combate independientemente de quién la ejecute.
    *   ✅ **Inicialización Simplificada:** Eliminado `first-turn-handler.ts`, el primer turno se procesa como cualquier otro usando el flujo normal.
    *   ✅ **Flujo Simplificado:** Reducido de 8-9 niveles de profundidad a 3-4 niveles.
*   **Impacto:** Transformacional - Mejora significativa de la arquitectura, elimina duplicación, garantiza consistencia total entre jugador e IA, y facilita enormemente el mantenimiento futuro. Resuelve problemas como mensajes de muerte duplicados y otras inconsistencias.
*   **Resultados Obtenidos:**
    *   ✅ Consistencia total: Jugador e IA usan exactamente el mismo código
    *   ✅ Complejidad reducida: De 8-9 niveles de profundidad a 3-4 niveles
    *   ✅ Duplicación eliminada: Lógica unificada en módulos centralizados
    *   ✅ Mantenibilidad mejorada: Menos archivos, menos duplicación, más fácil de depurar
    *   ✅ Módulos eliminados: `action-processor.ts`, `dice-roll-processor.ts`, `first-turn-handler.ts`
*   **Estado:** ✅ **COMPLETADO** - Implementación completada y verificada (2025-11-21)
*   **Plan Detallado:** ✅ [Simplificación de Arquitectura de Combate](../planes-desarrollo/completados/issue-117-simplificacion-arquitectura-combate.md)
*   **Referencia:** 
    - Issue #117 (Simplificación de Arquitectura de Combate) ✅ RESUELTO
    - Relacionado con Issue #94 (Refactorización de Prompts de Tacticians)
    - Resuelve Issue #82 (Unificar sistema de procesamiento de tiradas) ✅ RESUELTO
    - Resuelve Issue #21 (Código duplicado en combat-manager) ✅ RESUELTO

---

### 1. Revisión y Reorganización de la Interfaz de Usuario ✅ COMPLETADO
*   **Problema Original:** La UI distribuía controles críticos en lugares poco accesibles (botón de guardar en el panel izquierdo, panel DebugLog ocupando espacio productivo y paneles sin jerarquía visual), lo que entorpecía la usabilidad.
*   **Mejoras Implementadas (v0.5.5–v0.5.8):**
    *   ✅ **Header funcional y contextual:** `AppHeader` ahora se renderiza en `GameView`, muestra el nombre de la aventura y aloja el botón de "Guardar Partida" junto al botón de menú para acceso inmediato. (`src/components/layout/app-header.tsx`, `src/components/game/game-view.tsx`)
    *   ✅ **Panel izquierdo redimensionable y sin ruido:** `LeftPanel` pasó a un layout vertical de `InitiativeTracker` + `DiceLogPanel` con `ResizablePanelGroup`, y se eliminaron las dependencias de DebugLog, reduciendo el ruido visual.
    *   ✅ **Deprecación completa de DebugLog UI:** Se eliminó el panel, el estado asociado y el componente `debug-panel.tsx`, alineado con la eliminación de `debugLogs` en el flujo de combate (`CHANGELOG.md` 0.5.5).
    *   ✅ **Panel derecho optimizado:** Layout colapsable, `PartyPanel` compacto y `CharacterSheet` densificado (skills en grid 2x, badges mini, inventario con truncado). Referencia `CHANGELOG.md` 0.5.8.
    *   ✅ **Feedback de acciones simplificado:** Eliminado el botón de dados del chat para enfocar el input del jugador en texto.
    *   ✅ **Datos listos para la UI:** Sistema de modificadores de skills pre-calculados expuesto directamente en la ficha, evitando cálculos duplicados en el frontend.
*   **Impacto:** La UI es más limpia y jerárquica, libera espacio en el panel izquierdo, reduce scroll en el panel derecho y mejora el acceso a acciones críticas (guardar partida, navegación). Además, el código quedó libre de componentes obsoletos y propiedades muertas.
*   **Plan Detallado:** ✅ [Reorganización de UI](../planes-desarrollo/completados/reorganizacion-ui.md)
*   **Estado:** ✅ **COMPLETADO** (2025-11-25) – Revisión total desplegada en producción interna.
*   **Referencias:** 
    - [Notas de Gael - #268](../notas/Notas%20de%20Gael.md) - Rediseño del Panel Izquierdo
    - `CHANGELOG.md` [0.5.5] (eliminación DebugLog) y [0.5.8] (compactación panel derecho, skills pre-calculados)

---

## 🟡 Prioridad Media

### 8. Ajuste Dinámico de Longitud de Narración ✅ COMPLETADO
*   **Problema Actual:** Las narraciones del DM tenían una longitud fija y a veces resultaban repetitivas o demasiado largas para acciones simples, o demasiado cortas para momentos importantes.
*   **Mejora Implementada:** ✅
    *   ✅ **Detección de Momentos Clave:** El sistema identifica automáticamente cambios de ubicación, muertes de entidades y descansos.
    *   ✅ **Narración Adaptativa:**
        *   **Estándar:** 2-3 frases para acciones rutinarias.
        *   **Clave:** 3-4 frases para momentos importantes, con mayor carga descriptiva.
    *   ✅ **Integración Profunda:** La lógica se propaga desde el `NarrativeTurnManager` hasta los expertos de `Exploration` e `Interaction`.
*   **Impacto:**
    *   Mejora el ritmo del juego (menos texto en rutina, más en momentos importantes).
    *   Aumenta la inmersión en transiciones y eventos dramáticos.
    *   Reduce la fatiga de lectura del jugador.
*   **Estado:** ✅ **COMPLETADO** - Implementado y verificado (2025-11-26)

---

### 9. Sistema de Tablas Aleatorias en JSON ✅ COMPLETADO
*   **Problema Actual:** Los PNJs a menudo necesitan compartir rumores o información que en la aventura original proviene de tablas aleatorias. Al no tener acceso a estas tablas en el JSON, la IA tiende a alucinar o inventar información falsa.
*   **Mejora Implementada:** ✅
    *   **Soporte de Tablas en JSON:** Se ha extendido el esquema de aventura para soportar una nueva sección `tables` que contiene tablas de tiradas (ej: "Historias de Phandalin").
    *   **Etiquetas Dinámicas:** Se ha implementado un sistema de etiquetas `[[ROLL_TABLE:id-tabla]]` que pueden insertarse en cualquier texto del JSON (diálogos, descripciones, notas).
    *   **Resolución Automática:** La herramienta `adventureLookupTool` detecta estas etiquetas y las reemplaza automáticamente por un resultado aleatorio de la tabla correspondiente antes de enviar la información a la IA.
*   **Beneficios:**
    *   ✅ **Fidelidad:** Los PNJs ahora dan rumores y datos canónicos de la aventura.
    *   ✅ **Variedad:** Cada partida puede tener resultados diferentes sin intervención manual.
    *   ✅ **Transparencia para la IA:** La IA recibe el texto final ya procesado, por lo que lo narra con total naturalidad.
*   **Estado:** ✅ **COMPLETADO** - Implementado en `adventureLookupTool` y añadido al JSON de la aventura (2025-11-26)

---

## 🟢 Prioridad Baja

### 21. Mejoras de Calidad y Pulido ✅ COMPLETADO
*   **Mejoras Implementadas:**
    *   ✅ **Atribución Narrativa en Diálogos:** Los PNJs ahora siempre incluyen una breve descripción narrativa (quién habla y cómo) antes o durante sus diálogos, mejorando la inmersión y claridad.
*   **Impacto:** Reduce la monotonía de los diálogos, aporta contexto visual y facilita seguir quién habla sin depender solo del nombre del personaje.
*   **Estado:** ✅ **COMPLETADO** (2025-11-26)
*   **Referencias:** [Notas de Gael - #05, #11, #15, #17, #18, #19, #20, #21, #41, #42, #43, #44, #46, #47, #48, #49, #50, #52, #54, #55, #56, #62, #63, #64, #65, #67, #69, #73, #74, #76, #77, #78, #80, #82, #83, #84, #85, #86, #87, #88, #89, #90, #91, #92, #97, #98, #111, #112, #113, #114, #115](../notas/Notas%20de%20Gael.md)

---

## 📅 Entregas de Junio de 2026

### 1. Sistema de Combate y Reglas (Hito 1) ✅ COMPLETADO
* **Revisión del inicio del combate:** Sincronización del delta de estado completo al inicializar el combate (`party`, `enemies`, `enemiesByLocation`, `diceRolls`) solucionando problemas de visualización de tiradas de iniciativa e HP de enemigos en el frontend.
* **Cálculo de Daño Crítico:** Corrección de notación de modificadores negativos (`1d6-1` en vez de `1d6+-1`) y sanitización robusta en la comprobación de golpes críticos.
* **Al arrancar un combate el dm repite la última narración que hizo:** Modificación del prompt de inicio de combate para evitar redundancias físicas con el último mensaje del historial de conversación.
* **Estado:** ✅ **COMPLETADO** (2026-06-28)

### 2. Automatización y Autocuración de Manuales (Hito 2) ✅ COMPLETADO
* **Detección y Resubida de Manuales Expirados (File API):** Creado el gestor dinámico `RulebookManager` con caché persistente local en disco (`file-api-cache.json`) para detectar y resubir automáticamente manuales expirados a Google AI Studio en caso de error 403/404.
* **Estado:** ✅ **COMPLETADO** (2026-06-28)

### 3. Arquitectura Reactiva Dirigida por Eventos (Hito 3) ✅ COMPLETADO
* **Definición de Esquemas de Eventos de Juego (GameEvents):** Diseñar y tipar con Zod los eventos estructurados de bajo nivel (ej: `PlayerMoved`, `DoorOpened`, `ItemCollected`, `TrapTriggered`, `DamageApplied`).
* **Migración de Managers Procedurales a Sistemas Reactivos:** Refactorizar la secuencia de `narrative-turn-manager.ts` para usar un despachador/cola de eventos, extrayendo la lógica de navegación, interacción y tiradas de habilidad a sistemas aislados.
* **Adaptación del Narrador conversacional (`narrativeExpert`):** Rediseñar el prompt del narrador para que reciba la lista de eventos reales ocurridos en el turno, limitando su labor a narrar literariamente hechos consumados en vez de intentar calcular qué ha pasado.
* **Aislamiento del Estado (State Isolation):** Asegurar que el `worldState` y el estado de la `party` solo puedan ser mutados a través del procesamiento de eventos validados por los sistemas de reglas.
* **Estado:** ✅ **COMPLETADO** (2026-06-27)

### 4. Consistencia Física del Mundo e IA Conversacional (Hito 4) ✅ COMPLETADO
* **Refactorización Genérica de Estado (Property Override System):** Migrado y unificado el `worldState` actual a mutaciones dinámicas en `WorldStateManager` para persistir estados físicos (abierto/cerrado, saqueado) e ítems de contenedores, puertas e interactuables genéricos.
* **Unificación de Contexto de los Expertos (Single Source of Truth) [Fase 1]:** Estructuración e inyección del inventario de la party y personajes actualizados a todos los agentes de la IA conversacional, eliminando la ceguera de posesiones.
* **Delimitación de Interacciones Físicas [Fase 2]:** Bloqueo automático de saqueo de contenedores cerrados y delegación limpia de interacciones físicas con muebles contenedores (moverlos/cargarlos) al DM.
* **Validación de Llaves al Abrir Puertas:** Extender `handleDoorOpening` en `InteractionHandler` para validar si la conexión correspondiente a la puerta requiere una llave (`requiredKeyId`) y si algún miembro del grupo dispone de ella en su inventario antes de autorizar la apertura.
* **Estado:** ✅ **COMPLETADO** (2026-06-26)

### 5. Conversador OOC Mejorado ✅ COMPLETADO
* **Descripción:** Permitir el uso del chat fuera de personaje (Out of Character - OOC) para resolver dudas sobre monstruos o reglas oficiales mediante el interceptor de prefijo `//` o `ooc`.
* **Estado:** ✅ **COMPLETADO** (2026-06-25)

### 6. Mejoras de Interfaz (UX) ✅ COMPLETADO
* **Mejora de Fichas en UI:** Secciones colapsables o pestañas (Atributos, Inventario, Hechizos) para reducir la sobrecarga de información y visualización de modificadores activos mediante acordeones Radix UI.
* **Estado:** ✅ **COMPLETADO** (2026-06-24)

### 7. Corrección de Inconsistencia de Género (DM) ✅ COMPLETADO
* **Descripción:** Implementación de reglas estrictas de concordancia de género gramatical en español de España en los prompts principales del Dungeon Master (`narrativeDirectorPrompt`, `combatInitiationPrompt`). Adicionalmente, se creó la inyección dinámica de contexto `combatantsContext` en el procesador de turnos de combate para que el narrador de combate asocie correctamente el género de cualquier personaje (incluyendo personajes personalizados).
* **Estado:** ✅ **COMPLETADO** (2026-06-28)

---

## 📅 Entregas Recientes (v0.6.1 - v0.6.2 / Noviembre de 2026)

### 1. Ideas Rápidas y Pulido de Partida ✅ COMPLETADO
* **[TASK-047] Desactivación de comentarios del compañero activo:** Desactivar los comentarios automáticos del compañero que esté activo como personaje seleccionado.
  * **Estado:** ✅ **COMPLETADO en v0.6.1**
* **[TASK-048] Fichas de monstruos automáticas en conversor PDF a JSON:** Inclusión de fichas de monstruos no catalogados durante la conversión para evitar llamadas a la API en medio de la partida.
  * **Estado:** ✅ **COMPLETADO en v0.6.2**
* **[TASK-049] Nombres limpios en orden de combate:** Evitar numeración redundante en nombres únicos (ej. una sola oveja o un solo Guz) cuando no existan duplicados en la batalla.
  * **Estado:** ✅ **COMPLETADO**

### 2. Conversor de Aventuras y Datos ✅ COMPLETADO
* **[TASK-050] Prevención de Spoilers en Narración Inicial y Conversión:** Separación estricta de `summary` (catálogo) e `introductoryNarration` (mesa de rol en segunda persona) en `scripts/pdf-to-json.ts`, con saneamiento de spawns condicionales en el minuto 0 para evitar revelar la trama o entidades antes de tiempo.
  * **Estado:** ✅ **COMPLETADO**
* **[TASK-051] Actualización a Gemini 3.5 Flash:** Migración del modelo principal del proyecto en `src/ai/model-config.ts` y Genkit de `gemini-2.5-flash` a `gemini-3.5-flash`, con fallback automático a `gemini-2.5-flash-lite` para evitar caídas por límites diarios de cuota en el Free Tier de Google AI Studio.
  * **Estado:** ✅ **COMPLETADO**
* **[TASK-052] Robustecimiento del Conversor PDF a JSON:** Adaptado el script `scripts/pdf-to-json.ts` para resolver estadísticas y aplicar overrides a monstruos y NPCs, desactivar IA RAG en PNJs únicos, y validar el JSON generado contra el esquema Zod `AdventureDataSchema`.
  * **Estado:** ✅ **COMPLETADO en v0.6.2**
* **[TASK-053] Entidades Condicionales Simplificadas:** Integrar el soporte para NPCs con presencia condicional en localizaciones mediante flags de presencia y ausencia (`presenceFlag` y `absenceFlag`), permitiendo que el conversor de PDF a JSON sitúe de forma dinámica y temporal a las criaturas a lo largo del mapa y la Capa 2 (TypeScript) evalúe su presencia física basándose en el estado global del juego.
  * **Estado:** ✅ **COMPLETADO en v0.6.2**

### 3. Arquitectura y Flujos de IA ✅ COMPLETADO
* **[TASK-054] Rediseño a Arquitectura Neuro-Simbólica de 3 Capas (Robustez):** Desacoplar completamente la lógica dura del juego de la narración creativa:
  1. *Capa 1 (IA Árbitro):* Un agente interpretativo traduce la acción creativa y libre del jugador a un JSON que propone cambios físicos y mecánicos en el estado.
  2. *Capa 2 (Código TypeScript):* El motor de reglas de TypeScript procesa y valida este JSON, gestionando estados, inventarios, tiradas de dados reales y actualizando la base de datos de forma robusta y determinista, generando un JSON final de "Hechos Absolutos del Turno".
  3. *Capa 3 (IA Narradora/DM):* Un prompt de DM simplificado toma el JSON de Hechos Absolutos del Turno y se limita a vestirlo de gala literaria en prosa evocadora de D&D, previniendo alucinaciones lógicas, double-binds y colapsos de esquema.
  * **Estado:** ✅ **COMPLETADO en v0.6.1**

### 4. Sistema de Combate y Reglas ✅ COMPLETADO
* **[TASK-055] Sincronización Bidireccional de WorldState y Reglas de Combate:** Sincronización completa entre `enemiesByLocation` y `worldState.locations[locId].enemies`, activación automática de flags globales de victoria (`<id>_derrotado`) en `combatManagerTool` y `StatsSystem`, y desbloqueo bidireccional de puertas en `SkillCheckSystem`.
  * **Estado:** ✅ **COMPLETADO**
* **[TASK-056] Prevención de Doble Ejecución en GameRulesEngine:** Bloqueo de reencolado de eventos en `narrative-turn-manager.ts` cuando la regla intercepta la acción, y emisión de eventos `ItemCollected` en `ScrollRuleModule`.
  * **Estado:** ✅ **COMPLETADO**
* **[TASK-057] Alucinaciones del Tactician Enemigo (Acciones inventadas):** Evitar que la IA del tactician enemigo (`enemyTacticianTool`) alucine acciones o armas inexistentes, pasando las acciones disponibles directamente en el prompt del tactician o forzándolo a consultar las estadísticas oficiales antes de elegir la acción.
  * **Estado:** ✅ **COMPLETADO**

### 5. Mecánicas de Magia y Economía ✅ COMPLETADO
* **[TASK-058] Ciclo de Vida y Uso de Pergaminos Mágicos:** Integrar con el inventario físico el uso de consumibles mágicos (restar el pergamino al activarlo, validar si el personaje tiene la habilidad de usarlo y realizar la transferencia correcta entre mochilas de compañeros sin duplicidades).
  * **Estado:** ✅ **COMPLETADO en v0.6.1**
* **[TASK-059] Unificación de Inventarios Iniciales:** Homologar los inventarios de las fichas iniciales de personajes para que utilicen exactamente los mismos IDs y estructuras estándar sincronizadas con `adventureData.items`.
  * **Estado:** ✅ **COMPLETADO en v0.6.1**
* **[TASK-060] Mapeo de Sinónimos de Inventario Personal:** Añadir reglas específicas en los prompts de los expertos conversacionales de la IA para que apliquen la misma tabla de sinónimos a las pertenencias de los personajes.
  * **Estado:** ✅ **COMPLETADO en v0.6.1**

---

> Las iniciativas completadas seguirán moviéndose a este archivo para mantener el roadmap principal enfocado exclusivamente en trabajo proactivo.



