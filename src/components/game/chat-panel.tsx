"use client";

import React, { useRef, useEffect } from "react";
import type { GameMessage } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChatMessage } from "./chat-message";
import { PlayerInput } from "./player-input";
import { DiceRoller } from "./dice-roller";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { Bot, Play, FastForward } from "lucide-react";

interface ChatPanelProps {
  messages: GameMessage[];
  onSendMessage: (content: string) => void;
  onDiceRoll: (roll: { result: number; sides: number }) => void;
  isThinking: boolean;
  inCombat?: boolean;
  hasMoreAITurns?: boolean;
  justProcessedAITurn?: boolean;
  autoAdvancing?: boolean;
  onPassTurn?: () => void;
  onAdvanceAll?: () => void;
}

export function ChatPanel({
  messages,
  onSendMessage,
  onDiceRoll,
  isThinking,
  inCombat = false,
  hasMoreAITurns = false,
  justProcessedAITurn = false,
  autoAdvancing = false,
  onPassTurn,
  onAdvanceAll,
}: ChatPanelProps) {
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({
        top: scrollViewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isThinking]);

  return (
    <div className="flex flex-col h-full bg-card rounded-lg shadow-sm border">
      <ScrollArea className="flex-1 p-4" viewportRef={scrollViewportRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isThinking && (
             <div className="flex gap-3 my-4 justify-start">
                <Bot className="h-6 w-6 flex-shrink-0 mt-1 text-primary" />
                <div className="flex flex-col max-w-[75%] items-start">
                    <div className="p-3 rounded-lg shadow-sm w-fit bg-card rounded-br-none space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                    </div>
                     <span className="text-xs text-muted-foreground mt-1 px-1">
                        Dungeon Master está pensando...
                    </span>
                </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-4 bg-background/50 rounded-b-lg space-y-3">
        {/* Step-by-step combat buttons */}
        {/* Show button if there are more AI turns OR if we just processed an AI turn (even if next is player's turn) OR if auto-advancing */}
        {/* Keep buttons visible during auto-advance to show "Avanzando..." continuously */}
        {inCombat && (hasMoreAITurns || justProcessedAITurn || autoAdvancing) && onPassTurn && onAdvanceAll && (
          <div className="flex gap-2">
            <Button 
              onClick={onPassTurn}
              disabled={isThinking || autoAdvancing}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Play className="mr-2 h-4 w-4" />
              Pasar 1 Turno
            </Button>
            <Button 
              onClick={onAdvanceAll}
              disabled={isThinking || autoAdvancing}
              variant="default"
              size="sm"
              className="flex-1"
            >
              <FastForward className="mr-2 h-4 w-4" />
              {autoAdvancing ? "Avanzando..." : "Avanzar Todos"}
            </Button>
          </div>
        )}
        <PlayerInput onSendMessage={onSendMessage} disabled={isThinking} onDiceRoll={onDiceRoll} />
      </div>
    </div>
  );
}
