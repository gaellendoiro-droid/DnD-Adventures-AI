/**
 * @fileOverview Clasificador y traductor centralizado de errores de proveedores de IA
 * (Groq, Google Gemini, ElevenLabs, Red).
 * Convierte errores crudos de las APIs en diagnósticos estructurados y comprensibles en español
 * para informar al jugador sin bloquear nunca la aplicación.
 */

export type AIErrorCode =
  | 'RATE_LIMIT_TPM'
  | 'RATE_LIMIT_RPM'
  | 'QUOTA_DAILY_EXCEEDED'
  | 'PAYLOAD_TOO_LARGE'
  | 'AUTH_ERROR'
  | 'PROVIDER_OVERLOADED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_AI_ERROR';

export type AIProviderName = 'Groq' | 'Google Gemini' | 'ElevenLabs' | 'Servidor IA';

export interface AIProviderErrorInfo {
  code: AIErrorCode;
  provider: AIProviderName;
  model?: string;
  title: string;
  userMessage: string;
  suggestion: string;
  retryAfterSeconds?: number;
  isRetryable: boolean;
  rawMessage: string;
}

/**
 * Extrae el tiempo de espera sugerido (en segundos) de un mensaje de error de Groq o Gemini.
 * Soporta formatos:
 * - "Please try again in 3.9525s" (Groq)
 * - "Please try again in 450ms" (Groq)
 * - "Please retry in 19h28m51.17s" / "Please retry in 12.4s" (Google Gemini)
 */
export function extractRetryAfterSeconds(rawText: string): number | undefined {
  if (!rawText) return undefined;

  // Formato complejo con horas/minutos/segundos: ej. "19h28m51.17s" o "2m15s"
  const hmsMatch = rawText.match(/(?:retry|try again) in\s*(?:(\d+)h)?(?:(\d+)m)?([\d.]+)s/i);
  if (hmsMatch && (hmsMatch[1] || hmsMatch[2])) {
    const hours = parseInt(hmsMatch[1] || '0', 10);
    const minutes = parseInt(hmsMatch[2] || '0', 10);
    const seconds = parseFloat(hmsMatch[3] || '0');
    return Math.ceil(hours * 3600 + minutes * 60 + seconds);
  }

  // Formato milisegundos: ej. "Please try again in 450ms"
  const msMatch = rawText.match(/(?:retry|try again) in\s*([\d.]+)\s*ms/i);
  if (msMatch) {
    const ms = parseFloat(msMatch[1]);
    return Math.max(1, Math.ceil(ms / 1000));
  }

  // Formato segundos simples: ej. "Please try again in 3.9525s" o "Please retry in 15.2s"
  const secMatch = rawText.match(/(?:retry|try again) in\s*([\d.]+)\s*s/i);
  if (secMatch) {
    return Math.max(1, Math.ceil(parseFloat(secMatch[1])));
  }

  return undefined;
}

/**
 * Detecta el proveedor de IA a partir del texto del error.
 */
function detectProvider(raw: string): AIProviderName {
  const lower = raw.toLowerCase();
  if (
    lower.includes('groq') ||
    lower.includes('qwen/') ||
    lower.includes('openai/gpt-oss') ||
    lower.includes('console.groq.com')
  ) {
    return 'Groq';
  }
  if (
    lower.includes('generativelanguage.googleapis.com') ||
    lower.includes('gemini') ||
    lower.includes('google') ||
    lower.includes('ai.google.dev')
  ) {
    return 'Google Gemini';
  }
  if (lower.includes('elevenlabs')) {
    return 'ElevenLabs';
  }
  return 'Servidor IA';
}

/**
 * Extrae el nombre del modelo involucrado en el fallo si aparece en el texto del error.
 */
