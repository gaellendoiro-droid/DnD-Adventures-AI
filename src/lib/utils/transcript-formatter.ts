/**
 * @fileOverview TranscriptFormatter - Utilidades para formatear el historial de conversación
 */

import type { GameMessage } from '@/lib/types';

/**
 * Formatea un mensaje de juego para incluirlo en el transcript narrativo.
 * 
 * @param msg - Mensaje a formatear
 * @returns String formateado (ej: "Player: Hola")
 */
export const formatMessageForTranscript = (msg: Partial<GameMessage>): string => {
    if (msg.sender === 'Player') return `${msg.senderName || 'Player'}: ${msg.content}`;
    if (msg.sender === 'DM') return `Dungeon Master: ${msg.originalContent || msg.content}`;
    if (msg.sender === 'Character' && msg.senderName) return `${msg.senderName}: ${msg.originalContent || msg.content}`;
    return '';
};
