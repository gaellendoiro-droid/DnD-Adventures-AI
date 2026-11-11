# Plan de Implementación: IA Conversacional Avanzada (Streaming) - v1.0

> **Objetivo:** Transformar la experiencia de usuario de "esperar-y-leer" a "ver-suceder", migrando la arquitectura de comunicación monolítica a un sistema de streaming orientado a eventos.

---

## 🏗️ Arquitectura Propuesta

### Nuevo Paradigma: `Connection -> Events`

En lugar de que el cliente espere una respuesta JSON completa, el servidor enviará un flujo continuo de "Eventos de Juego".

**Formato del Evento (NDJSON o Server-Sent Events):**
```json
{ "type": "debug", "payload": "Analizando intención..." }
{ "type": "tool_start", "payload": { "tool": "dice_roller", "input": "1d20+5" } }
{ "type": "tool_end", "payload": { "result": "18" } }
{ "type": "state_delta", "payload": { "hp": { "hero1": 45 }, "updateType": "merge" } }
{ "type": "token", "role": "dm", "content": "T" }
{ "type": "token", "role": "dm", "content": "e" }
...
{ "type": "stream_done", "payload": { "turnIndex": 1 } }
```

### Componentes Clave (Reutilizables)

1.  **`Shared Protocol` (`src/lib/streaming`):**
    - `types.ts`: Definiciones compartidas de eventos (`GameStreamEvent`) para garantizar tipado fuerte en ambos extremos.
    - `protocol.ts`: Funciones de utilidad `createEvent(type, payload)` y `parseEvent(chunk)` para encapsular la serialización NDJSON.
2.  **`StreamableToolWrapper` (Backend):**
    - Un decorador o función de orden superior (`withStreaming`) que envuelva cualquier Tool existente.
    - Automáticamente emite `tool_start` antes de ejecutar y `tool_end` con el resultado. ¡Cero duplicidad de código en el coordinador!
3.  **`useGameStream` (Frontend):** 
    - Dividido en dos capas:
        - `useStreamConnection`: Solo gestiona HTTP, reconexión y parsing (genérico).
        - `useGameStateReducer`: Gestiona la lógica de negocio puramente (recibe eventos, actualiza estado).

---

## 📅 Fases de Implementación Orientadas a Módulos

### Fase 1: El Protocolo Común ("La Lengua")
*Objetivo: Definir el contrato de comunicación en una librería compartida.*

- [x] **1.1. `src/lib/streaming`:**
    - Crear `types.ts` con Discriminated Unions para todos los eventos (incluyendo `error` para manejo elegante de excepciones).
    - Crear `encoder.ts` (Servidor) y `parser.ts` (Cliente) para centralizar la lógica `JSON.stringify/parse` y el manejo de saltos de línea.
- [x] **1.2. Módulo de Prueba:** 
    - Route Handler `/api/stream-test` que usa `encoder.ts`.
    - Página `/test-stream` que usa una versión preliminar de `useStreamConnection` con `parser.ts`.
- [x] **1.3. Test Unitario (Protocolo):**
    - `src/lib/streaming/protocol.test.ts`: Verificar encoding/decoding de todos los tipos de eventos y payload inválidos.

### Fase 2: Backend Modular ("El Cerebro")
*Objetivo: Lógica de negocio agnóstica del transporte.*

- [x] **2.1. `src/ai/streaming/stream-utils.ts`:**
    - Función `streamGenerator(generator)` que convierte un generator JS en un `ReadableStream` HTTP compatible usando el `encoder.ts` de la Fase 1.
- [x] **2.2. `withStreamingTool` Wrapper:**
    - Utilidad para envolver llamadas a tools (`diceRoller`, `consultRulebook`).
    - Input: Tool Function. Output: Generator que hace `yield tool_start`, espera resultado, `yield tool_end`.
- [x] **2.3. Orquestador (`GameStreamCoordinator`):**
    - Implementación limpia usando los wrappers anteriores.
    - El código principal solo dirá: `yield* withStreamingTool(diceRoller, input)`.
- [x] **2.4. Test de Integración (Backend):**
    - Crear script de prueba `test-coordinator-stream.ts` que invoque el generador y verifique que la secuencia de eventos (`tool_start` -> `tool_end`) es correcta.

### Fase 3: Integración Frontend ("Los Ojos")
*Objetivo: Conectar componentes UI existentes al nuevo hook.*

