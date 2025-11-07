
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal } from "lucide-react";
import { useEffect, useRef } from "react";

interface DebugPanelProps {
  messages: string[];
}

export function DebugPanel({ messages }: DebugPanelProps) {
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({
        top: scrollViewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="flex-row items-center gap-2 pt-4 pb-2">
        <Terminal className="w-5 h-5" />
        <CardTitle className="font-headline text-lg">Debug Log</CardTitle>
      </CardHeader>
      <ScrollArea className="px-2 flex-grow" viewportRef={scrollViewportRef}>
        <div className="p-2 space-y-2 text-xs font-mono text-muted-foreground">
          {messages.length === 0 ? (
            <p className="text-center">El log de depuración está vacío.</p>
          ) : (
            messages.map((msg, index) => (
              <p key={index} className="whitespace-pre-wrap break-words">{`> ${msg}`}</p>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
