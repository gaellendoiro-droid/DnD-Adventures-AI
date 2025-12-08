# Plan de Implementación: Refactorización y Persistencia del Estado del Mundo

**Estado:** En Curso
**Prioridad:** Crítica (Bloqueante para Progresión)
**Fecha de Inicio:** 2025-12-08

## 1. Análisis del Problema y Objetivos

### 1.1. Situación Actual
El sistema actual de guardado de partidas (`GameView.tsx` -> `onSaveGame`) realiza una "instantánea" incompleta del estado en memoria.
*   **Fallo Crítico:** Se guarda el array obsoleto `enemies` (solo enemigos en la habitación actual o legacy), pero **NO** se guarda `enemiesByLocation`, que es la estructura de datos que introdujimos para rastrear el estado de los enemigos en toda la mazmorra.
*   **Consecuencia:** Al recargar una partida, el juego "olvida" qué enemigos han muerto en otras habitaciones distintas a la actual.
*   **Limitación Arquitectónica:** El estado no diferencia claramente entre "Definición Estática" (lo que viene del JSON de la aventura) y "Estado Mutable" (lo que ha cambiado).

### 1.2. Objetivos
1.  **Integridad de Datos:** Garantizar que `enemiesByLocation` y cualquier otra estructura de estado global se guarde y cargue correctamente.
2.  **Arquitectura de "World State":** Implementar una estructura clara (`WorldState`) que actúe como una capa de mutaciones sobre la aventura base (`AdventureData`).
3.  **Persistencia Granular:** Preparar el sistema para rastrear no solo enemigos, sino estados de puertas, trampas disparadas y contenedores saqueados (pre-requisito para inventario).

---

## 2. Estrategia Técnica

Adoptaremos un patrón de **"Estado Base + Deltas"**.
*   **Base:** El JSON de la aventura (inmutable).
*   **Delta:** Un objeto `WorldState` que registra solo los cambios por `locationId`.

### Nueva Estructura del Archivo de Guardado (`SaveGameSchema`)
```typescript
{
  metadata: { version: "1.0", savedAt: string },
  player: {
    party: Character[],
    inventory: Item[] // Futuro
  },
  worldState: {
    currentLocationId: string,
    worldTime: { day: number, hour: number }, // Preparado para Roadmap #1
    
    // El corazón del nuevo sistema
    locations: {
      [locationId: string]: {
        visited: boolean,
        enemies: EnemyState[], // Estado actual de enemigos (HP, posición, muerto/vivo)
        interactables: { [id: string]: { state: 'open' | 'looted' | 'locked' } },
        connections: { [direction: string]: { open: boolean, locked: boolean } }
      }
    }
  },
  history: GameMessage[], // Chat log
  diceLog: DiceRoll[]
}
```

---

## 3. Fases de Implementación

### Fase 1: Hotfix de Integridad de Datos (Inmediato)
*Objetivo: Arreglar el `enemiesByLocation` perdido en el código actual antes de reestructurar todo.*

1.  **Actualizar `handleInternalSaveGame` en `GameView.tsx`:**
    *   Incluir explícitamente `enemiesByLocation` en el objeto `saveData`.
    *   Incluir `openDoors` (ya existe, verificar completitud).
2.  **Actualizar `loadGame` (donde sea que resida la lógica de carga, probablemente `page.tsx` o `App.tsx`):**
    *   Asegurar que al hydrates el estado inicial, `enemiesByLocation` se restaura correctamente en los hooks de React.
3.  **Verificación:** Test manual de matar un enemigo en Sala A, ir a Sala B, guardar, cargar, volver a Sala A -> El enemigo debe seguir muerto.

### Fase 2: Definición de Schemas y Tipos (`Core`)
1.  **Crear `src/lib/game/world-state-types.ts`:**
    *   Definir las interfaces para `LocationMutation`, `EnemyState` (separado de la definición estática) y `WorldState`.
2.  **Actualizar `GameStateSchema`:**
    *   Reflejar esta nueva estructura para validación de Zod en tiempo de ejecución.

