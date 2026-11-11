# Plan de Implementación: Integración de Eleven Labs TTS

**Roadmap:** #18 - Mejoras de Interfaz de Usuario (Investigación de Sistemas de Texto2Voz)  
**Prioridad:** 🟢 BAJA  
**Fecha de creación del plan:** 2025-01-23  
**Estado:** 🔄 EN CURSO  
**Referencia:** [Roadmap - Sección 18](../../roadmap.md#18-mejoras-de-interfaz-de-usuario)

---

## 🎯 Objetivo

Integrar el motor de texto a voz de Eleven Labs para reemplazar o complementar el sistema actual de Google Gemini TTS, mejorando la velocidad, calidad y configurabilidad de la narración de audio del DM.

---

## 📋 Análisis del Sistema Actual

### Estado Actual

El sistema actual utiliza **Google Gemini 2.5 Flash Preview TTS** para generar audio de las narraciones del DM:

**Archivo:** `src/ai/flows/generate-dm-narration-audio.ts`

**Características actuales:**
- ✅ Funcionalidad básica implementada
- ✅ Integrado con Genkit AI flows
- ✅ Conversión de PCM a WAV
- ✅ Retorna audio como data URI
- ✅ Usado desde `chat-message.tsx` para reproducir narraciones

**Limitaciones identificadas:**
- ⚠️ **Velocidad:** La generación puede ser lenta
- ⚠️ **Configurabilidad limitada:** Solo una voz predefinida ("Enceladus")
- ⚠️ **Idioma:** Optimizado para español de España, pero limitado en opciones
- ⚠️ **Calidad:** Depende de la calidad del modelo de Gemini
- ⚠️ **Costos:** Puede ser costoso según el uso

### Flujo Actual

```
ChatMessage Component
    ↓ (click en botón de audio)
    ↓
generateDmNarrationAudio()
    ↓
generateDmNarrationAudioFlow (Genkit Flow)
    ↓
Google Gemini 2.5 Flash Preview TTS
    ↓
PCM Audio Buffer
    ↓
toWav() conversion
    ↓
Data URI (audio/wav;base64,...)
    ↓
Reproducción en navegador
```

---

## 🔍 Investigación de Eleven Labs API

### Características de Eleven Labs

**Ventajas:**
- ✅ **Alta calidad de voz:** Voces naturales y expresivas
- ✅ **Múltiples voces:** Amplia biblioteca de voces predefinidas
- ✅ **Personalización:** Control sobre estabilidad, claridad, velocidad
- ✅ **Rapidez:** Generación de audio más rápida que muchas alternativas
- ✅ **Idiomas:** Soporte para múltiples idiomas incluyendo español
- ✅ **API REST:** Integración directa sin dependencias de Genkit

**Consideraciones:**
- ⚠️ **Costos:** Modelo de pago por caracteres generados
- ⚠️ **API Key:** Requiere clave de API de Eleven Labs
- ⚠️ **Límites:** Dependiendo del plan, puede haber límites de uso
- ⚠️ **Formato:** Devuelve MP3 por defecto (vs WAV actual)

### API de Eleven Labs

**Endpoint principal:**
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
```

**Parámetros importantes:**
- `voice_id`: ID de la voz a usar
- `text`: Texto a convertir
- `model_id`: Modelo de voz (ej: "eleven_multilingual_v2")
- `voice_settings`: Configuración de estabilidad, similarity_boost, style, etc.

**Respuesta:**
- Audio en formato MP3 (stream)
- Headers con información del audio generado

**Documentación oficial:**
- https://elevenlabs.io/docs/api-reference/text-to-speech

---

## 🏗️ Arquitectura Propuesta

### Opción 1: Reemplazo Completo (Recomendado)

Reemplazar completamente el sistema de Gemini TTS con Eleven Labs, manteniendo la misma interfaz.

**Ventajas:**
- Código más simple
- Un solo proveedor de TTS
- Menos dependencias

**Desventajas:**
- Pierde la integración con Genkit
- Requiere migración completa

### Opción 2: Sistema Dual con Fallback

Mantener ambos sistemas y permitir selección o fallback automático.

**Ventajas:**
- Redundancia si un servicio falla
- Flexibilidad para elegir proveedor

**Desventajas:**
- Código más complejo
- Mantenimiento de dos sistemas

### Opción 3: Sistema Modular con Proveedores

Crear una abstracción de proveedores TTS que permita cambiar fácilmente entre servicios.

**Ventajas:**
- Máxima flexibilidad
- Fácil añadir nuevos proveedores
- Código extensible

**Desventajas:**
- Más trabajo inicial
- Puede ser over-engineering

### Decisión: Opción 1 (Reemplazo Completo)

**Justificación:**
- Eleven Labs ofrece mejor calidad y velocidad
- Simplifica el código eliminando dependencia de Genkit para TTS
- El sistema actual no requiere fallback (no es crítico si falla)
- Menos complejidad = menos bugs

---

## 📐 Diseño de la Nueva Implementación

### Estructura de Archivos

```
src/
  ai/
    flows/
      generate-dm-narration-audio.ts  (modificar)
  lib/
    tts/
      eleven-labs-client.ts           (nuevo)
      tts-types.ts                    (nuevo)
```

### Nuevo Flujo

```
ChatMessage Component
    ↓ (click en botón de audio)
    ↓
generateDmNarrationAudio()
    ↓
ElevenLabsClient.textToSpeech()
    ↓
Eleven Labs API
    ↓
MP3 Audio Stream
    ↓
Buffer conversion
    ↓
Data URI (audio/mpeg;base64,...)
    ↓
Reproducción en navegador
```

### Interfaz Propuesta

```typescript
// src/lib/tts/tts-types.ts
export interface TTSConfig {
  voiceId: string;
  modelId?: string;
  stability?: number;      // 0.0 - 1.0
  similarityBoost?: number; // 0.0 - 1.0
  style?: number;          // 0.0 - 1.0
  useSpeakerBoost?: boolean;
}

export interface TTSResponse {
  audioDataUri: string;    // data:audio/mpeg;base64,...
  format: 'mp3';
}
```

### Variables de Entorno

```env
# .env.local
ELEVENLABS_API_KEY=tu_api_key_aqui
ELEVENLABS_VOICE_ID=default_voice_id
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

---

## 🛠️ Plan de Implementación

### Fase 1: Configuración y Preparación

**Objetivo:** Preparar el entorno y obtener credenciales

**Tareas:**
1. ✅ Crear cuenta en Eleven Labs (si no existe)
2. ✅ Obtener API Key de Eleven Labs
3. ✅ Identificar voces apropiadas para DM en español
4. ✅ Documentar costos y límites del plan elegido
5. ✅ Añadir variables de entorno al proyecto

**Archivos a modificar:**
- `.env.local` (añadir variables)
- `.env.example` (documentar variables)

**Criterios de éxito:**
- API Key obtenida y configurada
- Variables de entorno documentadas
- Voces identificadas para testing

---

### Fase 2: Crear Cliente de Eleven Labs

**Objetivo:** Implementar el cliente para interactuar con la API

**Tareas:**
1. Crear `src/lib/tts/eleven-labs-client.ts`
2. Implementar función `textToSpeech()` que:
   - Acepta texto y configuración
   - Hace petición POST a Eleven Labs API
   - Maneja errores apropiadamente
   - Convierte respuesta a data URI
3. Añadir logging para debugging
4. Implementar manejo de errores robusto

**Código base propuesto:**

```typescript
// src/lib/tts/eleven-labs-client.ts
import { log } from '@/lib/logger';

export interface ElevenLabsConfig {
  voiceId: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface ElevenLabsResponse {
  audioDataUri: string;
  format: 'mp3';
}

export async function textToSpeech(
  text: string,
  config: ElevenLabsConfig
): Promise<ElevenLabsResponse> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY no está configurada');
  }

  const voiceId = config.voiceId || process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) {
    throw new Error('voiceId no está configurado');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  
  const requestBody = {
    text,
    model_id: config.modelId || process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
    voice_settings: {
      stability: config.stability ?? 0.5,
      similarity_boost: config.similarityBoost ?? 0.75,
      style: config.style ?? 0.0,
      use_speaker_boost: config.useSpeakerBoost ?? true,
    },
  };

  try {
    log.info('ElevenLabs', 'Generando audio', { textLength: text.length, voiceId });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('ElevenLabs', 'Error en API', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText 
      });
      throw new Error(`Eleven Labs API error: ${response.status} ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioDataUri = `data:audio/mpeg;base64,${base64Audio}`;

    log.info('ElevenLabs', 'Audio generado exitosamente', { 
      audioSize: audioBuffer.byteLength 
    });

    return {
      audioDataUri,
      format: 'mp3',
    };
  } catch (error: any) {
    log.error('ElevenLabs', 'Error generando audio', error);
    throw error;
  }
}
```

**Archivos a crear:**
- `src/lib/tts/eleven-labs-client.ts`
- `src/lib/tts/tts-types.ts` (opcional, para tipos compartidos)

**Criterios de éxito:**
- Cliente implementado y funcional
- Manejo de errores robusto
- Logging apropiado
- Tests básicos pasando

---

### Fase 3: Modificar Flujo de Generación de Audio

**Objetivo:** Actualizar `generate-dm-narration-audio.ts` para usar Eleven Labs

**Tareas:**
1. Modificar `generateDmNarrationAudioFlow` para usar Eleven Labs
2. Mantener la misma interfaz pública (no romper compatibilidad)
3. Actualizar tipos si es necesario
4. Eliminar dependencia de `wav` si ya no se necesita
5. Actualizar conversión de formato (MP3 en lugar de WAV)

**Código propuesto:**

```typescript
// src/ai/flows/generate-dm-narration-audio.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { textToSpeech } from '@/lib/tts/eleven-labs-client';

