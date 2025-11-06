
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Character, GameMessage, DiceRoll, InitiativeRoll, Combatant } from "@/lib/types";
import { GameLayout } from "@/components/game/game-layout";
import { LeftPanel } from "@/components/layout/left-panel";
import { CharacterSheet } from "@/components/game/character-sheet";
import { ChatPanel } from "@/components/game/chat-panel";
import { Button } from "../ui/button";
import { Save } from "lucide-react";
import { handleOocMessage, runTurn, runCombatTurn, lookupAdventureEntity } from "@/app/actions";
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

  const addDebugMessage = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDebugMessages(prev => [...prev, `[${timestamp}] ${message}`].slice(-50));
  }, []);

  const getAdventureData = useCallback(() => {
    try {
        return JSON.parse(gameState);
    } catch(e) {
        addDebugMessage("CRITICAL: Failed to parse gameState JSON.");
        return null;
    }
  }, [gameState, addDebugMessage]);

  // Recalculate location description whenever locationId changes
  const locationDescription = (getAdventureData()?.locations.find((l: any) => l.id === locationId)?.description || "Un lugar desconocido");

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

      // Identify enemies from narration
      const enemyNames = (narration.match(/(\d+)?\s*([a-zA-ZáéíóúñÁÉÍÓÚÑüÜ\s]+)/gi) || [])
        .map(name => name.trim().replace(/^\d+\s*/, ''))
        .filter(name => name.length > 2); // Filter out short words

      addDebugMessage(`Attempting to identify enemies from narration: ${enemyNames.join(', ')}`);

      let identifiedEnemies: any[] = [];
      if (enemyNames.length > 0) {
          for (const name of enemyNames) {
              const enemyData = await lookupAdventureEntity(name, gameState);
              if (enemyData) {
                  // Create a unique ID for each instance
                  const enemyWithStats = {
                      ...enemyData,
                      id: `${enemyData.id}-${Math.random().toString(36).substring(2, 9)}`,
                      hp: { current: 30, max: 30 }, // Placeholder HP
                      abilityScores: { destreza: 10, ...enemyData.abilityScores }, // Placeholder dexterity
                  };
                  identifiedEnemies.push(enemyWithStats);
                  addDebugMessage(`Successfully identified and added '${name}' to combat.`);
              } else {
                  addDebugMessage(`Could not find data for enemy: '${name}'`);
              }
          }
      }

      if (identifiedEnemies.length === 0) {
        addDebugMessage("No enemies identified from narration. Adding a placeholder Orc as a fallback.");
        identifiedEnemies.push({ id: "fallback-orco-1", name: 'Orco Desconocido', race: 'Orco', class: 'Guerrero', level: 1, hp: { current: 15, max: 15 }, abilityScores: { destreza: 12 } });
      }
      setEnemies(identifiedEnemies);

      const combatants: (Character | any)[] = [...party, ...identifiedEnemies];
      
      const initiativeRolls: InitiativeRoll[] = combatants.map(c => {
        const modifier = Math.floor(((c.abilityScores?.destreza || 10) - 10) / 2);
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
      
      addDebugMessage(`Combat started. Initiative order set: ${sortedCombatants.map(c => c.characterName).join(', ')}`);
      
      // If the first turn is not a player, kick off the combat loop immediately.
      if (sortedCombatants[0].type !== 'player') {
          handleCombatTurn(null, 0); // Pass null action and the starting index.
      } else {
        setTurnIndex(0);
        const firstCombatant = sortedCombatants[0];
        addMessage({ sender: 'System', content: `Es el turno de ${firstCombatant.characterName}.`});
      }


  }, [addDebugMessage, party, gameState]);


  const handleCombatTurn = useCallback(async (playerAction: string | null, currentTurnIdx: number) => {
    setIsDMThinking(true);
    if(playerAction) {
       addDebugMessage(`Player combat action: "${playerAction}".`);
    } else {
        addDebugMessage(`Starting combat loop from turn index ${currentTurnIdx}.`);
    }
    
    try {
        const history = buildConversationHistory();
        const result = await runCombatTurn(
            playerAction,
            party,
            enemies,
            initiativeOrder,
            currentTurnIdx,
            gameState,
            locationDescription,
            history
        );

        addMessages(result.turnResults.messages);
        if (result.turnResults.diceRolls.length > 0) addDiceRolls(result.turnResults.diceRolls);
        if (result.turnResults.updatedParty) setParty(result.turnResults.updatedParty);
        if (result.turnResults.updatedEnemies) setEnemies(result.turnResults.updatedEnemies);

        setTurnIndex(result.nextTurnIndex);

        if (result.endCombat) {
            setInCombat(false);
            setInitiativeOrder([]);
            setEnemies([]);
            addDebugMessage("Combat has ended.");
        } else {
            const nextCombatant = initiativeOrder[result.nextTurnIndex];
            addMessage({ sender: 'System', content: `Es el turno de ${nextCombatant.characterName}.` });
        }
    } catch (error: any) {
      console.error("Error during combat turn:", error);
      addDebugMessage(`COMBAT ERROR: ${error.message}`);
      addMessage({
        sender: 'Error',
        content: "El Dungeon Master está confundido en medio del combate. Inténtalo de nuevo.",
        onRetry: () => handleCombatTurn(playerAction, currentTurnIdx),
      });
    } finally {
        setIsDMThinking(false);
        addDebugMessage("Combat turn processing finished.");
    }
  }, [party, enemies, initiativeOrder, gameState, locationDescription, addDebugMessage, buildConversationHistory]);


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
        handleCombatTurn(content, turnIndex);

      } else {
        // --- NARRATIVE MODE ---
        addDebugMessage("Running NARRATIVE turn.");
        const turnResult = await runTurn(content, party, locationId, gameState, history);
          
        if(turnResult.companionMessages.length > 0) addMessages(turnResult.companionMessages, isRetry);
        if(turnResult.dmNarration) addMessage(turnResult.dmNarration, isRetry);
        if(turnResult.nextLocationId) setLocationId(turnResult.nextLocationId);
        
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
  }, [addDebugMessage, buildConversationHistory, gameState, inCombat, locationDescription, party, startCombatFlow, handleCombatTurn, turnIndex, locationId]);
  
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

    