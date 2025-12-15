import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { log } from '@/lib/logger';
import { retryWithExponentialBackoff } from '../flows/retry-utils';
import { GEMINI_MODEL_NAME } from '../model-config';

// Cache simple para evitar lecturas recurrentes del mismo file object
// (No se usa actualmente ya que usamos URI persistente, pero se deja por si acaso)

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
        const apiKey = process.env.GOOGLE_GENAI_API_KEY;
        if (!apiKey) throw new Error("API Key no configurada.");

        // URIs Persistentes: PHB + MM Part 1 + MM Part 2
        // Idealmente cargaríamos esto de una variable de entorno GOOGLE_GENAI_KNOWLEDGE_URIS separada por comas
        // Por ahora, usaremos estos defaults hardcodeados + la variable de entorno simple
        const defaultUris = [
            "https://generativelanguage.googleapis.com/v1beta/files/7ji2goimrnvb", // PHB
            "https://generativelanguage.googleapis.com/v1beta/files/41odl5mikhz8", // MM Part 1
            "https://generativelanguage.googleapis.com/v1beta/files/re3mt0rgvvi6"  // MM Part 2
        ];

        let fileUris: string[] = defaultUris;

        if (process.env.GOOGLE_GENAI_MANUAL_URI) {
            // Si hay variable de entorno, intentamos ver si son varias separadas por coma, o si agregamos a la lista
            // Para simplificar, si el usuario define la variable, le damos prioridad, pero idealmente concatenamos.
            // Aquí asumiremos que la variable puede contener una lista separada por comas.
            const envUris = process.env.GOOGLE_GENAI_MANUAL_URI.split(',').map(u => u.trim()).filter(u => u.length > 0);
            if (envUris.length > 0) {
                // Opción: Sobrescribir o añadir. Añadiremos para no perder el PHB si el usuario solo pone el MM.
                // Pero chequearemos duplicados.
                const unique = new Set([...defaultUris, ...envUris]);
                fileUris = Array.from(unique);
            }
        }

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
                console.log("\n🐉 [DEBUG CONSULTA PDF] Respuesta cruda de Gemini (Primeras 500 letras):");
                console.log(text.substring(0, 500));
                console.log("... [Fin del snippet] 🐉\n");

                return text;
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
