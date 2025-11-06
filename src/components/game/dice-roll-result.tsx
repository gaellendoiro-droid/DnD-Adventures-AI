"use client";

import type { DiceRoll } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface DiceRollResultProps {
  roll: DiceRoll;
}

const outcomeStyles = {
  crit: "border-yellow-400 bg-yellow-400/10",
  success: "border-green-500 bg-green-500/10",
  fail: "border-red-500 bg-red-500/10",
  pifia: "border-destructive bg-destructive/20",
  neutral: "border-border",
};

export function DiceRollResult({ roll }: DiceRollResultProps) {
  const finalResult = roll.finalResult ?? roll.result;
  
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border text-sm",
        outcomeStyles[roll.outcome]
      )}
    >
      <div>
        <p className="font-semibold">
          {roll.roller} tiró d{roll.diceType}
        </p>
        <p className="text-xs font-semibold text-muted-foreground">{roll.description}</p>
        <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(roll.timestamp, { addSuffix: true, locale: es })}
        </p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold font-mono">{finalResult}</p>
        {roll.modifier !== undefined && (
             <p className="text-xs font-mono text-muted-foreground">
                {roll.result} {roll.modifier >= 0 ? `+${roll.modifier}` : roll.modifier}
            </p>
        )}
      </div>
    </div>
  );
}
