# Plan de Acción: Sistema de Turnos Paso a Paso en Combate

Este documento detalla los pasos necesarios para implementar un sistema de turnos de combate donde cada turno se ejecuta individualmente y el jugador tiene control manual para avanzar turno por turno, en lugar de mostrar todos los turnos de golpe.

**Prioridad:** Muy Alta  
**Estado:** ✅ IMPLEMENTADO (Funcional, pulido pendiente)  
**Referencia:** Issue #22 en Notas de Gael  
**Nota:** Implementado sobre la arquitectura mejorada del `combat-manager.ts` (Fases 1-2 de refactorización completadas, 54.6% de reducción). La Fase 3 de refactorización no fue necesaria para esta implementación.

**Fecha de implementación:** 2025-11-14  
**Fecha de finalización:** 2025-11-14

---

## 🎯 Objetivo

Transformar el sistema de combate actual que ejecuta todos los turnos de IA de golpe hasta llegar al jugador, en un sistema donde:
- Cada turno se ejecuta y muestra individualmente
- El jugador puede observar cada turno con detalle antes de que continúe el siguiente
- El jugador tiene control manual para avanzar turnos (botón "Pasar Turno" o similar)
- Permite reacciones entre turnos
- Es más inmersivo y similar a D&D de mesa

---

## 📊 Estado Actual del Sistema

### Comportamiento Actual
- El `combatManagerTool` ejecuta un bucle `while` que procesa todos los turnos de IA (compañeros y enemigos) de golpe
- Todos los turnos se procesan en el servidor antes de devolver la respuesta
- El frontend recibe todos los mensajes, tiradas y cambios de estado de golpe
- El jugador ve el resultado completo de todos los turnos antes de poder actuar

### Ubicación del Código Actual
- **Backend:** `src/ai/tools/combat-manager.ts` - Líneas ~764-1100 (bucle while de turnos de IA)
- **Frontend:** `src/components/game/game-view.tsx` - Manejo de respuestas del combate

---

## 🔄 Cambios Requeridos

### Cambio Fundamental
En lugar de ejecutar todos los turnos de IA en un bucle continuo, el sistema debe:
1. Ejecutar **un solo turno** por llamada
2. Devolver el estado inmediatamente después de ese turno
3. Esperar a que el jugador avance manualmente al siguiente turno
4. Repetir hasta llegar al turno del jugador

---

## 🎨 Diseño Técnico Detallado

### Análisis del Código Actual

El módulo `combat-manager.ts` tiene **2 bucles `while` idénticos** que procesan turnos de IA:

1. **Bucle 1 (línea ~495):** Para combate en curso (después de turno del jugador)
2. **Bucle 2 (línea ~1034):** Para iniciación de combate

**Código actual:**
```typescript
while(activeCombatant && activeCombatant.controlledBy === 'AI' && !combatHasEnded) {
    // 1. Verificar si combatiente está muerto/inconsciente → skip
    // 2. Obtener nombres visuales de enemigos
    // 3. Invocar tactician (enemigo o compañero)
    // 4. Procesar narración
    // 5. Procesar rolls (ataque/daño/curación)
    // 6. Avanzar turnIndex
}
// Retornar después de procesar TODOS los turnos de IA
```

**Problema:** Ejecuta todos los turnos de IA en secuencia antes de retornar, el jugador ve todos los resultados de golpe.

### Solución: Cambio `while` → `if`

**Nueva estructura:**
```typescript
if(activeCombatant && activeCombatant.controlledBy === 'AI' && !combatHasEnded) {
    // 1. Verificar si combatiente está muerto/inconsciente → skip pero RETORNAR
    // 2. Obtener nombres visuales de enemigos
    // 3. Invocar tactician (enemigo o compañero)
    // 4. Procesar narración
    // 5. Procesar rolls (ataque/daño/curación)
    // 6. Avanzar turnIndex
    // 7. RETORNAR INMEDIATAMENTE con flag `hasMoreAITurns: true`
}
// Retornar después de procesar UN SOLO turno
```

