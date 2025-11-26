# Roadmap - Mejoras Futuras

Este documento describe posibles mejoras y nuevas funcionalidades que podrían llevar la experiencia de D&D Adventures AI al siguiente nivel. La arquitectura actual es modular y robusta, sentando una base excelente para las siguientes evoluciones.

**Nota:** Para ver las mejoras ya implementadas, consulta el [CHANGELOG.md](../CHANGELOG.md).

**Última actualización:** 2025-01-23  
**Estado:** Actualizado - Verificado estado de todas las entradas. Issue #117 (Simplificación de Arquitectura de Combate) marcado como ✅ COMPLETADO. Narración Unificada marcada como ✅ PARCIALMENTE IMPLEMENTADA. Añadida entrada #12: Sistema de Comprobación de Competencia en Tiradas. Añadida entrada #7: Integración de Google File Search (RAG Automatizado) con Prioridad Alta.

---

## 📑 Índice

### 🔴 Prioridad Muy Alta
- [0. Estandarización de Niveles de Logging](#0-estandarización-de-niveles-de-logging-completado) ✅ COMPLETADO
- [1. Refactorización y Simplificación Arquitectónica](#1-refactorización-y-simplificación-arquitectónica-completado) ✅ COMPLETADO
- [1. Simplificación de Arquitectura de Combate](#1-simplificación-de-arquitectura-de-combate-completado) ✅ COMPLETADO
- [1. Revisión y Reorganización de la Interfaz de Usuario](#1-revisión-y-reorganización-de-la-interfaz-de-usuario)

### 🔴 Prioridad Alta
- [2. Sistema de Progresión y Gestión](#2-sistema-de-progresión-y-gestión)
- [3. Sistema de Inicio de Combate Dinámico](#3-sistema-de-inicio-de-combate-dinámico)
- [4. Mejora de Estructura de Fichas de Personajes en la UI](#4-mejora-de-estructura-de-fichas-de-personajes-en-la-ui)
- [5. Sistema de Modos de Juego Diferenciados](#5-sistema-de-modos-de-juego-diferenciados)
- [6. Revisiones de Sistema de Combate](#6-revisiones-de-sistema-de-combate)
- [7. Integración de Google File Search (RAG Automatizado)](#7-integración-de-google-file-search-rag-automatizado)

### 🟡 Prioridad Media
- [8. Ajuste Dinámico de Longitud de Narración](#8-ajuste-dinámico-de-longitud-de-narración-completado) ✅ COMPLETADO
- [9. Sistema de Tablas Aleatorias en JSON](#9-sistema-de-tablas-aleatorias-en-json-completado) ✅ COMPLETADO
- [10. Sistema de Mundo Persistente](#10-sistema-de-mundo-persistente)
- [11. Atención Multijugador/NPC en Diálogos](#11-atención-multijugadornpc-en-diálogos)
- [12. Compendio de D&D Local - Base de Datos Local](#12-compendio-de-dd-local---base-de-datos-local)
- [13. IA Conversacional Avanzada](#13-ia-conversacional-avanzada)
- [14. Calidad y Profundidad de la IA](#14-calidad-y-profundidad-de-la-ia)
- [15. Separación de IDs de Fichas de Personajes](#15-separación-de-ids-de-fichas-de-personajes)
- [16. Sistema de Comprobación de Competencia en Tiradas](#16-sistema-de-comprobación-de-competencia-en-tiradas)
- [17. Mejoras de Mecánicas de D&D 5e](#17-mejoras-de-mecánicas-de-dd-5e)
  - [17.1. Información de Dados de Daño de Armas en Fichas](#171-información-de-dados-de-daño-de-armas-en-fichas)
- [18. Actualización Automática de Fichas desde Archivos JSON](#18-actualización-automática-de-fichas-desde-archivos-json)
- [19. Convertidor de PDF a JSON - Aplicación Auxiliar](#19-convertidor-de-pdf-a-json---aplicación-auxiliar)
- [20. Música y Sonido Dinámicos](#20-música-y-sonido-dinámicos)

### 🟢 Prioridad Baja
- [17. Mejoras de Interfaz de Usuario](#17-mejoras-de-interfaz-de-usuario)
- [18. Mejoras de Sistema de Personajes y Compañeros](#18-mejoras-de-sistema-de-personajes-y-compañeros)
- [19. Mejoras de Sistema de Aventuras y Datos](#19-mejoras-de-sistema-de-aventuras-y-datos)
- [20. Mejoras de Calidad y Pulido](#20-mejoras-de-calidad-y-pulido)
- [21. Comandos de Voz](#21-comandos-de-voz)
- [22. Automatización del Versionado y Changelog](#22-automatización-del-versionado-y-changelog)

---

## 🔴 Prioridad Muy Alta

Mejoras críticas que mejoran significativamente la arquitectura, mantenibilidad y consistencia del sistema.

### 0. Estandarización de Niveles de Logging ✅ COMPLETADO {#0-estandarización-de-niveles-de-logging-completado}
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

### 1. Refactorización y Simplificación Arquitectónica ✅ COMPLETADO {#1-refactorización-y-simplificación-arquitectónica-completado}
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

### 1. Simplificación de Arquitectura de Combate ✅ COMPLETADO {#1-simplificación-de-arquitectura-de-combate-completado}
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

Mejoras críticas de interfaz de usuario que mejoran significativamente la experiencia y usabilidad del juego.

### 1. Revisión y Reorganización de la Interfaz de Usuario ✅ COMPLETADO {#1-revisión-y-reorganización-de-la-interfaz-de-usuario}
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

## 🔴 Prioridad Alta

Mejoras críticas que impactan directamente en la experiencia core del juego y son fundamentales para la jugabilidad.

### 2. Sistema de Progresión y Gestión {#2-sistema-de-progresión-y-gestión}
*   **Problema Actual:** El juego es una experiencia "de una sola sesión". No hay subida de nivel, el inventario no se puede gestionar de forma dinámica y la persistencia de datos depende de archivos de guardado manuales.
*   **Mejora Propuesta:**
    *   **Sistema de Experiencia (XP) y Subida de Nivel:** La IA podría otorgar XP por completar misiones o superar desafíos, permitiendo a los personajes subir de nivel y mejorar sus estadísticas y habilidades.
    *   **Gestión de Inventario y Economía:** Mejorar la interacción con comerciantes para que el oro y los tesoros tengan un propósito funcional, permitiendo comprar y vender objetos.
    *   **Persistencia de Datos:** Reemplazar el sistema de guardado en archivos por una base de datos (como Firestore) para un guardado automático y continuo.
*   **Impacto:** Es fundamental para crear una campaña duradera y gratificante, que es el núcleo de la experiencia D&D.
*   **Plan Detallado:** ❌ No creado

### 3. Sistema de Inicio de Combate Dinámico {#3-sistema-de-inicio-de-combate-dinámico}
*   **Problema Actual:** El mundo del juego es pasivo. El combate solo se inicia si el jugador declara explícitamente un ataque. Una acción narrativa que debería provocar hostilidad (como robar a un PNJ o insultar a un orco) no tiene consecuencias mecánicas, lo que rompe la inmersión.
*   **Mejora Propuesta:**
    *   Añadir un paso de **"Evaluación de Hostilidad"** al flujo del `gameCoordinator`. Después de que el `narrativeExpert` procese una acción, este nuevo paso evaluaría si la disposición de algún PNJ en la escena debería cambiar a `hostil`.
    *   Si la hostilidad aumenta, el `gameCoordinator` iniciaría automáticamente el modo de combate llamando al `combatManagerTool`.
*   **Impacto Estratégico:** Crítico. Es la mejora más importante para la credibilidad del mundo de juego. Hará que el mundo se sienta vivo, reactivo y peligroso, y que las acciones de los jugadores tengan un peso y consecuencias reales.
*   **Plan Detallado:** ❌ No creado

### 4. Mejora de Estructura de Fichas de Personajes en la UI {#4-mejora-de-estructura-de-fichas-de-personajes-en-la-ui}
*   **Problema Actual:** Las fichas de personajes pueden ser abrumadoras con toda la información mostrada a la vez. Falta organización y visualización de estados temporales.
*   **Mejora Propuesta:**
    *   **Mejor Organización:** Reestructurar la información en secciones lógicas y accesibles
    *   **Más Datos Accesibles:** Mostrar habilidades, rasgos y características de forma más clara
    *   **Visualización de Estados Temporales:** Indicadores visuales claros para estados como muerto, bendecido, aturdido, envenenado, paralizado, etc.
    *   **Pestañas o Secciones Colapsables:** Permitir al jugador expandir/colapsar secciones según necesidad
    *   **Evaluación de Información:** Distinguir entre información esencial (siempre visible) y secundaria (expandible)
    *   **Rediseño del Panel de Fichas:** Rediseño completo del panel de Fichas de personajes para mejorar la organización y accesibilidad
    *   **Reflejar Estados en Ficha de Personaje:** La ficha de personaje debería tener una pestaña dedicada para mostrar estados activos y sus efectos
    *   **Reflejar Estados en Panel de Grupo:** El panel de Grupo debería mostrar estados como muerto, bendecido, aturdido, envenenado, paralizado, etc. con estados visuales con iconos o colores
    *   **Indicador de Vida en Panel de Orden de Combate:** Evaluar si añadir barras de vida o indicadores visuales de estado de salud en el panel de orden de combate
*   **Impacto:** Mejora significativa de la experiencia de usuario, facilita la gestión de personajes y hace más accesible la información durante el combate.
*   **Plan Detallado:** ❌ No creado
*   **Referencia:** [Notas de Gael - #06, #17, #18, #44, #69](../notas/Notas%20de%20Gael.md)

### 5. Sistema de Modos de Juego Diferenciados {#5-sistema-de-modos-de-juego-diferenciados}
*   **Problema Actual:** El sistema no diferencia claramente entre los diferentes modos de juego (exploración, combate, interacción social), lo que limita las mecánicas específicas de cada modo.
*   **Mejora Propuesta:**
    *   **Modos Diferenciados:** Implementar claramente Modo exploración, Modo combate y Modo social o interacción.
    *   **Reglas Específicas:** Cada modo debe tener sus propias reglas, acciones disponibles y mecánicas específicas.
    *   **Adaptación de Interfaz:** La interfaz y el comportamiento del sistema deben adaptarse según el modo activo.
    *   **Acciones de Movimiento en Exploración:** Implementar acciones de movimiento específicas (ritmo de viaje, saltar, trepar, nadar, arrastrarse) con sus propias reglas y pruebas de característica asociadas.
    *   **Pruebas de Características:** Implementar las pruebas de características en los modos de exploración e interacción, permitiendo realizar tiradas de habilidades cuando sea apropiado según el contexto.
    *   **Sistema de Detección Automática de Pruebas:** Implementar un sistema para que la IA sepa cuándo una interacción requiere una prueba de característica (como Carisma, Persuasión o Engaño) para resolver la situación con un elemento de suerte.
*   **Impacto:** Fundamental para diferenciar las experiencias de juego y permitir mecánicas específicas de cada modo.
*   **Plan Detallado:** ❌ No creado
*   **Referencia:** [Notas de Gael - #79, #80, #81, #78](../notas/Notas%20de%20Gael.md)

### 6. Revisiones de Sistema de Combate {#6-revisiones-de-sistema-de-combate}
*   **Mejoras Propuestas:**
    *   **Minimizar Mensajes del DM en Combate:** En combate, a veces en un solo turno el DM puede llegar a mandar 5 mensajes (narración inicial, acción, daño, mensaje de "ha dejado inconsciente a X" y mensaje de "X cae inconsciente"). Buscar la forma de minimizar esta cantidad de mensajes a lo mínimo, diferenciando entre mensajes narrativos y mensajes informativos y agrupando estos últimos en un solo mensaje del DM.
    *   **Ignorar Turnos de Personajes Muertos o Inconscientes:** En combate, los turnos de los personajes muertos o inconscientes ya no deberían ni ejecutarse para no perder tiempo. El bucle debería ignorar a los personajes que están muertos o inconscientes, pero si un personaje se recupera de la inconsciencia o revive habría que volver a tenerlo en cuenta en el bucle. Esto tiene que ir acompañado de alguna señal visual de qué personajes están fuera del combate (quizás tachando su nombre en el combat tracker o con algún tipo de símbolos para marcar su estado).
    *   **Revisar o Eliminar Botón de Tiradas:** Evaluar si eliminar el botón de tiradas y su funcionalidad (las tiradas ya se ejecutan en el server), o si hacer que cuando sea el turno del jugador en combate o se le pida una tirada, la haga el mismo.
    *   **Comprobar Sistema de Tiradas de Dados y Notación en Panel Tiradas:** Verificar que las notaciones de tiradas se muestran correctamente y que el desglose de modificadores es preciso. Asegurar que la información mostrada en el panel de tiradas es clara y consistente con los cálculos reales.
    *   **Verificar Datos Conocidos por Enemigos al Decidir Acciones:** Comprobar que los tacticians de enemigos tienen acceso a toda la información necesaria (HP, AC, habilidades, estado de los aventureros) para tomar decisiones tácticas adecuadas. Asegurar que la información proporcionada a la IA es completa y precisa.
*   **Impacto:** Mejora el flujo de combate, reduce ruido visual y mejora la experiencia del jugador.
*   **Plan Detallado:** ❌ No creado
*   **Referencia:** [Notas de Gael - #102, #104, #109, #122, #123](../notas/Notas%20de%20Gael.md)

### 7. Integración de Google File Search (RAG Automatizado) {#7-integración-de-google-file-search-rag-automatizado}
*   **Problema Actual:** El sistema actual depende de búsquedas directas por ID en archivos JSON y llamadas a APIs externas para obtener información. No hay capacidad de búsqueda semántica que permita encontrar información basándose en significado o contexto, lo que limita la capacidad de la IA para acceder a conocimiento relevante de forma inteligente.
*   **Qué es Google File Search:**
    *   **Sistema RAG Automatizado:** Google File Search es un sistema de Retrieval-Augmented Generation (RAG) completamente gestionado e integrado en la API de Gemini. Automatiza todo el proceso RAG sin necesidad de configurar infraestructura propia (bases de datos vectoriales, pipelines de embeddings, etc.).
    *   **Funcionamiento Básico:**
        1. **Carga de Archivos:** Se suben archivos (PDF, DOCX, TXT, JSON, código fuente) a File Search
        2. **Procesamiento Automático:** El sistema automáticamente:
           - Almacena los archivos
           - Los divide en fragmentos óptimos
           - Genera embeddings usando el modelo Gemini
           - Crea un índice vectorial para búsqueda rápida
        3. **Búsqueda Semántica:** Durante una consulta, File Search:
           - Realiza búsqueda vectorial sobre los archivos indexados
           - Encuentra el contexto más relevante basándose en significado (no solo palabras clave)
           - Inyecta dinámicamente el contexto encontrado en la petición a Gemini
        4. **Generación con Contexto:** Gemini genera respuestas usando el contexto recuperado automáticamente
        5. **Citas Automáticas:** Cada respuesta incluye metadatos que indican qué partes de qué archivos se utilizaron
    *   **Integración Directa:** File Search está integrado directamente en la función `generateContent` de Gemini, por lo que se usa dentro del flujo normal de la API sin necesidad de código adicional complejo.
    *   **Modelo de Costos:** 
        - **Indexación inicial:** $0.15 por millón de tokens (solo se paga una vez al indexar)
        - **Almacenamiento:** Gratis
        - **Consultas:** Gratis (solo se paga por la generación de respuestas de Gemini, como siempre)
*   **Cómo se Integraría en la Aplicación:**
    *   **Integración con Genkit:** Dado que el proyecto ya usa Gemini a través de Genkit (`googleai/gemini-2.5-flash`), la integración sería relativamente directa. File Search se activa añadiendo archivos indexados a las peticiones de `generateContent`.
    *   **Flujo de Integración:**
        1. **Fase de Indexación (Una vez):**
           - Subir archivos de aventuras JSON a File Search
           - Subir manuales de D&D (si están disponibles en formato compatible)
           - El sistema genera embeddings automáticamente
        2. **Fase de Uso (En cada consulta):**
           - Al hacer una petición a Gemini, se especifica qué archivos indexados usar
           - File Search busca automáticamente contexto relevante
           - Gemini genera respuesta con el contexto inyectado
    *   **Código de Ejemplo (Conceptual):**
        ```typescript
        // En lugar de buscar por ID directamente
        const location = adventureData.locations.find(l => l.id === locationId);
        
        // File Search buscaría semánticamente
        const result = await ai.generate({
          model: 'googleai/gemini-2.5-flash',
          prompt: '¿Qué información hay sobre la ubicación donde estamos?',
          files: [adventureFileSearchId], // Archivo indexado en File Search
        });
        // File Search automáticamente encuentra contexto relevante
        ```
*   **Áreas de la Aplicación que se Beneficiarían:**
    *   **1. Búsqueda Semántica en Aventuras JSON:**
        *   **Problema Actual:** El sistema busca ubicaciones, entidades y NPCs por ID exacto. No puede encontrar información basándose en descripciones o contexto.
        *   **Beneficio:** La IA podría hacer preguntas como "¿Qué ubicaciones hay cerca de Phandalin?" o "¿Qué NPCs conocen información sobre el dragón?" y File Search encontraría la información relevante automáticamente.
        *   **Mejora de Herramientas:** `adventure-lookup.ts`, `location-lookup.ts` y `entity-lookup.ts` podrían usar File Search para búsquedas más inteligentes.
    *   **2. Compendio de Reglas de D&D 5e:**
        *   **Problema Actual:** El sistema depende de la API externa de D&D para información de monstruos, hechizos y reglas. Las búsquedas son limitadas y requieren nombres exactos.
        *   **Beneficio:** Indexar manuales oficiales de D&D 5e (Player's Handbook, Monster Manual, Dungeon Master's Guide) permitiría:
           - Búsquedas semánticas de reglas: "¿Cómo funcionan los ataques de oportunidad?"
           - Información detallada de monstruos: "¿Qué habilidades especiales tiene un dragón blanco adulto?"
           - Consultas de hechizos: "¿Qué hechizos de nivel 3 pueden causar daño de fuego?"
        *   **Mejora de Herramientas:** `dnd-api-lookup.ts` podría complementarse o reemplazarse con File Search para búsquedas más flexibles y contextuales.
    *   **3. Búsqueda en Historial de Partida:**
        *   **Problema Actual:** El historial de conversación se mantiene en memoria pero no hay forma de buscar eventos pasados de forma inteligente.
        *   **Beneficio:** Indexar el historial de la partida permitiría:
           - Preguntas como "¿Qué pasó cuando visitamos la posada?"
           - Referencias a eventos pasados para mantener coherencia narrativa
           - Búsqueda de decisiones importantes del jugador
        *   **Mejora de Coherencia:** El DM podría acceder a contexto histórico relevante automáticamente.
    *   **4. Información de Monstruos y Enemigos:**
        *   **Problema Actual:** La información de monstruos viene de la API de D&D, que puede ser limitada o requerir múltiples llamadas.
        *   **Beneficio:** Con manuales indexados, la IA podría:
           - Obtener información completa de monstruos sin llamadas a API
           - Buscar monstruos por características ("monstruos voladores de CR 5-10")
           - Acceder a lore y descripciones detalladas de criaturas
    *   **5. Consulta de Hechizos y Magia:**
        *   **Problema Actual:** Información de hechizos limitada a lo que proporciona la API.
        *   **Beneficio:** Indexar información de hechizos permitiría:
           - Búsquedas semánticas: "hechizos que pueden curar" o "hechizos de ilusión de nivel 2"
           - Información completa de componentes, duración, alcance
           - Descripciones detalladas de efectos
    *   **6. Mejora de Narración Contextual:**
        *   **Problema Actual:** El DM tiene acceso limitado al contexto de la aventura y debe buscar información manualmente.
        *   **Beneficio:** File Search permitiría al DM acceder automáticamente a:
           - Información relevante sobre ubicaciones actuales
           - Historia y lore relacionado con la situación actual
           - Detalles de NPCs y sus relaciones
           - Eventos pasados relevantes
*   **Ventajas de la Integración:**
    *   ✅ **Sin Infraestructura Propia:** No requiere configurar bases de datos vectoriales, pipelines de embeddings, o servidores de búsqueda
    *   ✅ **Integración Simple:** Se integra directamente con Gemini API que ya se usa en el proyecto
    *   ✅ **Búsqueda Semántica Potente:** Encuentra información basándose en significado, no solo palabras clave
    *   ✅ **Citas Automáticas:** Cada respuesta indica qué partes de qué archivos se usaron, facilitando verificación
    *   ✅ **Costos Bajos:** Solo se paga por indexación inicial ($0.15/millón tokens), almacenamiento y consultas son gratuitas
    *   ✅ **Escalabilidad:** Gestionado por Google, se beneficia de su infraestructura
    *   ✅ **Soporte JSON:** Compatible con archivos JSON de aventuras
*   **Consideraciones:**
    *   ⚠️ **Dependencia de Google:** Añade otra dependencia de servicios de Google
    *   ⚠️ **Latencia Potencial:** La búsqueda + generación puede añadir latencia (aunque File Search está optimizado)
    *   ⚠️ **Límites de Tamaño:** Puede haber límites en el tamaño de archivos que se pueden indexar
    *   ⚠️ **Costos de Indexación:** Aunque bajo, indexar muchos archivos grandes puede tener costos iniciales
*   **Relacionado con:**
    *   Roadmap #8 (Compendio de D&D Local) - File Search podría ser una alternativa o complemento
    *   Roadmap #10 (Calidad y Profundidad de la IA) - Mejora significativa del sistema RAG mencionado
    *   Issue #126 (Revisión Sistema de Carga de Aventuras) - Podría mejorar búsqueda en aventuras cargadas
*   **Impacto Estratégico:** 
    *   **Transformacional para la IA:** Convierte al DM de un "lector de fichas" a un verdadero conocedor del universo del juego, capaz de acceder a información relevante de forma inteligente y contextual.
    *   **Mejora de Precisión:** Respuestas más precisas y basadas en información real de los manuales y aventuras.
    *   **Reducción de Dependencias:** Potencialmente reduce dependencia de APIs externas para información de D&D.
    *   **Base para Mejoras Futuras:** Sienta las bases para sistemas más avanzados de memoria y contexto a largo plazo.
*   **Plan Detallado:** ❌ No creado
*   **Referencia:** 
    - [Google File Search Documentation](https://ai.google.dev/gemini-api/docs/file-search)
    - [Google Blog - File Search Announcement](https://blog.google/technology/developers/file-search-gemini-api/)
    - Relacionado con Roadmap #10 (Calidad y Profundidad de la IA - RAG)

---

## 🟡 Prioridad Media

Mejoras importantes que mejoran la calidad, profundidad y fidelidad del juego, pero no son críticas para la funcionalidad básica.

### 8. Ajuste Dinámico de Longitud de Narración ✅ COMPLETADO {#8-ajuste-dinámico-de-longitud-de-narración-completado}
*   **Problema Actual:** Las narraciones del DM tenían una longitud fija y a veces resultaban repetitivas o demasiado largas para acciones simples, o demasiado cortas para momentos importantes.
*   **Mejora Implementada:** ✅
    *   ✅ **Detección de Momentos Clave:** El sistema identifica automáticamente cambios de ubicación, muertes de entidades y descansos.
    *   ✅ **Narración Adaptativa:**
        *   **Estándar:** 2-3 frases para acciones rutinarias.
        *   **Clave:** 3-4 frases para momentos importantes, con mayor carga descriptiva.
    *   ✅ **Integración Profunda:** La lógica se propaga desde el `NarrativeTurnManager` hasta los expertos de `Exploration` e `Interaction`.
*   **Impacto:**    - Mejora el ritmo del juego (menos texto en rutina, más en momentos importantes).
    - Aumenta la inmersión en transiciones y eventos dramáticos.
    - Reduce la fatiga de lectura del jugador.
*   **Estado:** ✅ **COMPLETADO** - Implementado y verificado (2025-11-26)

---

### 9. Sistema de Tablas Aleatorias en JSON ✅ COMPLETADO {#9-sistema-de-tablas-aleatorias-en-json-completado}
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

### 10. Sistema de Mundo Persistente {#10-sistema-de-mundo-persistente}
*   **Problema Actual:** El mundo del juego no persiste cambios entre sesiones. Cuando los jugadores derrotan enemigos, interactúan con objetos, o modifican el estado del mundo, estos cambios se pierden al recargar la partida o al volver a una ubicación. El sistema actual mantiene los enemigos derrotados en el estado del juego, pero no actualiza el `locationContext` original, lo que puede causar inconsistencias narrativas.
*   **Mejora Propuesta:**
    *   **Sistema de Estado del Mundo:** Implementar un sistema que rastree y persista cambios en el mundo del juego (enemigos derrotados, objetos recogidos, puertas abiertas/cerradas, NPCs con actitudes modificadas, etc.)
    *   **`AdventureUpdateState` - Registro de Cambios por Localización:** La idea central es tener un `AdventureUpdateState` (o similar) que registre cada cambio que se produzca en cada localización de la aventura original. Este sistema funcionaría como un "diff" o registro incremental de modificaciones:
        *   **Registro Incremental:** Cada vez que ocurre un cambio en una localización (enemigo derrotado, objeto recogido, puerta abierta, etc.), se registra en el `AdventureUpdateState` asociado a esa localización
        *   **Lectura Combinada:** Cuando sea necesario leer información de la aventura original, el sistema leerá primero los datos base de la localización y luego aplicará los cambios registrados en `AdventureUpdateState` para obtener una visión actualizada del mundo
        *   **Persistencia Separada:** El `AdventureUpdateState` se guarda junto con el estado del jugador, manteniendo la aventura original intacta y permitiendo múltiples partidas con diferentes estados del mundo
    *   **Actualización de LocationContext:** Cuando el estado del mundo cambia (ej: enemigos derrotados), el `AdventureUpdateState` se actualiza y se aplica al `locationContext` original para reflejar estos cambios. Esto asegura que el DM siempre tenga información correcta sobre el estado actual de cada ubicación.
    *   **Persistencia entre Sesiones:** Los cambios en el mundo deben persistir entre sesiones de juego, guardándose en el archivo de partida junto con el estado del jugador.
    *   **Sistema de Entidades Dinámicas:** Las entidades (enemigos, NPCs, objetos) deben tener estados que puedan cambiar (vivo/muerto, presente/ausente, hostil/amistoso, etc.) y estos estados deben persistir en el `AdventureUpdateState`.
    *   **Filtrado Inteligente:** El sistema debe filtrar automáticamente entidades muertas o ausentes del `locationContext` antes de pasarlo al `narrativeExpert`, pero mantener la información de cadáveres para narración contextual.
    *   **Sistema de Marcadores de Estado:** Implementar marcadores de estado para ubicaciones (ej: "combate_reciente", "sangre_en_suelo", "cadáveres_presentes") que el DM pueda usar para generar narraciones contextuales.
*   **Componentes Técnicos:**
    *   **`AdventureUpdateState`:** Estructura de datos que registra cambios por localización. Formato: `Record<locationId, LocationUpdateState>` donde cada `LocationUpdateState` contiene:
        *   Cambios en entidades (enemigos muertos, NPCs con actitud modificada, objetos recogidos/colocados)
        *   Cambios en el entorno (puertas abiertas/cerradas, trampas activadas/desactivadas)
        *   Marcadores de estado (eventos recientes, efectos visuales, etc.)
    *   **WorldStateManager:** Módulo que gestiona el estado del mundo, rastreando cambios y actualizando `AdventureUpdateState` dinámicamente
    *   **AdventureStateMerger:** Módulo que combina los datos base de la aventura original con el `AdventureUpdateState` para generar la visión actualizada del mundo
    *   **EntityStateTracker:** Sistema que rastrea el estado de cada entidad (HP, posición, actitud, etc.) y lo registra en `AdventureUpdateState`
    *   **LocationStateUpdater:** Módulo que actualiza el `locationContext` basándose en el `AdventureUpdateState` aplicado a los datos originales
    *   **PersistentWorldStorage:** Sistema de almacenamiento que guarda y carga el `AdventureUpdateState` junto con el estado del jugador
*   **Beneficios:**
    *   ✅ **Consistencia Narrativa:** El DM siempre describe el mundo correctamente, sin mencionar enemigos muertos como vivos
    *   ✅ **Inmersión Mejorada:** Los cambios en el mundo persisten, haciendo que las acciones del jugador tengan consecuencias duraderas
    *   ✅ **Narración Contextual:** El DM puede referenciar eventos pasados (cadáveres, sangre, destrucción) en descripciones futuras
    *   ✅ **Mundo Vivo:** El mundo se siente más real y reactivo a las acciones del jugador
*   **Relacionado con:**
    *   Issue #117 (Simplificación de Arquitectura de Combate) - El sistema actual mantiene enemigos en estado pero no actualiza locationContext
    *   Sistema de Guardado de Partidas - Necesita expandirse para incluir estado del mundo
    *   Sistema de Progresión (Roadmap #2) - Base para un sistema de campaña duradera
*   **Impacto:** Alto - Fundamental para crear un mundo coherente y persistente que reaccione a las acciones del jugador. Mejora significativamente la inmersión y la sensación de que las acciones tienen consecuencias.
*   **Plan Detallado:** ❌ No creado
### 12. Compendio de D&D Local - Base de Datos Local {#12-compendio-de-dd-local---base-de-datos-local}
*   **Problema Actual:** El sistema depende completamente de la API externa de D&D 5e para obtener información sobre monstruos, hechizos, reglas, etc. Esto causa latencia, dependencia de conectividad, y múltiples llamadas redundantes a la API.
*   **Mejora Propuesta:**
    *   **Base de Datos Local:** Crear un sistema de base de datos local (SQLite recomendado) que almacene un compendio completo de conocimiento de D&D (fichas de monstruos, reglas, razas, clases, hechizos, equipamiento, etc.).
    *   **Sistema de File Search:** Implementar un sistema de búsqueda en archivos locales que permita tener un compendio local de reglas y monstruos basados en los libros oficiales de D&D. Esto permitiría búsquedas rápidas y offline de información de D&D sin depender de APIs externas.
    *   **Sistema de Múltiples Fuentes:** Arquitectura modular de "proveedores" que permite usar múltiples fuentes de datos (D&D 5e API, Open5e API, archivos estáticos, datos personalizados, file search local). El sistema intentará cada fuente según prioridad hasta encontrar los datos.
    *   **Búsqueda Inteligente:** El sistema buscará primero en la base de datos local y archivos locales. Si no encuentra la información, la obtendrá de las fuentes configuradas y la añadirá automáticamente a la base de datos para futuras consultas.
    *   **Búsqueda Fuzzy:** Implementar búsqueda tolerante a errores de escritura y por alias/nombres alternativos.
    *   **Sistema de Fallback:** Si una fuente falla, el sistema intentará con la siguiente fuente configurada. Si todas fallan, funcionará completamente con la base de datos local (modo offline).
    *   **Sincronización Automática:** Sistema de sincronización periódica para mantener los datos actualizados desde las fuentes configuradas.
    *   **Extensibilidad:** Fácil añadir nuevas fuentes de datos mediante la arquitectura de proveedores.
*   **Impacto Estratégico:** 
    *   **Rendimiento:** Consultas locales mucho más rápidas (< 50ms vs 200-500ms de API)
    *   **Disponibilidad:** Funciona incluso si la API está caída o hay problemas de conectividad
    *   **Eficiencia:** Reduce significativamente las llamadas a la API externa (80%+ de reducción esperada)
    *   **Base para RAG:** Esta infraestructura sentará las bases para futuras implementaciones de RAG y búsqueda semántica
*   **Plan Detallado:** ✅ [Compendio de D&D Local](../planes-desarrollo/sin-comenzar/compendio-dnd-local.md)

### 13. IA Conversacional Avanzada {#13-ia-conversacional-avanzada}
*   **Problema Actual:** Los compañeros de IA reaccionan de forma aislada a la acción del jugador, sin ser conscientes de lo que los otros compañeros han dicho en el mismo turno. El flujo es secuencial y el servidor devuelve todos los mensajes a la vez.
*   **Mejora Propuesta:**
    *   **Arquitectura de Streaming:** Reemplazar el modelo actual de "una petición, una respuesta" por una comunicación persistente entre el cliente y el servidor (usando, por ejemplo, WebSockets o Server-Sent Events).
    *   **Flujo de Turno por Pasos:** El servidor generaría y enviaría los mensajes uno por uno, permitiendo que las reacciones de los compañeros se construyan sobre las reacciones de los demás en tiempo real.
*   **Impacto:** Lograría una dinámica de grupo mucho más orgánica y creíble, mejorando significativamente la inmersión.
*   **Plan Detallado:** ❌ No creado

### 14. Calidad y Profundidad de la IA {#14-calidad-y-profundidad-de-la-ia}
*   **Mejora Propuesta: Implementación de RAG (Retrieval-Augmented Generation)**
    *   **Estado Actual:** La IA recupera información del mundo (lore, personajes) mediante búsquedas directas en archivos JSON por ID. No "comprende" el contexto, solo busca datos.
    *   **Salto Evolutivo:** Migrar a un sistema RAG donde el lore se almacena en una base de datos vectorial. Esto permitiría a herramientas como `narrativeExpert` hacer preguntas en lenguaje natural (ej: "¿Cuál es la historia de la Vieja Atalaya?", "¿Qué sabe Elara sobre el dragón Cryovain?").
    *   **Impacto Estratégico:** Transformacional. Convertiría al DM de un mero "lector de fichas" a un verdadero conocedor del universo del juego, capaz de improvisar detalles coherentes, conectar eventos y responder a la curiosidad del jugador de forma profunda.

*   **Mejora Propuesta: Memoria a Largo Plazo**
    *   **Problema:** La IA no recuerda eventos clave entre sesiones.
    *   **Solución:** Implementar un sistema para que la IA resuma y almacene los eventos y decisiones más importantes en una base de datos persistente. Este resumen se añadiría al contexto de la IA en futuras sesiones.
    *   **Impacto:** Aumentaría la coherencia y la continuidad de la narrativa a lo largo de una campaña.

*   **Mejora Propuesta: Tool de Resumen de Contexto de Combate**
    *   **Problema Actual:** Las narraciones de combate (especialmente las generadas por `combat-narration-expert`) no tienen contexto sobre el estado actual del combate, eventos recientes, o el estado de salud de los combatientes. Esto limita la capacidad de generar narraciones coherentes y contextualmente relevantes.
    *   **Mejora Propuesta:**
        *   **Crear `combat-context-summarizer.ts`:** Un nuevo tool especializado que analice el historial del combate y genere un resumen estructurado del contexto.
        *   **Resumen Estructurado:** El tool generaría un resumen que incluya:
            *   Estado actual de la batalla (ubicación, número de combatientes)
            *   Estado de salud de aliados y enemigos (saludable, herido, gravemente herido)
            *   Eventos recientes importantes (muertes, KOs, críticos, pifias)
            *   Flujo narrativo del combate (quién ha atacado a quién, tendencias)
        *   **Integración con Narración:** Este resumen se pasaría a `combat-narration-expert` como contexto, permitiendo generar narraciones que:
            *   Referencien eventos recientes de forma coherente
            *   Ajusten el tono según el estado del combate (urgente si aliados heridos, confiado si ganando)
            *   Mantengan continuidad narrativa entre turnos
        *   **Reutilizable:** El tool podría usarse también para otros sistemas que necesiten contexto de combate (tácticas de IA, reacciones de compañeros, etc.)
    *   **Impacto:** Mejora significativa en la calidad y coherencia de las narraciones de combate, aumentando la inmersión y haciendo que cada acción se sienta parte de un flujo narrativo continuo.
    *   **Relacionado con:** Issue #79 (Narraciones de combate para turnos del jugador)

*   **Mejora Propuesta: Narración Unificada para Todos los Turnos** ✅ PARCIALMENTE IMPLEMENTADO
    *   **Problema Actual:** Solo el turno del jugador utilizaba `combat-narration-expert`. Los tacticians (`enemyTacticianTool` y `companionTacticianTool`) generaban narraciones de intención por su cuenta y no contaban con narración de resolución, lo que producía diferencias de estilo y calidad narrativa entre turnos.
    *   **Mejora Implementada:** ✅
        *   ✅ **TurnProcessor Unificado:** Con la refactorización del Issue #117, el `TurnProcessor` ahora usa `combat-narration-expert` para todos los turnos (jugador e IA) en ambos momentos (intención y resolución).
        *   ✅ **Tacticians Simplificados:** Los tacticians ahora se enfocan únicamente en decidir la acción táctica (target, intención), delegando toda narración en `combat-narration-expert` a través del `TurnProcessor`.
        *   ✅ **Narrativa Consistente:** Enemigos, compañeros y jugador comparten el mismo tono narrativo y reglas de estilo.
        *   ✅ **Hooks de Intención/Resolución:** El `TurnProcessor` maneja ambos momentos del turno (pre-roll / post-roll) de forma unificada.
    *   **Estado:** ✅ **PARCIALMENTE IMPLEMENTADO** - La arquitectura unificada del Issue #117 implementa esta mejora. Pendiente: Tool de resumen de contexto de combate (`combat-context-summarizer`) para mejorar aún más la calidad narrativa.
    *   **Impacto:** Consistencia narrativa total en el combate, reducción de lógica duplicada en tacticians y posibilidad de aplicar mejoras de narración (como el contexto resumido) a todos los turnos por igual.
    *   **Relacionado con:** 
        - Issue #79 (Narraciones de combate para turnos del jugador) ✅ RESUELTO
        - Issue #14 (AI Tacticians output inválido/null) ✅ RESUELTO
        - Issue #117 (Simplificación de Arquitectura de Combate) ✅ RESUELTO - Implementa esta mejora
        - Issue #94 (Refactorización de Prompts de Tacticians) - Mejora adicional pendiente
*   **Plan Detallado:** ❌ No creado (parcialmente implementado por Issue #117)

### 12. Separación de IDs de Fichas de Personajes {#12-separación-de-ids-de-fichas-de-personajes}
*   **Problema Actual:** Las fichas de personajes (`initial-party.ts`) incluyen IDs hardcodeados (ej: `id: "1"`, `id: "6"`, `id: "3"`). Esto mezcla datos de ficha (stats, habilidades, inventario) con metadatos del sistema (IDs para identificación interna). Las fichas deberían ser datos puros y portables, mientras que los IDs son una necesidad interna del procesamiento del juego.
*   **Nota:** La party inicial ya ha sido separada en `src/lib/initial-party.ts` (2025-01-23), preparando el terreno para esta mejora.
*   **Mejora Propuesta:**
    *   **Separación de Responsabilidades:** Crear una distinción clara entre `CharacterSheet` (ficha pura sin IDs) y `Character` (personaje en juego con ID generado).
    *   **Sistema de Generación Automática de IDs:** Implementar un sistema que genere IDs automáticamente al cargar/crear personajes desde fichas. Los IDs podrían ser:
        *   UUIDs únicos para máxima garantía de unicidad
        *   Hashes basados en nombre + timestamp para IDs determinísticos pero únicos
        *   IDs secuenciales generados por el sistema al inicializar
    *   **Fichas Portables:** Las fichas serían archivos JSON puros con solo datos del personaje, sin dependencias de IDs específicos del sistema.
    *   **Compatibilidad Gradual:** Mantener soporte para fichas con IDs existentes durante la transición, generando IDs automáticamente si faltan.
*   **Ventajas:**
    *   **Fichas más puras:** Solo contienen datos del personaje (stats, habilidades, inventario)
    *   **Portabilidad:** Las fichas son reutilizables sin depender de IDs específicos
    *   **Menos errores:** Evita IDs duplicados o inconsistentes
    *   **Mantenibilidad:** Los IDs se gestionan en un solo lugar
    *   **Flexibilidad:** Permite cambiar el sistema de IDs sin tocar las fichas
*   **Impacto:** Mejora significativa de la arquitectura del código, facilita el mantenimiento y la portabilidad de fichas, y reduce la posibilidad de errores relacionados con IDs inconsistentes.
*   **Contexto:** Detectado durante Test 4.5 (IDs de Personajes No Consecutivos) al analizar la estructura de datos de personajes.
*   **Estado:** 📝 Documentado como mejora futura - No implementado
*   **Plan Detallado:** ❌ No creado

### 13. Sistema de Comprobación de Competencia en Tiradas {#13-sistema-de-comprobación-de-competencia-en-tiradas}
*   **Problema Actual:** El sistema aplica siempre el bonus de competencia (proficiency bonus) en las tiradas de ataque y otras tiradas, independientemente de si el personaje es competente o no en el arma, habilidad o herramienta que está usando. Por ejemplo, Galador usando un arco recibe el bonus de competencia aunque no tenga competencia con arcos.
*   **Mejora Propuesta:**
    *   **Añadir Información de Competencias a Fichas:** Las fichas de personajes deben incluir información sobre las competencias del personaje (armas simples, armas marciales, armas específicas, herramientas, habilidades, etc.). Esta información debe estar estructurada y accesible para el sistema de combate.
    *   **Sistema de Comprobación de Competencia:** Antes de aplicar el bonus de competencia en cualquier tirada (ataque, habilidad, herramienta), el sistema debe verificar si el personaje tiene competencia en:
        *   **Armas:** Verificar competencia con el tipo de arma (simple, marcial) o arma específica usada
        *   **Habilidades:** Verificar competencia en la habilidad específica (Atletismo, Sigilo, etc.)
        *   **Herramientas:** Verificar competencia con la herramienta específica usada
    *   **Aplicación Condicional del Bonus:** Solo aplicar el bonus de competencia si el personaje es competente. Si no es competente, la tirada solo debe usar el modificador de característica correspondiente.
    *   **Integración con CombatActionResolver:** El `CombatActionResolver` debe verificar la competencia antes de calcular el `attackBonus` (abilityMod + proficiencyBonus).
    *   **Integración con Sistema de Habilidades:** Extender el sistema para verificar competencias en tiradas de habilidades fuera de combate.
*   **Impacto:** Mayor fidelidad a las reglas de D&D 5e, mejor balance de combate (personajes no competentes no deberían tener el mismo bonus), y más importancia a las elecciones de competencias durante la creación de personajes.
*   **Plan Detallado:** ❌ No creado
*   **Referencia:** 
    - Relacionado con Issue #121 (Fix Weapon Parsing) - El sistema ya identifica qué arma se usa
    - Relacionado con Roadmap #12 (Mejoras de Mecánicas de D&D 5e) - Parte del sistema completo de mecánicas

### 14. Mejoras de Mecánicas de D&D 5e {#14-mejoras-de-mecánicas-de-dd-5e}
*   **Estado Actual:** El sistema implementa las mecánicas básicas de D&D 5e, pero algunas reglas avanzadas están simplificadas o pendientes.
*   **Mejoras Propuestas:**
    *   **Sistema Completo de Saving Throws:** Actualmente los hechizos con saving throws aplican daño automáticamente. Implementar cálculo de Spell Save DC, tirada de salvación del objetivo, y regla de mitad de daño si acierta.
    *   **Sistema de Death Saving Throws:** Implementar tiradas de salvación de muerte automáticas, sistema de estabilización, y tracking de éxitos/fallos según reglas oficiales de D&D 5e.
    *   **Estados y Condiciones:** Sistema completo para estados temporales (aturdido, envenenado, paralizado, etc.) y actualización de estadísticas. Incluye actualización de stats temporales (bonificadores, penalizaciones), estados de condición, y recursos gastados (slots de hechizo, usos de habilidades).
    *   **Ataques Múltiples:** Gestión correcta de múltiples ataques por turno y reglas de interrupción cuando un ataque mata al objetivo. Verificar si se detiene el ataque o continúa con los demás ataques cuando el primero mata al objetivo.
    *   **Sistema de Foco de Objetivo:** Selección inteligente de objetivos que considere distancia (cuerpo a cuerpo vs a distancia), amenaza táctica, estado del objetivo (herido, vulnerable), y capacidades del atacante (alcance de armas/hechizos).
    *   **Sistema de Distancia y Proximidad:** Detectar si un personaje está cuerpo a cuerpo con un enemigo. Tiene repercusiones importantes: ataques de oportunidad, restricciones de movimiento, bonus/malus a tiradas según distancia, y rangos de hechizos.
    *   **Sistema de Gestión de Acciones:** Revisar e implementar correctamente acciones normales (1 por turno), acciones bonus (1 por turno), reacciones (fuera de tu turno), y acciones extras (por habilidades especiales). Aplicar reglas de D&D 5e para cada tipo de acción.
    *   **Sistema de Ventaja y Desventaja:** Implementar las tiradas de ventaja y desventaja para los modos de combate, exploración e interacción. El sistema debe aplicar correctamente las reglas de D&D 5e para ventaja/desventaja y considerar todas las fuentes posibles (condiciones, hechizos, habilidades, etc.).
    *   **Movimiento y Acción Adicional en Combate:** Implementar el movimiento y la acción adicional en el combate según las reglas de D&D 5e. Los personajes deben poder moverse y realizar acciones en su turno, respetando las limitaciones de movimiento (velocidad, terreno difícil, etc.).
    *   **Acciones Completas en Combate:** Implementar todas las acciones disponibles en combate según D&D 5e: Atacar, Lanzar conjuro, Esquivar, Destrabarse, Ayudar, Moverse, Correr, Preparar una acción, Buscar, Usar un objeto, Esconderse. Cada acción debe tener sus propias reglas y validaciones.
    *   **Sistema de Tipos de Daño:** Implementar diferentes tipos de daño (físicos: cortante, contundente, perforante; elementales: fuego, hielo, eléctrico, ácido; energéticos: radiante, necrótico, psíquico; especiales: veneno, fuerza). Incluir resistencias, vulnerabilidades e inmunidades.
    *   **Sistema Completo de Magia:** Implementar todo lo referente a slots de conjuros (slots por nivel de hechizo, conjuros conocidos, conjuros preparados, reglas específicas por clase, recuperación de slots). Gestión completa de magia en combate y narración con detección de objetivos válidos, cálculo de tiradas de salvación, áreas de efecto, y duración de efectos.
    *   **Sistema de Acciones Detallado para el Jugador:** En el turno del jugador, si hace un ataque debería especificar tipo de acción (ataque con arma, hechizo, movimiento, etc.), objetivo (si es necesario), y detalles específicos (qué arma, qué hechizo, etc.). El sistema debe validar si se define correctamente y el DM debe preguntar al jugador para aclarar si no está claro.
    *   **Aceptar Más Acciones en Turno del Jugador:** Durante el turno del jugador en combate, aceptar más acciones que solo atacar. Actualmente si el jugador dice algo como "suelto mi arma" o "no hago nada", el DM no lo entiende. El sistema debe reconocer y procesar diferentes tipos de acciones del jugador.
    *   **Narración de Arma Usada en Ataques:** Durante el combate el DM debería narrar con qué arma se realiza el ataque. Si el jugador o la IA de compañero no lo especifica, el DM debería preguntarle qué arma usa. Mejoraría la claridad narrativa y la inmersión.
    *   **Gestión de Ataques a Compañeros Inconscientes:** Revisar cómo se gestionan los ataques de los enemigos a compañeros inconscientes para rematarlos. Verificar que se aplican correctamente las reglas de D&D 5e sobre ataques a criaturas inconscientes.
    *   **Consecuencias de Atacar a Compañero en Combate:** Definir qué pasa cuando en medio de un combate el jugador decide atacar a uno de sus compañeros. ¿Se vuelve hostil solo él, todos los compañeros, o cómo reacciona el grupo? Definir la lógica de reacciones ante conflictos internos en combate.
    *   **Sistema de Combate entre Compañeros:** Implementar lógica para manejar combate PvP y reacciones de otros compañeros ante conflictos internos. ¿Qué pasa si el jugador decide atacar a uno de sus compañeros de aventura, o si en una conversación uno de ellos decide atacarle a él? ¿Qué harán los demás compañeros?
    *   **Diálogo en Turnos de Combate:** Permitir que compañeros y enemigos "hablen" en sus turnos, al igual que el jugador (que puede hablar como su personaje o describir su acción). Cada turno debería incluir: acción del personaje, posible diálogo/reacción del personaje, y descripción/narración del DM.
    *   **Diálogo Narrativo de Compañeros en Combate:** Implementar la opción de que en combate, los compañeros puedan expresarse narrativamente. Evaluar si solo en su turno o en cualquier turno.
    *   **Narración Post-Combate:** El DM debe hacer una narración con las consecuencias y un breve resumen al finalizar cada combate para continuar con la historia.
    *   **Sistema de Pifias y Críticos Narrativos:** Implementar un sistema para pifias y críticos donde el DM las identifique y les dé una narración especial con alguna consecuencia creativa. Ejemplos: Pifia: un compañero pierde su arma o le da a otro compañero sin querer. Crítico: el ataque es especialmente destructivo, o si es una prueba de habilidad el éxito es especialmente efectivo.
    *   **Verificar Reglas de Persuasión en Combate:** Comprobar en las reglas de D&D 5e si en modo combate el jugador puede intentar persuadir a un enemigo.
    *   **Niveles de Dificultad en Combates:** Implementar niveles de dificultad en los combates: Enemigos con más HP, IAs más inteligentes, etc. El sistema debe permitir ajustar la dificultad de los encuentros para adaptarse a diferentes niveles de desafío. Puede incluir modificadores a las estadísticas de enemigos o mejoras en la inteligencia táctica de la IA.
    *   **Sistema de Consumibles para Armas:** Al usar armas como un arco que necesita flechas, implementar un sistema de uso de consumibles para que cada ataque descuente 1 flecha del inventario. Si no hay flechas disponibles, el sistema no debe permitir hacer el ataque. Esto aplica a todas las armas que requieren munición (arcos, ballestas, hondas, etc.) y debe gestionarse automáticamente durante el combate.
*   **Impacto:** Mayor fidelidad a las reglas oficiales de D&D 5e, mejor balance de combate, opciones tácticas más ricas, y combate más narrativo e inmersivo.
*   **Plan Detallado:** ✅ Parcial (solo Death Saving Throws) - [Sistema de Death Saving Throws](../planes-desarrollo/sin-comenzar/sistema-death-saving-throws.md)
*   **Documentación:** 
    *   [Issues Tracker - Issue #22](../tracking/issues/pendientes.md#issue-22-sistema-completo-de-saving-throws-tiradas-de-salvación-del-objetivo-feature-incompleta)
    *   [Notas de Gael - #04, #10, #12, #13, #23, #24, #25, #26, #27, #36, #37, #38, #40, #45, #53, #68, #70, #71, #72, #121, #4](../notas/Notas%20de%20Gael.md)

### 15. Separación de IDs de Fichas de Personajes {#15-separación-de-ids-de-fichas-de-personajes}
*   **Problema Actual:** Los IDs de las fichas de personajes están acoplados a sus nombres, lo que dificulta el manejo de múltiples instancias del mismo tipo de enemigo o personaje.
*   **Mejora Propuesta:** Implementar un sistema de IDs únicos (UUIDs) para cada instancia de personaje, separando la identidad única de la definición del arquetipo.
*   **Impacto:** Necesario para manejar combates complejos y persistencia de estado correctamente.

### 16. Sistema de Comprobación de Competencia en Tiradas {#16-sistema-de-comprobación-de-competencia-en-tiradas}
*   **Problema Actual:** El sistema asume competencia en tiradas de salvación y habilidades basándose en reglas simples o hardcodeadas.
*   **Mejora Propuesta:** Implementar un sistema robusto que verifique las competencias (proficiencies) reales de la ficha del personaje antes de calcular los modificadores de tirada.
*   **Impacto:** Mayor fidelidad a las reglas de D&D 5e.

### 17. Mejoras de Mecánicas de D&D 5e {#17-mejoras-de-mecánicas-de-dd-5e}

#### 17.1. Información de Dados de Daño de Armas en Fichas {#171-información-de-dados-de-daño-de-armas-en-fichas}
*   **Problema Actual:** La información sobre el daño de las armas (ej: "1d8 slashing") no siempre está estructurada o disponible en la ficha del personaje de forma que el sistema de combate pueda usarla automáticamente.
*   **Mejora Propuesta:** Estandarizar la estructura de datos de armas en las fichas de personajes para incluir explícitamente el dado de daño, tipo de daño y propiedades.
*   **Impacto:** Automatización real del cálculo de daño en combate.

### 18. Actualización Automática de Fichas desde Archivos JSON {#18-actualización-automática-de-fichas-desde-archivos-json}
*   **Problema Actual:** Si se actualiza el archivo JSON de una aventura (ej: corrigiendo stats de un monstruo), los cambios no se reflejan automáticamente en las partidas guardadas o en el estado en memoria.
*   **Mejora Propuesta:** Implementar un sistema de "hot-reload" o sincronización que actualice las definiciones de entidades en memoria cuando detecte cambios en los archivos fuente.
*   **Impacto:** Facilita enormemente el desarrollo y corrección de aventuras sin reiniciar el servidor.

### 19. Convertidor de PDF a JSON - Aplicación Auxiliar {#19-convertidor-de-pdf-a-json---aplicación-auxiliar}
*   **Problema Actual:** Crear nuevas aventuras requiere escribir manualmente archivos JSON enormes, lo cual es propenso a errores y lento.
*   **Mejora Propuesta:** Crear una herramienta (CLI o Web) que ayude a convertir texto de aventuras en PDF al formato JSON estructurado que usa el sistema, posiblemente usando IA para el parseo inicial.
*   **Impacto:** Acelera drásticamente la creación de nuevo contenido.

### 20. Música y Sonido Dinámicos {#20-música-y-sonido-dinámicos}
*   **Problema Actual:** La experiencia es puramente textual/visual.
*   **Mejora Propuesta:** Integrar un sistema de audio que reproduzca música de fondo y efectos de sonido (ambientales, combate, éxito/fallo) según el contexto narrativo y la ubicación.
*   **Impacto:** Inmersión total.

---

## 🟢 Prioridad Baja

Mejoras de calidad de vida y características adicionales que mejoran la experiencia pero no son esenciales.

### 18. Mejoras de Interfaz de Usuario {#18-mejoras-de-interfaz-de-usuario}
*   **Mejoras Propuestas:**
    *   **Mejorar Input del Jugador Durante su Turno:** Cuando es el turno del jugador, el input debería mostrar "Es tu turno ¿Qué haces?" y posiblemente sugerir acciones disponibles (atacar, moverse, usar objeto, lanzar hechizo).
    *   **Mostrar Nombre de la Aventura:** La ventana del juego debería mostrar el nombre de la aventura que se está jugando en la barra superior/header.
    *   **Menú de Selección de Aventuras JSON:** El botón "Cargar Aventura JSON" debería desplegar un menú con las aventuras disponibles en la carpeta JSON_adventures. Conservar también la opción de cargar desde el sistema de archivos.
    *   **Reestructurar Panel DebugLog:** Mostrar solo logs esenciales para el desarrollo de la partida. En combate, cada log debe mostrar el personaje al que pertenece. Deben ser más sencillos y legibles que los logs de la terminal.
    *   **Historial de Comandos en Input:** En el input de texto para dar las acciones del personaje implementar un sistema para recuperar órdenes ya dadas. Usando la tecla de flecha arriba mientras estamos en este cuadro se recuperarían los mensajes anteriores, del más reciente al más antiguo.
    *   **Integrar Botones de Avance de Turnos:** En el combate turno a turno, los botones de "avanzar 1 turno" y "avanzar todos" quizás deberían estar integrados en el panel de Orden de combate. Mejoraría la organización visual y la accesibilidad de estas funciones.
    *   **Resaltar Turno del Jugador:** En el combate turno a turno, cuando llega el turno del jugador, hay que hacer un resalte de alguna forma para avisar de que es el turno del jugador. Mejoraría la claridad y evitaría que el jugador se pierda en el orden de turnos.
    *   **Mejorar Colores en Panel de Tiradas:** En el panel de Tiradas hay que darle un nuevo color a las tiradas de curación. Buscar otros colores para otros tipos de tiradas para mejorar la diferenciación visual.
    *   **Revisar Formateo de Texto en Mensajes:** Revisar el formateo del texto en los mensajes del DM y de los Compañeros. Mejorar la presentación visual y legibilidad de los mensajes. Sistematizar el formateo para que sea consistente en todos los mensajes.
    *   **Revisión Completa de la UI:** Hacer una revisión completa de la UI. Evaluar consistencia, usabilidad y mejoras generales de la interfaz.
    *   **Botón de Configuración:** Implementar un botón de configuración al lado del botón para ir al menú inicial, permitiendo configurar cosas como el modelo LLM en uso, la voz de DM, guardado automático, etc.
    *   **Mensaje de Victoria/Derrota al Finalizar Combate:** Al finalizar un combate, el panel de Tiradas podría mostrar un mensaje de victoria o derrota y que el combate ha finalizado, mejorando el feedback visual al concluir un encuentro.
    *   **Cambiar Texto de Botones de Avanzar Turnos:** Los botones de avanzar turnos deberían poner "Avanzar 1 turno" y "Avance automático" para mejorar la claridad de las acciones disponibles.
    *   **Botón de Pausa en Avance Automático:** En combate, después de pulsar el botón de avanzar todos, mientras el botón esté en "Avanzando...", el otro botón debería convertirse en un botón de pausa para detener el avance automático de turnos.
    *   **Sistema de Equipamiento con Límites y Validación:** Las fichas de los personajes deberían incluir en la parte de equipamiento qué elementos están equipados o no. Los elementos equipados deberían seguir un esquema del que no se pueden salir, por ejemplo: 2 anillos máximo, 1 botas máximo, 2 armas máximo, etc. Tener en cuenta armas a 2 manos y versátiles, etc.
    *   **Sistema de Peso de Inventario y Capacidad de Carga:** Implementar peso de inventario, peso de cada item y el concepto de estar cargado y sus consecuencias. El sistema debe calcular el peso total del inventario y aplicar las reglas de D&D 5e sobre capacidad de carga. Las consecuencias de estar sobrecargado deben afectar el movimiento y las acciones del personaje.
*   **Impacto:** Mejora la interacción con compañeros y la gestión de personajes.
*   **Plan Detallado:** ❌ No creado
*   **Referencia:** [Notas de Gael - #39, #42, #54, #56, #67, #73, #85, #87, #93, #98, #118, #120](../notas/Notas%20de%20Gael.md)

### 20. Mejoras de Sistema de Aventuras y Datos {#20-mejoras-de-sistema-de-aventuras-y-datos}
*   **Mejoras Propuestas:**
    *   **Mejorar Generación de Introducciones:** ✅ COMPLETADO - Sistema implementado que permite incluir introducciones pre-generadas en el JSON (`introductoryNarration`/`openingScene`) para carga instantánea, con fallback automático a generación con IA si no existe. Revisar la creación de introducciones para aventuras cargadas desde JSON que no traen una intro definida. La IA debería generar una introducción contextual y atractiva.
    *   **Cache de Parseo de Aventuras JSON:** ✅ COMPLETADO - El parseo de aventuras de JSON_adventures debería guardarse en caché para cargas más rápidas. Implementar sistema de verificación de si el parseo está actualizado (comparar fecha de modificación del JSON).
    *   **Sistema de Comercio Completo:** Revisar en profundidad el sistema de comercio (inventario, dinero, compras, ventas, regateos, etc).
    *   **Sistema de Exploración y Mapas:** Revisar el sistema de exploración. Relacionado con el sistema de mapas y distancias. Evaluar si necesita mejoras o expansión de funcionalidades.
    *   **Aventuras con Personajes Predefinidos:** Estudiar la posibilidad de aceptar aventuras que incluyan fichas de personajes predefinidos (por ejemplo aventuras que necesiten personajes de cierto nivel). Esto permitiría aventuras más específicas y balanceadas.
    *   **Sistema de Guardado Automático:** Implementar sistema de guardado automático de partidas, guardando periódicamente el estado del juego sin intervención del usuario.
    *   **Sistema de Influencia de PNJs:** La IA debe mantener el estado de actitud del PNJ (amistosa, indiferente u hostil), permitiendo que los resultados de las tiradas y la interpretación del jugador influyan en esa actitud. El sistema debe rastrear cambios en las relaciones y reflejarlos en las interacciones futuras.
    *   **Sistema de Conversación Fuera de Personaje Mejorado:** Revisar el sistema de conversación fuera de personaje, hacer que funcione durante el combate, y permitir hacer preguntas sobre las reglas o sobre monstruos.
*   **Impacto:** Mejora la gestión de aventuras y datos del juego.
*   **Plan Detallado:** ❌ No creado
*   **Referencia:** [Notas de Gael - #07, #15, #43, #55, #74, #94, #86, #97](../notas/Notas%20de%20Gael.md)

### 21. Mejoras de Calidad y Pulido {#21-mejoras-de-calidad-y-pulido}
*   **Mejoras Implementadas:**
    *   **Atribución Narrativa en Diálogos:** ✅ **COMPLETADO** (2025-11-26) - Los PNJs ahora siempre incluyen una breve descripción narrativa (quién habla y cómo) antes o durante sus diálogos, mejorando la inmersión y claridad.
*   **Mejoras Propuestas:**
*   **Referencia:** [Notas de Gael - #05, #11, #15, #17, #18, #19, #20, #21, #41, #42, #43, #44, #46, #47, #48, #49, #50, #52, #54, #55, #56, #62, #63, #64, #65, #67, #69, #73, #74, #76, #77, #78, #80, #82, #83, #84, #85, #86, #87, #88, #89, #90, #91, #92, #97, #98, #111, #112, #113, #114, #115](../notas/Notas%20de%20Gael.md)

### 23. Mejoras de Sistema de Aventuras y Datos {#23-mejoras-de-sistema-de-aventuras-y-datos}
*   **Mejoras Propuestas:**
    *   **Sistema de Generación de Aventuras Aleatorias:** Implementar un sistema que genere aventuras aleatorias basadas en parámetros (nivel, temática, duración), creando mapas, enemigos y tramas sobre la marcha.
    *   **Integración con D&D Beyond:** Investigar la posibilidad de importar personajes y campañas desde D&D Beyond.
    *   **Soporte para Homebrew:** Permitir a los usuarios cargar sus propias reglas, clases, razas y objetos personalizados.
*   **Impacto:** Aumenta infinitamente la rejugabilidad y personalización.
*   **Plan Detallado:** ❌ No creado

### 24. Mejoras de Calidad y Pulido {#24-mejoras-de-calidad-y-pulido}
*   **Mejoras Propuestas:**
    *   **Optimización de Rendimiento:** Mejorar el rendimiento general de la aplicación, reduciendo tiempos de carga y consumo de recursos.
    *   **Pruebas Automatizadas (E2E):** Implementar pruebas end-to-end para asegurar la estabilidad de las funcionalidades críticas.
    *   **Accesibilidad (a11y):** Asegurar que la aplicación cumpla con los estándares de accesibilidad web (WCAG).
*   **Impacto:** Asegura una base sólida y profesional para el proyecto.
*   **Plan Detallado:** ❌ No creado

### 25. Comandos de Voz {#25-comandos-de-voz}
*   **Mejora Propuesta:** Permitir al jugador dictar sus acciones por voz (Speech-to-Text) y recibir la narración por voz (Text-to-Speech, ya parcialmente implementado).
*   **Impacto:** Accesibilidad y comodidad.
*   **Plan Detallado:** ❌ No creado

### 26. Automatización del Versionado y Changelog {#26-automatización-del-versionado-y-changelog}
*   **Mejora Propuesta:** Implementar `semantic-release` o similar para automatizar la generación de números de versión y changelogs basados en los commits.
*   **Impacto:** Profesionalización del flujo de desarrollo.
*   **Plan Detallado:** ❌ No creado
