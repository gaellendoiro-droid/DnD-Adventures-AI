# Arquitectura de IA con `gameCoordinator`

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
*   **Tipo**: **Herramienta de Búsqueda (Lógica)**
*   **Archivo**: `src/ai/tools/location-lookup.ts`
*   **Rol**: El **GPS de la aventura**.
*   **Función**: Busca de forma inteligente una ubicación en la aventura, ya sea por su nombre, por una entidad que contiene, o por una coincidencia parcial. Es la herramienta clave que permite al `actionInterpreter` entender movimientos a lugares lejanos.