const GenerateDmNarrationAudioInputSchema = z.object({
  narrationText: z.string().describe('The text to be converted to speech.'),
  voiceId: z.string().optional().describe('Optional voice ID to use.'),
});

export type GenerateDmNarrationAudioInput = z.infer<
  typeof GenerateDmNarrationAudioInputSchema
>;

const GenerateDmNarrationAudioOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio as a data URI.'),
});

export type GenerateDmNarrationAudioOutput = z.infer<
  typeof GenerateDmNarrationAudioOutputSchema
>;

export async function generateDmNarrationAudio(
  input: GenerateDmNarrationAudioInput
): Promise<GenerateDmNarrationAudioOutput> {
  return generateDmNarrationAudioFlow(input);
}

const generateDmNarrationAudioFlow = ai.defineFlow(
  {
    name: 'generateDmNarrationAudioFlow',
    inputSchema: GenerateDmNarrationAudioInputSchema,
    outputSchema: GenerateDmNarrationAudioOutputSchema,
  },
  async (input) => {
    // Configuración de voz para DM
    // TODO: Permitir configuración desde variables de entorno o UI
    const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || 'default_dm_voice';
    
    const response = await textToSpeech(input.narrationText, {
      voiceId: input.voiceId || defaultVoiceId,
      modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
      stability: 0.5,      // Balance entre consistencia y expresividad
      similarityBoost: 0.75, // Mantener características de la voz
      style: 0.0,          // Estilo neutral para narración
      useSpeakerBoost: true, // Mejorar claridad
    });

    return {
      audioDataUri: response.audioDataUri,
    };
  }
);
```

**Archivos a modificar:**
- `src/ai/flows/generate-dm-narration-audio.ts`

**Archivos a eliminar (si aplica):**
- Dependencia de `wav` si ya no se usa

**Criterios de éxito:**
- Flujo actualizado y funcional
- Misma interfaz pública mantenida
- Sin breaking changes en componentes que lo usan

---

### Fase 4: Actualizar Componente de Chat

**Objetivo:** Asegurar que el componente ChatMessage funciona con el nuevo formato

**Tareas:**
1. Verificar que `chat-message.tsx` acepta MP3 (debería funcionar automáticamente)
2. Actualizar tipo de audio si es necesario
3. Probar reproducción de audio MP3 en navegador
4. Verificar que el botón de audio funciona correctamente

**Archivos a revisar:**
- `src/components/game/chat-message.tsx`

**Criterios de éxito:**
- Audio se reproduce correctamente
- Botón de audio funciona
- Sin errores en consola

---

### Fase 5: Testing y Validación

**Objetivo:** Verificar que todo funciona correctamente

**Tareas:**
1. **Testing Manual:**
   - Generar audio de narraciones cortas
   - Generar audio de narraciones largas
   - Probar con diferentes tipos de texto
   - Verificar calidad del audio
   - Medir velocidad de generación

2. **Testing de Errores:**
   - API Key inválida
   - Voice ID inválido
   - Texto vacío
   - Errores de red
   - Límites de API alcanzados

3. **Testing de Rendimiento:**
   - Tiempo de generación vs sistema anterior
   - Tamaño de archivos generados
   - Uso de memoria

4. **Testing de Compatibilidad:**
   - Diferentes navegadores
   - Diferentes dispositivos
   - Reproducción de MP3

**Criterios de éxito:**
- Todos los tests pasan
- Calidad de audio aceptable
- Velocidad mejorada o similar
- Manejo de errores robusto

---

### Fase 6: Documentación y Limpieza

**Objetivo:** Documentar cambios y limpiar código obsoleto

**Tareas:**
1. Actualizar documentación de arquitectura
2. Documentar variables de entorno
3. Añadir comentarios al código
4. Eliminar código obsoleto (si aplica)
5. Actualizar CHANGELOG.md
6. Actualizar roadmap (marcar como completado)

**Archivos a modificar:**
- `docs/arquitectura/arquitectura-backend.md`
- `CHANGELOG.md`
- `docs/roadmap.md`
- `.env.example`

**Criterios de éxito:**
- Documentación actualizada
- Código limpio y comentado
- CHANGELOG actualizado

---

## 🔧 Configuración de Voces

### Voces Recomendadas para DM

**Criterios de selección:**
- Voz masculina o neutra
- Tono apropiado para narración épica/fantástica
- Buena pronunciación en español
- Modelo multilingual para mejor soporte

**Voces a probar:**
1. Buscar en la biblioteca de Eleven Labs voces en español
2. Probar con texto de ejemplo de narración de DM
3. Seleccionar 2-3 opciones para configuración

**Configuración de voz sugerida:**
```typescript
{
  stability: 0.5,        // Balance: muy bajo = muy expresivo, muy alto = muy consistente
  similarityBoost: 0.75, // Mantener características de la voz original
  style: 0.0,            // Estilo neutral para narración objetiva
  useSpeakerBoost: true  // Mejorar claridad y presencia
}
```

---

## 💰 Consideraciones de Costos

### Modelo de Precios de Eleven Labs

**Plan Free:**
- 10,000 caracteres/mes
- Limitado para testing

**Plan Starter ($5/mes):**
- 30,000 caracteres/mes
- Buena para uso personal

**Plan Creator ($22/mes):**
- 100,000 caracteres/mes
- Recomendado para desarrollo activo

**Plan Pro ($99/mes):**
- 500,000 caracteres/mes
- Para uso intensivo

### Estimación de Uso

**Ejemplo de narración:**
- Narración promedio: ~200-500 caracteres
- Por sesión de juego: ~20-50 narraciones
- Caracteres por sesión: ~4,000-25,000

**Recomendación:**
- Empezar con plan Creator para desarrollo
- Monitorear uso real
- Ajustar según necesidad

---

## 🚨 Manejo de Errores

### Errores Comunes y Soluciones

1. **API Key inválida:**
   - Error: 401 Unauthorized
   - Solución: Verificar variable de entorno

2. **Voice ID no encontrado:**
   - Error: 404 Not Found
   - Solución: Verificar ID de voz en dashboard

3. **Límite de caracteres excedido:**
   - Error: 429 Too Many Requests
   - Solución: Implementar rate limiting o upgrade plan

4. **Texto vacío o muy largo:**
   - Error: 400 Bad Request
   - Solución: Validar texto antes de enviar

5. **Errores de red:**
   - Error: Network error
   - Solución: Implementar retry logic

### Implementación de Retry

```typescript
async function textToSpeechWithRetry(
  text: string,
  config: ElevenLabsConfig,
  maxRetries = 3
): Promise<ElevenLabsResponse> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await textToSpeech(text, config);
    } catch (error: any) {
      if (attempt === maxRetries) throw error;
      
      // Solo reintentar en errores de red o 5xx
      if (error.message.includes('network') || 
          error.message.includes('500') ||
          error.message.includes('503')) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error; // No reintentar en errores 4xx
    }
  }
  throw new Error('Unexpected error in retry logic');
}
```

---

## 📊 Métricas de Éxito

### KPIs a Monitorear

1. **Velocidad:**
   - Tiempo promedio de generación de audio
   - Objetivo: < 2 segundos para narraciones normales

2. **Calidad:**
   - Feedback de usuarios sobre calidad de voz
   - Comparación con sistema anterior

3. **Confiabilidad:**
   - Tasa de éxito de generación
   - Objetivo: > 99%

4. **Costos:**
   - Caracteres generados por mes
   - Costo por sesión de juego

5. **Uso:**
   - Porcentaje de narraciones con audio generado
   - Frecuencia de uso del botón de audio

---

## 🔄 Plan de Migración

### Estrategia de Despliegue

1. **Fase de Testing (1-2 semanas):**
   - Implementar en branch separado
   - Testing exhaustivo
   - Comparación con sistema actual

2. **Fase de Rollout (1 semana):**
   - Merge a main
   - Deploy a producción
   - Monitoreo activo

3. **Fase de Estabilización (1 semana):**
   - Recopilar feedback
   - Ajustar configuración
   - Optimizar según necesidad

### Rollback Plan

Si hay problemas críticos:
1. Revertir commit de integración
2. Restaurar código anterior
- [ ] Tests de errores completados
- [ ] Tests de rendimiento completados
- [ ] Tests de compatibilidad completados

### Documentación
- [ ] Documentación de arquitectura actualizada
- [ ] Variables de entorno documentadas
- [ ] CHANGELOG actualizado
- [ ] Roadmap actualizado

### Despliegue
- [ ] Código revisado
- [ ] Variables de entorno configuradas en producción
- [ ] Deploy realizado
- [ ] Monitoreo activo configurado

---

## 🔗 Referencias

- [Eleven Labs API Documentation](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Eleven Labs Pricing](https://elevenlabs.io/pricing)
- [Eleven Labs Voice Library](https://elevenlabs.io/voice-library)
- [Roadmap - Sección 18](../../roadmap.md#18-mejoras-de-interfaz-de-usuario)

---

## 📅 Timeline Estimado

- **Fase 1 (Configuración):** 1 día
- **Fase 2 (Cliente):** 2-3 días
- **Fase 3 (Flujo):** 1-2 días
- **Fase 4 (Componente):** 1 día
- **Fase 5 (Testing):** 3-5 días
- **Fase 6 (Documentación):** 1-2 días

**Total estimado:** 10-14 días de trabajo

---

## 🎯 Próximos Pasos

1. ✅ Crear este plan detallado
2. ⏭️ Obtener API Key de Eleven Labs
3. ⏭️ Identificar voces apropiadas
4. ⏭️ Implementar cliente de Eleven Labs
5. ⏭️ Integrar en flujo existente
6. ⏭️ Testing y validación
7. ⏭️ Despliegue

---

**Última actualización:** 2025-01-23  
**Responsable:** Equipo de desarrollo  
**Estado:** 🔄 EN CURSO - Fase 1 (Configuración)

