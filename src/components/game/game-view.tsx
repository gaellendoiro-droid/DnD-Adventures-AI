
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Character, GameMessage, DiceRoll, InitiativeRoll, Combatant } from "@/lib/types";
import { GameLayout } from "@/components/game/game-layout";
import { LeftPanel } from "@/components/layout/left-panel";
import { CharacterSheet } from "@/components/game/character-sheet";
import { ChatPanel } from "@/components/game/chat-panel";
import { Button } from "../ui/button";
import { Save } from "lucide-react";
import { handleOocMessage, runTurn } from "@/app/actions";
import { PartyPanel } from "./party-panel";
import { Separator } from "../ui/separator";
import { adventureLookupTool } from "@/ai/tools/adventure-lookup";

interface GameViewProps {
  initialData: {
    party: Character[];
    messages: GameMessage[];
    diceRolls: DiceRoll[];
    gameState: string;
    locationDescription: string;
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
  const [locationDescription, setLocationDescription] = useState(initialData.locationDescription);
  const [inCombat, setInCombat] = useState(initialData.inCombat || false);
  const [initiativeOrder, setInitiativeOrder] = useState<Combatant[]>(initialData.initiativeOrder || []);
  
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    party.find(c => c.controlledBy === 'Player') || null
  );
  const [isDMThinking, setIsDMThinking] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);

  const addDebugMessage = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDebugMessages(prev => [...prev, `[${timestamp}] ${message}`].slice(-50));
  }, []);

  useEffect(() => {
    // When initialData changes (e.g. loading a new adventure), reset the state
    setParty(initialData.party);
    setMessages(initialData.messages);
    setDiceRolls(initialData.diceRolls);
    setGameState(initialData.gameState);
    setLocationDescription(initialData.locationDescription);
    setSelectedCharacter(initialData.party.find(c => c.controlledBy === 'Player') || null);
    setInCombat(initialData.inCombat || false);
    setInitiativeOrder(initialData.initiativeOrder || []);
    setDebugMessages([]);
    setTurnIndex(0);
  }, [initialData]);


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

  const startCombat = useCallback(async (narration: string) => {
      addDebugMessage("START_COMBAT sequence initiated.");
      setInCombat(true);
      addMessage({ sender: "System", content: <div className="font-bold uppercase text-destructive text-lg">¡Comienza el Combate!</div> });
      if(narration) {
        const { html } = await markdownToHtml({ markdown: narration });
        addMessage({ sender: 'DM', content: html, originalContent: narration });
      }

      // TODO: Identify enemies from narration
      const enemies = [{id: "orco-1", name: 'Orco', race: 'Orco', class: 'Guerrero', level: 1, abilityScores: { destreza: 12 } }]; // Placeholder

      const combatants: (Character | any)[] = [...party, ...enemies];
      
      const initiativeRolls: InitiativeRoll[] = combatants.map(c => {
        const modifier = Math.floor((c.abilityScores.destreza - 10) / 2);
        const roll = Math.floor(Math.random() * 20) + 1;
        return {
          characterName: c.name,
          roll: roll,
          modifier: modifier,
          total: roll + modifier,
        }
      });
      
      const initiativeDiceRolls = initiativeRolls.map(roll => ({
          roller: roll.characterName,
          rollNotation: `1d20+${roll.modifier}`,
          individualRolls: [roll.roll],
          modifier: roll.modifier,
          totalResult: roll.total,
          outcome: 'initiative' as const,
          description: `Tirada de Iniciativa`
      }));
      setDiceRolls(prev => [...prev, ...initiativeDiceRolls.map((r, i) => ({...r, id: Date.now().toString() + i, timestamp: new Date()}))]);
      
      const sortedCombatants: Combatant[] = initiativeRolls.map((roll, i) => ({
        ...roll,
        id: combatants[i].id,
        type: combatants[i].controlledBy ? 'player' : 'npc',
      })).sort((a, b) => b.total - a.total);

      setInitiativeOrder(sortedCombatants);
      setTurnIndex(0);
      addDebugMessage(`Combat started. Initiative order set: ${sortedCombatants.map(c => c.characterName).join(', ')}`);

  }, [addDebugMessage, party]);


  // Main game loop handler
  const handleSendMessage = useCallback(async (content: string, options: { isRetry?: boolean } = {}) => {
    const { isRetry = false } = options;

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
    addDebugMessage(`Player action: "${content}".`);

    try {
      const history = buildConversationHistory();

      if (content.startsWith('//')) {
        addDebugMessage("OOC query detected.");
        const oocReply = await handleOocMessage(content.substring(2).trim(), gameState, history);
        if (oocReply) {
          addMessage({ sender: "DM", content: oocReply });
          addDebugMessage("OOC reply received.");
        }
      } else {
        // --- NARRATIVE MODE ---
        if (!inCombat) {
          addDebugMessage("Running NARRATIVE turn.");
          const turnResult = await runTurn(content, party, locationDescription, gameState, history);
          
          if(turnResult.companionMessages.length > 0) addMessages(turnResult.companionMessages, isRetry);
          if(turnResult.dmNarration) addMessage(turnResult.dmNarration, isRetry);
          if(turnResult.nextLocationDescription) setLocationDescription(turnResult.nextLocationDescription);
          if (turnResult.updatedCharacterStats) {
            const playerCharacter = party.find(c => c.controlledBy === 'Player');
            if (playerCharacter) updateCharacter(playerCharacter.id, turnResult.updatedCharacterStats);
          }

          if (turnResult.startCombat) {
            await startCombat(turnResult.combatStartNarration || "");
          }
        }
        // --- COMBAT MODE ---
        else {
          addDebugMessage(`Running COMBAT turn for Player.`);
          // Process player action... (this part needs to be built out)
          addDebugMessage("Player combat action processing not yet implemented.");
          
          // After player turn, advance turn order
          setTurnIndex(prev => prev + 1);
        }
      }
    } catch (error: any) {
      console.error("Error during AI turn:", error);
      addDebugMessage(`ERROR: ${error.message}`);
      addMessage({
        sender: 'Error',
        content: "El Dungeon Master está confundido y no puede procesar tu última acción. Inténtalo de nuevo.",
        onRetry: () => handleSendMessage(content, { isRetry: true }),
      });
    } finally {
      setIsDMThinking(false);
      addDebugMessage("Turn finished.");
    }
  }, [addDebugMessage, buildConversationHistory, gameState, inCombat, locationDescription, party, startCombat]);
  
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
      initiativeOrder,
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
