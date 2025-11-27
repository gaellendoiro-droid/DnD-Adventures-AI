# Issues Pendientes

> ⚠️ **IMPORTANTE:** Cada vez que se modifique este archivo (añadir, mover o actualizar issues), **debe actualizarse también el [README.md](./README.md)** de esta carpeta con las estadísticas y enlaces actualizados.

> ✅ **NOTA:** Si un issue se completa o resuelve, **debe moverse al archivo [corregidos.md](./corregidos.md)**. Este archivo (`pendientes.md`) solo debe contener issues que aún están pendientes de resolver.

---

Issues que aún no han sido resueltos y requieren atención. Ordenados por prioridad (PMA → PA → PM → PB → PMB).

**Total:** 11 issues  
**Última actualización:** 2025-01-27 (Issue #15 resuelto y movido a corregidos)

---

## 🔴 Prioridad Muy Alta (PMA) - Críticos

> No hay issues críticos pendientes actualmente.

## 🟡 Prioridad Alta (PA) - Advertencias

> No hay issues de prioridad alta pendientes actualmente.

---


## 🟢 Prioridad Media (PM) - Mejoras

### Issue #116: DM narra palabras textuales de compañeros cuando tienen su propia voz 🟢 MEJORA

- **Fecha de creación:** 2025-01-20
- **Ubicación:** `src/ai/flows/game-coordinator.ts`, `src/ai/flows/narrative-manager.ts`, `src/ai/tools/companion-expert.ts`
- **Severidad:** 🟢 **MEDIA** (afecta calidad narrativa y coherencia del sistema de mensajes)
- **Descripción:** El DM a veces narra lo que dice algún compañero cuando los compañeros tienen su propia voz en el chat. El DM no debe narrar sus palabras textuales, ya que los compañeros generan sus propios mensajes directamente en el chat.
- **Problema:**
  - Los compañeros generan sus propios mensajes a través de `companionExpertTool` que aparecen directamente en el chat con su propia voz
  - El DM está narrando las palabras textuales de los compañeros en sus narraciones, creando duplicación y confusión
  - Falta coordinación entre el sistema de narración del DM y el sistema de mensajes de los compañeros
  - El DM debería narrar acciones y contexto, no repetir lo que los compañeros ya dijeron
- **Comportamiento actual:**
  - Los compañeros generan mensajes (ej: "Elara dice: '¡Cuidado, hay un goblin!'")
  - El DM luego narra: "Elara te advierte: '¡Cuidado, hay un goblin!'" (duplicación)
- **Comportamiento esperado:**
  - Los compañeros generan sus mensajes directamente en el chat con su propia voz
  - El DM narra el contexto y las acciones, pero NO repite las palabras textuales de los compañeros
  - El DM puede referenciar que un compañero habló (ej: "Elara te advierte sobre el peligro") sin citar sus palabras exactas
  - Coordinación clara: el DM debe saber qué compañeros ya hablaron para no duplicar su contenido
- **Impacto:** Medio - Afecta la calidad narrativa, crea duplicación de contenido y confusión sobre quién está hablando
- **Solución propuesta:**
  - **Fase 1:** Estudiar el flujo actual de coordinación entre `game-coordinator.ts`, `narrative-manager.ts` y `companion-expert.ts`
  - **Fase 2:** Identificar dónde el DM está recibiendo información sobre lo que dijeron los compañeros
  - **Fase 3:** Modificar el prompt del `narrativeExpert` para que:
    - No narre las palabras textuales de los compañeros
    - Solo referencie que un compañero habló sin citar sus palabras exactas
    - Se enfoque en narrar acciones, contexto y consecuencias, no diálogos directos
  - **Fase 4:** Asegurar que el contexto pasado al DM incluya información sobre qué compañeros hablaron, pero no sus palabras exactas
  - **Fase 5:** Testing para verificar que no hay duplicación y que la coordinación es clara
- **Archivos afectados:**
  - `src/ai/flows/game-coordinator.ts` (coordinación entre compañeros y DM)
  - `src/ai/flows/narrative-manager.ts` (prompt del narrativeExpert)
  - `src/ai/tools/companion-expert.ts` (generación de mensajes de compañeros)
- **Estado:** 📝 **PENDIENTE**
- **Prioridad:** Media (mejora calidad narrativa, no bloqueador)
- **Relacionado con:**
  - Issue #94 (Refactorización de Prompts de Tacticians) - Similar problema de coordinación narrativa
  - Roadmap - Sección 9 "Narración Unificada para Todos los Turnos"
- **Detección:** Observado durante gameplay manual - duplicación de contenido entre mensajes de compañeros y narraciones del DM

---


---



---



### Issue #80: Permitir múltiples acciones del jugador en un turno (movimiento/acción adicional) 🟢 MEJORA

- **Fecha de creación:** 2025-11-17
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/components/game/game-view.tsx`
- **Severidad:** 🟢 **MEDIA** (mejora UX; actualmente el turno se consume automáticamente tras una acción)
- **Descripción:** Tras implementar el auto-avance del turno del jugador (Issue #78), cualquier acción consume el turno inmediatamente. A futuro se necesitará permitir que el jugador realice acciones adicionales (movimiento, acción adicional, interacción) antes de pasar turno.
- **Comportamiento esperado:** El jugador debería poder realizar su acción principal, luego decidir si quiere moverse o usar una acción adicional, y finalmente pulsar “Pasar 1 Turno” para entregar el turno. El sistema debe llevar un registro claro de si la acción principal ya se consumió y qué acciones secundarias quedan disponibles.
- **Impacto:** Medio – No bloquea el gameplay actual, pero limita la profundidad táctica y futuras mecánicas.
- **Solución propuesta:**
  - Añadir flags de “acción principal consumida”, “movimiento disponible”, etc.
  - Solo auto-avanzar si el jugador ya marcó explícitamente que terminó (botón “Pasar 1 Turno”) o si consumió todas las acciones disponibles.
  - Adaptar la UI para mostrar el estado de acciones restante.
- **Estado:** 📝 **PENDIENTE (Mejora futura)**
- **Detección:** Discusión tras corregir el Issue #78 (2025-11-17).

---

### Issue #38: Auto-redirección de ataque a enemigo diferente cuando target está muerto 🟢 MEJORA / DECISIÓN DE DISEÑO

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/ai/flows/action-interpreter.ts` o `src/lib/combat/target-resolver.ts`
- **Severidad:** 🟢 MEDIA (afecta jugabilidad, pero no rompe el juego)
- **Descripción:** Cuando el jugador intenta atacar a un enemigo que ya está muerto (e.g., "ataco a goblin1"), el sistema automáticamente **redirige el ataque** a otro enemigo vivo (e.g., "goblin-2") sin informar al jugador.
- **Comportamiento actual:**
  - Jugador: "Ataco a goblin1" (goblin1 está muerto)
  - Sistema: [Redirige silenciosamente a goblin-2]
  - DM: "Atacas a Goblin 2 y aciertas..."
- **Problema:** El jugador podría querer:
  - Examinar el cadáver del goblin1
  - Saquear el cadáver
  - Hacer algo específico con el goblin1 muerto
  - Saber que su target está muerto antes de desperdiciar un ataque
- **Opciones de diseño:**
  1. **Opción A (actual):** Auto-redirección silenciosa a enemigo vivo
     - ✅ Ventaja: No desperdicia turnos
     - ❌ Desventaja: Confuso, quita control al jugador
  2. **Opción B:** Informar al jugador y pedir confirmación
     - DM: "Goblin 1 ya está muerto. ¿Quieres atacar a otro enemigo? (Goblin 2, Orco 1)"
     - ✅ Ventaja: Claridad, más control para el jugador
     - ❌ Desventaja: Requiere interacción adicional
  3. **Opción C:** Rechazar la acción y pedir nueva acción
     - DM: "Goblin 1 ya está muerto. ¿Qué quieres hacer?"
     - ✅ Ventaja: Máximo control para el jugador
     - ❌ Desventaja: Puede ser frustrante
- **Impacto:** Medio (afecta control del jugador, pero no rompe el juego)
- **Solución propuesta:** **Opción B** - Informar y pedir confirmación (similar a Issue #23 con múltiples enemigos)
- **Archivos afectados:**
  - `src/ai/flows/action-interpreter.ts` (lógica de fallback)
  - `src/lib/combat/target-resolver.ts` (resolución de target)
  - `src/ai/flows/game-coordinator.ts` (manejo de clarificaciones)
- **Estado:** 📝 **PENDIENTE** (decisión de diseño pendiente)
- **Relacionado con:** Issue #23 (clarificación de acciones ambiguas)
- **Detección:** Testing de refactorización `combat-manager.ts`

---

### Issue #16: Gestión de nombres de múltiples monstruos debería estar en un módulo separado

- **Fecha de creación:** 2025-11-12
- **Ubicación:** `src/ai/tools/combat-manager.ts`
- **Severidad:** Media (mejora de arquitectura)
- **Descripción:** La gestión y unificación de nombres de múltiples monstruos del mismo tipo está actualmente mezclada con la lógica de combate en `combat-manager.ts`. Esta funcionalidad debería estar centralizada en un módulo dedicado que pueda ser reutilizado en narraciones del DM, combat manager, y narraciones de compañeros.
- **Problema:**
  - Separación de responsabilidades: `combat-manager.ts` debería enfocarse en la lógica de combate
  - Reutilización: La funcionalidad se necesita en múltiples lugares
  - Mantenibilidad: Un módulo separado sería más fácil de testear y depurar
- **Impacto:** Medio (mejora la arquitectura, mantenibilidad y consistencia del código)
- **Solución propuesta:**
  - Crear nuevo módulo `src/lib/monster-name-manager.ts`
  - Extraer funciones: `generateDifferentiatedNames()`, `normalizeNameForMatching()`, `escapeRegex()`, `replaceOrdinalReferences()`
  - Exportar funciones principales para uso en múltiples lugares
- **Archivos afectados:**
  - `src/ai/tools/combat-manager.ts` (extraer funciones)
  - Nuevo: `src/lib/monster-name-manager.ts`
- **Estado:** 📝 Pendiente (mejora de arquitectura, prioridad media)

### Issue #22: Sistema completo de Saving Throws (tiradas de salvación del objetivo) 🟡 FEATURE INCOMPLETA

- **Fecha de creación:** 2025-11-13
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/tools/enemy-tactician.ts`, `src/ai/tools/companion-tactician.ts`
- **Severidad:** Media (feature incompleta)
- **Descripción:** Los saving throw spells funcionan pero de forma simplificada. El daño se aplica automáticamente sin simular la tirada de salvación del objetivo (1d20+bonus vs Spell Save DC) ni aplicar la regla de mitad de daño si el target acierta.
- **Problema:**
  - Sistema actual funcional pero no 100% fiel a D&D 5e
  - Falta cálculo de Spell Save DC del lanzador
  - Falta tirada de salvación del objetivo
  - Falta regla de mitad de daño si acierta
- **Impacto:** Medio (afecta fidelidad a reglas de D&D 5e)
- **Solución propuesta:**
  - PASO 1: Lanzador declara hechizo → Target específico
  - PASO 2: Sistema calcula Spell Save DC del lanzador
  - PASO 3: Target tira salvación (automática, generada por el sistema)
  - PASO 4: Comparar resultado vs DC
  - PASO 5: Mostrar en panel de Tiradas con información completa
  - PASO 6: Aplicar daño completo o mitad según resultado
- **Prioridad:** Media
- **Estimación:** 9-12 horas
- **Estado:** 📝 Pendiente (feature incompleta, implementar después del refactoring de `combat-manager.ts`)

### Issue #28: Visualización de barra de vida en panel Grupo 🟡 ADVERTENCIA

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/components/game/` (componente del panel Grupo)
- **Severidad:** 🟡 **MEDIA** (bug visual)
- **Descripción:** En el panel Grupo, cuando un personaje está seleccionado, la visualización de la barra de vida no se muestra correctamente. El trozo de la barra que está vacío (HP perdido) no se ve bien.
- **Problema:**
  - Posible problema de CSS/styling cuando el personaje está seleccionado
  - La barra de vida puede tener un color de fondo que se confunde con el estado seleccionado
  - O el contraste no es suficiente para distinguir HP perdido
- **Impacto:** Medio (afecta la legibilidad de la información de HP)
- **Solución propuesta:**
  - Revisar el CSS del componente del panel Grupo
  - Asegurar que la barra de vida tenga suficiente contraste cuando el personaje está seleccionado
  - Posiblemente usar colores diferentes o bordes más marcados para el estado seleccionado
- **Archivos afectados:**
  - Componente del panel Grupo (frontend)
  - Estilos CSS relacionados
- **Estado:** 📝 **PENDIENTE** - Bug visual pendiente de corrección


## ⚪ Prioridad Baja (PB) - Mejoras menores

### Issue #31: Gestión de ataques múltiples en combate 🟢 MEJORA

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/tools/enemy-tactician.ts`
- **Severidad:** 🟢 **BAJA** (funcionalidad incompleta)
- **Descripción:** Algunos enemigos (como la mantícora) tienen múltiples ataques en su turno según las reglas de D&D 5e, pero el sistema parece solo procesar un ataque por turno.
- **Causa Raíz posible:**
  1. AI Tactician: El `enemyTacticianTool` puede no estar generando múltiples ataques cuando corresponde
  2. Procesamiento: El `combat-manager.ts` puede estar procesando solo el primer ataque de la lista
  3. Datos de monstruo: La ficha del monstruo puede no incluir información sobre múltiples ataques
- **Impacto:** Bajo (afecta la fidelidad a las reglas de D&D)
- **Solución propuesta:**
  1. Verificar datos de monstruo (asegurar que incluyen información sobre múltiples ataques)
  2. Mejorar AI Tactician (instruir a la IA a generar múltiples ataques cuando el monstruo los tiene)
  3. Procesar todos los ataques (en `combat-manager.ts`, procesar todos los ataques generados, no solo el primero)
  4. Validar orden (asegurar que los ataques múltiples se procesan en el orden correcto)
- **Archivos afectados:**
  - `src/ai/tools/enemy-tactician.ts` (prompt y generación de ataques)
  - `src/ai/tools/combat-manager.ts` (procesamiento de ataques múltiples)
  - Sistema de obtención de datos de monstruos
- **Estado:** 📝 **PENDIENTE** - Funcionalidad incompleta pendiente de implementación

### Issue #32: Paneles de combate se limpian de forma inconsistente 🟢 MEJORA

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/components/game/` (componentes de paneles de combate)
- **Severidad:** 🟢 **BAJA** (inconsistencia de UX)
- **Descripción:** Al terminar un combate, el panel de orden de combate se limpia automáticamente, pero el panel de tiradas no se limpia. Esta inconsistencia puede confundir al jugador.
- **Problema:**
  - Inconsistencia en el comportamiento de los paneles
  - El jugador puede querer revisar las tiradas después del combate
  - O puede querer que ambos paneles se mantengan limpios
- **Impacto:** Bajo (inconsistencia de UX, no afecta funcionalidad)
- **Solución propuesta:**
  1. No limpiar automáticamente ningún panel (mantener ambos con su contenido después del combate)
  2. Implementar botón de limpieza manual (añadir un botón para limpiar los paneles cuando el jugador lo desee, solo disponible cuando estamos fuera de combate)
  3. Consistencia (ambos paneles deben comportarse igual)
- **Archivos afectados:**
  - Componentes de paneles de combate (frontend)
  - Lógica de limpieza de paneles al terminar combate
- **Estado:** 📝 **PENDIENTE** - Mejora de UX pendiente de implementación

---

## ⚫ Prioridad Muy Baja (PMB) - Mejoras muy menores

### Issue #33: Logs muestran turnIndex cuando inCombat es false 🟢 MEJORA

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/lib/logger.ts`, llamadas a `log.gameCoordinator`
- **Severidad:** 🟢 **MUY BAJA** (inconsistencia menor en logs)
- **Descripción:** Los logs muestran `turnIndex` incluso cuando `inCombat` es `false`, lo cual no tiene sentido ya que fuera de combate no hay turnos.
- **Problema:**
  - Inconsistencia en los logs
  - Información confusa o irrelevante cuando no hay combate
- **Impacto:** Muy bajo (solo afecta la legibilidad de los logs)
- **Solución propuesta:**
  - En `log.gameCoordinator`, solo incluir `turnIndex` en el contexto cuando `inCombat === true`
  - O filtrar `turnIndex` del contexto antes de loggear si `inCombat` es `false`
- **Archivos afectados:**
  - `src/lib/logger.ts` (función `gameCoordinator`)
  - Llamadas a `log.gameCoordinator` que pasan `turnIndex` cuando `inCombat` es `false`
- **Estado:** 📝 **PENDIENTE** - Mejora menor de logging pendiente de implementación

---

### Issue #65: Ataque a compañero fuera de combate no inicia combate 🟢 MEJORA

- **Fecha de creación:** 2025-11-16
- **Ubicación:** `src/ai/flows/action-interpreter.ts`, `src/ai/flows/game-coordinator.ts`
- **Severidad:** 🟢 **MEDIA** (mejora de funcionalidad, no crítica)
- **Descripción:** Estando fuera de combate, si el jugador ataca a uno de sus compañeros, el sistema no entra en modo combate. El DM responde como si el ataque no fuera real, ignorando completamente la acción.
- **Ejemplo del comportamiento actual:**
  ```
  Jugador: "Ataco a Elara!"
  DM: "Atacas fervientemente al aire, pero no parece haber ninguna amenaza real a la vista." ❌ IGNORA LA ACCIÓN
  ```
- **Problema:**
  - El sistema no detecta que un ataque a un compañero debería iniciar combate o al menos reconocer la acción como un ataque real
  - El `action-interpreter` o `game-coordinator` no está procesando correctamente los ataques a compañeros fuera de combate
  - Puede estar relacionado con el sistema de inicio de combate dinámico (pendiente de implementar)
- **Impacto:** Medio (limita funcionalidad, pero no bloquea el gameplay principal)
- **Solución propuesta:**
  - Detectar ataques a compañeros en `action-interpreter`
  - Iniciar combate automáticamente cuando se detecta un ataque a un compañero
  - O al menos reconocer la acción como un ataque real y mostrar un mensaje apropiado
  - Relacionado con: [Sistema de Inicio de Combate Dinámico](../roadmap.md#2-sistema-de-inicio-de-combate-dinámico-prioridad-alta)
- **Archivos afectados:**
  - `src/ai/flows/action-interpreter.ts` (detección de ataques)
  - `src/ai/flows/game-coordinator.ts` (inicio de combate)
- **Estado:** 📝 **PENDIENTE (Mejora futura)** - Funcionalidad no crítica, marcada para implementación futura

---

## 📝 Notas

- Los números de issue se mantienen como referencia histórica del orden en que fueron añadidos
- Cuando un issue se resuelve, se mueve a [corregidos.md](./corregidos.md)
- Para más detalles sobre cada issue, consultar el historial de commits y el [CHANGELOG.md](../../../CHANGELOG.md)

