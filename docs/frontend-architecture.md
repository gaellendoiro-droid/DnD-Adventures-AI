# Arquitectura del Frontend

Este documento detalla la estructura y el flujo de datos de la aplicación cliente construida con Next.js y React.

## Principios de Diseño

El frontend está diseñado en torno a un componente principal que actúa como orquestador y fuente única de verdad, gestionando todo el estado de la partida. Los demás componentes son "tontos" y se limitan a renderizar los datos que reciben, comunicando las interacciones del usuario de vuelta al orquestador.

---

## Componentes Clave

### 1. El Orquestador: `app/game-view.tsx`

Este es el componente más importante del lado del cliente. Una vez que se inicia una partida, `game-view.tsx` toma el control y gestiona toda la sesión de juego activa.

#### Gestión de Estado

`game-view` utiliza el hook `useState` de React para mantener todo el estado relevante de la partida en el cliente. Este estado es la "fuente única de la verdad" que se utiliza para renderizar la interfaz de usuario.

- `party`: Un array de objetos con los datos completos de todos los personajes del grupo.
- `messages`: Un array con todos los mensajes de la partida (narración del DM, diálogos, acciones).
- `locationId`: El ID de la ubicación actual del jugador.
- `inCombat`: Un booleano que indica si el modo de combate está activo.
- `isLoading`: Un booleano para controlar el estado de carga y deshabilitar la entrada del usuario mientras la IA procesa la acción.

#### Lógica Principal: `handleSendMessage`

Esta función asíncrona es el corazón de la interactividad del juego. Se activa cada vez que el jugador envía una acción y sigue estos pasos:

1.  **Recopilación de Estado:** Reúne todo el estado actual del juego: la acción del jugador, el array `party`, el `locationId` actual, el estado `inCombat` y el historial de conversación reciente.
2.  **Llamada al Servidor:** Empaqueta todo el estado en un único objeto y lo envía al backend llamando a la Server Action `processPlayerAction`.
3.  **Gestión de Carga:** Establece `isLoading` a `true`, lo que deshabilita el campo de entrada y muestra una indicación visual de que el DM está "pensando".
4.  **Procesamiento de Respuesta:** Cuando el servidor responde, la función actualiza el estado local con los nuevos datos recibidos:
    - Actualiza el array `messages` para añadir la respuesta del DM y las acciones de los compañeros.
    - Si hay cambios en los personajes (daño, efectos), actualiza el array `party`.
    - Si el jugador se ha movido, actualiza el `locationId`.
    - Sincroniza el estado `inCombat` con la respuesta del servidor.
5.  **Finalización:** Establece `isLoading` de nuevo a `false`, reactivando la interfaz para la siguiente acción del jugador.

### 2. El Contenedor: `app/game/page.tsx`

Actúa como un simple router. Su única función es determinar si se debe mostrar el menú de inicio para crear una nueva partida o, si ya hay una partida en curso, renderizar el componente `game-view.tsx` pasándole los datos iniciales.

### 3. Componentes de UI (en `components/ui/`)

Son componentes "tontos" que se limitan a renderizar la información que se les pasa a través de `props`.

- **`ChatPanel.tsx`:** Recibe el array `messages` y lo renderiza, mostrando la historia del juego.
- **`CharacterSheet.tsx`:** Recibe los datos de un personaje del array `party` y muestra sus estadísticas, inventario, etc.
