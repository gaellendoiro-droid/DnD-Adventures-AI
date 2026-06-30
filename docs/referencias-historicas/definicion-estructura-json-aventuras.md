# Plan de Definición de Estructura Base para Aventuras JSON

> **Estado:** 🚧 EN CURSO
> **Fecha de Inicio:** 2025-11-24
> **Objetivo:** Definir un esquema JSON estándar, robusto y flexible para representar aventuras de D&D, que sirva como formato destino para el convertidor PDF-a-JSON y garantice compatibilidad con el motor de juego actual.

## 1. Contexto y Motivación

Actualmente, el juego utiliza un formato JSON ad-hoc basado en la aventura "El Dragón del Pico Agujahelada". Para escalar el proyecto y permitir la importación automática de aventuras desde PDFs (Roadmap #16), necesitamos formalizar este formato.

El objetivo no es solo documentar lo que ya existe, sino diseñar una estructura que pueda acomodar la gran variedad de estilos de aventuras de D&D (dungeon crawls, mundos abiertos, misterios, etc.) sin romper la compatibilidad con el motor actual.

## 2. Objetivos del Diseño

1.  **Compatibilidad:** Debe funcionar con el `AdventureDataSchema` actual (o extenderlo de forma retrocompatible).
2.  **Flexibilidad:** Debe poder representar datos estructurados (habitaciones, monstruos) y no estructurados (notas del DM, lore difuso) extraídos de PDFs.
3.  **Robustez:** Debe minimizar la posibilidad de errores de integridad referencial (como los que acabamos de solucionar).
4.  **Estandarización:** Debe servir como "contrato" entre el módulo convertidor de PDF y el motor del juego.

## 3. Propuesta de Estructura Base

La estructura se dividirá en 5 secciones principales:

### 3.1. Metadatos (Metadata)
Información global sobre la aventura.
```json
{
  "adventureId": "unique-id",
  "title": "Nombre de la Aventura",
  "summary": "Resumen breve...",
  "openingScene": "Texto narrativo introductorio pre-generado para inicio instantáneo...",
  "levelRange": { "start": 1, "end": 5 },
  "system": "D&D 5e",
  "credits": { "author": "...", "source": "..." },
  "settings": {
    "startingLocationId": "loc-001",
    "initialPartySize": 4
  }
}
```

### 3.2. Ubicaciones (Locations) - El Grafo
El núcleo de la aventura. Debe soportar descripciones ricas y lógica de navegación.
```json
{
  "id": "loc-001",
  "title": "Entrada de la Mazmorra",
  "description": "Descripción narrativa para el jugador...",
  "dmNotes": "Información oculta solo para el DM (trampas, secretos)...",
  "type": "room" | "region" | "point_of_interest",
  "exits": [
    {
      "toLocationId": "loc-002",
      "direction": "north",
      "description": "Una puerta de roble...",
      "requirements": { "item": "llave-hierro" } // Futuro: Lógica de bloqueo
    }
  ],
  "interactables": [ ... ], // Objetos con los que se puede interactuar
  "entitiesPresent": [ "goblin-01" ] // Referencias a entidades
}
```

### 3.3. Entidades (Entities) - El Bestiario y NPCs
Definiciones de criaturas y personajes.
```json
{
  "id": "goblin-01",
  "baseType": "goblin", // Para buscar stats base en compendio
  "name": "Goblin Vigía",
  "isUnique": false,
  "stats": { ... }, // Stats específicos si difieren del base
  "behavior": "hostile" | "neutral" | "friendly",
  "dialogue": [ ... ] // Posibles líneas de diálogo o personalidad
}
```

### 3.4. Objetos y Botín (Items & Loot)
Definiciones de objetos especiales.
```json
{
  "id": "espada-fuego",
  "name": "Espada de Llamas",
  "type": "weapon",
  "rarity": "rare",
  "properties": { ... }
}
```

### 3.5. Escenas Narrativas (Narrative Scenes) - *Nuevo*
Narraciones pre-generadas ("Cutscenes") para momentos clave, optimizando rendimiento y calidad.
```json
{
  "id": "scene-boss-intro",
  "text": "El dragón Cryovain desciende de los cielos, su rugido helando la sangre...",
  "triggerCondition": "enter_location:loc-boss-lair" // Opcional, para automatización futura
}
```

### 3.6. Eventos y Disparadores (Events & Triggers) - *Nuevo*
Para manejar lógica narrativa compleja que suele estar en los PDFs (ej: "Si los jugadores hacen X, ocurre Y").
```json
{
  "id": "evento-alarma",
  "trigger": "combat_start",
  "locationId": "loc-001",
  "action": "play_scene",
  "target": "scene-boss-intro"
}
```

## 4. Fases de Implementación

### Fase 1: Definición Formal del Esquema (JSON Schema)
*   Crear un archivo `adventure.schema.json` que defina formalmente la estructura.
*   Esto permitirá validación automática en editores (VS Code) y en el convertidor.

### Fase 2: Actualización de Tipos TypeScript
*   Actualizar `src/lib/schemas.ts` para reflejar la estructura completa.
*   Asegurar que `AdventureDataSchema` sea un subconjunto válido de este nuevo esquema maestro.

### Fase 3: Creación de "Aventura Plantilla"
*   Crear un archivo `JSON_adventures/_template.json`.
*   Incluir ejemplos de todos los campos posibles con comentarios explicativos.
*   Servirá de base para crear nuevas aventuras manualmente o para testear el convertidor.

### Fase 4: Documentación
*   Crear `docs/arquitectura/formato-aventura-json.md` explicando cada campo.
*   Incluir guía de "Mejores Prácticas" para estructurar aventuras (ej: cómo manejar pasillos largos, cómo agrupar regiones).

## 5. Consideraciones para el Convertidor PDF (Roadmap #16)

*   **Tolerancia a Fallos:** El esquema debe permitir campos opcionales (`optional()`) para todo lo que no sea crítico, ya que la extracción de PDF nunca es perfecta.
*   **Campos "Raw":** Incluir campos como `rawText` o `originalPdfPage` en los objetos para ayudar a depurar o para que la IA tenga contexto extra si el parseo estructurado falla.

## 6. Próximos Pasos Inmediatos

1.  Aprobar este plan.
2.  Crear el archivo `adventure.schema.json` inicial basado en `el-dragon-del-pico-agujahelada.json`.
3.  Validar la aventura actual contra el nuevo esquema para asegurar compatibilidad.
