"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dices } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DiceRollerProps {
  onRoll: (roll: { result: number, sides: number }) => void;
  onPopoverOpenChange?: (open: boolean) => void;
}

const dice = [4, 6, 8, 10, 12, 20, 100];

export function DiceRoller({ onRoll, onPopoverOpenChange }: DiceRollerProps) {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const handleOpenChange = (newOpenState: boolean) => {
    setOpen(newOpenState);
    if(onPopoverOpenChange) {
        onPopoverOpenChange(newOpenState);
    }
  }

  const rollDice = (sides: number) => {
    if (!isClient) return;
    const result = Math.floor(Math.random() * sides) + 1;
    const rollString = `Tirada d${sides}: ${result}`;
    
    onRoll({result, sides});

    toast({
      title: "🎲 Tirada de Dado",
      description: rollString,
    });
    handleOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Tirar dados">
            <Dices className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <div className="grid grid-cols-4 gap-2">
            {dice.map((sides) => (
            <Button
                key={sides}
                variant="outline"
                size="sm"
                onClick={() => rollDice(sides)}
            >
                d{sides}
            </Button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
