# Arquitectura de IA con `gameCoordinator` (Revisada con `actionInterpreter`)

Este documento describe la arquitectura de la IA del juego, centrada en un `gameCoordinator` que actúa como cerebro central. La principal mejora es la introducción de un `actionInterpreter`, que desacopla la interpretación de la intención del jugador de la ejecución de la narrativa.

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
        *   Si es `interact` o `narrate`, llama al `narrativeExpert` con el contexto actual.
        *   Si es `attack`, inicia el modo de combate (calcula iniciativa, etc.).
        *   Si es `ooc`, llama al `oocAssistant`.
    4.  Tras la narración principal, llama al `companionExpertTool` para generar reacciones de los compañeros de IA.
    5.  Si está en combate, delega los turnos de PNJ al `combatManagerTool`.

---

### Herramientas Expertas (Lógica Delegada)

Estos módulos son "expertos" en tareas específicas.

#### Herramienta: `actionInterpreter` (¡NUEVO!)
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/flows/action-interpreter.ts`
*   **Rol**: El **traductor de intención**. Su única tarea es convertir el texto libre del jugador en una acción estructurada.
*   **Función**: Recibe el texto del jugador y el contexto de la ubicación (especialmente las salidas). Devuelve un objeto JSON simple que clasifica la acción (`move`, `interact`, `attack`, `ooc`, `narrate`) e identifica el objetivo si lo hay. **No narra nada.**

#### Herramienta: `narrativeExpert`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/flows/narrative-expert.ts`
*   **Rol**: El experto en **narración y descripción**. Su tarea es contar la historia.
*   **Función**: Es invocado por el `gameCoordinator` **después** de que la intención ya ha sido interpretada y el estado del juego (como la ubicación) ha sido actualizado. Describe la escena, el resultado de una interacción o la llegada a un nuevo lugar. Su `prompt` es ahora mucho más simple, ya que no necesita deducir la intención de movimiento.

#### Herramienta: `combatManagerTool`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/tools/combat-manager.ts`
*   **Rol**: El **gestor de una ronda de combate de PNJ**.
*   **Función**: Cuando el `gameCoordinator` lo invoca durante el combate, esta herramienta ejecuta los turnos de los PNJ (compañeros y enemigos) hasta que le toca a un jugador humano o el combate termina.

#### Herramienta: `oocAssistant`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/flows/ooc-assistant.ts`
*   **Rol**: El experto en **reglas y preguntas fuera de personaje** (OOC).
*   **Función**: Responde a las preguntas del jugador que empiezan por `//`.

---

### Sub-Expertos y Bases de Conocimiento (Herramientas de Apoyo)

#### Herramienta: `companionExpertTool`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/tools/companion-expert.ts`
*   **Rol**: El "cerebro" para los compañeros de grupo controlados por la IA.
*   **Función**: Invocado por el `gameCoordinator` (durante la exploración) o el `combatManagerTool` (durante el combate). Decide la acción o diálogo para un compañero basándose en su personalidad y el contexto.

#### Herramienta: `enemyTacticianTool`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/tools/enemy-tactician.ts`
*   **Rol**: El "cerebro" táctico para los enemigos en combate.
*   **Función**: Invocado por el `combatManagerTool`. Decide la acción de un enemigo durante su turno.

#### Herramienta: `adventureLookupTool`
*   **Tipo**: **Herramienta de Búsqueda (Función Lógica)**
*   **Archivo**: `src/ai/tools/adventure-lookup.ts`
*   **Rol**: La **enciclopedia de la aventura**.
*   **Función**: Busca información sobre lugares, personajes, monstruos u objetos en el archivo JSON de la aventura.

#### Herramienta: `dndApiLookupTool`
*   **Tipo**: **Herramienta de Búsqueda (Función Lógica)**
*   **Archivo**: `src/ai/tools/dnd-api-lookup.ts`
*   **Rol**: El **manual de reglas de D&D 5e**.
*   **Función**: Busca información general sobre reglas, hechizos, etc., en una API externa (dnd5eapi.co).

#### Herramienta: `diceRollerTool`
*   **Tipo**: **Herramienta Lógica (Función Lógica)**
*   **Archivo**: `src/ai/tools/dice-roller.ts`
*   **Rol**: El **motor de dados** del juego.
*   **Función**: Recibe una notación de dados (ej: "1d20+4") y devuelve el resultado.
