import { setAdventureDataCache, getAdventureData } from '@/app/game-state-actions';
import { processPlayerAction } from '@/app/actions';
import { AdventureLoadError, AdventureLoadErrorType } from './error-handler';
import { Party } from '@/lib/types';
import { logClient } from '@/lib/logger-client';

export interface InitializationResult {
    success: boolean;
    initialGameData?: any; // Using any for GameState to avoid circular deps or complex imports for now
    error?: AdventureLoadError;
}

export async function initializeGame(
    adventureData: any,
    initialParty: Party,
    adventureTitle: string
): Promise<InitializationResult> {
    try {
        logClient.info('Initializing game...', { component: 'GameInitializer' });

        // 1. Actualizar cache del servidor
        await setAdventureDataCache(adventureData);

        // 2. Verificar que el cache se actualizó correctamente
        // Esto es crucial para asegurar que las siguientes llamadas al servidor tengan acceso a los datos
        const cachedData = await getAdventureData();

        if (!cachedData || cachedData.adventureId !== adventureData.adventureId) {
            throw new AdventureLoadError(
                AdventureLoadErrorType.SERVER_ERROR,
                'Error de sincronización con el servidor',
                'No se pudieron guardar los datos de la aventura en el servidor. Por favor, intenta de nuevo.'
            );
        }

        logClient.debug('Server cache verified', { component: 'GameInitializer' });

        // 3. Preparar estado inicial para la primera acción
        // Buscamos la ubicación inicial (o la primera si no hay definida)
        const startingLocationId = adventureData.startingLocationId || adventureData.locations[0]?.id;
        const startingLocation = adventureData.locations.find((l: any) => l.id === startingLocationId) || adventureData.locations[0];

        if (!startingLocation) {
            throw new AdventureLoadError(
                AdventureLoadErrorType.VALIDATION_ERROR,
                'Ubicación inicial no encontrada',
                'No se pudo determinar la ubicación de inicio de la aventura.'
            );
        }

        const initialGameState = {
            messages: [],
            party: initialParty,
            inCombat: false,
            turnIndex: 0,
            locationId: startingLocation.id,
            playerAction: `El jugador comienza la aventura "${adventureTitle}". Describe la situación inicial y el entorno. Los compañeros permanecen en silencio y expectantes, esperando la primera decisión del jugador.`,
            diceRolls: [],
            enemies: [],
            enemiesByLocation: {},
            conversationHistory: [],
        };

        // 4. Obtener la narración inicial
        // Priorizar narración pre-generada del JSON para carga instantánea
        const preGeneratedIntro = adventureData.introductoryNarration || adventureData.openingScene;

        let initialMessages: any[];
        let finalLocationId = initialGameState.locationId;
        let finalInCombat = false;
        let finalEnemies: any[] = [];
        let finalEnemiesByLocation: any = {};

        if (preGeneratedIntro) {
            // Usar narración pre-generada (instantáneo ⚡)
            logClient.info('Using pre-generated introduction from JSON', { component: 'GameInitializer' });
            initialMessages = [{
                id: `intro-${Date.now()}`,
                sender: 'DM',
                content: preGeneratedIntro,
                timestamp: new Date().toISOString()
            }];
        } else {
            // Generar con IA (fallback para aventuras sin intro)
            logClient.info('Generating introduction with AI...', { component: 'GameInitializer' });
            const result = await processPlayerAction(initialGameState);

            if (result.error) {
                throw new AdventureLoadError(
                    AdventureLoadErrorType.AI_ERROR,
                    'Error al iniciar la narración',
                    'La IA no pudo generar el inicio de la aventura. ' + result.error
                );
            }

            initialMessages = (result.messages || [])
                .filter((msg: any) => msg.sender === 'DM' || msg.sender === 'System')
                .map((msg: any, index: number) => ({
                    ...msg,
                    id: msg.id || `init-msg-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`
                }));

            finalLocationId = result.nextLocationId || initialGameState.locationId;
            finalInCombat = result.inCombat || false;
            finalEnemies = result.enemies || [];
            finalEnemiesByLocation = result.enemiesByLocation || {};
        }

        // 5. Retornar éxito con los datos iniciales completos
        return {
            success: true,
            initialGameData: {
                ...initialGameState,
                messages: initialMessages,
                locationId: finalLocationId,
                inCombat: finalInCombat,
                enemies: finalEnemies,
                enemiesByLocation: finalEnemiesByLocation,
            }
        };

    } catch (error: any) {
        logClient.error('Game initialization failed', { component: 'GameInitializer' }, error);

        // Si ya es un AdventureLoadError, lo propagamos
        if (error instanceof AdventureLoadError) {
            return { success: false, error };
        }

        // Si es otro error, lo envolvemos
        return {
            success: false,
            error: new AdventureLoadError(
                AdventureLoadErrorType.UNKNOWN_ERROR,
                'Error inesperado al iniciar el juego',
                'Ocurrió un error interno al preparar la partida.',
                { originalError: error.message }
            )
        };
    }
}
