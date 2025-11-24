/**
 * API Route para generar audio con Eleven Labs
 * 
 * Este endpoint maneja la generación de audio de forma separada
 * para tener mejor control sobre la conexión y manejo de errores.
 */

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { prewarmConnection } from '@/ai/flows/retry-utils';

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId } = await request.json();

    if (!text || !voiceId) {
      return NextResponse.json(
        { error: 'text y voiceId son requeridos' },
        { status: 400 }
      );
    }

    // Limitar la longitud del texto para evitar problemas de quota
    // Eleven Labs cobra por caracteres, textos muy largos pueden exceder la quota
    const MAX_TEXT_LENGTH = 5000; // Límite razonable para narraciones
    const textToConvert = text.trim().substring(0, MAX_TEXT_LENGTH);
    
    if (text.length > MAX_TEXT_LENGTH) {
      log.warn('ElevenLabs API', 'Texto truncado', {
        originalLength: text.length,
        truncatedLength: textToConvert.length
      });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      log.error('ElevenLabs API', 'ELEVENLABS_API_KEY no configurada');
      return NextResponse.json(
        { error: 'API Key no configurada' },
        { status: 500 }
      );
    }

    log.info('ElevenLabs API', 'Generando audio con fetch nativo', { 
      textLength: textToConvert.length,
      originalLength: text.length,
      voiceId 
    });

    // Pre-warm de la conexión usando función genérica
    // Esto evita el timeout de 10s en el primer intento real (undici tiene un timeout de conexión por defecto)
    // El pre-warm establece la conexión TCP/TLS, haciendo que la petición real sea más rápida
    await prewarmConnection(
      'https://api.elevenlabs.io',
      '/v1/voices',
      { 'xi-api-key': apiKey.trim() },
      5000
    );

    // Usar fetch nativo directamente (funciona mejor en Windows/Next.js)
    // Configurar timeout más largo para evitar errores de conectividad
    // Aumentado a 60 segundos para dar más tiempo a la conexión inicial
    // (undici tiene un timeout de conexión de 10s por defecto, pero el timeout total puede ser mayor)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos
    
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    let response: Response;
    
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey.trim(),
        },
        body: JSON.stringify({
          text: textToConvert,
          model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      // Los errores de fetch failed son reintentables, se manejarán en textToSpeechWithRetry
      // No loguear como ERROR aquí porque se reintentará automáticamente
      throw fetchError;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Error desconocido');
      let errorDetail: any = {};
      try {
        errorDetail = JSON.parse(errorText);
      } catch {
        // Si no es JSON, usar el texto tal cual
      }
      
      log.error('ElevenLabs API', 'Error en respuesta', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        errorDetail
      });
      
      // Manejo específico de errores
      if (response.status === 401) {
        if (errorDetail.detail?.status === 'quota_exceeded') {
          const message = errorDetail.detail?.message || 'Quota excedida';
          throw new Error(`Quota de Eleven Labs excedida: ${message}. El texto es demasiado largo o has alcanzado tu límite mensual.`);
        }
        throw new Error(`API Key inválida o sin permisos: ${errorText}`);
      } else if (response.status === 404) {
        throw new Error(`Voice ID no encontrado: ${errorText}`);
      } else if (response.status === 429) {
        throw new Error(`Límite de caracteres excedido: ${errorText}`);
      }
      
      throw new Error(`Eleven Labs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Leer el audio como array buffer
    const audioBuffer = await response.arrayBuffer();

    // Convertir a base64
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioDataUri = `data:audio/mpeg;base64,${base64Audio}`;

    log.info('ElevenLabs API', 'Audio generado exitosamente con fetch nativo', { 
      audioSizeKB: Math.round(audioBuffer.byteLength / 1024)
    });

    return NextResponse.json({
      audioDataUri,
      format: 'mp3',
    });

  } catch (error: any) {
    log.error('ElevenLabs API', 'Error generando audio', {
      error: error.message,
      name: error.name,
      statusCode: error.statusCode,
      cause: error.cause,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // Primeras 3 líneas del stack
    });

    // Si el error ya tiene un mensaje descriptivo (de nuestro throw), pasarlo directamente
    if (error.message?.includes('Quota') || error.message?.includes('quota')) {
      return NextResponse.json(
        { error: error.message },
        { status: 402 } // 402 Payment Required es más apropiado para quota
      );
    }
    
    // Errores específicos
    if (error.message?.includes('API Key inválida') || error.message?.includes('sin permisos')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    } else if (error.message?.includes('Voice ID no encontrado')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    } else if (error.message?.includes('Límite de caracteres')) {
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      );
    }

    // Error de red/conectividad
    // Nota: Estos errores normalmente se manejan en textToSpeechWithRetry con reintentos
    // Solo llegamos aquí si todos los reintentos fallaron
    if (error.message?.includes('fetch failed') || error.cause) {
      log.error('ElevenLabs API', 'Error de conectividad después de reintentos', {
        message: error.message,
        cause: error.cause?.message || error.cause,
        note: 'Todos los reintentos fallaron. Verifica firewall/proxy/VPN o configuración SSL.'
      });
      return NextResponse.json(
        { 
          error: `Error de conexión: ${error.cause?.message || error.message}`,
          details: 'No se pudo conectar a api.elevenlabs.io después de múltiples intentos. Verifica firewall/proxy/VPN o configuración SSL.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `Error al generar audio: ${error.message || 'Error desconocido'}` },
      { status: 500 }
    );
  }
}

