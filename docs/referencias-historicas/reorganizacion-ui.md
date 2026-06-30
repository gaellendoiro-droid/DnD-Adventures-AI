# Plan de Reorganización de la UI

Este plan detalla los pasos para reorganizar la interfaz de usuario según la entrada de prioridad muy alta del roadmap.

## Objetivos
1.  [x] Mover el botón de "Guardar Partida" al header.
1a. [x] Añadir el nombre de la aventura en curso al header.
2.  [x] Eliminar el panel de DebugLog y todo el código relacionado.
3.  [x] Reorganizar el Panel Izquierdo (Tiradas y Orden de Combate).
4.  [x] Reorganizar el Panel Derecho (Grupo y Fichas).

## Pasos de Implementación

### 1. Modificar `AppHeader` (`src/components/layout/app-header.tsx`)
-   [x] Añadir una prop opcional `actions: React.ReactNode` para renderizar contenido adicional a la derecha (antes del botón de menú).
-   [x] Añadir el nombre de la aventura en curso al header.
-   [x] Renderizar `actions` en el JSX.

### 2. Actualizar `Home` (`src/app/page.tsx`)
-   [x] Modificar el renderizado condicional de `AppHeader`.
-   [x] Si `gameStarted` es `true`, NO renderizar `AppHeader` en `Home` (será renderizado por `GameView`).
-   [x] Pasar `handleGoToMenu` como prop `onGoToMenu` a `GameView`.

### 3. Actualizar `GameView` (`src/components/game/game-view.tsx`)
-   [x] Añadir prop `onGoToMenu`.
-   [x] Eliminar estado `debugMessages` y función `addDebugMessages`.
-   [x] Eliminar llamadas a `addDebugMessages`.
-   [x] En el renderizado:
    -   [x] Envolver `GameLayout` en un `div` con `flex-col`.
    -   [x] Renderizar `AppHeader` al principio del `div`.
    -   [x] Pasar el botón "Guardar Partida" (actualmente en `LeftPanel`) a la prop `actions` de `AppHeader`.
    -   [x] Pasar `onGoToMenu` a `AppHeader`.
-   [x] Actualizar props pasadas a `LeftPanel` (eliminar `debugMessages`).
-   [x] Actualizar props pasadas a `GameLayout` (Panel Derecho):
    -   [x] Cambiar el contenedor `div` del `characterSheet` por un `ResizablePanelGroup` (vertical).
    -   [x] Panel Superior: `PartyPanel` (dentro de `ResizablePanel`).
    -   [x] Panel Inferior: `CharacterSheet` (dentro de `ResizablePanel`).
    -   [x] Añadir `ResizableHandle`.

### 4. Actualizar `LeftPanel` (`src/components/layout/left-panel.tsx`)
-   [x] Eliminar importación de `DebugPanel`.
-   [x] Eliminar prop `debugMessages`.
-   [x] Eliminar el `ResizablePanelGroup` externo (que dividía contenido y debug).
-   [x] Mantener el `ResizablePanelGroup` interno para Dice y Initiative.
-   [x] Asegurar que los paneles ocupen el 100% del alto disponible.
-   [x] El panel izquiero debería estar organizado de la siguiente manera:
    -   [x] Panel Superior: `InitiativeTracker` (dentro de `ResizablePanel`).
    -   [x] Panel Inferior: `DiceLogPanel` (dentro de `ResizablePanel`).
    -   [x] Añadir `ResizableHandle`.

### 5. Limpieza
-   [x] Eliminar `src/components/game/debug-panel.tsx`.

## Verificación
-   [x] Comprobar que el botón de guardar aparece en el header.
-   [x] Comprobar que el panel de debug ha desaparecido.
-   [x] Verificar que los paneles izquierdo y derecho son redimensionables y se ven bien.
-   [x] Verificar que la funcionalidad de guardar sigue funcionando.
