# Plan de Refactorización: Modularidad del Sistema de Combate

**Estado:** 🔄 En Curso  
**Prioridad:** 🔴 Muy Alta  
**Fecha de Creación:** 2025-12-03  
**Tiempo Estimado Total:** 24 horas (incluye tests automáticos)  
**Referencia:** Nota #7 en `docs/notas/Notas de Gael.md`

---

## 1. Contexto y Problema

Tras la refactorización del Issue #117 (Simplificación de Arquitectura de Combate), el sistema de combate quedó bien estructurado con una clara separación de responsabilidades:

- `CombatSession` → Estado del combate (State Object Pattern)
- `TurnProcessor` → Procesamiento unificado de turnos
- `CombatActionExecutor` → Ejecución de acciones
- `rules-engine` → Reglas puras de D&D 5e

**Sin embargo**, la adición posterior de nuevas funcionalidades ha introducido complejidad no modularizada:

| Funcionalidad Añadida | Impacto |
|----------------------|---------|
| Sistema de Movimiento | Lógica en `narrative-turn-manager.ts` y `navigation-manager.ts` |
| Sistema de Emboscadas | Lógica dispersa en `combat-trigger-manager.ts` y `game-coordinator.ts` |
| Enemigos Ocultos/Mimics | Revelación en `game-coordinator.ts` (líneas 404-431) |
| Sistema de Sorpresa | Distribuido en 4 archivos diferentes |
| Apertura de Puertas | Mezclado con interacciones en `narrative-turn-manager.ts` |

El resultado: **`game-coordinator.ts` y `narrative-turn-manager.ts` han crecido demasiado**, perdiendo la modularidad lograda.

---

## 2. Objetivos

1. **Reducir `game-coordinator.ts`** de ~500 líneas a ~200 líneas (orquestador puro)
2. **Dividir `narrative-turn-manager.ts`** (~480 líneas) en módulos especializados
3. **Unificar el sistema de sorpresa** en un único módulo
4. **Centralizar la gestión de enemigos por ubicación** 
5. **Mantener compatibilidad total** con el comportamiento actual

---

## 3. Plan de Implementación

### Fase 1: Servicios de Bajo Nivel (Riesgo: 🟢 Bajo)

**Tiempo estimado:** 4-5 horas

#### 1.1 Crear `EnemyStateManager`

**Archivo:** `src/lib/game/enemy-state-manager.ts`

**Propósito:** Centralizar toda la lógica de gestión de enemigos por ubicación.

```typescript
export class EnemyStateManager {
    /**
     * Obtiene enemigos para una ubicación específica.
     * Punto único de resolución (elimina los fallbacks dispersos).
     */
    static getEnemiesForLocation(
        locationId: string,
        enemiesByLocation?: Record<string, any[]>,
        fallbackEnemies?: any[]
    ): any[];

    /**
     * Revela un enemigo oculto (mimic, emboscada, etc.)
     * Cambia disposition: 'hidden' → 'hostile'
     */
    static revealHiddenEnemy(enemy: any): any;

    /**
     * Filtra solo enemigos visibles (excluye hidden)
     */
    static filterVisibleEnemies(enemies: any[]): any[];

    /**
     * Normaliza estadísticas de enemigos cargados desde JSON.
     * Convierte stats.hp → hp: { current, max }
     */
    static normalizeEnemyStats(enemy: any): any;

    /**
     * Filtra enemigos muertos de una lista.
     */
    static filterAliveEnemies(enemies: any[]): any[];
}
```

**Lugares que refactorizar después de crear este módulo:**
- `game-coordinator.ts` líneas 40, 377-399
- `narrative-turn-manager.ts` líneas 97-98, 148, 305-311
- `combat-session.ts` líneas 97-99

#### 1.2 Crear `SurpriseManager`

**Archivo:** `src/lib/combat/surprise-manager.ts`

**Propósito:** Unificar toda la lógica de sorpresa en un solo lugar.

