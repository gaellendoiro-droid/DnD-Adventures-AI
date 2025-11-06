# Arquitectura de Flujo de IA con `gameCoordinator`

Este documento detalla el flujo de trabajo completo, desde la exploración normal hasta la transición a combate, utilizando la nueva arquitectura centrada en una IA `gameCoordinator`.

### Personajes en la Escena:
*   **Galador** (Jugador Humano)
*   **Elara** (Compañera IA)
*   **Mantícora** (Enemigo)

---

### **FASE 1: MODO EXPLORACIÓN**

**ESCENA:** El grupo llega a la Colina del Resentimiento. Ven a una **Mantícora** atacando un molino de piedra y a una mujer pidiendo ayuda desde una ventana. El estado del juego es `inCombat: false`.

**1. Acción del Jugador**
El jugador, en lugar de atacar, decide primero evaluar la situación.
> **Jugador escribe:** `¿Qué aspecto tiene esa bestia? ¿Parece herida?`

**2. La Aplicación Llama al Cerebro Central**
La interfaz de usuario envía la acción del jugador y el estado actual del juego a la única función de lógica principal, que a su vez invoca a la IA `gameCoordinator`.

**3. La `gameCoordinator` Analiza y Delega la Narración**
*   **Análisis de la Coordinadora**:
    *   Estado: `inCombat` es `false`.
    *   Acción del jugador: Es una pregunta de observación, una acción de exploración.
*   **Decisión de la Coordinadora**: "Esta es una tarea para mi experto en narrativa. Necesita describir la escena y responder a la pregunta del jugador".
*   **Acción de la Coordinadora**: Invoca a la herramienta `narrativeExpertTool`, pasándole la acción del jugador y el contexto de la escena.

**4. La `narrativeExpertTool` Usa Herramientas para Obtener Detalles**
*   **Lógica del Experto en Narrativa**: "El jugador quiere más detalles sobre la 'bestia'. Necesito saber qué es esa bestia según los datos de la aventura".
*   **Uso de Herramienta de Información**: El `narrativeExpertTool` invoca a la `adventureLookupTool` con la `query: "Mantícora"` (o "bestia alada", que la IA deduciría del contexto de la ubicación).
*   **Respuesta de la Herramienta**: `adventureLookupTool` busca en el archivo `el-dragon-del-pico-agujahelada.json` y devuelve el objeto JSON completo de la entidad "Mantícora":
    ```json
    {
      "id": "manticora",
      "name": "Mantícora",
      "description": "Un monstruo grande con cuerpo de león, alas de murciélago y una cola con púas afiladas. Su rostro es vagamente humanoide y malévolo.",
      "dmNotes": "Esta mantícora fue expulsada de su nido en la montaña por Cryovain. Es inteligente y puede ser sobornada."
    }
    ```
*   **Salida del Experto en Narrativa**: Con esta información, el `narrativeExpertTool` construye su respuesta y se la devuelve a la coordinadora.
    > **Narración generada**: "La criatura es una **Mantícora**, un depredador monstruoso con cuerpo de león y alas de murciélago. Su cola, erizada de púas mortales, se agita con furia mientras golpea la madera del molino. No parece herida, solo enfurecida y centrada en derribar la puerta. La mujer de la ventana vuelve a gritar: '¡Nos matará a todos!'. La Mantícora no parece haberos visto todavía. ¿Qué hacéis?"

**5. La Aplicación Muestra la Narración**
La `gameCoordinator` recibe la narración y la pasa a la aplicación, que la muestra en el chat. El juego sigue en modo exploración.

---

### **FASE 2: TRANSICIÓN A COMBATE**

**1. Acción del Jugador**
Ahora, el jugador decide actuar.
> **Jugador escribe:** `¡No podemos dejar que la mate! Le disparo una flecha a la Mantícora.`

**2. La `gameCoordinator` Delega la Transición**
*   **Análisis de la Coordinadora**:
    *   Estado: `inCombat` es `false`.
    *   Acción del jugador: "Le disparo una flecha..." es una acción inequívocamente hostil.
*   **Decisión de la Coordinadora**: "La acción del jugador inicia un conflicto. Debo delegar la transición al experto en narrativa".
*   **Acción de la Coordinadora**: Vuelve a invocar a la `narrativeExpertTool`.

