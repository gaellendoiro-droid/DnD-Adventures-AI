/**
 * @fileOverview Plugin/adaptador de Groq para Genkit.
 * Permite utilizar modelos open-source ultrarrápidos (Qwen 3.8 27B, GPT-OSS 120B, GPT-OSS 20B)
 * a través de la API compatible con OpenAI de Groq, incluyendo:
 * - Compactación inteligente de JSON en prompts (reducción de ~80% de tokens de entrada para evitar errores 413).
 * - Enrutamiento inteligente por tipo de agente para repartir la cuota de tokens por minuto (ITPM) entre 3 cubos independientes.
 * - Rotación automática (fallback) ante errores 413/429 y espera activa si los 3 cubos están llenos.
 * - Sanitización automática de esquemas JSON/Zod.
 */

import { Genkit, z } from 'genkit';
import type { GenerateRequest, GenerateResponseData, Part } from 'genkit';
import { log } from '../lib/logger';
import { extractRetryAfterSeconds } from '../lib/ai/ai-error-handler';

export const GROQ_DEFAULT_MODEL = 'groq/qwen/qwen3.8-27b';

export const KNOWN_GROQ_MODELS = [
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'allam-2-7b',
];

const GroqConfigSchema = z
  .object({
    temperature: z.number().optional(),
    topP: z.number().optional(),
    maxOutputTokens: z.number().optional(),
    apiKey: z.string().optional(),
  })
  .passthrough();

/**
 * Compacta recursivamente estructuras JSON pesadas (como `party`, `presentEntities` o `locationContext`)
 * antes de enviarlas a Groq para reducir drásticamente el consumo de tokens de entrada (ITPM)
 * sin perder ningún dato relevante para la narración ni las reglas.
 */
function compactJsonValue(val: any): any {
  if (val === null || val === undefined || typeof val !== 'object') {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map(compactJsonValue);
  }

  // 1. Detectar ficha completa de Personaje (Character de la party)
  if (
    ('characterClass' in val || 'abilityScores' in val || 'proficiencies' in val) &&
    'name' in val
  ) {
    const compactedChar: Record<string, any> = {
      name: val.name,
      sex: val.sex,
      race: val.race,
      characterClass: val.characterClass,
      level: val.level,
      controlledBy: val.controlledBy,
    };
    if (val.hp) {
      compactedChar.hp = `${val.hp.current}/${val.hp.max}`;
    }
    if (Array.isArray(val.inventory) && val.inventory.length > 0) {
      compactedChar.inventory = val.inventory.map((it: any) =>
        typeof it === 'string'
          ? it
          : {
              id: it.id,
              name: it.name,
              quantity: it.quantity ?? 1,
            }
      );
    } else {
      compactedChar.inventory = [];
    }
    if (Array.isArray(val.spells) && val.spells.length > 0) {
      compactedChar.spells = val.spells.map((sp: any) =>
        typeof sp === 'string' ? sp : sp.name
      );
    }
    return compactedChar;
  }

  // 2. Detectar entidad / NPC de aventura con bloque pesado de estadísticas de combate
  if (('disposition' in val || 'roleplay' in val || 'baseType' in val) && 'stats' in val) {
    const copy: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === 'stats' && v && typeof v === 'object') {
        const st = v as any;
        copy.stats = { ac: st.ac, hp: st.hp, cr: st.cr };
      } else if (k === 'image' || k === 'avatarUrl' || k === 'tokenUrl') {
        continue;
      } else {
        copy[k] = compactJsonValue(v);
      }
    }
    return copy;
  }

  // 3. Objeto general: eliminar campos multimedia pesados y compactar hijos
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (k === 'avatarUrl' || k === 'imageUrl' || k === 'image' || k === 'audioDataUri') {
      continue;
    }
    out[k] = compactJsonValue(v);
  }
  return out;
}

/**
 * Escanea y compacta arrays/objetos JSON sueltos en líneas tipo `- **Present Entities:** [...]`
 * usando conteo balanceado de llaves/corchetes.
 */
