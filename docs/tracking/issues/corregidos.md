# Issues Corregidos

Issues que han sido resueltos y verificados. Ordenados por prioridad (PMA → PA → PM → PB → PMB).

**Total:** 18 issues  
**Última actualización:** 2025-11-14

---

## 🔴 Prioridad Muy Alta (PMA) - Críticos

### Issue #13: Connect Timeout Error al iniciar combate ✅ RESUELTO

- **Fecha de creación:** 2025-11-12
- **Fecha de corrección:** 2025-11-12
- **Ubicación:** `src/ai/flows/action-interpreter.ts`
- **Severidad:** 🔴 **ALTA** (intermitente pero bloquea completamente el combate cuando ocurre)
- **Descripción:** Al intentar iniciar combate, ocasionalmente se producía un `TypeError: fetch failed` con `ConnectTimeoutError` al intentar conectar con la API de Google Gemini.
- **Solución implementada:** ✅ Retry logic con exponential backoff + fallback inteligente
  - Función `retryWithExponentialBackoff` con máximo 3 reintentos (4 intentos totales)
  - Delays de 1s, 2s, 4s
  - Fallback inteligente por palabras clave si todos los reintentos fallan
- **Archivos modificados:** `src/ai/flows/action-interpreter.ts` (líneas 14-217)
- **Estado:** ✅ RESUELTO

### Issue #19: Turno del jugador no procesa tiradas de dados ni narración del DM ✅ RESUELTO

- **Fecha de creación:** 2025-11-12
- **Fecha de corrección:** 2025-11-12
- **Ubicación:** `src/ai/tools/combat-manager.ts`
- **Severidad:** 🔴 **CRÍTICO**
- **Descripción:** El turno del jugador no generaba tiradas de dados ni narración del DM, bloqueando completamente la jugabilidad en combate.
- **Solución implementada:** ✅ Procesamiento completo del turno del jugador (líneas 738-1005)
  - Generación automática de attack roll y damage roll
  - Narración del DM para acierto/fallo, daño, críticos, pifias
  - Aplicación correcta de daño con validación
- **Archivos modificados:** `src/ai/tools/combat-manager.ts`
- **Estado:** ✅ RESUELTO

### Issue #20: Hechizos con tiradas de salvación no funcionan ✅ RESUELTO

