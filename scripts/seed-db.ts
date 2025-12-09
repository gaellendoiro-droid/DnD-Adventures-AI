
import { db } from '../src/lib/db/index'; // Asumiendo que tsx resuelve esto bien con tsconfig paths, si no usar ruta relativa
import { MonsterDataSchema, SpellDataSchema } from '../src/lib/db/schema';
import { z } from 'zod';

// Configuración Open5e
const API_BASE = "https://api.open5e.com";

async function fetchAll(endpoint: string) {
    let results: any[] = [];
    let nextUrl = `${API_BASE}${endpoint}?limit=500`; // Pedir bloques grandes

    while (nextUrl) {
        console.log(`⬇️ Fetching ${nextUrl}...`);
        const res = await fetch(nextUrl);
        if (!res.ok) throw new Error(`Error fetching ${nextUrl}: ${res.statusText}`);
        const data = await res.json();

        results = results.concat(data.results);
        nextUrl = data.next;
    }
    return results;
}

// Transformadores
function mapMonster(open5eMonster: any) {
    try {
        const stats = {
            str: open5eMonster.strength,
            dex: open5eMonster.dexterity,
            con: open5eMonster.constitution,
            int: open5eMonster.intelligence,
            wis: open5eMonster.wisdom,
            cha: open5eMonster.charisma,
        };

        const monster = {
            id: open5eMonster.slug,
            name: open5eMonster.name,
            source: "open5e-srd",
            type: open5eMonster.type,
            cr: typeof open5eMonster.challenge_rating === 'string' ? parseFloat(open5eMonster.challenge_rating) : open5eMonster.challenge_rating,
            ac: open5eMonster.armor_class,
            hp: open5eMonster.hit_points,
            stats: stats,
            actions: open5eMonster.actions,
            features: open5eMonster.special_abilities
        };

        // Validar con Zod (opcional, pero recomendado para sanidad)
        return monster;
    } catch (e) {
        console.warn(`⚠️ Error mapeando monstruo ${open5eMonster.name}:`, e);
        return null;
    }
}

async function seedMonsters() {
    console.log("🐉 Semillando Monstruos...");
    const rawMonsters = await fetchAll("/monsters/");
    console.log(`✅ Descargados ${rawMonsters.length} monstruos. Insertando en DB...`);

    const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO monsters (id, name, type, cr, data)
        VALUES (@id, @name, @type, @cr, @data)
    `);

    const insertMany = db.transaction((monsters: any[]) => {
        let count = 0;
        for (const m of monsters) {
            const mapped = mapMonster(m);
            if (mapped) {
                insertStmt.run({
                    id: mapped.id,
                    name: mapped.name,
                    type: mapped.type,
                    cr: mapped.cr,
                    data: JSON.stringify(mapped)
                });
                count++;
            }
        }
        return count;
    });

    const inserted = insertMany(rawMonsters);
    console.log(`💾 Insertados ${inserted} monstruos en SQLite.`);
}

async function seed() {
    try {
        await seedMonsters();
        // Pendiente: seedSpells(), seedItems()
        console.log("🌱 Seed completado con éxito.");
    } catch (error) {
        console.error("❌ Error en seed:", error);
    }
}

seed();
