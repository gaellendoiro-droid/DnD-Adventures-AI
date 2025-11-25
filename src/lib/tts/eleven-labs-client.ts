/**
 * @fileOverview Cliente para interactuar con la API de Eleven Labs Text-to-Speech
 * 
 * Proporciona funciones para convertir texto a voz llamando a la API Route interna.
 * Este cliente es isomórfico (funciona en cliente y servidor) y no requiere API Key.
 */

import { retryWithExponentialBackoff } from '@/ai/flows/retry-utils';
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

/**
 * Convierte texto a voz llamando a la API Route interna (/api/generate-audio)
 * 
 * @param text - Texto a convertir a voz
 * @param config - Configuración de voz
 * @returns Promise con el audio generado como data URI
 */
export async function textToSpeech(
  text: string,
  config: ElevenLabsConfig
): Promise<ElevenLabsResponse> {
  if (!config.voiceId) {
    throw new Error('voiceId es requerido en la configuración');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('El texto no puede estar vacío');
  }

  try {
    // Determinar URL base (necesario para fetch en servidor, opcional en cliente)
    const baseUrl = typeof window !== 'undefined'
      ? ''
      : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');

    const url = `${baseUrl}/api/generate-audio`;

    const response = await fetch(url, {
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
      throw new Error(errorData.error || `Error ${response.status}`);
    }

    const data = await response.json();

    return {
      audioDataUri: data.audioDataUri,
      format: data.format || 'mp3',
    };
  } catch (error: any) {
    log.error('Error llamando a API Route', {
      module: 'ElevenLabs Client',
      error: error.message,
      voiceId: config.voiceId
    });

    throw new Error(`Error al generar audio: ${error.message || 'Error desconocido'}`);
  }
}

/**
 * Convierte texto a voz con reintentos automáticos
 */
export async function textToSpeechWithRetry(
  text: string,
  config: ElevenLabsConfig,
  maxRetries = 3
): Promise<ElevenLabsResponse> {
  return retryWithExponentialBackoff(
    () => textToSpeech(text, config),
    maxRetries,
    500,
    'ElevenLabs-Client'
  );
}