```typescript
export interface SurpriseContext {
    triggerReason?: 'ambush' | 'proximity' | 'stealth_fail' | 'mimic' | 'provocation' | 'player_surprise';
    isPlayerInitiatedAttack: boolean;
}

export class SurpriseManager {
    /**
     * Determina qué lado está sorprendido basándose en el contexto.
     * ÚNICA fuente de verdad para esta decisión.
     */
    static determineSurprise(context: SurpriseContext): 'player' | 'enemy' | undefined;

    /**
     * Marca combatientes como sorprendidos en el orden de iniciativa.
     */
    static markCombatantsSurprised(
        initiativeOrder: Combatant[],
        surpriseSide: 'player' | 'enemy'
    ): Combatant[];

    /**
     * Limpia el flag de sorpresa después del primer turno.
     */
    static clearSurpriseFlag(combatant: Combatant): Combatant;

    /**
     * Verifica si un combatiente está sorprendido.
     */
    static isSurprised(combatant: Combatant): boolean;
}
```

**Lugares que refactorizar:**
- `combat-trigger-manager.ts` líneas 54-105 (determinación de surprise)
- `game-coordinator.ts` líneas 297-313 (re-evaluación de surprise)
- `combat-session.ts` líneas 861-881, 974-995 (limpieza de flag)
- `initiative-generator.ts` línea 110-115 (marcado inicial)

#### Tests Automáticos Fase 1

**Archivo:** `tests/unit/combat/enemy-state-manager.test.ts`

```typescript
describe('EnemyStateManager', () => {
    describe('getEnemiesForLocation', () => {
        it('should return enemies from enemiesByLocation if available');
        it('should fallback to fallbackEnemies if location not in map');
        it('should return empty array if no enemies found');
    });

    describe('revealHiddenEnemy', () => {
        it('should change disposition from hidden to hostile');
        it('should change status from hidden to active');
        it('should preserve other enemy properties');
    });

    describe('filterVisibleEnemies', () => {
        it('should exclude enemies with disposition: hidden');
        it('should exclude enemies with status: hidden');
        it('should include enemies with disposition: hostile');
    });

    describe('normalizeEnemyStats', () => {
        it('should convert stats.hp to hp: { current, max }');
        it('should preserve ac from stats.ac');
        it('should not modify already normalized enemies');
    });

    describe('filterAliveEnemies', () => {
        it('should exclude enemies with hp.current <= 0');
        it('should include enemies with hp.current > 0');
    });
});
```

**Archivo:** `tests/unit/combat/surprise-manager.test.ts`

```typescript
describe('SurpriseManager', () => {
    describe('determineSurprise', () => {
        it('should return "enemy" for ambush trigger');
        it('should return "enemy" for mimic trigger');
        it('should return "player" for player_surprise trigger');
        it('should return undefined for proximity trigger');
        it('should return "player" when isPlayerInitiatedAttack is true');
    });

    describe('markCombatantsSurprised', () => {
        it('should mark player combatants as surprised when surpriseSide is "player"');
        it('should mark AI combatants as surprised when surpriseSide is "enemy"');
        it('should not modify combatants on the non-surprised side');
    });

    describe('clearSurpriseFlag', () => {
        it('should set isSurprised to false');
        it('should preserve other combatant properties');
    });

    describe('isSurprised', () => {
        it('should return true if combatant.isSurprised is true');
        it('should return false if combatant.isSurprised is false or undefined');
    });
});
```

#### Punto de Control Fase 1
- [ ] `npm run test -- tests/unit/combat/enemy-state-manager.test.ts` → PASS
- [ ] `npm run test -- tests/unit/combat/surprise-manager.test.ts` → PASS
- [ ] Test manual: Verificar que el juego funciona igual que antes

---

### Fase 2: Servicio de Iniciación de Combate (Riesgo: 🟡 Medio)

**Tiempo estimado:** 5-6 horas

#### 2.1 Crear `CombatInitiationService`

**Archivo:** `src/lib/combat/combat-initiation-service.ts`

**Propósito:** Extraer la lógica de inicio de combate de `game-coordinator.ts`.

