import { cn } from "@/lib/utils";
import React from "react";

interface GameLayoutProps {
  children: React.ReactNode;
  partyPanel: React.ReactNode;
  characterSheet: React.ReactNode;
}

export function GameLayout({
  children,
  partyPanel,
  characterSheet,
}: GameLayoutProps) {
  return (
    <main className="flex-1 grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_380px] gap-4 p-4 overflow-hidden">
      <aside className="hidden md:flex flex-col bg-card rounded-lg shadow-sm border">
        {partyPanel}
      </aside>
      
      <div className="flex flex-col gap-4 overflow-hidden">
        {children}
      </div>
      
      <aside className="hidden lg:flex flex-col bg-card rounded-lg shadow-sm border">
        {characterSheet}
      </aside>
    </main>
  );
}
