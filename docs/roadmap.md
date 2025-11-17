# Roadmap - Mejoras Futuras

Este documento describe posibles mejoras y nuevas funcionalidades que podrían llevar la experiencia de D&D Adventures AI al siguiente nivel. La arquitectura actual es modular y robusta, sentando una base excelente para las siguientes evoluciones.

**Nota:** Para ver las mejoras ya implementadas, consulta el [CHANGELOG.md](../CHANGELOG.md).

---

## 🔴 Prioridad Alta

Mejoras críticas que impactan directamente en la experiencia core del juego y son fundamentales para la jugabilidad.

### 1. Sistema de Progresión y Gestión
*   **Problema Actual:** El juego es una experiencia "de una sola sesión". No hay subida de nivel, el inventario no se puede gestionar de forma dinámica y la persistencia de datos depende de archivos de guardado manuales.
*   **Mejora Propuesta:**
    *   **Sistema de Experiencia (XP) y Subida de Nivel:** La IA podría otorgar XP por completar misiones o superar desafíos, permitiendo a los personajes subir de nivel y mejorar sus estadísticas y habilidades.
    *   **Gestión de Inventario y Economía:** Mejorar la interacción con comerciantes para que el oro y los tesoros tengan un propósito funcional, permitiendo comprar y vender objetos.
    *   **Persistencia de Datos:** Reemplazar el sistema de guardado en archivos por una base de datos (como Firestore) para un guardado automático y continuo.
*   **Impacto:** Es fundamental para crear una campaña duradera y gratificante, que es el núcleo de la experiencia D&D.

### 2. Sistema de Inicio de Combate Dinámico
*   **Problema Actual:** El mundo del juego es pasivo. El combate solo se inicia si el jugador declara explícitamente un ataque. Una acción narrativa que debería provocar hostilidad (como robar a un PNJ o insultar a un orco) no tiene consecuencias mecánicas, lo que rompe la inmersión.
*   **Mejora Propuesta:**
    *   Añadir un paso de **"Evaluación de Hostilidad"** al flujo del `gameCoordinator`. Después de que el `narrativeExpert` procese una acción, este nuevo paso evaluaría si la disposición de algún PNJ en la escena debería cambiar a `hostil`.
    *   Si la hostilidad aumenta, el `gameCoordinator` iniciaría automáticamente el modo de combate llamando al `combatManagerTool`.
*   **Impacto Estratégico:** Crítico. Es la mejora más importante para la credibilidad del mundo de juego. Hará que el mundo se sienta vivo, reactivo y peligroso, y que las acciones de los jugadores tengan un peso y consecuencias reales.

