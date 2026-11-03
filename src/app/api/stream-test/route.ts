
import { NextRequest, NextResponse } from 'next/server';
import { createEvent, serializeEvent } from '@/lib/streaming/protocol';

export const runtime = 'edge'; // Or 'nodejs', but edge is often better for streaming

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: any) => {
                controller.enqueue(encoder.encode(serializeEvent(event)));
            };

            try {
                // 1. Send Debug
                send(createEvent('debug', { message: 'Stream connection established' }));
                await new Promise(r => setTimeout(r, 500));

                // 2. Send Tool Start
                send(createEvent('tool_start', { tool: 'dice_roller', input: { expression: '1d20+5' } }));
                await new Promise(r => setTimeout(r, 1000)); // Simulate thinking

                // 3. Send Tool End
                send(createEvent('tool_end', { tool: 'dice_roller', result: { total: 18 } }));
                await new Promise(r => setTimeout(r, 500));

                // 4. Send State Delta
                send(createEvent('state_delta', {
                    updateType: 'merge',
                    data: {
                        hp: { current: 45 },
                        lastAction: 'Attacked Goblin'
                    }
                }));

                // 5. Send Tokens (simulating text generation)
                const text = "El goblin cae al suelo derrotado.";
                for (const char of text) {
                    send(createEvent('token', { role: 'dm', content: char }));
                    await new Promise(r => setTimeout(r, 50)); // Typing effect
                }

                await new Promise(r => setTimeout(r, 500));

                // 6. Finish
                send(createEvent('stream_done', { turnIndex: 1 }));
                controller.close();

            } catch (error) {
                send(createEvent('error', { code: 'INTERNAL_ERROR', message: 'Stream failed', isFatal: true }));
                controller.close();
            }
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}
