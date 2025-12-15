
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const args = process.argv.slice(2);
const filename = args[0];
const customDisplayName = args[1];

if (!filename) {
    console.error("❌ Error: Missing filename.");
    console.log("Usage: npx tsx scripts/upload-knowledge.ts <filename> [display_name]");
    console.log("Example: npx tsx scripts/upload-knowledge.ts Manual_Monstruos.pdf 'D&D 5e Monster Manual'");
    process.exit(1);
}

const FILE_PATH = path.join(process.cwd(), "knowledge", "source_books", filename);
const DISPLAY_NAME = customDisplayName || filename;

async function main() {
    console.log(`🚀 Starting Knowledge Upload for: ${filename}`);

    if (!fs.existsSync(FILE_PATH)) {
        console.error(`❌ File not found at: ${FILE_PATH}`);
        console.log("Please ensure the file exists in 'knowledge/source_books/'");
        process.exit(1);
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        console.error("❌ Error: GOOGLE_GENAI_API_KEY not found in environment.");
        process.exit(1);
    }

    const fileManager = new GoogleAIFileManager(apiKey);

    try {
        console.log(`📡 Uploading to Google AI Studio as '${DISPLAY_NAME}'...`);

        const uploadResult = await fileManager.uploadFile(FILE_PATH, {
            mimeType: "application/pdf",
            displayName: DISPLAY_NAME,
        });

        console.log(`✅ Upload initiated. URI: ${uploadResult.file.uri}`);
        console.log(`⏳ Waiting for processing...`);

        let file = await fileManager.getFile(uploadResult.file.name);
        while (file.state === FileState.PROCESSING) {
            process.stdout.write(".");
            await new Promise(r => setTimeout(r, 2000));
            file = await fileManager.getFile(uploadResult.file.name);
        }
        console.log("");

        if (file.state === FileState.FAILED) {
            throw new Error(`Processing failed inside Google AI. State: ${file.state}`);
        }

        console.log("\n🎉 SUCCESS! Knowledge assimilated.");
        console.log("---------------------------------------------------");
        console.log(`📝 URI: ${file.uri}`);
        console.log(`Name: ${file.name}`);
        console.log("---------------------------------------------------");
        console.log("\n⚠️  ACTION REQUIRED:");
        console.log("Copy the URI above and provide it to the AI or add it to your .env.local");

    } catch (error: any) {
        console.error("\n❌ Fatal Error:", error.message);
    }
}

main();
