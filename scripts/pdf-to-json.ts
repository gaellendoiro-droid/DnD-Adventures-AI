import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PDFParse } from 'pdf-parse';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { AdventureDataSchema } from '@/lib/schemas';
import { getMonsterStatsFromDndApi } from '@/lib/combat/monster-stats-parser';
import { GEMINI_MODEL_NAME } from '@/ai/model-config';

// Configurar variables de entorno
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const GOOGLE_GENAI_API_KEY = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;

if (!GOOGLE_GENAI_API_KEY) {
  console.error('❌ Error: GOOGLE_GENAI_API_KEY o GEMINI_API_KEY no está configurada en las variables de entorno.');
  process.exit(1);
}

/**
 * Realiza una llamada a ai.generate con reintentos automáticos y exponencial backoff ante errores 429 y 503
 */
async function generateWithRetry(options: any, maxRetries = 8, initialDelayMs = 3000): Promise<any> {
  // Configurar safety settings por defecto para evitar bloqueos por contenido de rol/combate (fantasía)
  options.config = options.config || {};
  options.config.safetySettings = options.config.safetySettings || [
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
  ];

  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Si procesa imágenes, metemos un delay de cortesía para no saturar la cuota RPM
      if (options.prompt && Array.isArray(options.prompt) && options.prompt.some((p: any) => p.media)) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      return await ai.generate(options);
    } catch (error: any) {
      const errorMsg = String(error.message || error);
      const isRateLimit = errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('Quota') || errorMsg.includes('limit');
      const isTransient = errorMsg.includes('503') || errorMsg.includes('Service Unavailable') || errorMsg.includes('high demand') || errorMsg.includes('busy');
      
      if ((isRateLimit || isTransient) && attempt < maxRetries) {
        if (attempt >= 2 && options.model === GEMINI_MODEL_NAME) {
          console.warn(`🔄 Cambiando a modelo fallback 'googleai/gemini-2.5-flash-lite' para evitar restricciones de cuota...`);
          options.model = 'googleai/gemini-2.5-flash-lite';
        }
        console.warn(`⚠️ Error de API (${isRateLimit ? '429 Quota' : '503 Busy'}). Reintentando intento ${attempt}/${maxRetries} en ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, 30000); // backoff exponencial con tope de 30s
      } else {
        throw error;
      }
    }
  }
}

// Interfaz para la tabla de contenidos inicial
interface TableOfContents {
  title: string;
  summary: string;
  introductoryNarration: string;
  levelRange: { start: number; end: number };
  startingLocationId: string;
  tocLocations: string[];
  tocEntities: string[];
  adventureLore?: {
    background: string;
    adventureHooks: string[];
    secretsAndClues: string[];
    runningTheAdventure?: string;
    storyline?: {
      eventName: string;
      triggerCondition: string;
      description: string;
      consequences?: string;
    }[];
  };
}


/**
 * Normaliza una cadena para usarla como un ID único en kebab-case
 */
function normalizeId(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9\s-]/g, '') // Eliminar caracteres especiales
    .trim()
    .replace(/\s+/g, '-'); // Reemplazar espacios con guiones
}

/**
 * Elimina frases u oraciones repetidas consecutivamente en un texto para curar alucinaciones de bucle de Gemini.
 */
function cleanRepeatedPhrases(text: string): string {
  if (!text) return text;
  
  // Dividir por oraciones usando puntos seguidos de espacio o fin de línea
  const sentences = text.split(/(?<=\.\s+)|(?<=\.\s*)$/);
  const uniqueSentences: string[] = [];
  const seen = new Set<string>();

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    
    // Normalizar para comparación rápida (eliminar mayúsculas y caracteres no alfanuméricos)
    const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueSentences.push(trimmed);
    }
  }

  return uniqueSentences.join(' ');
}

/**
 * Limpia y corrige las conexiones y entidades presentes huérfanas en el JSON final
 */
function postProcessAdventure(adventure: any): any {
  console.log('\n🧹 Post-procesando aventura para asegurar consistencia e integridad de enlaces...');

  const locationIds = new Set(adventure.locations.map((l: any) => l.id));
  const entityIds = new Set((adventure.entities || []).map((e: any) => e.id));

  // 1. Limpiar descripciones, conexiones y entidades en ubicaciones
  for (const loc of adventure.locations) {
    if (loc.description) {
      loc.description = cleanRepeatedPhrases(loc.description);
    }
    if (loc.dmNotes) {
      loc.dmNotes = cleanRepeatedPhrases(loc.dmNotes);
    }

    if (loc.connections) {
      loc.connections = loc.connections.filter((conn: any) => {
        if (!locationIds.has(conn.targetId)) {
          console.warn(`⚠️ Eliminando conexión huérfana en la ubicación "${loc.id}": apunta a "${conn.targetId}" que no existe.`);
          return false;
        }
        return true;
      });
      // Limpiar descripciones y tiempos de viaje de las conexiones
      for (const conn of loc.connections) {
        if (conn.description) {
          conn.description = cleanRepeatedPhrases(conn.description);
        }
        if (conn.travelTime) {
          conn.travelTime = cleanRepeatedPhrases(conn.travelTime);
        }
      }
    }

    // Limpiar exits heredados
    if (loc.exits) {
      loc.exits = loc.exits.filter((exit: any) => {
        const targetId = typeof exit === 'string' ? exit : exit.toLocationId;
        if (!locationIds.has(targetId)) {
          return false;
        }
        return true;
      });
    }

    // 2. Limpiar entidades presentes en la sala
    if (loc.entitiesPresent) {
      loc.entitiesPresent = loc.entitiesPresent.filter((entRef: any) => {
        const entId = typeof entRef === 'string' ? entRef : entRef?.entityId;
        if (!entityIds.has(entId)) {
          console.warn(`⚠️ Eliminando entidad huérfana "${entId}" en la ubicación "${loc.id}": no está declarada en la lista global.`);
          return false;
        }
        return true;
      });
    }
  }

  // 3. Limpiar y desduplicar textos de entidades
  if (adventure.entities) {
    for (const ent of adventure.entities) {
      if (ent.description) {
        ent.description = cleanRepeatedPhrases(ent.description);
      }
      if (ent.dmNotes) {
        ent.dmNotes = cleanRepeatedPhrases(ent.dmNotes);
      }
    }
  }

  return adventure;
}

/**
 * Paso 1: Extraer tabla de contenido y metadatos base
 */
async function extractTableOfContents(introText: string): Promise<TableOfContents> {
  console.log('🤖 Extrayendo metadatos base y tabla de contenidos con Gemini...');

  const prompt = `Analiza la introducción e índice de esta aventura de D&D y extrae la información básica.
  IMPORTANTE: Todos los textos narrativos y descriptivos generados deben estar escritos en español de España.
  
  DIRECTRICES DE LOCALIZACIÓN Y TRADUCCIÓN OFICIAL DE D&D 5E:
  Al traducir nombres de criaturas, monstruos u objetos del inglés al español de España, debes utilizar la terminología oficial de los manuales de D&D 5e. Ejemplos de traducción obligatoria:
  - Gibbering Mouther -> Boca Balbuceante (NO Boca Farfullante)
  - Ape / Ape polymorphed -> Simio Polimorfo / Simio (NO Mono)
  - Owlbear -> Osochuza
  - Bugbear -> Oso Trasgo
  - Goblin -> Trasgo
  - Halfling -> Mediano
  - Wyrmling -> Cría de dragón
  
  Devuelve un objeto estructurado que contenga:
  - title: El título principal de la aventura traducido de forma atractiva al español (ej: "La Mina Perdida de Phandelver").
  - summary: Un resumen breve de 1-2 frases en español de España para mostrar en el catálogo de aventuras. CRITICAL (CERO SPOILERS): Escríbelo desde el punto de vista inicial de los aventureros sin desvelar NINGÚN secreto de trasfondo (por ejemplo, NO digas que una oveja es un mago transformado ni menciones a su aprendiz; di solo que una oveja frenética con un pergamino en la boca irrumpe buscando ayuda).
  - introductoryNarration: La narración inmersiva de apertura (3-5 frases en segunda persona del plural: "Estáis...", "Ante vosotros...") que el Dungeon Master lee en voz alta a los jugadores nada más comenzar la partida en la primera escena.
    CRITICAL (REGLAS ESTRICTAS PARA introductoryNarration):
    1. Describe ÚNICAMENTE lo que los personajes perciben a través de sus sentidos en el minuto 0 de la partida (el ambiente de la ubicación inicial y el suceso físico inmediato que da pie a la primera acción, por ejemplo: el bullicio tranquilo de la posada o calle, el repentino alboroto de cascos y balidos, y la oveja que se acerca corriendo hacia ellos con un pergamino lacrado en la boca).
    2. PROHIBIDO TERMINANTEMENTE revelar identidades ocultas, transformaciones mágicas, nombres de NPCs o villanos que aún no se han presentado, motivaciones secretas o eventos que ocurren más adelante (NO menciones a Guz ni a los lobos si aparecen después de interactuar con la oveja, y JAMÁS digas que la oveja es un mago ni menciones a su aprendiz).
    3. PROHIBIDO usar tono de tráiler o preguntas meta-narrativas como "¿Podréis ayudar a...?" o "Pronto descubriréis que...". Debe ser narración pura de partida de rol en mesa y terminar invitando a los jugadores a actuar en el presente inmediato.
  - levelRange: El rango de niveles recomendado { start: número, end: número }. Si no se especifica, usa { start: 1, end: 3 }.
  - tocLocations: Una lista limpia de todos los nombres de ubicaciones y salas principales que aparecen en la aventura, empezando en la posición 0 por la ubicación exacta donde arranca la escena inicial.
  - startingLocationId: El ID en minúsculas y kebab-case correspondiente EXACTAMENTE a la primera ubicación de 'tocLocations' (ej: si tocLocations[0] es "Ciudad o Pueblo", startingLocationId DEBE ser "ciudad-o-pueblo").
  - tocEntities: Una lista limpia de nombres de criaturas y NPCs principales que aparecen en la aventura.
  - adventureLore: Objeto con información de lore global para el DM:
    * background: Trasfondo narrativo detallado de la aventura que explica la situación y motivos de los NPCs.
    * adventureHooks: Array de 2-4 ganchos posibles para involucrar a los personajes.
    * secretsAndClues: Array de 3-8 secretos importantes o pistas que los jugadores pueden descubrir en la aventura.
    * runningTheAdventure: Directrices de dirección, tono y atmósfera (opcional). CRITICAL: Si la aventura contiene reglas mecánicas específicas, dificultades de clase (CDs) de salvación o de habilidad, estadísticas especiales de objetos mágicos clave (ej: cargas de varita, consecuencias de fallos, efectos colaterales), o recompensas y asignaciones exactas de puntos de experiencia (XP), DEBES incluirlas y describirlas de forma detallada en esta sección para que el DM las tenga en cuenta.
    * storyline: Array de hitos o escenas de acontecimientos clave del guion de la aventura en orden cronológico sugerido. Cada hito debe tener:
      - eventName: Nombre breve del hito (ej. "Encuentro inicial con los rufianes", "Emboscada en el camino", "Llegada a la guarida").
      - triggerCondition: Qué desencadena este acontecimiento (ej. "Al intentar salir de la plaza inicial o el pueblo", "Al llegar a las afueras de la cueva").
      - description: Guion detallado en español de España de lo que ocurre en este acontecimiento, las interacciones permitidas y cómo presentarlo de forma rica y conversacional antes de recurrir a la violencia o el combate (ej. explicar que el líder de los rufianes detiene a los personajes para exigir un pago de peaje pero no ataca de inmediato, permitiendo dialogar).
      - consequences: Consecuencias lógicas o derivaciones sugeridas tras resolverse (ej. "Si falla la negociación o el grupo ataca, se inicia el combate").
 
  Texto de la aventura:
  ${introText.substring(0, 40000)}
  `;
 
  const response = await generateWithRetry({
    model: GEMINI_MODEL_NAME,
    prompt,
    output: {
      schema: z.object({
        title: z.string(),
        summary: z.string(),
        introductoryNarration: z.string(),
        levelRange: z.object({ start: z.number(), end: z.number() }),
        startingLocationId: z.string(),
        tocLocations: z.array(z.string()),
        tocEntities: z.array(z.string()),
        adventureLore: z.object({
          background: z.string(),
          adventureHooks: z.array(z.string()),
          secretsAndClues: z.array(z.string()),
          runningTheAdventure: z.string().optional(),
          storyline: z.array(z.object({
            eventName: z.string(),
            triggerCondition: z.string(),
            description: z.string(),
            consequences: z.string().optional(),
          })).optional(),
        }).optional(),
      }),
    },
    config: {
      temperature: 0.1,
    },
  });

  return response.output as TableOfContents;
}


/**
 * Paso 2: Extraer y procesar ubicaciones en bloques
 */
async function extractLocations(
  textBlock: string,
  tocLocations: string[],
  adventureId: string
): Promise<any[]> {
  const prompt = `Analiza este fragmento de una aventura de D&D y extrae las habitaciones o ubicaciones descritas en él.
  Solo debes extraer las salas que correspondan a esta lista de ubicaciones de interés:
  ${JSON.stringify(tocLocations)}

  Para cada habitación que encuentres y que aparezca descrita en el texto, debes estructurarla en un array de objetos con las siguientes propiedades del motor de juego. IMPORTANTE: todos los campos de texto, nombres, descripciones y notas deben estar redactados en español de España:
  - id: Un ID único normalizado en minúsculas y kebab-case (ej: "sala-de-guardia").
  - name: El nombre de la ubicación traducido de forma natural al español (ej: "Templo del Sol" en lugar de "Sun Temple", "Biblioteca Central" en lugar de "Central Library", "Cocina del Castillo" en lugar de "Castle Kitchen").
  - description: Una descripción narrativa de 2 a 5 frases rica en detalles sensoriales para leer al jugador (en español de España). CRITICAL (PREVENCIÓN DE SPOILERS): Esta descripción no debe desvelar ningún secreto, trampa oculta o identidad real de los personajes o criaturas que se encuentren en la sala si dicha identidad o secreto no es observable a simple vista por los personajes al entrar (por ejemplo, si hay una criatura disfrazada o transformada, describe su aspecto externo observable, no su verdadera identidad).
  - explorationMode: Uno de estos valores: "safe" (pueblos, refugios), "dungeon" (interiores peligrosos, cuevas), "wilderness" (bosques, caminos).
  - lightLevel: Uno de estos valores: "bright", "dim", "dark".
  - dmNotes: Notas secretas para el DM que contengan secretos de la sala, cofres ocultos, trampas, o lore que no se lea a los jugadores.
  - connections: Array de conexiones a otras habitaciones que se describan explícitamente en el texto, cada una con:
    * targetId: El ID de la ubicación de destino (normalizado en kebab-case).
    * direction: Opcional. Uno de: "norte", "sur", "este", "oeste", "noreste", "noroeste", "sureste", "suroeste", "arriba", "abajo", "dentro", "fuera".
    * description: Descripción narrativa del camino o puerta.
    * isLocked: Si está cerrada con llave.
    * requiredKeyId: ID del objeto llave necesario para abrirla.
    * isBlocked: Si está bloqueada o derrumbada.
    * blockedReason: Motivo del bloqueo.
    * travelTime: Opcional, para viajes largos (ej: "15 minutos").
    * combatTrigger: Opcional. Un objeto que describe si el paso por la conexión detona un combate inmediato e inevitable (ej: emboscada física por sorpresa de monstruos no racionales).
      CRITICAL: NO uses combatTrigger para encuentros con personajes inteligentes o monstruos que puedan entablar una conversación, hacer demandas o donde la aventura sugiera diálogo o negociación previa (como un guardia interponiéndose para exigir una contraseña o soborno antes de atacar). En esos casos, deja la conexión libre de combatTrigger y coloca a las criaturas en 'entitiesPresent' de la sala de destino. Estos encuentros conversacionales se describirán en el 'storyline' global del DM.
      Estructura de combatTrigger:
      {
        shouldStartCombat: true,
        reason: "ambush" | "proximity" | "stealth_fail" | "mimic" | "provocation" | "player_surprise",
        message: "Mensaje narrativo describiendo la interrupción en español de España",
        triggeringEntityIds: ["id-enemigo-1", "id-enemigo-2"] (IDs de los enemigos que atacan)
      }
  - hazards: Array de trampas o peligros en la sala, cada uno con:
    * id: ID único de la trampa.
    * type: Uno de: "trap", "ambush", "environmental".
    * detectionDC: CD para detectarla.
    * disarmDC: CD para desactivarla (opcional).
    * description: Pista visual o física si se detecta.
    * triggerDescription: Qué pasa cuando se activa.
    * effect: Daño o efecto mecánico (ej: "1d6 daño caída", "Save Destreza DC 12 o 2d6 daño fuego").
  - interactables: Array de objetos interactivos (cofres, altares, carteles) con:
    * name: Nombre del objeto (ej: "Cofre de Madera").
    * description: Descripción visual.
    * interactionResults: Array de { action: "Verbo (ej: Abrir)", result: "Resultado narrativo de la acción" }
  - entitiesPresent: Array de los nombres o IDs de los monstruos/enemigos o NPCs presentes en esta sala.
    Puede ser un array de strings (IDs de entidades) si siempre están presentes físicamente en la sala al entrar.
    O puede ser un objeto condicional si la criatura aparece o cambia de ubicación según el avance de la historia, sigilo o estado lógico.
    Estructura del objeto condicional:
    {
      "entityId": "ID de la criatura (ej: 'guz')",
      "presenceFlag": "Nombre del flag global (opcional) que DEBE ser true para que aparezca",
      "absenceFlag": "Nombre del flag global (opcional) que NO debe estar activo (ser false/undefined) para que aparezca"
    }
    Ejemplo para Guz: si aparece en la ciudad de inicio de forma temporal al asaltar a la oveja, pero huye a las cabañas si sobrevive, inclúyelo en la localización de inicio como:
    { "entityId": "guz", "presenceFlag": "guz_en_pueblo", "absenceFlag": "guz_derrotado" }
    Y en la localización de las cabañas como:
    { "entityId": "guz", "presenceFlag": "guz_en_torre", "absenceFlag": "guz_derrotado" }
    Si hay múltiples copias de la misma criatura estática, repite su ID string tantas veces como copias deban aparecer.

  Texto del fragmento:
  ${textBlock}
  `;

  try {
    const response = await generateWithRetry({
      model: GEMINI_MODEL_NAME,
      prompt,
      output: {
        schema: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            description: z.string(),
            explorationMode: z.enum(['safe', 'dungeon', 'wilderness']),
            lightLevel: z.enum(['bright', 'dim', 'dark']),
            dmNotes: z.string().optional(),
            connections: z.array(
              z.object({
                targetId: z.string(),
                direction: z.enum([
                  'norte',
                  'sur',
                  'este',
                  'oeste',
                  'noreste',
                  'noroeste',
                  'sureste',
                  'suroeste',
                  'arriba',
                  'abajo',
                  'dentro',
                  'fuera',
                ]).optional(),
                description: z.string().optional(),
                isLocked: z.boolean().optional().default(false),
                requiredKeyId: z.string().optional(),
                isBlocked: z.boolean().optional().default(false),
                blockedReason: z.string().optional(),
                travelTime: z.string().optional(),
                combatTrigger: z.object({
                  shouldStartCombat: z.boolean().default(false),
                  reason: z.enum(['ambush', 'proximity', 'stealth_fail', 'mimic', 'provocation', 'player_surprise']).default('ambush'),
                  message: z.string().optional(),
                  triggeringEntityIds: z.array(z.string()).optional()
                }).optional()
              })
            ).optional(),
            hazards: z.array(
              z.object({
                id: z.string(),
                type: z.enum(['trap', 'ambush', 'environmental']),
                detectionDC: z.number(),
                disarmDC: z.number().optional(),
                description: z.string(),
                triggerDescription: z.string(),
                effect: z.string().optional(),
              })
            ).optional(),
            interactables: z.array(
              z.object({
                name: z.string(),
                description: z.string(),
                interactionResults: z.array(
                  z.object({
                    action: z.string(),
                    result: z.string(),
                  })
                ).optional(),
              })
            ).optional(),
            entitiesPresent: z.array(
              z.union([
                z.string(),
                z.object({
                  entityId: z.string(),
                  presenceFlag: z.string().optional(),
                  absenceFlag: z.string().optional()
                })
              ])
            ).optional(),
          })
        ),
      },
      config: {
        temperature: 0.1,
      },
    });
    return response.output as any[];
  } catch (error) {
    console.error('⚠️ Error procesando ubicaciones en este bloque:', error);
    return [];
  }
}

/**
 * Paso 3: Extraer y procesar entidades (monstruos y NPCs)
 */
async function extractEntities(textBlock: string, tocEntities: string[]): Promise<any[]> {
  const prompt = `Analiza este fragmento de texto de aventura y extrae las criaturas, monstruos o NPCs que se describen.
  Solo debes extraer los seres que correspondan a esta lista de interés:
  ${JSON.stringify(tocEntities)}
  
  DIRECTRICES DE LOCALIZACIÓN Y TRADUCCIÓN OFICIAL DE D&D 5E:
  Al traducir nombres de criaturas, monstruos u objetos del inglés al español de España, debes utilizar la terminología oficial de los manuales de D&D 5e.
  - Gibbering Mouther -> Boca Balbuceante
  - Ape -> Simio
  - Owlbear -> Osochuza
  - Bugbear -> Oso Trasgo
  - Goblin -> Trasgo
  - Halfling -> Mediano
  - Wyrmling -> Cría de dragón
 
  Para cada entidad encontrada, estrúcturala como un array de objetos con las siguientes propiedades. IMPORTANTE: todos los campos de texto, nombres, descripciones y notas deben estar redactados en español de España, y los monstruos/NPCs comunes deben definirse siempre en SINGULAR:
  - id: Un ID único en kebab-case basado en el nombre de la criatura en singular.
  - name: El nombre en español de la criatura en singular. CRITICAL (PREVENCIÓN DE SPOILERS): Si la criatura o NPC tiene una identidad oculta, secreta, disfrazada o transformada al inicio de la aventura, debes establecer como su "name" público el nombre común, descripción o alias con el que se le conoce o se le ve físicamente al inicio y que no desvela el secreto. Su verdadero nombre y detalles del trasfondo secreto deben documentarse únicamente en su descripción de roleplay o en "dmNotes" (notas secretas del DM).
  - type: Uno de: "monster" (si es hostil o de combate), "npc" (si es amistoso/neutral con quien se puede conversar).
  - description: Una breve descripción física o rasgos de personalidad en español de España. Máximo 2 o 3 frases, redactada en singular.
  - dmNotes: Notas secretas y breves para el DM en español de España. Máximo 3 frases. NO repitas información ni entres en bucle.
  - baseType: Si es un monstruo o criatura que usa las estadísticas de otro ser del Manual de Monstruos (e.g., "(MM p319)", "(MM p325)", "uses the statistics of a Pony", etc.), indica el nombre en inglés oficial de esa criatura base para cargarlo del compendio (e.g. "Brown Bear", "Pony", "Wolf", "Ape", "Gibbering Mouther", "Goblin", "Skeleton"). Extrae este nombre analizando las referencias entre paréntesis o frases del texto.
  - statsOverrides: Objeto opcional si el texto de la aventura indica estadísticas propias (como en el caso de NPCs/jefes únicos con bloque de estadísticas propio en el PDF) o modificaciones de estadísticas respecto a la ficha del monstruo base (por ejemplo, si el texto dice "uses the statistics of a Pony but with INT and WIS scores of 18 and 14 respectively", o si define la CA, PG, puntuaciones de característica y acciones de ataque de Guz, Ahmed Noke o la Cría de Dragón de Cama). Incluye en 'actions' todos los ataques o conjuros ofensivos descritos en su bloque de estadísticas (con su bonificador de impacto '+X a impactar' y dados de daño 'XdY+Z').
  - roleplay: Objeto opcional (especialmente para NPCs o monstruos dialogantes) con perfil de interpretación social:
    * personality: Rasgos clave de su forma de ser o personalidad en español.
    * voiceAndMannerisms: Forma de hablar, gestos y tics en español.
    * goals: Metas u objetivos del personaje frente a los jugadores.
    * secretsKnown: Array opcional de secretos importantes que el NPC conoce (en español).
    * communicationBarrier: Explicación de si el NPC tiene alguna dificultad o barrera inicial para hablar directamente (ej: "Lleva un pergamino de hablar con los animales en la boca e intenta que lo usen para comunicarse", "No habla común, solo hace gestos"). Opcional.
    * possessions: Array opcional de objetos clave en español que lleva encima o en la boca (ej: ["Pergamino de Hablar con los Animales", "Llave de la celda"]).
  - combatTactics: Objeto opcional (especialmente para enemigos/monstruos) con tácticas de batalla:
    * battleStyle: Estilo de lucha en español (ej: "Lanza hechizos desde la distancia tras sus guardias y evita el cuerpo a cuerpo").
    * triggers: Array opcional de reacciones ante condiciones, cada uno con { condition: "Condición en español (ej: HP < 50%)", reaction: "Reacción/acción a tomar en español (ej: huye al piso superior)" }.


  Texto del fragmento:
  ${textBlock}
  `;

  try {
    const response = await generateWithRetry({
      model: GEMINI_MODEL_NAME,
      prompt,
      output: {
        schema: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            type: z.enum(['monster', 'npc', 'other']),
            description: z.string().optional(),
            dmNotes: z.string().optional(),
            baseType: z.string().optional(),
            statsOverrides: z.object({
              hp: z.number().optional(),
              ac: z.number().optional(),
              abilityScores: z.object({
                fuerza: z.number().optional(),
                destreza: z.number().optional(),
                constitución: z.number().optional(),
                inteligencia: z.number().optional(),
                sabiduría: z.number().optional(),
                carisma: z.number().optional(),
              }).optional(),
              actions: z.array(
                z.object({
                  name: z.string(),
                  description: z.string(),
                })
              ).optional(),
            }).optional(),
            roleplay: z.object({
              personality: z.string(),
              voiceAndMannerisms: z.string(),
              goals: z.string(),
              secretsKnown: z.array(z.string()).optional(),
              communicationBarrier: z.string().optional(),
              possessions: z.array(z.string()).optional(),
            }).optional(),
            combatTactics: z.object({
              battleStyle: z.string(),
              triggers: z.array(
                z.object({
                  condition: z.string(),
                  reaction: z.string(),
                })
              ).optional(),
            }).optional(),
          })
        ),
      },
      config: {
        temperature: 0.3,
      },
    });

    return response.output as any[];
  } catch (error) {
    console.error('⚠️ Error procesando entidades en este bloque:', error);
    return [];
  }
}

/**
 * Paso 3.5: Generar y alinear el grafo de navegación (conexiones) con Gemini
 */
async function generateConnectionsGraph(locations: any[], adventureSummary: string): Promise<any[]> {
  console.log('\n🤖 Generando y alineando el grafo de navegación (conexiones) con Gemini...');

  const locationsList = locations.map((l: any) => ({
    id: l.id,
    name: l.name || l.title,
    description: l.description,
    dmNotes: l.dmNotes || '',
  }));

  const prompt = `Analiza la estructura de esta aventura de D&D y define las conexiones lógicas de navegación entre las diferentes ubicaciones.
  Usa el resumen de la aventura y las descripciones/notas de DM de cada sala para deducir cómo se conectan entre sí.

  Resumen de la aventura:
  ${adventureSummary}

  Lista de ubicaciones disponibles:
  ${JSON.stringify(locationsList, null, 2)}

  Tu tarea es generar, para cada una de las ubicaciones anteriores, su array de "connections" (conexiones de salida).
  IMPORTANTE:
  - Solo puedes conectar ubicaciones que existan en la lista anterior.
  - El campo "targetId" de cada conexión debe coincidir EXACTAMENTE con el "id" de la ubicación destino de la lista.
  - No inventes IDs de ubicación que no estén en la lista.
  - Todos los textos de descripción de las conexiones y el campo 'travelTime' deben estar escritos en español de España.
  - CRITICAL (PREVENCIÓN DE SPOILERS): No reveles secretos de la trama ni verdaderas identidades ocultas de criaturas en las descripciones de las conexiones o tiempos de viaje (ej: si los personajes viajan a una localización, no menciones sorpresas o revelaciones que solo ocurrirán al llegar).
  - Define las direcciones lógicas de forma natural si son evidentes (ej: "norte", "sur", "este", "oeste", "noreste", "noroeste", "sureste", "suroeste", "arriba", "abajo", "dentro", "fuera").
  - Si el cruce de la conexión implica un encuentro de combate o emboscada narrado en la aventura, añade el objeto "combatTrigger" correspondiente (con "shouldStartCombat": true, la razón "reason", un "message" explicativo en español de España, y "triggeringEntityIds" con los IDs de las entidades enemigas que inician la agresión).
  - Si una conexión es directa o requiere subir un nivel, indícalo claramente (ej: de la plataforma inferior a la plataforma central hay que subir por las escaleras o trepar por las ramas).

  Devuelve un JSON estructurado que sea un array de objetos, donde cada objeto tenga:
  - locationId: El ID de la ubicación de origen.
  - connections: Array de conexiones válidas para esa ubicación.
  `;

  try {
    const response = await generateWithRetry({
      model: GEMINI_MODEL_NAME,
      prompt,
      output: {
        schema: z.array(
          z.object({
            locationId: z.string(),
            connections: z.array(
              z.object({
                targetId: z.string(),
                direction: z.enum([
                  'norte',
                  'sur',
                  'este',
                  'oeste',
                  'noreste',
                  'noroeste',
                  'sureste',
                  'suroeste',
                  'arriba',
                  'abajo',
                  'dentro',
                  'fuera',
                ]).optional(),
                description: z.string().optional(),
                isLocked: z.boolean().optional().default(false),
                requiredKeyId: z.string().optional(),
                isBlocked: z.boolean().optional().default(false),
                blockedReason: z.string().optional(),
                travelTime: z.string().optional(),
                combatTrigger: z.object({
                  shouldStartCombat: z.boolean().default(false),
                  reason: z.enum(['ambush', 'proximity', 'stealth_fail', 'mimic', 'provocation', 'player_surprise']).default('ambush'),
                  message: z.string().optional(),
                  triggeringEntityIds: z.array(z.string()).optional()
                }).optional()
              })
            ),
          })
        ),
      },
      config: {
        temperature: 0.1,
      },
    });

    const results = response.output as any[];
    const connectionsMap = new Map<string, any[]>();
    for (const item of results) {
      connectionsMap.set(item.locationId, item.connections);
    }

    return locations.map((loc: any) => {
      const generatedConns = connectionsMap.get(loc.id) || [];
      return {
        ...loc,
        connections: generatedConns,
      };
    });
  } catch (error) {
    console.error('⚠️ Error generando el grafo de navegación con Gemini:', error);
    return locations;
  }
}

/**
 * Paso 3.7: Alinear inteligentemente todas las criaturas y NPCs a sus ubicaciones usando Gemini
 */
async function alignEntitiesToLocationsWithGemini(
  locations: any[],
  entities: any[],
  adventureSummary: string,
  adventureLore?: TableOfContents['adventureLore']
): Promise<any[]> {
  console.log('\n🤖 Alineando inteligentemente las criaturas y NPCs a sus localizaciones con Gemini...');

  const locationsList = locations.map((l: any) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    dmNotes: l.dmNotes || '',
    rawEntitiesPresent: l.entitiesPresent || []
  }));

  const entitiesList = entities.map((e: any) => ({
    id: e.id,
    name: e.name,
    description: e.description || '',
    dmNotes: e.dmNotes || '',
    type: e.type,
    baseType: e.baseType || ''
  }));

  const storylineSummary = adventureLore?.storyline
    ? JSON.stringify(adventureLore.storyline, null, 2)
    : 'No disponible';

  const prompt = `Analiza la estructura de esta aventura de D&D, su guion cronológico (storyline), sus ubicaciones y sus personajes/monstruos para decidir de forma inteligente y contextual qué criaturas y NPCs deben estar presentes en cada ubicación física (de forma estática o condicional).

Resumen de la aventura:
${adventureSummary}

Guion cronológico de escenas (Storyline):
${storylineSummary}

Lista de ubicaciones disponibles:
${JSON.stringify(locationsList, null, 2)}

Lista de entidades (monstruos y NPCs) globales disponibles:
${JSON.stringify(entitiesList, null, 2)}

Tu tarea es asociar cada entidad a la ubicación o ubicaciones donde debe encontrarse en la aventura.
DIRECTRICES IMPORTANTES:
1. En la ubicación de inicio (minuto 0 de la aventura), coloca como string directo ÚNICAMENTE al NPC o criatura que protagoniza el gancho inmediato en el segundo 0 (por ejemplo, la oveja con el pergamino).
2. Si un grupo de enemigos llega a la ubicación inicial POCO DESPUÉS de que los jugadores interactúen con el gancho inicial (por ejemplo, Guz, sus lobos y el oso pardo que llegan buscando a la oveja tras hablar con ella), DEBES incluirlos en esa ubicación inicial como objetos condicionales con un 'presenceFlag' y un 'absenceFlag':
   { "entityId": "guz", "presenceFlag": "guz_en_pueblo", "absenceFlag": "guz_derrotado" }
3. Si una criatura solo aparece mediante una transformación, invocación o evento especial en el clímax (por ejemplo, una cama transformada en Cría de Dragón de Cama o un villano mutado en Boca Balbuceante al fallar su varita), colócala en la sala donde ocurre esa escena (ej. el dormitorio o la torre) SIEMPRE con un 'presenceFlag' descriptivo (ej. { "entityId": "cria-de-dragon-de-cama", "presenceFlag": "cama_polimorfada" }, { "entityId": "boca-balbuceante", "presenceFlag": "noke_mutado" }). JAMÁS coloques jefes o transformaciones finales en la ubicación inicial del pueblo.
4. Si una entidad es un monstruo que custodia o habita de forma permanente en una sala o zona concreta desde que los jugadores llegan a ella (ej: guardias simios en el jardín/exterior de la torre, un oso pardo en el retrete, Noke en la plataforma central), asígnalos directamente a esa ubicación.
5. Si una criatura aparece múltiples veces en una misma ubicación (ej: tres lobos o tres simios), incluye su entrada (string u objeto condicional) tantas veces como copias deban aparecer en la sala.
6. NINGUNA criatura o NPC de la lista global de entidades debe quedar huérfano. Asegúrate de usar únicamente IDs válidos de la lista global de entidades y de ubicaciones.

Devuelve un array de objetos JSON que cumpla el esquema indicado. Cada objeto representa la asignación para una ubicación.
`;

  try {
    const response = await generateWithRetry({
      model: GEMINI_MODEL_NAME,
      prompt,
      output: {
        schema: z.array(
          z.object({
            locationId: z.string(),
            entitiesPresent: z.array(
              z.union([
                z.string(),
                z.object({
                  entityId: z.string(),
                  presenceFlag: z.string().optional(),
                  absenceFlag: z.string().optional()
                })
              ])
            ),
          })
        ),
      },
      config: {
        temperature: 0.1,
      },
    });

    const results = response.output as any[];
    const entityIds = new Set(entities.map((e: any) => e.id));
    const alignmentMap = new Map<string, any[]>();
    
    for (const item of results) {
      const validEntities = (item.entitiesPresent || []).filter((entityRef: any) => {
        const entId = typeof entityRef === 'string' ? entityRef : entityRef?.entityId;
        const isValid = entityIds.has(entId);
        if (!isValid) {
          console.warn(`⚠️ Gemini asignó un ID de entidad no válido "${entId}" a la sala "${item.locationId}". Ignorando...`);
        }
        return isValid;
      });
      alignmentMap.set(item.locationId, validEntities);
    }

    // Comprobar si hay entidades huérfanas que Gemini olvidó ubicar
    const allocatedEntities = new Set<string>();
    for (const ents of alignmentMap.values()) {
      for (const entRef of ents) {
        const entId = typeof entRef === 'string' ? entRef : entRef?.entityId;
        allocatedEntities.add(entId);
      }
    }

    const missingEntities = entities
      .filter((e: any) => !allocatedEntities.has(e.id))
      .map((e: any) => e.id);

    if (missingEntities.length > 0) {
      console.warn(`⚠️ Gemini no ubicó las siguientes entidades globales: ${missingEntities.join(', ')}.`);
      const fallbackLoc = locations[locations.length - 1] || locations[0];
      if (fallbackLoc) {
        console.log(`📌 Asignando de emergencia las entidades huérfanas con presenceFlag a "${fallbackLoc.id}": ${missingEntities.join(', ')}`);
        const currentList = alignmentMap.get(fallbackLoc.id) || [];
        const conditionalMissing = missingEntities.map((id: string) => ({
          entityId: id,
          presenceFlag: `${id.replace(/-/g, '_')}_activo`
        }));
        alignmentMap.set(fallbackLoc.id, [...currentList, ...conditionalMissing]);
      }
    }

    return locations.map((loc: any) => {
      const entitiesPresent = alignmentMap.get(loc.id) || [];
      console.log(`   🔗 Sala "${loc.id}" alineada con entidades: ${JSON.stringify(entitiesPresent)}`);
      return {
        ...loc,
        entitiesPresent,
      };
    });
  } catch (error) {
    console.error('⚠️ Error alineando entidades a ubicaciones con Gemini:', error);
    return locations;
  }
}

async function processMapAssets(
  images: Buffer[],
  locations: any[],
  adventureId: string
): Promise<any[]> {
  console.log(`\n📷 Analizando ${images.length} imágenes extraídas del PDF con Gemini Vision...`);

  // Crear carpetas de mapas de destino
  const mapsDestDir = path.join(process.cwd(), 'public', 'adventures', adventureId, 'maps');
  if (!fs.existsSync(mapsDestDir)) {
    fs.mkdirSync(mapsDestDir, { recursive: true });
  }

  const updatedLocations = [...locations];
  const locationsList = locations.map((l) => ({ id: l.id, name: l.name, desc: l.description }));

  let mapCounter = 0;

  for (let i = 0; i < images.length; i++) {
    const imgBuffer = images[i];

    // Ignorar imágenes que pesen muy poco (ej: < 15KB) ya que suelen ser iconos, números de adorno o bordes de página
    if (imgBuffer.length < 15 * 1024) {
      continue;
    }

    console.log(`🔎 Analizando imagen #${i + 1} (${(imgBuffer.length / 1024).toFixed(1)} KB)...`);

    try {
      const base64Image = imgBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Image}`;

      const prompt = `Analiza esta imagen de una aventura de D&D. Sueles encontrar mapas tácticos, planos de mazmorras o mapas de regiones.
      Tu tarea es decidir si esta imagen es un mapa (de combate, de mazmorra, o de región) de alguna de las siguientes ubicaciones de la aventura:
      ${JSON.stringify(locationsList)}

      Devuelve un JSON estructurado con:
      - isMap: true si es un mapa (plano, croquis, cuadrícula de combate o mapa regional). false si es una ilustración artística, un retrato de personaje, un icono de adorno, o un texto.
      - locationId: Si isMap es true, indica a qué ID de ubicación pertenece. Si no pertenece a ninguna específica pero es el mapa general de la región de la aventura, devuelve "general". Si isMap es false, devuelve "none".
      `;

      const response = await generateWithRetry({
        model: GEMINI_MODEL_NAME,
        prompt: [
          { media: { url: dataUrl, contentType: 'image/png' } },
          { text: prompt },
        ],
        output: {
          schema: z.object({
            isMap: z.boolean(),
            locationId: z.string(),
          }),
        },
        config: {
          temperature: 0.1,
        },
      });

      const result = response.output;

      if (result.isMap && result.locationId !== 'none') {
        const destFileName = `${result.locationId}.png`;
        const destPath = path.join(mapsDestDir, destFileName);
        fs.writeFileSync(destPath, imgBuffer);

        mapCounter++;
        console.log(`   🗺️ ¡Mapa detectado! Asociado a "${result.locationId}" y guardado en public/adventures/${adventureId}/maps/${destFileName}`);

        // Asociar ruta del mapa a la ubicación correspondiente en el JSON
        const targetLoc = updatedLocations.find((l) => l.id === result.locationId);
        if (targetLoc) {
          targetLoc.mapData = {
            imagePath: `adventures/${adventureId}/maps/${destFileName}`,
            spatialData: {
              dimensions: {
                width: 60, // valores estimados por defecto
                height: 45,
                scale: '1 cuadrícula = 5 pies',
              },
            },
          };
        }
      }
    } catch (e) {
      console.error(`   ⚠️ Falló el análisis de visión para la imagen #${i + 1}:`, e);
    }
  }

  console.log(`✅ Finalizado el procesado de assets. Se han guardado y clasificado ${mapCounter} mapas.`);
  return updatedLocations;
}

