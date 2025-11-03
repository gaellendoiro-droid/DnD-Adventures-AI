"use client";

import type { GameMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Bot, User, Cog, Swords } from "lucide-react";

interface ChatMessageProps {
  message: GameMessage;
}

const senderInfo = {
  DM: {
    icon: Bot,
    name: "Dungeon Master",
    bubbleClassName: "bg-card rounded-br-none",
    iconClassName: "text-primary",
  },
  Player: {
    icon: User,
    name: "Jugador",
    bubbleClassName: "bg-primary text-primary-foreground rounded-bl-none",
    iconClassName: "",
  },
  System: {
    icon: Cog,
    name: "Sistema",
    bubbleClassName: "bg-transparent text-muted-foreground italic text-sm",
    iconClassName: "hidden",
  },
  Character: {
    icon: Swords,
    name: "Personaje",
    bubbleClassName: "bg-secondary rounded-b-none",
    iconClassName: "text-accent-foreground",
  },
};

export function ChatMessage({ message }: ChatMessageProps) {
  const { sender, senderName, content, timestamp, characterColor } = message;
  const info = senderInfo[sender];
  const Icon = info.icon;

  if (sender === "System") {
    return (
      <div className="flex justify-center items-center gap-2 my-2">
        <p className={cn(info.bubbleClassName, "text-center")}>{content}</p>
      </div>
    );
  }

  const isPlayer = sender === "Player";
  const displayName = sender === "Character" && senderName ? senderName : info.name;

  const bubbleStyle =
    sender === "Character" && characterColor
      ? { backgroundColor: characterColor, color: 'white' }
      : {};

  const bubbleClassName =
    sender === "Character"
      ? "text-primary-foreground rounded-b-none"
      : info.bubbleClassName;


  return (
    <div
      className={cn("flex gap-3 my-4", isPlayer ? "justify-end" : "justify-start")}
    >
      {!isPlayer && <Icon className={cn("h-6 w-6 flex-shrink-0 mt-1", info.iconClassName)} />}
      <div className={cn("flex flex-col max-w-[75%]", isPlayer ? "items-end" : "items-start")}>
        <div
          className={cn(
            "p-3 rounded-lg shadow-sm w-fit",
            bubbleClassName
          )}
          style={bubbleStyle}
        >
          {typeof content === 'string' ? <p className="leading-relaxed">{content}</p> : content}
        </div>
        <span className="text-xs text-muted-foreground mt-1 px-1">
          {displayName} @ {timestamp}
        </span>
      </div>
      {isPlayer && <Icon className={cn("h-6 w-6 flex-shrink-0 mt-1", info.iconClassName)} />}
    </div>
  );
}