- **Fecha de creación:** 2025-11-12
- **Fecha de corrección:** 2025-11-13
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/tools/enemy-tactician.ts`, `src/ai/tools/companion-tactician.ts`
- **Severidad:** 🔴 **CRÍTICO**
- **Descripción:** Hechizos como Sacred Flame que usan tirada de salvación del objetivo en lugar de tirada de ataque no funcionaban correctamente.
- **Solución implementada:** ✅ Sistema de metadata explícita (`attackType`)
  - Añadido campo `attackType` a schemas de AI tacticians
  - `combat-manager.ts` lee `attackType` del rollData
  - Fallback a detección por keywords para retrocompatibilidad
- **Archivos modificados:** 
  - `src/ai/tools/combat-manager.ts` (líneas 1248-1267, 1372-1409)
  - `src/ai/tools/enemy-tactician.ts`
  - `src/ai/tools/companion-tactician.ts`
- **Estado:** ✅ RESUELTO

### Issue #23: Selección automática de objetivo único y manejo de acciones ambiguas ✅ RESUELTO

- **Fecha de creación:** 2025-11-13
- **Fecha de corrección:** 2025-11-13
- **Ubicación:** `src/ai/tools/combat-manager.ts`
- **Severidad:** 🔴 **CRÍTICO**
- **Descripción:** Cuando el jugador atacaba sin especificar objetivo, el sistema fallaba y saltaba el turno.
- **Solución implementada:** ✅ Auto-selección de objetivo único + petición de aclaración para múltiples
  - Auto-selección cuando hay un solo enemigo vivo
  - Petición de aclaración cuando hay múltiples (turno NO avanza)
  - Fix de normalización de nombres con acentos
- **Archivos modificados:** `src/ai/tools/combat-manager.ts` (función `resolveEnemyId`, líneas 595-616)
- **Estado:** ✅ RESUELTO COMPLETAMENTE

### Issue #24: Helper `eq` de Handlebars no disponible en Genkit bloqueaba reacciones de compañeros ✅ RESUELTO

- **Fecha de creación:** 2025-11-13
- **Fecha de corrección:** 2025-11-13
- **Ubicación:** `src/ai/tools/companion-expert.ts`
- **Severidad:** 🔴 **CRÍTICO**
- **Descripción:** El prompt usaba `{{#if (eq reactionTiming "before_dm")}}` pero Genkit no soporta el helper `eq`, bloqueando todas las reacciones.
- **Solución implementada:** ✅ Reemplazado con variables booleanas directas
  - `reactionTiming` (string) → `isBeforeDm` e `isAfterDm` (booleanos)
  - Template usa `{{#if isBeforeDm}}` directamente
- **Archivos modificados:** `src/ai/tools/companion-expert.ts` (líneas 27-77, 109-114)
- **Estado:** ✅ RESUELTO

### Issue #26: Compañero muerto sigue reaccionando después de combate ✅ RESUELTO

- **Fecha de creación:** 2025-11-13
- **Fecha de corrección:** 2025-11-13
- **Ubicación:** `src/ai/flows/game-coordinator.ts`, `src/ai/tools/companion-expert.ts`
- **Severidad:** 🔴 **MUY ALTA** (rompe la inmersión y lógica del juego)
- **Descripción:** Después de un combate, si un compañero había muerto, el sistema seguía generando reacciones para ese compañero como si estuviera vivo.
- **Solución implementada:** ✅ Filtrado de compañeros muertos + validación defensiva
  - Filtrado en `game-coordinator.ts` (líneas 178 y 243): `character.hp.current > 0`
  - Validación defensiva en `companion-expert.ts` (líneas 102-111)
- **Archivos modificados:**
  - `src/ai/flows/game-coordinator.ts` (líneas 178 y 243)
  - `src/ai/tools/companion-expert.ts` (líneas 102-111)
- **Estado:** ✅ RESUELTO

### Issue #27: Verificación de muerte de personajes en combate y fuera de combate ✅ RESUELTO

- **Fecha de creación:** 2025-11-13
- **Fecha de corrección:** 2025-11-14
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/flows/game-coordinator.ts`, `src/ai/tools/combat-initiation-expert.ts`, `src/ai/flows/action-interpreter.ts`
- **Severidad:** 🔴 **ALTA** (afecta jugabilidad y lógica del juego)
- **Descripción:** El sistema no verificaba consistentemente el estado de vida de los personajes antes de permitirles actuar, participar en combates o generar acciones.
- **Solución implementada:** ✅ Sistema completo en 6 fases
  - Fase 1: Filtrar combatientes muertos en iniciación de combate
  - Fase 2: Filtrar enemigos muertos en `combatInitiationExpertTool`
  - Fase 3: Filtrar enemigos muertos en `actionInterpreter`
  - Fase 4: Verificar muerte del jugador y detección de "game over"
  - Fase 5: Pasar `updatedEnemies` a herramientas
  - Fase 6: Verificar muerte en iniciación de combate
- **Mejora adicional:** Sistema de Inconsciencia y Muerte Masiva (D&D 5e) implementado
- **Archivos modificados:**
  - `src/ai/tools/combat-manager.ts` (líneas 1729-1754, 2029-2049)
  - `src/ai/tools/combat-initiation-expert.ts` (líneas 26-85)
  - `src/ai/flows/action-interpreter.ts` (líneas 180-215)
  - `src/ai/flows/game-coordinator.ts` (líneas 55-83, 123, 158)
  - `src/ai/flows/schemas.ts` (línea 15)
  - `src/lib/schemas.ts` (campo `isDead`)
- **Estado:** ✅ RESUELTO

---

## 🟡 Prioridad Alta (PA) - Advertencias

### Issue #18: IA Táctica ataca a personajes ya derrotados (HP <= 0) ✅ RESUELTO

- **Fecha de creación:** 2025-11-12
- **Fecha de corrección:** 2025-11-12
- **Ubicación:** `src/ai/tools/enemy-tactician.ts`, `src/ai/tools/companion-tactician.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad:** Alta (afecta jugabilidad y lógica del combate)
- **Descripción:** Los AI tácticians continuaban seleccionando como objetivo a personajes que ya habían sido derrotados (HP llegó a 0 o menos).
- **Solución implementada:** ✅ Filtrado de personajes muertos antes de pasarlos a AI tacticians
  - Arrays `aliveParty` y `aliveEnemies` solo incluyen personajes con HP > 0
  - Implementado en turnos normales (líneas 1026-1049) e iniciación de combate (líneas 1838-1861)
- **Archivos modificados:** `src/ai/tools/combat-manager.ts`
- **Estado:** ✅ RESUELTO

### Issue #17: IA no incluye todos los enemigos hostiles en el combate ✅ RESUELTO

- **Fecha de creación:** 2025-11-12
- **Fecha de corrección:** 2025-11-12
- **Ubicación:** `src/ai/tools/combat-initiation-expert.ts`, `src/ai/flows/action-interpreter.ts`
- **Severidad:** Media (afecta la experiencia de juego)
- **Descripción:** La IA que decide qué combatientes participan en el combate a veces omitía enemigos hostiles que estaban presentes en la ubicación.
- **Solución implementada:** ✅ Prompts mejorados
  - Prompt de `combatInitiationExpertTool` más explícito sobre incluir todos los enemigos hostiles
  - Prompt de `actionInterpreter` más conservador al asignar `targetId`
- **Archivos modificados:**
  - `src/ai/tools/combat-initiation-expert.ts`
  - `src/ai/flows/action-interpreter.ts`
- **Estado:** ✅ RESUELTO

---

## 🟢 Prioridad Media (PM) - Mejoras

### Issue #1: Archivo Duplicado `game-view.tsx` ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/app/game-view.tsx`
- **Severidad:** Media (no crítico, pero causa confusión)
- **Descripción:** Existe un archivo `src/app/game-view.tsx` que no se está usando. El componente real está en `src/components/game/game-view.tsx`.
- **Solución aplicada:** ✅ Eliminado `src/app/game-view.tsx`
- **Estado:** ✅ Corregido

### Issue #2: Falta de validación en `page.tsx` al cargar aventura ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/app/page.tsx`, función `handleLoadAdventure`
- **Severidad:** Media
- **Descripción:** Al cargar una aventura desde JSON, no se valida que el `initialGameData` tenga todos los campos requeridos.
- **Solución aplicada:** ✅ Añadido esquema `AdventureDataSchema` para validar la estructura de la aventura antes de usarla
- **Estado:** ✅ Corregido

### Issue #3: Falta de validación en `page.tsx` al cargar partida guardada ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/app/page.tsx`, función `handleLoadGame`
- **Severidad:** Media
- **Descripción:** Al cargar una partida guardada, solo se validaba que existieran `party`, `messages` y `locationId`, pero no se validaba la estructura completa.
- **Solución aplicada:** ✅ Añadido esquema `SaveGameDataSchema` para validar la estructura completa del archivo de guardado
- **Estado:** ✅ Corregido

### Issue #4: `conversationHistory` incorrecto en `handleLoadAdventure` ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/app/page.tsx`, función `handleLoadAdventure`
- **Severidad:** Media
- **Descripción:** `conversationHistory` se pasaba como string vacío `""` en lugar de un array vacío `[]`.
- **Solución aplicada:** ✅ Cambiado `conversationHistory: ""` a `conversationHistory: []`
- **Estado:** ✅ Corregido

### Issue #5: Inconsistencia de tipos en `actions.ts` ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/app/actions.ts`
- **Severidad:** Media
- **Descripción:** `processPlayerAction` esperaba `GameCoordinatorInput` pero `gameCoordinator` espera `GameState`.
- **Solución aplicada:** ✅ Cambiado el tipo de parámetro de `processPlayerAction` de `GameCoordinatorInput` a `GameState`
- **Estado:** ✅ Corregido

### Issue #9: Dependencia incorrecta en useEffect de chat-message.tsx ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/components/game/chat-message.tsx`, línea 114
- **Severidad:** Baja (no crítico, pero puede causar problemas)
- **Descripción:** El `useEffect` tenía `[audioRef]` como dependencia, pero los refs no deberían estar en las dependencias.
- **Solución aplicada:** ✅ Cambiada la dependencia de `[audioRef]` a `[]` (array vacío)
- **Estado:** ✅ Corregido

### Issue #10: Campos de formulario sin atributos id o name ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/components/game/main-menu.tsx` y `src/components/game/player-input.tsx`
- **Severidad:** Baja (warning de accesibilidad)
- **Descripción:** Los campos de formulario no tenían atributos `id` o `name`, lo cual genera un warning en la consola del navegador.
- **Solución aplicada:** ✅ Añadidos atributos `id` y `name` a todos los campos de formulario
- **Estado:** ✅ Corregido

### Issue #11: Estados de combate no sincronizados ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/components/game/game-view.tsx`, función `handleSendMessage`
- **Severidad:** Media
- **Descripción:** Los estados relacionados con combate se actualizaban de forma independiente, causando inconsistencias.
- **Solución aplicada:** ✅ Implementada lógica de sincronización que limpia `initiativeOrder`, `turnIndex` y `enemies` cuando `inCombat` se establece en `false`
- **Estado:** ✅ Corregido

### Issue #12: `enemies` no se inicializa desde `initialData` ✅ CORREGIDO

- **Fecha de creación:** 2025-11-10
- **Fecha de corrección:** 2025-11-10
- **Ubicación:** `src/components/game/game-view.tsx`
- **Severidad:** Media
- **Descripción:** El estado `enemies` se inicializaba siempre como array vacío, ignorando cualquier valor de `initialData.enemies`.
- **Solución aplicada:** ✅ 
  - Añadido `enemies?: any[]` a `InitialGameData` y `GameViewProps.initialData`
  - Cambiado inicialización de `enemies` de `useState<any[]>([])` a `useState<any[]>(initialData.enemies || [])`
  - Añadido `enemies` al proceso de carga de partidas guardadas
- **Estado:** ✅ Corregido

---

## 📝 Notas

- Los números de issue se mantienen como referencia histórica del orden en que fueron añadidos
- Para más detalles sobre cada issue, consultar el historial de commits y el [CHANGELOG.md](../../../CHANGELOG.md)
- Los issues corregidos se mantienen aquí como referencia histórica y para documentar las soluciones implementadas

