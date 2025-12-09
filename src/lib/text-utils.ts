
/**
 * Unified Spanish to English mapping for D&D API lookups.
 */
export const SPANISH_TO_ENGLISH_MAP: Record<string, string> = {
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
 * Normalizes a query from Spanish to English for D&D API lookup.
 */
export function normalizeQuery(query: string): string {
    if (!query) return '';

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
