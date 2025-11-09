
'use server';
/**
 * @fileOverview Converts Dungeon Master's narration text to speech.
 *
 * - generateDmNarrationAudio - A function that handles the text-to-speech conversion.
 * - GenerateDmNarrationAudioInput - The input type for the function.
 * - GenerateDmNarrationAudioOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import wav from 'wav';
import { googleAI } from '@genkit-ai/google-genai';

const GenerateDmNarrationAudioInputSchema = z.object({
  narrationText: z.string().describe('The text to be converted to speech.'),
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

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', (d: Buffer) => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));

    writer.write(pcmData);
    writer.end();
  });
}

const generateDmNarrationAudioFlow = ai.defineFlow(
  {
    name: 'generateDmNarrationAudioFlow',
    inputSchema: GenerateDmNarrationAudioInputSchema,
    outputSchema: GenerateDmNarrationAudioOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' },
          },
        },
      },
      prompt: `(language: es-ES) (voice: deep and mysterious) ${input.narrationText}`,
    });

    if (!media) {
      throw new Error('No audio media was returned from the AI model.');
    }
    
    // The media URL is a base64 encoded data URI for PCM audio.
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    const wavBase64 = await toWav(audioBuffer);

    return {
      audioDataUri: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);
