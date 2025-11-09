# Futuras Mejoras y Hoja de Ruta

Este documento describe posibles mejoras y nuevas funcionalidades que podrían llevar la experiencia de D&D Adventures AI al siguiente nivel.

### 1. Sistema de Progresión y Gestión (Prioridad Alta)
*   **Problema Actual:** El juego es una experiencia "de una sola sesión". No hay subida de nivel, el inventario no se puede gestionar de forma dinámica y la persistencia de datos depende de archivos de guardado manuales.
*   **Mejora Propuesta:**
    *   **Sistema de Experiencia (XP) y Subida de Nivel:** La IA podría otorgar XP por completar misiones o superar desafíos, permitiendo a los personajes subir de nivel y mejorar sus estadísticas y habilidades.
    *   **Gestión de Inventario y Economía:** Mejorar la interacción con comerciantes para que el oro y los tesoros tengan un propósito funcional, permitiendo comprar y vender objetos.
    *   **Persistencia de Datos:** Reemplazar el sistema de guardado en archivos por una base de datos (como Firestore) para un guardado automático y continuo.
*   **Impacto:** Es fundamental para crear una campaña duradera y gratificante, que es el núcleo de la experiencia D&D.

### 2. Sistema de Inicio de Combate Dinámico (Prioridad Alta)

*   **Problema Actual:** El combate solo se inicia si el jugador declara explícitamente un ataque. El juego no reacciona si una acción narrativa (como insultar a un guardia) debería lógicamente provocar un enfrentamiento.
*   **Mejora Propuesta:**
    *   Añadir un paso de **"Evaluación de Hostilidad"** al `gameCoordinator` que, después de una acción, evalúe si la disposición de un PNJ neutral debería cambiar a hostil, iniciando el combate automáticamente.
*   **Impacto:** Haría que el mundo se sintiera más vivo y peligroso. Las acciones de los jugadores tendrían consecuencias reales e inmediatas.

### 3. IA Conversacional Avanzada (Prioridad Media)

*   **Problema Actual:** Los compañeros de IA reaccionan de forma aislada a la acción del jugador, sin ser conscientes de lo que los otros compañeros han dicho en el mismo turno. El flujo es secuencial y el servidor devuelve todos los mensajes a la vez.
*   **Mejora Propuesta:**
    *   **Arquitectura de Streaming:** Reemplazar el modelo actual de "una petición, una respuesta" por una comunicación persistente entre el cliente y el servidor (usando, por ejemplo, WebSockets o Server-Sent Events).
    *   **Flujo de Turno por Pasos:** El servidor generaría y enviaría los mensajes uno por uno, permitiendo que las reacciones de los compañeros se construyan sobre las reacciones de los demás en tiempo real.
*   **Impacto:** Lograría una dinámica de grupo mucho más orgánica y creíble, mejorando significativamente la inmersión.

### 4. Calidad y Robustez de la IA (Prioridad Media)
*   **Mejora Propuesta:**
    *   **Implementación de RAG (Retrieval-Augmented Generation):** Migrar de la búsqueda directa en JSON a un sistema RAG. Esto permitiría a la IA "preguntar" en lenguaje natural sobre el lore de la aventura, en lugar de depender de búsquedas por ID, desbloqueando una comprensión del mundo mucho más profunda.
    *   **Memoria a Largo Plazo:** Implementar un sistema para que la IA recuerde eventos y decisiones clave de sesiones anteriores, influyendo en la narrativa a largo plazo.
*   **Impacto:** Aumentaría drásticamente la inteligencia y coherencia del DM, permitiendo una narrativa más compleja y adaptativa.

### 5. Comandos de Voz (Prioridad Baja)

*   **Mejora Propuesta:** Integrar la API de Reconocimiento de Voz del navegador (`SpeechRecognition`) para añadir un botón de "dictar" en la interfaz de entrada del jugador.
*   **Funcionamiento:**
    *   El jugador podría pulsar un botón de micrófono para activar el reconocimiento de voz.
    *   Lo que el jugador diga se transcribiría automáticamente en el cuadro de texto.
    *   El jugador podría revisar el texto transcrito y enviarlo como su acción.
*   **Impacto:** Aumentaría la accesibilidad y ofrecería una forma más rápida e inmersiva de interactuar con el juego, acercándose a la experiencia de una partida de rol de mesa.

### 6. Automatización del Versionado y Changelog (Prioridad Baja)

*   **Estado Actual:** Se ha implementado un sistema manual para mantener un archivo `CHANGELOG.md`.
*   **Objetivo Futuro:** Automatizar la actualización del `CHANGELOG.md` al cambiar la versión en `package.json`.
*   **Impacto:** Es una mejora de calidad de vida para el desarrollador, sin impacto directo en la experiencia del jugador.
