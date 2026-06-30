import { z } from 'zod';

/**
 * Esquema base común para todos los eventos del motor de juego.
 */
export const EventBaseSchema = z.object({
  id: z.string().uuid().describe('ID único de la instancia del evento'),
  timestamp: z.number().describe('Timestamp UNIX o contador de orden de ejecución'),
  turnNumber: z.number().describe('Número de turno en el que ocurre'),
});

// --- EVENTOS DE INTENCIÓN (ATTEMPTS / DECLARATIONS) ---

export const MoveAttemptedSchema = EventBaseSchema.extend({
  type: z.literal('MoveAttempted'),
  payload: z.object({
    toLocationId: z.string(),
    stealthIntent: z.boolean().optional().default(false),
    assignedCompanion: z.string().optional().nullable(),
  }),
});

export const InteractAttemptedSchema = EventBaseSchema.extend({
  type: z.literal('InteractAttempted'),
  payload: z.object({
    targetId: z.string(),
    assignedCompanion: z.string().optional().nullable(),
    playerAction: z.string().optional(),
  }),
});

export const AttackAttemptedSchema = EventBaseSchema.extend({
  type: z.literal('AttackAttempted'),
  payload: z.object({
    targetId: z.string(),
    assignedCompanion: z.string().optional().nullable(),
  }),
});

export const SkillCheckAttemptedSchema = EventBaseSchema.extend({
  type: z.literal('SkillCheckAttempted'),
  payload: z.object({
    skill: z.string().optional(), // Puede ser opcional si el sistema debe decidir dinámicamente
    dc: z.number().optional(),
    assignedCompanion: z.string().optional().nullable(),
    reasoning: z.string().optional(),
    playerAction: z.string().optional(), // Texto original para la IA
    conversationHistory: z.string().optional(), // Historial para la IA
    pendingEffects: z.array(z.string()).optional(), // Efectos a aplicar si tiene éxito
    pendingWorldStateFlags: z.record(z.string(), z.any()).optional(), // Flags a aplicar si tiene éxito
  }),
});

export const ItemDropAttemptedSchema = EventBaseSchema.extend({
  type: z.literal('ItemDropAttempted'),
  payload: z.object({
    itemId: z.string(),
    quantity: z.number(),
    assignedCompanion: z.string().optional().nullable(),
  }),
});

export const ItemGiveAttemptedSchema = EventBaseSchema.extend({
  type: z.literal('ItemGiveAttempted'),
  payload: z.object({
    itemId: z.string(),
    quantity: z.number(),
    recipient: z.string(),
    assignedCompanion: z.string().optional().nullable(),
  }),
});

export const OocDeclaredSchema = EventBaseSchema.extend({
  type: z.literal('OocDeclared'),
  payload: z.object({
    text: z.string(),
  }),
});


// --- EVENTOS DE HECHOS CONSUMADOS (FACTS / RESULTS) ---

export const PlayerMovedSchema = EventBaseSchema.extend({
  type: z.literal('PlayerMoved'),
  payload: z.object({
    fromLocationId: z.string(),
    toLocationId: z.string(),
    travelTimePassed: z.number().optional(), // minutos pasados durante el viaje
    stealthCheckResult: z.object({
      success: z.boolean(),
      roll: z.number(),
    }).optional(),
  }),
});

export const MoveFailedSchema = EventBaseSchema.extend({
  type: z.literal('MoveFailed'),
  payload: z.object({
    locationId: z.string(),
    reason: z.string(),
  }),
});

export const DoorOpenedSchema = EventBaseSchema.extend({
  type: z.literal('DoorOpened'),
  payload: z.object({
    locationId: z.string(),
    direction: z.string(),
    requiredKeyId: z.string().optional(),
    method: z.enum(['key', 'lockpick', 'force', 'free']).optional(),
    keyName: z.string().optional(),
  }),
});

export const DoorClosedSchema = EventBaseSchema.extend({
  type: z.literal('DoorClosed'),
  payload: z.object({
    locationId: z.string(),
    direction: z.string(),
  }),
});

