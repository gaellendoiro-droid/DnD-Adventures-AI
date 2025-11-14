# Plan de Refactorización: Módulo `combat-manager.ts`

Este documento detalla el plan para refactorizar el módulo `combat-manager.ts`, que ha crecido hasta convertirse en un "God Object" con más de 2700 líneas de código y múltiples responsabilidades.

**Prioridad:** Alta  
**Estado:** Pausado (Fases 1-2 completadas — 54.6% de reducción lograda)  
**Referencia:** Issue #21 (código duplicado), Issue #16 (gestión de nombres), múltiples mejoras futuras bloqueadas

---

## 🎯 Objetivo

Refactorizar `combat-manager.ts` en módulos más pequeños, manejables y mantenibles, siguiendo el principio de responsabilidad única (SRP) y mejorando la testabilidad y reutilización del código.

---

## 📊 Estado Actual del Módulo

### Métricas Actuales
- **Líneas de código:** ~2723 líneas
- **Funciones exportadas:** 1 (`combatManagerTool`)
- **Funciones internas:** ~15+ funciones helper
- **Responsabilidades identificadas:** 8+ áreas distintas
- **Código duplicado:** ~260 líneas (Issue #21)

### Problemas Identificados

1. **God Object (Objeto Dios):**
   - El módulo maneja demasiadas responsabilidades diferentes
   - Dificulta comprensión y mantenimiento
   - Viola el principio de responsabilidad única (SRP)

2. **Código Duplicado:**
   - Procesamiento de rolls duplicado en turnos normales e iniciación de combate (~260 líneas cada uno)
   - Cambios deben aplicarse en múltiples lugares
   - Riesgo de inconsistencias

3. **Funciones Helper Mezcladas:**
   - Funciones de normalización de nombres
   - Funciones de parseo de datos (HP, AC)
   - Funciones de validación
   - Funciones de gestión de estado
   - Todo mezclado en un solo archivo

4. **Dificultades de Mantenimiento:**
   - Cambios requieren navegar por 2700+ líneas
   - Testing difícil (módulo monolítico)
   - Reutilización limitada de funciones helper
   - Bloquea implementación de nuevas features (Issue #22, sistema de turnos paso a paso)

5. **Acoplamiento Alto:**
   - Lógica de combate mezclada con lógica de nombres
   - Lógica de combate mezclada con lógica de parseo de datos
   - Dificulta cambios independientes

---

## 🔍 Análisis de Responsabilidades

### Responsabilidades Identificadas en `combat-manager.ts`:

1. **Gestión de Estado de Combate:**
   - Iniciación de combate
   - Gestión de turnos e iniciativa
   - Detección de fin de combate
   - Actualización de HP y estado de combatientes

2. **Procesamiento de Tiradas de Dados:**
   - Procesamiento de rolls de ataque
   - Procesamiento de rolls de daño
   - Procesamiento de rolls de curación
   - Procesamiento de saving throws
   - Aplicación de resultados (daño, curación, muerte)

3. **Gestión de Nombres de Enemigos:**
   - Generación de nombres diferenciados (Goblin 1, Goblin 2)
   - Normalización de nombres para matching
   - Reemplazo de referencias ordinales en narraciones
   - Mapeo de nombres visuales

4. **Parseo de Datos de Monstruos:**
   - Parseo de HP desde formato D&D API
   - Parseo de AC desde formato D&D API
   - Caché de stats de monstruos
   - Normalización de nombres para API lookup

5. **Resolución de Objetivos:**
   - Mapeo de IDs de enemigos
   - Resolución de nombres a IDs únicos
   - Manejo de acentos y variaciones de nombres

6. **Validación y Sanitización:**
   - Validación de HP (clamp, límites)
   - Verificación de estado (inconsciente, muerto)
   - Validación de rolls

7. **Narración y Mensajes:**
   - Generación de mensajes del DM
   - Formateo de mensajes para transcript
   - Reemplazo de referencias en narraciones

8. **Coordinación con IA:**
   - Llamadas a `enemyTacticianTool`
   - Llamadas a `companionTacticianTool`
   - Procesamiento de respuestas de IA

---

## 🏗️ Arquitectura Propuesta

### Estructura de Módulos Propuesta:

```
src/ai/tools/combat/
├── combat-manager.ts          # Orquestador principal (reducido a ~300-400 líneas)
├── combat-state.ts            # Gestión de estado de combate
├── combat-turn-processor.ts   # Procesamiento de turnos
├── dice-roll-processor.ts     # Procesamiento de tiradas de dados
├── damage-applicator.ts       # Aplicación de daño/curación
├── combat-initiation.ts       # Lógica de iniciación de combate
└── combat-validators.ts       # Validaciones de combate

src/lib/combat/
├── monster-name-manager.ts   # Gestión de nombres (Issue #16)
├── monster-stats-parser.ts   # Parseo de stats de monstruos
└── target-resolver.ts        # Resolución de objetivos
```

---

## 📋 Plan de Refactorización

### **Fase 1: Extracción de Funciones Helper (Prioridad Alta)**

**Objetivo:** Extraer funciones helper a módulos separados para mejorar reutilización y reducir tamaño del archivo principal.

#### 1.1 Extraer Gestión de Nombres de Monstruos
- **Módulo:** `src/lib/combat/monster-name-manager.ts`
- **Funciones a extraer:**
  - `generateDifferentiatedNames()`
  - `normalizeNameForMatching()`
  - `escapeRegex()`
  - `replaceOrdinalReferences()`
  - `getVisualName()`
- **Beneficios:**
  - Resuelve Issue #16
  - Reutilizable en narraciones del DM y compañeros
  - Más fácil de testear
- **Estimación:** 2-3 horas

#### 1.2 Extraer Parseo de Stats de Monstruos
- **Módulo:** `src/lib/combat/monster-stats-parser.ts`
- **Funciones a extraer:**
  - `parseHitPoints()`
  - `parseArmorClass()`
  - `normalizeMonsterName()`
  - Lógica de caché de stats
- **Beneficios:**
  - Separación de responsabilidades
  - Reutilizable en otros módulos
  - Más fácil de testear
- **Estimación:** 2-3 horas

#### 1.3 Extraer Resolución de Objetivos
- **Módulo:** `src/lib/combat/target-resolver.ts`
- **Funciones a extraer:**
  - `resolveEnemyId()`
  - Lógica de mapeo de IDs
- **Beneficios:**
  - Separación de responsabilidades
  - Reutilizable en otros módulos
- **Estimación:** 1-2 horas

#### 1.4 Extraer Validaciones
- **Módulo:** `src/ai/tools/combat/combat-validators.ts`
- **Funciones a extraer:**
  - `validateAndClampHP()`
  - `isUnconsciousOrDead()`
  - `checkEndOfCombat()`
- **Beneficios:**
  - Lógica de validación centralizada
  - Más fácil de testear
- **Estimación:** 1-2 horas

**Total Fase 1:** 6-10 horas

---

### **Fase 2: Extracción de Lógica de Procesamiento (Prioridad Alta)**

**Objetivo:** Extraer lógica de procesamiento de rolls y aplicación de daño a módulos separados.

#### 2.1 Extraer Procesamiento de Rolls
- **Módulo:** `src/ai/tools/combat/dice-roll-processor.ts`
- **Funcionalidad:**
  - Procesamiento de rolls de ataque
  - Procesamiento de rolls de daño
  - Procesamiento de rolls de curación
  - Procesamiento de saving throws
  - **Elimina duplicación del Issue #21**
- **Beneficios:**
  - Resuelve Issue #21 (código duplicado)
  - Lógica centralizada
  - Más fácil de testear
- **Estimación:** 4-6 horas

#### 2.2 Extraer Aplicación de Daño/Curación
- **Módulo:** `src/ai/tools/combat/damage-applicator.ts`
- **Funcionalidad:**
  - Aplicación de daño a enemigos
  - Aplicación de daño a aliados (con regla de muerte masiva)
  - Aplicación de curación
  - Generación de mensajes narrativos
- **Beneficios:**
  - Separación de responsabilidades
  - Lógica de muerte masiva centralizada
  - Más fácil de testear
- **Estimación:** 3-4 horas

**Total Fase 2:** 7-10 horas

---

### **Fase 3: Extracción de Lógica de Combate (Prioridad Media)**

**Objetivo:** Extraer lógica de gestión de estado y turnos a módulos separados.

#### 3.1 Extraer Gestión de Estado de Combate
- **Módulo:** `src/ai/tools/combat/combat-state.ts`
- **Funcionalidad:**
  - Inicialización de estado de combate
  - Gestión de iniciativa
  - Gestión de turnos
  - Actualización de estado
- **Beneficios:**
  - Separación de responsabilidades
  - Facilita implementación de sistema de turnos paso a paso
- **Estimación:** 3-4 horas

#### 3.2 Extraer Procesamiento de Turnos
- **Módulo:** `src/ai/tools/combat/combat-turn-processor.ts`
- **Funcionalidad:**
  - Procesamiento de turno de jugador
  - Procesamiento de turno de compañero
  - Procesamiento de turno de enemigo
  - Coordinación con IA tacticians
- **Beneficios:**
  - Separación de responsabilidades
  - Facilita implementación de sistema de turnos paso a paso
- **Estimación:** 4-5 horas

#### 3.3 Extraer Iniciación de Combate
- **Módulo:** `src/ai/tools/combat/combat-initiation.ts`
- **Funcionalidad:**
  - Lógica de iniciación de combate
  - Procesamiento de turnos durante iniciación
  - Integración con `combat-initiation-expert.ts`
- **Beneficios:**
  - Separación de responsabilidades
  - Reduce tamaño del módulo principal
- **Estimación:** 3-4 horas

**Total Fase 3:** 10-13 horas

---

### **Fase 4: Refactorización del Módulo Principal (Prioridad Media)**

**Objetivo:** Reducir `combat-manager.ts` a un orquestador delgado que coordina los módulos extraídos.

#### 4.1 Refactorizar `combat-manager.ts`
- **Nuevo rol:** Orquestador principal
- **Funcionalidad:**
  - Coordinación de módulos extraídos
  - Definición del tool de Genkit
  - Manejo de entrada/salida
- **Tamaño objetivo:** ~300-400 líneas (reducción de ~85%)
- **Beneficios:**
  - Código más legible
  - Más fácil de mantener
  - Facilita testing
- **Estimación:** 4-6 horas

**Total Fase 4:** 4-6 horas

---

### **Fase 5: Testing y Validación (Prioridad Alta)**

**Objetivo:** Asegurar que la refactorización no rompe funcionalidad existente.

#### 5.1 Testing Manual
- Probar iniciación de combate
- Probar turnos de jugador
- Probar turnos de compañeros
- Probar turnos de enemigos
- Probar aplicación de daño/curación
- Probar detección de fin de combate
- Probar casos edge (muerte, inconsciencia, etc.)

#### 5.2 Testing de Integración
- Verificar que todos los módulos se integran correctamente
- Verificar que no hay regresiones
- Verificar que el comportamiento es idéntico al anterior

#### 5.3 Documentación
- Actualizar documentación de arquitectura
- Documentar nuevos módulos
- Actualizar referencias en otros documentos

**Total Fase 5:** 4-6 horas

---

## 📊 Resumen de Estimaciones

| Fase | Descripción | Estimación | Prioridad |
|------|-------------|------------|-----------|
| Fase 1 | Extracción de funciones helper | 6-10 horas | Alta |
| Fase 2 | Extracción de lógica de procesamiento | 7-10 horas | Alta |
| Fase 3 | Extracción de lógica de combate | 10-13 horas | Media |
| Fase 4 | Refactorización del módulo principal | 4-6 horas | Media |
| Fase 5 | Testing y validación | 4-6 horas | Alta |
| **TOTAL** | | **31-45 horas** | |

---

## 🎯 Beneficios Esperados

### Inmediatos
- ✅ Resuelve Issue #21 (código duplicado)
- ✅ Resuelve Issue #16 (gestión de nombres)
- ✅ Reduce tamaño del módulo principal en ~85%
- ✅ Mejora mantenibilidad y legibilidad

### A Medio Plazo
- ✅ Facilita implementación de nuevas features:
  - Sistema de turnos paso a paso
  - Sistema completo de Saving Throws (Issue #22)
  - Sistema de Death Saving Throws
  - Estados y condiciones
- ✅ Mejora testabilidad (módulos más pequeños y enfocados)
- ✅ Facilita debugging (responsabilidades claras)

### A Largo Plazo
- ✅ Arquitectura más escalable
- ✅ Facilita colaboración (múltiples desarrolladores pueden trabajar en paralelo)
- ✅ Reduce deuda técnica acumulada

---

## ⚠️ Riesgos y Consideraciones

### Riesgos
1. **Regresiones:** Cambios extensos pueden introducir bugs
   - **Mitigación:** Testing exhaustivo, refactorización incremental

2. **Tiempo de desarrollo:** 31-45 horas es significativo
   - **Mitigación:** Dividir en fases, priorizar fases críticas

3. **Dependencias:** Otros módulos pueden depender de la estructura actual
   - **Mitigación:** Mantener interfaces públicas compatibles durante la transición

### Consideraciones
- **Compatibilidad:** Mantener compatibilidad con código existente durante la transición
- **Testing:** Asegurar cobertura de testing antes y después de la refactorización
- **Documentación:** Actualizar documentación en paralelo con los cambios

---

## 🔗 Referencias

- [Issue #21: Código duplicado en `combat-manager.ts`](../tracking/issues/pendientes.md#issue-21-código-duplicado-en-combat-managerts-para-procesamiento-de-rolls-deuda-técnica)
- [Issue #16: Gestión de nombres de múltiples monstruos](../tracking/issues/pendientes.md#issue-16-gestión-de-nombres-de-múltiples-monstruos-debería-estar-en-un-módulo-separado)
- [Issue #22: Sistema completo de Saving Throws](../tracking/issues/pendientes.md#issue-22-sistema-completo-de-saving-throws-tiradas-de-salvación-del-objetivo-feature-incompleta)
- [Plan: Sistema de Turnos Paso a Paso](../completados/sistema-turnos-paso-a-paso.md) ✅ **COMPLETADO**
- [Plan Maestro](../plan-maestro.md)

---

## ✅ Checklist de Implementación

### Fase 1: Extracción de Funciones Helper
- [x] Crear `src/lib/combat/monster-name-manager.ts` ✅
- [x] Extraer funciones de gestión de nombres ✅ (5 funciones, 248 líneas)
- [x] Actualizar referencias en `combat-manager.ts` ✅
- [x] Testing de funciones extraídas ✅
- [x] Crear `src/lib/combat/monster-stats-parser.ts` ✅
- [x] Extraer funciones de parseo de stats ✅ (4 funciones + cachés, 234 líneas)
- [x] Actualizar referencias en `combat-manager.ts` ✅
- [x] Testing de funciones extraídas ✅
- [x] Crear `src/lib/combat/target-resolver.ts` ✅
- [x] Extraer funciones de resolución de objetivos ✅ (1 función, 92 líneas)
- [x] Actualizar referencias en `combat-manager.ts` ✅
- [x] Testing de funciones extraídas ✅
- [x] Crear `src/ai/tools/combat/combat-validators.ts` ✅
- [x] Extraer funciones de validación ✅ (4 funciones, 106 líneas)
- [x] Actualizar referencias en `combat-manager.ts` ✅
- [x] Testing de funciones extraídas ✅

**🎉 FASE 1 COMPLETADA**  
**Reducción total: 2723 → 2033 líneas (690 líneas, 25% del módulo original)**

### Fase 2: Extracción de Lógica de Procesamiento
- [x] Crear `src/ai/tools/combat/dice-roll-processor.ts` ✅
- [x] Extraer lógica de procesamiento de rolls ✅ (función centralizada de 630 líneas)
- [x] Eliminar código duplicado (Issue #21) ✅ (~798 líneas eliminadas)
- [x] Actualizar referencias en `combat-manager.ts` ✅ (turnos normales + iniciación)
- [x] Testing de procesamiento de rolls ✅
- [x] ~Crear `src/ai/tools/combat/damage-applicator.ts`~ ❌ Cancelado (redundante)
- [x] ~Extraer lógica de aplicación de daño/curación~ ❌ Cancelado (ya incluido en dice-roll-processor)
  
**🎉 FASE 2 COMPLETADA**  
**Reducción adicional: 2033 → 1235 líneas (798 líneas, 39% reducción)**  
**Issue #21 RESUELTO: Código duplicado completamente eliminado**  
**Testing: 10/10 tests PASS — Sin regresiones**

### Fase 3: Extracción de Lógica de Combate ⏸️ **PAUSADA** (Opcional/Futuro)
- [ ] Crear `src/ai/tools/combat/combat-state.ts`
- [ ] Extraer lógica de gestión de estado
- [ ] Actualizar referencias en `combat-manager.ts`
- [ ] Testing de gestión de estado
- [ ] Crear `src/ai/tools/combat/combat-turn-processor.ts`
- [ ] Extraer lógica de procesamiento de turnos
- [ ] Actualizar referencias en `combat-manager.ts`
- [ ] Testing de procesamiento de turnos
- [ ] Crear `src/ai/tools/combat/combat-initiation.ts`
- [ ] Extraer lógica de iniciación de combate
- [ ] Actualizar referencias en `combat-manager.ts`
- [ ] Testing de iniciación de combate

**Nota:** Esta fase ha sido pausada para priorizar la implementación del sistema de turnos paso a paso (Prioridad Muy Alta). La refactorización completada hasta ahora (Fases 1-2, 54.6% de reducción) es suficiente para implementar turnos paso a paso. La Fase 3 se podrá retomar en el futuro si se considera necesaria.

### Fase 4: Refactorización del Módulo Principal
- [ ] Refactorizar `combat-manager.ts` como orquestador
- [ ] Reducir a ~300-400 líneas
- [ ] Verificar que todas las funcionalidades se mantienen
- [ ] Testing de integración completo

### Fase 5: Testing y Validación
- [ ] Testing manual completo
- [ ] Testing de integración
- [ ] Verificar que no hay regresiones
- [ ] Actualizar documentación
- [ ] Actualizar referencias en otros documentos
- [ ] Código revisado y sin errores de linting

---

## 🧪 Hallazgos Durante Testing

### Resumen de Tests

**✅ TODOS LOS TESTS COMPLETADOS (10/10) — 100% PASS**

- ✅ **Test 1:** Combate básico con Enemy AI — PASS
- ✅ **Test 2:** Múltiples enemigos del mismo tipo — PASS (después de fix Issue #34)
- ✅ **Test 3:** [Completado] — PASS
- ✅ **Test 4:** [Completado] — PASS
- ✅ **Test 5:** [Completado] — PASS
- ✅ **Test 6:** [Completado] — PASS
- ✅ **Test 7:** [Completado] — PASS
- ✅ **Test 8:** [Completado] — PASS
- ✅ **Test 9:** [Completado] — PASS
- ✅ **Test 10:** [Completado] — PASS

**Resultado:** Sin regresiones detectadas. Todos los módulos extraídos en Fase 1 y Fase 2 funcionan correctamente.

**Última actualización:** 2025-11-14

---

### Test 1: Combate básico con Enemy AI — ✅ PASS
- **Estado:** Completado sin regresiones
- **Observaciones:** Todos los módulos extraídos funcionan correctamente (MonsterStatsParser, MonsterNameManager, DiceRollProcessor, TargetResolver, CombatValidators)
- **Verificaciones exitosas:**
  - Tirada de iniciativa correcta
  - Enemigo hace tirada de ataque con AC visible
  - Enemigo hace tirada de daño solo si ataque acierta
  - HP se actualiza correctamente
  - Mensaje de muerte cuando llega a 0 HP
  - Saving throw spells funcionan correctamente

### Test 2: Múltiples enemigos del mismo tipo — ✅ PASS (después de fix)
- **Estado:** Completado después de corregir Issue #34
- **Bug encontrado (NO relacionado con refactoring):** La AI del `enemyTacticianTool` estaba traduciendo/inventando nombres en su narración (e.g., "Gnomo 1" en lugar de "Goblin 1")
- **Causa:** El prompt no instruía explícitamente a usar el nombre exacto del combatiente activo
- **Fix aplicado:** Añadida instrucción explícita en el prompt de `enemyTacticianTool`
- **Verificaciones exitosas:**
  - Nombres diferenciados correctos (Goblin 1, Goblin 2, Orco 1)
  - Referencias ordinales procesadas correctamente
  - Narración de enemigos usa nombres exactos
  - Sistema de nombres funciona con múltiples enemigos del mismo tipo
- **Referencia:** CHANGELOG [Unreleased], Issue #34

### Bugs adicionales encontrados durante testing (NO relacionados con refactoring)

Durante los tests se encontraron **4 problemas adicionales** relacionados con el sistema de inconsciencia/muerte implementado en Issue #27:

#### Issue #35: Orden incorrecto de mensajes cuando personaje cae a 0 HP 🟡 ALTA
- **Problema:** Los mensajes de inconsciencia aparecen en orden incorrecto y con texto incorrecto
- **Secuencia actual (incorrecta):**
  1. Narración del orco
  2. "Orco 1 ataca a Merryl y acierta"
  3. ❌ "Merryl cae inconsciente" (PREMATURO)
  4. "Orco 1 ha hecho 10 puntos de daño a Merryl (8 → 0 HP)"
  5. ❌ "¡Orco 1 ha matado a Merryl!" (INCORRECTO)
- **Secuencia esperada (correcta):**
  1. Narración del orco
  2. "Orco 1 ataca a Merryl y acierta"
  3. "Orco 1 ha hecho 10 puntos de daño a Merryl (8 → 0 HP)"
  4. ✅ "¡Orco 1 ha dejado inconsciente a Merryl!"
  5. ✅ "Merryl cae inconsciente"
- **Ubicación:** `dice-roll-processor.ts`

#### Issue #36: Mensaje "ha matado" cuando personaje está inconsciente 🟡 ALTA
- **Problema:** Sistema dice "ha matado" cuando debería decir "ha dejado inconsciente"
- **Ejemplo:** "¡Orco 1 ha matado a Merryl!" ❌ (Merryl está inconsciente, no muerto)
- **Ubicación:** `dice-roll-processor.ts` línea ~487

#### Issue #37: Mensaje "está muerto" cuando personaje está inconsciente 🟡 ALTA
- **Problema:** Sistema dice "está muerto y no puede actuar" cuando debería decir "está inconsciente"
- **Ejemplo:** "Merryl está muerto y no puede actuar" ❌ (Merryl está inconsciente)
- **Ubicación:** `combat-manager.ts` (verificación de turno)

#### Issue #38: Auto-redirección de ataque a enemigo diferente 🟢 MEDIA
- **Problema:** Si jugador ataca a enemigo muerto, sistema redirige silenciosamente a otro enemigo
- **Decisión de diseño pendiente:** ¿Informar al jugador? ¿Pedir confirmación?
- **Ubicación:** `action-interpreter.ts`, `target-resolver.ts`

**Referencia:** Issues #35, #36, #37, #38 en `docs/tracking/issues/pendientes.md`

---

**Última actualización:** 2025-11-14  
**Estado:** ⏸️ Pausado (Fases 1-2 ✅ completadas, Fase 3 opcional)  
**Prioridad:** Media (pausado para priorizar turnos paso a paso)  
**Estimación Total:** 31-45 horas (completadas: 13-20 horas, restantes: 18-25 horas)

---

## 🎉 Conclusión de Fases 1-2

### Resultados alcanzados

- **Reducción de código:** 2723 → 1235 líneas (54.6% de reducción)
- **Módulos creados:** 5 módulos especializados
  - `monster-name-manager.ts` (248 líneas)
  - `monster-stats-parser.ts` (234 líneas)
  - `target-resolver.ts` (92 líneas)
  - `combat-validators.ts` (106 líneas)
  - `dice-roll-processor.ts` (630 líneas)
- **Testing:** 10/10 tests PASS — Sin regresiones
- **Issues resueltos:** #21 (código duplicado), #16 (gestión de nombres)
- **Código duplicado eliminado:** ~798 líneas

### Decisión de pausar Fase 3

**Razón:** La Fase 3 no es necesaria para implementar el sistema de turnos paso a paso (Prioridad Muy Alta). El módulo ya está en mejor estado (54.6% de reducción) y la implementación de turnos paso a paso solo requiere modificar el bucle de turnos existente, no extraer toda la lógica a módulos separados.

**Siguiente paso:** ✅ **COMPLETADO** - [Sistema de Turnos Paso a Paso](../completados/sistema-turnos-paso-a-paso.md) implementado exitosamente sobre la arquitectura mejorada.

**Fase 3 en el futuro:** Se puede retomar si se considera necesaria después de implementar turnos paso a paso.

