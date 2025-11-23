# Plan de Desarrollo: Issue #121 - Fix Weapon Parsing Regression

**Fecha de creación:** 2025-11-23  
**Fecha de finalización:** 2025-01-23
**Estado:** ✅ COMPLETADO  
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
| `src/lib/combat/action-resolver.ts` | Añadir `attributeUsed` a `DiceRollRequest` y establecerlo en `resolvePlayerAttack` | Media |
| `src/lib/combat/roll-notation-utils.ts` | Eliminar lógica legacy de adivinación, lanzar error si falta `attributeUsed` | Baja |

---

## ✅ Criterios de Éxito

1. ✅ Los jugadores pueden atacar sin especificar arma (usa arma principal)
2. ✅ Los jugadores pueden atacar especificando un arma (busca en inventario)
3. ✅ El sistema muestra error apropiado si el arma no existe en inventario
4. ✅ No se introducen regresiones en el flujo de combate
5. ✅ La solución es simple, robusta y mantenible
6. ✅ **Extra:** Las armas a distancia (arcos, ballestas) usan DES correctamente
7. ✅ **Extra:** El frontend no adivina atributos, recibe `attributeUsed` del backend

---

## 🔗 Referencias

- [Issue #121](../tracking/issues/corregidos.md#issue-121-regresión-en-parsing-de-armas-en-ataques-de-jugador--crítico) - ✅ RESUELTO
- [Issue #120](../tracking/issues/corregidos.md#issue-120-inconsistencia-en-cálculos-de-tiradas-y-visualización-merryl--crítico) - Regresión introducida durante su implementación (✅ RESUELTO)
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

- [x] **Fase 1:** Implementar Helper de Parsing ✅ COMPLETADO
- [x] **Fase 2:** Integrar Helper en Turn Processor ✅ COMPLETADO
- [x] **Fase 3:** Testing y Validación ✅ COMPLETADO

**Última actualización:** 2025-01-23 (Todas las fases completadas)

### Detalles de la Fase 3

**Tests Implementados:**
- ✅ Tests unitarios para `extractWeaponName()` (24 tests) - `tests/unit/combat/extract-weapon-name.test.ts`
- ✅ Tests de integración para flujo completo con TurnProcessor (5 tests) - `tests/unit/combat/turn-processor.test.ts`

**Casos de prueba cubiertos:**
1. ✅ Ataque genérico (sin arma específica): "Ataco al goblin 1" → `weaponQuery = 'ataque'`
2. ✅ Ataque con patrón "con": "Ataco con mi espada al goblin" → `weaponQuery = 'espada'`
3. ✅ Ataque con patrón "usando": "Usando mi arco disparo al goblin" → `weaponQuery = 'arco'`
4. ✅ Ataque con patrón "mi": "Mi daga contra el goblin" → `weaponQuery = 'daga'`
5. ✅ Arma no encontrada: "Ataco con mi lanza" → Error apropiado

**Mejoras implementadas:**
- ✅ Función `extractWeaponName()` exportada para facilitar testing
- ✅ Regex mejorado para soportar caracteres acentuados en español (á, é, í, ó, ú, ñ, ü)
- ✅ Todos los tests pasan exitosamente

---

## 🔧 Tarea Extra: Fix Atributo Usado para Armas a Distancia

**Problema descubierto durante pruebas:** Al atacar con arcos, el sistema usa FUE (Fuerza) en lugar de DES (Destreza), lo cual es incorrecto según las reglas de D&D 5e. Las armas a distancia deben usar Destreza.

**Causa raíz:**
- `CombatActionResolver.resolvePlayerAttack()` detecta correctamente que el arco es ranged (línea 88) y calcula el modificador correcto (DES), pero **no establece `attributeUsed` en los `DiceRollRequest`**.
- Sin `attributeUsed`, el frontend (`updateRollNotationWithModifiers`) usa la lógica legacy que adivina el atributo basándose en el modificador más alto entre FUE y DES, lo cual puede ser incorrecto.

**Solución implementada:**

1. **Añadido `attributeUsed` a `DiceRollRequest`:**
   - Campo opcional que indica qué atributo se usó (FUE, DES, CON, INT, SAB, CAR)

2. **Establecido `attributeUsed` en `resolvePlayerAttack`:**
   - DES para armas ranged (arcos, ballestas)
   - FUE para armas melee (por defecto)
   - DES o FUE para armas finesse (el que sea mayor)

3. **Establecido `attributeUsed` en `resolveEnemyAttack`:**
   - DES para armas ranged detectadas por nombre
   - FUE por defecto para ataques melee

4. **Eliminada lógica legacy de adivinación en frontend:**
   - El frontend (`updateRollNotationWithModifiers`) ahora lanza un error si no recibe `attributeUsed`
   - Esto mantiene la arquitectura "Frontend Obediente" del Issue #120

**Archivos modificados:**
- `src/lib/combat/action-resolver.ts` - Añadido `attributeUsed` a interfaz y establecido en ambos métodos de resolución
- `src/lib/combat/roll-notation-utils.ts` - Eliminada lógica legacy, lanza error si falta `attributeUsed`

**Estado:** ✅ COMPLETADO

**Resultado:**
- ✅ Los arcos ahora usan DES correctamente
- ✅ Arquitectura "Frontend Obediente" mantenida
- ✅ Tests pasan exitosamente

---

## 🔧 Tarea Extra 2: Mostrar Tipo de Ataque (Cuerpo a Cuerpo/A Distancia) en Panel de Tiradas

**Problema descubierto durante uso:** En el panel de tiradas, cuando se muestra una tirada de ataque, no se especifica si es un ataque cuerpo a cuerpo o a distancia. Esto dificulta la comprensión rápida del tipo de ataque realizado.

**Solución implementada:**

1. **Añadido `attackRange` al tipo `DiceRoll`:**
   - Campo opcional que indica si el ataque es 'melee' o 'ranged'

2. **Añadido `attackRange` a `DiceRollRequest` y establecido en `action-resolver.ts`:**
   - En `resolvePlayerAttack`: Determina `attackRange` basándose en `isRanged` (ya calculado)
   - En `resolveEnemyAttack`: Determina `attackRange` basándose en el nombre del arma
   - Añadido `attackRange` a todos los `DiceRollRequest` (ataque y daño)

3. **Preservado `attackRange` en `action-executor.ts`:**
   - Añadido `attackRange: rollRequest.attackRange` al crear el `DiceRoll`

4. **Mostrado información en `dice-roll-result.tsx`:**
   - Añadido indicador visual: "🏹 A distancia" o "⚔️ Cuerpo a cuerpo"
   - Mostrado solo para tiradas de ataque (`isAttackRoll`)
   - Posicionado antes de la información del objetivo

**Archivos modificados:**
- `src/lib/types.ts` - Añadido `attackRange` a `DiceRoll`
- `src/lib/combat/action-resolver.ts` - Añadido `attackRange` a `DiceRollRequest` y establecido en ambos métodos de resolución
- `src/lib/combat/action-executor.ts` - Preservar `attackRange` al crear `DiceRoll`
- `src/components/game/dice-roll-result.tsx` - Mostrar indicador visual de tipo de ataque

**Estado:** ✅ COMPLETADO

**Resultado:**
- ✅ El panel de tiradas ahora muestra claramente si un ataque es cuerpo a cuerpo o a distancia
- ✅ Mejora la claridad visual y la comprensión rápida del tipo de ataque
- ✅ Información consistente para jugadores y enemigos

---

## 🔧 Tarea Extra 3: Unificar Notación de Tiradas de Daño (Mostrar Atributo Usado Incluso con Modificador 0)

**Problema descubierto durante uso:** En las tiradas de daño del jugador, cuando el modificador de atributo es 0, se muestra "1d6+0" en lugar de "1d6+DES" (o el atributo correspondiente). Esto es inconsistente con enemigos y compañeros, que muestran correctamente el atributo usado.

**Ejemplo del problema:**
- Galador tiene DES = 10 (modificador 0)
- Al usar el arco, se muestra: "Daño de Arco pequeño(1d6+0)"
- Debería mostrar: "Daño de Arco pequeño(1d6+DES)"

**Causa raíz:**
- En `roll-notation-utils.ts`, la función `updateRollNotationWithModifiers` solo actualizaba la notación cuando `abilityMod !== 0`
- Cuando el modificador es 0, la notación original de `action-resolver.ts` (ej: "1d6+0") se mantenía sin actualizar
- Esto causaba inconsistencia: jugadores con modificador 0 mostraban valores numéricos, mientras que otros mostraban etiquetas de atributos

**Solución implementada:**

1. **Modificado `updateRollNotationWithModifiers` en `roll-notation-utils.ts`:**
   - Eliminada la condición `if (abilityMod !== 0)` para tiradas de daño
   - Siempre actualizar la notación para mostrar el atributo usado, incluso si el valor es 0
   - Esto unifica el comportamiento: todos los combatantes (jugadores, compañeros, enemigos) muestran el atributo usado

**Cambio realizado:**
```typescript
// ANTES:
if (abilityMod !== 0) {
    modifiers.push({ value: abilityMod, label: roll.attributeUsed });
    const sign = abilityMod >= 0 ? '+' : '';
    roll.rollNotation = `${baseDice}${sign}${roll.attributeUsed}`;
}

// DESPUÉS:
// Always show the attribute used, even if modifier is 0 (for consistency across all combatants)
modifiers.push({ value: abilityMod, label: roll.attributeUsed });
const sign = abilityMod >= 0 ? '+' : '';
roll.rollNotation = `${baseDice}${sign}${roll.attributeUsed}`;
```

**Archivos modificados:**
- `src/lib/combat/roll-notation-utils.ts` - Eliminada condición que impedía actualizar notación cuando modificador es 0

**Estado:** ✅ COMPLETADO

**Resultado:**
- ✅ Las tiradas de daño ahora siempre muestran el atributo usado (ej: "1d6+DES", "1d6+FUE")
- ✅ Comportamiento unificado para jugadores, compañeros y enemigos
- ✅ Consistencia visual: todos muestran etiquetas de atributos en lugar de valores numéricos cuando el modificador es 0
- ✅ El desglose ahora muestra correctamente el modificador 0 (ej: "1+0" en lugar de solo "1")

---

## 📝 Resumen Final

**Issue #121** ha sido completamente resuelto con las siguientes mejoras:

1. ✅ **Parsing de armas restaurado:** Los jugadores pueden atacar con o sin especificar arma
2. ✅ **Atributos correctos:** Las armas a distancia usan DES, las melee usan FUE (o el mayor para finesse)
3. ✅ **Arquitectura mejorada:** Frontend "obediente" que no adivina atributos
4. ✅ **Visualización mejorada:** Tipo de ataque (melee/ranged) visible en panel de tiradas
5. ✅ **Notación unificada:** Todos los combatantes muestran atributos de forma consistente, incluso con modificador 0
6. ✅ **Desglose completo:** El desglose muestra el modificador 0 cuando corresponde (ej: "1+0")

**Tests:** 29 tests totales (24 unitarios + 5 de integración) - Todos pasando ✅

