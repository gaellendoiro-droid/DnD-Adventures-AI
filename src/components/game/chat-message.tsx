
"use client";

import React, { useState } from "react";
import type { GameMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Bot, User, Users, Cog, Swords, Play, Loader2, Square, AlertTriangle, RefreshCw } from "lucide-react";
import { generateDmNarrationAudio } from "@/ai/flows/generate-dm-narration-audio";
import { useToast } from "@/hooks/use-toast";
import { Button } from "../ui/button";
import { logClient } from "@/lib/logger-client";
import { sanitizeHtml } from "@/lib/sanitize-html";

interface ChatMessageProps {
  message: GameMessage;
  volume?: number;
}

const senderInfo = {
  DM: {
    icon: Bot,
    name: "Dungeon Master",
    bubbleClassName: "bg-card rounded-br-none",
    iconClassName: "text-primary",
  },
  Player: {
    icon: User,
    name: "Jugador",
    bubbleClassName: "bg-primary text-primary-foreground rounded-bl-none",
    iconClassName: "text-blue-500",
  },
  System: {
    icon: Cog,
    name: "Sistema",
    bubbleClassName: "bg-transparent text-muted-foreground italic text-sm",
    iconClassName: "hidden",
  },
  Character: {
    icon: Users,
    name: "Personaje",
    bubbleClassName: "bg-secondary rounded-b-none",
    iconClassName: "text-green-500",
  },
  Error: {
    icon: AlertTriangle,
    name: "Error del Sistema",
    bubbleClassName: "bg-destructive/10 text-destructive-foreground border border-destructive/30 rounded-br-none",
    iconClassName: "text-destructive",
  }
};

export function ChatMessage({ message, volume = 1.0 }: ChatMessageProps) {
  const { sender, senderName, content, timestamp, characterColor, originalContent, onRetry } = message;
  const info = senderInfo[sender];
  const Icon = info.icon;

  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleAudioToggle = async () => {
    const textToSpeak = originalContent || (typeof content === 'string' ? content.replace(/<[^>]*>?/gm, '') : '');
    if (!textToSpeak) return;

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
      }
      return;
    }

    if (audioDataUri) {
      audioRef.current?.play();
      return;
    }

    setIsGeneratingAudio(true);
    try {
      const response = await generateDmNarrationAudio({ narrationText: textToSpeak });
      setAudioDataUri(response.audioDataUri);
    } catch (error: any) {
      logClient.uiError('ChatMessage', 'Error generating narration audio', error);
      toast({
        variant: "destructive",
        title: "Error de audio",
        description: "No se pudo generar la narración de audio.",
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  React.useEffect(() => {
    const audio = audioRef.current;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    if (audio) {
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handlePause);
    }

    return () => {
      if (audio) {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handlePause);
      }
    };
  }, []); // Empty dependency array - effect should only run once on mount


  React.useEffect(() => {
    if (audioDataUri && audioRef.current) {
      audioRef.current.src = audioDataUri;
      audioRef.current.play();
    }
  }, [audioDataUri]);

  let renderedContent = content;
  if (sender === "System" && content === "¡Combate Finalizado!") {
    renderedContent = <div className="font-bold uppercase text-green-500 text-lg">{content as string}</div>;
  }
  if (sender === "System" && (content as string).startsWith("¡Comienza el Combate!")) {
    renderedContent = <div className="font-bold uppercase text-destructive text-lg">{content as string}</div>;
  }

  if (sender === "System") {
    return (
      <div className="flex justify-center items-center gap-2 my-2 w-full">
        <div
          className={cn(info.bubbleClassName, "text-center w-full max-w-[95%]")}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content as string) }}
        />
      </div>
    );
  }

  const isPlayer = sender === "Player";
  const displayName = senderName || info.name;

  // Apply character color for both Character and Player messages
  const bubbleStyle =
    (sender === "Character" || sender === "Player") && characterColor
      ? { backgroundColor: characterColor, color: 'white' }
      : {};

  let bubbleClassName = info.bubbleClassName;
  if ((sender === "Character" || sender === "Player") && bubbleStyle.backgroundColor) {
    bubbleClassName = "text-primary-foreground rounded-b-none"
  } else if (sender === "Character") {
    bubbleClassName = "bg-secondary rounded-b-none";
  }


  return (
    <div
      className={cn("flex gap-3 my-4", isPlayer ? "justify-end" : "justify-start")}
    >
      {!isPlayer && <Icon className={cn("h-6 w-6 flex-shrink-0 mt-7", info.iconClassName)} />}
      <div className={cn("flex flex-col max-w-[75%]", isPlayer ? "items-end" : "items-start")}>
        <span className="text-xs text-muted-foreground mb-1 px-1">
          {displayName} @ {timestamp}
        </span>
        <div className="flex items-end gap-2">
          <div
            className={cn(
              "p-3 rounded-lg shadow-sm w-fit prose prose-sm dark:prose-invert max-w-full",
              bubbleClassName,
              "prose-p:m-0 prose-headings:m-0"
            )}
            style={bubbleStyle}
          >
            {sender === 'DM' ? (
              <div className="leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content as string) }} />
            ) : React.isValidElement(renderedContent) ? (
              renderedContent
            ) : (
              <p className="leading-relaxed">{content as string}</p>
            )}
            {sender === 'Error' && onRetry && (
              <div className="mt-3 text-right">
                <Button variant="destructive" size="sm" onClick={onRetry}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            )}
          </div>
          {sender === "DM" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAudioToggle}
              disabled={isGeneratingAudio}
              className="flex-shrink-0"
            >
              {isGeneratingAudio ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isPlaying ? (
                <Square className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              <span className="sr-only">{isPlaying ? 'Detener narración' : 'Reproducir narración'}</span>
            </Button>
          )}
        </div>
      </div>
      {isPlayer && <Icon className={cn("h-6 w-6 flex-shrink-0 mt-7", info.iconClassName)} />}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