function extractModelName(raw: string): string | undefined {
  // Groq: "for model `openai/gpt-oss-20b`" o "for model `qwen/qwen3.8-27b`"
  const groqModelMatch = raw.match(/for model [`'"]?([a-zA-Z0-9._/-]+)[`'"]?/i);
  if (groqModelMatch) return groqModelMatch[1];

  // Gemini: "models/gemini-3.5-flash:generateContent" o "model: gemini-3.6-flash"
  const geminiModelMatch =
    raw.match(/models\/([a-zA-Z0-9._-]+):/i) || raw.match(/model:\s*([a-zA-Z0-9._-]+)/i);
  if (geminiModelMatch) return geminiModelMatch[1];

  return undefined;
}

/**
 * Analiza cualquier error de IA o de red y devuelve una estructura `AIProviderErrorInfo`
 * lista para mostrarse al jugador en español de España.
 */
export function parseAIProviderError(error: unknown): AIProviderErrorInfo {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : JSON.stringify(error ?? 'Error desconocido');

  // Si ya viene serializado un AIProviderErrorInfo en details, lo respetamos
  if (
    error &&
    typeof error === 'object' &&
    'aiError' in (error as any) &&
    (error as any).aiError?.code
  ) {
    return (error as any).aiError as AIProviderErrorInfo;
  }

  const lower = rawMessage.toLowerCase();
  const provider = detectProvider(rawMessage);
  const model = extractModelName(rawMessage);
  const retryAfterSeconds = extractRetryAfterSeconds(rawMessage);
  const modelLabel = model ? ` (${model})` : '';

  // 1. Cuota diaria agotada (RPD / Free Tier Daily Quota)
  if (
    lower.includes('requests per day') ||
    lower.includes('tokens per day') ||
    lower.includes('free_tier_requests') ||
    (lower.includes('quota exceeded') && retryAfterSeconds && retryAfterSeconds > 300)
  ) {
    const limitMatch = rawMessage.match(/limit:\s*(\d+)/i);
    const limitText = limitMatch ? ` (${limitMatch[1]} peticiones/día)` : '';
    return {
      code: 'QUOTA_DAILY_EXCEEDED',
      provider,
      model,
      title: `Cuota diaria gratuita agotada en ${provider}`,
      userMessage: `Se ha alcanzado el límite diario del plan gratuito para el modelo${modelLabel}${limitText}.`,
      suggestion:
        'Cambia de proveedor/modelo en la configuración o espera a que se reinicie la cuota diaria.',
      retryAfterSeconds,
      isRetryable: true,
      rawMessage,
    };
  }

  // 2. Petición demasiado grande (413 Request Too Large / ITPM)
  if (lower.includes('413') || lower.includes('request too large')) {
    const limitsMatch = rawMessage.match(/limit\s*(\d+),\s*requested\s*(\d+)/i);
    const detail = limitsMatch
      ? ` (límite: ${limitsMatch[1]} tokens, solicitados: ${limitsMatch[2]})`
      : '';
    return {
      code: 'PAYLOAD_TOO_LARGE',
      provider,
      model,
      title: `Contexto demasiado grande para ${provider}`,
      userMessage: `El tamaño del contexto del turno superó el máximo por petición del plan gratuito${modelLabel}${detail}.`,
      suggestion:
        'Pulsa «Reintentar acción» para volver a enviarla con compactación de contexto.',
      retryAfterSeconds,
      isRetryable: true,
      rawMessage,
    };
  }

  // 3. Límite de tokens por minuto (429 TPM / ITPM)
  if (
    (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) &&
    (lower.includes('tokens per minute') || lower.includes('tpm'))
  ) {
    const usageMatch = rawMessage.match(/limit\s*(\d+),\s*used\s*(\d+),\s*requested\s*(\d+)/i);
    const usageDetail = usageMatch
      ? ` (límite: ${usageMatch[1]} TPM, en uso: ${usageMatch[2]}, solicitados: ${usageMatch[3]})`
      : '';
    const waitDetail = retryAfterSeconds
      ? ` El cupo se recarga en apenas ${retryAfterSeconds} ${retryAfterSeconds === 1 ? 'segundo' : 'segundos'}.`
      : ' El cupo por minuto se recarga en unos segundos.';

    return {
      code: 'RATE_LIMIT_TPM',
      provider,
      model,
      title: `Límite de velocidad por minuto en ${provider}`,
      userMessage: `Se ha alcanzado momentáneamente el tope de tokens por minuto del plan gratuito${modelLabel}${usageDetail}.${waitDetail}`,
      suggestion: retryAfterSeconds
        ? `Espera ~${retryAfterSeconds}s y pulsa «Reintentar acción».`
        : 'Espera unos segundos y pulsa «Reintentar acción».',
      retryAfterSeconds,
      isRetryable: true,
      rawMessage,
    };
  }

  // 4. Límite de peticiones por minuto genérico (429 RPM)
  if (
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('resource exhausted')
  ) {
    const waitDetail = retryAfterSeconds
      ? ` Estará disponible de nuevo en ~${retryAfterSeconds}s.`
      : ' Estará disponible de nuevo en unos segundos.';
    return {
      code: 'RATE_LIMIT_RPM',
      provider,
      model,
      title: `Demasiadas peticiones seguidas a ${provider}`,
      userMessage: `El proveedor de IA${modelLabel} ha recibido demasiadas consultas en el último minuto.${waitDetail}`,
      suggestion: 'Espera unos segundos y pulsa «Reintentar acción».',
      retryAfterSeconds,
      isRetryable: true,
      rawMessage,
    };
  }

  // 5. Error de autenticación / API Key (401 / 403)
  if (
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('invalid api key') ||
    lower.includes('api_key_invalid') ||
    lower.includes('no está configurada') ||
    lower.includes('unauthorized')
  ) {
    return {
      code: 'AUTH_ERROR',
      provider,
      model,
      title: `Error de clave API en ${provider}`,
      userMessage: `La clave de acceso (API Key) para ${provider} no es válida, ha caducado o no tiene permisos.`,
      suggestion: 'Revisa las variables GROQ_API_KEY o GOOGLE_GENAI_API_KEY en tu archivo .env.',
      isRetryable: false,
      rawMessage,
    };
  }

  // 6. Proveedor saturado o caído (500 / 502 / 503 / 529)
  if (
    lower.includes('503') ||
    lower.includes('502') ||
    lower.includes('529') ||
    lower.includes('overloaded') ||
    lower.includes('service unavailable')
  ) {
    return {
      code: 'PROVIDER_OVERLOADED',
      provider,
      model,
      title: `Servidores de ${provider} saturados`,
      userMessage: `El servicio de ${provider}${modelLabel} está experimentando alta demanda temporalmente.`,
      suggestion: 'Pulsa «Reintentar acción» en unos segundos.',
      retryAfterSeconds: retryAfterSeconds ?? 5,
      isRetryable: true,
      rawMessage,
    };
  }

  // 7. Error de red o timeout
  if (
    lower.includes('fetch failed') ||
    lower.includes('timeout') ||
    lower.includes('econnreset') ||
    lower.includes('network')
  ) {
    return {
      code: 'NETWORK_ERROR',
      provider,
      model,
      title: `Tiempo de espera agotado con ${provider}`,
      userMessage: `La conexión con ${provider}${modelLabel} tardó demasiado en responder o se interrumpió.`,
      suggestion: 'Comprueba tu conexión y pulsa «Reintentar acción».',
      isRetryable: true,
      rawMessage,
    };
  }

  // 8. Error general de IA
  return {
    code: 'UNKNOWN_AI_ERROR',
    provider,
    model,
    title: `Incidencia en el proveedor de IA (${provider})`,
    userMessage: `No se pudo completar la respuesta de ${provider}${modelLabel}: ${rawMessage}`,
    suggestion: 'Pulsa «Reintentar acción» para volver a intentarlo.',
    isRetryable: true,
    rawMessage,
  };
}