- [x] **3.1. `useGameStream` (Composición):** 
    - Combina `useStreamConnection` (Fase 1) con lógica de actualización de `GameState`.
    - Implementa "Optimistic Updates" si es necesario.
- [x] **3.2. Refactor UI `ChatPanel`:**
    - Hacerlo "Stream Aware". No necesita grandes cambios si el hook simplemente actualiza el último mensaje del array letra a letra.
- [x] **3.3. Indicadores de Estado:** ✅ **COMPLETADO (2025-12-16)** Componente `<StreamingStatus />` que escucha eventos `tool_start` y muestra loaders contextuales.
- [x] **3.4. Test Manual e Integración (Frontend):**
    - Verificar flujo completo: Acción Usuario -> UI Loading -> Stream Tokens -> Estado Actualizado.
    - Verificar reconexión ante error de red simulado.

### Fase 4: IA Reactiva ("El Alma")
*Objetivo: Que los compañeros reaccionen secuencialmente.*

- [x] **Gestión Turnos Híbridos (DM + Compañeros)**
  - [x] Evitar que el DM narre acciones que corresponden a los compañeros.
  - [x] Sincronización de reacciones: "Antes del DM" vs "Después del DM".
  - [x] **Fix:** Deduplicación de reacciones (evitar doble posteo).
  - [x] **Fix:** Supresión del DM en turnos puramente sociales ("Silence Vote").
- [x] **Refinar Intérprete de Acciones**
  - [x] Distinguir Propuestas ("¿Vamos?") de Acciones ("Vamos").
  - [x] Priorizar Interacción de Grupo.
- [x] **4.1. Pipeline de Reacción:**
    - Una vez termina el DM (`dm_done`), el coordinador evalúa triggers de compañeros.
    - Si Compañero A habla, se emite su stream.
    - Se añade lo que dijo A al contexto *antes* de preguntar a Compañero B.
- [x] **4.2. Streaming de `InteractionExpert`:** Ajustar prompts para ser stream-friendly. Implementado via `InteractionExpertStream` (Texto plano) + `updateAttitudeTool`.

---

## 🧪 Estrategia de Testing y QA

### Fase 5: Validación Final y Regresión
*Objetivo: Asegurar la estabilidad global antes del despliegue.*

- [x] **5.1. Plan de Pruebas Manuales (Regresión):**
    - [x] **Combate:** Verificar inicio, turnos, y final (Game Over/Victoria). *Riesgo Alto*.
    - [x] **Inventario:** Verificar que usar un objeto actualiza el estado correctamente (ej: usar el pergamino de hablar con los animales activa `"speak_with_animals"` en `worldState` y altera la lógica de comunicación).
    - [x] **Persistencia:** Verificar que al recargar la página tras un evento stream, el estado se mantiene (gracias a `worldState` persistido en el cliente).
    - [x] **Errores:** Forzar un error de API para ver si la UI muestra el mensaje de error o se cuelga.

---

## 🛡️ Análisis de Riesgos y Regresiones Potenciales

> **⚠️ Atención:** Al reescribir el bucle central de comunicación (`GameCoordinator`), estas funcionalidades existentes corren riesgo de romperse si no se migran con cuidado:

1.  **Lógica de Combate y Turnos:**
    - *Riesgo:* Que el stream no actualice correctamente el `turnIndex` o el `initiativeOrder` en tiempo real, desincronizando al cliente.
    - *Mitigación:* Test manual exhaustivo de combates complejos (múltiples enemigos).
2.  **Manejo de Errores de Validación (Zod):**
    - *Riesgo:* Antes, si fallaba la validación, la Server Action lanzaba error. Ahora el stream debe capturar ese error y emitir un evento `error` antes de cerrarse.
    - *Mitigación:* Test unitario de payload inválido contra el endpoint de stream.
3.  **Estado "Optimista" vs Real:**
    - *Riesgo:* La UI asume que una acción tuvo éxito antes de recibir confirmación del servidor, creando inconsistencias (ej: gastar poción que no tienes).
    - *Mitigación:* El protocolo debe soportar eventos de "Rollback" o reinicio de estado forzado.
4.  **Audio Dinámico:**
    - *Riesgo:* Los triggers de música dependen de cambios de estado detectados. Si el estado llega a trozos, el trigger podría no saltar.
    - *Mitigación:* Revisar `MusicManager` para asegurar que reacciona a los cambios del `useGameStream`.
