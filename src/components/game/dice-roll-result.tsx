
"use client";

import type { DiceRoll } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DiceRollResultProps {
  roll: DiceRoll;
  rollNumber: number;
}

const outcomeStyles: { [key in DiceRoll['outcome']]: string } = {
  crit: "border-yellow-400 bg-yellow-400/10 text-yellow-200",
  success: "border-green-500 bg-green-500/10",
  fail: "border-red-500 bg-red-500/10",
  pifia: "border-destructive bg-destructive/20 text-destructive-foreground/80",
  neutral: "border-border",
};

const outcomeTextStyles: { [key in DiceRoll['outcome']]?: string } = {
    crit: "text-yellow-300",
    success: "text-green-400",
    fail: "text-red-400",
    pifia: "text-destructive",
}

export function DiceRollResult({ roll, rollNumber }: DiceRollResultProps) {
  const totalResult = roll.totalResult;
  const showBreakdown = (roll.modifier !== undefined && roll.modifier !== 0) || roll.individualRolls.length > 1;
  
  return (
    <div
      className={cn(
        "flex items-start gap-2 p-2 rounded-lg border text-sm",
        outcomeStyles[roll.outcome]
      )}
    >
      <div className="flex-shrink-0 font-mono text-xs h-5 w-5 flex items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground font-bold mt-0.5">
        {rollNumber}
      </div>
      <div className="flex-grow grid grid-cols-[1fr_auto] items-start gap-x-2">
        <div className="text-left">
            <p className="font-semibold leading-tight">
                {roll.roller}
            </p>
            <p className="text-xs font-semibold text-muted-foreground leading-tight">{roll.description}</p>
        </div>
        <div className="text-right">
            <p className={cn(
                "text-2xl font-bold font-mono leading-none",
                outcomeTextStyles[roll.outcome]
            )}>
                {totalResult}
            </p>
            {showBreakdown ? (
                <p className="text-xs font-mono text-muted-foreground text-right leading-tight">
                    ({roll.individualRolls.join('+')}){roll.modifier !== undefined && roll.modifier !== 0 ? (roll.modifier > 0 ? `+${roll.modifier}`: `${roll.modifier}`) : ''}
                </p>
            ) : null}
        </div>
      </div>
    </div>
  );
}
