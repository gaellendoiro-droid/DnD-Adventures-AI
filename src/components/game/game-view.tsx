
"use client";

import { useState, useEffect } from "react";
import type { Character, GameMessage, DiceRoll, DiceRollOutcome } from "@/lib/types";
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
  const [inCombat, setInCombat] = useState(false);
  
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    party.find(c => c.controlledBy === 'Player') || null
  );
  const [isDMThinking, setIsDMThinking] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);

  useEffect(() => {
    // When initialData changes (e.g. loading a new adventure), reset the state
    setParty(initialData.party);
    setMessages(initialData.messages);
    setDiceRolls(initialData.diceRolls);
    setGameState(initialData.gameState);
    setLocationDescription(initialData.locationDescription);
    setSelectedCharacter(initialData.party.find(c => c.controlledBy === 'Player') || null);
    setInCombat(false); // Reset combat state on new adventure
    setDebugMessages([]);
  }, [initialData]);

  const addDebugMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDebugMessages(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50)); // Keep last 50 messages
  };

  const addMessage = (message: Omit<GameMessage, 'id' | 'timestamp'>, isRetryMessage: boolean = false) => {
    
    const messageToAdd = {
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
    setDiceRolls((prevRolls) => [...prevRolls, newRoll]);
  }

  const updateCharacter = (characterId: string, updates: Partial<Character>) => {
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
    addDebugMessage(`Turno iniciado. Modo Combate: ${inCombat}`);

    try {
      if (content.startsWith('//')) {
        addDebugMessage("Detectada query OOC (fuera de personaje).");
        const oocReply = await handleOocMessage(content.substring(2).trim(), gameState);
        if (oocReply) {
          addMessage({ sender: "DM", content: oocReply });
          addDebugMessage("Respuesta OOC recibida y mostrada.");
        }
      } else {
        const playerAction = content;
        
        addDebugMessage("Creando historial de conversación reciente...");
        const history = messages
          .slice(-5) // Get last 5 messages for better context
          .map(m => {
            if (m.sender === 'Player') return `Jugador: ${m.content}`;
            if (m.sender === 'DM') return `Dungeon Master: ${m.originalContent || m.content}`;
            if (m.sender === 'Character') return `${m.senderName}: ${m.content}`;
            return null;
          })
          .filter(Boolean)
          .join('\n');
        addDebugMessage("Historial creado.");

        const lastDmMessage = messages.findLast(m => m.sender === 'DM');
        
        addDebugMessage("Generando acciones de PNJ...");
        const { newMessages, characterActionsContent } = await generateNpcActions(
          party, 
          lastDmMessage?.originalContent || locationDescription,
          playerAction
        );
        addDebugMessage(`Se generaron ${newMessages.length} acciones de PNJ.`);
        
        if (newMessages.length > 0) {
          addMessages(newMessages, isRetry);
        }

        const playerCharacter = party.find(c => c.controlledBy === 'Player');
        addDebugMessage(`Ejecutando el turno del Dungeon Master en modo ${inCombat ? 'Combate' : 'Narrativo'}...`);
        
        const { dmNarration, nextLocationDescription, updatedCharacterStats, initiativeRolls, diceRolls: combatDiceRolls, startCombat, endCombat } = await runDungeonMasterTurn(
          playerAction,
          characterActionsContent,
          gameState,
          locationDescription,
          playerCharacter || null,
          inCombat,
          history
        );
        addDebugMessage("Turno del DM completado. Procesando resultados...");

        if (dmNarration) {
          addMessage(dmNarration, isRetry);
          addDebugMessage("Narración del DM recibida y mostrada.");
        }

        const newDiceRolls: Omit<DiceRoll, 'id' | 'timestamp'>[] = [];

        if (initiativeRolls && initiativeRolls.length > 0) {
            addDebugMessage(`Se han recibido ${initiativeRolls.length} tiradas de iniciativa.`);
            initiativeRolls.forEach(roll => {
                newDiceRolls.push({
                    roller: roll.characterName,
                    rollNotation: '1d20',
                    individualRolls: [roll.roll],
                    modifier: roll.modifier,
                    totalResult: roll.total,
                    outcome: 'neutral',
                    description: 'Tirada de iniciativa'
                });
            });
        }

        if (combatDiceRolls && combatDiceRolls.length > 0) {
            addDebugMessage(`Se han recibido ${combatDiceRolls.length} tiradas de combate.`);
            combatDiceRolls.forEach(roll => {
                newDiceRolls.push({ ...roll });
            });
        }

        if(newDiceRolls.length > 0) {
            setDiceRolls(prev => [...prev, ...newDiceRolls.map((r, i) => ({...r, id: Date.now().toString() + i, timestamp: new Date()}))]);
        }
        
        if(nextLocationDescription) {
          setLocationDescription(nextLocationDescription);
          addDebugMessage("Descripción de la ubicación actualizada.");
        }
        
        if (updatedCharacterStats && playerCharacter) {
          updateCharacter(playerCharacter.id, updatedCharacterStats);
          addDebugMessage("Estadísticas del personaje actualizadas.");
        }
        
        if (startCombat) {
            setInCombat(true);
            addDebugMessage("CAMBIO DE MODO: Entrando en combate.");
        }

        if (endCombat) {
            setInCombat(false);
            addDebugMessage("CAMBIO DE MODO: Saliendo de combate.");
        }

      }
    } catch (error: any) {
      console.error("Error during AI turn:", error);
      addDebugMessage(`ERROR: ${error.message}`);
      
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
      addDebugMessage("Turno finalizado.");
    }
  };


  const handleDiceRoll = (roll: { result: number, sides: number }) => {
     addDiceRoll({
        roller: selectedCharacter?.name ?? 'Player',
        rollNotation: `1d${roll.sides}`,
        individualRolls: [roll.result],
        totalResult: roll.result,
        outcome: 'neutral',
        description: `Tirada de d${roll.sides} del jugador`
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
      inCombat,
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
          debugMessages={debugMessages}
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
