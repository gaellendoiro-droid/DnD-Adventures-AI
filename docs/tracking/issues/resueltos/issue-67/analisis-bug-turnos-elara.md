# Análisis: Bug de turnos - Elara repite su turno

**Fecha:** 2025-11-16  
**Reportado por:** Usuario  
**Estado:** 🔍 En investigación

## Descripción del problema

En modo combate por turnos, después de que Elara (companion IA) ejecuta su turno, al presionar "Pasar 1 Turno", vuelve a ejecutarse el turno de Elara en lugar de avanzar al siguiente combatiente.

### Escenario reportado

1. **Orden de iniciativa:** Galador (índice 0), Elara (índice 1), Orco1 (índice 2), etc.
2. Galador (jugador) ejecuta su turno
3. El DM lo describe y aparecen botones de avanzar turno
4. Elara (IA) ejecuta su turno automáticamente
5. El DM lo describe
6. El jugador presiona "Pasar 1 Turno"
7. **❌ BUG:** Vuelve a ejecutarse el turno de Elara en lugar de Orco1

## Flujo esperado del sistema de turnos

### Cuando el jugador ejecuta su turno:

1. **Backend (`combat-manager.ts`):**
   - Recibe `turnIndex: 0` (Galador)
   - Procesa acción del jugador
   - Avanza: `currentTurnIndex = 1` (Elara)
   - Detecta que Elara es IA → procesa su turno automáticamente
   - Avanza: `currentTurnIndex = 2` (Orco1)
   - Devuelve:
     ```typescript
     {
       turnIndex: 2,  // Siguiente turno (Orco1)
       lastProcessedTurnWasAI: true,
       lastProcessedTurnIndex: 1,  // Turno que se procesó (Elara)
       hasMoreAITurns: true  // Orco1 también es IA
     }
     ```

2. **Frontend (`game-view.tsx` líneas 370-396):**
   - Recibe respuesta del backend
   - Actualiza `turnIndexRef.current = 2` (Orco1)
   - Como `lastProcessedTurnWasAI = true`:
     - Muestra visualmente `displayIndex = 1` (Elara, el turno que se acaba de procesar)
   - Muestra botones "Pasar 1 Turno" y "Avanzar Todos"

3. **Cuando el jugador presiona "Pasar 1 Turno" (`game-view.tsx` líneas 616-671):**
   - Actualiza visualmente: `setTurnIndex(turnIndexRef.current)` → muestra 2 (Orco1)
   - Oculta botones: `setJustProcessedAITurn(false)`
   - Como `hasMoreAITurns = true`:
     - Envía al backend: `handleSendMessage('continuar turno')`

4. **Backend recibe "continuar turno" (`combat-manager.ts` líneas 184-211):**
   - Recibe `turnIndex: 2` (Orco1, desde `turnIndexRef.current`)
   - Detecta `actionType: 'continue_turn'`
   - `activeCombatant = initiativeOrder[2]` (Orco1, IA)
   - Como Orco1 es IA (no Player), **NO avanza** en línea 195
   - Procesa turno de Orco1
   - Devuelve resultado

## Hipótesis del problema

### Hipótesis 1: `turnIndexRef` no se actualiza correctamente

**Posible causa:** El ref no se está actualizando correctamente después de recibir la respuesta del backend.

**Línea a verificar:** `game-view.tsx` línea 372

```typescript
if (result.turnIndex !== undefined) {
    // Always update the ref to the next turn for internal logic
    turnIndexRef.current = result.turnIndex;  // ← ¿Se está ejecutando?
```

### Hipótesis 2: Backend devuelve `turnIndex` incorrecto

**Posible causa:** El backend no avanza correctamente el turnIndex después de procesar el turno de Elara.

**Líneas a verificar:** `combat-manager.ts` líneas 632-635 (avance después de turno del jugador) y 686-687 (avance después de skip de turno)

### Hipótesis 3: El estado se desincroniza por actualizaciones asíncronas

**Posible causa:** React actualiza el state de forma asíncrona, y el ref puede no estar sincronizado cuando se envía la siguiente petición.

**Línea a verificar:** `game-view.tsx` línea 271

```typescript
const actionInput = { 
    // ...
    turnIndex: turnIndexRef.current,  // ← ¿Tiene el valor correcto?
```

