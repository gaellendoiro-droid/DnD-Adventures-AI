
import { explorationExpert } from '../src/ai/flows/experts/exploration-expert';
import { log } from '../src/lib/logger';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });


// Setup basic mocking if needed or environment variables
process.env.GOOGLE_GENAI_API_KEY = process.env.GOOGLE_GENAI_API_KEY || "fake-key-if-none";

// Mock logger to see output in console
console.log("Setting up test...");

async function runTest() {
    console.log("Starting Exploration Expert Test...");

    const input = {
        playerAction: "Ir al norte",
        locationId: "hub_central",
        locationContext: JSON.stringify({
            id: "hub_central",
            title: "Sala Central de Control",
            description: "Una sala circular, limpia y aséptica. En el centro hay un pedestal con pociones. Cuatro puertas cardinales llevan a las salas de prueba.",
            type: "safe"
        }),
        interpretedAction: JSON.stringify({
            type: "move",
            target: "norte",
            confidence: 0.9
        }),
        explorationContext: {
            mode: "dungeon" as "dungeon",
            lightLevel: "bright" as "bright",
            visitState: "visited" as "visited",
            doorStates: {},
            visibleConnections: ["norte", "sur", "este", "oeste"],
            detectedHazards: [],
            presentEntities: []
        },
        deadEntities: ""
    };

    try {
        console.log("Invoking explorationExpert...");
        const result = await explorationExpert(input);
        console.log("Success!", result);
    } catch (e: any) {
        console.error("Caught Error:");
        console.error(e);
        if (e.cause) {
            console.error("Cause:", e.cause);
        }
        if (e.stack) {
            console.error("Stack:", e.stack);
        }
    }
}

// We need to handle potential top-level await if module system expects it, 
// but ts-node usually handles async functions called at top level fine if not using 'await' at root.
runTest().catch(console.error);
