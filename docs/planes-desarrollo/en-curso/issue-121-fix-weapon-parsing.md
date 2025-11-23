# Plan de Desarrollo: Issue #121 - Fix Weapon Parsing Regression

**Fecha de creación:** 2025-11-23  
**Estado:** 🚧 En Curso  
**Prioridad:** 🔴 Muy Alta (Crítico - Bloquea ataques de jugadores)

---

## 📋 Resumen Ejecutivo

**Problema:** Tras implementar el Issue #120, se introdujo una regresión crítica que bloquea completamente los ataques de jugadores. El sistema pasa toda la acción del jugador (ej: "Ataco al goblin 1") como `weaponQuery` a `CombatActionResolver.resolveAttack()`, en lugar de extraer solo el nombre del arma.

**Solución:** Implementar una función helper ligera `extractWeaponName()` que parsee la acción del jugador para extraer el nombre del arma mencionada, aprovechando la arquitectura del Issue #120.

**Estimación:** 1-2 horas

---

## 🎯 Objetivos

1. ✅ Restaurar la funcionalidad de ataques de jugadores en combate
2. ✅ Implementar parsing robusto de nombres de armas desde acciones de jugador
3. ✅ Mantener compatibilidad con la arquitectura del Issue #120
4. ✅ Proporcionar fallback seguro cuando no se menciona arma específica

---

## 📊 Análisis del Problema

### Causa Raíz

En `turn-processor.ts` línea 225, durante la refactorización del Issue #120, se cambió:

```typescript
// ❌ ANTES (Issue #120): Lógica compleja de extracción (perdida)
// ... código que extraía el nombre del arma ...

// ❌ AHORA: Pasa toda la acción como weaponQuery
const weaponQuery = playerAction || 'ataque'; // "Ataco al goblin 1"
```

Esto hace que `CombatActionResolver.resolveAttack()` busque un arma llamada "Ataco al goblin 1" en el inventario, lo cual obviamente falla.

### Comportamiento Actual vs Esperado

| Acción del Jugador | Comportamiento Actual | Comportamiento Esperado |
|-------------------|----------------------|------------------------|
| "Ataco al goblin 1" | ❌ Error: No tienes el arma "Ataco al goblin 1" | ✅ `weaponQuery = 'ataque'` → Usa arma principal |
| "Ataco con mi espada" | ❌ Error: No tienes el arma "Ataco con mi espada" | ✅ `weaponQuery = 'espada'` → Busca espada |
| "Disparo mi arco" | ❌ Error: No tienes el arma "Disparo mi arco" | ✅ `weaponQuery = 'arco'` → Busca arco |

---

## 🛠️ Plan de Implementación

### Fase 1: Implementar Helper de Parsing

**Objetivo:** Crear función `extractWeaponName()` que extraiga nombres de armas de acciones de jugador.

**Tareas:**
1. Crear función `extractWeaponName(playerAction: string): string | null` en `turn-processor.ts`
2. Implementar patrones de búsqueda:
   - `"con [arma]"` → extrae `[arma]`
   - `"usando [arma]"` → extrae `[arma]`
   - `"mi [arma]"` → extrae `[arma]`
   - `"el/la [arma]"` → extrae `[arma]`
3. Devolver `null` si no se encuentra patrón (fallback a `'ataque'`)

**Implementación:**

```typescript
/**
 * Extracts weapon name from player action.
 * Returns null if no specific weapon is mentioned.
 */
function extractWeaponName(action: string): string | null {
    if (!action) return null;
    
    const actionLower = action.toLowerCase();
    
    // Patterns to match: "con [weapon]", "usando [weapon]", "mi [weapon]"
    const patterns = [
        /con (?:mi |el |la |un |una )?(\w+)/i,
        /usando (?:mi |el |la |un |una )?(\w+)/i,
        /mi (\w+)/i,
        /(?:el|la) (\w+)/i,
    ];
    
    for (const pattern of patterns) {
        const match = actionLower.match(pattern);
        if (match && match[1]) {
            return match[1]; // e.g., "espada", "arco"
        }
    }
    
    return null; // No specific weapon mentioned
}
```