```typescript
export interface CombatInitiationRequest {
    // Tipo de inicio
    initiationType: 'player_attack' | 'dynamic_trigger';
    
    // Contexto del trigger (si aplica)
    triggerResult?: CombatTriggerResult;
    
    // Datos del combate
    party: Character[];
    enemiesByLocation: Record<string, any[]>;
    locationId: string;
    locationContext: any;
    
    // Acción del jugador
    playerAction: string;
    interpretedAction: { actionType: string; targetId?: string | null };
}

export interface CombatInitiationResponse {
    shouldStartCombat: boolean;
    combatantIds: string[];
    surpriseSide?: 'player' | 'enemy';
    preparedEnemies: any[]; // Enemigos normalizados y revelados
    narrativeMessages: GameMessage[]; // Mensajes de transición
    updatedEnemiesByLocation: Record<string, any[]>;
    
    // 🔮 EXTENSIÓN FUTURA: Posiciones iniciales para combate táctico
    // initialPositions?: Record<string, { x: number; y: number }>;
}

export class CombatInitiationService {
    /**
     * Evalúa y prepara el inicio de combate.
     * Consolida la lógica de game-coordinator.ts líneas 297-484.
     */
    static async prepareCombatInitiation(
        request: CombatInitiationRequest
    ): Promise<CombatInitiationResponse>;
}
```

**Código a mover desde `game-coordinator.ts`:**
- Líneas 297-340: Lógica de ataque del jugador + surprise
- Líneas 360-484: Manejo de triggers dinámicos (emboscadas, mimics)

#### Tests Automáticos Fase 2

**Archivo:** `tests/unit/combat/combat-initiation-service.test.ts`

```typescript
describe('CombatInitiationService', () => {
    describe('prepareCombatInitiation', () => {
        describe('player_attack initiation', () => {
            it('should return shouldStartCombat: true for attack action');
            it('should set surpriseSide to "player" for surprise attacks');
            it('should include all party members in combatantIds');
            it('should include target enemy in combatantIds');
            it('should normalize enemy stats in preparedEnemies');
        });

        describe('dynamic_trigger initiation (ambush)', () => {
            it('should set surpriseSide to "enemy" for ambush trigger');
            it('should include ambush message in narrativeMessages');
            it('should filter out hidden enemies except triggering entity');
        });

        describe('dynamic_trigger initiation (mimic)', () => {
            it('should reveal the mimic enemy');
            it('should set surpriseSide to "enemy"');
            it('should update enemiesByLocation with revealed enemy');
        });

        describe('dynamic_trigger initiation (proximity)', () => {
            it('should not set surpriseSide for proximity trigger');
            it('should include all visible hostile enemies');
        });
    });
});
```

**Actualizar:** `tests/unit/combat/combat-trigger-manager.test.ts` (ya existe)
- Añadir tests para integración con `SurpriseManager`
- Verificar que los triggers devuelven el formato esperado

#### Punto de Control Fase 2
- [ ] `npm run test -- tests/unit/combat/combat-initiation-service.test.ts` → PASS
- [ ] `npm run test -- tests/unit/combat/combat-trigger-manager.test.ts` → PASS (sin regresiones)
- [ ] `game-coordinator.ts` reducido a ~250 líneas
- [ ] Test manual: Verificar emboscadas, mimics, ataques sorpresa

---

### Fase 3: División de `narrative-turn-manager.ts` (Riesgo: 🟡 Medio)

**Tiempo estimado:** 6-8 horas

#### 3.1 Crear `InteractionHandler`

**Archivo:** `src/ai/flows/managers/interaction-handler.ts`

**Propósito:** Manejar interacciones con objetos/puertas.

```typescript
export interface InteractionResult {
    updatedOpenDoors: Record<string, boolean>;
    combatTrigger?: CombatTriggerResult;
    narrativeContext?: any;
}

export class InteractionHandler {
    /**
     * Procesa una interacción con un objeto/puerta.
     * Extrae líneas 334-411 de narrative-turn-manager.ts
     */
    static async processInteraction(input: {
        playerAction: string;
        targetId: string;
        location: Location;
        currentOpenDoors: Record<string, boolean>;
        currentLocationId: string;
    }): Promise<InteractionResult>;
}
```

#### 3.2 Crear `ExplorationContextBuilder`

**Archivo:** `src/ai/flows/managers/exploration-context-builder.ts`

**Propósito:** Construir el contexto de exploración para la narración.

