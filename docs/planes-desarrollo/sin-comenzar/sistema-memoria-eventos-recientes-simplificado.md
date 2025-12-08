# Plan de Implementación: Sistema de Memoria de Eventos Recientes (Versión Simplificada)

**Roadmap:** #23  
**Prioridad:** 🟡 MEDIA  
**Fecha de creación del plan:** 2025-12-08  
**Estado:** 📝 SIN COMENZAR  
**Versión:** Simplificada (MVP primero, expandir después)

**Referencia:** Issue identificado en testing - Compañeros no recuerdan eventos recientes (combates, descubrimientos)

---

## 🎯 Objetivo

Implementar un sistema mínimo viable de memoria de eventos recientes que resuelva el caso principal: **los compañeros no recuerdan combates recientes**. El sistema será simple, enfocado y fácil de expandir después.

**Objetivo principal:**
- **Resolver el caso original:** Merryl debe recordar que acabaron de matar un goblin en la "Sala Sur" aunque haya pasado varios mensajes.

**Enfoque:**
- ✅ **MVP primero:** Solo capturar eventos de combate (`combat_end`)
- ✅ **Simple:** TTL único, solo `turnNumber`, sin persistencia inicial
- ✅ **Validar:** Probar el caso original antes de expandir
- ✅ **Iterar:** Añadir más tipos de eventos después si es necesario

---

## 📋 Análisis del Problema

### Problema Principal

El sistema actual depende exclusivamente del historial de chat (`conversationHistory`) para proporcionar contexto a los compañeros AI. Esto causa:

1. **Pérdida de contexto:** Si hay muchos mensajes entre un evento importante (ej: combate) y la pregunta del jugador, el evento puede no estar en los últimos 6 mensajes
2. **Sin memoria semántica:** El sistema no distingue entre eventos importantes (combate) y mensajes triviales

### Caso de Uso Específico

**Escenario reportado:**
1. Jugador mata a un goblin en la "Sala Sur" durante un combate
2. Combate termina, se generan varios mensajes (narración del DM, reacciones de compañeros, etc.)
3. Jugador se mueve a otra sala
4. Jugador pregunta "¿Qué vemos en la sala sur?"
5. Merryl (compañero) reacciona pero no recuerda que acabaron de matar al goblin allí
6. Merryl dice algo sin sentido como "¡A ver qué se le ha caído!" como si fuera la primera vez que ve el goblin

**Causa raíz:** El `chatHistory` que recibe Merryl solo incluye los últimos 6 mensajes, que probablemente no incluyen el combate donde mataron al goblin.

### Análisis de Código Actual

**Ubicación:** `src/ai/flows/managers/narrative-turn-manager.ts` (línea 184)

```typescript
// Prepare chat history for companions (last 6 messages, same trimming as coordinator)
const recentHistory = conversationHistory.slice(-6).map(formatMessageForTranscript).join('\n');
```

**Problemas:**
- Solo incluye últimos 6 mensajes
- No distingue entre eventos importantes y mensajes triviales
- Si el combate terminó hace 10 mensajes, no está en el contexto

---

## 🏗️ Arquitectura Simplificada

### Visión General

El sistema implementará una **memoria mínima de eventos** que:

1. **Captura solo eventos críticos:** Por ahora, solo `combat_end`
2. **Almacena eventos simples:** Tipo, descripción, ubicación, turnNumber
3. **Expira automáticamente:** TTL único de 10 turnos
4. **Inyecta en compañeros:** Añade eventos relevantes al contexto de los compañeros

### Componentes Principales

#### 1. Schema de Eventos Simplificado (`src/lib/schemas.ts`)

**Estructura mínima:**

```typescript
export const GameEventSchema = z.object({
  id: z.string(), // ID único del evento (generado automáticamente)
  type: z.enum(['combat_end']), // Solo combat_end por ahora
  description: z.string(), // Descripción narrativa del evento
  locationId: z.string(), // Ubicación donde ocurrió
  turnNumber: z.number(), // Número de turno cuando ocurrió
  metadata: z.record(z.any()).optional(), // Metadatos (enemigos derrotados, etc.)
});

export const GameEventsSchema = z.array(GameEventSchema);
export type GameEvent = z.infer<typeof GameEventSchema>;

// TTL constante (puede ajustarse después)
const EVENT_TTL_TURNS = 10;
```