### Flujo de Ejecución

**Antes (todos los turnos de golpe):**
```
Player Action → [AI-1, AI-2, AI-3, AI-4] → Player Turn
                ^^^^^^^^^^^^^^^^^^^^^^^^
                Todos procesados en una llamada
```

**Después (un turno a la vez):**
```
Player Action → AI-1 (return hasMoreAITurns=true)
Frontend recibe → muestra turno → jugador presiona "Pasar Turno"
→ AI-2 (return hasMoreAITurns=true)
Frontend recibe → muestra turno → jugador presiona "Pasar Turno"
→ AI-3 (return hasMoreAITurns=true)
Frontend recibe → muestra turno → jugador presiona "Pasar Turno"
→ AI-4 (return hasMoreAITurns=false) → Player Turn
```

### Cambios Técnicos Específicos

#### Backend: `src/ai/tools/combat-manager.ts`

**1. Modificar Output Schema:**
```typescript
export const CombatManagerOutputSchema = z.object({
    // ... campos existentes ...
    hasMoreAITurns: z.boolean().optional(), // ← NUEVO CAMPO
});
```

**2. Cambiar bucle 1 (combate en curso, línea ~495):**

**De:**
```typescript
while(activeCombatant && activeCombatant.controlledBy === 'AI' && !combatHasEnded) {
    // ... procesamiento del turno (~210 líneas) ...
    
    // Avanzar turno al final del bucle
    if (!combatHasEnded) {
        currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
        activeCombatant = initiativeOrder[currentTurnIndex];
    }
}

// Retornar después del bucle
return { messages, diceRolls, inCombat: true, ... };
```

**A:**
```typescript
// Ejecutar SOLO un turno de IA (si corresponde)
if(activeCombatant && activeCombatant.controlledBy === 'AI' && !combatHasEnded) {
    // ... procesamiento del turno (mismo código, ~210 líneas) ...
    
    // Avanzar turno
    if (!combatHasEnded) {
        currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
        activeCombatant = initiativeOrder[currentTurnIndex];
    }
    
    // Verificar si el siguiente turno es también de IA
    const hasMoreAITurns = activeCombatant && activeCombatant.controlledBy === 'AI' && !combatHasEnded;
    
    // RETORNAR INMEDIATAMENTE después de procesar este turno
    return { 
        messages, 
        diceRolls, 
        inCombat: true, 
        turnIndex: currentTurnIndex, 
        initiativeOrder, 
        updatedParty, 
        updatedEnemies,
        hasMoreAITurns, // ← NUEVO CAMPO
    };
}

// Si no es turno de IA, retornar normalmente
return { 
    messages, 
    diceRolls, 
    inCombat: true, 
    turnIndex: currentTurnIndex, 
    initiativeOrder, 
    updatedParty, 
    updatedEnemies,
    hasMoreAITurns: false,
};
```

**3. Cambiar bucle 2 (iniciación de combate, línea ~1034):**

**Mismo cambio que el bucle 1**, con las variables locales correspondientes (`newInitiativeOrder` en lugar de `initiativeOrder`, etc.)

**4. Manejo de combatientes muertos/inconscientes:**

**Actualmente:**
```typescript
if (activeCombatantData && activeCombatantData.hp.current <= 0) {
    messages.push({ sender: 'DM', content: '...' });
    currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
    activeCombatant = initiativeOrder[currentTurnIndex];
    continue; // ← Continúa al siguiente turno en el bucle
}
```

