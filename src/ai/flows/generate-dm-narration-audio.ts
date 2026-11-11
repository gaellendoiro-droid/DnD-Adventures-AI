
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
import { generateAudioDirectWithRetry } from '@/lib/tts/eleven-labs-direct';
import { generateGeminiAudioDirectWithRetry } from '@/lib/tts/gemini-tts-direct';

const GenerateDmNarrationAudioInputSchema = z.object({
  narrationText: z.string().describe('The text to be converted to speech.'),
  voiceId: z.string().optional().describe('Optional voice ID to use for ElevenLabs or voiceName for Gemini. If not provided, uses defaults from environment.'),
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
    const provider = (process.env.TTS_PROVIDER || 'gemini').toLowerCase();

    if (provider === 'gemini') {
      const voiceName = input.voiceId || process.env.GEMINI_TTS_VOICE || 'Aoede';
      const response = await generateGeminiAudioDirectWithRetry(input.narrationText, {
        voiceName,
      });

      return {
        audioDataUri: response.audioDataUri,
      };
    } else {
      // Por defecto fallback a Eleven Labs
      const voiceId = input.voiceId || process.env.ELEVENLABS_VOICE_ID;

      if (!voiceId) {
        throw new Error('ELEVENLABS_VOICE_ID no está configurado. Por favor, configura la variable de entorno o proporciona voiceId en el input.');
      }

      // Configuración optimizada para narración de DM
      const response = await generateAudioDirectWithRetry(input.narrationText, {
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
  }
);
