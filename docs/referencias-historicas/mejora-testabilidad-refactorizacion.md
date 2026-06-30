# Plan: Mejora de Testabilidad y Refactorización

**Versión:** 1.4.0 (Final)  
**Fecha de creación:** 2025-11-15  
**Fecha de finalización:** 2025-01-20  
**Estado:** ✅ Completado parcialmente - Objetivos principales logrados  
**Prioridad:** Media-Alta  
**Dependencias:** Sistema de Unit Tests (✅ Completado)

---

## 📋 Objetivo

Refactorizar la arquitectura del núcleo de la IA y la lógica de combate para mejorar la **testabilidad** del sistema, permitiendo tests de integración y End-to-End (E2E) robustos y fiables.

**Problema Identificado:**
- Los intentos recientes de crear tests de integración para el sistema de combate han fallado debido a **alto acoplamiento** en el código.
- Las dependencias (como `diceRollerTool`, `getAdventureData`, etc.) se importan y usan directamente, haciendo imposible mockearlas efectivamente.
- Esto impide escribir tests de integración y E2E confiables.

**Solución Propuesta:**
- Implementar **Inyección de Dependencias (DI)** en funciones críticas.
- Separar **lógica pura** de **efectos secundarios**.
- Preparar el terreno para tests E2E con Playwright.

---

## 🎯 Contexto

### Estado Actual

**✅ Completado:**
- Sistema de unit tests con Vitest (68+ tests)
- Tests para módulos críticos (rules-engine, retry-utils, monster-name-manager, etc.)
- Configuración de Vitest funcional
- Documentación completa de testing
- **Fase 2 (Completa):** DI implementada en `processAICombatantRolls` y **`combatManagerTool`** ✅
- **Fase 3 (Completa):** Separación de lógica pura en `rules-engine.ts`, `turn-manager.ts`, `action-processor.ts`.
- **Correcciones recientes (2025-01-20):**
  - ✅ Tests de integración de `combat-manager` corregidos y funcionando
  - ✅ Mocks completos añadidos (`combatNarrationExpertTool`, `markdownToHtml`)
  - ✅ Eliminada duplicación de código: consolidado `combat-validators.ts` → `rules-engine.ts`
  - ✅ Todos los imports actualizados para usar fuente única de verdad
  - ✅ 47 tests pasando correctamente después de las correcciones
- **Implementación DI en combatManagerTool (2025-01-20):**
  - ✅ Creada interfaz `CombatManagerDependencies` con todas las dependencias
  - ✅ Extraída lógica principal a `executeCombatManager()` con soporte DI
  - ✅ Creado wrapper de Genkit manteniendo compatibilidad hacia atrás
  - ✅ Actualizado test de integración con ejemplo de DI explícita
  - ✅ Todos los tests relacionados pasando (54+ tests verificados)

**✅ Problemas Resueltos:**
- ✅ `combatManagerTool` ahora soporta DI completa - **Completado Fase 2**
- ✅ Tests de integración funcionan con mocks de módulo y DI explícita
- ✅ Código más testeable y mantenible

**⏳ Pendientes:**
- Preparar UI para tests E2E (Fase 4)
- Documentar patrones de DI (Fase 5)

### Beneficios Esperados

1. **Tests de Integración Viables**: Poder escribir tests de integración que realmente funcionen
2. **Tests E2E Más Robustos**: Preparar el código para tests E2E con Playwright
3. **Código Más Mantenible**: Separación de responsabilidades facilita mantenimiento
4. **Refactorizaciones Más Seguras**: Tests confiables permiten refactorizar con confianza
5. **Mejor Arquitectura**: Código más desacoplado es más fácil de entender y modificar

---

## 🔧 Componentes a Implementar

### 1. Inyección de Dependencias (DI)

**Concepto:** En lugar de que una función importe directamente sus dependencias, se las pasamos como argumentos. Esto permite "inyectar" mocks fácilmente en los tests.

**Funciones a Refactorizar:**

1. **`processAICombatantRolls`**
   - ✅ **Completado:** Se ha implementado en `src/ai/tools/combat/dice-roll-processor.ts` aceptando `diceRoller` como argumento.

