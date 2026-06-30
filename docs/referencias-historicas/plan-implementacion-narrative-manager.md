# Plan de Implementación: NarrativeManager (Arquitectura Híbrida)

## 🎯 Objetivo
Refactorizar el sistema de narración actual (`narrativeExpert`) para convertirlo en un **Gestor de Narrativa (`NarrativeManager`)** que orqueste dos nuevos módulos especializados: **Exploración** e **Interacción**. Esto permitirá una experiencia de juego fluida (Modo Blando) frente a la rigidez del combate (Modo Duro).

## 🛠️ Componentes a Desarrollar

### 1. `ExplorationExpert` (Nuevo)
*   **Responsabilidad:** Generar descripciones ambientales, gestionar movimiento, percepción pasiva y "dungeon turns".
*   **Entrada:** `action`, `locationContext`, `gameState`.
*   **Salida:** Texto descriptivo enfocado en los sentidos y el entorno.

### 2. `InteractionExpert` (Nuevo)
*   **Responsabilidad:** Gestionar diálogos con NPCs, psicología, tiradas sociales y cambios de actitud.
*   **Entrada:** `action`, `npcContext`, `gameState`.
*   **Salida:** Diálogo del NPC y metadatos de cambio de actitud.

### 3. `NarrativeManager` (Refactorización de `NarrativeExpert`)
*   **Responsabilidad:**
    *   Analizar la intención del jugador (¿Exploración? ¿Interacción? ¿Ambas?).
    *   Llamar a los expertos necesarios.
    *   Sintetizar las respuestas en una narrativa coherente.
*   **Lógica de Orquestación:**
    *   Si `intención == EXPLORATION` -> Llama a `ExplorationExpert`.
    *   Si `intención == INTERACTION` -> Llama a `InteractionExpert`.
    *   Si `intención == HYBRID` -> Llama a ambos y combina.

### 4. Actualización de `GameCoordinator`
*   **Cambio:** Actualizar la llamada al antiguo `narrativeExpert` para usar el nuevo `NarrativeManager`.

---

## 📋 Pasos de Implementación

### Paso 1: Crear `ExplorationExpert`
1.  Crear `src/ai/flows/experts/exploration-expert.ts`.
2.  Definir esquema de entrada/salida (Zod).
3.  Implementar prompt de sistema enfocado en atmósfera y detalles sensoriales.

### Paso 2: Crear `InteractionExpert`
1.  Crear `src/ai/flows/experts/interaction-expert.ts`.
2.  Definir esquema de entrada/salida (Zod).
3.  Implementar prompt de sistema enfocado en personalidad y diálogo.

### Paso 3: Implementar `NarrativeManager`
1.  Renombrar/Refactorizar `src/ai/flows/narrative-expert.ts` a `src/ai/flows/narrative-manager.ts`.
2.  Implementar lógica de enrutamiento basada en la acción del jugador.
3.  Implementar lógica de síntesis de respuestas.

### Paso 4: Integración
1.  Actualizar `src/ai/flows/game-coordinator.ts` para importar y usar `narrativeManagerFlow`.

---

## 🧪 Plan de Pruebas

### 1. Tests Unitarios (Jest)
Crearemos un archivo de test `src/ai/flows/narrative-manager.test.ts` (si no existe infraestructura de test, la crearemos básica).

*   **Test 1: Exploración Pura**
    *   Input: "Miro alrededor de la habitación."
    *   Expectativa: `NarrativeManager` llama solo a `ExplorationExpert`.
*   **Test 2: Interacción Pura**
    *   Input: "Saludo al guardia."
    *   Expectativa: `NarrativeManager` llama solo a `InteractionExpert`.
*   **Test 3: Híbrido**
    *   Input: "Camino hacia la puerta mientras le pregunto al guardia por el rey."
    *   Expectativa: `NarrativeManager` llama a AMBOS y devuelve una respuesta combinada.

### 2. Verificación Manual
1.  Iniciar el juego (`npm run dev`).
2.  **Escenario Híbrido:**
    *   Situación: Estar en una habitación con un NPC.
    *   Acción: "Me acerco a la chimenea y le pregunto al anciano qué está cocinando."
    *   Verificación: La respuesta debe describir el calor/olor de la chimenea (Exploración) Y la respuesta del anciano (Interacción) en un solo párrafo fluido.
