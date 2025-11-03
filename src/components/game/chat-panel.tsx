"use client";

import React, { useRef, useEffect } from "react";
import type { GameMessage } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChatMessage } from "./chat-message";
import { PlayerInput } from "./player-input";
import { DiceRoller } from "./dice-roller";

interface ChatPanelProps {
  messages: GameMessage[];
  onSendMessage: (content: string) => void;
  onDiceRoll: (roll: string) => void;
}

export function ChatPanel({
  messages,
  onSendMessage,
  onDiceRoll,
}: ChatPanelProps) {
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({
        top: scrollViewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-card rounded-lg shadow-sm border">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4" ref={scrollViewportRef}>
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-4 bg-background/50 rounded-b-lg">
        <DiceRoller onRoll={onDiceRoll} />
        <PlayerInput onSendMessage={onSendMessage} />
      </div>
    </div>
  );
}
