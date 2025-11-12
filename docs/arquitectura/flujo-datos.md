# Flujo de Datos Detallado

Este documento describe en detalle cómo fluyen los datos a través del sistema, desde la interacción del usuario hasta la respuesta final.

## Flujo General de una Acción

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant SA as Server Action
    participant GC as gameCoordinator
    participant AI as Expertos IA
    participant T as Herramientas

    U->>F: Escribe acción
    F->>F: Recopila estado completo
    F->>F: Valida con GameStateSchema
    F->>SA: processPlayerAction(estado)
    SA->>GC: gameCoordinatorFlow(estado)
    GC->>AI: actionInterpreter(acción)
    AI-->>GC: Acción estructurada
    GC->>GC: Decide flujo (combate/narrativa)
    alt Es combate
        GC->>T: combatManagerTool
        T->>T: Procesa turnos IA
        T-->>GC: Resultado combate
    else Es narrativa
        GC->>T: companionExpertTool
        T-->>GC: Reacciones compañeros
        GC->>AI: narrativeExpert
        AI-->>GC: Narración DM
    end
    GC-->>SA: Estado + Mensajes
    SA-->>F: Respuesta
    F->>F: Actualiza estado local
    F->>U: Muestra resultado
```

## Flujo de Exploración (Fuera de Combate)

### 1. Usuario Envía Acción

```
Usuario: "Vamos a la posada"
```

### 2. Frontend Recopila Estado

```typescript
// En game-view.tsx, handleSendMessage
const actionInput = {
  playerAction: "Vamos a la posada",
  party: party,                    // Array completo de personajes
  locationId: locationId,          // ID de ubicación actual
  inCombat: false,                 // No estamos en combate
  turnIndex: 0,                    // No aplica fuera de combate
  initiativeOrder: [],              // Vacío fuera de combate
  conversationHistory: messages.slice(-10) // Últimos 10 mensajes
};
```

### 3. Validación en Frontend

```typescript
// Valida antes de enviar
const validatedState = GameStateSchema.parse(actionInput);
```

### 4. Server Action

```typescript
// app/actions.ts
export async function processPlayerAction(state: GameState) {
  const result = await gameCoordinatorFlow(state);
  return result;
}
```

### 5. gameCoordinator Procesa

```typescript
// ai/flows/game-coordinator.ts
1. Recibe el estado completo
2. Carga datos de la aventura
3. Si inCombat === false:
   a. Llama a actionInterpreter
   b. Interpreta la acción
   c. Si es ataque → inicia combate
   d. Si no → flujo narrativo
```

### 6. Flujo Narrativo

```typescript
// gameCoordinator continúa...
1. Decide qué compañeros deben reaccionar
2. Para cada compañero:
   - Llama a companionExpertTool({
       party: party,
       characterName: "Elara",
       context: "El jugador quiere ir a la posada",
       inCombat: false
     })
   - Recibe diálogo del compañero
3. Llama a narrativeExpert({
     action: interpretación,
     locationContext: datos de ubicación,
     party: party,
     conversationHistory: historial
   })
4. Recibe narración del DM
5. Ensambla mensajes: [reacciones..., narración]
```

### 7. Respuesta al Frontend

```typescript
{
  messages: [
    { sender: 'Character', senderName: 'Elara', content: 'Me parece bien...' },
    { sender: 'DM', content: 'Os dirigís a la Posada Rocacolina...' }
  ],
  party: party,              // Actualizado si hay cambios
  locationId: 'posada-id',   // Nueva ubicación
  inCombat: false,
  diceRolls: []             // Si hubo tiradas
}
```

### 8. Frontend Actualiza UI

```typescript
// game-view.tsx
setMessages([...messages, ...newMessages]);
setLocationId(newLocationId);
// React re-renderiza automáticamente todos los componentes
```

## Flujo de Combate

### 1. Inicio de Combate

```
Usuario: "Ataco al orco"
```

### 2. gameCoordinator Detecta Ataque

```typescript
// actionInterpreter devuelve: { actionType: 'attack', targetId: 'orco-1' }
// gameCoordinator llama a combatInitiationExpertTool
```

### 3. Iniciación de Combate

```typescript
combatInitiationExpertTool({
  playerAction: "Ataco al orco",
  locationId: "plaza",
  locationContext: datos de la plaza,
  party: party
})
// Devuelve: { shouldInitiate: true, enemies: [...] }
```

### 4. combatManagerTool Toma Control

```typescript
combatManagerTool({
  ...estado,
  inCombat: true,
  turnIndex: 0
})
```

### 5. Cálculo de Iniciativa

```typescript
1. Calcula iniciativa para cada combatiente (party + enemigos)
2. Ordena por iniciativa (mayor a menor)
3. Crea initiativeOrder: [
     { id: 'player-1', name: 'Galador', initiative: 18 },
     { id: 'enemy-1', name: 'Orco', initiative: 15 },
     ...
   ]
