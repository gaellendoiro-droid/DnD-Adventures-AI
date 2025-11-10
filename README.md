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
    genkit start
    ```
    La Developer UI estará disponible en `http://localhost:4000`. Esta interfaz te permite probar y depurar los flujos de IA (`flows`) de forma aislada, ver los `traces` de ejecución y entender cómo la IA está procesando la información.

## Arquitectura General

El proyecto sigue un modelo cliente-servidor desacoplado:

-   **Frontend (Cliente):** Una aplicación de página única (SPA) construida con Next.js y React. Se encarga de toda la renderización de la interfaz de usuario y de la gestión del estado local del juego (personajes, mensajes, etc.).
-   **Backend (Servidor):** Un sistema de IA modular construido con Genkit. Contiene toda la lógica del juego, la toma de decisiones y la generación de narrativa.

La comunicación entre ambos se realiza a través de **Next.js Server Actions**, que actúan como un puente seguro entre el cliente y los flujos de IA del backend.

### Arquitectura del Frontend

El frontend está orquestado por el componente `app/game-view.tsx`, que actúa como la "fuente única de la verdad" para el estado de la partida en el cliente. Gestiona el ciclo de cada turno, enviando las acciones del usuario al backend y actualizando la interfaz con la respuesta.

Para un desglose detallado de los componentes, el flujo de datos y la gestión de estado, consulta el documento:

> **[📄 Documentación de Arquitectura del Frontend](./docs/frontend-architecture.md)**

### Arquitectura de la IA

El cerebro de la aplicación es un sistema modular de flujos y herramientas de Genkit, diseñado para la especialización de tareas. Un `gameCoordinator` central dirige cada turno, delegando la interpretación de acciones, la narración y la lógica de combate a expertos de IA especializados.

Para una descripción completa de los flujos, las herramientas y la lógica de toma de decisiones de la IA, consulta el documento:

> **[📄 Documentación de Arquitectura de la IA](./docs/ia-architecture.md)**
