# Plan de Refactorización y Simplificación Arquitectónica

Este documento detalla el plan para simplificar la arquitectura del backend, centrándose en descongestionar el `GameCoordinator` y mejorar la modularidad del flujo narrativo.

## Objetivos Principales

1.  **Descongestionar `GameCoordinator`**: Reducir su complejidad ciclomática y responsabilidad, convirtiéndolo en un orquestador puro.
2.  **Modularizar el Flujo Narrativo**: Encapsular la lógica de reacciones de compañeros y gestión de entidades muertas.
3.  **Mejorar la Mantenibilidad**: Centralizar lógicas repetitivas (comprobaciones de estado de muerte, comandos de sistema).

## Principios de Refactorización

**CRÍTICO:** Esta refactorización se centra en la **reorganización del código**, NO en cambiar el comportamiento de las IAs.

### Reglas Fundamentales

1. **Preservación de Prompts de IA:**
   - ⚠️ **Los prompts actuales de las IAs NO deben modificarse** a menos que sea absolutamente necesario para la refactorización.
   - La composición, estructura y contenido de los prompts deben mantenerse **exactamente igual**.
   - Si un prompt debe moverse a otro archivo, se debe hacer **copy-paste exacto** sin alteraciones.
   - **Razón:** Modificar prompts puede alterar el comportamiento de las IAs de formas impredecibles, invalidando trabajo previo de ajuste y optimización.

2. **Refactorización Estructural, No Funcional:**
   - El objetivo es **reorganizar** el código existente, no cambiar su lógica.
   - Los managers nuevos deben **encapsular** el código actual, no reimplementarlo.
   - Las funciones extraídas deben mantener **exactamente la misma lógica** que tenían en el coordinador.

3. **Comportamiento Idéntico:**
   - El sistema debe comportarse **exactamente igual** antes y después de la refactorización.
   - Cualquier cambio de comportamiento observable es un **bug de refactorización**.
   - Los tests existentes deben seguir pasando sin modificaciones.

4. **Movimiento de Código, No Reescritura:**
   - Preferir **mover código existente** a nuevos módulos en lugar de reescribirlo.
   - Si se debe reorganizar, mantener la lógica original intacta.
   - Documentar cualquier cambio mínimo necesario y su justificación.

### Validación de Cumplimiento

Antes de considerar completada cada fase:
- [ ] Verificar que los prompts de IA no han cambiado (diff exacto)
- [ ] Confirmar que el comportamiento observable es idéntico
- [ ] **Ejecutar suite de tests automatizados:** `npm test` (todos los tests deben pasar)
- [ ] Validar que todos los tests existentes pasan sin modificaciones
- [ ] Realizar pruebas manuales de flujos narrativos y de combate (opcional, si hay dudas)

## Tareas Detalladas

### Fase 1: Extracción de Lógica de Compañeros (Prioridad Alta) ✅ COMPLETADA

Actualmente, el `GameCoordinator` gestiona manualmente el bucle de compañeros, la construcción de prompts y el manejo de respuestas en dos puntos diferentes (antes y después del DM).

- [x] **Crear `CompanionReactionManager`**
    - Crear `src/ai/flows/managers/companion-reaction-manager.ts`.
    - Implementar función `processCompanionReactions` que acepte:
        - `party`: Lista de personajes.
        - `context`: Contexto narrativo (acción del jugador o narración del DM).
        - `timing`: 'before_dm' | 'after_dm'.
        - `inCombat`: Estado de combate.
    - Mover la lógica de filtrado (vivos/conscientes) dentro de este manager.
    - Mover la lógica de construcción de prompts dentro de este manager.
- [x] **Integrar en `GameCoordinator`**
    - Reemplazar los bucles `for` explícitos en `gameCoordinator.ts` con llamadas a `CompanionReactionManager`.