export const ItemCollectedSchema = EventBaseSchema.extend({
  type: z.literal('ItemCollected'),
  payload: z.object({
    characterId: z.string(),
    characterName: z.string(),
    itemId: z.string(),
    itemName: z.string(),
    quantity: z.number(),
  }),
});

export const ItemDroppedSchema = EventBaseSchema.extend({
  type: z.literal('ItemDropped'),
  payload: z.object({
    characterId: z.string(),
    characterName: z.string(),
    itemId: z.string(),
    itemName: z.string(),
    quantity: z.number(),
    containerId: z.string().optional(), // Si se soltó dentro de un cofre
  }),
});

export const ItemGivenSchema = EventBaseSchema.extend({
  type: z.literal('ItemGiven'),
  payload: z.object({
    giverId: z.string(),
    giverName: z.string(),
    recipientId: z.string(),
    recipientName: z.string(),
    itemId: z.string(),
    itemName: z.string(),
    quantity: z.number(),
  }),
});

export const TrapTriggeredSchema = EventBaseSchema.extend({
  type: z.literal('TrapTriggered'),
  payload: z.object({
    hazardId: z.string(),
    locationId: z.string(),
    description: z.string(),
  }),
});

export const CombatTriggeredSchema = EventBaseSchema.extend({
  type: z.literal('CombatTriggered'),
  payload: z.object({
    reason: z.enum(['ambush', 'proximity', 'stealth_fail', 'mimic', 'provocation', 'player_surprise']),
    triggeringEntityIds: z.array(z.string()),
    message: z.string().optional(),
  }),
});

export const DamageAppliedSchema = EventBaseSchema.extend({
  type: z.literal('DamageApplied'),
  payload: z.object({
    targetId: z.string(),
    targetName: z.string(),
    amount: z.number(),
    damageType: z.string().optional(),
    isDead: z.boolean().optional(),
    reason: z.string().optional(),
  }),
});

export const HealAppliedSchema = EventBaseSchema.extend({
  type: z.literal('HealApplied'),
  payload: z.object({
    targetId: z.string(),
    targetName: z.string(),
    amount: z.number(),
    reason: z.string().optional(),
  }),
});

export const ConditionAppliedSchema = EventBaseSchema.extend({
  type: z.literal('ConditionApplied'),
  payload: z.object({
    targetId: z.string(),
    targetName: z.string(),
    condition: z.string(),
  }),
});

export const ConditionRemovedSchema = EventBaseSchema.extend({
  type: z.literal('ConditionRemoved'),
  payload: z.object({
    targetId: z.string(),
    targetName: z.string(),
    condition: z.string(),
  }),
});

export const SkillCheckResolvedSchema = EventBaseSchema.extend({
  type: z.literal('SkillCheckResolved'),
  payload: z.object({
    characterName: z.string(),
    skill: z.string(),
    dc: z.number(),
    rollTotal: z.number(),
    isSuccess: z.boolean(),
    isCriticalSuccess: z.boolean().optional(),
    isCriticalFailure: z.boolean().optional(),
    reasoning: z.string().optional(),
  }),
});

export const RestCompletedSchema = EventBaseSchema.extend({
  type: z.literal('RestCompleted'),
  payload: z.object({
    type: z.enum(['short', 'long']),
    partyRecoveredHp: z.record(z.string(), z.number()), // map de name -> HP recuperados
  }),
});

export const GoldChangedSchema = EventBaseSchema.extend({
  type: z.literal('GoldChanged'),
  payload: z.object({
    characterName: z.string(),
    amount: z.number(),
    isAddition: z.boolean(),
  }),
});

export const XpAwardedSchema = EventBaseSchema.extend({
  type: z.literal('XpAwarded'),
  payload: z.object({
    characterName: z.string(),
    amount: z.number(),
  }),
});

