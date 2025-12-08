# Plan de Implementación: Sistema de Skill Checks y Mecánica de Ventaja/Desventaja

**Roadmap:** Roadmap #5 (Modos de Juego Diferenciados) y Core Mechanics  
**Prioridad:** 🔴 ALTA  
**Fecha de actualización:** 2025-12-08  
**Arquitecto:** Antigravity (Google Deepmind)  
**Estado:** 🚧 EN CURSO  
**Versión:** 2.0 (Refinado con Ventaja/Desventaja y Datos Pre-calculados)

---

## 🎯 Objetivo Arquitectónico

Implementar un sistema robusto de resolución de acciones no combativas (Skill Checks) que:
1.  **Utilice la "Single Source of Truth" con Fallback:** Priorizar modificadores pre-calculados (`character.skills[].modifier`), pero incluir lógica defensiva para calcularlos al vuelo si faltan (resiliencia).
2.  **Introduzca Mecánicas Avanzadas de Dados (Modular):** Implementar soporte nativo para **Ventaja** (2d20kh1) y **Desventaja** (2d20kl1) en el núcleo del sistema de tiradas (`DiceEngine`).
3.  **Aplique Segregación de Responsabilidades:** 
    *   `ActionInterpreter`: Solo detecta la *intención*.
    *   `SkillCheckExpert`: Decide *qué* skill, CD y contexto (Ventaja/Desventaja).
    *   `SkillCheckResolver`: Ejecuta la matemática determinista.

---

## 🏗️ Nueva Arquitectura de Datos

### 1. Evolución del Schema `DiceRoll`

El sistema de tiradas actual es lineal. Necesitamos una estructura que soporte la dimensionalidad de ventaja/desventaja sin romper la compatibilidad con el combate existente.

```typescript
// src/lib/types.ts

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface DiceRoll {
  // ... campos existentes ...
  type: 'attack' | 'damage' | 'save' | 'skill_check' | 'ability_check'; // Actualizado
  
  // Metadatos mecánicos
  rollMode: RollMode; // NUEVO: Indica la mecánica usada
  
  // Estructura detallada para Ventaja/Desventaja
  diceResults?: {
    die1: number;      // Primer d20
    die2?: number;     // Segundo d20 (solo si adv/dis)
    kept: number;      // El valor que se usó finalmente
    discarded?: number;// El valor que se ignoró
    modifier: number;  // El modificador aplicado (traído de la ficha)
  };

  // Detalles específicos de Skill
  skillCheckDetails?: {
    skillName: string; // "Stealth", "Athletics"
    skillLabel: string; // "Sigilo", "Atletismo" (Localizado)
    difficultyClass: number;
    success: boolean;
  };
}
```

### 2. Flujo de Datos Optimizado

```mermaid
graph TD
    A[Jugador: "Intento escalar"] --> B[ActionInterpreter]
    B --> C{Detecta INTENCIÓN de Check}
    C -- Sí --> D[NarrativeTurnManager]
    D --> E[AI: SkillCheckExpert]
    E -->|Decide: Athletics, DC 15, Adv?| F[SkillCheckResolver]
    
    subgraph "SkillCheckResolver (Determinístico)"
        F --> G[Leer character.skills[mod]]
        G -.->|Fallback si null| G2[Calcular Stat + PB]
        G2 --> H[DiceEngine.rollD20(RollMode)]
        H --> I[Construir DiceRoll Object]
    end
    
    I --> J[DiceRollResult]
    J --> K[VisualDicePair Component]
```

---

## 📝 Fases de Implementación

### Fase 1: Core Mechanics & Schemas (Modular y Reutilizable) (2-3 horas)

**Objetivo:** Preparar el sistema de tipos y utilidades de dados para soportar Ventaja/Desventaja de forma genérica, permitiendo su futura adopción en el sistema de combate.

1.  **Actualizar Tipos:** Modificar `DiceRoll` en `src/lib/types.ts` y `src/lib/schemas.ts`.
    *   Asegurar que `DiceRoll` soporta la estructura de ventaja/desventaja para CUALQUIER tipo de tirada (`attack`, `save`, `skill_check`).
2.  **Implementar `DiceEngine`:** Crear `src/lib/dice/dice-engine.ts`.
    *   Este módulo debe ser totalmente desacoplado de Skills o Combate. Solo sabe de matemáticas de dados.
    *   Función `rollD20(mode: RollMode): { total: number, die1: number, die2?: number, kept: number }`.
    *   Debe manejar matemáticamente `Math.max` para ventaja y `Math.min` para desventaja.
