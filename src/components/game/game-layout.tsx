import { cn } from "@/lib/utils";
import React from "react";

interface GameLayoutProps {
  children: React.ReactNode;
  leftPanel: React.ReactNode;
  characterSheet: React.ReactNode;
}

export function GameLayout({
  children,
  leftPanel,
  characterSheet,
}: GameLayoutProps) {
  return (
    <main className="flex-1 grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_380px] gap-4 p-4 overflow-hidden">
      <aside className="hidden md:flex flex-col bg-card rounded-lg shadow-sm border min-h-0 min-w-0">
        {leftPanel}
      </aside>
      
      <div className="flex flex-col gap-4 overflow-hidden min-h-0">
        {children}
      </div>
      
      <aside className="hidden lg:flex flex-col bg-card rounded-lg shadow-sm border min-h-0">
        {characterSheet}
      </aside>
    </main>
  );
}
