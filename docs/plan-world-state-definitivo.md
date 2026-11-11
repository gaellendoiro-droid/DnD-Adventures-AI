# Plan de Implementación: Sistema de World State Definitivo

Este documento describe la arquitectura y las fases para consolidar el sistema de **World State** (estado del mundo) como un pilar robusto del motor de juego, conectando el comportamiento reactivo de la IA con la persistencia real del entorno.

---

## 🎯 Objetivos del Sistema Definitivo

1. **Persistencia Total del Entorno**: Rastrear y guardar no solo a los enemigos muertos y puertas abiertas, sino mutaciones de objetos, trampas desactivadas y cofres saqueados.
2. **Memoria de Eventos Recientes (Coherencia de la IA)**: Evitar que los compañeros y el DM olviden eventos cruciales ocurridos hace pocos turnos (ej: el final de un combate cercano).
3. **Prevención de Spoilers (Percepción de Identidades - PIB)**: Ocultar información oculta o secreta de los NPCs (nombres reales, intenciones de disfraces) en el JSON inyectado en el contexto de la IA hasta que se revele formalmente en el juego.
4. **Mecánica Temporal y de Descansos Activa**: Hacer que el tiempo transcurrido en el mundo afecte al estado (curar heridas en descanso largo, disipar hechizos temporales).
5. **Reactividad Visual en Tiempo Real**: Hacer que la UI del cliente (como las hojas de personajes, efectos de estado y mapas) reaccione automáticamente a los cambios de estado en el `worldState`.

---

## 🏗️ Propuesta de Diseño Técnico y Componentes

