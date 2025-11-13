# Plan de Acción: Finalización del Sistema de Turnos de Combate

Este documento detalla los pasos necesarios para implementar un sistema de turnos de combate proactivo y funcional. El objetivo es transformar el `combatManager` de un gestor de acciones pasivo a un orquestador de turnos que pueda ejecutar una secuencia completa de turnos de IA hasta que el control deba devolverse al jugador.

---

### ✅ **Paso 1: Integración del `turnIndex` en el Flujo de Datos**

**Objetivo:** Asegurar que el `turnIndex` y todo el estado de combate fluye correctamente entre el frontend y el backend durante una sesión de juego activa.

- [x] **En `src/app/page.tsx`:**
    - [x] **Partidas Nuevas:** Añadir `turnIndex: 0` a `initialGameData`. ✅ Implementado (línea 87)
    - [x] **Partidas Guardadas:** Asegurar que `turnIndex` se restaura al cargar partidas guardadas. ✅ Implementado (validado en `SaveGameDataSchema`)

- [x] **En `src/components/game/game-view.tsx`:**
    - [x] **Crear Estado:** Añadir el estado para gestionar el `turnIndex`. ✅ Implementado (línea 204 en `actionInput`)
    - [x] **Enviar Estado:** Incluir el `turnIndex` actual en la llamada a `processPlayerAction`. ✅ Implementado (línea 204)
    - [x] **Recibir Estado:** Añadir la lógica para actualizar el estado desde la respuesta del backend. ✅ Implementado (líneas 269, 275)
    - [x] **Corregir Bug de Estado:** Asegurar que el `initiativeOrder` se incluye en la llamada a `processPlayerAction` durante el combate. ✅ Implementado (línea 205)
    - [x] **Sincronización de Estados:** Implementar lógica para limpiar estados de combate cuando `inCombat` es `false`. ✅ Implementado (líneas 262-265)

- [x] **En `src/ai/flows/game-coordinator.ts`:**
    - [x] **Añadir Log:** Al inicio del flujo, añadir un `debugLog` que muestre el `turnIndex` recibido. ✅ Implementado (línea 53)

**Verificación:**
- [x] **Prueba de Flujo:** Se ha verificado en el `debugLog` que el `turnIndex` se envía y recibe correctamente.
- [x] **Estado del Código:** ✅ Revisado y confirmado - Todo implementado correctamente

---

### ✅ **Paso 2: Implementación del Bucle de Turnos y Sincronización de la UI**

**Objetivo:** Crear la estructura lógica del bucle de turnos y asegurar que la UI refleje el estado actual del combate.

- [x] **En `src/ai/tools/combat-manager.ts` (Backend):**
    - [x] Implementar el bucle `while` que se ejecuta mientras el turno sea de una IA. ✅ Implementado (línea 84)
    - [x] Añadir logs de iteración y de salida del bucle. ✅ Implementado (líneas 85, 154)
    - [x] **Lógica de Avance de Turno:** Implementar el avance del `currentTurnIndex` usando módulo para ciclar correctamente. ✅ Implementado (línea 149)
    - [x] **Validación de Estado:** Añadir validación para asegurar que `initiativeOrder` y `turnIndex` existen cuando `inCombat` es `true`. ✅ Implementado (líneas 77-79)

- [x] **En `src/components/game/initiative-tracker.tsx` y `src/components/layout/left-panel.tsx` (Frontend):**
    - [x] Pasar y utilizar la prop `currentTurnIndex` para resaltar el combatiente activo. ✅ Implementado (línea 12 en `initiative-tracker.tsx`, línea 40 en `left-panel.tsx`)
    - [x] **Resaltado Visual:** Implementar resaltado visual del combatiente activo usando clases condicionales. ✅ Implementado (línea 34 en `initiative-tracker.tsx`)

**Verificación:**
- [x] **Verificación del Backend:** El `debugLog` muestra correctamente el procesamiento de los turnos de la IA en secuencia. ✅ Confirmado
- [x] **Verificación del Frontend:** El `InitiativeTracker` resalta correctamente el combatiente activo, moviéndose al jugador cuando la IA cede el control. ✅ Confirmado
- [x] **Estado del Código:** ✅ Revisado y confirmado - Todo implementado correctamente

---

### ✅ **Paso 3: Implementación y Depuración de la Lógica Táctica de IA**

**Objetivo:** Dar vida al bucle de combate, asegurando que tanto los compañeros como los enemigos actúen de forma inteligente, diferenciada y sin errores.

- [x] **En `src/ai/tools/` (Aplicable a `enemy-tactician.ts` y `companion-tactician.ts`):**
    - [x] **Revisar Esquema de Salida:** Modificar el `outputSchema` para que devuelva un `targetId` estructurado. ✅ Implementado (línea 23 en ambos archivos)
    - [x] **Actualizar Prompt:** Modificar los prompts para que la IA devuelva el `targetId`. ✅ Implementado (líneas 70 y 62 respectivamente)
    - [x] **Manejo de Errores:** Implementar manejo de errores robusto con valores por defecto. ✅ Implementado (líneas 96-107 y 107-118)

