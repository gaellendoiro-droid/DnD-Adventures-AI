
'use server';

import path from 'path';
import { promises as fs } from 'fs';

// Cache for the adventure data to avoid reading the file on every request
let adventureDataCache: any = null;

/**
 * Loads the adventure data from the JSON file.
 * Uses a cache to avoid repeated file reads.
 */
export async function getAdventureData(): Promise<any> {
  if (adventureDataCache) {
    return adventureDataCache;
  }
  try {
    const jsonDirectory = path.join(process.cwd(), 'JSON_adventures');
    const fileContents = await fs.readFile(jsonDirectory + '/el-dragon-del-pico-agujahelada.json', 'utf8');
    adventureDataCache = JSON.parse(fileContents);
    return adventureDataCache;
  } catch (error) {
    console.error('Failed to load or parse adventure data:', error);
    // In case of error, clear cache and return null
    adventureDataCache = null;
    return null;
  }
}


/**
 * Looks up an entity from the adventure data string.
 * This is a server-side utility function that can be used by other server actions or tools.
 */
export async function lookupAdventureEntityInDb(entityName: string): Promise<any | null> {
    const adventureData = await getAdventureData();

    if (!adventureData) {
      console.error("Adventure data not available for lookup.");
      return null;
    }

    const allData = [...(adventureData.locations || []), ...(adventureData.entities || [])];
    const result = allData.find((item: any) => 
        item.id === entityName || (item.name && typeof item.name === 'string' && item.name.toLowerCase() === entityName.toLowerCase())
    );

    return result || null;
}
