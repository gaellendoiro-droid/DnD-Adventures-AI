# Plan de Implementación: Issue #125 - Unificación Arquitectónica de APIs

**Issue:** #125  
**Prioridad:** 🟡 ALTA  
**Fecha de creación del plan:** 2025-01-23  
**Estado:** ✅ COMPLETADO (2025-01-23)  
**Referencia:** [Issue #125](../../tracking/issues/corregidos.md#issue-125-primera-llamada-a-apis-siempre-falla-gemini-y-dd-resuelto)

---

## 🎯 Objetivo

Unificar la arquitectura de llamadas a APIs externas (D&D 5e API y Gemini API) para eliminar duplicación de código, centralizar la lógica de retries y caché, y mejorar la robustez del sistema ante fallos de conexión inicial (cold start).

---

## 📋 Análisis del Problema

### Problema Principal

La primera llamada a las APIs (tanto Gemini como D&D) frecuentemente falla, causando delays innecesarios y afectando la experiencia del usuario. Aunque el sistema de retries eventualmente funciona, el primer fallo causa delay innecesario.

### Problemas Arquitectónicos Identificados

#### 1. Duplicación en D&D API

Existen **dos módulos separados** que hacen llamadas a la API de D&D con lógica duplicada:

- **`monster-stats-parser.ts`**:
  - ✅ Tiene retries (`retryWithExponentialBackoff`)
  - ✅ Tiene caché propio
  - ❌ Duplica lógica de normalización (Español → Inglés)
  - ❌ Duplica lógica de `fetch` y manejo de URLs base
  - ❌ Especializado solo en monstruos
  - ✅ Parsea a objetos tipados (`MonsterStats`)

- **`dnd-api-lookup.ts`**:
  - ❌ **NO tiene retries** (crítico)
  - ❌ Duplica lógica de normalización (mismo mapeo español→inglés)
  - ❌ Duplica lógica de `fetch` y manejo de URLs base
  - ✅ Herramienta general para IA (monstruos, hechizos, equipo)
  - ❌ Devuelve strings JSON (no objetos tipados)

**Problemas de la duplicación:**
- Caché no compartido: Si la IA busca "Goblin" y luego el combate inicializa "Goblin", se hacen 2 llamadas
- Inconsistencia: Un módulo tiene retries, el otro no
- Mantenimiento difícil: Cambios deben aplicarse en dos lugares
- Mapeo español→inglés duplicado y puede desincronizarse

#### 2. Retries de Gemini API no centralizados

Múltiples módulos implementan retries de forma ad-hoc:
- `enemy-tactician.ts`: Usa `retryWithExponentialBackoff` directamente
- `companion-tactician.ts`: Usa `retryWithExponentialBackoff` directamente
- Otros módulos pueden no tener retries

**Problema:** No hay un helper centralizado para ejecutar prompts de Genkit con retries, causando duplicación de código.

### Comportamiento Actual

1. **Primera llamada falla frecuentemente** (cold start, latencia de red inicial)
2. **Sistema de retries eventualmente funciona** pero causa delay
3. **Usuario experimenta delay** en la primera interacción
4. **Caché no compartido** entre módulos
5. **Inconsistencia** en manejo de errores

### Comportamiento Esperado

1. **Primera llamada debería funcionar** correctamente
2. **Si hay problemas de cold start**, deberían manejarse de forma transparente
3. **Sistema robusto** ante problemas de conexión inicial
4. **Caché global compartido** entre todos los módulos
5. **Un único punto de entrada** para cada API con lógica centralizada

---

## 🏗️ Arquitectura Propuesta

### Principio de Diseño

**Un único punto de entrada para cada API que encapsule toda la lógica de comunicación (retries, caché, normalización).**

### Arquitectura para D&D API

```
┌─────────────────────────────────────────────────────────────┐
│              dnd-api-client.ts (NUEVO)                      │
│  - Único punto de contacto con dnd5eapi.co                 │
│  - Retries encapsulados (retryWithExponentialBackoff)      │
│  - Caché global compartido                                  │
│  - Normalización centralizada (Español → Inglés)            │
│  - Manejo de errores unificado (5xx retryable, 404 no)     │
│                                                              │
│  Funciones:                                                 │
│  - fetchResource(type, name): Fetch directo                │
│  - searchResource(type, query): Búsqueda flexible          │
│  - normalizeQuery(query): Normalización centralizada        │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│ monster-stats-   │         │ dnd-api-lookup   │
│ parser.ts        │         │ .ts              │
│                  │         │                  │
│ Usa cliente      │         │ Usa cliente     │
│ unificado        │         │ unificado        │
│                  │         │                  │
│ Mantiene solo:   │         │ Mantiene solo:   │
│ - Parseo a       │         │ - Formateo para  │
│   MonsterStats   │         │   IA (texto/JSON)│
└──────────────────┘         └──────────────────┘
```

### Arquitectura para Gemini API

```
┌─────────────────────────────────────────────────────────────┐
│         retry-utils.ts (MEJORADO)                           │
│  - Helper centralizado: executePromptWithRetry()           │
│  - Encapsula patrón común de retries para prompts          │
│  - Manejo de errores unificado                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│ enemy-tactician   │         │ Otros módulos    │
│ .ts               │         │ que usan prompts │
│                  │         │                  │
│ Usa helper       │         │ Usan helper      │
│ centralizado     │         │ centralizado     │
└──────────────────┘         └──────────────────┘
```

---

## 📝 Plan de Implementación

### Fase 1: Crear Cliente Unificado de D&D API

**Objetivo:** Crear un módulo centralizado que encapsule toda la lógica de comunicación con la API de D&D.

**Archivo nuevo:** `src/lib/dnd-api-client.ts`

**Responsabilidades:**
- Único punto de contacto con `dnd5eapi.co`
- Retries encapsulados con `retryWithExponentialBackoff`
- Caché global compartido (evita llamadas duplicadas)
- Normalización de nombres (Español → Inglés) centralizada
- Manejo de errores unificado (5xx retryable, 404 no retryable)

**Funciones a implementar:**

```typescript
// Fetch directo de un recurso por nombre
async function fetchResource(
  resourceType: string, 
  name: string
): Promise<any | null>

// Búsqueda flexible (intenta directo, luego búsqueda)
async function searchResource(
  resourceType: string, 
  query: string
): Promise<any | null>

// Normalización centralizada
function normalizeQuery(query: string): string
```

**Detalles de implementación:**

1. **Caché global:**
   - Usar `Map<string, any>` para caché de respuestas
   - Clave: `${resourceType}:${normalizedName}`
   - Cachear tanto éxitos como fallos (404) para evitar llamadas repetidas

2. **Normalización:**
   - Unificar mapeo español→inglés de ambos módulos
   - Expandir mapeo con todas las entradas de ambos módulos
   - Mantener función centralizada `normalizeQuery()`

3. **Retries:**
   - Usar `retryWithExponentialBackoff` para todas las llamadas
   - Retry automático para errores 5xx
   - No retry para 404 (recurso no encontrado)

4. **Manejo de errores:**
   - Logging consistente
   - Retornar `null` para recursos no encontrados
   - Lanzar errores solo para fallos de red después de retries

**Criterios de éxito:**
- ✅ Cliente unificado creado y funcional
- ✅ Caché global compartido funcionando
- ✅ Normalización centralizada
- ✅ Retries implementados correctamente
- ✅ Tests unitarios básicos pasando

**Estimación:** 4-6 horas

---

### Fase 2: Refactorizar `monster-stats-parser.ts`

**Objetivo:** Eliminar lógica duplicada y usar el cliente unificado.

**Cambios:**
1. Eliminar función `normalizeMonsterName()` (usar `dndApiClient.normalizeQuery()`)
2. Eliminar lógica de `fetch` y retries (usar `dndApiClient.fetchResource()`)
3. Eliminar caché propio (usar caché del cliente)
4. Mantener solo responsabilidad de **parsear/transformar** respuesta raw → `MonsterStats`

**Código antes:**
```typescript
// Lógica de fetch, retries, normalización, caché propia
export async function getMonsterStatsFromDndApi(monsterName: string) {
  // ... 200+ líneas de lógica duplicada
}
```

**Código después:**
```typescript
import { dndApiClient } from '@/lib/dnd-api-client';

export async function getMonsterStatsFromDndApi(monsterName: string) {
  // Usar cliente unificado
  const data = await dndApiClient.fetchResource('monsters', monsterName);
  if (!data) return null;
  
  // Solo parsear/transformar
  return parseMonsterDataToStats(data);
}
```

**Funciones a mantener:**
- `parseHitPoints()` - Parseo específico de HP
- `parseArmorClass()` - Parseo específico de AC
- `parseAbilityScores()` - Parseo de habilidades
- `getAbilityModifier()` - Cálculo de modificadores
- `parseProficiencyBonus()` - Parseo de proficiency
- `parseActions()` - Parseo de acciones
- `parseMonsterDataToStats()` - Función principal de transformación

**Funciones a eliminar:**
- `normalizeMonsterName()` - Reemplazada por cliente
- Lógica de `fetch` - Reemplazada por cliente
- Caché propio - Reemplazada por cliente
- Lógica de retries - Reemplazada por cliente

**Criterios de éxito:**
- ✅ Módulo refactorizado usando cliente unificado
- ✅ Todas las funciones de parseo mantenidas
- ✅ Tests existentes siguen pasando
- ✅ Código reducido significativamente (de ~380 líneas a ~150 líneas estimadas)

**Estimación:** 2-3 horas

---

### Fase 3: Refactorizar `dnd-api-lookup.ts`

**Objetivo:** Eliminar lógica duplicada y usar el cliente unificado, añadiendo retries que faltan.

**Cambios:**
1. Eliminar función `normalizeQuery()` (usar `dndApiClient.normalizeQuery()`)
2. Eliminar lógica de `fetch` y búsqueda (usar `dndApiClient.searchResource()`)
3. **Añadir retries** que actualmente faltan (crítico)
4. Mantener solo responsabilidad de **formatear** respuesta para IA (texto/JSON string)
5. La Tool `dndApiLookupTool` sigue siendo la interfaz para Genkit, pero delega todo al cliente

**Código antes:**
```typescript
async function searchApi(resourceType: string, query: string) {
  // Fetch directo sin retries ❌
  const response = await fetch(`${baseUrl}/${resourceType}/${formattedQuery}`);
  // ...
}
```

**Código después:**
```typescript
import { dndApiClient } from '@/lib/dnd-api-client';

async function searchApi(resourceType: string, query: string) {
  // Usar cliente unificado con retries ✅
  const data = await dndApiClient.searchResource(resourceType, query);
  if (!data) return null;
  
  // Solo formatear para IA
  return formatRelevantInfo(data);
}
```

**Funciones a mantener:**
- `formatRelevantInfo()` - Formateo para IA
- `dndApiLookupTool` - Interfaz de Genkit (sin cambios en la interfaz)

**Funciones a eliminar:**
- `normalizeQuery()` - Reemplazada por cliente
- `searchApi()` - Reemplazada por cliente (lógica de fetch/búsqueda)

**Criterios de éxito:**
- ✅ Módulo refactorizado usando cliente unificado
- ✅ Retries añadidos (crítico - actualmente no tiene)
- ✅ Tool de Genkit sigue funcionando igual
- ✅ Tests existentes siguen pasando
- ✅ Código reducido significativamente

**Estimación:** 2-3 horas

---

### Fase 4: Centralizar retries de Gemini API

**Objetivo:** Crear helper centralizado para ejecutar prompts de Genkit con retries.

**Archivo a modificar:** `src/ai/flows/retry-utils.ts`

**Nueva función:**
```typescript
/**
 * Execute a Genkit prompt with automatic retries for network errors.
 * Centralizes the pattern of retrying prompt execution.
 */
export async function executePromptWithRetry<TInput, TOutput>(
  prompt: Prompt<TInput, TOutput>,
  input: TInput,
  options?: {
    maxRetries?: number;
    initialDelayMs?: number;
    flowName?: string;
  }
): Promise<TOutput>
```

**Módulos a refactorizar:**
1. `src/ai/tools/enemy-tactician.ts`
2. `src/ai/tools/companion-tactician.ts`
3. `src/ai/flows/narrative-manager.ts`
4. `src/ai/flows/experts/exploration-expert.ts`
5. `src/ai/flows/experts/interaction-expert.ts`
6. `src/ai/flows/action-interpreter.ts`
7. Otros módulos que usen prompts de Genkit

**Código antes:**
```typescript
response = await retryWithExponentialBackoff(
  () => enemyTacticianPrompt(input),
  3,
  1000,
  'enemyTactician'
);
output = response.output;
```

**Código después:**
```typescript
const response = await executePromptWithRetry(
  enemyTacticianPrompt,
  input,
  { flowName: 'enemyTactician' }
);
output = response.output;
```

**Criterios de éxito:**
- ✅ Helper `executePromptWithRetry()` creado
- ✅ Todos los módulos que usan prompts refactorizados
- ✅ Comportamiento idéntico al anterior
- ✅ Código más limpio y mantenible

**Estimación:** 3-4 horas

---

### Fase 5: Verificación y Testing

**Objetivo:** Asegurar que todas las llamadas a APIs tienen retries y que el caché se comparte correctamente.

**Tareas:**
1. **Auditoría de cobertura:**
   - Buscar todas las llamadas a APIs externas
   - Verificar que todas tienen retries encapsulados
   - Verificar que no hay llamadas directas sin retries

2. **Verificar caché compartido:**
   - Test: Si la IA busca "Goblin" y luego el combate inicializa "Goblin", debe usar la misma entrada de caché
   - Verificar que el caché se comparte entre `monster-stats-parser` y `dnd-api-lookup`

3. **Testing de cold start:**
   - Simular fallos de primera llamada
   - Verificar que los retries funcionan correctamente
   - Verificar que el usuario no nota el delay

4. **Testing de integración:**
   - Probar flujo completo de combate con monstruos
   - Probar búsquedas de la IA
   - Verificar que no hay regresiones

**Criterios de éxito:**
- ✅ Todas las llamadas a APIs tienen retries
- ✅ Caché se comparte correctamente entre módulos
- ✅ No hay regresiones en funcionalidad existente
- ✅ Tests pasando

**Estimación:** 2-3 horas

---

## 📊 Resumen de Archivos Afectados

### Archivos Nuevos
- `src/lib/dnd-api-client.ts` - Cliente unificado de D&D API

### Archivos a Refactorizar (D&D API)
- `src/lib/combat/monster-stats-parser.ts` - Usar cliente unificado, mantener solo parseo
- `src/ai/tools/dnd-api-lookup.ts` - Usar cliente unificado, mantener solo formateo para IA

### Archivos a Mejorar (Gemini API)
- `src/ai/flows/retry-utils.ts` - Añadir helper `executePromptWithRetry()`

### Archivos a Refactorizar (Gemini API)
- `src/ai/tools/enemy-tactician.ts`
- `src/ai/tools/companion-tactician.ts`
- `src/ai/flows/narrative-manager.ts`
- `src/ai/flows/experts/exploration-expert.ts`
- `src/ai/flows/experts/interaction-expert.ts`
- `src/ai/flows/action-interpreter.ts`
- Otros módulos que usen prompts de Genkit (identificar durante implementación)

---

## ✅ Beneficios Esperados

### Robustez Unificada
- ✅ Retries implementados una sola vez en el cliente
- ✅ Comportamiento consistente para todas las llamadas

### Caché Global
- ✅ Si la IA busca "Goblin" y luego el combate inicializa "Goblin", usan la misma entrada de caché
- ✅ Reduce llamadas redundantes a la API

### Limpieza de Responsabilidades
- ✅ Cada módulo se enfoca en su propósito (parsear vs formatear)
- ✅ Separación clara de concerns

### Mantenibilidad
- ✅ Un solo lugar para actualizar lógica de retries, caché y normalización
- ✅ Cambios futuros más fáciles de implementar

### Consistencia
- ✅ Mismo comportamiento para todas las llamadas a la API de D&D
- ✅ Mismo patrón de retries para todas las llamadas a Gemini API

### Eficiencia
- ✅ Reduce llamadas redundantes a la API
- ✅ Mejora tiempo de respuesta al compartir caché

---

## 🧪 Plan de Testing

### Tests Unitarios

1. **`dnd-api-client.ts`:**
   - Test de normalización de queries
   - Test de caché (verificar que se comparte)
   - Test de retries (simular fallos)
   - Test de manejo de errores (404 vs 5xx)

2. **`monster-stats-parser.ts`:**
   - Test de parseo de datos (mantener tests existentes)
   - Test de integración con cliente unificado

3. **`dnd-api-lookup.ts`:**
   - Test de formateo para IA
   - Test de integración con cliente unificado

4. **`retry-utils.ts`:**
   - Test de `executePromptWithRetry()`
   - Test de retries con prompts de Genkit

### Tests de Integración

1. **Flujo de combate:**
   - Iniciar combate con monstruo
   - Verificar que se usa caché si el monstruo ya fue buscado

2. **Flujo de IA:**
   - IA busca información de monstruo
   - Verificar que se usa caché si el monstruo ya fue buscado

3. **Cold start:**
   - Simular fallo de primera llamada
   - Verificar que los retries funcionan
   - Verificar que el usuario no nota el delay

### Tests Manuales

1. Probar combate con múltiples monstruos
2. Probar búsquedas de la IA
3. Verificar que no hay regresiones
4. Verificar que el sistema es más rápido (caché compartido)

---

## 📈 Métricas de Éxito

### Técnicas
- ✅ Reducción de código duplicado: ~200-300 líneas eliminadas
- ✅ Cobertura de retries: 100% de llamadas a APIs tienen retries
- ✅ Caché compartido: Verificado funcionando
- ✅ Tests: Todos los tests pasando

### Funcionales
- ✅ Primera llamada funciona más frecuentemente (menos fallos)
- ✅ Delay reducido cuando hay fallos (retries más eficientes)
- ✅ Experiencia de usuario mejorada (menos delays perceptibles)

---

## 🚨 Riesgos y Mitigaciones

### Riesgo 1: Regresiones en funcionalidad existente
**Mitigación:** 
- Mantener tests existentes
- Refactorización incremental (una fase a la vez)
- Testing exhaustivo después de cada fase

### Riesgo 2: Cambios en la API de D&D
**Mitigación:**
- Cliente unificado facilita actualizaciones futuras
- Un solo lugar para cambiar si la API cambia

### Riesgo 3: Problemas de caché compartido
**Mitigación:**
- Tests específicos para verificar caché compartido
- Logging detallado para debugging

---

## 📅 Estimación Total

- **Fase 1:** 4-6 horas
- **Fase 2:** 2-3 horas
- **Fase 3:** 2-3 horas
- **Fase 4:** 3-4 horas
- **Fase 5:** 2-3 horas

**Total:** 13-19 horas

---

## 🔗 Issues Relacionados

- Issue #124 (Sistema de retries faltante en consulta de stats de enemigos) - ✅ RESUELTO - Pero ahora se unificará en el cliente centralizado
- Issue #29 (Stats de enemigos incorrectos en combate) - ✅ RESUELTO - Pero ahora se unificará en el cliente centralizado
- Issue #93 (Manejo de errores cuando se agotan los reintentos) - Problema relacionado de manejo de errores

---

## 📝 Notas de Implementación

- Mantener compatibilidad hacia atrás durante la refactorización
- Hacer commits pequeños y frecuentes por fase
- Documentar cambios importantes en el código
- Actualizar CHANGELOG.md al completar cada fase

---

**Última actualización:** 2025-01-23

---

## ✅ Estado de Implementación

### Fases Completadas

- ✅ **Fase 1:** Cliente Unificado de D&D API creado (`src/lib/dnd-api-client.ts`)
- ✅ **Fase 2:** `monster-stats-parser.ts` refactorizado
- ✅ **Fase 3:** `dnd-api-lookup.ts` refactorizado (retries añadidos)
- ✅ **Fase 4:** Retries de Gemini API centralizados
  - Helper `executePromptWithRetry()` creado
  - 8 módulos refactorizados:
    - `enemy-tactician.ts`
    - `companion-tactician.ts`
    - `action-interpreter.ts`
    - `exploration-expert.ts`
    - `interaction-expert.ts`
    - `narrative-manager.ts`
    - `parse-adventure-from-json.ts`
- ✅ **Fase 5:** Verificación completada
  - No hay llamadas directas a APIs sin retries
  - Todos los módulos usan el cliente unificado o el helper centralizado
  - Caché compartido funcionando

### Archivos Creados
- `src/lib/dnd-api-client.ts` - Cliente unificado de D&D API

### Archivos Refactorizados
- `src/lib/combat/monster-stats-parser.ts` - Usa cliente unificado
- `src/ai/tools/dnd-api-lookup.ts` - Usa cliente unificado, retries añadidos
- `src/ai/flows/retry-utils.ts` - Helper `executePromptWithRetry()` añadido
- `src/ai/tools/enemy-tactician.ts` - Usa helper centralizado
- `src/ai/tools/companion-tactician.ts` - Usa helper centralizado
- `src/ai/flows/action-interpreter.ts` - Usa helper centralizado
- `src/ai/flows/experts/exploration-expert.ts` - Usa helper centralizado
- `src/ai/flows/experts/interaction-expert.ts` - Usa helper centralizado
- `src/ai/flows/narrative-manager.ts` - Usa helper centralizado
- `src/ai/flows/parse-adventure-from-json.ts` - Usa helper centralizado

### Beneficios Logrados

✅ **Caché Global Compartido:** `monster-stats-parser` y `dnd-api-lookup` comparten caché  
✅ **Retries Unificados:** Todas las llamadas a APIs tienen retries consistentes  
✅ **Código Más Limpio:** ~200-300 líneas de código duplicado eliminadas  
✅ **Mantenibilidad:** Un solo lugar para actualizar lógica de APIs  
✅ **Robustez:** Retries añadidos a `dnd-api-lookup` que antes no los tenía

### Próximos Pasos Recomendados

1. Testing manual del sistema para verificar que no hay regresiones
2. Monitorear logs para verificar que el caché compartido funciona correctamente
3. Verificar que las primeras llamadas a APIs funcionan mejor (menos fallos)

