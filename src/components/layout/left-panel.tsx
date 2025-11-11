
"use client";

import type { DiceRoll, Combatant } from "@/lib/types";
import { DiceLogPanel } from "@/components/game/dice-log-panel";
import { DebugPanel } from "@/components/game/debug-panel";
import { InitiativeTracker } from "@/components/game/initiative-tracker";
import { Separator } from "../ui/separator";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

interface LeftPanelProps {
  diceRolls?: DiceRoll[];
  debugMessages?: string[];
  initiativeOrder?: Combatant[];
  turnIndex?: number;
  children?: React.ReactNode;
}

export function LeftPanel({
  diceRolls = [],
  debugMessages = [],
  initiativeOrder = [],
  turnIndex = 0,
  children,
}: LeftPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <ResizablePanelGroup direction="vertical" className="flex-grow">
        <ResizablePanel defaultSize={60}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={50}>
              <DiceLogPanel rolls={diceRolls} />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>
              <InitiativeTracker combatants={initiativeOrder} currentTurnIndex={turnIndex} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        {debugMessages && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={40}>
                <DebugPanel messages={debugMessages} />
            </ResizablePanel>
          </>
        )}
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
