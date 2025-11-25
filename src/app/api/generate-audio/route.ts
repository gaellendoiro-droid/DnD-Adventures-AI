/**
 * API Route para generar audio con Eleven Labs
 * 
 * Este endpoint actúa como proxy para el cliente frontend,
 * delegando la lógica real a generateAudioDirect.
 */

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { generateAudioDirect } from '@/lib/tts/eleven-labs-direct';

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId } = await request.json();

    if (!text || !voiceId) {
      return NextResponse.json(
        { error: 'text y voiceId son requeridos' },
        { status: 400 }
      );
    }

    // Usar la función directa que contiene toda la lógica
    const result = await generateAudioDirect(text, {
      voiceId,
      // Usar defaults o variables de entorno para el resto
      modelId: process.env.ELEVENLABS_MODEL_ID,
    });

    return NextResponse.json(result);

  } catch (error: any) {
    log.error('Error generando audio', {
      module: 'ElevenLabs API',
      error: error.message,
      name: error.name,
    });

    // Mapeo de errores a códigos HTTP
    if (error.message?.includes('Quota')) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    if (error.message?.includes('API Key') || error.message?.includes('sin permisos')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message?.includes('Voice ID')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message?.includes('Límite')) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    return NextResponse.json(
      { error: `Error al generar audio: ${error.message || 'Error desconocido'}` },
      { status: 500 }
    );
  }
}

