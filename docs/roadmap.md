# Roadmap - Mejoras Futuras

Este documento describe posibles mejoras y nuevas funcionalidades que podrían llevar la experiencia de D&D Adventures AI al siguiente nivel. La arquitectura actual es modular y robusta, sentando una base excelente para las siguientes evoluciones.

**Nota:** Para ver las mejoras ya implementadas, consulta el [CHANGELOG.md](../CHANGELOG.md).

**Última actualización:** 2025-11-22  
**Estado:** Actualizado - Sistema de Mundo Persistente: añadida información sobre `AdventureUpdateState`

---

## 🔴 Prioridad Muy Alta

Mejoras críticas que mejoran significativamente la arquitectura, mantenibilidad y consistencia del sistema.

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

### 1. Simplificación de Arquitectura de Combate
*   **Problema Actual:** El sistema de combate tiene una arquitectura excesivamente compleja con múltiples capas de delegación (8-9 niveles de profundidad). El flujo del jugador y el de la IA son diferentes, causando duplicación de código, inconsistencias y dificultando el mantenimiento.
*   **Mejora Propuesta:**
    *   **Unificar Procesamiento de Turnos:** Crear un `TurnProcessor` único que funcione igual para jugador e IA, eliminando la duplicación entre `action-processor.ts` y `dice-roll-processor.ts`.
    *   **Crear `CombatActionExecutor` Unificado:** Fusionar la lógica de procesamiento de acciones en un solo módulo que maneje cualquier acción de combate independientemente de quién la ejecute.
    *   **Simplificar Inicialización:** Eliminar `first-turn-handler.ts` y hacer que el primer turno se procese como cualquier otro usando el flujo normal.
    *   **Flujo Simplificado:** Reducir de 8-9 niveles de profundidad a 3-4 niveles, haciendo el código más fácil de seguir y depurar.
*   **Impacto:** Transformacional - Mejora significativa de la arquitectura, elimina duplicación, garantiza consistencia total entre jugador e IA, y facilita enormemente el mantenimiento futuro. Resuelve problemas como mensajes de muerte duplicados y otras inconsistencias.
*   **Plan Detallado:** ✅ [Simplificación de Arquitectura de Combate](../planes-desarrollo/sin-comenzar/issue-117-simplificacion-arquitectura-combate.md)
*   **Referencia:** 
    - Issue #117 (Simplificación de Arquitectura de Combate) 🔴 CRÍTICO
    - Relacionado con Issue #94 (Refactorización de Prompts de Tacticians)
    - Resuelve Issue #82 (Unificar sistema de procesamiento de tiradas)
    - Resuelve Issue #21 (Código duplicado en combat-manager)

---

Mejoras críticas de interfaz de usuario que mejoran significativamente la experiencia y usabilidad del juego.

### 1. Revisión y Reorganización de la Interfaz de Usuario
*   **Problema Actual:** La interfaz actual tiene varios elementos mal organizados que afectan la usabilidad y la experiencia del jugador. El panel izquierdo está sobrecargado, el botón de guardar partida está en una ubicación poco accesible, y el panel de DebugLog ocupa espacio innecesario.
*   **Mejoras Propuestas:**
    *   **Mover Botón de Guardar Partida:** Trasladar el botón de guardar partida desde el panel izquierdo a la barra superior (header), junto al botón de menú, para mejorar su accesibilidad y visibilidad.
    *   **Eliminar Recuadro de DebugLog:** Eliminar completamente el panel de DebugLog del panel izquierdo. Este panel ya no es necesario ya que el sistema de logging se ha migrado a la consola del navegador y terminal del servidor. Esto liberará espacio valioso en el panel izquierdo.
    *   **Reorganizar Panel Izquierdo:**
        *   Implementar paneles colapsables para los diferentes componentes (Tiradas de Dados y Orden de Combate)
        *   Ajustar el tamaño del panel de Orden de Combate según el número de participantes
        *   Acoplar los paneles de Tiradas y Orden de Combate por defecto para una mejor organización visual
        *   Mejorar la distribución del espacio vertical disponible
    *   **Reorganizar Panel Derecho:**
        *   Revisar la organización del panel de Fichas de Personajes y Panel de Grupo
        *   Optimizar el uso del espacio disponible
        *   Mejorar la separación visual entre diferentes secciones
    *   **Limpieza de Código:** Eliminar todo el código relacionado con DebugLog (componentes, props, estados) para mantener el código limpio y sin elementos obsoletos.