### 1. Extensión del `WorldState`
Utilizaremos la estructura definida en [schemas.ts](file:///t:/ProyectosPersonales/Programacion/DnD-Adventures-AI/src/lib/schemas.ts) (`WorldStateSchema` y `LocationStateSchema`), la cual ya contempla soporte para:
*   `interactables`: Record de ID -> Estado (ej: `'looted'`, `'open'`).
*   `markers`: Array de strings para almacenar estados contextuales de la sala (ej: `"cadáveres_presentes"`, `"sangre_en_suelo"`).
*   `recentEvents`: Eventos temporales con TTL.

---

## 📋 Fases de Implementación

### ✅ Fase 1: Persistencia de Interactables y Cofres (Objetos y Contenedores) [COMPLETADA]
**Objetivo**: Hacer que la acción de abrir y saquear un cofre sea persistente, afectando al inventario de la party y quitando los objetos del entorno para que la IA no los vuelva a describir.

*   **Puntos de Cambio**:
    1.  **`src/ai/flows/managers/narrative-turn-manager.ts`**: Al usar un objeto o interactar con éxito, aplicar la mutación en el `worldState`.
    2.  **`src/ai/flows/managers/interaction-handler.ts`**: Actualizar la lógica para mutar el estado del interactable a `'looted'` u `'open'` en el `worldState`.
    3.  **`src/lib/game/world-state-manager.ts`**: Refinar `getEffectiveLocationContext` para inyectar y fusionar el estado de los interactables mutados. Si el interactable está `'looted'`, eliminar los items asociados del contexto que se le envía a la IA del DM.
    4.  **Mutación del Inventario**: Asegurar que al saquear se descuente del interactable y se sume al inventario del personaje activo en la `party`.

---

### ✅ Fase 2: Sistema de Memoria de Eventos Recientes (MVP) [COMPLETADA]
**Objetivo**: Integrar el plan simplificado. Este MVP registraría hitos (como `combat_end`) con un tiempo de vida (TTL) de 10 turnos e inyectaría esta "memoria reciente" en las reacciones de los compañeros de forma estructurada.

*   **Puntos de Cambio**:
    1.  **Crear `src/lib/game/event-manager.ts`**:
        *   `recordEvent(gameState, currentTurn, event)`: Registra eventos en el `recentEvents` del estado.
        *   `getRelevantEvents(events, currentTurn, options)`: Filtra y expira eventos (TTL de 10 turnos), priorizando la ubicación actual y salas adyacentes.
        *   `formatForPrompt(events, currentTurn)`: Devuelve la lista en texto legible por la IA.
    2.  **`src/ai/flows/combat-manager.ts`**: Registrar el evento `combat_end` al finalizar un encuentro en la ubicación actual, detallando los enemigos derrotados.
    3.  **`src/ai/flows/managers/companion-reaction-manager.ts`**: Obtener eventos relevantes de la memoria e inyectarlos bajo la sección `[RECENT MEMORY]` en el prompt de los compañeros.

---

### ✅ Fase 3: Estados de Identidad Basados en la Percepción (PIB) [COMPLETADA]
**Objetivo**: Evitar spoilers en la IA. Las identidades reales de los NPCs se ocultarán en el contexto hasta que se cumplan las condiciones del juego.

*   **Puntos de Cambio**:
    1.  **Alineamiento del Schema**: Enriquecer los datos de entidades en la aventura con `true_identity` y `revealed`.
    2.  **`src/lib/game/world-state-manager.ts`**: Al armar el contexto para la IA (`getEffectiveLocationContext`), evaluar si la identidad ha sido revelada. Si no, sustituir el nombre de la entidad por su alias público en todos los campos (ej. "La oveja" en lugar de "Finethir Shinebright") y ocultar metadatos sensibles de su perfil de rol.

---

### ✅ Fase 4: Control de Avance Temporal y Descansos [COMPLETADA]
**Objetivo**: Utilizar el avance temporal para mutar el estado mecánico del grupo y del entorno.

*   **Puntos de Cambio**:
    1.  **`src/lib/game/rules/rules-engine.ts`**: Crear o actualizar las reglas para interceptar la acción de "descansar" o "esperar".
    2.  **Cálculo Mecánico**:
        *   **Descanso Corto (1 hora)**: Permite gastar dados de golpe para curarse.
        *   **Descanso Largo (8 horas)**: Recupera la vida al máximo, regenera ranuras de conjuro y limpia estados temporales en el grupo y en `worldState.globalFlags`.
    3.  **Mutación del Reloj**: Sumar el tiempo correspondiente en `worldState.worldTime` y sincronizarlo.

---

### ✅ Fase 5: Reactividad Visual del WorldState en el Frontend [COMPLETADA]
**Objetivo**: Migrar el flujo del `worldStateRef.current` a una solución reactiva nativa en React para que la interfaz se actualice de inmediato ante los cambios del mundo.

*   **Puntos de Cambio**:
    1.  **`src/components/game/game-view.tsx`**: Integrar un almacén (Zustand o un Contexto de React controlado) para el estado activo.
    2.  **Suscripción visual**:
        *   El mapa táctico debe actualizarse inmediatamente cuando cambie el estado de una conexión o puerta.
        *   Las barras de vida de los personajes y sus inventarios visibles en la UI deben reflejar inmediatamente el estado modificado.

---

## 🧪 Plan de Verificación y Pruebas

1.  **Prueba de Interactables**:
    *   Iniciar aventura -> Encontrar cofre con poción -> Decir "abrir cofre y coger poción".
    *   Verificar que la poción se añade a la ficha del personaje.
    *   Volver a preguntar sobre la sala -> El DM no debe mencionar que la poción sigue en el cofre.
    *   Guardar y cargar -> El cofre debe seguir figurando como saqueado.
2.  **Prueba de Memoria Reciente**:
    *   Finalizar un combate en Sala A -> Moverse a Sala B -> Preguntar a un compañero sobre el combate que acaba de ocurrir.
    *   Verificar que el compañero lo recuerda y reacciona de acuerdo al evento.
3.  **Prueba de Descansos**:
    *   Recibir daño -> Decir "hacer un descanso largo".
    *   Verificar avance del reloj de 8 horas y restauración total de HP y ranuras de conjuro.
