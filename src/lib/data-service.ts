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

    // --- SPELLS ---

    static async getSpell(query: string): Promise<SpellData | null> {
        // 1. Local
        const local = this.getSpellLocal(query);
        if (local) return local;

        // 2. IA Fallback
        log.info(`Hechizo '${query}' no encontrado en local. Invocando al Sabio...`, { module: 'DataService' });
        try {
            const result = await structureEntityTool({ entityName: query, entityType: 'spell' });
            if (result.found && result.data) {
                // Validación Simple (DataService confia en la estrucutra limpia del tool a estas alturas)
                const spellData = result.data;
                const fullSpell: SpellData = {
                    ...spellData,
                    id: normalizeQuery(spellData.name).replace(/\s+/g, '-'),
                    source: "manual_jugador_ia"
                };
                this.saveSpell(fullSpell.id, fullSpell);
                return fullSpell;
            }
        } catch (error) {
            log.error("Error hidratando hechizo", { error });
        }
        return null;
    }

    private static getSpellLocal(query: string): SpellData | null {
        if (!query) return null;
        const normalizedSlug = normalizeQuery(query).toLowerCase().replace(/\s+/g, '-');

        try {
            const stmtId = db.prepare('SELECT data FROM spells WHERE id = ?');
            const rowById = stmtId.get(normalizedSlug) as any;
            if (rowById) return JSON.parse(rowById.data);

            const stmtName = db.prepare('SELECT data FROM spells WHERE name LIKE ? LIMIT 1');
            const rowByName = stmtName.get(`%${query}%`) as any;
            if (rowByName) return JSON.parse(rowByName.data);
        } catch (e) { }
        return null;
    }

    static saveSpell(id: string, data: SpellData): void {
        const stmt = db.prepare(`INSERT OR REPLACE INTO spells (id, name, level, school, data) VALUES (@id, @name, @level, @school, @data)`);
        stmt.run({ id, name: data.name, level: data.level, school: data.school, data: JSON.stringify(data) });
    }


    // --- ITEMS ---

    static async getItem(query: string): Promise<ItemData | null> {
        // 1. Local
        const local = this.getItemLocal(query);
        if (local) return local;

        // 2. IA
        log.info(`Objeto '${query}' no encontrado en local. Invocando al Sabio...`, { module: 'DataService' });
        try {
            const result = await structureEntityTool({ entityName: query, entityType: 'item' });
            if (result.found && result.data) {
                const itemData = result.data;
                const fullItem: ItemData = {
                    ...itemData,
                    id: normalizeQuery(itemData.name).replace(/\s+/g, '-'),
                    source: "manual_jugador_ia"
                };
                this.saveItem(fullItem.id, fullItem);
                return fullItem;
            }
        } catch (error) { log.error("Error hidratando item", { error }); }
        return null;
    }

    private static getItemLocal(query: string): ItemData | null {
        if (!query) return null;
        const normalizedSlug = normalizeQuery(query).toLowerCase().replace(/\s+/g, '-');
        try {
            const stmtId = db.prepare('SELECT data FROM items WHERE id = ?');
            const rowById = stmtId.get(normalizedSlug) as any;
            if (rowById) return JSON.parse(rowById.data);

            const stmtName = db.prepare('SELECT data FROM items WHERE name LIKE ? LIMIT 1');
            const rowByName = stmtName.get(`%${query}%`) as any;
            if (rowByName) return JSON.parse(rowByName.data);
        } catch (e) { }
        return null;
    }

    static saveItem(id: string, data: ItemData): void {
        const stmt = db.prepare(`INSERT OR REPLACE INTO items (id, name, type, rarity, data) VALUES (@id, @name, @type, @rarity, @data)`);
        stmt.run({ id, name: data.name, type: data.type, rarity: data.rarity, data: JSON.stringify(data) });
    }

    // --- RULES (RAG ONLY) ---

    /**
     * Consulta una regla de texto libre (no se guarda en DB estructurada).
     */
    static async consultRule(query: string): Promise<string | null> {
        // Podríamos implementar caché simple en memoria o en tabla 'rules_cache' si quisiéramos
        // De momento, directo al RAG
        const { consultRulebookTool } = await import('@/ai/tools/consult-rulebook');
        const result = await consultRulebookTool({
            query: query,
            context: "Consulta rápida de reglas desde UI"
        });

        if (result && !result.includes("no pude consultar")) {
            return result;
        }
        return null;
    }
}
