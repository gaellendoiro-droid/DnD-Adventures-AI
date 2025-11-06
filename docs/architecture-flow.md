# Arquitectura de Flujo de IA con `gameCoordinator`

Este documento detalla el flujo de trabajo completo, desde la exploración normal hasta la transición a combate, utilizando la nueva arquitectura centrada en una IA `gameCoordinator`.

### Personajes en la Escena:
*   **Galador** (Jugador Humano)
*   **Elara** (Compañera IA)
*   **Merryl** (Compañero IA)
*   **Elmar Barthen** (PNJ)
*   **Mantícora** (Enemigo)

---

### **FASE 1: MODO EXPLORACIÓN EN PHANDALIN**

**ESCENA:** El grupo está en la plaza de Phandalin. El estado del juego es `inCombat: false`.

**1. Acción del Jugador (Interacción con PNJ)**
> **Jugador escribe:** `Entramos en Suministros Barthen y le pregunto al tendero si ha oído algún rumor.`

**2. La `gameCoordinator` Analiza y Delega**
*   **Análisis de la Coordinadora**:
    *   Estado: `inCombat` es `false`.
    *   Acción del jugador: Es una acción de exploración e interacción social.
*   **Decisión de la Coordinadora**: "El jugador quiere hablar con un PNJ e investigar. Esta es una tarea para mi experto en narrativa".
*   **Acción de la Coordinadora**: Invoca a la herramienta `narrativeExpertTool`, pasándole la acción del jugador y el contexto de la escena.

**3. La `narrativeExpertTool` Usa Herramientas para Construir la Escena**
*   **Lógica del Experto en Narrativa**: "El jugador entra a una tienda y habla con el tendero. Primero, necesito saber cómo es 'Suministros Barthen' y quién es el tendero".
*   **Uso de Herramienta de Información (Paso A)**: El `narrativeExpertTool` invoca a la `adventureLookupTool` con `query: "suministros-barthen"`.
*   **Respuesta de la Herramienta (Paso A)**: `adventureLookupTool` devuelve el JSON de la ubicación:
    ```json
    { "id": "suministros-barthen", "title": "Suministros Barthen", "description": "Las estanterías de esta tienda están repletas...", "entitiesPresent": ["elmar-barthen"], ... }
    ```
*   **Lógica del Experto en Narrativa (cont.)**: "Ok, el tendero es 'elmar-barthen'. Ahora necesito saber quién es él y qué sabe".
*   **Uso de Herramienta de Información (Paso B)**: Invoca de nuevo a la `adventureLookupTool` con `query: "elmar-barthen"`.
*   **Respuesta de la Herramienta (Paso B)**: `adventureLookupTool` devuelve el JSON del PNJ:
    ```json
    { "id": "elmar-barthen", "name": "Elmar Barthen", "description": "Un humano delgado y con entradas...", "dmNotes": "Puede compartir una historia local." }
    ```
*   **Salida del Experto en Narrativa**: Con toda esta información, el `narrativeExpertTool` genera la narración completa y se la devuelve a la coordinadora.
    > **Narración generada**: "Entráis en Suministros Barthen, un local abarrotado de mercancías. Un humano delgado de unos cincuenta años, Elmar Barthen, os saluda desde el mostrador. Cuando le preguntas por rumores, se rasca la barbilla y dice: 'Pues se oye que Adabra Gwynn, la comadrona que vive en el viejo molino de la Colina del Resentimiento, no ha venido al pueblo a por suministros. La gente empieza a preocuparse'. ¿Qué hacéis?"

---

### **FASE 2: INVESTIGACIÓN Y VIAJE**

**ESCENA:** El grupo está de vuelta en la plaza del pueblo.

**1. Acción del Jugador (Leer el tablón)**
> **Jugador escribe:** `Vamos a ver qué pone en el tablón de anuncios.`

**2. La `gameCoordinator` Delega a la `narrativeExpertTool`**
*   El flujo es el mismo: `gameCoordinator` identifica que es una acción de exploración y llama a `narrativeExpertTool`.

