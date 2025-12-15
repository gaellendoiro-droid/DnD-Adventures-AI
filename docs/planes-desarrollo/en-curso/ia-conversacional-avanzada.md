# Plan de Implementación: IA Conversacional Avanzada (Streaming) - v1.0

> **Objetivo:** Transformar la experiencia de usuario de "esperar-y-leer" a "ver-suceder", migrando la arquitectura de comunicación monolítica a un sistema de streaming orientado a eventos.

---

## 🏗️ Arquitectura Propuesta

### Nuevo Paradigma: `Connection -> Events`

En lugar de que el cliente espere una respuesta JSON completa, el servidor enviará un flujo continuo de "Eventos de Juego".

**Formato del Evento (NDJSON o Server-Sent Events):**
```json
{ "type": "debug", "payload": "Analizando intención..." }
{ "type": "state_delta", "payload": { "hp": { "hero1": 45 } } }
{ "type": "token", "role": "dm", "content": "T" }
{ "type": "token", "role": "dm", "content": "e" }
...
{ "type": "token", "role": "dm", "content": " " }
{ "type": "token", "role": "Farin", "content": "¡" }
```

### Componentes Clave

1.  **`GameStreamCoordinator` (Backend):** Una evolución del `GameCoordinator` que usa Generadores de Javascript (`async function*`) para emitir resultados parciales en cuanto están disponibles.
2.  **`Route Handler` (`/api/game/stream`):** El punto de entrada HTTP que sostiene la conexión abierta y canaliza el generador hacia un `ReadableStream`.
3.  **`useGameStream` (Frontend):** Un hook inteligente que gestiona la lectura del stream, reconexiones y actualiza el estado de React progresivamente.

---

## 📅 Fases de Implementación

### Fase 1: Infraestructura de Streaming ("La Tubería")
*Objetivo: Lograr que el cliente y servidor hablen via Streaming.*

- [ ] **1.1. Crear Tipos de Eventos:** Definir `GameStreamEvent` (tipos: `log`, `token`, `message_start`, `message_done`, `state_update`).
- [ ] **1.2. Implementar Route Handler de Prueba:** Crear `/api/stream-test` que envíe mensajes simulados tipo "Hola", "Mundo" con delay.
- [ ] **1.3. Implementar Hook `useStreamReader`:** Hook genérico en frontend para consumir `ReadableStream` y parsear NDJSON.
- [ ] **1.4. Validar UI:** Crear una página oculta `/test-stream` para verificar que el texto aparece letra a letra.

### Fase 2: Refactorización "Generator-First" ("El Cerebro")
*Objetivo: Convertir la lógica síncrona en generadores.*

- [ ] **2.1. Crear `src/ai/streaming`:** Nueva carpeta para la lógica stream.
- [ ] **2.2. Migrar `GameCoordinator` a `streamGameCoordinator`:**
    - Reemplazar `await narrativeManager.generate()` por un flujo que emita tokens.
    - *Nota:* Esto requerirá que las tools subyacentes (Gemini) también soporten streaming (`generateContentStream`).
- [ ] **2.3. Adaptar `TurnProcessor`:** Dividir la lógica de combate en pasos discretos que se puedan emitir.

### Fase 3: Integración Frontend ("Los Ojos")
*Objetivo: Conectar el juego real al nuevo backend.*

- [ ] **3.1. Crear `useGameStream`:** Especializar el reader para actualizar `GameState`.
- [ ] **3.2. Modificar Input de Jugador:** Enviar la acción a `/api/game/stream`.
- [ ] **3.3. UI de "Escribiendo...":** Mostrar indicadores visuales de quién está generando texto en ese momento.

### Fase 4: IA Reactiva ("El Alma")
*Objetivo: Que los compañeros reaccionen secuencialmente.*

- [ ] **4.1. Pipeline de Reacción:**
    - Una vez termina el DM (`dm_done`), el coordinador evalúa triggers de compañeros.
    - Si Compañero A habla, se emite su stream.
    - Se añade lo que dijo A al contexto *antes* de preguntar a Compañero B.
- [ ] **4.2. Streaming de `InteractionExpert`:** Ajustar prompts para ser stream-friendly.

---

## 🛡️ Análisis de Riesgos

1.  **Complejidad de Depuración:** Los errores en streams son más difíciles de rastrear que un simple JSON de error. -> *Mitigación: Logging robusto de eventos en servidor.*
2.  **Gestión de Estado (Race Conditions):** Actualizar el estado (HP, inventario) mientras se narra puede causar "glitches" visuales. -> *Mitigación: Eventos `state_update` atómicos y ordenados.*
3.  **Coste de Tokens:** Streaming no afecta el coste, pero llamadas secuenciales (Fase 4) podrían aumentar la latencia total si no se paralelizan bien. -> *Mitigación: Estrategia híbrida (paralelo especulativo).*