**Ubicación:** `src/lib/combat/turn-processor.ts` (antes de la clase `TurnProcessor`)

---

### Fase 2: Integrar Helper en Turn Processor

**Objetivo:** Usar `extractWeaponName()` para determinar `weaponQuery` antes de llamar a `CombatActionResolver.resolveAttack()`.

**Tareas:**
1. Reemplazar línea 225 en `turn-processor.ts`:
   ```typescript
   // ❌ ANTES
   const weaponQuery = playerAction || 'ataque';
   
   // ✅ DESPUÉS
   const weaponQuery = extractWeaponName(playerAction) || 'ataque';
   ```

2. Verificar que el flujo completo funciona:
   - Jugador → `extractWeaponName()` → `weaponQuery` → `CombatActionResolver.resolveAttack()`

**Archivos a modificar:**
- `src/lib/combat/turn-processor.ts` (línea ~225)

---

### Fase 3: Testing y Validación

**Objetivo:** Verificar que la solución funciona correctamente para todos los casos de uso.

**Casos de prueba:**

1. **Ataque genérico (sin arma específica):**
   - Input: "Ataco al goblin 1"
   - Expected: `weaponQuery = 'ataque'` → Usa arma principal

2. **Ataque con arma específica (patrón "con"):**
   - Input: "Ataco con mi espada al goblin"
   - Expected: `weaponQuery = 'espada'` → Busca espada en inventario

3. **Ataque con arma específica (patrón "usando"):**
   - Input: "Usando mi arco disparo al goblin"
   - Expected: `weaponQuery = 'arco'` → Busca arco en inventario

4. **Ataque con arma específica (patrón "mi"):**
   - Input: "Mi daga contra el goblin"
   - Expected: `weaponQuery = 'daga'` → Busca daga en inventario

5. **Arma no encontrada:**
   - Input: "Ataco con mi lanza"
   - Expected: Error "No tienes el arma 'lanza'" (comportamiento correcto de `CombatActionResolver`)

---

## 📁 Archivos a Modificar

| Archivo | Cambios | Complejidad |
|---------|---------|-------------|
| `src/lib/combat/turn-processor.ts` | Añadir función `extractWeaponName()` y usarla en línea ~225 | Baja |

---

## ✅ Criterios de Éxito

1. ✅ Los jugadores pueden atacar sin especificar arma (usa arma principal)
2. ✅ Los jugadores pueden atacar especificando un arma (busca en inventario)
3. ✅ El sistema muestra error apropiado si el arma no existe en inventario
4. ✅ No se introducen regresiones en el flujo de combate
5. ✅ La solución es simple, robusta y mantenible

---

## 🔗 Referencias

- [Issue #121](../tracking/issues/pendientes.md#issue-121-regresión-en-parsing-de-armas-en-ataques-de-jugador--crítico)
- [Issue #120](../tracking/issues/pendientes.md#issue-120-inconsistencia-en-cálculos-de-tiradas-y-visualización-merryl--crítico) - Regresión introducida durante su implementación
- [CombatActionResolver](../../src/lib/combat/action-resolver.ts) - Lógica de resolución de ataques

---

## 📝 Notas de Implementación

### Ventajas del Enfoque

- ✅ **Unificado:** Aprovecha la arquitectura del Issue #120
- ✅ **Simple:** Una sola función helper ligera
- ✅ **Robusto:** Fallback seguro a `'ataque'` si no se encuentra arma
- ✅ **Consistente:** Jugadores e IA usan el mismo `CombatActionResolver`
- ✅ **No duplica lógica:** La selección de armas está centralizada en `CombatActionResolver`

### Consideraciones Futuras

- **Extensibilidad:** La función `extractWeaponName()` puede extenderse fácilmente con más patrones si es necesario
- **Localización:** Los patrones están en español, consistente con el resto del juego
- **Issue #115:** Este fix es complementario al Issue #115 (Validación de inventario), que propone validación más robusta

---

## 📊 Estado de Implementación

- [ ] **Fase 1:** Implementar Helper de Parsing
- [ ] **Fase 2:** Integrar Helper en Turn Processor
- [ ] **Fase 3:** Testing y Validación

**Última actualización:** 2025-11-23
