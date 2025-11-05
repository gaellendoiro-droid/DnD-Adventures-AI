"use client";

import { useState } from "react";
import type { Character, GameMessage, DiceRoll } from "@/lib/types";
import { initialParty, initialMessages } from "@/lib/data";
import { AppHeader } from "@/components/layout/app-header";
import { MainMenu } from "@/components/game/main-menu";
import { GameView } from "@/components/game/game-view";
import { useToast } from "@/hooks/use-toast";
import { parseAdventureFromJson } from "@/ai/flows/parse-adventure-from-json";
import { runDungeonMasterTurn } from "./actions";


export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameInProgress, setGameInProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initialGameData, setInitialGameData] = useState<{
    party: Character[];
    messages: GameMessage[];
    diceRolls: DiceRoll[];
    gameState: string;
    locationDescription: string;
  } | null>(null);

  const { toast } = useToast();
  
  const handleNewGame = () => {
    setInitialGameData({
      party: initialParty,
      messages: initialMessages,
      diceRolls: [],
      gameState: "Initial state: The party is in the Yawning Portal inn.",
      locationDescription: "Se encuentran en 'El Portal Bostezante', una posada legendaria en el corazón de la Costa de la Espada. El aire está cargado con el aroma de estofado de carne y el humo de la leña crepitante en el hogar. Un murmullo constante de conversaciones y risas llena la sala común. Podrían acercarse a la barra y charlar con el posadero, buscar una mesa libre para planificar su siguiente paso, o quizás averiguar más sobre la figura solitaria y encapuchada que les observa desde una esquina oscura. El ambiente es un hervidero de oportunidades y peligros latentes. ¿Qué hacen?",
    })
    setGameInProgress(true);
    setGameStarted(true);
  };
  
  const handleGoToMenu = () => {
    setGameStarted(false);
  }

  const handleContinueGame = () => {
    if(initialGameData) {
      setGameStarted(true);
    }
  };

  const handleLoadAdventure = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setIsLoading(true);
        const jsonContent = e.target?.result as string;
        toast({ title: "Procesando aventura...", description: "La IA está analizando el archivo JSON." });
        
        const parsedAdventure = await parseAdventureFromJson({ adventureJson: jsonContent });
        const newGameState = JSON.stringify(parsedAdventure.adventureData);
        
        toast({ title: "Generando introducción...", description: "El Dungeon Master está preparando la escena." });
        
        const playerCharacter = initialParty.find(c => c.controlledBy === 'Player');
        const { dmNarration, updatedGameState, nextLocationDescription } = await runDungeonMasterTurn(
            "Comenzar la aventura.",
            "",
            newGameState,
            parsedAdventure.adventureSummary,
            playerCharacter
        );

        const messages: GameMessage[] = [];
        if (dmNarration) {
          messages.push(dmNarration)
        }

        setInitialGameData({
          party: initialParty,
          messages: messages,
          diceRolls: [],
          gameState: updatedGameState || newGameState,
          locationDescription: nextLocationDescription || parsedAdventure.adventureSummary,
        });
        
        setGameInProgress(true);
        setGameStarted(true);

        toast({ title: "¡Aventura cargada y lista!", description: "La nueva aventura está lista para jugar." });

      } catch (error) {
        console.error("Error parsing or starting adventure:", error);
        toast({
          variant: 'destructive',
          title: "Error al cargar la aventura",
          description: "No se pudo procesar el archivo. Asegúrate de que sea un JSON válido.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };
  
  const handleLoadGame = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setIsLoading(true);
        const jsonContent = e.target?.result as string;
        const saveData = JSON.parse(jsonContent);

        // Basic validation
        if (!saveData.party || !saveData.messages || !saveData.gameState) {
          throw new Error("El archivo de guardado no es válido.");
        }

        setInitialGameData({
          party: saveData.party,
          messages: saveData.messages,
          diceRolls: saveData.diceRolls || [],
          gameState: saveData.gameState,
          locationDescription: saveData.locationDescription || "",
        });

        setGameInProgress(true);
        setGameStarted(true);

        toast({
          title: "Partida cargada",
          description: "¡Tu aventura continúa!",
        });

      } catch (error) {
        console.error("Error loading save file:", error);
        toast({
          variant: 'destructive',
          title: "Error al cargar la partida",
          description: "No se pudo procesar el archivo. Asegúrate de que sea un archivo de guardado válido.",
        });
      } finally {
        setIsLoading(false);
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
              const jsonString = JSON.stringify(saveData, null, 2);
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
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
