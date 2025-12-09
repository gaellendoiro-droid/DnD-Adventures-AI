
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import path from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno
// Cargar variables de entorno
dotenv.config(); // Carga .env por defecto
dotenv.config({ path: ".env.local", override: true }); // Sobrescribe con .env.local si existe

const MANUAL_FILENAME = "Manual_Jugador.pdf";
const MANUAL_PATH = path.join(process.cwd(), "knowledge", "source_books", MANUAL_FILENAME);
const DISPLAY_NAME = "Manual Jugador D&D 5e (Core)";

async function ingestManual() {
    console.log("📚 Iniciando ingesta de conocimiento al Sistema Híbrido...");
    console.log(`📂 Archivo objetivo: ${MANUAL_PATH}`);

    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        console.error("❌ Error: GOOGLE_GENAI_API_KEY no encontrada en .env.local");
        process.exit(1);
    }

    const fileManager = new GoogleAIFileManager(apiKey);

    try {
        console.log("📡 Subiendo archivo a Google AI Studio...");

        // 1. Subida
        const uploadResult = await fileManager.uploadFile(MANUAL_PATH, {
            mimeType: "application/pdf",
            displayName: DISPLAY_NAME,
        });

        console.log(`✅ Subida inicial completada. URI: ${uploadResult.file.uri}`);
        console.log(`⏳ Esperando procesamiento remoto...`);

        // 2. Espera activa
        let file = await fileManager.getFile(uploadResult.file.name);
        let attempts = 0;
        const MAX_ATTEMPTS = 60; // 2 minutos máx

        while (file.state === FileState.PROCESSING && attempts < MAX_ATTEMPTS) {
            process.stdout.write(".");
            await new Promise(r => setTimeout(r, 2000));
            file = await fileManager.getFile(uploadResult.file.name);
            attempts++;
        }
        console.log(""); // Salto de línea

        if (file.state === FileState.FAILED) {
            throw new Error(`El procesamiento falló en el servidor. Estado: ${file.state}`);
        }

        if (file.state === FileState.ACTIVE) {
            console.log("\n🎉 ¡ÉXITO! El manual ha sido asimilado por el cerebro.");
            console.log("---------------------------------------------------");
            console.log(`📝 URI Persistente: ${file.uri}`);
            console.log(`Expiration: ${file.expirationTime}`);
            console.log("---------------------------------------------------");
            console.log("\n⚠️  IMPORTANTE: Copia este URI y guárdalo en tu .env.local como:");
            console.log(`GOOGLE_GENAI_MANUAL_URI=${file.uri}`);
        } else {
            console.log(`⚠️ Estado desconocido: ${file.state}`);
        }

    } catch (error) {
        console.error("\n❌ Error fatal durante la ingesta:", error);
    }
}

ingestManual();
