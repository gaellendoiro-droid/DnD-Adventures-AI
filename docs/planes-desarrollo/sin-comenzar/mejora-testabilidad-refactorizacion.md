# Plan: Mejora de Testabilidad y Refactorización

**Versión:** 1.0.0  
**Fecha de creación:** 2025-11-15  
**Estado:** 📝 Sin comenzar  
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

**❌ Problemas Identificados:**
- Tests de integración para combate completo fallan por problemas de mocking
- Funciones como `processAICombatantRolls` tienen dependencias hardcodeadas
- `combatManagerTool` es demasiado complejo y acoplado para testear fácilmente
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

**Ejemplo Práctico:**

```typescript
// Antes (Acoplamiento Alto)
import { diceRollerTool } from './dice-roller';

export function miFuncionDeCombate(params) {
  const tirada = await diceRollerTool(...);
  // ...lógica
}
```

```typescript
// Después (Inyección de Dependencias)
import { diceRollerTool } from './dice-roller';

export function miFuncionDeCombate(params, roller = diceRollerTool) {
  const tirada = await roller(...);
  // ...lógica
}

// En el test:
miFuncionDeCombate(params, mockDiceRoller);
```

**Funciones a Refactorizar:**

1. **`processAICombatantRolls`** (parcialmente implementado)
   - ✅ Ya tiene `diceRoller` como parámetro opcional
   - ⚠️ Necesita verificación y documentación

2. **`combatManagerTool`**
   - ❌ Dependencias hardcodeadas: `enemyTacticianTool`, `companionTacticianTool`, `getAdventureData`, `narrativeExpert`, `markdownToHtml`
   - **Solución:** Crear una interfaz de dependencias y pasarla como parámetro opcional

3. **Funciones de validación y procesamiento**
   - Revisar si hay más dependencias hardcodeadas que deban inyectarse

### 2. Separación de Lógica Pura de Efectos Secundarios

**Concepto:** Refactorizar funciones grandes como `combatManagerTool` para separar la "lógica pura" (cálculos de daño, cambios de estado) de los "efectos secundarios" (llamadas a la IA, tiradas de dados).

**Beneficio:** Las funciones de lógica pura son triviales de testear: les das una entrada y compruebas la salida, sin necesidad de mocks.

**Ejemplo:**

```typescript
// Antes (Lógica mezclada con efectos secundarios)
async function processCombatTurn(state) {
  const roll = await diceRollerTool(...); // Efecto secundario
  const damage = calculateDamage(roll, state); // Lógica pura
  state.hp -= damage; // Lógica pura
  await updateUI(state); // Efecto secundario
}

// Después (Separación)
// Lógica pura - fácil de testear
function calculateDamage(roll, state) {
  return roll.totalResult > state.ac ? roll.damage : 0;
}

function applyDamage(state, damage) {
  return { ...state, hp: state.hp - damage };
}

// Función de orquestación - puede usar DI
async function processCombatTurn(state, dependencies) {
  const roll = await dependencies.roller(...);
  const damage = calculateDamage(roll, state);
  const newState = applyDamage(state, damage);
  await dependencies.updateUI(newState);
  return newState;
}
```

**Funciones a Refactorizar:**

1. **Cálculo de daño y aplicación**
   - Extraer lógica de cálculo de daño a funciones puras
   - Extraer lógica de aplicación de daño a funciones puras

2. **Validación de estado de combate**
   - Ya está parcialmente separado en `combat-validators.ts`
   - Verificar si hay más lógica que pueda extraerse

3. **Gestión de turnos**
   - Separar lógica de avance de turnos de efectos secundarios (llamadas a IA)

### 3. Preparación para Tests E2E

**Concepto:** Una vez que el backend sea más predecible gracias a la DI, podremos escribir tests E2E que simulen a un usuario real en el navegador.

**Ejemplo de Test E2E con Playwright:**

```typescript
test('combate completo - jugador mata goblin', async ({ page }) => {
  // 1. Iniciar aplicación
  await page.goto('/');
  await page.click('button:has-text("Nueva Partida")');
  
  // 2. Iniciar combate
  await page.fill('input[placeholder="Escribe tu acción..."]', 'Ataco al goblin');
  await page.click('button:has-text("Enviar")');
  
  // 3. Verificar que el combate inició
  await expect(page.locator('text=¡Comienza el Combate!')).toBeVisible();
  
  // 4. Verificar HP inicial
  const goblinHP = await page.locator('[data-testid="goblin-1-hp"]').textContent();
  expect(goblinHP).toBe('7 / 7');
  
  // 5. Procesar turno del jugador
  await page.click('button:has-text("Pasar 1 Turno")');
  
  // 6. Verificar que el HP del goblin disminuyó
  await expect(page.locator('[data-testid="goblin-1-hp"]')).toContainText('0 / 7');
  
  // 7. Verificar mensaje de fin de combate
  await expect(page.locator('text=Todos los enemigos derrotados')).toBeVisible();
});
```

