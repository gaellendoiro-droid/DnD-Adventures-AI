import { tool, z } from 'genkit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { log } from '@/lib/logger';
import { retryWithExponentialBackoff } from '../flows/retry-utils';

// Cache simple para evitar lecturas recurrentes del mismo file object
// (No se usa actualmente ya que usamos URI persistente, pero se deja por si acaso)

const ConsultRulebookSchema = z.object({
    query: z.string().describe("La pregunta específica sobre reglas, hechizos, objetos o mecánicas de D&D."),
    context: z.string().optional().describe("Contexto adicional (ej: 'Nivel 3', 'Clase Paladín')."),
});

export const consultRulebookTool = tool(
    {
        name: 'consultRulebook',
        description: 'Consulta el Manual del Jugador (PDF) oficial para resolver dudas de reglas, hechizos o tablas. Úsala cuando necesites precisión mecánica o extractos literales del manual.',
        inputSchema: ConsultRulebookSchema,
        outputSchema: z.string(),
    },
    async (input) => {
        const apiKey = process.env.GOOGLE_GENAI_API_KEY;
        if (!apiKey) throw new Error("API Key no configurada.");

        // URI Persistente del Manual
        const manualUri = process.env.GOOGLE_GENAI_MANUAL_URI || "https://generativelanguage.googleapis.com/v1beta/files/u5pc97h9vznm";
        const manualMimeType = "application/pdf";

        log.info(`Consultando Manual (SDK Raw) [${manualUri}]`, { module: 'ConsultRulebook', query: input.query });

        const prompt = `
Eres el Sabio de las Reglas (Dungeon Master Assistant).
Tienes acceso al Manual del Jugador oficial de D&D 5e (PDF adjunto).

Consulta: "${input.query}"
Contexto Adicional: ${input.context || "Sin contexto"}

Instrucciones:
1. RESPONDE ÚNICAMENTE basándote en el contenido del archivo PDF proporcionado.
2. IMPORTANTE: El PDF tiene páginas no consecutivas. Cita capítulos o secciones (ej: "Capítulo Combate", "Descripción de Hechizos") en lugar de números de página.
3. Si la respuesta es mecánica (daños, alcances, espacios de conjuro), sé EXACTO.
4. Si la regla no está en el manual, dilo claramente.
5. Formato: Markdown limpio.
`;

        try {
            return await retryWithExponentialBackoff(async () => {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({
                    model: "models/gemini-3-pro-preview"
                }, { apiVersion: 'v1beta' });

                const result = await model.generateContent([
                    {
                        fileData: {
                            mimeType: manualMimeType,
                            fileUri: manualUri
                        }
                    },
                    { text: prompt }
                ]);

                return result.response.text();
            }, 3, 1000, 'ConsultRulebookTool'); // 3 reintentos, 1s delay inicial

        } catch (error: any) {
            console.error("RAW ERROR (SDK) CONSULTING RULEBOOK (FINAL):", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
            log.error("Error consultando manual via SDK tras reintentos", {
                error: error.message,
                details: error
            });
            return "Lo siento, no pude consultar el tomo sagrado. Error técnico en la biblioteca arcana.";
        }
    }
);