**Nota:** Solo `combat_end` inicialmente. Podemos añadir más tipos después de validar que funciona.

#### 2. GameState Integration (`src/ai/flows/schemas.ts`)

**Modificación de `GameStateSchema`:**

```typescript
export const GameStateSchema = z.object({
  // ... campos existentes ...
  recentEvents: z.array(GameEventSchema).optional().default([]), // Nuevo campo
});
```

**Modificación de `GameCoordinatorOutputSchema`:**

```typescript
export const GameCoordinatorOutputSchema = z.object({
  // ... campos existentes ...
  updatedRecentEvents: z.array(GameEventSchema).optional(), // Eventos actualizados
});
```

#### 3. Event Manager Simplificado (`src/lib/game/event-manager.ts`)

**Solo 3 métodos esenciales:**

```typescript
export class EventManager {
  // TTL constante
  private static readonly TTL_TURNS = 10;

  /**
   * Registra un nuevo evento en el estado del juego
   * Genera ID único y añade turnNumber actual
   */
  static recordEvent(
    gameState: GameState,
    currentTurn: number,
    event: Omit<GameEvent, 'id' | 'turnNumber'>
  ): GameState;

  /**
   * Obtiene eventos relevantes para un contexto específico
   * Filtra por ubicación y expira automáticamente (edad > TTL)
   */
  static getRelevantEvents(
    events: GameEvent[],
    currentTurn: number,
    options: {
      locationId?: string;
      includeNearbyLocations?: boolean; // Incluir eventos de ubicaciones conectadas
    }
  ): GameEvent[];

  /**
   * Formatea eventos para inyección en prompts de IA
   * Ejemplo: "- 2 turns ago: Combat ended in Sala Sur. Goblins defeated."
   */
  static formatForPrompt(events: GameEvent[], currentTurn: number): string;
}
```

**Nota:** La expiración se hace automáticamente dentro de `getRelevantEvents()`, no necesita un método separado.

#### 4. Punto de Captura Inicial

**Solo capturar fin de combate:**

1. **Fin de Combate** (`src/lib/combat/combat-session.ts` o `src/ai/flows/combat-manager.ts`):
   - Detectar cuando el combate termina (en `checkEndOfCombat()` o similar)
   - Obtener lista de enemigos derrotados
   - Llamar a `EventManager.recordEvent()` con tipo `combat_end`
   - Incluir metadata con nombres de enemigos derrotados

**Nota:** No capturamos `combat_start` ni otros eventos por ahora. Solo lo esencial.

#### 5. Inyección de Contexto - Solo Compañeros

**Para Compañeros** (`src/ai/flows/managers/companion-reaction-manager.ts`):

```typescript
// Obtener eventos relevantes (incluye expiración automática)
const relevantEvents = EventManager.getRelevantEvents(
  gameState.recentEvents || [],
  currentTurnNumber || 0,
  {
    locationId: currentLocationId,
    includeNearbyLocations: true, // Incluir eventos de ubicaciones cercanas
  }
);

// Formatear para prompt
const eventsContext = EventManager.formatForPrompt(relevantEvents, currentTurnNumber || 0);

// Añadir al contexto del compañero
const companionContext = `The player's action was: "${playerAction}"${dmNarrationContext}
${eventsContext ? `\n\n[RECENT MEMORY]\n${eventsContext}` : ''}`;
```

**Nota:** No inyectamos en el DM por ahora. Solo compañeros para resolver el caso original.

---

## 📝 Fases de Implementación Simplificadas

### Fase 1: Schema y Estructura Base (1-2 horas)

**Objetivo:** Crear los schemas mínimos y la estructura base del sistema.

**Tareas:**
1. Añadir `GameEventSchema` a `src/lib/schemas.ts` (solo tipo `combat_end`)
2. Modificar `GameStateSchema` para incluir `recentEvents: z.array(GameEventSchema).optional().default([])`
3. Actualizar `GameCoordinatorOutputSchema` para incluir `updatedRecentEvents`
4. Crear `src/lib/game/event-manager.ts` con estructura básica (3 métodos stub)
5. Crear tests unitarios básicos para `EventManager`

**Criterios de éxito:**
- ✅ Schemas definidos y validados
- ✅ `GameState` puede almacenar eventos
- ✅ `EventManager` tiene estructura básica
- ✅ Tests básicos pasan

