
import { ai } from '../genkit';
import { z } from 'zod';

import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import path from 'path';

// Definimos el flujo dentro de la arquitectura de la app para usar la configuración que ya funciona
export const pocPdfFlow = ai.defineFlow(
    {
        name: 'pocPdfFlow',
        inputSchema: z.object({
            step: z.enum(['upload', 'query']),
            fileUri: z.string().optional(),
            query: z.string().optional()
        }),
        outputSchema: z.string(),
    },
    async (input) => {

        // Paso 1: Subida (requiere API directa de files)
        if (input.step === 'upload') {
            const fileManager = new GoogleAIFileManager(process.env.GOOGLE_GENAI_API_KEY!);
            const filePath = path.join(process.cwd(), "knowledge", "source_books", "Manual_Jugador.pdf");

            console.log("Subiendo archivo desde Flow...");
            const uploadResult = await fileManager.uploadFile(filePath, {
                mimeType: "application/pdf",
                displayName: "Manual del Jugador (Genkit Flow)",
            });

            // Esperar procesamiento
            let file = await fileManager.getFile(uploadResult.file.name);
            while (file.state === FileState.PROCESSING) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                file = await fileManager.getFile(uploadResult.file.name);
            }

            if (file.state === FileState.FAILED) {
                throw new Error("Procesamiento de archivo falló");
            }

            return uploadResult.file.uri;
        }

        // Paso 2: Consulta usando el modelo configurado en Genkit
        if (input.step === 'query' && input.fileUri && input.query) {
            // Usamos generate con el modelo por defecto de genkit (que sabemos que funciona)
            // o forzamos uno específico si es necesario
            const response = await ai.generate({
                model: 'googleai/gemini-2.0-flash-exp', // Probamos con el modelo nuevo via Genkit
                prompt: [
                    { media: { url: input.fileUri, contentType: 'application/pdf' } },
                    { text: input.query }
                ],
                config: {
                    temperature: 0.2
                }
            });

            return response.text;
        }

        return "Acción no reconocida";
    }
);
