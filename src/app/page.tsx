"use client";

import { useState, useEffect } from "react";
import type { Character, GameMessage } from "@/lib/types";
import { initialParty, initialMessages } from "@/lib/data";
import { AppHeader } from "@/components/layout/app-header";
import { GameLayout } from "@/components/game/game-layout";
import { PartyPanel } from "@/components/game/party-panel";
import { CharacterSheet } from "@/components/game/character-sheet";
import { ChatPanel } from "@/components/game/chat-panel";

export default function Home() {
  const [party] = useState<Character[]>(initialParty);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    party[0] || null
  );

  useEffect(() => {
    // Set initial messages after a short delay to simulate the DM starting the game.
    setTimeout(() => {
        setMessages(initialMessages);
    }, 1000);
  }, []);

  const handleSendMessage = (content: string) => {
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
    // Here you would call the AI Dungeon Master flow
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
        />
      </GameLayout>
    </div>
  );
}
