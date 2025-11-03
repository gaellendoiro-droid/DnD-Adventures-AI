"use client";

import type { Character, DiceRoll } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PartyPanel } from "@/components/game/party-panel";
import { DiceLogPanel } from "@/components/game/dice-log-panel";
import { Users, Dices } from "lucide-react";

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
    <Tabs defaultValue="party" className="flex flex-col h-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="party">
          <Users className="w-4 h-4 mr-2" />
          Grupo
        </TabsTrigger>
        <TabsTrigger value="dice-log">
          <Dices className="w-4 h-4 mr-2" />
          Tiradas
        </TabsTrigger>
      </TabsList>
      <TabsContent value="party" className="flex-1 overflow-hidden">
        <PartyPanel
          party={party}
          selectedCharacterId={selectedCharacterId}
          onSelectCharacter={onSelectCharacter}
        />
      </TabsContent>
      <TabsContent value="dice-log" className="flex-1 overflow-hidden">
        <DiceLogPanel diceRolls={diceRolls} />
      </TabsContent>
    </Tabs>
  );
}
