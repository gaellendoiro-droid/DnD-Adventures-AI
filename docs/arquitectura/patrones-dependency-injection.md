# Patrones de Dependency Injection (DI)

**Versión:** 1.0.0  
**Fecha de creación:** 2025-01-20  
**Estado:** ✅ Implementado

---

## 📋 Introducción

Este documento describe el patrón de **Inyección de Dependencias (DI)** implementado en el proyecto para mejorar la testabilidad del código, especialmente en funciones que interactúan con herramientas de IA y servicios externos.

---

## 🎯 Objetivo

Permitir que las funciones críticas acepten dependencias como parámetros, facilitando:
- **Mockeo fácil** en tests
- **Aislamiento** de dependencias externas
- **Tests más rápidos** (sin llamadas reales a IA/APIs)
- **Mejor cobertura** de casos edge

---

## 🔧 Patrón Implementado

### Estructura General

```typescript
// 1. Definir interfaz de dependencias
interface ModuleDependencies {
  dependency1: typeof dependency1;
  dependency2: typeof dependency2;
  // ... otras dependencias
}

// 2. Función con DI (función interna)
export async function executeModuleLogic(
  input: ModuleInput,
  dependencies?: Partial<ModuleDependencies>
) {
  // 3. Merge con defaults
  const deps: ModuleDependencies = {
    dependency1,
    dependency2,
    // ... defaults
    ...dependencies, // Sobrescribir con mocks en tests
  };
  
  // 4. Usar dependencias inyectadas
  const result = await deps.dependency1(input);
  // ...
  
  return result;
}

// 5. Wrapper público (mantiene compatibilidad)
export const moduleTool = ai.defineTool(
  { /* ... */ },
  async (input) => executeModuleLogic(input) // Usa defaults
);
```

---

## 📝 Ejemplo Real: `combatManagerTool`

### Implementación

```typescript
// src/ai/tools/combat-manager.ts

export interface CombatManagerDependencies {
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
  input: z.infer<typeof CombatManagerInputSchema>,
  dependencies?: Partial<CombatManagerDependencies>
) {
  // Merge con defaults
  const deps: CombatManagerDependencies = {
    diceRollerTool,
    enemyTacticianTool,
    companionTacticianTool,
    combatNarrationExpertTool,
    processAICombatantRolls,
    updateRollNotationWithModifiers,
    ...dependencies, // Override con mocks en tests
  };
  
  // Usar deps.diceRollerTool, deps.enemyTacticianTool, etc.
  // ...
}

// Wrapper de Genkit
export const combatManagerTool = ai.defineTool(
  {
    name: 'combatManagerTool',
    // ...
  },
  async (input) => executeCombatManager(input) // Usa defaults
);
```

### Uso en Producción

```typescript
// El código normal usa el wrapper (compatibilidad hacia atrás)
const result = await combatManagerTool(input);
// Internamente llama executeCombatManager(input) con defaults
```

### Uso en Tests

```typescript
// Tests pueden usar DI explícita
const mockDiceRoller = vi.fn().mockResolvedValue({
  totalResult: 20,
  outcome: 'crit'
});

const result = await executeCombatManager(input, {
  diceRollerTool: mockDiceRoller as any,
  combatNarrationExpertTool: mockNarration as any,
});

// Verificar que mocks fueron llamados
expect(mockDiceRoller).toHaveBeenCalled();
```

---

## ✅ Beneficios

### 1. Testabilidad Mejorada

- ✅ **Mockeo fácil**: No necesitas mockear módulos completos
- ✅ **Tests aislados**: Cada test controla sus dependencias
- ✅ **Tests rápidos**: Sin llamadas reales a IA/APIs

### 2. Mantenibilidad

- ✅ **Código desacoplado**: Dependencias explícitas
- ✅ **Compatibilidad**: Wrapper mantiene API original
- ✅ **Flexibilidad**: Fácil cambiar implementaciones

### 3. Desarrollo

- ✅ **Debugging más fácil**: Puedes inyectar implementaciones de debug
- ✅ **Testing de edge cases**: Fácil simular errores específicos
- ✅ **Documentación implícita**: La interfaz muestra todas las dependencias

---

## 📋 Guía de Implementación

### Cuándo Usar DI

**✅ Usar DI cuando:**
- La función tiene dependencias externas (IA, APIs, servicios)
- Necesitas testear la función de forma aislada
- Las dependencias son costosas (llamadas a IA)
- Quieres poder mockear dependencias fácilmente

**❌ No usar DI cuando:**
- La función es pura (solo cálculos, sin efectos secundarios)
- Las dependencias son simples utilidades (no necesitan mockeo)
- El overhead de DI no justifica el beneficio

### Pasos para Implementar DI

1. **Identificar dependencias**: Lista todas las dependencias hardcodeadas
2. **Crear interfaz**: Define `ModuleDependencies` con todas las dependencias
3. **Extraer función interna**: Crea `executeModuleLogic()` con parámetro `dependencies?`
4. **Merge con defaults**: Combina defaults con dependencias inyectadas
5. **Actualizar código**: Reemplaza imports directos por `deps.dependency`
6. **Crear wrapper**: Mantén el wrapper original para compatibilidad
7. **Actualizar tests**: Añade tests que usen DI explícita

---

## 🔍 Funciones con DI Implementada

Las siguientes funciones soportan DI:

- ✅ `executeCombatManager()` - Gestión de combate
- ✅ `processAICombatantRolls()` - Procesamiento de tiradas de IA

---

## 📚 Referencias

- [Documentación de Testing](../testing/README.md#dependency-injection-di-en-tests) - Uso de DI en tests
- [Plan de Mejora de Testabilidad](../planes-desarrollo/completados/mejora-testabilidad-refactorizacion.md) - Contexto y motivación
- [Inyección de Dependencias - Wikipedia](https://en.wikipedia.org/wiki/Dependency_injection) - Concepto general

---

**Última actualización:** 2025-01-20