```

### 6. Bucle de Turnos

```typescript
while (turnIndex < initiativeOrder.length) {
  const currentCombatant = initiativeOrder[turnIndex];
  
  if (currentCombatant.controlledBy === 'Player') {
    // Cede control al jugador
    break;
  }
  
  if (currentCombatant.controlledBy === 'AI' && currentCombatant.isEnemy === false) {
    // Turno de compañero
    const action = await companionTacticianTool({
      activeCombatant: currentCombatant.name,
      party: party,
      enemies: enemies,
      locationDescription: "...",
      conversationHistory: "..."
    });
    // Procesa acción (ataque, curación, etc.)
  }
  
  if (currentCombatant.isEnemy === true) {
    // Turno de enemigo
    const action = await enemyTacticianTool({
      activeCombatant: currentCombatant.name,
      party: party,
      enemies: enemies,
      locationDescription: "...",
      conversationHistory: "..."
    });
    // Procesa acción
  }
  
  turnIndex++;
}
```

### 7. Turno del Jugador

```typescript
// El bucle se detiene cuando es turno del jugador
// Se devuelve el estado con turnIndex apuntando al jugador
// El frontend muestra la UI de combate esperando la acción del jugador
```

### 8. Continuación del Combate

```
Usuario: "Ataco con mi espada"
→ Se repite el flujo desde el paso 2
→ Después de procesar, el bucle continúa con el siguiente combatiente
```

## Flujo de Guardado y Carga

### Guardado

```typescript
// app/page.tsx
const saveData = {
  party: party,
  messages: messages,
  diceRolls: diceRolls,
  locationId: locationId,
  inCombat: inCombat,
  initiativeOrder: initiativeOrder,
  turnIndex: turnIndex
};
localStorage.setItem('dnd-adventure-save', JSON.stringify(saveData));
```

### Carga

```typescript
// app/page.tsx
const savedData = localStorage.getItem('dnd-adventure-save');
if (savedData) {
  const gameState = JSON.parse(savedData);
  // Pasa a game-view.tsx como initialData
}
```

## Flujo de Tiradas de Dados

### Tirada Manual del Jugador

```
Usuario: Hace clic en el dado d20
```

```typescript
// DiceRoller component
1. Usuario selecciona tipo de dado
2. Opcionalmente añade modificador
3. Calcula resultado localmente
4. Añade a diceRolls state
5. Muestra en DiceLogPanel
```

### Tirada Automática (Combate)

```
IA decide: "Elara ataca con su bastón"
```

```typescript
// companionTacticianTool devuelve:
{
  narration: "Elara invoca un rayo...",
  targetId: "enemy-1",
  diceRolls: [
    {
      roller: "Elara",
      rollNotation: "1d20+5",
      description: "Attack Roll"
    },
    {
      roller: "Elara",
      rollNotation: "1d8+3",
      description: "Damage Roll"
    }
  ]
}

// combatManagerTool procesa:
1. Llama a diceRollerTool para cada tirada
2. Calcula resultados
3. Aplica daño/efectos
4. Añade tiradas a diceRolls en la respuesta
```

## Flujo de Validación de Datos

### Frontend → Backend

```typescript
// Frontend valida antes de enviar
GameStateSchema.parse(actionInput)
  ✅ Pasa → Envía al servidor
  ❌ Falla → Error en consola, no envía
```

### Backend Recibe

```typescript
// gameCoordinator valida entrada
GameStateSchema.parse(input)
  ✅ Pasa → Procesa
  ❌ Falla → Error, devuelve mensaje de error
```

### Backend → Frontend

```typescript
// Backend valida salida
GameCoordinatorOutputSchema.parse(output)
  ✅ Pasa → Devuelve al frontend
  ❌ Falla → Error interno
```

## Diagrama de Flujo Completo de Combate

```mermaid
graph TD
    A[Usuario: Acción] --> B{¿Es Combate?}
    B -->|No| C[Flujo Narrativo]
    B -->|Sí| D[combatManagerTool]
    D --> E[Calcula Iniciativa]
    E --> F[Inicia Bucle]
    F --> G{¿Turno de Jugador?}
    G -->|Sí| H[Espera Acción]
    G -->|No| I{¿Compañero o Enemigo?}
    I -->|Compañero| J[companionTacticianTool]
    I -->|Enemigo| K[enemyTacticianTool]
    J --> L[Procesa Acción]
    K --> L
    L --> M[Actualiza Estado]
    M --> N{¿Fin Combate?}
    N -->|No| O[Siguiente Turno]
    O --> G
    N -->|Sí| P[Fin Combate]
    H --> Q[Usuario Responde]
    Q --> D
```

## Consideraciones de Rendimiento

### Optimizaciones Implementadas

1. **Validación Temprana:** Se valida en el frontend antes de enviar
2. **Estado Mínimo:** Solo se envía el estado necesario
3. **Historial Limitado:** Solo últimos 10 mensajes en conversationHistory
4. **Lazy Loading:** Componentes se cargan solo cuando se necesitan

### Puntos de Mejora Futura

1. **Streaming:** Enviar mensajes uno por uno en lugar de todos a la vez
2. **Caché:** Cachear datos de aventura que no cambian
3. **Debouncing:** Evitar múltiples llamadas simultáneas