2. **`combatManagerTool`**
   - ✅ **Completado:** Implementada DI completa con interfaz `CombatManagerDependencies`
   - ✅ Todas las dependencias inyectables: `enemyTacticianTool`, `companionTacticianTool`, `diceRollerTool`, `combatNarrationExpertTool`, `narrativeExpert`, `markdownToHtml`
   - ✅ Función `executeCombatManager()` con soporte DI, wrapper de Genkit mantiene compatibilidad

3. **Funciones de validación y procesamiento**
   - ✅ **Completado:** La mayoría se han movido a módulos de lógica pura (`rules-engine.ts`).

### 2. Separación de Lógica Pura de Efectos Secundarios

**Concepto:** Refactorizar funciones grandes como `combatManagerTool` para separar la "lógica pura" (cálculos de daño, cambios de estado) de los "efectos secundarios" (llamadas a la IA, tiradas de dados).

**Funciones a Refactorizar:**

1. **Cálculo de daño y aplicación**
   - ✅ **Completado:** Extraído a `src/lib/combat/rules-engine.ts`.

2. **Validación de estado de combate**
   - ✅ **Completado:** Extraído a `src/lib/combat/rules-engine.ts` (consolidado, eliminado duplicado `combat-validators.ts`).

3. **Gestión de turnos**
   - ✅ **Completado:** Extraído a `src/lib/combat/turn-manager.ts`.

### 3. Preparación para Tests E2E

**Concepto:** Una vez que el backend sea más predecible gracias a la DI, podremos escribir tests E2E que simulen a un usuario real en el navegador.

**Preparaciones Necesarias:**

1. **Añadir `data-testid` a elementos críticos de la UI**
   - ❌ **Pendiente:** Botones de combate
   - ❌ **Pendiente:** Indicadores de HP
   - ❌ **Pendiente:** Mensajes del DM
   - ❌ **Pendiente:** Indicadores de turno

2. **Crear endpoints de testing (opcional)**
   - Endpoints que permitan inyectar estado inicial
   - Endpoints que permitan mockear respuestas de IA

---

## 📋 Pasos de Implementación

### Fase 1: Análisis y Planificación

**Objetivo:** Identificar todas las dependencias hardcodeadas y planificar la refactorización.

- [x] Auditar `combatManagerTool` para identificar todas las dependencias
- [x] Auditar `processAICombatantRolls` (ya parcialmente implementado)
- [x] Identificar funciones con lógica pura mezclada con efectos secundarios
- [x] Crear lista priorizada de funciones a refactorizar
- [x] Documentar estrategia de DI para cada función

**Estimación:** 4-6 horas

### Fase 2: Implementar DI en Funciones Críticas

**Objetivo:** Refactorizar funciones clave para aceptar dependencias inyectadas.

- [x] Completar DI en `processAICombatantRolls` (verificar y documentar)
- [x] Consolidar funciones de validación en `rules-engine.ts` (eliminado duplicado `combat-validators.ts`)
- [x] Corregir tests de integración y añadir mocks faltantes
- [x] Implementar DI en `combatManagerTool` ✅ **COMPLETADO**
  - [x] Crear interfaz `CombatManagerDependencies`
  - [x] Refactorizar para aceptar dependencias como parámetro opcional
  - [x] Mantener compatibilidad hacia atrás (defaults a implementaciones reales)
  - [x] Extraer lógica a `executeCombatManager()` con soporte DI
  - [x] Crear wrapper de Genkit manteniendo compatibilidad
  - [x] Actualizar tests con ejemplo de DI explícita
- [ ] Implementar DI en otras funciones críticas identificadas (si es necesario)
- [x] Actualizar tests existentes para usar DI (test de integración actualizado)

**Estimación:** 12-16 horas ✅ **COMPLETADO**

### Fase 3: Separar Lógica Pura de Efectos Secundarios

**Objetivo:** Extraer funciones puras que sean fáciles de testear.

- [x] Extraer funciones de cálculo de daño
- [x] Extraer funciones de aplicación de daño
- [x] Extraer funciones de validación de estado
- [x] Extraer funciones de gestión de turnos (lógica pura)
- [x] Crear tests unitarios para todas las funciones puras extraídas

**Estimación:** 8-12 horas

### Fase 4: Preparar UI para Tests E2E

