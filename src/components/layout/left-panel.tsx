
"use client";

import type { DiceRoll, Combatant } from "@/lib/types";
import { DiceLogPanel } from "@/components/game/dice-log-panel";
import { InitiativeTracker } from "@/components/game/initiative-tracker";
import { Separator } from "../ui/separator";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

interface LeftPanelProps {
  diceRolls?: DiceRoll[];
  initiativeOrder?: Combatant[];
  turnIndex?: number;
  children?: React.ReactNode;
}

export function LeftPanel({
  diceRolls = [],
  initiativeOrder = [],
  turnIndex = 0,
  children,
}: LeftPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <ResizablePanelGroup direction="vertical" className="flex-grow">
        <ResizablePanel defaultSize={50} minSize={20}>
          <InitiativeTracker combatants={initiativeOrder} currentTurnIndex={turnIndex} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={20}>
          <DiceLogPanel rolls={diceRolls} />
        </ResizablePanel>
      </ResizablePanelGroup>
      {children && (
        <div className="flex-shrink-0">
          <Separator className="my-2" />
          {children}
        </div>
      )}
    </div>
  );
}
