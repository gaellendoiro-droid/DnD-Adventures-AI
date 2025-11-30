const fs = require('fs');

try {
    const content = fs.readFileSync('JSON_adventures/el-dragon-del-pico-agujahelada.json', 'utf8');
    JSON.parse(content);
    console.log('JSON is valid.');
} catch (e) {
    console.error('JSON Error:', e.message);
    if (e.message.includes('position')) {
        const pos = parseInt(e.message.match(/position (\d+)/)[1]);
        const content = fs.readFileSync('JSON_adventures/el-dragon-del-pico-agujahelada.json', 'utf8');
        const lines = content.substring(0, pos).split('\n');
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;
        console.error(`Error at line ${line}, column ${col}`);
    }
}