**Archivos nuevos:**
- `src/lib/game/event-manager.ts`
- `tests/unit/game/event-manager.test.ts`

**Archivos modificados:**
- `src/lib/schemas.ts` - Añadir `GameEventSchema`
- `src/ai/flows/schemas.ts` - Modificar `GameStateSchema` y `GameCoordinatorOutputSchema`

---

### Fase 2: Implementación de EventManager (2-3 horas)

**Objetivo:** Implementar la lógica completa de `EventManager` (solo 3 métodos).

**Tareas:**
1. Implementar `recordEvent()`:
   - Generar ID único para el evento (usar `crypto.randomUUID()` o similar)
   - Añadir `turnNumber` desde el parámetro `currentTurn`
   - Añadir evento al array `recentEvents` del `GameState`
   - Retornar `GameState` actualizado
2. Implementar `getRelevantEvents()`:
   - Filtrar eventos expirados (edad > TTL_TURNS)
   - Filtrar por `locationId` (exacto o cercano si `includeNearbyLocations`)
   - Retornar eventos relevantes ordenados por turnNumber (más recientes primero)
3. Implementar `formatForPrompt()`:
   - Formatear eventos en texto legible para prompts
   - Incluir tiempo relativo ("2 turns ago", "recently")
   - Ejemplo: `"- 2 turns ago: Combat ended in Sala Sur. Goblins defeated."`
4. Añadir tests unitarios completos

**Criterios de éxito:**
- ✅ `recordEvent()` crea eventos correctamente
- ✅ `getRelevantEvents()` filtra y expira correctamente
- ✅ `formatForPrompt()` genera texto legible
- ✅ Todos los tests pasan

**Archivos modificados:**
- `src/lib/game/event-manager.ts` - Implementación completa
- `tests/unit/game/event-manager.test.ts` - Tests completos

---

### Fase 3: Captura de Eventos - Solo Fin de Combate (1-2 horas)

**Objetivo:** Capturar eventos de fin de combate.

**Tareas:**
1. **Fin de Combate** (`src/lib/combat/combat-session.ts` o `src/ai/flows/combat-manager.ts`):
   - Detectar cuando el combate termina (en `checkEndOfCombat()` o cuando `phase === CombatPhase.COMBAT_END`)
   - Obtener lista de enemigos derrotados (filtrar enemigos con `hp.current <= 0`)
   - Obtener `gameState` y `turnNumber` actual
   - Llamar a `EventManager.recordEvent()` con tipo `combat_end`
   - Incluir metadata: `{ enemiesDefeated: [...nombres], locationId: '...' }`
   - Actualizar `gameState` con eventos
2. Actualizar `CombatManager` para pasar `gameState` y recibir `updatedGameState` con eventos
3. Testing manual: Verificar que los eventos se registran correctamente (usar `debugLogs`)

**Criterios de éxito:**
- ✅ Eventos de combate se registran al terminar
- ✅ Metadata incluye información relevante (enemigos, ubicación)
- ✅ Eventos persisten en el estado del juego
- ✅ Testing manual verifica funcionamiento

**Archivos modificados:**
- `src/lib/combat/combat-session.ts` o `src/ai/flows/combat-manager.ts`
- `src/ai/flows/game-coordinator.ts` (si es necesario para pasar `gameState`)

---

### Fase 4: Inyección de Contexto - Compañeros (1-2 horas)

**Objetivo:** Inyectar eventos relevantes en el contexto de los compañeros.

**Tareas:**
1. Modificar `companion-reaction-manager.ts`:
   - Añadir `gameState` o `recentEvents` al `CompanionReactionInput`
   - Obtener `currentTurnNumber` (puede venir del `gameState` o como parámetro)
   - Llamar a `EventManager.getRelevantEvents()` para obtener eventos relevantes
   - Llamar a `EventManager.formatForPrompt()` para formatear
   - Añadir eventos formateados al `companionContext`
2. Actualizar `narrative-turn-manager.ts`:
   - Pasar `gameState` o `recentEvents` a `processCompanionReactions()`
   - Pasar `turnNumber` actual (puede ser 0 si no hay combate)
3. Actualizar prompt de `companion-expert.ts`:
   - Añadir sección `[RECENT MEMORY]` en el prompt (opcional, solo si hay eventos)
   - Instruir a la IA para usar esta información cuando sea relevante
