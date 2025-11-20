
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Dices } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DiceRoller } from "./dice-roller";

interface PlayerInputProps {
  onSendMessage: (content: string) => void;
  onDiceRoll: (roll: { result: number; sides: number }) => void;
  disabled?: boolean;
  isPlayerTurn?: boolean;
  waitingForTurnAdvance?: boolean;
}

export function PlayerInput({ onSendMessage, onDiceRoll, disabled = false, isPlayerTurn = false, waitingForTurnAdvance = false }: PlayerInputProps) {
  const [inputValue, setInputValue] = useState("");
  const { toast } = useToast();
  const [isDicePopoverOpen, setIsDicePopoverOpen] = useState(false);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    const message = inputValue.trim();
    if (message) {
      onSendMessage(message);
      setInputValue("");
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No puedes enviar un mensaje vacío.",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex items-start gap-2">
        <DiceRoller onRoll={onDiceRoll} onPopoverOpenChange={setIsDicePopoverOpen} />
        <Textarea
          id="player-action-input"
          name="player-action"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? waitingForTurnAdvance
                ? "No es tu turno. Pulsa un botón de avanzar turno para continuar."
                : isPlayerTurn
                  ? "Es tu turno! ¿Qué quieres hacer?"
                  : "El DM está pensando... pero puedes ir escribiendo."
              : isPlayerTurn
                ? "Es tu turno! ¿Qué quieres hacer?"
                : "¿Qué quieres hacer?"
          }
          className="flex-1 resize-none"
          rows={1}
          disabled={isDicePopoverOpen}
        />
        <Button type="submit" size="icon" aria-label="Enviar acción" disabled={disabled || isDicePopoverOpen}>
          <Send className="h-5 w-5" />
        </Button>
      </form>
      <p className="text-xs text-muted-foreground px-1">
        Para hablar con el DM fuera de personaje, empieza tu mensaje con <code className="font-mono bg-muted px-1 py-0.5 rounded-sm">//</code>.
      </p>
    </div>
  );
}
