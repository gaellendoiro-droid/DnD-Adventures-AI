import 'server-only';
/**
 * @fileOverview Unified D&D 5e API Client
 * 
 * Centralized client for all D&D 5e API calls with:
 * - Unified retry logic with exponential backoff
 * - Global shared cache (avoids duplicate calls)
 * - Centralized name normalization (Spanish → English)
 * - Unified error handling (5xx retryable, 404 not retryable)
 * 
 * This client replaces duplicate logic in:
 * - monster-stats-parser.ts
 * - dnd-api-lookup.ts
 */

import { log } from '@/lib/logger';
import { retryWithExponentialBackoff } from '@/ai/flows/retry-utils';
import { persistentFetch } from '@/lib/http/persistent-client';

const BASE_URL = 'https://www.dnd5eapi.co/api';

/**
 * Cache para rastrear si ya se hizo pre-warm a esta API.
 * Aunque usamos conexiones persistentes, algunos entornos siguen fallando en la
 * primera conexión; un warmup ligero reduce los timeouts iniciales.
 */
const prewarmedApis = new Set<string>();

async function ensureDndApiPrewarmed(): Promise<void> {
    if (prewarmedApis.has(BASE_URL)) return;

    try {
        // HEAD a la raíz de la API; si falla, no bloqueamos el flujo.
        await persistentFetch(BASE_URL, {
            method: 'HEAD',
            // Timeout de 5s para evitar bloquear.
            signal: AbortSignal.timeout(5000),
        });
    } catch {
        // Ignorar errores de pre-warm; el retry se encargará si falla luego.
    } finally {
    prewarmedApis.add(BASE_URL);
    }
}

/**
 * Unified Spanish to English mapping for D&D API lookups.
 * Combines mappings from monster-stats-parser.ts and dnd-api-lookup.ts
 */
const SPANISH_TO_ENGLISH_MAP: Record<string, string> = {
    // Monsters
    'mantícora': 'manticore',
    'manticora': 'manticore',
    'orco': 'orc',
    'goblin': 'goblin',
    'dragón': 'dragon',
    'dragon': 'dragon',
    'troll': 'troll',
    'ogro': 'ogre',
    'zombi': 'zombie',
    'zombie': 'zombie',
    'esqueleto': 'skeleton',
    'vampiro': 'vampire',
    'araña gigante': 'giant spider',
    'araña gigante': 'giant spider',
    'jabalí': 'boar',
    'jabali': 'boar',
    'arpía': 'harpy',
    'arpia': 'harpy',
    'lobo': 'wolf',
    'oso': 'bear',
    'oso pardo': 'brown bear',
    'oso negro': 'black bear',
    'ghoul': 'ghoul',
    'licántropo': 'lycanthrope',
    'licantropo': 'lycanthrope',
    'hombre lobo': 'werewolf',
    'hombre rata': 'wererat',
    'gigante': 'giant',
    'gigante de las colinas': 'hill giant',
    'gigante de las piedras': 'stone giant',
    'gigante de las nubes': 'cloud giant',
    'gigante de las escarchas': 'frost giant',
    'gigante de fuego': 'fire giant',
    'elemental': 'elemental',
    'elemental de fuego': 'fire elemental',
    'elemental de agua': 'water elemental',
    'elemental de tierra': 'earth elemental',
    'elemental de aire': 'air elemental',
    'demonio': 'demon',
    'diablo': 'devil',
    'imp': 'imp',
    'quasit': 'quasit',
    'sombra': 'shadow',
    'fantasma': 'ghost',
    'espectro': 'wraith',
    'banshee': 'banshee',
    'mimico': 'mimic',
    'mimeto': 'mimic',
    'gelatina': 'gelatinous cube',
    'cubo gelatinoso': 'gelatinous cube',
    'ankheg': 'ankheg',
    'bulette': 'bulette',
    'displacer beast': 'displacer beast',
    'bestia desplazadora': 'displacer beast',
    'rust monster': 'rust monster',
    'monstruo del óxido': 'rust monster',
    'monstruo del oxido': 'rust monster',
    'cangrejo gigante': 'giant crab',
    'tiburón': 'shark',
    'tiburon': 'shark',
    'tiburón cazador': 'hunter shark',
    'tiburon cazador': 'hunter shark',
    'fuego fatuo': 'will-o-wisp',
    'will-o-wisp': 'will-o-wisp',
    'acechador invisible': 'invisible stalker',
    
    // Spells
    'bola de fuego': 'fireball',
    'rayo': 'lightning bolt',
    'rayo de escarcha': 'ray of frost',
    'misil mágico': 'magic missile',
    'missil mágico': 'magic missile',
    'curación': 'cure wounds',
    'curar heridas': 'cure wounds',
    'sanar': 'heal',
    'sanación': 'heal',
    'bendición': 'bless',
    'protección contra el mal': 'protection from evil',
    'armadura de mago': "mage's armor",
    'escudo': 'shield',
    'detectar magia': 'detect magic',
    'luz': 'light',
    'llama sagrada': 'sacred flame',
    
    // Equipment
    'espada larga': 'longsword',
    'espada corta': 'shortsword',
    'daga': 'dagger',
    'cimitarra': 'scimitar',
    'hacha': 'axe',
    'hacha de batalla': 'battleaxe',
    'maza': 'mace',
    'martillo': 'hammer',
    'arco': 'bow',
    'arco largo': 'longbow',
    'arco corto': 'shortbow',
    'armadura de cuero': 'leather armor',
    'armadura de cuero endurecido': 'studded leather armor',
    'cota de mallas': 'chain mail',
    'armadura de placas': 'plate armor',
};

