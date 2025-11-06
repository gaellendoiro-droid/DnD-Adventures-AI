
"use client";

import type { DiceRoll } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Dices } from "lucide-react";
import { DiceRollResult } from "./dice-roll-result";
import { useEffect, useRef } from "react";

interface DiceLogPanelProps {
  diceRolls: DiceRoll[];
}

export function DiceLogPanel({ diceRolls }: DiceLogPanelProps) {
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
    <>
      <CardHeader className="flex-row items-center gap-2 pt-4 pb-2">
        <Dices className="w-6 h-6" />
        <CardTitle className="font-headline text-xl">Tiradas</CardTitle>
      </CardHeader>
      <ScrollArea className="px-2 h-[240px]" viewportRef={scrollViewportRef}>
        <div className="p-2 space-y-3">
          {diceRolls.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground p-4">
              Aún no se ha lanzado ningún dado.
            </p>
          ) : (
            diceRolls.map((roll, index) => (
              <DiceRollResult key={roll.id} roll={roll} rollNumber={index + 1} />
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );
}
