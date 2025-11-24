/**
 * Script de utilidad para obtener las voces disponibles de Eleven Labs
 * 
 * Uso:
 *   tsx scripts/get-elevenlabs-voices.ts
 * 
 * Requiere ELEVENLABS_API_KEY en variables de entorno
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Cargar variables de entorno - intentar .env primero, luego .env.local
const envPath = resolve(process.cwd(), '.env');
const envLocalPath = resolve(process.cwd(), '.env.local');

if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

async function getVoices() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Error: ELEVENLABS_API_KEY no está configurada');
    console.log('\nPor favor, añade la siguiente línea a tu archivo .env:');
    console.log('ELEVENLABS_API_KEY=tu_api_key_aqui\n');
    process.exit(1);
  }

  try {
    console.log('🔍 Obteniendo voces de Eleven Labs...\n');
    
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error: ${response.status} ${response.statusText}`);
      console.error(errorText);
      process.exit(1);
    }

    const data = await response.json();
    const voices = data.voices || [];

    if (voices.length === 0) {
      console.log('⚠️  No se encontraron voces en tu cuenta.');
      return;
    }

    console.log(`✅ Se encontraron ${voices.length} voces:\n`);
    console.log('─'.repeat(80));
    
    // Buscar "GrandPa Spuds Oxley" específicamente
    const grandpaSpuds = voices.find((v: any) => 
      v.name?.toLowerCase().includes('grandpa') || 
      v.name?.toLowerCase().includes('spuds') ||
      v.name?.toLowerCase().includes('oxley')
    );

    if (grandpaSpuds) {
      console.log('\n🎯 ¡Encontrada la voz "GrandPa Spuds Oxley"!\n');
      console.log(`   Nombre: ${grandpaSpuds.name}`);
      console.log(`   Voice ID: ${grandpaSpuds.voice_id}`);
      console.log(`   Categoría: ${grandpaSpuds.category || 'N/A'}`);
      console.log(`\n   📋 Añade esto a tu .env.local:`);
      console.log(`   ELEVENLABS_VOICE_ID=${grandpaSpuds.voice_id}\n`);
      console.log('─'.repeat(80));
    }

    console.log('\n📋 Todas las voces disponibles:\n');
    
    voices.forEach((voice: any, index: number) => {
      const isGrandpa = voice === grandpaSpuds;
      const marker = isGrandpa ? '🎯' : '  ';
      console.log(`${marker} ${index + 1}. ${voice.name}`);
      console.log(`     Voice ID: ${voice.voice_id}`);
      if (voice.description) {
        console.log(`     Descripción: ${voice.description.substring(0, 60)}...`);
      }
      console.log('');
    });

    if (!grandpaSpuds) {
      console.log('\n⚠️  No se encontró "GrandPa Spuds Oxley" en la lista.');
      console.log('   Verifica que tengas acceso a esta voz en tu cuenta de Eleven Labs.');
      console.log('   Puedes buscar voces similares en la lista de arriba.\n');
    }

  } catch (error: any) {
    console.error('❌ Error al obtener voces:', error.message);
    if (error.message.includes('fetch')) {
      console.error('   Verifica tu conexión a internet.');
    }
    process.exit(1);
  }
}

getVoices();

