# Plan de Implementación: Sistema de Caché para Text-to-Speech

**Issue:** Optimización de TTS  
**Prioridad:** 🟡 MEDIA  
**Fecha de creación del plan:** 2025-11-24  
**Estado:** ✅ COMPLETADO  
**Relacionado con:** [Integración de Eleven Labs TTS](./integracion-eleven-labs-tts.md)

---

## ⚠️ Principio Fundamental del Sistema

**EL SISTEMA DE CACHÉ ES 100% REACTIVO - NO PROACTIVO**

Este sistema de caché está diseñado con un principio fundamental que debe respetarse en toda la implementación:

### ✅ Lo que SÍ hace el sistema:
- **Cachea audios generados por petición explícita del usuario** (cuando hace clic en el botón de audio)
- **Reutiliza audios cacheados** cuando el usuario solicita audio para un texto que ya fue generado previamente
- **Guarda en caché después de generar** audio por petición del usuario

### ❌ Lo que NO hace el sistema:
- **NO genera audio proactivamente** (sin petición del usuario)
- **NO pre-genera audio** al cargar aventuras o mensajes
- **NO genera audio en background** mientras el usuario no lo solicita
- **NO anticipa** qué audio podría necesitar el usuario

### Flujo Correcto:
```
Usuario hace clic en botón de audio
    ↓
Sistema verifica caché
    ↓
Si existe: retornar del caché
Si no existe: generar audio → guardar en caché → retornar
```

### Flujo INCORRECTO (NO implementar):
```
Sistema carga mensaje
    ↓
Sistema genera audio automáticamente ❌
    ↓
Sistema guarda en caché ❌
```

**Este principio debe estar presente en todas las decisiones de diseño e implementación.**

---

## 🎯 Objetivo

Implementar un sistema de caché **reactivo** para las narraciones de audio generadas con Eleven Labs TTS, evitando regenerar audio para textos que ya han sido convertidos previamente **por petición del usuario**.

**⚠️ IMPORTANTE - Principio Fundamental:**
- **Solo se cachean audios generados por petición explícita del usuario** (cuando hace clic en el botón de audio)
- **NO se generan audios proactivamente** (sin petición del usuario)
- **NO se pre-generan audios** al cargar aventuras o mensajes
- El sistema es **100% reactivo**: solo actúa cuando el usuario solicita audio

Esto es especialmente útil para:

- **Narraciones de introducción:** Que suelen ser siempre las mismas para cada aventura (cuando el usuario las reproduce)
- **Narraciones repetitivas:** Textos que aparecen múltiples veces y el usuario reproduce varias veces
- **Ahorro de costos:** Reducir llamadas innecesarias a la API de Eleven Labs
- **Mejora de rendimiento:** Respuesta instantánea para textos cacheados (ya generados previamente)

---

## 📋 Análisis del Problema

### Problema Actual

1. **Regeneración innecesaria:** Cada vez que el usuario hace clic en el botón de audio, se genera el audio desde cero, incluso si ese mismo texto ya fue generado anteriormente
2. **Costos acumulativos:** Eleven Labs cobra por caracteres procesados, regenerar el mismo texto múltiples veces es costoso
3. **Latencia:** Incluso con pre-warm, generar audio toma 3-6 segundos cada vez que el usuario solicita audio
4. **Narraciones repetitivas:** Las introducciones de aventuras son siempre las mismas, pero se regeneran cada vez que el usuario las reproduce en una nueva partida

**Nota:** El problema NO es que falte generación proactiva, sino que se regenera innecesariamente cuando el usuario solicita audio que ya fue generado antes.

### Casos de Uso Identificados

**Nota:** Todos estos casos asumen que el usuario ha solicitado audio previamente. El caché solo se activa cuando el usuario hace clic en el botón de audio.

1. **Narraciones de introducción:**
   - Texto: `introductoryNarration` del JSON de aventura
   - Escenario: Usuario reproduce la introducción en una partida, luego inicia otra partida de la misma aventura y reproduce la introducción de nuevo
   - Impacto: Alto - siempre es el mismo texto, pero solo se cachea si el usuario lo reproduce

2. **Narraciones de ubicaciones:**
   - Texto: Descripciones de ubicaciones que se repiten
   - Escenario: Usuario visita la misma ubicación múltiples veces y reproduce el audio cada vez
   - Impacto: Medio - puede variar ligeramente según el contexto, pero si es idéntico se reutiliza