3.  **Actualizar Constantes:** Añadir mapa de traducción de skills (`SKILL_TRANSLATIONS`) para UI en español.

### Fase 2: Skill Check Resolver (Optimizado & Resiliente) (2-3 horas)

**Objetivo:** Lógica de resolución pura que consume datos pre-calculados con seguridad.

1.  **Crear `src/lib/skills/skill-check-resolver.ts`**:
    *   **Input:** `Character`, `SkillName`, `DC`, `RollMode`.
    *   **Lógica Defensiva:**
        1.  Buscar `character.skills`.
        2.  Si existe `modifier`, usarlo.
        3.  **ELSE (Fallback):** Calcular `(Attributes[SkillMap[skill]] + (proficient ? PB : 0))`. Loguear Warning.
    *   Llamar a `DiceEngine.rollD20(rollMode)`.
    *   Retornar objeto `DiceRoll` completo.

### Fase 3: Skill Check Expert (AI Layer - Responsabilidad Completa) (3-4 horas)

**Objetivo:** El experto asume la inteligencia de juego: Qué skill usar y qué dificultad aplicar.

1.  **Crear Tool `skillCheckExpert`**:
    *   **Input:** Acción del jugador + Contexto.
    *   **Responsabilidad:** Decidir la *Skill* apropiada. El `ActionInterpreter` ya no decide esto, para evitar errores por falta de contexto.
    *   **Output Schema:**
        ```json
        {
          "selectedSkill": "athletics", // La IA decide la skill aquí
          "difficultyClass": 15,
          "suggestedMode": "normal" | "advantage" | "disadvantage",
          "reasoning": "La lluvia dificulta el agarre (Desventaja)",
          // ... narraciones ...
        }
        ```

### Fase 4: Integración en Loop de Juego (Simplificada) (3-4 horas)

**Objetivo:** Conectar las piezas descargando responsabilidad del Router.

1.  **Action Interpreter (Simplificado):**
    *   Solo detecta `skillCheck: { required: true }`.
    *   *Eliminado:* No necesita adivinar la skill exacta.
2.  **NarrativeTurnManager:**
    *   Pasa la acción cruda al `SkillCheckExpert`.
    *   Recibe la skill decidida por el experto y ejecuta la resolución.

### Fase 5: UI Modular (2-3 horas)

**Objetivo:** Visualización reutilizable para futuro combate.

1.  **Crear Componente `VisualDicePair`**:
    *   Sub-componente que recibe `{ die1, die2, kept, mode }`.
    *   Encapsula la lógica visual de "tachar el descartado" y "resaltar el mantenido".
2.  **Actualizar `DiceRollResult`**:
    *   Integrar `VisualDicePair` cuando `rollMode !== 'normal'`.

### Fase 6: Testing (2-3 horas)

1.  **Unit Tests:** Validar que `rollD20` respeta las probabilidades de ventaja/desventaja.
2.  **Integration Tests:** Validar que el modificador correcto se extrae de la ficha de Galador/Merryl.
3.  **End-to-End:** Verificar que la UI muestra la tirada y la narración del DM sigue el resultado.

---

## 🚀 Roadmap Futuro: Integración en Combate

Una vez completado y estabilizado este sistema para Skills, se debe proceder con la migración del sistema de Combate.

**Fase Futura: Integración de Ventaja/Desventaja en Combate**
*   **Refactorizar `CombatActionResolver`**: Actualizar la lógica de ataque para usar `DiceEngine.rollD20()`.
*   **Actualizar Tacticians**: Permitir que la IA sugiera ventaja/desventaja en ataques (ej: "atacando desde las sombras", "enemigo derribado").
*   **UI Unificada**: Asegurar que las tiradas de ataque con ventaja se visualicen igual que las de skills.

---

## 📊 Estimación Total

*   **Tiempo base:** ~16 horas.
*   **Complejidad:** Media-Alta (debido a cambios en core types).
*   **Riesgos:** Romper la visualización de tiradas de combate existentes si el componente de UI no maneja bien la retrocompatibilidad de tipos.

## ✅ Criterios de Aceptación (Definition of Done)

1.  El sistema usa **exclusivamente** `character.skills[].modifier`.
2.  Se pueden forzar tiradas con **Ventaja** y **Desventaja**.
3.  La UI muestra visualmente **dos dados** cuando hay ventaja/desventaja, indicando cuál se usó.
4.  No se rompen las tiradas de ataque/daño existentes.
