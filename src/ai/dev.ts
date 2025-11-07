
import { config } from 'dotenv';
config();

import { narrativeExpert, NarrativeExpertInput } from '@/ai/flows/narrative-expert';
import { initialParty } from '@/lib/data';
import adventureData from '../../JSON_adventures/el-dragon-del-pico-agujahelada.json';
import { run } from 'genkit/dev';

import '@/ai/flows/parse-adventure-from-json.ts';
import '@/ai/flows/generate-monster-encounters.ts';
import '@/ai/flows/generate-dm-narration-audio.ts';
import '@/ai/flows/markdown-to-html.ts';
import '@/ai/flows/game-coordinator.ts';
import '@/ai/flows/narrative-expert.ts';
import '@/ai/flows/ooc-assistant.ts';

import '@/ai/tools/dnd-api-lookup.ts';
import '@/ai/tools/adventure-lookup.ts';
import '@/ai/tools/combat-manager.ts';
import '@/ai/tools/companion-expert.ts';
import '@/ai/tools/enemy-tactician.ts';
import '@/ai/tools/dice-roller.ts';

/**
 * Función de diagnóstico para probar el narrativeExpert de forma aislada.
 * Se puede ejecutar desde la terminal con: `npm run genkit:watch` y seleccionando 'testNarrativeExpert'
 */
async function testNarrativeExpert() {
  console.log("//////////////////////////////////////////////////");
  console.log("// Ejecutando prueba de diagnóstico para narrativeExpert //");
  console.log("//////////////////////////////////////////////////");

  try {
    const firstLocation = adventureData.locations[0];
    const playerCharacter = initialParty.find(c => c.controlledBy === 'Player');

    const input: NarrativeExpertInput = {
      playerAction: "Miro el tablón de anuncios.",
      party: initialParty,
      gameState: JSON.stringify(adventureData),
      locationId: firstLocation.id,
      locationContext: JSON.stringify(firstLocation),
      characterStats: JSON.stringify(playerCharacter),
      conversationHistory: "El juego acaba de empezar.",
      log: (msg: string) => console.log(`[LOG DEL EXPERTO]: ${msg}`),
    };

    console.log("\n[DATOS DE ENTRADA PARA narrativeExpert]:\n", JSON.stringify(input, null, 2));

    const result = await narrativeExpert(input);
    
    console.log("\n[RESULTADO DE narrativeExpert]:\n", result);
    console.log("\n//////////////////////////////////////////////////");
    console.log("// PRUEBA COMPLETADA CON ÉXITO                //");
    console.log("//////////////////////////////////////////////////");

  } catch (error) {
    console.error("\n[ERROR DURANTE LA PRUEBA DE narrativeExpert]:\n", error);
    console.log("\n//////////////////////////////////////////////////");
    console.log("// PRUEBA FALLIDA                             //");
    console.log("//////////////////////////////////////////////////");
  }
}

// Registramos la función de prueba para que aparezca en el menú de desarrollo de Genkit.
run('testNarrativeExpert', testNarrativeExpert);
