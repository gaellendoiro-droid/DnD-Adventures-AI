"use client";

import { useState, useEffect } from "react";
import type { Character, GameMessage, DiceRoll } from "@/lib/types";
import { initialParty, initialMessages } from "@/lib/data";
import { AppHeader } from "@/components/layout/app-header";
import { GameLayout } from "@/components/game/game-layout";
import { MainMenu } from "@/components/game/main-menu";
import { LeftPanel } from "@/components/layout/left-panel";
import { CharacterSheet } from "@/components/game/character-sheet";
import { ChatPanel } from "@/components/game/chat-panel";
import { parseAdventureFromJson } from "@/ai/flows/parse-adventure-from-json";
import { markdownToHtml } from "@/ai/flows/markdown-to-html";
import { useToast } from "@/hooks/use-toast";
import { handleOocMessage, generateNpcActions, runDungeonMasterTurn } from "./actions";

export default function Home() {
  const [party, setParty] = useState<Character[]>(initialParty);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [diceRolls, setDiceRolls] = useState<DiceRoll[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    party.find(c => c.controlledBy === 'Player') || null
  );
  const [isDMThinking, setIsDMThinking] = useState(false);
  const [gameState, setGameState] = useState("Initial state: The party is in the Yawning Portal inn.");
  const [locationDescription, setLocationDescription] = useState("You are in the Yawning Portal inn.");
  const [gameStarted, setGameStarted] = useState(false);
  const [gameInProgress, setGameInProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (gameStarted && !gameInProgress) {
      if (messages.length === 0) {
        setMessages(initialMessages);
        setLocationDescription("Se encuentran en 'El Portal Bostezante', una posada legendaria en el corazón de la Costa de la Espada. El aire está cargado con el aroma de estofado de carne y el humo de la leña crepitante en el hogar. Un murmullo constante de conversaciones y risas llena la sala común. Podrían acercarse a la barra y charlar con el posadero, buscar una mesa libre para planificar su siguiente paso, o quizás averiguar más sobre la figura solitaria y encapuchada que les observa desde una esquina oscura. El ambiente es un hervidero de oportunidades y peligros latentes. ¿Qué hacen?");
      }
      setGameInProgress(true);
    } else if (!gameStarted) {
      // Don't clear messages when just going to menu
    }
  }, [gameStarted, gameInProgress, messages.length]);

  const addMessage = (message: Omit<GameMessage, 'id' | 'timestamp'>) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        ...message,
        id: Date.now().toString() + Math.random(),
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  const addMessages = (newMessages: GameMessage[]) => {
    setMessages(prev => [...prev, ...newMessages]);
  }
  
  const addDiceRoll = (roll: Omit<DiceRoll, 'id' | 'timestamp'>) => {
    const newRoll = {
      ...roll,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date(),
    };
    setDiceRolls((prevRolls) => [newRoll, ...prevRolls]);
    addMessage({
      sender: "System",
      content: `${roll.roller} ha sacado un ${roll.result} en un d${roll.diceType}.`,
    });
  }

  const handleSendMessage = async (content: string) => {
    const playerMessage: GameMessage = {
      id: Date.now().toString(),
      sender: "Player",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, playerMessage]);
    setIsDMThinking(true);

    try {
      if (content.startsWith('//')) {
        const oocReply = await handleOocMessage(content.substring(2).trim(), gameState);
        if (oocReply) {
          addMessage({ sender: "DM", content: oocReply });
        }
      } else {
        const playerAction = content;
        
        // 1. Generate NPC actions in response to the player
        const { newMessages, characterActionsContent } = await generateNpcActions(
          party, 
          messages.findLast(m => m.sender === 'DM')?.originalContent || locationDescription,
          playerAction
        );
        
        if (newMessages.length > 0) {
          addMessages(newMessages);
        }

        // 2. DM narrates based on player action AND NPC responses
        const playerCharacter = party.find(c => c.controlledBy === 'Player');
        const { dmNarration, updatedGameState, nextLocationDescription, updatedCharacterStats } = await runDungeonMasterTurn(
          playerAction,
          characterActionsContent,
          gameState,
          locationDescription,
          playerCharacter || null
        );

        if (dmNarration) {
          addMessage(dmNarration);
        }
        
        if(updatedGameState) setGameState(updatedGameState);
        if(nextLocationDescription) setLocationDescription(nextLocationDescription);
        // TODO: Implement character stats updates from updatedCharacterStats
      }
    } catch (error) {
      console.error("Error during AI turn:", error);
      addMessage({
        sender: "System",
        content: "El Dungeon Master o uno de los personajes está confundido y no puede responder ahora mismo.",
      });
    } finally {
      setIsDMThinking(false);
    }
  };

  const handleDiceRoll = (roll: { result: number, sides: number }) => {
    addDiceRoll({
      roller: selectedCharacter?.name ?? 'Player',
      diceType: roll.sides,
      result: roll.result,
      outcome: 'neutral'
    });
  };
  
  const handleNewGame = () => {
    setMessages([]);
    setDiceRolls([]);
    setParty(initialParty);
    setGameState("Initial state: The party is in the Yawning Portal inn.");
    setLocationDescription("You are in the Yawning Portal inn.");
    setSelectedCharacter(initialParty.find(c => c.controlledBy === 'Player') || null);
    setGameInProgress(false);
    setGameStarted(true);
  };
  
  const handleGoToMenu = () => {
    setGameStarted(false);
  }

  const handleContinueGame = () => {
    setGameStarted(true);
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
        setGameState(newGameState);
        setMessages([]);
        
        toast({ title: "Generando introducción...", description: "El Dungeon Master está preparando la escena." });
        
        const playerCharacter = party.find(c => c.controlledBy === 'Player');
        const { dmNarration, updatedGameState, nextLocationDescription } = await runDungeonMasterTurn(
            "Comenzar la aventura.",
            "",
            newGameState,
            parsedAdventure.adventureSummary,
            playerCharacter
        );

        if (dmNarration) {
          addMessage(dmNarration);
        }
        
        if (updatedGameState) {
          setGameState(updatedGameState);
        }
        
        if (nextLocationDescription) {
          setLocationDescription(nextLocationDescription);
        }

        setDiceRolls([]);
        setParty(initialParty);
        setSelectedCharacter(initialParty.find(c => c.controlledBy === 'Player') || null);
        
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

  const handleSaveGame = () => {
    const saveData = {
      savedAt: new Date().toISOString(),
      party,
      messages,
      diceRolls,
      gameState,
      locationDescription,
    };

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

        // Restore state
        setParty(saveData.party);
        setMessages(saveData.messages);
        setDiceRolls(saveData.diceRolls || []);
        setGameState(saveData.gameState);
        setLocationDescription(saveData.locationDescription || "");
        setSelectedCharacter(saveData.party.find((c: Character) => c.controlledBy === 'Player') || null);

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
      {gameStarted ? (
        <GameLayout
          leftPanel={
            <LeftPanel
              party={party}
              selectedCharacterId={selectedCharacter?.id}
              onSelectCharacter={setSelectedCharacter}
              diceRolls={diceRolls}
            />
          }
          characterSheet={<CharacterSheet character={selectedCharacter} />}
        >
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            onDiceRoll={handleDiceRoll}
            isThinking={isDMThinking}
          />
        </GameLayout>
      ) : (
        <MainMenu 
          onNewGame={handleNewGame} 
          onContinueGame={handleContinueGame}
          onLoadAdventure={handleLoadAdventure}
          onLoadGame={handleLoadGame}
          onSaveGame={handleSaveGame}
          gameInProgress={gameInProgress} 
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
