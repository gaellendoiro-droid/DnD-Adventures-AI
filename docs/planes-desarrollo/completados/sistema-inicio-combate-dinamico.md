# Plan de Implementación: Sistema de Inicio de Combate Dinámico

**Estado:** ✅ Completado
**Prioridad:** Alta
**Fecha de Finalización:** 2025-12-03
**Dependencias:** [Sistema de Exploración (Fase 2)](../completados/sistema-exploracion-mazmorras.md) ✅

## 1. Visión General
Actualmente, el combate en el juego es mayormente "consensuado" o explícito: el jugador debe declarar un ataque para iniciarlo, o el sistema debe tener un evento hardcodeado. El mundo se siente pasivo; puedes insultar a un guardia o entrar en una guarida de goblins sin que ellos reaccionen mecánicamente hasta que tú "pulsas el botón" de atacar.

Este plan busca implementar un sistema donde **el mundo reacciona a las acciones del jugador y al entorno**, iniciando el combate automáticamente cuando la narrativa o la lógica lo dicten.

## 2. Objetivos Principales

1.  **Emboscadas Automáticas:** Si el grupo entra en una ubicación con enemigos ocultos (definidos como `hazard` de tipo `ambush`) y falla su Percepción Pasiva, el combate debe iniciarse automáticamente, otorgando el factor sorpresa a los enemigos.
2.  **Hostilidad Reactiva (Consecuencias Sociales):** Las interacciones sociales agresivas (insultos graves, intentos de robo fallidos, amenazas) deben poder desencadenar combate si el NPC tiene una disposición hostil o volátil.
3.  **Combate por Proximidad (Enemigos Visibles):** Si el grupo entra en una ubicación con enemigos visibles y hostiles (ej: guardias en alerta, monstruos errantes) que no están escondidos, el combate debe iniciarse automáticamente por contacto visual.
4.  **Fallo de Sigilo:** Si el grupo intenta moverse sigilosamente pero falla su tirada contra la Percepción Pasiva de los enemigos, estos detectan la intrusión e inician combate.
5.  **Interacción con Objetos Hostiles (Mímicos/Trampas):** Interactuar con objetos que son criaturas disfrazadas (mímicos, gárgolas) o trampas de invocación debe iniciar combate inmediatamente.
6.  **Ataques Sorpresa del Jugador:** Si el jugador declara una acción ofensiva repentina fuera de combate ("Le clavo la daga mientras me da la mano"), el sistema debe transicionar fluidamente a combate, otorgando ventaja o un turno sorpresa al jugador.

---

## 3. Arquitectura Técnica

### 3.1. Nuevo Módulo: `CombatTriggerManager` ✅
Un servicio ligero en `src/ai/flows/managers/combat-trigger-manager.ts` encargado de evaluar si una situación debe escalar a combate.

*   **Entradas:**
    *   `ExplorationTriggerInput`: Resultado de entrar en una sala (¿había emboscada no detectada? ¿hay enemigos visibles? ¿fallo de sigilo?).
    *   `InteractionTriggerInput`: Resultado de una conversación o interacción con objeto (¿el NPC se ha vuelto hostil? ¿se ha tocado un objeto trampa/mímico?).
    *   `PlayerActionTriggerInput`: La intención del jugador (¿es un ataque sorpresa?).
*   **Salida (`CombatTriggerResult`):**
    *   `shouldStartCombat`: boolean.
    *   `reason`: 'ambush', 'proximity', 'stealth_fail', 'mimic', 'provocation', 'player_surprise'.
    *   `surpriseSide`: 'player' | 'enemy' | undefined.
    *   `message`: Mensaje narrativo opcional para la transición.
    *   `triggeringEntityId`: ID de la entidad que causó el combate (ej: ID del mímico). **(Implementado)**

### 3.2. Actualización de Esquemas y Tipos
Para soportar estas mecánicas, necesitamos actualizar los tipos base:

*   **`src/lib/types.ts` (Combatant):** Añadir `isSurprised?: boolean`. Esto permitirá al `TurnProcessor` identificar quién pierde su primer turno. ✅ **COMPLETADO** - Sistema de sorpresa mecánico implementado en Fase 2.
*   **`src/lib/schemas.ts` (HazardSchema):** Añadir `'mimic'` al enum de `type`. ✅ **COMPLETADO**

