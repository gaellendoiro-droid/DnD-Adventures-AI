# Formato de Aventura JSON

> **Versión del Esquema:** 1.0
> **Fecha de Actualización:** 2025-11-24

Este documento describe la estructura del archivo JSON utilizado para definir aventuras en D&D Adventures AI. Este formato está diseñado para ser flexible, soportando tanto aventuras creadas manualmente como aquellas convertidas automáticamente desde PDFs.

## Estructura General

El archivo JSON raíz contiene metadatos globales y listas de recursos (ubicaciones, entidades, escenas).

```json
{
  "adventureId": "string (único)",
  "title": "string",
  "introductoryNarration": "string (opcional)",
  "locations": [ ... ],
  "entities": [ ... ],
  "narrativeScenes": [ ... ],
  "events": [ ... ]
}
```

## Campos Principales

### 1. Metadatos Globales

*   `adventureId`: Identificador único de la aventura.
*   `title`: Título visible para el jugador.
*   `summary`: Breve descripción para el menú de selección.
*   `introductoryNarration` (o `openingScene`): Texto narrativo que se muestra al iniciar la partida. Si está presente, el sistema lo usa inmediatamente en lugar de generar una introducción con IA, mejorando drásticamente el tiempo de carga.
*   `system`: Sistema de juego (por defecto "D&D 5e").
*   `levelRange`: Rango de niveles recomendado `{ start: 1, end: 5 }`.

### 2. Ubicaciones (`locations`)

El grafo de navegación de la aventura.

*   `id`: Identificador único de la ubicación.
*   `title`: Nombre corto de la ubicación.
*   `description`: Descripción narrativa completa. Lo que el DM lee a los jugadores.
*   `dmNotes`: Información oculta (trampas, secretos, CDs).
*   `exits` / `connections`: Array de salidas.
    *   Puede ser un simple string (ID de destino) o un objeto `{ toLocationId, direction, description }`.
*   `interactables`: Objetos con los que se puede interactuar (leer carteles, abrir cofres).
*   `entitiesPresent`: Array de IDs de entidades que comienzan en esta ubicación.

### 3. Entidades (`entities`)

Definición de NPCs y monstruos.

*   `id`: Identificador único.
*   `name`: Nombre de la entidad.
*   `baseType`: Tipo base para buscar estadísticas en el compendio (ej: "goblin", "dragon").
*   `stats`: Objeto opcional para sobrescribir estadísticas base.

### 4. Escenas Narrativas (`narrativeScenes`)

Textos pre-generados para momentos cinemáticos ("Cutscenes").

*   `id`: Identificador de la escena.
*   `text`: El texto narrativo a mostrar.
*   `triggerCondition`: (Opcional) Condición lógica para disparar la escena (ej: `enter_location:loc-1`).

### 5. Eventos (`events`)

Lógica simple de scripting.

*   `trigger`: Qué dispara el evento (ej: `enter_location`, `combat_start`).
*   `action`: Qué sucede (ej: `play_scene`, `spawn_enemies`).
*   `target`: ID del objetivo de la acción (ID de la escena o IDs de enemigos).

## Validación

El formato se valida utilizando un esquema Zod definido en `src/lib/schemas.ts` (`AdventureDataSchema`). Además, existe un JSON Schema formal en `JSON_adventures/adventure.schema.json` para validación en editores.