```typescript
export interface ExplorationContext {
    mode: string;
    lightLevel: string;
    visitState: string;
    detectedHazards: Hazard[];
    visibleConnections: string[];
    presentEntities: any[];
}

export class ExplorationContextBuilder {
    /**
     * Construye el contexto de exploración para el DM.
     * Extrae líneas 242-320 de narrative-turn-manager.ts
     */
    static build(input: {
        gameState: GameState;
        location: Location;
        party: Character[];
        worldTime: number;
        adventureData: any;
        cameFromLocationId?: string;
    }): {
        updatedGameState: GameState;
        context: ExplorationContext;
        detectedHazards: Hazard[];
    };
}
```

#### 3.3 Refactorizar `narrative-turn-manager.ts`

Después de extraer los handlers, el archivo debería quedar como un orquestador limpio:

```typescript
export async function executeNarrativeTurn(input: NarrativeTurnInput): Promise<NarrativeTurnOutput> {
    // 1. Manejar movimiento (ya delegado a NavigationManager)
    const movementResult = await handleMovement(input);
    
    // 2. Manejar interacciones
    const interactionResult = await InteractionHandler.processInteraction(...);
    
    // 3. Construir contexto de exploración
    const explorationContext = ExplorationContextBuilder.build(...);
    
    // 4. Evaluar triggers de combate
    const combatTrigger = CombatTriggerManager.evaluate(...);
    
    // 5. Generar reacciones de compañeros (antes del DM)
    const beforeDmReactions = await processCompanionReactions(...);
    
    // 6. Generar narración del DM
    const narrativeResult = await narrativeExpert(...);
    
    // 7. Generar reacciones de compañeros (después del DM)
    const afterDmReactions = await processCompanionReactions(...);
    
    // 8. Retornar resultado
    return { ... };
}
```

**Meta:** Reducir de ~480 líneas a ~150 líneas.

#### Tests Automáticos Fase 3

**Archivo:** `tests/unit/managers/interaction-handler.test.ts`

```typescript
describe('InteractionHandler', () => {
    describe('processInteraction', () => {
        describe('door interactions', () => {
            it('should update openDoors when opening a door');
            it('should match door by direction (norte, sur, etc.)');
            it('should match door by interactable ID');
            it('should not update openDoors for non-door interactions');
        });

        describe('mimic detection', () => {
            it('should return combatTrigger for mimic hazard');
            it('should map interactable name to hazard ID');
            it('should not trigger for non-mimic hazards');
        });

        describe('general interactions', () => {
            it('should pass through non-door, non-mimic interactions');
            it('should return narrativeContext for DM narration');
        });
    });
});
```

**Archivo:** `tests/unit/managers/exploration-context-builder.test.ts`

```typescript
describe('ExplorationContextBuilder', () => {
    describe('build', () => {
        it('should update exploration state with visited location');
        it('should detect hazards using passive perception');
        it('should calculate visible connections');
        it('should resolve present entities from adventureData');
        it('should exclude connection we came from');
        it('should set correct visitState (unknown, seen, visited)');
    });

    describe('integration with ExplorationManager', () => {
        it('should call ExplorationManager.updateExplorationState');
        it('should call ExplorationManager.checkPassivePerception');
        it('should call ExplorationManager.markHazardsAsDiscovered');
    });
});
```

#### Punto de Control Fase 3
- [ ] `npm run test -- tests/unit/managers/interaction-handler.test.ts` → PASS
- [ ] `npm run test -- tests/unit/managers/exploration-context-builder.test.ts` → PASS
- [ ] `narrative-turn-manager.ts` reducido a ~150 líneas
- [ ] Test manual: Verificar apertura de puertas, exploración, triggers

---

### Fase 4: Reorganización Final (Riesgo: 🟢 Bajo)

**Tiempo estimado:** 2-3 horas

#### 4.1 Mover `CombatTriggerManager`

**Ubicación actual:** `src/ai/flows/managers/combat-trigger-manager.ts`  
**Nueva ubicación:** `src/lib/combat/trigger/combat-trigger-evaluator.ts`

**Razón:** Conceptualmente pertenece a la capa de combate, no a la capa de flujos AI.

#### 4.2 Crear barrel exports

**Archivo:** `src/lib/combat/index.ts`