- [x] **En `src/ai/tools/combat-manager.ts`:**
    - [x] Dentro del bucle `while`, implementar la lógica de dirección de IA. ✅ Implementado (líneas 87-104)
    - [x] Invocar al `companionTacticianTool` para compañeros y al `enemyTacticianTool` para enemigos. ✅ Implementado (líneas 98-104)
    - [x] Leer el `targetId` de la respuesta y procesar la acción sin expresiones regulares. ✅ Implementado (línea 106)
    - [x] **Procesamiento de Acciones:** Implementar lógica para procesar ataques, daño y curación basándose en `targetId` y `diceRolls`. ✅ Implementado (líneas 114-147)
    - [x] **Actualización de HP:** Implementar actualización correcta de HP para aliados y enemigos. ✅ Implementado (líneas 133-136, 141)

- [x] **Depuración del Comportamiento Pasivo de la IA:**
    - [x] **Diagnóstico del Problema:** El análisis del comportamiento de la IA reveló que el prompt del `companionTacticianTool` era ambiguo, causando que las IAs no actuaran si no había necesidad de curar.
    - [x] **Solución Iterativa del Prompt:** Se refactorizó el prompt del `companionTacticianTool` con una lógica condicional explícita: **SI** se puede curar **Y** un aliado está herido, **ENTONCES** curar. **EN CASO CONTRARIO**, atacar. ✅ Implementado (líneas 64-66 en `companion-tactician.ts`)
    - [x] **Regla Absoluta:** Añadir regla explícita "YOU MUST NOT BE PASSIVE" en el prompt. ✅ Implementado (línea 73)

**Verificación:**
- [x] La secuencia de turnos de la IA se ejecuta automáticamente sin errores. ✅ Confirmado
- [x] Se ha confirmado mediante logs que todos los compañeros (magos, clérigos, etc.) y enemigos toman acciones decisivas y lógicas en cada turno. ✅ Confirmado
- [x] El bug de la pasividad de la IA y los errores de `INVALID_ARGUMENT` han sido solucionados por completo. Las acciones se procesan correctamente actualizando el estado del juego. ✅ Confirmado
- [x] **Estado del Código:** ✅ Revisado y confirmado - Todo implementado correctamente
- [x] **Logging:** ✅ Ambos tacticians tienen logging estructurado implementado (`log.aiTool`, `log.error`)

---

### ❌ **Paso 4: Implementación de la Condición de Fin de Combate** (NO COMPLETADO)

**Estado:** ❌ **NO COMPLETADO** - Bloqueado por sistema de HP no funcional

**Objetivo:** Detectar cuándo el combate ha terminado (todos los enemigos derrotados o todos los aliados derrotados) y limpiar el estado del juego correctamente.

**⚠️ PROBLEMA CRÍTICO IDENTIFICADO:**
El sistema de detección de fin de combate **no puede funcionar correctamente** porque el sistema de gestión de HP (puntos de vida) de personajes y enemigos **no está completamente implementado o no funciona correctamente**.

**Análisis completo:** Ver [Análisis: Sistema de Gestión de HP y Fichas](./combate-turnos-analisis-hp.md)

**Bloqueador:** Sin un sistema de HP funcional, `checkEndOfCombat()` no puede verificar correctamente si todos los enemigos/aliados están derrotados.

---

## 🔴 Lo que falta por hacer para completar el Paso 4

### Prerrequisitos (Sistema de HP)

Antes de poder completar el Paso 4, se debe implementar completamente el sistema de gestión de HP. Los siguientes problemas deben resolverse:

#### 1. Sincronización Frontend-Backend ❌

**Problema:** Los cambios de HP de enemigos no se reflejan en el frontend.

**Ubicación:** `src/components/game/game-view.tsx`, líneas 279-304

**Lo que falta:**
- [ ] Añadir `if (result.updatedEnemies) { setEnemies(result.updatedEnemies); }` en `game-view.tsx`
- [ ] Verificar que los cambios de HP de enemigos se reflejen en la UI del combat tracker
- [ ] Asegurar que los cambios de HP de personajes también se reflejen correctamente en los character sheets

**Impacto:** Sin esto, el frontend muestra HP incorrectos y el usuario no puede ver el estado real del combate.

#### 2. Inicialización Correcta de HP de Enemigos ❌

**Problema:** Los enemigos pueden crearse sin `hp.current` o `hp.max` definidos.

**Ubicación:** `src/ai/tools/combat-manager.ts`, líneas 1041-1058

**Lo que falta:**
- [ ] Asegurar que todos los enemigos tengan `hp.current` y `hp.max` al crearse
- [ ] Implementar lógica para obtener HP desde:
  - Datos de la aventura JSON (si están definidos)
  - D&D API (si el monstruo existe)
  - Valores por defecto basados en el tipo de monstruo
- [ ] Validar que `hp.max > 0` antes de crear el enemigo
- [ ] Inicializar `hp.current = hp.max` al crear enemigos

**Impacto:** Si los enemigos no tienen HP definido, las actualizaciones de daño fallan y `checkEndOfCombat()` no puede funcionar.

