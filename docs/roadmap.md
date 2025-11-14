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
*   **Impacto:** Mejora significativa de la experiencia de usuario, facilita la gestión de personajes y hace más accesible la información durante el combate.
*   **Referencia:** [Notas de Gael - #06](../trabajo/Notas%20de%20Gael.txt)

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

### 7. Refactorización del Módulo `combat-manager.ts` (Prioridad Alta)
*   **Problema Actual:** El módulo `combat-manager.ts` ha crecido hasta convertirse en un "God Object" con más de 2700 líneas de código, múltiples responsabilidades mezcladas, y código duplicado (~260 líneas).
*   **Mejora Propuesta:**
    *   **División en Módulos Especializados:** Refactorizar en módulos más pequeños y manejables siguiendo el principio de responsabilidad única (SRP).
    *   **Eliminación de Código Duplicado:** Extraer lógica de procesamiento de rolls a módulo centralizado (resuelve Issue #21).
    *   **Separación de Responsabilidades:** Extraer gestión de nombres, parseo de stats, validaciones, y lógica de combate a módulos dedicados.
    *   **Reducción del Módulo Principal:** Reducir `combat-manager.ts` de ~2723 líneas a ~300-400 líneas (orquestador delgado).
*   **Impacto:** Crítico para mantenibilidad, facilita implementación de nuevas features (turnos paso a paso, saving throws completos), mejora testabilidad y reduce deuda técnica.
*   **Documentación:** 
    *   [Plan de Refactorización Detallado](../planes-desarrollo/sin-comenzar/refactorizacion-combat-manager.md)
    *   [Issues Tracker - Issue #21](../tracking/issues/pendientes.md#issue-21-código-duplicado-en-combat-managerts-para-procesamiento-de-rolls-deuda-técnica)
    *   [Issues Tracker - Issue #16](../tracking/issues/pendientes.md#issue-16-gestión-de-nombres-de-múltiples-monstruos-debería-estar-en-un-módulo-separado)

### 8. Mejoras de Mecánicas de D&D 5e
*   **Estado Actual:** El sistema implementa las mecánicas básicas de D&D 5e, pero algunas reglas avanzadas están simplificadas o pendientes.
*   **Mejoras Propuestas:**
    *   **Sistema Completo de Saving Throws:** Actualmente los hechizos con saving throws aplican daño automáticamente. Implementar cálculo de Spell Save DC, tirada de salvación del objetivo, y regla de mitad de daño si acierta.
    *   **Sistema de Death Saving Throws:** Implementar tiradas de salvación de muerte automáticas, sistema de estabilización, y tracking de éxitos/fallos según reglas oficiales de D&D 5e.
    *   **Estados y Condiciones:** Sistema completo para estados temporales (aturdido, envenenado, paralizado, etc.) y actualización de estadísticas.
    *   **Ataques Múltiples:** Gestión correcta de múltiples ataques por turno y reglas de interrupción cuando un ataque mata al objetivo.
    *   **Sistema de Foco de Objetivo:** Selección inteligente de objetivos que considere distancia (cuerpo a cuerpo vs a distancia), amenaza táctica, estado del objetivo (herido, vulnerable), y capacidades del atacante (alcance de armas/hechizos).
    *   **Diálogo en Turnos de Combate:** Permitir que compañeros y enemigos "hablen" en sus turnos, incluyendo diálogo/reacciones junto con sus acciones.
    *   **Narración Post-Combate:** El DM debe hacer una narración con las consecuencias y un breve resumen al finalizar cada combate para continuar con la historia.
*   **Impacto:** Mayor fidelidad a las reglas oficiales de D&D 5e, mejor balance de combate, opciones tácticas más ricas, y combate más narrativo e inmersivo.
*   **Documentación:** 
    *   [Sistema de Death Saving Throws](../planes-desarrollo/sin-comenzar/sistema-death-saving-throws.md)
    *   [Issues Tracker - Issue #22](../tracking/issues/pendientes.md#issue-22-sistema-completo-de-saving-throws-tiradas-de-salvación-del-objetivo-feature-incompleta)
    *   [Notas de Gael - #26, #10, #36](../trabajo/Notas%20de%20Gael.txt)

### 9. Convertidor de PDF a JSON - Aplicación Auxiliar
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

### 10. Música y Sonido Dinámicos
*   **Problema Actual:** La experiencia de juego es silenciosa, careciendo de un fondo sonoro que ayude a la inmersión.
*   **Mejora Propuesta:**
    *   Integrar un reproductor de audio que pueda cambiar la pista musical dinámicamente según el estado del juego (exploración, combate, localización específica).
    *   El `gameCoordinator` sería el responsable de emitir eventos de cambio de estado (ej: `combateIniciado`, `ubicacionCambiada`) que el sistema de audio interpretaría para seleccionar la pista adecuada.
*   **Impacto Estratégico:** Muy alto en relación al esfuerzo. Aunque es una mejora de "calidad de vida", el audio es una herramienta narrativa potentísima que aumenta la atmósfera y la carga emocional de cada situación de forma exponencial.

---

## 🟢 Prioridad Baja

Mejoras de calidad de vida y características adicionales que mejoran la experiencia pero no son esenciales.

### 11. Comandos de Voz
*   **Mejora Propuesta:** Integrar la API de Reconocimiento de Voz del navegador (`SpeechRecognition`) para añadir un botón de "dictar" en la interfaz.
*   **Impacto:** Aumentaría la accesibilidad y ofrecería una forma más rápida e inmersiva de interactuar, acercándose a la experiencia de una partida de rol de mesa.

### 12. Automatización del Versionado y Changelog
*   **Estado Actual:** Se ha implementado un sistema manual para mantener un archivo `CHANGELOG.md`.
*   **Objetivo Futuro:** Automatizar la actualización del `CHANGELOG.md` al cambiar la versión en `package.json`.
*   **Impacto:** Es una mejora de calidad de vida para el desarrollador, sin impacto directo en la experiencia del jugador.