/**
 * Función principal del script
 */
async function main() {
  console.log('⚔️ D&D Adventures AI - Convertidor de PDF a JSON ⚔️');

  const args = process.argv.slice(2);
  const pdfArg = args.find((arg) => arg.endsWith('.pdf'));

  if (!pdfArg) {
    console.error('❌ Error: Debes especificar la ruta de un archivo PDF.');
    console.log('Uso: npx tsx scripts/pdf-to-json.ts <ruta_al_archivo.pdf> [--id <adventure-id>] [--title "<Titulo>"]');
    process.exit(1);
  }

  const pdfPath = path.resolve(pdfArg);
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ Error: El archivo PDF "${pdfPath}" no existe.`);
    process.exit(1);
  }

  const idOptIdx = args.indexOf('--id');
  const titleOptIdx = args.indexOf('--title');

  let customId = idOptIdx !== -1 ? args[idOptIdx + 1] : undefined;
  let customTitle = titleOptIdx !== -1 ? args[titleOptIdx + 1] : undefined;

  console.log(`📖 Leyendo PDF: "${pdfPath}"...`);

  // 1. Extraer texto del PDF
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  const pdfData = await parser.getText();
  const fullText = pdfData.text;

  if (!fullText || fullText.trim().length === 0) {
    console.error('❌ Error: El PDF no contiene texto legible (puede ser un PDF escaneado sin OCR).');
    process.exit(1);
  }

  console.log(`📊 Texto extraído: ${fullText.length} caracteres (~${Math.round(fullText.length / 6)} palabras).`);

  // 2. Extraer metadatos y tabla de contenido con Gemini
  // Le mandamos las primeras 30.000 palabras (suficiente para cubrir la introducción y el índice de contenidos)
  const toc = await extractTableOfContents(fullText);
  const adventureId = customId || normalizeId(toc.title);
  const adventureTitle = customTitle || toc.title;

  console.log('\n=========================================');
  console.log(`Aventura: "${adventureTitle}" (ID: ${adventureId})`);
  console.log(`Resumen: ${toc.summary}`);
  console.log(`Niveles: ${toc.levelRange.start} - ${toc.levelRange.end}`);
  console.log(`Ubicaciones estimadas (${toc.tocLocations.length}):`, toc.tocLocations);
  console.log(`Criaturas/NPCs estimadas (${toc.tocEntities.length}):`, toc.tocEntities);
  console.log('=========================================\n');

  // 3. Segmentación del texto y procesamiento modular por bloques
  // Dividimos en bloques de ~18.000 palabras (unos 100.000 caracteres) para enviarlos cómodamente a la API de Gemini
  const blockSize = 100000;
  const blocks: string[] = [];
  for (let i = 0; i < fullText.length; i += blockSize) {
    blocks.push(fullText.substring(i, i + blockSize));
  }

  console.log(`⚙️ Procesando la aventura en ${blocks.length} bloques de texto modular...`);

  let allLocations: any[] = [];
  let allEntities: any[] = [];

  for (let idx = 0; idx < blocks.length; idx++) {
    console.log(`   [Bloque ${idx + 1}/${blocks.length}] Procesando salas y criaturas...`);
    const blockText = blocks[idx];

    // Extraer ubicaciones de este bloque
    const blockLocs = await extractLocations(blockText, toc.tocLocations, adventureId);
    allLocations = allLocations.concat(blockLocs);

    // Extraer entidades de este bloque
    const blockEnts = await extractEntities(blockText, toc.tocEntities);
    allEntities = allEntities.concat(blockEnts);
  }

  // Desduplicar ubicaciones y entidades por ID
  const uniqueLocationsMap = new Map<string, any>();
  for (const loc of allLocations) {
    // Si la ubicación ya está registrada, combinamos campos opcionales
    if (uniqueLocationsMap.has(loc.id)) {
      const existing = uniqueLocationsMap.get(loc.id);
      if (loc.dmNotes) {
        existing.dmNotes = existing.dmNotes ? `${existing.dmNotes}\n${loc.dmNotes}` : loc.dmNotes;
      }
      if (loc.connections) {
        existing.connections = [...(existing.connections || []), ...loc.connections];
      }
      if (loc.hazards) {
        existing.hazards = [...(existing.hazards || []), ...loc.hazards];
      }
      if (loc.interactables) {
        existing.interactables = [...(existing.interactables || []), ...loc.interactables];
      }
      if (loc.entitiesPresent) {
        const existingList = existing.entitiesPresent || [];
        const newList = loc.entitiesPresent || [];
        // Keep the list that has more detailed/complete entries
        if (newList.length > existingList.length) {
          existing.entitiesPresent = newList;
        }
      }

    } else {
      uniqueLocationsMap.set(loc.id, loc);
    }
  }

  const uniqueEntitiesMap = new Map<string, any>();
  for (const ent of allEntities) {
    if (!uniqueEntitiesMap.has(ent.id)) {
      uniqueEntitiesMap.set(ent.id, ent);
    }
  }

  let finalLocations = Array.from(uniqueLocationsMap.values());

  // Resolver fichas de monstruos y aplicar overrides
  console.log('\n🛡️ Resolviendo y precargando estadísticas de monstruos y aplicando overrides...');
  const finalEntities: any[] = [];
  for (const ent of Array.from(uniqueEntitiesMap.values())) {
    if (ent.type === 'monster' || ent.type === 'npc') {
      const searchName = ent.baseType || ent.name;
      console.log(`   🔎 Buscando estadísticas para: "${ent.name}" (Base: "${searchName}")...`);
      try {
        let stats = await getMonsterStatsFromDndApi(searchName, !!ent.baseType);
        if (!stats) {
          console.log(`     ⚠️ Criatura única detectada: Creando plantilla vacía de estadísticas para "${ent.name}"`);
          stats = {
            hp: 10,
            ac: 10,
            abilityScores: { fuerza: 10, destreza: 10, constitución: 10, inteligencia: 10, sabiduría: 10, carisma: 10 },
            abilityModifiers: { fuerza: 0, destreza: 0, constitución: 0, inteligencia: 0, sabiduría: 0, carisma: 0 },
            proficiencyBonus: 2,
            actions: []
          };
        }

        // Si hay overrides, los aplicamos
        if (ent.statsOverrides) {
          console.log(`     ✏️ Aplicando modificaciones de estadísticas para "${ent.name}":`, JSON.stringify(ent.statsOverrides));
          if (ent.statsOverrides.hp !== undefined) {
            stats.hp = ent.statsOverrides.hp;
          }
          if (ent.statsOverrides.ac !== undefined) {
            stats.ac = ent.statsOverrides.ac;
          }
          if (ent.statsOverrides.abilityScores) {
            const keys = ['fuerza', 'destreza', 'constitución', 'inteligencia', 'sabiduría', 'carisma'] as const;
            for (const key of keys) {
              const overVal = ent.statsOverrides.abilityScores[key];
              if (overVal !== undefined) {
                stats.abilityScores[key] = overVal;
                // Recalcular modificador
                stats.abilityModifiers[key] = Math.floor((overVal - 10) / 2);
              }
            }
          }
          if (ent.statsOverrides.actions && ent.statsOverrides.actions.length > 0) {
            stats.actions = ent.statsOverrides.actions;
          }
        }
        // Guardar las estadísticas resueltas y mezcladas en el bloque 'stats'
        ent.stats = stats;
      } catch (err) {
        console.error(`     ❌ Error resolviendo estadísticas de "${ent.name}":`, err);
      }
    }
    finalEntities.push(ent);
  }

  // Asegurar que la ubicación de inicio exista en la lista de ubicaciones
  let startingId = normalizeId(toc.startingLocationId) || 'inicio-de-la-aventura';
  const startingLocExists = finalLocations.some((l: any) => l.id === startingId);

  if (!startingLocExists && finalLocations.length > 0) {
    console.log(`\nℹ️ El startingLocationId "${startingId}" no coincide con ningún ID extraído. Usando la primera ubicación extraída ("${finalLocations[0].id}") como ubicación inicial.`);
    startingId = finalLocations[0].id;
    toc.startingLocationId = startingId;
  } else if (!startingLocExists) {
    console.log(`\n⚠️ La ubicación de inicio "${startingId}" no fue extraída del texto. Generándola sintéticamente para garantizar consistencia...`);

    const startingName = toc.startingLocationId
      .replace(/[-_]+/g, ' ')
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'Inicio de la Aventura';

    finalLocations.unshift({
      id: startingId,
      name: startingName,
      description: `El punto de partida de la aventura, donde el grupo de aventureros se reúne y da comienzo la historia.`,
      explorationMode: 'wilderness',
      lightLevel: 'bright',
      connections: [], // Será conectado por generateConnectionsGraph
      dmNotes: `Esta es la ubicación de inicio narrativa de la aventura, diseñada para introducir el gancho principal y situar a los personajes.`,
      entitiesPresent: [], // Se rellenará a continuación
      hazards: [],
      interactables: []
    });
  }

  // Generar y alinear el grafo de navegación automáticamente con Gemini
  finalLocations = await generateConnectionsGraph(finalLocations, toc.summary);

  // Alinear inteligentemente las entidades presentes en cada ubicación usando Gemini
  finalLocations = await alignEntitiesToLocationsWithGemini(finalLocations, finalEntities, toc.summary, toc.adventureLore);

  // 4. Extracción de imágenes del PDF
  const mapsDestDir = path.join(process.cwd(), 'public', 'adventures', adventureId, 'maps');
  let mapFilesExist = false;
  if (fs.existsSync(mapsDestDir)) {
    const files = fs.readdirSync(mapsDestDir);
    const imageFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.webp') || f.endsWith('.gif'));
    if (imageFiles.length > 0) {
      console.log(`\n📂 Se detectó que el directorio de mapas "${mapsDestDir}" ya contiene ${imageFiles.length} imágenes. Omitiendo extracción y clasificación de imágenes por Gemini Vision y asociando los mapas existentes...`);
      mapFilesExist = true;
      for (const file of imageFiles) {
        const fileLocId = path.basename(file, path.extname(file));
        const targetLoc = finalLocations.find((l: any) => l.id === fileLocId);
        if (targetLoc) {
          targetLoc.mapData = {
            imagePath: `adventures/${adventureId}/maps/${file}`,
            spatialData: {
              dimensions: {
                width: 60,
                height: 45,
                scale: '1 cuadrícula = 5 pies',
              },
            },
          };
          console.log(`   🗺️ Mapa existente "${file}" asociado automáticamente a la ubicación "${fileLocId}".`);
        }
      }
    }
  }

  if (!mapFilesExist) {
    let extractedImages: Buffer[] = [];
    try {
      console.log('\n🖼️ Extrayendo imágenes embebidas del archivo PDF...');
      const imageResult = await parser.getImage();
      for (const page of imageResult.pages) {
        for (const img of page.images) {
          if (img.data) {
            extractedImages.push(Buffer.from(img.data));
          }
        }
      }
      console.log(`✅ Extracción de imágenes finalizada. Se encontraron ${extractedImages.length} imágenes.`);
    } catch (err) {
      console.error('⚠️ No se pudieron extraer las imágenes físicas del PDF:', err);
    } finally {
      await parser.destroy();
    }

    // 5. Clasificar y asociar mapas con Gemini Vision
    if (extractedImages.length > 0) {
      finalLocations = await processMapAssets(extractedImages, finalLocations, adventureId);
    }
  } else {
    // Si no extrajimos imágenes del PDF, de todas formas debemos destruir el parser de PDFParse para liberar memoria.
    try {
      await parser.destroy();
    } catch (err) {}
  }

  // Construir objeto final de aventura
  let adventureJSON: any = {
    adventureId,
    title: adventureTitle,
    summary: toc.summary,
    introductoryNarration: toc.introductoryNarration || toc.summary,
    system: 'D&D 5e',
    levelRange: toc.levelRange,
    adventureLore: toc.adventureLore,
    settings: {
      startingLocationId: normalizeId(toc.startingLocationId) || finalLocations[0]?.id || 'hub',
      initialPartySize: 4,
    },
    credits: {
      author: 'Gemini PDF Parser',
      source: path.basename(pdfPath),
    },
    locations: finalLocations,
    entities: finalEntities,
    items: [], // Inicialmente vacío, el motor de hidratación llenará si los monstruos traen armas
  };

  // Limpiar referencias huérfanas
  adventureJSON = postProcessAdventure(adventureJSON);

  // 6. Validar con Zod
  console.log('\n🔍 Validando estructura de la aventura contra el esquema Zod...');
  try {
    AdventureDataSchema.parse(adventureJSON);
    console.log('✅ ¡Validación Zod exitosa! La estructura del JSON de aventura cumple al 100%.');
  } catch (err) {
    console.error('⚠️ Advertencia: El JSON generado tiene algunos campos que no cumplen estrictamente el esquema Zod.');
    if (err instanceof z.ZodError) {
      console.error('Detalle de errores de validación:', JSON.stringify(err.format(), null, 2));
    } else {
      console.error(err);
    }
  }

  // Guardar archivo JSON
  const outputDir = path.join(process.cwd(), 'public', 'adventures', adventureId);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${adventureId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(adventureJSON, null, 4), 'utf-8');

  console.log(`\n🎉 ¡Proceso completado con éxito!`);
  console.log(`💾 Aventura guardada en: file:///${outputPath.replace(/\\/g, '/')}`);
}

main().catch((err) => {
  console.error('❌ Error crítico en el proceso de conversión:', err);
  process.exit(1);
});