export const CharacterDiedSchema = EventBaseSchema.extend({
  type: z.literal('CharacterDied'),
  payload: z.object({
    characterId: z.string(),
    characterName: z.string(),
    isUnconsciousOnly: z.boolean().default(false), // true si solo cae a 0 HP pero no muere del todo
  }),
});

export const EnemyDiedSchema = EventBaseSchema.extend({
  type: z.literal('EnemyDied'),
  payload: z.object({
    enemyId: z.string(),
    enemyName: z.string(),
    locationId: z.string(),
  }),
});

export const DialogOccurredSchema = EventBaseSchema.extend({
  type: z.literal('DialogOccurred'),
  payload: z.object({
    speaker: z.string(),
    text: z.string(),
  }),
});


// --- UNIÓN DISCRIMINADA DE EVENTOS ---

export const GameEventSchema = z.discriminatedUnion('type', [
  // Intentions
  MoveAttemptedSchema,
  InteractAttemptedSchema,
  AttackAttemptedSchema,
  SkillCheckAttemptedSchema,
  ItemDropAttemptedSchema,
  ItemGiveAttemptedSchema,
  OocDeclaredSchema,
  
  // Facts
  PlayerMovedSchema,
  MoveFailedSchema,
  DoorOpenedSchema,
  DoorClosedSchema,
  ItemCollectedSchema,
  ItemDroppedSchema,
  ItemGivenSchema,
  TrapTriggeredSchema,
  CombatTriggeredSchema,
  DamageAppliedSchema,
  HealAppliedSchema,
  ConditionAppliedSchema,
  ConditionRemovedSchema,
  SkillCheckResolvedSchema,
  RestCompletedSchema,
  GoldChangedSchema,
  XpAwardedSchema,
  CharacterDiedSchema,
  EnemyDiedSchema,
  DialogOccurredSchema,
]);

export type GameEvent = z.infer<typeof GameEventSchema>;

export type MoveAttempted = z.infer<typeof MoveAttemptedSchema>;
export type InteractAttempted = z.infer<typeof InteractAttemptedSchema>;
export type AttackAttempted = z.infer<typeof AttackAttemptedSchema>;
export type SkillCheckAttempted = z.infer<typeof SkillCheckAttemptedSchema>;
export type ItemDropAttempted = z.infer<typeof ItemDropAttemptedSchema>;
export type ItemGiveAttempted = z.infer<typeof ItemGiveAttemptedSchema>;
export type OocDeclared = z.infer<typeof OocDeclaredSchema>;

export type PlayerMoved = z.infer<typeof PlayerMovedSchema>;
export type MoveFailed = z.infer<typeof MoveFailedSchema>;
export type DoorOpened = z.infer<typeof DoorOpenedSchema>;
export type DoorClosed = z.infer<typeof DoorClosedSchema>;
export type ItemCollected = z.infer<typeof ItemCollectedSchema>;
export type ItemDropped = z.infer<typeof ItemDroppedSchema>;
export type ItemGiven = z.infer<typeof ItemGivenSchema>;
export type TrapTriggered = z.infer<typeof TrapTriggeredSchema>;
export type CombatTriggered = z.infer<typeof CombatTriggeredSchema>;
export type DamageApplied = z.infer<typeof DamageAppliedSchema>;
export type HealApplied = z.infer<typeof HealAppliedSchema>;
export type ConditionApplied = z.infer<typeof ConditionAppliedSchema>;
export type ConditionRemoved = z.infer<typeof ConditionRemovedSchema>;
export type SkillCheckResolved = z.infer<typeof SkillCheckResolvedSchema>;
export type RestCompleted = z.infer<typeof RestCompletedSchema>;
export type GoldChanged = z.infer<typeof GoldChangedSchema>;
export type XpAwarded = z.infer<typeof XpAwardedSchema>;
export type CharacterDied = z.infer<typeof CharacterDiedSchema>;
export type EnemyDied = z.infer<typeof EnemyDiedSchema>;
export type DialogOccurred = z.infer<typeof DialogOccurredSchema>;
