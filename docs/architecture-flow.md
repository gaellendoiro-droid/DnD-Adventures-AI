# Flujo de Arquitectura de IA: Del Intérprete a la Narración

Este documento detalla el flujo de trabajo completo del sistema de IA, demostrando cómo una simple acción del jugador se procesa a través de una cadena de módulos especializados, comenzando con el `actionInterpreter`.

### Módulos Principales
*   **`gameCoordinator`**: El orquestador lógico (TypeScript) que dirige el flujo del turno.
*   **`actionInterpreter`**: Un flujo de IA que traduce el texto del jugador a una intención estructurada.
*   **`narrativeExpert`**: Un flujo de IA que narra la historia y los resultados.
*   **`companionExpertTool`**: Una herramienta de IA que genera las acciones de los compañeros.
*   **`combatManagerTool`**: Una herramienta de IA que gestiona las rondas de combate de los PNJ.

---

### **ESCENARIO 1: ACCIÓN DE MOVIMIENTO E INTERACCIÓN**

**SITUACIÓN:** El grupo está en la `phandalin-plaza-del-pueblo`.

**1. Acción del Jugador**
> **Jugador escribe:** `Entramos en Suministros Barthen y le pregunto al tendero si ha oído algún rumor.`

**2. El `gameCoordinator` Llama al `actionInterpreter`**
*   **Análisis del `gameCoordinator`**: "He recibido una acción. Primero, necesito entender qué quiere hacer el jugador".
*   **Acción**: Invoca al `actionInterpreter`, pasándole la acción del jugador (`playerAction`) y el contexto de la ubicación actual (`locationContext`, que incluye las salidas válidas).

**3. El `actionInterpreter` Analiza la Intención**
*   **Lógica del `actionInterpreter`**: "La acción es 'Entramos en Suministros Barthen...'. La primera parte coincide claramente con una intención de movimiento. ¿Es 'Suministros Barthen' una salida válida?"
*   **Análisis de Contexto**: Compara "Suministros Barthen" con las `exits` y encuentra una coincidencia.
*   **Salida del `actionInterpreter`**: Devuelve un objeto estructurado. La implementación actual prioriza el movimiento, por lo que la interacción posterior se tratará como parte de la acción narrativa general.
    ```json
    { "actionType": "move", "targetId": "suministros-barthen" }
    ```

**4. El `gameCoordinator` Procesa la Intención y Delega la Narración**
*   **Lógica del `gameCoordinator`**: "El intérprete dice que es un movimiento a 'suministros-barthen'. Primero, actualizo el estado del juego a la nueva ubicación. Ahora, necesito que el narrador describa la llegada y la escena, incluyendo la pregunta sobre los rumores".
*   **Acción del `gameCoordinator`**:
    1.  Actualiza el estado interno `locationId` a `"suministros-barthen"`.
    2.  Invoca al `narrativeExpert`, pasándole la acción original del jugador y el contexto de la **nueva ubicación** (`suministros-barthen`).

**5. El `narrativeExpert` Construye la Escena**
*   **Lógica del `narrativeExpert`**: "Estoy en 'suministros-barthen' y la acción del jugador fue preguntar por rumores. Usaré el contexto de la ubicación para describir la tienda y al PNJ Elmar Barthen. Luego, narraré su respuesta al jugador".
*   **Salida del `narrativeExpert`**: Genera la narración principal.
    > **Narración generada**: "Entráis en Suministros Barthen... Elmar Barthen os saluda. Al preguntarle por rumores, dice: 'Se oye que Adabra Gwynn, la comadrona, no ha venido a por suministros...'"

**6. El `gameCoordinator` Gestiona las Reacciones de Compañeros**
*   **Lógica del `gameCoordinator`**: "La narración principal está hecha. Ahora, mis compañeros de IA deben reaccionar a esta nueva información".
*   **Acción**: Llama secuencialmente al `companionExpertTool` para Elara y Merryl con el contexto de la narración del DM.
*   **Salida**: Recopila las acciones de los compañeros, las empaqueta con la narración del DM y envía todo al cliente.

---

### **ESCENARIO 2: INICIO DE COMBATE**

**SITUACIÓN:** El grupo viaja a la `colina-del-resentimiento`.

**1. Acción del Jugador**
> **Jugador escribe:** `¡No podemos dejar que la mate! Le disparo una flecha a la Mantícora.`

**2. El `gameCoordinator` Llama al `actionInterpreter`**
*   **Acción**: Pasa la acción del jugador al `actionInterpreter`.

**3. El `actionInterpreter` Identifica el Ataque**
*   **Lógica del `actionInterpreter`**: "La frase 'le disparo una flecha a la Mantícora' es inequívocamente un ataque".
*   **Salida del `actionInterpreter`**:
    ```json
    { "actionType": "attack", "targetId": "Mantícora" }
    ```

**4. El `gameCoordinator` Inicia el Combate**
*   **Lógica del `gameCoordinator`**: "El intérprete dice que es un ataque. El objetivo es 'Mantícora'. Debo iniciar el modo combate".
*   **Acción del `gameCoordinator`**:
    1.  Verifica que "Mantícora" es un enemigo válido en la ubicación actual.
    2.  Cambia el estado del juego a `inCombat: true`.
    3.  Recopila a todos los enemigos presentes y al grupo.
    4.  **Calcula la iniciativa** para todos los combatientes.
    5.  Prepara la respuesta para el cliente, que incluye el mensaje de inicio de combate y el orden de iniciativa.
    6.  Si el primer turno es de un PNJ, llama inmediatamente al `combatManagerTool` para gestionar la ronda.

---

### **ESCENARIO 3: TURNO DE COMBATE**

**SITUACIÓN:** El combate ha comenzado. El turno actual es de un PNJ (un enemigo o un compañero de IA).

**1. El `gameCoordinator` Delega la Gestión del Combate**
*   **Análisis del `gameCoordinator`**: "Estoy en combate (`inCombat: true`) y no es el turno de un jugador humano".
*   **Decisión**: "Debo ceder el control a mi gestor de rondas de combate".
*   **Acción**: Invoca a la herramienta `combatManagerTool`.

**2. La `combatManagerTool` Orquesta los Turnos de PNJ**
*   **Lógica**: El `combatManagerTool` entra en un bucle que se ejecutará hasta que llegue el turno de un jugador humano.
*   **Turno de Enemigo**:
    1.  Invoca al `enemyTacticianTool`, que decide la acción del enemigo y las tiradas de dados necesarias.
*   **Turno de Compañero IA**:
    1.  Invoca al `companionExpertTool`, que decide la acción del compañero.
*   **Fin del Bucle**: El siguiente en el orden de iniciativa es un jugador humano. El bucle se detiene.
*   **Salida**: Recopila todas las acciones y narraciones de la ronda y las devuelve al `gameCoordinator`, que las envía al cliente.