function compactBalancedInlineJson(text: string): string {
  const markers = [
    'Present Entities:',
    'Visible Connections:',
    'Door States:',
    'All Possible Locations:',
    'Updated Enemies (Current Combat State):',
  ];

  let output = text;
  for (const marker of markers) {
    const idx = output.indexOf(marker);
    if (idx === -1) continue;

    // Buscar primer '[' o '{' tras el marcador
    let startIdx = -1;
    for (let i = idx + marker.length; i < Math.min(idx + marker.length + 30, output.length); i++) {
      const ch = output[i];
      if (ch === '[' || ch === '{') {
        startIdx = i;
        break;
      } else if (ch === '`' || ch === '\n') {
        if (ch === '`') break; // Ya está en bloque ```json
      }
    }
    if (startIdx === -1) continue;

    const openChar = output[startIdx];
    const closeChar = openChar === '[' ? ']' : '}';
    let depth = 0;
    let inString = false;
    let escape = false;
    let endIdx = -1;

    for (let i = startIdx; i < output.length; i++) {
      const ch = output[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\' && inString) {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (ch === openChar) depth++;
        else if (ch === closeChar) {
          depth--;
          if (depth === 0) {
            endIdx = i;
            break;
          }
        }
      }
    }

    if (endIdx !== -1 && endIdx - startIdx > 200) {
      const candidate = output.substring(startIdx, endIdx + 1);
      try {
        const parsed = JSON.parse(candidate);
        const compacted = JSON.stringify(compactJsonValue(parsed));
        output = output.substring(0, startIdx) + compacted + output.substring(endIdx + 1);
      } catch {
        // Ignorar si no es JSON válido
      }
    }
  }

  return output;
}

/**
 * Compacta bloques JSON incrustados dentro de un texto de prompt (tanto en bloques ```json
 * como bloques JSON sueltos de Handlebars) para evitar errores 413/429 en Groq Free Tier.
 */
function compactPromptText(text: string): string {
  if (!text || text.length < 1200) return text;

  // 1. Compactar todos los bloques ```json ... ``` o ``` ... ``` que contengan JSON
  let result = text.replace(/```(?:json)?\s*([\s\S]*?)```/gi, (fullMatch, inner: string) => {
    const trimmed = inner.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        const compacted = compactJsonValue(parsed);
        return '```json\n' + JSON.stringify(compacted) + '\n```';
      } catch {
        return fullMatch;
      }
    }
    return fullMatch;
  });

  // 2. Compactar estructuras JSON inline (ej. Present Entities: [...]) con balanceo de corchetes
  result = compactBalancedInlineJson(result);

  // 3. Reducir saltos de línea triples o mayores
  result = result.replace(/\n{3,}/g, '\n\n');

  // 4. Límite de seguridad duro (~14.000 caracteres ≈ 3.500 tokens) para garantizar margen en el cubo de 8.000 TPM
  const MAX_PROMPT_CHARS = 14000;
  if (result.length > MAX_PROMPT_CHARS) {
    const headLen = Math.floor(MAX_PROMPT_CHARS * 0.45);
    const tailLen = Math.floor(MAX_PROMPT_CHARS * 0.5);
    result =
      result.substring(0, headLen) +
      '\n...[context compacted]...\n' +
      result.substring(result.length - tailLen);
  }

  return result;
}

/**
 * Selecciona el orden óptimo de modelos en Groq según el tipo de tarea del agente,
 * repartiendo la carga entre los 3 cubos independientes de 8.000 TPM (24.000 TPM totales).
 */
function selectModelCandidates(defaultModelId: string, promptPreview: string): string[] {
  const lower = promptPreview.toLowerCase();

  // Tareas ligeras/frecuentes (Action Interpreter, Router, Companion Reactions, Skill Check classification) -> gpt-oss-20b primero
  if (
    lower.includes('action interpreter') ||
    lower.includes('classify it into one of three categories') ||
    lower.includes('companion') ||
    lower.includes('reaccion') ||
    lower.includes('skill check')
  ) {
    return ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];
  }

  // Director de escena / Síntesis final -> gpt-oss-120b primero
  if (
    lower.includes('central dungeon master') ||
    lower.includes('scene director') ||
    lower.includes('master storyteller')
  ) {
    return ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
  }

  // Expertos principales (ExplorationExpert, InteractionExpert, Combat) -> qwen/qwen3.8-27b primero
  const baseOrder = [
    defaultModelId,
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
  ];
  return Array.from(new Set(baseOrder));
}

/**
 * Extrae el primer bloque JSON válido de una cadena de texto.
 */
function extractJsonFromText(text: string): any | null {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Continuar
  }

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continuar
    }
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    } catch {
      // Continuar
    }
  }

  return null;
}

