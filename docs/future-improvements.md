# Futuras Mejoras y Hoja de Ruta (Roadmap)

Este documento describe posibles mejoras y nuevas funcionalidades que podrían llevar la experiencia de D&D Adventures AI al siguiente nivel. Se basa en las pruebas realizadas y las ideas surgidas durante el desarrollo.

---

### 1. IA Conversacional Avanzada (Interacción en Tiempo Real)

Esta es la mejora más solicitada y de mayor impacto, surgida directamente de las sugerencias del usuario.

*   **Problema Actual:** Los compañeros de IA reaccionan de forma aislada a la acción del jugador, sin ser conscientes de lo que los otros compañeros han dicho en el mismo turno. El flujo es secuencial y el servidor devuelve todos los mensajes a la vez.

*   **Mejora Propuesta:**
    *   **Arquitectura de Streaming:** Reemplazar el modelo actual de "una petición, una respuesta" por una comunicación persistente entre el cliente y el servidor (usando, por ejemplo, WebSockets o Server-Sent Events).
    *   **Flujo de Turno por Pasos:** El servidor generaría y enviaría los mensajes uno por uno.
        1.  El DM narra la escena -> envía el mensaje al cliente.
        2.  El primer compañero (Elara) reacciona -> envía el mensaje al cliente.
        3.  El segundo compañero (Merryl) recibe un contexto que **incluye la reacción de Elara** y genera su respuesta -> envía el mensaje al cliente.
    *   **Orden de Diálogo Dinámico:** En lugar de un orden fijo (Elara, luego Merryl), la IA podría decidir quién habla primero basándose en la personalidad (el más impulsivo, el más sabio) o en un sistema de "iniciativa social".

*   **Impacto:** Lograría una dinámica de grupo mucho más orgánica y creíble, donde los personajes realmente conversan entre sí.

---

### 2. Sistema de Combate Más Profundo

*   **Tiradas de Ataque y Daño del Jugador:** Implementar una forma para que el jugador pueda declarar una acción de ataque y que la interfaz le pida las tiradas de dados correspondientes, en lugar de solo describir la acción en texto.
*   **Gestión de Efectos y Condiciones:** Añadir lógica para manejar estados como "envenenado", "aturdido", "agarrado", que afecten a las acciones y estadísticas de los combatientes.
*   **Inteligencia Táctica Mejorada:** El `enemyTacticianTool` podría tener en cuenta el terreno, las vulnerabilidades específicas del grupo y coordinar ataques entre diferentes tipos de enemigos.

---

### 3. Persistencia de Datos y Gestión de Partidas

*   **Base de Datos Real:** Reemplazar el sistema de guardado y carga mediante archivos JSON por una base de datos (como Firestore) para permitir un guardado automático y continuo.
*   **Múltiples Partidas:** Permitir a los usuarios tener varias partidas guardadas simultáneamente.
*   **Creación de Personajes:** Implementar un flujo guiado para que los jugadores puedan crear sus propios personajes desde cero, con tiradas de características, selección de clase, trasfondo, etc., en lugar de usar siempre a Galador.

---

### 4. Enriquecimiento de la Interfaz y la Experiencia

*   **Mapa Visual Interactivo:** En lugar de solo texto, mostrar un mapa simple de la región o de la ubicación actual, donde se destaquen las salidas y puntos de interés.
*   **Mejoras en la Ficha de Personaje:** Hacerla más interactiva, permitiendo usar objetos o lanzar conjuros directamente desde ella.
*   **Historial de Trivialidades (Lore):** Una sección en la interfaz que recopile automáticamente información importante sobre lugares, personajes y objetos descubiertos durante la aventura.
*   **Gestión de Música y Sonido Dinámicos:**
    *   **Contexto Musical:** La IA podría analizar el contexto de la escena (exploración tranquila, tensión, combate épico, visita a una ciudad bulliciosa) y seleccionar una pista de música de fondo adecuada de una librería predefinida.
    *   **Efectos de Sonido:** Acciones clave como un golpe crítico, el lanzamiento de un hechizo de fuego o el fallo de una tirada podrían ir acompañados de efectos de sonido para aumentar la inmersión.

---

### 5. Calidad y Robustez de la IA

*   **Implementación de un Sistema RAG (Retrieval-Augmented Generation):**
    *   **Problema Actual:** La IA depende de la herramienta `adventureLookupTool` para buscar en el JSON, lo que requiere consultas precisas por nombre o ID. Es un sistema rígido.
    *   **Mejora Propuesta:** Migrar de la búsqueda por JSON a un sistema RAG. Esto implicaría procesar todo el documento de la aventura, dividirlo en fragmentos (por ubicación, PNJ, etc.), crear *embeddings* de cada fragmento y almacenarlos en una base de datos vectorial.
    *   **Impacto:** La IA podría hacer "preguntas" en lenguaje natural a la base de datos de la aventura (ej: "¿qué se sabe sobre el dragón que amenaza Phandalin?") en lugar de necesitar saber el ID "Cryovain". Esto desbloquearía una comprensión del `lore` mucho más profunda y permitiría usar módulos de aventura completos escritos en formato de texto, no solo JSON estructurados.

*   **Memoria a Largo Plazo:** Implementar un sistema (posiblemente usando el propio sistema RAG) para que la IA recuerde eventos y decisiones clave de la aventura que ocurrieron mucho antes, influyendo en la narrativa a largo plazo. Por ejemplo, recordar una promesa que el jugador hizo a un PNJ hace varias sesiones.

*   **Flujo de Errores Más Inteligente:** En lugar de simplemente fallar, si una IA devuelve una respuesta mal formada, intentar "auto-corregirla" con una segunda llamada o recurrir a una respuesta de respaldo predefinida.

*   **Generación de Aventuras Procedural:** A largo plazo, la IA podría generar sus propias misiones secundarias, PNJ o incluso pequeñas mazmorras basadas en las acciones y el nivel del jugador, creando una experiencia de juego verdaderamente infinita y única para cada usuario.
