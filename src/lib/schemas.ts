
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
    skills: z.array(z.object({
        name: z.string(),
        proficient: z.boolean(),
        modifier: z.number() // Modificador total de la habilidad (atributo + BC si es competente)
    })),
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

/**
 * Schema for travel types in the spatial movement system.
 */
export const TravelTypeSchema = z.enum([
    'direct',   // Puerta, pasillo inmediato (segundos)
    'urban',    // Movimiento dentro de un Hub seguro (minutos)
    'overland', // Viaje por mapa de región (horas/días)
    'special'   // Teletransporte, barco, etc.
]);

/**
 * Schema for connections between locations (edges in the graph).
 */
/**
 * Schema for Hazards (Traps, Ambushes, Environmental Dangers).
 */
export const HazardSchema = z.object({
    id: z.string(),
    type: z.enum(['trap', 'ambush', 'environmental']),
    detectionDC: z.number().describe("CD para Percepción Pasiva/Activa"),
    disarmDC: z.number().optional().describe("CD para desactivar (si aplica)"),
    description: z.string().describe("Lo que se narra si se detecta"),
    triggerDescription: z.string().describe("Lo que se narra si se activa"),
    effect: z.string().optional().describe("Efecto mecánico simplificado (ej: '2d6 daño fuego' o 'Ataque +5')"),
    active: z.boolean().default(true)
});

/**
 * Schema for connections between locations (edges in the graph).
 */
export const ConnectionSchema = z.object({
    targetId: z.string(), // ID del nodo destino
    type: TravelTypeSchema.default('direct'),
    description: z.string().optional(), // Descripción narrativa del camino

    // Metadatos Espaciales (Para el cerebro del DM)
    direction: z.enum(['norte', 'sur', 'este', 'oeste', 'noreste', 'noroeste', 'sureste', 'suroeste', 'arriba', 'abajo', 'dentro', 'fuera']).optional(),
    distance: z.string().optional(), // Ej: "5 millas", "200 pies"
    travelTime: z.string().optional(), // Ej: "2 horas", "10 minutos"

    // Restricciones Lógicas (El problema de la "Puerta Cerrada")
    isLocked: z.boolean().default(false),
    requiredKeyId: z.string().optional(), // Item necesario para pasar
    isBlocked: z.boolean().default(false), // Camino derrumbado/cortado
    blockedReason: z.string().optional(),   // Narración del bloqueo
    isOpen: z.boolean().optional(), // Si la puerta/pasaje está abierto (false = cerrado, true = abierto, undefined = sin puerta)

    // Visibilidad (Fase 2: Exploración)
    visibility: z.enum(['restricted', 'open']).default('restricted').describe("Si 'open', se ve el destino desde el origen")
});

/**
 * Schema for a Location in an adventure.
 */
export const LocationSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    title: z.string().optional(), // Alias for name found in JSON
    description: z.string(),

    // Jerarquía de Hubs
    regionId: z.string().optional().describe("Agrupa ubicaciones (ej: 'phandalin') para movimiento implícito"),

    // Restricción de Viaje (El problema de la "Celda")
    allowFastTravel: z.boolean().default(true).describe("Si false, bloquea viajes tipo 'overland' desde aquí"),

    // Contexto de Exploración (Fase 2)
    explorationMode: z.enum(['safe', 'dungeon', 'wilderness']).default('safe').describe("Define el ritmo y la tensión de la exploración"),
    lightLevel: z.enum(['bright', 'dim', 'dark']).default('bright').describe("Nivel de luz base (Narrativo por ahora)"),
    hazards: z.array(HazardSchema).optional(),

    // Nuevas conexiones ricas
    connections: z.array(ConnectionSchema).optional(),

    // Legacy support (to be deprecated or mapped to connections)
    exits: z.array(z.union([
        z.string(),
        z.object({ toLocationId: z.string(), description: z.string().optional() })
    ])).optional(), // Alias for connections found in JSON
    // Additional fields can be added here as needed based on the JSON structure
    encounters: z.array(z.any()).optional(), // Placeholder for encounters
    items: z.array(z.any()).optional(), // Placeholder for items found in location
    entitiesPresent: z.array(z.any()).optional(),
    interactables: z.array(z.any()).optional(),
    dmNotes: z.string().optional(),
}).refine(data => data.name || data.title, {
    message: "Location must have either a name or a title",
    path: ["name"]
});

/**
 * Schema for an Entity (NPC, Enemy, etc.) in an adventure.
 */
export const EntitySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    type: z.string().optional(), // e.g., "enemy", "npc"
    stats: z.any().optional(), // Flexible for now, can be tightened later
});

/**
 * Schema for a Narrative Scene (Cutscene).
 */
export const NarrativeSceneSchema = z.object({
    id: z.string(),
    text: z.string(),
    triggerCondition: z.string().optional(),
});

/**
 * Schema for an Event/Trigger.
 */
export const EventSchema = z.object({
    id: z.string(),
    trigger: z.string(),
    locationId: z.string().optional(),
    interactableId: z.string().optional(),
    action: z.string(),
    target: z.union([z.string(), z.array(z.string())]).optional(),
});

/**
 * Schema for a Random Table.
 */