### Fase 3: Implementación del `WorldStateManager` (`Backend Logic`)
Crear una clase o servicio en `src/lib/game/world-state-manager.ts` que centralice la lógica de manipulación del estado.

*   **Métodos clave:**
    *   `initializeWorld(adventure: AdventureData): WorldState`
    *   `applyMutation(state: WorldState, locationId: string, mutation: LocationMutation): WorldState`
    *   `getEffectiveLocationContext(adventure: AdventureData, state: WorldState, locationId: string): LocationContext`
        *   Este es el método crítico: fusiona el JSON estático con las mutaciones guardadas para darle a la IA el contexto "real" actual.

### Fase 4: Integración en el Flujo de Juego
1.  **Refactorizar `processPlayerAction`:**
    *   En lugar de pasar variables sueltas (`openDoors`, `enemiesByLocation`), pasar el objeto `WorldState` consolidado.
    *   Usar `WorldStateManager` para calcular el estado resultante de las acciones.
2.  **Persistencia de Estados de Entorno:**
    *   Asegurar que cuando el LLM dice "abrir cofre", esto se registre en el `WorldState` de la ubicación.

---

## 4. Plan de Pruebas

### 4.1. Pruebas de Regresión
*   Carga de partidas antiguas (Legacy): El sistema debe ser capaz de cargar partidas que no tienen la nueva estructura, migrando los datos antiguos (`enemies` array) al nuevo formato (`enemiesByLocation`) al vuelo si es necesario, o al menos no crashear.

### 4.2. Pruebas de Integridad (Manual Test Plan)

#### 1. Verificación de Nueva Partida (Estado Limpio)
1.  Inicia una **Nueva Aventura** (ej: "La Mina Perdida de Phandelver").
2.  Abre la consola del navegador (`F12` -> `Console`).
3.  Verifica que no hay errores rojos de inicio.
4.  Realiza una acción que modifique el mundo, por ejemplo:
    *   **Combate:** Entra en combate y causa daño a un enemigo (no hace falta matarlo, solo bajarle vida).
    *   **Entorno:** Si hay una puerta, intenta abrirla (comando: "abrir puerta norte").

#### 2. Verificación de Guardado (Persistencia)
1.  Haz clic en el botón **Guardar**.
2.  Observa la consola. Deberías ver un log similar a `[Info] Saving game ...` con `worldStateLocations > 0`.
3.  Descarga el archivo `.json`.

#### 3. Verificación de Carga (Restauración de Estado)
1.  Recarga la página completa (`F5`) para limpiar la memoria.
2.  En el menú principal, selecciona **"Cargar Partida"** e importa el archivo `.json` descargado.
3.  Observa la consola durante la carga. ***Punto Clave:*** Debes ver el mensaje **`Loaded game with WorldState`**.
4.  Una vez cargado:
    *   Revisa si el enemigo al que dañaste sigue teniendo la vida baja.
    *   Si abriste una puerta, verifica si el juego la recuerda como abierta.

#### 4. Verificación de Migración (Legacy)
1.  Carga un archivo de guardado antiguo (si existe).
2.  Observa la consola. ***Punto Clave:*** Debes ver el mensaje **`Migrated legacy game to WorldState`**.
3.  Guarda la partida de nuevo.
4.  Carga esta nueva partida "re-guardada". Ahora debería decir **`Loaded game with WorldState`**.

## 5. Tareas Pendientes (Checklist)

- [x] Hotfix: Añadir `enemiesByLocation` a `saveData` en `GameView.tsx`.
- [x] Definir `WorldStateSchema` en `src/lib/schemas.ts`.
- [x] Crear utilidad `WorldStateManager` para fusionar estado base + cambios.
- [x] Refactorizar `processPlayerAction` para usar el nuevo gestor de estado. (Nota: Se implementó un flujo híbrido donde GameView mantiene el estado y lo envía, pero WorldState ya está integrado en el guardado).
- [x] Actualizar UI para reflejar estados persistentes (ej: corrección de errores de carga y nombres de enemigos).
