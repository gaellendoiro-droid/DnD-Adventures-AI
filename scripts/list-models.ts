
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function listModels() {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        console.error('❌ GOOGLE_GENAI_API_KEY no encontrada en .env');
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        console.log('🔍 Consultando modelos disponibles en Google AI API...');
        // Note: listModels is on the genAI instance directly in newer SDKs, or checking via a model method
        // In SDK generic usage, often done like this depending on version:

        // For Node SDK, we might need to assume we are authenticated and checking limits or just trying a dummy call
        // But unfortunately, the simple @google/generative-ai SDK doesn't always expose a direct listModels() at root level easily in all versions.
        // However, usually it's available. Let's try iterating if possible or check documentation behaviour.

        // Actually, looking at reference, there isn't a simple public listModels() in the high-level class in early versions.
        // We might have to make a direct REST call or ensure we have the right method.
        // Let's try a direct fetch to the API endpoint manually to be 100% sure raw.

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log('\n✅ Modelos Disponibles:');
            console.table(data.models.map((m: any) => ({
                name: m.name,
                displayName: m.displayName,
                supportedGenerationMethods: m.supportedGenerationMethods?.join(', ')
            })));
        } else {
            console.log('⚠️ No se encontraron modelos o hubo un error:', data);
        }

    } catch (error) {
        console.error('❌ Error listando modelos:', error);
    }
}

listModels();
