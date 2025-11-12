
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

  const { toast } = useToast();

  const addDebugMessages = useCallback((newLogs: string[] | undefined) => {
    if (!newLogs || newLogs.length === 0) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formattedLogs = newLogs.map(log => `[${timestamp}] ${log}`);
    setDebugMessages(prev => [...prev, ...formattedLogs].slice(-200));
  }, []);

  useEffect(() => {
    setParty(initialData.party);
    setMessages(initialData.messages);
    setDiceRolls(initialData.diceRolls);
    setLocationId(initialData.locationId);
    setSelectedCharacter(initialData.party.find(c => c.controlledBy === 'Player') || null);
    setInCombat(initialData.inCombat || false);
    setInitiativeOrder(initialData.initiativeOrder || []);
    setTurnIndex(initialData.turnIndex || 0);
    setEnemies(initialData.enemies || []);
    setDebugMessages([]);
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

  const addMessage = useCallback((message: Omit<GameMessage, 'id' | 'timestamp'>, isRetryMessage: boolean = false) => {
    const messageToAdd: GameMessage = {
      ...message,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
    // Returning the raw message objects now
    return messages.slice(-10);
  }, [messages]);

  const handleSendMessage = useCallback(async (content: string, options: { isRetry?: boolean, isContinuation?: boolean } = {}) => {
    const { isRetry = false, isContinuation = false } = options;

    if (!isRetry && !isContinuation) {
      addMessage({ sender: "Player", senderName: selectedCharacter?.name, content }, isRetry);
    } else if (isRetry) {
      setMessages(prev => [...prev.filter(m => m.sender !== 'Error')]);
    }

    setIsDMThinking(true);

    try {
      const conversationHistory = buildConversationHistory();
      const actionInput = { 
        playerAction: content, 
        party, 
        locationId, 
        inCombat, 
        conversationHistory, 
        turnIndex,
        initiativeOrder,
        enemies,
      };

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
      if (result.messages) addMessages(result.messages.map(m => ({ ...m, content: m.content || '' })), isRetry);
      if (result.diceRolls) addDiceRolls(result.diceRolls);
      if (result.nextLocationId) setLocationId(result.nextLocationId);
      if (result.updatedParty) {
        setParty(result.updatedParty);
        const player = result.updatedParty.find(p => p.id === selectedCharacter?.id);
        if (player) setSelectedCharacter(player);
      }
      
      // Update combat-related states with synchronization
      if (typeof result.inCombat === 'boolean') {
        setInCombat(result.inCombat);
        // If combat ends, clear combat-related states
        if (!result.inCombat) {
          setInitiativeOrder([]);
          setTurnIndex(0);
          setEnemies([]);
        } else {
          // If combat starts or continues, update combat states
          if (result.initiativeOrder) setInitiativeOrder(result.initiativeOrder);
          if (result.turnIndex !== undefined) setTurnIndex(result.turnIndex);
          if (result.enemies) setEnemies(result.enemies);
        }
      } else {
        // If inCombat is not explicitly set, only update if provided
        if (result.initiativeOrder) setInitiativeOrder(result.initiativeOrder);
        if (result.turnIndex !== undefined) setTurnIndex(result.turnIndex);
        if (result.enemies) setEnemies(result.enemies);
      }

    } catch (error: any) {
      logClient.uiError('GameView', 'Error processing action', error, {
        action: content,
        inCombat,
      });
      addDebugMessages([`CRITICAL ERROR: ${error.message}`, `DETAILS: ${JSON.stringify(error)}`]);
      addMessage({
        sender: 'Error',
        content: `El Dungeon Master está confundido. Error: ${error.message}. Revisa la consola para más detalles.`,
        onRetry: () => handleSendMessage(content, { isRetry: true }),
      });
    } finally {
      setIsDMThinking(false);
    }
  }, [addDebugMessages, addMessage, addMessages, buildConversationHistory, inCombat, locationId, party, selectedCharacter, addDiceRolls, turnIndex, initiativeOrder, enemies]);

  const handleDiceRoll = useCallback((roll: { result: number, sides: number }) => {
    addDiceRolls([{
      roller: selectedCharacter?.name ?? 'Player',
      rollNotation: `1d${roll.sides}`,
      individualRolls: [roll.result],
      totalResult: roll.result,
      outcome: 'neutral',
      description: `Tirada de d${roll.sides} del jugador`
    }]);
  }, [addDiceRolls, selectedCharacter]);

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
