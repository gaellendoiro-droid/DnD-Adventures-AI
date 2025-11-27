
'use server';

import path from 'path';
import { promises as fs } from 'fs';
import { log } from '@/lib/logger';
import { adventureCache } from '@/lib/adventure-loader/adventure-cache';

// Cache for the adventure data to avoid reading the file on every request
let adventureDataCache: any = null;

/**
 * Sets the adventure data cache to a specific adventure.
 * Used when loading adventures from JSON files.
 */
export async function setAdventureDataCache(adventureData: any): Promise<void> {
  adventureDataCache = adventureData;

  // Persist to disk cache so it survives server restarts
  adventureCache.saveActiveAdventure(adventureData);

  log.info('Adventure data cache updated and persisted', {
    module: 'GameState',
    adventureId: adventureDataCache?.adventureId || 'unknown',
    locationsCount: adventureDataCache?.locations?.length || 0,
    entitiesCount: adventureDataCache?.entities?.length || 0,
  });
}

/**
 * Loads the adventure data from the JSON file.
 * Uses a cache to avoid repeated file reads.
 */
export async function getAdventureData(): Promise<any> {
  // 1. Try Memory Cache
  if (adventureDataCache) {
    log.debug('Returning cached adventure data (Memory)', {
      module: 'GameState',
      adventureId: adventureDataCache?.adventureId || 'unknown',
      locationsCount: adventureDataCache?.locations?.length || 0,
    });
    return adventureDataCache;
  }

  // 2. Try Persistent Cache (Active Adventure)
  const persistedData = adventureCache.loadActiveAdventure();
  if (persistedData) {
    adventureDataCache = persistedData;
    log.info('Returning cached adventure data (Disk)', {
      module: 'GameState',
      adventureId: adventureDataCache?.adventureId || 'unknown',
      locationsCount: adventureDataCache?.locations?.length || 0,
    });
    return adventureDataCache;
  }

  // 3. Fallback to Default File (Development/Demo)
  try {
    const jsonDirectory = path.join(process.cwd(), 'JSON_adventures');
    const filePath = jsonDirectory + '/el-dragon-del-pico-agujahelada.json';
    log.info('Loading default adventure data from file (No cache found)', {
      module: 'GameState',
      filePath,
    });
    const fileContents = await fs.readFile(filePath, 'utf8');
    adventureDataCache = JSON.parse(fileContents);

    // Also persist this default as active to speed up next load
    adventureCache.saveActiveAdventure(adventureDataCache);

    log.info('Default adventure data loaded successfully', {
      module: 'GameState',
      adventureId: adventureDataCache?.adventureId || 'unknown',
      locationsCount: adventureDataCache?.locations?.length || 0,
      entitiesCount: adventureDataCache?.entities?.length || 0,
    });
    return adventureDataCache;
  } catch (error: any) {
    log.error('Failed to load or parse adventure data', { module: 'GameState' }, error);
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
  log.debug('Looking up entity in adventure data', {
    module: 'GameState',
    entityName,
  });

  const adventureData = await getAdventureData();

  if (!adventureData) {
    log.error('Adventure data not available for lookup', { module: 'GameState' });
    return null;
  }

  const allData = [...(adventureData.locations || []), ...(adventureData.entities || [])];
  const result = allData.find((item: any) =>
    item.id === entityName || (item.name && typeof item.name === 'string' && item.name.toLowerCase() === entityName.toLowerCase())
  );

  return result || null;
}
