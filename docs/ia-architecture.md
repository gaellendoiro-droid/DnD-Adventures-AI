# Arquitectura de la IA: Un Vistazo Profundo

Este documento es la guía de referencia principal para la arquitectura de la IA que impulsa D&D Adventures AI. El sistema está diseñado de forma modular, con un "director de orquesta" lógico que invoca a diferentes "expertos" (flujos de IA) y "ayudantes" (herramientas) para gestionar cada turno del juego.

---

### Módulo Central: `gameCoordinator`

*   **Tipo**: **Flujo Lógico (Función de TypeScript)**
*   **Archivo**: `src/ai/flows/game-coordinator.ts`
*   **Rol**: Es el **cerebro lógico y director de orquesta** del Dungeon Master. No es una IA en sí mismo, sino el código principal que gestiona el estado del juego, mantiene el orden del turno y decide qué experto llamar a continuación.
*   **Lógica Interna**:
    1.  Recibe la acción del jugador desde la interfaz.
    2.  Invoca al `actionInterpreter` para traducir el texto libre del jugador a una intención estructurada.
    3.  Si la acción es fuera de personaje (`ooc`), delega al `oocAssistant` y termina el turno.
    4.  Si la acción implica movimiento (`move`), actualiza la ubicación del grupo en el estado del juego.
    5.  Si el juego está en modo combate, delega la gestión de los turnos de los PNJ (enemigos y compañeros) al `combatManagerTool`.
    6.  Si se está en modo narrativo, invoca al `narrativeExpert` para que genere la descripción de la escena y el resultado de la acción del jugador.
    7.  Tras la narración principal, invoca al `companionExpertTool` para generar las reacciones de los compañeros de IA.
    8.  Finalmente, empaqueta todos los mensajes generados, los cambios de estado (como la nueva ubicación o el estado del combate) y los devuelve al cliente para que se rendericen.

---

### Módulos Expertos de IA (Flujos Principales)

Estos son flujos de IA especializados, cada uno con un `prompt` y un conjunto de herramientas diseñadas para una tarea específica.

#### `actionInterpreter`
*   **Tipo**: Flujo de IA con Herramientas
*   **Archivo**: `src/ai/flows/action-interpreter.ts`
*   **Rol**: El **traductor de intención**. Su única misión es convertir la entrada de texto libre del jugador (ej: "voy a la posada y hablo con el posadero") en una acción estructurada que el `gameCoordinator` pueda entender (ej: `{ actionType: "move", targetId: "posada-rocacolina" }`).
*   **Herramienta Clave**: Utiliza intensivamente la `locationLookupTool` para resolver destinos de viaje que no son salidas obvias desde la ubicación actual.

#### `narrativeExpert`
*   **Tipo**: Flujo de IA
*   **Archivo**: `src/ai/flows/narrative-expert.ts`
*   **Rol**: El **narrador principal y cuentacuentos**.
*   **Función**: Describe la escena, narra el resultado de las acciones del jugador, da vida a los PNJs con los que se interactúa y describe los entornos. Es invocado por el `gameCoordinator` *después* de que la intención ya ha sido interpretada. Su `prompt` le instruye para que se base en la acción interpretada y en el contexto de la aventura.

#### `oocAssistant`
*   **Tipo**: Flujo de IA
*   **Archivo**: `src/ai/flows/ooc-assistant.ts`
*   **Rol**: El **asistente del DM para preguntas fuera de personaje**.
*   **Función**: Se activa cuando el jugador usa el prefijo `//`. Responde a preguntas sobre reglas, el estado del juego o aclara dudas. Utiliza la `dndApiLookupTool` para buscar reglas específicas de D&D 5e.

---

### Módulos y Herramientas de Combate

#### `combatManagerTool`
*   **Tipo**: Herramienta Lógica (TypeScript)
*   **Archivo**: `src/ai/tools/combat-manager.ts`
*   **Rol**: El **gestor de rondas de combate**.
*   **Función**: Cuando el juego entra en modo combate, el `gameCoordinator` le cede el control para gestionar los turnos que no pertenecen al jugador humano. Entra en un bucle que procesa los turnos de enemigos y compañeros de IA en el orden de iniciativa, hasta que llega de nuevo el turno del jugador humano o el combate termina.

#### `enemyTacticianTool`
*   **Tipo**: Herramienta de IA
*   **Archivo**: `src/ai/tools/enemy-tactician.ts`
*   **Rol**: El **cerebro táctico de los enemigos**.
*   **Función**: Es invocado por el `combatManagerTool` durante el turno de un enemigo. Decide la acción más lógica para ese enemigo basándose en el estado del combate (quién está herido, quién es la mayor amenaza), su propia inteligencia y sus habilidades (que puede consultar con `dndApiLookupTool`). Devuelve la acción, la narración y las tiradas de dados necesarias para resolverla.

---

### Herramientas de Apoyo (Ayudantes)

Estas herramientas proporcionan capacidades específicas a los flujos y módulos de IA.

#### `companionExpertTool`
*   **Tipo**: Herramienta de IA
*   **Archivo**: `src/ai/tools/companion-expert.ts`
*   **Rol**: La **personalidad de los compañeros de IA**.
*   **Función**: Decide qué dice o hace un compañero controlado por la IA en cada turno, basándose en su personalidad, la situación actual (combate o exploración) y el contexto de la conversación. Puede decidir no hacer nada si el personaje no tiene nada relevante que aportar.

#### `locationLookupTool`
*   **Tipo**: Herramienta de Búsqueda (Lógica TypeScript)
*   **Archivo**: `src/ai/tools/location-lookup.ts`
*   **Rol**: El **GPS de la aventura**.
*   **Función**: Su única misión es encontrar un objeto de ubicación en el JSON de la aventura basándose en una consulta flexible. Utiliza un sistema de búsqueda por capas (coincidencia exacta, búsqueda por PNJ, inclusión de frase y, finalmente, por palabras clave) para garantizar la máxima precisión. Es la herramienta clave del `actionInterpreter`.

#### `adventureLookupTool`
*   **Tipo**: Herramienta de Búsqueda
*   **Archivo**: `src/ai/tools/adventure-lookup.ts`
*   **Rol**: El **archivista de la aventura**.
*   **Función**: Permite a los flujos de IA consultar información detallada sobre cualquier entidad (monstruo, PNJ, objeto interactivo) o ubicación del archivo JSON de la aventura.

#### `dndApiLookupTool`
*   **Tipo**: Herramienta de Búsqueda Externa
*   **Archivo**: `src/ai/tools/dnd-api-lookup.ts`
*   **Rol**: El **experto en reglas de D&D 5e**.
*   **Función**: Realiza consultas a una API externa (`dnd5eapi.co`) para obtener información oficial sobre monstruos, hechizos, objetos, etc. Esto asegura que las habilidades y estadísticas usadas en el juego sean correctas.

#### `diceRollerTool`
*   **Tipo**: Herramienta de Utilidad
*   **Archivo**: `src/ai/tools/dice-roller.ts`
*   **Rol**: El **lanzador de dados virtual**.
*   **Función**: Recibe una notación de dados (ej: "1d20+5") y devuelve un resultado estructurado con el total, las tiradas individuales y el modificador. Lo usan principalmente los módulos de combate.

#### `characterLookupTool`
*   **Tipo**: Herramienta de Búsqueda
*   **Archivo**: `src/ai/tools/character-lookup.ts`
*   **Rol**: El **gestor de fichas de personaje**.
*   **Función**: Permite a los flujos de IA (especialmente al `companionExpertTool`) consultar la ficha completa de un personaje del grupo, incluyendo su inventario, hechizos y habilidades.