*   **Impacto:** Mejora significativa de la usabilidad, liberación de espacio en la interfaz, mejor organización visual, y código más limpio sin elementos deprecados.
*   **Plan Detallado:** ❌ No creado
*   **Referencia:** 
    - [Notas de Gael - #268](../notas/Notas%20de%20Gael.md) - Rediseño del Panel Izquierdo
    - Relacionado con la eliminación del sistema de DebugLog UI (completado en v0.5.5)

---

## 🔴 Prioridad Alta

Mejoras críticas que impactan directamente en la experiencia core del juego y son fundamentales para la jugabilidad.

### 2. Sistema de Progresión y Gestión
*   **Problema Actual:** El juego es una experiencia "de una sola sesión". No hay subida de nivel, el inventario no se puede gestionar de forma dinámica y la persistencia de datos depende de archivos de guardado manuales.
*   **Mejora Propuesta:**
    *   **Sistema de Experiencia (XP) y Subida de Nivel:** La IA podría otorgar XP por completar misiones o superar desafíos, permitiendo a los personajes subir de nivel y mejorar sus estadísticas y habilidades.
    *   **Gestión de Inventario y Economía:** Mejorar la interacción con comerciantes para que el oro y los tesoros tengan un propósito funcional, permitiendo comprar y vender objetos.
    *   **Persistencia de Datos:** Reemplazar el sistema de guardado en archivos por una base de datos (como Firestore) para un guardado automático y continuo.
*   **Impacto:** Es fundamental para crear una campaña duradera y gratificante, que es el núcleo de la experiencia D&D.
*   **Plan Detallado:** ❌ No creado

### 3. Sistema de Inicio de Combate Dinámico
*   **Problema Actual:** El mundo del juego es pasivo. El combate solo se inicia si el jugador declara explícitamente un ataque. Una acción narrativa que debería provocar hostilidad (como robar a un PNJ o insultar a un orco) no tiene consecuencias mecánicas, lo que rompe la inmersión.
*   **Mejora Propuesta:**
    *   Añadir un paso de **"Evaluación de Hostilidad"** al flujo del `gameCoordinator`. Después de que el `narrativeExpert` procese una acción, este nuevo paso evaluaría si la disposición de algún PNJ en la escena debería cambiar a `hostil`.
    *   Si la hostilidad aumenta, el `gameCoordinator` iniciaría automáticamente el modo de combate llamando al `combatManagerTool`.
*   **Impacto Estratégico:** Crítico. Es la mejora más importante para la credibilidad del mundo de juego. Hará que el mundo se sienta vivo, reactivo y peligroso, y que las acciones de los jugadores tengan un peso y consecuencias reales.
*   **Plan Detallado:** ❌ No creado

### 4. Mejora de Estructura de Fichas de Personajes
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

### 5. Sistema de Modos de Juego Diferenciados
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

### 6. Revisiones de Sistema de Combate
*   **Mejoras Propuestas:**
    *   **Minimizar Mensajes del DM en Combate:** En combate, a veces en un solo turno el DM puede llegar a mandar 5 mensajes (narración inicial, acción, daño, mensaje de "ha dejado inconsciente a X" y mensaje de "X cae inconsciente"). Buscar la forma de minimizar esta cantidad de mensajes a lo mínimo, diferenciando entre mensajes narrativos y mensajes informativos y agrupando estos últimos en un solo mensaje del DM.
    *   **Ignorar Turnos de Personajes Muertos o Inconscientes:** En combate, los turnos de los personajes muertos o inconscientes ya no deberían ni ejecutarse para no perder tiempo. El bucle debería ignorar a los personajes que están muertos o inconscientes, pero si un personaje se recupera de la inconsciencia o revive habría que volver a tenerlo en cuenta en el bucle. Esto tiene que ir acompañado de alguna señal visual de qué personajes están fuera del combate (quizás tachando su nombre en el combat tracker o con algún tipo de símbolos para marcar su estado).
    *   **Revisar o Eliminar Botón de Tiradas:** Evaluar si eliminar el botón de tiradas y su funcionalidad (las tiradas ya se ejecutan en el server), o si hacer que cuando sea el turno del jugador en combate o se le pida una tirada, la haga el mismo.
*   **Impacto:** Mejora el flujo de combate, reduce ruido visual y mejora la experiencia del jugador.
*   **Plan Detallado:** ❌ No creado
*   **Referencia:** [Notas de Gael - #102, #104, #109](../notas/Notas%20de%20Gael.md)

---

## 🟡 Prioridad Media

Mejoras importantes que mejoran la calidad, profundidad y fidelidad del juego, pero no son críticas para la funcionalidad básica.

### 7. Sistema de Mundo Persistente
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
*   **Estado:** 📝 Documentado como mejora futura - **Solución temporal implementada:**
    *   ✅ **Mantenimiento de estado de enemigos:** Los enemigos derrotados se mantienen en el estado del cliente (`enemies` array) incluso después de que termine el combate
    *   ✅ **Filtrado de entidades muertas:** El `GameCoordinator` filtra automáticamente los IDs de enemigos muertos de `entitiesPresent` antes de pasar el contexto al `NarrativeManager`
    *   ✅ **Contexto explícito de cadáveres:** Se pasa una lista explícita de enemigos derrotados (`deadEntities`) al `ExplorationExpert` para que el DM sepa que debe describirlos como cadáveres, incluso si la descripción original del JSON los menciona como vivos
    *   ⚠️ **Limitación:** Esta solución funciona durante la sesión actual, pero no persiste entre recargas de página. Para persistencia completa, se requiere el sistema completo de "Mundo Persistente"

### 8. Compendio de D&D Local - Base de Datos Local
*   **Problema Actual:** El sistema depende completamente de la API externa de D&D 5e para obtener información sobre monstruos, hechizos, reglas, etc. Esto causa latencia, dependencia de conectividad, y múltiples llamadas redundantes a la API.
*   **Mejora Propuesta:**
    *   **Base de Datos Local:** Crear un sistema de base de datos local (SQLite recomendado) que almacene un compendio completo de conocimiento de D&D (fichas de monstruos, reglas, razas, clases, hechizos, equipamiento, etc.).
    *   **Sistema de Múltiples Fuentes:** Arquitectura modular de "proveedores" que permite usar múltiples fuentes de datos (D&D 5e API, Open5e API, archivos estáticos, datos personalizados). El sistema intentará cada fuente según prioridad hasta encontrar los datos.
    *   **Búsqueda Inteligente:** El sistema buscará primero en la base de datos local. Si no encuentra la información, la obtendrá de las fuentes configuradas y la añadirá automáticamente a la base de datos para futuras consultas.
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

### 9. IA Conversacional Avanzada
*   **Problema Actual:** Los compañeros de IA reaccionan de forma aislada a la acción del jugador, sin ser conscientes de lo que los otros compañeros han dicho en el mismo turno. El flujo es secuencial y el servidor devuelve todos los mensajes a la vez.
*   **Mejora Propuesta:**
    *   **Arquitectura de Streaming:** Reemplazar el modelo actual de "una petición, una respuesta" por una comunicación persistente entre el cliente y el servidor (usando, por ejemplo, WebSockets o Server-Sent Events).
    *   **Flujo de Turno por Pasos:** El servidor generaría y enviaría los mensajes uno por uno, permitiendo que las reacciones de los compañeros se construyan sobre las reacciones de los demás en tiempo real.
*   **Impacto:** Lograría una dinámica de grupo mucho más orgánica y creíble, mejorando significativamente la inmersión.
*   **Plan Detallado:** ❌ No creado

### 10. Calidad y Profundidad de la IA
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

*   **Mejora Propuesta: Narración Unificada para Todos los Turnos**
    *   **Problema Actual:** Solo el turno del jugador utiliza `combat-narration-expert`. Los tacticians (`enemyTacticianTool` y `companionTacticianTool`) generan narraciones de intención por su cuenta y no cuentan con narración de resolución, lo que produce diferencias de estilo y calidad narrativa entre turnos.
    *   **Mejora Propuesta:**
        *   **Extender `combat-narration-expert`:** Adaptar el tool para manejar tanto narraciones de intención (antes de las tiradas) como de resolución (después de aplicar resultados).
        *   **Integración con Tacticians:** Los tacticians se enfocarían únicamente en decidir la acción táctica (target, tiradas necesarias), delegando toda narración en `combat-narration-expert`.
        *   **Narrativa Consistente:** Garantizar que enemigos, compañeros y jugador compartan el mismo tono narrativo, reglas de estilo y uso del contexto (incluyendo el resumen generado por `combat-context-summarizer`).
        *   **Hooks de Intención/Resolución:** Definir dos entradas claras para el tool (pre-roll / post-roll) para permitir que IA y jugador compartan narraciones cohesivas en ambos momentos del turno.
    *   **Impacto:** Consistencia narrativa total en el combate, reducción de lógica duplicada en tacticians y posibilidad de aplicar mejoras de narración (como el contexto resumido) a todos los turnos por igual.
    *   **Relacionado con:** 
        - Issue #79 (Narraciones de combate para turnos del jugador) ✅ RESUELTO
        - Issue #14 (AI Tacticians output inválido/null) ✅ RESUELTO - La refactorización futura podría simplificar aún más los prompts
        - Issue #94 (Refactorización de Prompts de Tacticians) - Issue dedicado a esta mejora
        - Refactorización futura de `enemyTacticianTool` / `companionTacticianTool`
*   **Plan Detallado:** ❌ No creado

### 11. Separación de IDs de Fichas de Personajes
*   **Problema Actual:** Las fichas de personajes (`new-game-data.ts`) incluyen IDs hardcodeados (ej: `id: "1"`, `id: "6"`, `id: "3"`). Esto mezcla datos de ficha (stats, habilidades, inventario) con metadatos del sistema (IDs para identificación interna). Las fichas deberían ser datos puros y portables, mientras que los IDs son una necesidad interna del procesamiento del juego.
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

### 12. Mejoras de Mecánicas de D&D 5e
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
*   **Impacto:** Mayor fidelidad a las reglas oficiales de D&D 5e, mejor balance de combate, opciones tácticas más ricas, y combate más narrativo e inmersivo.
*   **Plan Detallado:** ✅ Parcial (solo Death Saving Throws) - [Sistema de Death Saving Throws](../planes-desarrollo/sin-comenzar/sistema-death-saving-throws.md)
*   **Documentación:** 
    *   [Issues Tracker - Issue #22](../tracking/issues/pendientes.md#issue-22-sistema-completo-de-saving-throws-tiradas-de-salvación-del-objetivo-feature-incompleta)
    *   [Notas de Gael - #04, #10, #12, #13, #23, #24, #25, #26, #27, #36, #37, #38, #40, #45, #53, #68, #70, #71, #72](../notas/Notas%20de%20Gael.md)

### 13. Actualización Automática de Fichas desde Archivos JSON
*   **Problema Actual:** Cuando se modifican los archivos JSON de las fichas de personajes, el panel de fichas del juego no se actualiza automáticamente, requiriendo recargar la partida.
*   **Mejora Propuesta:**
    *   Implementar un sistema de detección de cambios en los archivos JSON de fichas de personajes.
    *   Actualizar automáticamente el panel de fichas del juego cuando se detecten cambios.
    *   Utilizar los logs existentes en la consola del navegador que indican cuando los datos iniciales de la party se han modificado y guardado.
    *   Forzar una actualización de las fichas de los personajes en la UI y en el server cuando se detecten cambios.
*   **Impacto:** Muy útil para testeos manuales y desarrollo, permitiendo ver cambios en tiempo real sin recargar.
*   **Plan Detallado:** ❌ No creado
*   **Referencia:** [Notas de Gael - #99](../notas/Notas%20de%20Gael.md)

#### 12.1. Información de Dados de Daño de Armas en Fichas
*   **Problema Actual:** La información de los dados de daño de cada arma no está incluida en las fichas de personajes, requiriendo que el DM consulte la API de D&D cada vez que se necesita esta información.
*   **Mejora Propuesta:**
    *   Incluir la información de los dados de daño de cada arma en la ficha de cada personaje.
    *   El DM debería usar la API de D&D solo para recuperar esa información si no está incluida en las fichas (sistema de fallback).
    *   El panel de la UI de las fichas debería mostrar la información de los dados de cada arma si está disponible en los datos de las fichas de los personajes.
*   **Impacto:** Reduce la dependencia de la API externa, mejora el rendimiento y facilita el acceso a información de armas.
*   **Plan Detallado:** ❌ No creado
*   **Referencia:** [Notas de Gael - #117](../notas/Notas%20de%20Gael.md)

### 14. Convertidor de PDF a JSON - Aplicación Auxiliar
*   **Problema Actual:** Añadir nuevas aventuras al juego requiere crear manualmente archivos JSON con una estructura específica, lo cual es tedioso y propenso a errores. Los usuarios que tienen aventuras en formato PDF no pueden usarlas directamente.
*   **Mejora Propuesta:**
    *   **Aplicación Auxiliar Independiente:** Crear una aplicación CLI (y futuramente web) que analice PDFs de aventuras de D&D y los convierta automáticamente en JSON compatible con el juego.
    *   **Extracción Inteligente con IA:** Utilizar IA (Gemini) para extraer información estructurada del PDF, identificando ubicaciones, entidades, descripciones y relaciones.
    *   **Validación Automática:** Validar el JSON generado contra el esquema del juego antes de guardarlo.
    *   **Soporte para Diferentes Formatos:** Manejar PDFs con texto, PDFs escaneados (con OCR), y diferentes estilos de aventuras.
*   **Impacto Estratégico:**
    *   **Facilita Expansión:** Reduce significativamente la barrera de entrada para añadir nuevas aventuras
    *   **Ahorro de Tiempo:** Convierte horas de trabajo manual en minutos de procesamiento automático
    *   **Precisión:** Reduce errores humanos en la creación de JSON
    *   **Accesibilidad:** Permite a usuarios usar aventuras oficiales o homebrew en formato PDF
*   **Plan Detallado:** ✅ [Convertidor de PDF a JSON](../planes-desarrollo/sin-comenzar/pdf-to-json-converter.md)

### 15. Música y Sonido Dinámicos
*   **Problema Actual:** La experiencia de juego es silenciosa, careciendo de un fondo sonoro que ayude a la inmersión.
*   **Mejora Propuesta:**
    *   Integrar un reproductor de audio que pueda cambiar la pista musical dinámicamente según el estado del juego (exploración, combate, localización específica).
    *   El `gameCoordinator` sería el responsable de emitir eventos de cambio de estado (ej: `combateIniciado`, `ubicacionCambiada`) que el sistema de audio interpretaría para seleccionar la pista adecuada.
*   **Impacto Estratégico:** Muy alto en relación al esfuerzo. Aunque es una mejora de "calidad de vida", el audio es una herramienta narrativa potentísima que aumenta la atmósfera y la carga emocional de cada situación de forma exponencial.
*   **Plan Detallado:** ❌ No creado

---

## 🟢 Prioridad Baja

Mejoras de calidad de vida y características adicionales que mejoran la experiencia pero no son esenciales.

### 15. Mejoras de Interfaz de Usuario
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
    *   **Rediseño del Panel Izquierdo:** Rediseñar el panel izquierdo: quitar los recuadros para el DebugLog (retirar todos los logs para limpiar código), mover el botón de guardar partida a la barra superior, acoplar los recuadros de Tiradas y Orden de Combate por defecto, y ajustar el tamaño del panel de orden de combate según el número de participantes.
    *   **Investigación de Sistemas de Texto2Voz:** Investigar sistemas de texto2voz más rápidos y configurables para mejorar la experiencia de audio del DM.
    *   **Adaptación de la UI a Dispositivos Móviles:** Trabajar en la adaptación de la UI a dispositivos móviles, asegurando que la aplicación sea funcional y usable en pantallas pequeñas.
    *   **Botones de Órdenes Rápidas:** Cerca del input de texto implementar botones para dar órdenes rápidas como "Atacamos", "Huímos", etc., facilitando acciones comunes sin necesidad de escribir texto completo.
    *   **Efectos de Sonido en Combate:** En combate, aparte de la música dinámica, implementar efectos de sonido para cada turno (gritos de ataque, quejidos si se les hace daño, choque de espadas, golpes de escudo, etc.) para ambientar más la acción.
*   **Impacto:** Mejoras de calidad de vida que mejoran la experiencia del usuario y la usabilidad de la interfaz.
*   **Plan Detallado:** ❌ No creado
*   **Referencia:** [Notas de Gael - #08, #09, #14, #16, #57, #58, #59, #60, #61, #66, #100, #101, #103, #105, #106, #107, #108, #96, #95, #110](../notas/Notas%20de%20Gael.md)

### 16. Mejoras de Sistema de Personajes y Compañeros
*   **Mejoras Propuestas:**
    *   **Editor de Party Inicial en Archivo JSON:** Mientras no hay editor y gestión de personajes, poder modificar la party inicial fácilmente en un archivo JSON. Facilitaría la configuración inicial de la partida sin necesidad de herramientas adicionales.
    *   **Sistema de Voces para Compañeros:** Mejorar el sistema de lectura para que los compañeros también pudiesen hablar y definir a cada uno una voz característica basada en su personalidad, sexo, raza, etc.
    *   **Sistema de Abandono de Compañeros:** Implementar lógica para que compañeros puedan tomar decisiones independientes y abandonar el grupo bajo ciertas circunstancias. ¿Qué pasa si un compañero decide abandonarnos o continuar por otro camino?
    *   **Ajustar Probabilidad de Comentarios Narrativos:** Comprobar los porcentajes de probabilidad para que un compañero haga un comentario narrativo. Ahora parece que siempre que pueden dicen algo, lo cual puede ser excesivo y reducir el impacto de sus comentarios.
    *   **Sistema de Reacciones de Compañeros para Conversaciones:** Revisar el sistema de reacciones de compañeros para comprobar si es posible entablar conversaciones fluidas con ellos.
    *   **Comportamiento de Compañeros al Leer Objetos Visibles:** Estudiar si hay que cambiar el comportamiento para que los compañeros puedan leer directamente objetos o textos visibles cuando se les pide. Actualmente parece que no lo hacen, es el DM el que lo tiene que hacer.
    *   **Rasgos de Clase:** Implementar los rasgos de clase (como Furia del Bárbaro, Ataque Furtivo del Pícaro o Inspiración Bárdica). Cada clase debe tener sus rasgos específicos implementados según las reglas de D&D 5e, activándose automáticamente cuando corresponda o permitiendo su uso manual.
    *   **Sistema de Inspiración:** La IA debe reconocer cuándo la interpretación del jugador es fiel a los rasgos de personalidad, ideales o defectos (establecidos en la creación del personaje), otorgando el beneficio de Inspiración cuando corresponda (que permite obtener Ventaja en tiradas). El sistema debe rastrear cuándo se usa la inspiración y cuándo se puede otorgar de nuevo.
    *   **Sistema de Detección de Fichas Sospechosas o Corruptas:** Implementar un sistema por el que el DM avise de fichas sospechosas o corruptas, validando la integridad de los datos de las fichas de personajes.
    *   **Ventana Especial para Equipar/Desequipar Objetos:** En el inventario, implementar una ventana especial para equipar o desequipar objetos, mejorando la gestión del equipamiento de los personajes.
    *   **Sistema de Equipamiento con Límites y Validación:** Las fichas de los personajes deberían incluir en la parte de equipamiento qué elementos están equipados o no. Los elementos equipados deberían seguir un esquema del que no se pueden salir, por ejemplo: 2 anillos máximo, 1 botas máximo, 2 armas máximo, etc. Tener en cuenta armas a 2 manos y versátiles, etc.
*   **Impacto:** Mejora la interacción con compañeros y la gestión de personajes.
*   **Plan Detallado:** ❌ No creado
*   **Referencia:** [Notas de Gael - #39, #42, #54, #56, #67, #73, #85, #87, #93, #98, #118](../notas/Notas%20de%20Gael.md)

### 17. Mejoras de Sistema de Aventuras y Datos
*   **Mejoras Propuestas:**
    *   **Mejorar Generación de Introducciones:** Revisar la creación de introducciones para aventuras cargadas desde JSON que no traen una intro definida. La IA debería generar una introducción contextual y atractiva.
    *   **Cache de Parseo de Aventuras JSON:** El parseo de aventuras de JSON_adventures debería guardarse en caché para cargas más rápidas. Implementar sistema de verificación de si el parseo está actualizado (comparar fecha de modificación del JSON).
    *   **Sistema de Comercio Completo:** Revisar en profundidad el sistema de comercio (inventario, dinero, compras, ventas, regateos, etc).
    *   **Sistema de Exploración y Mapas:** Revisar el sistema de exploración. Relacionado con el sistema de mapas y distancias. Evaluar si necesita mejoras o expansión de funcionalidades.
    *   **Aventuras con Personajes Predefinidos:** Estudiar la posibilidad de aceptar aventuras que incluyan fichas de personajes predefinidos (por ejemplo aventuras que necesiten personajes de cierto nivel). Esto permitiría aventuras más específicas y balanceadas.
    *   **Sistema de Guardado Automático:** Implementar sistema de guardado automático de partidas, guardando periódicamente el estado del juego sin intervención del usuario.
    *   **Sistema de Influencia de PNJs:** La IA debe mantener el estado de actitud del PNJ (amistosa, indiferente u hostil), permitiendo que los resultados de las tiradas y la interpretación del jugador influyan en esa actitud. El sistema debe rastrear cambios en las relaciones y reflejarlos en las interacciones futuras.
    *   **Sistema de Conversación Fuera de Personaje Mejorado:** Revisar el sistema de conversación fuera de personaje, hacer que funcione durante el combate, y permitir hacer preguntas sobre las reglas o sobre monstruos.
*   **Impacto:** Mejora la gestión de aventuras y datos del juego.
*   **Plan Detallado:** ❌ No creado
*   **Referencia:** [Notas de Gael - #07, #15, #43, #55, #74, #94, #86, #97](../notas/Notas%20de%20Gael.md)

### 18. Mejoras de Calidad y Pulido
*   **Mejoras Propuestas:**
    *   **Corrección Ortográfica de IA y Jugador:** Implementar corrección ortográfica para texto generado por las IAs y texto ingresado por el jugador (opcional, ayuda). Podría usar API de corrección o modelo de lenguaje.
    *   **Cambiar Nivel de Log para Fallos de API de D&D:** En los logs habría que cambiar que cuando falla el fetching de la API de D&D en vez de error sea un warning. Los fallos de API son esperables y no deberían tratarse como errores críticos si hay sistema de fallback.
    *   **Revisar Asignación de IDs en Combate:** Los compañeros y el jugador actualmente tienen IDs simples (números). Los enemigos tienen IDs más completos (ej: "goblin-0"). Evaluar si se necesita estandarizar o mejorar este sistema.
    *   **Expandir Funciones de Resolución de IDs:** Actualmente hay una función resolveEnemyId. ¿Deberíamos implementar más funciones similares para identificar mejor localizaciones o PNJs?
    *   **Optimización de Velocidad de Respuestas del DM:** Revisar la velocidad a la que el DM genera sus respuestas. Hay que optimizar esto al máximo para que la partida sea más fluida. Relacionado con la optimización de prompts.
    *   **Optimización General de Prompts:** Optimización de prompts en general urgente. En común con otros issues ya documentados. Mejorar la eficiencia y velocidad de respuesta del sistema.
*   **Impacto:** Mejoras de calidad y pulido que mejoran la experiencia general del juego, especialmente la fluidez y velocidad de respuesta.
*   **Plan Detallado:** ❌ No creado
*   **Referencia:** [Notas de Gael - #11, #19, #41, #62, #111, #114](../notas/Notas%20de%20Gael.md)

### 19. Comandos de Voz
*   **Mejora Propuesta:** Integrar la API de Reconocimiento de Voz del navegador (`SpeechRecognition`) para añadir un botón de "dictar" en la interfaz.
*   **Impacto:** Aumentaría la accesibilidad y ofrecería una forma más rápida e inmersiva de interactuar, acercándose a la experiencia de una partida de rol de mesa.
*   **Plan Detallado:** ❌ No creado

### 20. Automatización del Versionado y Changelog
*   **Estado Actual:** Se ha implementado un sistema manual para mantener un archivo `CHANGELOG.md`.
*   **Objetivo Futuro:** Automatizar la actualización del `CHANGELOG.md` al cambiar la versión en `package.json`.
*   **Impacto:** Es una mejora de calidad de vida para el desarrollador, sin impacto directo en la experiencia del jugador.
*   **Plan Detallado:** ❌ No creado
