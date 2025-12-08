import { z } from 'zod';
import {
    EnemyStateSchema,
    ConnectionStateSchema,
    InteractableStateSchema,
    LocationStateSchema,
    WorldStateSchema
} from '@/lib/schemas';

// Re-export type definitions inferred from the schemas
export type EnemyState = z.infer<typeof EnemyStateSchema>;
export type ConnectionState = z.infer<typeof ConnectionStateSchema>;
export type InteractableState = z.infer<typeof InteractableStateSchema>;
export type LocationState = z.infer<typeof LocationStateSchema>;
export type WorldState = z.infer<typeof WorldStateSchema>;

/**
 * Helpers para instanciar estados vacíos
 */
export const createInitialWorldState = (): WorldState => ({
    locations: {},
    globalFlags: {}
});

export const createInitialLocationState = (): LocationState => ({
    visited: false,
    visitedCount: 0,
    enemies: []
});