**Objetivo:** Añadir `data-testid` y preparar la aplicación para tests E2E.

- [ ] Añadir `data-testid` a botones de combate
- [ ] Añadir `data-testid` a indicadores de HP
- [ ] Añadir `data-testid` a mensajes del DM
- [ ] Añadir `data-testid` a indicadores de turno
- [ ] Documentar todos los `data-testid` añadidos

**Estimación:** 4-6 horas

### Fase 5: Validación y Documentación

**Objetivo:** Verificar que la refactorización funciona y documentar los cambios.

- [x] Ejecutar todos los tests existentes (54+ tests pasando ✅)
- [x] Verificar tests de integración básicos (combat-manager, turn-system-flow)
- [x] Crear tests de integración de ejemplo usando la nueva DI ✅ (test con DI explícita añadido)
- [ ] Documentar patrones de DI en el código (ver sección Consideraciones Técnicas)
- [ ] Actualizar documentación de testing
- [ ] Actualizar guía de desarrollo

**Estimación:** 4-6 horas (2-3 horas restantes)

---

## 🔧 Consideraciones Técnicas

### Patrón de Inyección de Dependencias

**Estrategia Implementada:** Parámetros opcionales con defaults

**Implementación en `combatManagerTool`:**

```typescript
interface CombatManagerDependencies {
  diceRollerTool: typeof diceRollerTool;
  enemyTacticianTool: typeof enemyTacticianTool;
  companionTacticianTool: typeof companionTacticianTool;
  combatNarrationExpertTool: typeof combatNarrationExpertTool;
  processAICombatantRolls: typeof processAICombatantRolls;
  updateRollNotationWithModifiers: typeof updateRollNotationWithModifiers;
  narrativeExpert?: any;
  markdownToHtml?: any;
}

export async function executeCombatManager(
  input: CombatManagerInput,
  dependencies?: Partial<CombatManagerDependencies>
) {
  const deps: CombatManagerDependencies = {
    diceRollerTool,
    enemyTacticianTool,
    companionTacticianTool,
    combatNarrationExpertTool,
    processAICombatantRolls,
    updateRollNotationWithModifiers,
    ...dependencies, // Sobrescribir con mocks en tests
  };
  
  // Usar deps.diceRollerTool, deps.enemyTacticianTool, etc.
}

// Wrapper de Genkit mantiene compatibilidad
export const combatManagerTool = ai.defineTool(
  { /* ... */ },
  async (input) => executeCombatManager(input)
);
```

**Uso en tests:**
```typescript
// Con DI explícita
const result = await executeCombatManager(input, {
  diceRollerTool: mockDiceRoller,
  combatNarrationExpertTool: mockNarration,
  // ... otros mocks
});
```

---

## 📊 Métricas de Éxito

### Testabilidad

**Objetivo:** Poder escribir tests de integración que realmente funcionen.

**Métricas:**
- ✅ Tests de integración básicos para combate pasan (combat-manager, turn-system-flow)
- ✅ Tests de integración para flujos de combate pasan
- ⏳ Tests E2E básicos - Pendiente (requiere Fase 4)
- ✅ Tiempo de ejecución de tests < 2 minutos

### Calidad del Código

**Objetivo:** Código más mantenible y desacoplado.

**Métricas:**
- ✅ Funciones puras extraídas y testeadas (rules-engine, turn-manager, action-processor)
- ✅ Dependencias inyectadas en funciones críticas (processAICombatantRolls ✅, combatManagerTool ✅)
- ✅ Cobertura de tests mantenida o mejorada (54+ tests pasando)
- ✅ Sin regresiones (todos los tests existentes pasan)
- ✅ Código consolidado (eliminada duplicación combat-validators.ts)
- ✅ DI completa implementada y funcionando

---

## 🔗 Relación con Otros Planes

### Plan: Sistema de Testing - Integración y E2E

**Relación:** Este plan es un **prerequisito** para el plan de testing de integración y E2E.

**Orden Recomendado:**
1. ✅ **Este plan** (Mejora de Testabilidad) - Primero
2. ⏳ **Plan de Testing Integración y E2E** - Después

**Razón:** Sin mejorar la testabilidad primero, los tests de integración y E2E seguirán fallando como hemos experimentado.

