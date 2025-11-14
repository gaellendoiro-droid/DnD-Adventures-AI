
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Character, GameMessage, DiceRoll, InitiativeRoll, Combatant } from "@/lib/types";
import { GameLayout } from "@/components/game/game-layout";
import { LeftPanel } from "@/components/layout/left-panel";
import { CharacterSheet } from "@/components/game/character-sheet";
import { ChatPanel } from "@/components/game/chat-panel";
import { Button } from "../ui/button";
import { Save } from "lucide-react";
import { processPlayerAction } from "@/app/actions";
import { PartyPanel } from "@/components/game/party-panel";
import { Separator } from "../ui/separator";
import { useToast } from "@/hooks/use-toast";
import { GameStateSchema } from "@/ai/flows/schemas";
import { logClient } from "@/lib/logger-client";
import { ZodError } from "zod";

interface GameViewProps {
  initialData: {
    party: Character[];
    messages: GameMessage[];
    diceRolls: DiceRoll[];
    locationId: string;
    inCombat?: boolean;
    initiativeOrder?: Combatant[];
    turnIndex?: number;
    enemies?: any[];
  };
  onSaveGame: (saveData: any) => void;
}

export function GameView({ initialData, onSaveGame }: GameViewProps) {
  const [party, setParty] = useState<Character[]>(initialData.party);
  const [messages, setMessages] = useState<GameMessage[]>(initialData.messages);
  const [diceRolls, setDiceRolls] = useState<DiceRoll[]>(initialData.diceRolls);
  const [locationId, setLocationId] = useState(initialData.locationId);
  const [inCombat, setInCombat] = useState(initialData.inCombat || false);
  const [initiativeOrder, setInitiativeOrder] = useState<Combatant[]>(initialData.initiativeOrder || []);
  const [enemies, setEnemies] = useState<any[]>(initialData.enemies || []);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    initialData.party.find(c => c.controlledBy === 'Player') || null
  );
  const [isDMThinking, setIsDMThinking] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [turnIndex, setTurnIndex] = useState(initialData.turnIndex || 0);
  const [hasMoreAITurns, setHasMoreAITurns] = useState(false);
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const autoAdvancingRef = useRef(false); // Use ref for synchronous access
  const turnIndexRef = useRef(initialData.turnIndex || 0); // Use ref for synchronous access
  const initiativeOrderRef = useRef<Combatant[]>(initialData.initiativeOrder || []); // Use ref for synchronous access
  const enemiesRef = useRef<any[]>(initialData.enemies || []); // Use ref for synchronous access
  const partyRef = useRef<Character[]>(initialData.party); // Use ref for synchronous access
  const locationIdRef = useRef<string>(initialData.locationId); // Use ref for synchronous access
  const inCombatRef = useRef<boolean>(initialData.inCombat || false); // Use ref for synchronous access
  const messagesRef = useRef<GameMessage[]>(initialData.messages); // Use ref for synchronous access
  const selectedCharacterRef = useRef<Character | null>(initialData.party.find(c => c.controlledBy === 'Player') || null); // Use ref for synchronous access

  const { toast } = useToast();

  const addDebugMessages = useCallback((newLogs: string[] | undefined) => {
    if (!newLogs || newLogs.length === 0) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formattedLogs = newLogs.map(log => `[${timestamp}] ${log}`);
    setDebugMessages(prev => [...prev, ...formattedLogs].slice(-200));
  }, []);

  useEffect(() => {
    setParty(initialData.party);
    partyRef.current = initialData.party; // Update ref synchronously
    // Ensure all initial messages have unique IDs
    const baseTimestamp = Date.now();
    const messagesWithUniqueIds = initialData.messages.map((msg, index) => {
      // If message already has an ID, append unique suffix to ensure uniqueness
      // If no ID, generate a new one
      const uniqueSuffix = `${baseTimestamp}-${index}-${Math.random().toString(36).substring(2, 11)}`;
      return {
        ...msg,
        id: msg.id ? `${msg.id}-${uniqueSuffix}` : `initial-msg-${uniqueSuffix}`,
      };
    });
    setMessages(messagesWithUniqueIds);
    messagesRef.current = messagesWithUniqueIds; // Update ref synchronously
    setDiceRolls(initialData.diceRolls);
    setLocationId(initialData.locationId);
    locationIdRef.current = initialData.locationId; // Update ref synchronously
    const initialSelectedCharacter = initialData.party.find(c => c.controlledBy === 'Player') || null;
    setSelectedCharacter(initialSelectedCharacter);
    selectedCharacterRef.current = initialSelectedCharacter; // Update ref synchronously
    setInCombat(initialData.inCombat || false);
    inCombatRef.current = initialData.inCombat || false; // Update ref synchronously
    setInitiativeOrder(initialData.initiativeOrder || []);
    setTurnIndex(initialData.turnIndex || 0);
    setEnemies(initialData.enemies || []);
    setDebugMessages([]);
    // Sync refs with initial data
    turnIndexRef.current = initialData.turnIndex || 0;
    initiativeOrderRef.current = initialData.initiativeOrder || [];
    enemiesRef.current = initialData.enemies || [];
    partyRef.current = initialData.party;
    addDebugMessages(["Game state initialized from initialData."]);
  }, [initialData, addDebugMessages]);

  // TEMPORAL: Log de estados para pruebas (Issue #11 y #12)
  const prevStateRef = useRef<string>('');
  useEffect(() => {
    // Crear una representación serializada del estado para comparar
    const currentState = JSON.stringify({
      inCombat,
      initiativeOrderLength: initiativeOrder.length,
      turnIndex,
      enemiesLength: enemies.length,
      locationId,
      partySize: party.length,
    });
    
    // Solo loguear si el estado realmente cambió
    if (currentState !== prevStateRef.current) {
      prevStateRef.current = currentState;
      
      // Log estructurado y expandible
      console.group('🎮 [GameView] Estado actual');
      
      // Información básica
      console.log('📍 Ubicación:', locationId);
      console.log('⚔️ En combate:', inCombat);
      console.log('👥 Tamaño del grupo:', party.length);
      console.log('📊 Turno actual (índice):', turnIndex);
      
      // Orden de iniciativa - expandido
      if (initiativeOrder.length > 0) {
        console.log('🗡️ Orden de iniciativa:', initiativeOrder.length, 'combatientes');
        initiativeOrder.forEach((combatant, index) => {
          console.log(`  ${index + 1}. ${combatant.characterName} (ID: ${combatant.id})`, {
            id: combatant.id,
            name: combatant.characterName,
            initiative: combatant.initiative,
            isPlayer: combatant.isPlayer,
            isEnemy: combatant.isEnemy,
          });
        });
      } else {
        console.log('🗡️ Orden de iniciativa:', 'Vacío (no hay combate activo)');
      }
      
      // Enemigos - expandido
      if (enemies.length > 0) {
        console.log('👹 Enemigos:', enemies.length, 'enemigos');
        enemies.forEach((enemy: any, index) => {
          const enemyName = enemy.name || enemy.characterName || enemy.id || 'Unknown';
          console.log(`  ${index + 1}. ${enemyName}`, {
            id: enemy.id,
            name: enemyName,
            ...(enemy.hp && { hp: enemy.hp }),
            ...(enemy.ac && { ac: enemy.ac }),
            fullData: enemy,
          });
        });
      } else {
        console.log('👹 Enemigos:', 'Vacío (no hay enemigos)');
      }
      
      // Resumen compacto para referencia rápida
      console.log('📦 Resumen:', {
        inCombat,
        initiativeOrderCount: initiativeOrder.length,
        turnIndex,
        enemiesCount: enemies.length,
        locationId,
        partySize: party.length,
      });
      
      console.groupEnd();
    }
  }, [inCombat, initiativeOrder, turnIndex, enemies, locationId, party.length]);

  // Counter to ensure unique IDs even when messages are created in the same millisecond
  const messageIdCounterRef = useRef(0);

  const addMessage = useCallback((message: Omit<GameMessage, 'id' | 'timestamp'>, isRetryMessage: boolean = false) => {
    messageIdCounterRef.current += 1;
    const messageToAdd: GameMessage = {
      ...message,
      id: `msg-${Date.now()}-${messageIdCounterRef.current}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prevMessages) => {
      const filteredMessages = isRetryMessage ? prevMessages.filter(m => m.sender !== 'Error') : prevMessages;
      const newMessages = [...filteredMessages, messageToAdd];
      messagesRef.current = newMessages; // Update ref synchronously
      return newMessages;
    });
  }, []);

  const addMessages = useCallback((newMessages: Omit<GameMessage, 'id' | 'timestamp'>[], isRetry: boolean = false) => {
    if (!newMessages || newMessages.length === 0) return;
    const baseTimestamp = Date.now();
    const messagesToAdd = newMessages.map((m, index) => {
      messageIdCounterRef.current += 1;
      return {
        ...m,
        id: `msg-${baseTimestamp}-${messageIdCounterRef.current}-${index}-${Math.random().toString(36).substring(2, 11)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });
    setMessages((prev) => {
      const filteredMessages = isRetry ? prev.filter(m => m.sender !== 'Error') : prev;
      const newMessages = [...filteredMessages, ...messagesToAdd];
      messagesRef.current = newMessages; // Update ref synchronously
      return newMessages;
    });
  }, []);

  const addDiceRolls = useCallback((rolls: Omit<DiceRoll, 'id' | 'timestamp'>[]) => {
    if (!rolls || rolls.length === 0) return;
    const newRolls = rolls.map(roll => ({
      ...roll,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date(),
    }));
    setDiceRolls(prevRolls => [...prevRolls, ...newRolls]);
  }, []);

  const buildConversationHistory = useCallback(() => {
    // Use ref for synchronous access to messages (important for async callbacks)
    return messagesRef.current.slice(-10);
  }, []);

  const handleSendMessage = useCallback(async (content: string, options: { isRetry?: boolean, isContinuation?: boolean } = {}) => {
    const { isRetry = false, isContinuation = false } = options;

    if (!isRetry && !isContinuation) {
      addMessage({ sender: "Player", senderName: selectedCharacterRef.current?.name, content }, isRetry);
    } else if (isRetry) {
      setMessages(prev => {
        const filtered = prev.filter(m => m.sender !== 'Error');
        messagesRef.current = filtered; // Update ref synchronously
        return filtered;
      });
    }

    setIsDMThinking(true);

    try {
      const conversationHistory = buildConversationHistory();
      // Use refs for all critical state values to ensure we have the latest values
      // especially important for auto-advancing turns (state updates are async)
      const actionInput = { 
        playerAction: content, 
        party: partyRef.current, 
        locationId: locationIdRef.current, 
        inCombat: inCombatRef.current, 
        conversationHistory, 
        turnIndex: turnIndexRef.current,
        initiativeOrder: initiativeOrderRef.current,
        enemies: enemiesRef.current,
      };
      
      // Debug: Log party HP to verify we're sending updated data
      if (inCombatRef.current) {
        const partyHpStatus = partyRef.current.map(p => `${p.name}: ${p.hp.current}/${p.hp.max}`).join(', ');
        addDebugMessages([`Sending party to backend: ${partyHpStatus}`]);
      }

      // Validate the entire game state before sending
      try {
      GameStateSchema.parse(actionInput);
      addDebugMessages(["Frontend state validation successful."]);
      } catch (validationError: any) {
        // Handle validation errors specifically
        if (validationError instanceof ZodError) {
          const errorMessages = validationError.errors.map(err => {
            const path = err.path.join('.');
            return `${path}: ${err.message}`;
          }).join('; ');
          
          logClient.uiError('GameView', 'Validation error', validationError, {
            action: content,
            errors: validationError.errors,
          });
          
          addDebugMessages([
            `VALIDATION ERROR: ${errorMessages}`,
            `DETAILS: ${JSON.stringify(validationError.errors)}`
          ]);
          
          addMessage({
            sender: 'Error',
            content: `Error de validación: Los datos del juego no son válidos. ${errorMessages}. Por favor, recarga la página.`,
            onRetry: () => handleSendMessage(content, { isRetry: true }),
          });
          
          setIsDMThinking(false);
          return; // Don't proceed with the action
        }
        // If it's not a ZodError, re-throw to be caught by outer catch
        throw validationError;
      }

      const result = await processPlayerAction(actionInput);

      addDebugMessages(result.debugLogs);

      if (result.error) throw new Error(result.error);
      if (result.messages) {
        // Ensure all messages from backend have unique IDs
        const messagesWithUniqueIds = result.messages.map((m, index) => ({
          ...m,
          content: m.content || '',
          id: m.id || `backend-msg-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 11)}`,
        }));
        addMessages(messagesWithUniqueIds, isRetry);
      }
      if (result.diceRolls) addDiceRolls(result.diceRolls);
      if (result.nextLocationId) {
        setLocationId(result.nextLocationId);
        locationIdRef.current = result.nextLocationId; // Update ref synchronously
      }
      if (result.updatedParty) {
        setParty(result.updatedParty);
        partyRef.current = result.updatedParty; // Update ref synchronously
        const player = result.updatedParty.find(p => p.id === selectedCharacterRef.current?.id);
        if (player) {
          setSelectedCharacter(player);
          selectedCharacterRef.current = player; // Update ref synchronously
        }
      }
      
      // Update enemies with HP changes if provided
      if (result.updatedEnemies) {
        setEnemies(result.updatedEnemies);
      }
      
      // Update combat-related states with synchronization
      if (typeof result.inCombat === 'boolean') {
        setInCombat(result.inCombat);
        inCombatRef.current = result.inCombat; // Update ref synchronously
        // If combat ends, clear combat-related states
        if (!result.inCombat) {
          setInitiativeOrder([]);
          setTurnIndex(0);
          setEnemies([]);
          // Update refs
          initiativeOrderRef.current = [];
          turnIndexRef.current = 0;
          enemiesRef.current = [];
        } else {
          // If combat starts or continues, update combat states
          if (result.initiativeOrder) {
            setInitiativeOrder(result.initiativeOrder);
            initiativeOrderRef.current = result.initiativeOrder;
          }
          if (result.turnIndex !== undefined) {
            setTurnIndex(result.turnIndex);
            turnIndexRef.current = result.turnIndex;
          }
          // Only update enemies if updatedEnemies is not provided (fallback to enemies)
          if (!result.updatedEnemies && result.enemies) {
            setEnemies(result.enemies);
            enemiesRef.current = result.enemies;
          }
        }
      } else {
        // If inCombat is not explicitly set, only update if provided
        if (result.initiativeOrder) {
          setInitiativeOrder(result.initiativeOrder);
          initiativeOrderRef.current = result.initiativeOrder;
        }
        if (result.turnIndex !== undefined) {
          setTurnIndex(result.turnIndex);
          turnIndexRef.current = result.turnIndex;
        }
        // Only update enemies if updatedEnemies is not provided (fallback to enemies)
        if (!result.updatedEnemies && result.enemies) {
          setEnemies(result.enemies);
          enemiesRef.current = result.enemies;
        }
      }
      
      // Update enemies ref if updatedEnemies is provided
      if (result.updatedEnemies) {
        enemiesRef.current = result.updatedEnemies;
      }
      
      // Step-by-step combat: Update hasMoreAITurns state
      if (result.hasMoreAITurns !== undefined) {
        setHasMoreAITurns(result.hasMoreAITurns);
        
        // If in auto-advance mode and there are more AI turns, continue automatically
        // Use ref for synchronous access to autoAdvancing state
        if (result.hasMoreAITurns && autoAdvancingRef.current) {
          addDebugMessages([`Auto-advancing to next AI turn in 1.5 seconds...`]);
          logClient.uiEvent('GameView', 'Step-by-step combat: Auto-advancing', {
            currentTurnIndex: result.turnIndex,
            hasMoreAITurns: result.hasMoreAITurns,
            autoAdvancing: autoAdvancingRef.current,
          });
          
          // Store the hasMoreAITurns value from this result
          const shouldContinue = result.hasMoreAITurns;
          
          setTimeout(() => {
            // Check again before continuing (in case user cancelled or combat ended)
            if (autoAdvancingRef.current && shouldContinue) {
              addDebugMessages([`Auto-continuing to next AI turn...`]);
              handleSendMessage('continuar turno', { isContinuation: true });
            } else {
              addDebugMessages([`Auto-advance cancelled or no more turns.`]);
              autoAdvancingRef.current = false;
              setAutoAdvancing(false);
            }
          }, 1500);
        } else if (!result.hasMoreAITurns) {
          // Combat reached player's turn or ended, exit auto-advance mode
          autoAdvancingRef.current = false;
          setAutoAdvancing(false);
        }
      } else {
        // No hasMoreAITurns field, assume no more AI turns
        setHasMoreAITurns(false);
        autoAdvancingRef.current = false;
        setAutoAdvancing(false);
      }

    } catch (error: any) {
      logClient.uiError('GameView', 'Error processing action', error, {
        action: content,
        inCombat: inCombatRef.current,
      });
      addDebugMessages([`CRITICAL ERROR: ${error.message}`, `DETAILS: ${JSON.stringify(error)}`]);
      addMessage({
        sender: 'Error',
        content: `El Dungeon Master está confundido. Error: ${error.message}. Revisa la consola para más detalles.`,
        onRetry: () => handleSendMessage(content, { isRetry: true }),
      });
      
      // Reset auto-advance mode on error
      autoAdvancingRef.current = false;
      setAutoAdvancing(false);
      setHasMoreAITurns(false);
    } finally {
      setIsDMThinking(false);
    }
  }, [addDebugMessages, addMessage, addMessages, buildConversationHistory, addDiceRolls]);

  const handleDiceRoll = useCallback((roll: { result: number, sides: number }) => {
    addDiceRolls([{
      roller: selectedCharacterRef.current?.name ?? 'Player',
      rollNotation: `1d${roll.sides}`,
      individualRolls: [roll.result],
      totalResult: roll.result,
      outcome: 'neutral',
      description: `Tirada de d${roll.sides} del jugador`
    }]);
  }, [addDiceRolls]);

  const handleInternalSaveGame = useCallback(() => {
    const saveData = { savedAt: new Date().toISOString(), party, messages, diceRolls, locationId, inCombat, initiativeOrder, enemies, turnIndex };
    
    logClient.info('Saving game', {
      component: 'GameView',
      action: 'saveGame',
      partySize: party.length,
      messagesCount: messages.length,
      diceRollsCount: diceRolls.length,
      locationId,
      inCombat,
      turnIndex,
      enemiesCount: enemies.length,
    });
    
    onSaveGame(saveData);
  }, [party, messages, diceRolls, locationId, inCombat, initiativeOrder, enemies, turnIndex, onSaveGame]);

  return (
    <GameLayout
      leftPanel={
        <LeftPanel
          diceRolls={diceRolls}
          debugMessages={debugMessages}
          initiativeOrder={initiativeOrder}
          turnIndex={turnIndex}
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
            onSelectCharacter={(character) => {
              setSelectedCharacter(character);
              selectedCharacterRef.current = character; // Update ref synchronously
            }}
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
        inCombat={inCombat}
        hasMoreAITurns={hasMoreAITurns}
        autoAdvancing={autoAdvancing}
        onPassTurn={() => {
          handleSendMessage('continuar turno', { isContinuation: true });
        }}
        onAdvanceAll={() => {
          autoAdvancingRef.current = true; // Set ref synchronously
          setAutoAdvancing(true);
          handleSendMessage('continuar turno', { isContinuation: true });
        }}
      />
    </GameLayout>
  );
}
