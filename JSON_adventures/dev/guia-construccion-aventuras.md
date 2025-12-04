# Guía de Construcción de Aventuras JSON

> **Versión:** 1.0  
> **Última actualización:** 2025-01-XX  
> **Complementa:** `_template.json` y `adventure.schema.json`

Esta guía explica en detalle todas las posibilidades y opciones disponibles al construir un archivo JSON de aventura para D&D Adventures AI. Mientras que el schema JSON valida la estructura y el template muestra ejemplos básicos, esta guía profundiza en el uso práctico, casos de uso avanzados y mejores prácticas.

## Tabla de Contenidos

1. [Estructura General](#estructura-general)
2. [Metadatos de la Aventura](#metadatos-de-la-aventura)
3. [Ubicaciones (Locations)](#ubicaciones-locations)
4. [Conexiones entre Ubicaciones](#conexiones-entre-ubicaciones)
5. [Interactuables (Interactables)](#interactuables-interactables)
6. [Entidades (Entities)](#entidades-entities)
7. [Objetos (Items)](#objetos-items)
8. [Tablas Aleatorias (Tables)](#tablas-aleatorias-tables)
9. [Escenas Narrativas (Narrative Scenes)](#escenas-narrativas-narrative-scenes)
10. [Eventos (Events)](#eventos-events)
11. [Peligros (Hazards)](#peligros-hazards)
12. [Mejores Prácticas](#mejores-prácticas)
13. [Patrones Comunes](#patrones-comunes)
14. [Ejemplos Avanzados](#ejemplos-avanzados)

---

## Estructura General

Un archivo JSON de aventura tiene la siguiente estructura básica:

```json
{
  "adventureId": "string (requerido)",
  "title": "string (requerido)",
  "summary": "string (opcional)",
  "introductoryNarration": "string (opcional)",
  "system": "string (opcional, default: 'D&D 5e')",
  "levelRange": { "start": number, "end": number },
  "credits": { "author": "string", "source": "string" },
  "settings": { "startingLocationId": "string", "initialPartySize": number },
  "tables": [ ... ],
  "locations": [ ... ],  // REQUERIDO: mínimo 1
  "entities": [ ... ],
  "items": [ ... ],
  "narrativeScenes": [ ... ],
  "events": [ ... ]
}
```

**Campos requeridos:** `adventureId`, `title`, `locations` (mínimo 1 ubicación)

---

## Metadatos de la Aventura

### `adventureId` (requerido)
- **Tipo:** `string`
- **Descripción:** Identificador único de la aventura. Se usa internamente para referencias y no debe cambiar.
- **Formato recomendado:** `kebab-case` (ej: `el-dragon-del-pico-agujahelada`)
- **Ejemplo:** `"adventureId": "mision-colina-resentimiento"`

### `title` (requerido)
- **Tipo:** `string`
- **Descripción:** Título visible para el jugador en el menú de selección.
- **Ejemplo:** `"title": "El Dragón del Pico Agujahelada"`

### `summary` (opcional)
- **Tipo:** `string`
- **Descripción:** Breve resumen (1-3 frases) que aparece en el menú de selección para ayudar a elegir aventura.
- **Mejores prácticas:**
  - Máximo 200 caracteres
  - Incluye nivel recomendado, tipo de aventura, y hook principal
- **Ejemplo:** `"summary": "Un joven dragón blanco ha reclamado el Pico Agujahelada. Los aventureros deben proteger Phandalin y enfrentarse al dragón. Niveles 1-5."`

### `introductoryNarration` (opcional, alias: `openingScene`)
- **Tipo:** `string`
- **Descripción:** Texto narrativo pre-generado que se muestra **inmediatamente** al iniciar la partida, sin esperar generación de IA.
- **Ventajas:**
  - Carga instantánea (mejor UX)
  - Control total sobre el tono y contenido inicial
  - Puede incluir HTML básico (`<h3>`, `<p>`, `<strong>`, etc.)
- **Cuándo usarlo:**
  - Aventuras con escenas de inicio muy específicas
  - Cuando quieres establecer el tono exacto desde el principio
  - Para evitar que la IA genere algo diferente a lo esperado
- **Ejemplo:**
```json
"introductoryNarration": "<h3>¡Bienvenidos a Phandalin!</h3><p>Acabáis de llegar al pueblo tras varios días de viaje. El aire gélido os recibe en este asentamiento minero...</p>"
```

### `system` (opcional)
- **Tipo:** `string`
- **Default:** `"D&D 5e"`
- **Descripción:** Sistema de juego. Actualmente solo se soporta D&D 5e, pero se reserva para futuras expansiones.

### `levelRange` (opcional)
- **Tipo:** `object` con `start` y `end` (ambos `integer`)
- **Descripción:** Rango de niveles recomendado para la aventura.
- **Ejemplo:** `"levelRange": { "start": 1, "end": 5 }`

### `credits` (opcional)
- **Tipo:** `object` con `author` y `source` (ambos `string`)
- **Descripción:** Información de autoría y fuente original.
- **Ejemplo:**
```json
"credits": {
  "author": "Adaptación Dungeons & Dragons Essentials Kit",
  "source": "Dragon of Icespire Peak (Wizards of the Coast)"
}
```

### `settings` (opcional)
- **Tipo:** `object`
- **Propiedades:**
  - `startingLocationId` (`string`): ID de la ubicación donde comienzan los jugadores
  - `initialPartySize` (`integer`): Tamaño inicial del grupo (default: 4)
  - `initialWorldTime` (`object`, opcional): Tiempo inicial del mundo
    - `day` (`integer`): Día del mundo
    - `hour` (`integer`): Hora (0-23)
    - `minute` (`integer`): Minuto (0-59)
- **Ejemplo:**
```json
"settings": {
  "startingLocationId": "phandalin-plaza-del-pueblo",
  "initialPartySize": 4,
  "initialWorldTime": {
    "day": 1,
    "hour": 8,
    "minute": 0
  }
}
```

---

## Ubicaciones (Locations)

Las ubicaciones son el núcleo de la aventura. Forman un grafo de navegación donde los jugadores se mueven.

### Estructura Básica

```json
{
  "id": "string (requerido)",
  "title": "string (opcional pero recomendado)",
  "description": "string (requerido)",
  "regionId": "string (opcional)",
  "allowFastTravel": "boolean (default: true)",
  "explorationMode": "string (enum: 'safe', 'dungeon', 'wilderness', default: 'safe')",
  "lightLevel": "string (enum: 'bright', 'dim', 'dark', default: 'bright')",
  "dmNotes": "string (opcional)",
  "hazards": [ ... ],
  "entitiesPresent": [ ... ],
  "interactables": [ ... ],
  "connections": [ ... ],
  "exits": [ ... ]  // Alias de connections
}
```

### Campos Principales

#### `id` (requerido)
- **Tipo:** `string`
- **Descripción:** Identificador único de la ubicación. Se usa en referencias de otras ubicaciones y eventos.
- **Formato recomendado:** `kebab-case` con prefijo descriptivo (ej: `loc-`, `room-`, `phandalin-`)
- **Ejemplo:** `"id": "phandalin-plaza-del-pueblo"`

#### `title` (opcional pero recomendado)
- **Tipo:** `string`
- **Descripción:** Nombre corto de la ubicación que aparece en la UI.
- **Ejemplo:** `"title": "Plaza del Pueblo"`

#### `description` (requerido)
- **Tipo:** `string`
- **Descripción:** Descripción narrativa completa que el DM lee a los jugadores. Debe incluir detalles sensoriales (vista, olor, sonido, tacto).
- **Mejores prácticas:**
  - 2-5 frases
  - Incluye detalles que inviten a la exploración
  - Menciona elementos interactuables visibles
  - Evita spoilers de secretos (usa `dmNotes` para eso)
- **Ejemplo:**
```json
"description": "Una sala pequeña con olor a humedad. Las paredes de piedra están cubiertas de musgo. En el centro, un cofre de madera antiguo llama tu atención. Al norte, un túnel oscuro se adentra en la montaña."
```

#### `regionId` (opcional)
- **Tipo:** `string`
- **Descripción:** Identificador de la región o "hub" al que pertenece esta ubicación (ej: `"phandalin"`, `"excavacion-enanos"`).
- **Propósito:**
  - Agrupa ubicaciones lógicamente
  - Ayuda a la IA a mantener contexto geográfico
  - Permite movimiento implícito entre ubicaciones de la misma región
- **Ejemplo:** Todas las ubicaciones de Phandalin tienen `"regionId": "phandalin"`

#### `allowFastTravel` (opcional)
- **Tipo:** `boolean`
- **Default:** `true`
- **Descripción:** Si es `false`, impide iniciar viajes largos desde esta ubicación.
- **Cuándo usar `false`:**
  - Celdas de prisión
  - Durante combate activo
  - Lugares donde el escape está bloqueado narrativamente
- **Ejemplo:** `"allowFastTravel": false` en una celda de prisión

#### `explorationMode` (opcional)
- **Tipo:** `string` (enum)
- **Valores posibles:**
  - `"safe"` (default): Ubicación segura, sin peligros aleatorios
  - `"dungeon"`: Mazmorra, puede tener encuentros aleatorios
  - `"wilderness"`: Naturaleza salvaje, encuentros aleatorios más probables
- **Ejemplo:** `"explorationMode": "dungeon"` en una mazmorra

#### `lightLevel` (opcional)
- **Tipo:** `string` (enum)
- **Valores posibles:**
  - `"bright"` (default): Iluminación normal
  - `"dim"`: Iluminación tenue (penalizaciones a visión)
  - `"dark"`: Oscuridad total (requiere luz mágica o antorchas)
- **Ejemplo:** `"lightLevel": "dim"` en una cueva con poca luz

#### `dmNotes` (opcional)
- **Tipo:** `string`
- **Descripción:** Notas secretas para el DM. Información que los jugadores no ven pero el DM necesita saber.
- **Incluye:**
  - Trampas ocultas y sus CDs
  - Tesoros escondidos
  - Secretos y pistas
  - Comportamiento de NPCs
  - Eventos especiales
- **Ejemplo:**
```json
"dmNotes": "Hay una trampa de foso en el centro de la sala (CD 15 para detectar, CD 12 para desarmar). El tesoro está escondido detrás de la estatua al norte (CD 18 Percepción)."
```

#### `entitiesPresent` (opcional)
- **Tipo:** `array` de `string`
- **Descripción:** Array de IDs de entidades que están presentes en esta ubicación al inicio.
- **Nota:** Las entidades deben estar definidas en el array `entities` del JSON raíz.
- **Ejemplo:**
```json
"entitiesPresent": ["goblin-guard", "goblin-archer", "orc-chief"]
```

#### `hazards` (opcional)
- **Tipo:** `array` de objetos `hazard`
- **Descripción:** Peligros presentes en la ubicación (trampas, emboscadas, peligros ambientales).
- **Ver sección [Peligros (Hazards)](#peligros-hazards)** para detalles completos.

#### `interactables` (opcional)
- **Tipo:** `array` de objetos `interactable`
- **Descripción:** Objetos con los que los jugadores pueden interactuar.
- **Ver sección [Interactuables (Interactables)](#interactuables-interactables)** para detalles completos.

#### `connections` / `exits` (opcional)
- **Tipo:** `array` de objetos `connection`
- **Descripción:** Salidas y conexiones a otras ubicaciones.
- **Nota:** `exits` es un alias de `connections`, ambos funcionan igual.
- **Ver sección [Conexiones entre Ubicaciones](#conexiones-entre-ubicaciones)** para detalles completos.

---

## Conexiones entre Ubicaciones

Las conexiones definen cómo los jugadores se mueven entre ubicaciones.

### Estructura

```json
{
  "targetId": "string (requerido)",
  "type": "string (enum: 'direct', 'urban', 'overland', 'special', default: 'direct')",
  "direction": "string (opcional)",
  "description": "string (opcional)",
  "travelTime": "string (opcional)",
  "isLocked": "boolean (default: false)",
  "requiredKeyId": "string (opcional)",
  "isBlocked": "boolean (default: false)",
  "blockedReason": "string (opcional)",
  "visibility": "string (enum: 'restricted', 'open', default: 'restricted')"
}
```

### Campos Principales

#### `targetId` (requerido)
- **Tipo:** `string`
- **Descripción:** ID de la ubicación destino a la que conecta esta conexión.
- **Importante:** La ubicación destino debe existir en el array `locations`.

#### `type` (opcional)
- **Tipo:** `string` (enum)
- **Valores posibles:**
  - `"direct"` (default): Movimiento inmediato, sin tiempo de viaje
  - `"urban"`: Movimiento dentro de una ciudad/pueblo (minutos, generalmente seguro)
  - `"overland"`: Viaje largo (horas/días, puede tener encuentros)
  - `"special"`: Teletransporte o conexión mágica especial
- **Ejemplos:**
  - `"direct"`: De una sala a otra en una mazmorra
  - `"urban"`: De la plaza del pueblo a la posada
  - `"overland"`: De Phandalin a la Colina del Resentimiento (2 horas)
  - `"special"`: Portal mágico

#### `direction` (opcional)
- **Tipo:** `string`
- **Descripción:** Dirección cardinal o relativa. **Fundamental para la orientación espacial** en la narración de la IA.
- **Valores recomendados:**
  - Cardinales: `"norte"`, `"sur"`, `"este"`, `"oeste"`
  - Intercardinales: `"noreste"`, `"noroeste"`, `"sureste"`, `"suroeste"`
  - Verticales: `"arriba"`, `"abajo"`
  - Relativos: `"dentro"`, `"fuera"`, `"adelante"`, `"atrás"`
- **Ejemplo:** `"direction": "norte"`

#### `description` (opcional)
- **Tipo:** `string`
- **Descripción:** Descripción narrativa de la conexión o distancia física.
- **Puede incluir:**
  - Distancia física (ej: `"Un túnel de 50 pies"`)
  - Descripción narrativa (ej: `"El camino que lleva al exterior"`)
  - Distancia en unidades (ej: `"5 millas al norte"`, `"300 pies de profundidad"`)
- **Ejemplo:** `"description": "Un túnel oscuro que se adentra en la montaña."`

#### `travelTime` (opcional)
- **Tipo:** `string`
- **Descripción:** Tiempo estimado de viaje. Solo relevante para conexiones `urban` o `overland`.
- **Formato:** Texto libre (ej: `"10 minutos"`, `"2 horas"`, `"1 día"`)
- **Ejemplo:** `"travelTime": "30 minutos"`

#### `isLocked` (opcional)
- **Tipo:** `boolean`
- **Default:** `false`
- **Descripción:** Si la conexión está cerrada con llave o mecanismo.
- **Requiere:** `requiredKeyId` si es `true`

#### `requiredKeyId` (opcional)
- **Tipo:** `string`
- **Descripción:** ID del objeto (item) necesario para desbloquear la conexión.
- **Solo relevante si:** `isLocked: true`
- **Ejemplo:** `"requiredKeyId": "llave-maestra-dungeon"`

#### `isBlocked` (opcional)
- **Tipo:** `boolean`
- **Default:** `false`
- **Descripción:** Si el camino está bloqueado físicamente (ej: derrumbe, puerta sellada).
- **Diferencia con `isLocked`:** `isLocked` requiere una llave, `isBlocked` requiere resolver el bloqueo (fuerza, magia, etc.)

#### `blockedReason` (opcional)
- **Tipo:** `string`
- **Descripción:** Texto narrativo que explica por qué está bloqueado.
- **Solo relevante si:** `isBlocked: true`
- **Ejemplo:** `"blockedReason": "Un derrumbe de rocas bloquea completamente el paso."`

#### `visibility` (opcional)
- **Tipo:** `string` (enum)
- **Valores posibles:**
  - `"restricted"` (default): La conexión no es visible hasta que se descubre
  - `"open"`: La conexión es visible desde el inicio
- **Ejemplo:** Una puerta secreta tendría `"visibility": "restricted"`

### Ejemplos de Conexiones

#### Conexión Directa (Mazmorra)
```json
{
  "targetId": "sala-tesoro",
  "type": "direct",
  "direction": "norte",
  "description": "Un pasillo de 20 pies con antorchas en las paredes."
}
```

#### Conexión Urbana (Pueblo)
```json
{
  "targetId": "posada-rocacolina",
  "type": "urban",
  "description": "La posada Rocacolina, un modesto edificio de dos plantas.",
  "travelTime": "2 minutos"
}
```

#### Conexión Overland (Viaje Largo)
```json
{
  "targetId": "colina-resentimiento",
  "type": "overland",
  "description": "El camino hacia la Colina del Resentimiento serpentea por las montañas.",
  "travelTime": "2 horas"
}
```

#### Puerta Cerrada con Llave
```json
{
  "targetId": "sala-secreta",
  "type": "direct",
  "direction": "este",
  "description": "Una puerta de hierro con una cerradura compleja.",
  "isLocked": true,
  "requiredKeyId": "llave-sala-secreta",
  "visibility": "open"
}
```

#### Pasaje Bloqueado
```json
{
  "targetId": "sala-mas-alla",
  "type": "direct",
  "direction": "sur",
  "description": "Un pasillo que continúa hacia el sur.",
  "isBlocked": true,
  "blockedReason": "Un derrumbe de rocas bloquea completamente el paso. Se necesitaría magia o mucha fuerza para despejarlo."
}
```

---

## Interactuables (Interactables)

Los interactuables son objetos con los que los jugadores pueden interactuar (leer carteles, abrir cofres, examinar estatuas, etc.).

### Estructura

```json
{
  "id": "string (opcional)",
  "name": "string (requerido)",
  "description": "string (requerido)",
  "interactionResults": [ ... ],
  "interactions": [ ... ],  // Alias de interactionResults
  "state": "string (opcional)"
}
```

### Campos Principales

#### `id` (opcional)
- **Tipo:** `string`
- **Descripción:** Identificador único del interactuable. Útil para referencias en eventos.
- **Ejemplo:** `"id": "tablon-anuncios"`

#### `name` (requerido)
- **Tipo:** `string`
- **Descripción:** Nombre del objeto que aparece en la UI.
- **Ejemplo:** `"name": "Tablón de oportunidades"`

#### `description` (requerido)
- **Tipo:** `string`
- **Descripción:** Descripción del objeto que ven los jugadores.
- **Ejemplo:** `"description": "Un tablón de madera con varios anuncios escritos en lengua común."`

#### `interactionResults` / `interactions` (opcional)
- **Tipo:** `array` de objetos con `action` y `result`
- **Descripción:** Lista de acciones posibles y sus resultados.
- **Nota:** `interactions` es un alias de `interactionResults`.
- **Estructura de cada elemento:**
```json
{
  "action": "string (requerido)",  // Acción que el jugador puede realizar
  "result": "string (requerido)"    // Resultado narrativo de la acción
}
```

#### `state` (opcional)
- **Tipo:** `string`
- **Descripción:** Estado actual del interactuable (ej: `"open"`, `"closed"`, `"broken"`).
- **Uso:** Para objetos que cambian de estado (cofres abiertos, puertas rotas, etc.)

### Ejemplos de Interactuables

#### Cartel/Tablón de Anuncios
```json
{
  "name": "Tablón de oportunidades",
  "description": "Un tablón de madera con varios anuncios escritos en lengua común por la misma persona.",
  "interactionResults": [
    {
      "action": "Leer anuncios",
      "result": "Distinguís tres misiones principales: La Misión de la Colina del Resentimiento, la Misión de la excavación de los enanos y la Misión de Terragnoma."
    },
    {
      "action": "Leer Misión de la Colina del Resentimiento",
      "result": "¡Se buscan aventureros! ¡Ayudad a Adabra Gwynn, la comadrona del pueblo! Recompensa: 50 po."
    }
  ]
}
```

#### Cofre
```json
{
  "id": "cofre-tesoro",
  "name": "Cofre de Madera",
  "description": "Un cofre de madera antiguo con herrajes de hierro. Parece contener algo valioso.",
  "state": "closed",
  "interactionResults": [
    {
      "action": "Abrir cofre",
      "result": "El cofre se abre con un chirrido. Dentro encuentras 150 monedas de oro y una poción de curación."
    },
    {
      "action": "Inspeccionar cofre",
      "result": "El cofre parece normal, pero notas que la cerradura es bastante simple. Podrías intentar forzarla."
    }
  ]
}
```

#### Estatua
```json
{
  "name": "Estatua de un Guerrero",
  "description": "Una estatua de piedra de un guerrero con armadura completa. Sostiene una espada en alto.",
  "interactionResults": [
    {
      "action": "Examinar estatua",
      "result": "La estatua parece antigua pero bien conservada. Notas que los ojos de la estatua están tallados con gemas rojas que brillan débilmente."
    },
    {
      "action": "Tocar estatua",
      "result": "La piedra está fría al tacto. Cuando tocas la base, sientes una ligera vibración mágica."
    },
    {
      "action": "Girar la espada",
      "result": "La espada gira con un clic audible. Oyes un mecanismo activarse en algún lugar de la sala."
    }
  ]
}
```

---

## Entidades (Entities)

Las entidades representan NPCs, monstruos y otras criaturas presentes en la aventura.

### Estructura

```json
{
  "id": "string (requerido)",
  "name": "string (requerido)",
  "type": "string (enum: 'monster', 'npc', 'other')",
  "description": "string (opcional)",
  "dmNotes": "string (opcional)",
  "baseType": "string (opcional)",
  "stats": { ... },
  "equipment": { ... },
  "disposition": "string (opcional)"
}
```

### Campos Principales

#### `id` (requerido)
- **Tipo:** `string`
- **Descripción:** Identificador único de la entidad. Se usa en `entitiesPresent` de las ubicaciones.
- **Formato recomendado:** `kebab-case` (ej: `"goblin-guard"`, `"npc-harbin-wester"`)

#### `name` (requerido)
- **Tipo:** `string`
- **Descripción:** Nombre de la entidad que aparece en la UI.

#### `type` (opcional)
- **Tipo:** `string` (enum)
- **Valores posibles:**
  - `"monster"`: Criatura hostil
  - `"npc"`: Personaje no jugador
  - `"other"`: Otro tipo de entidad
- **Default:** Si no se especifica, el sistema intenta inferirlo del contexto.

#### `description` (opcional)
- **Tipo:** `string`
- **Descripción:** Descripción física y narrativa de la entidad.
- **Mejores prácticas:**
  - Incluye detalles visuales distintivos
  - Menciona actitud/comportamiento si es relevante
  - Para NPCs, incluye personalidad básica

#### `dmNotes` (opcional)
- **Tipo:** `string`
- **Descripción:** Notas secretas para el DM sobre la entidad.
- **Puede incluir:**
  - Motivaciones y objetivos
  - Información que el NPC conoce
  - Comportamiento en combate
  - Secretos relacionados

#### `baseType` (opcional)
- **Tipo:** `string`
- **Descripción:** Tipo base para buscar estadísticas en el compendio de D&D (ej: `"goblin"`, `"dragon"`, `"orc"`).
- **Uso:** El sistema busca las estadísticas base del monstruo en el compendio y luego aplica modificaciones de `stats`.

#### `stats` (opcional)
- **Tipo:** `object`
- **Descripción:** Estadísticas que sobrescriben las del `baseType`.
- **Propiedades comunes:**
  - `hp` (`integer`): Puntos de vida
  - `ac` (`integer`): Clase de armadura
  - `speed` (`integer`): Velocidad en pies
  - Y otras estadísticas de D&D 5e
- **Ejemplo:**
```json
"stats": {
  "hp": 15,
  "ac": 16,
  "speed": 30
}
```

#### `equipment` (opcional)
- **Tipo:** `object`
- **Descripción:** Equipamiento de la entidad.
- **Propiedades comunes:**
  - `weapons` (`array` de `string`): Lista de armas (ej: `["scimitar", "shortbow"]`)
  - `armor` (`string`): Armadura (ej: `"leather armor"`)
- **Ejemplo:**
```json
"equipment": {
  "weapons": ["scimitar", "shortbow"],
  "armor": "leather armor"
}
```

#### `disposition` (opcional)
- **Tipo:** `string`
- **Descripción:** Disposición inicial de la entidad (ej: `"hostile"`, `"friendly"`, `"hidden"`).
- **Uso especial:** `"hidden"` para entidades que no son visibles inicialmente (ej: mímico disfrazado).

### Ejemplos de Entidades

#### Monstruo Simple
```json
{
  "id": "goblin-guard",
  "name": "Goblin Guardia",
  "type": "monster",
  "description": "Un goblin pequeño y maloliente con una lanza oxidada.",
  "baseType": "goblin",
  "dmNotes": "Este goblin está nervioso y alerta. Si ve a los jugadores, gritará para alertar a otros."
}
```

#### Monstruo con Stats Personalizadas
```json
{
  "id": "goblin-jefe",
  "name": "Goblin Jefe",
  "type": "monster",
  "description": "Un goblin más grande y musculoso que los demás, con una armadura de cuero remendada.",
  "baseType": "goblin",
  "stats": {
    "hp": 15,
    "ac": 16
  },
  "equipment": {
    "weapons": ["scimitar"],
    "armor": "leather armor"
  }
}
```

#### NPC
```json
{
  "id": "npc-harbin-wester",
  "name": "Harbin Wester",
  "type": "npc",
  "description": "Un hombre de mediana edad con ropas formales. Es el alcalde de Phandalin y parece preocupado.",
  "dmNotes": "Harbin conoce información sobre las misiones del tablón. Es cauteloso pero agradecido con los aventureros que ayudan al pueblo."
}
```

#### Mímico (Hidden)
```json
{
  "id": "cofre-mimico",
  "name": "Mímico",
  "type": "monster",
  "disposition": "hidden",
  "description": "Un mímico disfrazado de cofre. Sus dientes afilados brillan con hambre.",
  "baseType": "mimic",
  "stats": {
    "hp": 58,
    "ac": 12
  }
}
```

---

## Objetos (Items)

Los objetos representan items que los jugadores pueden encontrar, obtener y usar.

### Estructura

```json
{
  "id": "string (requerido)",
  "name": "string (requerido)",
  "type": "string (requerido)",
  "rarity": "string (opcional)",
  "description": "string (opcional)",
  "properties": { ... }
}
```

### Campos Principales

#### `id` (requerido)
- **Tipo:** `string`
- **Descripción:** Identificador único del objeto. Se usa en `requiredKeyId` de conexiones.

#### `name` (requerido)
- **Tipo:** `string`
- **Descripción:** Nombre del objeto.

#### `type` (requerido)
- **Tipo:** `string`
- **Descripción:** Tipo de objeto (ej: `"weapon"`, `"armor"`, `"potion"`, `"key"`, `"tool"`, `"consumable"`).

#### `rarity` (opcional)
- **Tipo:** `string`
- **Descripción:** Rareza del objeto (ej: `"common"`, `"uncommon"`, `"rare"`, `"very rare"`, `"legendary"`).

#### `description` (opcional)
- **Tipo:** `string`
- **Descripción:** Descripción del objeto.

#### `properties` (opcional)
- **Tipo:** `object`
- **Descripción:** Propiedades específicas del objeto (varía según el tipo).
- **Ejemplos:**
  - Armas: `{ "damage": "1d6", "damageType": "slashing" }`
  - Pociones: `{ "effect": "heal 2d4+2" }`
  - Llaves: `{ "unlocks": ["door-secret-room"] }`

### Ejemplos de Objetos

#### Llave
```json
{
  "id": "llave-sala-secreta",
  "name": "Llave de Hierro Antigua",
  "type": "key",
  "description": "Una llave de hierro oxidada con un diseño intrincado.",
  "properties": {
    "unlocks": ["sala-secreta"]
  }
}
```

#### Poción
```json
{
  "id": "pocion-curacion",
  "name": "Poción de Curación",
  "type": "potion",
  "rarity": "common",
  "description": "Una poción roja que brilla suavemente.",
  "properties": {
    "effect": "heal 2d4+2"
  }
}
```

#### Arma
```json
{
  "id": "espada-magica",
  "name": "Espada Larga +1",
  "type": "weapon",
  "rarity": "uncommon",
  "description": "Una espada larga con runas grabadas que brillan con luz tenue.",
  "properties": {
    "damage": "1d8+1",
    "damageType": "slashing",
    "magical": true,
    "bonus": 1
  }
}
```

---

## Tablas Aleatorias (Tables)

Las tablas aleatorias permiten generar contenido aleatorio basado en tiradas de dados.

### Estructura

```json
{
  "id": "string (requerido)",
  "title": "string (requerido)",
  "dice": "string (requerido)",
  "rows": [
    {
      "range": "string (requerido)",
      "content": "string (requerido)"
    }
  ]
}
```

### Campos Principales

#### `id` (requerido)
- **Tipo:** `string`
- **Descripción:** Identificador único de la tabla.

#### `title` (requerido)
- **Tipo:** `string`
- **Descripción:** Título de la tabla.

#### `dice` (requerido)
- **Tipo:** `string`
- **Descripción:** Notación de dados (ej: `"1d6"`, `"1d20"`, `"2d6"`).
- **Formato:** Notación estándar de D&D (número de dados + tipo de dado).

#### `rows` (requerido)
- **Tipo:** `array` de objetos con `range` y `content`
- **Descripción:** Filas de la tabla.
- **Estructura de cada fila:**
  - `range` (`string`): Rango de valores (ej: `"1"`, `"2-3"`, `"4-6"`)
  - `content` (`string`): Contenido que se genera cuando se obtiene ese rango

### Ejemplos de Tablas

#### Tabla Simple (1d6)
```json
{
  "id": "table-rumors",
  "title": "Rumores del Pueblo",
  "dice": "1d6",
  "rows": [
    {
      "range": "1",
      "content": "Un rumor sobre algo peligroso en las montañas."
    },
    {
      "range": "2",
      "content": "Se dice que hay un tesoro escondido en las ruinas al este."
    },
    {
      "range": "3-4",
      "content": "Los comerciantes hablan de bandidos en el camino norte."
    },
    {
      "range": "5-6",
      "content": "Un anciano cuenta historias sobre un dragón que vivía aquí hace siglos."
    }
  ]
}
```

#### Tabla de Encuentros (2d6)
```json
{
  "id": "table-encounters-forest",
  "title": "Encuentros en el Bosque",
  "dice": "2d6",
  "rows": [
    {
      "range": "2",
      "content": "Un oso pardo hambriento ataca sin previo aviso."
    },
    {
      "range": "3-4",
      "content": "Un grupo de 2d4 goblins merodean por el área."
    },
    {
      "range": "5-8",
      "content": "No hay encuentros. El viaje es tranquilo."
    },
    {
      "range": "9-10",
      "content": "Encuentras un NPC amigable: un cazador que ofrece información."
    },
    {
      "range": "11-12",
      "content": "Un tesoro escondido: 1d6 x 10 monedas de oro en una bolsa enterrada."
    }
  ]
}
```

---

## Escenas Narrativas (Narrative Scenes)

Las escenas narrativas son textos pre-generados para momentos cinemáticos ("cutscenes").

### Estructura

```json
{
  "id": "string (requerido)",
  "text": "string (requerido)",
  "triggerCondition": "string (opcional)"
}
```

### Campos Principales

#### `id` (requerido)
- **Tipo:** `string`
- **Descripción:** Identificador único de la escena. Se usa en eventos para referenciarla.

#### `text` (requerido)
- **Tipo:** `string`
- **Descripción:** El texto narrativo completo de la escena.
- **Puede incluir:** HTML básico para formato (`<h3>`, `<p>`, `<strong>`, etc.)

#### `triggerCondition` (opcional)
- **Tipo:** `string`
- **Descripción:** Condición lógica para disparar la escena automáticamente.
- **Formato:** `"tipo:valor"` (ej: `"enter_location:loc-room-1"`)
- **Nota:** También se pueden disparar manualmente mediante eventos.

### Ejemplos de Escenas Narrativas

#### Escena de Emboscada
```json
{
  "id": "scene-ambush",
  "text": "¡De repente, sombras se mueven en el techo! Varios goblins saltan con cuchillos en los dientes. El líder grita: '¡Atrapadlos!'",
  "triggerCondition": "enter_location:loc-room-1"
}
```

#### Escena de Revelación
```json
{
  "id": "scene-dragon-reveal",
  "text": "<h3>El Dragón Despierta</h3><p>La cueva tiembla. De las profundidades, un rugido ensordecedor hace eco. El aire se vuelve gélido. <strong>Cryovain</strong> emerge de la oscuridad, sus escamas blancas brillando como hielo bajo la luz de las antorchas.</p>",
  "triggerCondition": "enter_location:loc-dragon-lair"
}
```

---

## Eventos (Events)

Los eventos permiten crear lógica simple de scripting para automatizar acciones.

### Estructura

```json
{
  "id": "string (requerido)",
  "trigger": "string (requerido)",
  "locationId": "string (opcional)",
  "interactableId": "string (opcional)",
  "action": "string (requerido)",
  "target": "string | array (opcional)"
}
```

### Campos Principales

#### `id` (requerido)
- **Tipo:** `string`
- **Descripción:** Identificador único del evento.

#### `trigger` (requerido)
- **Tipo:** `string`
- **Descripción:** Qué dispara el evento.
- **Valores comunes:**
  - `"enter_location"`: Cuando los jugadores entran a una ubicación
  - `"combat_start"`: Cuando comienza un combate
  - `"interact"`: Cuando interactúan con un objeto
  - `"combat_end"`: Cuando termina un combate
  - Y otros según el sistema

#### `locationId` (opcional)
- **Tipo:** `string`
- **Descripción:** ID de la ubicación relevante (para triggers de ubicación).
- **Solo relevante si:** `trigger` es `"enter_location"` o similar.

#### `interactableId` (opcional)
- **Tipo:** `string`
- **Descripción:** ID del interactuable relevante (para triggers de interacción).
- **Solo relevante si:** `trigger` es `"interact"` o similar.

#### `action` (requerido)
- **Tipo:** `string`
- **Descripción:** Qué acción se ejecuta cuando se dispara el evento.
- **Valores comunes:**
  - `"play_scene"`: Reproduce una escena narrativa
  - `"spawn_enemies"`: Genera enemigos
  - `"unlock_connection"`: Desbloquea una conexión
  - `"change_location_state"`: Cambia el estado de una ubicación
  - Y otros según el sistema

#### `target` (opcional)
- **Tipo:** `string` o `array` de `string`
- **Descripción:** ID(s) del objetivo de la acción.
- **Ejemplos:**
  - Para `play_scene`: ID de la escena narrativa
  - Para `spawn_enemies`: Array de IDs de entidades
  - Para `unlock_connection`: ID de la conexión

### Ejemplos de Eventos

#### Reproducir Escena al Entrar
```json
{
  "id": "event-ambush-trigger",
  "trigger": "enter_location",
  "locationId": "loc-room-1",
  "action": "play_scene",
  "target": "scene-ambush"
}
```

#### Generar Enemigos al Abrir Cofre
```json
{
  "id": "event-mimic-spawn",
  "trigger": "interact",
  "interactableId": "cofre-mimico",
  "action": "spawn_enemies",
  "target": ["cofre-mimico"]
}
```

#### Desbloquear Pasaje al Derrotar Jefe
```json
{
  "id": "event-unlock-after-boss",
  "trigger": "combat_end",
  "locationId": "loc-boss-room",
  "action": "unlock_connection",
  "target": "connection-secret-passage"
}
```

---

## Peligros (Hazards)

Los peligros representan trampas, emboscadas y peligros ambientales en las ubicaciones.

### Estructura

```json
{
  "id": "string (requerido)",
  "type": "string (enum: 'trap', 'ambush', 'environmental', requerido)",
  "detectionDC": "integer (requerido)",
  "description": "string (requerido)",
  "triggerDescription": "string (requerido)",
  "disarmDC": "integer (opcional)",
  "effect": "string (opcional)",
  "active": "boolean (default: true)"
}
```

### Campos Principales

#### `id` (requerido)
- **Tipo:** `string`
- **Descripción:** Identificador único del peligro.

#### `type` (requerido)
- **Tipo:** `string` (enum)
- **Valores posibles:**
  - `"trap"`: Trampa mecánica (foso, dardos, etc.)
  - `"ambush"`: Emboscada (enemigos ocultos)
  - `"environmental"`: Peligro ambiental (gas venenoso, suelo resbaladizo, etc.)

#### `detectionDC` (requerido)
- **Tipo:** `integer`
- **Descripción:** Dificultad (DC) para detectar el peligro con una tirada de Percepción o Investigación.

#### `description` (requerido)
- **Tipo:** `string`
- **Descripción:** Descripción de lo que se ve (o pistas) antes de que se active el peligro.
- **Mejores prácticas:**
  - Da pistas sutiles pero no obvias
  - Para trampas: describe algo sospechoso pero no definitivo
  - Para emboscadas: describe una sensación de peligro o algo fuera de lugar

#### `triggerDescription` (requerido)
- **Tipo:** `string`
- **Descripción:** Texto narrativo que se muestra cuando el peligro se activa.
- **Ejemplo:** `"El suelo cede bajo tus pies revelando un foso de 10 pies de profundidad."`

#### `disarmDC` (opcional)
- **Tipo:** `integer`
- **Descripción:** Dificultad (DC) para desarmar el peligro (solo relevante para trampas).
- **Solo relevante si:** `type` es `"trap"`

#### `effect` (opcional)
- **Tipo:** `string`
- **Descripción:** Efecto mecánico del peligro (daño, condición, etc.).
- **Formato:** Texto libre que describe el efecto (ej: `"1d6 daño caída"`, `"Envenenado"`)

#### `active` (opcional)
- **Tipo:** `boolean`
- **Default:** `true`
- **Descripción:** Si el peligro está activo. Útil para desactivar peligros después de ser desarmados.

### Ejemplos de Peligros

#### Trampa de Foso
```json
{
  "id": "trap-pit",
  "type": "trap",
  "detectionDC": 15,
  "disarmDC": 12,
  "description": "Una losa del suelo parece suelta y ligeramente desalineada con las demás.",
  "triggerDescription": "El suelo cede bajo tus pies revelando un foso de 10 pies de profundidad. Caes y recibes 1d6 de daño por caída.",
  "effect": "1d6 daño caída",
  "active": true
}
```

#### Emboscada
```json
{
  "id": "emboscada-goblin",
  "type": "ambush",
  "detectionDC": 30,
  "description": "Una sensación de peligro inminente te eriza la piel. El silencio es demasiado profundo.",
  "triggerDescription": "¡De repente, varios goblins saltan de las sombras gritando! Estaban escondidos en los nichos de las paredes.",
  "active": true
}
```

#### Peligro Ambiental
```json
{
  "id": "hazard-gas-venenoso",
  "type": "environmental",
  "detectionDC": 12,
  "description": "El aire huele extrañamente dulce y notas una ligera sensación de mareo.",
  "triggerDescription": "El gas venenoso te envuelve. Sientes que te falta el aire y tu visión se nubla.",
  "effect": "Envenenado (Constitution save DC 13 o estar envenenado por 1 hora)",
  "active": true
}
```

---

## Mejores Prácticas

### 1. Nomenclatura de IDs
- **Usa prefijos descriptivos:** `loc-`, `npc-`, `item-`, `event-`, etc.
- **Formato consistente:** `kebab-case` (minúsculas, guiones)
- **Ejemplos buenos:**
  - `"phandalin-plaza-del-pueblo"`
  - `"goblin-guard-1"`
  - `"llave-sala-secreta"`
- **Ejemplos malos:**
  - `"location1"` (no descriptivo)
  - `"Goblin_Guard"` (inconsistente)

### 2. Descripciones Narrativas
- **Sé específico pero evocador:** Incluye detalles sensoriales
- **Evita spoilers:** Guarda secretos en `dmNotes`
- **Longitud apropiada:**
  - Ubicaciones: 2-5 frases
  - Interactuables: 1-2 frases
  - Entidades: 1-3 frases

### 3. Conexiones y Navegación
- **Siempre incluye `direction`:** Ayuda a la orientación espacial
- **Usa `type` apropiado:** `direct` para mazmorras, `urban` para pueblos, `overland` para viajes
- **Describe distancias:** Incluye `description` o `travelTime` cuando sea relevante

### 4. Referencias y Consistencia
- **Verifica referencias:** Todos los IDs referenciados deben existir
  - `targetId` en conexiones → debe existir en `locations`
  - `entitiesPresent` → debe existir en `entities`
  - `requiredKeyId` → debe existir en `items`
  - `target` en eventos → debe existir según el tipo

### 5. Organización del JSON
- **Orden lógico:** Metadatos → Configuración → Contenido (locations, entities, etc.)
- **Comentarios en JSON:** No se soportan, pero puedes usar `dmNotes` para documentación interna
- **Validación:** Usa el schema JSON para validar antes de usar

### 6. Performance
- **`introductoryNarration`:** Úsalo para mejorar tiempos de carga inicial
- **Evita descripciones excesivamente largas:** La IA procesa todo el JSON
- **Optimiza referencias:** No dupliques información, usa IDs

---

## Patrones Comunes

### Patrón 1: Hub y Spokes (Pueblo con Misiones)
```
[Plaza del Pueblo] (hub)
  ├─ [Posada] (urban)
  ├─ [Tienda] (urban)
  └─ [Misión 1] (overland, 2 horas)
  └─ [Misión 2] (overland, 1 día)
```

**Características:**
- Una ubicación central (`regionId: "phandalin"`)
- Conexiones `urban` a servicios
- Conexiones `overland` a misiones

### Patrón 2: Mazmorra Lineal
```
[Entrada] → [Sala 1] → [Sala 2] → [Sala 3] → [Jefe Final]
```

**Características:**
- Conexiones `direct` entre salas
- `explorationMode: "dungeon"`
- `lightLevel: "dim"` o `"dark"`

### Patrón 3: Mazmorra No Lineal (Grafo)
```
        [Sala 1]
       /    |    \
[Sala 2] [Sala 3] [Sala 4]
       \    |    /
        [Sala 5 (Jefe)]
```

**Características:**
- Múltiples rutas posibles
- Conexiones bidireccionales (A→B y B→A)
- Secretos con `visibility: "restricted"`

### Patrón 4: Emboscada con Hazard
```json
{
  "id": "loc-emboscada",
  "hazards": [{
    "type": "ambush",
    "detectionDC": 30,
    ...
  }],
  "entitiesPresent": ["goblin-1", "goblin-2"],
  "events": [{
    "trigger": "enter_location",
    "action": "play_scene",
    "target": "scene-ambush"
  }]
}
```

### Patrón 5: Cofre con Mímico
```json
{
  "id": "loc-tesoro",
  "interactables": [{
    "id": "cofre-mimico",
    "name": "Cofre de Madera",
    ...
  }],
  "hazards": [{
    "type": "mimic",  // Nota: puede requerir soporte especial
    ...
  }],
  "entitiesPresent": ["cofre-mimico"],  // Entidad con disposition: "hidden"
  "events": [{
    "trigger": "interact",
    "interactableId": "cofre-mimico",
    "action": "spawn_enemies",
    "target": ["cofre-mimico"]
  }]
}
```

---

## Ejemplos Avanzados

### Ejemplo 1: Aventura Completa Mínima
```json
{
  "adventureId": "aventura-minima",
  "title": "Aventura Mínima",
  "summary": "Una aventura simple de ejemplo.",
  "settings": {
    "startingLocationId": "sala-inicio"
  },
  "locations": [
    {
      "id": "sala-inicio",
      "title": "Sala de Inicio",
      "description": "Una sala simple con una puerta al norte.",
      "connections": [
        {
          "targetId": "sala-final",
          "type": "direct",
          "direction": "norte",
          "description": "Una puerta de madera."
        }
      ]
    },
    {
      "id": "sala-final",
      "title": "Sala Final",
      "description": "Has llegado al final de la aventura.",
      "connections": [
        {
          "targetId": "sala-inicio",
          "type": "direct",
          "direction": "sur",
          "description": "La puerta por la que entraste."
        }
      ]
    }
  ]
}
```

### Ejemplo 2: Aventura con Combate
```json
{
  "adventureId": "aventura-combate",
  "title": "Aventura con Combate",
  "summary": "Una aventura que incluye combate.",
  "settings": {
    "startingLocationId": "sala-segura"
  },
  "locations": [
    {
      "id": "sala-segura",
      "title": "Sala Segura",
      "description": "Una sala tranquila. Al norte hay una puerta.",
      "connections": [
        {
          "targetId": "sala-combate",
          "type": "direct",
          "direction": "norte",
          "description": "Una puerta cerrada."
        }
      ]
    },
    {
      "id": "sala-combate",
      "title": "Sala de Combate",
      "description": "Una sala con tres goblins hostiles.",
      "explorationMode": "dungeon",
      "lightLevel": "dim",
      "entitiesPresent": ["goblin-1", "goblin-2", "goblin-3"],
      "connections": [
        {
          "targetId": "sala-segura",
          "type": "direct",
          "direction": "sur",
          "description": "La puerta por la que entraste."
        }
      ]
    }
  ],
  "entities": [
    {
      "id": "goblin-1",
      "name": "Goblin",
      "type": "monster",
      "baseType": "goblin"
    },
    {
      "id": "goblin-2",
      "name": "Goblin",
      "type": "monster",
      "baseType": "goblin"
    },
    {
      "id": "goblin-3",
      "name": "Goblin",
      "type": "monster",
      "baseType": "goblin"
    }
  ]
}
```

### Ejemplo 3: Aventura con Trampa y Tesoro
```json
{
  "adventureId": "aventura-trampa-tesoro",
  "title": "Aventura con Trampa y Tesoro",
  "summary": "Una aventura con una trampa y un tesoro.",
  "settings": {
    "startingLocationId": "sala-trampa"
  },
  "locations": [
    {
      "id": "sala-trampa",
      "title": "Sala con Trampa",
      "description": "Una sala con un cofre en el centro. El suelo parece sospechoso.",
      "hazards": [
        {
          "id": "trap-pit",
          "type": "trap",
          "detectionDC": 15,
          "disarmDC": 12,
          "description": "Una losa del suelo parece suelta.",
          "triggerDescription": "El suelo cede bajo tus pies revelando un foso.",
          "effect": "1d6 daño caída"
        }
      ],
      "interactables": [
        {
          "name": "Cofre de Tesoro",
          "description": "Un cofre de madera con herrajes de hierro.",
          "interactionResults": [
            {
              "action": "Abrir cofre",
              "result": "El cofre contiene 150 monedas de oro y una poción de curación."
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Notas Finales

- **Validación:** Siempre valida tu JSON contra `adventure.schema.json` antes de usarlo
- **Testing:** Prueba la aventura en el sistema para verificar que todo funciona
- **Iteración:** Las aventuras pueden evolucionar, no tengas miedo de refactorizar
- **Documentación:** Usa `dmNotes` generosamente para documentar decisiones de diseño

---

**¿Preguntas o sugerencias?** Esta guía está viva y puede actualizarse. Si encuentras patrones útiles o casos de uso no cubiertos, considera contribuir a la documentación.