**3. La `narrativeExpertTool` Inicia el Combate**
*   **Lógica del Experto en Narrativa**: "El jugador ha atacado. El combate es inevitable".
*   **Salida del Experto en Narrativa**: Devuelve un objeto estructurado a la coordinadora para indicar el cambio de estado:
    ```json
    {
      "startCombat": true,
      "combatStartNarration": "Tu flecha silba en el aire. Al sentir el impacto, la Mantícora ruge de dolor y rabia. Abandona su asalto a la puerta y clava sus ojos malévolos en vuestro grupo. Se prepara para atacar. ¡El combate ha comenzado!"
    }
    ```

**4. La Aplicación Procesa el Inicio del Combate**
*   La `gameCoordinator` pasa la respuesta a la aplicación.
*   La aplicación ve `startCombat: true`.
*   **Acciones de la Aplicación**:
    1.  Cambia su estado interno a `inCombat: true`.
    2.  Muestra la `combatStartNarration` en la ventana de chat.
    3.  **Inicia el cálculo de iniciativa**: Tira un d20 para todos los participantes (Galador, Elara y la Mantícora), añade sus modificadores de Destreza y los ordena de mayor a menor.
    4.  Muestra el orden de combate en la interfaz.

---

### **FASE 3: MODO COMBATE**

**ESCENA:** El orden de iniciativa es: 1. Elara, 2. Mantícora, 3. Galador. El turno actual es el de **Elara**.

**1. La Aplicación Llama a la `gameCoordinator` para el Primer Turno**
Como el primer turno no es del jugador humano, la aplicación llama inmediatamente a la `gameCoordinator` con el estado actualizado: `inCombat: true`, `activeTurn: "Elara"`.

**2. La `gameCoordinator` Delega la Gestión del Combate**
*   **Análisis de la Coordinadora**:
    *   Estado: `inCombat` es `true`.
*   **Decisión de la Coordinadora**: "Estamos en combate. Debo ceder el control a mi gestor de rondas de combate".
*   **Acción de la Coordinadora**: Invoca a la herramienta `combatManagerTool`, informándole de que la ronda de combate comienza con el turno de Elara.

**3. La `combatManagerTool` Orquesta la Ronda de PNJ**
*   **Lógica del Gestor de Combate**: El `combatManagerTool` entra en un bucle que se ejecutará hasta que llegue el turno de un jugador humano.
*   **Turno de Elara (Aliada IA)**:
    1.  El gestor de combate invoca a su sub-experto: el `companionExpert`.
    2.  `companionExpert` analiza la situación: "Somos 2 contra 1, la Mantícora está a distancia. Galador es el que más daño puede hacer cuerpo a cuerpo".
    3.  **Decisión del `companionExpert`**: "Lanzaré 'Escudo de fe' sobre Galador para protegerlo cuando se acerque".
    4.  Devuelve la acción: `{ characterId: "2", action: "Lanza Escudo de fe sobre Galador para protegerlo." }`.
*   **Turno de la Mantícora (Enemigo)**:
    1.  El gestor de combate sabe que es el turno de un enemigo. Invoca a su otro sub-experto: el `enemyTactician`.
    2.  `enemyTactician` necesita saber qué puede hacer la Mantícora. Invoca a `adventureLookupTool` con `query: "manticora"`.
    3.  La herramienta le devuelve las acciones: `Ataque con garras`, `Ataque con mordisco`, `Púas de la cola (acción de recarga)`.
    4.  **Decisión del `enemyTactician`**: "El grupo está lejos. Usaré mi ataque a distancia. Lanzaré tres púas contra el que parece más peligroso, el paladín (Galador)".
    5.  Devuelve la acción, la narración y las tiradas de dados necesarias: `{ action: "Ataca a Galador con 3 púas", narration: "La Mantícora bate sus alas y lanza una ráfaga de púas afiladas desde su cola hacia Galador.", diceRolls: [ { roll: "1d20+5", type: "attack" }, ... ] }`.
*   **Fin del Bucle**: El siguiente en el orden de iniciativa es Galador (el jugador humano). El bucle se detiene.
*   **Salida del Gestor de Combate**: El `combatManagerTool` recopila todas las acciones, narraciones y tiradas de dados de la ronda (el turno de Elara y el de la Mantícora) y se las devuelve a la `gameCoordinator`.

**4. La Aplicación Muestra la Ronda y Espera al Jugador**
La `gameCoordinator` pasa el paquete de resultados a la aplicación. La interfaz muestra:
> **Elara**: Lanza Escudo de fe sobre Galador para protegerlo.
> **Dungeon Master**: La Mantícora bate sus alas y lanza una ráfaga de púas afiladas desde su cola hacia Galador.
> *(Aparecen las tiradas de dados en el log)*
> **Sistema**: Es tu turno, Galador.

Ahora, la aplicación espera la siguiente acción del jugador para comenzar el ciclo de nuevo.