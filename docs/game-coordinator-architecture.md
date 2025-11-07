# Arquitectura de IA con `gameCoordinator` (Revisada)

Este documento describe la arquitectura de la IA del juego, centrada en un módulo `gameCoordinator` que actúa como cerebro central, orquestando diferentes herramientas expertas para gestionar la narrativa, el combate y las interacciones con el jugador.

---

### Módulo Central de IA: `gameCoordinator`

*   **Tipo**: **Flujo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/flows/game-coordinator.ts`
*   **Rol**: El cerebro central del Dungeon Master. Su única responsabilidad es analizar el estado actual del juego y la acción del jugador, y decidir qué herramienta experta es la más adecuada para manejar la situación. Pre-carga el contexto necesario (como los datos de la ubicación actual) para pasárselo a los expertos.
*   **Input**:
    *   `playerAction`: La acción o el diálogo del jugador.
    *   `gameState`: El estado completo del juego (quién está en el grupo, dónde están, si están en combate, etc.).
*   **Lógica Interna**:
    1.  Determina el contexto: ¿Es una pregunta fuera de personaje (`//`)? ¿Estamos en combate? ¿Es una acción narrativa?
    2.  Busca y carga la información de la ubicación actual.
    3.  Invoca a la herramienta experta apropiada para la tarea, pasándole el contexto necesario.
*   **Herramientas que utilizará**:
    *   `narrativeExpert` (IA)
    *   `combatManagerTool` (Herramienta Lógica)
    *   `oocAssistant` (IA)
    *   `adventureLookupTool` (Herramienta de Búsqueda)

---

### Herramientas Expertas (Lógica Delegada)

Estos módulos son "expertos" en tareas específicas. Algunos son IA con su propio cerebro (prompt), mientras que otros son funciones lógicas.

#### Herramienta: `narrativeExpert`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/flows/narrative-expert.ts`
*   **Rol**: El experto en **narración y exploración**.
*   **Función**: Cuando la coordinadora lo llama, este se encarga de generar la historia. Utiliza el contexto de la ubicación actual que le proporciona el `gameCoordinator` para describir los resultados de las acciones de exploración. Conserva el acceso a las herramientas de búsqueda para obtener información sobre *nuevos* elementos (como moverse a otra ubicación o preguntar por un PNJ).
*   **Herramientas que utiliza**:
    *   `adventureLookupTool` (Herramienta de Búsqueda)
    *   `dndApiLookupTool` (Herramienta de Búsqueda)
    *   `companionExpert` (IA)

#### Herramienta: `combatManagerTool`
*   **Tipo**: **Herramienta Lógica (Tool)**
*   **Archivo**: `src/ai/tools/combat-manager.ts`
*   **Rol**: El **gestor mecánico del combate**. No tiene un prompt propio.
*   **Función**: Cuando la coordinadora lo invoca, esta herramienta ejecuta un bucle de turnos de combate. Orquesta las acciones de los PNJ llamando a los expertos correspondientes (`companionExpert` y `enemyTactician`) y resuelve las tiradas de dados usando el `diceRollerTool`, hasta que le vuelva a tocar a un jugador humano.

#### Herramienta: `oocAssistant`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/flows/ooc-assistant.ts`
*   **Rol**: El experto en **reglas y preguntas fuera de personaje**.
*   **Función**: Responde a las preguntas del jugador (que empiezan por `//`) basándose en las instrucciones de su prompt.

---

### Sub-Expertos y Bases de Conocimiento

Estas son herramientas y funciones de apoyo utilizadas por los módulos principales.

#### Herramienta: `companionExpert`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/tools/companion-expert.ts`
*   **Rol**: El "cerebro" para los compañeros de grupo controlados por la IA.
*   **Función**: Invocado por `narrativeExpert` (durante la exploración) y `combatManagerTool` (durante el combate). Decide la acción o diálogo más lógico para un compañero basándose en su personalidad y el contexto actual.

#### Herramienta: `enemyTactician`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/tools/enemy-tactician.ts`
*   **Rol**: El "cerebro" táctico para los enemigos en combate.
*   **Función**: Es invocado por el `combatManagerTool` durante el turno de un enemigo. Decide la acción más efectiva (atacar, usar una habilidad, etc.) basándose en el estado del combate y las capacidades del monstruo.

#### Herramienta: `adventureLookupTool`
*   **Tipo**: **Herramienta de Búsqueda (Función)**
*   **Archivo**: `src/ai/tools/adventure-lookup.ts`
*   **Rol**: La **enciclopedia de la aventura**. No es una IA.
*   **Función**: Una función que busca información sobre cualquier lugar, personaje, monstruo u objeto en el archivo JSON de la aventura. Es utilizada por los módulos de IA para obtener contexto.

#### Herramienta: `dndApiLookupTool`
*   **Tipo**: **Herramienta de Búsqueda (Función)**
*   **Archivo**: `src/ai/tools/dnd-api-lookup.ts`
*   **Rol**: El **manual de reglas de D&D 5e**. No es una IA.
*   **Función**: Una función que busca información general sobre reglas, hechizos, monstruos, etc., en una API externa (dnd5eapi.co).

#### Herramienta: `diceRollerTool`
*   **Tipo**: **Herramienta Lógica (Tool)**
*   **Archivo**: `src/ai/tools/dice-roller.ts`
*   **Rol**: El **motor de dados** del juego. No es una IA.
*   **Función**: Recibe una notación de dados (ej: "1d20+4") y devuelve el resultado desglosado (tiradas individuales, modificador y total). Es utilizada principalmente por el `combatManagerTool` para resolver las acciones de combate.
