
import { config } from 'dotenv';
config();

import '@/ai/flows/parse-adventure-from-json.ts';
import '@/ai/flows/generate-monster-encounters.ts';
import '@/ai/flows/generate-dm-narration-audio.ts';
import '@/ai/flows/markdown-to-html.ts';
import '@/ai/flows/game-coordinator.ts';
import '@/ai/flows/narrative-expert.ts';
import '@/ai/flows/ooc-assistant.ts';

import '@/ai/tools/dnd-api-lookup.ts';
import '@/ai/tools/adventure-lookup.ts';
import '@/ai/tools/character-lookup.ts';
import '@/ai/tools/combat-manager.ts';
import '@/ai/tools/companion-expert.ts';
import '@/ai/tools/enemy-tactician.ts';
import '@/ai/tools/dice-roller.ts';

// Este archivo se utiliza para importar todos los flujos y herramientas de Genkit,
// permitiendo que el Developer UI los descubra y los haga disponibles para
// su ejecución y depuración.
//
// Para probar un flujo:
// 1. Ejecuta `npm run genkit:watch` en tu terminal.
// 2. Abre http://localhost:4000 en tu navegador.
// 3. Selecciona el flujo que deseas probar en la lista.
// 4. Introduce los datos de entrada en formato JSON en el panel "Input".
// 5. Haz clic en "Run".
