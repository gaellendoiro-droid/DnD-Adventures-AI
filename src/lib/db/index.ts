
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
}

// Ejecutar init al cargar por primera vez (o hacerlo manual en el arranque app)
initDB();

export default db;
