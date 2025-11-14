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
  id: string,                       // ID del combatiente
  characterName: string,            // Nombre del personaje
  total: number,                    // Total de iniciativa
  type: 'player' | 'npc',           // Tipo de combatiente
  controlledBy: "Player" | "AI"     // Quién controla al combatiente
}
```

### EnemyInCombat (Enemigo en Combate)

**Ubicación:** `src/ai/tools/combat-manager.ts`

Los enemigos en combate tienen la siguiente estructura:

```typescript
type EnemyInCombat = {
  uniqueId: string,                 // ID único generado (ej: "goblin-0", "goblin-1")
  name: string,                     // Nombre del monstruo (ej: "Goblin")
  ac: number,                       // Clase de armadura
  hp: {                             // Puntos de vida
    current: number,
    max: number
  },
  attackModifier?: number,          // Modificador de ataque
  attackDamage?: string,            // Notación de daño (ej: "1d6+2")
  // Otros campos pueden incluir datos de la D&D API
}
```

**Notas:**
- El `uniqueId` se genera automáticamente para diferenciar múltiples enemigos del mismo tipo
- Cuando hay múltiples enemigos del mismo tipo, se añade un índice (ej: "goblin-0", "goblin-1", "goblin-2")
- Los nombres visuales se generan para la UI (ej: "Goblin 1", "Goblin 2", "Goblin 3")

### DiceRoll (Tirada de Dados)

**Ubicación:** `src/lib/types.ts`

```typescript
type DiceRollOutcome = 'crit' | 'success' | 'fail' | 'pifia' | 'neutral' | 'initiative';

type DiceRoll = {
  id: string,                       // ID único
  timestamp: Date,                  // Timestamp
  roller: string,                   // Quién hizo la tirada (nombre del personaje o "DM")
  rollNotation: string,             // Notación (ej: "1d20+5", "2d6")
  individualRolls: number[],        // Resultados individuales de cada dado
  modifier?: number,                // Modificador aplicado
  totalResult: number,              // Resultado total (suma + modificador)
  outcome: DiceRollOutcome,         // Resultado de la tirada
  description?: string,             // Descripción de la tirada
  
  // Información específica de combate (añadida para mejorar el panel de tiradas)
  targetName?: string,              // Nombre del objetivo (para ataques/daño/curación)
  targetAC?: number,                // AC del objetivo (para tiradas de ataque)
  attackHit?: boolean,              // Si el ataque acertó (para tiradas de ataque)
  damageDealt?: number,             // Daño infligido (para tiradas de daño)
  targetKilled?: boolean,           // Si el objetivo fue derrotado por este daño
  healingAmount?: number,           // Cantidad de curación (para tiradas de curación)
  
  // Para futura implementación completa de saving throws (Issue #22)
  savingThrowResult?: number,       // Resultado de la tirada de salvación del objetivo
  savingThrowDC?: number,           // DC que el objetivo debe superar
  savingThrowSuccess?: boolean,     // Si el objetivo acertó la salvación
  savingThrowType?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha',  // Tipo de salvación
}
```

**Notas:**
- Los campos de combate (`targetName`, `targetAC`, etc.) se populan automáticamente en `combat-manager.ts`
- El campo `outcome` se determina por las reglas de D&D 5e:
  - `'crit'`: 20 natural en 1d20
  - `'pifia'`: 1 natural en 1d20
  - `'success'`: Ataque que acierta (>= AC del objetivo)
  - `'fail'`: Ataque que falla (< AC del objetivo)
  - `'neutral'`: Tiradas sin contexto de éxito/fallo
  - `'initiative'`: Tiradas de iniciativa
- Los campos de `savingThrow*` están preparados para futura implementación (ver Issue #22)

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
    description: string,
    attackType?: 'attack_roll' | 'saving_throw' | 'healing' | 'other'  // Tipo de tirada (OBLIGATORIO para ataques)
  }>,
  debugLogs?: Array<string>
}
```

**Notas sobre `attackType`:**
- `'attack_roll'`: Para armas/hechizos que usan 1d20 para acertar (Ray of Frost, Mace, etc.)
- `'saving_throw'`: Para hechizos donde el objetivo tira salvación (Sacred Flame, Fireball, etc.)
- `'healing'`: Para hechizos de curación
- `'other'`: Para tiradas de utilidad
- Este campo es **OBLIGATORIO** para todas las tiradas de ataque/daño/curación

