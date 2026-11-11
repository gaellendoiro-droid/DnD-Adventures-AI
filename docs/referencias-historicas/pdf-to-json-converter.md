# Convertidor de PDF a JSON - Aplicación Auxiliar

## 📋 Objetivo

Crear una aplicación auxiliar e independiente que analice PDFs de aventuras de D&D y los convierta automáticamente en archivos JSON con la estructura necesaria para ser cargados en el juego D&D Adventures AI. La aplicación utilizará IA para extraer y estructurar la información del PDF de forma inteligente.

## 🎯 Beneficios

- **Automatización:** Convierte aventuras de PDF a JSON sin necesidad de escribir manualmente el JSON
- **Ahorro de Tiempo:** Reduce significativamente el tiempo necesario para adaptar aventuras al formato del juego
- **Precisión:** Utiliza IA para extraer información estructurada del PDF, reduciendo errores humanos
- **Flexibilidad:** Permite convertir cualquier aventura de D&D en formato PDF
- **Independencia:** Aplicación separada que no afecta el rendimiento del juego principal
- **Reutilizable:** Puede usarse para múltiples aventuras

## 🏗️ Arquitectura Propuesta

### Tipo de Aplicación

**Opción 1: Aplicación CLI (Recomendada para MVP)**
- ✅ Simple de implementar
- ✅ Fácil de usar desde terminal
- ✅ No requiere interfaz gráfica
- ✅ Rápida de desarrollar
- ⚠️ Menos amigable para usuarios no técnicos

**Opción 2: Aplicación Web (Futuro)**
- ✅ Interfaz gráfica amigable
- ✅ Drag & drop de PDFs
- ✅ Preview del JSON generado
- ✅ Validación visual
- ⚠️ Requiere servidor web
- ⚠️ Más compleja de implementar

**Opción 3: Aplicación Desktop (Futuro)**
- ✅ Interfaz nativa
- ✅ No requiere servidor
- ✅ Puede usar Electron o Tauri
- ⚠️ Más compleja de distribuir

**Recomendación:** Empezar con CLI (Opción 1) y luego considerar Web (Opción 2) si hay demanda.

### Componentes Principales

1. **Extractor de PDF**
   - Lee y extrae texto del PDF
   - Maneja diferentes formatos de PDF (texto, escaneado con OCR)
   - Preserva estructura (títulos, párrafos, listas)

2. **Procesador de IA**
   - Analiza el texto extraído
   - Identifica secciones (ubicaciones, entidades, descripciones)
   - Extrae información estructurada
   - Genera IDs únicos para ubicaciones y entidades

3. **Generador de JSON**
   - Crea estructura JSON según el esquema del juego
   - Valida la estructura generada
   - Formatea el JSON de forma legible

4. **Validador**
   - Verifica que el JSON generado cumple con el esquema requerido
   - Detecta campos faltantes o incorrectos
   - Proporciona feedback detallado sobre errores

## 🗺️ Interpretación y Uso de Mapas

### Objetivo Principal: Contexto Espacial para el DM (IA)

**Importante:** El juego sigue siendo conversacional. Los mapas NO se usan para navegación visual interactiva, sino para proporcionar contexto espacial al DM (IA) que permita:
- **Narraciones más ricas y fieles:** El DM puede describir distancias, posiciones y distribución espacial con precisión
- **Combates más tácticos:** El DM puede gestionar posicionamiento, alcances, movimientos y cobertura basándose en el mapa real
- **Consistencia espacial:** El DM mantiene coherencia en las descripciones de ubicaciones y distancias

### Visualización Opcional (Futuro)

Si se implementa visualización de mapas, será:
- **Solo como imagen estática:** Captura del mapa original del PDF
- **Referencia visual:** El jugador puede ver el mapa como referencia, pero no interactúa con él
- **No interactivo:** No hay navegación por clic, fog of war, ni áreas clickeables
- **Opcional:** Puede mostrarse en un panel lateral o modal cuando el jugador lo solicite

