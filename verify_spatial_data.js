const fs = require('fs');

const content = fs.readFileSync('JSON_adventures/el-dragon-del-pico-agujahelada.json', 'utf8');
const adventure = JSON.parse(content);

const locations = adventure.locations;

function checkLocation(id) {
    const loc = locations.find(l => l.id === id);
    if (!loc) {
        console.error(`Location ${id} not found`);
        return;
    }
    console.log(`Checking ${id}...`);
    console.log(`  Region: ${loc.regionId}`);
    if (loc.connections) {
        console.log(`  Connections: ${loc.connections.length}`);
        loc.connections.forEach(c => {
            console.log(`    -> ${c.targetId} (${c.type}, ${c.travelTime})`);
        });
    } else {
        console.log(`  Connections: None (Legacy Exits: ${loc.exits ? loc.exits.length : 0})`);
    }
}

checkLocation('phandalin-plaza-del-pueblo');
checkLocation('camino-a-las-afueras-de-phandalin');
checkLocation('posada-rocacolina');
