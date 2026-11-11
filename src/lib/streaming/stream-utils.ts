
import { createEvent, serializeEvent } from './protocol';
import { GameStreamEvent } from './types';

/**
 * Converts a JavaScript Generator (async or sync) into a ReadableStream
 * compatible with Next.js Route Handlers.
 * 
 * @param generator An async generator that yields GameStreamEvents
 * @returns A ReadableStream that emits NDJSON encoded events
 */
export function streamGenerator(
    generator: AsyncGenerator<GameStreamEvent, void, unknown>
): ReadableStream {
    const encoder = new TextEncoder();

    return new ReadableStream({
        async start(controller) {
            try {
                // Initial connection event (optional but good for debugging)
                controller.enqueue(encoder.encode(serializeEvent(createEvent('debug', { message: 'Stream started' }))));

                for await (const event of generator) {
                    controller.enqueue(encoder.encode(serializeEvent(event)));

                    // Specific handling for 'error' events? 
                    // No, just send them. The client handles closing if needed.
                }
            } catch (error: any) {
                // If the generator crashes, we try to send an error event before closing
                // But only if the controller is still readable
                console.error("Stream Generator Error:", error);
                try {
                    const errorEvent = createEvent('error', {
                        code: 'STREAM_ERROR',
                        message: error.message || 'Unknown stream error',
                        isFatal: true
                    });
                    controller.enqueue(encoder.encode(serializeEvent(errorEvent)));
                } catch (e) {
                    // Ignore if we can't send (e.g., controller already closed)
                }
            } finally {
                try {
                    // Send stream_done if not already sent by the generator?
                    // Better to rely on the generator to send it if it completed successfully.
                    // But to be safe, we can close the controller.
                    controller.close();
                } catch (e) {
                    // Ignore
                }
            }
        }
    });
}
