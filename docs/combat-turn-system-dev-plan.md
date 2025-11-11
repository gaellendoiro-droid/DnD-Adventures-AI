# Plan de Acción: Finalización del Sistema de Turnos de Combate

Este documento detalla los pasos necesarios para implementar un sistema de turnos de combate proactivo y funcional. El objetivo es transformar el `combatManager` de un gestor de acciones pasivo a un orquestador de turnos que pueda ejecutar una secuencia completa de turnos de IA hasta que el control deba devolverse al jugador.

---

### ✅ **Paso 1: Integración del `turnIndex` en el Flujo de Datos**

**Objetivo:** Asegurar que el `turnIndex` y todo el estado de combate fluye correctamente entre el frontend y el backend durante una sesión de juego activa.

- [x] **En `src/app/page.tsx`:**
    - [x] **Partidas Nuevas:** Añadir `turnIndex: 0` a `initialGameData`.

- [x] **En `src/components/game/game-view.tsx`:**
    - [x] **Crear Estado:** Añadir el estado para gestionar el `turnIndex`.
    - [x] **Enviar Estado:** Incluir el `turnIndex` actual en la llamada a `processPlayerAction`.
    - [x] **Recibir Estado:** Añadir la lógica para actualizar el estado desde la respuesta del backend.
    - [x] **Corregir Bug de Estado:** Asegurar que el `initiativeOrder` se incluye en la llamada a `processPlayerAction` durante el combate.

- [x] **En `src/ai/flows/game-coordinator.ts`:**
    - [x] **Añadir Log:** Al inicio del flujo, añadir un `debugLog` que muestre el `turnIndex` recibido.

**Verificación:**
- [x] **Prueba de Flujo:** Se ha verificado en el `debugLog` que el `turnIndex` se envía y recibe correctamente.

---

### ✅ **Paso 2: Implementación del Bucle de Turnos y Sincronización de la UI**

**Objetivo:** Crear la estructura lógica del bucle de turnos y asegurar que la UI refleje el estado actual del combate.

- [x] **En `src/ai/tools/combat-manager.ts` (Backend):**
    - [x] Implementar el bucle `while` que se ejecuta mientras el turno sea de una IA.
    - [x] Añadir logs de iteración y de salida del bucle.
- [x] **En `src/components/game/initiative-tracker.tsx` y `src/components/layout/left-panel.tsx` (Frontend):**
    - [x] Pasar y utilizar la prop `currentTurnIndex` para resaltar el combatiente activo.

**Verificación:**
- [x] **Verificación del Backend:** El `debugLog` muestra correctamente el procesamiento de los turnos de la IA en secuencia.
- [x] **Verificación del Frontend:** El `InitiativeTracker` resalta correctamente el combatiente activo, moviéndose al jugador cuando la IA cede el control.

---

### ✅ **Paso 3: Implementación y Depuración de la Lógica Táctica de IA**

**Objetivo:** Dar vida al bucle de combate, asegurando que tanto los compañeros como los enemigos actúen de forma inteligente, diferenciada y sin errores.

- [x] **En `src/ai/tools/` (Aplicable a `enemy-tactician.ts` y `companion-tactician.ts`):**
    - [x] **Revisar Esquema de Salida:** Modificar el `outputSchema` para que devuelva un `targetId` estructurado.
    - [x] **Actualizar Prompt:** Modificar los prompts para que la IA devuelva el `targetId`.
- [x] **En `src/ai/tools/combat-manager.ts`:**
    - [x] Dentro del bucle `while`, implementar la lógica de dirección de IA.
    - [x] Invocar al `companionTacticianTool` para compañeros y al `enemyTacticianTool` para enemigos.
    - [x] Leer el `targetId` de la respuesta y procesar la acción sin expresiones regulares.
- [x] **Depuración del Comportamiento Pasivo de la IA:**
    - [x] **Añadir Logging:** Se introdujo un campo `debugLog` en el output de las herramientas tácticas para capturar su `input` exacto.
    - [x] **Diagnóstico del Problema:** El análisis de los logs reveló que el prompt del `companionTacticianTool` era ambiguo, causando que las IAs no actuaran si no había necesidad de curar.
    - [x] **Solución Iterativa del Prompt:** Se refactorizó el prompt del `companionTacticianTool` con una lógica condicional explícita: **SI** se puede curar **Y** un aliado está herido, **ENTONCES** curar. **EN CASO CONTRARIO**, atacar. Esta solución resolvió tanto la pasividad como los errores de validación de esquema (`null` output).

**Verificación:**
- [x] La secuencia de turnos de la IA se ejecuta automáticamente sin errores.
- [x] Se ha confirmado mediante logs que todos los compañeros (magos, clérigos, etc.) y enemigos toman acciones decisivas y lógicas en cada turno.
- [x] El bug de la pasividad de la IA y los errores de `INVALID_ARGUMENT` han sido solucionados por completo. Las acciones se procesan correctamente actualizando el estado del juego.

---

### 🏁 **Paso 4: Implementación de la Condición de Fin de Combate**

**Objetivo:** Detectar cuándo el combate ha terminado y limpiar el estado del juego.

- [ ] **En `src/ai/tools/combat-manager.ts`:**
    - [ ] Crear una función `checkEndOfCombat` que se llame después de cada acción.
    - [ ] **Añadir Log de Verificación:** Dentro de la función, añadir un `debugLog`: `checkEndOfCombat: Checking for end of combat...`.
    - [ ] Implementar la lógica para comprobar si todos los enemigos o todos los aliados han sido derrotados.
    - [ ] Si el combate ha terminado:
        - [ ] **Añadir Log de Fin:** Añadir un `debugLog`: `checkEndOfCombat: End of combat detected! [Razón: ej. Todos los enemigos derrotados]`.
        - [ ] Devolver el estado final con `inCombat: false`, `turnIndex: 0`, `initiativeOrder: []`, y un mensaje de conclusión.

**Verificación:**
- [ ] Al derrotar al último enemigo, el `debugLog` mostrará que el fin del combate fue detectado. El panel de iniciativa en la UI desaparecerá, y la siguiente acción del jugador será procesada por el flujo narrativo, no por el de combate.
