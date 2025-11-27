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

> Las iniciativas completadas seguirán moviéndose a este archivo para mantener el roadmap principal enfocado exclusivamente en trabajo proactivo.


