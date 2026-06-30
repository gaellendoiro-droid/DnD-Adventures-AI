
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { log } from '@/lib/logger';

export const updateAttitudeTool = ai.defineTool(
    {
        name: 'updateAttitudeTool',
        description: 'Updates the attitude of the NPC towards the player. Call this ONLY when the interaction significantly changes how the NPC feels about the player (e.g., player was very rude, or very persuasive).',
        inputSchema: z.object({
            attitude: z.enum(['improved', 'worsened']).describe('The new direction of the attitude.'),
            reason: z.string().describe('The reason for the change.'),
        }),
        outputSchema: z.string().describe('Confirmation message.'),
    },
    async (input) => {
        log.aiTool('updateAttitudeTool', 'NPC Attitude Change Detected', {
            attitude: input.attitude,
            reason: input.reason
        });

        // In the future, this tool could update the NPC entity in the DB.
        // For now, it logs the change, preserving the previous architecture's behavior.

        return `Attitude updated to ${input.attitude}.`;
    }
);
