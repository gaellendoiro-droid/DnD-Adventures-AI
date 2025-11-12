# Roadmap - Mejoras Futuras

Este documento describe posibles mejoras y nuevas funcionalidades que podrían llevar la experiencia de D&D Adventures AI al siguiente nivel. La arquitectura actual es modular y robusta, sentando una base excelente para las siguientes evoluciones.

**Nota:** Para ver las mejoras ya implementadas, consulta el [CHANGELOG.md](../CHANGELOG.md).

---

### 1. Sistema de Progresión y Gestión (Prioridad Alta)
*   **Problema Actual:** El juego es una experiencia "de una sola sesión". No hay subida de nivel, el inventario no se puede gestionar de forma dinámica y la persistencia de datos depende de archivos de guardado manuales.
*   **Mejora Propuesta:**
    *   **Sistema de Experiencia (XP) y Subida de Nivel:** La IA podría otorgar XP por completar misiones o superar desafíos, permitiendo a los personajes subir de nivel y mejorar sus estadísticas y habilidades.
    *   **Gestión de Inventario y Economía:** Mejorar la interacción con comerciantes para que el oro y los tesoros tengan un propósito funcional, permitiendo comprar y vender objetos.
    *   **Persistencia de Datos:** Reemplazar el sistema de guardado en archivos por una base de datos (como Firestore) para un guardado automático y continuo.
*   **Impacto:** Es fundamental para crear una campaña duradera y gratificante, que es el núcleo de la experiencia D&D.

### 2. Sistema de Inicio de Combate Dinámico (Prioridad Alta)

*   **Problema Actual:** El mundo del juego es pasivo. El combate solo se inicia si el jugador declara explícitamente un ataque. Una acción narrativa que debería provocar hostilidad (como robar a un PNJ o insultar a un orco) no tiene consecuencias mecánicas, lo que rompe la inmersión.
*   **Mejora Propuesta:**
    *   Añadir un paso de **"Evaluación de Hostilidad"** al flujo del `gameCoordinator`. Después de que el `narrativeExpert` procese una acción, este nuevo paso evaluaría si la disposición de algún PNJ en la escena debería cambiar a `hostil`.
    *   Si la hostilidad aumenta, el `gameCoordinator` iniciaría automáticamente el modo de combate llamando al `combatManagerTool`.
*   **Impacto Estratégico:** Crítico. Es la mejora más importante para la credibilidad del mundo de juego. Hará que el mundo se sienta vivo, reactivo y peligroso, y que las acciones de los jugadores tengan un peso y consecuencias reales.

### 3. IA Conversacional Avanzada (Prioridad Media)

*   **Problema Actual:** Los compañeros de IA reaccionan de forma aislada a la acción del jugador, sin ser conscientes de lo que los otros compañeros han dicho en el mismo turno. El flujo es secuencial y el servidor devuelve todos los mensajes a la vez.
*   **Mejora Propuesta:**
    *   **Arquitectura de Streaming:** Reemplazar el modelo actual de "una petición, una respuesta" por una comunicación persistente entre el cliente y el servidor (usando, por ejemplo, WebSockets o Server-Sent Events).
    *   **Flujo de Turno por Pasos:** El servidor generaría y enviaría los mensajes uno por uno, permitiendo que las reacciones de los compañeros se construyan sobre las reacciones de los demás en tiempo real.
*   **Impacto:** Lograría una dinámica de grupo mucho más orgánica y creíble, mejorando significativamente la inmersión.

### 4. Calidad y Profundidad de la IA (Prioridad Media)

*   **Mejora Propuesta: Implementación de RAG (Retrieval-Augmented Generation)**
    *   **Estado Actual:** La IA recupera información del mundo (lore, personajes) mediante búsquedas directas en archivos JSON por ID. No "comprende" el contexto, solo busca datos.
    *   **Salto Evolutivo:** Migrar a un sistema RAG donde el lore se almacena en una base de datos vectorial. Esto permitiría a herramientas como `narrativeExpert` hacer preguntas en lenguaje natural (ej: "¿Cuál es la historia de la Vieja Atalaya?", "¿Qué sabe Elara sobre el dragón Cryovain?").
    *   **Impacto Estratégico:** Transformacional. Convertiría al DM de un mero "lector de fichas" a un verdadero conocedor del universo del juego, capaz de improvisar detalles coherentes, conectar eventos y responder a la curiosidad del jugador de forma profunda.

*   **Mejora Propuesta: Memoria a Largo Plazo**
    *   **Problema:** La IA no recuerda eventos clave entre sesiones.
    *   **Solución:** Implementar un sistema para que la IA resuma y almacene los eventos y decisiones más importantes en una base de datos persistente. Este resumen se añadiría al contexto de la IA en futuras sesiones.
    *   **Impacto:** Aumentaría la coherencia y la continuidad de la narrativa a lo largo de una campaña.

### 5. Música y Sonido Dinámicos (Prioridad Media-Baja)

*   **Problema Actual:** La experiencia de juego es silenciosa, careciendo de un fondo sonoro que ayude a la inmersión.
*   **Mejora Propuesta:**
    *   Integrar un reproductor de audio que pueda cambiar la pista musical dinámicamente según el estado del juego (exploración, combate, localización específica).
    *   El `gameCoordinator` sería el responsable de emitir eventos de cambio de estado (ej: `combateIniciado`, `ubicacionCambiada`) que el sistema de audio interpretaría para seleccionar la pista adecuada.
*   **Impacto Estratégico:** Muy alto en relación al esfuerzo. Aunque es una mejora de "calidad de vida", el audio es una herramienta narrativa potentísima que aumenta la atmósfera y la carga emocional de cada situación de forma exponencial.

### 6. Comandos de Voz (Prioridad Baja)

*   **Mejora Propuesta:** Integrar la API de Reconocimiento de Voz del navegador (`SpeechRecognition`) para añadir un botón de "dictar" en la interfaz.
*   **Impacto:** Aumentaría la accesibilidad y ofrecería una forma más rápida e inmersiva de interactuar, acercándose a la experiencia de una partida de rol de mesa.

### 7. Automatización del Versionado y Changelog (Prioridad Baja)

*   **Estado Actual:** Se ha implementado un sistema manual para mantener un archivo `CHANGELOG.md`.
*   **Objetivo Futuro:** Automatizar la actualización del `CHANGELOG.md` al cambiar la versión en `package.json`.
*   **Impacto:** Es una mejora de calidad de vida para el desarrollador, sin impacto directo en la experiencia del jugador.
