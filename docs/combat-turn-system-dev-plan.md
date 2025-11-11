# Plan de Acción: Finalización del Sistema de Turnos de Combate

Este documento detalla los pasos necesarios para implementar un sistema de turnos de combate proactivo y funcional. El objetivo es transformar el `combatManager` de un gestor de acciones pasivo a un orquestador de turnos que pueda ejecutar una secuencia completa de turnos de IA hasta que el control deba devolverse al jugador.

---

### ✅ **Paso 1: Integración del `turnIndex` en el Flujo de Datos**

**Objetivo:** Asegurar que el `turnIndex` y todo el estado de combate fluye correctamente entre el frontend y el backend durante una sesión de juego activa.

- [x] **En `src/app/page.tsx`:**
    - [x] **Partidas Nuevas:** Añadir `turnIndex: 0` a `initialGameData` en `handleNewGame` y `handleLoadAdventure`.

- [x] **En `src/components/game/game-view.tsx`:**
    - [x] **Crear Estado:** Añadir el estado para gestionar el `turnIndex`: `const [turnIndex, setTurnIndex] = useState(initialData.turnIndex || 0);`.
    - [x] **Enviar Estado:** En `handleSendMessage`, incluir el `turnIndex` actual en la llamada a `processPlayerAction`.
    - [x] **Recibir Estado:** En `handleSendMessage`, añadir la lógica para actualizar el estado desde la respuesta del backend: `if (result.turnIndex !== undefined) setTurnIndex(result.turnIndex);`.
    - [x] **Corregir Bug de Estado:** Asegurar que el `initiativeOrder` se incluye en la llamada a `processPlayerAction` durante el combate para evitar errores de estado ausente.

- [x] **En `src/ai/flows/game-coordinator.ts`:**
    - [x] **Añadir Log:** Al inicio del flujo, añadir un `debugLog` que muestre el `turnIndex` recibido: `GameCoordinator: Received action. ... turnIndex: ${input.turnIndex}.`

**Verificación:**
- [x] **Prueba de Flujo:** Iniciar un combate y verificar en el `debugLog` que la llamada al `gameCoordinator` muestra el `turnIndex` correcto enviado desde el frontend.

---

### ✅ **Paso 2: Implementación del Bucle de Turnos y Sincronización de la UI**

**Objetivo:** Crear la estructura lógica del bucle de turnos y asegurar que la UI refleje el estado actual del combate.

- [x] **En `src/ai/tools/combat-manager.ts` (Backend):**
    - [x] Modificar la función principal para que, cuando `inCombat` sea `true`, inicie un bucle `while`.
    - [x] La condición del bucle debe continuar mientras el combatiente activo (`initiativeOrder[turnIndex]`) sea controlado por la IA.
    - [x] **Añadir Log de Iteración:** Dentro del bucle, añadir un `debugLog`: `CombatManager Loop: Processing turn for AI combatant [Nombre del PNJ] at index ${turnIndex}...`.
    - [x] Incrementar el `turnIndex` al final de cada iteración.
    - [x] **Añadir Log de Salida:** Después de que el bucle termine, añadir un `debugLog`: `CombatManager Loop: Stopped. Control ceded to player [Nombre del Jugador] at index ${turnIndex}.`.

- [x] **En `src/components/game/initiative-tracker.tsx` (Frontend):**
    - [x] Modificar el componente para que acepte una nueva prop, `currentTurnIndex`.
    - [x] Aplicar un estilo visual (ej. un borde resaltado, un cambio de color de fondo) al elemento de la lista que corresponda al `currentTurnIndex` para que el jugador sepa de quién es el turno.

- [x] **En `src/components/layout/left-panel.tsx` (Frontend):**
    - [x] Pasar el `turnIndex` del estado de `GameView` como la prop `currentTurnIndex` al componente `InitiativeTracker`.

**Verificación:**
- [x] **Verificación del Backend:** Iniciar un combate donde los primeros turnos sean de la IA (ej: `[IA, IA, Jugador]`). Al enviar la primera acción del jugador, el `debugLog` deberá mostrar los logs de "Processing turn..." para cada PNJ, seguidos del log "Loop: Stopped.".
- [x] **Verificación del Frontend:** Al iniciarse un combate, el primer combatiente en el `InitiativeTracker` debe estar resaltado. Después de que el bucle de la IA se ejecute y ceda el control al jugador, el resaltado en el `InitiativeTracker` debe moverse al personaje del jugador.

---

### 🎯 **Paso 3: Integración del `enemyTacticianTool` y Ejecución de Acciones de IA**

**Objetivo:** Dar vida al bucle. Hacer que los PNJ tomen decisiones y sus acciones tengan consecuencias.

- [ ] **En `src/ai/tools/combat-manager.ts`:**
    - [ ] Dentro del bucle `while`, reemplazar el `debugLog` con una llamada al `enemyTacticianTool`.
    - [ ] Crear una función auxiliar, `executeCombatAction`, que reciba la acción decidida por el `enemyTactician`.
    - [ ] `executeCombatAction` debe:
        - [ ] Realizar las tiradas de dados (`diceRollerTool`).
        - [ ] Calcular el daño.
        - [ ] Actualizar el HP del objetivo en el `updatedParty`.
        - [ ] Generar los `messages` y `diceRolls` para el frontend.

**Verificación:**
- [ ] Al iniciar un combate, la secuencia de turnos de la IA se ejecutará automáticamente. Se deben ver en la UI los mensajes de ataque, las tiradas de dados y la actualización del HP de los objetivos.

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