### Información Espacial a Extraer

El objetivo es extraer información estructurada del mapa que el DM pueda usar:

1. **Dimensiones y Escala:**
   - Tamaño de la ubicación (pies/metros)
   - Escala del mapa (pies por cuadrícula, pies por pulgada)
   - Dimensiones de habitaciones/áreas específicas

2. **Distribución Espacial:**
   - Posición relativa de habitaciones/áreas
   - Distancias entre puntos clave
   - Conexiones entre áreas (puertas, pasillos, escaleras)

3. **Elementos Tácticos (para combate):**
   - Posiciones de cobertura (paredes, pilares, obstáculos)
   - Áreas de terreno difícil
   - Puntos de entrada/salida
   - Posiciones elevadas o desniveles

4. **Elementos Narrativos:**
   - Ubicación de objetos importantes
   - Posición de NPCs/entidades
   - Áreas de interés especial

### Extracción de Información Espacial

**Usando IA de Visión:**
- Analizar el mapa para identificar habitaciones, pasillos, puertas
- Detectar y leer escalas y leyendas
- Identificar elementos tácticos (cobertura, obstáculos)
- Medir distancias aproximadas entre elementos

**Usando Análisis de Texto:**
- Extraer descripciones de distancias del texto de la aventura
- Identificar referencias a medidas en el mapa
- Asociar descripciones textuales con elementos del mapa

### Extracción de Mapas del PDF

**Desafíos:**
- Identificar qué imágenes son mapas (vs ilustraciones, símbolos, etc.)
- Asociar mapas con ubicaciones específicas
- Manejar mapas que ocupan múltiples páginas
- Detectar mapas de diferentes escalas (mapa general vs mapa detallado)

**Soluciones Propuestas:**
1. **Análisis de Contexto:** Usar IA para analizar el texto alrededor de imágenes y determinar si es un mapa
2. **Análisis de Imagen:** Usar visión por computadora (IA) para detectar características de mapas (líneas, áreas, etiquetas)
3. **Patrones de Nombres:** Buscar palabras clave en nombres de archivos/imágenes ("map", "mapa", "location", etc.)
4. **Tamaño y Posición:** Los mapas suelen ser más grandes y estar en páginas específicas

### Estructura de Datos para Mapas