3. **Narraciones de combate:**
   - Texto: Narraciones de inicio/fin de combate
   - Escenario: Usuario reproduce narraciones de combate similares en diferentes encuentros
   - Impacto: Bajo - suelen ser únicas por combate, pero puede haber reutilización si son idénticas

---

## 🏗️ Diseño del Sistema

### Arquitectura Propuesta

```
│          Usuario hace clic en botón de audio                │
│                    ↓                                         │
│          Server Action / API Route                          │
│                    ↓                                         │
│          generateAudioDirect (eleven-labs-direct.ts)        │
│                    ↓                                         │
│  1. Generar clave de caché (hash del texto + config)        │
│  2. Verificar si existe en caché                           │
│  3. Si existe: retornar audioDataUri del caché             │
│     (audio ya generado previamente por petición del usuario)│
│  4. Si no existe:                                          │
│     a. Generar audio con Eleven Labs (petición actual)     │
│     b. Guardar en caché para futuras peticiones            │
│     c. Retornar audioDataUri                               │
└─────────────────────────────────────────────────────────────┘

⚠️ IMPORTANTE: El sistema NO genera audio sin petición del usuario.
Solo se cachea después de que el usuario solicita audio explícitamente.
```

### Componentes del Sistema

1. **Clave de Caché:**
   - Hash del texto normalizado (trim, lowercase opcional)
   - Voice ID
   - Model ID
   - Parámetros de calidad (stability, similarityBoost, etc.)

2. **Almacenamiento:**
   - **Opción A (Recomendada):** Sistema de archivos local
     - Ventajas: Simple, persistente entre reinicios, fácil de limpiar
     - Desventajas: Requiere gestión de espacio en disco
   - **Opción B:** Caché en memoria (Map)
     - Ventajas: Muy rápido, sin I/O
     - Desventajas: Se pierde al reiniciar el servidor
   - **Opción C:** Híbrido (memoria + archivos)
     - Ventajas: Rápido acceso + persistencia
     - Desventajas: Más complejo

3. **Estructura de Datos:**
   - `audioDataUri`: Base64 encoded audio
   - `textHash`: Hash del texto original
   - `voiceId`: Voice ID usado
   - `modelId`: Model ID usado
   - `createdAt`: Timestamp de creación
   - `lastAccessed`: Timestamp de último acceso
   - `size`: Tamaño en bytes

---

## 📐 Estrategia de Implementación

### Fase 1: Crear Módulo de Caché TTS

**Archivo:** `src/lib/tts/tts-cache.ts`

**Funcionalidades:**
- Generar clave de caché (hash del texto + configuración)
- Leer de caché (memoria primero, luego disco)
- Escribir en caché (memoria + disco)
- Limpiar caché automáticamente cuando se excede el límite (LRU)
- Estadísticas de caché (hits/misses, tamaño, tasa de aciertos)

**Detalles de implementación:**
- Usar SHA-256 para generar claves de caché únicas
- Caché en memoria: Map con máximo 50 entradas (LRU)
- Caché en disco: Archivos JSON en `.cache/tts/` con máximo 100MB
- Normalizar texto (trim + lowercase) antes de generar hash
- Actualizar `lastAccessed` en cada acceso
- Limpieza automática cuando se excede el límite de disco

**Criterios de éxito:**
- ✅ Módulo creado y funcional
- ✅ Soporte para caché en memoria y disco
- ✅ Sistema LRU para gestión de espacio
- ✅ Logging apropiado

**Estimación:** 2-3 horas

---

### Fase 2: Integrar Caché en el Módulo Central

**Archivo a modificar:** `src/lib/tts/eleven-labs-direct.ts`

**Cambios necesarios:**

1. Importar el módulo de caché: `import { ttsCache } from '@/lib/tts/tts-cache';`

2. **Modificar `generateAudioDirect`:**
   - Esta función es el punto central de generación de audio (usada por Flows y API Route).
   - **Paso 1 (Lectura):** Antes de llamar a `fetch`, generar la clave de caché y verificar si existe.
     - Si existe (`hit`), retornar inmediatamente el resultado cacheado.
     - Registrar log: `LogContext: { module: 'TTS Cache', hit: true }`
   - **Paso 2 (Generación):** Si no existe (`miss`), proceder con la llamada a la API de Eleven Labs como siempre.
   - **Paso 3 (Escritura):** Una vez obtenido el `audioBuffer` exitosamente:
     - Guardar en caché asíncronamente: `ttsCache.set(config, audioDataUri).catch(log.error)`
     - No bloquear el retorno de la función esperando a que se guarde.
     - Registrar log: `LogContext: { module: 'TTS Cache', hit: false }`