**Preparaciones Necesarias:**

1. **Añadir `data-testid` a elementos críticos de la UI**
   - Botones de combate
   - Indicadores de HP
   - Mensajes del DM
   - Indicadores de turno

2. **Crear endpoints de testing (opcional)**
   - Endpoints que permitan inyectar estado inicial
   - Endpoints que permitan mockear respuestas de IA

---

## 📋 Pasos de Implementación

### Fase 1: Análisis y Planificación

**Objetivo:** Identificar todas las dependencias hardcodeadas y planificar la refactorización.

- [ ] Auditar `combatManagerTool` para identificar todas las dependencias
- [ ] Auditar `processAICombatantRolls` (ya parcialmente implementado)
- [ ] Identificar funciones con lógica pura mezclada con efectos secundarios
- [ ] Crear lista priorizada de funciones a refactorizar
- [ ] Documentar estrategia de DI para cada función

**Estimación:** 4-6 horas

### Fase 2: Implementar DI en Funciones Críticas

**Objetivo:** Refactorizar funciones clave para aceptar dependencias inyectadas.

- [ ] Completar DI en `processAICombatantRolls` (verificar y documentar)
- [ ] Implementar DI en `combatManagerTool`
  - [ ] Crear interfaz `CombatManagerDependencies`
  - [ ] Refactorizar para aceptar dependencias como parámetro opcional
  - [ ] Mantener compatibilidad hacia atrás (defaults a implementaciones reales)
- [ ] Implementar DI en otras funciones críticas identificadas
- [ ] Actualizar tests existentes para usar DI

**Estimación:** 12-16 horas

### Fase 3: Separar Lógica Pura de Efectos Secundarios

**Objetivo:** Extraer funciones puras que sean fáciles de testear.

- [ ] Extraer funciones de cálculo de daño
- [ ] Extraer funciones de aplicación de daño
- [ ] Extraer funciones de validación de estado
- [ ] Extraer funciones de gestión de turnos (lógica pura)
- [ ] Crear tests unitarios para todas las funciones puras extraídas

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

**Ventajas:**
- Compatibilidad hacia atrás (código existente sigue funcionando)
- Fácil de mockear en tests
- No requiere framework de DI complejo

### Separación de Lógica Pura

**Principio:** Una función pura:
- Dado los mismos inputs, siempre produce los mismos outputs
- No tiene efectos secundarios (no modifica estado externo, no hace llamadas a API, etc.)
- Es fácil de testear (no requiere mocks)

**Ejemplo de Función Pura:**

```typescript
// ✅ Función pura - fácil de testear
function calculateDamage(attackRoll: number, targetAC: number, damageRoll: number): number {
  if (attackRoll >= targetAC) {
    return damageRoll;
  }
  return 0;
}

// Test trivial
test('calculateDamage - hit applies damage', () => {
  expect(calculateDamage(18, 15, 5)).toBe(5);
});

test('calculateDamage - miss applies no damage', () => {
  expect(calculateDamage(12, 15, 5)).toBe(0);
});
```

### Compatibilidad Hacia Atrás

**Importante:** Todos los cambios deben mantener compatibilidad hacia atrás. El código existente debe seguir funcionando sin modificaciones.

**Estrategia:**
- Usar parámetros opcionales con defaults
- No cambiar firmas de funciones públicas
- Mantener exports existentes

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

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Introducir Bugs Durante Refactorización

**Problema:** Cambios extensos pueden introducir bugs.

**Mitigación:**
- Refactorizar en pasos pequeños
- Ejecutar tests después de cada cambio
- Mantener compatibilidad hacia atrás
- Code review cuidadoso

### Riesgo 2: Sobrecarga de Parámetros

**Problema:** Funciones con muchos parámetros pueden ser difíciles de usar.

**Mitigación:**
- Agrupar dependencias en objetos/interfaces
- Usar defaults sensatos
- Documentar bien el uso

### Riesgo 3: Tiempo de Implementación

**Problema:** Refactorización puede tomar más tiempo del estimado.

**Mitigación:**
- Implementar en fases
- Priorizar funciones más críticas primero
- Validar beneficios después de cada fase

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

**Última actualización:** 2025-11-15  
**Estado:** 📝 Sin comenzar  
**Prioridad:** Media-Alta

