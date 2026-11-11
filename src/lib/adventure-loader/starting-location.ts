/**
 * Única fuente de verdad para decidir en qué localización empieza una aventura.
 *
 * El conversor PDF → JSON guarda la sala inicial en `settings.startingLocationId`; el esquema
 * también admite `startingLocationId` en la raíz. Antes cada parte del código miraba en un sitio
 * distinto: el juego solo leía la raíz y acababa empezando en `locations[0]` (una sala vacía),
 * mientras que el arnés de escenarios leía ambos y no detectaba el fallo.
 *
 * Orden: raíz → settings → primera localización. Un ID que no exista se ignora.
 */
export function resolveStartingLocationId(adventureData: any): string | undefined {
    const locations: any[] = Array.isArray(adventureData?.locations) ? adventureData.locations : [];
    const exists = (id: unknown): id is string =>
        typeof id === 'string' && id.length > 0 && locations.some(l => l?.id === id);

    const candidates = [adventureData?.startingLocationId, adventureData?.settings?.startingLocationId];
    for (const candidate of candidates) {
        if (exists(candidate)) return candidate;
    }
    return locations[0]?.id;
}
