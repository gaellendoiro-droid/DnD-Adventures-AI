
import { z } from 'zod';

/**
 * A "lightweight" version of the character, containing only the essential information
 * for narrative purposes (e.g., for an AI to know who is in the party without needing full stats).
 */
export const CharacterSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    race: z.string(),
    class: z.string(),
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
    spells: z.array(z.object({ id: z.string(), name: z.string(), level: z.number(), description: z.string().nullable() })),
});
