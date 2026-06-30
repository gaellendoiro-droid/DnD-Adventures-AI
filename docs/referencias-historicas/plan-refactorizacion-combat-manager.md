# Plan de Refactorización: CombatManager (El "God Object")

## 🎯 Objetivo
Desmantelar el monolito `combat-manager.ts` (aprox. 2000 líneas) y distribuir sus responsabilidades en módulos especializados, cohesivos y testables. El objetivo es mejorar la mantenibilidad y permitir futuras expansiones (ej: sistema de hechizos complejo) sin riesgo de romper todo el combate.

## 🏗️ Nueva Arquitectura Propuesta

### 1. `CombatRulesEngine` (Motor de Reglas)
*   **Responsabilidad:** Funciones puras que implementan las reglas de D&D 5e.
*   **Contenido:**
    *   Cálculo de modificadores de ataque/daño.
    *   Determinación de acierto/fallo/crítico/pifia.
    *   Reglas de muerte masiva y salvaciones de muerte.
    *   Validación de objetivos válidos.
*   **Ubicación:** `src/lib/combat/rules-engine.ts`

### 2. `CombatTurnManager` (Gestor de Turnos)
*   **Responsabilidad:** Gestionar el flujo de la iniciativa y el estado de los turnos.
*   **Contenido:**
    *   Avance de índice de turno.
    *   Saltar turnos de combatientes muertos/inconscientes.
    *   Detección de fin de combate.
    *   Gestión de la cola de iniciativa.
*   **Ubicación:** `src/lib/combat/turn-manager.ts`

### 3. `CombatActionProcessor` (Procesador de Acciones)
*   **Responsabilidad:** Ejecutar la lógica de las acciones específicas.
*   **Contenido:**
    *   `processAttack()`: Orquesta la tirada de ataque, daño y aplicación de HP.
    *   `processCastSpell()`: (Futuro)
    *   `processUseItem()`: (Futuro)
*   **Ubicación:** `src/lib/combat/action-processor.ts`

### 4. `CombatManagerTool` (La Fachada)
*   **Responsabilidad:** Mantener la interfaz pública para Genkit, pero delegar toda la lógica a los nuevos módulos.
*   **Estado Final:** Debería reducirse a ~200 líneas de código de "pegamento".

---

## 📋 Pasos de Implementación (Incremental)

### Paso 4: Limpieza Final
1.  Eliminar código muerto en `combat-manager.ts`.
2.  Verificar que todos los imports estén limpios.

---

## 🧪 Plan de Verificación

### 1. Tests Unitarios (Nuevos)
*   `rules-engine.test.ts`: Verificar cálculos de daño crítico (doble dado, no mod), reglas de muerte masiva, etc.
*   `turn-manager.test.ts`: Verificar que salta correctamente a jugadores muertos.

### 2. Tests de Regresión (Manuales)
Usaremos el script `tests/manual/test-combat-scenarios.ts` (que crearemos) para simular un combate completo:
1.  Inicio de combate.
2.  Ataque de jugador (impacto normal).
3.  Ataque de jugador (crítico).
4.  Turno de enemigo (IA).
5.  Muerte de enemigo.
6.  Fin de combate.

El objetivo es que el comportamiento externo sea **idéntico** al actual, pero con un código interno mucho más limpio.