**Cambiar a:**
```typescript
if (activeCombatantData && activeCombatantData.hp.current <= 0) {
    messages.push({ sender: 'DM', content: '...' });
    currentTurnIndex = (currentTurnIndex + 1) % initiativeOrder.length;
    activeCombatant = initiativeOrder[currentTurnIndex];
    
    // Verificar si el siguiente turno es también de IA
    const hasMoreAITurns = activeCombatant && activeCombatant.controlledBy === 'AI' && !combatHasEnded;
    
    // RETORNAR (no continuar bucle)
    return { 
        messages, 
        diceRolls, 
        inCombat: true, 
        turnIndex: currentTurnIndex, 
        initiativeOrder, 
        updatedParty, 
        updatedEnemies,
        hasMoreAITurns,
    };
}
```

#### Frontend: `src/components/game/game-view.tsx`

**1. Detectar `hasMoreAITurns`:**

Cuando el frontend recibe la respuesta del `combatManagerTool`:

```typescript
const result = await processPlayerAction(action);

// Si hay más turnos de IA pendientes, automáticamente continuar
if (result.hasMoreAITurns) {
    // Opción A: Avanzar automáticamente después de un pequeño delay (para que el jugador pueda leer)
    setTimeout(() => {
        processPlayerAction('continuar_turnos'); // Acción especial
    }, 1500); // 1.5 segundos de delay
    
    // Opción B: Mostrar botón "Pasar Turno" para que el jugador avance manualmente
    setShowPassTurnButton(true);
}
```

**2. Botón "Pasar Turno":**

```tsx
{inCombat && showPassTurnButton && (
    <button 
        onClick={() => processPlayerAction('continuar_turnos')}
        disabled={isProcessing}
    >
        Pasar Turno ▶
    </button>
)}
```

**3. Acción "continuar_turnos":**

Esta acción especial indica al backend que continúe procesando el siguiente turno sin acción del jugador:

```typescript
// En el action-interpreter o en el processPlayerAction
if (playerAction === 'continuar_turnos' || playerAction === 'pasar turno') {
    // No interpretar acción, solo llamar al combatManagerTool con el estado actual
    return { actionType: 'continue_turn' };
}
```

### Casos de Prueba

1. **Test 1: Combate con 1 enemigo**
   - Jugador ataca → Enemigo ataca (1 turno) → Jugador ataca
   - Verificar: 1 turno de IA procesado, `hasMoreAITurns=false`

2. **Test 2: Combate con múltiples enemigos**
   - Jugador ataca → Enemigo 1 ataca (1 turno) → [espera] → Enemigo 2 ataca (1 turno) → [espera] → Jugador ataca
   - Verificar: 2 turnos de IA procesados individualmente, `hasMoreAITurns=true` luego `false`

3. **Test 3: Combate con compañero**
   - Jugador ataca → Compañero cura/ataca (1 turno) → [espera] → Enemigo ataca (1 turno) → [espera] → Jugador ataca
   - Verificar: Turnos de compañero y enemigo procesados individualmente

4. **Test 4: Enemigo muerto salta turno**
   - Jugador mata enemigo → Enemigo muerto (mensaje "está muerto", skip turno, retornar) → Siguiente turno
   - Verificar: Mensaje de muerte, turno saltado correctamente, `hasMoreAITurns` correcto

5. **Test 5: Fin de combate en turno de IA**
   - Compañero mata último enemigo → Combate termina
   - Verificar: `inCombat=false`, no más turnos

6. **Test 6: Iniciación de combate con IA primero**
   - Iniciar combate → IA tiene iniciativa más alta → Procesar 1 turno de IA → Retornar
   - Verificar: Solo 1 turno procesado al iniciar

### Notas de Implementación

**Compatibilidad:**
- El input schema no cambia
- El output schema solo añade un campo opcional `hasMoreAITurns`
- El frontend puede ignorar el campo si no está implementado aún
- Los tests existentes seguirán funcionando (solo verán 1 turno a la vez en lugar de todos)

**Rollback:**
Si necesitamos revertir el cambio:
1. Cambiar los `if` de vuelta a `while`
2. Eliminar el campo `hasMoreAITurns` del output
3. Listo

