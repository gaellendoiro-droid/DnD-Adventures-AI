/**
 * @fileOverview Cliente para interactuar con la API de Eleven Labs Text-to-Speech
 * 
 * Proporciona funciones para convertir texto a voz usando Eleven Labs SDK oficial.
 * Soporta configuración de voz, estabilidad, y otros parámetros de calidad.
 */

import { retryWithExponentialBackoff } from '@/ai/flows/retry-utils';
import { log } from '@/lib/logger';

export interface ElevenLabsConfig {
  voiceId: string;
  modelId?: string;
  stability?: number;      // 0.0 - 1.0: Balance entre consistencia y expresividad
  similarityBoost?: number; // 0.0 - 1.0: Mantener características de la voz original
  style?: number;          // 0.0 - 1.0: Estilo y expresividad
  useSpeakerBoost?: boolean; // Mejorar claridad y presencia
}

export interface ElevenLabsResponse {
  audioDataUri: string;    // data:audio/mpeg;base64,...
  format: 'mp3';
}

/**
 * Convierte texto a voz usando la API de Eleven Labs
 * 
 * @param text - Texto a convertir a voz
 * @param config - Configuración de voz y parámetros de calidad
 * @returns Promise con el audio generado como data URI
 * @throws Error si la API key no está configurada, si el voiceId es inválido, o si hay errores de red
 */
export async function textToSpeech(
  text: string,
  config: ElevenLabsConfig
): Promise<ElevenLabsResponse> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    log.error('ElevenLabs', 'ELEVENLABS_API_KEY no está configurada en variables de entorno', {
      envKeys: Object.keys(process.env).filter(k => k.includes('ELEVEN'))
    });
    throw new Error('ELEVENLABS_API_KEY no está configurada. Por favor, configura la variable de entorno.');
  }

  if (!config.voiceId) {
    log.error('ElevenLabs', 'voiceId no está configurado');
    throw new Error('voiceId es requerido en la configuración');
  }

  if (!text || text.trim().length === 0) {
    log.warn('ElevenLabs', 'Intento de generar audio con texto vacío');
    throw new Error('El texto no puede estar vacío');
  }

  try {
    log.info('ElevenLabs', 'Generando audio vía API route', { 
      textLength: text.length, 
      voiceId: config.voiceId
    });
    
    // Usar API route interna en lugar de SDK directo para evitar problemas de SSL
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8080'}/api/generate-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
        voiceId: config.voiceId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      
      // Mensajes específicos según el tipo de error
      if (response.status === 402 || errorData.error?.includes('Quota') || errorData.error?.includes('quota')) {
        throw new Error(errorData.error || 'Quota de Eleven Labs excedida. El texto es demasiado largo o has alcanzado tu límite mensual.');
      } else if (response.status === 401) {
        throw new Error(errorData.error || 'API Key inválida o sin permisos');
      } else if (response.status === 404) {
        throw new Error(errorData.error || 'Voice ID no encontrado');
      } else if (response.status === 429) {
        throw new Error(errorData.error || 'Límite de caracteres excedido');
      }
      
      throw new Error(errorData.error || `Error ${response.status}`);
    }

    const data = await response.json();
    
    log.info('ElevenLabs', 'Audio generado exitosamente vía API route', { 
      audioSizeKB: data.audioDataUri ? Math.round((data.audioDataUri.length * 3) / 4 / 1024) : 0
    });

    return {
      audioDataUri: data.audioDataUri,
      format: data.format || 'mp3',
    };
  } catch (error: any) {
    log.error('ElevenLabs', 'Error generando audio vía API route', { 
      error: error.message,
      name: error.name,
      voiceId: config.voiceId
    });
    
    throw new Error(`Error al generar audio: ${error.message || 'Error desconocido'}`);
  }
}

/**
 * Convierte texto a voz con reintentos automáticos usando la función estándar del proyecto
 * 
 * Usa `retryWithExponentialBackoff` para manejar errores transitorios de red/conectividad
 * de forma consistente con el resto del proyecto.
 * 
 * @param text - Texto a convertir a voz
 * @param config - Configuración de voz y parámetros de calidad
 * @param maxRetries - Número máximo de reintentos (default: 3, igual que retryWithExponentialBackoff)
 * @returns Promise con el audio generado como data URI
 */
export async function textToSpeechWithRetry(
  text: string,
  config: ElevenLabsConfig,
  maxRetries = 3
): Promise<ElevenLabsResponse> {
  return retryWithExponentialBackoff(
    () => textToSpeech(text, config),
    maxRetries,
    500, // initialDelayMs: 500ms (backoff exponencial: 500ms, 1s, 2s)
    // Reducido para que los reintentos sean más rápidos cuando hay errores de conexión
    'ElevenLabs-TTS'
  );
}