4. Testing manual: Verificar que los compañeros reciben eventos en su contexto

**Criterios de éxito:**
- ✅ Compañeros reciben eventos relevantes en su contexto
- ✅ Eventos se formatean correctamente
- ✅ Compañeros pueden usar esta información (verificar en testing manual)

**Archivos modificados:**
- `src/ai/flows/managers/companion-reaction-manager.ts`
- `src/ai/flows/managers/narrative-turn-manager.ts`
- `src/ai/tools/companion-expert.ts`

---

### Fase 5: Testing del Caso Original (1 hora)

**Objetivo:** Validar que el sistema resuelve el problema original.

**Tareas:**
1. **Test del caso original:**
   - Reproducir el escenario: matar goblin en "Sala Sur", terminar combate, moverse a otra sala, preguntar sobre "Sala Sur"
   - Verificar que Merryl recibe el evento en su contexto (usar `debugLogs`)
   - Verificar que Merryl recuerda el combate (respuesta apropiada)
2. **Tests de integración básicos:**
   - Verificar que eventos se capturan correctamente
   - Verificar que eventos se inyectan correctamente
   - Verificar que eventos expiran correctamente (después de 10 turnos)
3. **Verificar no hay regresiones:**
   - Ejecutar tests existentes
   - Verificar que funcionalidad existente sigue funcionando

**Criterios de éxito:**
- ✅ El caso original se resuelve (Merryl recuerda el combate)
- ✅ Eventos funcionan correctamente
- ✅ No hay regresiones

---

## 🔍 Consideraciones Técnicas Simplificadas

### 1. TTL y Expiración

**Estrategia simplificada:**
- **TTL único:** 10 turnos para todos los eventos
- **Cálculo de edad:** `currentTurn - event.turnNumber`
- **Expiración automática:** Dentro de `getRelevantEvents()`, no necesita método separado
- **Ajuste futuro:** Si 10 turnos no es suficiente, ajustar la constante `TTL_TURNS`

### 2. Filtrado de Eventos Relevantes

**Estrategia:**
- **Por ubicación:** Incluir eventos de la ubicación actual
- **Ubicaciones cercanas:** Si `includeNearbyLocations`, incluir eventos de ubicaciones conectadas (usar `locationData.connections`)
- **Por tiempo:** Solo eventos dentro del TTL (automático en `getRelevantEvents()`)

### 3. Formato de Eventos para Prompts

**Estrategia:**
- Formato legible y conciso
- Incluir tiempo relativo ("2 turns ago", "recently")
- Incluir ubicación si es relevante
- Ejemplo:
  ```
  [RECENT MEMORY]
  - 2 turns ago: Combat ended in Sala Sur. Goblins defeated.
  ```

### 4. Integración con Estado Existente

**Estrategia:**
- Añadir `recentEvents` a `GameState` (accesible en combate y exploración)
- Pasar `gameState` a través de los flujos necesarios
- Actualizar `GameCoordinatorOutput` para incluir `updatedRecentEvents`
- **Nota:** No necesitamos persistencia inicial, los eventos solo viven en memoria durante la sesión

### 5. Performance

**Consideraciones:**
- Limitar número máximo de eventos (ej: 50 eventos máximo) - añadir en `recordEvent()`
- Limpiar eventos expirados automáticamente (en `getRelevantEvents()`)
- Usar arrays simples (no necesitamos estructura compleja)
- El formateo de eventos es rápido (solo texto)

---

## 📊 Validación

### Test del Caso Original

1. Iniciar combate en "Sala Sur"
2. Matar goblin
3. Terminar combate
4. Moverse a otra sala
5. Preguntar "¿Qué vemos en la sala sur?"
6. **Verificar:** Merryl debe recordar que acabaron de matar al goblin

### Tests Adicionales

- Eventos se capturan correctamente al terminar combate
- Eventos se inyectan correctamente en contexto de compañeros
- Eventos expiran correctamente (después de 10 turnos)
- No hay memory leaks (eventos no crecen indefinidamente)

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Aumento de tamaño del GameState

**Probabilidad:** Baja  
**Impacto:** Bajo

**Mitigación:**
- Limitar número máximo de eventos (50 eventos)
- Limpiar eventos expirados automáticamente
- Los eventos son estructuras pequeñas (texto + metadatos)

### Riesgo 2: Eventos no se capturan correctamente

