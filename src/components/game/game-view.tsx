"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type Character, type GameMessage, type DiceRoll, type InitiativeRoll, type Combatant, type VolumeSettings, CombatPhase } from "@/lib/types";
import { GameLayout } from "@/components/game/game-layout";
import { LeftPanel } from "@/components/layout/left-panel";
import { CharacterSheet } from "@/components/game/character-sheet";
import { ChatPanel } from "@/components/game/chat-panel";
import { Button } from "../ui/button";
import { Save } from "lucide-react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { processPlayerAction } from "@/app/actions";
import { PartyPanel } from "@/components/game/party-panel";
import { Separator } from "../ui/separator";
import { useToast } from "@/hooks/use-toast";
import { GameStateSchema } from "@/ai/flows/schemas";
import { logClient } from "@/lib/logger-client";
import { ZodError } from "zod";
import { InitiativeTracker } from "./initiative-tracker";
import { AppHeader } from "@/components/layout/app-header";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { MusicManager } from "./music-manager";
import { WorldState } from "@/lib/game/world-state-types";
import { WorldStateManager } from "@/lib/game/world-state-manager";

interface GameViewProps {
  initialData: {
    party: Character[];
    messages: GameMessage[];
    diceRolls: DiceRoll[];
    locationId: string;
    inCombat?: boolean;
    initiativeOrder?: Combatant[];
    turnIndex?: number;
    enemies?: any[]; // Deprecated: kept for backward compatibility
    enemiesByLocation?: Record<string, any[]>; // New: enemies by location
    openDoors?: Record<string, boolean>; // Map of "locationId:direction" -> isOpen
    worldState?: WorldState; // New: persisted world state
  };
  onSaveGame: (saveData: any) => void;
  onGoToMenu: () => void;
  adventureName: string;
  adventureData: any; // Added adventureData prop
}

