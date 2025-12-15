
import { z } from 'zod';

// Esquemas Zod para la validación de datos JSON que guardaremos en la DB

// Esquema base para cualquier entidad
export const BaseEntitySchema = z.object({
    id: z.string(),
    name: z.string(),
    source: z.string().default("local"), // 'srd', 'manual_jugador', 'homebrew'
});

// --- MONSTERS ---
export const MonsterDataSchema = BaseEntitySchema.extend({
    type: z.string(), // bestia, dragón, etc.
    size: z.string().optional(),
    alignment: z.string().optional(),
    cr: z.number(),
    ac: z.number(),
    hp: z.number(),
    speed: z.string().optional(),
    stats: z.object({
        str: z.number(),
        dex: z.number(),
        con: z.number(),
        int: z.number(),
        wis: z.number(),
        cha: z.number(),
    }),
    modifiers: z.object({
        str: z.number(),
        dex: z.number(),
        con: z.number(),
        int: z.number(),
        wis: z.number(),
        cha: z.number(),
    }).optional(),
    skills: z.string().optional(),
    senses: z.string().optional(),
    languages: z.string().optional(),
    damageVulnerabilities: z.string().optional(),
    damageResistances: z.string().optional(),
    damageImmunities: z.string().optional(),
    conditionImmunities: z.string().optional(),
    actions: z.array(z.any()).optional(), // Detalle flexible por ahora
    features: z.array(z.any()).optional(),
    reactions: z.array(z.any()).optional(),
    legendaryActions: z.array(z.any()).optional(),
});

export type MonsterData = z.infer<typeof MonsterDataSchema>;

// --- SPELLS ---
export const SpellDataSchema = BaseEntitySchema.extend({
    level: z.number(),
    school: z.string(),
    castingTime: z.string(),
    range: z.string(),
    components: z.string(),
    duration: z.string(),
    description: z.string(),
});

export type SpellData = z.infer<typeof SpellDataSchema>;

// --- ITEMS ---
export const ItemDataSchema = BaseEntitySchema.extend({
    type: z.string(), // arma, armadura, etc.
    rarity: z.string(),
    description: z.string(),
    weight: z.string().optional(),
    price: z.string().optional(),
    mechanics: z.any().optional(), // Daño, AC, propiedades
});

export type ItemData = z.infer<typeof ItemDataSchema>;

// Tablas SQL (Tipos para TypeScript de las filas DB)
export interface MonsterRow {
    id: string;
    name: string;
    type: string;
    cr: number;
    data: string; // JSON stringified
}

export interface SpellRow {
    id: string;
    name: string;
    level: number;
    school: string;
    data: string; // JSON stringified
}

export interface ItemRow {
    id: string;
    name: string;
    type: string;
    rarity: string;
    data: string; // JSON stringified
}