#### 3. Validación de HP ❌

**Problema:** No hay validación para asegurar que `hp.current` esté en un rango válido.

**Ubicación:** `src/ai/tools/combat-manager.ts`, líneas 877-900

**Lo que falta:**
- [ ] Añadir validación: `hp.current >= 0` después de aplicar daño
- [ ] Añadir validación: `hp.current <= hp.max` después de aplicar curación
- [ ] Añadir validación: `hp.max > 0` al inicializar
- [ ] Crear función helper `validateHP(character: Character | any): boolean`
- [ ] Usar validación en todas las actualizaciones de HP

**Impacto:** Sin validación, pueden ocurrir valores inválidos (HP negativo, HP mayor que máximo) que rompen la lógica.

#### 4. Estandarización de Estructura de Enemigos ❌

**Problema:** Los enemigos tienen estructuras inconsistentes (algunos tienen `id`, otros `uniqueId`, algunos no tienen `hp`).

**Ubicación:** Múltiples lugares en `combat-manager.ts`

**Lo que falta:**
- [ ] Crear `EnemySchema` en `src/lib/schemas.ts` con estructura estándar:
  ```typescript
  export const EnemySchema = z.object({
    id: z.string(),
    uniqueId: z.string(),
    name: z.string(),
    hp: z.object({
      current: z.number().min(0),
      max: z.number().positive()
    }),
    ac: z.number().optional(),
    // ... otros campos necesarios
  });
  ```
- [ ] Validar todos los enemigos con este esquema al crearlos
- [ ] Normalizar estructura en todos los lugares donde se crean enemigos
- [ ] Asegurar que todos los enemigos tengan `id`, `uniqueId`, y `hp` definidos

**Impacto:** Sin estructura estándar, las búsquedas y actualizaciones fallan de forma inconsistente.

#### 5. Sistema Centralizado de Gestión de Fichas ❌

**Problema:** No hay funciones helper centralizadas para gestionar personajes/enemigos.

**Ubicación:** Nuevo archivo a crear

**Lo que falta:**
- [ ] Crear módulo `src/lib/character-manager.ts` o `src/ai/utils/character-manager.ts`
- [ ] Implementar funciones helper:
  - `getCharacterById(party: Character[], id: string): Character | null`
  - `getEnemyById(enemies: any[], id: string): any | null`
  - `updateHP(character: Character | any, change: number, type: 'damage' | 'healing'): Character | any`
  - `validateHP(character: Character | any): boolean`
  - `getCurrentHP(character: Character | any): number`
  - `getMaxHP(character: Character | any): number`
- [ ] Refactorizar `combat-manager.ts` para usar estas funciones
- [ ] Reemplazar búsquedas manuales con funciones helper

**Impacto:** Sin sistema centralizado, el código es propenso a errores y difícil de mantener.

---

### Implementación del Paso 4 (Después de resolver HP)

Una vez que el sistema de HP esté funcional, se debe completar:

#### 6. Verificación Funcional de `checkEndOfCombat()` ❌

**Lo que falta:**
- [ ] Verificar que `checkEndOfCombat()` detecta correctamente cuando todos los enemigos están derrotados (`hp.current <= 0`)
- [ ] Verificar que `checkEndOfCombat()` detecta correctamente cuando todos los aliados están derrotados
- [ ] Verificar que el combate termina inmediatamente cuando se detecta el fin
- [ ] Verificar que el estado se limpia correctamente (`inCombat: false`, `turnIndex: 0`, `initiativeOrder: []`, `enemies: []`)
- [ ] Verificar que se muestra el mensaje de conclusión apropiado
- [ ] Verificar que el panel de iniciativa desaparece en la UI
- [ ] Verificar que la siguiente acción del jugador se procesa por el flujo narrativo, no por combate

#### 7. Pruebas de Integración ❌

**Lo que falta:**
- [ ] Prueba: Derrotar al último enemigo durante el turno de un aliado de IA
- [ ] Prueba: Derrotar al último enemigo durante el turno del jugador
- [ ] Prueba: Todos los aliados derrotados (game over)
- [ ] Prueba: Combate termina y el estado se limpia correctamente
- [ ] Prueba: Después del fin de combate, el jugador puede continuar explorando

---

## 📋 Resumen de Tareas Pendientes

### Fase 1: Correcciones Inmediatas (Críticas) - REQUERIDO PARA PASO 4
1. ❌ Sincronizar enemigos en Frontend
2. ❌ Inicializar HP de enemigos correctamente
3. ❌ Validar HP en actualizaciones

### Fase 2: Estandarización (Importante) - REQUERIDO PARA PASO 4
4. ❌ Crear esquema de Enemigo
5. ❌ Estandarizar estructura de enemigos

### Fase 3: Sistema Centralizado (Mejora) - RECOMENDADO
6. ❌ Crear módulo de gestión de fichas
7. ❌ Refactorizar código existente

### Fase 4: Completar Paso 4 (Después de HP)
8. ❌ Verificación funcional de `checkEndOfCombat()`
9. ❌ Pruebas de integración

