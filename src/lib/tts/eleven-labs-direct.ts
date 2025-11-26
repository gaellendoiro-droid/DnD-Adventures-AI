import { log } from '@/lib/logger';
import { prewarmConnection, retryWithExponentialBackoff } from '@/ai/flows/retry-utils';
import { ttsCache } from '@/lib/tts/tts-cache';

export interface ElevenLabsDirectConfig {
    voiceId: string;
    modelId?: string;
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
}

export interface ElevenLabsDirectResponse {
    audioDataUri: string;
    format: 'mp3';
}

/**
 * Genera audio llamando directamente a la API de Eleven Labs (Server-side only).
 * Esta función debe usarse solo desde el servidor (Server Actions, API Routes)
 * ya que requiere acceso a la API Key en variables de entorno.
 */
export async function generateAudioDirect(
    text: string,
    config: ElevenLabsDirectConfig
): Promise<ElevenLabsDirectResponse> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        log.error('ELEVENLABS_API_KEY no configurada', { module: 'ElevenLabs Direct' });
        throw new Error('ELEVENLABS_API_KEY no está configurada en variables de entorno');
    }

    // Verificar caché primero
    const cachedAudio = await ttsCache.get({
        text,
        voiceId: config.voiceId,
        modelId: config.modelId,
        stability: config.stability,
        similarityBoost: config.similarityBoost,
        style: config.style,
        useSpeakerBoost: config.useSpeakerBoost
    });

    if (cachedAudio) {
        return {
            audioDataUri: cachedAudio,
            format: 'mp3'
        };
    }

    // Limitar la longitud del texto
    const MAX_TEXT_LENGTH = 5000;
    const textToConvert = text.trim().substring(0, MAX_TEXT_LENGTH);

    if (text.length > MAX_TEXT_LENGTH) {
        log.warn('Texto truncado', {
            module: 'ElevenLabs Direct',
            originalLength: text.length,
            truncatedLength: textToConvert.length
        });
    }

    log.info('Generando audio directamente', {
        module: 'ElevenLabs Direct',
        textLength: textToConvert.length,
        voiceId: config.voiceId
    });

    // Pre-warm de la conexión
    await prewarmConnection(
        'https://api.elevenlabs.io',
        '/v1/voices',
        { 'xi-api-key': apiKey.trim() },
        5000
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': apiKey.trim(),
            },
            body: JSON.stringify({
                text: textToConvert,
                model_id: config.modelId || process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
                voice_settings: {
                    stability: config.stability ?? 0.5,
                    similarity_boost: config.similarityBoost ?? 0.75,
                    style: config.style ?? 0.0,
                    use_speaker_boost: config.useSpeakerBoost ?? true,
                },
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Error desconocido');
            let errorDetail: any = {};
            try {
                errorDetail = JSON.parse(errorText);
            } catch {
                // Ignorar si no es JSON
            }

            log.error('Error en respuesta API', {
                module: 'ElevenLabs Direct',
                status: response.status,
                statusText: response.statusText,
                errorText
            });

            if (response.status === 401) {
                if (errorDetail.detail?.status === 'quota_exceeded') {
                    throw new Error(`Quota de Eleven Labs excedida: ${errorDetail.detail?.message || 'Límite alcanzado'}`);
                }
                throw new Error(`API Key inválida o sin permisos: ${errorText}`);
            } else if (response.status === 404) {
                throw new Error(`Voice ID no encontrado: ${errorText}`);
            } else if (response.status === 429) {
                throw new Error(`Límite de caracteres excedido: ${errorText}`);
            }

            throw new Error(`Eleven Labs API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        const audioDataUri = `data:audio/mpeg;base64,${base64Audio}`;

        // Guardar en caché asíncronamente
        ttsCache.set({
            text,
            voiceId: config.voiceId,
            modelId: config.modelId,
            stability: config.stability,
            similarityBoost: config.similarityBoost,
            style: config.style,
            useSpeakerBoost: config.useSpeakerBoost
        }, audioDataUri).catch(err => {
            log.error('Error guardando en caché TTS', { module: 'TTS Cache', error: err });
        });

        log.info('Audio generado exitosamente', {
            module: 'ElevenLabs Direct',
            audioSizeKB: Math.round(audioBuffer.byteLength / 1024)
        });

        return {
            audioDataUri,
            format: 'mp3',
        };

    } catch (error: any) {
        clearTimeout(timeoutId);
        // Propagar errores para que sean manejados por el caller o el retry
        throw error;
    }
}

/**
 * Versión con reintentos automáticos de generateAudioDirect.
 * Útil para llamadas directas desde Server Actions o Flows.
 */
export async function generateAudioDirectWithRetry(
    text: string,
    config: ElevenLabsDirectConfig,
    maxRetries = 3
): Promise<ElevenLabsDirectResponse> {
    return retryWithExponentialBackoff(
        () => generateAudioDirect(text, config),
        maxRetries,
        500,
        'ElevenLabs-Direct'
    );
}