/**
 * Comprueba si un sub-esquema JSON permite explícitamente el valor null.
 */
function schemaAllowsNull(propSchema: any): boolean {
  if (!propSchema) return true;
  if (propSchema.nullable === true) return true;
  if (propSchema.type === 'null') return true;
  if (Array.isArray(propSchema.type) && propSchema.type.includes('null')) return true;
  if (Array.isArray(propSchema.anyOf) && propSchema.anyOf.some((s: any) => schemaAllowsNull(s))) return true;
  if (Array.isArray(propSchema.oneOf) && propSchema.oneOf.some((s: any) => schemaAllowsNull(s))) return true;
  if (!propSchema.type && !propSchema.anyOf && !propSchema.oneOf && !propSchema.properties) return true;
  return false;
}

/**
 * Sanitiza recursivamente un objeto JSON según el JSON Schema esperado por Genkit/Zod.
 */
function sanitizeJsonForSchema(data: any, schema: any): any {
  if (!schema || data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    const itemSchema = schema.items;
    return data.map((item) => sanitizeJsonForSchema(item, itemSchema));
  }

  if (typeof data === 'object') {
    const properties = schema.properties || {};
    const required: string[] = Array.isArray(schema.required) ? schema.required : [];
    const result: Record<string, any> = { ...data };

    for (const key of Object.keys(result)) {
      const val = result[key];
      const propSchema = properties[key];

      if (val === null) {
        if (!schemaAllowsNull(propSchema)) {
          if (!required.includes(key)) {
            delete result[key];
          } else if (propSchema?.type === 'string') {
            result[key] = '';
          } else if (propSchema?.type === 'array') {
            result[key] = [];
          } else if (propSchema?.type === 'object') {
            result[key] = {};
          }
        }
      } else if (typeof val === 'object' && propSchema) {
        result[key] = sanitizeJsonForSchema(val, propSchema);
      }
    }

    return result;
  }

  return data;
}

/**
 * Convierte los mensajes de Genkit al formato estándar OpenAI Chat Completions,
 * aplicando compactación de JSON para minimizar el tamaño en tokens.
 */