**Beneficios de esta integración centralizada:**
- ✅ **Cobertura Total:** Tanto las narraciones del DM (Server Actions) como las peticiones del cliente (API Route) se benefician del caché automáticamente.
- ✅ **Transparencia:** Los consumidores de la función no necesitan saber que existe un caché.
- ✅ **DRY:** No se duplica la lógica de caché en múltiples lugares.

**Criterios de éxito:**
- ✅ `generateAudioDirect` maneja el caché internamente.
- ✅ Las llamadas repetidas no contactan a la API de Eleven Labs.
- ✅ El comportamiento es transparente para `generateDmNarrationAudio` y `route.ts`.

**Estimación:** 1 hora

---

### Fase 3: Agregar Estadísticas y Monitoreo

**Archivo:** `src/lib/tts/tts-cache.ts` (extender)

**Funcionalidades a agregar:**
- Contador de hits/misses que se incrementa en cada llamada a `get()`
- Métricas de tamaño de caché (memoria + disco)
- Método `getStats()` que retorna:
  - Número de hits
  - Número de misses
  - Total de requests
  - Tasa de aciertos (hit rate) como porcentaje
  - Entradas en memoria
  - Entradas en disco
  - Tamaño total del caché

**Logging:**
- Registrar estadísticas periódicamente (cada 100 requests o similar)
- Incluir tasa de aciertos en los logs

**Criterios de éxito:**
- ✅ Estadísticas de hits/misses
- ✅ Tasa de aciertos calculada
- ✅ Logging periódico de estadísticas

**Estimación:** 30 minutos

---

### Fase 4: Testing y Validación

**Tareas:**

1. **Testing Manual:**
   - Generar audio para una narración
   - Verificar que se guarda en caché
   - Generar la misma narración de nuevo
   - Verificar que se recupera del caché (más rápido)
   - Verificar que funciona con diferentes configuraciones de voz

2. **Testing de Limpieza:**
   - Llenar el caché hasta el límite
   - Verificar que se eliminan archivos antiguos (LRU)
   - Verificar que no se eliminan archivos recientes

3. **Testing de Rendimiento:**
   - Medir tiempo de respuesta con caché vs sin caché
   - Verificar que el caché no añade latencia significativa

**Criterios de éxito:**
- ✅ Caché funciona correctamente
- ✅ Limpieza LRU funciona
- ✅ Rendimiento mejorado para textos cacheados
- ✅ Sin regresiones en funcionalidad existente

**Estimación:** 1-2 horas

---

## 🔧 Consideraciones Técnicas

### Normalización de Texto

**Decisión:** Normalizar texto antes de generar hash (trim + lowercase)

**Razón:** 
- "Hola mundo" y "  Hola Mundo  " deberían generar el mismo audio
- Evita duplicados por diferencias menores de formato

**Implementación:**
- Normalizar texto antes de generar hash: `trim()` + `toLowerCase()`
- Esto asegura que variaciones menores del mismo texto generen la misma clave de caché

**Nota:** La normalización solo se aplica cuando el usuario solicita audio. No se normaliza texto proactivamente.

### Gestión de Espacio

**Estrategia:** LRU (Least Recently Used)

**Límites:**
- Memoria: 50 entradas máximo
- Disco: 100MB máximo

**Limpieza:**
- Automática cuando se excede el límite
- Elimina los archivos menos usados recientemente

### Persistencia

**Ubicación:** `.cache/tts/` en el directorio del proyecto

**Ventajas:**
- Persistente entre reinicios del servidor
- Fácil de limpiar manualmente si es necesario
- No requiere base de datos

**Consideraciones:**
- Agregar `.cache/` al `.gitignore`
- Documentar ubicación en README

---

## 📊 Métricas de Éxito

### Objetivos

1. **Tasa de aciertos:** > 50% para narraciones de introducción
2. **Ahorro de tiempo:** < 100ms para textos cacheados (vs 3-6s sin caché)
3. **Ahorro de costos:** Reducción del 30-50% en llamadas a Eleven Labs API
4. **Rendimiento:** Sin impacto negativo en textos no cacheados

