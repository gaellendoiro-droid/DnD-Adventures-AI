
"use client";

import type { DiceRoll } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Dices } from "lucide-react";
import { DiceRollResult } from "./dice-roll-result";
import { useEffect, useRef } from "react";

interface DiceLogPanelProps {
  rolls: DiceRoll[];
}

export function DiceLogPanel({ rolls: diceRolls = [] }: DiceLogPanelProps) {
    const scrollViewportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTo({
            top: scrollViewportRef.current.scrollHeight,
            behavior: "smooth",
        });
        }
    }, [diceRolls]);


  return (
    <div className="flex flex-col h-full">
      <CardHeader className="flex-row items-center gap-2 pt-2 pb-1">
        <Dices className="w-5 h-5" />
        <CardTitle className="font-headline text-lg">Tiradas</CardTitle>
      </CardHeader>
      <ScrollArea className="px-1 flex-grow" viewportRef={scrollViewportRef}>
        <div className="p-1.5 space-y-1.5">
          {diceRolls.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground p-2">
              Aún no se ha lanzado ningún dado.
            </p>
          ) : (
            diceRolls.map((roll, index) => (
              <DiceRollResult key={roll.id} roll={roll} rollNumber={index + 1} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
