"use client";

import { useState, useEffect } from "react";
import type { Character, GameMessage } from "@/lib/types";
import { initialParty, initialMessages } from "@/lib/data";
import { AppHeader } from "@/components/layout/app-header";
import { GameLayout } from "@/components/game/game-layout";
import { PartyPanel } from "@/components/game/party-panel";
import { CharacterSheet } from "@/components/game/character-sheet";
import { ChatPanel } from "@/components/game/chat-panel";
import { MainMenu } from "@/components/game/main-menu";
import { aiDungeonMasterParser } from "@/ai/flows/ai-dungeon-master-parser";
import { generateCharacterAction } from "@/ai/flows/generate-character-action";
import { dungeonMasterOocParser } from "@/ai/flows/dungeon-master-ooc-parser";

export default function Home() {
  const [party, setParty] = useState<Character[]>(initialParty);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    party.find(c => c.controlledBy === 'Player') || null
  );
  const [isDMThinking, setIsDMThinking] = useState(false);
  const [gameState, setGameState] = useState("Initial state: The party is in the Yawning Portal inn.");
  const [gameStarted, setGameStarted] = useState(false);
  const [gameInProgress, setGameInProgress] = useState(false);

  useEffect(() => {
    if (gameStarted && !gameInProgress) {
      setMessages(initialMessages);
      setGameInProgress(true);
    } else if (!gameStarted) {
      // Don't clear messages when just going to menu
    }
  }, [gameStarted, gameInProgress]);

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

  const handleSendMessage = async (content: string) => {
    addMessage({ sender: "Player", content });
    setIsDMThinking(true);

    try {
      if (content.startsWith('//')) {
        // Out-of-character message to DM
        const oocQuery = content.substring(2).trim();
        const oocResponse = await dungeonMasterOocParser({
          playerQuery: oocQuery,
          gameState: gameState,
        });
        if (oocResponse.dmReply) {
          addMessage({ sender: "DM", content: `(OOC) ${oocResponse.dmReply}` });
        }
      } else {
        // In-character action
        const playerCharacter = party.find(c => c.controlledBy === 'Player');
        const locationDescription = messages.filter(m => m.sender === 'DM').slice(-1)[0]?.content as string;

        const dmResponse = await aiDungeonMasterParser({
          playerAction: content,
          gameState: gameState,
          locationDescription: locationDescription,
          characterStats: JSON.stringify(playerCharacter),
        });

        if (dmResponse.narration) {
          addMessage({ sender: "DM", content: dmResponse.narration });
        }
        
        if(dmResponse.updatedGameState) {
          setGameState(dmResponse.updatedGameState);
        }

        // TODO: Implement character stats and location updates
        
        // Generate NPC actions
        for (const character of party) {
          if (character.controlledBy === 'AI') {
            const characterActionResponse = await generateCharacterAction({
              characterName: character.name,
              characterClass: character.class,
              characterRace: character.race,
              dmNarration: dmResponse.narration,
              playerAction: content,
            });

            if (characterActionResponse.action) {
              addMessage({
                sender: 'Character',
                senderName: character.name,
                characterColor: character.color,
                content: characterActionResponse.action,
              });
            }
          }
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

  const handleDiceRoll = (roll: string) => {
    addMessage({ sender: "System", content: roll });
  };
  
  const handleNewGame = () => {
    setMessages([]);
    setParty(initialParty);
    setGameState("Initial state: The party is in the Yawning Portal inn.");
    setSelectedCharacter(initialParty.find(c => c.controlledBy === 'Player') || null);
    setGameInProgress(false); // This will trigger the useEffect to set initial messages
    setGameStarted(true);
  };
  
  const handleGoToMenu = () => {
    setGameStarted(false);
  }

  const handleContinueGame = () => {
    setGameStarted(true);
  };

  return (
    <div className="flex flex-col h-svh bg-background text-foreground dark:bg-background dark:text-foreground">
      <AppHeader onGoToMenu={handleGoToMenu} showMenuButton={gameStarted} />
      {gameStarted ? (
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
      ) : (
        <MainMenu onNewGame={handleNewGame} onContinueGame={handleContinueGame} gameInProgress={gameInProgress} />
      )}
    </div>
  );
}
