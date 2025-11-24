
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlayerInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  isPlayerTurn?: boolean;
  waitingForTurnAdvance?: boolean;
  isDMThinking?: boolean;
}

export function PlayerInput({ onSendMessage, disabled = false, isPlayerTurn = false, waitingForTurnAdvance = false, isDMThinking = false }: PlayerInputProps) {
  const [inputValue, setInputValue] = useState("");
  const { toast } = useToast();


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
        <Textarea
          id="player-action-input"
          name="player-action"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? isDMThinking
                ? "El DM está pensando..."
                : waitingForTurnAdvance
                  ? "No es tu turno. Pulsa un botón de avanzar turno para continuar."
                  : isPlayerTurn
                    ? "Es tu turno! ¿Qué quieres hacer?"
                    : "El DM está pensando..."
              : isPlayerTurn
                ? "Es tu turno! ¿Qué quieres hacer?"
                : "¿Qué quieres hacer?"
          }
          className="flex-1 resize-none"
          rows={1}
          disabled={disabled}
        />
        <Button type="submit" size="icon" aria-label="Enviar acción" disabled={disabled}>
          <Send className="h-5 w-5" />
        </Button>
      </form>
      <p className="text-xs text-muted-foreground px-1">
        Para hablar con el DM fuera de personaje, empieza tu mensaje con <code className="font-mono bg-muted px-1 py-0.5 rounded-sm">//</code>.
      </p>
    </div>
  );
}
