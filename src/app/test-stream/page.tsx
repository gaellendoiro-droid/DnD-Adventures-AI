
"use client";

import { useState, useRef } from 'react';
import { StreamParser } from '@/lib/streaming/protocol';
import { GameStreamEvent } from '@/lib/streaming/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function TestStreamPage() {
    const [events, setEvents] = useState<GameStreamEvent[]>([]);
    const [status, setStatus] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle');
    const [accumulatedText, setAccumulatedText] = useState('');

    const parserRef = useRef(new StreamParser());

    const startStream = async () => {
        setEvents([]);
        setAccumulatedText('');
        setStatus('streaming');
        parserRef.current.reset();

        try {
            const response = await fetch('/api/stream-test', {
                method: 'POST',
            });

            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    setStatus('done');
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                const newEvents = parserRef.current.parseChunk(chunk);

                if (newEvents.length > 0) {
                    setEvents(prev => [...prev, ...newEvents]);

                    // Local processing for demo purposes
                    newEvents.forEach(e => {
                        if (e.type === 'token') {
                            setAccumulatedText(prev => prev + e.payload.content);
                        }
                    });
                }
            }

        } catch (e: any) {
            console.error(e);
            setStatus('error');
        }
    };

    return (
        <div className="container mx-auto p-4 space-y-4">
            <h1 className="text-2xl font-bold">Protocol Test Suite (Phase 1)</h1>

            <div className="flex gap-4 items-center">
                <Button onClick={startStream} disabled={status === 'streaming'}>
                    {status === 'streaming' ? 'Streaming...' : 'Start Test Stream'}
                </Button>
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">Status: {status}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 h-[600px]">
                {/* Event Log */}
                <Card className="h-full flex flex-col">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm">Event Log</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <ScrollArea className="h-full p-4">
                            <div className="space-y-2 font-mono text-xs">
                                {events.map((e) => (
                                    <div key={e.id} className="border-b pb-1 mb-1 border-muted-foreground/20">
                                        <span className="font-bold text-primary">{e.type}</span>
                                        <span className="ml-2 text-muted-foreground">
                                            {e.type === 'token'
                                                ? `"${e.payload.content}"`
                                                : JSON.stringify(e.payload)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Visualizer */}
                <Card className="h-full flex flex-col">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm">Visualizer</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-4">
                        <div className="space-y-4">
                            <div className="border rounded p-4 bg-secondary/50 min-h-[100px]">
                                <h3 className="text-xs font-bold mb-2 uppercase text-muted-foreground">Narrative Output</h3>
                                <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed">
                                    {accumulatedText}
                                    <span className="animate-pulse inline-block w-2 h-4 bg-primary ml-1 align-middle" />
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground">Latest State Updates</h3>
                                {events.filter(e => e.type === 'state_delta' || e.type === 'tool_start').slice(-3).map(e => (
                                    <div key={e.id} className="text-xs p-2 bg-muted rounded">
                                        {e.type === 'tool_start' && (
                                            <div className="flex items-center gap-2 text-amber-500">
                                                <span>🛠️ Tool: {(e.payload as any).tool}</span>
                                                <span className="opacity-50 text-[10px]">{JSON.stringify((e.payload as any).input)}</span>
                                            </div>
                                        )}
                                        {e.type === 'state_delta' && (
                                            <div className="flex items-center gap-2 text-green-500">
                                                <span>💾 State: {JSON.stringify((e.payload as any).data)}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