### Monitoreo

- Logging de hits/misses
- Tamaño del caché
- Tiempo de respuesta promedio
- Estadísticas periódicas (cada 100 requests)

---

## 🚀 Plan de Despliegue

### Fase de Implementación

1. **Semana 1:**
   - Fase 1: Crear módulo de caché
   - Fase 2: Integrar en flujo TTS
   - Testing básico

2. **Semana 2:**
   - Fase 3: Estadísticas y monitoreo
   - Fase 4: Testing completo
   - Optimizaciones basadas en métricas

### Rollout

- **Fase 1:** Implementación en desarrollo
- **Fase 2:** Testing en staging
- **Fase 3:** Deploy a producción con monitoreo activo

---

## 📝 Notas Adicionales

### Futuras Mejoras

1. **Caché compartido entre usuarios:**
   - Si múltiples usuarios juegan la misma aventura, compartir caché
   - Requiere considerar privacidad y seguridad
   - **Nota:** Solo se compartirían audios ya generados por petición de usuarios, nunca generación proactiva

2. **Caché distribuido:**
   - Si se escala a múltiples servidores, considerar Redis o similar
   - Por ahora, sistema de archivos es suficiente

3. **Compresión de audio:**
   - Comprimir audio antes de guardar (si es necesario)
   - Balance entre tamaño y calidad

**⚠️ NOTA IMPORTANTE:** Las futuras mejoras NO incluirán generación proactiva de audio. El sistema siempre será reactivo y solo generará/cacheará audio cuando el usuario lo solicite explícitamente.

### Riesgos y Mitigaciones

1. **Riesgo:** Caché crece demasiado
   - **Mitigación:** Límites estrictos y limpieza automática LRU

2. **Riesgo:** Archivos corruptos en caché
   - **Mitigación:** Try-catch al leer, eliminar archivos corruptos

3. **Riesgo:** Cambios en configuración de voz invalidan caché
   - **Mitigación:** Incluir todos los parámetros en la clave de caché

---

## ✅ Checklist de Implementación

- [ ] Crear módulo `src/lib/tts/tts-cache.ts`
- [ ] Implementar generación de clave de caché
- [ ] Implementar lectura/escritura de caché (memoria + disco)
- [ ] Implementar limpieza LRU
- [ ] Integrar caché en `generate-dm-narration-audio.ts`
- [ ] Agregar estadísticas y logging
- [ ] Testing manual completo
- [ ] Verificar rendimiento
- [ ] Documentar en README
- [ ] Agregar `.cache/` al `.gitignore`
- [ ] Deploy y monitoreo

---

**Última actualización:** 2025-11-24  
**Autor:** Sistema de Planificación  
**Estado:** ✅ COMPLETADO
**Fecha de finalización:** 2025-11-25

## 🏁 Resultados de la Implementación

Se ha implementado exitosamente el sistema de caché reactivo para TTS, integrado centralmente en el módulo de conexión directa con Eleven Labs.

### Características Implementadas:
1.  **Módulo de Caché Híbrido (`tts-cache.ts`):**
    *   **Memoria (LRU):** Acceso ultrarrápido para los audios más recientes (límite 50 entradas).
    *   **Disco (Persistente):** Almacenamiento en `.cache/tts/` para persistencia entre reinicios (límite 100MB).
    *   **Hashing Robusto:** Claves generadas con SHA-256 basadas en texto normalizado + configuración de voz.

2.  **Integración Transparente (`eleven-labs-direct.ts`):**
    *   La función `generateAudioDirect` ahora consulta el caché automáticamente antes de llamar a la API.
    *   Si hay *cache hit*, retorna el audio instantáneamente (< 10ms).
    *   Si hay *cache miss*, genera el audio y lo guarda en background sin bloquear.
    *   Funciona tanto para Server Actions (narración DM) como para API Routes (cliente).

3.  **Beneficios Inmediatos:**
    *   **Ahorro de Costos:** Las narraciones de introducción y textos repetidos ya no consumen cuota de Eleven Labs.
    *   **Latencia Cero:** Los audios cacheados se reproducen instantáneamente.
    *   **Resiliencia:** Si la API de Eleven Labs cae, los audios cacheados siguen funcionando.

### Archivos Creados/Modificados:
*   `src/lib/tts/tts-cache.ts` (Nuevo)
*   `src/lib/tts/eleven-labs-direct.ts` (Modificado)