```typescript
// Sesión y procesamiento
export { CombatSession } from './combat-session';
export { TurnProcessor } from './turn-processor';
export { CombatActionExecutor } from './action-executor';

// Inicialización
export { CombatInitializer } from './combat-initializer';
export { CombatInitiationService } from './combat-initiation-service';

// Triggers y sorpresa
export { CombatTriggerEvaluator } from './trigger/combat-trigger-evaluator';
export { SurpriseManager } from './surprise-manager';

// Reglas y utilidades
export * from './rules-engine';
export { CombatTurnManager } from './turn-manager';
export { CombatActionResolver } from './action-resolver';
```

#### 4.3 Actualizar imports

Actualizar todos los imports en archivos que usan estos módulos.

#### Tests Automáticos Fase 4

**Tests de Integración (actualizar existentes):**

Los siguientes tests ya existen y DEBEN seguir pasando después de la refactorización:

```bash
# Tests de integración existentes
npm run test -- tests/integration/combat/unified-combat-flow.test.ts
npm run test -- tests/integration/combat-initializer.integration.test.ts
npm run test -- tests/integration/combat-manager.integration.test.ts
npm run test -- tests/integration/turn-system-flow.test.ts
```

**Tests unitarios existentes que deben seguir pasando:**

```bash
# Estos tests NO deben romperse
npm run test -- tests/unit/combat/combat-session.test.ts
npm run test -- tests/unit/combat/turn-processor.test.ts
npm run test -- tests/unit/combat/action-executor.test.ts
npm run test -- tests/unit/combat/combat-trigger-manager.test.ts
npm run test -- tests/unit/combat/rules-engine.test.ts
npm run test -- tests/unit/combat/turn-manager.test.ts
```

#### Punto de Control Fase 4
- [ ] `npm run test` → ALL PASS (sin regresiones)
- [ ] `npm run build` → Sin errores de TypeScript
- [ ] Todos los imports actualizados
- [ ] Test manual: Jugar sesión completa (ver sección 6)

---

## 4. Diagrama de Arquitectura Final

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CAPA DE ORQUESTACIÓN (Simplificada)                  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                     game-coordinator.ts (~200 líneas)              │ │
│  │   • Detectar tipo de acción                                        │ │
│  │   • Delegar a CombatInitiationService o NarrativeTurnManager      │ │
│  │   • Retornar resultado                                             │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                    │                                    │
│  ┌─────────────────────────────────┼─────────────────────────────────┐ │
│  │                                 ▼                                  │ │
│  │  ┌─────────────────────┐  ┌─────────────────────────────────────┐ │ │
│  │  │ CombatInitiation    │  │    narrative-turn-manager.ts        │ │ │
│  │  │     Service         │  │           (~150 líneas)             │ │ │
│  │  └─────────────────────┘  └─────────────────────────────────────┘ │ │
│  │            │                         │                            │ │
│  │            │              ┌──────────┼──────────┐                 │ │
│  │            │              ▼          ▼          ▼                 │ │
│  │            │      ┌───────────┐┌───────────┐┌───────────┐         │ │
│  │            │      │Interaction││Exploration││Navigation │         │ │
│  │            │      │  Handler  ││CtxBuilder ││  Manager  │         │ │
│  │            │      └───────────┘└───────────┘└───────────┘         │ │
│  └────────────┼──────────────────────────────────────────────────────┘ │
└───────────────┼─────────────────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────────────────┐
│                    CAPA DE COMBATE (lib/combat/)                        │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         CombatSession                            │   │
│  └───────────────────────────────┬─────────────────────────────────┘   │
│                                  │                                      │
│  ┌───────────────┐  ┌────────────▼───────┐  ┌───────────────────────┐  │
│  │CombatTrigger  │  │   TurnProcessor    │  │   SurpriseManager     │  │
│  │  Evaluator    │  └────────────────────┘  └───────────────────────┘  │
│  └───────────────┘               │                                      │
│                         ┌────────▼────────┐  ┌───────────────────────┐  │
│                         │CombatActionExec.│  │  EnemyStateManager    │  │
│                         └─────────────────┘  │  (en lib/game/)       │  │
│                                              └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Orden de Implementación

