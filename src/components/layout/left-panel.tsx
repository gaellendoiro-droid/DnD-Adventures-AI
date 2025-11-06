
"use client";

import type { Character, DiceRoll, Combatant } from "@/lib/types";
import { DiceLogPanel } from "@/components/game/dice-log-panel";
import { DebugPanel } from "@/components/game/debug-panel";
import { InitiativeTracker } from "@/components/game/initiative-tracker";
import { Separator } from "../ui/separator";

interface LeftPanelProps {
  diceRolls: DiceRoll[];
  debugMessages?: string[];
  initiativeOrder: Combatant[];
  children?: React.ReactNode;
}

export function LeftPanel({
  diceRolls,
  debugMessages,
  initiativeOrder,
  children,
}: LeftPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow min-h-0">
        <DiceLogPanel diceRolls={diceRolls} />
      </div>
      <Separator className="my-2" />
      <div className="flex-shrink-0">
        <InitiativeTracker combatants={initiativeOrder} />
      </div>
      {debugMessages && (
        <>
          <Separator className="my-2" />
          <div className="flex-shrink-0">
            <DebugPanel messages={debugMessages} />
          </div>
        </>
      )}
      {children && (
        <>
            <Separator className="my-2" />
            <div className="flex-shrink-0">
                {children}
            </div>
        </>
      )}
    </div>
  );
}
