# Plan de Implementación: Sistema de Movimiento y Conciencia Espacial

**Estado:** En Curso  
**Prioridad:** Muy Alta  
**Fecha de Inicio:** 28-11-2025  

## 1. Contexto y Motivación

Actualmente, el motor de *DnD Adventures AI* carece de un concepto robusto de espacio y movimiento. Tanto el combate como la exploración se resuelven de manera abstracta, sin distancias definidas, posicionamiento relativo o movimiento táctico real. Esto limita severamente la profundidad estratégica del combate y reduce la inmersión durante la exploración de mazmorras y viajes.

Este plan propone implementar un **Sistema de Movimiento y Conciencia Espacial** que adapte la granularidad del tiempo y el espacio según el contexto narrativo.

## 2. Estrategia de Implementación

La implementación se realizará de forma **iterativa e incremental**, dividiendo el sistema en tres modos distintos de granularidad. 

**Foco Actual:** Nos centraremos exclusivamente en la implementación completa del **Modo Navegación (Macro)**. Los modos de Exploración de Mazmorra y Combate Táctico se abordarán en fases posteriores una vez que la navegación macro esté consolidada.

---

## 3. Fase 1: Modo Navegación (Macro)

Este modo cubre tanto los viajes por el mundo (Overland) como el movimiento urbano cotidiano (Urban Hubs).

### 3.1. Concepto Central: Navegación por Nodos y Hubs
El sistema abandona la idea de que el mundo es una lista plana de habitaciones aisladas para entenderlo como un **grafo jerárquico**.

*   **Sin Coordenadas X/Y:** Se utiliza un sistema de movimiento "Punto a Punto".
*   **Tiempo Variable:** El sistema calcula el paso del tiempo según el tipo de conexión (minutos para cruzar la calle, días para viajar a otra ciudad).
*   **Conectividad Implícita:** Si dos lugares pertenecen al mismo "Hub" seguro (ej: Phandalin), se asume que están conectados a menos que se diga lo contrario, permitiendo movimiento libre sin definir cada conexión explícitamente.

### 3.2. Capa de Datos: Actualización de Schemas (`src/lib/schemas.ts`)
Enriqueceremos los esquemas Zod para soportar metadatos de viaje, restricciones lógicas y el paso del tiempo.

#### A. Actualización de GameState
Añadir un reloj global para rastrear el tiempo transcurrido durante los viajes.
```typescript
// En GameStateSchema
worldTime: z.object({
    day: z.number().default(1),
    hour: z.number().default(8), // 8:00 AM start
    minute: z.number().default(0)
}).optional(),
```

#### B. Definición de Tipos de Viaje
```typescript
export const TravelTypeSchema = z.enum([
  'direct',   // Puerta, pasillo inmediato (segundos)
  'urban',    // Movimiento dentro de un Hub seguro (minutos)
  'overland', // Viaje por mapa de región (horas/días)
  'special'   // Teletransporte, barco, etc.
]);
```

#### C. Esquema de Conexión (Las "Aristas" del Grafo)
Sustituye al simple array de strings `exits`. Define cómo se llega al destino.

```typescript
export const ConnectionSchema = z.object({
  targetId: z.string(), // ID del nodo destino
  type: TravelTypeSchema.default('direct'),
  
  // Metadatos Espaciales (Para el cerebro del DM)
  direction: z.enum(['norte', 'sur', 'este', 'oeste', 'arriba', 'abajo', 'dentro', 'fuera']).optional(),
  distance: z.string().optional(), // Ej: "5 millas", "200 pies"
  travelTime: z.string().optional(), // Ej: "2 horas", "10 minutos"
  
  // Restricciones Lógicas (El problema de la "Puerta Cerrada")
  isLocked: z.boolean().default(false),
  requiredKeyId: z.string().optional(), // Item necesario para pasar
  isBlocked: z.boolean().default(false), // Camino derrumbado/cortado
  blockedReason: z.string().optional()   // Narración del bloqueo
});
```

#### D. Actualización de LocationSchema (Los "Nodos")
```typescript
export const LocationSchema = z.object({
  // ... campos existentes ...
  
  // Jerarquía de Hubs
  regionId: z.string().optional().describe("Agrupa ubicaciones (ej: 'phandalin') para movimiento implícito"),
  
  // Restricción de Viaje (El problema de la "Celda")
  allowFastTravel: z.boolean().default(true).describe("Si false, bloquea viajes tipo 'overland' desde aquí"),
  
  // Nuevas conexiones ricas
  connections: z.array(ConnectionSchema).optional(),
});
```

