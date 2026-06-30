
import { describe, it, expect, beforeEach } from 'vitest';
import { createEvent, serializeEvent, StreamParser } from './protocol';
import { GameStreamEvent, TokenEvent } from './types';

describe('Streaming Protocol', () => {
    describe('Encoder', () => {
        it('createEvent generates valid event structure', () => {
            const event = createEvent('token', { role: 'dm', content: 'hello' });

            expect(event.type).toBe('token');
            expect((event as TokenEvent).payload.content).toBe('hello');
            expect(event.id).toBeDefined();
            expect(event.timestamp).toBeDefined();
            expect(typeof event.timestamp).toBe('number');
        });

        it('serializeEvent adds newline', () => {
            const event = createEvent('debug', { message: 'test' });
            const serialized = serializeEvent(event);

            expect(serialized).toMatch(/\n$/);
            expect(JSON.parse(serialized.trim())).toEqual(event);
        });
    });

    describe('StreamParser', () => {
        let parser: StreamParser;

        beforeEach(() => {
            parser = new StreamParser();
        });

        it('parses a single complete event', () => {
            const event = createEvent('token', { role: 'dm', content: 'A' });
            const chunk = serializeEvent(event);

            const results = parser.parseChunk(chunk);
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual(event);
        });

        it('handles multiple events in one chunk (batching)', () => {
            const event1 = createEvent('token', { role: 'dm', content: 'A' });
            const event2 = createEvent('token', { role: 'dm', content: 'B' });
            const chunk = serializeEvent(event1) + serializeEvent(event2);

            const results = parser.parseChunk(chunk);
            expect(results).toHaveLength(2);
            expect(results[0].id).toBe(event1.id);
            expect(results[1].id).toBe(event2.id);
        });

        it('handles split events across chunks', () => {
            const event = createEvent('state_delta', {
                data: { hp: 10 },
                updateType: 'merge'
            });
            const serialized = serializeEvent(event);

            // Split in half
            const splitIndex = Math.floor(serialized.length / 2);
            const chunk1 = serialized.slice(0, splitIndex);
            const chunk2 = serialized.slice(splitIndex);

            const results1 = parser.parseChunk(chunk1);
            expect(results1).toHaveLength(0); // Incomplete

            const results2 = parser.parseChunk(chunk2);
            expect(results2).toHaveLength(1);
            expect(results2[0]).toEqual(event);
        });

        it('handles invalid JSON gracefully', () => {
            const badLine = '{"type": "token", "payload": ... BROKEN ... }\n';
            const goodEvent = createEvent('token', { role: 'dm', content: 'OK' });

            // We simulate console.error to avoid spamming test output
            const originalError = console.error;
            console.error = () => { };

            const chunk = badLine + serializeEvent(goodEvent);

            const results = parser.parseChunk(chunk);

            // Should recover and parse the second event
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe(goodEvent.id);

            console.error = originalError;
        });

        it('resets buffer correctly', () => {
            const incomplete = '{"type": "token"';
            parser.parseChunk(incomplete);
            parser.reset();

            const event = createEvent('token', { role: 'dm', content: 'Fresh' });
            const results = parser.parseChunk(serializeEvent(event));

            expect(results).toHaveLength(1);
            expect((results[0] as TokenEvent).payload.content).toBe('Fresh');
        });
    });
});