### enemyTacticianTool

**Ubicación:** `src/ai/tools/enemy-tactician.ts`

Decide acciones de enemigos en combate.

**Entrada:** (Igual que `companionTacticianTool`)

**Salida:**
```typescript
{
  narration: string,
  targetId: string | null,
  diceRolls?: Array<{
    roller: string,
    rollNotation: string,
    description: string,
    attackType?: 'attack_roll' | 'saving_throw' | 'other'  // Tipo de tirada (OBLIGATORIO para ataques)
  }>,
  debugLogs?: Array<string>
}
```

**Notas sobre `attackType`:**
- `'attack_roll'`: Para armas/hechizos que usan 1d20 para acertar
- `'saving_throw'`: Para hechizos donde el objetivo tira salvación (raro para enemigos básicos)
- `'other'`: Para tiradas de utilidad
- Este campo es **OBLIGATORIO** para todas las tiradas de ataque/daño

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

Realiza tiradas de dados siguiendo las reglas de D&D 5e.

**Entrada:**
```typescript
{
  rollNotation: string,     // Notación de dados (ej: "1d20+5", "2d6+3", "1d8")
  roller: string,           // Nombre de quien tira los dados
  description?: string      // Descripción de la tirada
}
```

**Salida:**
```typescript
Omit<DiceRoll, 'id' | 'timestamp'> = {
  roller: string,                 // Nombre del tirador
  rollNotation: string,           // Notación usada
  individualRolls: number[],      // Resultados individuales de cada dado
  modifier?: number,              // Modificador aplicado (si hay)
  totalResult: number,            // Resultado total (suma de dados + modificador)
  outcome: DiceRollOutcome,       // 'crit', 'pifia', o 'neutral'
  description?: string            // Descripción de la tirada
}
```

**Notas:**
- Detecta automáticamente **críticos** (20 natural en 1d20) y **pifias** (1 natural en 1d20)
- Valida la notación de dados antes de tirar
- Soporta modificadores positivos y negativos
- El `id` y `timestamp` se añaden automáticamente en el `combat-manager` o `game-coordinator`

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

## Actualizaciones Recientes

### v0.5.x - Sistema de Combate Mejorado

**Añadido:**
- **Campos de combate en `DiceRoll`**: `targetName`, `targetAC`, `attackHit`, `damageDealt`, `targetKilled`, `healingAmount`
- **Interface `EnemyInCombat`**: Estructura formal para enemigos en combate con HP y estadísticas
- **Campo `attackType` en tacticians**: Metadata explícita para distinguir tipos de ataques/hechizos
  - `'attack_roll'`: Para ataques normales con 1d20
  - `'saving_throw'`: Para hechizos con tirada de salvación del objetivo
  - `'healing'`: Para hechizos de curación
- **Campos de saving throws en `DiceRoll`**: Preparados para futura implementación completa (Issue #22)

**Mejorado:**
- `DiceRollOutcome`: Ahora incluye `'crit'`, `'pifia'`, `'success'`, `'fail'`, `'neutral'`, `'initiative'`
- `Combatant`: Actualizado con campos correctos (`characterName`, `total`, `type`)
- `diceRollerTool`: Ahora retorna `individualRolls` y detecta automáticamente críticos/pifias

**Referencias:**
- [CHANGELOG.md](../CHANGELOG.md) - Historial completo de cambios
- [Issues Tracker](../tracking/issues/README.md) - Issues #18-#22 documentan estas mejoras

## Referencias Cruzadas

- [Arquitectura del Backend IA](./arquitectura/arquitectura-backend.md) - Descripción detallada de flujos y herramientas
- [Flujo de Datos](./arquitectura/flujo-datos.md) - Cómo se usan estos esquemas en el flujo
- [Arquitectura del Frontend](./arquitectura/arquitectura-frontend.md) - Cómo el frontend usa estos esquemas
- [Plan Maestro de Desarrollo](./planes-desarrollo/plan-maestro.md) - Estado actual del proyecto y planes futuros

