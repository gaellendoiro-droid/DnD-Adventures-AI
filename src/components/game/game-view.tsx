"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type Character, type GameMessage, type DiceRoll, type InitiativeRoll, type Combatant, type VolumeSettings, CombatPhase } from "@/lib/types";
import { GameLayout } from "@/components/game/game-layout";
import { LeftPanel } from "@/components/layout/left-panel";
import { CharacterSheet } from "@/components/game/character-sheet";
import { ChatPanel } from "@/components/game/chat-panel";
import { Button } from "../ui/button";
import { Save, Map, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
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
import { searchCompendium } from "@/app/actions/compendium";
import { SearchResult } from "@/app/actions/compendium";
import { formatCompendiumEntry, formatNotFoundMessage } from "@/lib/game/compendium-formatter";
import { useGameStream } from "@/hooks/use-game-stream";
import { parseAIProviderError } from "@/lib/ai/ai-error-handler";


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

  // Zoom and Pan states for Tactical Map
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [mapDragStart, setMapDragStart] = useState({ x: 0, y: 0 });

  const handleResetMapView = useCallback(() => {
    setMapZoom(1);
    setMapPosition({ x: 0, y: 0 });
  }, []);

  const handleMapWheel = useCallback((e: React.WheelEvent) => {
    const zoomStep = 0.1;
    setMapZoom(prev => {
      const newZoom = prev + (e.deltaY < 0 ? zoomStep : -zoomStep);
      return Math.max(0.5, Math.min(4, newZoom));
    });
  }, []);

  const handleMapMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingMap(true);
    setMapDragStart({ x: e.clientX - mapPosition.x, y: e.clientY - mapPosition.y });
  }, [mapPosition]);

  const handleMapMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingMap) return;
    setMapPosition({
      x: e.clientX - mapDragStart.x,
      y: e.clientY - mapDragStart.y
    });
  }, [isDraggingMap, mapDragStart]);

  const handleMapMouseUpOrLeave = useCallback(() => {
    setIsDraggingMap(false);
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
  const [turnIndex, setTurnIndex] = useState(initialData.turnIndex || 0);
  const [hasMoreAITurns, setHasMoreAITurns] = useState(false);
  const [combatPhase, setCombatPhase] = useState<CombatPhase>((initialData as any).phase || (initialData.inCombat ? CombatPhase.WAITING_FOR_ACTION : CombatPhase.SETUP));
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const [isPartyPanelCollapsed, setIsPartyPanelCollapsed] = useState(false);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [openDoors, setOpenDoors] = useState<Record<string, boolean>>(initialData.openDoors || {});
  const [isMapOpen, setIsMapOpen] = useState(false);

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


  // WorldState reactive state
  const [worldState, setWorldState] = useState<WorldState>(() => initialData.worldState || WorldStateManager.initialize());

  // Sync ref for async callbacks
  const worldStateRef = useRef<WorldState>(worldState);
  useEffect(() => {
    worldStateRef.current = worldState;
  }, [worldState]);

  const syncDerivedStateFromWorldState = useCallback((ws: WorldState) => {
    if (!ws || !ws.locations) return;

    // Derivar puertas abiertas
    const derivedOpenDoors: Record<string, boolean> = {};
    Object.entries(ws.locations).forEach(([locId, locState]: [string, any]) => {
      if (locState.connections) {
        Object.entries(locState.connections).forEach(([direction, connState]: [string, any]) => {
          if (connState.isOpen) {
            derivedOpenDoors[`${locId}:${direction}`] = true;
          }
        });
      }
    });
    setOpenDoors(derivedOpenDoors);
    openDoorsRef.current = derivedOpenDoors;

    // Derivar enemigos por localización
    const derivedEnemiesByLocation: Record<string, any[]> = {};
    Object.entries(ws.locations).forEach(([locId, locState]: [string, any]) => {
      if (locState.enemies) {
        derivedEnemiesByLocation[locId] = locState.enemies;
      }
    });
    setEnemiesByLocation(derivedEnemiesByLocation);
    enemiesByLocationRef.current = derivedEnemiesByLocation;
  }, []);

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
    partyRef.current = initialData.party;
    
    // Sync WorldState and derive legacy variables (openDoors, enemiesByLocation)
    const ws = initialData.worldState || WorldStateManager.initialize();
    setWorldState(ws);
    syncDerivedStateFromWorldState(ws);
  }, [initialData, syncDerivedStateFromWorldState]);



  // Modify handleSendMessage to use streaming

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

  const addMessages = useCallback((newMessages: Partial<GameMessage>[], isRetry: boolean = false) => {
    if (!newMessages || newMessages.length === 0) return;
    const baseTimestamp = Date.now();
    const messagesToAdd = newMessages.map((m, index) => {
      // If ID exists, use it. Otherwise generate one.
      const id = m.id || `msg-${baseTimestamp}-${messageIdCounterRef.current++}-${index}-${Math.random().toString(36).substring(2, 11)}`;
      // If Timestamp exists, use it.
      const timestamp = m.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return {
        ...m,
        id,
        timestamp,
        // Ensure required fields
        sender: m.sender || 'System',
        content: m.content || '',
      } as GameMessage;
    });
    setMessages((prev) => {
      const filteredMessages = isRetry ? prev.filter(m => m.sender !== 'Error') : prev;

      // Basic deduplication by ID just in case
      const existingIds = new Set(filteredMessages.map(m => m.id));
      const uniqueNewMessages = messagesToAdd.filter(m => !existingIds.has(m.id));

      const updatedMessages = [...filteredMessages, ...uniqueNewMessages];
      messagesRef.current = updatedMessages; // Update ref synchronously
      return updatedMessages;
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

  // Streaming Integration
  const handleStateUpdate = useCallback((result: any) => {
    // 1. Messages (New!)
    if (result.messages) {
      addMessages(result.messages);
    }

    // 2. Dice Rolls
    if (result.diceRolls) addDiceRolls(result.diceRolls);

    // 3. Location
    if (result.nextLocationId) {
      setLocationId(result.nextLocationId);
      locationIdRef.current = result.nextLocationId;
    }

    // 4. Party
    if (result.updatedParty) {
      setParty(result.updatedParty);
      partyRef.current = result.updatedParty;
      const player = result.updatedParty.find((p: Character) => 
        (p.id && selectedCharacterRef.current?.id && p.id.toString().trim() === selectedCharacterRef.current.id.toString().trim()) ||
        (p.name && selectedCharacterRef.current?.name && p.name.toLowerCase().trim() === selectedCharacterRef.current.name.toLowerCase().trim())
      );
      if (player) {
        setSelectedCharacter(player);
        selectedCharacterRef.current = player;
      }
    }

    // 5. Enemies & Doors (State Merging)
    if (result.updatedEnemies) { // Legacy
      setEnemies(result.updatedEnemies);
      enemiesRef.current = result.updatedEnemies;
    }
    if (result.updatedEnemiesByLocation) {
      setEnemiesByLocation(prev => {
        const updated = { ...prev, ...result.updatedEnemiesByLocation };
        enemiesByLocationRef.current = updated;
        return updated;
      });
    }
    if (result.updatedOpenDoors) {
      setOpenDoors(prev => {
        const updated = { ...prev, ...result.updatedOpenDoors };
        openDoorsRef.current = updated;
        return updated;
      });
    }
    // enemiesByLocation/enemies explicit override (rare)
    if (result.enemiesByLocation) {
      setEnemiesByLocation(prev => {
        const updated = { ...prev, ...result.enemiesByLocation };
        enemiesByLocationRef.current = updated;
        return updated;
      });
    }
    if (result.enemies) { // fallback
      if (!result.updatedEnemies) {
        setEnemies(result.enemies);
        enemiesRef.current = result.enemies;
      }
    }
    if (result.party) { // fallback full replace
      setParty(result.party);
      partyRef.current = result.party;
      const player = result.party.find((p: Character) => 
        (p.id && selectedCharacterRef.current?.id && p.id.toString().trim() === selectedCharacterRef.current.id.toString().trim()) ||
        (p.name && selectedCharacterRef.current?.name && p.name.toLowerCase().trim() === selectedCharacterRef.current.name.toLowerCase().trim())
      );
      if (player) {
        setSelectedCharacter(player);
        selectedCharacterRef.current = player;
      }
    }
    if (result.locationId) {
      setLocationId(result.locationId);
      locationIdRef.current = result.locationId;
    }
    if (result.worldState) {
      setWorldState(result.worldState);
      worldStateRef.current = result.worldState;
      syncDerivedStateFromWorldState(result.worldState);
    }


    // 6. Combat State & FSM
    // This is complex. We receive partial updates.
    if (typeof result.inCombat === 'boolean') {
      setInCombat(result.inCombat);
      inCombatRef.current = result.inCombat;

      if (!result.inCombat) {
        // Combat Ended
        setInitiativeOrder([]);
        setTurnIndex(0);
        initiativeOrderRef.current = [];
        turnIndexRef.current = 0;
      } else {
        // Combat Active/Started
        if (result.initiativeOrder) {
          setInitiativeOrder(result.initiativeOrder);
          initiativeOrderRef.current = result.initiativeOrder;
        }
        // IMPORTANT: If we receive turnIndex, we update it.
        if (result.turnIndex !== undefined) {
          const oldTurn = turnIndexRef.current;
          turnIndexRef.current = result.turnIndex;

          // AI Auto-Advance Logic
          if (result.lastProcessedTurnWasAI) {
            const displayIndex = result.lastProcessedTurnIndex ?? result.turnIndex;
            setTurnIndex(displayIndex);
          } else {
            setTurnIndex(result.turnIndex);
          }
        }
      }
    } else {
      // No Change in inCombat explicitly, but maybe updates to order
      if (result.initiativeOrder) {
        setInitiativeOrder(result.initiativeOrder);
        initiativeOrderRef.current = result.initiativeOrder;
      }
      if (result.turnIndex !== undefined) {
        turnIndexRef.current = result.turnIndex;
        if (result.lastProcessedTurnWasAI) {
          const displayIndex = result.lastProcessedTurnIndex ?? result.turnIndex;
          setTurnIndex(displayIndex);
        } else {
          setTurnIndex(result.turnIndex);
        }
      }
    }

    // 7. Phase Update
    if (result.phase) {
      setCombatPhase(result.phase);
    }

    // 8. Auto-Advance Trigger
    if (autoAdvancingRef.current && result.lastProcessedTurnWasAI) {
      setTimeout(() => {
        if (autoAdvancingRef.current) {
          // Use the stream sendMessage directly? 
          // No, use handleSendMessage wrapper to ensure consisteny
          handleSendMessage('continuar turno', { isContinuation: true });
        }
      }, 1500);
    } else if (autoAdvancingRef.current && !result.lastProcessedTurnWasAI) {
      // Stop auto advance
      autoAdvancingRef.current = false;
      setAutoAdvancing(false);
    }

  }, []); // Dependencies will be handled by refs where possible, or added if stable


  const handleStreamComplete = useCallback((content: string) => {
    // Legacy: The streaming content is now handled via state_delta messages.
    // Use this callback ONLY for ephemeral UI cleanup or logic that depends on the 'Done' signal.

    // We DON'T add 'content' as a message anymore, because 'messages' are sent structurally.
    // However, if we ever needed a fallback for "Raw Stream Only" scenarios, we could check if messages were empty.
    // For now, assume backend reliability.

    setIsDMThinking(false);
  }, []);

  const lastPlayerActionRef = useRef<string>('');
  const handleSendMessageRef = useRef<((content: string, options?: { isRetry?: boolean; isContinuation?: boolean }) => Promise<void>) | null>(null);

  const handleStreamError = useCallback((error: Error) => {
    logClient.uiError('GameView', 'Stream Error', error);
    const aiError = parseAIProviderError(error);
    const lastAction = lastPlayerActionRef.current;

    addMessage({
      sender: 'Error',
      senderName: `Aviso de IA (${aiError.provider})`,
      content: `${aiError.title}: ${aiError.userMessage}`,
      aiError,
      onRetry:
        aiError.isRetryable && lastAction
          ? () => {
              handleSendMessageRef.current?.(lastAction, { isRetry: true });
            }
          : undefined,
    });
    setIsDMThinking(false);
    setAutoAdvancing(false);
    autoAdvancingRef.current = false;
  }, [addMessage]);

  const { sendMessage: sendStreamMessage, isStreaming, streamedContent, currentStatus } = useGameStream({
    url: '/api/game/stream',
    onStateUpdate: handleStateUpdate,
    onStreamComplete: handleStreamComplete,
    onError: handleStreamError
  });

  const handleSendMessage = useCallback(async (content: string, options: { isRetry?: boolean, isContinuation?: boolean } = {}) => {
    const { isRetry = false, isContinuation = false } = options;
    const wasInCombat = inCombatRef.current; // Capture state before action
    lastPlayerActionRef.current = content;

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

    // --- COMPENDIUM COMMAND (Universal Search) ---
    if (content.startsWith('??')) {
      const query = content.substring(2).trim();
      if (query.length < 3) {
        addMessage({ sender: 'System', content: '❌ La consulta debe tener al menos 3 caracteres.' });
        return;
      }

      // Show user query
      // addMessage({ sender: 'Player', senderName: 'Consulta', content: `🔍 Buscando: "${query}"...`, characterColor: '#888888' });
      // Actually, better to just show the "Thinking" state and then the result, 
      // or show the query as a command. Let's show it as a specialized command.

      setIsDMThinking(true);
      try {
        // Detectar tipo implícito (heuristicas simples o default monster)
        // Por defecto buscamos en todo (DataService sabe buscar en local por nombre en todas las tablas)
        // Pero nuestro server action pide un type. Hagamos que el usuario pueda especificar "??hechizo Bola de fuego"
        // O más simple: Probamos Monster primero, si no Rule.
        // Mejor estrategia: Intentar Monster, luego Spell, luego Item, luego Rule (Chain of Responsibility en backend sería ideal, pero simulémoslo o usemos 'rule' como fallback).

        // Versión Simple: Asumimos 'rule' si es texto largo, o 'monster' por defecto.
        // O mejor: Modificar el backend para que busque en todo. 
        // DADO que no quiero cambiar el backend ahora mismo (aunque debería), voy a hacer una búsqueda "inteligente" secuencial aquí o asumir Monster/Rule.

        // Estrategia UX: "?? Texto" -> Intenta buscar Regla (RAG es más genérico).
        // "??m Texto" -> Monster
        // "??s Texto" -> Spell
        // "??i Texto" -> Item

        let type: 'monster' | 'spell' | 'item' | 'rule' = 'rule'; // Default to rule (safest RAG)
        let cleanQuery = query;

        if (content.startsWith('??m ')) { type = 'monster'; cleanQuery = content.substring(4).trim(); }
        else if (content.startsWith('??s ')) { type = 'spell'; cleanQuery = content.substring(4).trim(); }
        else if (content.startsWith('??i ')) { type = 'item'; cleanQuery = content.substring(4).trim(); }
        else if (content.startsWith('??r ')) { type = 'rule'; cleanQuery = content.substring(4).trim(); }

        const result = await searchCompendium(cleanQuery, type);

        if (result.found && result.data) {
          const displayContent = formatCompendiumEntry(type, result.data, cleanQuery);

          addMessage({
            sender: 'System',
            senderName: 'Compendio',
            content: displayContent,
            characterColor: '#4a9eff' // Azulito chulo
          });
        } else {
          // Caso NO ENCONTRADO: Mensaje amigable del DM
          const noFoundMsg = formatNotFoundMessage(cleanQuery);

          addMessage({
            sender: 'System',
            senderName: 'DM', // Usamos DM para darle personalidad
            content: noFoundMsg
          });
        }

      } catch (e: any) {
        addMessage({ sender: 'Error', content: `Error consultando compendio: ${e.message}` });
      } finally {
        setIsDMThinking(false);
      }
      return; // Stop here, do not send to game backend
    }
    // ---------------------------------------------

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
        worldState: worldStateRef.current,
        selectedCharacterId: selectedCharacterRef.current?.id,
      };

      logClient.debug('Sending action to backend', {
        component: 'GameView',
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
          const errorMessages = (validationError as any).errors.map((err: any) => {
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

      await sendStreamMessage(content, actionInput);

    } catch (error: any) {
      logClient.uiError('GameView', 'Error processing action', error, {
        action: content,
        inCombat: inCombatRef.current,
      });
      const aiError = parseAIProviderError(error);
      addMessage({
        sender: 'Error',
        senderName: `Aviso de IA (${aiError.provider})`,
        content: `${aiError.title}: ${aiError.userMessage}`,
        aiError,
        onRetry: () => handleSendMessage(content, { isRetry: true }),
      });

      // Reset auto-advance mode on error
      autoAdvancingRef.current = false;
      setAutoAdvancing(false);
    } finally {
      setIsDMThinking(false);
    }
  }, [addMessage, addMessages, buildConversationHistory, addDiceRolls, sendStreamMessage, handleStateUpdate]);

  handleSendMessageRef.current = handleSendMessage;

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
    const currentWorldState: WorldState = worldState || WorldStateManager.initialize();

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
  }, [party, messages, diceRolls, locationId, inCombat, initiativeOrder, enemies, turnIndex, openDoors, enemiesByLocation, worldState, onSaveGame]);

  // Resolver el mapa táctico para la ubicación actual con fallback inteligente
  const currentLocation = adventureData?.locations?.find((l: any) => l.id === locationId);
  let resolvedMapData = currentLocation?.mapData;
  let resolvedMapLocationName = currentLocation?.name;

  if (!resolvedMapData && currentLocation?.explorationMode === "dungeon") {
    // Si la sala actual no tiene mapa y no es zona segura, buscar la primera sala con mapa en la aventura
    const locWithMap = adventureData?.locations?.find((l: any) => l.mapData?.imagePath);
    if (locWithMap) {
      resolvedMapData = locWithMap.mapData;
      resolvedMapLocationName = locWithMap.name;
    }
  }

  const hasMap = !!resolvedMapData?.imagePath;

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
          >
            <div className="p-3">
              <Button
                variant={hasMap ? "destructive" : "secondary"}
                disabled={!hasMap}
                onClick={() => {
                  setIsMapOpen(true);
                  handleResetMapView();
                }}
                className={`w-full flex items-center justify-center gap-2 transition-all font-semibold py-2 h-10 ${
                  hasMap
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-900/20 active:scale-95 cursor-pointer"
                    : "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60"
                }`}
              >
                <Map className="h-4 w-4" />
                {hasMap ? "Ver Mapa Táctico" : "Mapa No Disponible"}
              </Button>
            </div>
          </LeftPanel>
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
          streamedContent={streamedContent}
          isStreaming={isStreaming}
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
          currentStatus={currentStatus}
        />
      </GameLayout>

      {/* Modal del Mapa Táctico */}
      {isMapOpen && resolvedMapData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-[80vw] h-[85vh] max-w-7xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20 z-10">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <Map className="h-5 w-5 text-red-500" />
                  Mapa: {resolvedMapLocationName}
                </h3>
                {resolvedMapData.spatialData?.dimensions?.scale && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Escala: {resolvedMapData.spatialData.dimensions.scale}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsMapOpen(false);
                  handleResetMapView();
                }}
                className="h-8 w-8 p-0 rounded-full hover:bg-muted text-foreground flex items-center justify-center font-bold text-base"
              >
                ✕
              </Button>
            </div>
            {/* Contenedor de la Imagen con zoom y paneo */}
            <div 
              className="flex-1 overflow-hidden relative bg-muted/5 flex justify-center items-center cursor-grab select-none active:cursor-grabbing"
              onWheel={handleMapWheel}
              onMouseDown={handleMapMouseDown}
              onMouseMove={handleMapMouseMove}
              onMouseUp={handleMapMouseUpOrLeave}
              onMouseLeave={handleMapMouseUpOrLeave}
            >
              <img
                src={`/${resolvedMapData.imagePath}`}
                alt={`Mapa de ${resolvedMapLocationName}`}
                className="max-h-[70vh] object-contain rounded-lg border border-border shadow-md pointer-events-none"
                style={{
                  transform: `translate(${mapPosition.x}px, ${mapPosition.y}px) scale(${mapZoom})`,
                  transition: isDraggingMap ? 'none' : 'transform 0.15s ease-out',
                  transformOrigin: 'center',
                }}
              />

              {/* Controles Flotantes de Zoom y Centrado */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-background/90 backdrop-blur-md border border-border rounded-lg p-2 shadow-lg z-10 select-none">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded hover:bg-muted"
                  onClick={() => setMapZoom(prev => Math.max(0.5, prev - 0.25))}
                  title="Alejar"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs font-mono font-bold w-12 text-center text-foreground">
                  {Math.round(mapZoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded hover:bg-muted"
                  onClick={() => setMapZoom(prev => Math.min(4, prev + 0.25))}
                  title="Acercar"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded hover:bg-muted text-foreground flex items-center justify-center"
                  onClick={handleResetMapView}
                  title="Restablecer Vista"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
