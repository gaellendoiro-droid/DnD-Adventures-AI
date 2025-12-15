'use server';

import { DataService } from '@/lib/data-service';
import { log } from '@/lib/logger';

export type SearchResult = {
    found: boolean;
    source: 'local' | 'ai' | 'none';
    type?: 'monster' | 'spell' | 'item' | 'rule';
    data?: any;
    error?: string;
};

/**
 * Busca una entidad en el compendio.
 * Primero busca en local (rápido). Si no está, intenta hidratar con IA (lento).
 */
export async function searchCompendium(query: string, type: 'monster' | 'spell' | 'item' | 'rule' = 'monster'): Promise<SearchResult> {
    if (!query || query.length < 3) {
        return { found: false, source: 'none', error: "Query muy corta" };
    }

    log.info(`🔍 Buscador Universal: Buscando '${query}' (${type})...`, { module: 'Actions' });

    try {
        if (type === 'monster') {
            const monster = await DataService.getMonster(query);
            if (monster) {
                return {
                    found: true,
                    type: 'monster',
                    source: monster.source === 'manual_jugador_ia' ? 'ai' : 'local',
                    data: monster
                };
            }
        }
        else if (type === 'spell') {
            const spell = await DataService.getSpell(query);
            if (spell) {
                return {
                    found: true,
                    type: 'spell',
                    source: spell.source === 'manual_jugador_ia' ? 'ai' : 'local',
                    data: spell
                };
            }
        }
        else if (type === 'item') {
            const item = await DataService.getItem(query);
            if (item) {
                return {
                    found: true,
                    type: 'item',
                    source: item.source === 'manual_jugador_ia' ? 'ai' : 'local',
                    data: item
                };
            }
        }
        else if (type === 'rule') {
            const ruleText = await DataService.consultRule(query);
            if (ruleText) {
                return {
                    found: true,
                    type: 'rule', // type-casting necesario si 'rule' no está en el SearchResult type original, ahora lo arreglo
                    source: 'ai',
                    data: { text: ruleText }
                };
            }
        }

        return { found: false, source: 'none', error: "Entidad no encontrada" };

    } catch (error: any) {
        log.error("Error en Buscador Universal", { error: error.message });
        return { found: false, source: 'none', error: "Error interno del servidor" };
    }
}
