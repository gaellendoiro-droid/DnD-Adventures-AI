# Arquitectura de IA con `gameCoordinator`

Este documento describe la arquitectura de la IA del juego, centrada en un módulo `gameCoordinator` que actúa como cerebro central, orquestando diferentes herramientas expertas para gestionar la narrativa, el combate y las interacciones con el jugador.

---

### Módulo Central de IA: `gameCoordinator`

Este será un nuevo flujo de Genkit y el único al que la aplicación llamará directamente.

*   **Rol**: El cerebro central del Dungeon Master. Su única responsabilidad es analizar el estado actual del juego y la acción del jugador, y decidir qué herramienta experta es la más adecuada para manejar la situación.
*   **Input**:
    *   `playerAction`: La acción o el diálogo del jugador.
    *   `gameState`: El estado completo del juego (quién está en el grupo, dónde están, si están en combate, historial de conversación, etc.).
*   **Lógica Interna**:
    1.  Determina el contexto: ¿Es una pregunta fuera de personaje (`//`)? ¿Estamos en combate? ¿Es una acción narrativa?
    2.  Invoca a la herramienta experta apropiada para la tarea. Por ejemplo, si es una acción narrativa, llamará a `narrativeExpertTool`.
    3.  Recibe el resultado de la herramienta experta y lo devuelve como su propia salida.
*   **Herramientas que utilizará**:
    *   `narrativeExpertTool`
    *   `combatTurnTool`
    *   `oocAssistantTool`
    *   `adventureLookupTool`

---

### Herramientas Expertas (Lógica Delegada)

Los módulos que antes eran flujos independientes se convierten en herramientas que la `gameCoordinator` puede utilizar. Esto permite a la coordinadora delegar tareas complejas.

#### Herramienta: `narrativeExpertTool`
*   **Rol**: Sigue siendo el experto en **narración y exploración**.
*   **Función**: Cuando la coordinadora lo llama, este se encarga de generar la historia, describir los resultados de las acciones de exploración y decidir si se inicia un combate. Su lógica interna no cambia mucho, pero ahora es "activado" por la coordinadora.

#### Herramienta: `combatTurnTool`
*   **Rol**: Un nuevo concepto que encapsula un **turno o una ronda completa de combate**.
*   **Función**: Cuando la coordinadora detecta que estamos en combate, invoca esta herramienta. `combatTurnTool` orquesta los turnos de los PNJ (llamando internamente a `companionExpert` y `enemyTactician`) hasta que le vuelva a tocar al jugador humano. Esto mantiene la lógica de combate contenida.

#### Herramienta: `oocAssistantTool`
*   **Rol**: El experto en **reglas y preguntas fuera de personaje**.
*   **Función**: Responde a las preguntas del jugador cuando la coordinadora detecta que el mensaje empieza por `//`.

---

### Herramientas de Información (Bases de Conocimiento)

Estas herramientas siguen siendo cruciales para que todas las IAs tengan acceso a la información.

#### Herramienta: `adventureLookupTool`
*   **Rol**: La **enciclopedia de la aventura**.
*   **Función**: Busca información sobre cualquier lugar, personaje, monstruo u objeto en el archivo JSON de la aventura. Puede ser utilizada por la `gameCoordinator` o por cualquiera de las herramientas expertas para obtener contexto.

#### Herramienta: `dndApiLookupTool`
*   **Rol**: El **manual de reglas de D&D 5e**.
*   **Función**: Busca información general sobre reglas, hechizos, monstruos, etc., en una API externa.
