
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const API_KEY = process.env.GOOGLE_GENAI_API_KEY;

if (!API_KEY) {
    console.error("Error: GOOGLE_GENAI_API_KEY is not set in .env");
    process.exit(1);
}

const fileManager = new GoogleAIFileManager(API_KEY);

const PDF_PATH = path.join(process.cwd(), 'knowledge', 'source_books', 'Manual_Jugador.pdf');
const DISPLAY_NAME = "Manual del Jugador D&D 5e";

async function main() {
    console.log(`🚀 Iniciando subida de: ${PDF_PATH}`);

    try {
        // Debug: Check connectivity
        console.log("📡 Probando conexión con Gemini API...");
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("Hola");
        console.log("✅ Conexión básica exitosa. Respuesta:", result.response.text());

        const uploadResult = await fileManager.uploadFile(PDF_PATH, {
            mimeType: "application/pdf",
            displayName: DISPLAY_NAME,
        });

        const fileUri = uploadResult.file.uri;
        const fileName = uploadResult.file.name; // This is the ID (e.g. files/xxxx)

        console.log(`✅ Archivo subido exitosamente.`);
        console.log(`   Display Name: ${uploadResult.file.displayName}`);
        console.log(`   URI: ${fileUri}`);
        console.log(`   Name (ID): ${fileName}`);
        console.log(`\n⏳ Esperando a que el archivo sea procesado...`);

        let file = await fileManager.getFile(fileName);
        while (file.state === FileState.PROCESSING) {
            process.stdout.write(".");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            file = await fileManager.getFile(fileName);
        }

        if (file.state === FileState.FAILED) {
            console.error("\n❌ El procesamiento del archivo falló.");
            process.exit(1);
        }

        console.log(`\n✨ Archivo procesado y listo para usar!`);
        console.log(`\n⬇️  GUARDA ESTE VALOR EN TU .env  ⬇️`);
        console.log(`GOOGLE_GENAI_MANUAL_URI=${fileUri}`);
        console.log(`GOOGLE_GENAI_MANUAL_NAME=${fileName}`);
        console.log(`⬆️  ----------------------------  ⬆️`);

    } catch (error) {
        console.error("❌ Error durante la subida:", error);
    }
}

main();