**3. La `narrativeExpertTool` Usa Herramientas**
*   **Lógica del Experto en Narrativa**: "El jugador quiere leer el 'tablón de anuncios'. Necesito la información de ese objeto interactivo".
*   **Uso de Herramienta**: Invoca a `adventureLookupTool` con `query: "Tablón de oportunidades"`.
*   **Respuesta de la Herramienta**: La herramienta busca en la ubicación actual ("phandalin-plaza-del-pueblo") y encuentra el objeto `interactable` con ese nombre. Devuelve su JSON:
    ```json
    { "name": "Tablón de oportunidades", "description": "Un tablón de madera con varios anuncios...", "interactionResults": [{ "action": "Leer los anuncios", "result": "Hay tres misiones disponibles: 'Misión de la Colina del Resentimiento', 'Misión de la excavación de los enanos' y 'Misión de Terragnoma'." }] }
    ```
*   **Salida del Experto en Narrativa**: Usa el campo `result` para responder al jugador.
    > **Narración generada**: "Os acercáis al tablón de anuncios. Efectivamente, entre varios avisos menores, tres misiones destacan, escritas por la misma mano nerviosa: una pide ayuda para la 'Misión de la Colina del Resentimiento', otra para la 'Misión de la excavación de los enanos' y una tercera para 'Misión de Terragnoma'. ¿Cuál os interesa?"

**4. Acción del Jugador (Decide viajar)**
> **Jugador escribe:** `Vamos a hacer la misión de la Colina del Resentimiento.`

**5. La `gameCoordinator` y la `narrativeExpertTool` Gestionan el Viaje**
*   **Lógica del Experto en Narrativa**: "El jugador quiere ir a la 'Colina del Resentimiento'. Necesito la descripción de ese lugar para narrar el viaje y la llegada".
*   **Uso de Herramienta**: `narrativeExpertTool` invoca a `adventureLookupTool` con `query: "colina-del-resentimiento"`.
*   **Salida del Experto en Narrativa**: La herramienta devuelve el JSON de la nueva ubicación. El experto usa su `description` para narrar la llegada y, muy importante, **devuelve el `id` de la nueva ubicación a la coordinadora** para que la aplicación actualice el estado del juego.
    > **Narración generada**: (Descripción del viaje)... "Tras un par de horas, la Colina del Resentimiento se alza ante vosotros. Un aura de quietud tensa envuelve el lugar. En la ladera hay un viejo molino de piedra. De repente, el silencio se rompe. Un gran monstruo alado con una cola con púas intenta derribar la puerta del molino. Una mujer aparece en la ventana del segundo piso, gesticula con los brazos y grita: '¡¿Me echáis una ayudita?!'. La criatura no parece haberos visto. ¿Qué hacéis?"
    > **Datos devueltos**: `{ narration: "...", nextLocationId: "colina-del-resentimiento" }`

---

### **FASE 3: TRANSICIÓN A COMBATE**

**1. Acción del Jugador**
> **Jugador escribe:** `¡No podemos dejar que la mate! Le disparo una flecha a la Mantícora.`

**2. La `gameCoordinator` Delega la Transición**
*   **Análisis de la Coordinadora**:
    *   Estado: `inCombat` es `false`.
    *   Acción del jugador: "Le disparo una flecha..." es una acción inequívocamente hostil.
*   **Decisión de la Coordinadora**: "El jugador inicia un conflicto. El experto en narrativa debe gestionar esta transición".
*   **Acción de la Coordinadora**: Vuelve a invocar a la `narrativeExpertTool`.

**3. La `narrativeExpertTool` Inicia el Combate**
*   **Lógica del Experto en Narrativa**: "El jugador ha atacado. El combate es inevitable. Necesito el nombre del enemigo para la narración".
*   **Uso de Herramienta**: Llama a `adventureLookupTool` con `query: "colina-del-resentimiento"` para ver las `entitiesPresent`. Encuentra "manticora".
*   **Salida del Experto en Narrativa**: Devuelve un objeto estructurado a la coordinadora para indicar el cambio de estado.
    ```json
    {
      "startCombat": true,
      "combatStartNarration": "Tu flecha silba en el aire. Al sentir el impacto, la **Mantícora** ruge de dolor y rabia. Abandona su asalto a la puerta y clava sus ojos malévolos en vuestro grupo. Se prepara para atacar. ¡El combate ha comenzado!"
    }
    ```

