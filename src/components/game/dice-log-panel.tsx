
"use client";

import type { DiceRoll } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Dices } from "lucide-react";
import { DiceRollResult } from "./dice-roll-result";

interface DiceLogPanelProps {
  diceRolls: DiceRoll[];
}

export function DiceLogPanel({ diceRolls }: DiceLogPanelProps) {
  return (
    <>
      <CardHeader className="flex-row items-center gap-2">
        <Dices className="w-6 h-6" />
        <CardTitle className="font-headline text-xl">Log de DM</CardTitle>
      </CardHeader>
      <ScrollArea className="px-2 h-[240px]">
        <div className="p-2 space-y-3">
          {diceRolls.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground p-4">
              Aún no se ha lanzado ningún dado.
            </p>
          ) : (
            diceRolls.map((roll) => (
              <DiceRollResult key={roll.id} roll={roll} />
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );
}
