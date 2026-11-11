
import { NextRequest, NextResponse } from 'next/server';
import { gameStreamCoordinator } from '@/ai/streaming/game-stream-coordinator';
import { GameStateSchema } from '@/ai/flows/schemas';
import { createStreamEncoder } from '@/lib/streaming/protocol';
import { parseAIProviderError } from '@/lib/ai/ai-error-handler';

export const maxDuration = 60; // Allow longer execution for streaming

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate input using the shared schema
        const validationResult = GameStateSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid game state', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const gameState = validationResult.data;

        // Create the stream
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = createStreamEncoder(controller);

                try {
                    // Run the coordinator
                    for await (const event of gameStreamCoordinator(gameState)) {
                        encoder.write(event);
                    }
                } catch (error: any) {
                    console.error('Stream processing error:', error);
                    const aiError = parseAIProviderError(error);
                    encoder.write({
                        type: 'error',
                        id: `err-${Date.now()}`,
                        timestamp: Date.now(),
                        payload: {
                            code: aiError.code || 'INTERNAL_ERROR',
                            message: aiError.userMessage || error.message || 'Unknown error during streaming',
                            details: { aiError },
                            isFatal: true
                        }
                    });
                } finally {
                    encoder.close();
                }
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('API Route Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', message: error.message },
            { status: 500 }
        );
    }
}
