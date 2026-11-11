/**
 * Protocol Utilities for NDJSON Streaming.
 * Handles serialization (Encoder) and deserialization (Parser) of GameStreamEvents.
 */

import { GameStreamEvent, GameStreamEventType } from './types';

// --- Encoder (Server-Side) ---

/**
 * Creates a fully typed GameStreamEvent object with automatic ID and timestamp.
 */
export function createEvent<T extends GameStreamEventType>(
    type: T,
    payload: Extract<GameStreamEvent, { type: T }>['payload']
): GameStreamEvent {
    // Logic to satisfy TypeScript's discriminated union matching
    const event: any = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type,
        payload
    };
    return event as GameStreamEvent;
}

/**
 * Serializes an event to a string ready for the stream (NDJSON format).
 * Adds a newline character at the end.
 */
export function serializeEvent(event: GameStreamEvent): string {
    return JSON.stringify(event) + '\n';
}

/**
 * Creates a helper to write events to a ReadableStream controller.
 */
export function createStreamEncoder(controller: ReadableStreamDefaultController) {
    const encoder = new TextEncoder();
    return {
        write(event: GameStreamEvent) {
            const chunk = serializeEvent(event);
            controller.enqueue(encoder.encode(chunk));
        },
        close() {
            try {
                controller.close();
            } catch (e) {
                // Ignore close errors if already closed
            }
        }
    };
}

// --- Parser (Client-Side) ---

/**
 * A simple buffer class to handle incoming stream chunks that might split JSON lines.
 */
export class StreamParser {
    private buffer: string = '';

    /**
     * Adds a chunk to the buffer and returns all complete events found so far.
     */
    public parseChunk(chunk: string): GameStreamEvent[] {
        this.buffer += chunk;
        const events: GameStreamEvent[] = [];

        // Split by newline
        // We keep the remainder in the buffer if it doesn't end with a newline
        let newlineIndex: number;
        while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
            const line = this.buffer.slice(0, newlineIndex).trim();
            this.buffer = this.buffer.slice(newlineIndex + 1);

            if (line) {
                try {
                    const event = JSON.parse(line) as GameStreamEvent;
                    events.push(event);
                } catch (e) {
                    console.error('StreamParser: Failed to parse line:', line, e);
                    // We might want to emit a local error event here, or just ignore malformed lines
                }
            }
        }

        return events;
    }

    /**
     * Clears the internal buffer.
     */
    public reset() {
        this.buffer = '';
    }
}
