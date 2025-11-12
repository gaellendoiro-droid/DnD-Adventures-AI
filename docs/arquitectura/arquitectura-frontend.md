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

### 3. Componentes del Juego (en `components/game/`)

Estos componentes gestionan la visualización y la interacción del juego:

#### Componentes de Interfaz Principal

- **`ChatPanel.tsx`:** 
  - Recibe el array `messages` y lo renderiza
  - Muestra la historia del juego con diferentes estilos según el remitente (DM, Jugador, Personaje)
  - Utiliza `ChatMessage` para renderizar cada mensaje individual

- **`CharacterSheet.tsx`:** 
  - Recibe los datos de un personaje del array `party`
  - Muestra estadísticas completas: habilidades, habilidades, HP, AC, inventario, conjuros
  - Permite seleccionar un personaje para ver sus detalles

- **`PartyPanel.tsx`:** 
  - Muestra todos los personajes del grupo
  - Permite seleccionar un personaje para ver su hoja de personaje
  - Muestra información resumida de cada personaje (nombre, clase, HP)

- **`PlayerInput.tsx`:** 
  - Campo de entrada para las acciones del jugador
  - Incluye un botón de envío y un popover para el sistema de dados
  - Se deshabilita mientras el DM está "pensando" (`isLoading`)

#### Componentes de Combate

- **`InitiativeTracker.tsx`:** 
  - Muestra el orden de iniciativa durante el combate
  - Resalta visualmente el combatiente cuyo turno está activo
  - Muestra información de cada combatiente (nombre, HP, AC)

#### Componentes de Sistema de Dados

- **`DiceRoller.tsx`:** 
  - Permite al jugador realizar tiradas de dados manualmente
  - Soporta diferentes tipos de dados (d4, d6, d8, d10, d12, d20, d100)
  - Calcula automáticamente modificadores y resultados

- **`DiceLogPanel.tsx`:** 
  - Muestra un historial de todas las tiradas de dados realizadas
  - Incluye información sobre quién hizo la tirada, el tipo de dado, y el resultado
  - Utiliza `DiceRollResult` para renderizar cada tirada

- **`DiceRollResult.tsx`:** 
  - Componente para mostrar una tirada individual
  - Diferencia visualmente entre diferentes tipos de resultados (éxito, fallo, crítico, daño)

#### Componentes de Layout

- **`GameLayout.tsx`:** 
  - Layout principal del juego
  - Organiza los paneles principales (izquierdo, central, derecho)
  - Utiliza paneles redimensionables para flexibilidad

- **`LeftPanel.tsx`** (en `components/layout/`): 
  - Panel izquierdo que contiene:
    - `DiceLogPanel`: Historial de tiradas
    - `InitiativeTracker`: Orden de combate
    - `DebugPanel`: Logs de depuración
  - Utiliza paneles redimensionables verticales

#### Componentes de Utilidad

- **`DebugPanel.tsx`:** 
  - Muestra logs de depuración del sistema
  - Útil para desarrolladores para entender el flujo de datos
  - Muestra mensajes con timestamps

- **`MainMenu.tsx`:** 
  - Menú principal para crear o cargar partidas
  - Permite iniciar una nueva aventura o continuar una existente

- **`ChatMessage.tsx`:** 
  - Renderiza un mensaje individual del chat
  - Diferencia estilos según el remitente (DM, Jugador, Personaje, Error)
  - Soporta contenido HTML para formato rico

### 4. Componentes de UI Base (en `components/ui/`)

Son componentes reutilizables de shadcn/ui que proporcionan la base de la interfaz:

- Componentes de formulario: `Button`, `Input`, `Textarea`, `Select`, etc.
- Componentes de layout: `Card`, `Separator`, `Resizable`, `Tabs`, etc.
- Componentes de feedback: `Toast`, `Alert`, `Dialog`, etc.
- Componentes de navegación: `DropdownMenu`, `Menubar`, etc.

Todos estos componentes siguen el sistema de diseño de shadcn/ui y están completamente tipados con TypeScript.

## Sistema de Guardado y Carga

### Guardado de Partidas

El sistema de guardado se gestiona en `app/page.tsx`:

- **Guardado Local:** Las partidas se guardan en el `localStorage` del navegador
- **Formato:** JSON con el estado completo del juego
- **Datos Guardados:**
  - Estado de la party (personajes con HP, inventario, etc.)
  - Mensajes del historial
  - Ubicación actual
  - Estado de combate (si aplica)
  - Tiradas de dados

### Carga de Partidas

- Al iniciar la aplicación, se verifica si hay una partida guardada
- Si existe, se carga automáticamente
- Si no existe, se muestra el menú principal para crear una nueva

## Flujo de Datos Completo

### 1. Inicialización

```
app/page.tsx → Carga datos iniciales → game-view.tsx → Renderiza UI
```

### 2. Acción del Jugador

```
PlayerInput → handleSendMessage → processPlayerAction (Server Action) → Backend IA
```

### 3. Respuesta del Backend

```
Backend IA → processPlayerAction → handleSendMessage → Actualiza Estado → Re-renderiza UI
```

### 4. Actualización de Componentes

Todos los componentes se actualizan automáticamente cuando cambia el estado en `game-view.tsx` gracias a React:

- `ChatPanel` se actualiza cuando cambia `messages`
- `CharacterSheet` se actualiza cuando cambia `party`
- `InitiativeTracker` se actualiza cuando cambia `initiativeOrder` o `turnIndex`
- `DiceLogPanel` se actualiza cuando cambia `diceRolls`

## Gestión de Estado Detallada

### Estado Principal (en `game-view.tsx`)

```typescript
- party: Character[]              // Personajes del grupo
- messages: GameMessage[]         // Historial de mensajes
- diceRolls: DiceRoll[]           // Historial de tiradas
- locationId: string              // Ubicación actual
- inCombat: boolean              // Estado de combate
- initiativeOrder: Combatant[]    // Orden de iniciativa
- enemies: any[]                 // Enemigos en combate
- selectedCharacter: Character    // Personaje seleccionado
- isDMThinking: boolean           // Estado de carga
- debugMessages: string[]         // Logs de depuración
- turnIndex: number               // Turno actual
```

### Hooks Personalizados

- `useToast`: Para mostrar notificaciones al usuario
- `useCallback`: Para optimizar funciones que se pasan como props

## Validación de Datos

El frontend valida el estado antes de enviarlo al backend usando `GameStateSchema`:

```typescript
// En handleSendMessage, antes de enviar:
const validatedState = GameStateSchema.parse(actionInput);
```

Esto asegura que:
- Todos los campos requeridos están presentes
- Los tipos de datos son correctos
- Los datos cumplen con las restricciones del esquema

Si la validación falla, se muestra un error en la consola del navegador antes de enviar los datos al servidor.