### 3.3. Manejo de Restricciones Técnicas (Sin Saving Throws / Ventajas)
Dado que el motor aún no soporta Tiradas de Salvación ni Ventaja/Desventaja mecánica:

*   **Sorpresa:** Se implementará como **"Pérdida de Turno"**. El `CombatManager` marcará a los combatientes sorprendidos y el `TurnProcessor` saltará su primer turno automáticamente. No se aplicará ventaja mecánica a los ataques.
*   **Detección:** Se usará exclusivamente **Percepción Pasiva** (Estática) vs CD o vs **Tirada de Sigilo** (1d20 + DEX).
*   **Trampas:** Si una trampa inicia combate, su efecto inicial será **Ataque contra CA** o **Daño Automático**, evitando pedir Saving Throws por ahora.

### 3.3. Integración con Exploración (Emboscadas)
Aprovecharemos el trabajo reciente en el `ExplorationManager`.

*   **Lógica Actual:** `ExplorationManager` detecta peligros. Si falla la percepción, el peligro se ignora (el jugador no lo ve).
*   **Nueva Lógica:** Si el peligro ignorado es `type: 'ambush'`, el `ExplorationManager` devolverá un flag `ambushTriggered: true`.
*   **Flujo:**
    1.  `GameCoordinator` recibe `ambushTriggered`.
    2.  Interrumpe el flujo narrativo normal.
    3.  Inicia `CombatManager` pasando `surprise: 'enemy'`.
    4.  El DM narra cómo los enemigos surgen de las sombras.

### 3.3. Integración con Exploración (Proximidad, Sigilo y Mímicos) ✅
**Implementado en `NarrativeTurnManager` y `GameCoordinator`:**

*   **Proximidad:** Si hay enemigos visibles y hostiles (no ocultos), el combate inicia automáticamente con `reason: 'proximity'`.
*   **Fallo de Sigilo:** Si el jugador intenta moverse sigilosamente pero falla, se dispara con `reason: 'stealth_fail'`.
*   **Mímicos:** Si el jugador interactúa con un objeto que es un hazard tipo `mimic`:
    1.  `NarrativeTurnManager` mapea el `targetId` de la interacción al ID del interactuable/hazard.
    2.  `CombatTriggerManager.evaluateInteraction` detecta el mímico y retorna `triggeringEntityId`.
    3.  `GameCoordinator` revela el enemigo oculto (cambia `disposition: 'hidden'` a `'hostile'`).
    4.  Normaliza las estadísticas del enemigo (convierte `stats.hp` a `hp: { current, max }`).
    5.  Filtra la lista de combatientes para incluir solo enemigos visibles + el enemigo revelado.
    6.  Inicia el combate con el mímico revelado.

**Nota sobre Enemigos Ocultos:**
- Los enemigos con `disposition: 'hidden'` o `status: 'hidden'` son ignorados en la verificación de proximidad.
- Solo se revelan cuando se dispara un trigger específico (ej: interacción con mímico).
- Esto permite tener múltiples enemigos ocultos en una sala sin que todos entren en combate automáticamente.

### 3.4. Detección de Intención Hostil (`ActionInterpreter`)
El router de acciones debe ser más sensible a la violencia implícita.

*   **Mejora:** Detectar frases como "Le ataco", "Saco la espada", "Le disparo" no solo como `COMBAT`, sino identificando si es un inicio de combate (desde estado pacífico).
*   **Manejo:** Si estamos fuera de combate y el jugador lanza una acción de combate, el sistema debe:
    1.  Resolver esa acción inicial (posiblemente como un "ataque gratis" o con ventaja).
    2.  Inmediatamente después, iniciar la sesión de combate formal (tiradas de iniciativa).

---

## 4. Plan de Pasos

### Fase 1: Emboscadas (Integración con Exploración) ✅
1.  Modificar `ExplorationManager` para retornar `ambushTriggered` cuando falla la detección de un hazard tipo `ambush`. (Implementado en `NarrativeTurnManager` usando `CombatTriggerManager`)
2.  Actualizar `GameCoordinator` para manejar este trigger antes de generar la narración de la sala. (Implementado)
3.  Probar con la ubicación "Emboscada Goblin" (si existe) o crear un caso de prueba. (Test unitario creado)