### Hipótesis 4: El mensaje "continuar turno" no se identifica correctamente

**Posible causa:** El texto "continuar turno" no coincide con los patrones en `game-coordinator.ts`.

**Línea a verificar:** `game-coordinator.ts` línea 118

```typescript
const isContinueTurn = playerAction.toLowerCase().includes('continuar') ||  // ← Debería coincidir
                      playerAction.toLowerCase().includes('pasar turno') ||
                      playerAction.toLowerCase().includes('siguiente turno');
```

## Plan de diagnóstico

### Paso 1: Agregar logging extensivo

Agregar logs en puntos críticos para rastrear el flujo:

1. **Frontend - Después de recibir respuesta del backend:**
   ```typescript
   // game-view.tsx línea 372
   turnIndexRef.current = result.turnIndex;
   console.log('[DEBUG] turnIndexRef updated:', {
     previous: oldValue,
     new: turnIndexRef.current,
     from backend: result.turnIndex,
     lastProcessedTurnIndex: result.lastProcessedTurnIndex,
     lastProcessedTurnWasAI: result.lastProcessedTurnWasAI,
   });
   ```

2. **Frontend - Al presionar "Pasar 1 Turno":**
   ```typescript
   // game-view.tsx línea 623
   logClient.uiEvent('GameView', 'Pasar 1 Turno clicked', {
     currentTurnIndex: turnIndex,
     turnIndexRef: turnIndexRef.current,  // ← Verificar valor
     nextCombatant: initiativeOrderRef.current[turnIndexRef.current]?.characterName,
   });
   ```

3. **Frontend - Al enviar acción:**
   ```typescript
   // game-view.tsx línea 271
   console.log('[DEBUG] Sending action to backend:', {
     action: content,
     turnIndex: turnIndexRef.current,  // ← Verificar valor
     activeCombatant: initiativeOrderRef.current[turnIndexRef.current]?.characterName,
   });
   ```

4. **Backend - Al recibir acción:**
   ```typescript
   // combat-manager.ts línea 140
   localLog(`Received turnIndex: ${currentTurnIndex}, activeCombatant: ${activeCombatant?.characterName}, controlledBy: ${activeCombatant?.controlledBy}`);
   ```

5. **Backend - Al detectar continue_turn:**
   ```typescript
   // combat-manager.ts línea 193
   localLog(`Continue turn detected. Current: index=${currentTurnIndex}, combatant=${activeCombatant?.characterName}, controlledBy=${activeCombatant?.controlledBy}`);
   ```

6. **Backend - Al avanzar turno:**
   ```typescript
   // combat-manager.ts línea 198
   localLog(`Advancing from ${previousIndex} (${previousCombatant}) to ${currentTurnIndex} (${activeCombatant?.characterName})`);
   ```

### Paso 2: Reproducir el bug con logging activo

1. Iniciar combate con Galador, Elara, Orco1
2. Ejecutar turno de Galador
3. Observar logs cuando Elara ejecuta su turno
4. Presionar "Pasar 1 Turno"
5. Observar logs y verificar qué `turnIndex` se envía al backend

### Paso 3: Analizar logs y identificar causa raíz

Comparar los valores esperados vs los valores reales en cada paso del flujo.

## Posibles soluciones (pendiente de confirmar causa raíz)

### Solución A: Asegurar que refs se actualizan síncronamente

Si el problema es timing de actualización de refs, asegurar que se actualizan antes de mostrar botones.

### Solución B: Corregir lógica de continue_turn

Si el problema es que el backend no avanza correctamente, revisar la lógica en líneas 184-211 de `combat-manager.ts`.

### Solución C: Simplificar sincronización frontend-backend

Si el problema es complejidad del sistema, considerar simplificar cómo se sincroniza el turnIndex entre frontend y backend.

## Estado actual

⏳ **Esperando reproducción del bug con logging activo para confirmar causa raíz.**

## Archivos relevantes

- `src/components/game/game-view.tsx` (líneas 264-443, 616-671)
- `src/ai/tools/combat-manager.ts` (líneas 120-211, 632-970)
- `src/ai/flows/game-coordinator.ts` (líneas 115-163)