**4. La Aplicación Procesa el Inicio del Combate**
*   La `gameCoordinator` pasa la respuesta a la aplicación.
*   La aplicación ve `startCombat: true`.
*   **Acciones de la Aplicación**:
    1.  Cambia su estado interno a `inCombat: true`.
    2.  Muestra la `combatStartNarration` en la ventana de chat.
    3.  Busca los datos de la "Mantícora" en el JSON de la aventura.
    4.  **Inicia el cálculo de iniciativa**: Tira un d20 para todos los participantes (Galador, Elara, Merryl y la Mantícora), añade sus modificadores de Destreza y los ordena de mayor a menor.
    5.  Muestra el orden de combate en la interfaz.

---

### **FASE 4: MODO COMBATE**

**ESCENA:** El orden de iniciativa es: 1. Elara, 2. Mantícora, 3. Galador, 4. Merryl. El turno actual es el de **Elara**.

**1. La Aplicación Llama a la `gameCoordinator` para el Primer Turno**
Como el primer turno no es del jugador humano, la aplicación llama inmediatamente a la `gameCoordinator` con el estado actualizado: `inCombat: true`, `activeTurn: "Elara"`.

**2. La `gameCoordinator` Delega la Gestión del Combate**
*   **Análisis de la Coordinadora**:
    *   Estado: `inCombat` es `true`.
*   **Decisión de la Coordinadora**: "Estamos en combate. Debo ceder el control a mi gestor de rondas de combate".
*   **Acción de la Coordinadora**: Invoca a la herramienta `combatManagerTool`, informándole de que la ronda de combate comienza con el turno de Elara.

**3. La `combatManagerTool` Orquesta la Ronda de PNJ**
*   **Lógica del Gestor de Combate**: `combatManagerTool` entra en un bucle que se ejecutará hasta que llegue el turno de un jugador humano.
*   **Turno de Elara (Aliada IA)**:
    1.  El gestor de combate invoca a su sub-experto: el `companionExpert`.
    2.  `companionExpert` analiza la situación: "Somos 3 contra 1, la Mantícora está a distancia. Galador es el que más daño puede hacer cuerpo a cuerpo".
    3.  **Decisión del `companionExpert`**: "Lanzaré 'Escudo de fe' sobre Galador para protegerlo cuando se acerque".
    4.  Devuelve la acción: `{ characterId: "2", action: "Lanza Escudo de fe sobre Galador para protegerlo." }`.
*   **Turno de la Mantícora (Enemigo)**:
    1.  El gestor de combate sabe que es el turno de un enemigo. Invoca a su otro sub-experto: el `enemyTactician`.
    2.  `enemyTactician` necesita saber qué puede hacer la Mantícora. Invoca a `adventureLookupTool` con `query: "manticora"`.
    3.  La herramienta le devuelve las acciones: `Ataque con garras`, `Ataque con mordisco`, `Púas de la cola (acción de recarga)`.
    4.  **Decisión del `enemyTactician`**: "El grupo está lejos. Usaré mi ataque a distancia. Lanzaré tres púas contra el que parece más peligroso, el paladín (Galador)".
    5.  Devuelve la acción, la narración y las tiradas de dados necesarias: `{ action: "Ataca a Galador con 3 púas", narration: "La Mantícora bate sus alas y lanza una ráfaga de púas afiladas desde su cola hacia Galador.", diceRolls: [ { roll: "1d20+5", type: "attack" }, ... ] }`.
*   **Fin del Bucle**: El siguiente en el orden de iniciativa es Galador (el jugador humano). El bucle se detiene.
*   **Salida del Gestor de Combate**: El `combatManagerTool` recopila todas las acciones, narraciones y tiradas de dados de la ronda y se las devuelve a la `gameCoordinator`.

**4. La Aplicación Muestra la Ronda y Espera al Jugador**
La `gameCoordinator` pasa el paquete de resultados a la aplicación. La interfaz muestra:
> **Elara**: Lanza Escudo de fe sobre Galador para protegerlo.
> **Dungeon Master**: La Mantícora bate sus alas y lanza una ráfaga de púas afiladas desde su cola hacia Galador.
> *(Aparecen las tiradas de dados en el log)*
> **Sistema**: Es tu turno, Galador.

Ahora, la aplicación espera la siguiente acción del jugador para comenzar el ciclo de nuevo.
