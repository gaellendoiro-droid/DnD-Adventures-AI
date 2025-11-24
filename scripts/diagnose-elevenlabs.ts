/**
 * Script de diagnóstico para verificar conectividad con Eleven Labs
 * 
 * Uso:
 *   tsx scripts/diagnose-elevenlabs.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Cargar variables de entorno - intentar .env primero, luego .env.local
const envPath = resolve(process.cwd(), '.env');
const envLocalPath = resolve(process.cwd(), '.env.local');

if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('📁 Cargando variables desde .env\n');
} else if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('📁 Cargando variables desde .env.local\n');
} else {
  console.log('⚠️  No se encontró archivo .env ni .env.local\n');
}

async function diagnose() {
  console.log('🔍 Diagnóstico de conexión con Eleven Labs...\n');

  // 1. Verificar variables de entorno
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  
  console.log('1. Variables de entorno:');
  console.log(`   ELEVENLABS_API_KEY: ${apiKey ? '✅ Configurada (' + apiKey.substring(0, 5) + '...)' : '❌ NO CONFIGURADA'}`);
  console.log(`   ELEVENLABS_VOICE_ID: ${voiceId ? '✅ Configurada (' + voiceId + ')' : '❌ NO CONFIGURADA'}`);
  
  if (!apiKey) {
    console.error('\n❌ Diagnóstico fallido: Falta API Key.');
    process.exit(1);
  }

  // 2. Verificar conectividad básica (GET /v1/user)
  console.log('\n2. Verificando conectividad básica (GET /v1/user)...');
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (response.ok) {
      console.log('   ✅ Conexión exitosa con API de Eleven Labs.');
      const data = await response.json();
      console.log(`   Usuario: ${data.subscription.tier} tier`);
      console.log(`   Caracteres usados: ${data.subscription.character_count}/${data.subscription.character_limit}`);
    } else {
      console.error(`   ❌ Error de conexión: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`   Detalle: ${errorText}`);
    }
  } catch (error: any) {
    console.error(`   ❌ Error de red: ${error.message}`);
    if (error.cause) console.error('   Causa:', error.cause);
  }

  // 3. Verificar endpoint de TTS (POST /v1/text-to-speech/{voice_id})
  if (voiceId) {
    console.log(`\n3. Verificando endpoint TTS para voz ${voiceId}...`);
    try {
      // Intentamos una petición dummy muy pequeña
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      console.log(`   URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: "Test",
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          }
        }),
      });

      if (response.ok) {
        console.log('   ✅ Endpoint TTS responde correctamente (Audio generado).');
      } else {
        console.error(`   ❌ Error en endpoint TTS: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`   Detalle: ${errorText}`);
      }
    } catch (error: any) {
      console.error(`   ❌ Error de red en TTS: ${error.message}`);
      if (error.cause) console.error('   Causa:', error.cause);
    }
  } else {
    console.log('\n3. Omitiendo prueba de TTS (falta Voice ID).');
  }
}

diagnose();