**Probabilidad:** Media  
**Impacto:** Medio

**Mitigación:**
- Testing exhaustivo del punto de captura (fin de combate)
- Logging de eventos registrados para debugging
- Verificar que `gameState` se pasa correctamente

### Riesgo 3: TTL incorrecto causa pérdida de contexto

**Probabilidad:** Baja  
**Impacto:** Bajo

**Mitigación:**
- Usar TTL conservador (10 turnos)
- Ajustar según feedback de testing
- Es fácil cambiar la constante `TTL_TURNS`

### Riesgo 4: Regresiones en funcionalidad existente

**Probabilidad:** Baja  
**Impacto:** Medio

**Mitigación:**
- Ejecutar todos los tests existentes
- Testing manual exhaustivo
- Migración gradual (una fase a la vez)

---

## 📅 Estimación de Tiempo

**Total estimado:** 6-9 horas

**Desglose:**
- Fase 1 (Schema y Estructura Base): 1-2 horas
- Fase 2 (Implementación de EventManager): 2-3 horas
- Fase 3 (Captura de Eventos - Combate): 1-2 horas
- Fase 4 (Inyección de Contexto - Compañeros): 1-2 horas
- Fase 5 (Testing del Caso Original): 1 hora

**Buffer para imprevistos:** +20% (1-2 horas adicionales)

**Tiempo total con buffer:** 7-11 horas

**Comparación con plan original:** 18-26 horas → 7-11 horas (reducción del ~60%)

---

## ✅ Criterios de Finalización (MVP)

El plan se considerará completado cuando:

1. ✅ **Sistema base implementado:**
   - Schemas definidos y validados
   - `EventManager` funcionando (3 métodos)
   - Tests unitarios pasan

2. ✅ **Captura de eventos funcionando:**
   - Eventos de combate se capturan al terminar
   - Eventos persisten en el estado

3. ✅ **Inyección de contexto funcionando:**
   - Compañeros reciben eventos relevantes
   - Eventos se formatean correctamente

4. ✅ **Problema original resuelto:**
   - Merryl recuerda el combate reciente
   - Compañeros tienen contexto de eventos importantes

5. ✅ **Tests pasando:**
   - Todos los tests unitarios pasan
   - Test del caso original pasa

6. ✅ **No hay regresiones:**
   - Funcionalidad existente sigue funcionando
   - No hay problemas de rendimiento

---

## 🚀 Expansión Futura (Después del MVP)

Una vez que el MVP esté funcionando y validado, podemos expandir:

1. **Más tipos de eventos:**
   - `item_found` (descubrimiento de objetos)
   - `location_discovered` (nueva ubicación)
   - `npc_interaction` (interacciones importantes)
   - etc.

2. **Inyección en DM:**
   - Añadir eventos al contexto del DM en `exploration-context-builder.ts`

3. **Persistencia:**
   - Guardar/cargar eventos en partidas guardadas

4. **TTL por tipo:**
   - Diferentes TTLs para diferentes tipos de eventos

5. **Más puntos de captura:**
   - Capturar eventos en más lugares del código

**Nota:** Estas expansiones se harán después de validar que el MVP funciona correctamente.

---

## 🔗 Referencias

- Issue identificado: Compañeros no recuerdan eventos recientes
- Plan original: `docs/planes-desarrollo/en-curso/sistema-memoria-eventos-recientes.md`
- Archivos relacionados:
  - `src/ai/flows/managers/companion-reaction-manager.ts`
  - `src/ai/flows/managers/narrative-turn-manager.ts`
  - `src/lib/combat/combat-session.ts`

---

## 📝 Notas de Implementación

### Decisiones de Diseño

- **Eventos en GameState:** Para que sean accesibles en combate y exploración
- **TTL basado en turnos:** Más simple que tiempo del mundo
- **TTL único:** Todos los eventos tienen el mismo TTL (10 turnos)
- **Solo combat_end inicialmente:** Resolver el caso principal primero
- **Sin persistencia inicial:** Los eventos solo viven en memoria durante la sesión
- **Expiración automática:** Dentro de `getRelevantEvents()`, no necesita método separado

### Próximos Pasos

1. Revisar este plan simplificado
2. Aprobar inicio de implementación
3. Comenzar con Fase 1 (Schema y Estructura Base)
4. Validar el caso original antes de expandir

