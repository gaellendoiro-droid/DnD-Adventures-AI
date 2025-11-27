import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Volume2, VolumeX, Pause, Play } from "lucide-react"; // Import icons
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { VolumeSettings } from "@/lib/types";

interface PlayerInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  isPlayerTurn?: boolean;
  waitingForTurnAdvance?: boolean;
  isDMThinking?: boolean;
  volumeSettings?: VolumeSettings;
  isMuted?: boolean;
  onVolumeChange?: (channel: keyof VolumeSettings, value: number) => void;
  onToggleMute?: () => void;
}

export function PlayerInput({
  onSendMessage,
  disabled = false,
  isPlayerTurn = false,
  waitingForTurnAdvance = false,
  isDMThinking = false,
  volumeSettings = { master: 0.5, music: 0.5, ambience: 0.5, sfx: 0.5, narrator: 1.0 },
  isMuted = false,
  onVolumeChange,
  onToggleMute
}: PlayerInputProps) {
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

  const renderSlider = (label: string, channel: keyof VolumeSettings) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span>{Math.round(volumeSettings[channel] * 100)}%</span>
      </div>
      <Slider
        value={[volumeSettings[channel]]}
        min={0}
        max={1}
        step={0.01}
        onValueChange={(vals) => onVolumeChange && onVolumeChange(channel, vals[0])}
      />
    </div>
  );

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
      <div className="flex justify-between items-center px-1">
        <p className="text-xs text-muted-foreground">
          Para hablar con el DM fuera de personaje, empieza tu mensaje con <code className="font-mono bg-muted px-1 py-0.5 rounded-sm">//</code>.
        </p>

        {/* Audio Controls */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleMute} title={isMuted ? "Activar sonido" : "Silenciar"}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Volumen">
                <div className="h-4 w-1 bg-primary/50 rounded-full" style={{ height: `${Math.max(20, volumeSettings.master * 100)}%` }}></div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4">
              <div className="flex flex-col gap-4">
                <h4 className="font-medium leading-none mb-2">Mezclador de Audio</h4>
                {renderSlider("Maestro", "master")}
                {renderSlider("Música", "music")}
                {renderSlider("Ambiente", "ambience")}
                {renderSlider("Efectos (SFX)", "sfx")}
                {renderSlider("Narración (TTS)", "narrator")}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
