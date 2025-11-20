# Sistema de Testing - D&D Adventures AI

**Versión:** 1.0.0  
**Fecha de creación:** 2025-11-15  
**Estado:** ✅ Implementado y funcional

---

## 📋 Índice

- [Introducción](#introducción)
- [Configuración](#configuración)
- [Ejecutar Tests](#ejecutar-tests)
- [Estructura de Tests](#estructura-de-tests)
- [Tests Implementados](#tests-implementados)
- [Escribir Nuevos Tests](#escribir-nuevos-tests)
- [Mejores Prácticas](#mejores-prácticas)
- [Cobertura de Código](#cobertura-de-código)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Introducción

Este proyecto utiliza **Vitest** como framework de testing para unit tests. Vitest es una alternativa moderna a Jest, diseñada específicamente para proyectos TypeScript y con mejor rendimiento.

### ¿Por qué Vitest?

- ✅ **Rápido**: Ejecución más rápida que Jest
- ✅ **TypeScript nativo**: Sin configuración adicional
- ✅ **Compatible con Jest**: API similar, fácil migración
- ✅ **E2E ready**: Preparado para tests de integración
- ✅ **UI integrada**: Interfaz visual para debugging

### Tipos de Tests

1. **Unit Tests**: Testean funciones y módulos individuales de forma aislada
2. **Integration Tests**: Testean la interacción entre múltiples módulos (pendiente)
3. **E2E Tests**: Testean flujos completos en navegador (pendiente, requiere Playwright)

---

## ⚙️ Configuración

### Dependencias Instaladas

```json
{
  "devDependencies": {
    "vitest": "^4.0.9",
    "@vitest/ui": "^4.0.9",
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.6.3",
    "jsdom": "^25.0.1"
  }
}
```

### Archivos de Configuración

#### `vitest.config.ts`

Configuración principal de Vitest con:
- Alias de rutas (`@/*` → `./src/*`)
- Entorno jsdom para tests de React
- Setup file para mocks globales
- Configuración de cobertura

#### `tests/setup.ts`

Archivo de setup que:
- Configura `@testing-library/jest-dom` para matchers de DOM
- Mockea el logger para evitar ruido en consola
- Mockea herramientas de Genkit que requieren API calls

---

## 🚀 Ejecutar Tests

### Comandos Disponibles

```bash
# Modo watch (recomendado para desarrollo)
npm test

# Interfaz visual (útil para debugging)
npm run test:ui

# Ejecutar una vez (útil para CI/CD)
npm run test:run

# Ejecutar con cobertura
npm run test:coverage
```

### Modo Watch

El modo watch (`npm test`) es ideal para desarrollo:
- Re-ejecuta tests automáticamente al cambiar archivos
- Filtrado rápido de tests por nombre
- Actualización en tiempo real

### Interfaz Visual

La interfaz visual (`npm run test:ui`) abre un navegador con:
- Lista de todos los tests
- Estado de cada test (pass/fail)
- Logs detallados de errores
- Filtrado y búsqueda
- Re-ejecución individual de tests

---

## 📁 Estructura de Tests

```
tests/
├── setup.ts                          # Configuración global y mocks
├── unit/
│   ├── backend/
│   │   ├── tools/
│   │   │   ├── critical-damage.test.ts        # Tests de daño crítico (Issue #50)
│   │   │   └── combat/
│   │   │       └── combat-validators.test.ts
│   │   └── flows/
│   │       └── retry-utils.test.ts
│   └── frontend/
│       ├── utils.test.ts
│       ├── monster-name-manager.test.ts
│       └── target-resolver.test.ts
└── integration/
    ├── turn-system.test.ts           # Tests de sincronización y estado
    └── turn-system-flow.test.ts      # Tests de flujos completos
```

### Convenciones de Nomenclatura

- **Archivos de test**: `*.test.ts` o `*.spec.ts`
- **Ubicación**: Misma estructura que `src/` pero en `tests/unit/`
- **Nombres descriptivos**: `combat-validators.test.ts` para `combat-validators.ts`

---

## ✅ Tests Implementados

### Unit Tests - Backend (75 tests)

#### `critical-damage.test.ts` (39 tests) ✨ NUEVO

**Módulo:** Cálculo de Daño Crítico (Issue #50)

**Funciones testeadas:**
- `getCriticalDamageNotation` (combat-manager.ts) - Para ataques de jugadores
- `getCriticalDamageNotation` (dice-roll-processor.ts) - Para ataques de NPCs

**Cobertura:**
- ✅ Golpes no críticos (notación sin cambios)
- ✅ Golpes críticos con un dado (1d8+3 → 2d8+3)
- ✅ Golpes críticos con múltiples dados (2d6+2 → 4d6+2)
- ✅ Modificadores positivos, negativos y cero
- ✅ Diferentes tipos de dados (d4, d6, d8, d10, d12, d20, d100)
- ✅ Notaciones sin modificador (1d8 → 2d8)
- ✅ Manejo de notaciones inválidas (fallback seguro)
- ✅ Cumplimiento de reglas D&D 5e (duplica dados, no modificador)
- ✅ Consistencia entre ambas implementaciones (jugadores y NPCs)

**Reglas D&D 5e Verificadas:**
- Los dados de daño se duplican en críticos
- El modificador NO se duplica
- Ejemplo: 1d8+2 normal → 2d8+2 en crítico (NO 2d8+4)

### Integration Tests (38 tests)

#### `turn-system.test.ts` (24 tests)

**Módulo:** Sistema de Turnos Paso a Paso (integración)

**Funciones testeadas:**
- Sincronización de estado (`hasMoreAITurns`, `lastProcessedTurnWasAI`, `lastProcessedTurnIndex`)
- Procesamiento de turnos de IA y jugador
- Manejo de turnos de jugador inconsciente
- Avance de turnos y cálculo de siguiente turno
- Detección de fin de combate
- Validación de orden de iniciativa
- Sincronización frontend-backend
- Estados de botones

**Cobertura:**
- ✅ Verificación de `hasMoreAITurns` en diferentes escenarios
- ✅ Verificación de `lastProcessedTurnWasAI` y `lastProcessedTurnIndex`
- ✅ Manejo de jugador inconsciente/muerto
- ✅ Cálculo correcto de siguiente turno (con y sin wrap-around)
- ✅ Detección de fin de combate (enemigos derrotados, aliados inconscientes/muertos)
- ✅ Validación de orden de iniciativa
- ✅ Sincronización de `turnIndex` entre frontend y backend
- ✅ Lógica de visibilidad de botones

#### `turn-system-flow.test.ts` (14 tests)

**Módulo:** Flujo Completo del Sistema de Turnos (integración)

**Funciones testeadas:**
- Flujos completos de turnos (IA → Jugador → IA)
- Turnos saltados (combatientes muertos/inconscientes)
- Wrap-around de rondas
- Fin de combate en diferentes escenarios
- Sincronización de estado completa

**Cobertura:**
- ✅ Flujo completo: Inicio → IA → Jugador → IA
- ✅ Transición correcta entre turnos
- ✅ Manejo de turnos saltados
- ✅ Wrap-around correcto de rondas
- ✅ Detección de fin de combate en múltiples escenarios
- ✅ Sincronización de estado a través de múltiples turnos

### Backend Tests (36 tests)

#### `combat-validators.test.ts` (26 tests)

**Módulo:** `src/ai/tools/combat/combat-validators.ts`

**Funciones testeadas:**
- `getHpStatus()` - Estados de HP (Healthy, Injured, Wounded, etc.)
- `validateAndClampHP()` - Validación y clamp de valores de HP
- `isUnconsciousOrDead()` - Verificación de inconsciencia/muerte
- `checkEndOfCombat()` - Detección de fin de combate

**Cobertura:**
- ✅ Validación de HP en rangos válidos
- ✅ Clamp de HP fuera de rango
- ✅ Manejo de personajes muertos
- ✅ Detección de fin de combate (enemigos derrotados, aliados inconscientes/muertos)
- ✅ Distinción entre inconscientes y muertos

#### `retry-utils.test.ts` (10 tests)

**Módulo:** `src/ai/flows/retry-utils.ts`

**Funciones testeadas:**
- `retryWithExponentialBackoff()` - Lógica de retry con backoff exponencial

**Cobertura:**
- ✅ Retry en errores de timeout
- ✅ Retry en errores de conexión (ECONNRESET, UND_ERR_CONNECT_TIMEOUT)
- ✅ Backoff exponencial (delays: 1000ms, 2000ms, 4000ms...)
- ✅ No retry en errores no retryables
- ✅ Límite de retries
- ✅ Valores por defecto

### Frontend Tests (32 tests)

#### `utils.test.ts` (6 tests)

**Módulo:** `src/lib/utils.ts`

**Funciones testeadas:**
- `cn()` - Utilidad para combinar clases de Tailwind

**Cobertura:**
- ✅ Combinación de clases
- ✅ Manejo de clases condicionales
- ✅ Merge de clases de Tailwind (override de conflictos)
- ✅ Manejo de arrays y objetos

#### `monster-name-manager.test.ts` (17 tests)

**Módulo:** `src/lib/combat/monster-name-manager.ts`

**Funciones testeadas:**
- `generateDifferentiatedNames()` - Generación de nombres diferenciados
- `normalizeNameForMatching()` - Normalización de nombres
- `escapeRegex()` - Escape de caracteres especiales
- `getVisualName()` - Obtención de nombres visuales

**Cobertura:**
- ✅ Generación de nombres numerados (Goblin 1, Goblin 2...)
- ✅ Manejo de múltiples tipos de enemigos
- ✅ Normalización insensible a acentos y mayúsculas
- ✅ Escape de caracteres especiales para regex
- ✅ Fallback a nombres de enemigos

#### `target-resolver.test.ts` (9 tests)

**Módulo:** `src/lib/combat/target-resolver.ts`

**Funciones testeadas:**
- `resolveEnemyId()` - Resolución de IDs de objetivos

**Cobertura:**
- ✅ Resolución de uniqueId directo
- ✅ Resolución de nombres visuales (Goblin 1)
- ✅ Resolución de nombres base (Goblin)
- ✅ Detección de ambigüedad
- ✅ Matching insensible a acentos y mayúsculas
- ✅ Manejo de casos sin match

---

## ✍️ Escribir Nuevos Tests

### Plantilla Básica

```typescript
/**
 * Unit tests for [module-name].ts
 * Brief description of what this module does
 */

import { describe, it, expect } from 'vitest';
import { functionToTest } from '@/path/to/module';

describe('functionToTest', () => {
  it('should do something specific', () => {
    const result = functionToTest(input);
    expect(result).toBe(expectedOutput);
  });

  it('should handle edge case', () => {
    const result = functionToTest(edgeCaseInput);
    expect(result).toBe(expectedOutput);
  });
});
```

### Ejemplo Completo

```typescript
/**
 * Unit tests for dice-roller.ts
 * Tests dice rolling logic and validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rollDice } from '@/ai/tools/dice-roller';

describe('rollDice', () => {
  beforeEach(() => {
    // Setup antes de cada test
  });

  it('should roll a d20 and return value between 1 and 20', () => {
    const result = rollDice(20);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(20);
  });

  it('should handle invalid dice sizes', () => {
    expect(() => rollDice(0)).toThrow();
    expect(() => rollDice(-5)).toThrow();
  });
});
```

### Matchers Comunes

```typescript
// Igualdad
expect(value).toBe(expected);           // ===
expect(value).toEqual(expected);        // Deep equality

// Números
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(3.14, 2);

// Strings
expect(string).toContain('substring');
expect(string).toMatch(/regex/);

// Arrays
expect(array).toHaveLength(5);
expect(array).toContain(item);

// Objetos
expect(object).toHaveProperty('key');
expect(object).toMatchObject({ key: 'value' });

// Errores
expect(() => function()).toThrow();
expect(() => function()).toThrow('error message');

// Promesas
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();
```

### Mocks y Spies

```typescript
import { vi } from 'vitest';

// Mock de función
const mockFn = vi.fn();
mockFn.mockReturnValue('value');
mockFn.mockResolvedValue('async value');
mockFn.mockRejectedValue(new Error('error'));

// Verificar llamadas
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(3);
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');

// Mock de módulo completo
vi.mock('@/lib/logger', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

// Timers falsos (para tests asíncronos)
vi.useFakeTimers();
await vi.advanceTimersByTimeAsync(1000);
vi.useRealTimers();
```

---

## 🔌 Dependency Injection (DI) en Tests

### ¿Qué es Dependency Injection?

La **Inyección de Dependencias (DI)** es un patrón de diseño que permite pasar dependencias a una función como parámetros en lugar de importarlas directamente. Esto hace que el código sea más testeable porque puedes "inyectar" mocks fácilmente en los tests.

### Patrón Implementado en el Proyecto

El proyecto utiliza **DI con parámetros opcionales y defaults** para mantener compatibilidad hacia atrás:

```typescript
// Definir interfaz de dependencias
interface CombatManagerDependencies {
  diceRollerTool: typeof diceRollerTool;
  enemyTacticianTool: typeof enemyTacticianTool;
  // ... otras dependencias
}

// Función con DI
export async function executeCombatManager(
  input: CombatManagerInput,
  dependencies?: Partial<CombatManagerDependencies>
) {
  // Merge con defaults
  const deps: CombatManagerDependencies = {
    diceRollerTool,
    enemyTacticianTool,
    // ... defaults
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

### Uso en Tests

#### Opción 1: DI Explícita (Recomendada para tests de integración)

```typescript
import { executeCombatManager } from '@/ai/tools/combat-manager';

describe('CombatManager with DI', () => {
  it('should work with mocked dependencies', async () => {
    // Crear mocks
    const mockDiceRoller = vi.fn().mockResolvedValue({
      totalResult: 20,
      outcome: 'crit'
    });
    
    const mockNarration = vi.fn().mockResolvedValue({
      narration: "Epic combat description"
    });

    // Llamar con DI explícita
    const result = await executeCombatManager(input, {
      diceRollerTool: mockDiceRoller as any,
      combatNarrationExpertTool: mockNarration as any,
    });

    // Verificar que mocks fueron llamados
    expect(mockDiceRoller).toHaveBeenCalled();
    expect(mockNarration).toHaveBeenCalled();
    
    // Verificar resultado
    expect(result.messages).toContainEqual(
      expect.objectContaining({ content: expect.stringContaining('crítico') })
    );
  });
});
```

#### Opción 2: Mocks de Módulo (Para tests simples)

```typescript
// Mock a nivel de módulo
vi.mock('@/ai/tools/dice-roller', () => ({
  diceRollerTool: vi.fn().mockResolvedValue({
    totalResult: 18,
    outcome: 'success'
  })
}));

// El código usa los mocks automáticamente
const result = await combatManagerTool(input);
```

### Funciones con DI Implementada

Las siguientes funciones soportan DI y pueden ser mockeadas fácilmente:

- ✅ `executeCombatManager()` - Función principal de gestión de combate
- ✅ `processAICombatantRolls()` - Procesamiento de tiradas de IA

### Beneficios de DI

1. **Tests más aislados**: Cada test controla exactamente qué dependencias usa
2. **Mockeo fácil**: No necesitas mockear módulos completos
3. **Tests más rápidos**: Puedes mockear llamadas costosas (IA, APIs)
4. **Mejor cobertura**: Puedes testear escenarios específicos fácilmente

### Cuándo Usar Cada Enfoque

- **DI Explícita**: Para tests de integración complejos donde necesitas control fino
- **Mocks de Módulo**: Para tests simples donde el comportamiento por defecto es suficiente

---

## 📊 Mejores Prácticas

### 1. Organización

- **Un archivo de test por módulo**: `module.ts` → `module.test.ts`
- **Agrupar tests relacionados**: Usar `describe()` para agrupar tests
- **Nombres descriptivos**: `it('should return error when input is invalid')`

### 2. Estructura AAA

```typescript
it('should calculate damage correctly', () => {
  // Arrange: Preparar datos
  const attack = 15;
  const defense = 10;
  
  // Act: Ejecutar función
  const damage = calculateDamage(attack, defense);
  
  // Assert: Verificar resultado
  expect(damage).toBe(5);
});
```

### 3. Tests Independientes

- Cada test debe poder ejecutarse de forma independiente
- No depender del orden de ejecución
- Limpiar estado entre tests con `beforeEach`/`afterEach`

### 4. Cobertura de Casos

- **Happy path**: Caso normal de uso
- **Edge cases**: Valores límite (0, null, undefined, strings vacíos)
- **Error cases**: Errores esperados y validaciones
- **Boundary conditions**: Límites de rangos

### 5. Tests Rápidos

- Evitar operaciones lentas (I/O, network)
- Usar mocks para dependencias externas
- Tests unitarios deben ejecutarse en < 1 segundo
- **Usar DI para mockear dependencias costosas** (llamadas a IA, APIs)

### 6. Dependency Injection

- **Usar DI explícita** para tests de integración complejos
- **Preferir DI sobre mocks de módulo** cuando necesites control fino
- **Documentar dependencias inyectables** en el código
- **Mantener compatibilidad hacia atrás** con defaults a implementaciones reales

### 7. Mantenibilidad

- Tests deben ser fáciles de leer y entender
- Evitar lógica compleja en tests
- Comentar casos no obvios

---

## 📈 Cobertura de Código

### Generar Reporte de Cobertura

```bash
npm run test:coverage
```

Esto genera:
- Reporte en consola
- Archivo `coverage/index.html` (abrir en navegador)
- Archivo `coverage/coverage-final.json`

### Interpretar Cobertura

- **Statements**: Porcentaje de líneas ejecutadas
- **Branches**: Porcentaje de ramas condicionales cubiertas
- **Functions**: Porcentaje de funciones llamadas
- **Lines**: Porcentaje de líneas ejecutadas

### Objetivos de Cobertura

- **Mínimo recomendado**: 70% para módulos críticos
- **Ideal**: 80-90% para lógica de negocio
- **Módulos críticos**: 90%+ (combate, validaciones, etc.)

---

## 🔧 Troubleshooting

### Tests no encuentran módulos

**Problema**: `Cannot find module '@/path/to/module'`

**Solución**: Verificar que `vitest.config.ts` tiene el alias configurado:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Mocks no funcionan

**Problema**: Mocks no se aplican correctamente

**Solución**: 
- Asegurar que `vi.mock()` está antes de los imports
- Verificar que el path del mock coincide exactamente con el import

### Tests asíncronos fallan

**Problema**: Tests con timers o promesas no funcionan

**Solución**:
- Usar `vi.useFakeTimers()` y `vi.advanceTimersByTimeAsync()`
- Asegurar que todas las promesas se resuelven con `await`
- Usar `vi.useRealTimers()` en `afterEach`

### Warning de Promise Rejection

**Problema**: `PromiseRejectionHandledWarning` en consola

**Solución**: Este warning es común con timers falsos y no afecta los tests. Puede ignorarse o manejarse explícitamente:
```typescript
await promise.catch(() => {}); // Manejar rechazo explícitamente
```

---

## 🔗 Referencias

- [Documentación de Vitest](https://vitest.dev/)
- [Vitest UI](https://vitest.dev/guide/ui.html)
- [Testing Library](https://testing-library.com/)
- [Plan de Implementación](../planes-desarrollo/planes-en-curso/sistema-turnos-paso-a-paso.md)

---

## 📝 Notas

- **Última actualización**: 2025-11-16
- **Tests totales**: 145 (75 backend + 32 frontend + 38 integration)
- **Estado**: ✅ Todos los tests pasando
- **Framework**: Vitest v4.0.9
- **Tests de integración**: 38 tests para el sistema de turnos paso a paso

---

**¿Preguntas o problemas?** Consulta la sección [Troubleshooting](#troubleshooting) o revisa los tests existentes como referencia.

