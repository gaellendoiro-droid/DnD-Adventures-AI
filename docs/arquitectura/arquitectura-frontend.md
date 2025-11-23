# Arquitectura del Frontend

**Última actualización:** 2025-01-23 (v0.5.6)  
**Estado:** ✅ Actualizado

---

Este documento detalla la estructura y el flujo de datos de la aplicación cliente construida con Next.js y React.

## Principios de Diseño

El frontend está diseñado en torno a un componente principal que actúa como orquestador y fuente única de verdad, gestionando todo el estado de la partida. Los demás componentes son "tontos" y se limitan a renderizar los datos que reciben, comunicando las interacciones del usuario de vuelta al orquestador.

---

## Componentes Clave

### 1. El Orquestador: `components/game/game-view.tsx`

Este es el componente más importante del lado del cliente. Una vez que se inicia una partida, `game-view.tsx` toma el control y gestiona toda la sesión de juego activa.

**Ubicación:** `src/components/game/game-view.tsx` (no `app/game-view.tsx`)

#### Gestión de Estado

`game-view` utiliza el hook `useState` de React para mantener todo el estado relevante de la partida en el cliente. Este estado es la "fuente única de la verdad" que se utiliza para renderizar la interfaz de usuario.

- `party`: Un array de objetos con los datos completos de todos los personajes del grupo.
- `messages`: Un array con todos los mensajes de la partida (narración del DM, diálogos, acciones).
- `diceRolls`: Un array con todas las tiradas de dados realizadas.
- `locationId`: El ID de la ubicación actual del jugador.
- `inCombat`: Un booleano que indica si el modo de combate está activo.
- `initiativeOrder`: Array con el orden de iniciativa durante el combate.
- `turnIndex`: Índice del turno actual en combate.
- `enemies`: Array de enemigos (deprecated, mantenido para compatibilidad).
- `enemiesByLocation`: Objeto que mapea ubicaciones a arrays de enemigos (nuevo).
- `selectedCharacter`: Personaje seleccionado para ver su hoja.
- `isDMThinking`: Un booleano para controlar el estado de carga y deshabilitar la entrada del usuario mientras la IA procesa la acción.
- `debugMessages`: Array de mensajes de depuración.
- `hasMoreAITurns`: Indica si hay más turnos de IA pendientes.
- `autoAdvancing`: Indica si el sistema está avanzando turnos automáticamente.
- `playerActionCompleted`: Indica si el jugador ya ha completado su acción en el turno actual.

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
  - Muestra indicador de tipo de ataque (🏹 A distancia / ⚔️ Cuerpo a cuerpo) cuando `attackRange` está presente (v0.5.6)
  - Utiliza `updateRollNotationWithModifiers` para mostrar modificadores desglosados con etiquetas de atributos

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

## Flujo de Datos Completo (Alto Nivel)

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

> 📊 **Para diagramas detallados del flujo de datos**, consulta [Flujo de Datos](./flujo-datos.md) que incluye:
> - Diagramas de secuencia completos
> - Flujo de exploración detallado paso a paso
> - Flujo de combate completo con todos los pasos
> - Flujo de guardado y carga con ejemplos de código
> - Flujo de tiradas de datos con validación

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

## Arquitectura "Frontend Obediente" (v0.5.6)

El frontend sigue el principio de **"Cerebro Centralizado, Frontend Obediente"**, donde el backend es la única fuente de verdad para cálculos y decisiones, y el frontend solo muestra lo que recibe.

### Principio Fundamental

**El frontend NO adivina ni calcula atributos o modificadores.** Recibe toda la información necesaria del backend a través de los objetos `DiceRoll`.

### Campos Explicativos en `DiceRoll` (v0.5.6)

Los objetos `DiceRoll` ahora incluyen campos explícitos que el frontend debe usar:

- **`attributeUsed`**: Indica qué atributo se usó para la tirada (`'FUE' | 'DES' | 'CON' | 'INT' | 'SAB' | 'CAR'`)
  - Establecido por `CombatActionResolver` según tipo de arma (ranged → DES, melee → FUE, finesse → mayor)
  - El frontend muestra este atributo en la notación (ej: "1d20+DES+BC" en lugar de "1d20+3+2")
  
- **`attackRange`**: Indica si el ataque es cuerpo a cuerpo o a distancia (`'melee' | 'ranged'`)
  - Establecido por `CombatActionResolver` según tipo de arma
  - El frontend muestra un indicador visual (🏹 A distancia / ⚔️ Cuerpo a cuerpo)

### Función `updateRollNotationWithModifiers`

**Archivo**: `src/lib/combat/roll-notation-utils.ts`

Esta función actualiza la notación de las tiradas para mostrar modificadores desglosados:

- **Recibe**: `DiceRoll` con `attributeUsed` establecido
- **Procesa**: 
  - Extrae el modificador del atributo desde `abilityModifiers` del personaje
  - Crea array de `modifiers` con etiquetas (ej: `{value: 0, label: 'DES'}`)
  - Actualiza `rollNotation` para mostrar etiquetas (ej: "1d6+DES" en lugar de "1d6+0")
- **Comportamiento**:
  - ✅ **Siempre muestra el atributo usado**, incluso si el modificador es 0
  - ✅ **Lanza error si falta `attributeUsed`** (no adivina)
  - ✅ **Unifica notación** para jugadores, compañeros y enemigos

### Beneficios

- ✅ **Consistencia visual**: Todos los combatantes muestran atributos de forma uniforme
- ✅ **Claridad**: El jugador ve exactamente qué atributo se usó (ej: "1d6+DES" vs "1d6+FUE")
- ✅ **Robustez**: Si el backend no proporciona `attributeUsed`, el frontend lanza error en lugar de adivinar
- ✅ **Mantenibilidad**: Cambios en lógica de atributos solo requieren actualizar el backend

### Ejemplo de Flujo

```typescript
// Backend (CombatActionResolver)
const diceRollRequest: DiceRollRequest = {
  rollNotation: "1d6+0",
  description: "Daño de Arco pequeño",
  roller: "Galador",
  attackType: "damage_roll",
  attributeUsed: "DES",  // ← Backend establece explícitamente
  attackRange: "ranged"  // ← Backend establece explícitamente
};

// Frontend (updateRollNotationWithModifiers)
// Recibe DiceRoll con attributeUsed = "DES"
// Extrae abilityModifiers.destreza = 0
// Actualiza rollNotation a "1d6+DES"
// Crea modifiers = [{value: 0, label: 'DES'}]

// UI (DiceRollResult)
// Muestra: "Daño de Arco pequeño (1d6+DES)"
// Desglose: "1+0" (muestra el 0 porque está en modifiers)
// Indicador: "🏹 A distancia" (porque attackRange = "ranged")
```
