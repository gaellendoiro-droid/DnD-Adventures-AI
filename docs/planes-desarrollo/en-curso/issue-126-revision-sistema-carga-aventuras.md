# Plan de Implementación: Issue #126 - Revisión Completa del Sistema de Carga de Aventuras JSON e Inicio de Partida

**Issue:** #126  
**Prioridad:** 🔴 CRÍTICO (PMA)  
**Fecha de creación del plan:** 2025-01-23  
**Estado:** 🚧 EN CURSO  
**Referencia:** [Issue #126](../../tracking/issues/pendientes.md#issue-126-revisión-completa-del-sistema-de-carga-de-aventuras-json-e-inicio-de-partida-crítico)  
**Informe detallado:** [Issue #126 - Informe Detallado](../../tracking/issues/issue-126-informe-detallado.md)

---

## 🎯 Objetivo

Revisar, optimizar y mejorar completamente el sistema de carga de aventuras JSON y el flujo de inicio de partida para lograr:
- **Rendimiento mejorado:** Reducción del 50-70% en tiempo de carga
- **Manejo de errores robusto:** Mensajes específicos y diferenciados por tipo de error
- **Validación completa:** Validación temprana y exhaustiva de datos
- **Experiencia de usuario mejorada:** Feedback claro y progreso visible durante la carga
- **Código más mantenible:** Refactorización y separación de responsabilidades

---

## 📋 Análisis del Problema

### Problema Principal

El sistema actual de carga de aventuras JSON funciona, pero tiene múltiples áreas de mejora que afectan la experiencia del usuario y la robustez del sistema:

1. **Rendimiento:** Parseo con IA innecesario (2-5 segundos) solo para extraer título/resumen
2. **Manejo de errores:** Mensajes genéricos que no ayudan al usuario a entender qué salió mal
3. **Validación:** Validación tardía e incompleta de la estructura de datos
4. **Experiencia de usuario:** Feedback limitado sin indicadores de progreso
5. **Código:** Función muy larga con múltiples responsabilidades

### Problemas Específicos Identificados

#### 1. Rendimiento

**Problemas:**
- **Parseo con IA innecesario:** Cada carga requiere una llamada a la IA solo para extraer título/resumen del JSON
- **Sin caché de parseo:** Archivos grandes se parsean completamente en cada carga
- **Delay artificial:** Delay de 100ms como workaround para problemas de hot reload
- **Lectura repetida de archivos:** El endpoint API lee del sistema de archivos sin caché

**Impacto:**
- Tiempo de carga: 3-8 segundos (estimado)
- Uso innecesario de recursos de IA
- Experiencia de usuario degradada

#### 2. Manejo de Errores

**Problemas:**
- **Mensajes genéricos:** Todos los errores muestran el mismo mensaje genérico
- **Sin diferenciación:** No distingue entre errores de parseo JSON, errores de IA, errores de validación, errores de red
- **Sin recuperación:** Si falla un paso, no hay intento de recuperación
- **Logging limitado:** Los errores se registran pero no se proporciona contexto suficiente

**Ejemplo actual:**
```typescript
catch (error: any) {
  toast({
    variant: 'destructive',
    title: "Error al cargar la aventura",
    description: "No se pudo procesar el archivo. Asegúrate de que sea un JSON válido.",
  });
}
```

**Problema:** No diferencia entre JSON inválido, error de IA, error de validación, error de red.

#### 3. Validación de Datos

**Problemas:**
- **Validación tardía:** La validación de estructura ocurre después del parseo con IA
- **Validación incompleta:** Solo valida que existan ubicaciones, no valida estructura completa
- **Sin validación de tipos:** No valida tipos de datos dentro de las ubicaciones/entidades
- **Sin validación de referencias:** No valida que los IDs referenciados existan

**Ejemplo actual:**
```typescript
AdventureDataSchema.parse(parsedAdventure.adventureData);
```
Solo valida:
- `locations` es un array
- `locations` tiene al menos 1 elemento
- Cada location tiene un `id`

**No valida:**
- Tipos de datos dentro de locations
- Referencias entre entidades
- Integridad de datos (IDs únicos, etc.)

#### 4. Flujo de Inicialización

**Problemas:**
- **Dependencia de orden:** El cache debe actualizarse antes de `processPlayerAction`, pero no hay garantía
- **Sin verificación:** No verifica que el cache se actualizó correctamente
- **Inicialización compleja:** Múltiples pasos que pueden fallar
- **Sin rollback:** Si falla un paso, no hay limpieza de estado parcial

#### 5. Feedback al Usuario

**Problemas:**
- **Feedback limitado:** Solo muestra toasts genéricos
- **Sin progreso:** No muestra progreso durante la carga
- **Sin detalles:** No muestra qué está haciendo el sistema en cada momento
- **Sin estimación de tiempo:** No indica cuánto tiempo tomará

---

## 🔧 Recursos Disponibles en el Proyecto

Antes de implementar nuevas soluciones, es importante aprovechar los módulos, funciones y patrones existentes en el proyecto que pueden ser reutilizados o adaptados.

### 1. Sistema de Caché Existente

**Ubicación:** `src/lib/dnd-api-client.ts` (líneas 133-352)

**Recursos disponibles:**
- ✅ Sistema de caché global con `Map<string, any>`
- ✅ Caché de requests pendientes para evitar duplicados simultáneos
- ✅ Función `getCacheKey()` para generar claves de caché
- ✅ Patrón de caché compartido entre módulos

**Aprovechable para:**
- Implementar caché de parseo de aventuras (similar patrón)
- Caché de archivos JSON leídos del sistema de archivos
- Evitar parseos duplicados del mismo archivo

**Patrón a replicar:**
```typescript
// Similar a dnd-api-client.ts
const adventureCache: Map<string, ParsedAdventure> = new Map();
const pendingParses: Map<string, Promise<ParsedAdventure>> = new Map();

function getAdventureCacheKey(hash: string): string {
  return `adventure:${hash}`;
}
```

---

### 2. Sistema de Retries con Exponential Backoff

**Ubicación:** `src/ai/flows/retry-utils.ts`

**Recursos disponibles:**
- ✅ `retryWithExponentialBackoff()` - Función robusta de reintentos
- ✅ `executePromptWithRetry()` - Helper para prompts de Genkit
- ✅ Clasificación automática de errores retryables vs no retryables
- ✅ Manejo de errores de red, timeouts, 503, 429, etc.

**Aprovechable para:**
- Reemplazar delay artificial de 100ms con verificación robusta
- Manejo de errores de conexión durante carga de aventuras
- Retries para operaciones de inicialización que pueden fallar

**Ejemplo de uso:**
```typescript
// En lugar de delay artificial
await new Promise(resolve => setTimeout(resolve, 100));

// Usar retry con verificación
await retryWithExponentialBackoff(
  async () => {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error('Server not ready');
  },
  3,
  100,
  'ensureServerReady'
);
```

---

### 3. Sistema de Logging Estructurado

**Ubicación:** `src/lib/logger.ts` (backend) y `src/lib/logger-client.ts` (frontend)

**Recursos disponibles:**
- ✅ Logger estructurado con niveles (DEBUG, INFO, WARN, ERROR)
- ✅ Contexto enriquecido (module, action, etc.)
- ✅ Métodos específicos: `gameCoordinator`, `serverAction`, `aiTool`
- ✅ Formateo consistente con timestamps

**Aprovechable para:**
- Logging detallado durante carga de aventuras
- Tracking de progreso de cada paso
- Debugging de errores de validación
- Métricas de rendimiento (tiempo de parseo, etc.)

**Ejemplo de uso:**
```typescript
log.info('Starting adventure validation', {
  module: 'AdventureLoader',
  fileName: file.name,
  fileSize: file.size,
});
```

---

### 4. Sistema de Validación con Zod

**Ubicación:** `src/lib/schemas.ts`

**Recursos disponibles:**
- ✅ Sistema completo de esquemas Zod para validación
- ✅ `CharacterSchema` - Ejemplo completo de validación compleja
- ✅ `AdventureDataSchema` básico ya existe en `src/app/page.tsx` (líneas 55-59)
- ✅ Patrón establecido: Esquemas como fuente única de verdad

**Aprovechable para:**
- Extender `AdventureDataSchema` existente con validación completa
- Validación de tipos de datos dentro de ubicaciones/entidades
- Validación de referencias entre entidades
- Mover esquema a `src/lib/schemas.ts` para reutilización

**Patrón a seguir:**
```typescript
// Extender esquema existente en lugar de crear uno nuevo
export const AdventureDataSchema = z.object({
  adventureId: z.string(),
  title: z.string().optional(),
  summary: z.string().optional(),
  locations: z.array(LocationSchema).min(1),
  entities: z.array(EntitySchema).optional(),
});
```

---

### 5. Manejo de Errores con Zod

**Ubicación:** `src/components/game/game-view.tsx` (líneas 339-370)

**Recursos disponibles:**
- ✅ Manejo específico de `ZodError`
- ✅ Extracción de mensajes de error de validación
- ✅ Formateo de errores para mostrar al usuario

**Aprovechable para:**
- Manejo de errores de validación de aventuras
- Extracción de mensajes específicos de errores Zod
- Formateo de errores para mostrar al usuario

**Patrón a replicar:**
```typescript
try {
  AdventureDataSchema.parse(adventureData);
} catch (validationError: any) {
  if (validationError instanceof ZodError) {
    const errorMessages = validationError.errors.map(err => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    }).join('; ');
    // Mostrar mensaje específico al usuario
  }
}
```

---

### 6. Sistema de Cache del Servidor

**Ubicación:** `src/app/game-state-actions.ts`

**Recursos disponibles:**
- ✅ Cache en memoria para datos de aventura
- ✅ Función `setAdventureDataCache()` para establecer cache
- ✅ Función `getAdventureData()` para obtener del cache o archivo
- ✅ Logging de operaciones de cache

**Aprovechable para:**
- Mejorar el sistema de cache existente
- Añadir invalidación automática
- Cachear también archivos leídos del sistema de archivos
- Verificación de cache antes de usar

**Mejoras sugeridas:**
- Añadir timestamp para invalidación
- Cachear archivos leídos del sistema de archivos
- Métodos de limpieza de cache

---

### 7. Estructura de JSON de Aventuras

**Ubicación:** `JSON_adventures/el-dragon-del-pico-agujahelada.json`

**Estructura identificada:**
- `adventureId`: string
- `title`: string (disponible directamente, no requiere IA)
- `summary`: string (disponible directamente, no requiere IA)
- `locations`: array con `id`, `name`, `description`, `connections`, etc.
- `entities`: array con `id`, `name`, etc.

**Aprovechable para:**
- Extracción directa de título/resumen (sin IA)
- Crear esquema de validación completo
- Validación de referencias entre locations y entities

---

### 8. Patrón de Clasificación de Errores

**Ubicación:** `src/ai/flows/retry-utils.ts` (función `isRetryableError`)

**Recursos disponibles:**
- ✅ Lógica de clasificación de errores retryables
- ✅ Detección de tipos específicos de errores (timeout, 503, 429, etc.)
- ✅ Manejo de errores anidados (error.cause)

**Aprovechable para:**
- Crear sistema de clasificación de errores de carga de aventuras
- Diferenciar entre errores retryables y no retryables
- Mensajes específicos según tipo de error

---

## 🏗️ Arquitectura Propuesta

### Principio de Diseño

**Separación de responsabilidades y validación temprana con feedback progresivo al usuario.**

### Arquitectura del Flujo Mejorado

```
┌─────────────────────────────────────────────────────────────┐
│              handleLoadAdventure (ORQUESTADOR)               │
│  - Coordina el flujo completo                                │
│  - Maneja feedback al usuario                               │
│  - Gestiona errores con mensajes específicos               │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│ validateJsonFile │         │ parseAdventure   │
│                  │         │                  │
│ - Validación     │         │ - Parseo rápido  │
│   temprana       │         │   sin IA         │
│ - Estructura     │         │ - Extracción     │
│   completa       │         │   directa de     │
│ - Tipos          │         │   título/resumen │
│ - Referencias    │         │ - Caché de       │
│                  │         │   parseo         │
└──────────────────┘         └──────────────────┘
        │                             │
        └──────────────┬──────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ initializeGame       │
            │                      │
            │ - Actualiza cache    │
            │ - Verifica cache     │
            │ - Inicializa partida │
            │ - Rollback si falla  │
            └──────────────────────┘
```

### Componentes Nuevos

1. **`validateJsonFile()`** - Validación temprana y completa
2. **`parseAdventure()`** - Parseo rápido sin IA (extracción directa)
3. **`initializeGame()`** - Inicialización robusta con verificación
4. **`AdventureCache`** - Sistema de caché mejorado
5. **`ErrorHandler`** - Manejo de errores específico por tipo

---

## 📝 Plan de Implementación

### Fase 1: Mejorar Manejo de Errores y Validación Temprana

**Objetivo:** Implementar manejo de errores específico y validación temprana antes del parseo con IA.

**Tareas:**

#### 1.1 Crear Sistema de Clasificación de Errores

**Archivo nuevo:** `src/lib/adventure-loader/error-handler.ts`

**Recursos a aprovechar:**
- ✅ Patrón de clasificación de errores de `src/ai/flows/retry-utils.ts` (función `isRetryableError`)
- ✅ Sistema de logging de `src/lib/logger.ts` para debugging detallado
- ✅ Manejo de errores Zod de `src/components/game/game-view.tsx` para errores de validación

**Funciones a implementar:**
```typescript
export enum AdventureLoadErrorType {
  INVALID_JSON = 'INVALID_JSON',
  INVALID_STRUCTURE = 'INVALID_STRUCTURE',
  AI_ERROR = 'AI_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INIT_ERROR = 'INIT_ERROR',
  UNKNOWN = 'UNKNOWN'
}

export interface AdventureLoadError {
  type: AdventureLoadErrorType;
  message: string;
  userMessage: string;
  details?: any;
  recoverable: boolean;
}

export function classifyError(error: any): AdventureLoadError {
  // Clasificar error según tipo
  // Usar patrón similar a isRetryableError de retry-utils.ts
  // Detectar: JSON parse errors, Zod validation errors, network errors, etc.
}

export function getUserFriendlyMessage(error: AdventureLoadError): string {
  // Mensaje específico para el usuario
  // Similar al patrón de game-view.tsx para errores Zod
}
```

**Integración con recursos existentes:**
- Usar `log.error()` de `src/lib/logger.ts` para logging detallado
- Usar `logClient.uiError()` de `src/lib/logger-client.ts` para errores en frontend
- Reutilizar lógica de detección de errores de red de `retry-utils.ts`

**Criterios de éxito:**
- ✅ Errores clasificados correctamente
- ✅ Mensajes específicos para cada tipo de error
- ✅ Mensajes amigables para el usuario
- ✅ Información de debugging en logs (usando logger existente)

**Estimación:** 2-3 horas

---

#### 1.2 Crear Validación Temprana y Completa

**Archivo nuevo:** `src/lib/adventure-loader/validator.ts`

**Recursos a aprovechar:**
- ✅ Extender `AdventureDataSchema` existente en `src/app/page.tsx` (líneas 55-59)
- ✅ Mover y extender esquema a `src/lib/schemas.ts` para reutilización
- ✅ Usar patrón de validación de `CharacterSchema` como referencia
- ✅ Manejo de errores Zod de `src/components/game/game-view.tsx`

**Funciones a implementar:**
```typescript
// Primero: Mover y extender AdventureDataSchema a src/lib/schemas.ts
export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  connections: z.array(z.string()).optional(),
  // ... más campos según estructura real
});

export const EntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  // ... más campos según estructura real
});

export const AdventureDataSchema = z.object({
  adventureId: z.string(),
  title: z.string().optional(),
  summary: z.string().optional(),
  locations: z.array(LocationSchema).min(1, "La aventura debe tener al menos una ubicación"),
  entities: z.array(EntitySchema).optional(),
});

// Luego: Validación adicional de referencias
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export function validateAdventureStructure(data: any): ValidationResult {
  // 1. Validar con Zod schema
  try {
    AdventureDataSchema.parse(data);
  } catch (zodError) {
    // Convertir ZodError a ValidationError[]
    // Usar patrón de game-view.tsx
  }
  
  // 2. Validar referencias (IDs únicos, referencias válidas)
  // 3. Validar integridad de datos
}
```

**Validaciones a implementar:**
1. **Estructura básica (con Zod):**
   - `adventureId` existe y es string
   - `locations` es array con al menos 1 elemento
   - `entities` es array (opcional)
   - Tipos de datos correctos

2. **Ubicaciones (con Zod):**
   - Cada location tiene `id` único
   - Cada location tiene `name` y `description`
   - Tipos de datos correctos

3. **Referencias (validación manual):**
   - `connections` referencia IDs válidos
   - IDs únicos en locations y entities
   - Referencias entre entidades válidas

**Criterios de éxito:**
- ✅ Esquema Zod extendido y movido a `src/lib/schemas.ts`
- ✅ Validación completa de estructura con Zod
- ✅ Validación de referencias e integridad
- ✅ Mensajes de error específicos por problema (usando patrón de game-view.tsx)
- ✅ Tests unitarios pasando

**Estimación:** 4-6 horas

---

#### 1.3 Integrar Validación Temprana en `handleLoadAdventure`

**Archivo a modificar:** `src/app/page.tsx`

**Cambios:**
1. Validar JSON antes de parseo con IA
2. Validar estructura antes de parseo con IA
3. Usar sistema de clasificación de errores
4. Mostrar mensajes específicos al usuario

**Código antes:**
```typescript
const parsedAdventure = await parseAdventureFromJson({ adventureJson: jsonContent });
// Validación después del parseo con IA
AdventureDataSchema.parse(parsedAdventure.adventureData);
```

**Código después:**
```typescript
// Validación temprana
const validationResult = validateAdventureStructure(adventureData);
if (!validationResult.valid) {
  throw new AdventureLoadError(
    AdventureLoadErrorType.VALIDATION_ERROR,
    validationResult.errors
  );
}

// Parseo con IA solo si validación pasa
const parsedAdventure = await parseAdventureFromJson({ adventureJson: jsonContent });
```

**Criterios de éxito:**
- ✅ Validación ocurre antes del parseo con IA
- ✅ Errores de validación muestran mensajes específicos
- ✅ Usuario sabe exactamente qué está mal
- ✅ No se desperdician recursos de IA en JSONs inválidos

**Estimación:** 2-3 horas

---

### Fase 2: Optimizar Parseo y Eliminar Dependencia de IA Innecesaria

**Objetivo:** Eliminar la dependencia de IA para parseo básico y optimizar el proceso de carga.

**Tareas:**

#### 2.1 Crear Parseo Rápido sin IA

**Archivo nuevo:** `src/lib/adventure-loader/adventure-parser.ts`

**Recursos a aprovechar:**
- ✅ Estructura de JSON identificada: `title` y `summary` están disponibles directamente
- ✅ Ejemplo real en `JSON_adventures/el-dragon-del-pico-agujahelada.json`

**Funciones a implementar:**
```typescript
export interface ParsedAdventure {
  adventureTitle: string;
  adventureSummary: string;
  adventureData: any;
}

export function parseAdventureFast(jsonContent: string): ParsedAdventure {
  // Parsear JSON
  const adventureData = JSON.parse(jsonContent);
  
  // Extraer título directamente del JSON (basado en estructura real)
  // Estructura real: { "title": "...", "summary": "..." }
  const adventureTitle = adventureData.title || 
                         adventureData.adventureTitle || 
                         adventureData.name || 
                         'Aventura sin título';
  
  // Extraer resumen directamente del JSON
  const adventureSummary = adventureData.summary || 
                          adventureData.adventureSummary || 
                          adventureData.description || 
                          'Sin descripción disponible';
  
  return {
    adventureTitle,
    adventureSummary,
    adventureData
  };
}
```

**Estrategia:**
- Basado en estructura real del JSON: `title` y `summary` están disponibles directamente
- Intentar extraer título/resumen directamente del JSON
- Si no están disponibles, usar valores por defecto
- Solo usar IA como fallback si es absolutamente necesario (opcional)

**Criterios de éxito:**
- ✅ Parseo rápido sin llamadas a IA
- ✅ Extracción directa de título/resumen (basado en estructura real)
- ✅ Fallbacks apropiados si no están disponibles
- ✅ Tiempo de parseo < 100ms (vs 2-5 segundos con IA)

**Estimación:** 2-3 horas (reducido porque la estructura ya está identificada)

---

#### 2.2 Implementar Caché de Parseo

**Archivo nuevo:** `src/lib/adventure-loader/adventure-cache.ts`

**Recursos a aprovechar:**
- ✅ Patrón de caché de `src/lib/dnd-api-client.ts` (líneas 133-352)
- ✅ Sistema de caché con `Map<string, any>` y `pendingRequests`
- ✅ Función `getCacheKey()` como referencia para generar claves

**Funciones a implementar:**
```typescript
interface CacheEntry {
  data: ParsedAdventure;
  hash: string;
  timestamp: number;
}

export class AdventureCache {
  // Usar mismo patrón que dnd-api-client.ts
  private cache: Map<string, CacheEntry> = new Map();
  private pendingParses: Map<string, Promise<ParsedAdventure>> = new Map();
  
  // Generar hash del contenido JSON (usar crypto de Node.js)
  generateHash(jsonContent: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(jsonContent).digest('hex');
  }
  
  // Generar clave de caché (similar a getCacheKey de dnd-api-client.ts)
  private getCacheKey(hash: string): string {
    return `adventure:${hash}`;
  }
  
  // Obtener del caché (verificar si existe y no está expirado)
  get(hash: string): ParsedAdventure | null {
    const key = this.getCacheKey(hash);
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Verificar expiración (1 hora)
    const maxAge = 3600000; // 1 hora
    if (Date.now() - entry.timestamp > maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  // Guardar en caché
  set(hash: string, data: ParsedAdventure): void {
    const key = this.getCacheKey(hash);
    this.cache.set(key, {
      data,
      hash,
      timestamp: Date.now(),
    });
  }
  
  // Limpiar caché expirado (similar a limpieza en dnd-api-client.ts)
  clearExpired(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }
  
  // Verificar si hay parseo pendiente (evitar duplicados simultáneos)
  getPending(hash: string): Promise<ParsedAdventure> | null {
    const key = this.getCacheKey(hash);
    return this.pendingParses.get(key) || null;
  }
  
  // Registrar parseo pendiente
  setPending(hash: string, promise: Promise<ParsedAdventure>): void {
    const key = this.getCacheKey(hash);
    this.pendingParses.set(key, promise);
    promise.finally(() => {
      this.pendingParses.delete(key);
    });
  }
}
```

**Estrategia:**
- Replicar patrón de `dnd-api-client.ts` con `Map` y `pendingParses`
- Usar hash del contenido JSON como clave (similar a `getCacheKey`)
- Cachear parseo completo (título, resumen, datos)
- Invalidar automáticamente después de 1 hora
- Evitar parseos duplicados simultáneos con `pendingParses`

**Criterios de éxito:**
- ✅ Caché funciona correctamente (patrón probado de dnd-api-client.ts)
- ✅ Hash único por contenido
- ✅ Invalidación automática
- ✅ Evita parseos duplicados simultáneos
- ✅ Reducción de tiempo de carga en cargas subsecuentes

**Estimación:** 2-3 horas

---

#### 2.3 Refactorizar `parse-adventure-from-json.ts`

**Archivo a modificar:** `src/ai/flows/parse-adventure-from-json.ts`

**Cambios:**
1. Hacer parseo con IA opcional (solo si título/resumen no están en JSON)
2. Usar parseo rápido por defecto
3. Mantener parseo con IA como fallback mejorado

**Código después:**
```typescript
export async function parseAdventureFromJson(
  input: ParseAdventureFromJsonInput
): Promise<ParseAdventureFromJsonOutput> {
  // Intentar parseo rápido primero
  try {
    const fastParsed = parseAdventureFast(input.adventureJson);
    // Si tiene título y resumen, usar parseo rápido
    if (fastParsed.adventureTitle && fastParsed.adventureSummary) {
      return fastParsed;
    }
  } catch (e) {
    // Si falla, continuar con parseo con IA
  }
  
  // Fallback: parseo con IA (solo si es necesario)
  return parseAdventureFromJsonFlow(input);
}
```

**Criterios de éxito:**
- ✅ Parseo rápido usado por defecto
- ✅ Parseo con IA solo como fallback
- ✅ Compatibilidad hacia atrás mantenida
- ✅ Reducción significativa de tiempo de carga

**Estimación:** 2-3 horas

---

#### 2.4 Eliminar Delay Artificial

**Archivos a modificar/crear:**
- `src/app/page.tsx` - Eliminar delay y añadir verificación robusta
- `src/app/api/health/route.ts` - **NUEVO** - Endpoint de health check

**Recursos a aprovechar:**
- ✅ `retryWithExponentialBackoff()` de `src/ai/flows/retry-utils.ts`
- ✅ Clasificación de errores retryables existente
- ✅ Patrón de endpoints API existente en `src/app/api/load-adventure/route.ts`

**Cambios:**
1. **Crear endpoint de health check** (`src/app/api/health/route.ts`)
2. Eliminar delay de 100ms en `src/app/page.tsx`
3. Usar `retryWithExponentialBackoff()` para verificación robusta del servidor
4. Manejar errores de conexión con retries apropiados

**2.4.1 Crear Endpoint de Health Check**

**Archivo nuevo:** `src/app/api/health/route.ts`

**Implementación:**
```typescript
import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';

export async function GET() {
  try {
    // Endpoint simple que confirma que el servidor está listo
    log.debug('Health check requested', { module: 'API', endpoint: '/api/health' });
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    log.error('Health check failed', { module: 'API', endpoint: '/api/health' }, error);
    return NextResponse.json(
      { status: 'error', message: 'Server not ready' },
      { status: 503 }
    );
  }
}
```

**Propósito:**
- Endpoint ligero para verificar que el servidor Next.js está listo
- Retorna 200 OK cuando el servidor está disponible
- Permite reemplazar el delay artificial con verificación real

**2.4.2 Eliminar Delay y Añadir Verificación Robusta**

**Archivo a modificar:** `src/app/page.tsx`

**Código antes:**
```typescript
// Add a small delay to ensure server is ready after hot reload
await new Promise(resolve => setTimeout(resolve, 100));
```

**Código después:**
```typescript
// Verificar disponibilidad del servidor con retry (usar retry-utils.ts)
import { retryWithExponentialBackoff } from '@/ai/flows/retry-utils';

await ensureServerReady();
```

**Función nueva (usando retry-utils.ts):**
```typescript
async function ensureServerReady(): Promise<void> {
  await retryWithExponentialBackoff(
    async () => {
      // Verificar que el endpoint de health check responde
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error('Server not ready');
      }
      const data = await response.json();
      if (data.status !== 'ok') {
        throw new Error('Server not ready');
      }
    },
    3, // maxRetries
    100, // initialDelayMs
    'ensureServerReady'
  );
}
```

**Criterios de éxito:**
- ✅ Endpoint `/api/health` creado y funcionando
- ✅ Delay artificial eliminado
- ✅ Verificación robusta usando `retryWithExponentialBackoff()` existente
- ✅ Manejo de errores apropiado (reutiliza lógica de retry-utils.ts)
- ✅ No hay delays innecesarios
- ✅ Verificación real del estado del servidor en lugar de espera ciega

**Estimación:** 1-2 horas (incluye creación del endpoint y refactorización)

---

### Fase 3: Mejorar Flujo de Inicialización

**Objetivo:** Hacer el flujo de inicialización más robusto con verificación y rollback.

**Tareas:**

#### 3.1 Crear Función de Inicialización Robusta

**Archivo nuevo:** `src/lib/adventure-loader/game-initializer.ts`

**Funciones a implementar:**
```typescript
export interface InitializationResult {
  success: boolean;
  initialGameData?: InitialGameData;
  error?: AdventureLoadError;
}

export async function initializeGame(
  adventureData: any,
  firstLocation: any
): Promise<InitializationResult> {
  // 1. Actualizar cache del servidor
  // 2. Verificar que el cache se actualizó correctamente
  // 3. Inicializar partida
  // 4. Si falla, hacer rollback
}
```

**Flujo:**
1. Actualizar cache del servidor
2. Verificar cache (leer de vuelta y comparar)
3. Si verificación falla, retry o error
4. Inicializar partida con `processPlayerAction`
5. Si falla, limpiar cache y retornar error

**Criterios de éxito:**
- ✅ Verificación de cache implementada
- ✅ Rollback en caso de fallo
- ✅ Manejo de errores robusto
- ✅ Tests unitarios pasando

**Estimación:** 3-4 horas

---

#### 3.2 Refactorizar `handleLoadAdventure`

**Archivo a modificar:** `src/app/page.tsx`

**Cambios:**
1. Dividir función en pasos más pequeños
2. Usar función de inicialización robusta
3. Mejorar manejo de errores con clasificación

**Estructura propuesta:**
```typescript
const handleLoadAdventure = async (file: File) => {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      // Paso 1: Leer archivo
      const jsonContent = await readFile(file);
      
      // Paso 2: Validar JSON
      const adventureData = await validateAndParseJson(jsonContent);
      
      // Paso 3: Validar estructura
      await validateAdventureStructure(adventureData);
      
      // Paso 4: Parsear aventura (rápido)
      const parsedAdventure = await parseAdventureWithCache(jsonContent);
      
      // Paso 5: Inicializar juego
      const result = await initializeGame(parsedAdventure.adventureData);
      
      if (!result.success) {
        throw result.error;
      }
      
      // Paso 6: Configurar estado
      setInitialGameData(result.initialGameData);
      setGameInProgress(true);
      setGameStarted(true);
      
    } catch (error) {
      const classifiedError = classifyError(error);
      showErrorToUser(classifiedError);
    }
  };
  reader.readAsText(file);
};
```

**Criterios de éxito:**
- ✅ Función dividida en pasos claros
- ✅ Manejo de errores mejorado
- ✅ Código más mantenible
- ✅ Funcionalidad idéntica o mejor

**Estimación:** 3-4 horas

---

### Fase 4: Mejorar Feedback al Usuario

**Objetivo:** Proporcionar feedback claro y progreso visible durante la carga.

**Tareas:**

#### 4.1 Crear Sistema de Feedback Progresivo

**Archivo nuevo:** `src/lib/adventure-loader/loading-feedback.ts`

**Funciones a implementar:**
```typescript
export interface LoadingStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
}

export class LoadingFeedback {
  private steps: LoadingStep[] = [];
  private currentStep: number = 0;
  private onUpdate?: (steps: LoadingStep[]) => void;
  
  constructor(steps: LoadingStep[], onUpdate?: (steps: LoadingStep[]) => void) {
    this.steps = steps;
    this.onUpdate = onUpdate;
  }
  
  startStep(stepId: string): void {
    // Marcar paso como en progreso
  }
  
  completeStep(stepId: string): void {
    // Marcar paso como completado
  }
  
  errorStep(stepId: string, error: string): void {
    // Marcar paso como error
  }
}
```

**Pasos a mostrar:**
1. "Leyendo archivo..."
2. "Validando estructura..."
3. "Parseando aventura..."
4. "Inicializando partida..."
5. "¡Listo!"

**Criterios de éxito:**
- ✅ Feedback progresivo implementado
- ✅ Usuario ve qué está pasando
- ✅ Indicadores visuales claros
- ✅ Mensajes informativos

**Estimación:** 3-4 horas

---

#### 4.2 Integrar Feedback en UI

**Archivo a modificar:** `src/app/page.tsx` y `src/components/game/main-menu.tsx`

**Cambios:**
1. Mostrar indicador de progreso durante carga
2. Actualizar progreso en cada paso
3. Mostrar mensajes específicos por paso

**UI propuesta:**
- Barra de progreso o lista de pasos
- Mensajes específicos por paso
- Indicador de tiempo estimado (opcional)

**Criterios de éxito:**
- ✅ UI muestra progreso
- ✅ Mensajes claros y específicos
- ✅ Experiencia de usuario mejorada
- ✅ No bloquea la interfaz

**Estimación:** 2-3 horas

---

### Fase 5: Optimizar Cache del Servidor

**Objetivo:** Mejorar el sistema de cache del servidor para evitar lecturas repetidas.

**Tareas:**

#### 5.1 Mejorar Cache en `game-state-actions.ts`

**Archivo a modificar:** `src/app/game-state-actions.ts`

**Recursos a aprovechar:**
- ✅ Sistema de cache existente en `game-state-actions.ts` (líneas 9-61)
- ✅ Patrón de cache de `src/lib/dnd-api-client.ts` para cache de archivos
- ✅ Sistema de logging existente para tracking

**Cambios:**
1. Mejorar cache existente con invalidación (añadir timestamp)
2. Cachear también archivos leídos del sistema de archivos (usar patrón de dnd-api-client.ts)
3. Añadir métodos de limpieza

**Mejoras (extender código existente):**
```typescript
// Extender cache existente
interface CacheEntry {
  data: any;
  timestamp: number;
  hash?: string;
}

// Cache de datos de aventura (mejorar existente)
let adventureDataCache: CacheEntry | null = null;

// Cache de archivos (nuevo, usar patrón de dnd-api-client.ts)
const fileCache: Map<string, CacheEntry> = new Map();

export async function setAdventureDataCache(adventureData: any, hash?: string): Promise<void> {
  adventureDataCache = { 
    data: adventureData, 
    timestamp: Date.now(),
    hash 
  };
  log.info('Adventure data cache updated', { 
    module: 'GameState',
    adventureId: adventureDataCache?.data?.adventureId || 'unknown',
  });
}

export async function getAdventureData(): Promise<any> {
  if (adventureDataCache) {
    // Verificar expiración (opcional, 1 hora)
    const maxAge = 3600000;
    if (Date.now() - adventureDataCache.timestamp < maxAge) {
      return adventureDataCache.data;
    }
    // Cache expirado, limpiar
    adventureDataCache = null;
  }
  // Leer del archivo...
}

// Nuevo: Cachear archivos leídos (patrón de dnd-api-client.ts)
export function cacheFile(path: string, data: any): void {
  fileCache.set(path, { data, timestamp: Date.now() });
}

export function getCachedFile(path: string): any | null {
  const entry = fileCache.get(path);
  if (!entry) return null;
  
  // Verificar expiración (1 hora)
  const maxAge = 3600000;
  if (Date.now() - entry.timestamp > maxAge) {
    fileCache.delete(path);
    return null;
  }
  
  return entry.data;
}

export function clearCache(): void {
  adventureDataCache = null;
  fileCache.clear();
}
```

**Criterios de éxito:**
- ✅ Cache mejorado con invalidación (extiende existente)
- ✅ Cache de archivos implementado (patrón de dnd-api-client.ts)
- ✅ Reducción de lecturas del sistema de archivos
- ✅ Métodos de limpieza disponibles
- ✅ Logging consistente con sistema existente

**Estimación:** 2-3 horas

---

#### 5.2 Optimizar Endpoint `/api/load-adventure`

**Archivo a modificar:** `src/app/api/load-adventure/route.ts`

**Cambios:**
1. Usar cache de archivos
2. Validar estructura antes de retornar
3. Retornar errores específicos

**Código después:**
```typescript
export async function GET() {
  try {
    const jsonDirectory = path.join(process.cwd(), 'JSON_adventures');
    const filePath = jsonDirectory + '/el-dragon-del-pico-agujahelada.json';
    
    // Intentar obtener del cache
    const cached = getCachedFile(filePath);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    // Leer del sistema de archivos
    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    
    // Validar estructura
    AdventureDataSchema.parse(data);
    
    // Cachear
    cacheFile(filePath, data);
    
    return NextResponse.json(data);
  } catch (error: any) {
    // Manejo de errores específico
    return new NextResponse('Error loading adventure data.', { status: 500 });
  }
}
```

**Criterios de éxito:**
- ✅ Cache de archivos funcionando
- ✅ Validación antes de retornar
- ✅ Errores específicos
- ✅ Reducción de lecturas del sistema de archivos

**Estimación:** 1-2 horas

---

### Fase 6: Testing Exhaustivo

**Objetivo:** Asegurar que todos los cambios funcionan correctamente y no hay regresiones.

**Tareas:**

#### 6.1 Tests Unitarios

**Archivos a crear:**
- `src/lib/adventure-loader/__tests__/validator.test.ts`
- `src/lib/adventure-loader/__tests__/adventure-parser.test.ts`
- `src/lib/adventure-loader/__tests__/error-handler.test.ts`
- `src/lib/adventure-loader/__tests__/game-initializer.test.ts`
- `src/lib/adventure-loader/__tests__/adventure-cache.test.ts`

**Tests a implementar:**
1. **Validator:**
   - Validación de estructura válida
   - Validación de estructura inválida
   - Validación de tipos incorrectos
   - Validación de referencias rotas

2. **Parser:**
   - Parseo rápido con título/resumen
   - Parseo rápido sin título/resumen
   - Manejo de JSON inválido

3. **Error Handler:**
   - Clasificación de diferentes tipos de errores
   - Mensajes amigables correctos

4. **Game Initializer:**
   - Inicialización exitosa
   - Manejo de errores
   - Rollback en caso de fallo

5. **Cache:**
   - Guardar y recuperar
   - Invalidación automática
   - Hash único

**Criterios de éxito:**
- ✅ Todos los tests unitarios pasando
- ✅ Cobertura > 80%
- ✅ Tests de edge cases incluidos

**Estimación:** 4-6 horas

---

#### 6.2 Tests de Integración

**Tests a implementar:**
1. **Flujo completo de carga:**
   - Cargar aventura válida
   - Cargar aventura inválida
   - Cargar aventura con errores de validación

2. **Flujo de inicialización:**
   - Inicialización exitosa
   - Manejo de errores durante inicialización
   - Rollback correcto

3. **Cache:**
   - Cache compartido entre requests
   - Invalidación correcta
   - Cache de archivos funcionando

**Criterios de éxito:**
- ✅ Todos los tests de integración pasando
- ✅ Flujos completos verificados
- ✅ No hay regresiones

**Estimación:** 3-4 horas

---

#### 6.3 Testing Manual

**Escenarios a probar:**
1. Cargar aventura válida
2. Cargar aventura con JSON inválido
3. Cargar aventura con estructura inválida
4. Cargar aventura con referencias rotas
5. Cargar aventura grande (rendimiento)
6. Cargar misma aventura dos veces (cache)
7. Verificar feedback progresivo
8. Verificar mensajes de error específicos

**Criterios de éxito:**
- ✅ Todos los escenarios funcionan correctamente
- ✅ Experiencia de usuario mejorada
- ✅ Rendimiento mejorado verificado
- ✅ No hay regresiones

**Estimación:** 2-3 horas

---

## 📊 Resumen de Archivos Afectados

### Archivos Nuevos
- `src/lib/adventure-loader/error-handler.ts` - Clasificación de errores
- `src/lib/adventure-loader/validator.ts` - Validación completa
- `src/lib/adventure-loader/adventure-parser.ts` - Parseo rápido
- `src/lib/adventure-loader/adventure-cache.ts` - Caché de parseo
- `src/lib/adventure-loader/game-initializer.ts` - Inicialización robusta
- `src/lib/adventure-loader/loading-feedback.ts` - Feedback progresivo
- `src/lib/adventure-loader/index.ts` - Exports centralizados
- `src/app/api/health/route.ts` - Endpoint de health check para verificación del servidor

### Archivos a Modificar
- `src/app/page.tsx` - Refactorizar `handleLoadAdventure`
- `src/ai/flows/parse-adventure-from-json.ts` - Hacer IA opcional
- `src/app/game-state-actions.ts` - Mejorar cache
- `src/app/api/load-adventure/route.ts` - Optimizar endpoint
- `src/components/game/main-menu.tsx` - Añadir feedback progresivo

### Archivos de Tests
- `src/lib/adventure-loader/__tests__/validator.test.ts`
- `src/lib/adventure-loader/__tests__/adventure-parser.test.ts`
- `src/lib/adventure-loader/__tests__/error-handler.test.ts`
- `src/lib/adventure-loader/__tests__/game-initializer.test.ts`
- `src/lib/adventure-loader/__tests__/adventure-cache.test.ts`
- `src/lib/adventure-loader/__tests__/integration.test.ts`

---

## ✅ Beneficios Esperados

### Rendimiento
- ✅ **Reducción de tiempo de carga:** 50-70% (de 3-8s a 1-3s)
- ✅ **Menos uso de IA:** Solo cuando es necesario
- ✅ **Cache eficiente:** Cargas subsecuentes instantáneas

### Robustez
- ✅ **Validación temprana:** Errores detectados antes de procesamiento costoso
- ✅ **Manejo de errores específico:** Usuario sabe exactamente qué salió mal
- ✅ **Recuperación mejorada:** Rollback y limpieza en caso de fallo

### Experiencia de Usuario
- ✅ **Feedback claro:** Usuario sabe qué está pasando
- ✅ **Mensajes específicos:** Errores comprensibles
- ✅ **Progreso visible:** Indicadores de carga

### Mantenibilidad
- ✅ **Código más limpio:** Separación de responsabilidades
- ✅ **Funciones más pequeñas:** Más fáciles de testear y mantener
- ✅ **Documentación mejorada:** Código autodocumentado

---

## 🧪 Plan de Testing

### Tests Unitarios
- Validación de estructura
- Parseo rápido
- Clasificación de errores
- Inicialización robusta
- Sistema de cache

### Tests de Integración
- Flujo completo de carga
- Flujo de inicialización
- Cache compartido
- Manejo de errores end-to-end

### Tests Manuales
- Cargar diferentes tipos de aventuras
- Verificar feedback progresivo
- Verificar mensajes de error
- Verificar rendimiento

---

## 📈 Métricas de Éxito

### Técnicas
- ✅ **Tiempo de carga:** Reducción de 50-70%
- ✅ **Uso de IA:** Reducción de 80-90% (solo fallback)
- ✅ **Cobertura de tests:** > 80%
- ✅ **Validación:** 100% de estructura validada

### Funcionales
- ✅ **Experiencia de usuario:** Feedback claro y progreso visible
- ✅ **Manejo de errores:** Mensajes específicos y útiles
- ✅ **Robustez:** Validación temprana y rollback
- ✅ **Rendimiento:** Carga rápida y eficiente

---

## 🚨 Riesgos y Mitigaciones

### Riesgo 1: Regresiones en funcionalidad existente
**Mitigación:** 
- Mantener tests existentes
- Refactorización incremental (una fase a la vez)
- Testing exhaustivo después de cada fase

### Riesgo 2: Cambios en estructura de aventuras existentes
**Mitigación:**
- Validación backward-compatible
- Tests con aventuras existentes
- Documentación de cambios

### Riesgo 3: Problemas de cache
**Mitigación:**
- Tests específicos para cache
- Invalidación automática
- Logging detallado para debugging

### Riesgo 4: Parseo rápido puede no extraer título/resumen
**Mitigación:**
- Fallback a parseo con IA
- Documentación de estructura esperada
- Validación de campos requeridos

---

## 📅 Estimación Total

- **Fase 1:** 7-11 horas (Manejo de errores y validación) - *Reducido por reutilización de patrones*
- **Fase 2:** 6-9 horas (Optimización de parseo) - *Reducido por estructura JSON identificada y reutilización de caché*
- **Fase 3:** 6-8 horas (Mejora de inicialización)
- **Fase 4:** 5-7 horas (Feedback al usuario)
- **Fase 5:** 2-3 horas (Optimización de cache) - *Reducido por reutilización de patrón existente*
- **Fase 6:** 9-13 horas (Testing exhaustivo)

**Total:** 35-51 horas (reducción de 4-6 horas por aprovechamiento de recursos existentes)

---

## 🔗 Issues Relacionados

- **Issue #6:** Manejo de errores en `handleLoadAdventure` - ✅ Incluido en Fase 1
- **Issue #8:** Fallos al cargar aventura desde JSON - ✅ Incluido en Fase 1 y 2
- **Issue #93:** Manejo de errores cuando se agotan los reintentos - Relacionado con manejo de errores

---

## 📝 Notas de Implementación

- **Reutilizar código existente:** Aprovechar módulos y patrones ya probados en el proyecto
- **Consistencia:** Usar mismos patrones de logging, validación y manejo de errores que el resto del proyecto
- **No duplicar:** Reutilizar `logger`, `retry-utils`, patrones de caché en lugar de crear nuevos
- **Extender en lugar de crear:** Extender `AdventureDataSchema` existente en lugar de crear uno nuevo
- Mantener compatibilidad hacia atrás durante la refactorización
- Hacer commits pequeños y frecuentes por fase
- Documentar cambios importantes en el código
- Actualizar CHANGELOG.md al completar cada fase
- Actualizar documentación de estructura de aventuras si es necesario

---

## ✅ Estado de Implementación

### Fases Completadas

- ⏳ **Fase 1:** Manejo de errores y validación - **PENDIENTE**
- ⏳ **Fase 2:** Optimización de parseo - **PENDIENTE**
- ⏳ **Fase 3:** Mejora de inicialización - **PENDIENTE**
- ⏳ **Fase 4:** Feedback al usuario - **PENDIENTE**
- ⏳ **Fase 5:** Optimización de cache - **PENDIENTE**
- ⏳ **Fase 6:** Testing exhaustivo - **PENDIENTE**

### Próximos Pasos

1. Revisar y aprobar este plan
2. Comenzar con Fase 1 (Manejo de errores y validación)
3. Implementar una fase a la vez
4. Testing después de cada fase
5. Actualizar este documento con progreso

---

**Última actualización:** 2025-01-23

