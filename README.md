# D&D Adventures AI (v0.4.5)

Este proyecto es una aplicación web interactiva que simula una partida de Dungeons & Dragons 5ª Edición. Utiliza un Dungeon Master (DM) impulsado por Inteligencia Artificial para crear una experiencia de juego de rol conversacional y dinámica, todo en español. Los jugadores pueden explorar un mundo, interactuar con personajes, tomar decisiones y participar en combates, todo ello narrado y gestionado por la IA.

## Tecnologías Principales (Stack)

-   **Framework:** Next.js (con App Router)
-   **Lenguaje:** TypeScript
-   **Estilos:** Tailwind CSS y shadcn/ui
-   **IA Generativa:** Google Gemini a través de Genkit
-   **Gestión de Estado (Cliente):** React Hooks (`useState`, `useCallback`)
-   **Fuente de la Aventura:** Archivos JSON locales.

## Cómo Empezar

Para poner en marcha el proyecto en un entorno de desarrollo, sigue estos pasos:

### Prerrequisitos

-   Node.js (versión 20 o superior)
-   npm (o tu gestor de paquetes preferido)

### Instalación

1.  Clona el repositorio.
2.  Instala las dependencias del proyecto:
    ```bash
    npm install
    ```

### Ejecución de la Aplicación

1.  Para iniciar la aplicación web en modo de desarrollo:
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:3000`.

2.  Para iniciar la interfaz de depuración de Genkit (Developer UI):
    ```bash
    npm run genkit:watch
    ```
    La Developer UI estará disponible en `http://localhost:4000`. Esta interfaz te permite probar y depurar los flujos de IA (`flows`) de forma aislada, ver los `traces` de ejecución y entender cómo la IA está procesando la información.

## Arquitectura de la Aplicación (Frontend)

La aplicación se construye sobre Next.js y sigue un patrón de componentes de cliente que gestionan el estado del juego.

1.  **Punto de Entrada (`app/page.tsx`):**
    *   Este es el componente principal que renderiza el menú o la vista del juego.
    *   Utiliza el hook `useState` para gestionar el estado de alto nivel, como si una partida está en curso (`gameInProgress`), los datos de la aventura (`adventureData`) y los datos iniciales para una nueva sesión (`initialGameData`).
    *   **Flujo de Inicio:** Cuando se inicia una nueva partida o se carga una existente, este componente se encarga de obtener los datos de la aventura (desde `/api/load-adventure`), procesarlos si es necesario (con el flujo `parseAdventureFromJson`) y establecer el estado inicial que se pasará a la vista del juego.

2.  **Vista del Juego (`app/game-view.tsx`):**
    *   Una vez iniciada la partida, este es el componente "orquestador" que gestiona toda la sesión de juego activa.
    *   Recibe los datos iniciales de `page.tsx` y los almacena en su propio estado local (`party`, `messages`, `locationId`, etc.), que se va actualizando con cada turno.
    *   La lógica principal reside en la función `handleSendMessage`. Esta función recopila todo el estado actual del juego, la acción del jugador y el historial de conversación, y lo envía al servidor para ser procesado.

3.  **Comunicación con la IA (Server Actions):**
    *   La comunicación entre el cliente (`game-view.tsx`) y el backend de IA se realiza a través de una **Server Action** llamada `processPlayerAction` definida en `app/actions.ts`.
    *   `game-view.tsx` llama a `processPlayerAction` con todo el contexto del juego.
    *   `processPlayerAction` actúa como un puente seguro, llamando al flujo principal `gameCoordinator` en el backend de Genkit.
    *   Una vez que el `gameCoordinator` termina, `processPlayerAction` devuelve el resultado (nuevos mensajes, cambios de estado, etc.) a `game-view.tsx`.

4.  **Actualización del Estado:**
    *   Al recibir la respuesta de la Server Action, `game-view.tsx` utiliza sus funciones `setMessages`, `setParty`, `setLocationId`, etc., para actualizar la interfaz de usuario con la nueva información, completando así el ciclo del turno.

5.  **Fuente de Datos de la Aventura:**
    *   La información base de la aventura (ubicaciones, PNJ, entidades) se carga desde un archivo JSON estático ubicado en la carpeta `JSON_adventures/`. Una API route (`app/api/load-adventure/route.ts`) se encarga de leer este archivo y servirlo al cliente cuando es necesario.

## Arquitectura de la IA

El cerebro de la aplicación es un sistema modular construido con Genkit, orquestado por un flujo lógico principal llamado `gameCoordinator`. La clave de su funcionamiento es la especialización de tareas.

1.  **`gameCoordinator` (El Director Lógico):** No es una IA, sino una función de TypeScript que dirige el flujo de cada turno. Recibe la acción del jugador e invoca a los expertos necesarios para procesarla. Su lógica ha sido optimizada para ejecutar cada paso una única vez, evitando bucles y llamadas duplicadas.

2.  **`actionInterpreter` (El Traductor de Intención):** Es un flujo de IA cuya única misión es convertir el texto libre del jugador (ej: "voy a la taberna y hablo con el posadero") en una acción estructurada que el código pueda entender (ej: `{ actionType: "move", targetId: "posada-rocacolina" }`). Para los movimientos a lugares lejanos, utiliza una herramienta de búsqueda interna (`locationLookupTool`) que ha sido robustecida para encontrar destinos de forma flexible.

3.  **`narrativeExpert` (El Narrador):** Una vez que el `gameCoordinator` tiene la intención clara, llama a este experto para que genere la descripción de la escena. Este flujo se encarga de crear la historia, describir los lugares y narrar el resultado de las acciones del jugador, basándose en la información de la aventura y la acción interpretada.

4.  **Expertos y Herramientas de Apoyo:**
    *   **`companionExpertTool`:** Genera las reacciones, diálogos o acciones de los personajes controlados por la IA.
    *   **`combatManagerTool` y `enemyTacticianTool`:** Gestionan la lógica y las decisiones tácticas de los enemigos en combate.
    *   **Herramientas de Búsqueda y Lógica:** Varias herramientas (`adventureLookupTool`, `diceRollerTool`) proporcionan a los flujos de IA la capacidad de consultar datos de la aventura y realizar acciones como tirar dados.

Este diseño modular permite depurar y mejorar cada parte del sistema de forma aislada, garantizando un comportamiento predecible y robusto. Para una descripción más detallada, consulta `docs/ia-architecture.md`.