| # | Tarea | Dependencias | Tiempo | Riesgo |
|---|-------|--------------|--------|--------|
| 1 | Crear `EnemyStateManager` + tests | Ninguna | 2.5h | 🟢 |
| 2 | Crear `SurpriseManager` + tests | Ninguna | 2.5h | 🟢 |
| 3 | Refactorizar usos de enemigos con `EnemyStateManager` | #1 | 1h | 🟢 |
| 4 | Refactorizar usos de sorpresa con `SurpriseManager` | #2 | 1h | 🟢 |
| 5 | Crear `CombatInitiationService` + tests | #1, #2 | 4h | 🟡 |
| 6 | Refactorizar `game-coordinator.ts` | #5 | 2h | 🟡 |
| 7 | Crear `InteractionHandler` + tests | Ninguna | 2.5h | 🟡 |
| 8 | Crear `ExplorationContextBuilder` + tests | Ninguna | 2.5h | 🟡 |
| 9 | Refactorizar `narrative-turn-manager.ts` | #7, #8 | 2h | 🟡 |
| 10 | Mover `CombatTriggerManager` | #5, #9 | 1h | 🟢 |
| 11 | Crear barrel exports y limpiar imports | #10 | 1h | 🟢 |
| 12 | Testing de integración final y ajustes | #11 | 2h | 🟢 |

**Total: 24 horas estimadas** (incluye tiempo para tests automáticos)

---

## 6. Criterios de Éxito

### Métricas Cuantitativas
- [ ] `game-coordinator.ts` ≤ 250 líneas (actual: ~500)
- [ ] `narrative-turn-manager.ts` ≤ 200 líneas (actual: ~480)
- [ ] Sorpresa manejada en 1 archivo (actual: 4)
- [ ] Enemigos por ubicación resueltos en 1 lugar (actual: 5+)

### Métricas Cualitativas
- [ ] Cada módulo tiene una única responsabilidad clara
- [ ] Los imports son predecibles (desde `@/lib/combat/` o handlers específicos)
- [ ] Es fácil encontrar dónde modificar una funcionalidad específica

### Tests de Regresión (Manuales)
1. [ ] **Combate normal:** Atacar a un enemigo, completar combate
2. [ ] **Emboscada:** Entrar en sala con emboscada no detectada
3. [ ] **Mimic:** Interactuar con cofre-mimic
4. [ ] **Ataque sorpresa del jugador:** Atacar a NPC neutral
5. [ ] **Proximidad:** Entrar en sala con enemigo visible
6. [ ] **Puertas:** Abrir puerta y luego pasar
7. [ ] **Exploración:** Moverse entre ubicaciones
8. [ ] **Fin de combate:** Victoria y derrota

---

## 7. Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Romper combate existente | Media | Alto | Implementar en fases, testear cada fase |
| Dependencias circulares | Baja | Medio | Diseñar interfaces primero, implementar después |
| Regresiones sutiles | Media | Medio | Tests manuales exhaustivos en cada fase |
| Tiempo subestimado | Media | Bajo | Buffer de 20% incluido en estimaciones |

---

## 8. Consideraciones para Movimiento Táctico Futuro

> ⚠️ **IMPORTANTE:** El sistema de movimiento táctico en combate aún no está definido. 
> Esta refactorización debe **preparar el terreno** sin implementar nada específico.

### Contexto

Actualmente existen dos sistemas de movimiento:
1. **Exploración (overworld):** Navegación entre ubicaciones → `NavigationManager`
2. **Dungeon:** Movimiento sala a sala con puertas → `NavigationManager` + `InteractionHandler`

El **movimiento táctico en combate** será un tercer sistema que permitirá:
- Posicionamiento en un grid o espacio abstracto durante el combate
- Ataques de oportunidad al alejarse de enemigos
- Alcance de armas y hechizos
- Terreno difícil, cobertura, etc.

### Cómo Esta Refactorización Prepara el Terreno

#### 1. Separación Clara de Contextos

```
┌─────────────────────────────────────────────────────────────────┐
│                    FUERA DE COMBATE                              │
│  NavigationManager + InteractionHandler + ExplorationManager    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (transición via CombatInitiationService)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EN COMBATE                                    │
│  TurnProcessor + CombatActionExecutor + [TacticalMovement?]     │
└─────────────────────────────────────────────────────────────────┘
```

La separación de `CombatInitiationService` permite que la transición a combate 
pueda inicializar un futuro estado de posiciones tácticas.

#### 2. Puntos de Extensión Identificados