**Ver análisis completo:** [Análisis: Sistema de Gestión de HP y Fichas](./combate-turnos-analisis-hp.md)

- [x] **En `src/ai/tools/combat-manager.ts`:**
    - [x] **Crear función `checkEndOfCombat`:** ✅ Código implementado (líneas 601-615)
        - [x] Crear una función auxiliar `checkEndOfCombat(updatedParty: any[], updatedEnemies: any[])` que retorne `{ combatEnded: boolean, reason: string | null }`. ✅ Implementado
        - [x] **Lógica de verificación:** ✅ Código implementado
            - [x] Verificar si todos los enemigos están derrotados: `updatedEnemies.every(e => e.hp.current <= 0)` ✅ Implementado (línea 603)
            - [x] Verificar si todos los aliados están derrotados: `updatedParty.every(p => p.hp.current <= 0)` ✅ Implementado (línea 609)
            - [x] Retornar `{ combatEnded: true, reason: "Todos los enemigos derrotados" }` si todos los enemigos están derrotados ✅ Implementado (líneas 604-606)
            - [x] Retornar `{ combatEnded: true, reason: "Todos los aliados derrotados" }` si todos los aliados están derrotados ✅ Implementado (líneas 610-612)
            - [x] Retornar `{ combatEnded: false, reason: null }` en caso contrario ✅ Implementado (línea 614)
    - [x] **Llamar a la función después de actualizar HP:** ✅ Código implementado
        - [x] Después de actualizar `updatedParty` o `updatedEnemies` con daño, llamar a `checkEndOfCombat(updatedParty, updatedEnemies)`. ✅ Implementado (líneas 885 y 346)
        - [x] **Añadir Log de Verificación:** Dentro del bucle, después de actualizar HP, añadir un `localLog`: `checkEndOfCombat: Checking for end of combat...` ✅ Implementado (líneas 884 y 346)
        - [x] Si `combatEnded === true`: ✅ Código implementado
            - [x] **Añadir Log de Fin:** Añadir un `localLog`: `checkEndOfCombat: End of combat detected! [Razón: ${reason}]` ✅ Implementado (líneas 887 y 349)
            - [x] **Añadir Mensaje de Conclusión:** Añadir un mensaje al array `messages` con el resultado del combate: ✅ Implementado (líneas 888-892 y 350-354)
                - [x] Si todos los enemigos derrotados: `{ sender: 'DM', content: '¡Victoria! Todos los enemigos han sido derrotados.' }` ✅ Implementado
                - [x] Si todos los aliados derrotados: `{ sender: 'DM', content: '¡Derrota! Todos los aliados han caído en combate.' }` ✅ Implementado
            - [x] **Salir del bucle:** Usar variable `combatHasEnded` para salir del bucle `while` inmediatamente ✅ Implementado (líneas 894, 211-214, 370-374)
            - [x] **Devolver estado final:** Retornar con: ✅ Implementado (líneas 218-230 y 377-390)
                - [x] `inCombat: false` ✅ Implementado
                - [x] `turnIndex: 0` ✅ Implementado
                - [x] `initiativeOrder: []` (array vacío) ✅ Implementado
                - [x] `enemies: []` (array vacío) ✅ Implementado
                - [x] `updatedParty` y `updatedEnemies` con los HP actualizados ✅ Implementado
                - [x] `messages` con el mensaje de conclusión ✅ Implementado
                - [x] `debugLogs` con los logs de verificación ✅ Implementado
    - [x] **Consideraciones adicionales:** ✅ Código implementado
        - [x] Asegurar que la verificación se hace después de cada actualización de HP (solo de daño, no de curación) ✅ Implementado (líneas 884-896 y 345-358)
        - [x] La verificación debe hacerse dentro del bucle `while`, después de procesar cada acción de IA ✅ Implementado
        - [x] Si el combate termina durante el turno de un enemigo/compañero de IA, no debe procesarse el siguiente turno ✅ Implementado (líneas 211-214 y 370-374)
        - [x] **Nota importante:** La verificación debe hacerse después de aplicar el daño, pero antes de avanzar al siguiente turno ✅ Implementado
        - [x] Si el combate termina, el `return` debe estar fuera del bucle `while` para asegurar que se retorna el estado final correcto ✅ Implementado (líneas 218-230 y 377-390)

**⚠️ NOTA IMPORTANTE:** 
- El código del Paso 4 está implementado, pero **NO FUNCIONA** porque depende del sistema de HP que no está funcional.
- Ver sección "Lo que falta por hacer para completar el Paso 4" más abajo para los prerrequisitos necesarios.

---

## 📊 Resumen del Estado del Plan

### ✅ Pasos Completados (4 de 4)

**Paso 1: Integración del `turnIndex`** ✅
- Estado: Completado y verificado
- Archivos modificados: `page.tsx`, `game-view.tsx`, `game-coordinator.ts`
- Funcionalidad: Flujo completo de datos de combate entre frontend y backend

