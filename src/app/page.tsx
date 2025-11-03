"use client";

import { useState, useEffect } from "react";
import type { Character, GameMessage } from "@/lib/types";
import { initialParty, initialMessages } from "@/lib/data";
import { AppHeader } from "@/components/layout/app-header";
import { GameLayout } from "@/components/game/game-layout";
import { PartyPanel } from "@/components/game/party-panel";
import { CharacterSheet } from "@/components/game/character-sheet";
import { ChatPanel } from "@/components/game/chat-panel";
import { aiDungeonMasterParser } from "@/ai/flows/ai-dungeon-master-parser";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [party, setParty] = useState<Character[]>(initialParty);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    party.find(c => c.controlledBy === 'Player') || null
  );
  const [isDMThinking, setIsDMThinking] = useState(false);
  const [gameState, setGameState] = useState("Initial state: The party is in the Yawning Portal inn.");

  useEffect(() => {
    // Set initial messages after a short delay to simulate the DM starting the game.
    setTimeout(() => {
      setMessages(initialMessages);
    }, 1000);
  }, []);

  const handleSendMessage = async (content: string) => {
    const newMessage: GameMessage = {
      id: Date.now().toString(),
      sender: "Player",
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setIsDMThinking(true);

    try {
      const playerCharacter = party.find(c => c.controlledBy === 'Player');
      const locationDescription = messages.filter(m => m.sender === 'DM').slice(-1)[0]?.content as string;

      const response = await aiDungeonMasterParser({
        playerAction: content,
        gameState: gameState,
        locationDescription: locationDescription,
        characterStats: JSON.stringify(playerCharacter),
      });

      if (response.narration) {
        const dmMessage: GameMessage = {
          id: Date.now().toString() + "-dm",
          sender: "DM",
          content: response.narration,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prevMessages) => [...prevMessages, dmMessage]);
      }
      
      if(response.updatedGameState) {
        setGameState(response.updatedGameState);
      }

      // TODO: Implement character stats and location updates
      if (response.updatedCharacterStats) {
        // Find and update character
      }
      if (response.nextLocationDescription) {
        // We can add a new message with the new location description
      }

    } catch (error) {
      console.error("Error calling AI Dungeon Master:", error);
      const errorMessage: GameMessage = {
        id: Date.now().toString() + "-error",
        sender: "System",
        content: "El Dungeon Master está confundido y no puede responder ahora mismo.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsDMThinking(false);
    }
  };

  const handleDiceRoll = (roll: string) => {
    const newMessage: GameMessage = {
      id: Date.now().toString(),
      sender: "System",
      content: roll,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  return (
    <div className="flex flex-col h-svh bg-background text-foreground dark:bg-background dark:text-foreground">
      <AppHeader />
      <GameLayout
        partyPanel={
          <PartyPanel
            party={party}
            selectedCharacterId={selectedCharacter?.id}
            onSelectCharacter={setSelectedCharacter}
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
    </div>
  );
}