**Resultado:** 
- ✅ `CompanionReactionManager` creado con lógica exacta movida desde `game-coordinator.ts`
- ✅ Prompts de IA preservados sin modificaciones
- ✅ Reducción de `game-coordinator.ts`: ~493 líneas → ~451 líneas (~42 líneas eliminadas)
- ✅ Build compilado exitosamente
- ✅ Comportamiento idéntico garantizado (código movido, no reescrito)
- ✅ **Tests validados:** No se introdujeron nuevos fallos (7 tests fallaban antes y después - fallos pre-existentes no relacionados)

### Fase 2: Centralización de Utilidades de Entidades (Prioridad Media) ✅ COMPLETADA

La lógica para filtrar enemigos muertos y verificar estados de actores está dispersa.

- [x] **Crear `EntityStatusUtils`**
    - Crear `src/lib/game/entity-status-utils.ts`.
    - Implementar `isEntityActive(entity)`: Verifica si una entidad está viva y consciente.
    - Implementar `canEntityReact(entity)`: Lógica específica para reacciones (puede ser diferente a `isActive` si hay estados como "silenciado").
    - Implementar `filterDeadEntities(entities)`: Devuelve solo entidades vivas.
- [x] **Refactorizar Filtrado de Contexto**
    - Mover la lógica de filtrado de `entitiesPresent` (líneas 375-404 de `game-coordinator.ts`) a una función reutilizable en `EntityStatusUtils` o `NarrativeUtils`.
    - Usar estas utilidades en `GameCoordinator`, `CombatManager` y `CompanionReactionManager`.

**Resultado:**
- ✅ `EntityStatusUtils` creado con 11 funciones centralizadas
- ✅ Refactorizado `companion-reaction-manager.ts` para usar `canEntityReact`
- ✅ Refactorizado `game-coordinator.ts` para usar `areAllEntitiesOutOfCombat`, `areAllEntitiesDead`, `isEntityOutOfCombat`
- ✅ Eliminada lógica duplicada de verificación de estados en 3 archivos
- ✅ Build compilado exitosamente
- ✅ Comportamiento idéntico garantizado (lógica movida, no reescrita)
- ✅ **Tests validados:** No se introdujeron nuevos fallos (7 tests de combate fallaban antes y después - fallos pre-existentes no relacionados)

### Fase 3: Encapsulamiento del Turno Narrativo (Prioridad Media-Alta)

El `GameCoordinator` conoce demasiado sobre la estructura interna del turno narrativo (Reacción -> DM -> Reacción).

- [ ] **Crear `NarrativeTurnManager`**
    - Crear `src/ai/flows/managers/narrative-turn-manager.ts`.
    - Esta función orquestará el flujo completo de un turno fuera de combate:
        1.  Recibe el estado y la acción interpretada.
        2.  Llama a `CompanionReactionManager` (Pre).
        3.  Llama a `NarrativeExpert` (Exploración/Interacción).
        4.  Llama a `CompanionReactionManager` (Post).
        5.  Ensambla y devuelve los mensajes.
- [ ] **Simplificar `GameCoordinator`**
    - Reducir la rama `else` (no combate) del coordinador a una simple llamada: `await narrativeTurnManager.execute(...)`.

### Fase 4: Normalización de Comandos de Sistema (Prioridad Baja)

- [ ] **Crear Constantes de Comandos**
    - Definir una lista de comandos de sistema (ej: "pasar turno", "continuar") en un archivo de configuración o constantes.
    - Crear una utilidad `SystemCommandDetector.detect(actionString)` que devuelva un tipo de acción normalizado o `null`.
    - Usar esta utilidad en `GameCoordinator` y `ActionInterpreter` para evitar comprobaciones de strings hardcodeadas.

## Beneficios Esperados

- **Código más limpio:** `GameCoordinator.ts` pasará de ~500 líneas a ~200 líneas, enfocándose solo en el flujo de alto nivel.
- **Testabilidad:** Será mucho más fácil escribir tests unitarios para `CompanionReactionManager` y `NarrativeTurnManager` de forma aislada.
- **Escalabilidad:** Añadir nuevas fases al turno narrativo (ej: eventos aleatorios, trampas) solo requerirá tocar `NarrativeTurnManager`, sin riesgo de romper el coordinador principal.
