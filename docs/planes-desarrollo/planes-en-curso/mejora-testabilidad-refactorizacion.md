# Plan: Mejora de Testabilidad y Refactorización

**Versión:** 1.1.0  
**Fecha de creación:** 2025-11-15  
**Estado:** 🚧 En curso  
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
- Sistema de unit tests con Vitest (68 tests)
- Tests para módulos críticos (combat-validators, retry-utils, monster-name-manager, etc.)
- Configuración de Vitest funcional
- Documentación completa de testing
- **Fase 2 (Parcial):** DI implementada en `processAICombatantRolls` (via `dice-roll-processor.ts`).
- **Fase 3 (Completa):** Separación de lógica pura en `rules-engine.ts`, `turn-manager.ts`, `action-processor.ts`.

**❌ Problemas Identificados:**
- Tests de integración para combate completo fallan por problemas de mocking
- `combatManagerTool` sigue teniendo dependencias hardcodeadas (`enemyTacticianTool`, etc.)
- No es posible testear flujos completos de combate de forma aislada

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
   - ❌ **Pendiente:** Dependencias hardcodeadas: `enemyTacticianTool`, `companionTacticianTool`, `getAdventureData`, `narrativeExpert`, `markdownToHtml`
   - **Solución:** Crear una interfaz de dependencias y pasarla como parámetro opcional

3. **Funciones de validación y procesamiento**
   - ✅ **Completado:** La mayoría se han movido a módulos de lógica pura (`rules-engine.ts`).

### 2. Separación de Lógica Pura de Efectos Secundarios

**Concepto:** Refactorizar funciones grandes como `combatManagerTool` para separar la "lógica pura" (cálculos de daño, cambios de estado) de los "efectos secundarios" (llamadas a la IA, tiradas de dados).

**Funciones a Refactorizar:**

1. **Cálculo de daño y aplicación**
   - ✅ **Completado:** Extraído a `src/lib/combat/rules-engine.ts`.

2. **Validación de estado de combate**
   - ✅ **Completado:** Extraído a `src/lib/combat/rules-engine.ts` y `combat-validators.ts`.

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
- [ ] Implementar DI en `combatManagerTool`
  - [ ] Crear interfaz `CombatManagerDependencies`
  - [ ] Refactorizar para aceptar dependencias como parámetro opcional
  - [ ] Mantener compatibilidad hacia atrás (defaults a implementaciones reales)
- [ ] Implementar DI en otras funciones críticas identificadas
- [ ] Actualizar tests existentes para usar DI

**Estimación:** 12-16 horas

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

- [ ] Ejecutar todos los tests existentes (deben pasar)
- [ ] Crear tests de integración de ejemplo usando la nueva DI
- [ ] Documentar patrones de DI en el código
- [ ] Actualizar documentación de testing
- [ ] Actualizar guía de desarrollo

**Estimación:** 4-6 horas

---

## 🔧 Consideraciones Técnicas

### Patrón de Inyección de Dependencias

**Estrategia Recomendada:** Parámetros opcionales con defaults

```typescript
interface Dependencies {
  roller: typeof diceRollerTool;
  tactician: typeof enemyTacticianTool;
  // ... otras dependencias
}

export async function combatManagerTool(
  input: CombatManagerInput,
  dependencies?: Partial<Dependencies>
) {
  const deps: Dependencies = {
    roller: diceRollerTool,
    tactician: enemyTacticianTool,
    // ... defaults
    ...dependencies, // Sobrescribir con mocks en tests
  };
  
  // Usar deps.roller, deps.tactician, etc.
}
```

---

## 📊 Métricas de Éxito

### Testabilidad

**Objetivo:** Poder escribir tests de integración que realmente funcionen.

**Métricas:**
- ✅ Tests de integración para combate completo pasan
- ✅ Tests de integración para flujos de combate pasan
- ✅ Tests E2E básicos pasan
- ✅ Tiempo de ejecución de tests < 2 minutos

### Calidad del Código

**Objetivo:** Código más mantenible y desacoplado.

**Métricas:**
- ✅ Funciones puras extraídas y testeadas
- ✅ Dependencias inyectadas en funciones críticas
- ✅ Cobertura de tests mantenida o mejorada
- ✅ Sin regresiones (todos los tests existentes pasan)

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
- **Recomendación:** Implementar en fases, validando beneficios después de cada fase
- **Lecciones Aprendidas:** Los intentos recientes de tests de integración demostraron la necesidad de este plan

---

## 🔗 Referencias

- [Documentación de Testing](../testing/README.md) - Sistema de testing actual
- [Plan de Testing Integración y E2E](sistema-testing-integracion-e2e.md) - Plan que depende de este
- [Refactorización del Módulo combat-manager.ts](../completados/refactorizacion-combat-manager.md) - Refactorización anterior
- [Inyección de Dependencias - Wikipedia](https://en.wikipedia.org/wiki/Dependency_injection) - Concepto general

---

**Última actualización:** 2025-11-20  
**Estado:** 🚧 En curso  
**Prioridad:** Media-Alta
