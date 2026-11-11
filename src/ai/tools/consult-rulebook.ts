import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { log } from '@/lib/logger';
import { retryWithExponentialBackoff } from '../flows/retry-utils';
import { GEMINI_MODEL_NAME } from '../model-config';

const ConsultRulebookSchema = z.object({
    query: z.string().describe("La pregunta específica sobre reglas, hechizos, objetos o mecánicas de D&D."),
    context: z.string().optional().describe("Contexto adicional (ej: 'Nivel 3', 'Clase Paladín')."),
});

export const consultRulebookTool = ai.defineTool(
    {
        name: 'consultRulebook',
        description: 'Consulta el Manual del Jugador (PDF) oficial para resolver dudas de reglas, hechizos o tablas. Úsala cuando necesites precisión mecánica o extractos literales del manual.',
        inputSchema: ConsultRulebookSchema,
        outputSchema: z.string(),
    },
    async (input) => {
        if (GEMINI_MODEL_NAME.startsWith('groq/')) {
            log.info(`Consultando Biblioteca Arcana vía Groq (${GEMINI_MODEL_NAME})`, { module: 'ConsultRulebook', query: input.query });
            try {
                const response = await ai.generate({
                    model: GEMINI_MODEL_NAME,
                    prompt: `Eres el Sabio de las Reglas (Dungeon Master Assistant) experto en D&D 5e (Manual del Jugador y Manual de Monstruos).
Consulta: "${input.query}"
Contexto Adicional: ${input.context || "Sin contexto"}
Instrucciones:
1. Responde con precisión mecánica exacta (daños, alcances, CDs, espacios de conjuro, estadísticas oficiales de D&D 5e).
2. Cita el manual oficial correspondiente (PHB o MM).
3. Responde siempre en español de España en formato Markdown limpio.`,
                });
                return response.text;
            } catch (error: any) {
                log.error("Error consultando reglas vía Groq", { error: error.message });
                return "Lo siento, no pude consultar el tomo sagrado en este momento.";
            }
        }

        const apiKey = process.env.GOOGLE_GENAI_API_KEY;
        if (!apiKey) throw new Error("API Key no configurada.");

        const { RulebookManager } = await import('@/lib/game/rulebook-manager');
        const fileUris = await RulebookManager.getOrUploadManuals(apiKey);

        const manualMimeType = "application/pdf";

        log.info(`Consultando Biblioteca Arcana (${fileUris.length} volúmenes)`, { module: 'ConsultRulebook', query: input.query });

        const prompt = `
Eres el Sabio de las Reglas (Dungeon Master Assistant).
Tienes acceso a la Biblioteca Oficial de D&D 5e (Manual del Jugador y Manual de Monstruos).

Consulta: "${input.query}"
Contexto Adicional: ${input.context || "Sin contexto"}

Instrucciones:
1. RESPONDE ÚNICAMENTE basándote en el contenido de los archivos PDF proporcionados.
2. IMPORTANTE: Los manuales pueden estar dividios en partes. Cita el libro y la sección (ej: "Manual de Monstruos, Entrada del Nothic" o "PHB, Cap. Combate").
3. Si la respuesta es mecánica (daños, alcances, espacios de conjuro), sé EXACTO.
4. Si la regla no está en ninguno de los manuales, dilo claramente.
5. Formato: Markdown limpio.
`;

        try {
            return await retryWithExponentialBackoff(async () => {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({
                    model: GEMINI_MODEL_NAME.replace('googleai/', '') // SDK uses clean name
                }, { apiVersion: 'v1beta' });

                // Construir el array de contenidos con múltiples archivos
                const contentParts: any[] = fileUris.map(uri => ({
                    fileData: {
                        mimeType: manualMimeType,
                        fileUri: uri
                    }
                }));

                // Añadir el prompt al final
                contentParts.push({ text: prompt });

                const result = await model.generateContent(contentParts);

                const text = result.response.text();
                log.debug(`🐉 [DEBUG CONSULTA PDF] Respuesta cruda de Gemini (Primeras 500 letras):\n${text.substring(0, 500)}\n... [Fin del snippet] 🐉`, { module: 'ConsultRulebook' });

                return text;
            }, 3, 1000, 'ConsultRulebookTool'); // 3 reintentos, 1s delay inicial

        } catch (error: any) {
            log.error("RAW ERROR (SDK) CONSULTING RULEBOOK (FINAL)", {
                module: 'ConsultRulebook',
                error: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
            });
            log.error("Error consultando manual via SDK tras reintentos", {
                error: error.message,
                details: error
            });
            return "Lo siento, no pude consultar el tomo sagrado. Error técnico en la biblioteca arcana.";
        }
    }
);