```typescript
interface LocationMap {
  id: string;                    // ID único del mapa
  locationId: string;            // ID de la ubicación asociada
  type: 'location' | 'area' | 'combat';  // Tipo de mapa
  imagePath?: string;            // Ruta al archivo de imagen (opcional, para visualización)
  imageFormat?: 'png' | 'jpg';   // Formato de imagen
  
  // Información espacial para el DM
  spatialData: {
    // Dimensiones
    dimensions?: {
      width: number;              // Ancho en pies/metros
      height: number;             // Alto en pies/metros
      scale?: string;             // Escala (ej: "1 cuadrícula = 5 pies")
    };
    
    // Áreas/Habitaciones
    areas?: MapArea[];            // Habitaciones o áreas identificadas
    
    // Conexiones
    connections?: MapConnection[]; // Conexiones entre áreas (puertas, pasillos)
    
    // Elementos tácticos (para combate)
    tacticalElements?: {
      cover?: CoverArea[];        // Áreas de cobertura
      difficultTerrain?: TerrainArea[];  // Terreno difícil
      elevation?: ElevationArea[]; // Áreas elevadas
      obstacles?: Obstacle[];     // Obstáculos
    };
    
    // Distancias entre puntos clave
    distances?: MapDistance[];    // Distancias entre puntos importantes
  };
  
  // Leyenda (opcional)
  legend?: MapLegend;             // Leyenda del mapa
}

interface MapArea {
  id: string;                     // ID del área
  name?: string;                  // Nombre del área (si está etiquetada)
  type: 'room' | 'corridor' | 'chamber' | 'open';  // Tipo de área
  position: {                     // Posición aproximada
    x: number;                    // Coordenada X relativa (0-100)
    y: number;                    // Coordenada Y relativa (0-100)
  };
  dimensions?: {                  // Dimensiones del área
    width: number;                // Ancho en pies
    height: number;               // Alto en pies
  };
  description?: string;           // Descripción del área
}

interface MapConnection {
  from: string;                   // ID del área origen
  to: string;                     // ID del área destino
  type: 'door' | 'corridor' | 'stair' | 'passage';  // Tipo de conexión
  distance?: number;              // Distancia en pies (opcional)
}

interface CoverArea {
  id: string;
  type: 'wall' | 'pillar' | 'furniture' | 'natural';
  position: { x: number; y: number };
  description?: string;
}

interface TerrainArea {
  id: string;
  type: 'difficult' | 'rough' | 'water' | 'mud';
  position: { x: number; y: number };
  area?: { width: number; height: number };
}

interface ElevationArea {
  id: string;
  elevation: number;              // Altura en pies
  position: { x: number; y: number };
  area?: { width: number; height: number };
}

interface Obstacle {
  id: string;
  type: string;
  position: { x: number; y: number };
  description?: string;
}

interface MapDistance {
  from: string;                   // Punto origen (ID de área o descripción)
  to: string;                     // Punto destino
  distance: number;               // Distancia en pies
  path?: string[];                // Ruta (IDs de áreas intermedias, opcional)
}

interface MapLegend {
  items: Array<{
    symbol: string;               // Símbolo o color
    description: string;          // Descripción
  }>;
}
```

### Almacenamiento de Mapas

**Para Información Espacial:**
- La información espacial (`spatialData`) se almacena directamente en el JSON
- Es la parte más importante, ya que es lo que usa el DM (IA)

**Para Imágenes (Opcional - Solo para Visualización):**
- **Opción 1: Archivos Separados (Recomendado)**
  - Guardar mapas como archivos PNG/JPG en carpeta `maps/`
  - Referencias en JSON: `"imagePath": "maps/location-123.png"`
  - **Ventajas:** JSON más ligero, fácil de optimizar
  - **Uso:** Solo si se implementa visualización estática en el futuro

- **Opción 2: No Guardar Imágenes**
  - Solo extraer información espacial, no guardar las imágenes
  - **Ventajas:** Más eficiente, menos almacenamiento
  - **Uso:** Si solo se necesita contexto para el DM

**Recomendación:** 
- **Fase 1:** Solo información espacial en JSON (sin imágenes)
- **Fase 2 (Futuro):** Si se implementa visualización, guardar imágenes en archivos separados

**Estructura propuesta:**
```
adventure-name/
├── adventure.json          # Contiene spatialData para cada ubicación
└── maps/                   # Solo si se implementa visualización
    ├── location-1.png
    └── location-2.png
```

## 📝 Estructura de JSON Requerida

Basado en el análisis del código, el JSON debe tener la siguiente estructura:

