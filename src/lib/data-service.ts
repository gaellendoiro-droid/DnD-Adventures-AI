import { db } from './db/index';
import { normalizeQuery } from './text-utils';
import { MonsterData, MonsterDataSchema, SpellData, ItemData } from './db/schema';
import { structureEntityTool } from '@/ai/tools/structure-entity';
import { log } from '@/lib/logger';

export class DataService {

    // --- MONSTERS ---

    /**
     * Busca un monstruo en local. Si no existe, intenta estructurarlo desde el Manual (PDF) y guardarlo.
     */
    static async getMonster(query: string): Promise<MonsterData | null> {
        // 1. Búsqueda Local (Síncrona)
        const local = this.getMonsterLocal(query);
        if (local) return local;

        // 2. Fallback: Inteligencia Artificial (Lectura del PDF)
        log.info(`Monstruo '${query}' no encontrado en local. Invocando al Sabio (AI-Hydration)...`, { module: 'DataService' });

        try {
            const result = await structureEntityTool({
                entityName: query,
                entityType: 'monster'
            });

            if (result.found && result.data) {
                // Validar y Guardar
                // El tool ya devuelve algo cercano, pero validamos con Zod por seguridad
                // Validar contra esquema parcial (lo que devuelve la IA)
                const partialSchema = MonsterDataSchema.omit({ id: true, source: true });
                const partialParsed = partialSchema.safeParse(result.data);

                if (partialParsed.success) {
                    const monsterData = partialParsed.data;

                    // Construir el objeto completo
                    const fullMonster: MonsterData = {
                        ...monsterData,
                        id: normalizeQuery(monsterData.name).replace(/\s+/g, '-'),
                        source: "manual_jugador_ia"
                    };

                    // Ahora sí, guardamos
                    this.saveMonster(fullMonster.id, fullMonster);
                    log.info(`🧠 Conocimiento adquirido: ${fullMonster.name} guardado en base de datos.`, { module: 'DataService' });

                    return fullMonster;
                } else {
                    log.warn(`Datos de IA para '${query}' inválidos según esquema.`, {
                        module: 'DataService',
                        dataReceived: result.data,
                        zodErrors: JSON.stringify(partialParsed.error.format(), null, 2)
                    });
                }
            } else {
                log.info(`El Sabio no encontró nada sobre '${query}' en el manual: ${result.reason}`, { module: 'DataService', reason: result.reason });
            }
        } catch (error) {
            log.error(`Error durante la hidratación de datos para '${query}'`, { error });
        }

        return null;
    }

    private static getMonsterLocal(query: string): MonsterData | null {
        if (!query) return null;
        try {
            const normalizedSlug = normalizeQuery(query).toLowerCase().replace(/\s+/g, '-');

            // 1. ID
            const stmtId = db.prepare('SELECT data FROM monsters WHERE id = ?');
            const rowById = stmtId.get(normalizedSlug) as { data: string } | undefined;
            if (rowById) return JSON.parse(rowById.data);

            // 2. Nombre
            const stmtName = db.prepare('SELECT data FROM monsters WHERE name = ? COLLATE NOCASE');
            const rowByName = stmtName.get(query) as { data: string } | undefined;
            if (rowByName) return JSON.parse(rowByName.data);

            // 3. Like (Solo si longitud > 3 para evitar ruido con nombres cortos como 'Imp')
            if (query.length > 3) {
                const stmtLike = db.prepare('SELECT data FROM monsters WHERE name LIKE ? LIMIT 1');
                const rowByLike = stmtLike.get(`%${query}%`) as { data: string } | undefined;
                if (rowByLike) return JSON.parse(rowByLike.data);
            }

        } catch (error) {
            console.error(`Error buscando monstruo local '${query}':`, error);
        }
        return null;
    }

    static saveMonster(id: string, data: MonsterData): void {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO monsters (id, name, type, cr, data)
            VALUES (@id, @name, @type, @cr, @data)
        `);

        stmt.run({
            id: id,
            name: data.name,
            type: data.type,
            cr: data.cr,
            data: JSON.stringify(data)
        });
    }

    // --- PENDING: SPELLS & ITEMS (To be implemented similarly) ---
}
