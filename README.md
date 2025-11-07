# D&D Adventures AI (v0.4.0)

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

## Arquitectura de la IA

El cerebro de la aplicación es un sistema modular construido con Genkit, orquestado por un flujo principal llamado `gameCoordinator`.

1.  **`gameCoordinator` (El Director):** Es la función principal que se ejecuta en cada turno. No es una IA en sí, sino el código que dirige el flujo.
2.  **`actionInterpreter` (El Intérprete):** Su única misión es recibir la acción del jugador en texto libre (ej: "voy a la taberna") y traducirla a una acción estructurada que el código pueda entender (ej: `{ actionType: "move", targetId: "posada-rocacolina" }`).
3.  **`narrativeExpert` (El Narrador):** Una vez que el `gameCoordinator` conoce la intención, llama a este experto para que genere la descripción de la escena, el resultado de una acción o la llegada a un nuevo lugar.
4.  **`companionExpertTool` (El Alma de los Compañeros):** Genera las reacciones, diálogos o acciones de los personajes controlados por la IA, basándose en su personalidad y el contexto del turno.
5.  **`combatManagerTool` y `enemyTacticianTool` (Los Estrategas):** Cuando se inicia un combate, estos módulos toman el control para gestionar los turnos de los enemigos y decidir sus acciones tácticas.
6.  **Herramientas de Apoyo:** Varias herramientas lógicas y de búsqueda (`adventureLookupTool`, `diceRollerTool`, etc.) proporcionan a los flujos de IA la capacidad de consultar datos de la aventura y realizar acciones como tirar dados.

Para una descripción más detallada del flujo, consulta `docs/architecture-flow.md`.