/**
 * Global cache for API responses.
 * Key format: `${resourceType}:${normalizedName}`
 * Value: The API response data or null (for 404s)
 */
const responseCache: Map<string, any> = new Map();

/**
 * Cache for pending requests to avoid duplicate simultaneous calls.
 * Key format: `${resourceType}:${normalizedName}`
 * Value: Promise resolving to the API response
 */
const pendingRequests: Map<string, Promise<any | null>> = new Map();

/**
 * Normalizes a query from Spanish to English for D&D API lookup.
 * 
 * - Removes accents and converts to lowercase
 * - Maps common Spanish names to English using SPANISH_TO_ENGLISH_MAP
 * - Tries partial matching for multi-word queries
 * - Returns normalized query if no mapping found
 * 
 * @param query The query string (can be in Spanish or English)
 * @returns Normalized English query for API lookup
 */
export function normalizeQuery(query: string): string {
    // Remove accents and convert to lowercase
    let normalized = query
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .trim();
    
    // Check if we have a direct mapping
    if (SPANISH_TO_ENGLISH_MAP[normalized]) {
        return SPANISH_TO_ENGLISH_MAP[normalized];
    }
    
    // Try to find a partial match (for multi-word queries)
    for (const [spanish, english] of Object.entries(SPANISH_TO_ENGLISH_MAP)) {
        if (normalized.includes(spanish) || spanish.includes(normalized)) {
            return english;
        }
    }
    
    // If no mapping found, return the normalized query (without accents)
    return normalized;
}

/**
 * Formats a query for use in API URLs.
 * Converts to lowercase and replaces spaces with hyphens.
 * 
 * @param query The normalized query
 * @returns Formatted query for URL
 */
