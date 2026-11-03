
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Asegurar que existe el directorio de datos (si decidimos ponerlo en otro lado)
// Por defecto en root para fácil acceso, o en una carpeta db interna.
// Pondremos la DB en root como 'knowledge/dnd-local.db' para que esté con el resto del conocimiento.

const DB_PATH = path.join(process.cwd(), 'knowledge', 'dnd-local.db');

// Asegurar directorio
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(DB_PATH); // verbose removido para limpiar terminal
db.pragma('journal_mode = WAL'); // Mejor rendimiento concurrente

// Inicializar Tablas
export function initDB() {
  // console.log("🛠️ Inicializando Base de Datos Local...");

  // Tabla MONSTERS
  db.exec(`
    CREATE TABLE IF NOT EXISTS monsters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      cr REAL,
      data JSON NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_monsters_name ON monsters(name);
    CREATE INDEX IF NOT EXISTS idx_monsters_type ON monsters(type);
    CREATE INDEX IF NOT EXISTS idx_monsters_cr ON monsters(cr);
  `);

  // Tabla SPELLS
  db.exec(`
    CREATE TABLE IF NOT EXISTS spells (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      level INTEGER,
      school TEXT,
      data JSON NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_spells_name ON spells(name);
    CREATE INDEX IF NOT EXISTS idx_spells_level ON spells(level);
  `);

  // Tabla ITEMS
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      rarity TEXT,
      data JSON NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
    CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
  `);

  console.log("✅ Base de Datos lista en:", DB_PATH);

  // Inyectar semillas básicas esenciales si no existen
  try {
    const sheepExists = db.prepare('SELECT 1 FROM monsters WHERE id = ?').get('sheep');
    if (!sheepExists) {
      console.log("🐑 Semilla: Insertando Oveja en la base de datos local...");
      const sheepData = {
        id: 'sheep',
        name: 'Oveja',
        source: 'local_seeds',
        type: 'Bestia',
        size: 'Pequeño',
        alignment: 'No alineado',
        cr: 0,
        ac: 10,
        hp: 2,
        speed: '30 pies',
        stats: {
          str: 3,
          dex: 10,
          con: 8,
          int: 2,
          wis: 10,
          cha: 4
        },
        modifiers: {
          str: -4,
          dex: 0,
          con: -1,
          int: -4,
          wis: 0,
          cha: -3
        },
        skills: 'Percepción +2',
        senses: 'Percepción pasiva 10',
        languages: '--',
        actions: [
          {
            name: 'Cabezazo',
            desc: 'Ataque con Arma Cuerpo a Cuerpo: +2 al golpe, alcance 5 pies, un objetivo. Impacto: 1 punto de daño contundente.',
            attack_bonus: 2,
            damage: [
              {
                damage_type: {
                  index: 'bludgeoning',
                  name: 'Bludgeoning'
                },
                damage_dice: '1'
              }
            ]
          }
        ]
      };

      db.prepare(`
        INSERT INTO monsters (id, name, type, cr, data)
        VALUES (@id, @name, @type, @cr, @data)
      `).run({
        id: sheepData.id,
        name: sheepData.name,
        type: sheepData.type,
        cr: sheepData.cr,
        data: JSON.stringify(sheepData)
      });
    }
  } catch (error) {
    console.error("⚠️ Error insertando semillas de base de datos:", error);
  }
}

// Ejecutar init al cargar por primera vez (o hacerlo manual en el arranque app)
initDB();

export default db;
