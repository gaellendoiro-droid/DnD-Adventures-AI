/**
 * Reglas oficiales de 5e que necesita el motor v2 para los objetos con conjuro.
 *
 * Pergamino de conjuro (DMG, "Spell Scroll"): si el conjuro está en la lista de tu clase, puedes
 * leerlo y lanzarlo; si es de un nivel que aún no puedes lanzar, haces una prueba con tu
 * característica de lanzamiento, CD 10 + nivel del conjuro. Si no está en tu lista, el pergamino
 * es ininteligible para ti.
 *
 * La tabla de conjuros es deliberadamente corta (conjuros del SRD habituales en pergaminos y
 * varitas). Un conjuro que no esté aquí no se puede resolver con reglas oficiales y el puente
 * devuelve el control al núcleo actual.
 */

export type ClassId = 'bard' | 'cleric' | 'druid' | 'paladin' | 'ranger' | 'sorcerer' | 'warlock' | 'wizard'
    | 'barbarian' | 'fighter' | 'monk' | 'rogue';

export type AbilityId = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

const CLASS_ALIASES: Record<string, ClassId> = {
    bard: 'bard', bardo: 'bard', barda: 'bard',
    cleric: 'cleric', clerigo: 'cleric', clériga: 'cleric', clérigo: 'cleric',
    druid: 'druid', druida: 'druid',
    paladin: 'paladin', paladín: 'paladin',
    ranger: 'ranger', explorador: 'ranger', exploradora: 'ranger', guardabosques: 'ranger',
    sorcerer: 'sorcerer', hechicero: 'sorcerer', hechicera: 'sorcerer',
    warlock: 'warlock', brujo: 'warlock', bruja: 'warlock',
    wizard: 'wizard', mago: 'wizard', maga: 'wizard',
    barbarian: 'barbarian', barbaro: 'barbarian', bárbaro: 'barbarian', bárbara: 'barbarian',
    fighter: 'fighter', guerrero: 'fighter', guerrera: 'fighter',
    monk: 'monk', monje: 'monk', monja: 'monk',
    rogue: 'rogue', picaro: 'rogue', pícaro: 'rogue', pícara: 'rogue',
};

function stripAccents(text: string): string {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function normalizeClass(characterClass: string | undefined): ClassId | undefined {
    if (!characterClass) return undefined;
    const raw = characterClass.trim().toLowerCase();
    return CLASS_ALIASES[raw] || CLASS_ALIASES[stripAccents(raw)];
}

const SPELLCASTING_ABILITY: Partial<Record<ClassId, AbilityId>> = {
    bard: 'charisma', sorcerer: 'charisma', warlock: 'charisma', paladin: 'charisma',
    cleric: 'wisdom', druid: 'wisdom', ranger: 'wisdom',
    wizard: 'intelligence',
};

export function spellcastingAbility(classId: ClassId | undefined): AbilityId | undefined {
    return classId ? SPELLCASTING_ABILITY[classId] : undefined;
}

/** Nivel de conjuro más alto que puede lanzar un personaje de esa clase y nivel (0 = ninguno). */
export function maxSpellLevel(classId: ClassId | undefined, level: number): number {
    if (!classId || level < 1) return 0;
    switch (classId) {
        case 'bard': case 'cleric': case 'druid': case 'sorcerer': case 'wizard':
            return Math.min(9, Math.ceil(level / 2));
        case 'warlock':
            return Math.min(5, Math.ceil(level / 2));
        case 'paladin': case 'ranger':
            return level < 2 ? 0 : Math.min(5, Math.floor((level - 1) / 4) + 1);
        default:
            return 0;
    }
}

export interface SpellInfo {
    level: number;
    classes: ClassId[];
}

/** Conjuros del SRD (nivel y listas de clase). */
export const SPELLS: Record<string, SpellInfo> = {
    light: { level: 0, classes: ['bard', 'cleric', 'sorcerer', 'wizard'] },
    mage_hand: { level: 0, classes: ['bard', 'sorcerer', 'warlock', 'wizard'] },
    bless: { level: 1, classes: ['cleric', 'paladin'] },
    comprehend_languages: { level: 1, classes: ['bard', 'sorcerer', 'warlock', 'wizard'] },
    cure_wounds: { level: 1, classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger'] },
    detect_magic: { level: 1, classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'wizard'] },
    healing_word: { level: 1, classes: ['bard', 'cleric', 'druid'] },
    identify: { level: 1, classes: ['bard', 'wizard'] },
    magic_missile: { level: 1, classes: ['sorcerer', 'wizard'] },
    shield: { level: 1, classes: ['sorcerer', 'wizard'] },
    sleep: { level: 1, classes: ['bard', 'sorcerer', 'wizard'] },
    speak_with_animals: { level: 1, classes: ['bard', 'druid', 'ranger'] },
    invisibility: { level: 2, classes: ['bard', 'sorcerer', 'warlock', 'wizard'] },
    misty_step: { level: 2, classes: ['sorcerer', 'warlock', 'wizard'] },
    fireball: { level: 3, classes: ['sorcerer', 'wizard'] },
    fly: { level: 3, classes: ['sorcerer', 'warlock', 'wizard'] },
    polymorph: { level: 4, classes: ['bard', 'druid', 'sorcerer', 'wizard'] },
    true_polymorph: { level: 9, classes: ['bard', 'warlock', 'wizard'] },
};

export function getSpellInfo(spellId: string | undefined): SpellInfo | undefined {
    return spellId ? SPELLS[spellId.trim().toLowerCase()] : undefined;
}
