# Arquitectura de Flujo de IA con `gameCoordinator` y `actionInterpreter`

Este documento detalla el flujo de trabajo completo, desde la exploración normal hasta la transición a combate, utilizando la arquitectura centrada en una IA `gameCoordinator` que primero determina la intención del jugador a través de un `actionInterpreter`.

### Personajes en la Escena:
*   **Galador** (Jugador Humano)
*   **Elara** (Compañera IA)
*   **Merryl** (Compañero IA)
*   **Elmar Barthen** (PNJ)
*   **Mantícora** (Enemigo)

---

### **FASE 1: MODO EXPLORACIÓN EN PHANDALIN**

**ESCENA:** El grupo está en la plaza de Phandalin. El estado del juego es `inCombat: false`.

**1. Acción del Jugador**
> **Jugador escribe:** `Entramos en Suministros Barthen y le pregunto al tendero si ha oído algún rumor.`

**2. El `gameCoordinator` Llama al `actionInterpreter`**
*   **Análisis del `gameCoordinator`**: "He recibido una acción. Primero, necesito entender qué quiere hacer el jugador".
*   **Acción del `gameCoordinator`**: Invoca al `actionInterpreter`, pasándole la acción del jugador (`playerAction`) y el contexto de la ubicación actual (`locationContext`).

**3. El `actionInterpreter` Analiza la Intención**
*   **Lógica del `actionInterpreter`**: "La acción es 'Entramos en Suministros Barthen...'. Esto parece una intención de moverse y luego interactuar. El movimiento tiene prioridad. ¿Es 'Suministros Barthen' una salida válida?"
*   **Análisis de Contexto**: Compara la acción con las `exits` en el `locationContext`. Encuentra una coincidencia.
*   **Salida del `actionInterpreter`**: Devuelve un objeto estructurado al `gameCoordinator`.
    ```json
    { "actionType": "move", "targetId": "suministros-barthen" }
    ```
    *(Nota: Una implementación más avanzada podría devolver múltiples intenciones, pero por ahora nos centramos en la principal).*

**4. El `gameCoordinator` Procesa la Intención y Delega la Narración**
*   **Lógica del `gameCoordinator`**: "El intérprete dice que es un movimiento a 'suministros-barthen'. Primero, actualizo el estado del juego a la nueva ubicación. Ahora, necesito que el narrador describa la llegada y la escena".
*   **Acción del `gameCoordinator`**:
    1.  Actualiza `locationId` a `"suministros-barthen"`.
    2.  Invoca al `narrativeExpert`, pasándole la acción original del jugador y el contexto de la **nueva ubicación** (`suministros-barthen`).

**5. El `narrativeExpert` Construye la Escena**
*   **Lógica del `narrativeExpert`**: "Estoy en 'suministros-barthen' y la acción fue preguntar por rumores. Usaré el contexto de la ubicación que me han pasado para describir la tienda y al PNJ presente, Elmar Barthen. Luego, narraré el resultado de la pregunta".
*   **Salida del `narrativeExpert`**: Genera la narración y la devuelve.
    > **Narración generada**: "Entráis en Suministros Barthen, un local abarrotado de mercancías. Un humano delgado de unos cincuenta años, Elmar Barthen, os saluda desde el mostrador. Al preguntarle por rumores, se rasca la barbilla y dice: 'Pues se oye que Adabra Gwynn, la comadrona del viejo molino, no ha venido a por suministros...'"

**6. El `gameCoordinator` Gestiona las Reacciones de Compañeros**
*   **Lógica del `gameCoordinator`**: "La narración principal está hecha. Ahora, veamos si los compañeros reaccionan a esta escena".
*   **Acción del `gameCoordinator`**: Llama al `companionExpertTool` para Elara y Merryl con el contexto de la narración del DM.
*   **Salida**: Recopila las acciones de los compañeros y envía todos los mensajes (DM y compañeros) al cliente.

---

### **FASE 2: TRANSICIÓN A COMBATE**

**ESCENA:** El grupo ha viajado a la Colina del Resentimiento.

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
*   **Lógica del `gameCoordinator`**: "El intérprete dice que es un ataque. El objetivo es 'Mantícora'. Debo iniciar el combate."
*   **Acción del `gameCoordinator`**:
    1.  Usa la `adventureLookupTool` para verificar que "Mantícora" es un enemigo válido en la ubicación actual.
    2.  Si es válido, cambia el estado del juego a `inCombat: true`.
    3.  Recopila a todos los enemigos presentes y al grupo.
    4.  **Calcula la iniciativa** para todos los combatientes.
    5.  Prepara la respuesta para el cliente, que incluye el mensaje de inicio de combate, el orden de iniciativa y los datos de los enemigos.
    6.  Si el primer turno es de un PNJ, llama inmediatamente al `combatManagerTool`.

**5. La Aplicación Procesa el Inicio del Combate**
*   La aplicación recibe la respuesta del `gameCoordinator`.
*   Renderiza el mensaje de inicio de combate.
*   Muestra la interfaz de combate con el orden de iniciativa.
*   Espera el turno del jugador humano o muestra los resultados de la primera ronda de PNJ.

---

### **FASE 3: MODO COMBATE**

**ESCENA:** El orden de iniciativa es: 1. Elara, 2. Mantícora, 3. Galador. El turno actual es el de **Elara**.

**1. El `gameCoordinator` Delega la Gestión del Combate**
*   **Análisis del `gameCoordinator`**: "Estoy en combate (`inCombat: true`) y no es el turno de un jugador humano".
*   **Decisión del `gameCoordinator`**: "Debo ceder el control a mi gestor de rondas de combate".
*   **Acción del `gameCoordinator`**: Invoca a la herramienta `combatManagerTool`.

**2. La `combatManagerTool` Orquesta la Ronda de PNJ**
*   **Lógica del Gestor de Combate**: El `combatManagerTool` entra en un bucle que se ejecutará hasta que llegue el turno de un jugador humano.
*   **Turno de Elara (Aliada IA)**:
    1.  Invoca al `companionExpertTool`, que decide la acción de Elara.
*   **Turno de la Mantícora (Enemigo)**:
    1.  Invoca al `enemyTactician`, que decide la acción de la Mantícora y las tiradas de dados necesarias.
*   **Fin del Bucle**: El siguiente en el orden de iniciativa es Galador (el jugador humano). El bucle se detiene.
*   **Salida del Gestor de Combate**: Recopila todas las acciones y narraciones de la ronda y se las devuelve al `gameCoordinator`, que las pasa al cliente para que se muestren.
> **Sistema**: Es tu turno, Galador.
