# Plan de Acción: Sistema de Turnos Paso a Paso en Combate

Este documento detalla los pasos necesarios para implementar un sistema de turnos de combate donde cada turno se ejecuta individualmente y el jugador tiene control manual para avanzar turno por turno, en lugar de mostrar todos los turnos de golpe.

**Prioridad:** Muy Alta  
**Estado:** En Curso  
**Referencia:** Issue #22 en Notas de Gael

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

- [ ] Paso 1: Modificar bucle de turnos en backend
- [ ] Paso 2: Crear acción de "Pasar Turno" en frontend
- [ ] Paso 3: Modificar flujo de coordinación del juego
- [ ] Paso 4: Actualizar UI del tracker de iniciativa
- [ ] Paso 5: Manejar reacciones entre turnos (opcional)
- [ ] Paso 6: Pruebas y validación
- [ ] Documentación actualizada
- [ ] Código revisado y sin errores de linting
- [ ] Pruebas manuales completadas
- [ ] Plan movido a `completados/` cuando esté finalizado

---

**Última actualización:** [Fecha de creación del plan]  
**Estado:** En Curso  
**Prioridad:** Muy Alta

