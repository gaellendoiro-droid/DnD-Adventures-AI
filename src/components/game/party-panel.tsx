"use client";

import type { Character } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "../ui/scroll-area";
import { CardHeader, CardTitle } from "../ui/card";
import { Users, User, Bot } from "lucide-react";

interface PartyPanelProps {
  party: Character[];
  selectedCharacterId?: string;
  onSelectCharacter: (character: Character) => void;
}

export function PartyPanel({
  party,
  selectedCharacterId,
  onSelectCharacter,
}: PartyPanelProps) {
  return (
    <>
      <CardHeader className="flex-row items-center gap-2">
        <Users className="w-6 h-6" />
        <CardTitle className="font-headline text-xl">Grupo</CardTitle>
      </CardHeader>
      <ScrollArea className="h-full px-2">
        <div className="p-2 space-y-2">
          {party.map((character) => (
            <div
              key={character.id}
              onClick={() => onSelectCharacter(character)}
              className={cn(
                "flex items-center space-x-4 p-2 rounded-lg cursor-pointer transition-colors hover:bg-secondary",
                character.id === selectedCharacterId && "bg-secondary border border-primary/50"
              )}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectCharacter(character)}
            >
              <Avatar className="h-12 w-12 border-2 border-muted">
                <AvatarImage src={character.avatarUrl} alt={character.name} data-ai-hint={character.avatarHint} />
                <AvatarFallback>{character.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{character.name}</p>
                  {character.controlledBy === 'Player' ? (
                    <User className="h-4 w-4 text-blue-500" title="Jugador" />
                  ) : (
                    <Bot className="h-4 w-4 text-green-500" title="IA" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                    <Progress value={(character.hp.current / character.hp.max) * 100} className="h-2" />
                    <span className="text-xs font-mono text-muted-foreground">
                        {character.hp.current}/{character.hp.max}
                    </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </>
  );
}
