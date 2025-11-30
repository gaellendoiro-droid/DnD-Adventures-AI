const fs = require('fs');

const filePath = 'JSON_adventures/el-dragon-del-pico-agujahelada.json';
let content = fs.readFileSync(filePath, 'utf8');

// Define the new content
const newFields = `
      "regionId": "phandalin",
      "allowFastTravel": true,
      "connections": [
        {
          "targetId": "posada-rocacolina",
          "type": "urban",
          "direction": "norte",
          "travelTime": "2 minutos",
          "description": "Caminas unos pasos hacia la acogedora posada."
        },
        {
          "targetId": "suministros-barthen",
          "type": "urban",
          "direction": "este",
          "travelTime": "3 minutos",
          "description": "Te diriges a la tienda de suministros."
        },
        {
          "targetId": "bazar-escudo-de-leon",
          "type": "urban",
          "direction": "este",
          "travelTime": "2 minutos",
          "description": "Vas hacia el bazar con el escudo de león."
        },
        {
          "targetId": "casa-de-cambio-de-phandalin",
          "type": "urban",
          "direction": "sur",
          "travelTime": "1 minuto",
          "description": "Te acercas a la casa de cambio."
        },
        {
          "targetId": "santuario-de-la-suerte",
          "type": "urban",
          "direction": "norte",
          "travelTime": "5 minutos",
          "description": "Caminas hacia el pequeño santuario de piedra."
        },
        {
          "targetId": "casa-de-harbin-wester",
          "type": "urban",
          "direction": "oeste",
          "travelTime": "4 minutos",
          "description": "Te diriges a la casa del alcalde."
        },
        {
          "targetId": "camino-a-las-afueras-de-phandalin",
          "type": "direct",
          "direction": "fuera",
          "travelTime": "10 minutos",
          "description": "Sales del pueblo hacia las tierras salvajes."
        }
      ],`;

// Find the insertion point
// We want to insert before "exits": [ inside phandalin-plaza-del-pueblo
const phandalinId = '"id": "phandalin-plaza-del-pueblo"';
const phandalinIndex = content.indexOf(phandalinId);

if (phandalinIndex === -1) {
    console.error('Phandalin location not found');
    process.exit(1);
}

// Find the first "exits": [ AFTER phandalinId
const exitsSearch = '"exits": [';
const exitsIndex = content.indexOf(exitsSearch, phandalinIndex);

if (exitsIndex === -1) {
    console.error('Exits not found after Phandalin');
    process.exit(1);
}

// Check if we already migrated (to avoid double insertion)
const regionIdSearch = '"regionId": "phandalin"';
const regionIdIndex = content.indexOf(regionIdSearch, phandalinIndex);

if (regionIdIndex !== -1 && regionIdIndex < exitsIndex) {
    console.log('Already migrated');
    process.exit(0);
}

// Insert the content
// We need to match the indentation of "exits"
// "exits" is usually indented with 6 spaces.
// My newFields string already has 6 spaces indentation.

const beforeExits = content.substring(0, exitsIndex);
const afterExits = content.substring(exitsIndex);

// Remove the leading newline from newFields if present (it is)
const cleanNewFields = newFields.replace(/^\n/, '');

const newContent = beforeExits + cleanNewFields + '\n' + afterExits;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Migration successful');
