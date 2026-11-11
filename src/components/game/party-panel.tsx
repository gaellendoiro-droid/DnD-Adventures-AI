
"use client";

import type { Character } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { CardHeader, CardTitle } from "../ui/card";
import { Users, User, Bot, Sparkles, AlertTriangle } from "lucide-react";

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
                    <span title="Jugador" className="flex-shrink-0"><User className="h-3.5 w-3.5 text-blue-500" /></span>
                  ) : (
                    <span title="IA" className="flex-shrink-0"><Bot className="h-3.5 w-3.5 text-green-500" /></span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Progress value={(character.hp.current / character.hp.max) * 100} className="h-1.5 bg-black/20" />
                  <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {character.hp.current}/{character.hp.max}
                  </span>
                </div>
                {character.activeEffects && character.activeEffects.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {character.activeEffects.map((effect) => (
                      <span
                        key={effect.id}
                        title={`${effect.name}${effect.duration ? ` (${effect.duration})` : ''}: ${effect.description || ''}`}
                        className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
                          effect.type === 'debuff' || effect.type === 'condition'
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        )}
                      >
                        {effect.type === 'debuff' || effect.type === 'condition' ? (
                          <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" />
                        ) : (
                          <Sparkles className="h-2.5 w-2.5 flex-shrink-0" />
                        )}
                        <span className="truncate max-w-[140px]">{effect.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