### 3.3. Capa de Datos: Estándares JSON (`adventure.schema.json` y `_template.json`)
Para asegurar que las futuras aventuras sigan este estándar, actualizaremos los archivos de definición y plantillas.

#### A. Actualización de `adventure.schema.json`
Añadir las nuevas propiedades a las definiciones de `location` y `connection`.

```json
// En "definitions": { "location": { ... } }
"regionId": {
    "type": "string",
    "description": "Identificador de la región o Hub al que pertenece esta ubicación (ej: 'phandalin'). Permite movimiento implícito."
},
"allowFastTravel": {
    "type": "boolean",
    "default": true,
    "description": "Si es false, impide iniciar viajes largos desde esta ubicación (ej: celdas, combate)."
},
// En "definitions": { "connection": { ... } }
"type": {
    "type": "string",
    "enum": ["direct", "urban", "overland", "special"],
    "default": "direct",
    "description": "Tipo de conexión: direct (inmediato), urban (minutos, seguro), overland (horas/días, viaje), special (teletransporte)."
},
"travelTime": {
    "type": "string",
    "description": "Tiempo estimado de viaje (ej: '10 minutos', '2 días')."
},
"distance": {
    "type": "string",
    "description": "Distancia física o narrativa (ej: '5 millas', '300 pies')."
},
"isLocked": {
    "type": "boolean",
    "default": false,
    "description": "Si la conexión está cerrada con llave o mecanismo."
},
"requiredKeyId": {
    "type": "string",
    "description": "ID del objeto necesario para desbloquear la conexión."
},
"isBlocked": {
    "type": "boolean",
    "default": false,
    "description": "Si el camino está bloqueado (ej: derrumbe)."
},
"blockedReason": {
    "type": "string",
    "description": "Texto narrativo que explica por qué está bloqueado."
}
```

#### B. Actualización de `_template.json`
Reflejar estas capacidades en la plantilla para creadores.

```json
{
    // ...
    "locations": [
        {
            "id": "loc-hub-plaza",
            "title": "Plaza del Pueblo",
            "regionId": "pueblo-inicio", // Ejemplo de Hub
            "allowFastTravel": true,
            "connections": [ 
                {
                    "toLocationId": "loc-wilds-road",
                    "type": "overland",
                    "direction": "north",
                    "travelTime": "4 horas",
                    "description": "El camino viejo hacia las montañas."
                },
                {
                    "toLocationId": "loc-hub-tavern",
                    "type": "urban",
                    "description": "La puerta de la taberna."
                }
            ]
        }
    ]
}
```

### 3.4. Capa de Lógica: El Router de Movimiento (`NavigationManager`)

La lógica de movimiento actual es simplista. Implementaremos un nuevo módulo `NavigationManager` y mejoraremos el `GameCoordinator` para resolver el problema del "Objetivo Invisible".

#### 1. Solución al "Objetivo Invisible" (Context Enrichment)
**Problema:** En un Hub (ej: Plaza), las conexiones a edificios cercanos (ej: Taberna) son implícitas. Si no se pasan al contexto de la IA, esta no sabrá que existen.
**Solución:** Antes de llamar al `ActionInterpreter`, el `GameCoordinator` debe:
1.  Verificar si `currentLocation` tiene `regionId`.
2.  Si tiene, buscar todas las ubicaciones hermanas (mismo `regionId`) en `adventureData`.
3.  Inyectar estos "destinos implícitos" en el contexto de la IA para que sepa que son accesibles.

#### 2. Nuevo Módulo: `src/ai/flows/managers/navigation-manager.ts`
Este servicio encapsulará la lógica de validación, enrutamiento y tiempo.

```typescript
export class NavigationManager {
  async resolveMovement(
    currentLocation: Location, 
    targetId: string, 
    party: Character[],
    gameState: GameState
  ): Promise<MovementResult> {
    // 1. Identificar destino (AdventureLookup)
    // 2. Determinar tipo de ruta (Hub vs Direct vs Overland)
    // 3. Validar restricciones (Locked, Blocked)
    // 4. Calcular costes (Tiempo, Recursos) y actualizar worldTime
    // 5. Manejo defensivo de conexiones legacy (strings) vs objetos
    // Retorna: { success, newLocationId?, narration, timePassed }
  }
}
```

#### 3. Integración en `executeNarrativeTurn`
Sustituiremos el bloque actual de gestión de movimiento (líneas ~85-102) por una llamada al `NavigationManager`.

