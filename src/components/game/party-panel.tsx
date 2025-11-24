
"use client";

import type { Character } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
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
      <CardHeader className="flex-row items-center gap-2 pt-2 pb-1">
        <Users className="w-5 h-5" />
        <CardTitle className="font-headline text-lg">Grupo</CardTitle>
      </CardHeader>
      <div className="px-2 pb-2">
        <div className="space-y-1">
          {party.map((character) => (
            <div
              key={character.id}
              onClick={() => onSelectCharacter(character)}
              className={cn(
                "flex items-center space-x-3 p-1.5 rounded-lg cursor-pointer transition-colors hover:bg-secondary border-l-4",
                character.id === selectedCharacterId ? "bg-secondary border-primary" : "border-transparent"
              )}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectCharacter(character)}
            >
              <div
                className="w-2 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: character.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm truncate">{character.name}</p>
                  {character.controlledBy === 'Player' ? (
                    <User className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" title="Jugador" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-green-500 flex-shrink-0" title="IA" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Progress value={(character.hp.current / character.hp.max) * 100} className="h-1.5" />
                  <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {character.hp.current}/{character.hp.max}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
