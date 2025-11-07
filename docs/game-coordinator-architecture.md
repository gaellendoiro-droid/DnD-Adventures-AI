# Arquitectura de IA con `gameCoordinator` (Revisada)

Este documento describe la arquitectura de la IA del juego, centrada en un módulo `gameCoordinator` que actúa como cerebro central, orquestando diferentes herramientas expertas para gestionar la narrativa, el combate y las interacciones con el jugador.

---

### Módulo Central de IA: `gameCoordinator`

*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/flows/game-coordinator.ts`
*   **Rol**: El cerebro central del Dungeon Master. Su única responsabilidad es analizar el estado actual del juego y la acción del jugador, y decidir qué herramienta experta es la más adecuada para manejar la situación.
*   **Input**:
    *   `playerAction`: La acción o el diálogo del jugador.
    *   `gameState`: El estado completo del juego (quién está en el grupo, dónde están, si están en combate, etc.).
*   **Lógica Interna (Prompt)**:
    1.  Determina el contexto: ¿Es una pregunta fuera de personaje (`//`)? ¿Estamos en combate? ¿Es una acción narrativa?
    2.  Invoca a la herramienta experta apropiada para la tarea.
*   **Herramientas que utilizará**:
    *   `narrativeExpert`
    *   `combatManagerTool`
    *   `oocAssistant`

---

### Herramientas Expertas (Lógica Delegada)

Estos módulos son "expertos" en tareas específicas. Algunos son IA con su propio cerebro (prompt), mientras que otros son funciones lógicas.

#### Herramienta: `narrativeExpert`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/flows/narrative-expert.ts`
*   **Rol**: El experto en **narración y exploración**.
*   **Función**: Cuando la coordinadora lo llama, este se encarga de generar la historia, describir los resultados de las acciones de exploración y decidir si se inicia un combate. Su lógica interna se basa en un prompt detallado.

#### Herramienta: `combatManagerTool`
*   **Tipo**: **Herramienta Lógica (Tool)**
*   **Archivo**: `src/ai/tools/combat-manager.ts`
*   **Rol**: El **gestor mecánico del combate**. No tiene un prompt propio.
*   **Función**: Cuando la coordinadora lo invoca, esta herramienta ejecuta un bucle de turnos de combate. Orquesta las acciones de los PNJ llamando a los expertos correspondientes (`companionExpert` y `enemyTactician`) hasta que le vuelva a tocar a un jugador humano.

#### Herramienta: `oocAssistant`
*   **Tipo**: **Módulo de IA (Flujo con Prompt)**
*   **Archivo**: `src/ai/flows/ooc-assistant.ts`
*   **Rol**: El experto en **reglas y preguntas fuera de personaje**.
*   **Función**: Responde a las preguntas del jugador (que empiezan por `//`) basándose en las instrucciones de su prompt.

---

### Sub-Expertos y Bases de Conocimiento

Estas son herramientas y funciones de apoyo utilizadas por los módulos principales.

#### Herramienta: `companionExpert` & `enemyTactician`
*   **Tipo**: **Módulos de IA (Flujos con Prompt)**
*   **Archivos**: `src/ai/tools/companion-expert.ts` y `src/ai/tools/enemy-tactician.ts`
*   **Rol**: Son los "cerebros" para los compañeros de grupo y los enemigos, respectivamente.
*   **Función**: Son invocados por el `combatManagerTool` durante el combate. Cada uno tiene su propio prompt para decidir la acción más lógica para el personaje o monstruo en su turno.

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
