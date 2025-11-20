
"use client";

import { useState } from "react";
import type { Character, GameMessage, DiceRoll, Combatant } from "@/lib/types";
import { initialParty, initialMessage } from "@/lib/new-game-data";
import { AppHeader } from "@/components/layout/app-header";
import { MainMenu } from "@/components/game/main-menu";
import { GameView } from "@/components/game/game-view";
import { useToast } from "@/hooks/use-toast";
// Lazy-loaded to avoid initializing Genkit on page load:
// import { parseAdventureFromJson } from "@/ai/flows/parse-adventure-from-json";
// import { processPlayerAction, setAdventureDataCache } from "./actions";
import { logClient } from "@/lib/logger-client";
import { CharacterSchema } from "@/lib/schemas";
import { z } from "zod";

interface InitialGameData {
  party: Character[];
  messages: GameMessage[];
  diceRolls: DiceRoll[];
  locationId: string;
  inCombat?: boolean;
  initiativeOrder?: Combatant[];
  turnIndex?: number;
  enemies?: any[];
}

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameInProgress, setGameInProgress] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [initialGameData, setInitialGameData] = useState<InitialGameData | null>(null);
  const [adventureData, setAdventureData] = useState<any | null>(null);


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
    enemies: z.array(z.any()).optional(),
    turnIndex: z.number().optional(),
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

      setAdventureData(defaultAdventure);

      // Update server-side cache with the default adventure
      const { setAdventureDataCache } = await import('./actions');
      await setAdventureDataCache(defaultAdventure);

      const firstLocation = defaultAdventure.locations[0];

      if (!firstLocation || !firstLocation.id) {
        throw new Error("La aventura no tiene una ubicación inicial válida.");
      }

      setInitialGameData({
        party: initialParty,
        messages: [initialMessage],
        diceRolls: [],
        locationId: firstLocation.id,
        inCombat: false,
        initiativeOrder: [],
        turnIndex: 0,
      });

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
        const jsonContent = e.target?.result as string;
        toast({ title: "Procesando aventura...", description: "La IA está analizando el archivo JSON." });

        logClient.info('Starting adventure JSON load', {
          component: 'Page',
          fileName: file.name,
          fileSize: file.size,
          jsonLength: jsonContent.length,
        });

        // Add a small delay to ensure server is ready after hot reload
        // This helps avoid connection timeouts that can occur immediately after code changes
        logClient.debug('Waiting 100ms for server to stabilize after hot reload', {
          component: 'Page',
        });
        await new Promise(resolve => setTimeout(resolve, 100));

        const startTime = Date.now();
        const { parseAdventureFromJson } = await import('@/ai/flows/parse-adventure-from-json');
        const parsedAdventure = await parseAdventureFromJson({ adventureJson: jsonContent });
        const duration = Date.now() - startTime;

        logClient.info('Adventure JSON parsed successfully', {
          component: 'Page',
          durationMs: duration,
          title: parsedAdventure.adventureTitle,
          adventureId: parsedAdventure.adventureData?.adventureId,
        });

        // Validate adventure data structure
        if (!parsedAdventure.adventureData) {
          throw new Error("El archivo JSON no contiene datos de aventura válidos.");
        }

        AdventureDataSchema.parse(parsedAdventure.adventureData);

        // Update local state
        setAdventureData(parsedAdventure.adventureData);

        // Update server-side cache with the loaded adventure (MUST complete before processPlayerAction)
        logClient.info('Updating server-side adventure cache', {
          component: 'Page',
          adventureId: parsedAdventure.adventureData.adventureId,
          locationsCount: parsedAdventure.adventureData.locations?.length || 0,
        });
        const { setAdventureDataCache, processPlayerAction } = await import('./actions');
        await setAdventureDataCache(parsedAdventure.adventureData);
        logClient.info('Server-side adventure cache updated', {
          component: 'Page',
          adventureId: parsedAdventure.adventureData.adventureId,
        });

        toast({ title: "Generando introducción...", description: "El Dungeon Master está preparando la escena." });

        const firstLocation = parsedAdventure.adventureData.locations[0];

        if (!firstLocation || !firstLocation.id) {
          throw new Error("La aventura no tiene una ubicación inicial válida.");
        }

        // conversationHistory should be an empty array, not an empty string
        const result = await processPlayerAction({
          playerAction: "Comenzar la aventura.",
          party: initialParty,
          locationId: firstLocation.id,
          inCombat: false,
          conversationHistory: [],
          turnIndex: 0,
        });

        let messages: GameMessage[] = result.messages || [];

        // If no messages were generated, create an initial message from the location description
        if (messages.length === 0 && firstLocation.description) {
          messages = [{
            id: `initial-${firstLocation.id}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            sender: 'DM',
            content: `<p>${firstLocation.description}</p>`,
            originalContent: firstLocation.description,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }];
        }

        // Ensure all messages have unique IDs
        messages = messages.map((msg, index) => ({
          ...msg,
          id: msg.id || `msg-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 11)}`,
        }));

        setInitialGameData({
          party: initialParty,
          messages: messages,
          diceRolls: [],
          locationId: firstLocation.id,
          inCombat: false,
          initiativeOrder: [],
          turnIndex: 0,
        });

        setGameInProgress(true);
        setGameStarted(true);

        toast({ title: "¡Aventura cargada y lista!", description: "La nueva aventura está lista para jugar." });

      } catch (error: any) {
        logClient.uiError('Page', 'Error parsing or starting adventure', error);
        toast({
          variant: 'destructive',
          title: "Error al cargar la aventura",
          description: "No se pudo procesar el archivo. Asegúrate de que sea un JSON válido.",
        });
      } finally {
        setLoading(null);
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
          initiativeOrder: validatedSaveData.initiativeOrder || [],
          turnIndex: validatedSaveData.turnIndex || 0,
          enemies: validatedSaveData.enemies || [],
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
      <AppHeader onGoToMenu={handleGoToMenu} showMenuButton={gameStarted} />
      {gameStarted && initialGameData ? (
        <GameView
          initialData={initialGameData}
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