#### ✅ Punto de Control: Emboscadas
*   **Test Unitario:** Crear `tests/unit/combat/combat-trigger-manager.test.ts`. Verificar que `evaluateExploration` retorna `shouldStartCombat: true` cuando recibe un hazard `ambush` no detectado. **(COMPLETADO)**
*   **Test Manual:** Crear una ubicación de prueba con `hazard: { type: 'ambush', detectionDC: 30 }` (imposible de detectar). Entrar con el personaje. Verificar que el combate inicia automáticamente y el log muestra "Sorpresa: Enemigos". ✅ **VALIDADO POR USUARIO**

### Fase 1.5: Proximidad, Sigilo y Mímicos ✅ COMPLETADA
1.  ✅ Añadir lógica en `CombatTriggerManager` para evaluar entidades visibles y fallos de sigilo.
2.  ✅ Implementar detección de `hazard: 'mimic'` en interacciones.
3.  ✅ Si hay enemigos hostiles visibles, disparar combate con `reason: 'proximity'` (Iniciativa normal).
4.  ✅ Si falla sigilo, disparar con `reason: 'stealth_fail'`.
5.  ✅ Si es mímico, disparar con `reason: 'mimic'` (Sorpresa Enemigo).
6.  ✅ Sistema de revelación de enemigos ocultos: Solo el enemigo específico que dispara el combate se revela.
7.  ✅ Normalización de estadísticas: Conversión automática de `stats.hp` a `hp: { current, max }` para entidades cargadas desde JSON.

#### ✅ Punto de Control: Proximidad y Sigilo
*   **Test Unitario:** En `combat-trigger-manager.test.ts`, verificar que `evaluateExploration` inicia combate si hay entidades `type: 'enemy'` visibles. **(COMPLETADO)**
*   **Test Manual:** Entrar en una sala con un Goblin visible. Verificar inicio de combate normal. ✅ **VALIDADO POR USUARIO**
*   **Test Manual:** Entrar en sala con Goblin usando comando "Entrar sigilosamente" (simular fallo). Verificar inicio de combate.

#### ✅ Punto de Control: Mímicos
*   **Test Unitario:** Verificar que `evaluateInteraction` dispara combate si `targetId` coincide con un hazard tipo `mimic`. **(COMPLETADO)**
*   **Test Manual:** Crear ubicación con `hazard: { type: 'mimic', id: 'cofre-mimico', triggerDescription: '...' }` y entidad correspondiente con `disposition: 'hidden'`. Interactuar con el cofre ("abrir cofre"). Verificar inicio de combate con mímico revelado. ✅ **VALIDADO POR USUARIO**

**Notas de Implementación:**
- El sistema mapea automáticamente nombres de acciones/interactuables a IDs de hazards.
- Los enemigos ocultos se normalizan correctamente (conversión de `stats.hp` a `hp: { current, max }`).
- El `triggeringEntityId` permite identificar y revelar solo el enemigo específico que causó el combate.

### Fase 2: Detección de Intención (Action Interpreter) ✅ COMPLETADA
1.  ✅ Refinar `ActionInterpreter` para detectar intención hostil (ataques a NPCs neutrales/amigables).
2.  ✅ Integrar `CombatTriggerManager.evaluatePlayerAction()` en `GameCoordinator`.
3.  ✅ Añadir sala de prueba con NPC neutral (mercader) en `ambush_test.json`.
4.  ✅ Implementar sistema de sorpresa mecánico (marcar enemigos como `isSurprised`).

**Implementación completada:**
- `ActionInterpreter` detecta ataques a cualquier entidad, incluyendo NPCs neutrales.
- `GameCoordinator` evalúa si un ataque fuera de combate es un "ataque sorpresa" usando `CombatTriggerManager.evaluatePlayerAction()`.
- El log muestra "Player Surprise Attack detected" cuando se detecta un ataque sorpresa.
- `surpriseSide: 'player'` se pasa al sistema de combate para marcar enemigos como sorprendidos.
- `Combatant` interface incluye `isSurprised?: boolean`.
- `InitiativeGenerator.createInitiativeOrder` marca combatientes sorprendidos basándose en `surpriseSide`.
- `CombatTurnManager.shouldSkipTurn` verifica `isSurprised` para saltar turnos.
- `processSkippedAITurn` y `processSkippedPlayerTurn` limpian el flag `isSurprised` después del primer turno.
- Los combatientes sorprendidos reciben un mensaje narrativo: "X está sorprendido y pierde su turno."

