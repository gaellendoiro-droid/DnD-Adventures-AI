# Guía de Uso: CombatSession

**Última actualización:** 2025-01-20  
**Estado:** ✅ Actualizado

---

## 📋 Resumen

`CombatSession` es la clase central para gestionar el estado del combate en D&D Adventures AI. Implementa el patrón **State Object** para encapsular todo el estado del combate y proporcionar métodos limpios para manipularlo.

---

## 🚀 Uso Básico

### Crear una Sesión

```typescript
import { CombatSession } from '@/lib/combat/combat-session';
import type { CombatManagerInput } from '@/lib/combat/combat-session';

// Desde input de Genkit
const input: CombatManagerInput = {
  party: [...],
  enemies: [...],
  initiativeOrder: [...],
  turnIndex: 0,
  inCombat: true,
  locationId: 'forest-1',
  messages: [],
  diceRolls: [],
};

const session = CombatSession.fromInput(input);

// O crear una sesión vacía (útil para tests)
const emptySession = CombatSession.createEmpty();
```

### Inicializar Combate

```typescript
import type { CombatManagerDependencies } from '@/ai/tools/combat-manager';

const deps: CombatManagerDependencies = {
  diceRollerTool,
  enemyTacticianTool,
  companionTacticianTool,
  combatNarrationExpertTool,
  processAICombatantRolls,
  updateRollNotationWithModifiers,
  // Lazy-loaded dependencies (opcionales)
  narrativeExpert,
  markdownToHtml,
};

await session.initialize(
  deps,
  ['enemy-1', 'enemy-2'], // combatantIds
  locationContext,
  conversationHistory,
  'I attack the goblin', // playerAction
  interpretedAction
);
```

### Procesar Turno

```typescript
await session.processCurrentTurn(
  interpretedAction, // { actionType: 'attack', targetId: 'enemy-1' }
  'I attack the goblin', // playerAction
  locationContext,
  conversationHistory,
  deps
);
```

### Serializar a Output

```typescript
const output = session.toJSON();
// output es compatible con CombatManagerOutputSchema
```

---

## 📖 API Completa

### Factory Methods

#### `CombatSession.fromInput(input: CombatManagerInput): CombatSession`

Crea una sesión desde el input de Genkit. Valida y normaliza los datos.

**Parámetros:**
- `input`: Input del combat manager (party, enemies, initiativeOrder, etc.)

**Retorna:** Nueva instancia de `CombatSession`

**Ejemplo:**
```typescript
const session = CombatSession.fromInput({
  party: myParty,
  enemies: myEnemies,
  initiativeOrder: myInitiativeOrder,
  turnIndex: 0,
  inCombat: true,
  locationId: 'forest-1',
  messages: [],
  diceRolls: [],
});
```

#### `CombatSession.createEmpty(): CombatSession`

Crea una sesión vacía (útil para tests).

**Retorna:** Nueva instancia vacía de `CombatSession`

---

### Getters

Todos los getters devuelven **copias** de los arrays para prevenir mutación externa.

#### `getActiveCombatant(): Combatant | null`

Obtiene el combatiente activo (el que tiene el turno actual).

**Retorna:** El combatiente activo o `null` si no hay combate activo

#### `isActive(): boolean`

Verifica si el combate está activo.

**Retorna:** `true` si el combate está activo

#### `getTurnIndex(): number`

Obtiene el índice del turno actual.

**Retorna:** Índice del turno actual

#### `getInitiativeOrder(): Combatant[]`

Obtiene el orden de iniciativa (copia).

**Retorna:** Array de combatientes en orden de iniciativa

#### `getParty(): Character[]`

Obtiene el grupo de jugadores (copia).

**Retorna:** Array de personajes del grupo

#### `getEnemies(): any[]`

Obtiene los enemigos (copia).

**Retorna:** Array de enemigos

---

### Métodos Principales

#### `initialize(...): Promise<void>`

Inicializa un nuevo encuentro de combate. Delega a `CombatInitializer` y actualiza el estado interno.

**Parámetros:**
- `deps: CombatManagerDependencies` - Dependencias del combat manager
- `combatantIds: string[]` - IDs de los combatientes
- `locationContext: any` - Contexto de la ubicación
- `conversationHistory: Array<Partial<GameMessage>>` - Historial de conversación
- `playerAction: string` - Acción del jugador que inició el combate
- `interpretedAction: any` - Acción interpretada

**Ejemplo:**
```typescript
await session.initialize(
  deps,
  ['goblin-1', 'goblin-2'],
  { description: 'A dark forest' },
  previousMessages,
  'I draw my sword',
  { actionType: 'attack' }
);
```

#### `processCurrentTurn(...): Promise<void>`

Procesa el turno actual (jugador o AI). Detecta automáticamente el tipo de turno y delega al método apropiado.

**Parámetros:**
- `interpretedAction: any` - Acción interpretada (si es turno de jugador)
- `playerAction: string` - Acción original del jugador
- `locationContext: any` - Contexto de la ubicación
- `conversationHistory: Array<Partial<GameMessage>>` - Historial de conversación
- `deps: CombatManagerDependencies` - Dependencias

**Ejemplo:**
```typescript
await session.processCurrentTurn(
  { actionType: 'attack', targetId: 'goblin-1' },
  'I attack the goblin',
  locationContext,
  conversationHistory,
  deps
);
```