**Performance:**
- **Antes:** 1 llamada grande (procesar N turnos)
- **Después:** N llamadas pequeñas (1 turno cada una)
- **Resultado:** Menor latencia percibida (el jugador ve resultados más rápido), misma cantidad total de procesamiento

---

## 📋 Pasos de Implementación

### **Paso 1: Modificar el Bucle de Turnos en el Backend**

**Objetivo:** Cambiar el bucle `while` que ejecuta todos los turnos de IA para que ejecute solo un turno por llamada.

**Ubicación:** `src/ai/tools/combat-manager.ts`

- [ ] **Identificar el bucle actual:**
  - [ ] Localizar el bucle `while` que procesa turnos de IA (aproximadamente líneas 800-1100)
  - [ ] Documentar la lógica actual del bucle
  - [ ] Identificar dónde se avanza el `currentTurnIndex`

- [ ] **Modificar la lógica del bucle:**
  - [ ] Cambiar el bucle `while` para que ejecute **solo un turno** por iteración
  - [ ] Después de procesar un turno de IA, retornar inmediatamente con el estado actualizado
  - [ ] Mantener el `turnIndex` actualizado para que el siguiente turno sepa dónde continuar
  - [ ] Asegurar que se verifica `checkEndOfCombat()` después de cada turno

- [ ] **Manejar el turno del jugador:**
  - [ ] Si el siguiente turno es del jugador, retornar sin procesar más turnos
  - [ ] Si el turno actual es del jugador y hay una acción, procesarla y luego avanzar
  - [ ] Si el turno actual es del jugador pero no hay acción, retornar esperando su input

- [ ] **Añadir flag para control de flujo:**
  - [ ] Considerar añadir un parámetro opcional `executeSingleTurn: boolean` al input del `combatManagerTool`
  - [ ] Si `executeSingleTurn === true`, ejecutar solo un turno y retornar
  - [ ] Si `executeSingleTurn === false` o no está presente, mantener comportamiento actual (para compatibilidad)

**Verificación:**
- [ ] El backend ejecuta solo un turno por llamada
- [ ] El `turnIndex` se actualiza correctamente después de cada turno
- [ ] El estado se devuelve correctamente después de cada turno
- [ ] La verificación de fin de combate funciona después de cada turno

---

### **Paso 2: Crear Acción de "Pasar Turno" en el Frontend**

**Objetivo:** Implementar un botón o mecanismo para que el jugador pueda avanzar manualmente al siguiente turno.

**Ubicación:** `src/components/game/game-view.tsx` y posiblemente `src/components/game/player-input.tsx`

- [ ] **Añadir botón "Pasar Turno" o "Siguiente Turno":**
  - [ ] Crear un botón visible solo durante combate cuando NO es el turno del jugador
  - [ ] El botón debe estar deshabilitado cuando es el turno del jugador
  - [ ] El botón debe estar deshabilitado mientras se procesa un turno (loading state)

- [ ] **Implementar la función de pasar turno:**
  - [ ] Crear función `handlePassTurn()` que llame a `processPlayerAction` con una acción especial
  - [ ] La acción especial puede ser algo como `"pasar_turno"` o `"siguiente_turno"`
  - [ ] Esta acción debe indicar al backend que ejecute el siguiente turno de IA
  - [ ] No debe requerir input del jugador, solo avanzar el combate

- [ ] **Manejar el estado de carga:**
  - [ ] Mostrar indicador de carga mientras se procesa un turno
  - [ ] Deshabilitar el botón durante el procesamiento
  - [ ] Mostrar mensaje como "Procesando turno de [Nombre]..." si es apropiado

- [ ] **Integrar con el sistema de mensajes:**
  - [ ] Asegurar que los mensajes del turno se muestran correctamente
  - [ ] Asegurar que las tiradas de dados se muestran correctamente
  - [ ] Asegurar que los cambios de HP se reflejan en la UI

