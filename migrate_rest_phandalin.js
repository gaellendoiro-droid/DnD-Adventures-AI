const fs = require('fs');

const filePath = 'JSON_adventures/el-dragon-del-pico-agujahelada.json';
let content = fs.readFileSync(filePath, 'utf8');

// Helper function to insert fields before "exits"
function insertFields(locationId, newFields) {
    const locSearch = `"id": "${locationId}"`;
    const locIndex = content.indexOf(locSearch);

    if (locIndex === -1) {
        console.error(`Location ${locationId} not found`);
        return;
    }

    // Find "exits" after this location
    const exitsSearch = '"exits": [';
    const exitsIndex = content.indexOf(exitsSearch, locIndex);

    if (exitsIndex === -1) {
        console.error(`Exits not found for ${locationId}`);
        return;
    }

    // Check if already migrated (simple check for regionId)
    // We search for regionId between locIndex and exitsIndex
    const regionIdSearch = '"regionId":';
    const regionIdIndex = content.indexOf(regionIdSearch, locIndex);

    if (regionIdIndex !== -1 && regionIdIndex < exitsIndex) {
        console.log(`Location ${locationId} already migrated (regionId found)`);
        return;
    }

    const beforeExits = content.substring(0, exitsIndex);
    const afterExits = content.substring(exitsIndex);

    // Ensure newFields ends with a comma and newline if needed, but here we assume newFields is a block of properties ending with comma
    // We need to match indentation. "exits" has 6 spaces.

    content = beforeExits + newFields + '\n' + afterExits;
    console.log(`Migrated ${locationId}`);
}

// 1. Camino a las afueras
const caminoFields = `      "regionId": "tierras-salvajes",
      "allowFastTravel": true,
      "connections": [
        {
          "targetId": "phandalin-plaza-del-pueblo",
          "type": "urban",
          "direction": "dentro",
          "travelTime": "10 minutos",
          "description": "Vuelves a la seguridad de Phandalin."
        },
        {
          "targetId": "colina-del-resentimiento",
          "type": "overland",
          "direction": "sur",
          "travelTime": "4 horas",
          "description": "Sigues el sendero hacia el molino en la colina."
        },
        {
          "targetId": "excavacion-de-los-enanos",
          "type": "overland",
          "direction": "este",
          "travelTime": "8 horas",
          "description": "Te adentras en las estribaciones hacia la excavación."
        },
        {
          "targetId": "terragnoma-entrada-cascada",
          "type": "overland",
          "direction": "sureste",
          "travelTime": "6 horas",
          "description": "Tomas el sendero de montaña hacia la cascada."
        },
        {
          "targetId": "rancho-de-mantecalavera",
          "type": "overland",
          "direction": "este",
          "travelTime": "12 horas",
          "description": "Viajas por el Camino de Trijabal hacia el rancho."
        }
      ],`;

insertFields('camino-a-las-afueras-de-phandalin', caminoFields);

// 2. Other Phandalin locations
const phandalinIds = [
    'posada-rocacolina',
    'suministros-barthen',
    'bazar-escudo-de-leon',
    'casa-de-cambio-de-phandalin',
    'santuario-de-la-suerte',
    'casa-de-harbin-wester'
];

const simplePhandalinFields = `      "regionId": "phandalin",`;

phandalinIds.forEach(id => {
    insertFields(id, simplePhandalinFields);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('All migrations applied.');
