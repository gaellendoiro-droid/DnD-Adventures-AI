
'use server';

/**
 * Looks up an entity from the adventure data string.
 * This is a server-side utility function that can be used by other server actions or tools.
 */
export async function lookupAdventureEntityInDb(entityName: string, gameState: string): Promise<any | null> {
    let adventureData: any = null;
    if (gameState) {
      try {
        adventureData = JSON.parse(gameState);
      } catch (e) {
        console.error("Failed to parse gameState JSON in lookupAdventureEntityInDb");
        return null;
      }
    }

    if (!adventureData) {
      return null;
    }

    const allData = [...(adventureData.locations || []), ...(adventureData.entities || [])];
    const result = allData.find((item: any) => 
        item.id === entityName || (item.name && typeof item.name === 'string' && item.name.toLowerCase() === entityName.toLowerCase())
    );

    return result || null;
}