export function GameView({ initialData, onSaveGame, onGoToMenu, adventureName, adventureData }: GameViewProps) {
  const { toast } = useToast();

  // Audio State
  const [volumeSettings, setVolumeSettings] = useState<VolumeSettings>({
    master: 0.5,
    music: 0.5,
    ambience: 0.5,
    sfx: 0.5,
    narrator: 1.0,
  });
  const [isMuted, setIsMuted] = useState(false);

  const handleVolumeChange = useCallback((channel: keyof VolumeSettings, value: number) => {
    setVolumeSettings(prev => ({
      ...prev,
      [channel]: value
    }));
  }, []);

  // State
  const [party, setParty] = useState<Character[]>(initialData.party);
  const [messages, setMessages] = useState<GameMessage[]>(initialData.messages);
  const [diceRolls, setDiceRolls] = useState<DiceRoll[]>(initialData.diceRolls);
  const [locationId, setLocationId] = useState(initialData.locationId);
  const [inCombat, setInCombat] = useState(initialData.inCombat || false);
  const [initiativeOrder, setInitiativeOrder] = useState<Combatant[]>(initialData.initiativeOrder || []);
  const [enemies, setEnemies] = useState<any[]>(initialData.enemies || []); // Deprecated: kept for backward compatibility
  const [enemiesByLocation, setEnemiesByLocation] = useState<Record<string, any[]>>(
    initialData.enemiesByLocation || {}
  );
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    initialData.party.find(c => c.controlledBy === 'Player') || null
  );
  const [isDMThinking, setIsDMThinking] = useState(false);
  // debugMessages removed
  const [turnIndex, setTurnIndex] = useState(initialData.turnIndex || 0);
  const [hasMoreAITurns, setHasMoreAITurns] = useState(false);
  const [combatPhase, setCombatPhase] = useState<CombatPhase>((initialData as any).phase || (initialData.inCombat ? CombatPhase.WAITING_FOR_ACTION : CombatPhase.SETUP));
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const [isPartyPanelCollapsed, setIsPartyPanelCollapsed] = useState(false); // Track if party panel is collapsed
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [openDoors, setOpenDoors] = useState<Record<string, boolean>>(initialData.openDoors || {});

  // Derived state for UI logic based purely on Combat Phase (FSM)
  // This simplifies logic and avoids synchronization issues with backend flags
  const showPassTurnButtons = combatPhase === CombatPhase.ACTION_RESOLVED;
  const playerActionCompleted = combatPhase === CombatPhase.ACTION_RESOLVED && initiativeOrder[turnIndex]?.controlledBy === 'Player';
  const justProcessedAITurn = combatPhase === CombatPhase.ACTION_RESOLVED && initiativeOrder[turnIndex]?.controlledBy !== 'Player';
  const autoAdvancingRef = useRef(false); // Use ref for synchronous access
  const combatPhaseRef = useRef<CombatPhase>((initialData as any).phase || (initialData.inCombat ? CombatPhase.WAITING_FOR_ACTION : CombatPhase.SETUP));
  const turnIndexRef = useRef(initialData.turnIndex || 0); // Use ref for synchronous access
  const initiativeOrderRef = useRef<Combatant[]>(initialData.initiativeOrder || []); // Use ref for synchronous access
  const enemiesRef = useRef<any[]>(initialData.enemies || []); // Deprecated: kept for backward compatibility
  const openDoorsRef = useRef<Record<string, boolean>>(initialData.openDoors || {}); // Use ref for synchronous access
  const enemiesByLocationRef = useRef<Record<string, any[]>>(initialData.enemiesByLocation || {}); // Use ref for synchronous access
  const partyRef = useRef<Character[]>(initialData.party); // Use ref for synchronous access
  const locationIdRef = useRef<string>(initialData.locationId); // Use ref for synchronous access
  const inCombatRef = useRef<boolean>(initialData.inCombat || false); // Use ref for synchronous access
  const messagesRef = useRef<GameMessage[]>(initialData.messages); // Use ref for synchronous access
  const selectedCharacterRef = useRef<Character | null>(initialData.party.find(c => c.controlledBy === 'Player') || null); // Use ref for synchronous access
  const prevStateRef = useRef<string | null>(null);


  // WorldState Ref
  const worldStateRef = useRef<WorldState>(initialData.worldState || WorldStateManager.initialize());

  const isPlayerTurn = !isDMThinking && initiativeOrder[turnIndex]?.controlledBy === 'Player';

  // Refs for synchronous access in callbacks
  // Note: turnIndexRef is NOT synced here - it's updated explicitly from backend responses
  // to maintain the "next turn" index separate from the visual display index
  useEffect(() => {
    initiativeOrderRef.current = initiativeOrder;
    enemiesRef.current = enemies; // Deprecated: kept for backward compatibility
    enemiesByLocationRef.current = enemiesByLocation;
    openDoorsRef.current = openDoors;
    partyRef.current = party;
    locationIdRef.current = locationId;
    inCombatRef.current = inCombat;
    messagesRef.current = messages;
    selectedCharacterRef.current = selectedCharacter;
    combatPhaseRef.current = combatPhase;
  }, [initiativeOrder, enemies, enemiesByLocation, openDoors, party, locationId, inCombat, messages, selectedCharacter, combatPhase]);

  // addDebugMessages removed

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
    setEnemies(initialData.enemies || []); // Deprecated: kept for backward compatibility
    setEnemiesByLocation(initialData.enemiesByLocation || {});
    setOpenDoors(initialData.openDoors || {});
    setCombatPhase((initialData as any).phase || (initialData.inCombat ? CombatPhase.WAITING_FOR_ACTION : CombatPhase.SETUP));
    combatPhaseRef.current = (initialData as any).phase || (initialData.inCombat ? CombatPhase.WAITING_FOR_ACTION : CombatPhase.SETUP);
    // setDebugMessages([]);
    // Sync refs with initial data
    turnIndexRef.current = initialData.turnIndex || 0;
    initiativeOrderRef.current = initialData.initiativeOrder || [];
    enemiesRef.current = initialData.enemies || []; // Deprecated: kept for backward compatibility
    enemiesByLocationRef.current = initialData.enemiesByLocation || {};
    openDoorsRef.current = initialData.openDoors || {};
    partyRef.current = initialData.party;
    // addDebugMessages(["Game state initialized from initialData."]);
    // Sync WorldState
    worldStateRef.current = initialData.worldState || WorldStateManager.initialize();
  }, [initialData]);

  // TEMPORAL: Log de estados para pruebas (Issue #11 y #12)
  useEffect(() => {
    // Crear una representación serializada del estado para comparar
    const currentState = JSON.stringify({
      inCombat,
      initiativeOrderLength: initiativeOrder.length,
      turnIndex,
      enemiesLength: enemies.length, // Deprecated
      enemiesByLocationKeys: Object.keys(enemiesByLocation),
      locationId,
      partySize: party.length,
    });

    // Solo loguear si el estado realmente cambió
    if (currentState !== prevStateRef.current) {
      prevStateRef.current = currentState;

      // Log estructurado y expandible
      console.groupCollapsed('🎮 [GameView] Estado actual');

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
            initiative: combatant.total,
            isPlayer: combatant.type === 'player',
            isEnemy: combatant.type === 'npc',
          });
        });
      } else {
        console.log('🗡️ Orden de iniciativa:', 'Vacío (no hay combate activo)');
      }

      // Enemigos - expandido (deprecated, usar enemiesByLocation)
      if (enemies.length > 0) {
        console.log('👹 Enemigos (deprecated):', enemies.length, 'enemigos');
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
        console.log('👹 Enemigos (deprecated):', 'Vacío (no hay enemigos)');
      }

      // Enemigos por ubicación - expandido
      const locationKeys = Object.keys(enemiesByLocation);
      if (locationKeys.length > 0) {
        console.log('🗺️ Enemigos por Ubicación:', locationKeys.length, 'ubicaciones');
        locationKeys.forEach(locId => {
          const locEnemies = enemiesByLocation[locId];
          console.log(`  📍 ${locId}:`, locEnemies.length, 'enemigos');
          locEnemies.forEach((enemy: any, index) => {
            const enemyName = enemy.name || enemy.characterName || enemy.id || 'Unknown';
            const isDead = enemy.hp && enemy.hp.current <= 0;
            console.log(`    ${index + 1}. ${enemyName}${isDead ? ' (MUERTO)' : ''}`, {
              id: enemy.id,
              name: enemyName,
              ...(enemy.hp && { hp: enemy.hp }),
              ...(enemy.ac && { ac: enemy.ac }),
              isDead,
            });
          });
        });
      } else {
        console.log('🗺️ Enemigos por Ubicación:', 'Vacío (no hay enemigos en ninguna ubicación)');
      }

      // Resumen compacto para referencia rápida
      console.log('📦 Resumen:', {
        inCombat,
        initiativeOrderCount: initiativeOrder.length,
        turnIndex,
        enemiesCount: enemies.length, // Deprecated
        enemiesByLocationCount: Object.keys(enemiesByLocation).length,
        currentLocationEnemiesCount: enemiesByLocation[locationId]?.length || 0,
        locationId,
        partySize: party.length,
      });

      console.groupEnd();
    }
  }, [inCombat, initiativeOrder, turnIndex, enemies, enemiesByLocation, locationId, party.length]);

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
    const wasInCombat = inCombatRef.current; // Capture state before action

    if (!isRetry && !isContinuation) {
      // Use active combatant name in combat, otherwise use selected character
      let senderName: string | undefined;
      let characterColor: string | undefined;

      if (wasInCombat && initiativeOrderRef.current[turnIndexRef.current]) {
        const activeCombatant = initiativeOrderRef.current[turnIndexRef.current];
        senderName = activeCombatant.characterName;
        // Find the character in the party to get their color
        const activeCharacter = partyRef.current.find(c => c.id === activeCombatant.id);
        characterColor = activeCharacter?.color;
      } else {
        senderName = selectedCharacterRef.current?.name;
        characterColor = selectedCharacterRef.current?.color;
      }
      addMessage({ sender: "Player", senderName, content, characterColor }, isRetry);
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
        phase: combatPhaseRef.current, // Send current combat phase to backend
        initiativeOrder: initiativeOrderRef.current,
        enemies: enemiesRef.current,
        enemiesByLocation: enemiesByLocationRef.current,
        openDoors: openDoorsRef.current,
      };

      logClient.uiEvent('GameView', 'Sending action to backend', {
        action: content,
        turnIndex: turnIndexRef.current,
        activeCombatant: turnIndexRef.current !== undefined
          ? initiativeOrderRef.current[turnIndexRef.current]?.characterName || 'Unknown'
          : 'N/A',
        inCombat: inCombatRef.current,
        initiativeOrderLength: initiativeOrderRef.current.length,
        initiativeOrder: initiativeOrderRef.current.map((c, i) => ({
          index: i,
          name: c.characterName,
          controlledBy: c.controlledBy,
          isCurrent: i === turnIndexRef.current,
        })),
      });

      // Debug: Log party HP to verify we're sending updated data
      if (inCombatRef.current) {
        const partyHpStatus = partyRef.current.map(p => `${p.name}: ${p.hp.current}/${p.hp.max}`).join(', ');
        // addDebugMessages([`Sending party to backend: ${partyHpStatus}`]);
      }

      // Validate the entire game state before sending
      try {
        GameStateSchema.parse(actionInput);
        // addDebugMessages(["Frontend state validation successful."]);
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

          /* addDebugMessages([
            `VALIDATION ERROR: ${errorMessages}`,
            `DETAILS: ${JSON.stringify(validationError.errors)}`
          ]); */

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

      // addDebugMessages(result.debugLogs);

      if (result.error) throw new Error(result.error);
      if (result.messages) {
        // Ensure all messages from backend have unique IDs
        const messagesWithUniqueIds = result.messages.map((m, index) => ({
          ...m,
          content: m.content || '',
          id: m.id || `backend-msg-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 11)}`,
        }));
        addMessages(messagesWithUniqueIds, isRetry);

        // Check if there's an inventory/spell/item error message (e.g., "No tienes el arma", "No conoces el hechizo")
        // If so, reset playerActionCompleted to allow player to try again
        const hasInventoryError = messagesWithUniqueIds.some(m => {
          if (m.sender !== 'DM') return false;
          const content = m.content?.toLowerCase() || '';
          return content.includes('no tienes el arma') ||
            content.includes('no tienes el objeto') ||
            content.includes('no conoces el hechizo') ||
            content.includes('no tienes') ||
            content.includes('no conoces') ||
            content.includes('acción no válida');
        });

        if (hasInventoryError && inCombatRef.current) {
          logClient.uiEvent('GameView', 'Inventory/spell/item error detected, resetting playerActionCompleted', {
            message: messagesWithUniqueIds.find(m => {
              const content = m.content?.toLowerCase() || '';
              return content.includes('no tienes') || content.includes('no conoces') || content.includes('acción no válida');
            })?.content,
          });
          setCombatPhase(CombatPhase.WAITING_FOR_ACTION);
        }
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

      // Update enemies with HP changes if provided (backward compatibility)
      if (result.updatedEnemies) {
        setEnemies(result.updatedEnemies);
        enemiesRef.current = result.updatedEnemies;
      }

      // Update enemiesByLocation if provided (new preferred method)
      if (result.updatedEnemiesByLocation) {
        setEnemiesByLocation(prev => {
          const updated = { ...prev, ...result.updatedEnemiesByLocation };
          enemiesByLocationRef.current = updated;
          return updated;
        });
      }

      // Update open doors if provided
      if (result.updatedOpenDoors) {
        setOpenDoors(prev => {
          const updated = { ...prev, ...result.updatedOpenDoors };
          openDoorsRef.current = updated;
          return updated;
        });
      }

      // Also update from enemiesByLocation if provided (for initial state)
      if (result.enemiesByLocation) {
        setEnemiesByLocation(prev => {
          const updated = { ...prev, ...result.enemiesByLocation };
          enemiesByLocationRef.current = updated;
          return updated;
        });
      }

      // Update combat-related states with synchronization
      if (typeof result.inCombat === 'boolean') {
        setInCombat(result.inCombat);
        inCombatRef.current = result.inCombat; // Update ref synchronously
        // If combat ends, clear combat-related states
        if (!result.inCombat) {
          setInitiativeOrder([]);
          setTurnIndex(0);
          // Don't clear enemies here - we need them for context (dead bodies, etc.)
          // setEnemies([]);
          // Update refs
          initiativeOrderRef.current = [];
          turnIndexRef.current = 0;
          // enemiesRef.current = [];
        } else {
          // If combat starts or continues, update combat states
          if (result.initiativeOrder) {
            setInitiativeOrder(result.initiativeOrder);
            initiativeOrderRef.current = result.initiativeOrder;
          }
          if (result.turnIndex !== undefined) {
            const oldTurnIndexRefValue = turnIndexRef.current;
            // Always update the ref to the next turn for internal logic
            turnIndexRef.current = result.turnIndex;

            logClient.uiEvent('GameView', 'turnIndexRef updated', {
              previousRefValue: oldTurnIndexRefValue,
              newRefValue: turnIndexRef.current,
              receivedFromBackend: result.turnIndex,
              lastProcessedTurnIndex: result.lastProcessedTurnIndex,
              lastProcessedTurnWasAI: result.lastProcessedTurnWasAI,
              hasMoreAITurns: result.hasMoreAITurns,
              initiativeOrder: initiativeOrderRef.current.map((c, i) => ({
                index: i,
                name: c.characterName,
                controlledBy: c.controlledBy,
                isRef: i === turnIndexRef.current,
                isProcessed: i === result.lastProcessedTurnIndex,
              })),
            });

            // NEW SIMPLE LOGIC: The backend explicitly tells us if an AI turn was processed
            if (result.lastProcessedTurnWasAI) {
              // An AI turn was just processed - show that turn in the UI
              const displayIndex = result.lastProcessedTurnIndex ?? result.turnIndex;

              logClient.uiEvent('GameView', 'Backend processed AI turn', {
                displayIndex,
                displayCombatant: initiativeOrderRef.current[displayIndex]?.characterName || 'Unknown',
                nextTurnIndex: result.turnIndex,
                nextCombatant: initiativeOrderRef.current[result.turnIndex]?.characterName || 'Unknown',
                hasMoreAITurns: result.hasMoreAITurns,
              });

              setTurnIndex(displayIndex);
            } else {
              // No AI turn was processed - show the next turn (player's turn or combat just started with player)
              logClient.uiEvent('GameView', 'No AI turn processed', {
                turnIndex: result.turnIndex,
                combatant: initiativeOrderRef.current[result.turnIndex]?.characterName || 'Unknown',
              });

              setTurnIndex(result.turnIndex);
            }
          }
          // Only update enemies if updatedEnemies is not provided (fallback to enemies) - backward compatibility
          if (!result.updatedEnemies && result.enemies) {
            setEnemies(result.enemies);
            enemiesRef.current = result.enemies;
          }

          // Update enemiesByLocation if provided
          if (result.updatedEnemiesByLocation) {
            setEnemiesByLocation(prev => {
              const updated = { ...prev, ...result.updatedEnemiesByLocation };
              enemiesByLocationRef.current = updated;
              return updated;
            });
          }
        }
      } else {
        // If inCombat is not explicitly set, only update if provided
        if (result.initiativeOrder) {
          setInitiativeOrder(result.initiativeOrder);
          initiativeOrderRef.current = result.initiativeOrder;
        }
        if (result.turnIndex !== undefined) {
          // Always update the ref to the next turn for internal logic
          turnIndexRef.current = result.turnIndex;

          // NEW SIMPLE LOGIC: The backend explicitly tells us if an AI turn was processed
          if (result.lastProcessedTurnWasAI) {
            // An AI turn was just processed - show that turn in the UI
            const displayIndex = result.lastProcessedTurnIndex ?? result.turnIndex;

            logClient.uiEvent('GameView', 'Backend processed AI turn', {
              displayIndex,
              displayCombatant: initiativeOrderRef.current[displayIndex]?.characterName || 'Unknown',
              nextTurnIndex: result.turnIndex,
              nextCombatant: initiativeOrderRef.current[result.turnIndex]?.characterName || 'Unknown',
              hasMoreAITurns: result.hasMoreAITurns,
            });

            setTurnIndex(displayIndex);
          } else {
            // No AI turn was processed - show the next turn (player's turn or combat just started with player)
            logClient.uiEvent('GameView', 'No AI turn processed', {
              turnIndex: result.turnIndex,
              combatant: initiativeOrderRef.current[result.turnIndex]?.characterName || 'Unknown',
            });

            setTurnIndex(result.turnIndex);
          }
        }
        // Only update enemies if updatedEnemies is not provided (fallback to enemies) - backward compatibility
        if (!result.updatedEnemies && result.enemies) {
          setEnemies(result.enemies);
          enemiesRef.current = result.enemies;
        }

        // Update enemiesByLocation if provided
        if (result.enemiesByLocation) {
          setEnemiesByLocation(prev => {
            const updated = { ...prev, ...result.enemiesByLocation };
            enemiesByLocationRef.current = updated;
            return updated;
          });
        }
      }

      // Step-by-step combat: Update Combat Phase from FSM
      if (result.phase) {
        logClient.uiEvent('GameView', 'Updating Combat Phase', { phase: result.phase });
        setCombatPhase(result.phase);
      }

      // Handle Auto-Advance logic based on FSM state
      if (autoAdvancingRef.current) {
        // If we are in ACTION_RESOLVED and not player turn (or player turn auto-skip?), continue
        // Actually, auto-advance usually applies to AI turns.
        // If phase is ACTION_RESOLVED and current turn is NOT player, we continue.

        // We need to look at the turn that JUST completed. 
        // If result.lastProcessedTurnWasAI is true, it means we just finished an AI turn.
        // OR if the current phase is ACTION_RESOLVED and the active combatant (before advance) was AI.

        // Simplified Logic: If backend says "lastProcessedTurnWasAI", we auto-advance.
        // This is safe because backend controls the flow.

        if (result.lastProcessedTurnWasAI) {
          logClient.uiEvent('GameView', 'Auto-advancing AI turn', {
            turnIndex: result.turnIndex,
          });

          setTimeout(() => {
            if (autoAdvancingRef.current) {
              handleSendMessage('continuar turno', { isContinuation: true });
            }
          }, 1500);
        } else {
          // Stop auto-advance if it wasn't an AI turn (e.g. Player turn reached or Combat End)
          logClient.uiEvent('GameView', 'Stopping auto-advance (Not AI turn)', {
            turnIndex: result.turnIndex,
          });
          autoAdvancingRef.current = false;
          setAutoAdvancing(false);
        }
      }
    } catch (error: any) {
      logClient.uiError('GameView', 'Error processing action', error, {
        action: content,
        inCombat: inCombatRef.current,
      });
      // addDebugMessages([`CRITICAL ERROR: ${error.message}`, `DETAILS: ${JSON.stringify(error)}`]);
      addMessage({
        sender: 'Error',
        content: `El Dungeon Master está confundido. Error: ${error.message}. Revisa la consola para más detalles.`,
        onRetry: () => handleSendMessage(content, { isRetry: true }),
      });

      // Reset auto-advance mode on error
      autoAdvancingRef.current = false;
      setAutoAdvancing(false);
    } finally {
      setIsDMThinking(false);
    }
  }, [addMessage, addMessages, buildConversationHistory, addDiceRolls]);

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

  const handlePassTurn = useCallback(() => {
    const currentCombatant = initiativeOrderRef.current[turnIndex]?.characterName || 'Unknown';
    const nextIndexVisual = initiativeOrderRef.current.length > 0
      ? (turnIndexRef.current + 1) % initiativeOrderRef.current.length
      : turnIndexRef.current;
    const nextCombatant = initiativeOrderRef.current[nextIndexVisual]?.characterName || 'Unknown';

    logClient.uiEvent('GameView', 'Pasar 1 Turno clicked', {
      currentTurnIndex: turnIndex,
      currentCombatant,
      nextTurnIndex: nextIndexVisual,
      nextCombatant,
      phase: combatPhase,
      showPassTurnButtons,
      inCombat: inCombatRef.current,
    });

    // 1. Visually advance the turn indicator immediately to the next combatant.
    logClient.uiEvent('GameView', 'Updating visual turnIndex', {
      from: turnIndex,
      to: nextIndexVisual,
      combatant: nextCombatant,
    });
    setTurnIndex(nextIndexVisual);

    // 2. If we are in ACTION_RESOLVED, send continue_turn to advance FSM
    if (combatPhase === CombatPhase.ACTION_RESOLVED) {
      logClient.uiEvent('GameView', 'Sending continuar turno request', {
        reason: 'Phase is ACTION_RESOLVED',
        phase: combatPhase,
        nextTurnIndex: turnIndexRef.current,
        nextCombatant,
      });
      handleSendMessage('continuar turno', { isContinuation: true });
    } else {
      logClient.uiEvent('GameView', 'NOT sending continuar turno request', {
        reason: 'Phase is not ACTION_RESOLVED',
        phase: combatPhase
      });
    }
  }, [turnIndex, combatPhase, showPassTurnButtons, handleSendMessage]);

  const handleAdvanceAll = useCallback(() => {
    logClient.uiEvent('GameView', 'Avance automático clicked', {
      turnIndex,
    });

    // Enable auto-advance mode
    setAutoAdvancing(true);
    autoAdvancingRef.current = true;

    // Execute pass turn logic to start the chain
    handlePassTurn();
  }, [turnIndex, handlePassTurn]);

  const handleInternalSaveGame = useCallback(() => {
    // Construct up-to-date WorldState from current tracking state
    const currentWorldState: WorldState = worldStateRef.current || WorldStateManager.initialize();

    // Sync enemies
    Object.entries(enemiesByLocation).forEach(([locId, enemies]) => {
      WorldStateManager.updateEnemies(currentWorldState, locId, enemies);
    });

    // Sync doors
    Object.entries(openDoors).forEach(([key, isOpen]) => {
      // Assuming key format is "locationId:direction"
      const parts = key.split(':');
      // Handle case where locationId might contain colons? Assuming simple split for MVP or verifying format.
      // If locationId has colons, this split is risky.
      // Standard ID is usually uuid or simple string.
      if (parts.length >= 2) {
        const direction = parts.pop()!;
        const locId = parts.join(':');
        WorldStateManager.updateConnection(currentWorldState, locId, direction, { isOpen });
      }
    });

    const saveData = {
      savedAt: new Date().toISOString(),
      party,
      messages,
      diceRolls,
      locationId,
      inCombat,
      initiativeOrder,
      enemies,
      turnIndex,
      openDoors,
      enemiesByLocation,
      worldState: currentWorldState
    };

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
      worldStateLocations: Object.keys(currentWorldState.locations).length
    });

    onSaveGame(saveData);
  }, [party, messages, diceRolls, locationId, inCombat, initiativeOrder, enemies, turnIndex, openDoors, enemiesByLocation, onSaveGame]);

  return (
    <div className="flex flex-col h-full">
      {/* Music Manager (Invisible) */}
      <MusicManager
        locationId={locationId}
        inCombat={inCombat}
        adventureData={adventureData}
        volumeSettings={volumeSettings}
        isMuted={isMuted}
      />

      <AppHeader
        showMenuButton={true}
        onGoToMenu={onGoToMenu}
        adventureName={adventureName}
        actions={
          <Button variant="ghost" size="icon" onClick={handleInternalSaveGame}>
            <Save className="h-6 w-6" />
            <span className="sr-only">Guardar Partida</span>
          </Button>
        }
      />
      <GameLayout
        isLeftPanelCollapsed={isLeftPanelCollapsed}
        isRightPanelCollapsed={isRightPanelCollapsed}
        onToggleLeftPanel={() => setIsLeftPanelCollapsed(prev => !prev)}
        onToggleRightPanel={() => setIsRightPanelCollapsed(prev => !prev)}
        leftPanel={
          <LeftPanel
            diceRolls={diceRolls}
            initiativeOrder={initiativeOrder}
            turnIndex={turnIndex}
          />
        }
        characterSheet={
          <div className="flex flex-col h-full">
            {isPartyPanelCollapsed && (
              <button
                type="button"
                aria-label="Mostrar panel del grupo"
                onClick={() => setIsPartyPanelCollapsed(false)}
                className="flex w-full items-center justify-center bg-card border-y border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/20 py-[2px]"
              >
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
            {!isPartyPanelCollapsed && (
              <>
                <div className="flex-shrink-0">
                  <PartyPanel
                    party={party}
                    selectedCharacterId={selectedCharacter?.id}
                    onSelectCharacter={(character) => {
                      setSelectedCharacter(character);
                      selectedCharacterRef.current = character;
                    }}
                  />
                </div>
                <button
                  type="button"
                  aria-label="Ocultar panel del grupo"
                  onClick={() => setIsPartyPanelCollapsed(true)}
                  className="flex w-full items-center justify-center bg-card border-y border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/20 py-[2px]"
                >
                  <ChevronUp className="h-3 w-3 text-muted-foreground" />
                </button>
              </>
            )}
            <div className="flex-1 overflow-hidden">
              <CharacterSheet character={selectedCharacter} />
            </div>
          </div>
        }
      >
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isThinking={isDMThinking}
          inCombat={inCombat}
          hasMoreAITurns={false} // Deprecated, relying on FSM phase now
          justProcessedAITurn={showPassTurnButtons} // Unified flag for showing buttons
          autoAdvancing={autoAdvancing}
          playerActionCompleted={playerActionCompleted}
          isPlayerTurn={isPlayerTurn}
          onPassTurn={handlePassTurn}
          onAdvanceAll={handleAdvanceAll}
          volumeSettings={volumeSettings}
          isMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          onToggleMute={() => setIsMuted(prev => !prev)}
        />
      </GameLayout>
    </div>
  );
}