### 3. Mejora de Estructura de Fichas de Personajes
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
*   **Referencia:** [Notas de Gael - #06, #17, #18, #44, #69](../notas/Notas%20de%20Gael.md)

---

## 🟡 Prioridad Media

Mejoras importantes que mejoran la calidad, profundidad y fidelidad del juego, pero no son críticas para la funcionalidad básica.

### 4. Compendio de D&D Local - Base de Datos Local
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
*   **Documentación:** Ver [Plan de Desarrollo: Compendio de D&D Local](../planes-desarrollo/sin-comenzar/compendio-dnd-local.md)

### 5. IA Conversacional Avanzada
*   **Problema Actual:** Los compañeros de IA reaccionan de forma aislada a la acción del jugador, sin ser conscientes de lo que los otros compañeros han dicho en el mismo turno. El flujo es secuencial y el servidor devuelve todos los mensajes a la vez.
*   **Mejora Propuesta:**
    *   **Arquitectura de Streaming:** Reemplazar el modelo actual de "una petición, una respuesta" por una comunicación persistente entre el cliente y el servidor (usando, por ejemplo, WebSockets o Server-Sent Events).
    *   **Flujo de Turno por Pasos:** El servidor generaría y enviaría los mensajes uno por uno, permitiendo que las reacciones de los compañeros se construyan sobre las reacciones de los demás en tiempo real.
*   **Impacto:** Lograría una dinámica de grupo mucho más orgánica y creíble, mejorando significativamente la inmersión.

### 6. Calidad y Profundidad de la IA
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
    *   **Relacionado con:** Issue #79 (Narraciones de combate para turnos del jugador) y refactorización futura de `enemyTacticianTool` / `companionTacticianTool`.

### 7. Separación de IDs de Fichas de Personajes
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

### 8. Refactorización del Módulo `combat-manager.ts` (Prioridad Alta) ⏸️ **PARCIALMENTE COMPLETADO**
*   **Estado Actual:** Fases 1-2 completadas (54.6% de reducción), Fase 3 pausada (opcional)
*   **Resultados Alcanzados:**
    *   ✅ Reducción de código: 2723 → 1235 líneas (54.6% de reducción)
    *   ✅ 5 módulos especializados creados (1310 líneas extraídas)
    *   ✅ Issues #21 (código duplicado) y #16 (gestión de nombres) resueltos
    *   ✅ 10/10 tests PASS — Sin regresiones
    *   ✅ Código duplicado eliminado: ~798 líneas
*   **Problema Original:** El módulo `combat-manager.ts` había crecido hasta convertirse en un "God Object" con más de 2700 líneas de código, múltiples responsabilidades mezcladas, y código duplicado (~260 líneas).
*   **Mejora Propuesta (Fase 3 - Pausada):**
    *   **División en Módulos Especializados:** Refactorizar en módulos más pequeños y manejables siguiendo el principio de responsabilidad única (SRP).
    *   **Reducción del Módulo Principal:** Reducir `combat-manager.ts` de ~1235 líneas a ~300-400 líneas (orquestador delgado).
*   **Decisión:** La Fase 3 se pausó para priorizar el sistema de turnos paso a paso (Prioridad Muy Alta). La Fase 3 se puede retomar en el futuro si se considera necesaria.
*   **Impacto:** Crítico para mantenibilidad, facilita implementación de nuevas features (turnos paso a paso ya implementado, saving throws completos), mejora testabilidad y reduce deuda técnica.
*   **Documentación:** 
    *   [Plan de Refactorización Detallado](../planes-desarrollo/planes-en-curso/refactorizacion-combat-manager.md)
    *   [Issues Tracker - Issue #21](../tracking/issues/pendientes.md#issue-21-código-duplicado-en-combat-managerts-para-procesamiento-de-rolls-deuda-técnica)
    *   [Issues Tracker - Issue #16](../tracking/issues/pendientes.md#issue-16-gestión-de-nombres-de-múltiples-monstruos-debería-estar-en-un-módulo-separado)

### 9. Mejoras de Mecánicas de D&D 5e
*   **Estado Actual:** El sistema implementa las mecánicas básicas de D&D 5e, pero algunas reglas avanzadas están simplificadas o pendientes.
*   **Mejoras Propuestas:**
    *   **Sistema Completo de Saving Throws:** Actualmente los hechizos con saving throws aplican daño automáticamente. Implementar cálculo de Spell Save DC, tirada de salvación del objetivo, y regla de mitad de daño si acierta.
    *   **Sistema de Death Saving Throws:** Implementar tiradas de salvación de muerte automáticas, sistema de estabilización, y tracking de éxitos/fallos según reglas oficiales de D&D 5e.
    *   **Estados y Condiciones:** Sistema completo para estados temporales (aturdido, envenenado, paralizado, etc.) y actualización de estadísticas. Incluye actualización de stats temporales (bonificadores, penalizaciones), estados de condición, y recursos gastados (slots de hechizo, usos de habilidades).
    *   **Ataques Múltiples:** Gestión correcta de múltiples ataques por turno y reglas de interrupción cuando un ataque mata al objetivo. Verificar si se detiene el ataque o continúa con los demás ataques cuando el primero mata al objetivo.
    *   **Sistema de Foco de Objetivo:** Selección inteligente de objetivos que considere distancia (cuerpo a cuerpo vs a distancia), amenaza táctica, estado del objetivo (herido, vulnerable), y capacidades del atacante (alcance de armas/hechizos).
    *   **Sistema de Distancia y Proximidad:** Detectar si un personaje está cuerpo a cuerpo con un enemigo. Tiene repercusiones importantes: ataques de oportunidad, restricciones de movimiento, bonus/malus a tiradas según distancia, y rangos de hechizos.
    *   **Sistema de Gestión de Acciones:** Revisar e implementar correctamente acciones normales (1 por turno), acciones bonus (1 por turno), reacciones (fuera de tu turno), y acciones extras (por habilidades especiales). Aplicar reglas de D&D 5e para cada tipo de acción.
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
*   **Documentación:** 
    *   [Sistema de Death Saving Throws](../planes-desarrollo/sin-comenzar/sistema-death-saving-throws.md)
    *   [Issues Tracker - Issue #22](../tracking/issues/pendientes.md#issue-22-sistema-completo-de-saving-throws-tiradas-de-salvación-del-objetivo-feature-incompleta)
    *   [Notas de Gael - #04, #10, #12, #13, #23, #24, #25, #26, #27, #36, #37, #38, #40, #45, #53, #68, #70, #71, #72](../notas/Notas%20de%20Gael.md)

### 10. Convertidor de PDF a JSON - Aplicación Auxiliar
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
*   **Documentación:** Ver [Plan de Desarrollo: Convertidor de PDF a JSON](../planes-desarrollo/sin-comenzar/pdf-to-json-converter.md)

### 11. Música y Sonido Dinámicos
*   **Problema Actual:** La experiencia de juego es silenciosa, careciendo de un fondo sonoro que ayude a la inmersión.
*   **Mejora Propuesta:**
    *   Integrar un reproductor de audio que pueda cambiar la pista musical dinámicamente según el estado del juego (exploración, combate, localización específica).
    *   El `gameCoordinator` sería el responsable de emitir eventos de cambio de estado (ej: `combateIniciado`, `ubicacionCambiada`) que el sistema de audio interpretaría para seleccionar la pista adecuada.
*   **Impacto Estratégico:** Muy alto en relación al esfuerzo. Aunque es una mejora de "calidad de vida", el audio es una herramienta narrativa potentísima que aumenta la atmósfera y la carga emocional de cada situación de forma exponencial.

---

## 🟢 Prioridad Baja

Mejoras de calidad de vida y características adicionales que mejoran la experiencia pero no son esenciales.

### 12. Mejoras de Interfaz de Usuario
*   **Mejoras Propuestas:**
    *   **Mejorar Input del Jugador Durante su Turno:** Cuando es el turno del jugador, el input debería mostrar "Es tu turno ¿Qué haces?" y posiblemente sugerir acciones disponibles (atacar, moverse, usar objeto, lanzar hechizo).
    *   **Mostrar Nombre de la Aventura:** La ventana del juego debería mostrar el nombre de la aventura que se está jugando en la barra superior/header.
    *   **Menú de Selección de Aventuras JSON:** El botón "Cargar Aventura JSON" debería desplegar un menú con las aventuras disponibles en la carpeta JSON_adventures. Conservar también la opción de cargar desde el sistema de archivos.
    *   **Reestructurar Panel DebugLog:** Mostrar solo logs esenciales para el desarrollo de la partida. En combate, cada log debe mostrar el personaje al que pertenece. Deben ser más sencillos y legibles que los logs de la terminal.
    *   **Historial de Comandos en Input:** En el input de texto para dar las acciones del personaje implementar un sistema para recuperar órdenes ya dadas. Usando la tecla de flecha arriba mientras estamos en este cuadro se recuperarían los mensajes anteriores, del más reciente al más antiguo.
    *   **Integrar Botones de Avance de Turnos:** En el combate turno a turno, los botones de "avanzar 1 turno" y "avanzar todos" quizás deberían estar integrados en el panel de Orden de combate. Mejoraría la organización visual y la accesibilidad de estas funciones.
    *   **Resaltar Turno del Jugador:** En el combate turno a turno, cuando llega el turno del jugador, hay que hacer un resalte de alguna forma para avisar de que es el turno del jugador. Mejoraría la claridad y evitaría que el jugador se pierda en el orden de turnos.
    *   **Mejorar Colores en Panel de Tiradas:** En el panel de Tiradas hay que darle un nuevo color a las tiradas de curación. Buscar otros colores para otros tipos de tiradas para mejorar la diferenciación visual.
    *   **Revisar Formateo de Texto en Mensajes:** Revisar el formateo del texto en los mensajes del DM y de los Compañeros. Mejorar la presentación visual y legibilidad de los mensajes.
    *   **Revisión Completa de la UI:** Hacer una revisión completa de la UI. Evaluar consistencia, usabilidad y mejoras generales de la interfaz.
*   **Impacto:** Mejoras de calidad de vida que mejoran la experiencia del usuario y la usabilidad de la interfaz.
*   **Referencia:** [Notas de Gael - #08, #09, #14, #16, #57, #58, #59, #60, #61, #66](../notas/Notas%20de%20Gael.md)

### 13. Mejoras de Sistema de Personajes y Compañeros
*   **Mejoras Propuestas:**
    *   **Editor de Party Inicial en Archivo JSON:** Mientras no hay editor y gestión de personajes, poder modificar la party inicial fácilmente en un archivo JSON. Facilitaría la configuración inicial de la partida sin necesidad de herramientas adicionales.
    *   **Sistema de Voces para Compañeros:** Mejorar el sistema de lectura para que los compañeros también pudiesen hablar y definir a cada uno una voz característica basada en su personalidad, sexo, raza, etc.
    *   **Sistema de Abandono de Compañeros:** Implementar lógica para que compañeros puedan tomar decisiones independientes y abandonar el grupo bajo ciertas circunstancias. ¿Qué pasa si un compañero decide abandonarnos o continuar por otro camino?
    *   **Ajustar Probabilidad de Comentarios Narrativos:** Comprobar los porcentajes de probabilidad para que un compañero haga un comentario narrativo. Ahora parece que siempre que pueden dicen algo, lo cual puede ser excesivo y reducir el impacto de sus comentarios.
    *   **Sistema de Reacciones de Compañeros para Conversaciones:** Revisar el sistema de reacciones de compañeros para comprobar si es posible entablar conversaciones fluidas con ellos.
    *   **Comportamiento de Compañeros al Leer Objetos Visibles:** Estudiar si hay que cambiar el comportamiento para que los compañeros puedan leer directamente objetos o textos visibles cuando se les pide. Actualmente parece que no lo hacen, es el DM el que lo tiene que hacer.
*   **Impacto:** Mejora la interacción con compañeros y la gestión de personajes.
*   **Referencia:** [Notas de Gael - #39, #42, #54, #56, #67, #73](../notas/Notas%20de%20Gael.md)

### 14. Mejoras de Sistema de Aventuras y Datos
*   **Mejoras Propuestas:**
    *   **Mejorar Generación de Introducciones:** Revisar la creación de introducciones para aventuras cargadas desde JSON que no traen una intro definida. La IA debería generar una introducción contextual y atractiva.
    *   **Cache de Parseo de Aventuras JSON:** El parseo de aventuras de JSON_adventures debería guardarse en caché para cargas más rápidas. Implementar sistema de verificación de si el parseo está actualizado (comparar fecha de modificación del JSON).
    *   **Sistema de Comercio Completo:** Revisar en profundidad el sistema de comercio (inventario, dinero, compras, ventas, regateos, etc).
    *   **Sistema de Exploración y Mapas:** Revisar el sistema de exploración. Relacionado con el sistema de mapas y distancias. Evaluar si necesita mejoras o expansión de funcionalidades.
    *   **Aventuras con Personajes Predefinidos:** Estudiar la posibilidad de aceptar aventuras que incluyan fichas de personajes predefinidos (por ejemplo aventuras que necesiten personajes de cierto nivel). Esto permitiría aventuras más específicas y balanceadas.
*   **Impacto:** Mejora la gestión de aventuras y datos del juego.
*   **Referencia:** [Notas de Gael - #07, #15, #43, #55, #74](../notas/Notas%20de%20Gael.md)

### 15. Mejoras de Calidad y Pulido
*   **Mejoras Propuestas:**
    *   **Corrección Ortográfica de IA y Jugador:** Implementar corrección ortográfica para texto generado por las IAs y texto ingresado por el jugador (opcional, ayuda). Podría usar API de corrección o modelo de lenguaje.
    *   **Cambiar Nivel de Log para Fallos de API de D&D:** En los logs habría que cambiar que cuando falla el fetching de la API de D&D en vez de error sea un warning. Los fallos de API son esperables y no deberían tratarse como errores críticos si hay sistema de fallback.
    *   **Revisar Asignación de IDs en Combate:** Los compañeros y el jugador actualmente tienen IDs simples (números). Los enemigos tienen IDs más completos (ej: "goblin-0"). Evaluar si se necesita estandarizar o mejorar este sistema.
    *   **Expandir Funciones de Resolución de IDs:** Actualmente hay una función resolveEnemyId. ¿Deberíamos implementar más funciones similares para identificar mejor localizaciones o PNJs?
*   **Impacto:** Mejoras de calidad y pulido que mejoran la experiencia general del juego.
*   **Referencia:** [Notas de Gael - #11, #19, #41, #62](../notas/Notas%20de%20Gael.md)

### 16. Comandos de Voz
*   **Mejora Propuesta:** Integrar la API de Reconocimiento de Voz del navegador (`SpeechRecognition`) para añadir un botón de "dictar" en la interfaz.
*   **Impacto:** Aumentaría la accesibilidad y ofrecería una forma más rápida e inmersiva de interactuar, acercándose a la experiencia de una partida de rol de mesa.

### 17. Automatización del Versionado y Changelog
*   **Estado Actual:** Se ha implementado un sistema manual para mantener un archivo `CHANGELOG.md`.
*   **Objetivo Futuro:** Automatizar la actualización del `CHANGELOG.md` al cambiar la versión en `package.json`.
*   **Impacto:** Es una mejora de calidad de vida para el desarrollador, sin impacto directo en la experiencia del jugador.
