
import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { consultRulebookTool } from './consult-rulebook';
import { log } from '@/lib/logger';
import { MonsterDataSchema, SpellDataSchema, ItemDataSchema } from '@/lib/db/schema';
import { retryWithExponentialBackoff } from '../flows/retry-utils';
import { GEMINI_MODEL_NAME } from '../model-config';

// Schemas para el input
const StructureEntitySchema = z.object({
    entityName: z.string().describe("Nombre de la entidad a buscar y estructurar (ej: 'Goblin', 'Bola de Fuego')."),
    entityType: z.enum(['monster', 'spell', 'item']).describe("Tipo de entidad."),
});

export const structureEntityTool = ai.defineTool(
    {
        name: 'structureEntity',
        description: 'Busca una entidad en el Manual del Jugador y la convierte en datos estructurados (JSON) listos para la base de datos.',
        inputSchema: StructureEntitySchema,
        outputSchema: z.object({
            found: z.boolean(),
            data: z.any().optional(), // Puede ser MonsterData, SpellData o ItemData
            reason: z.string().optional()
        }),
    },
    async (input) => {
        const { entityName, entityType } = input;
        log.info(`Intentando estructurar entidad desde Lore: ${entityName} (${entityType})`, { module: 'StructureEntity' });

        // 1. Obtener información cruda del PDF usando la herramienta existente
        let contextHint = "";
        if (entityType === 'monster') contextHint = "Busca en el Apéndice de Criaturas o Bestiario.";
        if (entityType === 'spell') contextHint = "Busca en el Capítulo de Hechizos.";
        if (entityType === 'item') contextHint = "Busca en el Capítulo de Equipo.";

        const ragQuery = `EXTRAE LITERALMENTE (copia y pega) todo el texto crudo del PDF para la entrada de "${entityName}" (${entityType}). 
        NO RESUMAS. NO DES FORMATO MARKDOWN BONITO. SOLO DAME EL TEXTO DEL BLOQUE DE ESTADÍSTICAS TAL CUAL APARECE.
        Incluye velocidad, habilidades, sentidos, idiomas, y todas las acciones.`;

        try {
            // Llamamos a la tool de consulta
            const rawInfo = await consultRulebookTool({
                query: ragQuery,
                context: "Extracción de datos RAW para parsing JSON"
            });

            // LOG COMPLETO DE LA INFO CRUDA (Vital para debug)
            log.info(`[DEBUG RAW INFO] Longitud: ${rawInfo.length} caracteres.`);
            console.log(`[RAW TEXT PREVIEW]: ${rawInfo.substring(0, 600)}...`); // DEBUG: Ver qué lee realmente

            if (rawInfo.includes("no pude consultar") || rawInfo.length < 50) {
                return { found: false, reason: "No se encontró información suficiente en el manual." };
            }

            // 2. Convertir texto crudo a JSON Estructurado

            // Esquemas flexibles (Google API friendly)
            const flexibleMonster = z.object({
                name: z.string(),
                size: z.string().optional(), // Pequeño, Mediano...
                type: z.string(), // Bestia, Humanoide...
                alignment: z.string().optional(), // Sin alineamiento...
                ac: z.number().or(z.string()),
                hp: z.number().or(z.string()), // "11 (2d8 + 2)"
                speed: z.string().optional(), // "40 pies"
                cr: z.number().or(z.string()),
                stats: z.object({
                    str: z.number().or(z.string()),
                    dex: z.number().or(z.string()),
                    con: z.number().or(z.string()),
                    int: z.number().or(z.string()),
                    wis: z.number().or(z.string()),
                    cha: z.number().or(z.string()),
                }),
                modifiers: z.object({
                    str: z.number().or(z.string()),
                    dex: z.number().or(z.string()),
                    con: z.number().or(z.string()),
                    int: z.number().or(z.string()),
                    wis: z.number().or(z.string()),
                    cha: z.number().or(z.string()),
                }).optional(),
                skills: z.string().nullable(), // "Percepción +3..."
                senses: z.string().nullable(), // "Percepción pasiva 13..."
                languages: z.string().nullable(), // "Común..."
                damageVulnerabilities: z.string().nullable(),
                damageResistances: z.string().nullable(),
                damageImmunities: z.string().nullable(),
                conditionImmunities: z.string().nullable(),
                features: z.array(z.object({ name: z.string(), desc: z.string() })).optional(),
                actions: z.array(z.object({ name: z.string(), desc: z.string() })).optional(),
                reactions: z.array(z.object({ name: z.string(), desc: z.string() })).optional(),
                legendaryActions: z.array(z.object({ name: z.string(), desc: z.string() })).optional(),
                description: z.string().optional()
            });

            const flexibleSpell = z.object({
                name: z.string(),
                level: z.number(),
                school: z.string(),
                castingTime: z.string(),
                range: z.string(),
                components: z.string(),
                duration: z.string(),
                description: z.string()
            });

            const flexibleItem = z.object({
                name: z.string(),
                type: z.string(),
                rarity: z.string(),
                description: z.string(),
                weight: z.string().optional(),
                price: z.string().optional(),
                mechanics: z.object({
                    damage: z.string().optional(),
                    ac: z.number().or(z.string()).optional(),
                    properties: z.array(z.string()).optional()
                }).optional()
            });

            let targetSchema: any = flexibleMonster;
            let promptHints = "";

            if (entityType === 'monster') {
                targetSchema = flexibleMonster;
                promptHints = `
                CAMPOS OBLIGATORIOS (Devuelve null o "—" si no existen, NO los omitas):
                - name, type, size, alignment, ac, hp, speed, cr, stats.
                - skills (Habilidades): Copia literal tras "Habilidades:".
                - senses (Sentidos): Copia literal tras "Sentidos:".
                - languages (Idiomas): Copia literal tras "Idiomas:".
                - damageVulnerabilities (Vulnerabilidad a daño): Copia literal.
                - damageResistances (Resistencia a daño): Copia literal.
                - damageImmunities (Inmunidad a daño): Copia literal.
                - conditionImmunities (Inmunidad a estados): Copia literal.
                - features: Array de rasgos especiales [{name, desc}].
                - actions: Array de acciones [{name, desc}].
                - reactions: Array de reacciones [{name, desc}].
                - legendaryActions: Array de acciones legendarias [{name, desc}].
                `;
            } else if (entityType === 'spell') {
                targetSchema = flexibleSpell;
                promptHints = `- Level numero (0 para trucos). - School en Español (Evocación...).`;
            } else if (entityType === 'item') {
                targetSchema = flexibleItem;
                promptHints = `- Rarity: Común, Poco Común... (Si no pone nada, asume "Común"). - Mechanics opcional. - Description: IMPORTANTE, si el texto original tiene descripción, úsala. SI NO TIENE (como en tablas de armas), GENERA UNA BREVE descripción física basada en el tipo de objeto (ej: "Una espada de hoja curva y ligera"). - Weight y Price: Extrae si existen.`;
            }

            const { output } = await retryWithExponentialBackoff(async () => {
                return await ai.generate({
                    model: GEMINI_MODEL_NAME,
                    prompt: `
                    Actúas como un parser de D&D 5e.
                    
                    Tu misión es rellenar el JSON con los datos que encuentres en el texto de abajo.
                    
                    TEXTO E INPUT:
                    """
                    ${rawInfo}
                    """

                    INSTRUCCIONES DE BÚSQUEDA (IMPORTANTE: MIRA TODO EL TEXTO):
                    
                    EJEMPLOS DE EXTRACCIÓN (Sigue este patrón):
                    - Texto: "Velocidad 30 pies" -> campo speed: "30 pies"
                    - Texto: "STR 16 (+3)" -> stats.str: 16, modifiers.str: 3
                    - Texto: "DEX 9 (-1)" -> stats.dex: 9, modifiers.dex: -1
                    - Texto: "Habilidades: Sigilo +6, Percepción +3" -> campo skills: "Sigilo +6, Percepción +3"
                    - Texto: "Sentidos: Visión en la oscuridad 60 pies" -> campo senses: "Visión en la oscuridad 60 pies"
                    - Texto: "Vulnerabilidad a daño: contundente" -> campo damageVulnerabilities: "contundente"
                    - Texto: "Inmunidad a estado: agotamiento" -> campo conditionImmunities: "agotamiento"
                    
                    REGLAS CRÍTICAS:
                    1. Si el dato existe en el texto, EXTRAELO. No seas perezoso.
                    2. **Limpieza de Nombre (OCR):** Los PDFs escaneados a veces meten espacios extra (ej: "NÓTIC O" -> "Nótico"). CORRIGE estos errores obvios. Usa Title Case.
                    3. **Tipo y Tamaño:** Si el texto está en español, úsalo tal cual. Si está en inglés, tradúcelo.
                    4. **Velocidad:** Busca "Velocidad", "Speed" o simplemente "30 pies" cerca del inicio.
                    5. **Stats y Modificadores:** Rellena stats (número base) y modifiers (número entre paréntesis).
                    6. **Alineamiento:** Suele estar tras el tipo (ej: "Muerto viviente, legal malvado" -> alignment: "legal malvado").

                    5. **Items/Objetos:** Si es un objeto, separa claramente mechanics (daño, CA, propiedades) de description (lore/texto), y busca weight (peso) y price (coste). NO mezcles. En description NO pongas "La entrada es un objeto...", solo describe el objeto.
                    
                    Si un dato REALMENTE no aparece, devuelve null.
                    
                    Esquema JSON:
                    ${promptHints}
                    `,
                    output: { schema: targetSchema }
                });
            }, 3, 2000, 'StructureEntity-Generate');

            if (!output) {
                log.warn("Generación de estructura falló (output es null)", { module: 'StructureEntity' });
                return { found: false, reason: "Error al generar JSON." };
            }

            // Validación de integridad de datos CRÍTICA
            const isMonsterInvalid = entityType === 'monster' && (!output.ac || !output.hp || output.ac === 0 || output.hp === 0);
            const isSpellInvalid = entityType === 'spell' && (!output.level && output.level !== 0 && !output.school);
            const isItemInvalid = entityType === 'item' && (!output.type || !output.description);

            if (isMonsterInvalid || isSpellInvalid || isItemInvalid) {
                log.warn(`Extracción incompleta o fallida para ${entityType} '${entityName}': faltan campos críticos.`, { module: 'StructureEntity', data: output });
                return { found: false, reason: "La IA no pudo extraer datos válidos del texto (posible alucinación o texto irrelevante)." };
            }

            return {
                found: true,
                data: output
            };

        } catch (error: any) {
            log.error("Error en proceso de estructuración", { error: error.message });
            return { found: false, reason: `Error técnico: ${error.message}` };
        }
    }
);