function toOpenAIMessages(request: GenerateRequest<any>): any[] {
  const openAIMessages: any[] = [];
  const hasJsonSchema = Boolean(request.output?.schema || request.output?.format === 'json');

  for (const msg of request.messages) {
    const rawTextParts = msg.content
      .filter((p) => typeof p.text === 'string' && p.text.length > 0)
      .map((p) => p.text!)
      .join('\n\n');

    const textParts = compactPromptText(rawTextParts);

    if (msg.role === 'system') {
      openAIMessages.push({
        role: 'system',
        content: textParts,
      });
    } else if (msg.role === 'user') {
      openAIMessages.push({
        role: 'user',
        content: textParts,
      });
    } else if (msg.role === 'model') {
      const toolRequests = msg.content.filter((p) => p.toolRequest);
      if (toolRequests.length > 0) {
        openAIMessages.push({
          role: 'assistant',
          content: textParts || null,
          tool_calls: toolRequests.map((p, idx) => ({
            id: p.toolRequest!.ref || `call_${idx}`,
            type: 'function',
            function: {
              name: p.toolRequest!.name.replace(/\//g, '__'),
              arguments:
                typeof p.toolRequest!.input === 'string'
                  ? p.toolRequest!.input
                  : JSON.stringify(p.toolRequest!.input ?? {}),
            },
          })),
        });
      } else {
        openAIMessages.push({
          role: 'assistant',
          content: textParts || '',
        });
      }
    } else if (msg.role === 'tool') {
      const toolResponses = msg.content.filter((p) => p.toolResponse);
      for (const tr of toolResponses) {
        openAIMessages.push({
          role: 'tool',
          tool_call_id: tr.toolResponse!.ref || 'call_0',
          content:
            typeof tr.toolResponse!.output === 'string'
              ? tr.toolResponse!.output
              : JSON.stringify(tr.toolResponse!.output ?? {}),
        });
      }
    }
  }

  if (hasJsonSchema && request.output?.schema) {
    const schemaInstruction = `\n\nIMPORTANT: Your final response MUST be a valid JSON object conforming strictly to the following JSON Schema. Do NOT wrap it in explanations. Omit optional properties instead of setting them to null unless null is explicitly allowed:\n\`\`\`json\n${JSON.stringify(request.output.schema)}\n\`\`\``;

    let injected = false;
    for (let i = openAIMessages.length - 1; i >= 0; i--) {
      if (openAIMessages[i].role === 'user' || openAIMessages[i].role === 'system') {
        openAIMessages[i].content = (openAIMessages[i].content || '') + schemaInstruction;
        injected = true;
        break;
      }
    }
    if (!injected && openAIMessages.length > 0) {
      openAIMessages.unshift({
        role: 'system',
        content: schemaInstruction.trim(),
      });
    }
  }

  return openAIMessages;
}

function toOpenAITools(tools?: any[], hasJsonSchema?: boolean): any[] | undefined {
  if (!tools || tools.length === 0 || hasJsonSchema) return undefined;

  return tools.map((tool) => {
    const parameters = { ...(tool.inputSchema || { type: 'object', properties: {} }) };
    delete (parameters as any).$schema;
    return {
      type: 'function',
      function: {
        name: tool.name.replace(/\//g, '__'),
        description: tool.description || '',
        parameters,
      },
    };
  });
}

/**
 * Registra un modelo de Groq en la instancia de Genkit.
 */
function defineGroqModel(ai: Genkit, modelId: string) {
  const fullName = `groq/${modelId}`;

  ai.defineModel(
    {
      apiVersion: 'v2',
      name: fullName,
      label: `Groq - ${modelId}`,
      configSchema: GroqConfigSchema,
      supports: {
        multiturn: true,
        tools: true,
        toolChoice: true,
        systemRole: true,
        media: false,
        output: ['text', 'json'],
        constrained: 'all',
      },
    },
    async (request, { streamingRequested, sendChunk, abortSignal }) => {
      const apiKey =
        request.config?.apiKey ||
        process.env.GROQ_API_KEY ||
        process.env.OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error(
          'GROQ_API_KEY no está configurada en las variables de entorno (.env / .env.local).'
        );
      }

      const messages = toOpenAIMessages(request);
      const hasJsonSchema = Boolean(request.output?.schema || request.output?.format === 'json');
      const tools = toOpenAITools(request.tools, hasJsonSchema);

      const firstMsgPreview = messages.map((m) => m.content || '').join(' ').substring(0, 600);
      const candidateModels = selectModelCandidates(modelId, firstMsgPreview);

      let data: any = null;
      let lastStatus = 500;
      let lastErrMsg = '';
      let shortestWaitSec: number | undefined = undefined;
      let bestRetryModel: string = candidateModels[0];

      const callGroqModel = async (currentModel: string) => {
        const body: Record<string, any> = {
          model: currentModel,
          messages,
          temperature: request.config?.temperature ?? 0.7,
        };

        if (request.config?.topP !== undefined) {
          body.top_p = request.config.topP;
        }
        // Ajustar max_tokens según el modelo: qwen tiene límite OTPM=1000, mientras que gpt-oss admite hasta 1200 sin truncar JSON
        const isQwen = currentModel.toLowerCase().includes('qwen');
        const defaultCap = isQwen ? 850 : 1200;
        body.max_tokens = Math.min(request.config?.maxOutputTokens || defaultCap, defaultCap);

        if (tools && tools.length > 0) {
          body.tools = tools;
          body.tool_choice = 'auto';
        } else if (hasJsonSchema && !isQwen) {
          // En Qwen no forzamos response_format: json_object porque emite etiquetas <think> que hacen fallar al validador 400 de Groq;
          // nuestro post-procesador ya limpia <think> y extrae el JSON limpiamente.
          body.response_format = { type: 'json_object' };
        }

        const timeoutSignal = AbortSignal.timeout(25000);
        const effectiveSignal = abortSignal
          ? AbortSignal.any([abortSignal, timeoutSignal])
          : timeoutSignal;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: effectiveSignal,
        });

        const parsed = await response.json();
        return { response, parsed };
      };

      for (let i = 0; i < candidateModels.length; i++) {
        const currentModel = candidateModels[i];
        const { response, parsed } = await callGroqModel(currentModel);

        if (response.ok) {
          data = parsed;
          break;
        }

        lastStatus = response.status;
        lastErrMsg = parsed?.error?.message || JSON.stringify(parsed);

        if (response.status === 429) {
          const waitSec = extractRetryAfterSeconds(lastErrMsg);
          if (waitSec !== undefined && (shortestWaitSec === undefined || waitSec < shortestWaitSec)) {
            shortestWaitSec = waitSec;
            bestRetryModel = currentModel;
          }
        }

        // Si es 429 (Rate limit), 413 (ITPM limit reached) o 400 de generación JSON fallida y hay otros modelos en el pool, rotar inmediatamente
        const isJsonGen400 = response.status === 400 && /json|failed_generation/i.test(lastErrMsg);
        if ((response.status === 429 || response.status === 413 || isJsonGen400) && i < candidateModels.length - 1) {
          log.warn(
            `Límite/Fallo (${response.status}) en '${currentModel}', rotando a '${candidateModels[i + 1]}'...`,
            { module: 'GroqPlugin' }
          );
          continue;
        }
      }

      // Si los 3 modelos están temporalmente al límite por minuto pero el tiempo de recarga es corto (<= 15s),
      // esperamos automáticamente ese tiempo exacto y reintentamos el modelo que primero se libera.
      if (!data && lastStatus === 429 && shortestWaitSec !== undefined && shortestWaitSec <= 15) {
        const waitMs = Math.ceil(shortestWaitSec * 1000) + 350;
        log.info(
          `Los 3 cubos de Groq alcanzaron el límite TPM. Esperando automáticamente ${(waitMs / 1000).toFixed(1)}s para reintentar en '${bestRetryModel}'...`,
          { module: 'GroqPlugin' }
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        const retryAttempt = await callGroqModel(bestRetryModel);
        if (retryAttempt.response.ok) {
          data = retryAttempt.parsed;
        } else {
          lastStatus = retryAttempt.response.status;
          lastErrMsg = retryAttempt.parsed?.error?.message || JSON.stringify(retryAttempt.parsed);
        }
      }

      if (!data) {
        log.error(`Groq API Error [${lastStatus}]: ${lastErrMsg}`, {
          module: 'GroqPlugin',
          model: modelId,
          status: lastStatus,
        });
        const err: any = new Error(`Groq API Error [${lastStatus}]: ${lastErrMsg}`);
        err.status = lastStatus;
        throw err;
      }

      const choice = data.choices?.[0];
      const message = choice?.message;
      const contentParts: Part[] = [];

      if (message?.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
        for (const tc of message.tool_calls) {
          let parsedArgs: any = {};
          try {
            parsedArgs =
              typeof tc.function?.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : tc.function?.arguments ?? {};
          } catch {
            parsedArgs = {};
          }
          contentParts.push({
            toolRequest: {
              ref: tc.id,
              name: (tc.function?.name || '').replace(/__/g, '/'),
              input: parsedArgs,
            },
          });
        }
      }

      if (typeof message?.content === 'string' && message.content.length > 0) {
        let finalText = message.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        if ((!message.tool_calls || message.tool_calls.length === 0) && hasJsonSchema) {
          const parsedJson = extractJsonFromText(finalText);
          if (parsedJson !== null) {
            const sanitized = request.output?.schema
              ? sanitizeJsonForSchema(parsedJson, request.output.schema)
              : parsedJson;
            finalText = JSON.stringify(sanitized);
          }
        }

        contentParts.push({ text: finalText });

        if (streamingRequested && sendChunk) {
          sendChunk({
            index: 0,
            content: [{ text: finalText }],
          });
        }
      }

      if (contentParts.length === 0) {
        contentParts.push({ text: '' });
      }

      const result: GenerateResponseData = {
        candidates: [
          {
            index: 0,
            finishReason: choice?.finish_reason === 'length' ? 'length' : 'stop',
            message: {
              role: 'model',
              content: contentParts,
            },
          },
        ],
        usage: {
          inputTokens: data.usage?.prompt_tokens,
          outputTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens,
        },
        custom: data,
      };

      return result;
    }
  );
}

/**
 * Registra todos los modelos conocidos de Groq (y el modelo activo si es personalizado) en Genkit.
 */
export function registerGroqModels(ai: Genkit, activeModelName?: string) {
  const registered = new Set<string>();

  for (const modelId of KNOWN_GROQ_MODELS) {
    defineGroqModel(ai, modelId);
    registered.add(`groq/${modelId}`);
  }

  if (
    activeModelName &&
    activeModelName.startsWith('groq/') &&
    !registered.has(activeModelName)
  ) {
    const customModelId = activeModelName.replace(/^groq\//, '');
    defineGroqModel(ai, customModelId);
  }
}
