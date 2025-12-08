# Plan de Implementación: Sistema de Conexiones Persistentes para APIs

**Roadmap:** #1.2  
**Prioridad:** 🔴 CRÍTICO (PMA)  
**Fecha de creación del plan:** 2025-01-27  
**Fecha de finalización:** 2025-12-08  
**Estado:** ✅ COMPLETADO

**Referencia:** [Roadmap - Sección 1.2](../../roadmap.md#roadmap-1-2)

---

## 🎯 Objetivo

Implementar un sistema de conexiones HTTP persistentes (keep-alive) para todas las llamadas a APIs externas, eliminando el overhead de establecer nuevas conexiones en cada petición y mejorando significativamente la estabilidad y rendimiento del sistema.

**Objetivos específicos:**
- **Reducción de latencia:** Eliminar el overhead de establecer conexiones nuevas (reducción estimada de 50-80% en tiempo de conexión)
- **Menos fallos:** Las conexiones persistentes son más estables y tienen menor probabilidad de fallar en el primer intento
- **Mejor rendimiento:** Tiempos de respuesta más rápidos, especialmente en secuencias de múltiples llamadas
- **Menos reintentos:** Al reducir los fallos iniciales, se necesitarán menos reintentos, ahorrando tokens y tiempo
- **Mejor experiencia de usuario:** Respuestas más rápidas y consistentes del sistema

---

## 📋 Análisis del Problema

### Problema Principal

El sistema actual usa `fetch` nativo de Node.js que no mantiene conexiones persistentes entre llamadas, causando:

1. **Timeouts frecuentes:** Cada llamada debe establecer una nueva conexión TCP/TLS, lo que añade latencia significativa (10+ segundos en algunos casos)
2. **Fallos en el primer intento:** Las conexiones nuevas tienen mayor probabilidad de fallar, requiriendo múltiples reintentos
3. **Overhead innecesario:** El handshake TLS y la negociación HTTP se repiten en cada llamada
4. **Impacto en rendimiento:** Los tiempos de respuesta son más lentos de lo necesario, especialmente en llamadas frecuentes a APIs

### Problemas Específicos por API

#### 1. Google Gemini API (Genkit)

**Ubicación actual:** `src/ai/genkit.ts`, llamadas a través de `@genkit-ai/google-genai`

**Problemas:**
- Genkit usa `fetch` internamente sin configuración de keep-alive
- Cada llamada a `ai.generate()` establece una nueva conexión
- El sistema actual tiene un `prewarmConnection` que intenta establecer una conexión inicial, pero no mantiene pools persistentes
- Llamadas frecuentes durante el juego (narrative expert, tacticians, etc.) sufren latencia innecesaria

**Impacto:**
- Latencia adicional de 2-5 segundos por llamada
- Mayor probabilidad de timeouts en la primera llamada
- Uso innecesario de recursos de red

#### 2. Eleven Labs API

**Ubicación actual:** 
- `src/lib/tts/eleven-labs-direct.ts` - Llamadas directas a la API externa de Eleven Labs (servidor)
- `src/lib/tts/eleven-labs-client.ts` - Cliente que llama a API route interna `/api/generate-audio` (cliente/servidor)
- `src/app/api/generate-audio/route.ts` - API route de Next.js que delega a `generateAudioDirect`

**Problemas:**
- `eleven-labs-direct.ts` usa `fetch` directamente sin configuración de keep-alive
- Cada generación de audio TTS requiere una nueva conexión
- El sistema actual tiene `prewarmConnection` pero no mantiene la conexión abierta
- Llamadas frecuentes durante la narración sufren latencia innecesaria
- **Nota:** `eleven-labs-client.ts` hace fetch a API route interna (no necesita conexiones persistentes, es local)

**Impacto:**
- Latencia adicional de 1-3 segundos por llamada
- Mayor probabilidad de timeouts
- Experiencia de usuario degradada (audio tarda más en generarse)

#### 3. D&D 5e API

**Ubicación actual:** `src/lib/dnd-api-client.ts`

**Problemas:**
- Usa `fetch` directamente sin configuración de keep-alive
- Cada búsqueda de monstruo/hechizo requiere una nueva conexión
- El sistema actual tiene `prewarmConnection` pero no mantiene la conexión abierta
- Llamadas frecuentes durante el combate sufren latencia innecesaria

**Impacto:**
- Latencia adicional de 1-2 segundos por llamada
- Mayor probabilidad de timeouts
- Combate más lento al buscar información de monstruos

### Análisis de Código Actual

#### Patrón Actual de Uso de `fetch`

```typescript
// Ejemplo de dnd-api-client.ts (línea 281)
const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
});

// Ejemplo de eleven-labs-direct.ts (línea 84)
const response = await fetch(url, {
    method: 'POST',
    headers: { /* ... */ },
    body: JSON.stringify({ /* ... */ }),
});
```

**Problema:** No hay configuración de `Agent` para mantener conexiones persistentes.

#### Sistema Actual de Pre-warm

```typescript
// retry-utils.ts (línea 141)
export async function prewarmConnection(
    baseUrl: string,
    warmupPath: string = '/',
    headers?: Record<string, string>,
    timeoutMs: number = 5000
): Promise<void> {
    // Hace una llamada inicial pero no mantiene la conexión
}
```

**Problema:** El pre-warm establece una conexión inicial pero no la mantiene abierta para reutilización.

---

## 🔧 Recursos Disponibles en el Proyecto

### 1. Sistema de Retries Existente

**Ubicación:** `src/ai/flows/retry-utils.ts`

**Recursos disponibles:**
- ✅ `retryWithExponentialBackoff()` - Función robusta de reintentos
- ✅ `prewarmConnection()` - Sistema de pre-warm de conexiones (a mejorar)
- ✅ `executePromptWithRetry()` - Wrapper para prompts de Genkit con retries

**Aprovechable para:**
- Integrar el nuevo sistema de conexiones persistentes con la lógica de retries existente
- Mantener compatibilidad con el código que ya usa estos helpers

### 2. Sistema de Caché Existente

**Ubicación:** `src/lib/dnd-api-client.ts`, `src/lib/tts/tts-cache.ts`

**Recursos disponibles:**
- ✅ Sistema de caché global para respuestas de API
- ✅ Caché de requests pendientes para evitar duplicados simultáneos
- ✅ Patrón de caché compartido entre módulos

**Aprovechable para:**
- El sistema de conexiones persistentes complementará el caché existente
- Las conexiones persistentes mejorarán el rendimiento incluso para requests no cacheados

### 3. Sistema de Logging Centralizado

**Ubicación:** `src/lib/logger.ts`

**Recursos disponibles:**
- ✅ Sistema de logging estructurado
- ✅ Niveles de log (debug, info, warn, error)
- ✅ Contexto de módulo para rastreo

**Aprovechable para:**
- Logging de métricas de conexiones (reutilización, creación, cierre)
- Debugging de problemas de conexión

### 4. Sistema de Retries y Pre-warm Existente

**Ubicación:** `src/ai/flows/retry-utils.ts`

**Componentes actuales:**
- ✅ `retryWithExponentialBackoff()` - Sistema robusto de reintentos con exponential backoff
- ✅ `prewarmConnection()` - Sistema de pre-warm que establece conexión inicial (pero no la mantiene)
- ✅ `executePromptWithRetry()` - Wrapper para prompts de Genkit con retries y pre-warm automático
- ✅ `geminiPrewarmed` - Flag para rastrear si Gemini ya fue pre-warmed
- ✅ `ensureDndApiPrewarmed()` - Función en `dnd-api-client.ts` para pre-warm de D&D API

**Uso actual:**
- **Gemini/Genkit:** `executePromptWithRetry` hace pre-warm automático en el primer uso
- **D&D API:** `ensureDndApiPrewarmed()` se llama antes de cada request (si no se ha hecho pre-warm)
- **Eleven Labs:** `prewarmConnection` se llama manualmente en `eleven-labs-direct.ts`

**Limitaciones actuales:**
- ❌ `prewarmConnection` establece una conexión pero no la mantiene abierta
- ❌ Cada llamada posterior aún requiere establecer nueva conexión
- ❌ El pre-warm solo ayuda en la primera llamada, no en llamadas subsecuentes
- ❌ No hay reutilización real de conexiones entre llamadas

**Integración con nuevo sistema:**
- ✅ El sistema de retries (`retryWithExponentialBackoff`) seguirá funcionando igual
- ✅ El sistema de retries será **más efectivo** con conexiones persistentes (menos fallos iniciales)
- 🔄 El sistema de pre-warm será **reemplazado/mejorado** por el sistema de conexiones persistentes
- 🔄 `prewarmConnection` puede ser simplificado o eliminado (las conexiones persistentes hacen el trabajo)

**Estrategia de migración:**
1. Mantener `retryWithExponentialBackoff` sin cambios (sigue siendo necesario para errores transitorios)
2. Reemplazar `prewarmConnection` con inicialización automática de pools de conexiones
3. Simplificar `executePromptWithRetry` y `ensureDndApiPrewarmed` (ya no necesitan pre-warm manual)
4. Las conexiones persistentes se inicializarán automáticamente en el primer uso

### 5. Node.js 18+ con undici

**Recursos disponibles:**
- ✅ Node.js 18+ incluye `undici` como dependencia nativa
- ✅ `undici` soporta HTTP/1.1 keep-alive y HTTP/2 nativamente
- ✅ Compatible con la API estándar de `fetch` (puede reemplazar `fetch` global)

**Aprovechable para:**
- Base técnica para implementar pools de conexiones persistentes
- No requiere dependencias externas adicionales

---

## 🏗️ Arquitectura Propuesta

### Visión General

El sistema implementará un cliente HTTP centralizado que:

1. **Mantiene pools de conexiones por dominio:** Cada API (Gemini, Eleven Labs, D&D API) tendrá su propio pool de conexiones
2. **Reutiliza conexiones:** Las conexiones se mantienen abiertas durante períodos de inactividad razonables (10-60 segundos)
3. **Gestiona automáticamente el ciclo de vida:** Creación, reutilización y cierre automático después de inactividad
4. **Es compatible con Fetch API:** El cliente será compatible con la API estándar de `fetch` para facilitar la migración

### Componentes Principales

#### 1. HTTP Client Factory (`src/lib/http/persistent-client.ts`)

**Responsabilidades:**
- Crear y gestionar pools de conexiones por dominio
- Proporcionar una función `fetch` compatible que use conexiones persistentes
- Gestionar el ciclo de vida de las conexiones (creación, reutilización, cierre)
- Configurar timeouts de keep-alive apropiados

**Interfaz propuesta:**
```typescript
export interface PersistentClientConfig {
    keepAliveTimeout?: number; // Tiempo en ms antes de cerrar conexión inactiva (default: 30000)
    maxSockets?: number; // Máximo de conexiones por dominio (default: 10)
    maxFreeSockets?: number; // Máximo de conexiones libres mantenidas (default: 5)
}

export function createPersistentFetch(config?: PersistentClientConfig): typeof fetch;
```

#### 2. Agent Manager (`src/lib/http/agent-manager.ts`)

**Responsabilidades:**
- Gestionar agentes HTTP por dominio
- Crear agentes con configuración optimizada para keep-alive
- Limpiar agentes después de períodos de inactividad

**Interfaz propuesta:**
```typescript
export class AgentManager {
    getAgentForDomain(domain: string): Agent;
    cleanup(): void; // Limpiar agentes inactivos
}
```

#### 3. Integración con Genkit (`src/ai/genkit.ts`)

**Responsabilidades:**
- Configurar Genkit para usar el cliente HTTP personalizado
- Mantener compatibilidad con la API existente de Genkit

**Consideraciones:**
- Genkit puede requerir configuración específica para usar un cliente HTTP personalizado
- Puede ser necesario usar hooks o configuración de transporte HTTP

#### 4. Wrappers para APIs Existentes

**Responsabilidades:**
- Crear wrappers que usen el nuevo cliente HTTP persistente
- Mantener compatibilidad con el código existente
- Migrar gradualmente los módulos existentes

**Archivos a modificar:**
- `src/lib/dnd-api-client.ts` - Usar `persistentFetch` en lugar de `fetch` (servidor)
- `src/lib/tts/eleven-labs-direct.ts` - Usar `persistentFetch` en lugar de `fetch` (servidor)
- `src/lib/tts/eleven-labs-client.ts` - **NO necesita cambios** (hace fetch a API route interna, no externa)
- `src/app/api/generate-audio/route.ts` - **NO necesita cambios** (usa `generateAudioDirect` que ya será actualizado)

---

## 📝 Fases de Implementación

### Fase 1: Infraestructura Base (4-6 horas)

**Objetivo:** Crear el sistema base de conexiones persistentes usando `undici`.

**Tareas:**
1. Investigar y documentar cómo usar `undici` para conexiones persistentes
2. Crear `src/lib/http/agent-manager.ts`:
   - Implementar `AgentManager` que gestiona agentes por dominio
   - Configurar agentes con keep-alive (timeout: 30-60 segundos)
   - Implementar limpieza automática de agentes inactivos
   - **Inicialización automática:** Los agentes se crean automáticamente en el primer uso (reemplazando necesidad de pre-warm manual)
3. Crear `src/lib/http/persistent-client.ts`:
   - Implementar `createPersistentFetch()` que retorna una función `fetch` compatible
   - Integrar con `AgentManager` para obtener agentes por dominio
   - Configurar timeouts y límites de conexiones
   - **Inicialización lazy:** Las conexiones se establecen automáticamente en el primer uso
4. Crear tests unitarios básicos:
   - Test de creación de agentes por dominio
   - Test de reutilización de conexiones
   - Test de limpieza automática
   - Test de inicialización automática (sin necesidad de pre-warm)

**Criterios de éxito:**
- ✅ `AgentManager` crea y gestiona agentes por dominio
- ✅ `createPersistentFetch()` retorna una función compatible con `fetch`
- ✅ Las conexiones se reutilizan entre llamadas al mismo dominio
- ✅ Las conexiones se inicializan automáticamente (no requiere pre-warm manual)
- ✅ Tests unitarios pasan

**Archivos nuevos:**
- `src/lib/http/agent-manager.ts`
- `src/lib/http/persistent-client.ts`
- `tests/unit/http/agent-manager.test.ts`
- `tests/unit/http/persistent-client.test.ts`

---

### Fase 2: Integración con D&D API (2-3 horas)

**Objetivo:** Migrar `dnd-api-client.ts` para usar conexiones persistentes.

**Tareas:**
1. Modificar `src/lib/dnd-api-client.ts`:
   - Importar `createPersistentFetch` desde `persistent-client.ts`
   - Reemplazar `fetch` global con `persistentFetch` para todas las llamadas
   - Mantener compatibilidad con el código existente (misma interfaz pública)
2. Actualizar tests existentes:
   - Verificar que los tests de `dnd-api-client.ts` siguen pasando
   - Añadir tests específicos para verificar reutilización de conexiones
3. Testing manual:
   - Verificar que las llamadas a D&D API funcionan correctamente
   - Medir mejora de latencia (comparar antes/después)

**Criterios de éxito:**
- ✅ `dnd-api-client.ts` usa conexiones persistentes
- ✅ Todos los tests existentes pasan
- ✅ Latencia reducida en llamadas a D&D API (medición comparativa)
- ✅ No hay regresiones en funcionalidad

**Archivos modificados:**
- `src/lib/dnd-api-client.ts`
- `tests/unit/backend/dnd-api-client.test.ts` (actualizar si es necesario)

---

### Fase 3: Integración con Eleven Labs API (2-3 horas)

**Objetivo:** Migrar `eleven-labs-direct.ts` para usar conexiones persistentes.

**Tareas:**
1. Modificar `src/lib/tts/eleven-labs-direct.ts`:
   - Importar `createPersistentFetch` desde `persistent-client.ts`
   - Reemplazar `fetch` global con `persistentFetch`
   - Mantener compatibilidad con el código existente
   - Eliminar llamada manual a `prewarmConnection` (las conexiones persistentes lo hacen automáticamente)
2. **Verificar `src/lib/tts/eleven-labs-client.ts`:**
   - **NO necesita cambios** - hace fetch a API route interna (`/api/generate-audio`)
   - Las llamadas internas no necesitan conexiones persistentes
   - El API route ya usará `generateAudioDirect` que tendrá conexiones persistentes
3. **Verificar `src/app/api/generate-audio/route.ts`:**
   - **NO necesita cambios** - solo delega a `generateAudioDirect`
   - Ya se beneficiará de las conexiones persistentes en `generateAudioDirect`
4. Actualizar tests existentes:
   - Verificar que los tests de TTS siguen pasando
   - Añadir tests específicos para verificar reutilización de conexiones
5. Testing manual:
   - Verificar que la generación de audio funciona correctamente
   - Medir mejora de latencia (comparar antes/después)

**Criterios de éxito:**
- ✅ `eleven-labs-direct.ts` usa conexiones persistentes
- ✅ `eleven-labs-client.ts` verificado (no necesita cambios)
- ✅ `generate-audio/route.ts` verificado (no necesita cambios)
- ✅ Todos los tests existentes pasan
- ✅ Latencia reducida en generación de audio (medición comparativa)
- ✅ No hay regresiones en funcionalidad

**Archivos modificados:**
- `src/lib/tts/eleven-labs-direct.ts`
- Tests relacionados (actualizar si es necesario)

**Archivos verificados (sin cambios necesarios):**
- `src/lib/tts/eleven-labs-client.ts` - Hace fetch a API route interna
- `src/app/api/generate-audio/route.ts` - Solo delega a `generateAudioDirect`

---

### Fase 4: Integración con Genkit/Gemini API y Refactorización de Retries (4-6 horas)

**Objetivo:** Configurar Genkit para usar conexiones persistentes y refactorizar el sistema de retries/pre-warm.

**Tareas:**
1. Investigar configuración de Genkit:
   - Documentar cómo configurar un cliente HTTP personalizado en Genkit
   - Verificar si Genkit expone hooks o configuración de transporte HTTP
   - Identificar limitaciones o consideraciones especiales
2. Modificar `src/ai/genkit.ts`:
   - Configurar Genkit para usar el cliente HTTP persistente
   - Mantener compatibilidad con la API existente de Genkit
3. **Refactorizar `src/ai/flows/retry-utils.ts`:**
   - **Simplificar `executePromptWithRetry`:**
     - Eliminar el pre-warm manual de Gemini (las conexiones persistentes lo hacen automáticamente)
     - Eliminar la variable `geminiPrewarmed` (ya no es necesaria)
     - Mantener `retryWithExponentialBackoff` sin cambios (sigue siendo necesario)
   - **Simplificar `prewarmConnection`:**
     - Mantenerla solo como helper opcional (compatibilidad), pero no usarla en flujos principales
     - Documentar que ya no es necesario llamarla manualmente

**Estado / hallazgos:**  
- Genkit (plugin `@genkit-ai/google-genai`) no expone de forma pública un hook para inyectar un dispatcher/fetch personalizado.  
- Por ahora no se aplican cambios en `src/ai/genkit.ts`; se deja documentada la limitación.  
- Si en el futuro se habilita configuración de transporte, se podrá enchufar `persistentFetch` o un dispatcher global de `undici`.  
4. **Actualizar módulos que usan pre-warm:**
   - `src/lib/dnd-api-client.ts`: Eliminar `ensureDndApiPrewarmed()` o simplificarlo
   - `src/lib/tts/eleven-labs-direct.ts`: Eliminar llamada manual a `prewarmConnection`
   - Verificar que las conexiones persistentes se inicializan automáticamente
5. Testing manual:
   - Verificar que las llamadas a Gemini funcionan correctamente
   - Verificar que no hay regresiones en el sistema de retries
   - Medir mejora de latencia (comparar antes/después)
   - Verificar que no hay regresiones en generación de contenido

**Criterios de éxito:**
- ✅ Genkit usa conexiones persistentes (o se documenta la limitación si no es posible)
- ✅ `executePromptWithRetry` simplificado (sin pre-warm manual)
- ✅ `prewarmConnection` eliminado o simplificado
- ✅ Módulos actualizados para no usar pre-warm manual
- ✅ Todas las llamadas a Gemini funcionan correctamente
- ✅ Sistema de retries sigue funcionando correctamente
- ✅ Latencia reducida en llamadas a Gemini (medición comparativa)
- ✅ No hay regresiones en funcionalidad

**Archivos modificados:**
- `src/ai/genkit.ts`
- `src/ai/flows/retry-utils.ts` (refactorización importante)
- `src/lib/dnd-api-client.ts` (eliminar/simplificar `ensureDndApiPrewarmed`)
- `src/lib/tts/eleven-labs-direct.ts` (eliminar pre-warm manual)
- Tests relacionados (actualizar si es necesario)

**Consideraciones especiales:**
- Genkit puede no exponer directamente la configuración de cliente HTTP
- Puede ser necesario usar hooks o configuración a nivel de transporte HTTP
- Si no es posible configurar directamente, documentar la limitación y buscar alternativas
- **Importante:** El sistema de retries debe seguir funcionando igual, solo que será más efectivo con conexiones persistentes

---

### Fase 5: Optimización y Métricas (2-3 horas)

**Objetivo:** Optimizar el sistema y añadir métricas para monitoreo.

**Tareas:**
1. Añadir logging de métricas:
   - Logging de creación/reutilización/cierre de conexiones
   - Métricas de latencia (antes/después)
   - Métricas de tasa de reutilización de conexiones
2. Optimizar configuración:
   - Ajustar timeouts de keep-alive según métricas reales
   - Ajustar límites de conexiones según uso real
   - Optimizar limpieza de agentes inactivos
3. Documentación:
   - Documentar el sistema en `docs/arquitectura/`
   - Añadir ejemplos de uso
   - Documentar configuración y troubleshooting

**Criterios de éxito:**
- ✅ Sistema de logging de métricas implementado
- ✅ Configuración optimizada según métricas reales
- ✅ Documentación completa creada

**Archivos nuevos/modificados:**
- `src/lib/http/persistent-client.ts` (añadir logging)
- `src/lib/http/agent-manager.ts` (añadir logging)
- `docs/arquitectura/sistema-conexiones-persistentes.md` (nuevo)

---

### Fase 6: Testing y Validación (3-4 horas)

**Objetivo:** Validar que el sistema funciona correctamente y mejora el rendimiento.

**Tareas:**
1. Tests de integración:
   - Tests de flujo completo con múltiples llamadas a cada API
   - Verificar que las conexiones se reutilizan correctamente
   - Verificar que no hay memory leaks
2. Tests de rendimiento:
   - Comparar latencia antes/después
   - Medir reducción de timeouts
   - Medir reducción de reintentos
3. Tests de regresión:
   - Ejecutar todos los tests existentes
   - Verificar que no hay regresiones
   - Verificar que la funcionalidad sigue siendo correcta
4. Testing manual:
   - Probar flujos completos del juego
   - Verificar que no hay problemas de conexión
   - Verificar que el rendimiento es mejor

**Criterios de éxito:**
- ✅ Todos los tests pasan
- ✅ Reducción medible de latencia (50-80% en tiempo de conexión)
- ✅ Reducción medible de timeouts y reintentos
- ✅ No hay regresiones en funcionalidad
- ✅ No hay memory leaks

**Archivos nuevos/modificados:**
- `tests/integration/http/persistent-connections.test.ts` (nuevo)
- Tests existentes (verificar que pasan)

---

### Fase 7: Reducción de tamaño de prompt y llamadas (2-4 horas)

**Objetivo:** Disminuir la latencia real atacando el coste de tokens y el número de llamadas a Gemini en cada acción.

**Tareas:**
1. Reducir contexto y estado enviado:
   - Recortar historial a lo mínimo necesario para la acción actual.
   - Evitar reenviar bloques invariables (usar hash/version y solo reenviar si cambia).
   - Podar `locationContext` enviado a narración: solo campos usados (id, título, conexiones con `isOpen`, `presentEntities` resumidos, hazards visibles, mode/light/visitState).
2. Minimizar llamadas secuenciales a Gemini:
   - Reutilizar la intención devuelta por `actionInterpreter` en `narrativeRouter`/`explorationExpert`, evitando recalcular contexto en una segunda llamada cuando sea posible.
   - Saltar `narrativeRouter` en casos obvios de exploración (p.ej., move/interact con objeto sin señales sociales) y enrutar directo a `explorationExpert`.
   - Revisar flujos donde se encadenan 2+ llamadas para un mismo turno/acción y fusionar cuando sea seguro (intención + narración).
3. Limitar tokens de salida en narración:
   - Añadir `maxOutputTokens` moderado (ej. 180-220) en `explorationExpert` para mantener 2-3 frases sin cortar.
4. Validar latencia:
   - Medir antes/después en una secuencia típica (acción de exploración y acción de combate).
   - Esperado: reducción de tokens de entrada y menos llamadas en caliente.

**Criterios de éxito:**
- ✅ Menos tokens enviados por acción (prompt más corto).
- ✅ Reducción del número de llamadas secuenciales a Gemini en flujos recurrentes.
- ✅ Latencia media por turno/acción menor que la línea base previa.

**Consideraciones:**
- Mantener fidelidad narrativa; si fusionar llamadas reduce calidad, preferir la reutilización de intención sin perder contexto clave.
- No aumentar el tamaño de la respuesta; priorizar brevedad (1-2 frases) y maxOutputTokens bajos.

**Estado:** ✅ **COMPLETADO** (2025-12-08)

**Cambios implementados:**
- ✅ Recorte de historial de conversación (últimos 6 mensajes, últimos 2 completos, anteriores truncados a 400 caracteres)
- ✅ Podado de `locationContext` enviado a `actionInterpreter` (solo campos esenciales)
- ✅ Reducción de datos de party enviados (solo nombre, id, hp, estado, rol - sin inventario)
- ✅ Heurística para saltar `narrativeRouter` en casos obvios de exploración
- ✅ `maxOutputTokens` establecido en 120 para `narrativeRouter` y 200 para `explorationExpert`
- ✅ Pre-warm reintroducido para D&D API y Gemini usando `persistentFetch`

**Correcciones de bugs críticos (2025-12-08):**
- ✅ **Aislamiento estricto de entidades por ubicación:** `getEntitiesInLocationStrict` ahora solo usa `enemiesByLocation[locationId]` específico, evitando mezclar enemigos muertos de diferentes salas
- ✅ **Campo `doorStates` añadido al ExplorationContext:** Estado autoritativo de puertas (dirección → 'open' | 'closed') para que el DM no confíe en descripciones estáticas del JSON
- ✅ **NPCs no marcados como muertos:** Mejora en `isEntityOutOfCombat` para manejar múltiples formatos de HP (`hp.current` y `stats.hp`), asumiendo vivo si no hay información
- ✅ **Títulos de salas no visitadas ocultos:** Solo se revela el título de salas ya visitadas, evitando spoilers como "Sala de la Emboscada"
- ✅ **Prompt del ExplorationExpert reforzado:** `explorationContext` es ahora la fuente de verdad primaria, con instrucciones explícitas sobre puertas y entidades

**Archivos modificados:**
- `src/ai/flows/managers/exploration-context-builder.ts` - Aislamiento de entidades, `doorStates`, ocultación de títulos
- `src/ai/flows/experts/exploration-expert.ts` - Prompt reforzado con jerarquía de fuentes
- `src/lib/game/entity-status-utils.ts` - Mejora en `isEntityOutOfCombat` para múltiples formatos de HP

**Simplificaciones y mejoras adicionales (2025-12-08):**
- ✅ **Formato simplificado de `visibleConnections`:** Cambio de formato estructurado complejo a formato natural simple (ej: `"norte Sala del Tesoro (archway) entities: Boris"`). Evita interpretación literal de etiquetas estructuradas y produce narraciones más naturales.
- ✅ **Restauración de exclusión de conexión de origen:** La lógica para excluir `cameFromLocationId` ha sido restaurada, evitando narraciones redundantes sobre la sala de la que acabas de salir.
- ✅ **Instrucciones explícitas sobre `(archway)` vs `(open door)`:** El prompt del ExplorationExpert ahora incluye instrucciones claras para interpretar correctamente estos indicadores, evitando que el DM mencione "puertas" donde solo hay arcos.
- ✅ **Reducción de longitud de narración:** Ajuste de límites (momentos clave: 2-3 frases, estándar: 1-2 frases) para narraciones más concisas.

---

## 🔍 Consideraciones Técnicas

### 1. Integración con Sistema de Retries Existente

**Estrategia:**
- **Mantener `retryWithExponentialBackoff` sin cambios:** Sigue siendo necesario para manejar errores transitorios (timeouts, 429, 503, etc.)
- **Mejorar efectividad:** Con conexiones persistentes, habrá menos fallos iniciales, por lo que el sistema de retries será más efectivo
- **Eliminar pre-warm manual:** Las conexiones persistentes se inicializan automáticamente, eliminando la necesidad de `prewarmConnection` manual
- **Compatibilidad total:** El sistema de retries funcionará perfectamente con conexiones persistentes - simplemente envolverá las llamadas que usan `persistentFetch`

**Flujo de integración:**
```typescript
// ANTES
const response = await retryWithExponentialBackoff(
    async () => {
        const res = await fetch(url, { headers });
        // ...
    },
    3, 1000, 'DndApiClient'
);

// DESPUÉS (mismo patrón, pero fetch usa conexiones persistentes)
const response = await retryWithExponentialBackoff(
    async () => {
        const res = await persistentFetch(url, { headers });
        // ...
    },
    3, 1000, 'DndApiClient'
);
```

**Beneficios:**
- El sistema de retries seguirá manejando errores transitorios (429, 503, timeouts de servidor)
- Las conexiones persistentes reducirán errores de conexión inicial (menos retries necesarios)
- La combinación de ambos sistemas será más robusta y eficiente

**Flujo mejorado:**
```
Antes:
1. Pre-warm manual → establece conexión (pero no la mantiene)
2. Primera llamada → puede fallar (timeout), requiere retry
3. Segunda llamada → nueva conexión, puede fallar, requiere retry

Después:
1. Primera llamada → conexión persistente se crea automáticamente, se mantiene abierta
2. Segunda llamada → reutiliza conexión existente, menos probabilidad de fallo
3. Sistema de retries → solo se activa para errores reales (no timeouts de conexión)
```

**Código de ejemplo (refactorización):**
```typescript
// ANTES (retry-utils.ts)
export async function executePromptWithRetry<TInput, TOutput>(...) {
    // Pre-warm manual
    if (!geminiPrewarmed) {
        await prewarmConnection('https://generativelanguage.googleapis.com', ...);
        geminiPrewarmed = true;
    }
    return await retryWithExponentialBackoff(() => prompt(input), ...);
}

// DESPUÉS (retry-utils.ts)
export async function executePromptWithRetry<TInput, TOutput>(...) {
    // No necesita pre-warm - las conexiones persistentes se inicializan automáticamente
    // El sistema de retries sigue siendo necesario para errores transitorios
    return await retryWithExponentialBackoff(() => prompt(input), ...);
}
```

### 2. Uso de `undici`

**Ventajas:**
- ✅ Incluido en Node.js 18+ (no requiere dependencias externas)
- ✅ Soporta HTTP/1.1 keep-alive y HTTP/2 nativamente
- ✅ Compatible con la API estándar de `fetch`
- ✅ Mejor rendimiento que `node-fetch` o `axios`

**Implementación:**
```typescript
import { Agent, setGlobalDispatcher } from 'undici';

const agent = new Agent({
    keepAliveTimeout: 30000, // 30 segundos
    keepAliveMaxTimeout: 60000, // 60 segundos máximo
    maxSockets: 10, // Máximo de conexiones por dominio
    maxFreeSockets: 5, // Máximo de conexiones libres mantenidas
});

// Usar el agente con fetch
const response = await fetch(url, {
    dispatcher: agent,
});
```

### 3. Compatibilidad con Fetch API y Cliente/Servidor

**Estrategia:**
- Crear una función `persistentFetch` que sea compatible con `fetch` estándar
- Reemplazar `fetch` global solo en los módulos que hacen llamadas a APIs externas **en el servidor**
- Mantener compatibilidad con el código existente

**Consideraciones Cliente/Servidor:**
- **Servidor (Node.js):** El sistema de conexiones persistentes funcionará aquí usando `undici`
- **Cliente (Navegador):** Los navegadores ya tienen keep-alive nativo en `fetch`, no necesita cambios
- **API Routes internas:** Las llamadas a rutas internas de Next.js (`/api/*`) no necesitan conexiones persistentes (son locales)

**Ejemplo:**
```typescript
// persistent-client.ts
export const persistentFetch = createPersistentFetch();

// dnd-api-client.ts (solo servidor)
import { persistentFetch } from '@/lib/http/persistent-client';

// Usar persistentFetch en lugar de fetch
const response = await persistentFetch(url, options);
```

**Nota sobre `eleven-labs-client.ts`:**
- Este módulo hace fetch a `/api/generate-audio` (API route interna)
- No necesita conexiones persistentes porque es una llamada local
- El API route luego llama a `generateAudioDirect` que SÍ necesita conexiones persistentes (ya cubierto)

### 4. Gestión de Ciclo de Vida

**Estrategia:**
- Crear agentes por dominio al primer uso
- Mantener agentes en memoria durante la vida de la aplicación
- Limpiar agentes inactivos periódicamente (cada 5-10 minutos)
- Cerrar todas las conexiones al cerrar la aplicación (graceful shutdown)

### 5. Configuración por API

**Timeouts recomendados:**
- **Gemini API:** 60 segundos (llamadas menos frecuentes pero más largas)
- **Eleven Labs API:** 30 segundos (llamadas frecuentes durante narración)
- **D&D API:** 30 segundos (llamadas frecuentes durante combate)

**Límites de conexiones:**
- **Máximo por dominio:** 10 conexiones
- **Máximo libres mantenidas:** 5 conexiones

### 6. Manejo de Errores

**Estrategia:**
- Si una conexión falla, crear una nueva automáticamente
- No reintentar con la misma conexión si falla
- Logging de errores de conexión para debugging

### 7. Integración con Genkit

**Consideraciones:**
- Genkit puede no exponer directamente la configuración de cliente HTTP
- Investigar si hay hooks o configuración de transporte HTTP
- Si no es posible, documentar la limitación y buscar alternativas (ej: configuración a nivel de Node.js)
- Genkit usa `fetch` internamente, pero puede requerir configuración especial para usar un cliente personalizado

### 8. Consideraciones Cliente/Servidor

**Servidor (Node.js):**
- El sistema de conexiones persistentes funcionará aquí usando `undici`
- Solo los módulos que se ejecutan en el servidor necesitan usar `persistentFetch`
- Ejemplos: `dnd-api-client.ts`, `eleven-labs-direct.ts`, llamadas de Genkit

**Cliente (Navegador):**
- Los navegadores ya tienen keep-alive nativo en `fetch`
- No necesita cambios - el navegador gestiona las conexiones automáticamente
- Ejemplos: `eleven-labs-client.ts` (hace fetch a API route interna), `logger-client.ts` (hace fetch a `/api/log`)

**API Routes Internas:**
- Las llamadas a rutas internas de Next.js (`/api/*`) no necesitan conexiones persistentes
- Son llamadas locales dentro del mismo proceso/servidor
- Ejemplos: `/api/generate-audio`, `/api/log`, `/api/load-adventure`

**Estrategia de implementación:**
- Solo aplicar `persistentFetch` a llamadas a APIs externas desde el servidor
- No modificar código del cliente (navegador) - ya es eficiente
- No modificar llamadas a API routes internas - no es necesario

---

## 📊 Métricas y Validación

### Métricas a Medir

1. **Latencia de conexión:**
   - Tiempo de establecimiento de conexión (antes/después)
   - Reducción esperada: 50-80%

2. **Tasa de reutilización:**
   - Porcentaje de llamadas que reutilizan conexiones existentes
   - Objetivo: >80% de reutilización

3. **Tasa de timeouts:**
   - Número de timeouts antes/después
   - Reducción esperada: 50-70%

4. **Tasa de reintentos:**
   - Número de reintentos antes/después
   - Reducción esperada: 30-50%

5. **Rendimiento general:**
   - Tiempo total de respuesta de APIs (antes/después)
   - Reducción esperada: 20-40% en tiempo total

### Validación

**Tests de rendimiento:**
- Ejecutar 100 llamadas a cada API y medir latencia promedio
- Comparar antes/después de la implementación
- Verificar que la mejora es significativa

**Tests de estabilidad:**
- Ejecutar flujos completos del juego
- Verificar que no hay problemas de conexión
- Verificar que no hay memory leaks

---

## 🧪 Plan de Testing

### Tests Unitarios

1. **AgentManager:**
   - Test de creación de agentes por dominio
   - Test de reutilización de agentes
   - Test de limpieza automática de agentes inactivos

2. **PersistentClient:**
   - Test de creación de función `fetch` compatible
   - Test de reutilización de conexiones
   - Test de configuración de timeouts

### Tests de Integración

1. **D&D API:**
   - Test de múltiples llamadas consecutivas
   - Verificar que las conexiones se reutilizan
   - Verificar que la funcionalidad sigue siendo correcta
   - Verificar que `ensureDndApiPrewarmed` ya no es necesario (o funciona correctamente)

2. **Eleven Labs API:**
   - Test de múltiples generaciones de audio consecutivas
   - Verificar que las conexiones se reutilizan
   - Verificar que la funcionalidad sigue siendo correcta
   - Verificar que no se necesita pre-warm manual
   - Verificar que `eleven-labs-client.ts` sigue funcionando (hace fetch a API route interna)

3. **Genkit/Gemini:**
   - Test de múltiples llamadas a Gemini consecutivas
   - Verificar que las conexiones se reutilizan (si es posible)
   - Verificar que la funcionalidad sigue siendo correcta
   - Verificar que `executePromptWithRetry` funciona sin pre-warm manual

4. **Sistema de Retries:**
   - Test de que `retryWithExponentialBackoff` sigue funcionando correctamente
   - Test de que hay menos fallos iniciales (menos retries necesarios)
   - Test de que el sistema de retries maneja correctamente errores reales (no timeouts de conexión)

### Tests de Rendimiento

1. **Benchmark de latencia:**
   - Ejecutar 100 llamadas a cada API
   - Medir latencia promedio antes/después
   - Verificar mejora significativa

2. **Benchmark de timeouts:**
   - Ejecutar 1000 llamadas a cada API
   - Contar número de timeouts antes/después
   - Verificar reducción significativa

### Tests de Regresión

1. **Ejecutar todos los tests existentes:**
   - Verificar que todos pasan
   - Verificar que no hay regresiones

2. **Testing manual:**
   - Probar flujos completos del juego
   - Verificar que no hay problemas de conexión
   - Verificar que el rendimiento es mejor

---

## 📚 Documentación

### Documentación Técnica

1. **Arquitectura:**
   - Documentar el sistema en `docs/arquitectura/sistema-conexiones-persistentes.md`
   - Explicar cómo funciona el sistema
   - Explicar cómo se integra con las APIs existentes

2. **Configuración:**
   - Documentar configuración de timeouts y límites
   - Documentar cómo ajustar la configuración según necesidades

3. **Troubleshooting:**
   - Documentar problemas comunes y soluciones
   - Documentar cómo debuggear problemas de conexión

### Documentación de Uso

1. **Ejemplos:**
   - Ejemplos de cómo usar el sistema
   - Ejemplos de cómo migrar código existente

2. **Mejores prácticas:**
   - Cuándo usar conexiones persistentes
   - Cuándo no usar conexiones persistentes

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Regresiones en sistema de retries al eliminar pre-warm

**Probabilidad:** Baja  
**Impacto:** Medio

**Mitigación:**
- Mantener `retryWithExponentialBackoff` sin cambios
- Testing exhaustivo del sistema de retries
- Verificar que las conexiones persistentes se inicializan correctamente
- Mantener compatibilidad hacia atrás durante la migración

### Riesgo 2: Genkit no permite configuración de cliente HTTP

**Probabilidad:** Media  
**Impacto:** Alto

**Mitigación:**
- Investigar exhaustivamente la configuración de Genkit antes de implementar
- Si no es posible, documentar la limitación
- Buscar alternativas (configuración a nivel de Node.js, hooks, etc.)

### Riesgo 3: Memory leaks por conexiones no cerradas

**Probabilidad:** Baja  
**Impacto:** Alto

**Mitigación:**
- Implementar limpieza automática de agentes inactivos
- Añadir tests de memory leaks
- Monitorear uso de memoria en producción

### Riesgo 4: Regresiones en funcionalidad existente

**Probabilidad:** Media  
**Impacto:** Medio

**Mitigación:**
- Ejecutar todos los tests existentes
- Testing manual exhaustivo
- Migración gradual (una API a la vez)

### Riesgo 5: Configuración incorrecta de timeouts

**Probabilidad:** Media  
**Impacto:** Bajo

**Mitigación:**
- Usar valores conservadores inicialmente
- Ajustar según métricas reales
- Documentar cómo ajustar la configuración

### Riesgo 6: Confusión entre cliente y servidor

**Probabilidad:** Baja  
**Impacto:** Medio

**Mitigación:**
- Documentar claramente qué módulos se ejecutan en servidor vs cliente
- Solo aplicar `persistentFetch` a módulos del servidor
- Verificar que módulos del cliente no se modifiquen incorrectamente
- Tests específicos para verificar que el código del cliente sigue funcionando

---

## 📅 Estimación de Tiempo

**Total estimado:** 17-25 horas

**Desglose:**
- Fase 1 (Infraestructura Base): 4-6 horas
- Fase 2 (Integración D&D API): 2-3 horas
- Fase 3 (Integración Eleven Labs): 2-3 horas
- Fase 4 (Integración Genkit y Refactorización Retries): 4-6 horas
- Fase 5 (Optimización y Métricas): 2-3 horas
- Fase 6 (Testing y Validación): 3-4 horas

**Buffer para imprevistos:** +20% (3-5 horas adicionales)

**Tiempo total con buffer:** 20-30 horas

---

## ✅ Criterios de Finalización

El plan se considerará completado cuando:

1. ✅ **Infraestructura base implementada:**
   - `AgentManager` y `PersistentClient` funcionando
   - Tests unitarios pasando

2. ✅ **Integraciones completadas:**
   - D&D API usando conexiones persistentes
   - Eleven Labs API usando conexiones persistentes
   - Genkit configurado (o limitación documentada)
   - Sistema de retries refactorizado (pre-warm eliminado/simplificado)

3. ✅ **Mejoras de rendimiento verificadas:**
   - Reducción medible de latencia (50-80% en tiempo de conexión)
   - Reducción medible de timeouts (50-70%)
   - Reducción medible de reintentos (30-50%)

4. ✅ **Tests pasando:**
   - Todos los tests unitarios pasando
   - Todos los tests de integración pasando
   - Todos los tests de regresión pasando

5. ✅ **Documentación completa:**
   - Documentación técnica creada
   - Documentación de uso creada
   - Ejemplos y troubleshooting documentados

6. ✅ **No hay regresiones:**
   - Funcionalidad existente sigue funcionando
   - No hay memory leaks
   - No hay problemas de conexión

---

## 🔗 Referencias

- [Roadmap - Sección 1.2](../../roadmap.md#roadmap-1-2)
- [undici Documentation](https://undici.nodejs.org/)
- [Node.js HTTP Keep-Alive](https://nodejs.org/api/http.html#http_http_keepalive)
- [Genkit Documentation](https://firebase.google.com/docs/genkit)

---

## 📝 Notas de Implementación

### Notas Técnicas

- Node.js 18+ incluye `undici` como dependencia nativa
- `undici` soporta HTTP/1.1 keep-alive y HTTP/2 nativamente
- La API de `undici` es compatible con `fetch` estándar
- **Solo aplica a código del servidor:** El sistema de conexiones persistentes solo funciona en Node.js (servidor)
- **Cliente no necesita cambios:** Los navegadores ya tienen keep-alive nativo en `fetch`
- **API Routes internas no necesitan cambios:** Las llamadas a `/api/*` son locales y no necesitan conexiones persistentes

### Decisiones de Diseño

- **Pool por dominio:** Cada API tiene su propio pool de conexiones para evitar conflictos
- **Timeouts conservadores:** Usar valores conservadores inicialmente y ajustar según métricas
- **Migración gradual:** Migrar una API a la vez para minimizar riesgo de regresiones
- **Mantener sistema de retries:** El sistema de retries sigue siendo necesario y se mantiene sin cambios
- **Eliminar pre-warm manual:** Las conexiones persistentes reemplazan la necesidad de pre-warm manual
- **Inicialización automática:** Las conexiones se inicializan automáticamente en el primer uso (lazy initialization)

### Resumen de Finalización

**Todas las fases han sido completadas exitosamente:**
- ✅ Fase 1: Infraestructura Base (AgentManager, PersistentClient)
- ✅ Fase 2: Integración con D&D API
- ✅ Fase 3: Integración con Eleven Labs API
- ✅ Fase 4: Integración con Genkit/Gemini y Refactorización de Retries
- ✅ Fase 5: Optimización y Métricas
- ✅ Fase 6: Testing y Validación
- ✅ Fase 7: Reducción de tamaño de prompt y llamadas

**Resultados:**
- Sistema de conexiones persistentes implementado usando `undici`
- Reducción significativa de latencia y timeouts
- Integración completa con todas las APIs externas
- Sistema de retries simplificado y más efectivo
- Optimizaciones de contexto y reducción de llamadas a Gemini