#### ✅ Punto de Control: Intención Hostil
*   **Test Unitario:** Mockear `ActionInterpreter` para que clasifique "Atacar al guardia" como `attack`. (PENDIENTE)
*   **Test Manual:** Ir a la sala del mercader y escribir "Ataco al mercader". Verificar que el combate inicia, el log muestra "Player Surprise Attack", y el mercader pierde su primer turno. ✅ **VALIDADO POR USUARIO**

### Fase 3: Orquestación en GameCoordinator ✅ COMPLETADA
1.  ✅ Centralizar la lógica de transición: `Exploration` -> `Combat` y `Interaction` -> `Combat`.
2.  ✅ Asegurar que la narración de transición sea fluida (ej: "El guardia desenvaina su espada. ¡A las armas!").

**Nota:** La orquestación ya está implementada en `GameCoordinator` para manejar todos los tipos de triggers de combate dinámico (emboscadas, proximidad, sigilo, mímicos, ataques sorpresa del jugador).

#### ✅ Punto de Control: Integración Final
*   **Test de Regresión:** Jugar una sesión corta que incluya exploración, diálogo y combate provocado. Verificar que no hay bucles infinitos ni estados inconsistentes (ej: combate que no termina, o inicia dos veces). ✅ **VALIDADO POR USUARIO**

**Guía de Test de Regresión:**

Usar la aventura `JSON_adventures/test/ambush_test.json` y seguir esta secuencia:

1. **Inicio de Aventura:**
   - Cargar la aventura y verificar que la introducción se muestra correctamente.
   - Verificar que estás en "Sala Segura" con 4 conexiones disponibles.

2. **Test de Emboscada (Fase 1):**
   - Ir al norte ("Entramos en la sala del norte").
   - Verificar que el combate inicia automáticamente con sorpresa para enemigos.
   - Verificar que el log muestra "Sorpresa: Enemigos".
   - Completar el combate y verificar que termina correctamente.

3. **Test de Mímico (Fase 1.5):**
   - Volver a "Sala Segura" (si es necesario, recargar la partida).
   - Ir al este ("Entramos en la sala del este").
   - Verificar que NO inicia combate al entrar.
   - Interactuar con el cofre ("Abrir cofre" o "Inspeccionar cofre").
   - Verificar que el combate inicia con el mímico revelado.
   - Verificar que el mímico pierde su primer turno (sorpresa enemigo).
   - Completar el combate.

4. **Test de Proximidad (Fase 1.5):**
   - Volver a "Sala Segura".
   - Abrir la puerta del sur ("Abrir puerta del sur").
   - Verificar que NO inicia combate al abrir la puerta.
   - Entrar en la sala del sur ("Entramos en la sala del sur").
   - Verificar que el combate inicia automáticamente (proximidad con goblin visible).
   - Verificar que NO hay sorpresa (combate normal).
   - Completar el combate.

5. **Test de Ataque Sorpresa del Jugador (Fase 2):**
   - Volver a "Sala Segura".
   - Ir al oeste ("Entramos en la sala del oeste").
   - Verificar que NO inicia combate (mercader es neutral/amigable).
   - Atacar al mercader ("Ataco al mercader" o "Le clavo la daga").
   - Verificar que el combate inicia inmediatamente.
   - Verificar que el log muestra "Player Surprise Attack".
   - Verificar que el mercader pierde su primer turno (sorpresa jugador).
   - Completar el combate.

6. **Verificaciones Finales:**
   - Verificar que no hay bucles infinitos (el combate siempre termina).
   - Verificar que no se inicia combate dos veces en la misma situación.
   - Verificar que el estado del juego se mantiene consistente entre combates.
   - Verificar que las puertas abiertas permanecen abiertas después de recargar.

**Criterios de Éxito:**
- ✅ Todos los tipos de triggers funcionan correctamente.
- ✅ Las transiciones de exploración a combate son fluidas.
- ✅ El sistema de sorpresa funciona mecánicamente (turnos saltados).
- ✅ No hay errores en consola o estados inconsistentes.
- ✅ El juego puede continuar normalmente después de cada combate.

## 5. Criterios de Éxito

