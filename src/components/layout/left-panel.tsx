
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
    <ResizablePanelGroup direction="vertical" className="h-full">
      <ResizablePanel defaultSize={60} minSize={30}>
        <div className="flex flex-col h-full">
          <div className="flex-grow min-h-0">
            <DiceLogPanel diceRolls={diceRolls} />
          </div>
          <Separator className="my-2" />
          <div className="flex-shrink-0">
            <InitiativeTracker combatants={initiativeOrder} />
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      {debugMessages && (
        <ResizablePanel defaultSize={40} minSize={20}>
            <div className="flex flex-col h-full">
                <DebugPanel messages={debugMessages} />
                {children && (
                    <>
                        <Separator className="my-2" />
                        <div className="flex-shrink-0">
                            {children}
                        </div>
                    </>
                )}
            </div>
        </ResizablePanel>
      )}
    </ResizablePanelGroup>
  );
}
