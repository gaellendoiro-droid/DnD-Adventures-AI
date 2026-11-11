'use server';

import { DataService } from '@/lib/data-service';
import { log } from '@/lib/logger';
import { getAdventureData } from '@/app/game-state-actions';

export type SearchResult = {
    found: boolean;
    source: 'local' | 'ai' | 'adventure' | 'none';
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
        // 1. Prioridad: Buscar en los datos de la aventura actual (local de la partida)
        const adventureData = await getAdventureData();
        if (adventureData) {
            const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            if (type === 'monster' && adventureData.entities) {
                const foundEntity = adventureData.entities.find((e: any) => {
                    const nameNorm = e.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    const idNorm = e.id.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    return nameNorm.includes(normalizedQuery) || idNorm.includes(normalizedQuery);
                });

                if (foundEntity) {
                    log.info(`🎯 Encontrada entidad de aventura para '${query}': ${foundEntity.name}`, { module: 'Actions' });
                    const stats = foundEntity.stats || {};
                    const mappedData = {
                        name: foundEntity.name,
                        size: foundEntity.size || stats.size || 'Mediano',
                        type: foundEntity.type || stats.type || 'Bestia',
                        alignment: foundEntity.alignment || stats.alignment || 'No alineado',
                        cr: stats.cr !== undefined ? stats.cr : (foundEntity.cr || 0),
                        ac: stats.ac !== undefined ? stats.ac : (foundEntity.ac || 10),
                        hp: stats.hp !== undefined ? (typeof stats.hp === 'number' ? stats.hp : (stats.hp.max || 10)) : (foundEntity.hp || 10),
                        speed: stats.speed || foundEntity.speed || '30 pies',
                        stats: {
                            str: stats.abilityScores?.fuerza || 10,
                            dex: stats.abilityScores?.destreza || 10,
                            con: stats.abilityScores?.constitución || 10,
                            int: stats.abilityScores?.inteligencia || 10,
                            wis: stats.abilityScores?.sabiduría || 10,
                            cha: stats.abilityScores?.carisma || 10
                        },
                        modifiers: {
                            str: stats.abilityModifiers?.fuerza,
                            dex: stats.abilityModifiers?.destreza,
                            con: stats.abilityModifiers?.constitución,
                            int: stats.abilityModifiers?.inteligencia,
                            wis: stats.abilityModifiers?.sabiduría,
                            cha: stats.abilityModifiers?.carisma
                        },
                        skills: stats.skills || foundEntity.skills || '',
                        senses: stats.senses || foundEntity.senses || '',
                        languages: stats.languages || foundEntity.languages || '',
                        damageVulnerabilities: stats.damageVulnerabilities || foundEntity.damageVulnerabilities || '',
                        damageResistances: stats.damageResistances || foundEntity.damageResistances || '',
                        damageImmunities: stats.damageImmunities || foundEntity.damageImmunities || '',
                        conditionImmunities: stats.conditionImmunities || foundEntity.conditionImmunities || '',
                        features: stats.features || foundEntity.features || [],
                        actions: stats.actions || foundEntity.actions || [],
                        reactions: stats.reactions || foundEntity.reactions || [],
                        legendaryActions: stats.legendaryActions || foundEntity.legendaryActions || [],
                        source: 'adventure'
                    };

                    return {
                        found: true,
                        type: 'monster',
                        source: 'adventure',
                        data: mappedData
                    };
                }
            }

            else if (type === 'item' && adventureData.items) {
                const foundItem = adventureData.items.find((i: any) => {
                    const nameNorm = i.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    const idNorm = i.id.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    return nameNorm.includes(normalizedQuery) || idNorm.includes(normalizedQuery);
                });

                if (foundItem) {
                    log.info(`🎯 Encontrado objeto de aventura para '${query}': ${foundItem.name}`, { module: 'Actions' });
                    return {
                        found: true,
                        type: 'item',
                        source: 'adventure',
                        data: {
                            name: foundItem.name,
                            type: foundItem.type || 'objeto',
                            rarity: foundItem.rarity || 'común',
                            description: foundItem.description || '',
                            weight: foundItem.weight || '',
                            price: foundItem.price || '',
                            mechanics: foundItem.properties || foundItem.mechanics || null,
                            source: 'adventure'
                        }
                    };
                }
            }
        }

        // 2. Caer a la búsqueda global del compendio si no está en la aventura
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
                    type: 'rule',
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