### ✅ Completados
*   ✅ Entrar en una zona de emboscada sin detectarla inicia combate automáticamente.
*   ✅ Entrar en una zona con enemigos hostiles visibles inicia combate automáticamente.
*   ✅ Fallar una tirada de sigilo al acercarse a enemigos inicia combate.
*   ✅ Interactuar con un objeto trampa/mímico inicia combate (con revelación del enemigo oculto).

### ✅ Todos Completados
*   ✅ Entrar en una zona de emboscada sin detectarla inicia combate automáticamente.
*   ✅ Entrar en una zona con enemigos hostiles visibles inicia combate automáticamente.
*   ✅ Fallar una tirada de sigilo al acercarse a enemigos inicia combate.
*   ✅ Interactuar con un objeto trampa/mímico inicia combate (con revelación del enemigo oculto).
*   ✅ Atacar a un NPC neutral inicia combate inmediatamente. (Fase 2: Detección de Intención)
*   ✅ Test de Regresión completo - Todos los tipos de triggers funcionan correctamente.

## 6. Detalles de Implementación Técnica

### 6.1. Manejo de Enemigos Ocultos
**Problema:** Los enemigos con `disposition: 'hidden'` no deben iniciar combate por proximidad, pero sí cuando se interactúa con ellos (ej: mímicos).

**Solución Implementada:**
- `CombatTriggerManager.evaluateExploration` filtra entidades con `disposition === 'hidden'` o `status === 'hidden'` en la verificación de proximidad.
- `NarrativeTurnManager` pasa el objeto completo de la entidad (no solo `name`, `description`, `type`) para preservar propiedades como `disposition`.
- `GameCoordinator` usa `triggeringEntityId` del `CombatTriggerResult` para identificar y revelar solo el enemigo específico que causó el combate.
- Los enemigos revelados se actualizan con `disposition: 'hostile'` y se pasan a `CombatManager` a través de `enemiesByLocation`.

### 6.2. Normalización de Estadísticas de Entidades
**Problema:** Las entidades cargadas desde JSON tienen `stats: { hp: 58, ac: 12 }`, pero el sistema de combate espera `hp: { current: 58, max: 58 }` y `ac: 12` en la raíz.

**Solución Implementada:**
- En `GameCoordinator.ts`, cuando se cargan enemigos desde `adventureData` (fallback), se normalizan automáticamente:
  ```typescript
  if (entity.stats?.hp && !entity.hp) {
      return {
          ...entity,
          hp: { current: entity.stats.hp, max: entity.stats.hp },
          ac: entity.stats.ac
      };
  }
  ```

### 6.3. Mapeo de Interacciones a IDs de Hazards
**Problema:** `ActionInterpreter` puede devolver nombres de acciones (ej: "Abrir cofre") en lugar de IDs de hazards/interactuables.

**Solución Implementada:**
- `NarrativeTurnManager` busca en `interactables` de la ubicación para mapear el `targetId` de la interacción al ID real del interactuable/hazard.
- `CombatTriggerManager.evaluateInteraction` también realiza búsqueda flexible por coincidencias parciales (palabras clave como "cofre").

### 6.4. Compatibilidad de Campos de Introducción
**Problema:** Algunos JSONs usan `introduction` mientras que el código buscaba solo `introductoryNarration` u `openingScene`.

**Solución Implementada:**
- `GameInitializer` ahora busca en tres campos: `introductoryNarration`, `openingScene`, e `introduction`.

## 7. Futuras Mejoras (Fuera de Alcance Actual)
*   **Provocación Social (Interaction Expert):** Añadir lógica al `InteractionExpert` para que los NPCs puedan decidir atacar basándose en interacciones sociales agresivas (insultos graves, amenazas, intentos de robo fallidos). Definir umbrales de paciencia o reglas simples para NPCs (ej: Guardias atacan si ven crímenes, Bandidos atacan si se les amenaza). Esto permitiría transiciones fluidas de diálogo a combate cuando un NPC decide que ha tenido suficiente.
*   **Ruido y Refuerzos:** Enemigos de salas adyacentes que se unen al combate al oír ruido fuerte (ej: *Thunderwave*).
*   **Fin de Efectos Mágicos:** NPCs que se vuelven hostiles automáticamente cuando termina un hechizo de encanto (*Charm Person*, *Friends*).
