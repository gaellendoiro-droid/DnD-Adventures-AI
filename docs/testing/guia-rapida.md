# Guía Rápida de Testing

**Para desarrolladores que quieren empezar rápidamente**

> 📚 **Para documentación completa y detallada**, consulta el [README.md](./README.md) que incluye:
> - Configuración completa del sistema
> - Estructura detallada de tests
> - Mejores prácticas
> - Cobertura de código
> - Troubleshooting avanzado
> - Ejemplos completos

---

## 🚀 Inicio Rápido

### 1. Ejecutar Tests

```bash
# Modo watch (recomendado)
npm test

# Una vez
npm run test:run

# Con UI visual
npm run test:ui
```

### 2. Crear un Test Nuevo

1. Crea archivo `tests/unit/[backend|frontend]/[ruta]/[nombre].test.ts`
2. Copia esta plantilla:

```typescript
import { describe, it, expect } from 'vitest';
import { tuFuncion } from '@/ruta/al/modulo';

describe('tuFuncion', () => {
  it('should do something', () => {
    const result = tuFuncion(input);
    expect(result).toBe(expected);
  });
});
```

3. Ejecuta `npm test` y verifica que pasa

### 3. Comandos Esenciales

| Comando | Descripción |
|---------|-------------|
| `npm test` | Modo watch (re-ejecuta al cambiar archivos) |
| `npm run test:run` | Ejecuta una vez (útil para CI) |
| `npm run test:ui` | Abre interfaz visual en navegador |
| `npm run test:coverage` | Genera reporte de cobertura |

---

## 📝 Ejemplos Rápidos

### Test Simple

```typescript
import { describe, it, expect } from 'vitest';
import { sum } from '@/lib/math';

describe('sum', () => {
  it('should add two numbers', () => {
    expect(sum(2, 3)).toBe(5);
  });
});
```

### Test con Mocks

```typescript
import { describe, it, expect, vi } from 'vitest';
import { fetchData } from '@/lib/api';

vi.mock('@/lib/api');

describe('fetchData', () => {
  it('should return data', async () => {
    const mockData = { id: 1, name: 'Test' };
    vi.mocked(fetchData).mockResolvedValue(mockData);
    
    const result = await fetchData();
    expect(result).toEqual(mockData);
  });
});
```

### Test con Dependency Injection

```typescript
import { describe, it, expect, vi } from 'vitest';
import { executeCombatManager } from '@/ai/tools/combat-manager';

describe('CombatManager with DI', () => {
  it('should work with mocked dependencies', async () => {
    // Crear mocks
    const mockDiceRoller = vi.fn().mockResolvedValue({
      totalResult: 20,
      outcome: 'crit'
    });

    // Llamar con DI explícita
    const result = await executeCombatManager(input, {
      diceRollerTool: mockDiceRoller as any,
    });

    // Verificar
    expect(mockDiceRoller).toHaveBeenCalled();
    expect(result.messages).toBeDefined();
  });
});
```

### Test con Timers

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('delayedFunction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute after delay', async () => {
    const promise = delayedFunction(1000);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(promise).resolves.toBe('done');
  });
});
```

---

## 🎯 Checklist para Nuevos Tests

- [ ] Archivo creado en `tests/unit/[ubicación]/`
- [ ] Nombre del archivo: `[modulo].test.ts`
- [ ] Importa función a testear
- [ ] Usa `describe()` para agrupar tests relacionados
- [ ] Cada test tiene nombre descriptivo
- [ ] Test pasa con `npm test`
- [ ] Cubre caso normal (happy path)
- [ ] Cubre al menos un edge case

---

## 🔍 Ver Tests Existentes

Para ver ejemplos reales, consulta:

- **Backend**: `tests/unit/backend/`
- **Frontend**: `tests/unit/frontend/`

---

## ❓ Problemas Comunes

**"Cannot find module"**
→ Verifica que usas `@/` para imports desde `src/`

**"Mock no funciona"**
→ Asegura que `vi.mock()` está antes de los imports

**"Test pasa pero hay warning"**
→ Warnings de Promise rejection son normales con timers falsos

---

---

## 📚 Documentación Completa

Esta es una guía rápida. Para información detallada sobre:

- **Configuración completa** del sistema de testing
- **Estructura detallada** de tests y organización
- **Mejores prácticas** y patrones avanzados
- **Cobertura de código** y métricas
- **Troubleshooting avanzado** y soluciones
- **Ejemplos completos** de todos los tipos de tests

Consulta el [README.md](./README.md) - Documentación completa del sistema de testing.

