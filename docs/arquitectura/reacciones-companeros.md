# Sistema de Reacciones de Compañeros en Dos Momentos

**Versión:** 1.0  
**Fecha:** 14 de noviembre de 2025  
**Estado:** Implementado

---

## 📋 Índice

1. [Visión General](#visión-general)
2. [Motivación](#motivación)
3. [Arquitectura](#arquitectura)
4. [Flujo de Reacciones](#flujo-de-reacciones)
5. [Implementación Técnica](#implementación-técnica)
6. [Control de Verbosidad](#control-de-verbosidad)
7. [Ejemplos](#ejemplos)
8. [Consideraciones de Diseño](#consideraciones-de-diseño)

---

## Visión General

El sistema de reacciones de compañeros permite que los personajes AI-controlados reaccionen en **dos momentos diferentes**:

1. **Antes de la narración del DM** (`before_dm`): Reaccionando a la propuesta del jugador
2. **Después de la narración del DM** (`after_dm`): Reaccionando a lo que acaba de suceder

Este diseño simula el comportamiento de jugadores reales en una mesa de D&D, donde los jugadores pueden tanto comentar sobre planes propuestos como reaccionar a eventos que ocurren.

---

## Motivación

### Problema Original

Antes de esta implementación, los compañeros solo reaccionaban **después** de la narración del DM, lo que causaba situaciones ilógicas:

**Ejemplo del problema:**
```
1. Jugador: "vamos a la colina del resentimiento"
2. DM: "Llegáis y veis un monstruo atacando un molino..."
3. Elara: "¿Por qué vamos allí?" ❌ (sin sentido, ya están allí)
```

### Solución

Permitir reacciones en dos momentos:

**Ejemplo corregido:**
```
1. Jugador: "vamos a la colina del resentimiento"
2. Elara: "Ese nombre no suena bien..." ✅ (reacción a la propuesta)
3. DM: "Llegáis y veis un monstruo atacando un molino..."
4. Merryl: "¡Cuidado con ese monstruo!" ✅ (reacción a la situación)
```

---

## Arquitectura

### Componentes Clave

```
┌─────────────────────────────────────────────────────────────┐
│                    GAME COORDINATOR                         │
│                                                             │
│  1. Recibe acción del jugador                              │
│  2. Interpreta la acción (actionInterpreter)               │
│  │                                                          │
│  3. ┌──────────────────────────────────────┐              │
│     │ REACCIONES BEFORE_DM (opcional)      │              │
│     │ - Solo acciones significativas       │              │
│     │ - Probabilidad: 30-40%               │              │
│     │ - Contexto: Solo propuesta jugador   │              │
│     └──────────────────────────────────────┘              │
│  │                                                          │
│  4. ┌──────────────────────────────────────┐              │
│     │ NARRACIÓN DEL DM                     │              │
│     │ - narrativeExpert genera narración   │              │
│     └──────────────────────────────────────┘              │
│  │                                                          │
│  5. ┌──────────────────────────────────────┐              │
│     │ REACCIONES AFTER_DM (opcional)       │              │
│     │ - Todas las acciones                 │              │
│     │ - Probabilidad: 50-60%               │              │
│     │ - Contexto: Propuesta + narración DM │              │
│     └──────────────────────────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Módulos Involucrados

- **`game-coordinator.ts`**: Orquesta el flujo de reacciones
- **`companion-expert.ts`**: Genera las reacciones individuales de cada compañero
- **`companionTacticianTool`**: Herramienta AI para decidir reacciones en combate (usa sistema similar)

---

## Flujo de Reacciones

### Reacciones BEFORE_DM

**Momento:** Después de la acción del jugador, **antes** de la narración del DM

**Condiciones para activarse:**
- NO es el inicio de la aventura (`!isAdventureStart`)
- La acción es significativa: `move`, `attack`, o `interact`
- El compañero tiene una opinión fuerte sobre la propuesta

**Contexto proporcionado:**
```typescript
const companionContext = `The player just proposed/said: "${playerAction}"${isTargeted ? `\n\n(You are being directly addressed.)` : ''}`;
```

**Probabilidad:** ~30-40% (controlada por el AI mediante prompt engineering)

**Ejemplo de código:**
```typescript
// src/ai/flows/game-coordinator.ts (líneas 166-205)
const significantActions = ['move', 'attack', 'interact'];
if (!isAdventureStart && significantActions.includes(interpretation.actionType || '')) {
    for (const character of party) {
        if (character.controlledBy === 'AI') {
            const companionResult = await companionExpertTool({
                party: party,
                characterName: character.name,
                context: companionContext,
                inCombat: inCombat,
                reactionTiming: 'before_dm',
            });
            // ... add reaction to messages if present
        }
    }
}
```

### Reacciones AFTER_DM

**Momento:** Después de la narración del DM

**Condiciones para activarse:**
- NO es el inicio de la aventura (`!isAdventureStart`)
- Cualquier acción (no hay restricción por tipo)
- El compañero tiene una reacción a la situación narrada

**Contexto proporcionado:**
```typescript
const dmNarrationContext = narrativeResult.dmNarration 
    ? `\n\nDM narration (what just happened):\n"${narrativeResult.dmNarration}"` 
    : '';
const companionContext = `The player's action was: "${playerAction}"${dmNarrationContext}${isTargeted ? `\n\n(You are being directly addressed.)` : ''}`;
```

**Probabilidad:** ~50-60% (controlada por el AI mediante prompt engineering)

**Ejemplo de código:**
```typescript
// src/ai/flows/game-coordinator.ts (líneas 236-271)
if (!isAdventureStart) {
    for (const character of party) {
        if (character.controlledBy === 'AI') {
            const companionResult = await companionExpertTool({
                party: party,
                characterName: character.name,
                context: companionContext,
                inCombat: inCombat,
                reactionTiming: 'after_dm',
            });
            // ... add reaction to messages if present
        }
    }
}
```

---

## Implementación Técnica

### Schema de Input

```typescript
// src/ai/tools/companion-expert.ts
const CompanionExpertInputSchema = z.object({
  party: PartySchema,
  characterName: z.string(),
  context: z.string(),
  inCombat: z.boolean(),
  reactionTiming: z.enum(['before_dm', 'after_dm']).optional(),
});
```

### Schema del Prompt (Interno)

**⚠️ Problema Técnico Resuelto:**

Inicialmente, el prompt usaba el helper `eq` de Handlebars para comparar strings:
```handlebars
{{#if (eq reactionTiming "before_dm")}}  <!-- ❌ NO FUNCIONA en Genkit -->
```

Esto causaba errores porque Genkit usa Handlebars con `knownHelpersOnly: true`, que no incluye `eq`.

**Solución implementada:**

Reemplazamos el parámetro string con variables booleanas:

```typescript
// src/ai/tools/companion-expert.ts (líneas 29-34)
const reactionGenerationPrompt = ai.definePrompt({
    name: 'reactionGenerationPrompt',
    input: {schema: z.object({
        character: CharacterSchema,
        context: z.string(),
        isBeforeDm: z.boolean().optional(),  // ✅ Variable booleana
        isAfterDm: z.boolean().optional(),   // ✅ Variable booleana
    })},
    output: {schema: CompanionExpertOutputSchema},
    // ...
});
```

Y en el template usamos directamente las variables booleanas:
```handlebars
{{#if isBeforeDm}}  <!-- ✅ FUNCIONA -->
    **Reaction Timing: before_dm**
    <!-- instrucciones para before_dm -->
{{/if}}
{{#if isAfterDm}}   <!-- ✅ FUNCIONA -->
    **Reaction Timing: after_dm**
    <!-- instrucciones para after_dm -->
{{/if}}
```

La llamada al prompt convierte el enum a booleanos:
```typescript
// src/ai/tools/companion-expert.ts (líneas 109-114)
await reactionGenerationPrompt({
    character: characterData,
    context: context,
    isBeforeDm: input.reactionTiming === 'before_dm',
    isAfterDm: input.reactionTiming === 'after_dm' || !input.reactionTiming,
});
```

### Prompt Engineering

El prompt de `reactionGenerationPrompt` incluye instrucciones específicas para cada momento:

**Para `before_dm`:**
```
- You are reacting to the PLAYER'S PROPOSAL or action BEFORE the DM narrates what happens.
- This is your chance to express doubt, agreement, caution, or enthusiasm about the plan.
- Example: Player says "vamos a la cueva oscura" → You might say "¿Estás seguro? Parece peligroso..."
- **Be selective:** Only react if your character has a strong opinion. Silence is often more realistic.
- **Probability guideline:** React about 30-40% of the time.
```

**Para `after_dm`:**
```
- You are reacting to WHAT JUST HAPPENED (the DM's narration).
- React to the current situation, what you see, hear, or experience.
- Example: DM narrates "veis un dragón" → You might say "¡Cuidado! ¡Es enorme!"
- **Be natural:** React as a real player would, based on your personality.
- **Probability guideline:** React about 50-60% of the time.
```

---

## Control de Verbosidad

### Mecanismos de Control

1. **Prompt Engineering:**
   - Instrucción explícita: "It's okay to be silent."
   - Guías de probabilidad incluidas en el prompt
   - Énfasis en "Realism over Reactivity"

2. **Filtrado de Acciones Significativas (before_dm):**
   ```typescript
   const significantActions = ['move', 'attack', 'interact'];
   ```
   Solo estas acciones activan reacciones before_dm

3. **Validación de Output:**
   ```typescript
   if (companionResult.action && companionResult.action.trim() !== '') {
       // Solo añadir si hay contenido real
       messages.push(companionResult);
   }
   ```

### Probabilidades Objetivo

| Momento | Probabilidad | Razonamiento |
|---------|--------------|--------------|
| `before_dm` | 30-40% | Selectivo: solo opiniones fuertes sobre propuestas |
| `after_dm` | 50-60% | Más natural: reacción a eventos que ocurren |

**Nota:** Estas probabilidades son guías para el AI, no están implementadas como random numbers. El AI decide basándose en la personalidad del personaje y el contexto.

---

## Ejemplos

### Ejemplo 1: Movimiento a Ubicación Peligrosa

**Flujo completo:**
```
1. Jugador: "vamos a la cueva del dragón"

2. Elara (before_dm): "¿Estás seguro? No estamos preparados para enfrentar un dragón."

3. DM: "Os adentráis en la oscura cueva. El aire se vuelve sofocante y el olor a azufre os golpea. Al fondo, veis el brillo de dos ojos rojos gigantes."

4. Merryl (after_dm): "Por todos los dioses... ¡Es enorme! ¡Deberíamos haber traído más pociones!"

5. [El juego continúa...]
```

### Ejemplo 2: Interacción con NPC

**Flujo completo:**
```
1. Jugador: "hablo con el tabernero sobre el dragón"

2. [No hay reacciones before_dm - los compañeros no tienen opinión fuerte]

3. DM: "El tabernero se pone pálido. 'El dragón... nadie ha vuelto de esa cueva en años. Dicen que custodia un tesoro maldito.'"

4. Elara (after_dm): "Un tesoro maldito... Eso explicaría por qué sigo sintiendo una presencia oscura."

5. [El juego continúa...]
```

### Ejemplo 3: Compañeros en Silencio

**Flujo completo:**
```
1. Jugador: "examinamos la habitación"

2. [No hay reacciones before_dm - acción no es significativa]

3. DM: "La habitación está vacía, excepto por una mesa polvorient y una silla rota."

4. [No hay reacciones after_dm - situación no amerita comentario]

5. [El juego continúa...]
```

---

## Consideraciones de Diseño

### Ventajas

1. **Realismo:** Simula comportamiento de jugadores reales en mesa
2. **Flexibilidad:** Los compañeros pueden reaccionar en el momento más apropiado
3. **Inmersión:** Crea sensación de grupo dinámico y vivo
4. **Control:** Mecanismos múltiples para evitar saturación

### Desafíos y Soluciones

| Desafío | Solución Implementada |
|---------|----------------------|
| Demasiadas reacciones | Probabilidades diferentes, filtrado por tipo de acción, prompt engineering |
| Reacciones redundantes | Instrucción explícita: "DO NOT repeat what was already said" |
| Contexto insuficiente | Contexto diferente para cada momento (propuesta vs. narración completa) |
| Incoherencia temporal | Lógica clara de orden: before_dm → DM → after_dm |
| **Helper `eq` no disponible en Genkit** | **Reemplazado por variables booleanas `isBeforeDm`/`isAfterDm` en el schema del prompt** |

### Futuras Mejoras

1. **Personalidad más diferenciada:** Ajustar probabilidades por personalidad del personaje
   - Personajes tímidos: menor probabilidad de reacción
   - Personajes impulsivos: mayor probabilidad before_dm

2. **Memoria contextual:** Evitar repetir reacciones similares en turnos consecutivos

3. **Reacciones grupales:** Permitir que dos compañeros interactúen entre sí ocasionalmente

4. **Análisis de saturación:** Métricas para medir si los compañeros hablan demasiado/poco

---

## Referencias

### Archivos Relacionados

- `src/ai/flows/game-coordinator.ts` (líneas 166-271)
- `src/ai/tools/companion-expert.ts`
- `CHANGELOG.md` - Sección "Sistema de reacciones de compañeros en dos momentos"

### Issues Relacionados

- Orden incorrecto de reacciones de compañeros (fix que motivó esta mejora)

### Documentación Adicional

- [Arquitectura Backend IA](./arquitectura-backend.md)
- [Flujo de Datos](./flujo-datos.md)
- [Companion Expert Tool (Prompts)](../planes-desarrollo/prompts/companion-expert.md) *(pendiente de crear)*

---

**Última actualización:** 14 de noviembre de 2025 (añadida sección sobre fix del helper `eq`)

