
"use client";

import type { Combatant } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, User, Users, Skull, Activity } from "lucide-react";
import { Badge } from "../ui/badge";

interface InitiativeTrackerProps {
  combatants: Combatant[];
  currentTurnIndex?: number;
  isPlayerTurn?: boolean;
  isProcessing?: boolean;
}

export function InitiativeTracker({
  combatants,
  currentTurnIndex = 0,
  isPlayerTurn = false,
  isProcessing = false,
}: InitiativeTrackerProps) {
  return (
    <div className="flex flex-col h-full">
      <CardHeader className="flex-row items-center gap-2 pt-2 pb-1">
        <Swords className="w-5 h-5 text-destructive" />
        <CardTitle className="font-headline text-lg">Orden de Combate</CardTitle>
      </CardHeader>
      <ScrollArea className="px-1 flex-grow">
        <div className="p-1.5 space-y-1">
          {combatants.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground p-2">
              Esperando a que comience el combate...
            </p>
          ) : (
            <ol className="space-y-1">
              {combatants.map((combatant, index) => {
                const isActive = index === currentTurnIndex;
                const isDead = combatant.status === 'dead';
                const isUnconscious = combatant.status === 'unconscious';

                return (
                  <li
                    key={combatant.id}
                    className={`flex items-center space-x-2 p-1.5 rounded-lg transition-all duration-300 border-l-4 ${isActive ? "bg-secondary border-primary/80" : "border-transparent"
                      } ${isActive && isProcessing ? "animate-pulse" : ""} ${isDead ? "opacity-60 grayscale" : ""}`}
                  >
                    <div className="flex-shrink-0 font-mono text-[10px] h-5 w-5 flex items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 flex justify-between items-center min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className={`font-semibold text-sm truncate ${isDead ? "line-through" : ""}`}>
                          {combatant.characterName}
                        </p>
                        {isDead && (
                          <Skull className="h-3.5 w-3.5 text-zinc-500" />
                        )}
                        {isUnconscious && (
                          <Activity className="h-3.5 w-3.5 text-orange-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isActive && isProcessing && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-500">
                            Procesando...
                          </Badge>
                        )}
                        {isActive && isPlayerTurn && !isProcessing && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500 text-blue-500">
                            Tu Turno
                          </Badge>
                        )}
                        {combatant.type === 'npc' && combatant.controlledBy === 'AI' ? (
                          <Swords className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        ) : combatant.controlledBy === 'Player' ? (
                          <User className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                        ) : (
                          <Users className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        )}
                        <Badge variant="outline" className="font-mono text-xs px-1.5 py-0">
                          {combatant.total}
                        </Badge>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
