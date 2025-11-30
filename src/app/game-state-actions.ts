
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
/**
 * Sets the adventure data cache to a specific adventure.
 * Used when loading adventures from JSON files.
 */
export async function setAdventureDataCache(adventureData: any): Promise<void> {
  adventureDataCache = adventureData;

  // Calculate hash of the data to store it
  const hash = adventureCache.generateHash(JSON.stringify(adventureData));

  // Persist to disk cache so it survives server restarts
  adventureCache.saveActiveAdventure(adventureData, hash);

  log.info('Adventure data cache updated and persisted', {
    module: 'GameState',
    adventureId: adventureDataCache?.adventureId || 'unknown',
    locationsCount: adventureDataCache?.locations?.length || 0,
    entitiesCount: adventureDataCache?.entities?.length || 0,
  });
}

/**
 * Loads the adventure data from the JSON file.
 * Uses a cache to avoid repeated file reads, but validates against file changes.
 */
export async function getAdventureData(): Promise<any> {
  // 1. Try Memory Cache
  if (adventureDataCache) {
    // We don't validate memory cache against disk on every call for performance
    // Assuming memory cache is short-lived per request or updated via setAdventureDataCache
    return adventureDataCache;
  }

  // 2. Prepare Default File Info (for validation)
  const jsonDirectory = path.join(process.cwd(), 'JSON_adventures');
  const defaultFilePath = path.join(jsonDirectory, 'el-dragon-del-pico-agujahelada.json');
  let defaultFileContent: string | null = null;
  let defaultFileHash: string | null = null;

  try {
    defaultFileContent = await fs.readFile(defaultFilePath, 'utf8');
    defaultFileHash = adventureCache.generateHash(defaultFileContent);
  } catch (e) {
    log.warn('Could not read default adventure file for validation', { error: e });
  }

  // 3. Try Persistent Cache (Active Adventure)
  const cachedEntry = adventureCache.loadActiveAdventure();

  if (cachedEntry) {
    const { data, sourceHash } = cachedEntry;

    // Check if we should invalidate based on default file change
    // Only if the cached adventure IS the default adventure (by ID)
    // and we have a valid default file hash to compare against.
    let isOutdated = false;

    if (defaultFileHash && data.adventureId === 'el-dragon-del-pico-agujahelada') {
      if (sourceHash !== defaultFileHash) {
        log.info('Default adventure file has changed. Invalidating cache.', {
          module: 'GameState',
          cachedHash: sourceHash,
          fileHash: defaultFileHash
        });
        isOutdated = true;
      }
    }

    if (!isOutdated) {
      adventureDataCache = data;
      log.info('Returning cached adventure data (Disk)', {
        module: 'GameState',
        adventureId: adventureDataCache?.adventureId || 'unknown',
        locationsCount: adventureDataCache?.locations?.length || 0,
      });
      return adventureDataCache;
    }
  }

  // 4. Fallback to Default File (Development/Demo) or Reload if Outdated
  if (defaultFileContent) {
    try {
      log.info('Loading default adventure data from file', {
        module: 'GameState',
        filePath: defaultFilePath,
        reason: cachedEntry ? 'Cache Outdated' : 'No Cache Found'
      });

      adventureDataCache = JSON.parse(defaultFileContent);

      // Also persist this default as active to speed up next load
      // Use the hash we calculated earlier
      adventureCache.saveActiveAdventure(adventureDataCache, defaultFileHash || undefined);

      log.info('Default adventure data loaded successfully', {
        module: 'GameState',
        adventureId: adventureDataCache?.adventureId || 'unknown',
        locationsCount: adventureDataCache?.locations?.length || 0,
        entitiesCount: adventureDataCache?.entities?.length || 0,
      });
      return adventureDataCache;
    } catch (error: any) {
      log.error('Failed to parse default adventure file', { module: 'GameState' }, error);
    }
  }

  return null;
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
