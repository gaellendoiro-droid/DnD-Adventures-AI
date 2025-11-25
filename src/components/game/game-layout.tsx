import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";

interface GameLayoutProps {
  children: React.ReactNode;
  leftPanel: React.ReactNode;
  characterSheet: React.ReactNode;
  isLeftPanelCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
}

interface PanelToggleProps {
  side: "left" | "right";
  collapsed: boolean;
  onClick: () => void;
  label: string;
}

const PanelToggle = ({ side, collapsed, onClick, label }: PanelToggleProps) => {
  const Icon =
    side === "left"
      ? collapsed
        ? ChevronRight
        : ChevronLeft
      : collapsed
        ? ChevronLeft
        : ChevronRight;

  return (
    <button
      type="button"
      aria-pressed={!collapsed}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-full min-h-[48px] w-4 flex-col items-center justify-center gap-1 bg-background border-y border-border",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        side === "left" ? "rounded-r-md" : "rounded-l-md",
        collapsed
          ? side === "left"
            ? "border-l border-border hover:bg-muted/30"
            : "border-r border-border hover:bg-muted/30"
          : "hover:bg-muted/20"
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
    </button>
  );
};

export function GameLayout({
  children,
  leftPanel,
  characterSheet,
  isLeftPanelCollapsed,
  isRightPanelCollapsed,
  onToggleLeftPanel,
  onToggleRightPanel,
}: GameLayoutProps) {
  return (
    <main className="flex-1 flex flex-col gap-4 p-4 overflow-hidden">
      <div className="flex flex-1 flex-col gap-4 md:gap-0 overflow-hidden md:flex-row">
        <div className="hidden md:flex items-stretch gap-0">
          <div
            className={cn(
              "flex h-full flex-col bg-card rounded-lg shadow-sm border min-h-0 overflow-hidden transition-all duration-200 ease-in-out",
              "w-[280px]",
              isLeftPanelCollapsed && "w-0 opacity-0 pointer-events-none"
            )}
            style={{
              width: isLeftPanelCollapsed ? 0 : 280,
            }}
          >
            {leftPanel}
          </div>
          <PanelToggle
            side="left"
            collapsed={isLeftPanelCollapsed}
            onClick={onToggleLeftPanel}
            label={isLeftPanelCollapsed ? "Mostrar panel izquierdo" : "Ocultar panel izquierdo"}
          />
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-hidden min-h-0">
          {children}
        </div>

        <div className="hidden lg:flex items-stretch gap-0">
          <PanelToggle
            side="right"
            collapsed={isRightPanelCollapsed}
            onClick={onToggleRightPanel}
            label={isRightPanelCollapsed ? "Mostrar panel derecho" : "Ocultar panel derecho"}
          />
          <div
            className={cn(
              "flex h-full flex-col bg-card rounded-lg shadow-sm border min-h-0 overflow-hidden transition-all duration-200 ease-in-out",
              "w-[380px]",
              isRightPanelCollapsed && "w-0 opacity-0 pointer-events-none"
            )}
            style={{
              width: isRightPanelCollapsed ? 0 : 380,
            }}
          >
            {characterSheet}
          </div>
        </div>
      </div>
    </main>
  );
}
