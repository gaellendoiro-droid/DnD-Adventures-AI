/**
 * Shared Type Definitions for the D&D Game Streaming Protocol.
 * These types are used by both the Backend (GameStreamCoordinator) and Frontend (useGameStream).
 */

import { z } from 'zod';
import { GameStateSchema } from '../../ai/flows/schemas';

// --- Event Payloads ---

export const TokenPayloadSchema = z.object({
    role: z.enum(['dm', 'system', 'assistant', 'user']), // Expanded roles just in case
    content: z.string(),
});

export const ToolStartPayloadSchema = z.object({
    tool: z.string(),
    input: z.any().optional(),
});

export const ToolEndPayloadSchema = z.object({
    tool: z.string(),
    result: z.any().optional(),
});

export const StateDeltaPayloadSchema = z.object({
    // We can be strict or loose here. For now, loose to allow partial updates of any part of GameState
    // In the future, we might want specific schemas for "hp_update", "inventory_update", etc.
    data: z.record(z.any()),
    updateType: z.enum(['merge', 'replace']).default('merge'),
    path: z.string().optional(), // Optional dot-notation path for targeted updates (e.g., "party.0.hp")
});

export const StreamDonePayloadSchema = z.object({
    turnIndex: z.number().optional(),
    nextLocationId: z.string().optional(),
});

export const ErrorPayloadSchema = z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
    isFatal: z.boolean().default(false),
});

export const DebugPayloadSchema = z.object({
    message: z.string(),
    data: z.any().optional(),
});

// --- Discriminated Union of All Events ---

export type GameStreamEventType =
    | 'token'
    | 'tool_start'
    | 'tool_end'
    | 'state_delta'
    | 'stream_done'
    | 'error'
    | 'debug'
    | 'ping'; // Keep connection alive

export interface GameStreamEventBase {
    id: string; // Unique ID for deduplication/ordering
    timestamp: number;
}

export interface TokenEvent extends GameStreamEventBase {
    type: 'token';
    payload: z.infer<typeof TokenPayloadSchema>;
}

export interface ToolStartEvent extends GameStreamEventBase {
    type: 'tool_start';
    payload: z.infer<typeof ToolStartPayloadSchema>;
}

export interface ToolEndEvent extends GameStreamEventBase {
    type: 'tool_end';
    payload: z.infer<typeof ToolEndPayloadSchema>;
}

export interface StateDeltaEvent extends GameStreamEventBase {
    type: 'state_delta';
    payload: z.infer<typeof StateDeltaPayloadSchema>;
}

export interface StreamDoneEvent extends GameStreamEventBase {
    type: 'stream_done';
    payload: z.infer<typeof StreamDonePayloadSchema>;
}

export interface ErrorEvent extends GameStreamEventBase {
    type: 'error';
    payload: z.infer<typeof ErrorPayloadSchema>;
}

export interface DebugEvent extends GameStreamEventBase {
    type: 'debug';
    payload: z.infer<typeof DebugPayloadSchema>;
}

export interface PingEvent extends GameStreamEventBase {
    type: 'ping';
    payload?: never;
}

export type GameStreamEvent =
    | TokenEvent
    | ToolStartEvent
    | ToolEndEvent
    | StateDeltaEvent
    | StreamDoneEvent
    | ErrorEvent
    | DebugEvent
    | PingEvent;