```json
{
  "adventureId": "id-unico-de-la-aventura",
  "title": "Título de la Aventura",
  "summary": "Resumen breve de la aventura",
  "table_of_contents": {
    "locations": [
      { "name": "Nombre Ubicación", "id": "id-ubicacion" }
    ],
    "entities": [
      { "name": "Nombre Entidad", "id": "id-entidad" }
    ]
  },
  "locations": [
    {
      "id": "id-ubicacion",
      "title": "Título de la Ubicación",
      "description": "Descripción detallada...",
      "entitiesPresent": ["id-entidad-1", "id-entidad-2"],
      "interactables": [],
      "exits": [
        { "direction": "norte", "targetId": "id-otra-ubicacion" }
      ],
      "dmNotes": "Notas para el DM...",
      "mapData": {  // Opcional: información espacial del mapa para el DM
        "imagePath": "maps/location-id.png",  // Opcional: solo si se implementa visualización
        "spatialData": {
          "dimensions": {
            "width": 60,  // pies
            "height": 40,  // pies
            "scale": "1 cuadrícula = 5 pies"
          },
          "areas": [
            {
              "id": "room-1",
              "name": "Sala Principal",
              "type": "room",
              "position": { "x": 30, "y": 20 },
              "dimensions": { "width": 20, "height": 15 }
            }
          ],
          "connections": [
            {
              "from": "room-1",
              "to": "room-2",
              "type": "door",
              "distance": 10
            }
          ],
          "tacticalElements": {
            "cover": [
              {
                "id": "pillar-1",
                "type": "pillar",
                "position": { "x": 25, "y": 15 }
              }
            ]
          },
          "distances": [
            {
              "from": "entrance",
              "to": "room-1",
              "distance": 15
            }
          ]
        }
      }
    }
  ],
  "entities": [
    {
      "id": "id-entidad",
      "name": "Nombre de la Entidad",
      "type": "monster" | "npc" | "object",
      "description": "Descripción detallada...",
      "dmNotes": "Notas para el DM...",
      "hp": 50,  // Opcional
      "ac": 15   // Opcional
    }
  ]
}
```

## 📝 Pasos de Implementación

### Paso 1: Configuración del Proyecto
- [ ] Crear nuevo repositorio/carpeta para la aplicación auxiliar
- [ ] Configurar estructura de proyecto (Node.js/TypeScript recomendado)
- [ ] Instalar dependencias base (PDF parser, IA SDK, etc.)
- [ ] Configurar sistema de logging
- [ ] Crear archivo README con instrucciones de uso

### Paso 2: Extracción de Texto del PDF
- [ ] Investigar y elegir librería de PDF (pdf-parse, pdf.js, pdf-lib)
- [ ] Implementar función de lectura de PDF
- [ ] Extraer texto preservando estructura básica
- [ ] Manejar PDFs escaneados (requiere OCR - Tesseract.js o similar)
- [ ] Extraer metadatos del PDF (título, autor, etc.)
- [ ] Manejar errores de lectura (PDF corrupto, protegido, etc.)

### Paso 3: Extracción de Imágenes y Mapas del PDF
- [ ] Implementar extracción de todas las imágenes del PDF
- [ ] Guardar imágenes en carpeta temporal para análisis
- [ ] Extraer metadatos de imágenes (tamaño, posición en página, formato)
- [ ] Identificar imágenes que podrían ser mapas:
  - Análisis de tamaño (mapas suelen ser más grandes)
  - Análisis de posición (mapas suelen estar en páginas específicas)
  - Análisis de contexto (texto alrededor de la imagen)
- [ ] Usar IA de visión (Gemini Vision, GPT-4 Vision) para clasificar imágenes:
  - Detectar si una imagen es un mapa
  - Identificar tipo de mapa (ubicación, área, combate)
  - Extraer características visuales (escalas, leyendas, etiquetas)
- [ ] Manejar mapas que ocupan múltiples páginas (unir imágenes)
- [ ] Guardar imágenes solo si se implementa visualización (opcional)

### Paso 4: Extracción de Información Espacial de Mapas
- [ ] Usar IA de visión para analizar cada mapa identificado:
  - Detectar y leer escalas del mapa (pies por cuadrícula, etc.)
  - Identificar habitaciones/áreas y sus dimensiones
  - Detectar puertas, pasillos y conexiones entre áreas
  - Identificar elementos tácticos (paredes, pilares, obstáculos, terreno difícil)
  - Medir distancias aproximadas entre puntos clave
- [ ] Extraer leyendas del mapa (símbolos y significados)
- [ ] Analizar texto de la aventura para complementar información espacial:
  - Buscar descripciones de distancias mencionadas en el texto
  - Identificar referencias a medidas específicas
  - Asociar descripciones textuales con elementos del mapa
