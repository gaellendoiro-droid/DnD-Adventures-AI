/**
 * @fileOverview A Genkit tool to look up D&D 5e information from an external API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { log } from '@/lib/logger';

// Mapping of common Spanish monster/spell names to English for D&D API lookup
const spanishToEnglishMap: Record<string, string> = {
    // Monsters
    'mantícora': 'manticore',
    'manticora': 'manticore',
    'orco': 'orc',
    'araña gigante': 'giant spider',
    'araña gigante': 'giant spider',
    'jabalí': 'boar',
    'jabali': 'boar',
    'arpía': 'harpy',
    'arpia': 'harpy',
    'ogro': 'ogre',
    'goblin': 'goblin', // Same in both
    'dragón': 'dragon',
    'dragon': 'dragon',
    'troll': 'troll', // Same in both
    'lobo': 'wolf',
    'oso': 'bear',
    'oso pardo': 'brown bear',
    'oso negro': 'black bear',
    'zombi': 'zombie',
    'zombie': 'zombie',
    'esqueleto': 'skeleton',
    'ghoul': 'ghoul', // Same in both
    'vampiro': 'vampire',
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
    'imp': 'imp', // Same in both
    'quasit': 'quasit', // Same in both
    'sombra': 'shadow',
    'fantasma': 'ghost',
    'espectro': 'wraith',
    'banshee': 'banshee', // Same in both
    'mimico': 'mimic',
    'mimeto': 'mimic',
    'gelatina': 'gelatinous cube',
    'cubo gelatinoso': 'gelatinous cube',
    'ankheg': 'ankheg', // Same in both
    'bulette': 'bulette', // Same in both
    'displacer beast': 'displacer beast', // Same in both
    'bestia desplazadora': 'displacer beast',
    'rust monster': 'rust monster', // Same in both
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
    
    // Spells (common ones)
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
    'escudo': 'shield',
};

/**
 * Normalizes a Spanish query to English for D&D API lookup.
 * Removes accents, converts to lowercase, and maps common Spanish names to English.
 */
function normalizeQuery(query: string): string {
    // Remove accents and convert to lowercase
    let normalized = query
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .trim();
    
    // Check if we have a direct mapping
    if (spanishToEnglishMap[normalized]) {
        return spanishToEnglishMap[normalized];
    }
    
    // Try to find a partial match (for multi-word queries)
    for (const [spanish, english] of Object.entries(spanishToEnglishMap)) {
        if (normalized.includes(spanish) || spanish.includes(normalized)) {
            return english;
        }
    }
    
    // If no mapping found, return the normalized query (without accents)
    return normalized;
}

// Helper function to format the JSON data for better readability for the AI
function formatRelevantInfo(data: any): string {
    if (!data) return "No information found.";

    const relevantInfo: any = {};
    const fields = ['name', 'desc', 'higher_level', 'size', 'type', 'alignment', 'armor_class', 'hit_points', 'speed', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'proficiencies', 'damage_vulnerabilities', 'damage_resistances', 'damage_immunities', 'condition_immunities', 'senses', 'languages', 'challenge_rating', 'special_abilities', 'actions', 'legendary_actions', 'equipment_category', 'cost', 'weight'];

    for(const field of fields) {
        if(data[field] !== undefined && data[field] !== null) {
            relevantInfo[field] = data[field];
        }
    }

    return JSON.stringify(relevantInfo, null, 2);
}

async function searchApi(resourceType: string, query: string): Promise<string | null> {
    const baseUrl = 'https://www.dnd5eapi.co/api';
    // Normalize the query (Spanish to English, remove accents)
    const normalizedQuery = normalizeQuery(query);
    const formattedQuery = normalizedQuery.toLowerCase().replace(/\s+/g, '-');

    try {
        log.debug('Searching D&D API', { 
            module: 'AITool',
            tool: 'dndApiLookupTool',
            resourceType,
            query,
        });
        
        const response = await fetch(`${baseUrl}/${resourceType}/${formattedQuery}`);
        
        if (response.ok) {
            const data = await response.json();
            log.debug('D&D API lookup successful (direct)', { 
                module: 'AITool',
                tool: 'dndApiLookupTool',
                resourceType,
                query,
            });
            return formatRelevantInfo(data);
        }

        // If direct lookup fails, try searching
        const searchResponse = await fetch(`${baseUrl}/${resourceType}/?name=${query}`);
        if(searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.count > 0 && searchData.results[0].url) {
                const detailResponse = await fetch(`https://www.dnd5eapi.co${searchData.results[0].url}`);
                if (detailResponse.ok) {
                    const detailData = await detailResponse.json();
                    log.debug('D&D API lookup successful (search)', { 
                        module: 'AITool',
                        tool: 'dndApiLookupTool',
                        resourceType,
                        query,
                    });
                    return formatRelevantInfo(detailData);
                }
            }
        }
        return null;
    } catch (error: any) {
        log.warn('D&D API lookup error', { 
            module: 'AITool',
            tool: 'dndApiLookupTool',
            resourceType,
            query,
        });
        return null;
    }
}

export const dndApiLookupTool = ai.defineTool(
  {
    name: 'dndApiLookupTool',
    description: 'Looks up information about D&D 5e monsters, spells, or equipment from the dnd5eapi.co API. Use simple, one or two-word queries for best results (e.g., "goblin", "fireball", "longsword").',
    inputSchema: z.object({
        query: z.string().describe('The search term, e.g., "goblin", "magic missile", "plate armor".'),
    }),
    outputSchema: z.string().describe('A JSON string containing the requested information, or an error message if not found.'),
  },
  async (input) => {
    log.aiTool('dndApiLookupTool', 'Looking up D&D 5e information', { query: input.query });
    
    // Normalize the query for better API matching
    const normalizedQuery = normalizeQuery(input.query);
    const originalQuery = input.query;
    
    const resourceTypes = ['monsters', 'spells', 'equipment'];
    
    for (const resourceType of resourceTypes) {
        const result = await searchApi(resourceType, normalizedQuery);
        if (result) {
            log.aiTool('dndApiLookupTool', 'Information found', { 
                originalQuery,
                normalizedQuery,
                resourceType,
            });
            return result;
        }
    }

    log.warn('D&D API lookup: No information found', { 
        module: 'AITool',
        tool: 'dndApiLookupTool',
        originalQuery,
        normalizedQuery,
    });
    return `No information found for "${originalQuery}".`;
  }
);