| Módulo Actual | Extensión Futura para Táctico |
|---------------|-------------------------------|
| `CombatSession` | Añadir `tacticalState?: TacticalGridState` |
| `TurnProcessor` | Soportar `actionType: 'move'` en combate |
| `CombatActionExecutor` | Validar alcance antes de ejecutar ataques |
| `CombatInitiationService` | Generar posiciones iniciales de combatientes |

#### 3. Interface Placeholder (NO implementar ahora)

Para facilitar la futura implementación, los nuevos módulos deben 
**evitar asumir** que el combate es solo "seleccionar objetivo y atacar".

```typescript
// FUTURO: src/lib/combat/tactical/types.ts (NO crear ahora)
export interface TacticalPosition {
    x: number;
    y: number;
    elevation?: number;
}

export interface TacticalState {
    gridSize: { width: number; height: number };
    positions: Map<string, TacticalPosition>; // combatantId → position
    terrain: TacticalTerrain[];
}

export interface TacticalMovementResult {
    success: boolean;
    newPosition: TacticalPosition;
    triggeredOpportunityAttacks: string[]; // IDs of enemies that get AoO
    movementCost: number; // feet used
}
```

#### 4. Recomendaciones para Esta Refactorización

1. **`CombatInitiationService`:** Diseñar la respuesta para que pueda incluir 
   `initialPositions?: Record<string, any>` sin romper nada.

2. **`TurnProcessor`:** NO asumir que `actionType` solo puede ser `'attack' | 'spell' | 'heal'`. 
   Usar un tipo extensible o documentar que `'move'` podría añadirse.

3. **`CombatSession`:** Mantener el estado lo más genérico posible. 
   Evitar lógica que asuma "sin posiciones".

4. **`action-resolver.ts`:** Futuro lugar para validar "¿está el objetivo en alcance?".

### Lo que NO hacer en esta refactorización

- ❌ No crear módulos vacíos "placeholder" para táctico
- ❌ No añadir campos `position` a los tipos actuales
- ❌ No modificar el schema de aventuras para soportar grids
- ❌ No cambiar la UI o el frontend

### Lo que SÍ hacer

- ✅ Mantener interfaces extensibles (evitar enums cerrados)
- ✅ Documentar en JSDoc dónde se extendería para táctico
- ✅ Asegurar que `actionType` en `TurnProcessor` sea fácil de extender
- ✅ Separar claramente "resolución de objetivo" de "ejecución de acción"

---

## 9. Mejoras Arquitecturales Futuras

### 9.1 Manejo de Estado en el Servidor (GameSessionService)

**Problema Actual:**

El estado del juego (incluyendo `openDoors`, `enemiesByLocation`, `explorationState`, etc.) se mantiene principalmente en el cliente y se pasa de ida y vuelta en cada petición. Esto tiene varias desventajas:

1. **Duplicación de estado**: El estado se replica entre cliente y servidor
2. **Sincronización frágil**: Si hay errores de red, el estado puede desincronizarse
3. **Complejidad de propagación**: Hay que recordar pasar todos los estados en cada petición
4. **Escalabilidad limitada**: No permite múltiples clientes o sesiones compartidas

**Solución Propuesta:**

Crear un `GameSessionService` en el servidor que mantenga el estado de la sesión de juego de forma centralizada:

```typescript
// src/lib/game/game-session-service.ts

export interface GameSession {
    sessionId: string;
    party: Character[];
    locationId: string;
    inCombat: boolean;
    openDoors: Record<string, boolean>; // "locationId:direction" -> isOpen
    enemiesByLocation: Record<string, Enemy[]>;
    explorationState: ExplorationState;
    worldTime: WorldTime;
    // ... otros estados
}

export class GameSessionService {
    /**
     * Obtiene o crea una sesión de juego
     */
    static getSession(sessionId: string): GameSession;
    
    /**
     * Actualiza el estado de una puerta
     */
    static openDoor(sessionId: string, locationId: string, direction: string): void;
    
    /**
     * Actualiza enemigos en una ubicación
     */
    static updateEnemies(sessionId: string, locationId: string, enemies: Enemy[]): void;
    
    /**
     * Persiste el estado de la sesión
     */
    static saveSession(sessionId: string): Promise<void>;
    
    /**
     * Carga el estado de la sesión
     */
    static loadSession(sessionId: string): Promise<GameSession | null>;
}
```