- [ ] Crear estructura de datos espaciales (`spatialData`) para cada mapa
- [ ] Validar coherencia de medidas y escalas

### Paso 5: Asociación de Mapas con Ubicaciones
- [ ] Analizar contexto textual alrededor de cada mapa extraído
- [ ] Usar IA para asociar mapas con ubicaciones específicas:
  - Comparar nombres/títulos en el mapa con nombres de ubicaciones
  - Analizar descripciones de ubicaciones que mencionen mapas
  - Detectar referencias cruzadas (ej: "ver mapa en página X")
- [ ] Crear sistema de matching entre mapas y ubicaciones
- [ ] Manejar mapas de área general (no asociados a ubicación específica)
- [ ] Vincular información espacial extraída con la ubicación correspondiente

### Paso 6: Análisis de Estructura del PDF
- [ ] Identificar secciones principales (títulos, párrafos, listas)
- [ ] Detectar patrones comunes en aventuras de D&D:
  - Ubicaciones (capítulos, secciones de "Location")
  - Entidades (monstruos, NPCs, objetos)
  - Descripciones de lugares
  - Notas del DM
- [ ] Crear sistema de parsing básico para estructura común
- [ ] Manejar diferentes formatos de aventuras (WotC, homebrew, etc.)

### Paso 7: Integración con IA para Extracción
- [ ] Configurar acceso a API de IA (Gemini, OpenAI, etc.)
- [ ] Crear prompts especializados para extraer:
  - Título y resumen de la aventura
  - Lista de ubicaciones con sus descripciones
  - Lista de entidades (monstruos, NPCs) con sus características
  - Relaciones entre ubicaciones (exits)
  - Notas del DM relevantes
- [ ] Implementar procesamiento por chunks si el PDF es muy grande
- [ ] Manejar límites de tokens de la API de IA
- [ ] Implementar sistema de reintentos para errores de API

### Paso 8: Generación de IDs y Normalización
- [ ] Crear función para generar IDs únicos a partir de nombres
- [ ] Normalizar nombres (eliminar acentos, espacios, caracteres especiales)
- [ ] Detectar y manejar duplicados
- [ ] Generar `adventureId` único
- [ ] Crear `table_of_contents` automáticamente

### Paso 9: Generación de JSON Estructurado
- [ ] Crear función que construya el objeto JSON según el esquema
- [ ] Mapear información extraída a la estructura requerida
- [ ] Generar `locations` con todos los campos necesarios
- [ ] Generar `entities` con todos los campos necesarios
- [ ] Crear `exits` entre ubicaciones cuando sea posible detectarlos
- [ ] Añadir `dmNotes` cuando se detecten notas relevantes
- [ ] Incluir `mapData.spatialData` en ubicaciones con mapas asociados:
  - Dimensiones y escalas
  - Áreas/habitaciones identificadas
  - Conexiones entre áreas
  - Elementos tácticos (cobertura, terreno, obstáculos)
  - Distancias entre puntos clave
- [ ] Incluir `mapData.imagePath` solo si se guardan imágenes (opcional)
- [ ] Validar que toda la información espacial es coherente

### Paso 10: Validación del JSON Generado
- [ ] Implementar validación con Zod usando el esquema del juego
- [ ] Verificar que todas las ubicaciones tengan IDs válidos
- [ ] Verificar que todas las entidades referenciadas existan
- [ ] Validar que `entitiesPresent` solo contenga IDs válidos
- [ ] Validar que `exits` apunten a ubicaciones existentes
- [ ] Generar reporte de validación con errores específicos
- [ ] Validar información espacial:
  - Verificar que dimensiones son coherentes con escalas
  - Verificar que conexiones entre áreas tienen IDs válidos
  - Verificar que distancias son razonables
  - Validar formato de coordenadas y posiciones
- [ ] Validar rutas de imágenes solo si se guardan (opcional)

