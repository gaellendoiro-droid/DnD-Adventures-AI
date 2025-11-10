
"use client";

import type { DiceRoll } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DiceRollResultProps {
  roll: DiceRoll;
  rollNumber: number;
}

const outcomeStyles: { [key in DiceRoll['outcome'] | 'damage'] : string } = {
  crit: "border-green-500 bg-green-500/10",
  success: "border-green-500 bg-green-500/10",
  fail: "border-red-500 bg-red-500/10",
  pifia: "border-red-500 bg-red-500/10",
  neutral: "border-border",
  initiative: "border-blue-500 bg-blue-500/10",
  damage: "border-yellow-400 bg-yellow-400/10 text-yellow-200",
};

const outcomeTextStyles: { [key in DiceRoll['outcome'] | 'damage']?: string } = {
    crit: "text-green-400",
    success: "text-green-400",
    fail: "text-red-400",
    pifia: "text-red-400",
    initiative: "text-blue-400",
    damage: "text-yellow-300",
}

export function DiceRollResult({ roll, rollNumber }: DiceRollResultProps) {
  const totalResult = roll.totalResult;
  // Always show the breakdown for maximum clarity, as requested.
  const showBreakdown = true;
  
  let finalOutcome: DiceRoll['outcome'] | 'damage';

  if (roll.description.toLowerCase().includes('iniciativa')) {
    finalOutcome = 'initiative';
  } else if (roll.outcome === 'neutral' && roll.description.toLowerCase().includes('daño')) {
    finalOutcome = 'damage';
  } else {
    finalOutcome = roll.outcome;
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 p-2 rounded-lg border text-sm",
        outcomeStyles[finalOutcome]
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
                outcomeTextStyles[finalOutcome]
            )}>
                {totalResult}
            </p>
            {showBreakdown ? (
                <p className="text-xs font-mono text-muted-foreground text-right leading-tight">
                    ({roll.individualRolls.join('+')})
                    {roll.modifier !== undefined ? (roll.modifier >= 0 ? `+${roll.modifier}`: `${roll.modifier}`) : ''}
                </p>
            ) : null}
        </div>
      </div>
    </div>
  );
}
