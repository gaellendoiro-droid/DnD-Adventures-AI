# Arquitectura de IA con `gameCoordinator`

Este documento describe la arquitectura de la IA del juego, centrada en un `gameCoordinator` que actúa como cerebro central, y un `actionInterpreter` que traduce la intención del jugador.

---

### Módulo Central: `gameCoordinator`

*   **Tipo**: **Flujo Lógico (Función de TypeScript)**
*   **Archivo**: `src/ai/flows/game-coordinator.ts`
*   **Rol**: El **director de orquesta** del Dungeon Master. No es una IA, sino el código principal que gestiona el estado del juego y decide qué hacer a continuación.
*   **Lógica Interna**:
    1.  Recibe la acción del jugador.
    2.  **Llama al `actionInterpreter`** para obtener una intención estructurada (ej: `{ "actionType": "move", "targetId": "posada-rocacolina" }`).
    3.  **Actúa según la intención**:
        *   Si es `move`, actualiza el estado (`locationId`) y luego llama al `narrativeExpert` para describir la nueva escena.
        *   Si es `interact` o `narrate`, llama directamente al `narrativeExpert` con el contexto actual para que describa el resultado.
        *   Si es `attack`, inicia el modo de combate (calcula iniciativa, etc.).
        *   Si es `ooc` (fuera de personaje), llama al `oocAssistant`.
    4.  Tras la narración principal, llama al `companionExpertTool` en un bucle para generar las reacciones de cada compañero de IA.
    5.  Si está en modo combate, delega los turnos de los PNJ al `combatManagerTool`.

---

### Herramientas Expertas (Flujos y Lógica Delegada)

Estos módulos son "expertos" en tareas específicas, invocados por el `gameCoordinator`.

#### Herramienta: `actionInterpreter`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/flows/action-interpreter.ts`
*   **Rol**: El **traductor de intención**. Su única tarea es convertir el texto libre del jugador en una acción estructurada.
*   **Función**: Recibe el texto del jugador y el contexto de la ubicación. Devuelve un objeto JSON simple que clasifica la acción (`move`, `interact`, `attack`, `ooc`, `narrate`) e identifica el objetivo. **No narra nada.**

#### Herramienta: `narrativeExpert`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/flows/narrative-expert.ts`
*   **Rol**: El experto en **narración y descripción**.
*   **Función**: Es invocado por el `gameCoordinator` después de que la intención ya ha sido interpretada. Describe la escena, el resultado de una interacción o la llegada a un nuevo lugar. Su `prompt` es simple: solo debe narrar.

#### Herramienta: `combatManagerTool`
*   **Tipo**: **Herramienta de IA (con Lógica Interna)**
*   **Archivo**: `src/ai/tools/combat-manager.ts`
*   **Rol**: El **gestor de una ronda de combate de PNJ**.
*   **Función**: Cuando el `gameCoordinator` lo invoca durante el combate, esta herramienta ejecuta en bucle los turnos de los PNJ (compañeros y enemigos) hasta que le toca a un jugador humano o el combate termina. Para ello, invoca a su vez al `enemyTacticianTool` y al `companionExpertTool`.

#### Herramienta: `oocAssistant`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/flows/ooc-assistant.ts`
*   **Rol**: El experto en **reglas y preguntas fuera de personaje** (OOC).
*   **Función**: Responde a las preguntas del jugador que empiezan por `//`.

---

### Sub-Expertos y Herramientas de Apoyo

Estas son herramientas más pequeñas que los módulos principales utilizan para obtener información o realizar tareas específicas.

#### Herramienta: `companionExpertTool`
*   **Tipo**: **Herramienta de IA**
*   **Archivo**: `src/ai/tools/companion-expert.ts`
*   **Rol**: El "cerebro" para un compañero de grupo controlado por la IA.
*   **Función**: Decide la acción o diálogo para un compañero basándose en su personalidad y el contexto. Es invocado por el `gameCoordinator` (en exploración) o el `combatManagerTool` (en combate).

#### Herramienta: `enemyTacticianTool`
*   **Tipo**: **Herramienta de IA**
*   **Archivo**: `src/ai/tools/enemy-tactician.ts`
*   **Rol**: El "cerebro" táctico para los enemigos en combate.
*   **Función**: Invocado por el `combatManagerTool`. Decide la acción de un enemigo durante su turno.

#### Herramienta: `adventureLookupTool`
*   **Tipo**: **Herramienta de Búsqueda (Lógica)**
*   **Archivo**: `src/ai/tools/adventure-lookup.ts`
*   **Rol**: La **enciclopedia de la aventura**.
*   **Función**: Busca información sobre lugares, personajes, monstruos u objetos en el archivo JSON de la aventura.

#### Herramienta: `dndApiLookupTool`
*   **Tipo**: **Herramienta de Búsqueda (API Externa)**
*   **Archivo**: `src/ai/tools/dnd-api-lookup.ts`
*   **Rol**: El **manual de reglas de D&D 5e**.
*   **Función**: Busca información general sobre reglas, hechizos, etc., en la API pública `dnd5eapi.co`.

#### Herramienta: `diceRollerTool`
*   **Tipo**: **Herramienta Lógica**
*   **Archivo**: `src/ai/tools/dice-roller.ts`
*   **Rol**: El **motor de dados** del juego.
*   **Función**: Recibe una notación de dados (ej: "1d20+4") y devuelve el resultado numérico.
