# Análisis y Propuesta de Mejora: Arquitectura del Motor de Juego

## 1. Análisis de la Arquitectura Actual

### 1.1. Componentes Principales (Pilares)

El motor actual se basa en un flujo lineal orquestado por `game-coordinator.ts`, que delega tareas a "Expertos" especializados.

*   **Game Coordinator (`game-coordinator.ts`)**:
    *   **Rol**: Orquestador central y punto de entrada único.
    *   **Responsabilidad**: Recibe el estado, llama al `Action Interpreter`, decide si activar `Combat Manager` o `Narrative Expert`, gestiona las reacciones de compañeros (antes y después del DM) y devuelve la respuesta al cliente.
    *   **Problema Detectado**: Actúa como un "God Object" procedimental. Contiene lógica de negocio mezclada con orquestación (ej: verificaciones de Game Over, filtrado de enemigos muertos, lógica de "continuar turno"). Cualquier cambio en el flujo requiere modificar este archivo monolítico.

*   **Action Interpreter (`action-interpreter.ts`)**:
    *   **Rol**: Clasificador de intenciones.
    *   **Responsabilidad**: Determina qué quiere hacer el jugador (Atacar, Mover, Interactuar, OOC) basándose en prioridades estrictas.
    *   **Estado**: Robusto, con lógica de fallback y reintentos. Bien desacoplado.

*   **Combat Manager (`combat-manager.ts`)**:
    *   **Rol**: Gestor de combate completo.
    *   **Responsabilidad**: Maneja turnos, tiradas de dados, aplicación de daño, reglas de D&D 5e y narración de combate.
    *   **Problema Detectado**: Excesiva responsabilidad (Violación de SRP). Es un archivo de >1900 líneas que mezcla lógica de reglas (cálculo de AC, daño), gestión de estado (actualizar HP, arrays de enemigos) y generación de texto (prompts de narración). Es difícil de mantener y testear.

*   **Narrative Expert (`narrative-expert.ts`)**:
    *   **Rol**: Narrador de exploración/historia.
    *   **Responsabilidad**: Genera descripciones inmersivas basadas en acciones interpretadas.
    *   **Estado**: Enfocado y funcional, pero su dependencia del contexto inyectado manualmente por el coordinador lo hace rígido.

### 1.2. Limitaciones Identificadas

1.  **Acoplamiento Rígido**: El `Game Coordinator` conoce explícitamente a todos los expertos y sus interfaces. Añadir un nuevo sistema (ej: "Trampas", "Comercio", "Puzzles") requeriría reescribir el coordinador.
2.  **Gestión de Estado Dispersa**: El estado (`GameState`) se pasa como argumento y se devuelve modificado parcialmente por cada herramienta. No hay una "fuente de verdad" centralizada o un gestor de transiciones de estado formal.
3.  **Dificultad de Escalado**: La lógica de combate está atrapada dentro de una única herramienta gigante (`combat-manager`). Añadir mecánicas complejas (hechizos de área, condiciones persistentes) hará que este archivo sea inmanejable.
4.  **Reactividad Limitada**: Las reacciones de los compañeros están "hardcoded" en puntos específicos del flujo (antes/después del DM). No hay un sistema de eventos que permita a un NPC reaccionar dinámicamente a cualquier estímulo (ej: alguien recibe daño, se abre una puerta).

---

## 2. Propuesta de Mejora de Arquitectura

### 2.1. Nueva Arquitectura: "Pipeline de Eventos y Estados"

Se propone mover de un modelo **Procedimental Monolítico** a un modelo basado en **Máquina de Estados y Pipeline de Procesamiento**.

#### Conceptos Clave:

1.  **Game Context (Contexto Unificado)**:
    *   Un objeto que encapsula el `GameState` actual, pero también provee métodos para emitir eventos y registrar cambios.
    *   Reemplaza el paso de argumentos sueltos.

2.  **State Machine (Máquina de Estados)**:
    *   El juego siempre está en un estado explícito: `EXPLORATION`, `COMBAT`, `DIALOGUE`, `SYSTEM_PROCESSING`.
    *   El `Game Coordinator` delega la ejecución al "Handler" del estado actual.

3.  **Pipeline de Procesamiento**:
    *   Cada acción del jugador pasa por fases estandarizadas:
        1.  **Input**: Recepción y validación.
        2.  **Interpretation**: (`Action Interpreter`) ¿Qué quiere hacer?
        3.  **Resolution**: Ejecución de la lógica (Reglas D&D, cambios de HP).
        4.  **Narration**: Generación de la descripción (DM).
        5.  **Reaction**: NPCs/Compañeros reaccionan al evento.

### 2.2. Refactorización de Componentes

#### A. Desacoplar el `Game Coordinator`
Convertirlo en un **Dispatcher**.
*   Recibe el input.
*   Consulta el `CurrentState`.
*   Envía el input al `StateHandler` correspondiente (ej: `ExplorationHandler` o `CombatHandler`).

#### B. Modularizar `Combat Manager`
Dividir el archivo gigante en tres capas:
1.  **Combat Engine (Reglas)**: Pura lógica TypeScript. Calcula AC, daño, turnos, condiciones. No sabe de IA ni de texto. Retorna "Eventos de Combate" (ej: `AttackHit`, `DamageDealt`).
2.  **Combat Narrator (IA)**: Recibe "Eventos de Combate" y genera la prosa narrativa.
3.  **Combat Controller (Orquestador)**: Une el Engine y el Narrator, y gestiona el flujo de turnos.

#### C. Sistema de Reacciones por Eventos
En lugar de llamar a `companionExpert` manualmente en líneas específicas:
*   El sistema emite eventos (ej: `PLAYER_ACTED`, `COMBAT_STARTED`, `DAMAGE_TAKEN`).
*   Un `ReactionManager` escucha estos eventos y decide qué NPCs deben reaccionar, basándose en prioridad y personalidad.

### 2.3. Beneficios Esperados

*   **Mantenibilidad**: Archivos más pequeños y enfocados (Single Responsibility Principle).
*   **Extensibilidad**: Fácil añadir nuevos modos de juego (ej: "Modo Sigilo") creando un nuevo `StateHandler`.
*   **Robustez**: La lógica de reglas (D&D) separada de la "imaginación" de la IA reduce alucinaciones en mecánicas críticas.
*   **Narrativa más Rica**: El sistema de eventos permite reacciones más orgánicas y complejas de los NPCs.

## 3. Plan de Transición (Roadmap Técnico)

1.  **Fase 1: Refactorización de Combate (Prioridad Alta)**
    *   Extraer lógica de reglas de `combat-manager.ts` a `src/lib/dnd-rules/`.
    *   Separar la generación de narración a `src/ai/narrators/combat-narrator.ts`.

2.  **Fase 2: Implementación de Handlers**
    *   Crear `ExplorationHandler` (absorbe lógica actual de `game-coordinator` + `narrative-expert`).
    *   Crear `CombatHandler` (wrapper del nuevo `Combat Controller`).

3.  **Fase 3: Migración del Coordinador**
    *   Reescribir `game-coordinator.ts` para usar los nuevos Handlers.
