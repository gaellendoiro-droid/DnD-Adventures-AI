
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { DataService } from '@/lib/data-service';
import { log } from '@/lib/logger';

const LookupEntityStatsSchema = z.object({
    query: z.string().describe('The name of the entity to look up (e.g., "Fireball", "Goblin", "Potion of Healing").'),
    type: z.enum(['spell', 'monster', 'item']).describe('The type of entity to look up.'),
});

export const lookupEntityStatsTool = ai.defineTool(
    {
        name: 'lookupEntityStats',
        description: 'Looks up official D&D 5e statistics and mechanics for Spells, Monsters, or Items from the local knowledge base. Use this when the player casts a spell ("Fireball"), uses an item ("Potion"), or encounters a monster ("Goblin") to get accurate dice, ranges, and effects.',
        inputSchema: LookupEntityStatsSchema,
        outputSchema: z.object({
            found: z.boolean(),
            data: z.any().optional(),
            message: z.string().optional(),
        }),
    },
    async (input) => {
        const { query, type } = input;
        log.aiTool('lookupEntityStats', `Looking up ${type}: ${query}`, { query, type });

        try {
            let result = null;

            if (type === 'spell') {
                result = await DataService.getSpell(query);
            } else if (type === 'monster') {
                result = await DataService.getMonster(query);
            } else if (type === 'item') {
                result = await DataService.getItem(query);
            }

            if (result) {
                log.aiTool('lookupEntityStats', 'Entity found', { name: result.name });
                return {
                    found: true,
                    data: result
                };
            } else {
                log.aiTool('lookupEntityStats', 'Entity not found', { query });
                return {
                    found: false,
                    message: `Could not find ${type} "${query}" in the database or manual.`
                };
            }

        } catch (error: any) {
            log.error('Error in lookupEntityStats tool', { error: error.message });
            return {
                found: false,
                message: `Error looking up entity: ${error.message}`
            };
        }
    }
);
