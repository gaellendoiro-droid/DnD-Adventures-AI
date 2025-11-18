
import { z } from 'zod';

/**
 * A "lightweight" version of the character, containing only the essential information
 * for narrative purposes (e.g., for an AI to know who is in the party without needing full stats).
 */
export const CharacterSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    race: z.string(),
    characterClass: z.string(),
    sex: z.string(),
    personality: z.string(),
    controlledBy: z.enum(["Player", "AI"]),
});

/**
 * The single source of truth for the FULL Character data structure.
 * Used for validation in AI tools and flows that need all details.
 */
export const CharacterSchema = z.object({
    id: z.string(),
    name: z.string(),
    race: z.string(),
    characterClass: z.string(),
    level: z.number(),
    sex: z.string(),
    background: z.string(),
    color: z.string(),
    personality: z.string(),
    abilityScores: z.object({
        fuerza: z.number(),
        destreza: z.number(),
        constitución: z.number(),
        inteligencia: z.number(),
        sabiduría: z.number(),
        carisma: z.number(),
    }),
    abilityModifiers: z.object({
        fuerza: z.number(),
        destreza: z.number(),
        constitución: z.number(),
        inteligencia: z.number(),
        sabiduría: z.number(),
        carisma: z.number(),
    }).optional(),
    proficiencyBonus: z.number().optional().default(2), // Bono de competencia (default +2 para nivel 1)
    skills: z.array(z.object({ name: z.string(), proficient: z.boolean() })),
    hp: z.object({ current: z.number(), max: z.number() }),
    ac: z.number(),
    controlledBy: z.enum(["Player", "AI"]),
    inventory: z.array(z.object({ id: z.string(), name: z.string(), quantity: z.number(), description: z.string().optional().nullable() })),
    spells: z.array(z.object({ id: z.string(), name: z.string(), level: z.number(), description: z.string().nullable() })),
    isDead: z.boolean().optional().default(false), // Sistema de muerte masiva D&D 5e
    
    // Campos adicionales para ficha completa de D&D 5e
    alignment: z.string().optional(), // Alineamiento (ej: "Legal Bueno", "Caótico Neutral")
    speed: z.number().optional(), // Velocidad en pies por turno
    initiative: z.number().optional(), // Bonificador de iniciativa (normalmente = modificador de Destreza)
    savingThrows: z.object({
        fuerza: z.number(),
        destreza: z.number(),
        constitución: z.number(),
        inteligencia: z.number(),
        sabiduría: z.number(),
        carisma: z.number(),
    }).optional(), // Bonificadores de salvación por característica
    attacks: z.array(z.object({
        id: z.string(),
        name: z.string(),
        attackBonus: z.number(), // Bonificador de ataque
        damage: z.string(), // Notación de daño (ej: "1d10+2")
        damageType: z.string(), // Tipo de daño (ej: "Cortante", "Contundente")
        range: z.string().optional(), // Alcance (ej: "5 pies", "30/120 pies")
        properties: z.array(z.string()).optional(), // Propiedades (ej: ["Versátil", "Dos manos"])
    })).optional(),
    racialTraits: z.array(z.object({
        name: z.string(),
        description: z.string(),
    })).optional(), // Rasgos raciales
    classFeatures: z.array(z.object({
        name: z.string(),
        description: z.string(),
    })).optional(), // Características de clase
    spellSlots: z.object({
        level0: z.number().optional(), // Trucos (ilimitados)
        level1: z.number().optional(),
        level2: z.number().optional(),
        level3: z.number().optional(),
        level4: z.number().optional(),
        level5: z.number().optional(),
        level6: z.number().optional(),
        level7: z.number().optional(),
        level8: z.number().optional(),
        level9: z.number().optional(),
    }).optional(), // Ranuras de conjuro disponibles
    spellSaveDC: z.number().optional(), // CD de salvación de conjuros
    spellAttackBonus: z.number().optional(), // Bonificador de ataque con conjuros
    appearance: z.string().optional(), // Descripción física
    ideals: z.string().optional(), // Ideales del personaje
    bonds: z.string().optional(), // Vínculos del personaje
    flaws: z.string().optional(), // Defectos del personaje
    experience: z.number().optional(), // Puntos de experiencia actuales
    deathSaves: z.object({
        successes: z.number().default(0),
        failures: z.number().default(0),
    }).optional(), // Tiradas de salvación contra la muerte
});

/**
 * Defines the schema for a party, which is an array of characters.
 * This is used for validation in flows and tools that operate on the entire party.
 */
export const PartySchema = z.array(CharacterSchema);
