# Futuras Mejoras y Hoja de Ruta

Este documento describe posibles mejoras y nuevas funcionalidades que podrían llevar la experiencia de D&D Adventures AI al siguiente nivel.

### 1. IA Conversacional Avanzada (Interacción en Tiempo Real)

*   **Problema Actual:** Los compañeros de IA reaccionan de forma aislada a la acción del jugador, sin ser conscientes de lo que los otros compañeros han dicho en el mismo turno. El flujo es secuencial y el servidor devuelve todos los mensajes a la vez.
*   **Mejora Propuesta:**
    *   **Arquitectura de Streaming:** Reemplazar el modelo actual de "una petición, una respuesta" por una comunicación persistente entre el cliente y el servidor (usando, por ejemplo, WebSockets o Server-Sent Events).
    *   **Flujo de Turno por Pasos:** El servidor generaría y enviaría los mensajes uno por uno, permitiendo que las reacciones de los compañeros se construyan sobre las reacciones de los demás en tiempo real.
*   **Impacto:** Lograría una dinámica de grupo mucho más orgánica y creíble.

### 2. Sistema de Inicio de Combate Dinámico (Alta Prioridad)

*   **Problema Actual:** El combate solo se inicia si el jugador declara explícitamente un ataque. El juego no reacciona si una acción narrativa (como insultar a un guardia) debería lógicamente provocar un enfrentamiento.
*   **Mejora Propuesta:**
    *   Añadir un paso de **"Evaluación de Hostilidad"** al `gameCoordinator` que, después de una acción, evalúe si la disposición de un PNJ neutral debería cambiar a hostil, iniciando el combate automáticamente.
*   **Impacto:** Haría que el mundo se sintiera más vivo y peligroso. Las acciones de los jugadores tendrían consecuencias reales e inmediatas.

### 3. Sistema de Versionado y Changelog (Propuesta Archivada)
*   **Objetivo:** Implementar un sistema robusto y automatizado para mantener un archivo `CHANGELOG.md` que se actualice cada vez que se incremente la versión en `package.json`.
*   **Desafío:** El sistema debe ser a prueba de fallos, sin depender de la memoria de la IA o de que el usuario recuerde seguir pasos manuales. La simple modificación del número de versión en `package.json` debe desencadenar la actualización del changelog de forma atómica.
*   **Estado:** Pausado. Se requiere encontrar un mecanismo que permita a la IA detectar de forma inequívoca la intención de "realizar un versionado" y que active un protocolo estricto de actualización de archivos (`package.json` y `CHANGELOG.md`) sin posibilidad de error u olvido.

### 4. Sistema de Progresión y Gestión
*   **Sistema de Experiencia (XP) y Subida de Nivel:** La IA podría otorgar XP por completar misiones o superar desafíos, permitiendo a los personajes subir de nivel y mejorar sus estadísticas y habilidades.
*   **Gestión de Inventario y Economía:** Mejorar la interacción con comerciantes para que el oro y los tesoros tengan un propósito funcional, permitiendo comprar y vender objetos.
*   **Persistencia de Datos:** Reemplazar el sistema de guardado en archivos por una base de datos (como Firestore) para un guardado automático y continuo.

### 5. Calidad y Robustez de la IA
*   **Implementación de RAG (Retrieval-Augmented Generation):** Migrar de la búsqueda directa en JSON a un sistema RAG. Esto permitiría a la IA "preguntar" en lenguaje natural sobre el lore de la aventura, en lugar de depender de búsquedas por ID, desbloqueando una comprensión del mundo mucho más profunda.
*   **Memoria a Largo Plazo:** Implementar un sistema para que la IA recuerde eventos y decisiones clave de sesiones anteriores, influyendo en la narrativa a largo plazo.
