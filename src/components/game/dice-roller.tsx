"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dices } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DiceRollerProps {
  onRoll: (result: string) => void;
}

const dice = [4, 6, 8, 10, 12, 20, 100];

export function DiceRoller({ onRoll }: DiceRollerProps) {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const rollDice = (sides: number) => {
    if (!isClient) return;
    const result = Math.floor(Math.random() * sides) + 1;
    const rollString = `Tirada d${sides}: ${result}`;
    
    onRoll(rollString);

    toast({
      title: "🎲 Tirada de Dado",
      description: rollString,
    });
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Dices className="h-5 w-5 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-muted-foreground">
          Tirar Dados
        </h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {dice.map((sides) => (
          <Button
            key={sides}
            variant="outline"
            size="sm"
            onClick={() => rollDice(sides)}
            className="flex-grow md:flex-grow-0"
          >
            d{sides}
          </Button>
        ))}
      </div>
    </div>
  );
}
