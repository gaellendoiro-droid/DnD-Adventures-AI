# Arquitectura de IA con `gameCoordinator` (Revisada)

Este documento describe la arquitectura de la IA del juego, centrada en un módulo `gameCoordinator` que actúa como cerebro central, orquestando diferentes herramientas expertas para gestionar la narrativa, el combate y las interacciones con el jugador.

---

### Módulo Central de IA: `gameCoordinator`

*   **Tipo**: **Flujo Lógico (Función de TypeScript)**
*   **Archivo**: `src/ai/flows/game-coordinator.ts`
*   **Rol**: El cerebro central y director de orquesta del Dungeon Master. No es una IA en sí, sino una función de TypeScript que decide qué hacer. Su responsabilidad es analizar el estado del juego y la acción del jugador para determinar el siguiente paso.
*   **Lógica Interna**:
    1.  Determina el contexto: ¿Es una pregunta fuera de personaje (`//`)? ¿Estamos en combate? ¿Es una acción de ataque?
    2.  Si es una acción de ataque, **él mismo** usa la `adventureLookupTool` para validar al enemigo, inicia el combate, tira la iniciativa y devuelve el nuevo estado de combate.
    3.  Si es una acción de exploración normal, busca la información de la ubicación actual y se la pasa al `narrativeExpert`.
    4.  Si estamos en combate, delega la gestión del turno al `combatManagerTool`.
*   **Herramientas que utilizará**:
    *   `narrativeExpert` (IA)
    *   `combatManagerTool` (IA)
    *   `oocAssistant` (IA)
    *   `adventureLookupTool` (Herramienta de Búsqueda)

---

### Herramientas Expertas (Lógica Delegada)

Estos módulos son "expertos" en tareas específicas. Algunos son IA con su propio cerebro (prompt), mientras que otros son funciones lógicas.

#### Herramienta: `narrativeExpert`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/flows/narrative-expert.ts`
*   **Rol**: El experto en **narración y exploración**. Su única tarea es contar la historia.
*   **Función**: Cuando la coordinadora lo llama, este se encarga de generar la historia. Utiliza el contexto de la ubicación actual que le proporciona el `gameCoordinator` para describir los resultados de las acciones de exploración. Conserva el acceso a las herramientas de búsqueda (`adventureLookupTool`) para obtener información sobre *nuevos* elementos que el coordinador no le haya pasado (como preguntar por un PNJ o un lugar al que no se ha ido aún).
*   **Herramientas que utiliza**:
    *   `adventureLookupTool` (Herramienta de Búsqueda)
    *   `dndApiLookupTool` (Herramienta de Búsqueda)
    *   `companionExpert` (IA)

#### Herramienta: `combatManagerTool`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/tools/combat-manager.ts`
*   **Rol**: El **gestor de una ronda de combate de PNJ**.
*   **Función**: Cuando la coordinadora lo invoca, esta herramienta ejecuta un bucle de turnos de combate. Orquesta las acciones de los PNJ (compañeros y enemigos) llamando a los expertos correspondientes (`companionExpert` y `enemyTactician`) hasta que le vuelva a tocar a un jugador humano o el combate termine.
*   **Herramientas que utiliza**:
    *   `companionExpert` (IA)
    *   `enemyTactician` (IA)
    *   `diceRollerTool` (Herramienta Lógica)

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
*   **Tipo**: **Herramienta de Búsqueda (Función Lógica)**
*   **Archivo**: `src/ai/tools/adventure-lookup.ts`
*   **Rol**: La **enciclopedia de la aventura**. No es una IA.
*   **Función**: Una función que busca información sobre cualquier lugar, personaje, monstruo u objeto en el archivo JSON de la aventura. Es utilizada por los módulos de IA para obtener contexto.

#### Herramienta: `dndApiLookupTool`
*   **Tipo**: **Herramienta de Búsqueda (Función Lógica)**
*   **Archivo**: `src/ai/tools/dnd-api-lookup.ts`
*   **Rol**: El **manual de reglas de D&D 5e**. No es una IA.
*   **Función**: Una función que busca información general sobre reglas, hechizos, monstruos, etc., en una API externa (dnd5eapi.co).

#### Herramienta: `diceRollerTool`
*   **Tipo**: **Herramienta Lógica (Función Lógica)**
*   **Archivo**: `src/ai/tools/dice-roller.ts`
*   **Rol**: El **motor de dados** del juego. No es una IA.
*   **Función**: Recibe una notación de dados (ej: "1d20+4") y devuelve el resultado desglosado (tiradas individuales, modificador y total). Es utilizada principalmente por el `combatManagerTool` para resolver las acciones de combate de los PNJs.