#### `advanceTurn(): void`

Avanza al siguiente turno en el orden de iniciativa. Usa `CombatTurnManager` para manejar el wrap-around correctamente.

**Ejemplo:**
```typescript
session.advanceTurn();
const nextCombatant = session.getActiveCombatant();
```

#### `hasMoreAITurns(): boolean`

Verifica si hay más turnos de AI que procesar automáticamente.

**Retorna:** `true` si el siguiente turno(s) debe procesarse automáticamente (AI)

**Ejemplo:**
```typescript
if (session.hasMoreAITurns()) {
  // Procesar siguiente turno de AI automáticamente
  await session.processCurrentTurn(null, '', locationContext, [], deps);
}
```

#### `checkEndOfCombat(): { combatEnded: boolean; reason?: string }`

Verifica si el combate ha terminado. Usa `rules-engine` para verificar condiciones de victoria/derrota.

**Retorna:** Objeto con `combatEnded` y opcionalmente `reason`

**Ejemplo:**
```typescript
const endCheck = session.checkEndOfCombat();
if (endCheck.combatEnded) {
  console.log(`Combat ended: ${endCheck.reason}`);
}
```

#### `toJSON(): CombatManagerOutput`

Serializa el estado de la sesión al formato de output de Genkit.

**Retorna:** Objeto compatible con `CombatManagerOutputSchema`

**Ejemplo:**
```typescript
const output = session.toJSON();
// output contiene: messages, diceRolls, updatedParty, updatedEnemies, etc.
```

---

## 🔄 Flujo Completo

### Ejemplo: Iniciar y Procesar Combate

```typescript
import { CombatSession } from '@/lib/combat/combat-session';
import type { CombatManagerInput, CombatManagerDependencies } from '@/lib/combat/combat-session';

// 1. Crear sesión desde input
const input: CombatManagerInput = {
  party: myParty,
  enemies: [],
  initiativeOrder: [],
  turnIndex: 0,
  inCombat: false,
  locationId: 'forest-1',
  messages: [],
  diceRolls: [],
};

const session = CombatSession.fromInput(input);

// 2. Inicializar combate
if (!session.isActive()) {
  await session.initialize(
    deps,
    ['goblin-1', 'goblin-2'],
    locationContext,
    conversationHistory,
    'I attack!',
    { actionType: 'attack' }
  );
}

// 3. Procesar turnos hasta que sea turno del jugador
while (session.isActive() && session.hasMoreAITurns()) {
  await session.processCurrentTurn(null, '', locationContext, [], deps);
}

// 4. Procesar turno del jugador
if (session.isActive()) {
  await session.processCurrentTurn(
    { actionType: 'attack', targetId: 'goblin-1' },
    'I attack the goblin',
    locationContext,
    conversationHistory,
    deps
  );
}

// 5. Serializar output
const output = session.toJSON();
```

---

## 🧪 Uso en Tests

### Ejemplo: Test Unitario

```typescript
import { describe, it, expect, vi } from 'vitest';
import { CombatSession } from '@/lib/combat/combat-session';

describe('CombatSession', () => {
  it('should process player turn', async () => {
    const session = CombatSession.createEmpty();
    
    // Configurar estado inicial
    // ... (usar fromInput con datos de test)
    
    const mockDeps = {
      diceRollerTool: vi.fn(),
      // ... otros mocks
    };
    
    await session.processCurrentTurn(
      { actionType: 'attack', targetId: 'enemy-1' },
      'I attack',
      {},
      [],
      mockDeps
    );
    
    const output = session.toJSON();
    expect(output.messages.length).toBeGreaterThan(0);
  });
});
```

---

## ⚠️ Notas Importantes

### Inmutabilidad

Los getters (`getParty()`, `getEnemies()`, etc.) devuelven **copias** de los arrays. Modificar estos arrays no afectará el estado interno de la sesión.

```typescript
const party = session.getParty();
party.push(newCharacter); // ❌ Esto NO afecta el estado interno

// Para actualizar el estado, usa los métodos de la sesión
await session.processCurrentTurn(...); // ✅ Esto actualiza el estado correctamente
```

### Estado Privado

Todas las propiedades de estado son `private`. No intentes acceder directamente a ellas. Usa los métodos públicos proporcionados.

```typescript
// ❌ NO hacer esto
session.party.push(...); // Error: 'party' is private

// ✅ Hacer esto
await session.processCurrentTurn(...); // Usa los métodos públicos
```

### Logging

`CombatSession` usa `@/lib/logger` internamente. Todos los logs se envían a la terminal del servidor con el contexto `module: 'CombatSession'`.

### Eliminación de `debugLogs`

El campo `debugLogs` ha sido eliminado del output y del estado. El panel DebugLog de la UI está siendo deprecado. Todos los logs van a la terminal del servidor.

---

## 📚 Referencias

- [Diseño de CombatSession](./combat-session-design.md) - Diseño detallado y decisiones arquitectónicas
- [Plan de Refactorización](../planes-desarrollo/planes-en-curso/refactorizacion-combat-session-state.md) - Plan completo de implementación
- [Patrones de Dependency Injection](./patrones-dependency-injection.md) - Cómo usar DI con CombatSession

---

**Última actualización:** 2025-01-20