**Verificación:**
- [ ] El botón aparece solo cuando es apropiado (combate activo, no es turno del jugador)
- [ ] El botón funciona correctamente y avanza al siguiente turno
- [ ] El estado de carga se muestra correctamente
- [ ] Los mensajes y tiradas se muestran correctamente después de cada turno

---

### **Paso 3: Modificar el Flujo de Coordinación del Juego**

**Objetivo:** Asegurar que el `game-coordinator` maneje correctamente las acciones de "pasar turno" y las distinga de acciones normales del jugador.

**Ubicación:** `src/ai/flows/game-coordinator.ts`

- [ ] **Detectar acción de "pasar turno":**
  - [ ] Identificar cuando `playerAction` es una acción especial de pasar turno
  - [ ] En este caso, NO llamar al `actionInterpreter` (no es necesario interpretar la acción)
  - [ ] Pasar directamente al `combatManagerTool` con el estado actual

- [ ] **Manejar el flujo de combate:**
  - [ ] Si `inCombat === true` y la acción es "pasar turno", llamar directamente a `combatManagerTool`
  - [ ] Si `inCombat === true` y la acción es normal del jugador, procesar normalmente
  - [ ] Asegurar que el `turnIndex` y `initiativeOrder` se pasan correctamente

- [ ] **Manejar el caso del turno del jugador:**
  - [ ] Si es el turno del jugador y envía una acción normal, procesarla
  - [ ] Después de procesar la acción del jugador, avanzar al siguiente turno automáticamente
  - [ ] O permitir que el jugador pase manualmente después de su acción (según diseño)

**Verificación:**
- [ ] Las acciones de "pasar turno" se detectan correctamente
- [ ] El flujo de combate funciona correctamente con acciones normales y de pasar turno
- [ ] El turno del jugador se maneja correctamente

---

### **Paso 4: Actualizar la UI del Tracker de Iniciativa**

**Objetivo:** Asegurar que el tracker de iniciativa muestre correctamente qué turno está activo y se actualice después de cada turno.

**Ubicación:** `src/components/game/initiative-tracker.tsx`

- [ ] **Verificar resaltado del turno activo:**
  - [ ] Asegurar que el combatiente activo se resalta correctamente
  - [ ] Asegurar que el resaltado se actualiza después de cada turno
  - [ ] Verificar que funciona correctamente con el nuevo sistema de turnos paso a paso

- [ ] **Añadir indicadores visuales (opcional):**
  - [ ] Considerar añadir un indicador de "Esperando..." cuando es el turno del jugador
  - [ ] Considerar añadir animación sutil cuando cambia el turno activo
  - [ ] Considerar mostrar un indicador de "Procesando..." durante el turno de IA

**Verificación:**
- [ ] El tracker muestra correctamente el turno activo
- [ ] El resaltado se actualiza correctamente después de cada turno
- [ ] Los indicadores visuales funcionan correctamente (si se implementan)

---

### **Paso 5: Manejar Reacciones Entre Turnos (Opcional - Futuro)**

**Objetivo:** Permitir que el jugador pueda realizar reacciones (como ataques de oportunidad) entre turnos de otros combatientes.

**Nota:** Este paso es opcional y puede implementarse en el futuro. Se documenta aquí para referencia.

- [ ] **Definir qué acciones son reacciones:**
  - [ ] Identificar acciones que pueden realizarse fuera del turno (ataques de oportunidad, hechizos de reacción, etc.)
  - [ ] Documentar las reglas de D&D 5e para reacciones

- [ ] **Implementar sistema de reacciones:**
  - [ ] Añadir UI para ofrecer reacciones al jugador cuando sea apropiado
  - [ ] Modificar el flujo de combate para pausar y permitir reacciones
  - [ ] Procesar reacciones antes de continuar con el siguiente turno

**Verificación:**
- [ ] Las reacciones se ofrecen correctamente cuando es apropiado
- [ ] Las reacciones se procesan correctamente
- [ ] El flujo de combate continúa correctamente después de las reacciones

