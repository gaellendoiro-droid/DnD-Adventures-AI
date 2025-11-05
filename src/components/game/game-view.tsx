
"use client";

import { useState, useEffect } from "react";
import type { Character, GameMessage, DiceRoll } from "@/lib/types";
import { GameLayout } from "@/components/game/game-layout";
import { LeftPanel } from "@/components/layout/left-panel";
import { CharacterSheet } from "@/components/game/character-sheet";
import { ChatPanel } from "@/components/game/chat-panel";
import { Button } from "../ui/button";
import { Save } from "lucide-react";
import { handleOocMessage, generateNpcActions, runDungeonMasterTurn } from "@/app/actions";

interface GameViewProps {
  initialData: {
    party: Character[];
    messages: GameMessage[];
    diceRolls: DiceRoll[];
    gameState: string;
    locationDescription: string;
  };
  onSaveGame: (saveData: any) => void;
}

export function GameView({ initialData, onSaveGame }: GameViewProps) {
  const [party, setParty] = useState<Character[]>(initialData.party);
  const [messages, setMessages] = useState<GameMessage[]>(initialData.messages);
  const [diceRolls, setDiceRolls] = useState<DiceRoll[]>(initialData.diceRolls);
  const [gameState, setGameState] = useState(initialData.gameState);
  const [locationDescription, setLocationDescription] = useState(initialData.locationDescription);
  
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    party.find(c => c.controlledBy === 'Player') || null
  );
  const [isDMThinking, setIsDMThinking] = useState(false);

  useEffect(() => {
    // When initialData changes (e.g. loading a new adventure), reset the state
    setParty(initialData.party);
    setMessages(initialData.messages);
    setDiceRolls(initialData.diceRolls);
    setGameState(initialData.gameState);
    setLocationDescription(initialData.locationDescription);
    setSelectedCharacter(initialData.party.find(c => c.controlledBy === 'Player') || null);
  }, [initialData]);

  const addMessage = (message: Omit<GameMessage, 'id' | 'timestamp'>, isRetryMessage: boolean = false) => {
    
    // If it's a retry message, we don't want to re-add the player's prompt.
    // We just want to add the new messages from the AI.
    const messageToAdd = {
        ...message,
        id: Date.now().toString() + Math.random(),
        timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
    };
    
    setMessages((prevMessages) => {
        // If it's a retry, we might want to remove the previous error message.
        const filteredMessages = isRetryMessage ? prevMessages.filter(m => m.sender !== 'Error') : prevMessages;
        return [...filteredMessages, messageToAdd];
    });
};


  const addMessages = (newMessages: GameMessage[], isRetry: boolean = false) => {
     setMessages((prev) => {
        const filteredMessages = isRetry ? prev.filter(m => m.sender !== 'Error') : prev;
        return [...filteredMessages, ...newMessages];
    });
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

  const updateCharacter = (characterId: string, updates: Partial<Character>) => {
    let updatedCharacter: Character | null = null;
    setParty(currentParty => {
        const newParty = currentParty.map(c => {
            if (c.id === characterId) {
                updatedCharacter = { ...c, ...updates };
                return updatedCharacter;
            }
            return c;
        });
        
        // After updating the party, if the updated character is the selected one,
        // also update the selectedCharacter state to trigger a re-render in CharacterSheet
        if (updatedCharacter && selectedCharacter?.id === characterId) {
            setSelectedCharacter(updatedCharacter);
        }
        
        return newParty;
    });
  };

  const handleSendMessage = async (content: string, isRetry: boolean = false) => {
    if (!isRetry) {
        const playerMessage: GameMessage = {
          id: Date.now().toString(),
          sender: "Player",
          content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev.filter(m => m.sender !== 'Error'), playerMessage]);
    } else {
       setMessages(prev => [...prev.filter(m => m.sender !== 'Error')]);
    }
    
    setIsDMThinking(true);

    try {
      if (content.startsWith('//')) {
        const oocReply = await handleOocMessage(content.substring(2).trim(), gameState);
        if (oocReply) {
          addMessage({ sender: "DM", content: oocReply });
        }
      } else {
        const playerAction = content;
        
        // Create conversation history
        const history = messages
          .slice(-4) // Get last 4 messages
          .map(m => {
            if (m.sender === 'Player') return `Jugador: ${m.content}`;
            if (m.sender === 'DM') return `Dungeon Master: ${m.originalContent || m.content}`;
            if (m.sender === 'Character') return `${m.senderName}: ${m.content}`;
            return null;
          })
          .filter(Boolean)
          .join('\n');

        const lastDmMessage = messages.findLast(m => m.sender === 'DM');
        
        const { newMessages, characterActionsContent } = await generateNpcActions(
          party, 
          lastDmMessage?.originalContent || locationDescription,
          playerAction
        );
        
        if (newMessages.length > 0) {
          addMessages(newMessages, isRetry);
        }

        const playerCharacter = party.find(c => c.controlledBy === 'Player');
        const { dmNarration, updatedGameState, nextLocationDescription, updatedCharacterStats } = await runDungeonMasterTurn(
          playerAction,
          characterActionsContent,
          gameState,
          locationDescription,
          playerCharacter || null,
          history
        );

        if (dmNarration) {
          addMessage(dmNarration, isRetry);
        }
        
        if(updatedGameState) setGameState(updatedGameState);
        if(nextLocationDescription) setLocationDescription(nextLocationDescription);
        
        if (updatedCharacterStats && playerCharacter) {
          updateCharacter(playerCharacter.id, updatedCharacterStats);
        }

      }
    } catch (error: any) {
      console.error("Error during AI turn:", error);
      
      const errorMessage = error.message || "An unknown error occurred.";
      if (errorMessage.includes("503") || errorMessage.includes("model is overloaded")) {
         addMessage({
            sender: 'Error',
            content: "El DM está muy ocupado en este momento y no puede responder.",
            onRetry: () => handleSendMessage(content, true),
        });
      } else {
        addMessage({
            sender: "System",
            content: "El Dungeon Master o uno de los personajes está confundido y no puede responder ahora mismo.",
        });
      }
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

  const handleInternalSaveGame = () => {
    const saveData = {
      savedAt: new Date().toISOString(),
      party,
      messages,
      diceRolls,
      gameState,
      locationDescription,
    };
    onSaveGame(saveData);
  }

  return (
    <GameLayout
      leftPanel={
        <LeftPanel
          party={party}
          selectedCharacterId={selectedCharacter?.id}
          onSelectCharacter={setSelectedCharacter}
          diceRolls={diceRolls}
        >
            <div className="p-2">
                <Button size="sm" variant="outline" onClick={handleInternalSaveGame} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Partida
                </Button>
            </div>
        </LeftPanel>
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
  );
}
