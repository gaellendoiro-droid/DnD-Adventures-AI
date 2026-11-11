
import { useState, useRef, useCallback } from 'react';
import { GameStreamEvent } from '@/lib/streaming/types';
import { StreamParser } from '@/lib/streaming/protocol';

export interface UseGameStreamOptions {
    url: string;
    onStateUpdate?: (delta: any) => void;
    onMessage?: (message: string) => void;
    onError?: (error: Error) => void;
    onStreamComplete?: (content: string) => void;
}

export interface UseGameStreamResult {
    sendMessage: (action: string, state: any) => Promise<void>;
    isConnected: boolean;
    isStreaming: boolean;
    lastError: Error | null;
    streamedContent: string;
    currentStatus: string | null; // New field
}

export function useGameStream({
    url,
    onStateUpdate,
    onMessage,
    onError,
    onStreamComplete
}: UseGameStreamOptions): UseGameStreamResult {
    const [isConnected, setIsConnected] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [lastError, setLastError] = useState<Error | null>(null);
    const [streamedContent, setStreamedContent] = useState('');
    const [currentStatus, setCurrentStatus] = useState<string | null>(null); // New State

    // Refs
    const parserRef = useRef<StreamParser>(new StreamParser());
    const abortControllerRef = useRef<AbortController | null>(null);
    const contentRef = useRef('');

    // Handle Event (Defined before sendMessage to avoid TDZ)
    const handleEvent = useCallback((event: GameStreamEvent) => {
        switch (event.type) {
            case 'token':
                contentRef.current += event.payload.content;
                setStreamedContent(contentRef.current);
                // When generating tokens, we are "Writing"
                setCurrentStatus(null);
                break;
            case 'tool_start':
                const toolName = event.payload.tool;
                let status = 'Procesando...';
                if (toolName === 'combat_manager') status = 'Calculando combate...';
                if (toolName === 'world_sim') status = 'Simulando mundo...';
                if (toolName === 'combat_initiation_expert') status = 'Evaluando hostilidad...';
                if (toolName === 'action_interpreter') status = 'Analizando intención...';
                setCurrentStatus(status);
                break;
            case 'debug':
                // Optional: Use clear debug messages for status
                const msg = event.payload.message;
                if (msg === 'Interpreting Action...') setCurrentStatus('Analizando intención...');
                if (msg === 'Processing Combat Turn...') setCurrentStatus('Calculando turno de combate...');
                if (msg === 'Coordinator started') setCurrentStatus('Pensando...');
                break;
            case 'state_delta':
                if (onStateUpdate) {
                    onStateUpdate(event.payload.data);
                }
                break;
            case 'stream_done':
                setCurrentStatus(null);
                if (onStreamComplete) {
                    onStreamComplete(contentRef.current);
                }
                break;
            case 'error':
                const err: any = new Error(event.payload.message);
                if (event.payload.details?.aiError) {
                    err.aiError = event.payload.details.aiError;
                }
                err.code = event.payload.code;
                setLastError(err);
                setCurrentStatus('Error');
                if (onError) onError(err);
                break;
        }
    }, [onStateUpdate, onError, onStreamComplete]);

    const sendMessage = useCallback(async (action: string, state: any) => {
        if (isStreaming) {
            console.warn('Already streaming, ignoring action');
            return;
        }

        setIsStreaming(true);
        setStreamedContent('');
        setCurrentStatus('Conectando...'); // Initial status
        contentRef.current = '';
        setLastError(null);
        parserRef.current.reset();

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...state, playerAction: action }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            // Connection established
            setIsConnected(true);
            setCurrentStatus('Pensando...');

            // Read the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const events = parserRef.current.parseChunk(chunk);

                for (const event of events) {
                    handleEvent(event);
                }
            }

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Stream aborted');
            } else {
                console.error('Stream error:', error);
                setLastError(error);
                setCurrentStatus('Error de conexión');
                if (onError) onError(error);
            }
        } finally {
            setIsStreaming(false);
            setIsConnected(false);
            setCurrentStatus(null);
            abortControllerRef.current = null;
        }
    }, [url, isStreaming, onMessage, onError, handleEvent]); // Added handleEvent dependency

    return {
        sendMessage,
        isConnected,
        isStreaming,
        lastError,
        streamedContent,
        currentStatus
    };
}
