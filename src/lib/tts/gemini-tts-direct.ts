import { GoogleGenerativeAI } from '@google/generative-ai';
import { log } from '@/lib/logger';
import { retryWithExponentialBackoff } from '@/ai/flows/retry-utils';
import { ttsCache } from '@/lib/tts/tts-cache';

export interface GeminiTTSConfig {
    voiceName?: string;
}

export interface GeminiTTSResponse {
    audioDataUri: string;
    format: 'wav' | 'mp3';
}

/**
 * Genera audio llamando directamente a la API de Google Gemini (Server-side only)
 * usando el modelo gemini-3.1-flash-tts-preview.
 */
export async function generateGeminiAudioDirect(
    text: string,
    config: GeminiTTSConfig
): Promise<GeminiTTSResponse> {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        log.error('GOOGLE_GENAI_API_KEY no configurada', { module: 'Gemini TTS Direct' });
        throw new Error('GOOGLE_GENAI_API_KEY no está configurada en variables de entorno');
    }

    const voiceName = config.voiceName || process.env.GEMINI_TTS_VOICE || 'Enceladus';
    const profile = process.env.GEMINI_TTS_PROFILE || '';
    const style = process.env.GEMINI_TTS_STYLE || 'Empathetic';
    const pace = process.env.GEMINI_TTS_PACE || 'Rapid Fire';
    const accent = process.env.GEMINI_TTS_ACCENT || '';

    // Verificar caché primero
    const cachedAudio = await ttsCache.get({
        text,
        voiceId: `gemini-${voiceName}`,
        modelId: 'gemini-3.1-flash-tts-preview',
    });

    if (cachedAudio) {
        return {
            audioDataUri: cachedAudio,
            format: 'wav'
        };
    }

    const MAX_TEXT_LENGTH = 5000;
    const textToConvert = text.trim().substring(0, MAX_TEXT_LENGTH);

    if (text.length > MAX_TEXT_LENGTH) {
        log.warn('Texto truncado para Gemini TTS', {
            module: 'Gemini TTS Direct',
            originalLength: text.length,
            truncatedLength: textToConvert.length
        });
    }

    // Construir el prompt estructurado de dirección de audio de forma dinámica
    let structuredPrompt = `# AUDIO PROFILE: ${voiceName}`;
    if (profile) {
        structuredPrompt += `, ${profile}`;
    }
    structuredPrompt += `\n### DIRECTOR'S NOTES\n- Style: ${style}\n- Pace: ${pace}`;
    if (accent) {
        structuredPrompt += `\n- Accent: ${accent}`;
    }
    structuredPrompt += `\n\n#### TRANSCRIPT\n${textToConvert}`;

    log.info('Generando audio con Gemini TTS directamente', {
        module: 'Gemini TTS Direct',
        textLength: textToConvert.length,
        voiceName,
        profile,
        style,
        pace,
        accent
    });

    try {
        const genAI = new GoogleGenerativeAI(apiKey.trim());
        const model = genAI.getGenerativeModel({
            model: 'gemini-3.1-flash-tts-preview',
        });

        const response = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: structuredPrompt }] }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: voiceName
                        }
                    }
                }
            } as any
        });

        const candidate = response.response?.candidates?.[0];
        const part = candidate?.content?.parts?.[0];
        const inlineData = part?.inlineData;

        if (!inlineData || !inlineData.data) {
            log.error('No se recibió audio en la respuesta de Gemini TTS', {
                module: 'Gemini TTS Direct',
                response: JSON.stringify(response)
            });
            throw new Error('No se recibió audio en la respuesta de Gemini TTS');
        }

        const mimeType = inlineData.mimeType || 'audio/l16; rate=24000; channels=1';
        let base64Audio = inlineData.data;
        let finalMimeType = 'audio/wav';

        if (mimeType.includes('audio/l16') || mimeType.includes('l16')) {
            const pcmBuffer = Buffer.from(base64Audio, 'base64');
            
            // Valores por defecto
            let sampleRate = 24000;
            let numChannels = 1;

            // Intentar parsear sample rate y canales
            const rateMatch = mimeType.match(/rate=(\d+)/);
            if (rateMatch) {
                sampleRate = parseInt(rateMatch[1], 10);
            }
            const channelsMatch = mimeType.match(/channels=(\d+)/);
            if (channelsMatch) {
                numChannels = parseInt(channelsMatch[1], 10);
            }

            const header = createWavHeader(pcmBuffer.length, sampleRate, numChannels, 16);
            const wavBuffer = Buffer.concat([header, pcmBuffer]);
            base64Audio = wavBuffer.toString('base64');
            finalMimeType = 'audio/wav';
        } else if (mimeType.includes('audio/mpeg') || mimeType.includes('audio/mp3') || mimeType.includes('mp3')) {
            finalMimeType = 'audio/mpeg';
        } else {
            finalMimeType = mimeType;
        }

        const audioDataUri = `data:${finalMimeType};base64,${base64Audio}`;

        // Guardar en caché asíncronamente
        ttsCache.set({
            text,
            voiceId: `gemini-${voiceName}`,
            modelId: 'gemini-3.1-flash-tts-preview',
        }, audioDataUri).catch(err => {
            log.error('Error guardando en caché TTS (Gemini)', { module: 'TTS Cache', error: err });
        });

        log.info('Audio generado exitosamente con Gemini TTS', {
            module: 'Gemini TTS Direct',
            originalMimeType: mimeType,
            finalMimeType,
            audioSizeKB: Math.round(Buffer.byteLength(base64Audio, 'base64') / 1024)
        });

        return {
            audioDataUri,
            format: finalMimeType.includes('mp3') ? 'mp3' : 'wav',
        };

    } catch (error: any) {
        log.error('Error en la llamada a Gemini TTS API', {
            module: 'Gemini TTS Direct',
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Versión con reintentos automáticos de generateGeminiAudioDirect.
 */
export async function generateGeminiAudioDirectWithRetry(
    text: string,
    config: GeminiTTSConfig,
    maxRetries = 3
): Promise<GeminiTTSResponse> {
    return retryWithExponentialBackoff(
        () => generateGeminiAudioDirect(text, config),
        maxRetries,
        500,
        'Gemini-TTS-Direct'
    );
}

function createWavHeader(dataLength: number, sampleRate = 24000, numChannels = 1, bitDepth = 16): Buffer {
    const buffer = Buffer.alloc(44);
    const byteRate = sampleRate * numChannels * (bitDepth / 8);
    const blockAlign = numChannels * (bitDepth / 8);

    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4); // File size - 8
    buffer.write('WAVE', 8);
    
    // fmt chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);             // Chunk size
    buffer.writeUInt16LE(1, 20);              // Audio format (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitDepth, 34);
    
    // data chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);
    
    return buffer;
}

