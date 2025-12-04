
import { AdventureDataSchema } from '@/lib/schemas';
import { z } from 'zod';

export interface ParsedAdventure {
    adventureTitle: string;
    adventureSummary: string;
    adventureData: any;
}

export function parseAdventureFast(jsonContent: string): ParsedAdventure {
    let rawData: any;

    try {
        rawData = JSON.parse(jsonContent);
    } catch (e) {
        throw new Error("Invalid JSON content");
    }

    // Extraer título y resumen para la interfaz
    const adventureTitle = rawData.adventureTitle || rawData.title || rawData.name || "Aventura sin título";
    const adventureSummary = rawData.adventureSummary || rawData.summary || rawData.description || "Sin resumen disponible.";

    // Normalizar datos para cumplir con el esquema AdventureDataSchema
    // El esquema espera 'title' y 'summary', no 'adventureTitle' y 'adventureSummary'
    let normalizedAdventureData = {
        ...rawData,
        // Asegurar que existan title y summary para el esquema
        title: rawData.title || rawData.adventureTitle || rawData.name || adventureTitle,
        summary: rawData.summary || rawData.adventureSummary || rawData.description || adventureSummary,
    };

    // Eliminar propiedades duplicadas/alternativas si existen
    if (normalizedAdventureData.adventureTitle) delete normalizedAdventureData.adventureTitle;
    if (normalizedAdventureData.adventureSummary) delete normalizedAdventureData.adventureSummary;
    if (normalizedAdventureData.name && normalizedAdventureData.title) delete normalizedAdventureData.name;
    if (normalizedAdventureData.description && normalizedAdventureData.summary) delete normalizedAdventureData.description;

    // Sanitizar los datos para eliminar referencias rotas (conexiones a ubicaciones inexistentes)
    normalizedAdventureData = sanitizeAdventureData(normalizedAdventureData);

    return {
        adventureTitle,
        adventureSummary,
        adventureData: normalizedAdventureData
    };
}

function sanitizeAdventureData(data: any): any {
    if (!data.locations || !Array.isArray(data.locations)) return data;

    const locationIds = new Set(data.locations.map((l: any) => l.id));

    data.locations.forEach((loc: any) => {
        // Sanitizar exits
        if (loc.exits && Array.isArray(loc.exits)) {
            const originalLength = loc.exits.length;
            const validExits: any[] = [];

            loc.exits.forEach((exit: any) => {
                const targetId = typeof exit === 'string' ? exit : exit?.toLocationId;
                if (targetId && locationIds.has(targetId)) {
                    validExits.push(exit);
                } else {
                    // Convertir exit roto en interactable
                    if (!loc.interactables) loc.interactables = [];
                    const description = typeof exit === 'string' ? "Una salida sin destino claro." : (exit.description || "Una salida misteriosa.");

                    loc.interactables.push({
                        name: "Camino Bloqueado o Inaccesible",
                        description: `${description} (El camino parece cortado o no lleva a ninguna parte conocida).`,
                        interactionResults: [{
                            action: "Investigar el camino",
                            result: "Intentas avanzar pero te das cuenta de que el camino está bloqueado, derrumbado o simplemente termina abruptamente. No puedes continuar por aquí."
                        }]
                    });
                }
            });

            loc.exits = validExits;

            if (loc.exits.length < originalLength) {
                console.warn(`[Sanitizer] Converted ${originalLength - loc.exits.length} broken exits to interactables in location '${loc.id}'`);
            }
        }

        // Sanitizar connections (alias)
        if (loc.connections && Array.isArray(loc.connections)) {
            const originalLength = loc.connections.length;
            const validConnections: any[] = [];

            loc.connections.forEach((conn: any) => {
                const targetId = typeof conn === 'string' ? conn : (conn?.targetId || conn?.toLocationId);
                if (targetId && locationIds.has(targetId)) {
                    validConnections.push(conn);
                } else {
                    // Convertir connection rota en interactable
                    if (!loc.interactables) loc.interactables = [];
                    const description = typeof conn === 'string' ? "Una conexión sin destino claro." : (conn.description || "Una conexión misteriosa.");

                    loc.interactables.push({
                        name: "Paso Bloqueado",
                        description: `${description} (El paso parece obstruido).`,
                        interactionResults: [{
                            action: "Examinar el paso",
                            result: "El paso está bloqueado y no permite el tránsito."
                        }]
                    });
                }
            });

            loc.connections = validConnections;

            if (loc.connections.length < originalLength) {
                console.warn(`[Sanitizer] Converted ${originalLength - loc.connections.length} broken connections to interactables in location '${loc.id}'`);
            }
        }

        // Sanitizar startingLocationId si es inválido
        if (data.startingLocationId && !locationIds.has(data.startingLocationId)) {
            console.warn(`[Sanitizer] Invalid startingLocationId '${data.startingLocationId}' removed.`);
            delete data.startingLocationId;
        }
    });

    return data;
}
