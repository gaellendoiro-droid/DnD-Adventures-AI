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
        
        const { newMessages, characterActionsContent } = await generateNpcActions(
          party, 
          messages.findLast(m => m.sender === 'DM')?.originalContent || locationDescription,
          playerAction
        );
        
        if (newMessages.length > 0) {
          addMessages(newMessages);
        }

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
        
        if (updatedCharacterStats && playerCharacter) {
          updateCharacter(playerCharacter.id, updatedCharacterStats);
        }

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