---

### **Paso 6: Pruebas y Validación**

**Objetivo:** Asegurar que el sistema funciona correctamente en todos los escenarios.

- [ ] **Pruebas básicas:**
  - [ ] Iniciar un combate y verificar que el primer turno se ejecuta correctamente
  - [ ] Verificar que el botón "Pasar Turno" aparece cuando es apropiado
  - [ ] Verificar que se puede avanzar turno por turno correctamente
  - [ ] Verificar que el turno del jugador se maneja correctamente

- [ ] **Pruebas de flujo completo:**
  - [ ] Ejecutar un combate completo turno por turno
  - [ ] Verificar que todos los turnos se ejecutan en el orden correcto
  - [ ] Verificar que el fin de combate se detecta correctamente
  - [ ] Verificar que el estado se limpia correctamente al terminar el combate

- [ ] **Pruebas de casos edge:**
  - [ ] Verificar comportamiento cuando un combatiente muere durante su turno
  - [ ] Verificar comportamiento cuando todos los enemigos mueren
  - [ ] Verificar comportamiento cuando todos los aliados mueren
  - [ ] Verificar comportamiento con múltiples compañeros de IA
  - [ ] Verificar comportamiento con múltiples enemigos

- [ ] **Pruebas de UI:**
  - [ ] Verificar que los mensajes se muestran correctamente después de cada turno
  - [ ] Verificar que las tiradas de dados se muestran correctamente
  - [ ] Verificar que los cambios de HP se reflejan en la UI
  - [ ] Verificar que el tracker de iniciativa se actualiza correctamente

**Verificación:**
- [ ] Todas las pruebas básicas pasan
- [ ] Todos los flujos completos funcionan correctamente
- [ ] Todos los casos edge se manejan correctamente
- [ ] La UI se actualiza correctamente en todos los casos

---

## 🔧 Consideraciones Técnicas

### Compatibilidad con el Sistema Actual

- **Opción 1: Modo Dual (Recomendado)**
  - Mantener el comportamiento actual como opción (modo "automático")
  - Añadir el nuevo comportamiento como opción (modo "paso a paso")
  - Permitir cambiar entre modos mediante configuración o flag

- **Opción 2: Reemplazo Completo**
  - Reemplazar completamente el sistema actual
  - Simplifica el código pero elimina la opción de ejecución automática

**Recomendación:** Implementar Opción 1 para mantener flexibilidad y permitir que los usuarios elijan su preferencia.

### Manejo de Estado

- El `turnIndex` debe mantenerse sincronizado entre frontend y backend
- El `initiativeOrder` debe mantenerse consistente
- Los cambios de HP y estado deben reflejarse inmediatamente después de cada turno

### Performance

- Cada turno requiere una llamada al servidor
- Esto puede aumentar la latencia percibida
- Considerar optimizaciones como:
  - Caché de resultados cuando sea apropiado
  - Optimización de las llamadas a la IA
  - Reducción de datos transferidos en cada llamada

---

## 📝 Notas de Diseño

### Experiencia de Usuario

- **Feedback Visual:** El jugador debe tener claro qué está pasando en cada momento
  - Indicador claro de qué turno está activo
  - Mensajes claros sobre las acciones que se están realizando
  - Feedback inmediato sobre los resultados de cada turno

- **Control del Jugador:**
  - El botón "Pasar Turno" debe ser claro y fácil de encontrar
  - El jugador debe poder ver el estado completo del combate en todo momento
  - El jugador debe poder revisar los mensajes y tiradas de turnos anteriores

- **Velocidad:**
  - Permitir que el jugador avance turnos a su propio ritmo
  - No forzar esperas innecesarias
  - Considerar opción de "avance rápido" para turnos de IA (futuro)

---

## 🐛 Posibles Problemas y Soluciones