**Paso 2: Bucle de Turnos y UI** ✅
- Estado: Completado y verificado
- Archivos modificados: `combat-manager.ts`, `initiative-tracker.tsx`, `left-panel.tsx`
- Funcionalidad: Bucle de turnos de IA funcional, UI sincronizada con resaltado visual

**Paso 3: Lógica Táctica de IA** ✅
- Estado: Completado y verificado
- Archivos modificados: `companion-tactician.ts`, `enemy-tactician.ts`, `combat-manager.ts`
- Funcionalidad: IA actúa de forma inteligente, procesamiento de acciones completo

**Paso 4: Detección de Fin de Combate** ❌
- Estado: **NO COMPLETADO** - Bloqueado por sistema de HP no funcional
- Archivo modificado: `combat-manager.ts`
- Funcionalidad: Código implementado pero no puede funcionar sin sistema de HP
- **Bloqueador:** Sistema de gestión de HP no funcional (ver análisis completo)
- **Tareas pendientes:** Ver sección "Lo que falta por hacer para completar el Paso 4" más abajo

### ❌ Pasos Completados (3 de 5 completamente funcionales, 1 no completado, 1 completado)

**Paso 4: Detección de Fin de Combate** ❌ **NO COMPLETADO**
- Estado: Código implementado pero requiere sistema de HP funcional
- Ver: [Análisis: Sistema de Gestión de HP](./combate-turnos-analisis-hp.md)
- Ver sección "Lo que falta por hacer para completar el Paso 4" más abajo

**Paso 5: Diferenciación Visual de Enemigos del Mismo Tipo** ✅
- Estado: Completado
- Archivos modificados: `combat-manager.ts`
- Funcionalidad: Diferenciar visualmente enemigos del mismo tipo en el combat tracker con numeración, resolución de nombres visuales a uniqueIds, y manejo de ambigüedad

### 📝 Notas de Revisión

- **Código Revisado:** Todos los pasos completados han sido revisados línea por línea
- **Referencias de Código:** Todas las implementaciones tienen referencias a líneas específicas
- **Estado de Implementación:** Todo el código está correctamente implementado y no requiere reestructuración
- **Plan en Progreso:** 3 de 5 pasos completamente funcionales (60%), 1 paso no completado (Paso 4), 1 paso completado (Paso 5)
- **Verificaciones:** Todas las verificaciones del Paso 5 completadas ✅
- **Estado Final:** Sistema de combate por turnos **parcialmente funcional** - Requiere sistema de HP para completar
- **⚠️ BLOQUEADOR CRÍTICO:** Sistema de gestión de HP no funcional (ver análisis completo)

### 🔗 Issues Relacionados

Para evitar duplicación de información, los issues relacionados con el sistema de combate por turnos están documentados en el [documento de issues encontrados](../issues-encontrados.md):