### Plan: Refactorización del Módulo `combat-manager.ts`

**Relación:** Este plan complementa la refactorización anterior.

**Sinergia:**
- La refactorización anterior redujo el tamaño del archivo
- Este plan mejora la testabilidad del código refactorizado
- Ambos planes mejoran la mantenibilidad

---

## 📝 Notas

- **Prioridad:** Media-Alta - No es crítico, pero facilitará mucho el desarrollo futuro
- **Dependencias:** Sistema de Unit Tests (✅ Completado)
- **Estimación Total:** 32-46 horas
- **Estimación Restante:** ~4-9 horas (Fase 4 + Fase 5 restante)
- **Progreso:** ~75% completado (Fases 1, 2, 3 completas; Fases 4-5 pendientes)
- **Recomendación:** Implementar en fases, validando beneficios después de cada fase
- **Lecciones Aprendidas:** 
  - Los intentos recientes de tests de integración demostraron la necesidad de este plan
  - La consolidación de código duplicado (combat-validators → rules-engine) mejoró significativamente la mantenibilidad
  - Los mocks completos son esenciales para tests de integración funcionales
- **Progreso Reciente (2025-01-20):**
  - ✅ Corregidos tests de integración del combat-manager
  - ✅ Eliminada duplicación de código en validadores
  - ✅ **DI completa implementada en `combatManagerTool`**
  - ✅ Todos los tests pasando (54+ tests verificados)
  - ✅ Creada función `executeCombatManager()` con soporte DI
  - ✅ Test de integración actualizado con ejemplo de DI explícita
  - **Próximo paso:** Preparar UI para tests E2E (Fase 4) o Documentar patrones DI (Fase 5)

---

## 🔗 Referencias

- [Documentación de Testing](../testing/README.md) - Sistema de testing actual (incluye sección sobre DI)
- [Guía Rápida de Testing](../testing/guia-rapida.md) - Ejemplos rápidos de DI en tests
- [Patrones de Dependency Injection](../arquitectura/patrones-dependency-injection.md) - Documentación completa del patrón DI implementado
- [Plan de Testing Integración y E2E](../sin-comenzar/sistema-testing-integracion-e2e.md) - Plan que depende de este
- [Refactorización del Módulo combat-manager.ts](./plan-refactorizacion-combat-manager.md) - Refactorización anterior
- [Inyección de Dependencias - Wikipedia](https://en.wikipedia.org/wiki/Dependency_injection) - Concepto general

---

**Última actualización:** 2025-01-20  
**Estado:** ✅ Completado parcialmente - Objetivos principales logrados  
**Prioridad:** Media-Alta  
**Progreso:** ~75% completado (Fases 1, 2, 3 completas; Fases 4-5 pospuestas)

---

## 📋 Resumen Final

### ✅ Objetivos Principales Logrados

1. **DI implementada completamente** en funciones críticas:
   - ✅ `processAICombatantRolls` con DI
   - ✅ `combatManagerTool` con DI completa
   - ✅ Tests de integración funcionando con mocks

2. **Código refactorizado y desacoplado**:
   - ✅ Lógica pura separada en módulos especializados
   - ✅ Eliminada duplicación de código
   - ✅ 54+ tests pasando sin regresiones

3. **Testabilidad mejorada significativamente**:
   - ✅ Tests de integración robustos y aislados
   - ✅ Mockeo fácil de dependencias
   - ✅ Código más mantenible

### ⏳ Tareas Pospuestas (No críticas)

- **Fase 4:** Añadir `data-testid` a UI - **POSPUESTA** (hacer cuando se planifiquen tests E2E)
- **Fase 5:** Documentación completa - **EN PROGRESO** (se completará después de archivar)

### 💡 Decisión

El plan se archiva como "Completado parcialmente" porque:
- Los objetivos principales (mejorar testabilidad con DI) están **100% logrados**
- Las fases pendientes son útiles pero no críticas
- El ROI del trabajo completado es excelente (~75% trabajo, ~90% valor)
- Las tareas pendientes pueden retomarse cuando sean realmente necesarias

**Conclusión:** El plan cumplió su propósito principal. El código es ahora mucho más testeable y mantenible.