### Problema 1: Estado Desincronizado
**Síntoma:** El frontend y backend tienen estados diferentes de `turnIndex` o `initiativeOrder`  
**Solución:** Asegurar que el estado se sincroniza correctamente en cada llamada

### Problema 2: Turnos Perdidos
**Síntoma:** Algunos turnos no se ejecutan o se saltan  
**Solución:** Verificar la lógica de avance de `turnIndex` y asegurar que se actualiza correctamente

### Problema 3: Botón No Aparece o No Funciona
**Síntoma:** El botón "Pasar Turno" no aparece o no funciona correctamente  
**Solución:** Verificar las condiciones de visibilidad del botón y la función `handlePassTurn()`

### Problema 4: Mensajes Duplicados o Faltantes
**Síntoma:** Los mensajes no se muestran correctamente después de cada turno  
**Solución:** Verificar que los mensajes se añaden correctamente al array y se envían al frontend

---

## 📚 Referencias

- [Plan de Combate por Turnos Completado](../completados/combate-turnos.md) - Sistema actual de turnos
- [Notas de Gael](../../trabajo/Notas%20de%20Gael.txt) - Issue #22
- [Plan Maestro](../plan-maestro.md) - Prioridades y estado general
- [Visión de Diseño](../../vision-diseno.md) - Prioridad Alta mencionada

---

## ✅ Checklist de Implementación

### Backend
- [x] Modificar `CombatManagerOutputSchema` (añadir `hasMoreAITurns`)
- [x] Cambiar bucle 1 (`while` → `if`, línea ~495)
- [x] Cambiar bucle 2 (`while` → `if`, línea ~1034)
- [x] Modificar manejo de combatientes muertos (retornar en lugar de `continue`)

### Frontend
- [x] Implementar detección de `hasMoreAITurns` en `game-view.tsx`
- [x] Implementar estados `hasMoreAITurns` y `autoAdvancing`
- [x] Implementar botón "Pasar 1 Turno" en `chat-panel.tsx`
- [x] Implementar botón "Avanzar Todos" en `chat-panel.tsx` (avance automático con delay 1.5s)
- [x] Implementar acción especial "continuar_turnos" en `game-coordinator.ts`

### Testing
- [ ] Testing de backend (Unit tests) - **Pendiente para futuro**
- [ ] Testing de frontend (E2E tests) - **Pendiente para futuro**
- [x] Testing manual básico completado (funcionalidad mínima verificada)
- [ ] Testing completo de integración (6 casos de prueba) - **Pendiente para futuro**
  - [ ] Test 1: Combate con 1 enemigo
  - [ ] Test 2: Combate con múltiples enemigos
  - [ ] Test 3: Combate con compañero
  - [ ] Test 4: Enemigo muerto salta turno
  - [ ] Test 5: Fin de combate en turno de IA
  - [ ] Test 6: Iniciación de combate con IA primero

### Finalización
- [x] Documentación actualizada
- [x] Código revisado y sin errores de linting
- [x] Pruebas manuales básicas completadas (funcionalidad mínima verificada)
- [ ] Pulido y optimización - **Pendiente para futuro**
- [x] Plan movido a `completados/` - **2025-11-14**

---

**Última actualización:** 2025-11-14  
**Estado:** ✅ COMPLETADO (Funcional, pulido pendiente)  
**Prioridad:** Muy Alta  
**Tiempo invertido:** ~4-6 horas  
**Riesgo:** Bajo (cambio aislado, fácil de revertir)  
**Ubicación:** `docs/planes-desarrollo/completados/sistema-turnos-paso-a-paso.md`

**Notas finales:**
- ✅ La funcionalidad básica está implementada y funcionando
- ✅ Se corrigieron problemas de sincronización de estado usando refs para acceso síncrono
- ✅ Los botones "Pasar 1 Turno" y "Avanzar Todos" funcionan correctamente
- ⏳ Pendientes para futuro: pruebas exhaustivas, pulido de UX, y optimizaciones menores

