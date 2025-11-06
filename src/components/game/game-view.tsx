
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Character, GameMessage, DiceRoll, InitiativeRoll, Combatant } from "@/lib/types";
import { GameLayout } from "@/components/game/game-layout";
import { LeftPanel } from "@/components/layout/left-panel";
import { CharacterSheet } from "@/components/game/character-sheet";
import { ChatPanel } from "@/components/game/chat-panel";
import { Button } from "../ui/button";
import { Save } from "lucide-react";
import { handleOocMessage, runTurn, runCombatTurn } from "@/app/actions";
import { PartyPanel } from "./party-panel";
import { Separator } from "../ui/separator";
import { markdownToHtml } from "@/ai/flows/markdown-to-html";
import { useToast } from "@/hooks/use-toast";

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
  const [enemies, setEnemies] = useState<any[]>([]); // State to hold enemy data
  
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    party.find(c => c.controlledBy === 'Player') || null
  );
  const [isDMThinking, setIsDMThinking] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);

  const { toast } = useToast();

  const addDebugMessage = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDebugMessages(prev => [...prev, `[${timestamp}] ${message}`].slice(-50));
  }, []);

  useEffect(() => {
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
    setEnemies([]);
    toast({ title: 'Aventura Cargada', description: '¡La partida está lista!' });
  }, [initialData, toast]);

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
  
  const addDiceRolls = (rolls: Omit<DiceRoll, 'id' | 'timestamp'>[]) => {
    const newRolls = rolls.map(roll => ({
        ...roll,
        id: Date.now().toString() + Math.random(),
        timestamp: new Date(),
    }));
    setDiceRolls(prevRolls => [...prevRolls, ...newRolls]);
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

  const startCombatFlow = useCallback(async (narration: string) => {
      addDebugMessage("START_COMBAT sequence initiated.");
      setInCombat(true);
      addMessage({ sender: "System", content: "¡Comienza el Combate!" });
      if(narration) {
        const { html } = await markdownToHtml({ markdown: narration });
        addMessage({ sender: 'DM', content: html, originalContent: narration });
      }

      // TODO: Identify enemies from narration using AI
      const identifiedEnemies = [{id: "orco-1", name: 'Orco', race: 'Orco', class: 'Guerrero', level: 1, hp: {current: 15, max: 15}, abilityScores: { destreza: 12 } }]; // Placeholder
      setEnemies(identifiedEnemies);
      addDebugMessage(`Identified enemies: ${identifiedEnemies.map(e => e.name).join(', ')}`);


      const combatants: (Character | any)[] = [...party, ...identifiedEnemies];
      
      const initiativeRolls: InitiativeRoll[] = combatants.map(c => {
        const modifier = Math.floor((c.abilityScores.destreza - 10) / 2);
        const roll = Math.floor(Math.random() * 20) + 1;
        const combatantType: 'player' | 'npc' = party.some(p => p.id === c.id) ? 'player' : 'npc';
        return {
          characterName: c.name,
          roll: roll,
          modifier: modifier,
          total: roll + modifier,
          id: c.id,
          type: combatantType,
        }
      });
      
      const initiativeDiceRolls = initiativeRolls.map(roll => ({
          roller: roll.characterName,
          rollNotation: `1d20${roll.modifier >= 0 ? '+' : ''}${roll.modifier}`,
          individualRolls: [roll.roll],
          modifier: roll.modifier,
          totalResult: roll.total,
          outcome: 'initiative' as const,
          description: `Tirada de Iniciativa`
      }));
      addDiceRolls(initiativeDiceRolls);
      
      const sortedCombatants: Combatant[] = initiativeRolls.sort((a, b) => b.total - a.total).map(r => ({id: r.id, characterName: r.characterName, total: r.total, type: r.type}));

      setInitiativeOrder(sortedCombatants);
      setTurnIndex(0);
      addDebugMessage(`Combat started. Initiative order set: ${sortedCombatants.map(c => c.characterName).join(', ')}`);
      
      const firstCombatant = sortedCombatants[0];
      addMessage({ sender: 'System', content: `Es el turno de ${firstCombatant.characterName}.`});


  }, [addDebugMessage, party]);


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
          addMessage({ sender: "DM", content: oocReply, originalContent: oocReply });
        }
      } else if (inCombat) {
        // --- COMBAT MODE ---
        addDebugMessage("Running COMBAT turn coordinator.");
        const result = await runCombatTurn(
            content,
            party,
            enemies,
            initiativeOrder,
            turnIndex,
            gameState,
            locationDescription,
            history
        );
        
        addMessages(result.turnResults.messages);
        if(result.turnResults.diceRolls.length > 0) addDiceRolls(result.turnResults.diceRolls);
        if(result.turnResults.updatedParty) setParty(result.turnResults.updatedParty);
        if(result.turnResults.updatedEnemies) setEnemies(result.turnResults.updatedEnemies);
        
        setTurnIndex(result.nextTurnIndex);

        if (result.endCombat) {
            setInCombat(false);
            setInitiativeOrder([]);
            setEnemies([]);
            addDebugMessage("Combat has ended.");
        } else {
            const nextCombatant = initiativeOrder[result.nextTurnIndex];
            addMessage({ sender: 'System', content: `Es el turno de ${nextCombatant.characterName}.`})
        }

      } else {
        // --- NARRATIVE MODE ---
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
            await startCombatFlow(turnResult.combatStartNarration || "");
        }
      }
    } catch (error: any) {
      console.error("Error during turn:", error);
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
  }, [addDebugMessage, buildConversationHistory, gameState, inCombat, locationDescription, party, startCombatFlow, enemies, initiativeOrder, turnIndex]);
  
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
      locationDescription,
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
