
'use server';
/**
 * @fileOverview Converts Dungeon Master's narration text to speech using Eleven Labs TTS.
 *
 * - generateDmNarrationAudio - A function that handles the text-to-speech conversion.
 * - GenerateDmNarrationAudioInput - The input type for the function.
 * - GenerateDmNarrationAudioOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { textToSpeechWithRetry } from '@/lib/tts/eleven-labs-client';

const GenerateDmNarrationAudioInputSchema = z.object({
  narrationText: z.string().describe('The text to be converted to speech.'),
  voiceId: z.string().optional().describe('Optional voice ID to use. If not provided, uses ELEVENLABS_VOICE_ID from environment.'),
});
export type GenerateDmNarrationAudioInput = z.infer<
  typeof GenerateDmNarrationAudioInputSchema
>;

const GenerateDmNarrationAudioOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio as a data URI (MP3 format).'),
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
    // Obtener voice ID desde input o variable de entorno
    // El usuario tiene la voz "GrandPa Spuds Oxley" - necesita configurar el ID en ELEVENLABS_VOICE_ID
    const voiceId = input.voiceId || process.env.ELEVENLABS_VOICE_ID;
    
    if (!voiceId) {
      throw new Error('ELEVENLABS_VOICE_ID no está configurado. Por favor, configura la variable de entorno o proporciona voiceId en el input.');
    }

    // Configuración optimizada para narración de DM
    // Stability: 0.5 - Balance entre consistencia y expresividad
    // Similarity Boost: 0.75 - Mantener características de la voz
    // Style: 0.0 - Estilo neutral para narración objetiva
    // Use Speaker Boost: true - Mejorar claridad y presencia
    const response = await textToSpeechWithRetry(input.narrationText, {
      voiceId,
      modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.0,
      useSpeakerBoost: true,
    });

    return {
      audioDataUri: response.audioDataUri,
    };
  }
);