### Paso 11: Interfaz de Usuario (CLI)
- [ ] Crear comando principal (ej: `pdf-to-json convert <archivo.pdf>`)
- [ ] Añadir opciones de configuración:
  - `--output`: Ruta de salida del JSON
  - `--api-key`: API key para IA (o usar variable de entorno)
  - `--model`: Modelo de IA a usar
  - `--verbose`: Modo verbose para debugging
- [ ] Mostrar progreso durante el procesamiento
- [ ] Mostrar resumen de lo extraído (número de ubicaciones, entidades, etc.)
- [ ] Mostrar errores de validación de forma clara

- [ ] Añadir opción `--extract-spatial-data` para extraer información espacial de mapas
- [ ] Añadir opción `--save-map-images` para guardar imágenes (opcional, solo si se implementa visualización)
- [ ] Añadir opción `--maps-dir` para especificar carpeta de mapas (si se guardan)
- [ ] Mostrar resumen de información espacial extraída:
  - Número de mapas analizados
  - Número de áreas/habitaciones identificadas
  - Número de conexiones detectadas
  - Elementos tácticos encontrados

### Paso 12: Manejo de Errores y Casos Especiales
- [ ] Manejar PDFs con imágenes sin texto (requiere OCR)
- [ ] Manejar PDFs protegidos con contraseña
- [ ] Manejar PDFs muy grandes (procesamiento por chunks)
- [ ] Manejar aventuras con formato no estándar
- [ ] Manejar errores de API de IA (rate limits, timeouts)
- [ ] Proporcionar mensajes de error útiles y sugerencias

- [ ] Manejar mapas corruptos o no extraíbles
- [ ] Manejar mapas sin asociación clara a ubicación
- [ ] Manejar mapas sin escala clara (usar estimaciones)
- [ ] Manejar mapas con información espacial incompleta (extraer lo que sea posible)
- [ ] Manejar mapas muy grandes (procesamiento por secciones)

### Paso 13: Post-procesamiento y Mejoras
- [ ] Implementar modo interactivo para corregir/mejorar extracción
- [ ] Permitir edición manual del JSON antes de guardar
- [ ] Añadir opción de preview del JSON generado
- [ ] Implementar modo "dry-run" que no guarda el archivo
- [ ] Añadir opción para validar JSON existente sin convertir

- [ ] Añadir herramienta para editar información espacial manualmente (corregir dimensiones, distancias)
- [ ] Añadir opción para optimizar imágenes de mapas si se guardan (compresión, redimensionado)
- [ ] Añadir opción para convertir mapas a formatos web-friendly (WebP) si se guardan

### Paso 14: Optimización y Refinamiento
- [ ] Optimizar prompts de IA para mejor extracción
- [ ] Añadir caché de resultados para evitar reprocesar mismo PDF
- [ ] Implementar procesamiento paralelo si hay múltiples PDFs
- [ ] Optimizar uso de tokens de IA (resumir texto largo)
- [ ] Añadir métricas de calidad de extracción

- [ ] Optimizar prompts de IA para mejor extracción de información espacial
- [ ] Mejorar precisión de detección de dimensiones y escalas
- [ ] Mejorar precisión de identificación de áreas y conexiones
- [ ] Mejorar precisión de detección de elementos tácticos
- [ ] Optimizar tamaño de archivos de mapas si se guardan (sin perder calidad)

### Paso 15: Documentación
- [ ] Documentar instalación y requisitos
- [ ] Crear guía de uso con ejemplos
- [ ] Documentar formato de PDF soportado
- [ ] Crear ejemplos de PDFs de prueba
- [ ] Documentar limitaciones conocidas
- [ ] Crear guía de troubleshooting

- [ ] Documentar formato de información espacial (`spatialData`)
- [ ] Crear guía de cómo el DM usa la información espacial para narraciones y combates
- [ ] Documentar estructura de datos espaciales (áreas, conexiones, elementos tácticos)
- [ ] Crear ejemplos de mapas con diferentes tipos de información espacial extraída
- [ ] Documentar cómo se integra la información espacial con el sistema de combate táctico

