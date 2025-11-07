
import { z } from 'zod';

/**
 * The single source of truth for the Character data structure.
 * Used for validation in AI tools and flows.
 */
export const CharacterSchema = z.object({
    id: z.string(),
    name: z.string(),
    race: z.string(),
    class: z.string(),
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
    skills: z.array(z.object({ name: z.string(), proficient: z.boolean() })),
    hp: z.object({ current: z.number(), max: z.number() }),
    ac: z.number(),
    controlledBy: z.enum(["Player", "AI"]),
    inventory: z.array(z.object({ id: z.string(), name: z.string(), quantity: z.number(), description: z.string().optional().nullable() })),
    spells: z.array(z.object({ id: z.string(), name: z.string(), level: z.number(), description: z.string() })),
});
