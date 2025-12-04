# Formato de Aventura JSON

> **Versión del Esquema:** 1.2
> **Fecha de Actualización:** 2025-01-XX

Este documento describe la estructura del archivo JSON utilizado para definir aventuras en D&D Adventures AI. Este formato está diseñado para ser flexible, soportando tanto aventuras creadas manualmente como aquellas convertidas automáticamente desde PDFs.

## Estructura General

El archivo JSON raíz contiene metadatos globales y listas de recursos (ubicaciones, entidades, escenas, tablas).

```json
{
  "adventureId": "string (único)",
  "title": "string",
  "summary": "string",
  "introductoryNarration": "string (opcional)",
  "system": "D&D 5e",
  "levelRange": { "start": 1, "end": 5 },
  "credits": { ... },
  "settings": { ... },
  "tables": [ ... ],
  "locations": [ ... ],
  "entities": [ ... ],
  "items": [ ... ],
  "narrativeScenes": [ ... ],
  "events": [ ... ]
}
```

## Campos Principales

### 1. Metadatos Globales

*   `adventureId`: Identificador único de la aventura (slug).
*   `title`: Título visible para el jugador.
*   `summary`: Breve descripción para el menú de selección.
*   `introductoryNarration` (o `openingScene`): Texto narrativo que se muestra al iniciar la partida. Si está presente, el sistema lo usa inmediatamente en lugar de generar una introducción con IA.
*   `system`: Sistema de juego (por defecto "D&D 5e").
*   `levelRange`: Rango de niveles recomendado `{ start: integer, end: integer }`.
*   `credits`: Créditos de la aventura.
    *   `author`: Nombre del autor.
    *   `source`: Fuente original (ej: "PDF Oficial").
*   `settings`: Configuraciones iniciales.
    *   `startingLocationId`: ID de la ubicación donde comienza la aventura.
    *   `initialPartySize`: Tamaño de grupo recomendado.

### 2. Tablas Aleatorias (`tables`)

Tablas para generación de contenido aleatorio (rumores, encuentros, botín).

*   `id`: Identificador único de la tabla.
*   `title`: Título descriptivo.
*   `dice`: Dado a lanzar (ej: "1d6").
*   `rows`: Filas de la tabla.
    *   `range`: Rango del resultado (ej: "1", "2-3").
    *   `content`: Contenido del resultado.

### 3. Ubicaciones (`locations`)

El grafo de navegación de la aventura.

*   `id`: Identificador único de la ubicación.
*   `title` o `name`: Nombre corto de la ubicación (ambos son válidos, `title` es un alias de `name`).
*   `description`: Descripción narrativa completa. Lo que el DM lee a los jugadores.
*   `dmNotes`: Información oculta (secretos, historia de fondo).
*   `regionId`: (Opcional) Identificador para agrupar ubicaciones lógicamente (ej: "phandalin"). Ayuda a la IA a mantener el contexto.
*   `explorationMode`: Modo de exploración (`safe`, `dungeon`, `wilderness`). Afecta a cómo la IA narra y gestiona el tiempo.
*   `lightLevel`: Nivel de luz (`bright`, `dim`, `dark`).
*   `allowFastTravel`: `boolean`. Si es `false`, impide el viaje rápido desde aquí.
*   `connections`: Array de salidas/conexiones.
    *   `targetId`: ID de la ubicación destino.
    *   `type`: Tipo de conexión (`direct`, `urban`, `overland`, `special`).
    *   `direction`: (Opcional) Dirección cardinal (`norte`, `sur`, `este`, `oeste`, etc.).
    *   `description`: Descripción narrativa de la salida o distancia.
    *   `distance`: (Opcional) Distancia física (ej: "5 millas", "200 pies").
    *   `travelTime`: (Opcional) Tiempo estimado de viaje (ej: "30 minutos").
    *   `visibility`: `open` (visible siempre) o `restricted` (requiere exploración/percepción).
    *   `isLocked`: `boolean`. Si está cerrada con llave.
    *   `requiredKeyId`: ID del objeto necesario para abrirla.
    *   `isBlocked`: `boolean`. Si el paso está obstruido.
    *   `blockedReason`: Razón del bloqueo.
    *   `isOpen`: (Opcional) `boolean`. Si la puerta/pasaje está abierto (false = cerrado, true = abierto, undefined = sin puerta).
*   `interactables`: Objetos con los que se puede interactuar.
    *   `name`: Nombre del objeto.
    *   `description`: Descripción visual.
    *   `state`: Estado actual (ej: "cerrada", "abierta").
    *   `interactionResults`: Lista de posibles interacciones.
        *   `action`: Verbo o frase de acción (ej: "Leer", "Abrir").
        *   `result`: Resultado narrativo. Puede incluir referencias a tablas como `[[ROLL_TABLE:id-tabla]]`.
*   `hazards`: Peligros, trampas o emboscadas.
    *   `id`: ID del peligro.
    *   `type`: `trap`, `ambush`, `environmental`.
    *   `detectionDC`: CD para detectar pasivamente o activamente.
    *   `disarmDC`: (Opcional) CD para desactivar.
    *   `description`: Pista visual antes de activarse.
    *   `triggerDescription`: Narración al activarse.
    *   `effect`: (Opcional) Daño o efecto mecánico (ej: "1d6 daño caída", "Iniciativa Sorpresa").
    *   `active`: `boolean`.
    *   **Nota sobre Mimics:** Los mimics son monstruos y deben estar en `entitiesPresent`. Su comportamiento engañoso puede representarse con un hazard de tipo `trap` o `ambush` que se active al interactuar con el objeto que imitan.
*   `entitiesPresent`: Array de IDs de entidades que comienzan en esta ubicación.

### 4. Entidades (`entities`)

Definición de NPCs y monstruos.

*   `id`: Identificador único.
*   `name`: Nombre de la entidad.
*   `type`: Tipo de entidad (`monster`, `npc`, `other`).
*   `description`: Descripción física y de personalidad.
*   `dmNotes`: Notas tácticas o de rol para el DM/IA.

### 5. Objetos (`items`)

Definición de objetos especiales o de botín.

*   `id`: Identificador único.
*   `name`: Nombre del objeto.
*   `type`: Tipo de objeto (arma, poción, llave, etc.).
*   `rarity`: Rareza.
*   `description`: Descripción visual y funcional.
*   `properties`: Objeto libre para propiedades mecánicas extra.

### 6. Escenas Narrativas (`narrativeScenes`)

Textos pre-generados para momentos cinemáticos ("Cutscenes").

*   `id`: Identificador de la escena.
*   `text`: El texto narrativo a mostrar.
*   `triggerCondition`: (Opcional) Condición lógica para disparar la escena (ej: `enter_location:loc-1`).

### 7. Eventos (`events`)

Lógica simple de scripting para disparadores automáticos.

*   `id`: Identificador del evento.
*   `trigger`: Qué dispara el evento (ej: `enter_location`).
*   `locationId`: (Opcional) En qué ubicación ocurre.
*   `interactableId`: (Opcional) ID del interactuable que dispara el evento.
*   `action`: Qué sucede (ej: `play_scene`).
*   `target`: (Opcional) ID del objetivo de la acción (ej: ID de la escena). Puede ser un string o un array de strings.

## Validación

El formato se valida utilizando un esquema Zod definido en `src/lib/schemas.ts` (`AdventureDataSchema`). Además, existe un JSON Schema formal en `JSON_adventures/dev/adventure.schema.json` para validación en editores (VS Code, etc.).