### Paso 16: Testing
- [ ] Crear tests unitarios para funciones de extracción
- [ ] Crear tests de integración con PDFs de ejemplo
- [ ] Probar con diferentes formatos de aventuras
- [ ] Validar calidad de extracción con aventuras conocidas
- [ ] Probar casos edge (PDFs corruptos, muy grandes, etc.)

## 🔧 Consideraciones Técnicas

### Tecnologías Sugeridas

**Para Extracción de PDF:**
- `pdf-parse` (Node.js) - Simple y efectivo para PDFs con texto
- `pdf.js` (Mozilla) - Más potente, puede manejar PDFs complejos
- `pdf-lib` - Para manipulación avanzada de PDFs

**Para OCR (si es necesario):**
- `tesseract.js` - OCR en JavaScript
- `pdf2pic` + `tesseract.js` - Convertir PDF a imagen y luego OCR

**Para IA:**
- Google Gemini API (ya usado en el proyecto principal)
- OpenAI GPT-4 (alternativa)
- Claude API (alternativa)

**Para Validación:**
- `zod` (ya usado en el proyecto principal)
- Esquema compartido con el juego principal

### Estructura del Proyecto Propuesta

```
pdf-to-json-converter/
├── src/
│   ├── extractors/
│   │   ├── pdf-extractor.ts      # Extracción de texto del PDF
│   │   └── ocr-extractor.ts      # OCR para PDFs escaneados
│   ├── processors/
│   │   ├── ai-processor.ts        # Procesamiento con IA
│   │   └── structure-analyzer.ts # Análisis de estructura
│   ├── generators/
│   │   ├── json-generator.ts      # Generación de JSON
│   │   └── id-generator.ts       # Generación de IDs únicos
│   ├── validators/
│   │   └── json-validator.ts     # Validación del JSON
│   ├── cli/
│   │   └── index.ts              # Interfaz CLI
│   └── utils/
│       ├── logger.ts
│       └── config.ts
├── tests/
│   ├── fixtures/                 # PDFs de prueba
│   └── *.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Flujo de Procesamiento

```
1. Leer PDF
   ↓
2. Extraer texto (y OCR si es necesario)
   ↓
3. Extraer imágenes y mapas del PDF
   ↓
4. Extraer información espacial de mapas usando IA de visión
   ↓
5. Analizar estructura básica
   ↓
6. Procesar con IA para extraer información estructurada
   ↓
7. Asociar mapas con ubicaciones usando IA
   ↓
8. Generar IDs únicos
   ↓
9. Construir objeto JSON (incluyendo spatialData para mapas)
   ↓
10. Validar JSON generado (incluyendo validación de información espacial)
   ↓
11. Guardar archivo JSON (y mapas solo si se implementa visualización)
   ↓
