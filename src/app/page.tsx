
"use client";

import { useState } from "react";
import type { Character, GameMessage, DiceRoll, Combatant } from "@/lib/types";
import { initialParty } from "@/lib/initial-party";
import { AppHeader } from "@/components/layout/app-header";
import { MainMenu } from "@/components/game/main-menu";
import { GameView } from "@/components/game/game-view";
import { useToast } from "@/hooks/use-toast";
import { logClient } from "@/lib/logger-client";
import { CharacterSchema } from "@/lib/schemas";
import { z } from "zod";
import { AdventureLoadProgress, LoadStep } from "@/components/game/adventure-load-progress";

interface InitialGameData {
  party: Character[];
  messages: GameMessage[];
  diceRolls: DiceRoll[];
  locationId: string;
  inCombat?: boolean;
  initiativeOrder?: Combatant[];
  turnIndex?: number;
  enemies?: any[]; // Deprecated: kept for backward compatibility
  enemiesByLocation?: Record<string, any[]>; // New: enemies by location
  openDoors?: Record<string, boolean>; // Map of "locationId:direction" -> isOpen
}

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameInProgress, setGameInProgress] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [loadStep, setLoadStep] = useState<LoadStep>('parsing');
  const [loadError, setLoadError] = useState<{ title: string; message: string } | null>(null);
  const [initialGameData, setInitialGameData] = useState<InitialGameData | null>(null);
  const [adventureData, setAdventureData] = useState<any | null>(null);
  const [adventureName, setAdventureName] = useState<string | undefined>(undefined);


  const { toast } = useToast();

  // Schema for validating save game data
  const SaveGameDataSchema = z.object({
    savedAt: z.string().optional(),
    party: z.array(CharacterSchema),
    messages: z.array(z.any()),
    diceRolls: z.array(z.any()).optional(),
    locationId: z.string(),
    inCombat: z.boolean().optional(),
    initiativeOrder: z.array(z.any()).optional(),
    enemies: z.array(z.any()).optional(), // Deprecated: kept for backward compatibility
    enemiesByLocation: z.record(z.string(), z.array(z.any())).optional(), // New: enemies by location
    turnIndex: z.number().optional(),
    openDoors: z.record(z.string(), z.boolean()).optional(), // Map of "locationId:direction" -> isOpen
  });

  // Schema for validating adventure data structure
  const AdventureDataSchema = z.object({
    locations: z.array(z.object({
      id: z.string(),
    })).min(1, "La aventura debe tener al menos una ubicación"),
  });

  const handleNewGame = async () => {
    try {
      setLoading('newGame');
      toast({ title: "Creando nueva aventura...", description: "Cargando el módulo de la aventura..." });

      const response = await fetch('/api/load-adventure');
      if (!response.ok) {
        throw new Error(`Failed to load adventure: ${response.statusText}`);
      }
      const defaultAdventure = await response.json();

      // Validate adventure data structure
      AdventureDataSchema.parse(defaultAdventure);

      // Initialize Game using the shared logic (Cache + First Action/Intro)
      const { initializeGame } = await import('@/lib/adventure-loader/game-initializer');

      const initResult = await initializeGame(
        defaultAdventure,
        initialParty,
        defaultAdventure.title || "Aventura Predeterminada"
      );

      if (!initResult.success) {
        throw initResult.error;
      }

      setAdventureData(defaultAdventure);
      setAdventureName(defaultAdventure.title || "Aventura Predeterminada");
      setInitialGameData(initResult.initialGameData);

      setGameInProgress(true);
      setGameStarted(true);

      toast({ title: "¡Aventura lista!", description: "Tu nueva aventura está lista para empezar." });

    } catch (error: any) {
      logClient.uiError('Page', 'Error starting new game', error);
      toast({
        variant: 'destructive',
        title: "Error al crear la partida",
        description: "No se pudo iniciar la nueva aventura.",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleGoToMenu = () => {
    setGameStarted(false);
  }

  const handleContinueGame = () => {
    if (initialGameData) {
      setGameStarted(true);
    }
  };

  const handleLoadAdventure = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoading('loadAdventure');
        setLoadStep('parsing');
        setLoadError(null);

        const jsonContent = e.target?.result as string;

        logClient.info('Starting adventure load process', { fileName: file.name, size: file.size });

        // 1. Parse Adventure (Fast Parser -> Cache -> AI Fallback)
        const { parseAdventureFromJson } = await import('@/ai/flows/parse-adventure-from-json');
        const parsedAdventure = await parseAdventureFromJson({ adventureJson: jsonContent });

        if (!parsedAdventure.adventureData) {
          throw new Error("No se pudieron extraer los datos de la aventura.");
        }

        setLoadStep('validating');

        // 2. Validate Structure (Robust Validation)
        const { validateAdventureStructure, formatValidationErrors } = await import('@/lib/adventure-loader/validator');
        const validationResult = validateAdventureStructure(parsedAdventure.adventureData);

        if (!validationResult.valid) {
          // Log detallado de errores para debugging
          logClient.error('Validation failed', {
            errors: validationResult.errors,
            adventureDataKeys: Object.keys(parsedAdventure.adventureData),
            hasLocations: !!parsedAdventure.adventureData.locations,
            locationCount: parsedAdventure.adventureData.locations?.length
          });

          const { AdventureLoadError, AdventureLoadErrorType } = await import('@/lib/adventure-loader/error-handler');
          throw new AdventureLoadError(
            AdventureLoadErrorType.VALIDATION_ERROR,
            'Error de validación en la aventura',
            'El archivo de aventura tiene errores estructurales.',
            { errors: formatValidationErrors(validationResult.errors) }
          );
        }

        if (validationResult.warnings.length > 0) {
          logClient.warn('Adventure loaded with warnings', { warnings: validationResult.warnings });
        }

        setLoadStep('connecting');

        // 3. Ensure Server is Ready
        const { retryWithExponentialBackoff } = await import('@/ai/flows/retry-utils');
        await retryWithExponentialBackoff(
          async () => {
            const res = await fetch('/api/health');
            if (!res.ok) throw new Error('Server not ready');
          },
          3, 100, 'checkServerHealth'
        );

        setLoadStep('initializing');

        // 4. Initialize Game (Cache + First Action)
        const { initializeGame } = await import('@/lib/adventure-loader/game-initializer');

        setLoadStep('narrating');

        const initResult = await initializeGame(
          parsedAdventure.adventureData,
          initialParty,
          parsedAdventure.adventureTitle
        );

        if (!initResult.success) {
          throw initResult.error;
        }

        setLoadStep('complete');

        // 5. Update UI State
        setAdventureData(parsedAdventure.adventureData);
        setAdventureName(parsedAdventure.adventureTitle);
        setInitialGameData(initResult.initialGameData);
        setGameInProgress(true);
        setGameStarted(true);

        toast({
          title: "¡Aventura lista!",
          description: `Has comenzado "${parsedAdventure.adventureTitle}".`
        });

      } catch (error: any) {
        // Enhanced Error Handling
        const { classifyError, getUserFriendlyMessage } = await import('@/lib/adventure-loader/error-handler');
        const classifiedError = classifyError(error);
        const userMessage = getUserFriendlyMessage(classifiedError);

        logClient.uiError('Page', 'Error loading adventure', classifiedError);

        setLoadError({
          title: userMessage.title,
          message: userMessage.message
        });

        setLoadStep('error');

        toast({
          variant: 'destructive',
          title: userMessage.title || "Error",
          description: userMessage.message,
        });
      } finally {
        if (loadStep !== 'error') {
          setLoading(null);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleLoadGame = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setLoading('loadGame');
        const jsonContent = e.target?.result as string;
        const saveData = JSON.parse(jsonContent);

        // Validate save data structure
        const validatedSaveData = SaveGameDataSchema.parse(saveData);

        // Adventure data is not saved in the save file anymore, it's loaded from source
        fetch('/api/load-adventure').then(res => res.json()).then(setAdventureData);

        setInitialGameData({
          party: validatedSaveData.party,
          messages: validatedSaveData.messages,
          diceRolls: validatedSaveData.diceRolls || [],
          locationId: validatedSaveData.locationId,
          inCombat: validatedSaveData.inCombat || false,
          openDoors: validatedSaveData.openDoors || {},
          initiativeOrder: validatedSaveData.initiativeOrder || [],
          turnIndex: validatedSaveData.turnIndex || 0,
          enemies: validatedSaveData.enemies || [], // Deprecated: kept for backward compatibility
          enemiesByLocation: validatedSaveData.enemiesByLocation || {}, // New: enemies by location
        });

        setGameInProgress(true);
        setGameStarted(true);

        toast({
          title: "Partida cargada",
          description: "¡Tu aventura continúa!",
        });

      } catch (error: any) {
        logClient.uiError('Page', 'Error loading save file', error);
        toast({
          variant: 'destructive',
          title: "Error al cargar la partida",
          description: "No se pudo procesar el archivo. Asegúrate de que sea un archivo de guardado válido.",
        });
      } finally {
        setLoading(null);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-svh bg-background text-foreground dark:bg-background dark:text-foreground">
      {!gameStarted && <AppHeader onGoToMenu={handleGoToMenu} showMenuButton={gameStarted} />}

      {loading === 'loadAdventure' ? (
        <div className="flex items-center justify-center h-full">
          <AdventureLoadProgress
            currentStep={loadStep}
            error={loadError}
            onCancel={() => {
              setLoading(null);
              setLoadError(null);
            }}
            onRetry={() => {
              setLoading(null);
              setLoadError(null);
              toast({ description: "Por favor, selecciona el archivo de nuevo." });
            }}
          />
        </div>
      ) : gameStarted && initialGameData ? (
        <GameView
          initialData={initialGameData}
          onGoToMenu={handleGoToMenu}
          adventureName={adventureName || "Aventura"}
          adventureData={adventureData}
          onSaveGame={(saveData) => {
            // We don't save the gameState anymore as it's static
            const { gameState, ...rest } = saveData;

            logClient.info('Preparing save file download', {
              component: 'Page',
              action: 'saveGameDownload',
              partySize: saveData.party?.length || 0,
              messagesCount: saveData.messages?.length || 0,
              diceRollsCount: saveData.diceRolls?.length || 0,
              locationId: saveData.locationId,
              inCombat: saveData.inCombat,
              turnIndex: saveData.turnIndex,
            });

            const jsonString = JSON.stringify(rest, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            link.download = `dnd-adventure-save-${timestamp}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            logClient.info('Save file downloaded successfully', {
              component: 'Page',
              action: 'saveGameDownload',
              filename: link.download,
            });

            toast({
              title: "Partida guardada",
              description: "El archivo de guardado se ha descargado en tu dispositivo."
            })
          }}
        />
      ) : (
        <MainMenu
          onNewGame={handleNewGame}
          onContinueGame={handleContinueGame}
          onLoadAdventure={handleLoadAdventure}
          onLoadGame={handleLoadGame}
          gameInProgress={gameInProgress}
          loading={loading}
        />
      )}
    </div>
  );
}
