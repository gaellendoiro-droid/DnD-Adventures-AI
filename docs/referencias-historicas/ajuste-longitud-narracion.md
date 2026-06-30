# Plan de Implementación: Ajuste Dinámico de Longitud de Narración

**Estado:** En Curso
**Fecha de Inicio:** 2025-11-26
**Objetivo:** Ajustar la extensión de las narraciones del DM dinámicamente, diferenciando entre momentos estándar (concisos) y momentos clave (más descriptivos).

## 1. Detección de "Momentos Clave"

La lógica para determinar si un turno es un "Momento Clave" residirá en `NarrativeTurnManager`.

**Criterios para `isKeyMoment = true`:**
1.  **Cambio de Ubicación:** El jugador se ha movido exitosamente a una nueva ubicación (`newLocationId !== null` y diferente al anterior).
2.  **Muerte de Entidad:** Se han detectado nuevas entidades muertas en el turno (`deadEntities.length > 0`).
3.  **Descanso:** La acción interpretada es un descanso corto o largo (`interpretation.actionType === 'rest'`).

**Criterios para `isKeyMoment = false` (Estándar):**
-   Cualquier otro caso (exploración rutinaria, interacción simple, comandos fallidos, inicio de aventura que ya tiene intro).

## 2. Actualización de Esquemas y Flujo de Datos

Se debe propagar la bandera `isKeyMoment` a través de la cadena de llamadas.

### Archivos a Modificar:

1.  **`src/ai/flows/schemas.ts`**:
    -   Actualizar `NarrativeExpertInputSchema` para incluir `isKeyMoment: z.boolean().optional()`.
    -   Actualizar `ExplorationExpertInputSchema` para incluir `isKeyMoment: z.boolean().optional()`.
    -   Actualizar `InteractionExpertInputSchema` para incluir `isKeyMoment: z.boolean().optional()`.

2.  **`src/ai/flows/managers/narrative-turn-manager.ts`**:
    -   Implementar la lógica de detección.
    -   Pasar `isKeyMoment` al llamar a `narrativeExpert`.

3.  **`src/ai/flows/narrative-manager.ts`**:
    -   Recibir `isKeyMoment` en el input.
    -   Pasar `isKeyMoment` a `explorationExpert` y `interactionExpert`.

## 3. Actualización de Prompts

Se modificarán los prompts para incluir instrucciones condicionales basadas en `isKeyMoment`.

### `src/ai/flows/experts/exploration-expert.ts`

**Lógica del Prompt:**
```handlebars
{{#if isKeyMoment}}
**NARRATION LENGTH - KEY MOMENT:**
- This is a significant moment (location change, event, or revelation).
- You can be slightly more descriptive to set the atmosphere.
- Target length: **3-4 sentences**.
{{else}}
**NARRATION LENGTH - STANDARD:**
- Keep the narration concise and direct.
- Target length: **2-3 sentences**.
{{/if}}
```

### `src/ai/flows/experts/interaction-expert.ts`

**Lógica del Prompt:**
Similar al de exploración, permitiendo un poco más de profundidad emocional o descriptiva en momentos clave, pero manteniendo la concisión en interacciones rutinarias.

## 4. Pasos de Ejecución

1.  [x] Actualizar `schemas.ts` con el nuevo campo opcional.
2.  [x] Implementar lógica de detección en `narrative-turn-manager.ts`.
3.  [x] Propagar el campo en `narrative-manager.ts`.
4.  [x] Actualizar prompt de `exploration-expert.ts`.
5.  [x] Actualizar prompt de `interaction-expert.ts`.
6.  [x] Verificar compilación y pruebas manuales.
