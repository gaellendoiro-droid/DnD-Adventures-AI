/**
 * API Route para generar audio con el proveedor configurado (Gemini o Eleven Labs)
 * 
 * Este endpoint actúa como proxy para el cliente frontend,
 * delegando la lógica real al proveedor activo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { generateAudioDirect } from '@/lib/tts/eleven-labs-direct';
import { generateGeminiAudioDirect } from '@/lib/tts/gemini-tts-direct';

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'text es requerido' },
        { status: 400 }
      );
    }

    const provider = (process.env.TTS_PROVIDER || 'gemini').toLowerCase();
    let result;

    if (provider === 'gemini') {
      const voiceName = voiceId || process.env.GEMINI_TTS_VOICE || 'Aoede';
      result = await generateGeminiAudioDirect(text, {
        voiceName,
      });
    } else {
      if (!voiceId && !process.env.ELEVENLABS_VOICE_ID) {
        return NextResponse.json(
          { error: 'voiceId es requerido para Eleven Labs' },
          { status: 400 }
        );
      }
      result = await generateAudioDirect(text, {
        voiceId: voiceId || process.env.ELEVENLABS_VOICE_ID || '',
        modelId: process.env.ELEVENLABS_MODEL_ID,
      });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    log.error('Error generando audio en API Route', {
      module: 'TTS API Route',
      error: error.message,
      name: error.name,
    });

    // Mapeo de errores a códigos HTTP
    if (error.message?.includes('Quota') || error.message?.includes('quota_exceeded')) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    if (error.message?.includes('API Key') || error.message?.includes('sin permisos') || error.message?.includes('GOOGLE_GENAI_API_KEY')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message?.includes('Voice') || error.message?.includes('voiceName')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message?.includes('Límite') || error.message?.includes('limit')) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    return NextResponse.json(
      { error: `Error al generar audio: ${error.message || 'Error desconocido'}` },
      { status: 500 }
    );
  }
}


