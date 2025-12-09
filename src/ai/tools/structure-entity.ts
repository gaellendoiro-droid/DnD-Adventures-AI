
import { tool, z } from 'genkit';
import { ai } from '@/ai/genkit';
import { consultRulebookTool } from './consult-rulebook';
import { log } from '@/lib/logger';
import { MonsterDataSchema, SpellDataSchema, ItemDataSchema } from '@/lib/db/schema';

// Schemas para el input
const StructureEntitySchema = z.object({
    entityName: z.string().describe("Nombre de la entidad a buscar y estructurar (ej: 'Goblin', 'Bola de Fuego')."),
    entityType: z.enum(['monster', 'spell', 'item']).describe("Tipo de entidad."),
});

export const structureEntityTool = tool(
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
        // Prompt optimizado para RAG de recuperación
        let contextHint = "";
        if (entityType === 'monster') contextHint = "Busca en el Apéndice de Criaturas o Bestiario.";
        if (entityType === 'spell') contextHint = "Busca en el Capítulo de Hechizos.";
        if (entityType === 'item') contextHint = "Busca en el Capítulo de Equipo.";

        const ragQuery = `Dame la entrada completa (estadísticas, texto descripción, bloque de stats) para "${entityName}" (${entityType}). ${contextHint} Necesito todos los datos numéricos y reglas para usarlo en el juego.`;

        try {
            // Llamamos a la tool de consulta (que usa Gemini 3 + PDF)
            const rawInfo = await consultRulebookTool({
                query: ragQuery,
                context: "Extracción de datos para estructuración mecánica"
            });

            log.info(`Info cruda recibida del manual: ${rawInfo.substring(0, 200)}...`, { module: 'StructureEntity', length: rawInfo.length });

            if (rawInfo.includes("no pude consultar") || rawInfo.length < 50) {
                return { found: false, reason: "No se encontró información suficiente en el manual." };
            }

            // 2. Convertir texto crudo a JSON Estructurado

            // Esquemas flexibles (Google API friendly)
            const flexibleMonster = z.object({
                name: z.string(),
                type: z.string(),
                ac: z.number().or(z.string()),
                hp: z.number().or(z.string()),
                cr: z.number().or(z.string()),
                stats: z.object({
                    str: z.number().or(z.string()),
                    dex: z.number().or(z.string()),
                    con: z.number().or(z.string()),
                    int: z.number().or(z.string()),
                    wis: z.number().or(z.string()),
                    cha: z.number().or(z.string()),
                }),
                actions: z.array(z.object({ name: z.string(), desc: z.string() })).optional(),
                features: z.array(z.object({ name: z.string(), desc: z.string() })).optional(),
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
                promptHints = `- Stats OBJETO: { "str": 10... }. - CR numero.`;
            } else if (entityType === 'spell') {
                targetSchema = flexibleSpell;
                promptHints = `- Level numero (0 para trucos). - School en Español (Evocación...).`;
            } else if (entityType === 'item') {
                targetSchema = flexibleItem;
                promptHints = `- Rarity: Común, Poco Común... - Mechanics opcional.`;
            }

            const { output } = await ai.generate({
                model: 'googleai/gemini-2.0-flash',
                prompt: `
                Actúas como un convertidor de Texto a JSON para D&D 5e.
                
                ENTRADA (Texto del Manual):
                """
                ${rawInfo}
                """

                TAREA:
                Extrae los datos de "${entityName}" (${entityType}) y compón un objeto JSON válido.
                
                AVISO IMPORTANTE:
                - Devuelve SOLO el JSON.
                - Las CLAVES (keys) EN INGLÉS según esquema.
                - Los VALORES (values) EN ESPAÑOL.
                ${promptHints}
                `,
                output: { schema: targetSchema }
            });

            if (!output) {
                log.warn("Generación de estructura falló (output es null)", { module: 'StructureEntity' });
                return { found: false, reason: "Fallo al generar JSON estructurado." };
            }

            log.info(`Output Estructurado Generado: ${JSON.stringify(output).substring(0, 100)}...`, { module: 'StructureEntity' });

            log.info(`Entidad estructurada con éxito: ${entityName}`, { module: 'StructureEntity' });
            return { found: true, data: output };

        } catch (error: any) {
            log.error("Error en proceso de estructuración", { error: error.message });
            return { found: false, reason: `Error técnico: ${error.message}` };
        }
    }
);
