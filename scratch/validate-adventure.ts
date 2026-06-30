import fs from 'fs';
import path from 'path';
import { AdventureDataSchema } from '../src/lib/schemas';

async function validate() {
  const jsonPath = path.resolve('public/adventures/la-caza-de-la-oveja-salvaje/la-caza-de-la-oveja-salvaje.json');
  console.log(`Checking: ${jsonPath}`);
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content);
  
  try {
    AdventureDataSchema.parse(data);
    console.log('✅ Zod validation successful! The JSON file conforms to the schema perfectly.');
  } catch (err: any) {
    console.error('❌ Zod validation failed:');
    console.error(JSON.stringify(err.format ? err.format() : err, null, 2));
    process.exit(1);
  }
}

validate();
