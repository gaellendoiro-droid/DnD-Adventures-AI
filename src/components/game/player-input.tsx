"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlayerInputProps {
  onSendMessage: (content: string) => void;
}

export function PlayerInput({ onSendMessage }: PlayerInputProps) {
  const [inputValue, setInputValue] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2 mt-4">
      <Textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="¿Qué quieres hacer?"
        className="flex-1 resize-none"
        rows={1}
      />
      <Button type="submit" size="icon" aria-label="Enviar acción">
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}