function formatQueryForUrl(query: string): string {
    return query.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Generates a cache key for a resource.
 * 
 * @param resourceType The type of resource (e.g., 'monsters', 'spells', 'equipment')
 * @param normalizedName The normalized name of the resource
 * @returns Cache key string
 */
function getCacheKey(resourceType: string, normalizedName: string): string {
    return `${resourceType}:${normalizedName}`;
}

/**
 * Fetches a resource directly from the D&D API by name.
 * 
 * - Uses global cache to avoid duplicate calls
 * - Uses pending requests cache to avoid duplicate simultaneous calls
 * - Implements retries with exponential backoff for network errors and 5xx errors
 * - Does not retry 404 errors (resource not found)
 * - Caches both successes and 404s to avoid repeated failed lookups
 * 
 * @param resourceType The type of resource (e.g., 'monsters', 'spells', 'equipment')
 * @param name The name of the resource (will be normalized)
 * @returns The API response data, or null if not found
 */
export async function fetchResource(
    resourceType: string,
    name: string
): Promise<any | null> {
    const normalizedName = normalizeQuery(name);
    const cacheKey = getCacheKey(resourceType, normalizedName);
    
    // Check cache first
    if (responseCache.has(cacheKey)) {
        const cached = responseCache.get(cacheKey);
        log.debug('D&D API resource retrieved from cache', {
            module: 'DndApiClient',
            resourceType,
            originalName: name,
            normalizedName,
        });
        return cached;
    }
    
    // Pre-warm antes de la primera llamada real
    await ensureDndApiPrewarmed();
    
    // Check if there's already a pending request for this resource
    if (pendingRequests.has(cacheKey)) {
        log.debug('Waiting for pending request for D&D API resource', {
            module: 'DndApiClient',
            resourceType,
            originalName: name,
            normalizedName,
        });
        return await pendingRequests.get(cacheKey)!;
    }
    
    // Create a new request and cache the promise
    const requestPromise = (async () => {
        const formattedName = formatQueryForUrl(normalizedName);
        const url = `${BASE_URL}/${resourceType}/${formattedName}`;
        
        try {
            log.debug('Fetching D&D API resource', {
                module: 'DndApiClient',
                resourceType,
                originalName: name,
                normalizedName,
                formattedName,
                url,
            });
            
            // Wrap fetch in retry logic for network errors and server errors (5xx)
            const response = await retryWithExponentialBackoff(
                async () => {
                    const res = await persistentFetch(url, {
                        headers: { 'Accept': 'application/json' },
                    });
                    
                    // If it's a 5xx server error, throw to trigger retry
                    if (res.status >= 500 && res.status < 600) {
                        const error: any = new Error(`Server error: ${res.status} ${res.statusText}`);
                        error.status = res.status;
                        error.statusCode = res.status;
                        throw error;
                    }
                    
                    // For 404 (Not Found) and other 4xx errors, don't retry - return as-is
                    return res;
                },
                3, // maxRetries: 3 attempts (4 total)
                1000, // initialDelayMs: 1 second
                'DndApiClient'
            );
            
            // Handle 404 (resource not found) - don't retry, cache null
            if (response.status === 404) {
                log.warn('D&D API resource not found', {
                    module: 'DndApiClient',
                    resourceType,
                    originalName: name,
                    normalizedName,
                    statusCode: response.status,
                });
                
                // Cache the failure to avoid repeated requests
                responseCache.set(cacheKey, null);
                pendingRequests.delete(cacheKey);
                return null;
            }
            
            // Handle other non-ok responses (shouldn't happen after retries, but just in case)
            if (!response.ok) {
                log.warn('Unexpected error response from D&D API', {
                    module: 'DndApiClient',
                    resourceType,
                    originalName: name,
                    normalizedName,
                    statusCode: response.status,
                });
                
                // Cache null for unexpected errors
                responseCache.set(cacheKey, null);
                pendingRequests.delete(cacheKey);
                return null;
            }
            
            const data = await response.json();
            
            // Cache the successful response
            responseCache.set(cacheKey, data);
            
            log.debug('D&D API resource fetched successfully', {
                module: 'DndApiClient',
                resourceType,
                originalName: name,
                normalizedName,
            });
            
            // Clean up pending requests
            pendingRequests.delete(cacheKey);
            
            return data;
        } catch (error) {
            log.error('Error fetching D&D API resource after retries', {
                module: 'DndApiClient',
                resourceType,
                originalName: name,
                normalizedName,
                error: error instanceof Error ? error.message : String(error),
            });
            
            // Cache null only after all retries have failed
            // This prevents caching transient errors
            responseCache.set(cacheKey, null);
            
            // Clean up pending requests
            pendingRequests.delete(cacheKey);
            
            return null;
        }
    })();
    
    // Store the promise in pending requests
    pendingRequests.set(cacheKey, requestPromise);
    
    return await requestPromise;
}

/**
 * Searches for a resource in the D&D API.
 * 
 * First tries a direct fetch by name. If that fails, tries a search endpoint.
 * 
 * - Uses global cache to avoid duplicate calls
 * - Uses pending requests cache to avoid duplicate simultaneous calls
 * - Implements retries with exponential backoff
 * - Caches both successes and failures
 * 
 * @param resourceType The type of resource (e.g., 'monsters', 'spells', 'equipment')
 * @param query The search query (will be normalized)
 * @returns The API response data, or null if not found
 */
export async function searchResource(
    resourceType: string,
    query: string
): Promise<any | null> {
    const normalizedQuery = normalizeQuery(query);
    const cacheKey = getCacheKey(resourceType, normalizedQuery);
    
    // Check cache first
    if (responseCache.has(cacheKey)) {
        const cached = responseCache.get(cacheKey);
        log.debug('D&D API search result retrieved from cache', {
            module: 'DndApiClient',
            resourceType,
            originalQuery: query,
            normalizedQuery,
        });
        return cached;
    }
    
    // Pre-warm antes de la primera llamada real
    await ensureDndApiPrewarmed();
    
    // Check if there's already a pending request for this search
    if (pendingRequests.has(cacheKey)) {
        log.debug('Waiting for pending request for D&D API search', {
            module: 'DndApiClient',
            resourceType,
            originalQuery: query,
            normalizedQuery,
        });
        return await pendingRequests.get(cacheKey)!;
    }
    
    // Create a new request and cache the promise
    const requestPromise = (async () => {
        const formattedQuery = formatQueryForUrl(normalizedQuery);
        
        try {
            log.debug('Searching D&D API', {
                module: 'DndApiClient',
                resourceType,
                originalQuery: query,
                normalizedQuery,
                formattedQuery,
            });
            
            // First, try direct fetch
            const directUrl = `${BASE_URL}/${resourceType}/${formattedQuery}`;
            const directResponse = await retryWithExponentialBackoff(
                async () => {
                    const res = await persistentFetch(directUrl, {
                        headers: { 'Accept': 'application/json' },
                    });
                    
                    // If it's a 5xx server error, throw to trigger retry
                    if (res.status >= 500 && res.status < 600) {
                        const error: any = new Error(`Server error: ${res.status} ${res.statusText}`);
                        error.status = res.status;
                        error.statusCode = res.status;
                        throw error;
                    }
                    
                    return res;
                },
                3,
                1000,
                'DndApiClient'
            );
            
            if (directResponse.ok) {
                const data = await directResponse.json();
                responseCache.set(cacheKey, data);
                pendingRequests.delete(cacheKey);
                
                log.debug('D&D API search successful (direct)', {
                    module: 'DndApiClient',
                    resourceType,
                    originalQuery: query,
                    normalizedQuery,
                });
                
                return data;
            }
            
            // If direct lookup fails, try search endpoint
            const searchUrl = `${BASE_URL}/${resourceType}/?name=${encodeURIComponent(normalizedQuery)}`;
            const searchResponse = await retryWithExponentialBackoff(
                async () => {
                    const res = await persistentFetch(searchUrl, {
                        headers: { 'Accept': 'application/json' },
                    });
                    
                    // If it's a 5xx server error, throw to trigger retry
                    if (res.status >= 500 && res.status < 600) {
                        const error: any = new Error(`Server error: ${res.status} ${res.statusText}`);
                        error.status = res.status;
                        error.statusCode = res.status;
                        throw error;
                    }
                    
                    return res;
                },
                3,
                1000,
                'DndApiClient'
            );
            
            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                
                // If we have results, fetch the first one
                if (searchData.count > 0 && searchData.results?.[0]?.url) {
                    const detailUrl = `https://www.dnd5eapi.co${searchData.results[0].url}`;
                    const detailResponse = await retryWithExponentialBackoff(
                        async () => {
                            const res = await fetch(detailUrl, {
                                headers: { 'Accept': 'application/json' },
                            });
                            
                            // If it's a 5xx server error, throw to trigger retry
                            if (res.status >= 500 && res.status < 600) {
                                const error: any = new Error(`Server error: ${res.status} ${res.statusText}`);
                                error.status = res.status;
                                error.statusCode = res.status;
                                throw error;
                            }
                            
                            return res;
                        },
                        3,
                        1000,
                        'DndApiClient'
                    );
                    
                    if (detailResponse.ok) {
                        const detailData = await detailResponse.json();
                        responseCache.set(cacheKey, detailData);
                        pendingRequests.delete(cacheKey);
                        
                        log.debug('D&D API search successful (search endpoint)', {
                            module: 'DndApiClient',
                            resourceType,
                            originalQuery: query,
                            normalizedQuery,
                        });
                        
                        return detailData;
                    }
                }
            }
            
            // If both methods fail, cache null and return null
            log.warn('D&D API search: No resource found', {
                module: 'DndApiClient',
                resourceType,
                originalQuery: query,
                normalizedQuery,
            });
            
            responseCache.set(cacheKey, null);
            pendingRequests.delete(cacheKey);
            return null;
        } catch (error) {
            log.error('Error searching D&D API after retries', {
                module: 'DndApiClient',
                resourceType,
                originalQuery: query,
                normalizedQuery,
                error: error instanceof Error ? error.message : String(error),
            });
            
            // Cache null only after all retries have failed
            responseCache.set(cacheKey, null);
            pendingRequests.delete(cacheKey);
            
            return null;
        }
    })();
    
    // Store the promise in pending requests
    pendingRequests.set(cacheKey, requestPromise);
    
    return await requestPromise;
}

/**
 * Clears the global cache.
 * Useful for testing or when cache needs to be reset.
 */
export function clearCache(): void {
    responseCache.clear();
    pendingRequests.clear();
    log.debug('D&D API cache cleared', {
        module: 'DndApiClient',
    });
}

/**
 * Gets the current cache size.
 * Useful for monitoring and debugging.
 */
export function getCacheSize(): number {
    return responseCache.size;
}

