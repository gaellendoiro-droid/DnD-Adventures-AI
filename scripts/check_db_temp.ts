import { db } from '../src/lib/db/index';

const stmtAll = db.prepare('SELECT id, name, data FROM monsters');
const rows = stmtAll.all() as any[];
console.log("=== MONSTRUOS EN DB LOCAL ===");
for (const row of rows) {
    const data = JSON.parse(row.data);
    console.log(`ID: ${row.id} | Name: ${row.name} | HP: ${data.hp} | AC: ${data.ac} | Source: ${data.source}`);
}
