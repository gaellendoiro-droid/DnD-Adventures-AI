"use client";

import type { Character, DiceRoll } from "@/lib/types";
import { PartyPanel } from "@/components/game/party-panel";
import { DiceLogPanel } from "@/components/game/dice-log-panel";
import { Separator } from "../ui/separator";

interface LeftPanelProps {
  party: Character[];
  selectedCharacterId?: string;
  onSelectCharacter: (character: Character) => void;
  diceRolls: DiceRoll[];
}

export function LeftPanel({
  party,
  selectedCharacterId,
  onSelectCharacter,
  diceRolls,
}: LeftPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-[3] overflow-auto">
        <PartyPanel
          party={party}
          selectedCharacterId={selectedCharacterId}
          onSelectCharacter={onSelectCharacter}
        />
      </div>
      <Separator className="my-2" />
      <div className="flex-[2] overflow-auto">
        <DiceLogPanel diceRolls={diceRolls} />
      </div>
    </div>
  );
}
