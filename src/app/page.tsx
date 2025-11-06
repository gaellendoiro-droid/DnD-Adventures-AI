

"use client";

import { useState } from "react";
import type { Character, GameMessage, DiceRoll, Combatant } from "@/lib/types";
import { initialParty, initialMessage } from "@/lib/data";
import { AppHeader } from "@/components/layout/app-header";
import { MainMenu } from "@/components/game/main-menu";
import { GameView } from "@/components/game/game-view";
import { useToast } from "@/hooks/use-toast";
import { parseAdventureFromJson } from "@/ai/flows/parse-adventure-from-json";
import { runTurn } from "./actions";

interface InitialGameData {
  party: Character[];
  messages: GameMessage[];
  diceRolls: DiceRoll[];
  gameState: string;
  locationId: string;
  inCombat?: boolean;
  initiativeOrder?: Combatant[];
}

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameInProgress, setGameInProgress] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [initialGameData, setInitialGameData] = useState<InitialGameData | null>(null);
  const [adventureData, setAdventureData] = useState<any | null>(null);


  const { toast } = useToast();
  
  const handleNewGame = async () => {
    try {
      setLoading('newGame');
      toast({ title: "Creando nueva aventura...", description: "Cargando el módulo de la aventura..." });
      
      const response = await fetch('/api/load-adventure');
      const defaultAdventure = await response.json();
      setAdventureData(defaultAdventure);
      
      const newGameState = JSON.stringify(defaultAdventure);
      const firstLocation = defaultAdventure.locations[0];
      
      setInitialGameData({
        party: initialParty,
        messages: [initialMessage],
        diceRolls: [],
        gameState: newGameState,
        locationId: firstLocation.id,
        inCombat: false,
        initiativeOrder: [],
      });
      
      setGameInProgress(true);
      setGameStarted(true);

      toast({ title: "¡Aventura lista!", description: "Tu nueva aventura está lista para empezar." });

    } catch (error) {
      console.error("Error starting new game:", error);
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
    if(initialGameData) {
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
        
        const parsedAdventure = await parseAdventureFromJson({ adventureJson: jsonContent });
        const newGameState = JSON.stringify(parsedAdventure.adventureData);
        setAdventureData(parsedAdventure.adventureData);
        
        toast({ title: "Generando introducción...", description: "El Dungeon Master está preparando la escena." });
        
        const firstLocation = parsedAdventure.adventureData.locations[0];

        const { dmNarration } = await runTurn(
            "Comenzar la aventura.",
            initialParty,
            firstLocation.id,
            newGameState,
            ""
        );

        const messages: GameMessage[] = [];
        if (dmNarration) {
          messages.push(dmNarration)
        }

        setInitialGameData({
          party: initialParty,
          messages: messages,
          diceRolls: [],
          gameState: newGameState,
          locationId: firstLocation.id,
          inCombat: false,
          initiativeOrder: [],
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
        const adventure = JSON.parse(saveData.gameState);
        setAdventureData(adventure);

        if (!saveData.party || !saveData.messages || !saveData.gameState || !saveData.locationId) {
          throw new Error("El archivo de guardado no es válido.");
        }

        setInitialGameData({
          party: saveData.party,
          messages: saveData.messages,
          diceRolls: saveData.diceRolls || [],
          gameState: saveData.gameState,
          locationId: saveData.locationId,
          inCombat: saveData.inCombat || false,
          initiativeOrder: saveData.initiativeOrder || [],
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
          loading={loading}
        />
      )}
    </div>
  );
}

// Create a new API route to serve the JSON file
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const adventureData = await import("@/../JSON_adventures/el-dragon-del-pico-agujahelada.json");
    return new Response(JSON.stringify(adventureData.default), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

    