1.  **Interceptar Acción 'Move':** Cuando `interpretation.actionType === 'move'`.
2.  **Resolver Movimiento:** Llamar a `NavigationManager.resolveMovement`.
3.  **Gestionar Resultado:**
    *   **Éxito:** Actualizar `newLocationId`, añadir narración de transición, avanzar reloj del mundo.
    *   **Fallo:** Mantener `currentLocationId`, añadir narración de bloqueo (ej: "La puerta está cerrada").

#### 4. Algoritmo de Enrutamiento (Detalle)
1.  **Conexión Directa:** Buscar en `currentLocation.connections`.
    *   *Nota de Compatibilidad:* Si `connections` contiene strings (legacy), tratarlos como conexiones `direct` sin restricciones.
2.  **Movimiento Hub (Implícito):** Si no hay conexión directa, verificar `Target.regionId === currentLocation.regionId`.
3.  **Viaje Largo (Fast Travel):** Si no es Hub, verificar `currentLocation.allowFastTravel`.

### 3.5. Capa de Contenido: Ejemplo JSON
Estructura de Phandalin para permitir movimiento libre entre Posada y Bazar, pero viaje controlado hacia el exterior.

```json
{
  "locations": [
    {
      "id": "posada-stonehill",
      "name": "Posada Stonehill",
      "regionId": "phandalin", // Hub Urbano
      "type": "urban_interior",
      "connections": [
        {
          "targetId": "camino-triboar", // Salida del pueblo
          "type": "overland",
          "direction": "este",
          "travelTime": "10 minutos",
          "description": "Sales del pueblo hacia el camino principal."
        }
        // Nota: NO necesita conexión explícita al Bazar, el Hub lo maneja.
      ]
    },
    {
      "id": "bazar-escudo-de-leon",
      "name": "Bazar Escudo de León",
      "regionId": "phandalin", // Mismo Hub
      "connections": []
    }
  ]
}
```

### 3.6. Beneficios Esperados
*   **Libertad del Jugador:** Pueden decir "Voy al Bazar" sin tener que navegar nodo a nodo.
*   **Consistencia Lógica:** Evita teletransportes desde celdas o a través de puertas cerradas.
*   **Conciencia Temporal:** El DM sabe diferenciar si han pasado 5 minutos o 3 días.
*   **Backend-Only:** Todo ocurre en la lógica del servidor; el frontend solo recibe la nueva ubicación y la narración.

### 3.7. Fase 4: Verificación y Pruebas

Para asegurar la robustez del sistema, se ejecutarán las siguientes pruebas:

#### A. Pruebas Unitarias (`NavigationManager`)
*   **Routing:** Verificar que elige correctamente entre `direct`, `urban` y `overland`.
*   **Validación:** Verificar que bloquea el paso si `isLocked` es true y no se tiene la llave.
*   **Tiempo:** Verificar que `worldTime` avanza correctamente según `travelTime`.

#### B. Pruebas de Integración (In-Game)
*   **Movimiento Hub:** Moverse entre dos ubicaciones con el mismo `regionId` sin conexión explícita.
    *   *Resultado esperado:* Éxito, narración breve, tiempo mínimo.
*   **Viaje Overland:** Intentar salir de Phandalin hacia una mazmorra.
    *   *Resultado esperado:* Éxito, narración de viaje, avance de horas.
*   **Compatibilidad Legacy:** Cargar una aventura antigua con conexiones string.
    *   *Resultado esperado:* Funciona como conexión `direct`.
*   **Contexto Implícito:** Preguntar a la IA "¿Qué hay cerca?" estando en un Hub.
    *   *Resultado esperado:* La IA menciona las otras ubicaciones del Hub aunque no estén en `exits`.

---

## 4. Fases Futuras (Pendientes de Detallar)

### Fase 2: Modo Exploración de Mazmorra (Meso)
**Contexto:** Entornos desconocidos, hostiles o que requieren investigación activa.  
**Conceptos Clave:**
*   Movimiento por **Zonas Lógicas** (Habitaciones/Pasillos).
*   **Niebla de Guerra Semántica:** Registro de zonas "Reveladas" vs "Ocultas".
*   **Visibilidad Contextual:** Descripción limitada a lo visible desde la zona actual.
*   **Peligros Pasivos:** Chequeos automáticos al entrar en nuevas zonas.

### Fase 3: Modo Combate Táctico (Micro)
**Contexto:** Iniciativa y tiempo crítico.  
**Conceptos Clave:**
*   Posicionamiento preciso sobre Grid/Retícula.
*   **Teatro de la Mente con Datos:** Uso de distancias exactas y coberturas para validación, aunque la salida sea narrativa.
*   **Herencia:** Posición inicial derivada de la Zona de exploración.