export const TableSchema = z.object({
    id: z.string(),
    title: z.string(),
    dice: z.string(), // Ej: "1d6", "2d6"
    rows: z.array(z.object({
        range: z.string(), // Ej: "1", "2-3", "4-6"
        content: z.string(),
    })),
});

/**
 * Schema for an Item.
 */
export const ItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(), // Ej: "weapon", "potion", "key"
    rarity: z.string().optional(),
    description: z.string().optional(),
    properties: z.any().optional(), // Objeto libre para propiedades mecánicas extra
});

/**
 * Schema for the full Adventure Data structure.
 */
export const AdventureDataSchema = z.object({
    adventureId: z.string(),
    title: z.string().optional(),
    summary: z.string().optional(),
    introductoryNarration: z.string().optional(), // Pre-generated intro
    openingScene: z.string().optional(), // Alias for introductoryNarration
    locations: z.array(LocationSchema).min(1, "La aventura debe tener al menos una ubicación"),
    entities: z.array(EntitySchema).optional(),
    items: z.array(ItemSchema).optional(),
    tables: z.array(TableSchema).optional(),
    startingLocationId: z.string().optional(), // Optional explicit starting location
    narrativeScenes: z.array(NarrativeSceneSchema).optional(),
    events: z.array(EventSchema).optional(),
    settings: z.object({
        startingLocationId: z.string().optional(),
        initialPartySize: z.number().optional(),
    }).optional(),
    credits: z.object({
        author: z.string().optional(),
        source: z.string().optional(),
    }).optional(),
    levelRange: z.object({
        start: z.number().optional(),
        end: z.number().optional(),
    }).optional(),
    system: z.string().optional(),
});

// --- World State Persistence Schemas ---

/**
 * Representa el estado mutable de un enemigo específico.
 */
export const EnemyStateSchema = z.object({
    id: z.string(),
    hp: z.object({
        current: z.number(),
        max: z.number()
    }),
    status: z.enum(['active', 'dead', 'unconscious', 'fled']).default('active'),
    position: z.string().optional(),
    conditions: z.array(z.string()).optional(),
    inventory: z.array(ItemSchema).optional()
});

/**
 * Representa el estado de una conexión (puerta, pasillo, etc.)
 */
export const ConnectionStateSchema = z.object({
    direction: z.string(),
    isOpen: z.boolean().default(true),
    isLocked: z.boolean().default(false),
    isBlocked: z.boolean().default(false),
});

/**
 * Representa el componente interactivo (cofre, palanca) y su estado
 */
export const InteractableStateSchema = z.object({
    id: z.string(),
    state: z.string(),
    usedTimes: z.number().default(0)
});

/**
 * Representa el estado mutable completo de una ubicación.
 */
export const LocationStateSchema = z.object({
    visited: z.boolean().default(false),
    visitedCount: z.number().default(0),
    firstVisitTurn: z.number().optional(),
    lastVisitTurn: z.number().optional(),
    enemies: z.array(EnemyStateSchema).default([]),
    connections: z.record(z.string(), ConnectionStateSchema).optional(),
    interactables: z.record(z.string(), InteractableStateSchema).optional(),
    markers: z.array(z.string()).optional(),
    temporaryDescriptionOverride: z.string().optional()
});

/**
 * EL OBJETO MAESTRO: WorldState
 */
export const WorldStateSchema = z.object({
    worldTime: z.object({
        day: z.number().default(1),
        hour: z.number().default(8),
        minute: z.number().default(0)
    }).optional(),
    locations: z.record(z.string(), LocationStateSchema),
    globalFlags: z.record(z.string(), z.union([z.boolean(), z.number(), z.string()])).default({})
});

// --- Skill & Dice Mechanics Schemas (New Phase) ---

export const SkillNameSchema = z.enum([
    "athletics",
    "acrobatics", "sleight_of_hand", "stealth",
    "arcana", "history", "investigation", "nature", "religion",
    "animal_handling", "insight", "medicine", "perception", "survival",
    "deception", "intimidation", "performance", "persuasion"
]);

export const RollModeSchema = z.enum(['normal', 'advantage', 'disadvantage']);

export const SkillCheckResultSchema = z.object({
    skillName: SkillNameSchema,
    rollTotal: z.number(),
    difficultyClass: z.number(),
    isSuccess: z.boolean(),
    isCriticalSuccess: z.boolean().optional(),
    isCriticalFailure: z.boolean().optional(),
    rollMode: RollModeSchema,
    rollBreakdown: z.object({
        die1: z.number(),
        die2: z.number().optional(),
        kept: z.number(),
        modifier: z.number(),
    })
});

/**
 * Main Game State Schema (Save Data)
 */
export const GameStateSchema = z.object({
    savedAt: z.string().optional(),
    party: z.array(CharacterSchema),
    messages: z.array(z.any()), // Placeholder
    diceRolls: z.array(z.any()).optional(), // Placeholder
    locationId: z.string(),
    inCombat: z.boolean().optional(),
    initiativeOrder: z.array(z.any()).optional(), // Placeholder
    enemies: z.array(z.any()).optional(), // Deprecated
    enemiesByLocation: z.record(z.string(), z.array(z.any())).optional(), // New: enemies by location
    turnIndex: z.number().optional(),
    openDoors: z.record(z.string(), z.boolean()).optional(), // Map of "locationId:direction" -> isOpen
    worldState: WorldStateSchema.optional(), // New state schema
});
