# Arquitectura de la IA: Una Guía Completa

Este documento es la guía de referencia principal para la arquitectura de la IA que impulsa D&D Adventures AI. El sistema está diseñado de forma modular, con un "director de orquesta" lógico que invoca a diferentes "expertos" (flujos de IA) y "ayudantes" (herramientas) para gestionar cada turno del juego.

---

## Módulo Central: `gameCoordinator`

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

## Módulos Expertos de IA (Flujos Principales)

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

## Módulos y Herramientas de Combate

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

## Herramientas de Apoyo (Ayudantes)

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
*   **Función**: Su única misión es encontrar un objeto de ubicación en el JSON de la aventura basándose en una consulta flexible. Utiliza un sistema de búsqueda por capas:
    1.  **Capa 1: Coincidencia Exacta:** Comprueba si la consulta coincide exactamente con un `id` o `title` de ubicación.
    2.  **Capa 2: Búsqueda por Entidad:** Comprueba si la consulta coincide con el nombre de un PNJ y, de ser así, encuentra la ubicación donde está presente.
    3.  **Capa 3: Inclusión de Frase:** Comprueba si el título de una ubicación contiene la frase de la consulta (ej: "Escudo de León" en "Bazar Escudo de León").
    4.  **Capa 4: Palabras Clave:** Comprueba si *alguna* de las palabras de la consulta está presente en el título de la ubicación (ej: "barthen" en "Suministros Barthen").
*   **Uso Principal**: Es la herramienta clave del `actionInterpreter` para permitir que los jugadores se muevan por el mundo de forma natural.

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

---

# Apéndice A: Flujo de Juego (Ejemplos)

Esta sección detalla el flujo de trabajo completo del sistema, demostrando cómo una simple acción del jugador se procesa a través de una cadena de módulos especializados.

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
    
---
    
# Apéndice B: Futuras Mejoras y Hoja de Ruta

Este apéndice describe posibles mejoras y nuevas funcionalidades que podrían llevar la experiencia de D&D Adventures AI al siguiente nivel.

### 1. IA Conversacional Avanzada (Interacción en Tiempo Real)

*   **Problema Actual:** Los compañeros de IA reaccionan de forma aislada a la acción del jugador, sin ser conscientes de lo que los otros compañeros han dicho en el mismo turno. El flujo es secuencial y el servidor devuelve todos los mensajes a la vez.
*   **Mejora Propuesta:**
    *   **Arquitectura de Streaming:** Reemplazar el modelo actual de "una petición, una respuesta" por una comunicación persistente entre el cliente y el servidor (usando, por ejemplo, WebSockets o Server-Sent Events).
    *   **Flujo de Turno por Pasos:** El servidor generaría y enviaría los mensajes uno por uno, permitiendo que las reacciones de los compañeros se construyan sobre las reacciones de los demás en tiempo real.
*   **Impacto:** Lograría una dinámica de grupo mucho más orgánica y creíble.

### 2. Sistema de Inicio de Combate Dinámico (Alta Prioridad)

*   **Problema Actual:** El combate solo se inicia si el jugador declara explícitamente un ataque. El juego no reacciona si una acción narrativa (como insultar a un guardia) debería lógicamente provocar un enfrentamiento.
*   **Mejora Propuesta:**
    *   Añadir un paso de **"Evaluación de Hostilidad"** al `gameCoordinator` que, después de una acción, evalúe si la disposición de un PNJ neutral debería cambiar a hostil, iniciando el combate automáticamente.
*   **Impacto:** Haría que el mundo se sintiera más vivo y peligroso. Las acciones de los jugadores tendrían consecuencias reales e inmediatas.

### 3. Sistema de Progresión y Gestión
*   **Sistema de Experiencia (XP) y Subida de Nivel:** La IA podría otorgar XP por completar misiones o superar desafíos, permitiendo a los personajes subir de nivel y mejorar sus estadísticas y habilidades.
*   **Gestión de Inventario y Economía:** Mejorar la interacción con comerciantes para que el oro y los tesoros tengan un propósito funcional, permitiendo comprar y vender objetos.
*   **Persistencia de Datos:** Reemplazar el sistema de guardado en archivos por una base de datos (como Firestore) para un guardado automático y continuo.

### 4. Calidad y Robustez de la IA
*   **Implementación de RAG (Retrieval-Augmented Generation):** Migrar de la búsqueda directa en JSON a un sistema RAG. Esto permitiría a la IA "preguntar" en lenguaje natural sobre el lore de la aventura, en lugar de depender de búsquedas por ID, desbloqueando una comprensión del mundo mucho más profunda.
*   **Memoria a Largo Plazo:** Implementar un sistema para que la IA recuerde eventos y decisiones clave de sesiones anteriores, influyendo en la narrativa a largo plazo.