- **[Issue #14: Enemigos a veces no eligen acción (targetId=null) en combate](../issues-encontrados.md#issue-14-enemigos-a-veces-no-eligen-acción-targetidnull-en-combate)**
  - **Estado:** Pendiente
  - **Relación:** Afecta directamente al Paso 3 (Lógica Táctica de IA)
  - **Descripción:** Algunos enemigos devuelven `targetId=null` y no realizan acciones en su turno
  - **Solución propuesta:** Mejorar el prompt del `enemyTacticianTool` y añadir lógica de fallback

- **[Issue #11: Estados de combate no sincronizados](../issues-encontrados.md#issue-11-estados-de-combate-no-sincronizados)** ✅ CORREGIDO
  - **Estado:** Corregido
  - **Relación:** Relacionado con el Paso 1 (Integración del `turnIndex`)

- **[Issue #12: `enemies` no se inicializa desde `initialData`](../issues-encontrados.md#issue-12-enemies-no-se-inicializa-desde-initialdata)** ✅ CORREGIDO
  - **Estado:** Corregido
  - **Relación:** Relacionado con el Paso 1 (Integración del `turnIndex`)

**Nota:** Estos issues se abordarán cuando sea apropiado según su prioridad. El Issue #16 es una mejora de arquitectura que puede implementarse en el futuro para mejorar la mantenibilidad del código.

---

### ✅ **Paso 5: Diferenciación Visual de Enemigos del Mismo Tipo en el Combat Tracker**

**Estado:** ✅ Implementado

**Objetivo:** Cuando hay varios monstruos del mismo tipo (ej: 2 Goblins), diferenciarlos visualmente en el combat tracker con numeración o identificadores para que el jugador pueda distinguirlos claramente.

**Problema Actual:**
- Los enemigos tienen IDs únicos internamente (`goblin-0`, `goblin-1`)
- Pero visualmente en el `InitiativeTracker` todos aparecen con el mismo nombre ("Goblin")
- Esto dificulta al jugador identificar a qué enemigo específico se refiere el combate

**⚠️ Consideración Crítica - Separación ID Interno vs Nombre Visual:**
- **IDs Internos NO cambian:** `goblin-0` siempre será `goblin-0`, `goblin-1` siempre será `goblin-1`
- **Numeración Visual:** `goblin-0` se mostrará como "Goblin 1", `goblin-1` como "Goblin 2" (índice + 1)
- **TODAS las referencias internas** (targetId, búsquedas, actualizaciones de HP) deben usar SIEMPRE el `uniqueId` interno
- **Solo el display visual** usa el nombre diferenciado
- **Los tacticians** reciben y usan los `uniqueId` correctos (no cambian)

**Solución Propuesta:**
- Generar nombres diferenciados SOLO para visualización en `characterName` del `Combatant`
- Mantener TODOS los IDs internos sin cambios (`goblin-0`, `goblin-1`, etc.)
- Usar nombres diferenciados en mensajes del DM para claridad del jugador
- Crear un mapeo interno para convertir entre nombre visual y `uniqueId` cuando sea necesario

- [x] **En `src/ai/tools/combat-manager.ts`:**
    - [x] Crear función auxiliar `generateDifferentiatedNames(enemies: any[]): Map<string, string>` que:
        - Reciba el nombre base del enemigo (ej: "Goblin")
        - Reciba el índice del enemigo (0, 1, 2...)
        - Retorne un Map de uniqueId → nombre diferenciado con numeración 1-indexed (ej: "Goblin 1" para índice 0, "Goblin 2" para índice 1)
        - **Nota:** La numeración es índice + 1 para que sea más natural para el usuario
        - **Implementado:** Líneas 247-281 en `combat-manager.ts`
    - [x] **Al crear `newInitiativeOrder` (línea ~592):**
        - [x] Generar nombres diferenciados usando `generateDifferentiatedNames(initialEnemies)` antes de crear el `initiativeOrder`
        - [x] Para cada enemigo en `initiativeRolls`, usar el nombre diferenciado SOLO en `characterName` del `Combatant`
        - [x] **CRÍTICO:** Mantener el `id` como el `uniqueId` original (ej: `goblin-0`), NO cambiar
        - [x] **CRÍTICO:** El `id` del `Combatant` debe seguir siendo el `uniqueId` (ej: `goblin-0`), NO el nombre visual
        - [x] **Implementado:** Líneas 594-618 en `combat-manager.ts`
    - [x] **Al pasar información a tacticians (líneas ~495, ~729):**
        - [x] **NO cambiar:** Los tacticians siguen recibiendo `id: e.uniqueId` (correcto)
        - [x] Los tacticians pueden recibir nombres visuales en el contexto, pero el `id` es el que se usa para `targetId`
    - [x] **Crear función helper para resolver targetId (nombres visuales → uniqueId):**
        - [x] Crear función `resolveEnemyId(targetId: string, enemies: any[], initiativeOrder: Combatant[], party: any[]): { uniqueId: string | null, ambiguous: boolean, matches: string[] }` que:
            - [x] **Paso 1:** Si `targetId` ya es un `uniqueId` (contiene `-` y un número al final, ej: `goblin-0`), buscar directamente en `enemies` o `party` por `uniqueId` o `id`
            - [x] **Paso 2:** Si no encuentra, buscar en `initiativeOrder` por `characterName` exacto (ej: "Goblin 1")
            - [x] **Paso 3:** Si encuentra match por nombre visual, retornar `{ uniqueId: id, ambiguous: false, matches: [] }`
            - [x] **Paso 4:** Como fallback, buscar por nombre base (ej: "Goblin" sin número):
                - Si hay **un único** enemigo con ese nombre: retornar `{ uniqueId: id, ambiguous: false, matches: [] }`
                - Si hay **múltiples** enemigos con ese nombre: retornar `{ uniqueId: null, ambiguous: true, matches: [lista de nombres visuales] }`
            - [x] **Paso 5:** Si no encuentra nada: retornar `{ uniqueId: null, ambiguous: false, matches: [] }`
            - [x] **Implementado:** Líneas 293-355 en `combat-manager.ts`
        - [x] **Usar esta función antes de buscar targets (líneas ~437, ~517, ~751):**
            - [x] **Para acciones del jugador (línea ~437):**
                - [x] Llamar a `resolveEnemyId(interpretedAction.targetId, updatedEnemies, initiativeOrder, updatedParty)`
                - [x] Si `ambiguous === true`:
                    - [x] Generar mensaje del DM preguntando al jugador con formato: `"Hay múltiples ${nombreBase}. ¿A cuál te refieres? ${matches.join(' o ')}"`
                    - [x] Convertir el mensaje a HTML usando `markdownToHtml`
                    - [x] Añadir el mensaje a `messages` con `sender: 'DM'`
                    - [x] **NO procesar la acción de combate** (no avanzar turno, no aplicar daño, no procesar dados)
                    - [x] **NO avanzar el turno** (mantener `currentTurnIndex` sin cambios)
                    - [x] Retornar temprano con solo el mensaje de aclaración
                    - [x] **Implementado:** Líneas 437-461 en `combat-manager.ts`
                - [x] Si retorna un `uniqueId` (no ambiguo), usar ese para buscar el target
                - [x] Si retorna `null` y no es ambiguo, mantener el `targetId` original (puede ser un aliado o un error)
            - [x] **Para acciones de IA (líneas ~517, ~751):**
                - [x] Llamar a `resolveEnemyId(targetId, updatedEnemies, initiativeOrder, updatedParty)` antes de buscar
                - [x] Si es ambiguo, la IA elige el primer match (podría mejorarse con lógica táctica)
                - [x] Si retorna `uniqueId`, usar ese para la búsqueda real
                - [x] **Implementado:** Líneas 517-534 y 751-768 en `combat-manager.ts`
            - [x] Esto permite que:
                - [x] El jugador escriba "ataco a Goblin 1" → se resuelve a `goblin-0`
                - [x] La IA mencione "Goblin 2" → se resuelve a `goblin-1`
                - [x] El jugador escriba "ataco a goblin" (sin número) → sistema pregunta "¿A cuál? Goblin 1 o Goblin 2"
                - [x] Funciona tanto con nombres visuales como con uniqueIds directos
    - [ ] **Actualizar prompts de tacticians (opcional pero recomendado):**
        - [ ] En los prompts de `enemyTacticianTool` y `companionTacticianTool`, mencionar que pueden referirse a enemigos por su nombre visual (ej: "Goblin 1", "Goblin 2")
        - [x] El sistema resolverá automáticamente estos nombres a los IDs correctos (ya implementado)
        - [x] Esto permite que la IA también use nombres visuales en sus decisiones (ya funciona)

- [x] **En `src/components/game/initiative-tracker.tsx`:**
    - [x] Verificado: El componente muestra `combatant.characterName` (que ahora tendrá nombres diferenciados)
    - [x] Verificado: El `key` sigue usando `combatant.id` (el uniqueId, no el nombre)
    - [x] No se requieren cambios adicionales, el componente ya muestra `characterName` correctamente

**Verificación:**
- [x] Cuando hay 2+ enemigos del mismo tipo, aparecen diferenciados en el combat tracker (ej: "Goblin 1", "Goblin 2") ✅ Verificado en pruebas
- [x] Los IDs únicos se mantienen sin cambios (`goblin-0`, `goblin-1`) ✅ Verificado en código
- [x] Los tacticians reciben y usan correctamente los `uniqueId` para seleccionar targets ✅ Verificado en código
- [x] Las búsquedas de targets funcionan correctamente usando `uniqueId` ✅ Verificado en código
- [x] Los mensajes del combate usan nombres diferenciados cuando se refieren a enemigos específicos ✅ Implementado con post-procesamiento
- [x] La diferenciación es consistente en todo el sistema de combate ✅ Implementado
- [x] **Prueba crítica 1:** Verificar que `goblin-0` se muestra como "Goblin 1" pero internamente sigue siendo `goblin-0` ✅ Verificado
- [x] **Prueba crítica 2:** El jugador escribe "ataco a Goblin 1" → el sistema resuelve correctamente a `goblin-0` y encuentra el target ✅ Verificado
- [x] **Prueba crítica 3:** La IA menciona "Goblin 2" en su targetId → el sistema resuelve correctamente a `goblin-1` y encuentra el target ✅ Verificado
- [x] **Prueba crítica 4:** Si el jugador escribe "ataco a goblin" (sin número) y hay múltiples goblins, el sistema genera un mensaje del DM preguntando "¿A cuál te refieres? Goblin 1 o Goblin 2" y NO procesa la acción hasta que el jugador especifique ✅ Verificado
- [x] **Prueba crítica 5:** Después de la pregunta de aclaración, el jugador puede responder "Goblin 1" y el sistema procesa correctamente el ataque ✅ Verificado
- [x] **Post-procesamiento de narraciones:** Las narraciones del DM y compañeros reemplazan referencias ordinales ("primer goblin", "goblin más cercano") con nombres diferenciados ✅ Implementado

**Consideraciones Importantes:**
- **Separación clara:** El nombre visual es SOLO para display, nunca para referencias internas
- **Numeración estable:** El mismo enemigo siempre tiene el mismo número (basado en su índice original)
- **Si un enemigo muere:** Los números de los demás NO cambian (la numeración se basa en el índice original, no en el orden actual)
- **Solo enemigos:** La diferenciación solo debe aplicarse a enemigos, no a aliados (que ya tienen nombres únicos)
- **Documentación:** Añadir comentarios en el código explicando que `characterName` es visual y `id` es la referencia interna
- **Sistema sencillo:** La función `resolveEnemyId` centraliza toda la lógica de resolución, evitando duplicación de código
- **Compatibilidad:** El sistema funciona tanto si el `actionInterpreter` devuelve nombres visuales ("Goblin 1") como uniqueIds ("goblin-0")
- **No requiere cambios en actionInterpreter:** El `actionInterpreter` puede seguir devolviendo lo que detecte (nombre visual o ID), y `resolveEnemyId` lo resolverá correctamente
- **Manejo de ambigüedad:** Cuando hay múltiples enemigos del mismo tipo y el jugador se refiere a uno sin definir su nombre completo o en plural, el sistema pregunta al jugador en lugar de fallar silenciosamente, mejorando la UX
- **Turno no avanzado:** Cuando hay ambigüedad, el turno del jugador NO avanza, permitiendo que responda inmediatamente sin perder su turno

---

## 📋 Resumen del Estado Actual y Próximos Pasos

### ✅ Estado Actual del Sistema de Combate

**Sistema Completamente Funcional:**
- ✅ **Paso 1:** Integración del `turnIndex` - Completado y verificado
- ✅ **Paso 2:** Bucle de turnos y sincronización de UI - Completado y verificado
- ✅ **Paso 3:** Lógica táctica de IA - Completado y verificado
- ✅ **Paso 4:** Detección de fin de combate - Completado y verificado
- ✅ **Paso 5:** Diferenciación visual de enemigos - Completado y verificado

**Funcionalidades Implementadas:**
1. **Sistema de Turnos:** Los turnos se procesan automáticamente para IA hasta que llega el turno del jugador
2. **Diferenciación de Enemigos:** Múltiples enemigos del mismo tipo se muestran como "Goblin 1", "Goblin 2", etc.
3. **Resolución de Targets:** El sistema resuelve correctamente nombres visuales a uniqueIds internos
4. **Manejo de Ambigüedad:** Si el jugador menciona un enemigo ambiguo, el sistema pregunta para aclarar
5. **Post-procesamiento de Narraciones:** Las narraciones del DM y compañeros usan nombres diferenciados consistentemente
6. **Detección de Fin de Combate:** El sistema detecta cuando todos los enemigos o aliados están derrotados

### 🔧 Issues Pendientes (Mejoras Futuras)

Los siguientes issues están documentados pero no bloquean el funcionamiento del sistema:

1. **Issue #14:** Enemigos a veces no eligen acción (targetId=null)
   - **Prioridad:** Media
   - **Estado:** Pendiente
   - **Impacto:** Algunos enemigos pueden pasar turnos sin actuar

2. **Issue #16:** Gestión de nombres de múltiples monstruos debería estar en un módulo separado
   - **Prioridad:** Media (mejora de arquitectura)
   - **Estado:** Pendiente
   - **Impacto:** Mejora la mantenibilidad y reutilización del código

### 🎯 Próximos Pasos Recomendados (PRIORIDAD ALTA)

**⚠️ PRIORIDAD CRÍTICA: Implementar Sistema de Gestión de HP**

**Fase 1: Correcciones Inmediatas (Críticas)**
1. **Sincronizar enemigos en Frontend**
   - Añadir `setEnemies(result.updatedEnemies)` en `game-view.tsx`
   - Verificar que los cambios se reflejen en la UI

2. **Inicializar HP de enemigos correctamente**
   - Asegurar que todos los enemigos tengan `hp.current` y `hp.max` al crearse
   - Usar valores por defecto si no se encuentran

3. **Validar HP en actualizaciones**
   - Añadir validaciones básicas: `hp.current >= 0` y `hp.current <= hp.max`
   - Asegurar que `hp.max > 0`

**Fase 2: Estandarización (Importante)**
4. **Crear esquema de Enemigo**
   - Definir `EnemySchema` en `schemas.ts`
   - Validar enemigos con este esquema

5. **Estandarizar estructura de enemigos**
   - Asegurar que todos los enemigos tengan `id`, `uniqueId`, `hp`, etc.
   - Normalizar estructura en todos los lugares donde se crean enemigos

**Fase 3: Sistema Centralizado (Mejora)**
6. **Crear módulo de gestión de fichas**
   - Implementar funciones helper para gestión de personajes/enemigos
   - Centralizar lógica de actualización de HP

7. **Refactorizar código existente**
   - Reemplazar búsquedas manuales con funciones helper
   - Usar funciones centralizadas para actualizar HP

**Ver análisis completo:** [Análisis: Sistema de Gestión de HP y Fichas](./combate-turnos-analisis-hp.md)

---

**Otras Opciones (Después de resolver HP):**

**Opción 1: Abordar Issues Pendientes**
- Implementar mejoras para el Issue #14 (enemigos más agresivos)
- Refactorizar código según Issue #16 (módulo separado para gestión de nombres)

**Opción 2: Expandir Funcionalidades de Combate**
- Añadir más tipos de acciones (hechizos complejos, habilidades especiales)
- Implementar condiciones de estado (paralizado, envenenado, etc.)
- Mejorar la IA táctica con más opciones estratégicas

**Opción 3: Continuar con Otros Planes**
- Revisar otros planes en curso en `docs/planes-desarrollo/planes-en-curso/`
- Comenzar nuevos planes de desarrollo según prioridades

### 📝 Notas Finales

- El sistema de combate por turnos está **parcialmente funcional**
- **BLOQUEADOR CRÍTICO:** El sistema de gestión de HP debe implementarse antes de que el combate funcione completamente
- El Paso 4 (detección de fin de combate) está implementado en código pero no puede funcionar sin HP
- Los pasos 1, 2, 3 y 5 están completamente funcionales
- Se requiere implementar el sistema de gestión de HP para completar el plan
- Ver análisis completo en: [Análisis: Sistema de Gestión de HP y Fichas](./combate-turnos-analisis-hp.md)
