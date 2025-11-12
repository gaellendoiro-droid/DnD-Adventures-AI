# Referencia de API y Esquemas

Este documento proporciona una referencia completa de los esquemas de datos, Server Actions y contratos de las herramientas de IA.

## Esquemas de Datos Principales

### Character (Personaje)

**Ubicación:** `src/lib/schemas.ts`

```typescript
CharacterSchema = z.object({
  id: string,                    // ID único del personaje
  name: string,                 // Nombre del personaje
  race: string,                 // Raza (ej: "Humano", "Elfo")
  characterClass: string,       // Clase (ej: "Guerrero", "Mago")
  level: number,               // Nivel del personaje
  sex: string,                 // Género
  background: string,           // Trasfondo
  color: string,               // Color para UI
  personality: string,          // Personalidad
  abilityScores: {             // Puntuaciones de habilidad
    fuerza: number,
    destreza: number,
    constitución: number,
    inteligencia: number,
    sabiduría: number,
    carisma: number
  },
  abilityModifiers?: {         // Modificadores (opcional, pre-calculados)
    fuerza: number,
    destreza: number,
    constitución: number,
    inteligencia: number,
    sabiduría: number,
    carisma: number
  },
  skills: Array<{              // Habilidades
    name: string,
    proficient: boolean
  }>,
  hp: {                        // Puntos de vida
    current: number,
    max: number
  },
  ac: number,                  // Clase de armadura
  controlledBy: "Player" | "AI", // Control
  inventory: Array<{           // Inventario
    id: string,
    name: string,
    quantity: number,
    description?: string | null
  }>,
  spells: Array<{              // Conjuros
    id: string,
    name: string,
    level: number,
    description: string | null
  }>
})
```

### CharacterSummary (Resumen de Personaje)

Versión ligera del personaje para uso narrativo:

```typescript
CharacterSummarySchema = z.object({
  id: string,
  name: string,
  race: string,
  characterClass: string,
  sex: string,
  personality: string,
  controlledBy: "Player" | "AI"
})
```

### Party (Grupo)

Array de personajes completos:

```typescript
PartySchema = z.array(CharacterSchema)
```

### GameState (Estado del Juego)

**Ubicación:** `src/ai/flows/schemas.ts`

Estado completo enviado desde el frontend al backend:

```typescript
GameStateSchema = z.object({
  playerAction: string,                    // Acción del jugador
  party: Array<Character>,                // Personajes del grupo
  locationId: string,                     // ID de ubicación actual
  inCombat: boolean,                       // Estado de combate
  conversationHistory: Array<GameMessage>, // Historial reciente
  turnIndex?: number,                      // Turno actual (combate)
  initiativeOrder?: Array<Combatant>,      // Orden de iniciativa
  enemies?: Array<any>                     // Enemigos en combate
})
```

### GameMessage (Mensaje)

**Ubicación:** `src/lib/types.ts` (inferido de esquemas)

```typescript
type GameMessage = {
  id: string,                    // ID único (generado en frontend)
  timestamp: string,             // Timestamp (generado en frontend)
  sender: "DM" | "Player" | "Character" | "Error",
  senderName?: string,            // Nombre del remitente (si aplica)
  content: string,               // Contenido HTML
  originalContent?: string        // Contenido original (Markdown)
}
```

### Combatant (Combatiente)

**Ubicación:** `src/lib/types.ts`

```typescript
type Combatant = {
  id: string,                    // ID del combatiente
  name: string,                  // Nombre
  initiative: number,             // Iniciativa
  controlledBy: "Player" | "AI",  // Control
  isEnemy?: boolean              // Si es enemigo
}
```

### DiceRoll (Tirada de Dados)

**Ubicación:** `src/lib/types.ts`

```typescript
type DiceRoll = {
  id: string,                    // ID único
  timestamp: string,              // Timestamp
  roller: string,                 // Quién hizo la tirada
  rollNotation: string,           // Notación (ej: "1d20+5")
  result: number,                 // Resultado
  description: string,            // Descripción
  outcome: "success" | "failure" | "critical" | "damage"
}
```

## Server Actions

### processPlayerAction

**Ubicación:** `src/app/actions.ts`

Procesa una acción del jugador y devuelve la respuesta del backend.

**Entrada:**
```typescript
GameState
```

**Salida:**
```typescript
GameCoordinatorOutput = {
  messages?: Array<Omit<GameMessage, 'id' | 'timestamp'>>,
  diceRolls?: Array<Omit<DiceRoll, 'id' | 'timestamp'>>,
  debugLogs?: Array<string>,
  updatedParty?: Array<Character>,
  nextLocationId?: string | null,
  inCombat?: boolean,
  initiativeOrder?: Array<Combatant>,
  enemies?: Array<any>,
  error?: string,
  turnIndex?: number
}
```

## Flujos de IA

### gameCoordinatorFlow

**Ubicación:** `src/ai/flows/game-coordinator.ts`

Orquestador principal del juego.

**Entrada:** `GameStateSchema`

**Salida:** `GameCoordinatorOutputSchema`

### actionInterpreter

**Ubicación:** `src/ai/flows/action-interpreter.ts`

Interpreta acciones del jugador en lenguaje natural.

**Entrada:**
```typescript
ActionInterpreterInput = {
  playerAction: string,
  locationContext: string,  // JSON string con datos de ubicación
  party: Array<any>
}
```

**Salida:**
```typescript
ActionInterpreterOutput = {
  actionType: "move" | "interact" | "attack" | "narrate" | "ooc",
  targetId?: string | null
}
```

### narrativeExpert

**Ubicación:** `src/ai/flows/narrative-expert.ts`

Genera narrativa del DM.

