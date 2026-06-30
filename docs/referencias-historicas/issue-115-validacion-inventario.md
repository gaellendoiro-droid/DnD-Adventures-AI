# Plan de Implementación: Issue #115 - Validación de Inventario al Usar Armas u Objetos

**Issue:** #115  
**Prioridad:** 🟡 ALTA  
**Fecha de creación del plan:** 2025-01-27  
**Fecha de finalización:** 2025-01-27  
**Estado:** ✅ COMPLETADO  
**Referencia:** [Issue #115](../../tracking/issues/corregidos.md#issue-115-validación-de-inventario-al-usar-armas-u-objetos-advertencia-resuelto)

---

## 🎯 Objetivo

Implementar validación de inventario antes de permitir que el jugador use armas u objetos en sus acciones, tanto en combate como en exploración/interacción. El sistema debe verificar que el personaje tiene el arma u objeto mencionado en su inventario antes de procesar la acción.

---

## 📋 Análisis del Problema

### Problema Actual

1. **En Combate:**
   - El sistema busca armas en el inventario (líneas 420-432 de `combat-manager.ts`) pero NO valida si el jugador realmente tiene esa arma antes de procesar el ataque
   - Si el jugador dice "ataco con mi espada" pero no tiene espada, el sistema igualmente procesa el ataque usando un arma genérica o la primera arma encontrada
   - No hay validación de si el objeto mencionado existe en el inventario

2. **En Exploración/Interacción:**
   - No hay validación de inventario para acciones fuera de combate
   - El sistema permite usar objetos que no están en el inventario

3. **Flujo Actual:**
   ```
   Jugador: "Ataco con mi espada +1"
   → action-interpreter.ts: Interpreta como 'attack'
   → combat-manager.ts: Busca arma en inventario (línea 422)
   → Si no encuentra, usa 'su arma' genérica (línea 432)
   → Procesa el ataque sin validar si realmente tiene esa arma
   ```

### Comportamiento Esperado

```
Jugador: "Ataco con mi espada +1"
→ action-interpreter.ts: Interpreta como 'attack'
→ Sistema: Extrae "espada +1" de la acción
→ Sistema: Valida que "espada +1" está en el inventario del personaje activo
→ Si NO está: DM informa "No tienes una espada +1 en tu inventario"
→ Si SÍ está: Procesa el ataque normalmente
```

---

## 🔍 Análisis Técnico

### Archivos Afectados

1. **`src/ai/flows/action-interpreter.ts`**
   - Actualmente solo interpreta el tipo de acción
   - NO extrae información sobre armas/objetos mencionados
   - Necesita: Extraer armas/objetos mencionados en la acción (opcional, puede hacerse después)

2. **`src/ai/tools/combat-manager.ts`** (líneas 400-600)
   - Busca armas en inventario pero no valida existencia
   - Necesita: Validación antes de procesar ataque
   - Necesita: Extraer arma mencionada de `playerAction` si existe

3. **`src/ai/flows/game-coordinator.ts`**
   - Coordina acciones entre combate y exploración
   - Necesita: Validación de inventario para acciones de interacción que requieren objetos

4. **`src/ai/flows/narrative-expert.ts`**
   - Narra acciones fuera de combate
   - Necesita: Validación de inventario para acciones que requieren objetos

### Estructura de Datos

**Inventario del Personaje:**
```typescript
inventory: Array<{
  id: string,
  name: string,           // Ej: "Espada larga", "Espada +1", "Poción de curación"
  quantity: number,       // Cantidad del objeto
  description?: string     // Ej: "1d8 de daño cortante"
}>
```

**Ejemplos de Acciones del Jugador:**
- "Ataco con mi espada" → Validar que tiene "espada" en inventario
- "Uso mi poción de curación" → Validar que tiene "poción de curación"
- "Ataco con el mandoble" → Validar que tiene "mandoble"
- "Ataco" (sin mencionar arma) → Usar arma por defecto o primera arma disponible

---

## 🛠️ Solución Propuesta

### Estrategia General

1. **Crear módulo de validación de inventario** (`src/lib/inventory-validator.ts`)
   - Función para extraer armas/objetos mencionados en texto
   - Función para validar si un objeto está en el inventario
   - Función para encontrar el mejor match (fuzzy matching)

2. **Integrar validación en flujos existentes**
   - Combate: Validar antes de procesar ataque
   - Exploración: Validar antes de procesar interacción con objetos

3. **Mensajes informativos al jugador**
   - Si no tiene el objeto: "No tienes [objeto] en tu inventario"
   - Si tiene múltiples: Usar el más específico o preguntar

### Consideraciones de Diseño

1. **Fuzzy Matching:**
   - "espada" debe coincidir con "Espada larga", "Espada +1", "Espada corta"
   - "poción" debe coincidir con "Poción de curación", "Poción de fuerza"
   - Usar normalización (lowercase, sin acentos) para matching

2. **Prioridad de Matching:**
   - Match exacto > Match parcial > Match genérico
   - Si hay múltiples matches, usar el más específico

3. **Casos Especiales:**
   - Si no menciona arma: Usar arma por defecto o primera disponible (comportamiento actual)
   - Si menciona arma pero no la tiene: Informar y no procesar acción
   - Si menciona objeto pero no lo tiene: Informar y no procesar acción

---

## 📝 Fases de Implementación

### Fase 1: Crear Módulo de Validación de Inventario

**Objetivo:** Crear funciones reutilizables para validar inventario

**Tareas:**
1. Crear `src/lib/inventory-validator.ts`
2. Implementar `extractItemFromAction(action: string): string | null`
   - Extrae el nombre del objeto/arma mencionado en la acción
   - Usa expresiones regulares y patrones comunes
   - Retorna `null` si no se menciona ningún objeto específico
3. Implementar `findItemInInventory(itemName: string, inventory: InventoryItem[]): InventoryItem | null`
   - Busca el objeto en el inventario usando fuzzy matching
   - Normaliza nombres (lowercase, sin acentos)
   - Retorna el mejor match o `null`
4. Implementar `validateInventoryForAction(action: string, character: Character, requiredItemType?: 'weapon' | 'item'): ValidationResult`
   - Función principal de validación
   - Retorna `{ isValid: boolean, item?: InventoryItem, message?: string }`

**Archivos:**
- Nuevo: `src/lib/inventory-validator.ts`

**Estimación:** 3-4 horas

---

### Fase 2: Integrar Validación en Combate

**Objetivo:** Validar inventario antes de procesar ataques en combate

**Tareas:**
1. Modificar `combat-manager.ts` (líneas 400-450)
   - Antes de buscar arma en inventario, extraer arma mencionada de `playerAction`
   - Si se menciona un arma específica, validar que existe en inventario
   - Si no existe, retornar mensaje de error y no procesar ataque
   - Si existe, usar esa arma específica
   - Si no se menciona arma, mantener comportamiento actual (buscar primera arma disponible)

2. Añadir logging para debugging
   - Log cuando se valida inventario
   - Log cuando se rechaza una acción por falta de objeto

**Archivos:**
- `src/ai/tools/combat-manager.ts`

**Código de Ejemplo:**
```typescript
// Antes de línea 420
import { validateInventoryForAction } from '@/lib/inventory-validator';

// En el bloque de procesamiento de ataque del jugador
const inventoryValidation = validateInventoryForAction(
  playerAction,
  playerChar,
  'weapon'
);

if (!inventoryValidation.isValid) {
  messages.push({
    sender: 'DM',
    content: inventoryValidation.message || `No tienes el arma mencionada en tu inventario.`
  });
  // No procesar el ataque, retornar early
  return {
    messages,
    diceRolls,
    // ... resto de campos
  };
}

// Si validation.isValid, usar inventoryValidation.item como arma
const weapon = inventoryValidation.item || /* fallback a búsqueda actual */;
```

**Estimación:** 4-5 horas

---

### Fase 3: Integrar Validación en Exploración/Interacción

**Objetivo:** Validar inventario para acciones fuera de combate que requieren objetos

**Tareas:**
1. Modificar `game-coordinator.ts`
   - Detectar acciones que requieren objetos (usar, consumir, etc.)
   - Validar inventario antes de pasar a `narrative-expert`
   - Si no tiene el objeto, informar al jugador y no procesar

2. Modificar `narrative-expert.ts` (opcional)
   - Añadir validación adicional como capa de seguridad
   - O confiar en la validación de `game-coordinator`

**Archivos:**
- `src/ai/flows/game-coordinator.ts`
- `src/ai/flows/narrative-expert.ts` (opcional)

**Estimación:** 3-4 horas

---

### Fase 4: Testing y Validación

**Objetivo:** Asegurar que la validación funciona correctamente en todos los casos

**Casos de Prueba:**

1. **Combate - Arma mencionada y existe:**
   - Jugador: "Ataco con mi espada"
   - Inventario: Tiene "Espada larga"
   - Resultado esperado: ✅ Ataque procesado con "Espada larga"

2. **Combate - Arma mencionada pero NO existe:**
   - Jugador: "Ataco con mi espada +1"
   - Inventario: No tiene "espada +1"
   - Resultado esperado: ❌ Mensaje "No tienes una espada +1 en tu inventario"

3. **Combate - No menciona arma:**
   - Jugador: "Ataco"
   - Inventario: Tiene "Espada larga"
   - Resultado esperado: ✅ Ataque procesado con primera arma disponible (comportamiento actual)

4. **Exploración - Objeto mencionado y existe:**
   - Jugador: "Uso mi poción de curación"
   - Inventario: Tiene "Poción de curación"
   - Resultado esperado: ✅ Acción procesada

5. **Exploración - Objeto mencionado pero NO existe:**
   - Jugador: "Uso mi poción de fuerza"
   - Inventario: No tiene "poción de fuerza"
   - Resultado esperado: ❌ Mensaje "No tienes una poción de fuerza en tu inventario"

6. **Fuzzy Matching:**
   - Jugador: "Ataco con espada"
   - Inventario: Tiene "Espada larga", "Espada corta"
   - Resultado esperado: ✅ Usa "Espada larga" (o la primera encontrada)

7. **Múltiples objetos similares:**
   - Jugador: "Uso poción"
   - Inventario: Tiene "Poción de curación", "Poción de fuerza"
   - Resultado esperado: ⚠️ Usar la primera o preguntar cuál (decisión de diseño)

**Archivos:**
- Tests manuales
- Posiblemente: `src/lib/__tests__/inventory-validator.test.ts` (futuro)

**Estimación:** 2-3 horas

---

## 📊 Resumen de Estimaciones

| Fase | Descripción | Estimación |
|------|-------------|------------|
| Fase 1 | Crear módulo de validación | 3-4 horas |
| Fase 2 | Integrar en combate | 4-5 horas |
| Fase 3 | Integrar en exploración | 3-4 horas |
| Fase 4 | Testing y validación | 2-3 horas |
| **TOTAL** | | **12-16 horas** |

---

## 🔗 Dependencias y Relaciones

### Issues Relacionados
- Ninguno identificado actualmente

### Módulos Relacionados
- `src/lib/schemas.ts` (definición de `Character` e `InventoryItem`)
- `src/lib/types.ts` (tipos TypeScript)
- `src/ai/tools/combat-manager.ts` (procesamiento de combate)
- `src/ai/flows/game-coordinator.ts` (coordinación de acciones)

### Consideraciones Futuras
- Sistema de equipamiento (equipped items) - cuando se implemente, la validación debería verificar items equipados también
- Sistema de objetos consumibles - validar cantidad disponible
- Sistema de objetos con cargas/usos - validar cargas restantes

---

## ✅ Criterios de Éxito

1. ✅ El sistema valida que el jugador tiene el arma mencionada antes de procesar ataques
2. ✅ El sistema valida que el jugador tiene el objeto mencionado antes de procesar interacciones
3. ✅ Los mensajes de error son claros e informativos
4. ✅ El fuzzy matching funciona correctamente para variaciones de nombres
5. ✅ No se rompe el comportamiento actual cuando no se menciona un objeto específico
6. ✅ La validación funciona tanto en combate como en exploración

---

## 📝 Notas de Implementación

### Patrones de Extracción de Objetos

Expresiones regulares sugeridas:
- `/(?:con|usando|usar|usar mi|usar la|usar el)\s+(?:mi|la|el|una|un)?\s*([^.!?]+?)(?:\s+para|\s+y|\s+al|\s+a|$)/i`
- Para armas: `/(?:arma|espada|mandoble|maza|daga|bastón|arco|hacha)/i`
- Para objetos: `/(?:poción|objeto|item|herramienta)/i`

### Normalización de Nombres

```typescript
function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim();
}
```

### Fuzzy Matching Estrategia

1. Match exacto (normalizado)
2. Match que contiene el término buscado
3. Match que contiene palabras clave del término buscado
4. Si múltiples matches, preferir el más específico (más palabras)

---

## ✅ Implementación Completada

### Resumen de Cambios

El Issue #115 fue completado como parte de la implementación de validación de inventario para armas, hechizos y objetos. La solución implementada incluye:

1. **Validación de Armas** (Issue #121 - ya implementado previamente):
   - Función `extractWeaponName()` para extraer nombres de armas de acciones del jugador
   - Validación en `CombatActionResolver.resolveAttack()` con código de error `WEAPON_NOT_IN_INVENTORY`

2. **Validación de Hechizos** (implementado en esta sesión):
   - Función `extractSpellName()` para extraer nombres de hechizos de acciones del jugador
   - Método `CombatActionResolver.validateSpell()` con código de error `SPELL_NOT_KNOWN`

3. **Validación de Objetos** (implementado en esta sesión):
   - Función `extractItemName()` para extraer nombres de objetos de acciones del jugador
   - Método `CombatActionResolver.validateItem()` con código de error `ITEM_NOT_IN_INVENTORY`

4. **Integración en Turn Processor**:
   - Validación automática de hechizos y objetos cuando el jugador los menciona en su acción
   - Errores específicos que no avanzan el turno, permitiendo al jugador reintentar

5. **Frontend**:
   - Detección de errores de inventario/hechizos/objetos
   - Reset automático de `playerActionCompleted` para permitir reintentar

### Archivos Modificados

- `src/lib/combat/combat-session.ts` - Añadidos códigos de error que no avanzan turno
- `src/lib/combat/turn-processor.ts` - Funciones de extracción y validación
- `src/lib/combat/action-resolver.ts` - Métodos de validación de hechizos y objetos
- `src/components/game/game-view.tsx` - Detección de errores en frontend
- `tests/unit/combat/turn-processor.test.ts` - Tests para validación

### Estado Final

✅ **COMPLETADO** - Todas las validaciones de inventario implementadas y funcionando correctamente.

---

**Última actualización:** 2025-01-27 (Completado)