**Beneficios:**

- ✅ **Fuente única de verdad**: El servidor es la autoridad del estado
- ✅ **Sincronización garantizada**: El cliente solo envía comandos, no estado
- ✅ **Persistencia natural**: El estado puede guardarse automáticamente
- ✅ **Escalabilidad**: Permite múltiples clientes, sesiones compartidas, etc.
- ✅ **Simplificación del cliente**: El cliente solo necesita enviar acciones, no mantener estado complejo

**Implementación Requerida:**

1. **Sistema de sesiones**: Redis, base de datos, o memoria del servidor (con WebSockets para tiempo real)
2. **API de comandos**: Cambiar de "enviar estado completo" a "enviar comandos" (`openDoor`, `move`, `attack`, etc.)
3. **Migración gradual**: Mantener compatibilidad con el sistema actual durante la transición

**Cuándo Implementar:**

- **Fase 5** (futura): Después de completar las fases 1-4 de esta refactorización
- **Prioridad**: Media-Alta (mejora significativa de arquitectura, pero no bloquea funcionalidad actual)

**Nota:** Esta mejora es independiente de la refactorización actual. El sistema actual funciona correctamente, pero esta mejora haría el código más robusto y escalable.

---

## 10. Notas de Implementación

### Principios a Seguir
1. **No cambiar comportamiento** - Esta es una refactorización pura
2. **Extraer antes de modificar** - Mover código existente, luego limpiar
3. **Un commit por subtarea** - Facilita rollback si algo falla
4. **Testear después de cada fase** - No acumular deuda de testing
5. **Mantener extensibilidad** - Pensar en el movimiento táctico futuro

### Archivos que NO tocar
- `rules-engine.ts` - Ya está bien modularizado
- `turn-processor.ts` - Refactorizado recientemente (pero documentar extensión para `'move'`)
- `action-executor.ts` - Refactorizado recientemente
- `combat-narration-expert.ts` - Funciona correctamente

---

## 11. Resumen de Tests Automáticos

### Tests Nuevos a Crear (6 archivos)

| Fase | Archivo de Test | Casos Aprox. |
|------|-----------------|--------------|
| 1 | `tests/unit/combat/enemy-state-manager.test.ts` | 10-12 |
| 1 | `tests/unit/combat/surprise-manager.test.ts` | 8-10 |
| 2 | `tests/unit/combat/combat-initiation-service.test.ts` | 12-15 |
| 3 | `tests/unit/managers/interaction-handler.test.ts` | 8-10 |
| 3 | `tests/unit/managers/exploration-context-builder.test.ts` | 8-10 |

**Total: ~50 nuevos casos de test**

### Tests Existentes que Deben Seguir Pasando (Regresión)

```bash
# Ejecutar antes y después de cada fase para detectar regresiones
npm run test -- --testPathPattern="tests/unit/combat/"
npm run test -- --testPathPattern="tests/integration/combat"
```

| Archivo Existente | Casos Actuales |
|-------------------|----------------|
| `combat-session.test.ts` | ✓ Debe seguir pasando |
| `turn-processor.test.ts` | ✓ Debe seguir pasando |
| `action-executor.test.ts` | ✓ Debe seguir pasando |
| `combat-trigger-manager.test.ts` | ✓ Actualizar si es necesario |
| `rules-engine.test.ts` | ✓ No debe tocarse |
| `turn-manager.test.ts` | ✓ Debe seguir pasando |
| `unified-combat-flow.test.ts` | ✓ Integración crítica |

### Comando de Validación Final

```bash
# Ejecutar al final de cada fase
npm run test && npm run build
```

---

## 12. Próximos Pasos

1. [ ] Revisar y aprobar este plan
2. [ ] Crear rama `refactor/combat-modularity`
3. [ ] Ejecutar tests existentes como baseline: `npm run test`
4. [ ] Implementar Fase 1 (EnemyStateManager + SurpriseManager)
5. [ ] Crear tests para Fase 1
6. [ ] Ejecutar todos los tests: `npm run test` → verificar sin regresiones
7. [ ] Continuar con Fase 2, 3 y 4 siguiendo el mismo patrón
8. [ ] Documentar puntos de extensión para movimiento táctico futuro

---

**Última actualización:** 2025-12-04