12. Mostrar resumen y resultados
```

## 📊 Métricas de Éxito

- [ ] Extracción correcta del 80%+ de ubicaciones de una aventura estándar
- [ ] Extracción correcta del 70%+ de entidades (monstruos/NPCs)
- [ ] Detección correcta del 60%+ de mapas en el PDF
- [ ] Asociación correcta del 70%+ de mapas con sus ubicaciones
- [ ] Extracción correcta de dimensiones y escalas en el 70%+ de mapas
- [ ] Identificación correcta del 60%+ de áreas/habitaciones en mapas
- [ ] Detección correcta del 50%+ de elementos tácticos (cobertura, obstáculos)
- [ ] Generación de JSON válido en el 90%+ de casos
- [ ] Tiempo de procesamiento < 5 minutos para aventura promedio (50-100 páginas)
- [ ] Capacidad de procesar PDFs de hasta 200 páginas

## 🔗 Integración con el Juego Principal

El JSON generado debe ser compatible con:
- `AdventureDataSchema` del juego
- Función `parseAdventureFromJson` en `src/ai/flows/parse-adventure-from-json.ts`
- Botón "Cargar Aventura JSON" en el menú principal

**Validación de Compatibilidad:**
- El JSON debe pasar la validación de `AdventureDataSchema`
- Debe tener al menos una ubicación con `id` válido
- Todas las referencias (`entitiesPresent`, `exits`) deben ser válidas
- La información espacial (`spatialData`) debe ser coherente (dimensiones, escalas, distancias)
- Las conexiones entre áreas deben tener IDs válidos
- Las rutas de mapas (si se guardan) deben apuntar a archivos existentes

## 🎯 Prioridad

**Prioridad:** Media

**Razón:**
- Mejora significativamente la experiencia de añadir nuevas aventuras
- Reduce barrera de entrada para usuarios que quieren usar sus propias aventuras
- No es crítica para el funcionamiento del juego, pero muy útil
- Puede desarrollarse en paralelo al juego principal

## 📅 Estado

**Estado:** Sin comenzar

**Última actualización:** 2025-01-12

---

## 💡 Mejoras Futuras (Post-Implementación)

### Mejoras Generales
- **Interfaz Web:** Crear versión web con drag & drop y preview
- **Editor Visual:** Permitir editar el JSON generado con interfaz gráfica
- **Soporte para Múltiples Formatos:** Añadir soporte para Word, Markdown, etc.
- **Templates:** Crear templates para diferentes tipos de aventuras
- **Batch Processing:** Procesar múltiples PDFs a la vez
- **Mejora Continua:** Aprender de correcciones manuales para mejorar extracción
- **Integración Directa:** Opción de cargar PDF directamente en el juego (sin JSON intermedio)
- **Soporte Multiidioma:** Extraer aventuras en diferentes idiomas

### Mejoras Específicas para Mapas
- **Editor Visual de Información Espacial:** Interfaz gráfica para corregir/editar información espacial extraída
- **Detección Mejorada de Escalas:** Mejorar precisión en detección de escalas complejas
- **Extracción de Leyendas:** Detectar y extraer automáticamente leyendas de mapas
- **Análisis de Topología Avanzado:** Detectar automáticamente todas las conexiones y rutas posibles
- **Detección de Elementos Tácticos Avanzada:** Identificar más tipos de cobertura, terreno difícil, desniveles
- **Cálculo Automático de Distancias:** Calcular distancias entre cualquier par de puntos en el mapa
- **Integración con Sistema de Combate Táctico:** Mejorar uso de información espacial en combates
- **Visualización Estática de Mapas:** Mostrar imagen del mapa como referencia visual (no interactiva)
- **Análisis de Línea de Vista:** Detectar qué áreas son visibles desde otras (para combate táctico)

## 🔗 Referencias

### PDF y Extracción
- [pdf-parse npm package](https://www.npmjs.com/package/pdf-parse)
- [pdf.js Documentation](https://mozilla.github.io/pdf.js/)
- [pdf-lib - PDF Manipulation](https://pdf-lib.js.org/)
- [Tesseract.js - OCR](https://tesseract.projectnaptha.com/)

### IA y Visión por Computadora
- [Google Gemini API](https://ai.google.dev/) - Incluye Gemini Vision para análisis de imágenes
- [OpenAI GPT-4 Vision](https://platform.openai.com/docs/guides/vision) - Alternativa para análisis de imágenes
- [Claude Vision API](https://docs.anthropic.com/claude/docs/vision) - Otra alternativa

### Validación y Estructura
- [Zod Documentation](https://zod.dev/)

### Procesamiento de Imágenes
- [Sharp - Image Processing](https://sharp.pixelplumbing.com/) - Para optimización de mapas
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) - Para manipulación de imágenes
- [Jimp - Image Processing](https://github.com/oliver-moran/jimp) - Alternativa ligera

