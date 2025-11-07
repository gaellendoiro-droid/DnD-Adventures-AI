
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Character, GameMessage, DiceRoll, InitiativeRoll, Combatant } from "@/lib/types";
import { GameLayout } from "@/components/game/game-layout";
import { LeftPanel } from "@/components/layout/left-panel";
import { CharacterSheet } from "@/components/game/character-sheet";
import { ChatPanel } from "@/components/game/chat-panel";
import { Button } from "../ui/button";
import { Save } from "lucide-react";
import { processPlayerAction, getDebugLogs } from "@/app/actions";
import { PartyPanel } from "@/components/game/party-panel";
import { Separator } from "../ui/separator";
import { useToast } from "@/hooks/use-toast";


interface GameViewProps {
  initialData: {
    party: Character[];
    messages: GameMessage[];
    diceRolls: DiceRoll[];
    gameState: string;
    locationId: string;
    inCombat?: boolean;
    initiativeOrder?: Combatant[];
  };
  onSaveGame: (saveData: any) => void;
}

export function GameView({ initialData, onSaveGame }: GameViewProps) {
  const [party, setParty] = useState<Character[]>(initialData.party);
  const [messages, setMessages] = useState<GameMessage[]>(initialData.messages);
  const [diceRolls, setDiceRolls] = useState<DiceRoll[]>(initialData.diceRolls);
  const [gameState, setGameState] = useState(initialData.gameState);
  const [locationId, setLocationId] = useState(initialData.locationId);
  const [inCombat, setInCombat] = useState(initialData.inCombat || false);
  const [initiativeOrder, setInitiativeOrder] = useState<Combatant[]>(initialData.initiativeOrder || []);
  const [enemies, setEnemies] = useState<any[]>([]); // State to hold enemy data
  
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    party.find(c => c.controlledBy === 'Player') || null
  );
  const [isDMThinking, setIsDMThinking] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);

  const { toast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addDebugMessage = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDebugMessages(prev => [...prev, `[${timestamp}] ${message}`].slice(-100));
  }, []);

  const addDebugMessages = useCallback((newLogs: string[]) => {
    if (!newLogs || newLogs.length === 0) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formattedLogs = newLogs.map(log => `[${timestamp}] ${log}`);
    setDebugMessages(prev => {
        const existingLogs = new Set(prev);
        const uniqueNewLogs = formattedLogs.filter(log => !existingLogs.has(log.substring(log.indexOf(']') + 2)));
        return [...prev, ...uniqueNewLogs].slice(-200);
    });
  }, []);

  useEffect(() => {
    setParty(initialData.party);
    setMessages(initialData.messages);
    setDiceRolls(initialData.diceRolls);
    setGameState(initialData.gameState);
    setLocationId(initialData.locationId);
    setSelectedCharacter(initialData.party.find(c => c.controlledBy === 'Player') || null);
    setInCombat(initialData.inCombat || false);
    setInitiativeOrder(initialData.initiativeOrder || []);
    setDebugMessages([]);
    setTurnIndex(0);
    setEnemies([]);
    addDebugMessage("Game state initialized from initialData.");
  }, [initialData, addDebugMessage]);

  const addMessage = useCallback((message: Omit<GameMessage, 'id' | 'timestamp'>, isRetryMessage: boolean = false) => {
    const messageToAdd: GameMessage = {
        ...message,
        id: Date.now().toString() + Math.random(),
        timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
    };
    
    setMessages((prevMessages) => {
        const filteredMessages = isRetryMessage ? prevMessages.filter(m => m.sender !== 'Error') : prevMessages;
        return [...filteredMessages, messageToAdd];
    });
  }, []);

  const addMessages = useCallback((newMessages: Omit<GameMessage, 'id' | 'timestamp'>[], isRetry: boolean = false) => {
     if (!newMessages || newMessages.length === 0) return;
     const messagesToAdd = newMessages.map(m => ({
        ...m,
        id: Date.now().toString() + Math.random(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
     }));
     setMessages((prev) => {
        const filteredMessages = isRetry ? prev.filter(m => m.sender !== 'Error') : prev;
        return [...filteredMessages, ...messagesToAdd];
    });
  }, []);
  
  const addDiceRolls = (rolls: Omit<DiceRoll, 'id' | 'timestamp'>[]) => {
    if (!rolls || rolls.length === 0) return;
    const newRolls = rolls.map(roll => ({
        ...roll,
        id: Date.now().toString() + Math.random(),
        timestamp: new Date(),
    }));
    setDiceRolls(prevRolls => [...prevRolls, ...newRolls]);
  }

  const updateCharacter = useCallback((characterId: string, updates: Partial<Character>) => {
    let updatedCharacter: Character | null = null;
    setParty(currentParty => {
        const newParty = currentParty.map(c => {
            if (c.id === characterId) {
                const newHp = { ...c.hp, ...updates.hp };
                if (newHp.current < 0) newHp.current = 0;
                if (newHp.current > newHp.max) newHp.current = newHp.max;

                updatedCharacter = { ...c, ...updates, hp: newHp };
                return updatedCharacter;
            }
            return c;
        });
        
        if (updatedCharacter && selectedCharacter?.id === characterId) {
            setSelectedCharacter(updatedCharacter);
        }
        
        return newParty;
    });
  }, [selectedCharacter]);

  const buildConversationHistory = () => {
    return messages
      .slice(-5)
      .map(m => {
        if (m.sender === 'Player') return `Jugador: ${m.content}`;
        if (m.sender === 'DM') return `Dungeon Master: ${m.originalContent || m.content}`;
        if (m.sender === 'Character') return `${m.senderName}: ${m.content}`;
        return null;
      })
      .filter(Boolean)
      .join('\n');
  };

  const handleSendMessage = useCallback(async (content: string, options: { isRetry?: boolean, isContinuation?: boolean } = {}) => {
    const { isRetry = false, isContinuation = false } = options;
    const turnId = Date.now().toString();

    if (!isRetry && !isContinuation) {
        addMessage({
          sender: "Player",
          content,
        }, isRetry);
    } else if (isRetry) {
       setMessages(prev => [...prev.filter(m => m.sender !== 'Error')]);
    }
    
    setIsDMThinking(true);
    
    // Start polling for logs
    pollingIntervalRef.current = setInterval(async () => {
        try {
            const logs = await getDebugLogs(turnId);
            const currentLogs = new Set(debugMessages);
            const newLogs = logs.filter(l => !currentLogs.has(`[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${l}`));
            if (newLogs.length > 0) {
               addDebugMessages(logs);
            }
        } catch (e) {
            console.error("Log polling failed:", e);
        }
    }, 1000);

    try {
      const history = buildConversationHistory();
      
      const result = await processPlayerAction({
        playerAction: content,
        party,
        locationId,
        inCombat,
        initiativeOrder,
        enemies,
        turnIndex,
        gameState,
        conversationHistory: history,
        turnId
      });
      
      if (result.debugLogs) {
        addDebugMessages(result.debugLogs);
      }
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if(result.messages) addMessages(result.messages.map(m => ({ ...m, content: m.originalContent || m.content})), isRetry);
      if(result.diceRolls) addDiceRolls(result.diceRolls);
      if(result.nextLocationId) setLocationId(result.nextLocationId);
      
      // Check for character updates
      if (result.updatedParty) {
        setParty(result.updatedParty);
        // Also update selected character if they were changed
        const player = result.updatedParty.find(p => p.id === selectedCharacter?.id);
        if(player) setSelectedCharacter(player);
      }
      
      if (result.startCombat) {
          setInCombat(true);
          if(result.enemies) setEnemies(result.enemies);
          if(result.initiativeOrder) setInitiativeOrder(result.initiativeOrder);
          if(result.nextTurnIndex !== undefined) setTurnIndex(result.nextTurnIndex);
          
          const firstCombatant = result.initiativeOrder?.[result.nextTurnIndex];
           if (firstCombatant?.type !== 'player') {
              handleSendMessage("", { isContinuation: true });
           } else if (firstCombatant) {
              addMessage({ sender: 'System', content: `Es el turno de ${firstCombatant.characterName}.`});
           }
      } else if (result.endCombat) {
          setInCombat(false);
          setInitiativeOrder([]);
          setEnemies([]);
          setTurnIndex(0);
      } else if (inCombat && result.nextTurnIndex !== undefined) {
          const newIndex = result.nextTurnIndex;
          setTurnIndex(newIndex);
          if (result.updatedEnemies) setEnemies(result.updatedEnemies);

          const nextCombatant = initiativeOrder[newIndex];
          if (nextCombatant?.type === 'player') {
              addMessage({ sender: 'System', content: `Es el turno de ${nextCombatant.characterName}.` });
          } else if (nextCombatant) {
              handleSendMessage("", { isContinuation: true });
          }
      }

    } catch (error: any) {
      console.error("Error during turn:", error);
      addDebugMessage(`CRITICAL ERROR: ${error.message}`);
      addMessage({
        sender: 'Error',
        content: `El Dungeon Master está confundido y no puede procesar tu última acción. Error: ${error.message}`,
        onRetry: () => handleSendMessage(content, { isRetry: true }),
      });
    } finally {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      setIsDMThinking(false);
    }
  }, [addDebugMessage, addDebugMessages, addMessage, addMessages, buildConversationHistory, gameState, inCombat, locationId, party, initiativeOrder, enemies, turnIndex, debugMessages, selectedCharacter, updateCharacter]);
  
  const handleDiceRoll = (roll: { result: number, sides: number }) => {
     addDiceRolls([{
        roller: selectedCharacter?.name ?? 'Player',
        rollNotation: `1d${roll.sides}`,
        individualRolls: [roll.result],
        totalResult: roll.result,
        outcome: 'neutral',
        description: `Tirada de d${roll.sides} del jugador`
    }]);
  };

  const handleInternalSaveGame = () => {
    const saveData = {
      savedAt: new Date().toISOString(),
      party,
      messages,
      diceRolls,
      gameState,
      locationId,
      inCombat,
      initiativeOrder,
      enemies,
      turnIndex,
    };
    onSaveGame(saveData);
  }

  return (
    <GameLayout
      leftPanel={
        <LeftPanel
          diceRolls={diceRolls}
          debugMessages={debugMessages}
          initiativeOrder={initiativeOrder}
        >
            <div className="p-2">
                <Button size="sm" variant="outline" onClick={handleInternalSaveGame} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Partida
                </Button>
            </div>
        </LeftPanel>
      }
      characterSheet={
        <div className="flex flex-col h-full">
            <PartyPanel
                party={party}
                selectedCharacterId={selectedCharacter?.id}
                onSelectCharacter={setSelectedCharacter}
            />
            <Separator />
            <CharacterSheet character={selectedCharacter} />
        </div>
      }
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

    