**Entrada:**
```typescript
NarrativeExpertInput = {
  playerAction: string,
  locationId: string,
  locationContext: string,  // JSON string
  conversationHistory?: string,
  interpretedAction: string  // JSON string de ActionInterpreterOutput
}
```

**Salida:**
```typescript
NarrativeExpertOutput = {
  dmNarration: string,  // Markdown
  updatedCharacterStats?: string | null,  // JSON string con actualizaciones
  debugLogs?: Array<string>
}
```

### oocAssistant

**Ubicación:** `src/ai/flows/ooc-assistant.ts`

Asistente fuera de personaje.

**Entrada:**
```typescript
{
  playerQuery: string,
  conversationHistory: string
}
```

**Salida:**
```typescript
{
  dmReply: string
}
```

## Herramientas de IA

### combatManagerTool

**Ubicación:** `src/ai/tools/combat-manager.ts`

Gestiona el combate.

**Entrada:** `GameState`

**Salida:** `GameCoordinatorOutput`

### combatInitiationExpertTool

**Ubicación:** `src/ai/tools/combat-initiation-expert.ts`

Determina si iniciar combate.

**Entrada:**
```typescript
{
  playerAction: string,
  locationId: string,
  targetId?: string,
  locationContext: any,
  party: Array<Character>
}
```

**Salida:**
```typescript
{
  shouldInitiate: boolean,
  enemies: Array<any>,
  debugLogs?: Array<string>
}
```

### companionTacticianTool

**Ubicación:** `src/ai/tools/companion-tactician.ts`

Decide acciones de compañeros en combate.

**Entrada:**
```typescript
{
  activeCombatant: string,
  party: Array<Character>,
  enemies: Array<{name: string, id: string, hp: string}>,
  locationDescription: string,
  conversationHistory: string
}
```

**Salida:**
```typescript
{
  narration: string,
  targetId: string | null,
  diceRolls?: Array<{
    roller: string,
    rollNotation: string,
    description: string
  }>,
  debugLogs?: Array<string>
}
```

### enemyTacticianTool

**Ubicación:** `src/ai/tools/enemy-tactician.ts`

Decide acciones de enemigos en combate.

**Entrada:** (Igual que `companionTacticianTool`)

**Salida:** (Igual que `companionTacticianTool`)

### companionExpertTool

**Ubicación:** `src/ai/tools/companion-expert.ts`

Genera diálogos de compañeros fuera de combate.

**Entrada:**
```typescript
{
  party: Array<Character>,
  characterName: string,
  context: string,
  inCombat: boolean
}
```

**Salida:**
```typescript
{
  dialogue: string
}
```

### diceRollerTool

**Ubicación:** `src/ai/tools/dice-roller.ts`

Realiza tiradas de dados.

**Entrada:**
```typescript
{
  notation: string,  // Ej: "1d20+5", "2d6+3"
  description?: string
}
```

**Salida:**
```typescript
{
  result: number,
  rolls: Array<number>,  // Resultados individuales
  notation: string,
  description?: string
}
```

### locationLookupTool

**Ubicación:** `src/ai/tools/location-lookup.ts`

Consulta información de ubicaciones.

**Entrada:**
```typescript
{
  locationId: string
}
```

**Salida:**
```typescript
{
  location: any  // Datos completos de la ubicación
}
```

### adventureLookupTool

**Ubicación:** `src/ai/tools/adventure-lookup.ts`

Consulta información de la aventura.

**Entrada:**
```typescript
{
  query: string  // Pregunta en lenguaje natural
}
```

**Salida:**
```typescript
{
  information: string  // Información relevante
}
```

### dndApiLookupTool

**Ubicación:** `src/ai/tools/dnd-api-lookup.ts`

Consulta API externa de D&D 5e.

**Entrada:**
```typescript
{
  query: string,  // Ej: "goblin", "fireball"
  resourceType?: "monsters" | "spells" | "equipment"
}
```

**Salida:**
```typescript
{
  information: string  // Información de la API
}
```

## Validación de Datos

Todos los esquemas utilizan **Zod** para validación en tiempo de ejecución. Los tipos TypeScript se infieren automáticamente de los esquemas Zod.

### Fuente Única de Verdad

- **Esquemas de IA:** `src/ai/flows/schemas.ts`
- **Esquemas de Frontend:** `src/lib/schemas.ts`
- **Tipos TypeScript:** `src/lib/types.ts` (inferidos de esquemas)

### Reglas de Validación

1. **Frontend:** Valida antes de enviar usando `GameStateSchema`
2. **Backend:** Valida al recibir usando esquemas de entrada
3. **Salida:** Valida antes de devolver usando esquemas de salida

### Manejo de Errores

Si la validación falla:
- **Frontend:** Error en consola, no se envía la petición
- **Backend:** Devuelve mensaje de error en `error` field

## Convenciones de Nomenclatura

- **Schemas:** Terminan en `Schema` (ej: `CharacterSchema`)
- **Types:** Se infieren con `z.infer<typeof Schema>` (ej: `type Character = z.infer<typeof CharacterSchema>`)
- **Inputs:** Terminan en `Input` (ej: `ActionInterpreterInput`)
- **Outputs:** Terminan en `Output` (ej: `ActionInterpreterOutput`)

## Referencias Cruzadas

- [Arquitectura del Backend IA](./arquitectura/arquitectura-backend.md) - Descripción detallada de flujos y herramientas
- [Flujo de Datos](./arquitectura/flujo-datos.md) - Cómo se usan estos esquemas en el flujo
- [Arquitectura del Frontend](./arquitectura/arquitectura-frontend.md) - Cómo el frontend usa estos esquemas

