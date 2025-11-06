
"use client";

import type { Character, DiceRoll, Combatant } from "@/lib/types";
import { PartyPanel } from "@/components/game/party-panel";
import { DiceLogPanel } from "@/components/game/dice-log-panel";
import { DebugPanel } from "@/components/game/debug-panel";
import { InitiativeTracker } from "@/components/game/initiative-tracker";
import { Separator } from "../ui/separator";

interface LeftPanelProps {
  party: Character[];
  selectedCharacterId?: string;
  onSelectCharacter: (character: Character) => void;
  diceRolls: DiceRoll[];
  debugMessages?: string[];
  inCombat: boolean;
  initiativeOrder: Combatant[];
  children?: React.ReactNode;
}

export function LeftPanel({
  party,
  selectedCharacterId,
  onSelectCharacter,
  diceRolls,
  debugMessages,
  inCombat,
  initiativeOrder,
  children,
}: LeftPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        {inCombat ? (
          <InitiativeTracker combatants={initiativeOrder} />
        ) : (
          <PartyPanel
            party={party}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={onSelectCharacter}
          />
        )}
      </div>
      <Separator className="my-2" />
      <div className="flex-grow min-h-0">
        <DiceLogPanel diceRolls={diceRolls} />
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
