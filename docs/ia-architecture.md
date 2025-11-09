# Arquitectura de IA

Este documento describe la arquitectura de la IA del juego, centrada en un `gameCoordinator` que actúa como cerebro central, y un `actionInterpreter` que traduce la intención del jugador.

---

### Módulo Central: `gameCoordinator`

*   **Tipo**: **Flujo Lógico (Función de TypeScript)**
*   **Archivo**: `src/ai/flows/game-coordinator.ts`
*   **Rol**: El **director de orquesta** del Dungeon Master. No es una IA, sino el código principal que gestiona el estado del juego y decide qué hacer a continuación.
*   **Lógica Interna**:
    1.  Recibe la acción del jugador.
    2.  **Llama al `actionInterpreter`** para obtener una intención estructurada (ej: `{ "actionType": "move", "targetId": "posada-rocacolina" }`). Este paso es crucial y ahora es muy robusto gracias a la mejora de sus herramientas internas.
    3.  **Actúa según la intención**:
        *   Si es `move`, actualiza el estado (`locationId`) antes de proceder.
        *   Si es `ooc` (fuera de personaje), llama al `oocAssistant` y termina el turno.
    4.  **Llama al `narrativeExpert` (una sola vez)**: Con la intención y el contexto claros, invoca al narrador para que describa la escena y el resultado de la acción. Este flujo ha sido optimizado para evitar ejecuciones duplicadas.
    5.  **Gestiona Reacciones**: Tras la narración principal, llama al `companionExpertTool` en un bucle para generar las reacciones de cada compañero de IA (si están activadas).
    6.  **Gestiona el Combate**: Si está en modo combate, delega los turnos de los PNJ al `combatManagerTool`.
    7.  **Devuelve el Resultado Final**: Empaqueta todos los mensajes y cambios de estado y los devuelve al cliente.

---

### Herramientas Expertas (Flujos y Lógica Delegada)

Estos módulos son "expertos" en tareas específicas, invocados por el `gameCoordinator`.

#### Herramienta: `actionInterpreter`
*   **Tipo**: **Módulo de IA (Flujo con Prompt y Herramientas)**
*   **Archivo**: `src/ai/flows/action-interpreter.ts`
*   **Rol**: El **traductor de intención**. Su única tarea es convertir el texto libre del jugador en una acción estructurada.
*   **Función**: Recibe el texto del jugador y el contexto de la ubicación. Utiliza la `locationLookupTool` para resolver destinos de viaje. Devuelve un objeto JSON simple que clasifica la acción (`move`, `interact`, `attack`, `ooc`, `narrate`). **No narra nada.**

#### Herramienta: `narrativeExpert`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/flows/narrative-expert.ts`
*   **Rol**: El experto en **narración y descripción**.
*   **Función**: Es invocado por el `gameCoordinator` después de que la intención ya ha sido interpretada. Describe la escena, el resultado de una interacción o la llegada a un nuevo lugar. Su `prompt` es simple: solo debe narrar.

#### Herramienta: `locationLookupTool`
*   **Tipo**: **Herramienta de Búsqueda (Lógica TypeScript)**
*   **Archivo**: `src/ai/tools/location-lookup.ts`
*   **Rol**: El **GPS de la aventura**. Su objetivo es encontrar una ubicación específica basándose en una consulta flexible del usuario. Es la herramienta clave que permite al `actionInterpreter` entender movimientos a lugares lejanos o que no son una salida directa desde la ubicación actual.
*   **Función**: Implementa un sistema de búsqueda por capas con un orden de prioridad estricto para garantizar la máxima precisión y flexibilidad:
    1.  **Capa 1: Coincidencia Exacta:** Comprueba si la consulta coincide exactamente con el `id` o `title` de una ubicación. Es la búsqueda más rápida.
    2.  **Capa 2: Búsqueda por Entidad (PNJ):** Comprueba si la consulta coincide con el nombre de una entidad (un PNJ). Si lo encuentra, devuelve la ubicación donde esa entidad está presente.
    3.  **Capa 3: Inclusión del Título:** Comprueba si el título de una ubicación *contiene* la frase de la consulta (ej: "Escudo de León" dentro de "Bazar Escudo de León").
    4.  **Capa 4: Búsqueda por Palabras Clave:** La capa más flexible. Descompone la consulta en palabras y comprueba si **alguna** de esas palabras clave existe en el título de una ubicación. Esto permite que "tienda Barthen" encuentre "Suministros Barthen".
*   **Uso Principal**: Es utilizada exclusivamente por el `actionInterpreter` para resolver la intención de movimiento del jugador cuando el destino no es una salida local obvia.
