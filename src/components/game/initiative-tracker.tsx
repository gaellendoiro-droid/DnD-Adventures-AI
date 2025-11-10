
"use client";

import type { Combatant } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, User, Users } from "lucide-react";
import { Badge } from "../ui/badge";

interface InitiativeTrackerProps {
  combatants: Combatant[];
}

export function InitiativeTracker({ combatants }: InitiativeTrackerProps) {
  return (
    <div className="flex flex-col h-full">
      <CardHeader className="flex-row items-center gap-2 pt-4 pb-2">
        <Swords className="w-6 h-6 text-destructive" />
        <CardTitle className="font-headline text-xl">Orden de Combate</CardTitle>
      </CardHeader>
      <ScrollArea className="px-2 flex-grow">
        <div className="p-2 space-y-2">
          {combatants.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground p-4">
              Esperando a que comience el combate...
            </p>
          ) : (
            <ol className="space-y-2">
              {combatants.map((combatant, index) => (
                <li
                  key={combatant.id}
                  className={`flex items-center space-x-3 p-2 rounded-lg transition-colors border-l-4 ${
                    index === 0 ? "bg-secondary border-primary/80" : "border-transparent"
                  }`}
                >
                  <div className="flex-shrink-0 font-mono text-xs h-6 w-6 flex items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 flex justify-between items-center">
                    <p className="font-semibold">{combatant.characterName}</p>
                    <div className="flex items-center gap-2">
                      {/* CORRECTED: Use explicit 'enemy' type for robust identification */}
                      {combatant.type === 'enemy' ? (
                        <Swords className="h-4 w-4 text-red-500" title="Enemigo" />
                      ) : combatant.controlledBy === 'Player' ? (
                        <User className="h-4 w-4 text-blue-500" title="Jugador" />
                      ) : (
                        <Users className="h-4 w-4 text-green-500" title="Aliado" />
                      )}
                      <Badge variant="outline" className="font-mono">
                        {combatant.total}
                      </Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
